import {
  OwnerPreviewShell,
  OwnerPreviewTodayDashboard
} from "../../../src/preview/OwnerPreviewStudio";

export default function OwnerPreviewStudioIndex() {
  return (
    <OwnerPreviewShell
      activeKey="today"
      title="Newsroom Today (Owner Visual Preview)"
      subtitle="Daily editorial operations dashboard: immediate desk attention, today's deadlines & scheduled releases, workflow pipeline, and news budget summary."
    >
      <OwnerPreviewTodayDashboard />
    </OwnerPreviewShell>
  );
}
