// Retries an async operation with exponential backoff until it succeeds or is
// cancelled, instead of giving up silently after one failed attempt — a
// single failed save (or account data load) must never look to the user like
// their data just vanished.
export function retryUntilSuccess(fn: () => Promise<void>): () => void {
  let cancelled = false;

  const attempt = (n: number) => {
    fn().catch(err => {
      if (cancelled) return;
      console.error(`Attempt ${n + 1} failed, retrying:`, err);
      const delay = Math.min(2000 * 2 ** n, 30000);
      setTimeout(() => {
        if (!cancelled) attempt(n + 1);
      }, delay);
    });
  };

  attempt(0);
  return () => {
    cancelled = true;
  };
}
