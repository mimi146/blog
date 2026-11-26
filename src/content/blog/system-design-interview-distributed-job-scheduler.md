---
title: 'System design interview: design a distributed job scheduler'
description: 'Practice question: a multi-tenant scheduler for delayed and cron-style jobs that fires on time. Scenario, time budget and an outline of a strong answer.'
pubDate: 2026-11-19
tags: [interview prep, system design, job queues, distributed systems]
draft: false
series: system-design-interview-questions
seriesPart: 7
---

This is practice question 7 of 13 in my system design interview series. Set a 45-minute timer, read only the scenario and the ask, and sketch your own answer on paper before you open the outline at the end. Difficulty: 4.5/5.

If you want real systems behind some of these ideas, read [Scaling Slack’s job queue](/posts/scaling-slacks-job-queue/) and [Raft](/posts/raft-understandable-consensus/) first or afterwards.

## The scenario

"You're on the platform infrastructure team at a large tech company. Hundreds of internal teams need to run work later or on a schedule: send a reminder email at 9:00 AM in the user's time zone, retry a failed payout in 10 minutes, rebuild a search index every night, expire a coupon in 30 days. Today every team runs its own cron box, and when one dies jobs silently don't run, or run twice when someone restarts it."

## The ask

"Design a shared, multi-tenant distributed job scheduler. Teams submit one-off delayed jobs and recurring (cron-style) jobs; your system must trigger each one on time and hand it to the team's worker code to run. You own scheduling, dispatch, retries and visibility, not what the job itself does."

## Assumptions for this exercise

These numbers are made up for practice. They are not real company figures.

- About 2 billion scheduled jobs live at any time (most are one-off delayed jobs; about 50 million are recurring)
- About 50,000 job triggers per second on average, with peaks of about 1 million per second at round times (top of the hour, midnight in big time zones)
- Jobs are scheduled from seconds to about 1 year in the future
- A job should start within about 2 seconds of its scheduled time (p99) under normal load
- Job runs take anywhere from 100 ms to 2 hours; workers belong to tenant teams and can crash mid-run
- Teams expect "a job is never silently lost"; some jobs (payouts) must not have side effects twice
- About 500 tenant teams; one noisy tenant must not delay everyone else
- Runs in several regions; a region can go down

## Time budget

How I would split 45 minutes:

| Stage | Minutes |
|---|---|
| 1. Clarifying requirements (functional + non-functional, delivery semantics) | 5 |
| 2. Back-of-envelope estimates (stored jobs, triggers/s, peak burst, storage) | 5 |
| 3. API (create/cancel/update job, worker poll/ack/heartbeat, status) | 3 |
| 4. Data model (job definitions, the "due" index, run history) | 5 |
| 5. High-level design (draw it: submit path, trigger path, dispatch to workers) | 10 |
| 6. Deep dives (2–3 probed) | 12 |
| 7. Trade-offs | 3 |
| 8. Failure handling and bottlenecks | 2 |

## Deep dives to expect

Expect the interviewer to push on two or three of these:

1. Finding due jobs: with 2 billion jobs stored, how do you find the ones due in the next second without scanning everything, and how do you split that work across many scheduler nodes without two nodes firing the same job?
2. Exactly-once, really? A worker picks up a payout job, crashes halfway, and the job is retried. Walk me through your delivery guarantee end to end and what the tenant has to do.
3. The midnight spike: 1 million jobs come due at 00:00:00 for one huge tenant. How do you keep the 2-second SLO for everyone else?

## Also be ready for

- Recurring jobs: how do you compute and store the next run, and what happens to runs missed while the system was down (fire all, fire one, skip)?
- A user cancels a job 50 ms before it is due: is it guaranteed not to run?
- Daylight saving time: a job is scheduled for 2:30 AM local on the day clocks skip that hour.

## What a strong answer covers

This outline is a synthesis of common practice for this kind of system, not a quote from one source. The numbers in the estimates follow from the assumptions above. Treat it as a checklist to compare your own answer against.

### Requirements

One-off vs recurring (cron + time zone); cancel/update; priorities; per-tenant quotas; delivery semantics stated explicitly (at-least-once dispatch + idempotent execution, not "exactly-once"); timeouts, retries with backoff, dead-letter; run history and visibility;

**Non-functional:** durability (never lose a job), trigger latency p99 ~2 s, high availability, tenant isolation.

### Back-of-envelope estimates

2B jobs × ~1 KB ≈ 2 TB of definitions (plus replication); 50K/s avg, 1M/s peak is a 20× burst, so dispatch must absorb bursts via queues and pre-loading; run history grows fast (50K/s × 86,400 ≈ 4.3B rows/day) so it needs TTL/cold storage.

### API

`createJob(tenant, schedule|run_at, tz, payload, idempotency_key, retry_policy, timeout) -> job_id`; `cancel/update(job_id)`; worker side `poll/lease(queue) -> {run_id, payload, lease_until}`, `heartbeat(run_id)`, `complete/fail(run_id)`; `getRuns(job_id)`.

### Data model

Jobs table sharded by job_id; a due-time index bucketed by time (e.g. per-minute or per-second buckets × shard), i.e. `(bucket_ts, shard) -> job_ids`; job state machine (SCHEDULED → QUEUED → RUNNING → SUCCEEDED/FAILED/DEAD) with a version for CAS; run records keyed by run_id = (job_id, scheduled_time) for dedupe.

### High-level design

Submit API → job store + time-bucket index; scheduler nodes own partitions (leases via ZooKeeper/etcd or consistent hashing) and pre-load the next few minutes of buckets into an in-memory timer wheel / delay queue; at due time push to per-tenant dispatch queues (Kafka/SQS-like); workers pull with visibility-timeout leases; recurring jobs compute next fire time on completion/trigger and insert the next run.

### Deep dives

- Time-bucketed index + partition ownership so no full scans.
- Preventing double fire with partition leases plus fencing tokens and a CAS state transition (SCHEDULED→QUEUED with version).
- Exactly-once is impossible end to end, so it's at-least-once + idempotency key / run_id that the tenant uses for dedupe on side effects (payouts).
- Visibility timeout + heartbeats to detect dead workers.
- Midnight burst: pre-load buckets early, spread with jitter where tenants allow, per-tenant queues and weighted fair dispatch / token-bucket quotas so a big tenant only slows itself.
- Autoscale dispatchers ahead of known peaks.

### Trade-offs

- DB-polling (simple, scan cost) vs in-memory timer wheel (fast, needs reload on failover) vs delay queues.
- Push vs pull to workers.
- Bucket granularity vs precision.
- Missed-run policy (catch up all vs fire once vs skip) as a per-job setting.
- Strong consistency on state transitions vs throughput.

### Failures and bottlenecks

- Scheduler node dies → lease expires, another node takes the partition and reloads its buckets (late but not lost; fencing stops the zombie).
- Worker crash → lease timeout → retry with backoff → DLQ after N.
- Queue backlog → alert on trigger lag.
- Cancel race → cancel is a CAS to CANCELLED, dispatch checks state, and a run already leased may still execute (be honest about it).
- DST: store recurring schedules in local tz + IANA zone, define behaviour for skipped/repeated hours.
- Region loss → job store replicated cross-region, partition ownership moves, accepts some duplicate fires so idempotency matters.

### What a strong senior answer shows

A strong answer:

- Says "at-least-once + idempotency" plainly and explains why.
- Uses time buckets + partition ownership with fencing.
- Quantifies the 20× burst and designs for tenant fairness.
- Handles lease/visibility timeouts and missed-run policy.
- Honest about the cancel race.

