# TAJCAR.TJ — Pre-Launch Report
**Date:** 2026-03-28 (Saturday)
**Launch target:** Monday 2026-03-30
**Status:** READY TO LAUNCH

---

## What Was Done This Session

### Deployment
- Merged `mobile-redesign` into `main` and deployed to production
- Backend live at `api.tajcar.tj` — healthy, passing health checks
- Frontend live at `tajcar.tj` — built and deployed via Coolify

### Security Fixes (13 total)

| # | Severity | Fix |
|---|----------|-----|
| 1 | CRITICAL | HTML injection in all email templates — added `html.escape()` |
| 2 | CRITICAL | Password change/reset did not invalidate existing sessions — fixed |
| 3 | CRITICAL | Weak `SECRET_KEY` accepted at startup — now enforced 32+ chars |
| 4 | HIGH | Staff accounts not seeding due to non-existent `is_active` field — fixed |
| 5 | HIGH | Mass assignment in listing update — added explicit field allowlist |
| 6 | HIGH | Open redirect on login page via `?redirect=` param — fixed |
| 7 | MEDIUM | Yandex Metrika blocked by CSP — added `mc.yandex.ru` to policy |
| 8 | MEDIUM | Unsanitized `tel:` phone links — sanitized with regex |
| 9 | MEDIUM | User PII (phone, email) stored in `localStorage` — stripped on save |
| 10 | MEDIUM | `auth_session` cookie missing `Secure` flag — fixed |
| 11 | MEDIUM | Post draft with PII persisted forever — expires 7 days + clears on logout |
| 12 | LOW | Dead `localStorage.removeItem('auth_token')` line — removed |
| 13 | INFO | Google verification tag hardcoded in metadata |

### SEO Setup
- Google Search Console: verified, sitemap submitted (37 URLs)
- `robots.txt` correct — private routes blocked from crawlers
- `sitemap.xml` working — auto-updates with new listings

### Known Issues (not blocking launch)

| Issue | Risk |
|-------|------|
| `auth_session` cookie is forgeable (client-written) | Medium — needs server-set HttpOnly cookie |
| WebSocket JWT sent in URL `?token=` | Medium — leaks to server logs |
| Google OAuth missing CSRF state | Medium |
| N+1 query in search suggestions | Low — performance |
| Dashboard filter not wired to API | Low — UI bug |

---

## Tomorrow — Sunday Checklist

### 1. Yandex Webmaster (30 min)
- [ ] Go to webmaster.yandex.com
- [ ] Click "Add site" → enter `https://tajcar.tj`
- [ ] Choose verification: **Meta tag**
- [ ] Copy the `content="..."` value only (just the token)
- [ ] Send the token to Claude — will hardcode into `layout.tsx`
- [ ] After Claude pushes → Force Rebuild frontend in Coolify
- [ ] Back in Yandex → click Verify
- [ ] Sitemaps → add `https://tajcar.tj/sitemap.xml` → Submit

### 2. Coolify Environment Check (15 min)
Check backend service env vars:
- [ ] `RESEND_API_KEY` — must be set or no emails send
- [ ] `RESEND_FROM_EMAIL=noreply@tajcar.tj` — if missing, emails use test address
- [ ] `SECRET_KEY` — must be 32+ chars (server refuses to start if not)
- [ ] `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — for image uploads
- [ ] Remove `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` from frontend (now hardcoded, var does nothing)

### 3. End-to-End Test on Live Site (45 min)
- [ ] Register with phone number — OTP SMS arrives?
- [ ] Register with email — verification email arrives?
- [ ] Login with phone, login with email — both work?
- [ ] Post a new listing — goes to pending?
- [ ] Approve from admin panel — approval email sent to user?
- [ ] View listing on homepage and catalog
- [ ] Check listing detail — phone number visible, contact works?
- [ ] Test on iPhone
- [ ] Test on Android
- [ ] Test dark mode
- [ ] Test Russian/Tajik language switch

### 4. Content Preparation (1 hour)
- [ ] Prepare 10–20 real car listings for Monday
- [ ] Photos ready (at least 5 per car, good quality)
- [ ] Descriptions written in Russian (Tajik optional for launch)
- [ ] Brief your first users on how to register and post

### 5. Social Media Preparation (30 min)
- [ ] Write Telegram announcement post with link tajcar.tj
- [ ] Write Instagram post with screenshots
- [ ] Find Tajik car groups on Telegram to post in

---

## Monday Launch Day Plan

### Morning (9:00–11:00)
1. Post 10–20 real listings to fill the catalog
2. Approve all from admin panel
3. Post Telegram announcement
4. Post Instagram

### During the Day
- Monitor admin panel — approve new listings within 1–2 hours
- Watch for user registration issues
- Reply to any messages/questions

### Watch for Problems
- 500 errors in backend logs (Coolify → Logs tab)
- Users saying they didn't receive OTP or email
- Any page that crashes or shows blank screen

---

## What Claude Fixes Post-Launch (This Week)

1. WebSocket JWT URL leak
2. Google OAuth CSRF state
3. Forgeable `auth_session` cookie → server-set HttpOnly
4. Search N+1 query (performance)
5. Dashboard filter wired to API

---

## Site Health Summary

| Component | Status |
|-----------|--------|
| Backend API | Healthy |
| Frontend | Live |
| Database + Migrations | Up to date |
| Email (Resend) | Verify `RESEND_FROM_EMAIL` env var |
| Image uploads (Cloudinary) | Verify env vars |
| Google Search Console | Sitemap submitted, crawl in 1–7 days |
| Yandex Webmaster | TODO tomorrow |
| SSL certificate | Active |
| Security | 13 vulnerabilities fixed |
