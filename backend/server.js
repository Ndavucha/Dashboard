import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    message: 'Supply Chain Backend API',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// CRUD endpoints for orders (like your "New Order" button needs)
app.get('/api/orders', (req, res) => {
  res.json({ orders: [], message: 'Get all orders' });
});

app.post('/api/orders', (req, res) => {
  console.log('Creating order:', req.body);
  res.json({ 
    success: true, 
    message: 'Order created',
    order: { id: Date.now(), ...req.body }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});




