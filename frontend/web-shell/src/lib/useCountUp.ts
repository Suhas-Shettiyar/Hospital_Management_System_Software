import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 to `target` over `durationMs`, using
 * requestAnimationFrame (no dependency). Purely cosmetic - safe to call
 * with a target of 0 (renders 0 immediately, no animation needed).
 */
export function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    startRef.current = null;
    let frame: number;

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease-out cubic: fast start, gentle settle - matches the theme's
      // "gentle overshoot" motion feel without an actual overshoot on a
      // plain number counter.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
