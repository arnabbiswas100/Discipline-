# DISCIPLINE Dashboard

A personal full-stack habit tracking system I built to replace my Notion-based discipline tracker. This project migrates all my existing Notion data into a PostgreSQL database and provides a custom admin dashboard to log, edit, and analyze my daily habits.

---

## Tech Stack

- **Frontend:** HTML, CSS, Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **Deployment:** Render (free tier)

---

## Features

- Full CRUD — create, read, update, and delete daily habit logs
- 10 tracked habits with automated daily completion percentage
- Yearly heatmap and monthly calendar history view
- Streak tracking — current and best streak calculations
- Milestone tracker (30, 50, 75, 100, 200, 365, 500, 730, 900, 1095 days)
- Dark mode / light mode toggle
- Glassmorphic black and white UI design
- All existing Notion CSV data imported via seed script

---

## The 10 Habits

1. 💤 Sleep 6–7 Hours (22:00–05:00)
2. 🙏 Prayer & Reflection (daily)
3. 🥗 Eat Healthy Meals (2000–2200 cal/day)
4. 📱 Social Media ≤ 2–3 Hours (no scrolling)
5. 🚫 No Porn / Alcohol / Drugs / Smoke
6. 💧 Drink 3–3.5L Water per Day
7. 💻 Study > 2–5 Hours
8. 🏋️ Exercise 30–45 Minutes
9. 📖 Read 30 Minutes (English only)
10. 🖋️ Journal, Diary & Self-Reflect

> A day counts only if I complete **70% or more** of these habits.

---

## Local Setup

### Requirements

- Node.js >= 18
- PostgreSQL (installed and running)

### Steps

**1. Create the database**
```bash
sudo service postgresql start
sudo -u postgres psql -c "CREATE DATABASE discipline;"
```

**2. Configure environment**
```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/discipline
PORT=5000
NODE_ENV=development
```

**3. Install dependencies**
```bash
npm install
```

**4. Seed the database**
```bash
npm run seed
```

**5. Start the server**
```bash
npm run dev
```

Open: `http://localhost:5000`

---

## Deployment

This project is configured for deployment on Render using `render.yaml`.

1. Push to a GitHub repository
2. Go to Render → New → Blueprint → connect repository
3. Render will provision the PostgreSQL database and web service automatically
4. After first deploy, run `node scripts/seed.js` from the Render shell to import data

> Note: Render's free PostgreSQL instance expires after 90 days.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/habits` | All habit logs (filter: `?year=&month=`) |
| GET | `/api/habits/:date` | Single day log (`YYYY-MM-DD`) |
| POST | `/api/habits` | Create a new log |
| PUT | `/api/habits/:date` | Update an existing log |
| DELETE | `/api/habits/:date` | Delete a log |
| GET | `/api/habits/stats/streak` | Current and best streak |
| GET | `/api/habits/stats/monthly` | Monthly averages (filter: `?year=`) |
| GET | `/api/milestones` | All milestones |
| PUT | `/api/milestones/:id` | Update a milestone |
| GET | `/api/health` | Health check |

---

## Pages

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/` | Today's habits, progress ring, stats, yearly heatmap |
| Daily Log | `/log.html` | Log or edit habits for any date |
| History | `/history.html` | Monthly calendar with per-day details |
| My Wins | `/milestones.html` | Streak milestones and rewards |

---

## Author

**Arnab Mukhar Biswas (Alnos Xen)**
FullStack Developer — IIIT Bhagalpur

> *"And I did not create the jinn and mankind except to worship Me"*
> — Surah Adh-Dhariyat (51:56)
