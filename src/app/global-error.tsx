"use client";

import { useEffect } from "react";

/**
 * Catches an error thrown by the root layout itself — the one place
 * `error.tsx` cannot reach, since that file renders *inside* the layout.
 * Next.js requires this file to render its own <html>/<body>; it replaces the
 * whole document, so it cannot use the app's fonts, tokens or components —
 * anything reused from `layout.tsx` is exactly what might have just thrown.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0f0e17", color: "#fffffe", fontFamily: "ui-monospace, monospace" }}>
        <div style={{ display: "grid", minHeight: "100vh", placeItems: "center", padding: "24px" }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <p style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "#f25f4c" }}>
              App failed to load
            </p>
            <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: "#a7a9be" }}>
              Nothing was sent or signed. Reload the page. If it keeps happening, note what you were doing right
              before it — especially resizing the window or opening dev tools.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 20,
                height: 40,
                padding: "0 16px",
                background: "transparent",
                color: "#fffffe",
                border: "1px solid rgba(255,255,254,0.3)",
                fontFamily: "inherit",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
