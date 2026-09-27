import { useEffect } from 'react';

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/** Runs `task` once the page is idle (or after `timeoutMs` at the latest). */
export function useIdle(task: () => void, enabled = true, timeoutMs = 1500): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const w = window as IdleWindow;
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(task, { timeout: timeoutMs });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = setTimeout(task, Math.min(timeoutMs, 700));
    return () => clearTimeout(t);
    // The task is fire-and-forget; re-running it on every render is not wanted.
  }, [enabled, timeoutMs]);
}
