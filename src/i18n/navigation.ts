import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware replacements for `next/link` and the navigation hooks. Importing
 * these instead of the Next originals keeps the active locale in every in-app
 * URL without a single component having to think about it.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
