import { API_CONFIG, WS_EVENTS } from '@/config/api';

class WebSocketClient {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.connected = false;
    this.connectionId = null;
  }

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    const token = localStorage.getItem('access_token');
    // Use API_CONFIG.WS_URL which gets from import.meta.env
    const wsUrl = API_CONFIG.WS_URL;
    
    try {
      // Build WebSocket URL with token
      const url = token ? `${wsUrl}?token=${token}` : wsUrl;
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.emit(WS_EVENTS.CONNECT);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.connected = false;
        this.connectionId = null;
        this.emit(WS_EVENTS.DISCONNECT, { code: event.code, reason: event.reason });
        
        if (event.code !== 1000) {
          this.attemptReconnect();
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit(WS_EVENTS.ERROR, error);
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }

  // ... rest of the WebSocket class remains the same
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  handleMessage(data) {
    const { event, payload, connection_id } = data;
    
    if (connection_id && !this.connectionId) {
      this.connectionId = connection_id;
    }
    
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(payload));
    }
    
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(callback => callback({ event, payload }));
    }
  }

  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    return () => {
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(callback);
      }
    };
  }

  emit(event, payload) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(payload));
    }
  }

  send(event, payload) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event, payload }));
    } else {
      console.warn('WebSocket not connected');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close(1000, 'Client disconnected');
      this.socket = null;
    }
    this.listeners.clear();
    this.connected = false;
    this.connectionId = null;
  }

  isConnected() {
    return this.connected;
  }

  getConnectionId() {
    return this.connectionId;
  }

  subscribeToOrders(callback) {
    return this.subscribe(WS_EVENTS.ORDER_CREATED, callback);
  }

  subscribeToRiskAlerts(callback) {
    return this.subscribe(WS_EVENTS.RISK_ALERT, callback);
  }

  subscribeToNotifications(callback) {
    return this.subscribe(WS_EVENTS.NOTIFICATION, callback);
  }
}

export const websocketClient = new WebSocketClient();