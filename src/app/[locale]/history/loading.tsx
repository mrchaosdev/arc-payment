import { getTranslations } from "next-intl/server";
import { PageLoading } from "@/components/ui/PageLoading";

export default async function Loading() {
  const t = await getTranslations("pages");
  return (
    <PageLoading
      title={t("historyTitle")}
      subtitle={t("historySubtitle")}
    />
  );
}
