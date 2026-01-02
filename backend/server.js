// backend/server.js
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const PORT = process.env.PORT || 5000;
const WS_PORT = process.env.WS_PORT || 5001;

//app.use(cors({
  //origin: [
   // 'http://localhost:8086',                    // Local development
    //'https://d9d5bde3d291.ngrok-free.app',     // Your specific ngrok URL
    //'https://*.ngrok-free.app',                // Any ngrok domain
    //'https://*.ngrok.io',                      // Alternative ngrok domains
    //'https://*.loca.lt',                       // LocalTunnel domains
    //'https://*.trycloudflare.com'              // Cloudflare Tunnel
  //],
  //credentials: true,
  //methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  //allowedHeaders: ['Content-Type', 'Authorization']
//}));

app.use(cors({
  origin: '*',  // Allow ALL origins (temporary)
  credentials: true
}));

// ====================== EMPTY DATABASE ======================
// Clients will add their own data
const database = {
  aggregators:[],
  farmers: [],
  crops: [],
  orders: [],
  contracts: []
};

// ====================== API ROUTES ======================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Supply Chain Backend is running',
    timestamp: new Date().toISOString(),
    dataStatus: 'empty'  // Indicate fresh system
  });
});

// Auth endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  // Simple mock authentication
  res.json({ 
    token: 'demo-token-' + Date.now(),
    user: { 
      id: 1, 
      name: 'Admin', 
      email: username,
      role: 'admin',
      firstLogin: database.farmers.length === 0  // Check if system is fresh
    }
  });
});

// ====================== ANALYTICS ENDPOINTS ======================

// Overview stats - returns zeros for fresh system
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

// Supply vs Demand - returns empty array
app.get('/api/analytics/supply-demand', (req, res) => {
  res.json([]);  // Empty array for fresh system
});

// Variety Distribution - returns empty array
app.get('/api/analytics/variety-distribution', (req, res) => {
  res.json([]);  // Empty array
});

// Risk Alerts - returns empty array
app.get('/api/analytics/risk-alerts', (req, res) => {
  res.json([]);  // No alerts in fresh system
});

// ====================== DATA MANAGEMENT ENDPOINTS ======================

// Farmers CRUD
app.get('/api/farmers', (req, res) => {
  res.json(database.farmers);
});

// Get single farmer
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

// Update farmer
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

// Delete farmer
app.delete('/api/farmers/:id', (req, res) => {
  const index = database.farmers.findIndex(f => f.id === parseInt(req.params.id));
  if (index !== -1) {
    database.farmers.splice(index, 1);
    res.json({ message: 'Farmer deleted successfully' });
  } else {
    res.status(404).json({ error: 'Farmer not found' });
  }
});


// Crops CRUD
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

// Orders CRUD
app.get('/api/procurement/orders', (req, res) => {
  res.json(database.orders);
});

// Get single order
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

// Update order
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

// Delete order
app.delete('/api/procurement/orders/:id', (req, res) => {
  const index = database.orders.findIndex(o => o.id === parseInt(req.params.id));
  if (index !== -1) {
    database.orders.splice(index, 1);
    res.json({ message: 'Order deleted successfully' });
  } else {
    res.status(404).json({ error: 'Order not found' });
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

// In backend/server.js, add these contract endpoints:

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
  console.log('='.repeat(50));
  console.log(`🎉 FRESH SUPPLY CHAIN SYSTEM STARTED`);
  console.log(`✅ HTTP Server: http://localhost:${PORT}`);
  console.log(`✅ WebSocket Server: ws://localhost:${WS_PORT}`);
  console.log(`📊 Data Status: EMPTY - Ready for client data`);
  console.log('='.repeat(50));
  console.log('\nAvailable endpoints:');
  console.log('  GET  /api/health');
  console.log('  POST /api/auth/login');
  console.log('  GET  /api/analytics/overview');
  console.log('  POST /api/farmers');
  console.log('  POST /api/crops');
  console.log('  POST /api/procurement/orders');
  console.log('\n🌱 System is fresh - clients can start adding data!');
  console.log('\nPress Ctrl+C to stop\n');
});
