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
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====================== DEBUG MIDDLEWARE ======================
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
  supplementRequests: [],
  notifications: []
};

// ====================== ROOT ROUTE ======================
app.get('/', (req, res) => {
  res.json({
    message: 'Supply Chain Management System API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      aggregators: '/api/aggregators',
      contracts: '/api/contracts',
      farmers: '/api/farmers',
      analytics: '/api/analytics/overview',
      supply: '/api/supply/allocations',
      procurement: '/api/procurement/orders',
      health: '/api/health'
    }
  });
});

// ====================== HEALTH & AUTH ======================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Supply Chain Backend is running',
    timestamp: new Date().toISOString(),
    dataStatus: 'empty'
  });
});

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

// Get all aggregators
app.get('/api/aggregators', (req, res) => {
  try {
    console.log('📊 GET /api/aggregators - Returning:', database.aggregators.length);
    res.json(database.aggregators);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch aggregators' });
  }
});

// Get aggregator stats - FIXED endpoint name
app.get('/api/aggregators/stats', (req, res) => {
  try {
    const aggregators = database.aggregators || [];
    const internal_count = aggregators.filter(a => a.type === 'internal').length;
    const external_count = aggregators.filter(a => a.type === 'external').length;
    const uniqueCounties = [...new Set(aggregators.map(agg => agg.county).filter(Boolean))];
    
    res.json({
      total_aggregators: aggregators.length,
      counties_covered: uniqueCounties.length,
      internal_count,
      external_count,
      total_volume: 0,
      avg_reliability: 0
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch aggregator stats' });
  }
});

// Get single aggregator
app.get('/api/aggregators/:id', (req, res) => {
  try {
    const aggregator = database.aggregators.find(a => a.id === parseInt(req.params.id));
    if (aggregator) {
      res.json(aggregator);
    } else {
      res.status(404).json({ error: 'Aggregator not found' });
    }
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch aggregator' });
  }
});

// Create aggregator
app.post('/api/aggregators', (req, res) => {
  try {
    const aggregatorData = req.body;
    const newAggregator = {
      id: database.aggregators.length + 1,
      name: aggregatorData.name || '',
      county: aggregatorData.county || '',
      contact_person: aggregatorData.contact_person || '',
      phone: aggregatorData.phone || '',
      email: aggregatorData.email || '',
      description: aggregatorData.description || '',
      type: aggregatorData.type || 'external',
      capacity: aggregatorData.capacity || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    database.aggregators.push(newAggregator);
    console.log('✅ POST /api/aggregators - Created:', newAggregator.name);
    res.status(201).json(newAggregator);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to create aggregator' });
  }
});

// Update aggregator
app.put('/api/aggregators/:id', (req, res) => {
  try {
    const aggregatorId = parseInt(req.params.id);
    const updates = req.body;
    const index = database.aggregators.findIndex(a => a.id === aggregatorId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Aggregator not found' });
    }
    
    database.aggregators[index] = {
      ...database.aggregators[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    console.log('✏️ PUT /api/aggregators/:id - Updated:', database.aggregators[index].name);
    res.json(database.aggregators[index]);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to update aggregator' });
  }
});

// Delete aggregator
app.delete('/api/aggregators/:id', (req, res) => {
  try {
    const aggregatorId = parseInt(req.params.id);
    const index = database.aggregators.findIndex(a => a.id === aggregatorId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Aggregator not found' });
    }
    
    const deletedAggregator = database.aggregators.splice(index, 1)[0];
    console.log('🗑️ DELETE /api/aggregators/:id - Deleted:', deletedAggregator.name);
    res.json({ 
      message: 'Aggregator deleted successfully',
      aggregator: deletedAggregator
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to delete aggregator' });
  }
});

// ====================== CONTRACTS ENDPOINTS ======================

// Get all contracts - FIXED: return array directly, not wrapped in data property
app.get('/api/contracts', (req, res) => {
  try {
    console.log('📋 GET /api/contracts - Returning:', database.contracts.length);
    res.json(database.contracts);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
});

// Get contract stats
app.get('/api/contracts/stats', (req, res) => {
  try {
    const activeContracts = database.contracts.filter(c => c.status === 'active').length;
    const totalContractedQty = database.contracts.reduce((sum, contract) => 
      sum + (parseFloat(contract.contractedQuantity) || 0), 0);
    const avgFulfillment = database.contracts.length > 0 
      ? Math.round(database.contracts.reduce((sum, contract) => 
          sum + (parseFloat(contract.fulfillmentPercentage) || 0), 0) / database.contracts.length)
      : 0;
    
    res.json({
      activeContracts,
      totalContractedQty,
      avgFulfillment
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch contract stats' });
  }
});

// Get single contract
app.get('/api/contracts/:id', (req, res) => {
  try {
    const contract = database.contracts.find(c => c.id === parseInt(req.params.id));
    if (contract) {
      res.json(contract);
    } else {
      res.status(404).json({ error: 'Contract not found' });
    }
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch contract' });
  }
});

// Create contract
app.post('/api/contracts', (req, res) => {
  try {
    const contractData = req.body;
    const newContract = {
      id: database.contracts.length + 1,
      supplierName: contractData.supplierName || '',
      supplierType: contractData.supplierType || 'farmer',
      contractedQuantity: parseFloat(contractData.contractedQuantity) || 0,
      fulfillmentPercentage: parseFloat(contractData.fulfillmentPercentage) || 0,
      startDate: contractData.startDate || new Date().toISOString(),
      endDate: contractData.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      pricingTerms: contractData.pricingTerms || '',
      paymentTerms: contractData.paymentTerms || '',
      status: contractData.status || 'draft',
      notes: contractData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    database.contracts.push(newContract);
    console.log('✅ POST /api/contracts - Created with:', newContract.supplierName);
    res.status(201).json(newContract);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to create contract' });
  }
});

// Update contract
app.put('/api/contracts/:id', (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const updates = req.body;
    const index = database.contracts.findIndex(c => c.id === contractId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    database.contracts[index] = {
      ...database.contracts[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    console.log('✏️ PUT /api/contracts/:id - Updated:', database.contracts[index].supplierName);
    res.json(database.contracts[index]);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to update contract' });
  }
});

// Update fulfillment
app.patch('/api/contracts/:id/fulfillment', (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const { fulfillment_percentage } = req.body;
    const index = database.contracts.findIndex(c => c.id === contractId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    database.contracts[index].fulfillmentPercentage = parseFloat(fulfillment_percentage) || 0;
    database.contracts[index].updatedAt = new Date().toISOString();
    
    console.log('📊 PATCH /api/contracts/:id/fulfillment - Updated to:', database.contracts[index].fulfillmentPercentage + '%');
    res.json(database.contracts[index]);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to update fulfillment' });
  }
});

// Delete contract
app.delete('/api/contracts/:id', (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const index = database.contracts.findIndex(c => c.id === contractId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    const deletedContract = database.contracts.splice(index, 1)[0];
    console.log('🗑️ DELETE /api/contracts/:id - Deleted:', deletedContract.supplierName);
    res.json({ 
      message: 'Contract deleted successfully',
      contract: deletedContract
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to delete contract' });
  }
});

// ====================== SUPPLY PLANNING ENDPOINTS ======================

// Get all supply allocations
app.get('/api/supply/allocations', (req, res) => {
  try {
    console.log('📊 GET /api/supply/allocations - Returning:', database.supplyAllocations.length);
    res.json(database.supplyAllocations);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch allocations' });
  }
});

// Create allocation
app.post('/api/supply/allocations', (req, res) => {
  try {
    const allocationData = req.body;
    const newAllocation = {
      id: database.supplyAllocations.length + 1,
      farmerId: allocationData.farmerId,
      farmerName: allocationData.farmerName || '',
      farmerEmail: allocationData.farmerEmail || '',
      farmerPhone: allocationData.farmerPhone || '',
      farmerCounty: allocationData.farmerCounty || '',
      farmerCrop: allocationData.farmerCrop || '',
      quantity: parseFloat(allocationData.quantity) || 0,
      date: allocationData.date || new Date().toISOString().split('T')[0],
      status: allocationData.status || 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    database.supplyAllocations.push(newAllocation);
    console.log('✅ POST /api/supply/allocations - Created:', newAllocation.farmerName);
    res.status(201).json(newAllocation);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to create allocation' });
  }
});

// Get single allocation
app.get('/api/supply/allocations/:id', (req, res) => {
  try {
    const allocation = database.supplyAllocations.find(a => a.id === parseInt(req.params.id));
    if (allocation) {
      res.json(allocation);
    } else {
      res.status(404).json({ error: 'Allocation not found' });
    }
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch allocation' });
  }
});

// Update allocation
app.put('/api/supply/allocations/:id', (req, res) => {
  try {
    const allocationId = parseInt(req.params.id);
    const updates = req.body;
    const index = database.supplyAllocations.findIndex(a => a.id === allocationId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Allocation not found' });
    }
    
    database.supplyAllocations[index] = {
      ...database.supplyAllocations[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    console.log('✏️ PUT /api/supply/allocations/:id - Updated');
    res.json(database.supplyAllocations[index]);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to update allocation' });
  }
});

// Delete allocation
app.delete('/api/supply/allocations/:id', (req, res) => {
  try {
    const allocationId = parseInt(req.params.id);
    const index = database.supplyAllocations.findIndex(a => a.id === allocationId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Allocation not found' });
    }
    
    const deletedAllocation = database.supplyAllocations.splice(index, 1)[0];
    console.log('🗑️ DELETE /api/supply/allocations/:id - Deleted');
    res.json({ 
      message: 'Allocation deleted successfully',
      allocation: deletedAllocation
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to delete allocation' });
  }
});

// Get supply-demand analysis
app.get('/api/supply/demand-analysis', (req, res) => {
  try {
    const analysis = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      
      // Calculate supply for this date
      const dayAllocations = database.supplyAllocations.filter(a => a.date === dateKey);
      const supply = dayAllocations.reduce((sum, a) => sum + (a.quantity || 0), 0);
      
      // Mock demand
      const baseDemand = 50;
      const randomVariation = Math.random() * 20 - 10;
      const demand = Math.max(20, baseDemand + randomVariation);
      const balance = supply - demand;
      
      analysis.push({
        date: dateKey,
        demand: parseFloat(demand.toFixed(1)),
        supply: parseFloat(supply.toFixed(1)),
        balance: parseFloat(balance.toFixed(1)),
        status: balance === 0 ? 'met' : balance < 0 ? 'shortage' : 'oversupply',
        shortageAmount: balance < 0 ? Math.abs(balance) : 0,
        oversupplyAmount: balance > 0 ? balance : 0
      });
    }
    
    console.log('📈 GET /api/supply/demand-analysis - Returning 30-day analysis');
    res.json(analysis);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

// ====================== FARMERS ENDPOINTS ======================

app.get('/api/farmers', (req, res) => {
  try {
    console.log('👨‍🌾 GET /api/farmers - Returning:', database.farmers.length);
    res.json(database.farmers);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch farmers' });
  }
});

app.get('/api/farmers/:id', (req, res) => {
  try {
    const farmer = database.farmers.find(f => f.id === parseInt(req.params.id));
    if (farmer) {
      res.json(farmer);
    } else {
      res.status(404).json({ error: 'Farmer not found' });
    }
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch farmer' });
  }
});

app.post('/api/farmers', (req, res) => {
  try {
    const farmerData = req.body;
    const newFarmer = {
      id: database.farmers.length + 1,
      ...farmerData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    database.farmers.push(newFarmer);
    console.log('✅ POST /api/farmers - Created:', newFarmer.fullName);
    res.status(201).json(newFarmer);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to create farmer' });
  }
});

app.put('/api/farmers/:id', (req, res) => {
  try {
    const farmerId = parseInt(req.params.id);
    const updates = req.body;
    const index = database.farmers.findIndex(f => f.id === farmerId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Farmer not found' });
    }
    
    database.farmers[index] = {
      ...database.farmers[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    console.log('✏️ PUT /api/farmers/:id - Updated:', database.farmers[index].fullName);
    res.json(database.farmers[index]);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to update farmer' });
  }
});

app.delete('/api/farmers/:id', (req, res) => {
  try {
    const farmerId = parseInt(req.params.id);
    const index = database.farmers.findIndex(f => f.id === farmerId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Farmer not found' });
    }
    
    const deletedFarmer = database.farmers.splice(index, 1)[0];
    console.log('🗑️ DELETE /api/farmers/:id - Deleted:', deletedFarmer.fullName);
    res.json({ 
      message: 'Farmer deleted successfully',
      farmer: deletedFarmer
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to delete farmer' });
  }
});

// Allocate farmer
app.post('/api/farmers/:id/allocate', (req, res) => {
  try {
    const farmerId = parseInt(req.params.id);
    const { date, quantity } = req.body;
    
    const farmer = database.farmers.find(f => f.id === farmerId);
    
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer not found' });
    }
    
    const newAllocation = {
      id: database.supplyAllocations.length + 1,
      farmerId: farmer.id,
      farmerName: farmer.fullName || farmer.name || '',
      farmerEmail: farmer.email || '',
      farmerPhone: farmer.phone || '',
      farmerCounty: farmer.county || '',
      farmerCrop: farmer.primaryCrop || farmer.crop || '',
      quantity: parseFloat(quantity) || 0,
      date: date || new Date().toISOString().split('T')[0],
      status: 'allocated',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    database.supplyAllocations.push(newAllocation);
    
    console.log(`🌾 POST /api/farmers/${farmerId}/allocate - Allocated ${quantity} tons`);
    
    res.json({
      message: `Allocated ${quantity} tons from ${farmer.fullName} on ${date}`,
      allocation: newAllocation,
      farmer
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to allocate farmer' });
  }
});

// ====================== CROPS ENDPOINTS ======================

app.get('/api/crops', (req, res) => {
  try {
    console.log('🌱 GET /api/crops - Returning:', database.crops.length);
    res.json(database.crops);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch crops' });
  }
});

app.post('/api/crops', (req, res) => {
  try {
    const cropData = req.body;
    const newCrop = {
      id: database.crops.length + 1,
      ...cropData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    database.crops.push(newCrop);
    console.log('✅ POST /api/crops - Created:', newCrop.name);
    res.status(201).json(newCrop);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to create crop' });
  }
});

// ====================== PROCUREMENT ENDPOINTS ======================

app.get('/api/procurement/orders', (req, res) => {
  try {
    console.log('📋 GET /api/procurement/orders - Returning:', database.orders.length);
    res.json(database.orders);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.post('/api/procurement/orders', (req, res) => {
  try {
    const orderData = req.body;
    const newOrder = {
      id: database.orders.length + 1,
      orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      supplierName: orderData.supplierName || orderData.farmerName || '',
      farmerName: orderData.farmerName || orderData.supplierName || '',
      crop: orderData.crop || '',
      quantityOrdered: parseFloat(orderData.quantityOrdered || orderData.quantity || 0),
      quantityAccepted: parseFloat(orderData.quantityAccepted || 0),
      quantityRejected: parseFloat(orderData.quantityRejected || 0),
      price: parseFloat(orderData.price || 0),
      status: orderData.status || 'ordered',
      paymentStatus: orderData.paymentStatus || 'pending',
      source: orderData.source || 'farmer',
      expectedDeliveryDate: orderData.expectedDeliveryDate || new Date().toISOString().split('T')[0],
      dateReceived: orderData.dateReceived || null,
      receiver: orderData.receiver || null,
      rejectionReason: orderData.rejectionReason || null,
      amountPaid: parseFloat(orderData.amountPaid || 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    database.orders.push(newOrder);
    console.log('✅ POST /api/procurement/orders - Created:', newOrder.orderNumber);
    res.status(201).json(newOrder);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.put('/api/procurement/orders/:id', (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const updates = req.body;
    const index = database.orders.findIndex(o => o.id === orderId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    database.orders[index] = {
      ...database.orders[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    console.log('✏️ PUT /api/procurement/orders/:id - Updated:', database.orders[index].orderNumber);
    res.json(database.orders[index]);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

app.delete('/api/procurement/orders/:id', (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const index = database.orders.findIndex(o => o.id === orderId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const deletedOrder = database.orders.splice(index, 1)[0];
    console.log('🗑️ DELETE /api/procurement/orders/:id - Deleted:', deletedOrder.orderNumber);
    res.json({ 
      message: 'Order deleted successfully',
      order: deletedOrder
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Demand forecast
app.get('/api/procurement/demand-forecast', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const forecast = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      
      const baseDemand = 50;
      const randomVariation = Math.random() * 20 - 10;
      const quantity = Math.max(20, baseDemand + randomVariation);
      
      forecast.push({
        date: dateKey,
        quantity: parseFloat(quantity.toFixed(1)),
        confidence: Math.random() * 20 + 80,
        updatedAt: new Date().toISOString()
      });
    }
    
    console.log('📊 GET /api/procurement/demand-forecast - Returning:', days, 'days');
    res.json(forecast);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

// Request supplement
app.post('/api/procurement/request-supplement', (req, res) => {
  try {
    const supplementData = req.body;
    const newRequest = {
      id: database.supplementRequests.length + 1,
      ...supplementData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    database.supplementRequests.push(newRequest);
    console.log('📦 POST /api/procurement/request-supplement - Created');
    res.status(201).json(newRequest);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to request supplement' });
  }
});

// Get supplement requests
app.get('/api/procurement/supplement-requests', (req, res) => {
  try {
    console.log('🛒 GET /api/procurement/supplement-requests - Returning:', database.supplementRequests.length);
    res.json(database.supplementRequests);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch supplement requests' });
  }
});

// ====================== FARM MALL ENDPOINTS ======================

// Get all farmmall farmers
app.get('/api/farmmall/farmers', (req, res) => {
  try {
    // Dummy potato farmers data
    const farmMallFarmers = [
      {
        id: 1,
        name: 'Green Valley Potato Farmers',
        county: 'Nakuru',
        varieties: ['Annet', 'Arizona', 'Asante'],
        phone: '+254 712 345 678',
        rating: 4.8,
        verified: true,
        price: 'KES 45,000 - 52,000 / ton'
      },
      {
        id: 2,
        name: 'Meru Highlands Potato Co-op',
        county: 'Meru',
        varieties: ['Arnova', 'Unica', 'Tigoni'],
        phone: '+254 723 456 789',
        rating: 4.5,
        verified: true,
        price: 'KES 48,000 - 55,000 / ton'
      },
      {
        id: 3,
        name: 'Eldoret Potato Traders',
        county: 'Uasin Gishu',
        varieties: ['Annet', 'Challenger', 'Manitou'],
        phone: '+254 734 567 890',
        rating: 4.7,
        verified: true,
        price: 'KES 42,000 - 48,000 / ton'
      },
      {
        id: 4,
        name: 'Kiambu Potato Growers',
        county: 'Kiambu',
        varieties: ['Tigoni', 'Nyota', 'Sherekea'],
        phone: '+254 745 678 901',
        rating: 4.3,
        verified: false,
        price: 'KES 50,000 - 58,000 / ton'
      },
      {
        id: 5,
        name: 'Naivasha Potato Farm',
        county: 'Naivasha',
        varieties: ['Unica', 'Asante', 'Jelly'],
        phone: '+254 756 789 012',
        rating: 4.9,
        verified: true,
        price: 'KES 55,000 - 65,000 / ton'
      },
      {
        id: 6,
        name: 'Nyandarua Potato Alliance',
        county: 'Nyandarua',
        varieties: ['Voyager', 'Challenger', 'Arizona'],
        phone: '+254 767 890 123',
        rating: 4.6,
        verified: true,
        price: 'KES 40,000 - 46,000 / ton'
      }
    ];

    console.log('🥔 GET /api/farmmall/farmers - Returning:', farmMallFarmers.length);
    res.json(farmMallFarmers);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch farmmall farmers' });
  }
});

// Get farmmall farmer by ID
app.get('/api/farmmall/farmers/:id', (req, res) => {
  try {
    const farmMallFarmers = [
      // same dummy data as above
    ];
    
    const farmer = farmMallFarmers.find(f => f.id === parseInt(req.params.id));
    if (farmer) {
      res.json(farmer);
    } else {
      res.status(404).json({ error: 'FarmMall farmer not found' });
    }
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch farmmall farmer' });
  }
});

// Create farmmall order
app.post('/api/farmmall/orders', (req, res) => {
  try {
    const orderData = req.body;
    const newOrder = {
      id: Date.now(),
      ...orderData,
      source: 'farmmall',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add to orders database
    database.orders.push(newOrder);
    
    console.log('🥔 POST /api/farmmall/orders - Created:', newOrder.id);
    res.status(201).json(newOrder);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to create farmmall order' });
  }
});

// ====================== ANALYTICS ENDPOINTS ======================

app.get('/api/analytics/overview', (req, res) => {
  try {
    // Calculate overview stats
    const totalAllocations = database.supplyAllocations.length;
    const totalAllocatedQty = database.supplyAllocations.reduce((sum, a) => sum + (a.quantity || 0), 0);
    const completedAllocations = database.supplyAllocations.filter(a => a.status === 'completed').length;
    
    const completedOrders = database.orders.filter(o => o.status === 'received' || o.status === 'completed');
    const totalOrdered = completedOrders.reduce((sum, o) => sum + (o.quantityOrdered || 0), 0);
    const totalAccepted = completedOrders.reduce((sum, o) => sum + (o.quantityAccepted || 0), 0);
    const acceptanceRate = totalOrdered > 0 ? (totalAccepted / totalOrdered) * 100 : 0;
    
    const aggregatorOrders = database.orders.filter(o => o.source === 'aggregator').length;
    const aggregatorDependency = database.orders.length > 0 ? (aggregatorOrders / database.orders.length) * 100 : 0;
    
    const femaleFarmers = database.farmers.filter(f => f.gender === 'female').length;
    const femalePercentage = database.farmers.length > 0 ? (femaleFarmers / database.farmers.length) * 100 : 0;
    
    const paidToFarmers = database.orders.reduce((sum, o) => sum + (o.amountPaid || 0), 0);
    const totalAcreage = database.farmers.reduce((sum, f) => sum + (f.acreage || 0), 0);
    
    const result = {
      totalFarmers: database.farmers.length,
      activeCrops: database.crops.length,
      pendingOrders: database.orders.filter(o => o.status === 'pending' || o.status === 'ordered').length,
      totalAllocations,
      totalAllocatedQty,
      completionRate: totalAllocations > 0 ? (completedAllocations / totalAllocations) * 100 : 0,
      acceptanceRate: parseFloat(acceptanceRate.toFixed(1)),
      aggregatorDependency: parseFloat(aggregatorDependency.toFixed(1)),
      paidToFarmers: parseFloat(paidToFarmers.toFixed(2)),
      femalePercentage: parseFloat(femalePercentage.toFixed(1)),
      totalAcreage: parseFloat(totalAcreage.toFixed(1)),
      completedOrders: completedOrders.length,
      totalVolume: parseFloat(totalAccepted.toFixed(1)),
      revenue: 0,
      profit: 0,
      fulfillmentRate: 0,
      isFreshSystem: database.farmers.length === 0
    };
    
    console.log('📊 GET /api/analytics/overview - Returning overview');
    res.json(result);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

app.get('/api/analytics/supply-demand', (req, res) => {
  try {
    const period = req.query.period || '30days';
    const days = period === '7days' ? 7 : period === '30days' ? 30 : period === '90days' ? 90 : 30;
    
    const today = new Date();
    const data = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      
      // Calculate supply
      const dayAllocations = database.supplyAllocations.filter(a => a.date === dateKey);
      const supply = dayAllocations.reduce((sum, a) => sum + (a.quantity || 0), 0) || Math.floor(Math.random() * 100) + 50;
      
      // Calculate demand
      const dayOrders = database.orders.filter(o => o.expectedDeliveryDate === dateKey);
      const demand = dayOrders.reduce((sum, o) => sum + (o.quantityOrdered || 0), 0) || Math.floor(Math.random() * 100) + 40;
      
      const gap = supply - demand;
      
      data.push({
        date: dateKey,
        period: period === '7days' ? date.toLocaleDateString('en-US', { weekday: 'short' }) :
                period === '30days' ? `Week ${Math.ceil((i + 1) / 7)}` :
                period === '90days' ? `Week ${Math.ceil((i + 1) / 7)}` :
                date.toLocaleDateString('en-US', { month: 'short' }),
        supply: parseFloat(supply.toFixed(1)),
        demand: parseFloat(demand.toFixed(1)),
        deficit: Math.max(0, demand - supply),
        surplus: Math.max(0, supply - demand),
        gap: parseFloat(gap.toFixed(1))
      });
    }
    
    console.log('📈 GET /api/analytics/supply-demand - Returning:', period);
    res.json(data);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch supply-demand data' });
  }
});

// ====================== UTILITY ENDPOINTS ======================

// Reset database
app.post('/api/reset', (req, res) => {
  try {
    Object.keys(database).forEach(key => {
      database[key] = [];
    });
    console.log('🔄 POST /api/reset - Database reset');
    res.json({ message: 'Database reset successfully', database });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to reset database' });
  }
});

// ====================== ERROR HANDLING ======================
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ====================== START SERVER ======================
const server = createServer(app);

// Get port from environment variable (Render provides this)
const port = process.env.PORT || 5000;

server.listen(port, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log(`🎉 SUPPLY CHAIN SYSTEM STARTED`);
  console.log(`✅ HTTP Server: http://0.0.0.0:${port}`);
  console.log(`📊 Data Status: Empty - Ready for data`);
  console.log('='.repeat(60));
  console.log('\n📋 KEY ENDPOINTS:');
  console.log('  Aggregators:');
  console.log('    GET  /api/aggregators');
  console.log('    GET  /api/aggregators/stats');
  console.log('    POST /api/aggregators');
  console.log('    PUT  /api/aggregators/:id');
  console.log('    DELETE /api/aggregators/:id');
  console.log('  Contracts:');
  console.log('    GET  /api/contracts');
  console.log('    GET  /api/contracts/stats');
  console.log('    POST /api/contracts');
  console.log('    PUT  /api/contracts/:id');
  console.log('    PATCH /api/contracts/:id/fulfillment');
  console.log('    DELETE /api/contracts/:id');
  console.log('  Analytics:');
  console.log('    GET  /api/analytics/overview');
  console.log('    GET  /api/analytics/supply-demand');
  console.log('  Supply Planning:');
  console.log('    GET  /api/supply/allocations');
  console.log('    POST /api/supply/allocations');
  console.log('    GET  /api/supply/demand-analysis');
  console.log('  Procurement:');
  console.log('    GET  /api/procurement/orders');
  console.log('    POST /api/procurement/orders');
  console.log('    GET  /api/procurement/demand-forecast');
  console.log('    POST /api/procurement/request-supplement');
  console.log('  Utility:');
  console.log('    POST /api/reset');
  console.log('\n🌱 System is running - ready for data!');
  console.log('\nPress Ctrl+C to stop\n');
});

