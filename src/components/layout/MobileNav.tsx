"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleDollarSign,
  History,
  LayoutDashboard,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/pay", label: "Pay", icon: CircleDollarSign },
  { href: "/history", label: "Activity", icon: History },
  { href: "/requests", label: "Requests", icon: Link2 },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile workspace"
      className="mobile-nav-root fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--app-bg)] lg:hidden"
    >
      <div className="mobile-nav-list grid grid-cols-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
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
