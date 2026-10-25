import { StudioShell } from "../../src/ui/Studio";
import { StudioPersonalProfile } from "../../src/ui/StudioPersonalProfile";

export default function StudioMeScreen() {
  return (
    <StudioShell
      title="Personal Station & Authority"
      subtitle="Your certified profile, effective authority summary, personal work queues, and security settings."
      breadcrumbs={[
        { label: "Studio", path: "/studio" },
        { label: "My Profile" }
      ]}
    >
      <StudioPersonalProfile />
    </StudioShell>
  );
}
