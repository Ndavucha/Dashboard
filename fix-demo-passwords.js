import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixDemoPasswords() {
  try {
    console.log('🔐 Fixing demo user passwords with proper hashes...');
    
    // Hash the actual demo passwords
    const procPassword = await bcrypt.hash('proc123', 10);
    const agroPassword = await bcrypt.hash('agro123', 10);
    const farmerPassword = await bcrypt.hash('farmer123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    console.log('Generated password hashes:');
    console.log('proc123:', procPassword);
    console.log('agro123:', agroPassword);
    console.log('farmer123:', farmerPassword);
    
    // Update passwords in the database
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [procPassword, 'procurement']
    );
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [agroPassword, 'agronomist']
    );
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [farmerPassword, 'farmer']
    );
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [adminPassword, 'admin']
    );
    
    console.log('✅ All demo passwords updated!');
    console.log('📋 Demo accounts (USE THESE):');
    console.log('   Admin:       admin / admin123');
    console.log('   Procurement: procurement / proc123');
    console.log('   Agronomist:  agronomist / agro123');
    console.log('   Farmer:      farmer / farmer123');
    
    // Verify the updates
    const result = await pool.query('SELECT username, role FROM users');
    console.log('👥 Current users:', result.rows);
    
  } catch (error) {
    console.error('❌ Error fixing passwords:', error);
  } finally {
    await pool.end();
  }
}

fixDemoPasswords();