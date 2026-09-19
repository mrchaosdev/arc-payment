import { getTranslations } from "next-intl/server";
import { PageLoading } from "@/components/ui/PageLoading";

export default async function Loading() {
  const t = await getTranslations("pages");
  return (
    <PageLoading
      title={t("payTitle")}
      subtitle={t("paySubtitle")}
      rows={3}
    />
  );
}
