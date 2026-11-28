---
title: 'System design interview: design a notification system'
description: 'Practice question: a push, email, SMS and in-app notification service with priorities and preferences. Scenario, time budget and answer outline.'
pubDate: 2026-11-14
tags: [interview prep, system design, messaging, queues]
draft: false
series: system-design-interview-questions
seriesPart: 3
---

This is practice question 3 of 13 in my system design interview series. Set a 45-minute timer, read only the scenario and the ask, and sketch your own answer on paper before you open the outline at the end. Difficulty: 3/5.

If you want real systems behind some of these ideas, read [Scaling Slack’s job queue](/posts/scaling-slacks-job-queue/) and [Idempotency keys](/posts/idempotency-keys-safe-retries/) first or afterwards.

## The scenario

"You're joining the platform team at a large e-commerce and social marketplace. Today every product team sends its own push notifications, emails and SMS straight to third-party providers. Users complain about duplicate alerts, getting pinged at 3 AM, and messages they opted out of. Last Black Friday a marketing blast saturated the email provider and delayed password-reset and OTP messages by over an hour. We want one shared notification platform."

## The ask

"Design a notification service that any internal team can call to send a notification to a user (or a large audience) over push (iOS/Android), email, SMS and in-app. It must respect user preferences, never lose critical messages, and keep urgent traffic flowing even when bulk campaigns are running."

## Assumptions for this exercise

These numbers are made up for practice. They are not real company figures.

- About 500 million registered users, 100 million daily active; users average 2 devices
- About 2 billion notifications per day on a normal day; campaign peaks of 50,000+ sends per second for a few hours
- Mix: roughly 70% push, 20% in-app, 8% email, 2% SMS
- Priority classes: critical (OTP, password reset, security alerts: deliver to provider within ~5 seconds), transactional (order shipped: within ~1 minute), marketing (best effort within hours)
- Third-party providers (APNs, FCM, an email provider, an SMS provider) have their own rate limits and occasional outages; SMS costs real money per message

## Time budget

How I would split 45 minutes:

| Stage | Minutes |
|---|---|
| 1. Clarifying requirements (functional + non-functional) | 5 |
| 2. Back-of-envelope estimates (QPS, storage, queue depth) | 4 |
| 3. API (send, bulk/campaign send, preferences, status) | 3 |
| 4. Data model (notifications, templates, preferences, devices, delivery log) | 4 |
| 5. High-level design (draw it) | 10 |
| 6. Deep dives (2–3 probed) | 12 |
| 7. Trade-offs | 4 |
| 8. Failure handling and bottlenecks | 3 |

## Deep dives to expect

Expect the interviewer to push on two or three of these:

1. A bulk marketing campaign to 100 million users starts at the same moment a wave of OTPs needs to go out. Walk me through how your design keeps the OTPs inside their 5-second budget.
2. A worker sends a push to APNs, then crashes before recording success. The message is retried. How do you avoid duplicate notifications, and what delivery guarantee are you actually offering end to end?
3. The SMS provider starts timing out and returning errors for 20 minutes. What happens to queued messages, to the provider, to your cost, and to the user?

## Also be ready for

- Quiet hours and time zones, per-user frequency caps, and opt-outs that must take effect immediately
- How a sending team finds out whether a notification was delivered, opened, or dropped

## What a strong answer covers

This outline is a synthesis of common practice for this kind of system, not a quote from one source. The numbers in the estimates follow from the assumptions above. Treat it as a checklist to compare your own answer against.

### Requirements

Channels (push/email/SMS/in-app), single vs bulk/audience sends, templating + localization, user preferences per channel/category, opt-out/unsubscribe (legal for email/SMS), quiet hours by user time zone, frequency caps, dedupe, delivery status/analytics.

**Non-functional:** priority-based latency SLOs, at-least-once with dedupe ("effectively once" to the user), high availability, horizontal scale, cost control on SMS.

### Back-of-envelope estimates

2B/day ≈ ~23K/s average, peaks 50K+/s; push ≈ 70% of that; delivery log at ~200–500 B/row ≈ 0.4–1 TB/day → TTL/tiered storage; 100M-user campaign at 50K/s ≈ ~33 min just for fan-out, so it must be throttled/spread; device tokens ≈ 1B rows.

### API

`POST /notifications {user_id|audience_id, template_id, params, category, priority, channels?, idempotency_key, send_at?}` → `notification_id`; `POST /campaigns`; `GET /notifications/{id}/status`; preferences CRUD; device token register/unregister.

### Data model

Templates (versioned, per locale); user preferences (user_id, category, channel, enabled, quiet hours, tz); devices (user_id, platform, token, last_seen, valid); notification record + per-channel delivery attempts (status, provider message id, attempts, timestamps); idempotency keys with TTL; frequency counters in Redis.

### High-level design

API → validation + idempotency check → enqueue → orchestrator (preference/opt-out filter, quiet hours, frequency cap, template render, channel selection) → per-channel, per-priority queues (Kafka/SQS topics) → channel workers with provider adapters and per-provider rate limiters → APNs/FCM/email/SMS; status webhooks/receipts → delivery log → analytics; campaign service expands audiences in batches into the pipeline; scheduler for send_at and quiet-hour deferrals; in-app via inbox store + websocket/long-poll.

### Deep dives

- Priority isolation: separate queues/topics and worker pools per priority (not one queue with priority field), reserved provider capacity for critical, campaign throttling/token bucket, backpressure.
- Dedupe: idempotency key at ingest + per (notification_id, device, channel) dedupe record before send, at-least-once delivery means a small duplicate window remains around provider calls (be honest about it), push collapse IDs.
- Provider outage: retries with exponential backoff + jitter, circuit breaker, DLQ, failover to a secondary SMS/email provider, TTL on time-sensitive messages (expire OTP retries after its validity), fallback channel (SMS → email/push for OTP), cost guard/budget caps on SMS, invalid-token cleanup from APNs/FCM feedback.

### Trade-offs

- At-least-once vs at-most-once per category (marketing can drop, OTP must not).
- Fan-out on write vs lazy audience expansion.
- Per-provider rate limiting central vs local.
- Storing full delivery log vs sampled.
- Push vs pull for in-app.

### Failures and bottlenecks

- Queue backlog → autoscale workers, shed marketing first.
- Orchestrator/preference store slow → cache preferences with short TTL, but opt-out must win (invalidate on change).
- Poison messages → DLQ.
- Region failure → multi-region queues.
- Hot user (a user getting thousands of alerts) → frequency cap/digest batching.
- Campaign mistakes → kill switch to cancel in-flight campaign.

### What a strong senior answer shows

A strong answer separates priorities physically, quantifies campaign fan-out time, states the real guarantee (at-least-once + dedupe), designs provider rate limiting/circuit breaking with failover, and handles quiet hours/opt-outs/kill switch as first-class concerns.

