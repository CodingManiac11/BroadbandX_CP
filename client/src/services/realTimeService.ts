// Import with fallback for development
let io: any;
try {
  io = require('socket.io-client').io;
} catch (error) {
  console.warn('Socket.IO client not available. Real-time features disabled.');
  io = null;
}

type Socket = any;

// Define event data types
interface PlanRequestEvent {
  requestId: string;
  customerId: string;
  message: string;
  timestamp?: string;
  planRequest?: any;
  type?: string;
}

interface AdminPlanRequestEvent {
  requestId: string;
  requestType?: string;
  message: string;
  timestamp?: string;
  planRequest?: any;
  type?: string;
}

class RealTimeService {
  private socket: Socket | null = null;
  private listeners: { [key: string]: ((data: any) => void)[] } = {};
  private isConnecting = false;

  connect(userId?: string) {
    if (!io) {
      console.warn('Socket.IO not available');
      return null;
    }

    if (this.socket?.connected || this.isConnecting) {
      console.log('Already connected or connecting');
      return this.socket;
    }

    this.isConnecting = true;

    try {
      const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';
      console.log(`🔗 Connecting to ${socketUrl}...`);
      
      this.socket = io(socketUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        forceNew: true
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to real-time server');
        this.isConnecting = false;
        
        // Join user-specific room
        if (userId) {
          this.socket?.emit('join_user_room', userId);
          console.log(`📱 Joined user room: ${userId}`);
        }
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Disconnected from real-time server');
        this.isConnecting = false;
      });

      this.socket.on('connect_error', (error: any) => {
        console.error('🔥 Socket connection error:', error);
        this.isConnecting = false;
      });

      // Set up generic event listeners
      this.setupEventListeners();

    } catch (error) {
      console.error('Failed to create socket connection:', error);
      this.isConnecting = false;
    }

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners = {};
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Plan Request Events
    this.socket.on('plan_request_created', (data: PlanRequestEvent) => {
      this.emit('plan_request_created', data);
    });

    this.socket.on('plan_request_status_changed', (data: PlanRequestEvent) => {
      this.emit('plan_request_status_changed', data);
    });

    this.socket.on('plan_request_approved', (data: PlanRequestEvent) => {
      this.emit('plan_request_approved', data);
    });

    this.socket.on('plan_request_rejected', (data: PlanRequestEvent) => {
      this.emit('plan_request_rejected', data);
    });

    this.socket.on('plan_request_cancelled', (data: PlanRequestEvent) => {
      this.emit('plan_request_cancelled', data);
    });

    // Admin Events
    this.socket.on('admin_plan_request_created', (data: AdminPlanRequestEvent) => {
      this.emit('admin_plan_request_created', data);
    });

    this.socket.on('admin_plan_request_approved', (data: AdminPlanRequestEvent) => {
      this.emit('admin_plan_request_approved', data);
    });

    this.socket.on('admin_plan_request_rejected', (data: AdminPlanRequestEvent) => {
      this.emit('admin_plan_request_rejected', data);
    });

    this.socket.on('admin_plan_request_cancelled', (data: AdminPlanRequestEvent) => {
      this.emit('admin_plan_request_cancelled', data);
    });
  }

  // Join admin room for admin users
  joinAdminRoom() {
    if (this.socket) {
      this.socket.emit('join_admin_room');
      console.log('👑 Joined admin room for real-time updates');
    }
  }

  // Leave admin room
  leaveAdminRoom() {
    if (this.socket) {
      this.socket.emit('leave_admin_room');
      console.log('👋 Left admin room');
    }
  }

  // Event subscription
  on(event: string, callback: (data: any) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // Remove event listener
  off(event: string, callback: (data: any) => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  // Emit event to local listeners
  private emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Get connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const realTimeService = new RealTimeService();
export default realTimeService;