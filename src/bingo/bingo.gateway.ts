import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { getAllowedOrigins, isAllowedOrigin } from '../configuration';

interface Player {
  id: string;
  name: string;
  board: number[];
  isReady: boolean;
}

interface Room {
  id: string;
  list: number[];
  currentPlayerIndex: number;
  players: Player[];
  winner: string | null;
  status: 'waiting' | 'setup' | 'starting' | 'playing' | 'finished' | 'closed';
  startTime?: number;
  version: number;
  lastActive: number;
  isBotMatch?: boolean;
  gridSize?: number;
  hostPlayerId: string;
}

const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function isValidPlayer(player: unknown): player is Player {
  if (!player || typeof player !== 'object') return false;
  const value = player as Partial<Player>;
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    value.id.length <= 128 &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    value.name.length <= 100 &&
    Array.isArray(value.board) &&
    typeof value.isReady === 'boolean'
  );
}

function isValidRoomId(roomId: unknown): roomId is string {
  return typeof roomId === 'string' && ROOM_ID_PATTERN.test(roomId);
}

@WebSocketGateway({
  namespace: 'bingo',
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowed = getAllowedOrigins(
        process.env['FRONTEND_URL'] ?? 'https://ijitest.org',
      );
      if (isAllowedOrigin(origin, allowed)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
  },
})
export class BingoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(BingoGateway.name);
  private readonly rooms = new Map<string, Room>();

  // Periodically clean up idle rooms (> 30 mins active with no updates)
  constructor(private readonly configService: ConfigService) {
    setInterval(() => {
      const now = Date.now();
      for (const [roomId, room] of this.rooms.entries()) {
        if (now - room.lastActive > 30 * 60 * 1000) {
          this.logger.log(`Pruning idle room: ${roomId}`);
          this.rooms.delete(roomId);
        }
      }
      this.broadcastPublicRooms();
    }, 5 * 60 * 1000);
  }

  handleConnection(socket: Socket) {
    let token =
      socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (typeof token === 'string' && token.startsWith('Bearer ')) {
      token = token.substring(7);
    }

    const secret = this.configService.get<string>('STORAGE_SERVICE_SECRET');
    if (typeof token !== 'string' || !secret) {
      this.logger.warn(`Bingo connection rejected: missing authentication (${socket.id})`);
      socket.disconnect();
      return;
    }

    try {
      const decoded = verify(token, secret) as { userId?: string; role?: string };
      if (!decoded.userId || !decoded.role) {
        throw new Error('Token payload is missing userId or role');
      }
      socket.data = { userId: decoded.userId, role: decoded.role };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid token';
      this.logger.warn(
        `Bingo connection rejected: ${message} (${socket.id})`,
      );
      socket.disconnect();
      return;
    }

    this.logger.log(`Client connected: ${socket.id} on /bingo`);
    // Send initial public rooms list
    socket.emit('availableRooms', this.getPublicRoomsList());
  }

  handleDisconnect(socket: Socket) {
    this.logger.log(`Client disconnected: ${socket.id} on /bingo`);
    const roomId = socket.data?.roomId;
    const playerId = socket.data?.playerId;

    if (roomId && playerId) {
      this.logger.log(`Player ${playerId} disconnected from room ${roomId}. Starting 5m grace period.`);

      // Wait 5 minutes before checking if we should prune the room
      setTimeout(async () => {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const activeSockets = await this.server.in(`room-${roomId}`).fetchSockets();
        if (activeSockets.length === 0) {
          this.logger.log(`Pruning empty room ${roomId} after disconnect grace period`);
          this.rooms.delete(roomId);
          this.broadcastPublicRooms();
        } else {
          this.logger.log(`Room ${roomId} has active players. Cancelling prune.`);
        }
      }, 5 * 60 * 1000);
    }
  }

  @SubscribeMessage('getAvailableRooms')
  handleGetAvailableRooms(@ConnectedSocket() socket: Socket) {
    socket.emit('availableRooms', this.getPublicRoomsList());
  }

  @SubscribeMessage('createRoom')
  handleCreateRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() room: unknown,
  ) {
    if (
      socket.data?.roomId ||
      !room ||
      typeof room !== 'object' ||
      !isValidRoomId((room as Partial<Room>).id) ||
      !Array.isArray((room as Partial<Room>).players) ||
      (room as Partial<Room>).players!.length !== 1 ||
      !isValidPlayer((room as Partial<Room>).players![0])
    ) {
      socket.emit('roomError', { error: 'Invalid room payload' });
      return;
    }

    const requestedRoom = room as Room;
    const host = requestedRoom.players[0];
    if (!host) {
      socket.emit('roomError', { error: 'A host player is required' });
      return;
    }
    const roomToStore: Room = {
      ...requestedRoom,
      players: [{ ...host, board: [] }],
      list: [],
      currentPlayerIndex: 0,
      winner: null,
      status: 'waiting',
      version: 1,
      lastActive: Date.now(),
      hostPlayerId: host.id,
    };
    if (this.rooms.has(roomToStore.id)) {
      socket.emit('roomError', { error: 'Room already exists' });
      return;
    }

    this.logger.log(`Room created: ${roomToStore.id} by ${host.name}`);
    this.rooms.set(roomToStore.id, roomToStore);

    // Track room info on socket
    socket.data = { ...socket.data, roomId: roomToStore.id, playerId: host.id };
    socket.join(`room-${roomToStore.id}`);

    // Update lobby list for everyone
    this.broadcastPublicRooms();

    // Acknowledge creator
    socket.emit('roomUpdated', roomToStore);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { roomId: string; player: Player },
  ) {
    if (
      !payload ||
      typeof payload !== 'object' ||
      !isValidRoomId((payload as { roomId?: unknown }).roomId) ||
      !isValidPlayer((payload as { player?: unknown }).player)
    ) {
      socket.emit('joinError', { error: 'Invalid join payload' });
      return;
    }
    const { roomId, player } = payload as { roomId: string; player: Player };
    const room = this.rooms.get(roomId);

    if (!room) {
      this.logger.warn(`Join failed: Room ${roomId} not found`);
      socket.emit('joinError', { error: 'Room not found' });
      return;
    }

    // Support reconnection if player is already in the room
    const existingPlayer = room.players.find(
      (p) => p.id === player.id,
    );
    if (existingPlayer) {
      // Update socket associations
      socket.data = { ...socket.data, roomId, playerId: existingPlayer.id };
      socket.join(`room-${roomId}`);
      this.logger.log(`Player ${existingPlayer.name} reconnected to room ${roomId}`);
      socket.emit('roomUpdated', room);
      socket.emit('joinSuccess', { playerId: existingPlayer.id });
      return;
    }

    if (room.status !== 'waiting') {
      socket.emit('joinError', { error: 'Game already started or full' });
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('joinError', { error: 'Room is full' });
      return;
    }

    // Add player (ensure board size matches room's gridSize)
    const size = room.gridSize || 5;
    player.board = Array(size * size).fill(0);
    room.players.push(player);
    if (room.players.length === 2) {
      room.status = 'setup';
    }
    room.lastActive = Date.now();
    room.version += 1;

    this.rooms.set(roomId, room);

    // Track room info on socket
    socket.data = { ...socket.data, roomId, playerId: player.id };
    socket.join(`room-${roomId}`);

    this.logger.log(`Player ${player.name} joined room ${roomId}`);

    // Notify all players in room
    this.server.to(`room-${roomId}`).emit('roomUpdated', room);

    // Update lobby list
    this.broadcastPublicRooms();

    // Send successful join acknowledgment
    socket.emit('joinSuccess', { playerId: player.id });
  }

  @SubscribeMessage('updateRoom')
  handleUpdateRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() room: Room,
  ) {
    if (
      !room ||
      !isValidRoomId(room.id) ||
      socket.data?.roomId !== room.id ||
      !room.players.every(isValidPlayer)
    ) {
      this.logger.warn(`Unauthorized or invalid room update from ${socket.id}`);
      return;
    }
    const existing = this.rooms.get(room.id);
    if (!existing) {
      this.logger.warn(`Update failed: Room ${room.id} not found`);
      return;
    }

    const player = room.players.find(
      candidate => candidate.id === socket.data?.playerId,
    );
    if (
      !player ||
      existing.players.length !== room.players.length ||
      !existing.players.every(candidate =>
        room.players.some(incoming => incoming.id === candidate.id),
      )
    ) {
      this.logger.warn(`Room update rejected for non-member socket ${socket.id}`);
      return;
    }

    const existingPlayerIds = new Set(existing.players.map(candidate => candidate.id));
    const updatedRoom: Room = {
      ...existing,
      ...room,
      players: existing.players.map(candidate => {
        if (candidate.id !== socket.data?.playerId) {
          return candidate;
        }
        const incoming = room.players.find(
          incomingPlayer => incomingPlayer.id === candidate.id,
        );
        return incoming ?? candidate;
      }),
      hostPlayerId: existing.hostPlayerId,
      lastActive: Date.now(),
      version: existing.version + 1,
    };
    if (updatedRoom.players.some(candidate => !existingPlayerIds.has(candidate.id))) {
      return;
    }
    this.rooms.set(room.id, updatedRoom);

    // Broadcast to everyone in the room
    this.server.to(`room-${room.id}`).emit('roomUpdated', updatedRoom);

    // If status changed (e.g. starting, playing), update lobby list
    this.broadcastPublicRooms();
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { roomId: string; playerId: string },
  ) {
    const roomId = socket.data?.roomId;
    const playerId = socket.data?.playerId;
    if (
      !payload ||
      typeof payload !== 'object' ||
      (payload as { roomId?: unknown }).roomId !== roomId ||
      (payload as { playerId?: unknown }).playerId !== playerId
    ) {
      return;
    }
    this.logger.log(`Player ${playerId} requested to leave room ${roomId}`);
    this.performLeaveRoom(roomId, playerId, socket);
  }

  @SubscribeMessage('deleteRoom')
  handleDeleteRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    const roomId = socket.data?.roomId;
    if (
      !payload ||
      typeof payload !== 'object' ||
      (payload as { roomId?: unknown }).roomId !== roomId
    ) {
      return;
    }
    const room = this.rooms.get(roomId);
    if (!room || room.hostPlayerId !== socket.data?.playerId) {
      socket.emit('roomError', { error: 'Only the room host can delete it' });
      return;
    }
    this.logger.log(`Room ${roomId} explicitly deleted by client request`);

    // Notify anyone left (if any) and leave socket room
    this.server.to(`room-${roomId}`).emit('roomClosed', { reason: 'Room deleted by host' });

    this.rooms.delete(roomId);

    // Clean up socket association
    if (socket.data?.roomId === roomId) {
      socket.data = { userId: socket.data?.userId, role: socket.data?.role };
    }
    socket.leave(`room-${roomId}`);

    this.broadcastPublicRooms();
  }

  @SubscribeMessage('webrtcSignal')
  handleWebRtcSignal(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { roomId: string; signal: { type: 'offer' | 'answer' | 'candidate'; sdp?: string; candidate?: Record<string, unknown> | null } },
  ) {
    const roomId = socket.data?.roomId;
    if (
      !roomId ||
      !payload ||
      typeof payload !== 'object' ||
      (payload as { roomId?: unknown }).roomId !== roomId
    ) {
      return;
    }
    const signal = (payload as { signal?: unknown }).signal;
    if (
      !signal ||
      typeof signal !== 'object' ||
      !['offer', 'answer', 'candidate'].includes(
        (signal as { type?: unknown }).type as string,
      )
    ) {
      return;
    }
    socket.to(`room-${roomId}`).emit('webrtcSignal', { signal });
  }

  private performLeaveRoom(roomId: string, playerId: string, socket: Socket) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Filter out the leaving player
    room.players = room.players.filter((p) => p.id !== playerId);
    room.lastActive = Date.now();
    room.version += 1;

    // Clean up socket association
    if (socket.data?.roomId === roomId && socket.data?.playerId === playerId) {
      socket.data = { userId: socket.data?.userId, role: socket.data?.role };
    }
    socket.leave(`room-${roomId}`);

    const realPlayersCount = room.players.filter((p) => p.id !== 'bot').length;

    if (realPlayersCount === 0) {
      // 0 players left -> Start 5m grace period before pruning
      this.logger.log(`Room ${roomId} has no players left. Starting 5m grace period before deletion.`);

      room.status = 'waiting';
      room.list = [];
      room.winner = null;
      room.currentPlayerIndex = 0;
      delete room.startTime;
      this.rooms.set(roomId, room);

      setTimeout(() => {
        const currentRoom = this.rooms.get(roomId);
        if (currentRoom) {
          const currentRealPlayersCount = currentRoom.players.filter((p) => p.id !== 'bot').length;
          if (currentRealPlayersCount === 0) {
            this.logger.log(`Pruning empty room ${roomId} after 5 minutes of inactivity`);
            this.rooms.delete(roomId);
            this.broadcastPublicRooms();
          }
        }
      }, 5 * 60 * 1000);
    } else {
      // 1 player remains -> Reset room to waiting state
      room.status = 'waiting';
      room.list = [];
      room.winner = null;
      room.currentPlayerIndex = 0;
      delete room.startTime;
      room.players.forEach((p) => {
        p.isReady = false;
        p.board = Array(p.board.length).fill(0); // Reset board
      });
      this.rooms.set(roomId, room);

      this.logger.log(`Room ${roomId} reset (1 player left)`);
      this.server.to(`room-${roomId}`).emit('roomUpdated', room);
    }

    this.broadcastPublicRooms();
  }

  private getPublicRoomsList() {
    return Array.from(this.rooms.values())
      .filter((r) => r.status === 'waiting' && !r.isBotMatch)
      .map((r) => ({
        id: r.id,
        host: r.players[0]?.name || 'Unknown',
        playerCount: r.players.length,
        lastActive: r.lastActive,
        gridSize: r.gridSize || 5,
      }));
  }

  private broadcastPublicRooms() {
    this.server.emit('availableRooms', this.getPublicRoomsList());
  }
}
