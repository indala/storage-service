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
import { verify } from 'jsonwebtoken';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly activeClients = new Map<string, Set<Socket>>();

  constructor(private readonly configService: ConfigService) {}

  async handleConnection(socket: Socket) {
    let token =
      socket.handshake.auth?.token || socket.handshake.headers?.authorization;

    if (typeof token === 'string' && token.startsWith('Bearer ')) {
      token = token.substring(7);
    }

    if (!token) {
      this.logger.warn(
        `Connection rejected: No token provided (socketId: ${socket.id})`,
      );
      socket.disconnect();
      return;
    }

    const secret = this.configService.get<string>('STORAGE_SERVICE_SECRET');
    if (!secret) {
      this.logger.error(
        'STORAGE_SERVICE_SECRET is not configured in the environment.',
      );
      socket.disconnect();
      return;
    }

    try {
      const decoded = verify(token, secret) as { userId: string; role: string };

      if (!decoded.userId || !decoded.role) {
        throw new Error('Token payload is missing userId or role');
      }

      socket.data = { userId: decoded.userId, role: decoded.role };

      const userId = decoded.userId;
      let clientSockets = this.activeClients.get(userId);
      if (!clientSockets) {
        clientSockets = new Set<Socket>();
        this.activeClients.set(userId, clientSockets);
      }
      clientSockets.add(socket);

      this.logger.log(
        `Client connected: User ${userId} (${decoded.role}) on socket ${socket.id}`,
      );

      // Acknowledge connection
      socket.emit('authenticated', { userId, role: decoded.role });

      // Broadcast online status to all users
      this.broadcastOnlineUsers();
    } catch (error: any) {
      this.logger.warn(
        `Connection rejected: Invalid token - ${error.message} (socketId: ${socket.id})`,
      );
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const userId = socket.data?.userId;
    if (userId) {
      const sockets = this.activeClients.get(userId);
      if (sockets) {
        sockets.delete(socket);
        if (sockets.size === 0) {
          this.activeClients.delete(userId);
        }
      }
      this.logger.log(
        `Client disconnected: User ${userId} from socket ${socket.id}`,
      );
      this.broadcastOnlineUsers();
    }
  }

  private broadcastOnlineUsers() {
    const onlineUserIds = Array.from(this.activeClients.keys());
    this.server.emit('onlineUsers', onlineUserIds);
  }

  @SubscribeMessage('sendMessage')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      id: number;
      senderId: string;
      receiverId: string;
      submissionId: number | null;
      messageText: string;
      isRead: boolean;
      createdAt: any;
      senderName?: string | null;
      receiverName?: string | null;
    },
  ) {
    const senderId = client.data?.userId;

    if (!senderId) {
      this.logger.warn(
        `Message blocked: Socket ${client.id} is not authenticated`,
      );
      return;
    }

    if (senderId !== payload.senderId) {
      this.logger.warn(
        `User ${senderId} attempted to spoof senderId ${payload.senderId}`,
      );
      return;
    }

    const receiverId = payload.receiverId;
    this.logger.log(`Relaying message from ${senderId} to ${receiverId}`);

    // Forward to receiver sockets
    const receiverSockets = this.activeClients.get(receiverId);
    if (receiverSockets && receiverSockets.size > 0) {
      for (const socket of receiverSockets) {
        socket.emit('receiveMessage', payload);
      }
    }

    // Echo to sender's other sockets (for multi-tab synchronization)
    const senderSockets = this.activeClients.get(senderId);
    if (senderSockets && senderSockets.size > 0) {
      for (const socket of senderSockets) {
        if (socket.id !== client.id) {
          socket.emit('receiveMessage', payload);
        }
      }
    }
  }

  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const onlineUserIds = Array.from(this.activeClients.keys());
    client.emit('onlineUsers', onlineUserIds);
  }
}
