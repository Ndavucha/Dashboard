// server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './src/auth.js';
import pool from './src/db.js';
import { requireAuth, requireRole } from './src/middleware.js';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Database auto-initialization function
async function initializeDatabase() {
  try {
    console.log('🔄 Checking database tables...');
    
    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    const usersTableExists = tableCheck.rows[0].exists;
    
    if (!usersTableExists) {
      console.log('📦 Creating database tables...');
      
      // Create users table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL CHECK (role IN ('farmer', 'agronomist', 'procurement', 'admin')),
          first_name VARCHAR(50),
          last_name VARCHAR(50),
          phone VARCHAR(20),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('✅ Users table created!');

      // Create farmers table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS farmers (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          location VARCHAR(100),
          land_size DECIMAL(10,2),
          crop_type VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('✅ Farmers table created!');
      
      // Create all demo users
      const bcrypt = await import('bcrypt');
      
      const demoUsers = [
        // admin user
        ['admin', 'admin@agrimanage.com', 'admin123', 'admin', 'System', 'Admin'],
        // procurement user
        ['procurement', 'procurement@agrimanage.com', 'proc123', 'procurement', 'Procurement', 'Officer'],
        // agronomist user
        ['agronomist', 'agronomist@agrimanage.com', 'agro123', 'agronomist', 'Farm', 'Agronomist'],
        // farmer user
        ['farmer', 'farmer@agrimanage.com', 'farmer123', 'farmer', 'Demo', 'Farmer']
      ];
      
      for (const user of demoUsers) {
        const [username, email, password, role, firstName, lastName] = user;
        const hashedPassword = await bcrypt.default.hash(password, 10);
        
        await pool.query(
          `INSERT INTO users (username, email, password_hash, role, first_name, last_name) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [username, email, hashedPassword, role, firstName, lastName]
        );
        
        console.log(`👤 Created ${role} user: ${username} / ${password}`);
      }
      
      console.log('✅ All demo users created!');
      
    } else {
      console.log('✅ Database tables already exist');
      
      // Check if we need to add missing demo users
      const userCount = await pool.query('SELECT COUNT(*) FROM users');
      console.log(`📊 Current users in database: ${userCount.rows[0].count}`);
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
  }
}

// Debug route to check all users
app.get('/debug-users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role, email, is_active FROM users ORDER BY id');
    res.json({ 
      totalUsers: result.rows.length,
      users: result.rows 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Temporary route to fix missing users
app.post('/fix-users', async (req, res) => {
  try {
    const bcrypt = await import('bcrypt');
    
    const demoUsers = [
      ['admin', 'admin@agrimanage.com', 'admin123', 'admin', 'System', 'Admin'],
      ['procurement', 'procurement@agrimanage.com', 'proc123', 'procurement', 'Procurement', 'Officer'],
      ['agronomist', 'agronomist@agrimanage.com', 'agro123', 'agronomist', 'Farm', 'Agronomist'],
      ['farmer', 'farmer@agrimanage.com', 'farmer123', 'farmer', 'Demo', 'Farmer']
    ];
    
    let created = 0;
    let skipped = 0;
    
    for (const user of demoUsers) {
      const [username, email, password, role, firstName, lastName] = user;
      
      // Check if user exists
      const exists = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
      
      if (exists.rows.length === 0) {
        const hashedPassword = await bcrypt.default.hash(password, 10);
        
        await pool.query(
          `INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_active) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [username, email, hashedPassword, role, firstName, lastName, true]
        );
        
        console.log(`👤 Created ${role} user: ${username}`);
        created++;
      } else {
        console.log(`⏭️ User already exists: ${username}`);
        skipped++;
      }
    }
    
    res.json({ 
      success: true, 
      message: `Created ${created} missing users, skipped ${skipped} existing users`,
      users: demoUsers.map(u => ({ username: u[0], role: u[3], password: u[2] }))
    });
    
  } catch (error) {
    console.error('Error fixing users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test route to verify auth routes are working
app.get('/test-auth', (req, res) => {
  res.json({ message: 'Auth routes are working' });
});

// health
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: true });
  } catch (err) {
    res.json({ status: 'db_error', error: err.message });
  }
});

// auth
app.use('/auth', authRoutes);

// protected example: admin-only
app.get('/admin/summary', requireAuth, requireRole('admin'), async (req, res) => {
  // return aggregated numbers for admin
  const { rows } = await pool.query('SELECT COUNT(*) AS farmers FROM farmers');
  res.json({ summary: rows[0] });
});

// procurement-route example (procurement or admin)
app.get('/procurement/reconciliation', requireAuth, requireRole(['procurement','admin']), async (req, res) => {
  // placeholder logic
  res.json({ msg: 'reconciliation data (mock)' });
});

// agronomist example
app.get('/agronomy/assigned', requireAuth, requireRole('agronomist'), async (req, res) => {
  // fetch assigned farmers for this agronomist - placeholder
  res.json({ msg: 'assigned farmers (mock)' });
});

const PORT = process.env.PORT || 4000;

// Initialize database then start server
initializeDatabase().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server listening on ${PORT}`));
});
