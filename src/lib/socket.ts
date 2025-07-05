import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  connect(token?: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token: token || localStorage.getItem('token')
      },
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Join user to their groups for real-time updates
  joinGroups(groupIds: string[]) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-groups', groupIds);
    }
  }

  // Group event listeners
  onGroupUpdated(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('group-updated', callback);
    }
  }

  onGroupSettingsUpdated(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('group-settings-updated', callback);
    }
  }

  onMemberAdded(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('member-added', callback);
    }
  }

  onMemberRemoved(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('member-removed', callback);
    }
  }

  onMemberJoined(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('member-joined', callback);
    }
  }

  onMemberRoleUpdated(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('member-role-updated', callback);
    }
  }

  onGroupDeleted(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('group-deleted', callback);
    }
  }

  // Expense event listeners
  onExpenseCreated(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('expense-created', callback);
    }
  }

  onExpenseUpdated(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('expense-updated', callback);
    }
  }

  onExpenseSettled(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('expense-settled', callback);
    }
  }

  onExpenseDeleted(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('expense-deleted', callback);
    }
  }

  onSettlementAdded(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('settlement-added', callback);
    }
  }

  // Remove all listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  // Remove specific listeners
  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Get connection status
  get connected() {
    return this.isConnected && this.socket?.connected;
  }

  // Emit events
  emitGroupUpdate(data: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit('group-update', data);
    }
  }

  emitExpenseUpdate(data: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit('expense-update', data);
    }
  }
}

// Create a singleton instance
const socketService = new SocketService();

export default socketService;