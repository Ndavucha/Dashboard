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
  };
} else {
  console.log('🔗 Using individual DB variables');
  poolConfig = {
    user: process.env.DB_USER || 'farmuser',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'farmmall_appDB',
    password: process.env.DB_PASSWORD || 'farm123', // Ensure this is a string
    port: process.env.DB_PORT || 5432,
  };
}

// Debug: Log connection details (without password)
console.log('📊 Database config:', {
  user: poolConfig.user || 'from DATABASE_URL',
  host: poolConfig.host || 'from DATABASE_URL', 
  database: poolConfig.database || 'from DATABASE_URL',
  port: poolConfig.port || 'from DATABASE_URL',
  hasPassword: !!poolConfig.password
});

const pool = new Pool(poolConfig);

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

export default pool;