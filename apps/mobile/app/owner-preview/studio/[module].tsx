import { useLocalSearchParams } from "expo-router";
import { OwnerPreviewModuleScreen } from "../../../src/preview/OwnerPreviewStudio";
import { OWNER_PREVIEW_DYNAMIC_MODULE_SLUGS } from "../../../src/preview/newsroomPreviewData";

export function generateStaticParams() {
  return OWNER_PREVIEW_DYNAMIC_MODULE_SLUGS.map((module) => ({ module }));
}

export default function OwnerPreviewStudioModuleRoute() {
  const { module, storyId } = useLocalSearchParams<{
    module: string;
    storyId?: string;
  }>();

  return (
    <OwnerPreviewModuleScreen
      moduleSlug={String(module ?? "today")}
      storyId={storyId ? String(storyId) : undefined}
    />
  );
}
