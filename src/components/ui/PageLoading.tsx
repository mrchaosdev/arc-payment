import { AppShell } from "@/components/layout/AppShell";
import { PageTitle } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/Card";

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
      <div className="mb-6">
        <PageTitle title={title} subtitle={subtitle} />
      </div>
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card className="p-5">
            <div className="h-6 w-32 rounded-full bg-[var(--surface-soft)]" />
            <div className="mt-5 h-9 w-64 max-w-full rounded-2xl bg-[var(--surface-soft)]" />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBox key={index} className="h-20" />
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <div className="h-5 w-36 rounded-full bg-[var(--surface-soft)]" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonBox key={index} className="h-14" />
              ))}
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-[var(--border)] p-5">
            <div className="h-11 w-full max-w-xl rounded-2xl bg-[var(--surface-soft)]" />
          </div>
          <div className="divide-y divide-[var(--border)]">
            {Array.from({ length: rows }).map((_, index) => (
              <div key={index} className="grid gap-4 p-4 md:grid-cols-[1fr_0.7fr_0.7fr_auto]">
                <div className="flex items-center gap-3">
                  <SkeletonBox className="h-10 w-10 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <SkeletonBox className="h-4 w-40 max-w-full" />
                    <SkeletonBox className="mt-2 h-3 w-28 max-w-full" />
                  </div>
                </div>
                <SkeletonBox className="h-8" />
                <SkeletonBox className="h-8" />
                <SkeletonBox className="h-8 w-20" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function SkeletonBox({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-[linear-gradient(90deg,var(--surface-soft),var(--surface-elevated),var(--surface-soft))] bg-[length:200%_100%] ${className}`}
    />
  );
}
