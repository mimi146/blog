---
title: 'System design interview: design search autocomplete (type-ahead)'
description: 'Practice question: type-ahead suggestions that feel instant on every keystroke. Scenario, assumptions, time budget and an outline of a strong answer.'
pubDate: 2026-11-15
tags: [interview prep, system design, search]
draft: false
series: system-design-interview-questions
seriesPart: 4
---

This is practice question 4 of 13 in my system design interview series. Set a 45-minute timer, read only the scenario and the ask, and sketch your own answer on paper before you open the outline at the end. Difficulty: 3.5/5.

## The scenario

"You're on the search team at a large consumer platform (think a global marketplace with a search bar on every page). Today the search box has no suggestions; product wants type-ahead: as the user types, show the top suggestions for that prefix. Suggestions should reflect what people are actually searching, including things that start trending today, and must never surface offensive or blocked terms."

## The ask

"Design the backend for search autocomplete (type-ahead suggestions). Given a prefix the user has typed so far, return the top 10 suggested queries, fast enough that it feels instant on every keystroke, for users across many countries and languages."

## Assumptions for this exercise

These numbers are made up for practice. They are not real company figures.

- About 500 million daily active users, around 10 searches per user per day
- Users type about 4 keystrokes per search on average before picking a suggestion or submitting, and each keystroke can trigger a request (before any client-side debouncing)
- Latency target: p99 under 100 ms end to end for a suggestion request, so the server-side budget is much smaller
- Around 1 billion distinct queries seen per month, with a long tail; suggestions must be at least 1 to 3 characters in before showing (your call)
- New trending queries should appear in suggestions within about 15 minutes; the rest can update daily
- Multiple languages and regions; suggestions can differ by country

## Time budget

How I would split 45 minutes:

| Stage | Minutes |
|---|---|
| 1. Clarifying requirements (functional + non-functional) | 5 |
| 2. Back-of-envelope estimates (QPS, peak, storage for the index) | 4 |
| 3. API (suggest, plus how queries get logged) | 3 |
| 4. Data model (suggestion index, query counts) | 4 |
| 5. High-level design (draw it: serving path and data collection/build path) | 10 |
| 6. Deep dives (2–3 probed) | 12 |
| 7. Trade-offs | 4 |
| 8. Failure handling and bottlenecks | 3 |

## Deep dives to expect

Expect the interviewer to push on two or three of these:

1. Show me the data structure that answers "top 10 for this prefix" in a few milliseconds. What exactly is stored at each node, how big does it get, and how do you shard it?
2. A query starts trending right now (breaking news). Walk me through how it goes from users typing it to appearing in suggestions within 15 minutes, without rebuilding everything.
3. Your suggestion servers are getting hammered on short prefixes like "a" and "s". How do you cut that load, on the client, at the edge, and on the server?

## Also be ready for

- Removing an offensive or legally blocked suggestion everywhere within minutes
- Personalization (recent searches of this user) and per-country suggestions without blowing up the index size

## What a strong answer covers

This outline is a synthesis of common practice for this kind of system, not a quote from one source. The numbers in the estimates follow from the assumptions above. Treat it as a checklist to compare your own answer against.

### Requirements

Top-K by popularity (plus freshness), prefix match only vs fuzzy/typo tolerance, min prefix length, per-country/language, blocklist filtering, personalization (recent searches) optional, no need for strong consistency.

**Non-functional:** very low latency, high availability, read-heavy, eventual freshness (15 min trending, daily otherwise).

### Back-of-envelope estimates

500M × 10 × 4 ≈ 20B requests/day ≈ ~230K/s avg, ~2–3× peak ≈ 500K–700K/s before debouncing/caching; index: don't keep all 1B queries, keep top N (e.g. tens of millions) after frequency threshold; trie with top-10 cached per node: nodes × (10 × pointer/ID) — candidate should estimate rough GBs and conclude it fits in memory per shard/replica; query log ingest ≈ 5B searches/day ≈ ~60K/s writes into the logging pipeline.

### API

`GET /suggest?q=<prefix>&lang=&country=&limit=10` → list of {text, score?}; query logging happens asynchronously from the search submit (not via the suggest endpoint), sampled events to Kafka; cache headers for CDN/browser.

### Data model

Query-count table (query, country, lang, time bucket, count) in a batch store/data lake; serving index = trie (or FST / prefix → top-K hash map) where each node stores precomputed top-K query IDs with scores; blocklist table; optional per-user recent searches store (KV).

### High-level design

Serving: client (debounce ~100–200 ms, local cache of prefix results, prefetch) → CDN/edge cache for short popular prefixes → API → suggestion service with in-memory trie shards/replicas → merge. Build path: search logs → Kafka → stream aggregator (windowed counts for trending) + batch job (daily aggregation with time decay) → trie builder → versioned snapshot in object store → servers load + atomic swap; blocklist filter at build and at serve time.

### Deep dives

- Precomputed top-K at each node vs DFS at query time (latency vs memory/update cost).
- Sharding by prefix range (hot ranges like "s", uneven) vs by hash of first chars vs full replication if index fits in memory (often the best answer: replicate whole index, shard only by country).
- Trending: streaming counts in sliding windows, a small "delta/trending" index merged with the base index at serve time instead of rebuilding the trie, decay scoring.
- Hot short prefixes: precompute and cache 1–2 char prefixes at edge with short TTL, client cache, debouncing, request cancellation.

### Trade-offs

- Freshness vs build cost.
- Memory vs latency (top-K per node).
- Personalization vs cacheability (merge personal results client-side or in a separate call so global results stay cacheable).
- Replication vs sharding.
- Exactness of counts vs approximate (count-min sketch / heavy hitters).

### Failures and bottlenecks

- Bad snapshot → validate before swap, keep previous version, roll back.
- Build pipeline down → serve stale index (fine).
- Trending stream down → fall back to base index.
- Server restart → cold load time of index from object store (keep warm replicas).
- Blocked term emergency → serve-time filter list pushed via config, plus CDN purge.
- Spammers gaming suggestions → per-user/IP dedupe of counts, thresholds.

### What a strong senior answer shows

A strong answer:

- Separates serving path from data pipeline, quantifies QPS and shows the index fits in memory, precomputes top-K per prefix, handles trending with a delta index + merge instead of full rebuilds, and reduces short-prefix load with client debounce + edge caching.
- Handles blocklist at serve time for fast removal.

