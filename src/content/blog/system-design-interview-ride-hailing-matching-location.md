---
title: 'System design interview: design ride-hailing: matching and location'
description: 'Practice question: live driver location tracking and rider-to-driver matching. Scenario, assumptions, time budget and an outline of a strong answer.'
pubDate: 2026-11-20
tags: [interview prep, system design, geospatial, distributed systems]
draft: false
series: system-design-interview-questions
seriesPart: 8
---

This is practice question 8 of 13 in my system design interview series. Set a 45-minute timer, read only the scenario and the ask, and sketch your own answer on paper before you open the outline at the end. Difficulty: 4.5/5.

## The scenario

"You've joined the marketplace team at a ride-hailing company operating in hundreds of cities. Riders open the app, see nearby cars moving on the map, request a ride, and expect a driver to accept within seconds. Drivers' phones send their GPS location constantly. Today's matching system was built for a few cities and is falling over: riders see ghost cars, two riders sometimes get the same driver, and a busy Friday night in one big city slows matching everywhere."

## The ask

"Design the backend for live driver location tracking and rider-to-driver matching: ingesting driver locations, showing nearby drivers to riders, and dispatching a ride request to the right driver so each driver gets at most one ride at a time. Pricing, payments and maps/routing exist as other services you can call."

## Assumptions for this exercise

These numbers are made up for practice. They are not real company figures.

- About 5 million drivers online at peak worldwide; each sends a GPS update every 4 seconds
- About 50 million rider app sessions per day; riders on the home screen poll or stream nearby cars
- About 20 million ride requests per day, with peaks of about 3x the average in big cities on Friday/Saturday nights and after events
- Matching target: offer sent to a driver within about 1 second (p99) of the request; driver has about 10 seconds to accept
- A driver must never be assigned two rides at once; a rider request must not be silently dropped
- Some cities are very dense (thousands of drivers in a few square km); others are sparse
- Runs in several regions; each city is served mainly from one region; a region can go down

## Time budget

How I would split 45 minutes:

| Stage | Minutes |
|---|---|
| 1. Clarifying requirements (functional + non-functional) | 5 |
| 2. Back-of-envelope estimates (location writes/s, nearby-car reads/s, matches/s, storage) | 5 |
| 3. API (driver location + status, rider request/cancel, driver accept/decline) | 3 |
| 4. Data model (live driver state, geo index, trip state machine) | 5 |
| 5. High-level design (draw it: location ingest path, nearby query path, request → match → offer → accept) | 10 |
| 6. Deep dives (2–3 probed) | 12 |
| 7. Trade-offs | 3 |
| 8. Failure handling and bottlenecks | 2 |

## Deep dives to expect

Expect the interviewer to push on two or three of these:

1. The geo index: a million-plus location updates per second, and "find available drivers within 2 km of this point" in milliseconds. What index do you use, how do you shard it, and what happens at a cell boundary or in a dense downtown?
2. Double dispatch: two riders' requests land on different matcher nodes at the same moment and both pick the same nearest driver. Walk me through how you guarantee one driver, one ride, and what the losing rider sees.
3. The Friday-night city: one city's demand triples while its supply doesn't. How do you keep matching fast there without hurting other cities, and how do you choose which driver gets which request when there are many of each?

## Also be ready for

- A driver goes into a tunnel and stops sending updates mid-offer: how do you detect it and what do you do?
- How fresh does the rider's "nearby cars" map need to be, and is it the same data path as matching?
- Do you store every GPS point? For how long, and why?

## What a strong answer covers

This outline is a synthesis of common practice for this kind of system, not a quote from one source. The numbers in the estimates follow from the assumptions above. Treat it as a checklist to compare your own answer against.

### Requirements

Driver location updates, driver status (offline/available/on-offer/on-trip), nearby-cars view for riders, request/cancel, offer → accept/decline/timeout → re-offer, ETA via routing service, trip state.

**Non-functional:** low-latency matching, high write throughput, freshness over durability for live location, strong consistency for driver assignment, city-level isolation, availability.

### Back-of-envelope estimates

5M / 4 s ≈ 1.25M location writes/s; live state ≈ 5M × ~100 B ≈ 0.5 GB (fits in memory, sharded for throughput not size); 20M rides/day ≈ ~230/s avg, ~700/s peak (matching is low QPS, high-stakes); nearby-car reads can dwarf matches → serve from cache/coarse snapshots; full GPS trail ≈ 1.25M × ~50 B ≈ 5.4 TB/day if stored → async to cold storage/stream, not the hot path.

### API

`PUT /drivers/{id}/location {lat,lng,heading,ts}` (or persistent connection/stream), `PUT /drivers/{id}/status`; `POST /rides {pickup, dropoff, product, idempotency_key}`, `DELETE /rides/{id}`; `POST /offers/{id}/accept|decline`; `GET /nearby?lat&lng` or a push stream; offer pushed to driver via websocket/push.

### Data model

Live driver state in memory (Redis-like) keyed by driver_id with TTL (location, status, version, last_seen, city); geo index: cell id (geohash / S2 / H3-style hex) → set of available driver_ids; ride/trip table (ride_id, rider, driver, state, version) in a durable store; offer record (ride_id, driver_id, expires_at); GPS trail to a log (Kafka) → cold storage.

### High-level design

Driver app → edge/websocket gateway → location service (validates, updates live state + moves driver between cells) → stream to analytics/trail; rider request → ride service (idempotent create) → matcher for the city/region → query geo index for candidate cells (ring/k-ring expansion) → filter available → rank by ETA from routing service → atomically reserve driver → push offer → accept commits trip; timeouts re-offer; nearby-cars served from a separate read path (sampled/coarse, slightly stale OK).

### Deep dives

- Geo index choice (geohash prefix vs quadtree vs hex grid), shard by cell/city, query neighbor cells to fix boundary misses, adaptive cell size / cap candidates in dense areas, update cost when a driver crosses cells.
- Double dispatch: reserve via CAS/conditional write on driver status (available → on_offer with version) or a single-owner matcher per city shard.
- Loser re-matches with next candidate.
- Offer has TTL and releases reservation on timeout/decline.
- Batching: collect requests over a short window (e.g. a second or two) and do global assignment (bipartite matching minimizing total ETA) vs greedy nearest.
- City isolation: per-city/region matcher pools, independent scaling, load shedding, surge/supply levers belong to pricing.

### Trade-offs

- Greedy instant vs batched global optimum (latency vs efficiency).
- In-memory live state (fast, lossy) vs durable.
- Push stream vs polling for driver/rider apps.
- Geo index granularity.
- Strong consistency only on the assignment, eventual for location.
- Shard by geography (hot cities) vs by driver_id (cross-shard geo queries).

### Failures and bottlenecks

- Missing heartbeats → TTL expiry removes driver from index.
- Offer timeout + driver disconnect → release + re-offer.
- Matcher node dies → state rebuilt from live store / request replayed from durable ride record (idempotent).
- Location shard hot (dense city) → split cells / more shards for that city.
- Region failover → city moves to another region, live state rebuilt within seconds from next location updates (drivers resend every 4 s).
- GPS noise/spoofing → snap to road, plausibility checks.
- Ghost cars → TTL and status sync.

### What a strong senior answer shows

A strong answer:

- Quantifies 1.25M writes/s and notes live state is small.
- Separates the high-throughput lossy location path from the low-QPS strongly-consistent assignment path.
- Solves double dispatch with an atomic reservation + offer TTL.
- Explains neighbor-cell queries and dense-area handling.
- Discusses batched matching vs greedy.
- Isolates hot cities.

