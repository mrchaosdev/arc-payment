"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowUpRight,
  BookUser,
  Bot,
  History,
  LayoutDashboard,
  Link2,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ARC_FAUCET_URL } from "@/lib/arc";
import { useAssistant } from "@/store/assistant";
import { BrandMark } from "@/components/ui/BrandMark";

// Adapted from ChaoUi/navigation/dashboard-sidebar. Next links preserve native
// navigation semantics; CSS width transitions respect reduced motion.
export function DashboardSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const available = useAssistant(state => state.available);
  const openAssistant = useAssistant(state => state.setOpen);
  const links = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/requests", label: "Payment requests", icon: Link2 },
    { href: "/history", label: "Activity", icon: History },
    { href: "/contacts", label: "Contacts", icon: BookUser },
  ];

  return (
    <aside
      className={cn(
        "dashboard-sidebar-root",
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] transition-[width] duration-200 motion-reduce:transition-none lg:flex",
        collapsed ? "w-[72px]" : "w-56"
      )}
    >
      <Link
        href="/"
        aria-label="SealPay home"
        className="dashboard-sidebar-brand flex h-14 shrink-0 items-center gap-2.5 border-b border-[var(--border)] px-5"
      >
        <BrandMark className="dashboard-sidebar-brand-mark" />
        {!collapsed && (
          <span className="dashboard-sidebar-brand-text min-w-0">
            <span className="dashboard-sidebar-brand-name block truncate text-base font-semibold tracking-tight">SealPay</span>
          </span>
        )}
      </Link>

      <nav aria-label="Workspace" className="dashboard-sidebar-nav min-h-0 flex-1 overflow-y-auto px-3 pt-6">
        <Link href="/pay" aria-label="Send USDC" title="Send USDC" aria-current={pathname === "/pay" ? "page" : undefined}
          className="dashboard-sidebar-send-button mb-5 flex h-11 items-center justify-center gap-2 bg-[var(--action)] text-xs font-semibold text-[var(--on-action)]">
          <Send className="dashboard-sidebar-send-icon size-4 shrink-0" />{!collapsed && <span className="dashboard-sidebar-send-label">Send USDC</span>}
        </Link>
        {!collapsed && (
          <p className="dashboard-sidebar-nav-label mb-3 px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Workspace
          </p>
        )}
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              title={collapsed ? label : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "dashboard-sidebar-nav-link",
                "flex h-10 items-center gap-3 border-l-2 px-3 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
                active
                  ? "border-[var(--action)] bg-[var(--surface)] text-[var(--action)]"
                  : "border-transparent text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span className="dashboard-sidebar-nav-link-label truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      <button type="button" aria-label="Ask assistant" title={available ? "Ask assistant" : "Assistant unavailable"} disabled={!available}
        onClick={() => openAssistant(true)} className="dashboard-sidebar-assistant-button mx-3 mb-3 flex min-h-10 items-center justify-center gap-2 border border-[var(--border)] px-2 text-xs text-[var(--action)] disabled:cursor-not-allowed disabled:opacity-40">
        <Bot className="dashboard-sidebar-assistant-icon size-4 shrink-0" />{!collapsed && <span className="dashboard-sidebar-assistant-label">Ask assistant</span>}
      </button>

      {!collapsed ? (
        <div className="dashboard-sidebar-faucet-card mx-3 mb-4 border border-[var(--border)] p-3">
          <p className="dashboard-sidebar-faucet-title font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Start with test USDC
          </p>
          <p className="dashboard-sidebar-faucet-description mt-2 text-xs leading-5 text-[var(--text-muted)]">
            Try your first payment on Arc Testnet.
          </p>
          <a
            href={ARC_FAUCET_URL}
            target="_blank"
            rel="noreferrer"
            className="dashboard-sidebar-faucet-link mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--action)]"
          >
            Get test USDC <ArrowUpRight size={12} />
          </a>
        </div>
      ) : <a className="dashboard-sidebar-faucet-shortcut mx-3 mb-3 grid min-h-10 place-items-center border border-[var(--border)] text-[var(--action)]" href={ARC_FAUCET_URL} target="_blank" rel="noreferrer" aria-label="Get test USDC" title="Get test USDC"><ArrowUpRight className="dashboard-sidebar-faucet-icon size-4" /></a>}

      <div className="dashboard-sidebar-footer flex items-center justify-between border-t border-[var(--border)] p-3">
        {!collapsed && (
          <Link
            href="/settings"
            className="dashboard-sidebar-settings-link flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <Settings size={14} /> Settings
          </Link>
        )}
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
          className="dashboard-sidebar-collapse-button grid size-8 place-items-center text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>
    </aside>
  );
}
