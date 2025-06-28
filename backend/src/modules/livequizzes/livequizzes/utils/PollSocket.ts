// src/modules/livequizzes/utils/PollSocket.ts
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

class PollSocket {
  private io: SocketIOServer | null = null;

  public init(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: 'http://localhost:5137', // your frontend port
        methods: ['GET', 'POST'],
      },
    });

    const namespace = this.io.of('/livequizzes');

    namespace.on('connection', (socket) => {
      console.log('✅ Socket connected:', socket.id);

      socket.on('join-room', (roomId: string) => {
        socket.join(roomId);
        console.log(`📢 Socket ${socket.id} joined room ${roomId}`);
      });

      socket.on('submit-answer', (payload) => {
        // broadcast to all in the room except sender
        socket.to(payload.roomId).emit('answer-received', payload);
      });

      socket.on('disconnect', () => {
        console.log(`❌ Socket ${socket.id} disconnected`);
      });
    });
  }

  public emitToRoom(roomId: string, event: string, data: any) {
    if (!this.io) throw new Error('Socket.io not initialized');
    // Use the namespace if you are emitting to /livequizzes
    this.io.of('/livequizzes').to(roomId).emit(event, data);
  }

  public getIO(): SocketIOServer {
    if (!this.io) throw new Error('Socket.io not initialized');
    return this.io;
  }
}

export const pollSocket = new PollSocket();
