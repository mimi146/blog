---
title: 'System design interview: design ad click aggregation'
description: 'Practice question: exactly-once click counting, event-time windows and late data for dashboards and billing. Scenario, time budget and answer outline.'
pubDate: 2026-11-25
tags: [interview prep, system design, stream processing, analytics]
draft: false
series: system-design-interview-questions
seriesPart: 13
---

This is practice question 13 of 13 in my system design interview series. Set a 45-minute timer, read only the scenario and the ask, and sketch your own answer on paper before you open the outline at the end. Difficulty: 5/5.

If you want real systems behind some of these ideas, read [Idempotency keys](/posts/idempotency-keys-safe-retries/) first or afterwards.

## The scenario

"You've joined the ads platform team. Today, ad clicks land in log files, and a nightly batch job counts them per ad and per advertiser. Advertisers see yesterday's numbers at best, the budget system keeps spending money on campaigns that ran out of budget hours ago, and finance has found that the dashboard totals and the billing totals don't match for some advertisers. Bot click fraud is also being billed."

## The ask

"Design a system that ingests ad click events and produces near-real-time aggregated counts (clicks per ad per minute, and roll-ups per campaign and advertiser) for advertiser dashboards and for budget pacing, while also producing exact, auditable numbers that billing can charge from. Ad serving and the fraud model are owned by other teams; you consume their signals."

## Assumptions for this exercise

These numbers are made up for practice. They are not real company figures.

- About 1 billion ad clicks per day, with peaks around 5× the average
- About 2 million active ads, but traffic is very skewed: a few thousand ads get most clicks
- Each raw click event is about 500 bytes (click ID, ad ID, user/device, timestamp, IP, country, etc.)
- Dashboards and budget pacing should reflect a click within about 1 minute
- Billing numbers must be exact: no click charged twice, no valid click lost
- Events can arrive late (mobile clients offline) by up to about 1 hour, and some arrive duplicated
- Advertisers query by time range (last hour up to last 90 days) and by filters such as country and device
- Raw events must be kept for 1 year for audits and disputes

## Time budget

How I would split 45 minutes:

| Stage | Minutes |
|---|---|
| 1. Clarifying requirements (functional + non-functional) | 5 |
| 2. Back-of-envelope estimates (ingest QPS avg/peak, bandwidth, raw storage per year, aggregate storage) | 5 |
| 3. API (click ingestion, dashboard query, budget/pacing feed) | 4 |
| 4. Data model (raw events, per-minute aggregates, roll-ups, dedupe state) | 5 |
| 5. High-level design (draw it: click → ingest → stream → aggregation → stores → query + billing) | 10 |
| 6. Deep dives (2–3 probed) | 12 |
| 7. Trade-offs | 2 |
| 8. Failure handling and bottlenecks | 2 |

## Deep dives to expect

Expect the interviewer to push on two or three of these:

1. Correctness: how do you guarantee each click is counted exactly once across ingestion retries, stream-processor restarts, and writes to the aggregate store? What is your actual delivery guarantee end to end, and where does dedupe happen?
2. Time: event time vs processing time. How do you window clicks, handle events that arrive an hour late, and decide when a minute's count is "final"?
3. Hot ads and reconciliation: a viral ad gets a huge share of all clicks. How do you keep that from overloading one partition? And how do the fast streaming numbers and the exact billing numbers get reconciled when they disagree?

## Also be ready for

- Where does fraud/bot filtering fit, and what happens to counts already shown when the fraud team flags clicks an hour later?
- Why not just put every raw click in an OLAP database and run GROUP BY on each dashboard request?
- How do you replay a day of data after you find a bug in the aggregation code?

## What a strong answer covers

This outline is a synthesis of common practice for this kind of system, not a quote from one source. The numbers in the estimates follow from the assumptions above. Treat it as a checklist to compare your own answer against.

### Requirements

Clicks per ad per minute + roll-ups (campaign, advertiser), filters (country, device), top-N ads optional; two consumers with different needs (dashboard/pacing: fast, approximate OK; billing: exact, auditable); late events up to 1 h; dedupe; fraud filtering; retention 1 year raw.

**Non-functional:** ~1 min freshness, high availability for ingest (never drop), correctness for billing, horizontal scale.

### Back-of-envelope estimates

1B/day ≈ ~11.6K/s avg, ~58K/s peak; 1B × 500 B ≈ 500 GB/day raw ≈ ~180 TB/year before compression/replication; per-minute aggregates: active ads per minute × filter dimensions (cardinality explosion if every combination stored) → argues for limited dims or pre-aggregating only common ones, OLAP for ad-hoc.

### API

Click redirect/beacon `GET /click?ad_id&click_id&...` → 302 to landing page, log async (don't block the redirect); `GET /ads/{id}/aggregates?from&to&granularity&filters`; pacing feed as a stream/pub-sub of spend per campaign; batch billing export.

### Data model

Raw event log (Kafka → object store, partitioned by date/hour, Parquet); aggregate table keyed (ad_id, minute_bucket[, dims]) → count, maybe in Cassandra/Bigtable/Druid/Pinot/ClickHouse; roll-up tables (hour/day); dedupe state keyed by click_id with TTL ≥ lateness window; watermark/finalization metadata.

### High-level design

Click servers → Kafka (raw topic, partitioned by ad_id or click_id) → stream processor (Flink-style) with dedupe, fraud filter join, event-time tumbling windows, watermarks, allowed lateness → aggregate topic → OLAP/serving store → query service + cache; raw topic also archived to data lake; batch job (daily/hourly) recomputes exact counts from raw for billing (Lambda) or replays the same streaming code (Kappa); reconciliation job diffs stream vs batch.

### Deep dives

- Exactly-once = at-least-once delivery + idempotency: unique click_id generated at serve time, dedupe in keyed state.
- Kafka transactions / Flink checkpoints with two-phase-commit sinks, or idempotent upserts of (ad_id, window) → count (overwrite, not increment) so replays are safe.
- Be honest that end-to-end exactly-once is "effectively once". Time: event-time windows, watermark (e.g. max event time − bounded delay), allowed lateness 1 h → updated (retracted/upserted) window results.
- Late-beyond-limit to side output → batch correction.
- "final" only after watermark passes + lateness. Hot ads: partitioning by ad_id makes hot partitions → key salting (ad_id#shard) with a second-stage merge, or local pre-aggregation (combiner) before shuffle.
- Reconciliation: batch over raw is the source of truth for billing.
- Streaming is for dashboards/pacing.
- Diff and alert, correct served aggregates.

### Trade-offs

- Lambda (two codepaths, drift) vs Kappa (one codepath, replay cost).
- Freshness vs finality.
- Pre-aggregation vs OLAP query-time aggregation (storage/flexibility vs latency).
- Exact dedupe state vs Bloom (billing needs exact).
- Upsert vs increment sinks.

### Failures and bottlenecks

- Processor crash → restore from checkpoint, replay Kafka offsets, idempotent sink.
- Kafka retention must exceed recovery window.
- Click server failure → local disk buffer then ship.
- Aggregate store down → stream backs up in Kafka (buffer), dashboards stale but ingest safe.
- Fraud flags later → retraction events adjust counts and billing (credits).
- Bug fix → replay from raw lake to new tables, then swap.
- Budget pacing slightly behind → overspend tolerance, conservative throttling near budget.

### What a strong senior answer shows

A strong answer:

- Separates fast-approximate from exact-billing paths with a reconciliation story.
- Generates click_id at the source and makes sinks idempotent.
- Explains watermarks and allowed lateness concretely.
- Fixes hot keys with salting/two-stage aggregation.
- Does the QPS/storage math.
- Plans replay for bugs.

