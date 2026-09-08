import { ReactNode } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { CursorLayer } from "@/components/chaos/CursorLayer";

export function AppShell({
  children,
  flush = false,
  showFooter = false,
}: {
  children: ReactNode;
  flush?: boolean;
  showFooter?: boolean;
}) {
  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)]">
      <CursorLayer />
      <div className="relative flex min-h-screen">
        {!flush && <DashboardSidebar />}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar workspace={!flush} />
          <main className={flush ? "min-h-[calc(100svh-56px)]" : "flex-1 px-4 py-6 pb-24 md:px-8 lg:py-8"}>
            {flush ? children : <div className="mx-auto w-full max-w-[1400px]">{children}</div>}
          </main>
          {showFooter ? <Footer /> : null}
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
