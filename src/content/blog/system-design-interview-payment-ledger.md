---
title: 'System design interview: design a payment ledger'
description: 'Practice question: a double-entry ledger for wallets, sellers, fees and processors. Idempotency, hot accounts and reconciliation. Scenario and answer outline.'
pubDate: 2026-11-21
tags: [interview prep, system design, payments, consistency]
draft: false
series: system-design-interview-questions
seriesPart: 9
---

This is practice question 9 of 13 in my system design interview series. Set a 45-minute timer, read only the scenario and the ask, and sketch your own answer on paper before you open the outline at the end. Difficulty: 5/5.

If you want real systems behind some of these ideas, read [Idempotency keys](/posts/idempotency-keys-safe-retries/) and [Spanner](/posts/spanner-truetime-external-consistency/) first or afterwards.

## The scenario

"You've joined the payments platform team at a company that runs a marketplace and a digital wallet. Buyers pay, sellers get paid out, users top up and spend wallet balances, and the company takes a fee on every transaction. Money movement today is tracked with a `balance` column that services update directly. Finance can't reconcile at month end, a retry storm last quarter charged some customers twice, and nobody can explain how one seller's balance went negative."

## The ask

"Design the ledger: the system of record for every money movement across buyers, sellers, wallets, fees and the external payment processors we use. It must answer 'what is this account's balance right now', 'what was it at the end of last month', and 'why'. Card networks, bank payout rails and fraud checks are external services you call; focus on the ledger and how payments flow through it."

## Assumptions for this exercise

These numbers are made up for practice. They are not real company figures.

- About 50 million accounts (user wallets, seller balances, internal fee, clearing and suspense accounts)
- About 20 million payment operations per day; each operation writes several ledger entries; peak about 5x average during sales events
- A small number of internal accounts (for example the platform fee account) are touched by almost every transaction
- Callers retry on timeouts; external processors send webhooks that can arrive late, twice, or out of order
- Balance reads: wallet balance checks before every spend, plus heavy reporting and finance queries
- Money must never be created or lost; a wallet must not be spent below zero; history must be auditable for years
- Multiple currencies; runs in more than one region

## Time budget

How I would split 45 minutes:

| Stage | Minutes |
|---|---|
| 1. Clarifying requirements (functional + non-functional) | 5 |
| 2. Back-of-envelope estimates (entries/s, storage per year, balance reads/s) | 4 |
| 3. API (post a transaction, read balance, read history/statement) | 4 |
| 4. Data model (accounts, transactions, entries, balances) | 7 |
| 5. High-level design (draw it: payment request → processor → ledger → payout, plus reconciliation) | 10 |
| 6. Deep dives (2–3 probed) | 11 |
| 7. Trade-offs | 2 |
| 8. Failure handling and bottlenecks | 2 |

## Deep dives to expect

Expect the interviewer to push on two or three of these:

1. Correctness: a client times out and retries a $100 wallet payment, and the processor's success webhook arrives twice. Walk me through exactly how the ledger ends up with one payment, not two, and how you prove no money was created or lost.
2. Balances under contention: two spends hit the same wallet at the same moment with only enough money for one, and every transaction also credits the single platform fee account. How do you keep the wallet from going negative and stop the fee account from becoming a bottleneck?
3. Truth vs the outside world: our ledger says a payout succeeded, the bank's settlement file says it didn't, and a processor webhook is stuck in "pending" for two days. How do you detect, represent and fix these mismatches, and what do you never do to a posted entry?

## Also be ready for

- How do you answer "balance as of Oct 31, 23:59 IST" quickly for 50 million accounts?
- Where do currency conversion and fees live in your entries?
- If one region goes down mid-transaction, what state is the money in?

## What a strong answer covers

This outline is a synthesis of common practice for this kind of system, not a quote from one source. The numbers in the estimates follow from the assumptions above. Treat it as a checklist to compare your own answer against.

### Requirements

Double-entry (every transaction's debits = credits per currency); append-only, immutable entries (corrections via reversing entries); idempotent posting; balance reads (current, available vs pending/held, point-in-time); statements/history; holds/authorizations then capture/void; refunds, chargebacks, payouts, fees; multi-currency; audit trail and retention for years.

**Non-functional:** correctness and durability over availability for writes (CP for money), strong consistency for spendable balance, low latency for wallet checks, scale, exact decimal/integer minor units (never floats).

### Back-of-envelope estimates

20M ops/day ≈ ~230/s avg, ~1.2K/s peak; × ~3–5 entries ≈ ~1K entries/s avg, ~5–6K/s peak (modest write QPS, the hard part is correctness and hot accounts); ~100M entries/day × ~200 B ≈ ~20 GB/day ≈ ~7 TB/year before indexes/replication; balance reads much higher than writes → cache/derived balances.

### API

`POST /transactions {idempotency_key, type, entries:[{account_id, direction, amount_minor, currency}], external_ref, metadata}` → transaction_id (same result on retry, 409 on key reuse with different body); `POST /holds`, capture/release; `GET /accounts/{id}/balance?as_of=`; `GET /accounts/{id}/entries?cursor=`.

### Data model

Accounts (id, type, currency, owner, normal balance side, allow_negative flag); transactions (id, idempotency_key UNIQUE, type, status, external_ref, created_at, effective_at); entries (id, txn_id, account_id, direction/signed amount in minor units, currency, sequence/version per account); account_balances (account_id, balance, available, version) updated in the same DB transaction, or periodic balance snapshots + sum of later entries; idempotency table; outbox for events.

### High-level design

Payment service (orchestrator / state machine: created → authorized → captured → settled, refunds) → calls processor with its own idempotency key → posts ledger transactions; ledger service on a strongly consistent store (sharded relational DB / Spanner-like), single ACID transaction writes entries + balance updates + idempotency record; outbox/CDC → event stream → read models (statements, analytics, finance warehouse); webhook ingestor dedupes by processor event id and drives the state machine; reconciliation jobs compare ledger vs processor/bank settlement files; payout service.

### Deep dives

- Idempotency: unique idempotency key in the same DB txn as the entries (insert-or-return-existing), separate key per external call, webhook dedupe by event id, state machine makes duplicate/out-of-order events no-ops.
- Invariant checks: sum of all entries per currency = 0, per-txn balance check enforced at write, continuous/periodic trial balance.
- Contention: conditional update `UPDATE balance SET available = available - x WHERE id=? AND available >= x` or row lock / optimistic version on the wallet.
- Holds reserve funds.
- Hot fee/clearing account: split into N sub-accounts (sharded counters) summed for reads, or don't update its balance row synchronously — append entries and compute its balance asynchronously since it can't be overdrawn.
- Cross-shard txn (buyer and seller on different shards): co-locate by design where possible, else 2PC / Spanner-style transactions, or post through a clearing account with saga steps that each balance.
- Reconciliation: three-way match (ledger, processor, bank), mismatches into a suspense account + exception queue, fix with new adjusting/reversing entries, never update or delete posted entries.
- Pending states with timeouts and status polling for stuck webhooks.

### Trade-offs

- Stored running balance (fast reads, write contention) vs computed from entries (no contention, slow) vs snapshots + delta.
- Synchronous strong consistency for spend vs async for reporting/fee accounts.
- 2PC vs saga with compensating entries.
- Single global ledger DB vs sharded by account.
- Event-sourced ledger vs relational.

### Failures and bottlenecks

- Crash between processor call and ledger write → durable payment intent first, retry with same processor idempotency key, reconcile.
- Outbox ensures events after commit.
- DB failover must not lose committed entries (synchronous replication / quorum).
- Region outage → writes for a shard pause or fail over to a consistent replica rather than accept split-brain writes (choose CP).
- Hot account shard.
- Reconciliation lag.
- Poison webhooks → DLQ.
- Point-in-time balance via daily snapshots + entries since.

### What a strong senior answer shows

A strong answer:

- Insists on double-entry, immutability and integer minor units unprompted.
- Puts the idempotency record in the same transaction as the entries.
- Prevents overdraft with an atomic conditional update or holds.
- Recognizes the hot fee account and splits or asyncs it.
- Explains reconciliation with suspense accounts and correcting entries.
- Explicitly chooses consistency over availability for money writes.

