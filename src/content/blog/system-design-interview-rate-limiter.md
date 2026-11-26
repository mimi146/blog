---
title: 'System design interview: design a distributed rate limiter'
description: 'Practice question: a distributed rate limiter for API gateways. Scenario, assumptions, time budget and an outline of what a strong answer covers.'
pubDate: 2026-11-12
tags: [interview prep, system design, rate limiting, api design]
draft: false
series: system-design-interview-questions
seriesPart: 1
---

This is practice question 1 of 13 in my system design interview series. Set a 45-minute timer, read only the scenario and the ask, and sketch your own answer on paper before you open the outline at the end. Difficulty: 2/5 (warm-up).

## The scenario

"You're joining the API platform team at a large public API company. Hundreds of internal services and thousands of external customers call our APIs through a fleet of API gateways in several regions. Last quarter one customer's runaway script caused a partial outage, and a few noisy tenants regularly starve others. We want a rate limiting service that every gateway can use."

## The ask

"Design a distributed rate limiter that gateways call on every request to decide allow or reject. Rules can be per API key, per user, per IP and per endpoint, e.g. '100 requests per second per API key on /payments' or '10,000 requests per day per user'."

## Assumptions for this exercise

These numbers are made up for practice. They are not real company figures.

- About 1 million requests per second at peak across all gateways, in 3 regions
- About 50 million distinct API keys/users, roughly 5 million active in any hour
- The rate-limit check should add under 5 ms at p99 to each request
- Several hundred to a few thousand rules, changed by ops a few times a day

## Time budget

How I would split 45 minutes:

| Stage | Minutes |
|---|---|
| 1. Clarifying requirements (functional + non-functional) | 5 |
| 2. Back-of-envelope estimates (QPS, memory, network) | 4 |
| 3. API (gateway ↔ limiter, rule config) | 3 |
| 4. Data model (rules, counters) | 4 |
| 5. High-level design (draw it) | 10 |
| 6. Deep dives (2–3 probed) | 12 |
| 7. Trade-offs | 4 |
| 8. Failure handling and bottlenecks | 3 |

## Deep dives to expect

Expect the interviewer to push on two or three of these:

1. Which algorithm, and why: what goes wrong at window boundaries, and what does accuracy cost you in memory?
2. Many gateway nodes and multiple regions share one quota. How do counters stay correct (or correct enough) under concurrency, and how much accuracy do you give up for latency?
3. A hot key: one tenant sending a huge share of all traffic. What happens to your counter store?

## Also be ready for

- What does the client see when rejected, and how do they know when to retry?
- What happens if the limiter itself is down or slow?

## What a strong answer covers

This outline is a synthesis of common practice for this kind of system, not a quote from one source. The numbers in the estimates follow from the assumptions above. Treat it as a checklist to compare your own answer against.

### Requirements

Asks about hard vs soft limits, per-key/user/IP/endpoint scopes, global vs per-region quota, fail-open vs fail-closed, client feedback (HTTP 429, Retry-After / rate-limit headers), rule hot reload.

**Non-functional:** low latency, high availability, approximate accuracy acceptable?

### Back-of-envelope estimates

~1M checks/s; counter memory = active keys × rules × bytes per counter (sliding log is much larger than fixed/sliding window counter); notes network round trip budget within 5 ms.

### API

`check(key, rule_id, cost=1) -> {allowed, remaining, reset_at}`; admin CRUD for rules; response headers to client.

### Data model

Rules in a config DB pushed/cached to gateways; counters in an in-memory store (e.g. Redis) keyed by `rule:key:window` with TTL.

### High-level design

Gateway → local rule cache → limiter (sidecar/library vs central service) → sharded counter store; config service pushes rule updates.

### Deep dives

- Token bucket vs leaky bucket vs fixed window (boundary burst up to 2×) vs sliding log (accurate, memory heavy) vs sliding window counter (approximation).
- Atomicity via Lua script / INCR+EXPIRE, avoiding read-modify-write races.
- Local in-memory pre-aggregation and periodic sync for scale, accepting slight overshoot.
- Multi-region: per-region split of quota or async replication of counts.
- Hot keys: local token caching/batching leases, key splitting.

### Trade-offs

- Accuracy vs latency, central vs local, fail-open (availability) vs fail-closed (protection), memory vs precision.

### Failures and bottlenecks

- Counter store down → fail open with local fallback limits.
- Timeouts on limiter calls.
- Shard hot spots.
- Clock skew across nodes for windows.
- Rule misconfiguration safety (staged rollout).

### What a strong senior answer shows

A strong answer quantifies the boundary error and memory cost, picks an algorithm with a reason, explicitly decides fail-open with a local safety net, handles the hot key.

