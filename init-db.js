import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    console.log('🔗 Database URL:', process.env.DATABASE_URL ? 'Found' : 'Not found');
    
    // Test connection first
    const test = await pool.query('SELECT NOW()');
    console.log('✅ Database connection test passed');

    // Create users table if not exists
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

    console.log('✅ Users table ready!');

    // Create farmers table if not exists
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

    console.log('✅ Farmers table ready!');
    
    // Check if we have any users
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`📊 Current users in database: ${userCount.rows[0].count}`);

    // Insert all demo users if no users exist
    if (parseInt(userCount.rows[0].count) === 0) {
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
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.log('💡 Troubleshooting tips:');
    console.log('1. Check if DATABASE_URL is in your .env file');
    console.log('2. Verify PostgreSQL is running');
    console.log('3. Check if the database user exists');
  } finally {
    await pool.end();
  }
}

initializeDatabase();
