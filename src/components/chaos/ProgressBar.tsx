// Adapted from ChaoUi/loaders/progress-bar; progress is only shown when known.
export function ProgressBar({ label, indeterminate = false }: { label: string; indeterminate?: boolean }) {
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100}
    aria-valuenow={indeterminate ? undefined : 100} className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-soft)]">
    <span className={indeterminate ? "seal-progress block h-full w-1/3 rounded-full bg-[var(--action)]" : "block h-full w-full rounded-full bg-[var(--success)]"} />
  </div>;
}

