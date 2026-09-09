import { PageLoading } from "@/components/ui/PageLoading";

export default function Loading() {
  return (
    <PageLoading
      title="Payment requests"
      subtitle="Loading your saved checkout links."
      rows={3}
    />
  );
}
