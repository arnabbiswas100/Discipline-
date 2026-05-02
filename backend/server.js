require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');

const habitsRouter = require('./routes/habits');
const milestonesRouter = require('./routes/milestones');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/habits', habitsRouter);
app.use('/api/milestones', milestonesRouter);

// Health check — works even if DB is down
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all: serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── Start Server FIRST, then init DB ────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 DISCIPLINE Dashboard running on port ${PORT}`);
  initDB().catch(err => {
    console.error('❌ DB init failed (server still running):', err.message);
  });
});

// ─── Initialize DB tables ─────────────────────────────────────────────────────
async function initDB() {
  let client;
  try {
    client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS habit_logs (
        id               SERIAL PRIMARY KEY,
        date             DATE UNIQUE NOT NULL,
        sleep            BOOLEAN DEFAULT FALSE,
        prayer           BOOLEAN DEFAULT FALSE,
        eat_healthy      BOOLEAN DEFAULT FALSE,
        social_media     BOOLEAN DEFAULT FALSE,
        no_bad_habits    BOOLEAN DEFAULT FALSE,
        water            BOOLEAN DEFAULT FALSE,
        study            BOOLEAN DEFAULT FALSE,
        exercise         BOOLEAN DEFAULT FALSE,
        read             BOOLEAN DEFAULT FALSE,
        journal          BOOLEAN DEFAULT FALSE,
        daily_notes      TEXT DEFAULT '',
        mood             VARCHAR(50) DEFAULT '',
        daily_percentage INTEGER DEFAULT 0,
        created_at       TIMESTAMPTZ DEFAULT NOW(),
        updated_at       TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS milestones (
        id            SERIAL PRIMARY KEY,
        streak_days   INTEGER NOT NULL,
        reward        TEXT DEFAULT '',
        achieved_date DATE,
        notes         TEXT DEFAULT ''
      );
    `);
    const { rows } = await client.query('SELECT COUNT(*) FROM milestones');
    if (parseInt(rows[0].count) === 0) {
      const defaultMilestones = [30,50,75,100,200,365,500,730,900,1095];
      for (const days of defaultMilestones) {
        await client.query('INSERT INTO milestones (streak_days) VALUES ($1)', [days]);
      }
      console.log('✅ Milestones seeded');
    }
    console.log('✅ Database tables initialized');
  } catch (err) {
    console.error('❌ DB init error:', err.message);
  } finally {
    if (client) client.release();
  }
}
