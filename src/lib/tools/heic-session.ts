/** Run async jobs one at a time. A rejection does not block the jobs behind it. */
export function createSerialQueue() {
  let tail: Promise<void> = Promise.resolve();
  return function enqueue<T>(work: () => Promise<T>): Promise<T> {
    const run = tail.then(work, work);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}

/**
 * Cache a load promise. A rejection clears the cache so the next call can try again.
 */
export function loadOnce<T>(cache: { current: Promise<T> | null }, load: () => Promise<T>): Promise<T> {
  if (cache.current) return cache.current;
  const pending = load().catch((error: unknown) => {
    if (cache.current === pending) cache.current = null;
    throw error;
  });
  cache.current = pending;
  return pending;
}

/** Ignore a second start until the holder calls releaseLock. */
export function tryAcquire(lock: { held: boolean }): boolean {
  if (lock.held) return false;
  lock.held = true;
  return true;
}

export function releaseLock(lock: { held: boolean }): void {
  lock.held = false;
}
