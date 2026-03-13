# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**MOSHINA.TJ** — a car marketplace for Tajikistan. The repo lives under `moshina-tj/` with two sub-projects:

- `moshina-tj/backend/` — FastAPI + Python 3.11
- `moshina-tj/frontend/` — Next.js 14 (App Router) + TypeScript + Tailwind CSS

## Commands

### Backend

```bash
cd moshina-tj/backend
source venv/bin/activate
uvicorn app.main:app --reload       # dev server on :8000
alembic upgrade head                # run migrations
python seeds.py                     # seed database
```

API docs available at `http://localhost:8000/docs`.

### Frontend

```bash
cd moshina-tj/frontend
npm install
npm run dev          # dev server on :3000
npm run build        # production build
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
```

## Architecture

### Backend

All routes are mounted under `/api/v1`. Router modules:
- `app/routers/auth.py` — register, login (rate-limited 5/15min via slowapi), /me, profile update, change-password
- `app/routers/listings.py` — CRUD + featured; new listings go to `status=pending`; delete is soft; `activate`/`deactivate` endpoints
- `app/routers/dealers.py` — dealer directory and profiles
- `app/routers/search.py` — fuzzy search (pg_trgm), `/suggestions`, `/did-you-mean`, `/recommendations` endpoints
- `app/routers/admin.py` — full CRM: user search/ban/unban/role, listing activate/deactivate, moderation queue (approve/reject with reason), dealer verify/unverify
- `app/routers/users.py` — public user profile + their active listings
- `app/routers/upload.py` — image upload to Cloudinary (or local `/uploads` dir in dev)
- `app/routers/ai.py` — Claude AI description refinement (rate-limited 5/min)

**Response envelope:** every endpoint returns `{"success": bool, "data": ..., "message": ""}`. Paginated responses use `{"items": [...], "total": int, "page": int, "pages": int}`.

**Auth:** JWT (HS256, 7-day expiry) stored in a Bearer header. `get_current_user` dependency in `app/auth.py` validates the token.

**Database:** SQLAlchemy (sync), session injected via `get_db()` dependency. `app/models.py` defines `User`, `Listing`, `ListingImage`, `Dealer`. `ListingStatus` enum: `pending` → `active` or `rejected`. `UserRole` enum: user/dealer/admin/moderator/manager/support. Migrations managed by Alembic — always run `alembic upgrade head` after pulling.

**Moderation flow:** New listings start as `status=pending, is_active=False`. Only `status=active` listings appear in public feeds. Moderators use `/admin/moderation/pending` (FIFO queue) and call approve/reject endpoints.

**Fuzzy search:** Requires PostgreSQL extensions `pg_trgm` and `fuzzystrmatch` (enabled via migration `c3d4e5f6a7b8`). The `search.py` router uses a 3-strategy fallback: tsvector → trigram similarity → ILIKE.

**Image uploads:** In production, images go to Cloudinary (configured via env vars). Locally, files are saved to `backend/uploads/` and served as static files at `/uploads`.

### Frontend

**API client:** `lib/api.ts` — axios instance with base URL from `NEXT_PUBLIC_API_URL`. JWT token auto-attached from the `token` cookie via request interceptor.

**Auth state:** `lib/AuthContext.tsx` — React context. Token stored in cookie (`js-cookie`, 7-day expiry); user object in `localStorage`.

**i18n:** `lib/i18n.ts` — all UI strings in `{ ru: '...', tj: '...' }` shape. Language state in `lib/LanguageContext.tsx`, persisted to `localStorage`. **Never hardcode Russian or Tajik text directly in components.**

**Theme:** Dark/light toggled by adding/removing the `dark` class on `<html>`. CSS custom properties (`--bg`, `--card`, `--accent`, etc.) defined in `globals.css` drive all colors. **Never hardcode colors — always use `var(--...)`.**

**Key pages:** `/` (homepage + featured), `/car/[id]` (detail + related cars), `/catalog` (filters + did-you-mean), `/rent`, `/dealers`, `/dealers/[id]`, `/installment`, `/post` (create + edit listing, AI description button), `/dashboard` (profile, listings, settings), `/admin` (full CRM, 5 tabs), `/moderator` (moderation queue), `/manager`, `/support`, `/auth/login`, `/auth/register`.

## Environment Variables

### Backend (`moshina-tj/backend/.env`)

```
DATABASE_URL=postgresql://user:pass@host/moshina
SECRET_KEY=<32-char random string>
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
ALLOWED_ORIGINS=http://localhost:3000
ANTHROPIC_API_KEY=   # optional — leave empty to disable AI description feature
```

### Frontend (`moshina-tj/frontend/.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Critical Rules

- **Zero hardcoded colors** — use `var(--accent)`, `var(--card)`, etc. everywhere or dark mode breaks.
- **Zero hardcoded strings** — all user-facing text goes through `i18n.ts`.
- **TypeScript strict mode** — no `any` types.
- **Mobile first** — all components must work at 320px minimum width.
- **Never return `password_hash`** in any API response.
- **No emojis anywhere** — SVG icons only.
- **No N+1 queries** — all list endpoints loading listings must use `joinedload(Listing.images)`.
- **All list endpoints paginated** — use `page`/`pages`/`total` in response.
- **Listing visibility** — public feeds filter by `Listing.status == ListingStatus.active`, never `is_active == True` alone.
- **Role checks in admin router** — `require_admin` (admin+moderator+manager), `require_super_admin` (admin only), `require_moderator` (admin+moderator).
- **Multiple FKs from Listing to User** — `user_id` and `moderated_by` both point to users. SQLAlchemy relationships must specify `foreign_keys=[...]` explicitly.
- **Agents by role** — always use the specialized agent for frontend (frontend-developer), backend (backend-developer), AI features (ai-ml-engineer), deployments (devops-infrastructure).
