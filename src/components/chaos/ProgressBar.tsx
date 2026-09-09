// Adapted from ChaoUi/loaders/progress-bar; progress is only shown when known.
export function ProgressBar({ label, indeterminate = false }: { label: string; indeterminate?: boolean }) {
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100}
    aria-valuenow={indeterminate ? undefined : 100} className="progress-bar-track h-px overflow-hidden bg-[var(--border)]">
    <span className={`progress-bar-fill ${(indeterminate ? "seal-progress block h-full w-1/3 bg-[var(--action)]" : "block h-full w-full bg-[var(--positive)]")}`} />
  </div>;
}
