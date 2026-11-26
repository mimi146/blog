---
title: 'System design interview: design a chat and messaging system'
description: 'Practice question: 1:1 and group chat with presence, receipts and offline delivery across devices. Scenario, time budget and answer outline.'
pubDate: 2026-11-16
tags: [interview prep, system design, messaging, distributed systems]
draft: false
series: system-design-interview-questions
seriesPart: 5
---

This is practice question 5 of 13 in my system design interview series. Set a 45-minute timer, read only the scenario and the ask, and sketch your own answer on paper before you open the outline at the end. Difficulty: 4/5.

If you want real systems behind some of these ideas, read [How Discord stores trillions of messages](/posts/how-discord-stores-trillions-of-messages/) and [Scaling Slack’s job queue](/posts/scaling-slacks-job-queue/) first or afterwards.

## The scenario

"You've joined the team building a new messaging app inside a large consumer platform. Users chat one-to-one and in small groups, on phones and on the web, often on several devices at once and often on flaky mobile networks. Product's promise is simple: a message you send is never lost, shows up in the same order for everyone in the conversation, and shows sent / delivered / read ticks."

## The ask

"Design the backend for this chat system: 1:1 and group messaging, online presence, delivery and read receipts, and offline delivery with push notifications, across multiple devices per user."

## Assumptions for this exercise

These numbers are made up for practice. They are not real company figures.

- About 200 million daily active users; at peak, about 50 million connected at the same time
- About 40 messages sent per DAU per day; average text message about 200 bytes (media is uploaded separately; you only handle a reference)
- Groups up to 500 members; most conversations are 1:1 or under 10 people
- Users average 2 devices (phone + web/desktop); every device must get the full history
- Message history kept forever and searchable by scrolling back (no full-text search needed today)
- Latency target: p99 under 300 ms from send to delivery when both users are online in the same region
- Users are spread across several regions worldwide

## Time budget

How I would split 45 minutes:

| Stage | Minutes |
|---|---|
| 1. Clarifying requirements (functional + non-functional) | 5 |
| 2. Back-of-envelope estimates (msg/s, peak, connections, storage) | 4 |
| 3. API (client ↔ server protocol, not just REST) | 4 |
| 4. Data model (messages, conversations, per-device sync state) | 5 |
| 5. High-level design (draw it: connection layer, send path, offline path) | 10 |
| 6. Deep dives (2–3 probed) | 12 |
| 7. Trade-offs | 3 |
| 8. Failure handling and bottlenecks | 2 |

## Deep dives to expect

Expect the interviewer to push on two or three of these:

1. Ordering and "never lost": the sender's phone goes into a tunnel mid-send and retries three times. How do you guarantee exactly one copy appears, in a consistent order for every member and every device?
2. Connections: 50 million long-lived connections. How does a message for user B find the gateway server B's devices are connected to, and what happens when that server dies?
3. Group fan-out: someone posts in a 500-member group where half the members are offline. Walk me through fan-out on write vs on read, and how each device catches up when it reconnects.

## Also be ready for

- Presence ("online" / "last seen") without melting the system with heartbeats
- A user in Asia messaging a user in Europe: where does the conversation live?

## What a strong answer covers

This outline is a synthesis of common practice for this kind of system, not a quote from one source. The numbers in the estimates follow from the assumptions above. Treat it as a checklist to compare your own answer against.

### Requirements

1:1 + group, multi-device sync, sent/delivered/read receipts, presence/last seen, offline push, history forever, media by reference only, message edit/delete (scope it), E2E encryption (clarify: in or out of scope; if in, server stores ciphertext and fan-out is per device).

**Non-functional:** durability (never lose an acked message), per-conversation ordering (not global), low latency, high availability, eventual consistency for presence/receipts is fine.

### Back-of-envelope estimates

200M × 40 = 8B msgs/day ≈ ~93K/s avg, ~2–3× peak ≈ 200–300K/s sends; deliveries multiply by recipients × devices (group fan-out dominates); 8B × ~200 B ≈ 1.6 TB/day raw text, ~0.6 PB/year before replication + metadata/indexes; 50M concurrent connections / ~50–100K conns per gateway ≈ 500–1,000 gateway servers; heartbeats: 50M / 30 s ≈ 1.7M/s, so presence must not write to a DB per heartbeat.

### API and protocol

Persistent WebSocket (or MQTT-like) per device; `send {client_msg_id, conversation_id, body, ts_client}` → server ack `{client_msg_id, server_msg_id, seq}`; server push `message {conversation_id, seq, ...}`; client acks `delivered/read up_to_seq`; `sync {conversation_id, after_seq}` / per-device inbox cursor; REST for history pagination, conversation/group management, media upload URL.

### Data model

Messages partitioned by conversation_id, clustered by seq (wide-column like Cassandra/HBase, or sharded MySQL) — (conversation_id, seq) PK, sender, client_msg_id, body/ciphertext, ts; conversation + membership tables; per-user/per-device inbox or cursor (last delivered/read seq per conversation); receipts as per-member max-seq watermarks, not per-message rows; session/routing registry user_id → [device → gateway_id] in an in-memory store with TTL.

### High-level design

Clients → L4 LB → stateful gateway (connection) servers → chat/message service; session registry (Redis-like) for routing; message service assigns per-conversation seq (single writer per conversation via partition owner, or atomic counter), persists, acks sender, then fans out via a queue (Kafka partitioned by conversation_id) to recipient gateways; offline recipients → push notification service (APNs/FCM) and they sync on reconnect; presence service separate; media service with object store + CDN.

### Deep dives

- Idempotency with client_msg_id (dedupe table / unique constraint per conversation) so retries don't duplicate.
- Ack only after durable write (quorum).
- Ordering via per-conversation monotonically increasing seq assigned by one owner (not wall clocks), clients render by seq and detect gaps → fetch missing.
- Connection routing via registry with TTL/heartbeat refresh, gateway death → clients reconnect with backoff+jitter to another gateway, re-register, sync from last seq — no message loss because storage, not the gateway, is the source of truth.
- Reconnect storms after a gateway/region failure.
- Group fan-out: small groups fan out on write to per-member inbox/notification, large groups store once and fan out a lightweight "new msg seq N" signal, devices pull on read.
- Multi-device: per-device cursors, sending device also syncs to the user's other devices.

### Trade-offs

- Fan-out on write vs read (latency vs write amplification).
- Per-conversation ordering vs global (global is unnecessary and doesn't scale).
- WebSocket vs long polling.
- Strong durability on send path vs latency.
- Presence accuracy vs cost (lazy presence, only to subscribed/visible contacts, debounce flapping).
- Home region per conversation vs multi-master (conflicts on seq).

### Failures and bottlenecks

- Gateway crash, message service partition owner failover (fencing so two owners don't issue the same seq), Kafka lag → recipients still converge via sync, push provider outage, hot conversation (huge group) → throttle/batch, region failure → conversation home-region failover with replicated log, client clock skew ignored by using server seq.

### What a strong senior answer shows

A strong answer:

- client_msg_id idempotency + durable ack before "sent" tick.
- Per-conversation seq with a single owner and gap-fill on clients.
- Stateless-in-spirit gateways backed by a session registry and storage as source of truth.
- Quantifies connections/gateways and heartbeat load.
- Hybrid fan-out by group size.
- Receipts as watermarks.

