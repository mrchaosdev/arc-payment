import { PageLoading } from "@/components/ui/PageLoading";

export default function Loading() {
  return (
    <PageLoading
      title="Recipient contacts"
      subtitle="Loading the addresses saved in this browser."
      rows={4}
    />
  );
}
