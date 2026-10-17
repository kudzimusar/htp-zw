import { useLocalSearchParams } from "expo-router";
import { OwnerPreviewModuleScreen } from "../../../src/preview/OwnerPreviewStudio";

export function generateStaticParams() {
  return [
    "stories",
    "create-edit",
    "review-queue",
    "planning",
    "assignments",
    "calendar",
    "homepage",
    "media",
    "video-desk",
    "live-desk",
    "social",
    "newsletters"
  ].map((module) => ({ module }));
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
