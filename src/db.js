import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Parse DATABASE_URL if it exists, otherwise use individual variables
let poolConfig;

if (process.env.DATABASE_URL) {
  console.log('🔗 Using DATABASE_URL connection');
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    // ✅ CRITICAL: Add SSL for production
    ssl: process.env.NODE_ENV === 'production' ? { 
      rejectUnauthorized: false 
    } : false
  };
} else {
  console.log('🔗 Using individual DB variables');
  poolConfig = {
    user: process.env.DB_USER || 'farmuser',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'farmmall_appDB',
    password: process.env.DB_PASSWORD || 'farm123',
    port: process.env.DB_PORT || 5432,
    // ✅ SSL for local development if needed
    ssl: false
  };
}

// Debug: Log connection details (without password)
console.log('📊 Database config:', {
  user: poolConfig.user || 'from DATABASE_URL',
  host: poolConfig.host || 'from DATABASE_URL', 
  database: poolConfig.database || 'from DATABASE_URL',
  port: poolConfig.port || 'from DATABASE_URL',
  hasPassword: !!poolConfig.password,
  ssl: poolConfig.ssl ? 'enabled' : 'disabled'
});

const pool = new Pool(poolConfig);

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Test the connection on startup
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('🎯 Database connection test: SUCCESS');
    client.release();
  } catch (error) {
    console.error('💥 Database connection test: FAILED', error.message);
  }
};

testConnection();

export default pool;


 
