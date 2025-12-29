import axios from 'axios';
import { API_CONFIG } from '@/config/api';

// Create axios instance
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);

// Analytics endpoints
const analyticsApi = {
  getOverviewStats: () => api.get(API_CONFIG.ENDPOINTS.OVERVIEW_STATS),
  getSupplyDemandChart: (period = '30days') => 
    api.get(`${API_CONFIG.ENDPOINTS.SUPPLY_DEMAND_CHART}?period=${period}`),
  getVarietyDistribution: () => api.get(API_CONFIG.ENDPOINTS.VARIETY_DISTRIBUTION),
  getRiskAlerts: () => api.get(API_CONFIG.ENDPOINTS.RISK_ALERTS),
  getCostAnalysis: () => api.get(API_CONFIG.ENDPOINTS.COST_ANALYSIS),
};

// Farmers endpoints
const farmersApi = {
  getAll: (params = {}) => api.get(API_CONFIG.ENDPOINTS.FARMERS, { params }),
  getById: (id) => api.get(API_CONFIG.ENDPOINTS.FARMER_DETAIL(id)),
};

// Procurement endpoints
const procurementApi = {
  getOrders: (params = {}) => api.get(API_CONFIG.ENDPOINTS.PROCUREMENT_ORDERS, { params }),
  getDemandForecast: () => api.get(API_CONFIG.ENDPOINTS.DEMAND_FORECAST),
  getSupplyReconciliation: () => api.get(API_CONFIG.ENDPOINTS.SUPPLY_RECONCILIATION),
  getHarvestReadiness: (days = 7) => 
    api.get(API_CONFIG.ENDPOINTS.HARVEST_READINESS, { params: { days } }),
};

// Aggregators API
const aggregatorsApi = {
  getAll: () => api.get('/aggregators'),
  getById: (id) => api.get(`/aggregators/${id}`),
  create: (aggregatorData) => api.post('/aggregators', aggregatorData),
  update: (id, aggregatorData) => api.put(`/aggregators/${id}`, aggregatorData),
  delete: (id) => api.delete(`/aggregators/${id}`),
  getStats: () => api.get('/aggregators-stats'),
};

// Contracts API
const contractsApi = {
  getAll: () => api.get('/contracts'),
  getById: (id) => api.get(`/contracts/${id}`),
  create: (contractData) => api.post('/contracts', contractData),
  update: (id, contractData) => api.put(`/contracts/${id}`, contractData),
  updateFulfillment: (id, fulfillment_percentage) => 
    api.patch(`/contracts/${id}/fulfillment`, { fulfillment_percentage }),
  delete: (id) => api.delete(`/contracts/${id}`),
  getStats: () => api.get('/contracts-stats'),
};

// Health check
const healthApi = () => api.get(API_CONFIG.ENDPOINTS.HEALTH);

// Main API service object
export const apiService = {
  analytics: analyticsApi,
  farmers: farmersApi,
  procurement: procurementApi,
  aggregators: aggregatorsApi,
  contracts: contractsApi,
  health: healthApi,
};

// Optional: Export individual APIs if needed
export { analyticsApi, farmersApi, procurementApi, aggregatorsApi, contractsApi };