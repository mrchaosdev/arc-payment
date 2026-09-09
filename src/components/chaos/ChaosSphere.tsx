"use client";

import { useEffect, useRef, useState } from "react";
import { heartbeat, rampStops, type PulseTone } from "@/lib/visual/pulse";
import { resolveTokenChannels, type RgbChannels } from "@/lib/visual/css-color";

export type ChaosSphereProps = {
  /** Beats per minute. */
  bpm: number;
  /** Contraction depth as a fraction of the radius. */
  amplitude: number;
  tone: PulseTone;
  /**
   * Increment this to fire a single travelling ripple, one per real event. The
   * value itself is ignored; only a change matters.
   */
  impulse?: number;
  /** Raises the resting brightness while work is in flight. */
  busy?: boolean;
  points?: number;
  height?: number;
  /** Pointer drag rotates the sphere and the cursor tilts it. */
  interactive?: boolean;
  /** Colour the whole surface as an LED skin that cycles with the beat. */
  led?: boolean;
  className?: string;
};

const waveTravel = 0.26;
const baseTilt = -0.38;
const driftPerSecond = 0.19;
const rippleSeconds = 1.1;
const dragFriction = 0.94;

/**
 * The dot-matrix sphere, ported from Chaos Market AI. Canvas 2D on purpose: this
 * needs projection and depth fade, not geometry or lighting, so a WebGL runtime
 * would be dead weight.
 *
 * Every visual parameter is supplied by the caller — nothing here decides what
 * the sphere means. In SealPay it is driven by `derivePulse`, so what it shows
 * is the state of a real transfer.
 */
export function ChaosSphere({
  bpm,
  amplitude,
  tone,
  impulse = 0,
  busy = false,
  points = 950,
  height = 300,
  interactive = false,
  led = false,
  className,
}: ChaosSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const impulseRef = useRef({ seen: impulse, firedAt: -Infinity });
  const pointerRef = useRef({ spin: 0, velocity: 0, tilt: 0, targetTilt: 0, dragging: false, lastX: 0 });
  // The palette is resolved from CSS tokens once per run of the render effect.
  // SealPay can switch theme at any moment, so watch the `dark` class and take
  // the rebuild — it happens on a click, not per frame.
  const [themeTick, setThemeTick] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    let last = root.classList.contains("dark");
    const observer = new MutationObserver(() => {
      const next = root.classList.contains("dark");
      if (next !== last) {
        last = next;
        setThemeTick((tick) => tick + 1);
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // The render loop reads this every frame, so a prop change lands without
  // tearing down and restarting the animation. Synced in an effect rather than
  // during render, which would be a ref write in the render phase.
  const live = useRef({ bpm, amplitude, tone, busy });

  useEffect(() => {
    live.current = { bpm, amplitude, tone, busy };
  }, [bpm, amplitude, tone, busy]);

  useEffect(() => {
    if (impulse !== impulseRef.current.seen) {
      impulseRef.current = { seen: impulse, firedAt: performance.now() };
    }
  }, [impulse]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    const host = canvas.parentElement ?? canvas;
    const palette = {
      positive: resolveTokenChannels(host, "--positive"),
      negative: resolveTokenChannels(host, "--negative"),
      neutral: resolveTokenChannels(host, "--text-muted"),
      muted: resolveTokenChannels(host, "--text-muted"),
      accent: resolveTokenChannels(host, "--action"),
      highlight: resolveTokenChannels(host, "--highlight"),
    };

    // Locked to the Happy Hues 13 accents — a warm orange/red/pink cycle, never
    // a rainbow. The ramp differs per tone so colour still carries state.
    const ledRamps: Record<PulseTone, RgbChannels[]> = {
      neutral: [palette.accent, palette.negative, palette.highlight],
      positive: [palette.accent, palette.positive, palette.highlight],
      negative: [palette.negative, palette.highlight],
    };

    const lattice = buildLattice(points);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let viewHeight = 0;
    let frame = 0;
    let visible = true;
    const startedAt = performance.now();

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      viewHeight = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(viewHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const render = (now: number) => {
      const { bpm: liveBpm, amplitude: liveAmplitude, tone: liveTone, busy: liveBusy } = live.current;
      const elapsed = (now - startedAt) / 1000;
      const cycleMs = (60 / Math.max(liveBpm, 1)) * 1000;
      const cyclePhase = reduced ? 0.5 : (elapsed * 1000) / cycleMs;

      const pointer = pointerRef.current;
      if (!reduced && !pointer.dragging) {
        pointer.spin += driftPerSecond / 60 + pointer.velocity;
        pointer.velocity *= dragFriction;
      }
      pointer.tilt += (pointer.targetTilt - pointer.tilt) * 0.08;

      const spin = reduced ? 0.6 : pointer.spin;
      const tilt = baseTilt + pointer.tilt;
      const radius = Math.min(width, viewHeight) * 0.4;
      const centerX = width / 2;
      const centerY = viewHeight / 2;
      const rippleAge = (now - impulseRef.current.firedAt) / 1000 / rippleSeconds;
      const rippleActive = !reduced && rippleAge >= 0 && rippleAge <= 1;
      const toneChannels = palette[liveTone];
      const restingLift = liveBusy && !reduced ? 0.18 : 0;

      context.clearRect(0, 0, width, viewHeight);

      for (const point of lattice) {
        const localPhase = wrap(cyclePhase - point.delay * waveTravel);
        const beat = reduced ? 0 : heartbeat(localPhase);
        // A ripple is a bright band sweeping from the pacemaker to the far side.
        const ripple = rippleActive ? band(rippleAge - point.delay) : 0;
        const swell = 1 + liveAmplitude * beat + 0.05 * ripple;

        const cosSpin = Math.cos(spin);
        const sinSpin = Math.sin(spin);
        const spunX = point.x * cosSpin + point.z * sinSpin;
        const spunZ = -point.x * sinSpin + point.z * cosSpin;
        const tiltedY = point.y * Math.cos(tilt) - spunZ * Math.sin(tilt);
        const tiltedZ = point.y * Math.sin(tilt) + spunZ * Math.cos(tilt);

        const depth = Math.pow((tiltedZ + 1) / 2, 1.6);
        const energy = beat + ripple + restingLift;
        const surface = led ? ledColour(ledRamps[liveTone], localPhase) : toneChannels;
        const channels = mixChannels(
          palette.muted,
          ripple > 0.15 ? palette.accent : surface,
          0.2 + depth * 0.55 + energy * 0.25
        );
        const alpha = Math.min(1, (0.08 + depth * 0.92) * (0.7 + energy * 0.3));
        const size = (0.75 + depth * 2.05) * (1 + energy * 0.4);

        context.fillStyle = `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${alpha.toFixed(3)})`;
        context.beginPath();
        context.arc(centerX + spunX * radius * swell, centerY - tiltedY * radius * swell, size, 0, Math.PI * 2);
        context.fill();
      }

      drawRing(
        context,
        centerX,
        centerY,
        radius,
        liveAmplitude,
        cyclePhase,
        palette.accent,
        reduced,
        rippleActive ? rippleAge : null
      );

      if (!reduced && visible) {
        frame = requestAnimationFrame(render);
      }
    };

    const start = () => {
      cancelAnimationFrame(frame);

      // Reduced motion paints one resting frame synchronously; going through rAF
      // would let the IntersectionObserver cancel it before it ever drew.
      if (reduced) {
        render(performance.now());
        return;
      }

      frame = requestAnimationFrame(render);
    };

    resize();
    start();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      render(performance.now());
    });
    resizeObserver.observe(canvas);

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;

      if (reduced) {
        return;
      }

      if (visible) {
        start();
      } else {
        cancelAnimationFrame(frame);
      }
    });
    intersectionObserver.observe(canvas);

    const detachPointer = interactive && !reduced ? attachPointer(canvas, pointerRef) : undefined;

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      detachPointer?.();
    };
  }, [points, interactive, led, themeTick]);

  return (
    <div className={`chaos-sphere-container seal-sphere relative ${className ?? ""}`} style={{ height }}>
      <canvas
        aria-hidden
        className={`chaos-sphere-canvas block size-full ${interactive ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
        ref={canvasRef}
      />
    </div>
  );
}

type PointerState = { spin: number; velocity: number; tilt: number; targetTilt: number; dragging: boolean; lastX: number };

/** Drag rotates; hovering leans the sphere toward the cursor. */
function attachPointer(canvas: HTMLCanvasElement, ref: { current: PointerState }) {
  const onDown = (event: PointerEvent) => {
    ref.current.dragging = true;
    ref.current.lastX = event.clientX;
    ref.current.velocity = 0;
    canvas.setPointerCapture(event.pointerId);
  };

  const onMove = (event: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    ref.current.targetTilt = ((event.clientY - box.top) / box.height - 0.5) * 0.5;

    if (!ref.current.dragging) {
      return;
    }

    const delta = (event.clientX - ref.current.lastX) / 140;
    ref.current.spin += delta;
    ref.current.velocity = delta;
    ref.current.lastX = event.clientX;
  };

  const onUp = (event: PointerEvent) => {
    ref.current.dragging = false;
    canvas.releasePointerCapture?.(event.pointerId);
  };

  const onLeave = () => {
    ref.current.targetTilt = 0;
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);

  return () => {
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    canvas.removeEventListener("pointerleave", onLeave);
  };
}

type LatticePoint = { x: number; y: number; z: number; delay: number };

/** Fibonacci sphere: even density, no clustering at the poles. */
function buildLattice(count: number): LatticePoint[] {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const pacemaker = normalize([0.35, 0.62, 0.7]);

  return Array.from({ length: count }).map((_, index) => {
    const y = 1 - (index / Math.max(count - 1, 1)) * 2;
    const ringRadius = Math.sqrt(Math.max(1 - y * y, 0));
    const theta = goldenAngle * index;
    const x = Math.cos(theta) * ringRadius;
    const z = Math.sin(theta) * ringRadius;
    const dot = x * pacemaker[0] + y * pacemaker[1] + z * pacemaker[2];

    return { x, y, z, delay: (1 - dot) / 2 };
  });
}

/** The ramp colour at a given pulse phase. */
function ledColour(ramp: RgbChannels[], phase: number): RgbChannels {
  const { from, to, blend } = rampStops(phase, ramp.length);
  return mixChannels(ramp[from], ramp[to], blend);
}

function drawRing(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  amplitude: number,
  cyclePhase: number,
  accent: RgbChannels,
  reduced: boolean,
  rippleAge: number | null
) {
  const beat = reduced ? 0 : heartbeat(wrap(cyclePhase));
  const ringRadius = radius * (1 + amplitude * beat) * 1.08;
  const rippleGlow = rippleAge === null ? 0 : Math.sin(Math.PI * rippleAge) * 0.35;

  context.strokeStyle = `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, ${(0.1 + beat * 0.22 + rippleGlow).toFixed(3)})`;
  context.lineWidth = 1;
  context.beginPath();
  context.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
  context.stroke();
}

/** Narrow travelling band, zero outside it. */
function band(offset: number) {
  if (offset < 0 || offset > 0.35) {
    return 0;
  }

  return Math.sin((offset / 0.35) * Math.PI);
}

function mixChannels(from: RgbChannels, to: RgbChannels, ratio: number): RgbChannels {
  const amount = Math.min(1, Math.max(0, ratio));

  return [
    Math.round(from[0] + (to[0] - from[0]) * amount),
    Math.round(from[1] + (to[1] - from[1]) * amount),
    Math.round(from[2] + (to[2] - from[2]) * amount),
  ];
}

function normalize(vector: [number, number, number]): [number, number, number] {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function wrap(value: number) {
  return value - Math.floor(value);
}
