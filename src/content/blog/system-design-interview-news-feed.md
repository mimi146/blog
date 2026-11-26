---
title: 'System design interview: design a news feed'
description: 'Practice question: publishing posts, building each user’s home feed and paginating it. Scenario, assumptions, time budget and answer outline.'
pubDate: 2026-11-18
tags: [interview prep, system design, feeds, caching]
draft: false
series: system-design-interview-questions
seriesPart: 6
---

This is practice question 6 of 13 in my system design interview series. Set a 45-minute timer, read only the scenario and the ask, and sketch your own answer on paper before you open the outline at the end. Difficulty: 4/5.

If you want real systems behind some of these ideas, read [TAO, Facebook’s social graph store](/posts/tao-facebooks-social-graph-store/) and [Scaling Memcache at Facebook](/posts/scaling-memcache-at-facebook/) first or afterwards.

## The scenario

"You're on the core feed team at a large social platform. Users follow other users and some very popular accounts (celebrities, brands, news pages). When a user opens the app, they expect a fresh, personalised home feed of posts from the accounts they follow, loaded instantly, with infinite scroll. Today the feed is built by a slow query at read time and the home screen times out during peak hours."

## The ask

"Design the home news feed: publishing a post, building each user's feed, and serving it with pagination. Ranking can be a pluggable model service you call; I care about the data flow and the system around it, not the ML."

## Assumptions for this exercise

These numbers are made up for practice. They are not real company figures.

- About 500 million daily active users; each opens the feed about 10 times a day
- About 100 million new posts per day (text plus media references; media is stored and served separately)
- Average user follows about 300 accounts; the follow graph is very skewed: a few thousand accounts have more than 10 million followers, the largest about 200 million
- Feed first page (about 20 posts) p99 under 200 ms; a new post should appear in followers' feeds within about 5 seconds for normal accounts
- Users can delete or edit posts, unfollow, block and mute; deleted posts must stop showing quickly
- Users are spread across several regions worldwide

## Time budget

How I would split 45 minutes:

| Stage | Minutes |
|---|---|
| 1. Clarifying requirements (functional + non-functional) | 5 |
| 2. Back-of-envelope estimates (feed reads/s, posts/s, fan-out writes/s, storage) | 5 |
| 3. API (publish, get feed with pagination) | 3 |
| 4. Data model (posts, follow graph, precomputed feeds) | 5 |
| 5. High-level design (draw it: write path, read path, ranking call) | 10 |
| 6. Deep dives (2–3 probed) | 12 |
| 7. Trade-offs | 3 |
| 8. Failure handling and bottlenecks | 2 |

## Deep dives to expect

Expect the interviewer to push on two or three of these:

1. Fan-out: an account with 200 million followers posts. Walk me through fan-out on write vs fan-out on read, what you do for this account vs a normal one, and what it costs.
2. Pagination and freshness: the user scrolls while new posts keep arriving and ranking reorders things. How does your cursor avoid duplicates and gaps between pages?
3. Deletes and privacy: a post is deleted, or a user blocks someone. How do you make sure it disappears from millions of precomputed feeds quickly?

## Also be ready for

- Inactive users: do you precompute feeds for people who haven't opened the app in a month?
- A cache cluster holding feeds loses a node at peak: what does the user see?

## What a strong answer covers

This outline is a synthesis of common practice for this kind of system, not a quote from one source. The numbers in the estimates follow from the assumptions above. Treat it as a checklist to compare your own answer against.

### Requirements

Publish post, home feed (followed accounts), pagination/infinite scroll, ranking vs chronological (ranking pluggable), edits/deletes, block/mute/unfollow;

**Non-functional:** read-heavy, low read latency, eventual consistency acceptable for feed (seconds), but deletes/blocks need fast and reliable propagation; high availability over strict consistency.

### Back-of-envelope estimates

500M × 10 = 5B feed reads/day ≈ 58K/s avg, peak ~2–3× ≈ 150K/s; 100M posts/day ≈ 1.2K/s avg; naive fan-out on write ≈ 100M × avg followers (if ~300 avg) ≈ 30B feed inserts/day ≈ 350K/s, dominated by celebrities — a 200M-follower post alone is 200M writes; precomputed feed storage: store only post IDs (~8–16 bytes + score) × top N (~500–1000) per active user → hundreds of bytes to ~16 KB per user, ~TBs total, fits in a sharded cache.

### API

`POST /posts {content, media_refs, idempotency_key}`; `GET /feed?cursor=&limit=20` returns posts + next_cursor; delete/edit endpoints; follow/unfollow/block.

### Data model

Posts table sharded by post_id (or author_id) with Snowflake-style time-ordered IDs; follow graph (follower → followee and reverse index, sharded by user); precomputed feed per user as a capped list of (post_id, author_id, score/ts) in Redis/wide-column; hydration via post cache; tombstones for deletes.

### High-level design

Publish → post store → event log (Kafka) → fan-out workers read follower lists in batches → write post IDs into followers' feed caches; read path: feed service merges precomputed list + pulls recent posts from followed celebrities (fan-out on read) → filters (blocks, mutes, deletes) → ranking service → hydrate posts/authors from caches → return page with cursor.

### Deep dives

- Hybrid fan-out with a follower-count threshold (push for normal accounts, pull for celebrities, merge at read time).
- Skip fan-out to inactive users and rebuild their feed lazily on next open.
- Cursor design — opaque cursor carrying last seen (score, post_id) or a snapshot/session id for ranked feeds so pages are stable, dedupe by post_id.
- Deletes — tombstone/deny-list checked at read time (cheap filter on hydration) plus async cleanup of feed lists, rather than relying on fan-out of deletes.
- Block/mute applied as read-time filters.

### Trade-offs

- Push (fast reads, write amplification, wasted work for inactive users) vs pull (cheap writes, slow fan-in reads) vs hybrid.
- Storing IDs vs full posts in feed (memory vs extra hydration hop).
- Freshness vs stable pagination.
- Ranking quality vs latency budget (timeout → fall back to chronological).

### Failures and bottlenecks

- Fan-out worker lag → feeds stale but correct, monitor consumer lag, prioritise normal-account fan-out.
- Feed cache node loss → rebuild on read from follow graph + recent posts (pull fallback), with replicas to avoid thundering herd.
- Ranking service timeout → chronological fallback.
- Hot celebrity post read storm → post cache replication/local caching.
- Idempotent fan-out (retries must not duplicate entries).
- Multi-region: feed caches per region, posts replicated async.

### What a strong senior answer shows

A strong answer:

- Does the fan-out math and uses it to justify a hybrid with a threshold.
- Skips inactive users.
- IDs-only feeds plus hydration.
- Deletes/blocks enforced at read time, not trusted to fan-out.
- Concrete cursor design.
- Graceful degradation when ranking or cache fails.

