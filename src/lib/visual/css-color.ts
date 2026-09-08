export type RgbChannels = [number, number, number];

const srgbPattern = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/;
const rgbPattern = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/;

/**
 * Chromium reports `color-mix()` results as `color(srgb r g b)`, which canvas
 * refuses to parse. Normalize everything back to rgb()/rgba().
 *
 * Ported from Chaos Market AI (`lib/utils/css-color`) unchanged — the token
 * files in both projects are built on `color-mix()`, so both hit this.
 */
export function toRgbString(value: string): string {
  const match = srgbPattern.exec(value.trim());

  if (!match) {
    return value;
  }

  const [red, green, blue] = [match[1], match[2], match[3]].map((channel) =>
    Math.round(Number(channel) * 255)
  );
  const alpha = match[4] === undefined ? 1 : Number(match[4]);

  return alpha === 1 ? `rgb(${red}, ${green}, ${blue})` : `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function toRgbChannels(value: string): RgbChannels {
  const match = rgbPattern.exec(toRgbString(value));

  if (!match) {
    return [255, 255, 255];
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * Resolve a design token to a concrete colour by letting the browser compute it.
 * Reading the custom property directly returns the literal `color-mix(...)`
 * declaration instead of a usable value.
 */
export function resolveToken(host: HTMLElement, token: string): string {
  const probe = document.createElement("span");
  probe.style.display = "none";
  probe.style.color = `var(${token})`;
  host.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();

  return toRgbString(value);
}

export function resolveTokenChannels(host: HTMLElement, token: string): RgbChannels {
  return toRgbChannels(resolveToken(host, token));
}
