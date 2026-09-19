import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";

/**
 * The payer arrives here from a link, with no app already open. The frame and
 * the promise of a request render straight away so the wait never looks like a
 * broken link — checkout was the one route without this.
 */
export default function Loading() {
  return (
    <div className="checkout-loading-root min-h-dvh">
      <TopBar workspace />
      <main className="checkout-loading-main px-4 py-8 sm:px-8 sm:py-12">
        <div className="checkout-loading-content mx-auto max-w-[1240px]">
          <p role="status" className="checkout-loading-status sr-only">
            Loading this payment request.
          </p>

          <div className="checkout-loading-heading mb-8 border-b border-[var(--border)] pb-6">
            <Bar className="h-3 w-40" />
            <Bar className="mt-4 h-8 w-64" />
            <Bar className="mt-3 h-4 w-80" />
          </div>

          <div className="checkout-loading-grid grid items-start gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="checkout-loading-form p-5 sm:p-7">
              <Bar className="h-5 w-48" />
              <Bar className="mt-2 h-3 w-64" />
              <Bar className="mt-7 h-28 w-full" />
              <div className="checkout-loading-fields mt-5 space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Bar key={index} className="h-9 w-full" />
                ))}
              </div>
              <Bar className="mt-6 h-12 w-full" />
            </Card>

            <div className="checkout-loading-aside space-y-5">
              <Card className="checkout-loading-pulse p-4">
                <Bar className="h-[236px] w-full" />
              </Card>
              <Card className="checkout-loading-preview p-4">
                <Bar className="h-40 w-full" />
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Bar({ className }: { className: string }) {
  return <div aria-hidden className={`checkout-loading-bar chaospay-skeleton-shimmer max-w-full ${className}`} />;
}
