import { PageLoading } from "@/components/ui/PageLoading";

export default function Loading() {
  return (
    <PageLoading
      title="Settings"
      subtitle="Loading saved routing and execution preferences."
      rows={3}
    />
  );
}
