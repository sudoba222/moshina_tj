# Preferences

Coding style, tooling, and workflow preferences specific to this project.

---

## Code Style

- **No emojis** anywhere — use SVG icons only.
- **No hardcoded colors** — always use CSS custom properties (`var(--accent)`, `var(--card)`, etc.).
- **No hardcoded strings** — all UI text goes through `lib/i18n.ts` with `{ ru: '...', tj: '...' }` shape.
- **TypeScript strict mode** — no `any` types.
- **Mobile-first** — all components must work at 320px minimum width.

## API Design

- All routes under `/api/v1`.
- Every response: `{"success": bool, "data": ..., "message": ""}`.
- All list endpoints paginated: `{"items": [...], "total": int, "page": int, "pages": int}`.
- Never return `password_hash` in any response.
- No N+1 queries — list endpoints must use `joinedload(Listing.images)`.

## Workflow

- Always run `alembic upgrade head` after pulling new migrations.
- Frontend dev: `npm run dev` on :3000; backend: `uvicorn app.main:app --reload` on :8000.
- Use `npm run type-check` and `npm run lint` before committing frontend changes.

---

_Update this file when new preferences or conventions are established._
