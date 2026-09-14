import { cn } from "@/lib/utils";

export function WalletGem({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={cn("wallet-gem", className)}
    >
      <path d="M12 2 19 5 22 10 12 22 2 10 5 5 12 2Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 10h20M5 5l3 5 4-8 4 8 3-5M8 10l4 12 4-12" stroke="currentColor" strokeWidth="1.15" />
    </svg>
  );
}
