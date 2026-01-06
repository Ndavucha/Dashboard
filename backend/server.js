// backend/server.js
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const PORT = process.env.PORT || 5000;
const WS_PORT = process.env.WS_PORT || 5001;

// ====================== MIDDLEWARE ======================
app.use(cors({
  origin: '*',  // Allow ALL origins (temporary)
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====================== DEBUG MIDDLEWARE ======================
// Add this to see all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ====================== EMPTY DATABASE ======================
const database = {
  aggregators: [],
  farmers: [],
  crops: [],
  orders: [],
  contracts: [],
  supplyAllocations: [],
  supplyPlan: [],
  notifications: []
};

// ====================== HEALTH & AUTH ======================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Supply Chain Backend is running',
    timestamp: new Date().toISOString(),
    dataStatus: 'empty'
  });
});

// Auth endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  res.json({ 
    token: 'demo-token-' + Date.now(),
    user: { 
      id: 1, 
      name: 'Admin', 
      email: username,
      role: 'admin',
      firstLogin: database.farmers.length === 0
    }
  });
});

// ====================== AGGREGATORS ENDPOINTS ======================

app.get('/api/aggregators', (req, res) => {
  console.log('📊 Returning aggregators:', database.aggregators.length);
  res.json(database.aggregators);
});

app.get('/api/aggregators/:id', (req, res) => {
  const aggregator = database.aggregators.find(a => a.id === parseInt(req.params.id));
  if (aggregator) {
    res.json(aggregator);
  } else {
    res.status(404).json({ error: 'Aggregator not found' });
  }
});

app.post('/api/aggregators', (req, res) => {
  const aggregator = {
    id: database.aggregators.length + 1,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  database.aggregators.push(aggregator);
  res.status(201).json(aggregator);
});

app.put('/api/aggregators/:id', (req, res) => {
  const index = database.aggregators.findIndex(a => a.id === parseInt(req.params.id));
  if (index !== -1) {
    database.aggregators[index] = {
      ...database.aggregators[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    res.json(database.aggregators[index]);
  } else {
    res.status(404).json({ error: 'Aggregator not found' });
  }
});

app.delete('/api/aggregators/:id', (req, res) => {
  const index = database.aggregators.findIndex(a => a.id === parseInt(req.params.id));
  if (index !== -1) {
    database.aggregators.splice(index, 1);
    res.json({ message: 'Aggregator deleted successfully' });
  } else {
    res.status(404).json({ error: 'Aggregator not found' });
  }
});

app.get('/api/aggregators-stats', (req, res) => {
  const aggregators = database.aggregators || [];
  const internal_count = aggregators.filter(a => a.type === 'internal').length;
  const external_count = aggregators.filter(a => a.type === 'external').length;
  const total_volume = aggregators.reduce((sum, agg) => sum + (agg.historical_volume || 0), 0);
  const avg_reliability = aggregators.length > 0 
    ? aggregators.reduce((sum, agg) => sum + (agg.reliability_score || 0), 0) / aggregators.length
    : 0;

  res.json({
    internal_count,
    external_count,
    total_volume,
    avg_reliability: Math.round(avg_reliability)
  });
});

// ====================== SUPPLY PLANNING ENDPOINTS ======================

// Get all supply allocations
app.get('/api/supply/allocations', (req, res) => {
  console.log('📊 Returning allocations:', database.supplyAllocations.length);
  res.json(database.supplyAllocations);
});

// Create new allocation
app.post('/api/supply/allocations', (req, res) => {
  try {
    const allocation = {
      id: database.supplyAllocations.length + 1,
      ...req.body,
      status: req.body.status || 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    database.supplyAllocations.push(allocation);
    
    // Update WebSocket clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          event: 'allocation_created',
          allocation
        }));
      }
    });
    
    res.status(201).json(allocation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create allocation' });
  }
});

// Get single allocation
app.get('/api/supply/allocations/:id', (req, res) => {
  const allocation = database.supplyAllocations.find(a => a.id === parseInt(req.params.id));
  if (allocation) {
    res.json(allocation);
  } else {
    res.status(404).json({ error: 'Allocation not found' });
  }
});

// Update allocation
app.put('/api/supply/allocations/:id', (req, res) => {
  try {
    const index = database.supplyAllocations.findIndex(a => a.id === parseInt(req.params.id));
    if (index !== -1) {
      database.supplyAllocations[index] = {
        ...database.supplyAllocations[index],
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      res.json(database.supplyAllocations[index]);
    } else {
      res.status(404).json({ error: 'Allocation not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update allocation' });
  }
});

// Delete allocation
app.delete('/api/supply/allocations/:id', (req, res) => {
  try {
    const index = database.supplyAllocations.findIndex(a => a.id === parseInt(req.params.id));
    if (index !== -1) {
      const deletedAllocation = database.supplyAllocations.splice(index, 1)[0];
      res.json({ 
        message: 'Allocation deleted successfully', 
        allocation: deletedAllocation 
      });
    } else {
      res.status(404).json({ error: 'Allocation not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete allocation' });
  }
});

// Supply Plan endpoints
app.get('/api/supply/plan', (req, res) => {
  const period = req.query.period || 'month';
  res.json(database.supplyPlan);
});

app.post('/api/supply/plan', (req, res) => {
  const plan = {
    id: database.supplyPlan.length + 1,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  database.supplyPlan.push(plan);
  res.status(201).json(plan);
});

app.put('/api/supply/plan/:id', (req, res) => {
  const index = database.supplyPlan.findIndex(p => p.id === parseInt(req.params.id));
  if (index !== -1) {
    database.supplyPlan[index] = {
      ...database.supplyPlan[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    res.json(database.supplyPlan[index]);
  } else {
    res.status(404).json({ error: 'Supply plan not found' });
  }
});

// Farmer availability
app.get('/api/supply/farmer-availability', (req, res) => {
  // Return farmers with their availability status
  const farmers = database.farmers.map(farmer => ({
    id: farmer.id,
    name: farmer.name,
    county: farmer.county,
    crop: farmer.crop,
    isAvailable: true, // Default to available
    nextAvailableDate: new Date().toISOString()
  }));
  res.json(farmers);
});

// Harvest calendar
app.get('/api/supply/harvest-calendar', (req, res) => {
  const { start_date, end_date } = req.query;
  
  // Filter allocations by date range
  let allocations = database.supplyAllocations;
  
  if (start_date && end_date) {
    allocations = allocations.filter(allocation => {
      const allocationDate = new Date(allocation.date);
      const start = new Date(start_date);
      const end = new Date(end_date);
      return allocationDate >= start && allocationDate <= end;
    });
  }
  
  // Group by date
  const calendar = allocations.reduce((acc, allocation) => {
    const dateKey = new Date(allocation.date).toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: allocation.date,
        allocations: [],
        totalQuantity: 0,
        farmerCount: 0
      };
    }
    
    acc[dateKey].allocations.push(allocation);
    acc[dateKey].totalQuantity += allocation.quantity || 0;
    acc[dateKey].farmerCount++;
    
    return acc;
  }, {});
  
  res.json(Object.values(calendar));
});

// ====================== CONTRACTS ENDPOINTS ======================

// Get all contracts
app.get('/api/contracts', (req, res) => {
  res.json(database.contracts);
});

// Get single contract
app.get('/api/contracts/:id', (req, res) => {
  const contract = database.contracts.find(c => c.id === parseInt(req.params.id));
  if (contract) {
    res.json(contract);
  } else {
    res.status(404).json({ error: 'Contract not found' });
  }
});

// Create contract
app.post('/api/contracts', (req, res) => {
  const contract = {
    id: database.contracts.length + 1,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  database.contracts.push(contract);
  res.status(201).json(contract);
});

// Update contract
app.put('/api/contracts/:id', (req, res) => {
  const index = database.contracts.findIndex(c => c.id === parseInt(req.params.id));
  if (index !== -1) {
    database.contracts[index] = {
      ...database.contracts[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    res.json(database.contracts[index]);
  } else {
    res.status(404).json({ error: 'Contract not found' });
  }
});

// Update fulfillment
app.patch('/api/contracts/:id/fulfillment', (req, res) => {
  const index = database.contracts.findIndex(c => c.id === parseInt(req.params.id));
  if (index !== -1) {
    database.contracts[index].fulfillmentPercentage = req.body.fulfillment_percentage;
    database.contracts[index].updatedAt = new Date().toISOString();
    res.json(database.contracts[index]);
  } else {
    res.status(404).json({ error: 'Contract not found' });
  }
});

// Delete contract
app.delete('/api/contracts/:id', (req, res) => {
  const index = database.contracts.findIndex(c => c.id === parseInt(req.params.id));
  if (index !== -1) {
    database.contracts.splice(index, 1);
    res.json({ message: 'Contract deleted successfully' });
  } else {
    res.status(404).json({ error: 'Contract not found' });
  }
});

// Get contract stats
app.get('/api/contracts-stats', (req, res) => {
  const activeContracts = database.contracts.filter(c => c.status === 'active').length;
  const totalContractedQty = database.contracts.reduce((sum, contract) => sum + (contract.contractedQuantity || 0), 0);
  const avgFulfillment = database.contracts.length > 0 
    ? Math.round(database.contracts.reduce((sum, contract) => sum + (contract.fulfillmentPercentage || 0), 0) / database.contracts.length)
    : 0;
  
  res.json({
    activeContracts,
    totalContractedQty,
    avgFulfillment
  });
});

// ====================== ANALYTICS ENDPOINTS ======================

// Overview stats
app.get('/api/analytics/overview', (req, res) => {
  const totalAllocations = database.supplyAllocations.length;
  const totalAllocatedQty = database.supplyAllocations.reduce((sum, a) => sum + (a.quantity || 0), 0);
  const completedAllocations = database.supplyAllocations.filter(a => a.status === 'completed').length;
  
  res.json({
    totalFarmers: database.farmers.length,
    activeCrops: database.crops.length,
    pendingOrders: database.orders.filter(o => o.status === 'pending').length,
    totalAllocations: totalAllocations,
    totalAllocatedQty: totalAllocatedQty,
    completionRate: totalAllocations > 0 ? (completedAllocations / totalAllocations) * 100 : 0,
    revenue: 0,
    profit: 0,
    fulfillmentRate: 0,
    isFreshSystem: database.farmers.length === 0
  });
});

// Supply vs Demand
app.get('/api/analytics/supply-demand', (req, res) => {
  const period = req.query.period || '30days';
  
  // Mock supply-demand data
  const data = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      supply: Math.floor(Math.random() * 100) + 50,
      demand: Math.floor(Math.random() * 100) + 40,
      gap: Math.floor(Math.random() * 20) - 10
    });
  }
  
  res.json(data);
});

// Variety Distribution
app.get('/api/analytics/variety-distribution', (req, res) => {
  // Get crop distribution from farmers
  const cropCounts = {};
  database.farmers.forEach(farmer => {
    if (farmer.crop) {
      cropCounts[farmer.crop] = (cropCounts[farmer.crop] || 0) + 1;
    }
  });
  
  const distribution = Object.entries(cropCounts).map(([name, count]) => ({
    name,
    value: count,
    percentage: database.farmers.length > 0 ? (count / database.farmers.length) * 100 : 0
  }));
  
  res.json(distribution);
});

// Risk Alerts
app.get('/api/analytics/risk-alerts', (req, res) => {
  const alerts = [];
  
  // Check for farmers without allocations
  const allocatedFarmerIds = new Set(database.supplyAllocations.map(a => a.farmerId));
  const unallocatedFarmers = database.farmers.filter(f => !allocatedFarmerIds.has(f.id));
  
  if (unallocatedFarmers.length > 0) {
    alerts.push({
      id: 1,
      title: 'Unallocated Farmers',
      message: `${unallocatedFarmers.length} farmers have no supply allocations`,
      type: 'warning',
      priority: 'medium',
      timestamp: new Date().toISOString()
    });
  }
  
  // Check for allocations without farmers
  const allocationsWithoutFarmers = database.supplyAllocations.filter(a => {
    const farmerExists = database.farmers.some(f => f.id === a.farmerId);
    return !farmerExists;
  });
  
  if (allocationsWithoutFarmers.length > 0) {
    alerts.push({
      id: 2,
      title: 'Orphaned Allocations',
      message: `${allocationsWithoutFarmers.length} allocations reference non-existent farmers`,
      type: 'error',
      priority: 'high',
      timestamp: new Date().toISOString()
    });
  }
  
  // Check for contracts nearing expiration
  const today = new Date();
  const expiringContracts = database.contracts.filter(c => {
    if (c.endDate) {
      const endDate = new Date(c.endDate);
      const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    }
    return false;
  });
  
  if (expiringContracts.length > 0) {
    alerts.push({
      id: 3,
      title: 'Contracts Expiring Soon',
      message: `${expiringContracts.length} contracts expire within 30 days`,
      type: 'warning',
      priority: 'medium',
      timestamp: new Date().toISOString()
    });
  }
  
  res.json(alerts);
});

// Cost Analysis
app.get('/api/analytics/cost-analysis', (req, res) => {
  // Calculate costs based on allocations and orders
  const totalAllocatedQty = database.supplyAllocations.reduce((sum, a) => sum + (a.quantity || 0), 0);
  
  res.json({
    totalCost: totalAllocatedQty * 100, // Mock: $100 per ton
    costPerUnit: 100,
    costBreakdown: {
      labor: totalAllocatedQty * 40,
      materials: totalAllocatedQty * 30,
      logistics: totalAllocatedQty * 20,
      other: totalAllocatedQty * 10
    },
    isFreshSystem: database.farmers.length === 0
  });
});

// ====================== FARMERS ENDPOINTS ======================

app.get('/api/farmers', (req, res) => {
  console.log('📊 Returning farmers:', database.farmers.length);
  res.json(database.farmers);
});

app.get('/api/farmers/:id', (req, res) => {
  const farmer = database.farmers.find(f => f.id === parseInt(req.params.id));
  if (farmer) {
    res.json(farmer);
  } else {
    res.status(404).json({ error: 'Farmer not found' });
  }
});

app.post('/api/farmers', (req, res) => {
  const farmer = {
    id: database.farmers.length + 1,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  database.farmers.push(farmer);
  res.status(201).json(farmer);
});

app.put('/api/farmers/:id', (req, res) => {
  const index = database.farmers.findIndex(f => f.id === parseInt(req.params.id));
  if (index !== -1) {
    database.farmers[index] = {
      ...database.farmers[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    res.json(database.farmers[index]);
  } else {
    res.status(404).json({ error: 'Farmer not found' });
  }
});

app.delete('/api/farmers/:id', (req, res) => {
  const index = database.farmers.findIndex(f => f.id === parseInt(req.params.id));
  if (index !== -1) {
    database.farmers.splice(index, 1);
    res.json({ message: 'Farmer deleted successfully' });
  } else {
    res.status(404).json({ error: 'Farmer not found' });
  }
});

// ====================== CROPS ENDPOINTS ======================

app.get('/api/crops', (req, res) => {
  res.json(database.crops);
});

app.post('/api/crops', (req, res) => {
  const crop = {
    id: database.crops.length + 1,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  database.crops.push(crop);
  res.status(201).json(crop);
});

app.put('/api/crops/:id', (req, res) => {
  const index = database.crops.findIndex(c => c.id === parseInt(req.params.id));
  if (index !== -1) {
    database.crops[index] = {
      ...database.crops[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    res.json(database.crops[index]);
  } else {
    res.status(404).json({ error: 'Crop not found' });
  }
});

app.delete('/api/crops/:id', (req, res) => {
  const index = database.crops.findIndex(c => c.id === parseInt(req.params.id));
  if (index !== -1) {
    database.crops.splice(index, 1);
    res.json({ message: 'Crop deleted successfully' });
  } else {
    res.status(404).json({ error: 'Crop not found' });
  }
});

// ====================== PROCUREMENT ENDPOINTS ======================

// Orders
app.get('/api/procurement/orders', (req, res) => {
  console.log('📊 Returning orders:', database.orders.length);
  res.json(database.orders);
});

app.get('/api/procurement/orders/:id', (req, res) => {
  const order = database.orders.find(o => o.id === parseInt(req.params.id));
  if (order) {
    res.json(order);
  } else {
    res.status(404).json({ error: 'Order not found' });
  }
});

app.post('/api/procurement/orders', (req, res) => {
  const order = {
    id: database.orders.length + 1,
    ...req.body,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  database.orders.push(order);
  res.status(201).json(order);
});

app.put('/api/procurement/orders/:id', (req, res) => {
  const index = database.orders.findIndex(o => o.id === parseInt(req.params.id));
  if (index !== -1) {
    database.orders[index] = {
      ...database.orders[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    res.json(database.orders[index]);
  } else {
    res.status(404).json({ error: 'Order not found' });
  }
});

app.delete('/api/procurement/orders/:id', (req, res) => {
  const index = database.orders.findIndex(o => o.id === parseInt(req.params.id));
  if (index !== -1) {
    database.orders.splice(index, 1);
    res.json({ message: 'Order deleted successfully' });
  } else {
    res.status(404).json({ error: 'Order not found' });
  }
});

// Procurement analytics
app.get('/api/procurement/demand-forecast', (req, res) => {
  res.json([]);
});

app.get('/api/procurement/supply-reconciliation', (req, res) => {
  const totalSupply = database.supplyAllocations.reduce((sum, a) => sum + (a.quantity || 0), 0);
  const totalOrders = database.orders.reduce((sum, o) => sum + (o.quantity || 0), 0);
  
  res.json({
    totalSupply,
    totalDemand: totalOrders,
    reconciliationRate: totalOrders > 0 ? (totalSupply / totalOrders) * 100 : 0,
    discrepancies: []
  });
});

app.get('/api/procurement/harvest-readiness', (req, res) => {
  const days = req.query.days || 7;
  
  // Get allocations within the next X days
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + parseInt(days));
  
  const upcomingAllocations = database.supplyAllocations.filter(a => {
    const allocationDate = new Date(a.date);
    return allocationDate >= today && allocationDate <= futureDate;
  });
  
  res.json(upcomingAllocations);
});

// ====================== NOTIFICATIONS ENDPOINTS ======================

app.get('/api/notifications', (req, res) => {
  res.json(database.notifications);
});

app.get('/api/notifications/:id', (req, res) => {
  const notification = database.notifications.find(n => n.id === parseInt(req.params.id));
  if (notification) {
    res.json(notification);
  } else {
    res.status(404).json({ error: 'Notification not found' });
  }
});

app.post('/api/notifications', (req, res) => {
  const notification = {
    id: database.notifications.length + 1,
    ...req.body,
    read: false,
    createdAt: new Date().toISOString()
  };
  database.notifications.push(notification);
  res.status(201).json(notification);
});

app.patch('/api/notifications/:id/read', (req, res) => {
  const index = database.notifications.findIndex(n => n.id === parseInt(req.params.id));
  if (index !== -1) {
    database.notifications[index].read = true;
    database.notifications[index].updatedAt = new Date().toISOString();
    res.json(database.notifications[index]);
  } else {
    res.status(404).json({ error: 'Notification not found' });
  }
});

app.patch('/api/notifications/read-all', (req, res) => {
  database.notifications.forEach(n => {
    n.read = true;
    n.updatedAt = new Date().toISOString();
  });
  res.json({ message: 'All notifications marked as read' });
});

app.delete('/api/notifications/:id', (req, res) => {
  const index = database.notifications.findIndex(n => n.id === parseInt(req.params.id));
  if (index !== -1) {
    database.notifications.splice(index, 1);
    res.json({ message: 'Notification deleted successfully' });
  } else {
    res.status(404).json({ error: 'Notification not found' });
  }
});

// ====================== WEBSOCKET FOR REAL-TIME UPDATES ======================
const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (ws) => {
  console.log('✅ WebSocket client connected');
  
  // Send welcome message indicating fresh system
  ws.send(JSON.stringify({ 
    event: 'welcome',
    message: 'Connected to fresh supply chain system',
    dataStatus: 'empty',
    stats: {
      farmers: database.farmers.length,
      allocations: database.supplyAllocations.length,
      contracts: database.contracts.length,
      aggregators: database.aggregators.length
    }
  }));
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('WebSocket message received:', data);
      
      // Handle subscriptions
      if (data.event === 'subscribe') {
        ws.send(JSON.stringify({
          event: 'subscribed',
          channels: data.payload?.channels || []
        }));
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('❌ WebSocket client disconnected');
  });
});

// ====================== START SERVER ======================
const server = createServer(app);

server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🎉 SUPPLY CHAIN SYSTEM STARTED`);
  console.log(`✅ HTTP Server: http://localhost:${PORT}`);
  console.log(`✅ WebSocket Server: ws://localhost:${WS_PORT}`);
  console.log(`📊 Data Status: Ready for client data`);
  console.log('='.repeat(60));
  console.log('\n📋 ALL AVAILABLE ENDPOINTS:');
  console.log('  HEALTH & AUTH:');
  console.log('    GET  /api/health');
  console.log('    POST /api/auth/login');
  console.log('  AGGREGATORS:');
  console.log('    GET  /api/aggregators');
  console.log('    POST /api/aggregators');
  console.log('    GET  /api/aggregators/:id');
  console.log('    PUT  /api/aggregators/:id');
  console.log('    DELETE /api/aggregators/:id');
  console.log('    GET  /api/aggregators-stats');
  console.log('  SUPPLY PLANNING:');
  console.log('    GET  /api/supply/allocations');
  console.log('    POST /api/supply/allocations');
  console.log('    GET  /api/supply/allocations/:id');
  console.log('    PUT  /api/supply/allocations/:id');
  console.log('    DELETE /api/supply/allocations/:id');
  console.log('    GET  /api/supply/plan');
  console.log('    POST /api/supply/plan');
  console.log('    PUT  /api/supply/plan/:id');
  console.log('    GET  /api/supply/farmer-availability');
  console.log('    GET  /api/supply/harvest-calendar');
  console.log('  CONTRACTS:');
  console.log('    GET  /api/contracts');
  console.log('    POST /api/contracts');
  console.log('    GET  /api/contracts/:id');
  console.log('    PUT  /api/contracts/:id');
  console.log('    PATCH /api/contracts/:id/fulfillment');
  console.log('    DELETE /api/contracts/:id');
  console.log('    GET  /api/contracts-stats');
  console.log('  FARMERS:');
  console.log('    GET  /api/farmers');
  console.log('    POST /api/farmers');
  console.log('    GET  /api/farmers/:id');
  console.log('    PUT  /api/farmers/:id');
  console.log('    DELETE /api/farmers/:id');
  console.log('  CROPS:');
  console.log('    GET  /api/crops');
  console.log('    POST /api/crops');
  console.log('    PUT  /api/crops/:id');
  console.log('    DELETE /api/crops/:id');
  console.log('  PROCUREMENT:');
  console.log('    GET  /api/procurement/orders');
  console.log('    POST /api/procurement/orders');
  console.log('    GET  /api/procurement/orders/:id');
  console.log('    PUT  /api/procurement/orders/:id');
  console.log('    DELETE /api/procurement/orders/:id');
  console.log('    GET  /api/procurement/demand-forecast');
  console.log('    GET  /api/procurement/supply-reconciliation');
  console.log('    GET  /api/procurement/harvest-readiness');
  console.log('  ANALYTICS:');
  console.log('    GET  /api/analytics/overview');
  console.log('    GET  /api/analytics/supply-demand');
  console.log('    GET  /api/analytics/variety-distribution');
  console.log('    GET  /api/analytics/risk-alerts');
  console.log('    GET  /api/analytics/cost-analysis');
  console.log('  NOTIFICATIONS:');
  console.log('    GET  /api/notifications');
  console.log('    POST /api/notifications');
  console.log('    GET  /api/notifications/:id');
  console.log('    PATCH /api/notifications/:id/read');
  console.log('    PATCH /api/notifications/read-all');
  console.log('    DELETE /api/notifications/:id');
  console.log('\n🌱 System is running - ready for data!');
  console.log('\nPress Ctrl+C to stop\n');
});
