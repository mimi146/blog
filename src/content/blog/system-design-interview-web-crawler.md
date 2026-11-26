---
title: 'System design interview: design a web crawler at scale'
description: 'Practice question: a distributed crawler with politeness, deduplication, traps and recrawl. Scenario, assumptions, time budget and an outline of a strong answer.'
pubDate: 2026-11-24
tags: [interview prep, system design, crawling, distributed systems]
draft: false
series: system-design-interview-questions
seriesPart: 12
---

This is practice question 12 of 13 in my system design interview series. Set a 45-minute timer, read only the scenario and the ask, and sketch your own answer on paper before you open the outline at the end. Difficulty: 4.5/5.

## The scenario

"You've joined the search infrastructure team. Today the crawler is a handful of scripts on a few big machines that read a seed list, fetch pages, and dump HTML into object storage. It can't keep up: important news pages show up in the index hours late, some small sites have complained that we hammered them, and a lot of storage goes to near-identical copies of the same pages and to infinite calendar and session-ID URLs."

## The ask

"Design a distributed web crawler that discovers and fetches pages across the public web, keeps the important pages fresh, stays polite to every site, and hands clean, deduplicated page content to the indexing team. Parsing for ranking and the search index itself are owned by other teams; treat them as consumers of your output."

## Assumptions for this exercise

These numbers are made up for practice. They are not real company figures.

- About 5 billion pages fetched per month, across tens of millions of hosts
- Average page about 100 KB of HTML before compression
- A small set of high-value pages (news front pages, popular sites) should be re-crawled within minutes to an hour; the long tail can wait weeks
- Every site's robots.txt must be honored, and no host should get more than a polite rate (assume about 1 request per second per host unless robots.txt or the owner says otherwise)
- Only HTML for now; JavaScript rendering is a stretch goal you can discuss
- Content that is the same or nearly the same as a page we already have should not be stored again
- The crawler should keep running through machine failures and resume without re-fetching everything

## Time budget

How I would split 45 minutes:

| Stage | Minutes |
|---|---|
| 1. Clarifying requirements (functional + non-functional) | 5 |
| 2. Back-of-envelope estimates (fetch QPS, bandwidth, storage per month, URL frontier size) | 5 |
| 3. API / interfaces (seed submission, output to indexer, recrawl hints, site-owner controls) | 4 |
| 4. Data model (URL frontier, URL-seen set, host metadata, page store, content fingerprints) | 5 |
| 5. High-level design (draw it: frontier → fetchers → parser/link extractor → dedupe → storage → indexer) | 10 |
| 6. Deep dives (2–3 probed) | 12 |
| 7. Trade-offs | 2 |
| 8. Failure handling and bottlenecks | 2 |

## Deep dives to expect

Expect the interviewer to push on two or three of these:

1. The URL frontier: how do you decide what to fetch next so that important pages stay fresh, while never sending more than the polite rate to any one host, across hundreds of fetcher machines?
2. Deduplication: how do you avoid re-crawling URLs you've already seen at billions-of-URLs scale, and how do you detect pages whose content is the same or nearly the same under different URLs?
3. Traps and failure: how does the crawler avoid infinite URL spaces and spider traps, and what happens when a fetcher machine dies with thousands of URLs in flight?

## Also be ready for

- How many fetcher machines do you need, and what limits each one: CPU, network, DNS, or open connections?
- How would you decide how often to re-crawl a given page?
- A site owner emails: "your crawler took our site down last night." What in your design stops that, and how do you find out it happened?

## What a strong answer covers

This outline is a synthesis of common practice for this kind of system, not a quote from one source. The numbers in the estimates follow from the assumptions above. Treat it as a checklist to compare your own answer against.

### Requirements

Scope (HTML only, follow links, recrawl), politeness (robots.txt, crawl-delay, per-host rate, owner opt-out), freshness tiers, dedupe (URL and content), trap avoidance, output contract to indexer.

**Non-functional:** horizontal scale, fault tolerance / resumability, extensibility (new content types, JS rendering), politeness over throughput.

### Back-of-envelope estimates

5B/month ≈ ~1,900 pages/s avg, plan ~2–3× peak ≈ 5K/s; bandwidth ≈ 2K × 100 KB ≈ 200 MB/s ≈ 1.6 Gbps avg; storage ≈ 5B × 100 KB = 500 TB/month raw, ~5× less compressed (~100 TB), less after dedupe; URL-seen set: tens of billions of URLs × ~8-byte fingerprint ≈ hundreds of GB (or Bloom filter ~10 bits/URL); per-host politeness means concurrency comes from host count, not per-host speed; DNS lookups can bottleneck → local caching resolver.

### API and interfaces

Seed/recrawl submission (url, priority, hint); output event to indexer (url, canonical url, fetch time, status, content hash, storage pointer, outlinks); site-owner controls (opt-out, rate override); admin to pause host/domain.

### Data model

Frontier queues (priority/front queues + per-host back queues, Mercator style) persisted (Kafka/durable queues or DB-backed); URL-seen store (normalized URL fingerprint → last crawl, next due, change rate, status); host table (robots.txt cache with TTL, crawl delay, next allowed fetch time, error rate, IP); page store (object store keyed by content hash, WARC-like); content fingerprints (exact hash + SimHash/MinHash for near-dup).

### High-level design

Seeds + scheduler → URL frontier (prioritizer → front queues by priority; router → back queues by host; heap of next-allowed time per host) → fetcher workers (async I/O, DNS cache, robots check, timeouts, size limits) → content store + parser/link extractor → URL normalizer + filters (trap rules, robots) → URL-seen check → back to frontier; content dedupe → emit to indexer via Kafka; recrawl scheduler computes next due from change history.

### Deep dives

- Frontier partitioned by host hash so a single node owns a host's politeness (avoids distributed rate-limit coordination).
- Priority = importance (PageRank-like/links/traffic) × staleness.
- Adaptive recrawl intervals from observed change rate (back off when unchanged, tighten when changing), conditional GET (ETag/If-Modified-Since), sitemaps/RSS/push hints (e.g. IndexNow-style) for fresh content. Dedupe: URL normalization (lowercase host, strip fragments, sort/strip tracking params, canonical tag), fingerprint store sharded / Bloom filter (accept false positives = some missed pages, discuss).
- Content exact-hash + SimHash with Hamming distance threshold for near-dups, banded lookup tables. Traps: max depth per host, max URLs per host/budget, URL length and repeated path segment limits, param explosion detection, per-host page budget tied to host importance, low-yield detection (many new URLs, few new contents).

### Trade-offs

- BFS vs priority-driven.
- Bloom filter memory vs false positives.
- Centralized vs host-partitioned frontier.
- Freshness vs politeness/bandwidth.
- Storing raw HTML vs only extracted text.
- JS rendering cost (headless browser pool, ~10–100× costlier) vs coverage.

### Failures and bottlenecks

- Fetcher dies → URLs leased with visibility timeout / checkpointed offsets, re-queued.
- At-least-once fetch is fine (idempotent by URL + dedupe).
- Frontier node dies → its partitions reassigned from durable log.
- Slow/hanging hosts → timeouts, per-host concurrency 1, circuit break host on errors/429/503 and back off.
- DNS failures.
- Robots.txt fetch failure → conservative (treat as disallow temporarily or use cached).
- Hot domain with many subdomains sharing one IP → rate-limit per IP too.
- Monitoring per-host request rates and error spikes, alerting on politeness violations, owner contact page in User-Agent.

### What a strong senior answer shows

A strong answer does the fetch-rate/bandwidth/storage math, explains Mercator-style front/back queues or host-partitioned scheduling to enforce politeness without global locks, sizes the URL-seen set and picks Bloom vs exact with a reason, uses SimHash-style near-dup detection, has concrete trap defenses, and makes recovery idempotent via leases + dedupe.

