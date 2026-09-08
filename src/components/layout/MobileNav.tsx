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
    <nav aria-label="Mobile workspace" className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--sidebar-bg)]/96 px-2 py-2 backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-4 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-semibold transition",
                active ? "bg-[var(--brand-coral)]/12 text-[var(--primary)]" : "text-[var(--text-muted)]"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
