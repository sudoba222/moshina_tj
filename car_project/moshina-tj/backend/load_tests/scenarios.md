# TAJCAR.TJ Load Test Scenarios

All scenarios target `http://localhost:8000` (or `https://api.tajcar.tj` for production).
Run against a database pre-seeded with 10,000 listings (`python seed_data.py`).

---

## Scenario A — Ramp Test (baseline)

**Purpose:** establish realistic throughput and latency under a gradual load increase.
Identifies the point at which the system starts degrading.

**Command:**
```bash
locust -f locustfile.py \
  --host=http://localhost:8000 \
  --users=1000 \
  --spawn-rate=17 \
  --run-time=7m \
  --headless \
  --html=reports/ramp_test.html
```

**What happens:**
- 0 to 1,000 users over ~60 seconds (spawn-rate 17/s)
- Holds at 1,000 users for 5 minutes
- Ramps down automatically when `--run-time` expires

**Traffic mix at peak (1,000 users):**
| Class            | Users | Primary actions |
|------------------|-------|-----------------|
| AnonymousUser    | ~500  | listings, search, detail |
| AuthenticatedUser| ~350  | login, favorites, post listing |
| AdminUser        | ~50   | moderation queue, admin stats |
| ChatUser         | ~100  | send/read messages |

**Pass criteria:**
- p95 response time < 500 ms across all endpoints
- p99 response time < 1,500 ms
- Error rate < 1% (excluding expected 401/429/403 responses)
- Throughput > 800 req/s sustained

**What to watch in logs:**
- `WARN slow query` lines from SQLAlchemy (query > 100 ms)
- Connection pool exhaustion: `TimeoutError: QueuePool limit reached`
- Redis connection errors: `redis.exceptions.ConnectionError`
- Gunicorn worker restart messages

---

## Scenario B — Spike Test (connection pool stress)

**Purpose:** simulate a traffic spike (viral post, news feature) where 1,000 users
arrive almost simultaneously. This exposes connection pool limits, thread starvation,
and slow-startup overhead.

**Command:**
```bash
locust -f locustfile.py \
  --host=http://localhost:8000 \
  --users=1000 \
  --spawn-rate=500 \
  --run-time=4m \
  --headless \
  --html=reports/spike_test.html
```

**What happens:**
- Spawns all 1,000 users within ~2 seconds (spawn-rate 500/s)
- Holds for ~3.5 minutes then terminates

**Pass criteria:**
- Error rate < 5% in the first 30 seconds (initial burst)
- Error rate < 1% after 60 seconds (system stabilises)
- No complete service outages (health endpoint stays 200)
- p95 < 2,000 ms during spike, recovers to < 500 ms within 90 seconds

**What to watch:**
- PostgreSQL `max_connections` hit: `FATAL: remaining connection slots reserved`
- Gunicorn worker timeout (default 30 s): `[CRITICAL] WORKER TIMEOUT`
- Redis pub/sub dropped messages in WebSocket logs
- `pool_size` + `max_overflow` in `database.py` — current settings: 10+20 per worker.
  With 4 Gunicorn workers that is up to 120 DB connections. Postgres default `max_connections=100` will be hit.
  Fix: reduce pool_size to 5+10 per worker, or raise `max_connections` in postgresql.conf.

---

## Scenario C — Soak Test (memory leak detection)

**Purpose:** run a moderate but sustained load for 30 minutes to surface memory leaks,
connection leaks, and slow query degradation over time.

**Command:**
```bash
locust -f locustfile.py \
  --host=http://localhost:8000 \
  --users=200 \
  --spawn-rate=10 \
  --run-time=30m \
  --headless \
  --html=reports/soak_test.html
```

**What happens:**
- Ramps to 200 users over 20 seconds
- Holds at 200 users for the full 30 minutes
- Low enough to avoid saturating the server, high enough to accumulate leaks

**Pass criteria:**
- p95 latency does not increase by more than 50% between minute 5 and minute 25
- RSS memory of each Gunicorn worker does not grow by more than 50 MB over the run
- No worker restarts
- Error rate stays below 0.5% throughout

**What to watch:**
- Memory: `watch -n 10 'ps aux | grep gunicorn'` or use Prometheus `process_resident_memory_bytes`
- Connection count: `SELECT count(*) FROM pg_stat_activity;` — should stay stable
- Redis memory: `redis-cli info memory | grep used_memory_human`
- SQLAlchemy pool overflow events in logs

---

## Scenario D — Search Stress Test

**Purpose:** stress the search subsystem specifically — tsvector, trigram similarity, and
ILIKE fallback — which are the most CPU-intensive queries in the codebase.

**Command:**
```bash
locust -f locustfile.py \
  --host=http://localhost:8000 \
  --users=500 \
  --spawn-rate=25 \
  --run-time=5m \
  --headless \
  --html=reports/search_stress.html \
  --tags search
```

> Note: to isolate only the search tasks, temporarily set the `@task` weight of
> non-search tasks in `AnonymousUser` to 0, or create a dedicated `SearchOnlyUser`
> class that only calls `/api/v1/search`, `/api/v1/search/suggestions`, and
> `/api/v1/search/did-you-mean`.

**Simplified dedicated class (add to locustfile.py for this scenario):**
```python
class SearchStressUser(HttpUser):
    weight = 1
    wait_time = between(0.5, 2)

    TERMS = ["Toyota", "Nexia", "Camry", "BMW", "Honda",
             "Dushanbe", "Khujand", "sedan", "2022", "Matiz",
             "Toyata", "Handa", "Byumers"]   # includes typos for did-you-mean

    @task(5)
    def search_main(self):
        self.client.get("/api/v1/search",
                        params={"q": random.choice(self.TERMS), "limit": 20},
                        name="/api/v1/search")

    @task(3)
    def search_suggestions(self):
        self.client.get("/api/v1/search/suggestions",
                        params={"q": random.choice(self.TERMS)[:3]},
                        name="/api/v1/search/suggestions")

    @task(2)
    def did_you_mean(self):
        self.client.get("/api/v1/search/did-you-mean",
                        params={"q": random.choice(["Toyata", "Handa", "Mercdes"])},
                        name="/api/v1/search/did-you-mean")
```

**Pass criteria:**
- p95 < 300 ms for `/search` (tsvector index should handle this)
- p95 < 500 ms for `/search/suggestions` (trigram union query is heavier)
- Error rate < 1%
- PostgreSQL CPU usage < 80% sustained (check `pg_stat_activity`)

**What to watch:**
- `pg_trgm` GIN index utilisation: run `EXPLAIN ANALYZE` on a representative query
- Sequential scan warnings in `pg_stat_statements`
- `search_vector` tsvector column: if not materialised as a generated column, it is
  recomputed on every query — consider adding a `tsvector` generated column with a
  GIN index if p95 > 300 ms under this scenario
- Redis popular/trending cache hit rate: low hit rate means these endpoints are
  hammering the DB more than expected

---

## General Notes

### Checking error rate in the Locust UI
The Locust web UI groups requests by `name=` parameter.  Requests marked
`.success()` even on non-200 responses (deliberate in auth flows) will not
inflate the error rate.  Only genuine failures appear in the Failures tab.

### Expected non-error HTTP status codes
These are marked as `.success()` intentionally in the locustfile:
- `401` — token expired mid-session; the user class will re-login
- `403` — seed users have no admin role; AdminUser falls back gracefully
- `404` — listing deleted between ID fetch and detail request
- `429` — rate limit on create listing (10/hour per user is intentional)

### Connection pool sizing guidance
With 4 Gunicorn workers and `pool_size=10, max_overflow=20`:
- Max DB connections = 4 × (10 + 20) = 120
- Default PostgreSQL `max_connections = 100` will be exceeded
- Fix for Scenario B: either set `max_connections = 200` in postgresql.conf,
  or add PgBouncer in transaction pooling mode, or reduce pool_size to `5+5` per worker

### Redis dependency
All caching endpoints fall back gracefully if Redis is unavailable (see
`app/redis_client.py`).  Under load, a missing Redis forces every featured/stats/
catalog request to query the DB — expect 2–3× higher DB CPU without Redis.
Start Redis before running any scenario: `redis-server` or via Docker.
