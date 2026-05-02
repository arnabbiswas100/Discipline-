/**
 * DISCIPLINE Dashboard — CSV Seeder
 * Imports all Notion CSV data into PostgreSQL
 *
 * Run: node scripts/seed.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ─── CSV paths ────────────────────────────────────────────────────────────────
// Adjust these if you move the exported data folder
const DATA_DIR = path.join(
  __dirname,
  '../../../ExportBlock-1a7353fa-f792-4867-97c5-8c602036ccd9-Part-1/DISCIPLINE'
);

const HABITS_CSV = path.join(DATA_DIR, 'DISCIPLINE c78e8d8d089782eea1450154c952a8f0_all.csv');
const WINS_CSV   = path.join(DATA_DIR, 'My Wins 86ce8d8d089782d6943681b12e606ba8.csv');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseBool(val) {
  if (!val) return false;
  return val.trim().toLowerCase() === 'yes';
}

function parseDate(val) {
  if (!val) return null;
  try {
    const d = new Date(val.trim());
    if (isNaN(d)) return null;
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  } catch {
    return null;
  }
}

function parsePercentage(val) {
  if (!val) return 0;
  const n = parseInt(val.trim(), 10);
  return isNaN(n) ? 0 : Math.min(100, Math.max(0, n));
}

function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      }))
      .on('data', row => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

// ─── Create Tables ────────────────────────────────────────────────────────────
async function createTables(client) {
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

  console.log('✅ Tables created / verified');
}

// ─── Seed Habits ──────────────────────────────────────────────────────────────
async function seedHabits(client) {
  console.log('📂 Reading habits CSV...');

  if (!fs.existsSync(HABITS_CSV)) {
    console.error(`❌ Habits CSV not found at: ${HABITS_CSV}`);
    console.log('   Please adjust the DATA_DIR path in scripts/seed.js');
    return 0;
  }

  const rows = await parseCsv(HABITS_CSV);
  console.log(`📊 Found ${rows.length} rows`);

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const date = parseDate(row['Date']);
    if (!date) { skipped++; continue; }

    // Map CSV column names → DB fields
    const sleep         = parseBool(row['Sleep 6-7 Hours (22:00-05:00)']);
    const prayer        = parseBool(row['Pray and Geeta (daily prayers, read Geeta)']);
    const eat_healthy   = parseBool(row['Eat healthy meals (2000-2200 calories/day)']);
    const social_media  = parseBool(row['Social media - 2-3 Hours (no scrolling)']);
    const no_bad_habits = parseBool(row['No porn/alcohol/drugs/smoke/relationship']);
    const water         = parseBool(row['Drink 3 - 3.5L water per day']);
    const study         = parseBool(row['Study > 2-5 Hours']);
    const exercise      = parseBool(row['Exercise 30-45 minutes']);
    const read          = parseBool(row['Read 30 minutes (English only)']);
    const journal       = parseBool(row['Journal, Diary & self-reflect']);
    const daily_notes   = row['Daily Notes'] || '';
    const mood          = row['Moods'] || '';
    const daily_percentage = parsePercentage(row['Daily Percentage']);

    try {
      await client.query(`
        INSERT INTO habit_logs
          (date, sleep, prayer, eat_healthy, social_media, no_bad_habits,
           water, study, exercise, read, journal, daily_notes, mood, daily_percentage)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (date) DO UPDATE SET
          sleep=$2, prayer=$3, eat_healthy=$4, social_media=$5, no_bad_habits=$6,
          water=$7, study=$8, exercise=$9, read=$10, journal=$11,
          daily_notes=$12, mood=$13, daily_percentage=$14,
          updated_at=NOW()
      `, [date, sleep, prayer, eat_healthy, social_media, no_bad_habits,
          water, study, exercise, read, journal, daily_notes, mood, daily_percentage]);

      inserted++;
    } catch (err) {
      console.warn(`  ⚠ Skipped row for ${date}: ${err.message}`);
      skipped++;
    }
  }

  return { inserted, skipped };
}

// ─── Seed Milestones ──────────────────────────────────────────────────────────
async function seedMilestones(client) {
  console.log('🏆 Seeding milestones...');

  // Clear and re-seed
  await client.query('DELETE FROM milestones');

  const defaultMilestones = [
    { days: 30,   reward: '' },
    { days: 50,   reward: '' },
    { days: 75,   reward: '' },
    { days: 100,  reward: '' },
    { days: 200,  reward: '' },
    { days: 365,  reward: '1 Year Achievement' },
    { days: 500,  reward: '' },
    { days: 730,  reward: '2 Year Achievement' },
    { days: 900,  reward: '' },
    { days: 1095, reward: '3 Year Achievement' },
  ];

  // Try to parse the My Wins CSV for any existing data
  if (fs.existsSync(WINS_CSV)) {
    const winsRows = await parseCsv(WINS_CSV);
    for (const row of winsRows) {
      const streakText = row['The Streak'] || '';
      const daysMatch  = streakText.match(/\d+/);
      if (!daysMatch) continue;
      const days = parseInt(daysMatch[0]);
      const entry = defaultMilestones.find(m => m.days === days);
      if (entry) {
        entry.reward        = row['The Reward'] || entry.reward;
        entry.achieved_date = parseDate(row['Date']);
        entry.notes         = row['Notes'] || '';
      }
    }
  }

  for (const m of defaultMilestones) {
    await client.query(
      'INSERT INTO milestones (streak_days, reward, achieved_date, notes) VALUES ($1,$2,$3,$4)',
      [m.days, m.reward || '', m.achieved_date || null, m.notes || '']
    );
  }

  console.log(`✅ ${defaultMilestones.length} milestones seeded`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱 DISCIPLINE Dashboard — Database Seeder');
  console.log('━'.repeat(50));

  const client = await pool.connect();
  try {
    await createTables(client);

    const result = await seedHabits(client);
    if (result) {
      console.log(`✅ Habits: ${result.inserted} upserted, ${result.skipped} skipped`);
    }

    await seedMilestones(client);

    console.log('\n🎉 Seeding complete!');
    console.log(`   Run: node server.js  →  http://localhost:${process.env.PORT || 3000}`);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
