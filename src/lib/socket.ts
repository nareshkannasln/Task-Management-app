import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(userId?: string) {
    if (this.socket?.connected) return;

    this.socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      if (userId) {
        this.socket?.emit('join_user_room', userId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    // Re-attach listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket?.on(event, callback);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);

    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  off(event: string, callback?: Function) {
    if (callback) {
      const callbacks = this.listeners.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      if (this.socket) {
        this.socket.off(event, callback as any);
      }
    } else {
      this.listeners.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }
}

export const socketManager = new SocketManager();