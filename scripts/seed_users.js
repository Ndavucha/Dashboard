// scripts/seed_users.js
import pool from '../src/db.js'; // adjust path if using CJS
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

const SALT = 10;

async function run(){
  const client = await pool.connect();
  try{
    await client.query('BEGIN');

    // create users
    const users = [
      {username:'admin1', password:'AdminPass123!', email:'admin@example.com', full_name:'Admin One', role:'admin'},
      {username:'proc1', password:'ProcPass123!', email:'proc@example.com', full_name:'Procurement One', role:'procurement'},
      {username:'agro1', password:'AgroPass123!', email:'agro@example.com', full_name:'Agronomist One', role:'agronomist'},
      {username:'farmer1', password:'FarmerPass123!', email:'farmer1@example.com', full_name:'Farmer One', role:'farmer'},
    ];

    for(const u of users){
      const hash = await bcrypt.hash(u.password, SALT);
      const ins = await client.query('INSERT INTO users (username,email,password_hash,full_name) VALUES ($1,$2,$3,$4) RETURNING id', [u.username,u.email,hash,u.full_name]);
      const userId = ins.rows[0].id;
      const r = await client.query('SELECT id FROM roles WHERE name=$1', [u.role]);
      const roleId = r.rows[0].id;
      await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2)', [userId, roleId]);
    }

    await client.query('COMMIT');
    console.log('seed users created');
  }catch(err){
    await client.query('ROLLBACK');
    console.error(err);
  }finally{
    client.release();
    process.exit(0);
  }
}

run();
