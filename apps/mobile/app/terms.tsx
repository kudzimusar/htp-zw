import { PolicyDocumentScreen } from "../src/ui/PolicyDocument";
import { policyByKey } from "../src/legal/policy-drafts";

export default function TermsOfUseScreen() {
  return <PolicyDocumentScreen policy={policyByKey("terms")} />;
}
