"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import {
  CircleDollarSign,
  BookUser,
  History,
  LayoutDashboard,
  Link2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const navItems = [
    { href: "/dashboard", label: t("overview"), icon: LayoutDashboard },
    { href: "/pay", label: t("pay"), icon: CircleDollarSign },
    { href: "/history", label: t("activity"), icon: History },
    { href: "/requests", label: t("requests"), icon: Link2 },
    { href: "/contacts", label: t("contacts"), icon: BookUser },
  ];

  return (
    <nav
      aria-label={t("mobileLabel")}
      className="mobile-nav-root fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--app-bg)] pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mobile-nav-list grid grid-cols-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "mobile-nav-link",
                "flex flex-col items-center justify-center gap-1.5 border-t-2 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
                active
                  ? "border-[var(--action)] text-[var(--action)]"
                  : "border-transparent text-[var(--text-muted)]"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
