import { useSyncExternalStore } from 'react';

// Tracks how many retryUntilSuccess() calls below are currently unresolved,
// across every sync-to-Supabase effect in the app. A save that's still
// mid-retry when the tab closes (or the connection drops) never reaches
// Supabase — no delete ever happens, the change just silently never existed
// server-side. This lets the UI show a "saving" indicator and warn before an
// unload that would abandon one of those pending writes.
let pendingCount = 0;
const listeners = new Set<() => void>();

function setPending(count: number) {
  pendingCount = count;
  listeners.forEach(l => l());
}

export function getSyncPendingCount() {
  return pendingCount;
}

function subscribeSyncPending(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSyncPending() {
  return useSyncExternalStore(subscribeSyncPending, () => getSyncPendingCount() > 0);
}

// Retries an async operation with exponential backoff until it succeeds or is
// cancelled, instead of giving up silently after one failed attempt — a
// single failed save (or account data load) must never look to the user like
// their data just vanished.
export function retryUntilSuccess(fn: () => Promise<void>): () => void {
  let cancelled = false;
  // Guards against double-counting: markPending() runs on every attempt
  // (including retries), but a call to retryUntilSuccess() should only ever
  // occupy one slot in pendingCount until it finishes or is cancelled.
  let counted = false;

  const markPending = () => {
    if (!counted) {
      counted = true;
      setPending(pendingCount + 1);
    }
  };
  const markDone = () => {
    if (counted) {
      counted = false;
      setPending(pendingCount - 1);
    }
  };

  const attempt = (n: number) => {
    markPending();
    fn().then(markDone).catch(err => {
      if (cancelled) {
        markDone();
        return;
      }
      console.error(`Attempt ${n + 1} failed, retrying:`, err);
      const delay = Math.min(2000 * 2 ** n, 30000);
      setTimeout(() => {
        if (!cancelled) attempt(n + 1);
        else markDone();
      }, delay);
    });
  };

  attempt(0);
  return () => {
    cancelled = true;
    markDone();
  };
}
