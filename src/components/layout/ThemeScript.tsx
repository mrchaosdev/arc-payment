"use client";

/**
 * The theme script, rendered into the server HTML and nowhere else.
 *
 * It has to run in `<head>` before the body paints, or a reader who chose light
 * sees a dark frame first. But a `<script>` left in the React tree is also
 * re-rendered on a client navigation — and switching language re-renders this
 * whole layout, where React neither executes the script nor stays quiet about
 * it ("Encountered a script tag while rendering React component").
 *
 * A client component is the seam: it still runs on the server during SSR, where
 * `window` is undefined and the script goes into the HTML, and returns nothing
 * once there is a document — so the element never exists on the client at all,
 * neither at hydration nor on any later render.
 */
export function ThemeScript({ code }: { code: string }) {
  if (typeof window !== "undefined") return null;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
