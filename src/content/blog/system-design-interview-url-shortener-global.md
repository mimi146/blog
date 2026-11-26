---
title: 'System design interview: design a global URL shortener'
description: 'Practice question: a multi-region URL shortener with fast redirects and near-real-time click analytics. Scenario, time budget and answer outline.'
pubDate: 2026-11-23
tags: [interview prep, system design, caching, distributed systems]
draft: false
series: system-design-interview-questions
seriesPart: 11
---

This is practice question 11 of 13 in my system design interview series. Set a 45-minute timer, read only the scenario and the ask, and sketch your own answer on paper before you open the outline at the end. Difficulty: 4.5/5.

If you want real systems behind some of these ideas, read [Dynamo, Amazon’s key-value store](/posts/dynamo-amazons-highly-available-key-value-store/) and [Scaling Memcache at Facebook](/posts/scaling-memcache-at-facebook/) first or afterwards.

## The scenario

"You've joined the team that runs a public link-shortening service, used both by everyday users and by big marketing customers who put short links in SMS blasts, TV ads and printed QR codes. Today it's a single-region app on one relational database, and an ID counter in that database hands out every short code. Last month a celebrity tweet sent one link viral, the redirect path fell over, and the marketing customers are now asking for real-time click analytics and a contractual uptime promise."

## The ask

"Design the shortening and redirect service so it runs in several regions and redirects stay fast and up even when a region or the database is in trouble. Customers also need click analytics per link (clicks over time, country, device, referrer) that are close to real time. Auth, billing and the web dashboard UI exist already; treat them as services you can call."

## Assumptions for this exercise

These numbers are made up for practice. They are not real company figures.

- About 200 million new short links a month; links never expire unless the owner deletes them
- Reads far outnumber writes: about 100:1 redirects to creates on average
- One viral link can take 1 million+ redirects per minute for a while
- Short codes should be as short as possible and must not be guessable in sequence
- Users can pick a custom alias (for example /diwali-sale), and owners can edit a link's destination or disable it
- Redirect p99 under 50 ms for users close to a region; the redirect path targets 99.99% availability
- Analytics dashboards should be no more than about a minute behind; billing counts clicks, so totals need to be right in the end
- Malicious links (phishing, malware) must be blockable within minutes across all regions

## Time budget

How I would split 45 minutes:

| Stage | Minutes |
|---|---|
| 1. Clarifying requirements (functional + non-functional) | 5 |
| 2. Back-of-envelope estimates (create QPS, redirect QPS, storage over 10 years, code length) | 5 |
| 3. API (create, redirect, update/disable, analytics query) | 4 |
| 4. Data model (links, aliases, click events, aggregates) | 5 |
| 5. High-level design (draw it: client → edge → redirect path; create path; analytics pipeline) | 10 |
| 6. Deep dives (2–3 probed) | 12 |
| 7. Trade-offs | 2 |
| 8. Failure handling and bottlenecks | 2 |

## Deep dives to expect

Expect the interviewer to push on two or three of these:

1. Code generation: how do you hand out unique, short, non-sequential codes across regions without one central counter, and how do custom aliases avoid colliding with them or with each other when two regions get the same alias at the same moment?
2. The redirect path under a viral spike: walk me through a redirect from the user's phone to the destination. Where is it cached, 301 or 302 and why, and what happens when an owner edits or a trust-and-safety team blocks that viral link mid-spike?
3. Click analytics: how do click events get from the redirect path to a dashboard about a minute behind without slowing redirects down, and how do you keep billing totals right when events are duplicated, late, or lost?

## Also be ready for

- How many characters does a code need, and how did you get that number?
- A region loses its database for 20 minutes: which features keep working and which don't?
- Someone scripts millions of link creations to hunt for short codes or spam: what stops them?

## What a strong answer covers

This outline is a synthesis of common practice for this kind of system, not a quote from one source. The numbers in the estimates follow from the assumptions above. Treat it as a checklist to compare your own answer against.

### Requirements

Create (random vs custom alias), redirect, edit destination, disable/delete, optional expiry, per-link analytics, abuse blocking;

**Non-functional:** redirect latency and 99.99% availability prioritized over create path, eventual consistency OK for edits within seconds but blocks must propagate fast, analytics ~1 min freshness with exact eventual totals for billing, codes non-enumerable.

### Back-of-envelope estimates

200M/month ≈ ~77 creates/s avg (peak few hundred); redirects ~7.7K/s avg, viral 1M/min ≈ ~17K/s on one key; 10 years ≈ 24B links; at ~500 B/row ≈ ~12 TB; base62: 62^7 ≈ 3.5T (plenty, 7 chars), 62^6 ≈ 57B (tight at 24B and leaves code space dense/guessable) → picks 7, explains sparseness for non-guessability; click events ≈ redirects ≈ ~20B/month → event storage and aggregation sizing.

### API

`POST /links {long_url, alias?, expires_at?, idempotency_key}` → short code; `GET /{code}` → 301/302 with Location; `PATCH /links/{code}`, `DELETE`; `GET /links/{code}/stats?from&to&granularity&dims`.

### Data model

Links (code PK, long_url, owner_id, created_at, status active/disabled/blocked, expires_at, version); aliases share the same keyspace (custom alias is just a code) with uniqueness enforced; KV store (DynamoDB/Cassandra) partitioned by code; click events (code, ts, region, country, device, referrer, event_id); pre-aggregated rollups (code, minute/hour bucket, dim) in an OLAP store (ClickHouse/Druid/Pinot).

### High-level design

Edge/CDN + regional redirect service with in-process + Redis cache → globally replicated KV; create service with ID allocator; async click event emission to Kafka (local buffer, fire-and-forget off the hot path) → stream processor (Flink) → real-time rollups + raw events to object store → batch recompute for billing; blocklist/config pushed to all regions.

### Deep dives

- Code gen options — counter ranges leased per region/node (ZooKeeper/etcd or DB ticket server) then encoded with a bijective shuffle/Feistel/format-preserving encryption to look random.
- Or random 7-char + conditional insert retry (collision probability low while space sparse).
- Hash of URL + truncation needs collision handling and makes same URL → same code (discuss dedupe as a choice). Custom alias across regions: needs a single linearizable point — conditional write (put-if-absent) in a strongly consistent store / home region for alias namespace, or globally consistent DB (Spanner-style).
- With async multi-master, last-writer-wins would silently give the alias to two owners → must call out. Redirect: 302 (or 307) keeps analytics and editability since browsers cache 301 permanently.
- 301 with cache headers cuts load but loses control.
- CDN caching with short TTL + purge on edit/block.
- Hot key handled by edge cache + in-process cache + request coalescing.
- Negative caching for unknown codes (with short TTL) to resist enumeration load. Blocking: push-based invalidation (pub/sub to all regions + CDN purge API) plus blocklist check that overrides cache.
- Short TTL as safety net. Analytics: async, at-least-once events with event_id dedupe in stream (windowed) → near-real-time approximate dashboards.
- Billing from batch recompute on raw events (lambda/kappa reconciliation), watermarks for late events, bot filtering.

### Trade-offs

- 301 vs 302.
- Random vs counter+obfuscation.
- Strong consistency for aliases vs availability of create path.
- Edge caching TTL vs edit/block freshness.
- Real-time approximate vs batch exact.
- Storing raw events cost vs only aggregates.

### Failures and bottlenecks

- Region DB down → redirects served from cache + replica in other region (reads keep working), creates fail over to another region or degrade (custom alias may be unavailable if its home region is down — honest about it).
- Kafka down → local disk buffer, drop or sample analytics before failing redirects.
- Cache cold after deploy → warm-up/staggered.
- ID range server down → nodes hold pre-leased ranges.
- Abuse: per-account/IP rate limiting, CAPTCHA, URL reputation scan (Safe Browsing-style) async at create, enumeration protection via sparse code space and rate limiting on 404s.

### What a strong senior answer shows

A strong answer:

- Does the 7-char math and ties it to non-guessability.
- Picks 302 with a reason.
- Separates the redirect hot path from analytics completely.
- Names the multi-region alias race and makes alias claims linearizable.
- Has a fast global block/invalidate mechanism that beats caches.
- Reconciles real-time vs billing-accurate counts with dedupe and batch recompute.

