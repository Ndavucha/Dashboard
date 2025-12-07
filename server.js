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

// ========== DASHBOARD API ENDPOINTS ==========

// 1. Admin/Forecast Dashboard Data
app.get('/api/dashboard/admin', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    // Get total farmers count
    const farmersResult = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['farmer']);
    
    // Get total users count
    const usersResult = await pool.query('SELECT COUNT(*) FROM users');
    
    // Get active farmers (with farm data)
    const activeFarmersResult = await pool.query('SELECT COUNT(DISTINCT user_id) FROM farmers');
    
    // Calculate harvest readiness (simplified for now)
    const harvestReady = await pool.query(`
      SELECT COUNT(*) as ready_count 
      FROM farmers 
      WHERE harvest_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
      OR harvest_date IS NULL
    `);
    
    // Mock financial data (update with real data later)
    const totalLand = await pool.query('SELECT COALESCE(SUM(plot_size), 0) as total_land FROM farmers');
    
    res.json({
      kpis: {
        totalFarmers: parseInt(farmersResult.rows[0]?.count || 0),
        totalUsers: parseInt(usersResult.rows[0]?.count || 0),
        activeFarmers: parseInt(activeFarmersResult.rows[0]?.count || 0),
        landArea: parseInt(totalLand.rows[0]?.total_land || 2847),
        productionReady: parseInt(harvestReady.rows[0]?.ready_count || 0),
        yieldPerAcre: 2.8
      },
      harvestVolumes: {
        weekly: { maize: 1500, beans: 800, potatoes: 1200 },
        monthly: { maize: 6000, beans: 3200, potatoes: 4800 }
      },
      financialExposure: {
        emergencyProcurement: 45000,
        wasteExposure: 12000,
        potentialSavings: 28000,
        costPerTon: 350
      },
      regions: [
        { name: 'Narok', farmers: 45, landArea: 850, production: 3200, risk: 'low' },
        { name: 'Nakuru', farmers: 38, landArea: 720, production: 2800, risk: 'medium' },
        { name: 'Molo', farmers: 28, landArea: 580, production: 2100, risk: 'high' },
        { name: 'Kericho', farmers: 32, landArea: 620, production: 2400, risk: 'low' }
      ]
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch admin dashboard data' });
  }
});

// 2. Agronomist Dashboard Data
app.get('/api/dashboard/agronomist', requireAuth, requireRole('agronomist'), async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get assigned farmers for this agronomist
    // First, let's check if you have an agronomist_zones or agronomists table
    const assignedFarmersResult = await pool.query(`
      SELECT f.*, u.username, u.first_name, u.last_name, u.phone
      FROM farmers f
      JOIN users u ON f.user_id = u.id
      WHERE f.assigned_agronomist_id = $1 
         OR f.id IN (SELECT farmer_id FROM agronomist_zones WHERE agronomist_id = $1)
         OR u.id IN (SELECT user_id FROM user_roles WHERE role_id = (SELECT id FROM roles WHERE name = 'farmer'))
      LIMIT 10
    `, [userId]);
    
    // Get farm visits if table exists
    let farmVisitsResult;
    try {
      farmVisitsResult = await pool.query(`
        SELECT * FROM farm_visits 
        WHERE agronomist_id = $1 
        ORDER BY visit_date DESC 
        LIMIT 5
      `, [userId]);
    } catch (e) {
      // Table might not exist yet
      farmVisitsResult = { rows: [] };
    }
    
    // Get farmer counts
    const vulnerableCount = await pool.query(`
      SELECT COUNT(*) FROM farmers 
      WHERE risk_level = 'high' 
        AND (assigned_agronomist_id = $1 OR $1 IN (SELECT agronomist_id FROM agronomist_zones WHERE farmer_id = farmers.id))
    `, [userId]);
    
    res.json({
      assignedFarmers: assignedFarmersResult.rows.map(farmer => ({
        id: farmer.id,
        name: farmer.name || `${farmer.first_name} ${farmer.last_name}`,
        location: farmer.location,
        gps: farmer.gps_coordinates || '1.1234, 35.5678',
        variety: farmer.crop_variety || 'Shangi',
        stage: farmer.crop_stage || 'Vegetative',
        stageProgress: 60 + (farmer.id % 40),
        lastVisit: new Date(Date.now() - (farmer.id % 10) * 86400000).toISOString().split('T')[0],
        nextVisit: new Date(Date.now() + (5 + farmer.id % 10) * 86400000).toISOString().split('T')[0],
        vulnerable: farmer.risk_level === 'high',
        lagging: farmer.crop_stage === 'Germination' && farmer.id % 3 === 0,
        practices: ['Mulching', 'Drip Irrigation'],
        healthScore: 70 + (farmer.id % 30)
      })),
      farmVisits: farmVisitsResult.rows,
      stats: {
        totalFarmers: assignedFarmersResult.rows.length,
        vulnerableCount: parseInt(vulnerableCount.rows[0]?.count || 0),
        averageHealth: 78,
        visitsThisMonth: farmVisitsResult.rows.length
      }
    });
  } catch (error) {
    console.error('Agronomist dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch agronomist data' });
  }
});

// 3. Farmer Dashboard Data
// 3. Farmer Dashboard Data
app.get('/api/dashboard/farmer', requireAuth, requireRole('farmer'), async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('Fetching farmer data for user ID:', userId);
    
    // Get user details
    const userResult = await pool.query(`
      SELECT * FROM users WHERE id = $1
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    console.log('Found user:', user.email, 'role:', user.role);
    
    // Try to find a farmer by email (since farmers table has email)
    let farmResult;
    if (user.email) {
      farmResult = await pool.query(`
        SELECT * FROM farmers WHERE email = $1
      `, [user.email]);
    }
    
    // If no farmer found by email, get the first farmer as fallback
    if (!farmResult || farmResult.rows.length === 0) {
      console.log('No farmer found by email, fetching first farmer');
      farmResult = await pool.query(`
        SELECT * FROM farmers LIMIT 1
      `);
    }
    
    // If still no farmer found, create a mock farmer
    let farmData;
    if (farmResult.rows.length === 0) {
      console.log('No farmers in database, creating mock data');
      farmData = {
        id: 1,
        first_name: user.first_name || 'Demo',
        last_name: user.last_name || 'Farmer',
        email: user.email,
        phone: user.phone || '+254712345678',
        region: user.region || 'Narok',
        plot_size: '18 ha',
        crop_variety: 'Shangi',
        planting_date: '2024-08-15',
        harvest_date: '2024-12-28'
      };
    } else {
      farmData = farmResult.rows[0];
    }
    
    console.log('Using farmer:', farmData.id, farmData.first_name, farmData.last_name);
    
    // Get advisories for this farmer
    let advisoriesResult;
    try {
      advisoriesResult = await pool.query(`
        SELECT * FROM advisories 
        WHERE farmer_id = $1 
        ORDER BY created_at DESC 
        LIMIT 10
      `, [farmData.id]);
    } catch (e) {
      console.log('Advisories table error or empty:', e.message);
      advisoriesResult = { rows: [] };
    }
    
    console.log('Found advisories:', advisoriesResult.rows.length);
    
    // Get farmer tasks for this farmer
    let tasksResult;
    try {
      tasksResult = await pool.query(`
        SELECT * FROM farmer_tasks 
        WHERE farmer_id = $1 
        ORDER BY due_date ASC
      `, [farmData.id]);
    } catch (e) {
      console.log('Farmer tasks table error or empty:', e.message);
      tasksResult = { rows: [] };
    }
    
    console.log('Found tasks:', tasksResult.rows.length);
    
    // Get field data if available
    let fieldsResult;
    try {
      fieldsResult = await pool.query(`
        SELECT * FROM fields 
        WHERE farmer_id = $1 
        LIMIT 1
      `, [farmData.id]);
    } catch (e) {
      console.log('Fields table error or empty:', e.message);
      fieldsResult = { rows: [] };
    }
    
    // Calculate progress based on planting and harvest dates
    let progress = 85; // default
    
    if (farmData.planting_date && farmData.harvest_date) {
      const plantingDate = new Date(farmData.planting_date);
      const harvestDate = new Date(farmData.harvest_date);
      const today = new Date();
      
      const totalDays = (harvestDate - plantingDate) / (1000 * 60 * 60 * 24);
      const daysPassed = (today - plantingDate) / (1000 * 60 * 60 * 24);
      
      if (totalDays > 0 && daysPassed >= 0) {
        progress = Math.min(95, Math.max(5, Math.round((daysPassed / totalDays) * 100)));
      }
    }
    
    // Prepare farm data
    let farmDataResponse = {
      plotSize: farmData.plot_size || '18 ha',
      plantingDate: farmData.planting_date ? new Date(farmData.planting_date).toISOString().split('T')[0] : '2024-08-15',
      expectedHarvest: farmData.harvest_date ? new Date(farmData.harvest_date).toISOString().split('T')[0] : '2024-12-28',
      variety: farmData.crop_variety || 'Shangi',
      progress: progress
    };
    
    // If field data exists, use it
    if (fieldsResult.rows.length > 0) {
      const field = fieldsResult.rows[0];
      farmDataResponse = {
        plotSize: `${field.size || farmData.plot_size || 18} ha`,
        plantingDate: field.planting_date ? new Date(field.planting_date).toISOString().split('T')[0] : farmDataResponse.plantingDate,
        expectedHarvest: field.expected_harvest_date ? new Date(field.expected_harvest_date).toISOString().split('T')[0] : farmDataResponse.expectedHarvest,
        variety: field.crop_variety || farmDataResponse.variety,
        progress: field.progress || farmDataResponse.progress
      };
    }
    
    // Prepare advisories response
    let advisoriesResponse = advisoriesResult.rows;
    if (advisoriesResponse.length === 0) {
      advisoriesResponse = [
        { 
          id: 1, 
          type: 'weather', 
          message: 'Heavy rain expected tomorrow. Secure your crops and drainage systems.', 
          date: '2024-12-20'
        },
        { 
          id: 2, 
          type: 'task', 
          message: 'Apply NPK fertilizer this week for optimal growth during flowering stage.', 
          date: '2024-12-18'
        }
      ];
    }
    
    // Prepare tasks response
    let tasksResponse = tasksResult.rows;
    if (tasksResponse.length === 0) {
      tasksResponse = [
        { 
          id: 1,
          title: 'Apply Fertilizer', 
          description: 'Apply NPK fertilizer to maize field',
          due_date: '2024-12-20',
          status: 'pending'
        },
        { 
          id: 2,
          title: 'Pest Inspection', 
          description: 'Check for pests in potato section',
          due_date: '2024-12-22',
          status: 'pending'
        }
      ];
    }
    
    const responseData = {
      farmer: {
        id: farmData.id,
        firstName: farmData.first_name,
        lastName: farmData.last_name,
        fullName: `${farmData.first_name} ${farmData.last_name}`,
        email: farmData.email,
        phone: farmData.phone,
        region: farmData.region,
        createdAt: farmData.created_at
      },
      advisories: advisoriesResponse.map(adv => ({
        id: adv.id,
        type: adv.type || 'general',
        message: adv.message || adv.description,
        date: adv.date || (adv.created_at ? new Date(adv.created_at).toISOString().split('T')[0] : '2024-12-20')
      })),
      tasks: tasksResponse.map(task => ({
        id: task.id,
        title: task.title || task.task_description,
        description: task.description || task.task_description,
        dueDate: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '2024-12-20',
        status: task.status || 'pending'
      })),
      farmData: farmDataResponse,
      weatherAlerts: [
        { type: 'rain', message: 'Heavy rain expected tomorrow', priority: 'high' },
        { type: 'temperature', message: 'Temperature dropping to 15°C at night', priority: 'medium' }
      ]
    };
    
    console.log('Sending farmer dashboard data successfully');
    res.json(responseData);
    
  } catch (error) {
    console.error('Farmer dashboard error details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch farmer data',
      details: error.message,
      suggestion: 'Check if farmers table exists and has data'
    });
  }
});
// ========== EXISTING ENDPOINTS (KEEP THESE) ==========

// protected example: admin-only
app.get('/admin/summary', requireAuth, requireRole('admin'), async (req, res) => {
  // return aggregated numbers for admin
  const { rows } = await pool.query('SELECT COUNT(*) AS farmers FROM farmers');
  res.json({ summary: rows[0] });
});

// procurement-route example (procurement or admin)
app.get('/procurement/reconciliation', requireAuth, requireRole(['procurement','admin']), async (req, res) => {
  // placeholder logic - you can update this to use the new endpoint
  res.json({ msg: 'Use /api/dashboard/procurement for full dashboard data' });
});

// agronomist example
app.get('/agronomy/assigned', requireAuth, requireRole('agronomist'), async (req, res) => {
  // fetch assigned farmers for this agronomist - placeholder
  res.json({ msg: 'Use /api/dashboard/agronomist for full dashboard data' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log(`Server listening on ${PORT}`));
