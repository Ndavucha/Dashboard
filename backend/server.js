cd /workspaces/Dashboard/backend

# Create minimal working backend
cat > server.js << 'EOF'
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
EOF

# Update package.json
cat > package.json << 'EOF'
{
  "name": "supply-chain-backend",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
EOF

# Install dependencies
npm install

# Test locally
npm start
