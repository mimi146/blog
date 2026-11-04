import { describe, expect, it } from 'vitest';
import { createSerialQueue, loadOnce, releaseLock, tryAcquire } from '../../src/lib/tools/heic-session';

describe('HEIC session guards', () => {
  it('runs queued jobs one after another', async () => {
    const enqueue = createSerialQueue();
    const order: string[] = [];
    const first = enqueue(async () => {
      order.push('start-1');
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push('end-1');
    });
    const second = enqueue(async () => {
      order.push('start-2');
      order.push('end-2');
    });
    await Promise.all([first, second]);
    expect(order).toEqual(['start-1', 'end-1', 'start-2', 'end-2']);
  });

  it('keeps later jobs going when one rejects', async () => {
    const enqueue = createSerialQueue();
    const first = enqueue(async () => {
      throw new Error('decode failed');
    });
    const second = enqueue(async () => 'ok');
    await expect(first).rejects.toThrow('decode failed');
    await expect(second).resolves.toBe('ok');
  });

  it('clears a failed load so the next call can retry', async () => {
    const cache: { current: Promise<string> | null } = { current: null };
    let calls = 0;
    const load = () =>
      loadOnce(cache, async () => {
        calls += 1;
        if (calls === 1) throw new Error('network');
        return 'decoder';
      });
    await expect(load()).rejects.toThrow('network');
    expect(cache.current).toBeNull();
    await expect(load()).resolves.toBe('decoder');
    await expect(load()).resolves.toBe('decoder');
    expect(calls).toBe(2);
  });

  it('ignores a second acquire until the lock is released', () => {
    const lock = { held: false };
    expect(tryAcquire(lock)).toBe(true);
    expect(tryAcquire(lock)).toBe(false);
    releaseLock(lock);
    expect(tryAcquire(lock)).toBe(true);
  });
});
