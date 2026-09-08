/**
 * The settlement pulse.
 *
 * Chaos Market AI derives its pulse from market structure. SealPay has no market
 * to read, so the rate is derived from what the app is actually doing to a
 * payment right now. Nothing here predicts or embellishes: every rate below maps
 * to one observable state of the transfer, so the same state always beats the
 * same way.
 */

export type PulseTone = "positive" | "negative" | "neutral";

/** Where a payment is, from the app's point of view. */
export type SettlementStage =
  | "offline"
  | "idle"
  | "drafting"
  | "review"
  | "signing"
  | "settling"
  | "settled"
  | "failed";

export type PulseState = {
  bpm: number;
  amplitude: number;
  tone: PulseTone;
  rhythm: string;
  cycleMs: number;
};

const stages: Record<SettlementStage, { bpm: number; tone: PulseTone; rhythm: string }> = {
  offline: { bpm: 38, tone: "neutral", rhythm: "no wallet · resting" },
  idle: { bpm: 52, tone: "neutral", rhythm: "connected · idle" },
  drafting: { bpm: 62, tone: "neutral", rhythm: "drafting · unsigned" },
  review: { bpm: 72, tone: "neutral", rhythm: "review · awaiting signature" },
  signing: { bpm: 88, tone: "neutral", rhythm: "signing · in wallet" },
  settling: { bpm: 104, tone: "positive", rhythm: "broadcast · awaiting receipt" },
  settled: { bpm: 58, tone: "positive", rhythm: "settled · confirmed onchain" },
  failed: { bpm: 66, tone: "negative", rhythm: "reverted · not settled" },
};

export const minAmplitude = 0.028;
export const maxAmplitude = 0.098;

/**
 * `intensity` (0–1) widens the contraction without changing the rate. It is fed
 * the browser-local confirmed-payment count, so a wallet that has actually
 * settled things has a stronger heartbeat than one that has not.
 */
export function derivePulse(stage: SettlementStage, intensity = 0): PulseState {
  const { bpm, tone, rhythm } = stages[stage];
  const strength = Math.min(1, Math.max(0, intensity));

  return {
    bpm,
    amplitude: minAmplitude + strength * (maxAmplitude - minAmplitude),
    tone,
    rhythm,
    cycleMs: (60 / bpm) * 1000,
  };
}

/** Confirmed payments → 0–1, saturating at 12. A count is not a rate. */
export function intensityFromConfirmed(confirmed: number): number {
  return Math.min(1, Math.max(0, confirmed / 12));
}

/**
 * One cardiac cycle in [0,1): a strong systolic spike, a weaker dicrotic second
 * beat, then rest. The double beat is what reads as a heart rather than as
 * breathing — a single sine wave never does.
 *
 * Ported from Chaos Market AI (`lib/analysis/pulse`) unchanged.
 */
export function heartbeat(phase: number): number {
  return spike(phase, 0, 0.045) + 0.52 * spike(phase, 0.17, 0.058);
}

/** Asymmetric spike: fast attack, slow decay, peaking at exactly 1. */
function spike(phase: number, center: number, width: number): number {
  const distance = (phase - center) / width;

  if (distance < 0) {
    return 0;
  }

  return distance * Math.exp(1 - distance);
}

/**
 * Colour ramp stops for the LED skin. Each point on the sphere takes its colour
 * from its own local pulse phase, so the ramp sweeps in step with the
 * contraction rather than running on a separate clock.
 */
export function rampStops(mix: number, stopCount: number): { from: number; to: number; blend: number } {
  if (stopCount <= 0) {
    return { from: 0, to: 0, blend: 0 };
  }

  const scaled = wrap(mix) * stopCount;
  const from = Math.floor(scaled) % stopCount;

  return { from, to: (from + 1) % stopCount, blend: scaled - Math.floor(scaled) };
}

function wrap(value: number) {
  return value - Math.floor(value);
}
