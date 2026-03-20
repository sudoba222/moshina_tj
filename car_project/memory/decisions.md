# Decisions

Key architectural and product decisions made during development.

---

## Architecture

- **Backend:** FastAPI + Python 3.11, SQLAlchemy (sync), Alembic migrations, PostgreSQL with pg_trgm + fuzzystrmatch extensions.
- **Frontend:** Next.js 14 App Router, TypeScript strict mode, Tailwind CSS with CSS custom properties for theming.
- **Auth:** JWT (HS256, 7-day expiry) in Bearer header; no refresh tokens (simplicity).
- **Image storage:** Cloudinary in production, local `/uploads` dir in dev.
- **AI descriptions:** Claude API via `app/routers/ai.py`, rate-limited 5/min, optional (disabled when `ANTHROPIC_API_KEY` is empty).

## Moderation Flow

- New listings start as `status=pending, is_active=False`.
- Moderators work a FIFO queue; approve → `status=active`, reject → `status=rejected` with reason.
- Public feeds filter by `Listing.status == ListingStatus.active` only.

## Naming

- Current canonical brand name: **TajCar.tj** (confirmed by user 2026-03-20). Previously went through MOSHINA.TJ → AVTOMARKET.TJ → MOSHINA.TJ → TajCar.tj. Frontend already uses TajCar.tj throughout.

## Search

- Three-strategy fallback: tsvector full-text → trigram similarity (pg_trgm) → ILIKE.
- Endpoints: `/search`, `/suggestions`, `/did-you-mean`, `/recommendations`.

## Soft Delete

- Listings are soft-deleted (`is_deleted=True`), never hard-deleted.

---

_Update this file when a significant architectural or product decision is made._
