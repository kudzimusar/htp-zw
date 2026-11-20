// HT-MVP-PUBLIC-LAUNCH-01-G5: minimal public newsletter sign-up.
//
// Uses the existing server path POST /api/communications?action=signup
// (same-origin check, explicit consent, policy version, consent record,
// eligibility check, Brevo sync). The form is offered only when BOTH:
//   - the build sets EXPO_PUBLIC_HEALTHTIMES_NEWSLETTER_SIGNUP=true, and
//   - the Privacy Policy is approved (consent is never recorded against a draft).
// Activation checklist: docs/delivery/HT-MVP-G5-NEWSLETTER-AND-ACCOUNT-DELETION.md

export const NEWSLETTER_PURPOSE = "NEWSLETTER";
export const NEWSLETTER_SOURCE = "healthtimes-web-reader";
/** Shown next to the checkbox; approved together with the Privacy Policy. */
export const NEWSLETTER_CONSENT_LABEL = "Email me the HealthTimes newsletter. I can unsubscribe at any time.";

export function newsletterSignupAvailable(input: {
  flag?: string;
  privacyPolicy: { status: string; version: string };
}): boolean {
  const flag = input.flag !== undefined ? input.flag : process.env.EXPO_PUBLIC_HEALTHTIMES_NEWSLETTER_SIGNUP;
  return String(flag ?? "").trim().toLowerCase() === "true" &&
    input.privacyPolicy.status === "approved" &&
    !input.privacyPolicy.version.startsWith("draft-");
}

export type SignupRequest = {
  readonly url: string;
  readonly init: { method: "POST"; credentials: "same-origin"; headers: Record<string, string>; body: string };
};

export function buildSignupRequest(input: { email: string; consent: boolean; policyVersion: string }):
  { ok: true; request: SignupRequest } | { ok: false; message: string } {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (input.consent !== true) return { ok: false, message: "Tick the box to confirm you want the newsletter." };
  if (!input.policyVersion || input.policyVersion.startsWith("draft-")) {
    return { ok: false, message: "Newsletter sign-up is not available yet." };
  }
  return {
    ok: true,
    request: {
      url: "/api/communications?action=signup",
      init: {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, purpose: NEWSLETTER_PURPOSE, consent: true, policyVersion: input.policyVersion, source: NEWSLETTER_SOURCE })
      }
    }
  };
}

export function signupResultMessage(status: number): string {
  if (status === 200) return "Thank you. You are subscribed to the HealthTimes newsletter.";
  if (status === 400) return "Check your email address and confirm the newsletter box.";
  if (status === 409) return "This address cannot be subscribed. Contact HealthTimes if you think this is wrong.";
  if (status === 429) return "Too many attempts. Please try again later.";
  return "Newsletter sign-up is unavailable right now. Please try again later.";
}
