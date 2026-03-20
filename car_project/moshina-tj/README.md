# TajCar.tj

Automotive marketplace for Tajikistan — buy, rent, and finance cars.
Bilingual (Russian + Tajik), dark/light mode, mobile-first.

**Stack:** Next.js 14 · FastAPI · PostgreSQL (Neon) · Cloudinary

---

## Local development

### Prerequisites

- Python 3.11+
- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database
- A [Cloudinary](https://cloudinary.com) account

---

### Backend

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and fill in all values (see "Environment variables" below)

# Run database migrations
alembic upgrade head

# (Optional) Seed sample data — 3 users + 20 listings
python seeds.py

# Start development server
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

---

### Frontend

```bash
cd frontend

# Install dependencies (skip if node_modules already exists)
npm install

# Configure environment
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local

# Start development server
npm run dev
```

App: http://localhost:3000

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` |
| `SECRET_KEY` | JWT signing key — 32+ random chars | `openssl rand -hex 32` |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name | `mycloud` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `abcdefg...` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000,https://tajcar.tj` |
| `ANTHROPIC_API_KEY` | Claude AI key for description refinement (optional) | `sk-ant-...` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8000/api/v1` |

---

## Seed users

After running `python seeds.py`:

| Role | Phone | Password |
|---|---|---|
| User | +992900000001 | tajcar123 |
| Dealer | +992900000002 | tajcar123 |
| Admin | +992900000003 | tajcar123 |
| Moderator | +992900000004 | tajcar123 |
| Manager | +992900000005 | tajcar123 |
| Support | +992900000006 | tajcar123 |

---

## Deployment

### Database — Neon

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string → `DATABASE_URL` in backend env

### Backend — Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo, set root to `backend/`
3. Build command: `pip install -r requirements.txt && alembic upgrade head`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add all env vars from `backend/.env.example` in the Render dashboard
6. Copy the Render URL → set as `NEXT_PUBLIC_API_URL` in Vercel

### Frontend — Vercel

1. Import repo on [vercel.com](https://vercel.com)
2. Set root directory to `frontend/`
3. Add env var: `NEXT_PUBLIC_API_URL=https://your-render-app.onrender.com/api/v1`
4. Deploy

### Deploy checklist

- [ ] Neon database created and `DATABASE_URL` copied
- [ ] `alembic upgrade head` ran against production DB
- [ ] `SECRET_KEY` is a strong random value (not the example)
- [ ] Cloudinary credentials added to backend env
- [ ] `ALLOWED_ORIGINS` includes the Vercel production URL
- [ ] `NEXT_PUBLIC_API_URL` points to the Render backend
- [ ] Vercel deployment green
- [ ] Render deployment green, `/health` returns `{"status": "ok"}`

---

## Project structure

```
moshina-tj/
├── backend/
│   ├── app/
│   │   ├── main.py          — FastAPI app, CORS, rate limiter, routers
│   │   ├── config.py        — pydantic-settings, reads .env
│   │   ├── database.py      — SQLAlchemy engine + session
│   │   ├── models.py        — ORM models (users, listings, images, dealers)
│   │   ├── schemas.py       — Pydantic v2 request/response schemas
│   │   ├── auth.py          — JWT + bcrypt helpers, get_current_user
│   │   └── routers/
│   │       ├── auth.py      — register, login, me, profile update
│   │       ├── listings.py  — CRUD + featured + filters + pagination
│   │       ├── dealers.py   — dealer directory + profiles
│   │       ├── search.py    — fuzzy search (pg_trgm), suggestions, did-you-mean, recommendations
│   │       ├── admin.py     — CRM: users/ban/role, listings/moderation, dealers/verify
│   │       ├── users.py     — public user profiles + their listings
│   │       ├── upload.py    — Cloudinary image upload
│   │       └── ai.py        — Claude AI description refinement
│   ├── alembic/             — database migrations
│   ├── seeds.py             — sample data (6 roles + 20 listings)
│   ├── requirements.txt
│   └── Procfile             — Render/Railway start command
├── frontend/
│   ├── app/
│   │   ├── page.tsx         — home page
│   │   ├── catalog/         — listing catalog with filters
│   │   ├── car/[id]/        — listing detail + related cars
│   │   ├── post/            — create + edit listing with AI description
│   │   ├── dashboard/       — user profile, listings, settings
│   │   ├── admin/           — CRM (stats, users, listings, moderation queue, dealers)
│   │   ├── moderator/       — moderation queue (approve/reject)
│   │   ├── manager/         — manager dashboard
│   │   ├── support/         — support dashboard
│   │   ├── dealers/         — dealer directory
│   │   ├── rent/            — rental listings
│   │   └── auth/            — login + register
│   ├── components/          — Navbar, CarCard, Footer, SearchBar (with autocomplete), Pagination
│   ├── lib/                 — i18n (ru/tj), AuthContext, LanguageContext, api.ts
│   └── types/               — TypeScript interfaces
└── .github/workflows/
    └── deploy.yml           — CI: type-check + build on push to main
```
