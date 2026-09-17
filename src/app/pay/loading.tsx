import { PageLoading } from "@/components/ui/PageLoading";

export default function Loading() {
  return (
    <PageLoading
      title="Pay & Request"
      subtitle="Preparing the Arc payment workspace."
      rows={3}
    />
  );
}
