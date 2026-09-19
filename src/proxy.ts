import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

/**
 * Next 16 renamed the `middleware` convention to `proxy`; next-intl still ships
 * its helper under the old name, and the two take the same shape.
 *
 * This is what decides the language of a shared payment link. A merchant sends
 * `/checkout?to=…`, and whoever opens it is redirected to `/<their language>/
 * checkout?to=…` from their own `Accept-Language`, query string intact, with an
 * explicit choice remembered in a cookie from then on.
 */
export default createMiddleware(routing);

export const config = {
  matcher: [
    // The bare root, so "/" lands on a language.
    "/",
    // Paths that already name their locale.
    "/(en|vi|zh|ru)/:path*",
    // Everything else, minus API routes, Next internals and any path with a
    // file extension — the token SVGs and the favicon must not be prefixed.
    //
    // `[.]`, not `\.`: path-to-regexp reads a backslash as its own escape and
    // drops the entry silently, which leaves this rule matching nothing at all.
    // Next's own docs suggest `\.` here; it does not work on this version.
    "/((?!api|_next|_vercel|.*[.].*).*)",
  ],
};
