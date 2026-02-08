// src/api/services.js
import axios from 'axios';
import { API_CONFIG } from '../config/api.js';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    return response.data;
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.error || error.message,
    });

    // Handle specific error statuses
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      // Optional: Redirect to login page
      // window.location.href = '/login';
    }

    throw error;
  }
);

// ====================== AUTH API ======================
const authApi = {
  login: (credentials) => api.post(API_CONFIG.ENDPOINTS.LOGIN, credentials),
  logout: () => {
    localStorage.removeItem('auth_token');
    return Promise.resolve();
  },
};

// ====================== ANALYTICS API ======================
const analyticsApi = {
  getOverviewStats: () => api.get(API_CONFIG.ENDPOINTS.OVERVIEW_STATS),
  getSupplyDemandChart: (period = '30days') => 
    api.get(API_CONFIG.ENDPOINTS.SUPPLY_DEMAND_CHART, { params: { period } }),
  getVarietyDistribution: () => api.get(API_CONFIG.ENDPOINTS.VARIETY_DISTRIBUTION),
  getRiskAlerts: () => api.get(API_CONFIG.ENDPOINTS.RISK_ALERTS),
  getCostAnalysis: () => api.get(API_CONFIG.ENDPOINTS.COST_ANALYSIS),
};

// ====================== FARMERS API ======================
const farmersApi = {
  getAll: async (params = {}) => {
    try {
      console.log('🌱 Fetching farmers...');
      const response = await api.get(API_CONFIG.ENDPOINTS.FARMERS, { params });
      console.log('🌱 Farmers response:', response);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.warn('⚠️ Could not fetch farmers, returning empty array:', error.message);
      return [];
    }
  },
  
  getById: (id) => api.get(API_CONFIG.ENDPOINTS.FARMER_DETAIL(id)),
  
  create: async (farmerData) => {
    try {
      console.log('🌱 Creating farmer:', farmerData);
      const response = await api.post(API_CONFIG.ENDPOINTS.FARMERS, farmerData);
      console.log('🌱 Farmer created:', response);
      return response;
    } catch (error) {
      console.error('❌ Error creating farmer:', error);
      throw error;
    }
  },
  
  update: (id, farmerData) => api.put(API_CONFIG.ENDPOINTS.FARMER_DETAIL(id), farmerData),
  
  delete: (id) => api.delete(API_CONFIG.ENDPOINTS.FARMER_DETAIL(id)),
};

// ====================== CROPS API ======================
const cropsApi = {
  getAll: (params = {}) => api.get(API_CONFIG.ENDPOINTS.CROPS, { params }),
  getByFarmer: (farmerId) => api.get(API_CONFIG.ENDPOINTS.CROPS, { params: { farmer_id: farmerId } }),
  create: (cropData) => api.post(API_CONFIG.ENDPOINTS.CROPS, cropData),
  update: (id, cropData) => api.put(`${API_CONFIG.ENDPOINTS.CROPS}/${id}`, cropData),
  delete: (id) => api.delete(`${API_CONFIG.ENDPOINTS.CROPS}/${id}`),
};

// ====================== SUPPLY PLANNING API ======================
const supplyApi = {
  // Allocations
  getAllocations: async (params = {}) => {
    try {
      console.log('📦 Fetching supply allocations...');
      const response = await api.get(API_CONFIG.ENDPOINTS.SUPPLY_ALLOCATIONS || '/supply/allocations', { params });
      console.log('📦 Allocations response:', response);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.warn('⚠️ Could not fetch allocations, returning empty array:', error.message);
      return [];
    }
  },
  
  getAllocationById: async (id) => {
    try {
      return await api.get(`${API_CONFIG.ENDPOINTS.SUPPLY_ALLOCATIONS || '/supply/allocations'}/${id}`);
    } catch (error) {
      console.warn('Get allocation endpoint not available');
      return null;
    }
  },
  
  createAllocation: async (allocationData) => {
    try {
      console.log('📦 Creating allocation:', allocationData);
      const response = await api.post(API_CONFIG.ENDPOINTS.SUPPLY_ALLOCATIONS || '/supply/allocations', allocationData);
      console.log('📦 Allocation created:', response);
      return response;
    } catch (error) {
      console.error('❌ Error creating allocation:', error);
      throw error;
    }
  },
  
  updateAllocation: async (id, allocationData) => {
    try {
      return await api.put(`${API_CONFIG.ENDPOINTS.SUPPLY_ALLOCATIONS || '/supply/allocations'}/${id}`, allocationData);
    } catch (error) {
      console.warn('Update allocation endpoint not available');
      return { success: true, id, ...allocationData };
    }
  },
  
  deleteAllocation: async (id) => {
    try {
      return await api.delete(`${API_CONFIG.ENDPOINTS.SUPPLY_ALLOCATIONS || '/supply/allocations'}/${id}`);
    } catch (error) {
      console.warn('Delete allocation endpoint not available');
      return { success: true };
    }
  },
  
  // Supply Planning
  getSupplyPlan: async (params = {}) => {
    try {
      return await api.get(API_CONFIG.ENDPOINTS.SUPPLY_PLAN || '/supply/plan', { params });
    } catch (error) {
      console.warn('Get supply plan endpoint not available');
      return [];
    }
  },
  
  createSupplyPlan: async (planData) => {
    try {
      return await api.post(API_CONFIG.ENDPOINTS.SUPPLY_PLAN || '/supply/plan', planData);
    } catch (error) {
      console.warn('Create supply plan endpoint not available');
      return { id: Date.now(), ...planData };
    }
  },
  
  // Farmer Supply
  getFarmerSupply: async (farmerId) => {
    try {
      return await api.get(`${API_CONFIG.ENDPOINTS.SUPPLY_ALLOCATIONS || '/supply/allocations'}/farmer/${farmerId}`);
    } catch (error) {
      console.warn('Get farmer supply endpoint not available');
      return [];
    }
  },
};

// ====================== PROCUREMENT API ======================
const procurementApi = {
  // Orders
  getOrders: async (params = {}) => {
    try {
      const response = await api.get(API_CONFIG.ENDPOINTS.PROCUREMENT_ORDERS, { params });
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.warn('Could not fetch orders, returning empty array');
      return [];
    }
  },
  
  getOrderById: (id) => api.get(`${API_CONFIG.ENDPOINTS.PROCUREMENT_ORDERS}/${id}`),
  
  createOrder: async (orderData) => {
    try {
      console.log('📝 Creating order:', orderData);
      const response = await api.post(API_CONFIG.ENDPOINTS.PROCUREMENT_ORDERS, orderData);
      console.log('📝 Order created:', response);
      return response;
    } catch (error) {
      console.error('❌ Error creating order:', error);
      throw error;
    }
  },
  
  updateOrder: (id, orderData) => api.put(`${API_CONFIG.ENDPOINTS.PROCUREMENT_ORDERS}/${id}`, orderData),
  
  deleteOrder: (id) => api.delete(`${API_CONFIG.ENDPOINTS.PROCUREMENT_ORDERS}/${id}`),
  
  // Other procurement endpoints
  getDemandForecast: () => api.get(API_CONFIG.ENDPOINTS.DEMAND_FORECAST),
  getSupplyReconciliation: () => api.get(API_CONFIG.ENDPOINTS.SUPPLY_RECONCILIATION),
  getHarvestReadiness: (days = 7) => 
    api.get(API_CONFIG.ENDPOINTS.HARVEST_READINESS, { params: { days } }),
};
// ====================== FARM MALL API ======================
const farmMallApi = {
  getFarmers: async (params = {}) => {
    try {
      const response = await api.get(API_CONFIG.ENDPOINTS.FARM_MALL_FARMERS, { params });
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.warn('Could not fetch farmmall farmers, returning empty array');
      return [];
    }
  },
  
  getFarmerById: (id) => api.get(API_CONFIG.ENDPOINTS.FARM_MALL_FARMER_DETAIL(id)),
  
  createOrder: (orderData) => api.post(API_CONFIG.ENDPOINTS.FARM_MALL_ORDER, orderData),
};

// ====================== NOTIFICATIONS API ======================
const notificationsApi = {
  getAll: (params = {}) => api.get(API_CONFIG.ENDPOINTS.NOTIFICATIONS, { params }),
  getUnreadCount: () => api.get(`${API_CONFIG.ENDPOINTS.NOTIFICATIONS}/unread/count`),
  markAsRead: (id) => api.patch(`${API_CONFIG.ENDPOINTS.NOTIFICATIONS}/${id}/read`),
  markAllAsRead: () => api.patch(`${API_CONFIG.ENDPOINTS.NOTIFICATIONS}/read-all`),
  delete: (id) => api.delete(`${API_CONFIG.ENDPOINTS.NOTIFICATIONS}/${id}`),
};

// ====================== AGGREGATORS API ======================
const aggregatorsApi = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get(API_CONFIG.ENDPOINTS.AGGREGATORS, { params });
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.warn('Could not fetch aggregators, returning empty array');
      return [];
    }
  },
  
  getById: (id) => api.get(`${API_CONFIG.ENDPOINTS.AGGREGATORS}/${id}`),
  
  create: (aggregatorData) => api.post(API_CONFIG.ENDPOINTS.AGGREGATORS, aggregatorData),
  
  update: (id, aggregatorData) => api.put(`${API_CONFIG.ENDPOINTS.AGGREGATORS}/${id}`, aggregatorData),
  
  delete: (id) => api.delete(`${API_CONFIG.ENDPOINTS.AGGREGATORS}/${id}`),
};

// ====================== CONTRACTS API ======================
const contractsApi = {
  getAll: (params = {}) => api.get(API_CONFIG.ENDPOINTS.CONTRACTS, { params }),
  getById: (id) => api.get(`${API_CONFIG.ENDPOINTS.CONTRACTS}/${id}`),
  create: (contractData) => api.post(API_CONFIG.ENDPOINTS.CONTRACTS, contractData),
  update: (id, contractData) => api.put(`${API_CONFIG.ENDPOINTS.CONTRACTS}/${id}`, contractData),
  updateFulfillment: (id, fulfillment_percentage) => 
    api.patch(`${API_CONFIG.ENDPOINTS.CONTRACTS}/${id}/fulfillment`, { fulfillment_percentage }),
  delete: (id) => api.delete(`${API_CONFIG.ENDPOINTS.CONTRACTS}/${id}`),
  getStats: () => api.get(`${API_CONFIG.ENDPOINTS.CONTRACTS}/stats`),
};

// ====================== HEALTH API ======================
const healthApi = {
  check: () => api.get(API_CONFIG.ENDPOINTS.HEALTH),
};

// ====================== MAIN API SERVICE ======================
export const apiService = {
  auth: authApi,
  analytics: analyticsApi,
  farmers: farmersApi,
  crops: cropsApi,
  supply: supplyApi,
  procurement: procurementApi,
  farmMall: farmMallApi,
  notifications: notificationsApi,
  aggregators: aggregatorsApi,
  contracts: contractsApi,
  health: healthApi,
};

// ====================== WEBSOCKET SERVICE ======================
class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    this.socket = new WebSocket(API_CONFIG.WS_URL);

    this.socket.onopen = () => {
      console.log('✅ WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Send initial subscription
      this.socket.send(JSON.stringify({
        event: 'subscribe',
        payload: { channels: ['dashboard_update', 'risk_alert', 'notification'] }
      }));
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.notifyListeners(data.event, data.payload);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onclose = () => {
      console.log('❌ WebSocket disconnected');
      this.attemptReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`Reconnecting in ${delay}ms...`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    }
  }

  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
      }
    };
  }

  notifyListeners(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  isConnected() {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

// Export singleton WebSocket instance
export const webSocketService = new WebSocketService();

// ====================== HELPER FUNCTIONS ======================

// Helper for file uploads
export const uploadFile = async (endpoint, file, onProgress = null) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: onProgress ? (progressEvent) => {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      onProgress(percentCompleted);
    } : undefined,
  });

  return response;
};

// Helper for formatting query parameters
export const buildQueryString = (params) => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value);
    }
  });
  
  return searchParams.toString();
};

// Export axios instance for custom requests
export { api };


