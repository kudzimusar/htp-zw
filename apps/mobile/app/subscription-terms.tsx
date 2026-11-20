import { PolicyDocumentScreen } from "../src/ui/PolicyDocument";
import { policyByKey } from "../src/legal/policy-drafts";

export default function SubscriptionTermsScreen() {
  return <PolicyDocumentScreen policy={policyByKey("subscription-terms")} />;
}
