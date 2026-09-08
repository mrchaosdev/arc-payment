"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, CircleDollarSign, History, LayoutDashboard, Link2, PanelLeftClose, PanelLeftOpen, Send, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

// Adapted from ChaoUi/navigation/dashboard-sidebar. Next links preserve native
// navigation semantics; CSS width transitions respect reduced motion.
export function DashboardSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const links = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/pay", label: "Send payment", icon: Send },
    { href: "/requests", label: "Payment requests", icon: Link2 },
    { href: "/history", label: "Activity", icon: History },
  ];
  return <aside className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] transition-[width] duration-200 motion-reduce:transition-none lg:flex", collapsed ? "w-20" : "w-60")}>
    <Link href="/" aria-label="SealPay home" className="flex h-20 shrink-0 items-center gap-3 px-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--action)] text-[var(--on-action)]"><CircleDollarSign size={23} /></span>
      {!collapsed && <span className="text-xl font-semibold tracking-tight">SealPay<span className="block text-[10px] font-normal uppercase tracking-[0.2em] text-[var(--text-muted)]">Payment workspace</span></span>}
    </Link>
    <nav aria-label="Workspace" className="flex-1 space-y-1 px-3 pt-8">
      {!collapsed && <p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Workspace</p>}
      {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-label={label} title={collapsed ? label : undefined} aria-current={pathname === href ? "page" : undefined}
        className={cn("flex h-12 items-center gap-3 rounded-xl px-3 text-sm transition-colors", pathname === href ? "bg-[var(--brand-coral)]/12 font-semibold text-[var(--primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]")}>
        <Icon size={19} className="shrink-0" />{!collapsed && label}
      </Link>)}
    </nav>
    {!collapsed && <div className="mx-4 mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
      <span className="text-xs font-semibold">Start with test USDC</span>
      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">Try your first payment on Arc Testnet.</p>
      <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">Open faucet <ArrowUpRight size={14} /></a>
    </div>}
    <div className="flex items-center justify-between border-t border-[var(--border)] p-4">
      {!collapsed && <Link href="/settings" className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><Settings size={16} /> Settings</Link>}
      <button type="button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)} className="grid size-9 place-items-center rounded-lg hover:bg-[var(--surface-soft)]">
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>
    </div>
  </aside>;
}

