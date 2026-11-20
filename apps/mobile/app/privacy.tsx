import { PolicyDocumentScreen } from "../src/ui/PolicyDocument";
import { policyByKey } from "../src/legal/policy-drafts";

export default function PrivacyPolicyScreen() {
  return <PolicyDocumentScreen policy={policyByKey("privacy")} />;
}
