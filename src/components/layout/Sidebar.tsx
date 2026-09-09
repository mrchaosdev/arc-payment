"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  History,
  LayoutDashboard,
  Settings,
  WalletCards,
  Waves,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/swap", label: "Swap", icon: ArrowLeftRight },
  { href: "/pools", label: "Pools", icon: Waves },
  { href: "/portfolio", label: "Portfolio", icon: WalletCards },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar-root sticky top-0 hidden h-dvh w-64 shrink-0 overflow-hidden border-r border-[var(--border)] bg-[var(--sidebar-bg)] xl:block">
      <div className="sidebar-content flex h-dvh min-h-0 flex-col p-4">
        <Link href="/" className="sidebar-brand flex items-center gap-3 px-2 py-2">
          <div className="sidebar-brand-icon flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-300 to-sky-500 text-slate-950">
            <Waves className="h-5 w-5" />
          </div>
          <div className="sidebar-brand-copy">
            <div className="sidebar-brand-name text-lg font-bold text-[var(--text-primary)]">Seal</div>
            <div className="sidebar-brand-description text-xs text-[var(--text-muted)]">DEX aggregator</div>
          </div>
        </Link>

        <nav className="sidebar-nav mt-7 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "sidebar-nav-link",
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition",
                  active
                    ? "bg-teal-400/12 text-teal-200 shadow-inner shadow-teal-950/20"
                    : "hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    active ? "text-teal-300" : "text-slate-500 group-hover:text-slate-300"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-routing-card mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <div className="sidebar-routing-header flex items-center gap-3">
            <div className="sidebar-routing-icon flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 text-slate-950">
              <Zap className="h-4 w-4" />
            </div>
            <div className="sidebar-routing-copy">
              <div className="sidebar-routing-title text-sm font-semibold text-[var(--text-primary)]">Routing</div>
              <div className="sidebar-routing-description text-xs text-[var(--text-muted)]">OpenOcean quotes</div>
            </div>
          </div>
          <div className="sidebar-routing-details mt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="sidebar-router-label">Router</span>
            <span className="sidebar-router-value text-emerald-300">OpenOcean</span>
          </div>
          <div className="sidebar-routing-progress mt-2 h-1.5 rounded-full bg-[var(--surface-soft)]">
            <div className="sidebar-routing-progress-fill h-full w-[86%] rounded-full bg-gradient-to-r from-teal-400 to-sky-400" />
          </div>
        </div>
      </div>
    </aside>
  );
}

export function PageTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="page-title-heading">
      <h1 className="page-title-text text-xl font-bold text-[var(--text-primary)] md:text-2xl">{title}</h1>
      <p className="page-title-description mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
    </div>
  );
}
