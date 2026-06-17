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
import { Logger } from '@nestjs/common';

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
}

@WebSocketGateway({
  namespace: 'bingo',
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowed = [
        'https://www.ijitest.org',
        'https://ijitest.org',
        'https://bingopartyduo.vercel.app',
        'http://localhost:3000',
      ];
      const envUrl = process.env['FRONTEND_URL'];
      if (envUrl && !allowed.includes(envUrl)) {
        allowed.push(envUrl);
      }
      if (!origin || allowed.some(o => o === origin || o.replace(/\/$/, '') === origin.replace(/\/$/, ''))) {
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
  constructor() {
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
    @MessageBody() room: Room,
  ) {
    this.logger.log(`Room created: ${room.id} by ${room.players[0]?.name}`);
    room.lastActive = Date.now();
    this.rooms.set(room.id, room);

    // Track room info on socket
    socket.data = { roomId: room.id, playerId: room.players[0]?.id };
    socket.join(`room-${room.id}`);

    // Update lobby list for everyone
    this.broadcastPublicRooms();
    
    // Acknowledge creator
    socket.emit('roomUpdated', room);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { roomId: string; player: Player },
  ) {
    const { roomId, player } = payload;
    const room = this.rooms.get(roomId);

    if (!room) {
      this.logger.warn(`Join failed: Room ${roomId} not found`);
      socket.emit('joinError', { error: 'Room not found' });
      return;
    }

    // Support reconnection if player is already in the room
    const existingPlayer = room.players.find(
      (p) => p.id === player.id || p.name === player.name,
    );
    if (existingPlayer) {
      // Update socket associations
      socket.data = { roomId, playerId: existingPlayer.id };
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

    // Add player
    room.players.push(player);
    if (room.players.length === 2) {
      room.status = 'setup';
    }
    room.lastActive = Date.now();
    room.version += 1;

    this.rooms.set(roomId, room);

    // Track room info on socket
    socket.data = { roomId, playerId: player.id };
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
    @MessageBody() room: Room,
  ) {
    const existing = this.rooms.get(room.id);
    if (!existing) {
      this.logger.warn(`Update failed: Room ${room.id} not found`);
      return;
    }

    room.lastActive = Date.now();
    this.rooms.set(room.id, room);

    // Broadcast to everyone in the room
    this.server.to(`room-${room.id}`).emit('roomUpdated', room);

    // If status changed (e.g. starting, playing), update lobby list
    this.broadcastPublicRooms();
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { roomId: string; playerId: string },
  ) {
    const { roomId, playerId } = payload;
    this.logger.log(`Player ${playerId} requested to leave room ${roomId}`);
    this.performLeaveRoom(roomId, playerId, socket);
  }

  @SubscribeMessage('deleteRoom')
  handleDeleteRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    const { roomId } = payload;
    this.logger.log(`Room ${roomId} explicitly deleted by client request`);
    
    // Notify anyone left (if any) and leave socket room
    this.server.to(`room-${roomId}`).emit('roomClosed', { reason: 'Room deleted by host' });
    
    this.rooms.delete(roomId);
    
    // Clean up socket association
    if (socket.data?.roomId === roomId) {
      socket.data = {};
    }
    socket.leave(`room-${roomId}`);

    this.broadcastPublicRooms();
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
      socket.data = {};
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
      }));
  }

  private broadcastPublicRooms() {
    this.server.emit('availableRooms', this.getPublicRoomsList());
  }
}
