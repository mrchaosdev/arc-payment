import { cn } from "@/lib/utils";

// Adapted from ChaoUi/loaders/skeleton: shimmer sweep as a background-position
// animation, no JS. Reduced motion is handled globally in globals.css.
export function Skeleton({ className, variant = "shimmer", rounded = "none" }: {
  className?: string;
  variant?: "shimmer" | "pulse";
  rounded?: "none" | "md" | "lg" | "xl" | "2xl" | "full";
}) {
  const radius = { none: "", md: "rounded-md", lg: "rounded-lg", xl: "rounded-xl", "2xl": "rounded-2xl", full: "rounded-full" }[rounded];
  return <div aria-hidden className={cn("bg-[var(--surface-soft)]", radius, variant === "pulse" ? "animate-pulse" : "seal-skeleton-shimmer", className)} />;
}
