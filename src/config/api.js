// src/config/api.js

// Get environment from import.meta.env or use defaults
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000/api';
const WS_URL = import.meta.env?.VITE_WS_URL || 'ws://localhost:5001';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  WS_URL: WS_URL,
  TIMEOUT: 30000,
  
  ENDPOINTS: {
    // Auth
    LOGIN: '/auth/login',
    
    // Analytics
    OVERVIEW_STATS: '/analytics/overview',
    SUPPLY_DEMAND_CHART: '/analytics/supply-demand',
    VARIETY_DISTRIBUTION: '/analytics/variety-distribution',
    RISK_ALERTS: '/analytics/risk-alerts',
    COST_ANALYSIS: '/analytics/cost-analysis',
    
    // Farmers
    FARMERS: '/farmers',
    FARMER_DETAIL: (id) => `/farmers/${id}`,
    
    // Crops
    CROPS: '/crops',
    
    // Procurement
    PROCUREMENT_ORDERS: '/procurement/orders',
    DEMAND_FORECAST: '/procurement/demand-forecast',
    SUPPLY_RECONCILIATION: '/procurement/supply-reconciliation',
    HARVEST_READINESS: '/procurement/harvest-readiness',
    
    // Notifications
    NOTIFICATIONS: '/notifications',
    
    // Health
    HEALTH: '/health',
  }
};

export const WS_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  DASHBOARD_UPDATE: 'dashboard_update',
  ORDER_CREATED: 'order_created',
  ORDER_UPDATED: 'order_updated',
  RISK_ALERT: 'risk_alert',
  NOTIFICATION: 'notification',
};