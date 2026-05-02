# TAJCAR.TJ Load Test Suite

Tests the API against 1,000 concurrent users with 10,000 listings in the database.

---

## Prerequisites

- Python 3.11+ with the backend venv active (`source backend/venv/bin/activate`)
- PostgreSQL running with the app database reachable via `DATABASE_URL`
- Redis running (optional but strongly recommended — without it every cached endpoint hits the DB)
- The app NOT running in production mode (seeds write directly to the DB)

---

## 1. Install Locust

```bash
pip install locust
```

Locust is not listed in `requirements.txt` because it is a dev/ops tool, not a runtime dependency.

---

## 2. Seed the database

```bash
cd backend/load_tests
python seed_data.py
```

This creates:
- 50 test users with phones `+992000000000` through `+992000000049`, password `loadtest123`
- 10,000 listings spread across those users with realistic Tajikistan car data
- ~2,000 listings set to `status=active, is_active=True` (20%) so catalog actually returns results
- ~8,000 listings set to `status=pending` (moderation queue)

The script is idempotent — running it twice skips already-seeded rows.

Progress is printed every 1,000 rows:
```
[seed] Creating 50 load-test users...
[seed] 50 users ready
[seed] Creating 10000 listings...
[seed]   1000/10000 listings created...
...
[seed] Done. Summary:
[seed]   Total seeded listings : 10,000
[seed]   Active (visible)      : 2,000 (20%)
[seed]   Pending (queue)       : 8,000
```

---

## 3. Start the API server

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or with Gunicorn for a production-like test:
```bash
gunicorn app.main:app -c gunicorn.conf.py
```

---

## 4. Run the load test

### Web UI (recommended for first runs)

```bash
cd backend/load_tests
locust -f locustfile.py --host=http://localhost:8000
```

Open `http://localhost:8089`, set:
- **Number of users:** 1000
- **Spawn rate:** 17 (ramps to 1000 in ~60 seconds)
- Click **Start swarming**

### Headless (CI / automated)

```bash
locust -f locustfile.py \
  --host=http://localhost:8000 \
  --users=1000 \
  --spawn-rate=17 \
  --run-time=7m \
  --headless \
  --html=reports/results.html
```

The HTML report is written to `reports/results.html` (create the `reports/` directory first).

---

## 5. Local vs. production testing note

The API enforces **per-IP rate limits** (e.g. 120 req/min on `GET /listings`).
When running Locust locally, all 1,000 virtual users share the IP `127.0.0.1`, so
the per-IP limit is hit almost immediately for high-traffic endpoints.

**What this means:**
- 429 responses are marked as **success** in the locustfile (not errors) — they
  don't inflate the error rate but they do reduce throughput.
- Local results underestimate real-world capacity because production traffic comes
  from thousands of different IPs.
- To test true throughput locally, either temporarily increase `@limiter.limit` for
  testing or run against a staging server where traffic originates from multiple IPs.

---

## 7. Target metrics (pass criteria)

| Metric | Target |
|--------|--------|
| p95 response time | < 500 ms |
| p99 response time | < 1,500 ms |
| Error rate | < 1% |
| Sustained throughput | > 800 req/s at 1,000 users |

---

## 8. Scenarios

See `scenarios.md` for four named test scenarios:

| Scenario | Users | Duration | Purpose |
|----------|-------|----------|---------|
| A — Ramp | 1,000 | 7 min | Baseline throughput |
| B — Spike | 1,000 | 4 min | Connection pool stress |
| C — Soak | 200 | 30 min | Memory leak detection |
| D — Search stress | 500 | 5 min | Search subsystem isolation |

---

## 9. Clean up seeded data

```bash
python seed_data.py --cleanup
```

This deletes all listings and users created by the seed script, identified by the
`[loadtest_seed_v1]` tag in listing descriptions and the `+9920000000XX` phone format.
