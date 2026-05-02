const express = require('express');
const router = express.Router();
const pool = require('../db');

// ─── GET /api/habits ──────────────────────────────────────────────────────────
// Query params: ?year=2025&month=5  →  filter by year/month
router.get('/', async (req, res) => {
  try {
    const { year, month } = req.query;
    let query = 'SELECT * FROM habit_logs';
    const params = [];

    if (year && month) {
      query += ' WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2';
      params.push(year, month);
    } else if (year) {
      query += ' WHERE EXTRACT(YEAR FROM date) = $1';
      params.push(year);
    }

    query += ' ORDER BY date ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/habits/stats/monthly ───────────────────────────────────────────
router.get('/stats/monthly', async (req, res) => {
  try {
    const { year } = req.query;
    const filterYear = year || new Date().getFullYear();

    const { rows } = await pool.query(`
      SELECT
        EXTRACT(MONTH FROM date)::INTEGER AS month,
        TO_CHAR(date, 'Month') AS month_name,
        ROUND(AVG(daily_percentage), 1) AS avg_percentage,
        COUNT(*) AS days_logged,
        SUM(CASE WHEN daily_percentage >= 70 THEN 1 ELSE 0 END) AS good_days
      FROM habit_logs
      WHERE EXTRACT(YEAR FROM date) = $1
      GROUP BY EXTRACT(MONTH FROM date), TO_CHAR(date, 'Month')
      ORDER BY month ASC
    `, [filterYear]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/habits/stats/streak ────────────────────────────────────────────
router.get('/stats/streak', async (req, res) => {
  try {
    // Get all logs where daily_percentage >= 70 (a "full day")
    const { rows } = await pool.query(`
      SELECT date, daily_percentage
      FROM habit_logs
      WHERE date <= CURRENT_DATE
      ORDER BY date DESC
    `);

    // Calculate current streak
    let currentStreak = 0;
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < rows.length; i++) {
      const logDate = new Date(rows[i].date);
      logDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);

      if (logDate.getTime() !== expectedDate.getTime()) break;
      if (rows[i].daily_percentage >= 70) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate best streak
    let bestStreak = 0;
    let tempStreak = 0;
    const allRows = [...rows].reverse(); // ascending order

    for (let i = 0; i < allRows.length; i++) {
      if (allRows[i].daily_percentage >= 70) {
        tempStreak++;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    // Total good days
    const goodDays = rows.filter(r => r.daily_percentage >= 70).length;

    // Overall average
    const avgResult = await pool.query(`
      SELECT ROUND(AVG(daily_percentage), 1) AS overall_avg
      FROM habit_logs
      WHERE daily_percentage > 0
    `);

    res.json({
      current_streak: currentStreak,
      best_streak: bestStreak,
      good_days: goodDays,
      overall_avg: avgResult.rows[0].overall_avg || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/habits/:date ────────────────────────────────────────────────────
// date format: YYYY-MM-DD
router.get('/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM habit_logs WHERE date = $1',
      [date]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No log found for this date' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/habits ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      date, sleep, prayer, eat_healthy, social_media,
      no_bad_habits, water, study, exercise, read, journal,
      daily_notes, mood, daily_percentage
    } = req.body;

    // Auto-calculate percentage if not provided
    const habitFields = [sleep, prayer, eat_healthy, social_media, no_bad_habits,
                         water, study, exercise, read, journal];
    const completed = habitFields.filter(Boolean).length;
    const pct = daily_percentage !== undefined ? daily_percentage : Math.round((completed / 10) * 100);

    const { rows } = await pool.query(`
      INSERT INTO habit_logs
        (date, sleep, prayer, eat_healthy, social_media, no_bad_habits,
         water, study, exercise, read, journal, daily_notes, mood, daily_percentage)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
    `, [date, sleep||false, prayer||false, eat_healthy||false, social_media||false,
        no_bad_habits||false, water||false, study||false, exercise||false,
        read||false, journal||false, daily_notes||'', mood||'', pct]);

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Log already exists for this date. Use PUT to update.' });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/habits/:date ────────────────────────────────────────────────────
router.put('/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const {
      sleep, prayer, eat_healthy, social_media,
      no_bad_habits, water, study, exercise, read, journal,
      daily_notes, mood
    } = req.body;

    // Auto-calculate percentage
    const habitFields = [sleep, prayer, eat_healthy, social_media, no_bad_habits,
                         water, study, exercise, read, journal];
    const completed = habitFields.filter(Boolean).length;
    const daily_percentage = Math.round((completed / 10) * 100);

    const { rows } = await pool.query(`
      UPDATE habit_logs SET
        sleep=$2, prayer=$3, eat_healthy=$4, social_media=$5, no_bad_habits=$6,
        water=$7, study=$8, exercise=$9, read=$10, journal=$11,
        daily_notes=$12, mood=$13, daily_percentage=$14,
        updated_at=NOW()
      WHERE date=$1
      RETURNING *
    `, [date, sleep||false, prayer||false, eat_healthy||false, social_media||false,
        no_bad_habits||false, water||false, study||false, exercise||false,
        read||false, journal||false, daily_notes||'', mood||'', daily_percentage]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No log found for this date' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/habits/:date ─────────────────────────────────────────────────
router.delete('/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { rows } = await pool.query(
      'DELETE FROM habit_logs WHERE date=$1 RETURNING *',
      [date]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No log found for this date' });
    }
    res.json({ message: 'Deleted', record: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
