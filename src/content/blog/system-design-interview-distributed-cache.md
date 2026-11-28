---
title: 'System design interview: design a distributed cache'
description: 'Practice question: a distributed in-memory cache in front of databases. Scenario, assumptions, time budget and an outline of what a strong answer covers.'
pubDate: 2026-11-13
tags: [interview prep, system design, caching]
draft: false
series: system-design-interview-questions
seriesPart: 2
---

This is practice question 2 of 13 in my system design interview series. Set a 45-minute timer, read only the scenario and the ask, and sketch your own answer on paper before you open the outline at the end. Difficulty: 2.5/5.

If you want real systems behind some of these ideas, read [Scaling Memcache at Facebook](/posts/scaling-memcache-at-facebook/) and [TAO, Facebook’s social graph store](/posts/tao-facebooks-social-graph-store/) first or afterwards.

## The scenario

"You're on the core infrastructure team at a large consumer social app. Product services (profiles, posts, counters, sessions) read from a sharded relational database that is struggling: read load keeps growing, p99 latency spikes during traffic peaks, and a cache-node restart last month briefly sent so much traffic to the database that it fell over. Every team runs its own ad-hoc cache today. We want one shared, multi-tenant distributed cache service."

## The ask

"Design a distributed in-memory cache that application services use in front of their databases. It should support get/set/delete with TTLs, scale horizontally, and survive node failures without taking the database down with it."

## Assumptions for this exercise

These numbers are made up for practice. They are not real company figures.

- About 10 million cache reads per second and 500,000 writes/invalidations per second at peak, across 2 regions
- About 30 TB of hot data in total; values average about 1 KB, some up to 1 MB
- Read hit latency target: under 1 ms p50, under 5 ms p99 from the client
- Target hit rate around 95%+; the database can safely take only about 5% of read traffic
- Most data can be briefly stale (seconds), but a few use cases (e.g. a user editing their own profile) expect to read their own writes

## Time budget

How I would split 45 minutes:

| Stage | Minutes |
|---|---|
| 1. Clarifying requirements (functional + non-functional) | 5 |
| 2. Back-of-envelope estimates (nodes, memory, bandwidth) | 4 |
| 3. API (client library ↔ cache, admin) | 3 |
| 4. Data model (keys, values, metadata, eviction state) | 4 |
| 5. High-level design (draw it) | 10 |
| 6. Deep dives (2–3 probed) | 12 |
| 7. Trade-offs | 4 |
| 8. Failure handling and bottlenecks | 3 |

## Deep dives to expect

Expect the interviewer to push on two or three of these:

1. How do you spread keys across nodes, and what happens to the hit rate when you add or remove a node?
2. How does the cache stay consistent with the database on writes? Walk me through the race where a stale value ends up in the cache for a long time.
3. One celebrity's profile key gets a huge share of all reads, and separately a popular key expires and thousands of requests miss at once. What happens and how do you protect the database?

## Also be ready for

- What happens when a cache node dies, and when a whole cache cluster restarts cold?
- How do two regions share (or not share) cached data, and how do invalidations travel?

## What a strong answer covers

This outline is a synthesis of common practice for this kind of system, not a quote from one source. The numbers in the estimates follow from the assumptions above. Treat it as a checklist to compare your own answer against.

### Requirements

Cache-aside vs read-through/write-through; TTLs; eviction policy (LRU/LFU); multi-tenancy and per-tenant quotas; value size limits; consistency expectations (eventual + read-your-writes for some flows); availability over consistency; persistence not required.

### Back-of-envelope estimates

30 TB / ~64–100 GB usable RAM per node → roughly 300–500 nodes before replication; 10M reads/s × 1 KB ≈ 10 GB/s egress; per-node QPS check (~20–50K/s/node at 500 nodes) is comfortable; replication factor multiplies memory.

### API

`get(key)`, `mget(keys)`, `set(key, value, ttl)`, `delete(key)`, maybe `cas`/lease tokens; namespaced keys per tenant; admin for quotas/stats.

### Data model

Key → value + TTL/expiry + version/CAS token + size; hash table + LRU list (or segmented LRU / slab allocation for memory fragmentation).

### High-level design

App → client library (routing, pooling, retries) or a proxy layer (e.g. mcrouter/twemproxy style) → sharded cache nodes; config/membership service (ZooKeeper/etcd) holding the ring; DB as source of truth; invalidation pipeline (e.g. from DB commit log / CDC) to delete keys.

### Deep dives

- Consistent hashing with virtual nodes (only ~1/N keys move vs modulo rehash).
- Delete-on-write rather than set-on-write.
- Stale-set race (reader fetches old value, writer updates DB + deletes, reader sets stale) → leases/CAS or versioned sets, short TTL as safety net.
- Thundering herd/cache stampede → request coalescing, leases, probabilistic early expiration, jittered TTLs.
- Hot keys → client-side local cache, key replication to multiple shards, read replicas.

### Trade-offs

- Client library vs proxy (latency vs operability).
- Replication vs memory cost.
- Write-through vs cache-aside.
- TTL length staleness vs hit rate.
- LRU vs LFU.

### Failures and bottlenecks

- Node failure → route to replica or temporarily to a "gutter" pool rather than rehashing everything onto neighbors.
- Cold cluster → warm up from a peer/replica, gradual traffic ramp.
- DB protection via rate limiting / load shedding on misses.
- Cross-region invalidations via replicated delete stream (markers) to avoid stale reads.
- Network partitions.
- Memory fragmentation.

### What a strong senior answer shows

A strong answer names the stale-set race and fixes it (leases/versions), quantifies node count, handles both stampede and hot key distinctly, and has an explicit cold-start / DB-protection plan.

