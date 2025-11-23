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
app.listen(PORT, ()=> console.log(`Server listening on ${PORT}`));
