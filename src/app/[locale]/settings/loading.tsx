import { getTranslations } from "next-intl/server";
import { PageLoading } from "@/components/ui/PageLoading";

export default async function Loading() {
  const t = await getTranslations("pages");
  return (
    <PageLoading
      title={t("settingsTitle")}
      subtitle={t("settingsSubtitle")}
      rows={3}
    />
  );
}
