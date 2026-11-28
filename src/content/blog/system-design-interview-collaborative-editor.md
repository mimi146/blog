---
title: 'System design interview: design a collaborative document editor'
description: 'Practice question: real-time collaborative rich-text editing, merging concurrent edits. Scenario, assumptions, time budget and an outline of a strong answer.'
pubDate: 2026-11-22
tags: [interview prep, system design, collaboration, distributed systems]
draft: false
series: system-design-interview-questions
seriesPart: 10
---

This is practice question 10 of 13 in my system design interview series. Set a 45-minute timer, read only the scenario and the ask, and sketch your own answer on paper before you open the outline at the end. Difficulty: 5/5.

## The scenario

"You're on the team building a browser-based document editor, like Google Docs. Today a document is saved as a whole blob every few seconds, and when two people edit at once the last save wins, so people lose each other's paragraphs. Product wants real-time co-editing: everyone sees everyone else's typing within a moment, with cursors and presence, offline edits that merge when you reconnect, and full version history."

## The ask

"Design the backend for real-time collaborative editing of rich-text documents. Focus on how concurrent edits get merged so every user ends up with the same document, how edits travel between clients, and how documents are stored and versioned. Auth, sharing permissions and the editor UI itself exist already; treat them as services you can call."

## Assumptions for this exercise

These numbers are made up for practice. They are not real company figures.

- About 100 million documents; about 5 million documents open at peak, most with a single editor
- Typical document under 1 MB of text; a small fraction are very large (hundreds of pages)
- Usually 1 to 5 concurrent editors per document; a few "all-hands" docs get 200+ concurrent editors and thousands of viewers
- An active editor sends small edits (a few keystrokes) several times per second
- Remote edits should appear for other editors in well under a second
- Users can edit offline for hours, then reconnect
- Version history: users can view and restore any earlier named or auto-saved version
- Runs in multiple regions; collaborators on one document can be on different continents

## Time budget

How I would split 45 minutes:

| Stage | Minutes |
|---|---|
| 1. Clarifying requirements (functional + non-functional) | 5 |
| 2. Back-of-envelope estimates (edit ops/s, connections, op-log storage) | 4 |
| 3. API (open doc, send/receive ops, presence, history) | 4 |
| 4. Data model (documents, op log, snapshots, versions) | 6 |
| 5. High-level design (draw it: client → connection layer → document session → storage) | 10 |
| 6. Deep dives (2–3 probed) | 12 |
| 7. Trade-offs | 2 |
| 8. Failure handling and bottlenecks | 2 |

## Deep dives to expect

Expect the interviewer to push on two or three of these:

1. Convergence: Alice deletes the word "very" while Bob, at the same moment, types "!" just after it. Walk me through how your system merges these so both screens end up identical, and why you chose that approach.
2. Routing and state: where does the live state of one document live while 5 people edit it, how does every edit for that document reach the same place, and what happens when that server dies mid-session?
3. Storage and history: the op log for a busy doc grows forever. How do you load a document fast, support "restore version from last Tuesday", and bring an offline user's 3 hours of edits back in?

## Also be ready for

- How do cursors and presence differ from document edits in delivery guarantees?
- The 200-editor all-hands doc: what breaks first, and what do you do?
- Collaborators on two continents: where does the document session run?

## What a strong answer covers

This outline is a synthesis of common practice for this kind of system, not a quote from one source. The numbers in the estimates follow from the assumptions above. Treat it as a checklist to compare your own answer against.

### Requirements

Real-time co-editing, convergence (all replicas identical), intention preservation, cursors/presence, offline edits, version history/restore, comments (maybe out of scope), permissions checked on connect.

**Non-functional:** low edit-propagation latency, no lost edits, durable ack, availability per document, horizontal scale by document.

### Back-of-envelope estimates

5M open docs; assume ~10M connected clients; active editors × several ops/s → order of millions of ops/s at peak, but each doc only sees a handful/s; per-op ~100 B → op log tens–hundreds of GB/day before compaction; connection count drives gateway fleet size (e.g. ~50–100K websockets per node → ~100–200 nodes).

### API

`GET /docs/{id}` → snapshot + revision; websocket `open(doc_id, last_rev)`, client→server `op{doc_id, base_rev, client_id, client_seq, ops}`, server→client `ack{rev}` and `remote_op{rev, ops}`; presence messages (ephemeral); `GET /docs/{id}/versions`, `POST /docs/{id}/restore {version_id}`.

### Data model

Documents (id, owner, current_rev, latest_snapshot_ref); op log (doc_id, rev, client_id, client_seq, op payload, ts) with PK (doc_id, rev) — append-only; snapshots (doc_id, rev, blob in object store); named versions (doc_id, rev, label, author); presence in memory only.

### High-level design

Client (local editor applies ops optimistically, pending queue) → websocket gateway (stateless conn termination, auth) → doc session server owning the doc (routing by consistent hashing / lease in a coordination service like ZooKeeper/etcd) → assigns total order (rev), transforms (OT) or merges (CRDT), persists op to log, broadcasts to subscribers; snapshotter compacts op log into periodic snapshots in object store; history service; pub/sub for viewers fan-out.

### Deep dives

- OT (server-centric, central sequencer, transform against concurrent ops since base_rev, Jupiter/Google Wave-style one-op-in-flight per client) vs CRDT (RGA/Yjs/Automerge-style unique IDs per char, tombstones, commutative merge, no central transform, better for offline/p2p, metadata overhead and GC of tombstones).
- Worked example of insert-after-deleted-range.
- Idempotency via (client_id, client_seq) dedupe so reconnect resends are safe.
- Single-writer per doc via lease with fencing token (epoch) so a stale owner can't write after failover.
- On owner death: new owner loads latest snapshot + replays op log tail, clients reconnect with last_rev and resend unacked ops.
- Offline: client holds ops against base_rev, server transforms against everything since (OT can get expensive for long divergence — CRDT handles better), or rebase.
- History: snapshot every N ops/minutes, restore = new op(s) that set content to old version (don't rewrite log).
- Load = nearest snapshot + tail replay.

### Trade-offs

- OT vs CRDT.
- Centralized per-doc sequencer (simple ordering, single point per doc) vs peer merge.
- Sync durable write before ack (latency) vs ack after in-memory + async log (risk).
- Snapshot frequency vs load time/storage.
- Presence lossy vs edits reliable.
- Session placement near majority of editors vs single home region.

### Failures and bottlenecks

- Doc session node crash → lease expiry + fencing, replay.
- Split-brain without fencing → divergent logs (must call out).
- Gateway crash → client reconnect with backoff + jitter, resume from last_rev.
- Hot doc (200 editors) → op batching/coalescing, throttle presence updates, separate read-only viewer fan-out tier, maybe rate limit.
- Huge doc → chunked/paged loading.
- Op log store hot partition per doc is fine since per-doc rate is low.
- Cross-region latency for far collaborators — accept it, single owner region per doc, maybe migrate session.

### What a strong senior answer shows

A strong answer:

- Picks OT or CRDT with a concrete reason and walks the merge example correctly.
- Makes one server authoritative per doc with lease + fencing.
- Idempotent op resend with client seq.
- Snapshot + op-log compaction for load and history.
- Treats presence as ephemeral.
- Handles offline reconnect and the hot doc explicitly.

