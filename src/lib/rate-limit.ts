import type { NextRequest } from "next/server";

/**
 * A crude per-caller budget kept in module memory, so it protects one server
 * instance rather than a fleet. It is enough to stop a loop from hammering the
 * public RPC through this app, not a substitute for a gateway limit.
 */
export function createRateLimiter({ windowMs, max }: { windowMs: number; max: number }) {
  const seen = new Map<string, number[]>();

  return function overBudget(key: string) {
    const now = Date.now();
    const recent = (seen.get(key) ?? []).filter((at) => now - at < windowMs);
    recent.push(now);
    seen.set(key, recent);

    if (seen.size > 2_000) {
      for (const [id, times] of seen) if (!times.some((at) => now - at < windowMs)) seen.delete(id);
    }

    return recent.length > max;
  };
}

export function callerKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
