import { useEffect, useRef, useState } from 'react';

/**
 * Plays a timeline: moves the index from where it is to the end in about `durationMs`,
 * then stops. Starting again at the end restarts from the beginning.
 */
export function usePlayback(total: number, index: number | null, setIndex: (i: number | null) => void, durationMs = 12_000) {
  const [playing, setPlaying] = useState(false);
  // The interval owns the playhead once started; it reads where to start from this ref.
  const startAt = useRef(index);
  startAt.current = index;

  useEffect(() => {
    if (!playing) return;
    const stepMs = Math.max(30, durationMs / Math.max(1, total));
    let i = startAt.current ?? -1;
    if (i >= total - 1) i = -1;
    const timer = setInterval(() => {
      i += 1;
      if (i >= total) {
        setPlaying(false);
        return;
      }
      setIndex(i);
    }, stepMs);
    return () => clearInterval(timer);
  }, [playing, total, setIndex, durationMs]);

  return {
    playing,
    toggle: () => setPlaying((p) => !p),
    stop: () => setPlaying(false)
  };
}
