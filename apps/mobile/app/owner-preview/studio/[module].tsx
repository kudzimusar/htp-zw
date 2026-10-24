import { useLocalSearchParams } from "expo-router";
import { OwnerPreviewModuleScreen } from "../../../src/preview/OwnerPreviewStudio";
import { OWNER_PREVIEW_DYNAMIC_MODULE_SLUGS } from "../../../src/preview/newsroomPreviewData";

// Canonical registered dynamic modules:
// "social", "newsletters", "push-alerts", "analytics", "audience", "search-growth", "staff-roles"
export function generateStaticParams() {
  return OWNER_PREVIEW_DYNAMIC_MODULE_SLUGS.map((module) => ({ module }));
}

export default function OwnerPreviewStudioModuleRoute() {
  const { module, storyId, assignmentId } = useLocalSearchParams<{
    module: string;
    storyId?: string;
    assignmentId?: string;
  }>();

  return (
    <OwnerPreviewModuleScreen
      moduleSlug={String(module ?? "today")}
      storyId={storyId ? String(storyId) : undefined}
      assignmentId={assignmentId ? String(assignmentId) : undefined}
    />
  );
}
