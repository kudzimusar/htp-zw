import { useLocalSearchParams } from "expo-router";
import { StudioShell } from "../../../src/ui/Studio";
import { StudioStaffProfile } from "../../../src/ui/StudioStaffProfile";

export function generateStaticParams() {
  return [
    "current",
    "staff-owner-01",
    "staff-reporter-01",
    "staff-editor-01",
    "staff-finance-01",
    "staff-commercial-01",
    "staff-audience-01",
    "staff-admin-01"
  ].map((staffId) => ({ staffId }));
}

export default function StudioStaffDetailScreen() {
  const { staffId } = useLocalSearchParams<{ staffId: string }>();

  return (
    <StudioShell
      title="Staff Identity & Authority"
      subtitle="Complete organizational record, effective domain capabilities, workload metrics and security governance."
      breadcrumbs={[
        { label: "Studio", path: "/studio" },
        { label: "Staff & Roles", path: "/studio/staff-roles" },
        { label: `Staff: ${staffId ?? "Member"}` }
      ]}
    >
      <StudioStaffProfile staffId={String(staffId ?? "current")} />
    </StudioShell>
  );
}
