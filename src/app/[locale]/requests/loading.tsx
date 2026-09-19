import { getTranslations } from "next-intl/server";
import { PageLoading } from "@/components/ui/PageLoading";

export default async function Loading() {
  const t = await getTranslations("pages");
  return (
    <PageLoading
      title={t("requestsTitle")}
      subtitle={t("requestsSubtitle")}
      rows={3}
    />
  );
}
