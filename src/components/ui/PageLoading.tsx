import { AppShell } from "@/components/layout/AppShell";
import { PageHeading, Panel } from "@/components/chaos/Terminal";
import { Card } from "@/components/ui/Card";

/**
 * The shared route-loading skeleton, shown by every workspace `loading.tsx`
 * for the moment between navigating and the real page mounting. The title
 * and subtitle render as real text immediately — they are already known, so
 * skeletoning them would hide information the app has for no reason — and
 * only the content whose shape genuinely isn't known yet shimmers.
 *
 * Mirrors `checkout/loading.tsx`'s bespoke skeleton (`Bar` + `Card` +
 * `seal-skeleton-shimmer`) rather than inventing a second visual language for
 * "loading": a route transition should look like the terminal pausing, not
 * like a different, older app flashing in between two terminal screens.
 */
export function PageLoading({
  title,
  subtitle,
  rows = 5,
}: {
  title: string;
  subtitle: string;
  rows?: number;
}) {
  return (
    <AppShell>
      <div className="page-loading-heading mb-6 border-b border-[var(--border)] pb-6">
        <PageHeading eyebrow="Your payment workspace" title={title} subtitle={subtitle} />
      </div>
      <div className="page-loading-content space-y-5">
        <div className="page-loading-grid grid gap-5 lg:grid-cols-[1fr_360px]">
          <Card className="page-loading-main-card p-5">
            <Bar className="h-3 w-32" />
            <Bar className="mt-5 h-9 w-64" />
            <div className="page-loading-metrics mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Bar key={index} className="h-20 w-full" />
              ))}
            </div>
          </Card>
          <Card className="page-loading-secondary-card p-5">
            <Bar className="h-3 w-28" />
            <div className="page-loading-fields mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Bar key={index} className="h-14 w-full" />
              ))}
            </div>
          </Card>
        </div>

        <Panel title="Records" meta="LOADING" bodyClassName="p-0">
          <div className="page-loading-table-toolbar border-b border-[var(--border)] p-4">
            <Bar className="h-11 w-full max-w-xl" />
          </div>
          <div className="page-loading-rows">
            {Array.from({ length: rows }).map((_, index) => (
              <div
                key={index}
                className="page-loading-row grid gap-4 border-b border-[var(--border)] p-4 last:border-b-0 md:grid-cols-[1fr_0.7fr_0.7fr_auto]"
              >
                <div className="page-loading-row-primary flex items-center gap-3">
                  <Bar className="h-9 w-9" />
                  <div className="page-loading-row-secondary min-w-0 flex-1 space-y-2">
                    <Bar className="h-4 w-40 max-w-full" />
                    <Bar className="h-3 w-28 max-w-full" />
                  </div>
                </div>
                <Bar className="h-8 w-full" />
                <Bar className="h-8 w-full" />
                <Bar className="h-8 w-20" />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

function Bar({ className }: { className: string }) {
  return <div aria-hidden className={`page-loading-bar seal-skeleton-shimmer max-w-full ${className}`} />;
}
