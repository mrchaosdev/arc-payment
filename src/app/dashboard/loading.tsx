import { PageLoading } from "@/components/ui/PageLoading";

export default function Loading() {
  return (
    <PageLoading
      title="Workspace"
      subtitle="Loading your Arc Testnet payment overview."
      rows={4}
    />
  );
}
