import { PageLoading } from "@/components/ui/PageLoading";

export default function Loading() {
  return (
    <PageLoading
      title="Swap"
      subtitle="Preparing the Arc Testnet swap workspace."
      rows={3}
    />
  );
}
