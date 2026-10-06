/**
 * Interruptible spring in Apple's terms: damping ratio (1 = no overshoot) and response (seconds).
 * Retargeting keeps the current velocity, so a grabbed or reversed motion never jumps.
 */
export interface SpringOptions {
  damping?: number;
  response?: number;
}

export interface Spring {
  readonly value: number;
  /** Jump to a value (e.g. while dragging 1:1) and stop any motion. */
  set(value: number): void;
  /** Animate to target from the live value, optionally handing off a gesture velocity in units/s. */
  to(target: number, opts?: SpringOptions & { velocity?: number; onRest?: () => void }): void;
  stop(): void;
}

export function createSpring(initial: number, onUpdate: (value: number) => void): Spring {
  let value = initial;
  let velocity = 0;
  let frame = 0;

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  return {
    get value() {
      return value;
    },
    set(v) {
      stop();
      value = v;
      velocity = 0;
      onUpdate(v);
    },
    stop,
    to(target, { damping = 1, response = 0.35, velocity: v, onRest } = {}) {
      stop();
      if (v !== undefined) velocity = v;
      const k = (2 * Math.PI / response) ** 2;
      const c = (4 * Math.PI * damping) / response;
      let last = performance.now();
      const step = (now: number) => {
        // Fixed 1 ms substeps keep stiff springs stable on slow frames.
        const dt = Math.min(now - last, 64);
        last = now;
        for (let i = 0; i < dt; i++) {
          velocity += (-k * (value - target) - c * velocity) * 0.001;
          value += velocity * 0.001;
        }
        if (Math.abs(value - target) < 0.5 && Math.abs(velocity) < 5) {
          value = target;
          velocity = 0;
          frame = 0;
          onUpdate(value);
          onRest?.();
          return;
        }
        onUpdate(value);
        frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    },
  };
}

/** Where a flick comes to rest, using the scroll-view deceleration curve. */
export function project(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Progressive resistance past a boundary instead of a hard stop. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export const prefersReducedMotion = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
