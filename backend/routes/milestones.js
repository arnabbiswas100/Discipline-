const express = require('express');
const router = express.Router();
const pool = require('../db');

// ─── GET /api/milestones ──────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM milestones ORDER BY streak_days ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/milestones/:id ──────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reward, achieved_date, notes } = req.body;

    const { rows } = await pool.query(`
      UPDATE milestones SET
        reward=$2,
        achieved_date=$3,
        notes=$4
      WHERE id=$1
      RETURNING *
    `, [id, reward || '', achieved_date || null, notes || '']);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
