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
app.use(express.json());  // ADD THIS LINE - Parse JSON bodies
app.use(express.urlencoded({ extended: true }));  // ADD THIS LINE - Parse URL-encoded bodies

// ====================== EMPTY DATABASE ======================
const database = {
  aggregators: [],
  farmers: [],
  crops: [],
  orders: [],
  contracts: [],
  supplyAllocations: []  // Already initialized
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

// ====================== SUPPLY ALLOCATIONS ENDPOINTS ======================

// Get all supply allocations
app.get('/api/supply/allocations', (req, res) => {
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
  res.json({
    totalFarmers: database.farmers.length,
    activeCrops: database.crops.length,
    pendingOrders: database.orders.filter(o => o.status === 'pending').length,
    revenue: 0,
    profit: 0,
    fulfillmentRate: 0,
    isFreshSystem: database.farmers.length === 0
  });
});

// Supply vs Demand
app.get('/api/analytics/supply-demand', (req, res) => {
  res.json([]);
});

// Variety Distribution
app.get('/api/analytics/variety-distribution', (req, res) => {
  res.json([]);
});

// Risk Alerts
app.get('/api/analytics/risk-alerts', (req, res) => {
  res.json([]);
});

// Cost Analysis
app.get('/api/analytics/cost-analysis', (req, res) => {
  res.json({
    totalCost: 0,
    costPerUnit: 0,
    costBreakdown: {
      labor: 0,
      materials: 0,
      logistics: 0,
      other: 0
    },
    isFreshSystem: database.farmers.length === 0
  });
});

// ====================== FARMERS ENDPOINTS ======================

app.get('/api/farmers', (req, res) => {
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

// ====================== PROCUREMENT ENDPOINTS ======================

// Orders
app.get('/api/procurement/orders', (req, res) => {
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
  res.json({
    totalSupply: 0,
    totalDemand: 0,
    reconciliationRate: 0,
    discrepancies: []
  });
});

app.get('/api/procurement/harvest-readiness', (req, res) => {
  const days = req.query.days || 7;
  res.json([]);
});

// ====================== NOTIFICATIONS ENDPOINT ======================

app.get('/api/notifications', (req, res) => {
  res.json([]);
});

// ====================== WEBSOCKET FOR REAL-TIME UPDATES ======================
const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (ws) => {
  console.log('✅ WebSocket client connected');
  
  // Send welcome message indicating fresh system
  ws.send(JSON.stringify({ 
    event: 'welcome',
    message: 'Connected to fresh supply chain system',
    dataStatus: 'empty'
  }));
  
  ws.on('close', () => {
    console.log('❌ WebSocket client disconnected');
  });
});

// ====================== START SERVER ======================
const server = createServer(app);

server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🎉 FRESH SUPPLY CHAIN SYSTEM STARTED`);
  console.log(`✅ HTTP Server: http://localhost:${PORT}`);
  console.log(`✅ WebSocket Server: ws://localhost:${WS_PORT}`);
  console.log(`📊 Data Status: EMPTY - Ready for client data`);
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
  console.log('  SUPPLY ALLOCATIONS:');
  console.log('    GET  /api/supply/allocations');
  console.log('    POST /api/supply/allocations');
  console.log('    PUT  /api/supply/allocations/:id');
  console.log('    DELETE /api/supply/allocations/:id');
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
  console.log('\n🌱 System is fresh - clients can start adding data!');
  console.log('\nPress Ctrl+C to stop\n');
});
