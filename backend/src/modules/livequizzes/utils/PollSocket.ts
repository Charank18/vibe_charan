import { Server } from 'socket.io';

class PollSocket {
  private io: Server | null = null;
  private roomUsers: Map<string, Set<string>> = new Map(); // roomCode -> Set of socketIds

  init(server: import('http').Server) {
    this.io = new Server(server, { 
      cors: { 
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST']
      } 
    });

    this.io.on('connection', socket => {
      console.log('Client connected:', socket.id);

      // Handle room joining
      socket.on('join-room', (roomCode: string) => {
        socket.join(roomCode);
        
        // Track users in room
        if (!this.roomUsers.has(roomCode)) {
          this.roomUsers.set(roomCode, new Set());
        }
        this.roomUsers.get(roomCode)?.add(socket.id);
        
        console.log(`Socket ${socket.id} joined room: ${roomCode}`);
        
        // Notify others in room about new participant
        socket.to(roomCode).emit('user-joined', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });

        // Send current room info to the new user
        const userCount = this.roomUsers.get(roomCode)?.size || 0;
        socket.emit('room-info', {
          roomCode,
          userCount,
          timestamp: new Date().toISOString()
        });
      });

      // Handle room leaving
      socket.on('leave-room', (roomCode: string) => {
        socket.leave(roomCode);
        
        // Remove from room tracking
        this.roomUsers.get(roomCode)?.delete(socket.id);
        
        console.log(`Socket ${socket.id} left room: ${roomCode}`);
        
        // Notify others in room
        socket.to(roomCode).emit('user-left', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
      });

      // Handle poll answer submission (for real-time feedback)
      socket.on('poll-answer-submitted', (data: {
        roomCode: string;
        pollId: string;
        userId: string;
        answerIndex: number;
      }) => {
        // Broadcast to teacher/other participants that someone answered
        socket.to(data.roomCode).emit('answer-received', {
          pollId: data.pollId,
          userId: data.userId,
          answerIndex: data.answerIndex,
          timestamp: new Date().toISOString()
        });
      });

      // Handle teacher poll creation confirmation
      socket.on('poll-created', (data: {
        roomCode: string;
        pollId: string;
        question: string;
      }) => {
        console.log(`Poll created in room ${data.roomCode}: ${data.pollId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Remove from all rooms
        for (const [roomCode, users] of this.roomUsers.entries()) {
          if (users.has(socket.id)) {
            users.delete(socket.id);
            
            // Notify room about user leaving
            socket.to(roomCode).emit('user-left', {
              socketId: socket.id,
              timestamp: new Date().toISOString()
            });
            
            // Clean up empty rooms
            if (users.size === 0) {
              this.roomUsers.delete(roomCode);
            }
          }
        }
      });

      // Handle ping for connection testing
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });
    });
  }

  // Emit new poll to all students in room
  emitToRoom(roomCode: string, event: string, data: any) {
    if (this.io) {
      this.io.to(roomCode).emit(event, data);
      console.log(`Emitted ${event} to room ${roomCode}:`, data);
    }
  }

  // Emit to specific socket
  emitToSocket(socketId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(socketId).emit(event, data);
      console.log(`Emitted ${event} to socket ${socketId}:`, data);
    }
  }

  // Get room statistics
  getRoomStats(roomCode: string) {
    const users = this.roomUsers.get(roomCode);
    return {
      userCount: users?.size || 0,
      users: users ? Array.from(users) : []
    };
  }

  // Broadcast poll timer updates
  broadcastTimerUpdate(roomCode: string, pollId: string, timeRemaining: number) {
    this.emitToRoom(roomCode, 'poll-timer-update', {
      pollId,
      timeRemaining,
      timestamp: new Date().toISOString()
    });
  }

  // Notify about poll ending
  notifyPollEnded(roomCode: string, pollId: string, reason: 'timer' | 'manual' = 'timer') {
    this.emitToRoom(roomCode, 'poll-ended', {
      pollId,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  // Notify about room closure
  notifyRoomClosed(roomCode: string, reason: string = 'Room closed by teacher') {
    this.emitToRoom(roomCode, 'room-ended', {
      message: reason,
      timestamp: new Date().toISOString()
    });
    
    // Clean up room tracking
    this.roomUsers.delete(roomCode);
  }

  // Send live results to teacher
  sendLiveResults(roomCode: string, pollId: string, results: any) {
    this.emitToRoom(roomCode, 'live-results', {
      pollId,
      results,
      timestamp: new Date().toISOString()
    });
  }

  // Get all active rooms
  getActiveRooms(): string[] {
    return Array.from(this.roomUsers.keys());
  }

  // Check if room exists and has users
  isRoomActive(roomCode: string): boolean {
    const users = this.roomUsers.get(roomCode);
    return users !== undefined && users.size > 0;
  }
}

export const pollSocket = new PollSocket()