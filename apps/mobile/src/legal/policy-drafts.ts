// HT-MVP-PUBLIC-LAUNCH-01-G5: public policy surfaces.
//
// These are DRAFT working documents, not published policies. "facts" describe
// what the software does today and were checked against the source on
// 2026-11-14; "decisions" are wording and policy choices only HealthTimes and
// its legal adviser can make. No approved legal wording is invented here.
// Launch gate: policiesApprovedForLaunch() must be true before G5 production.

export type PolicyStatus = "draft-pending-legal-review" | "approved";

export type PolicySection = {
  readonly heading: string;
  readonly facts?: readonly string[];
  readonly decisions?: readonly string[];
};

export type PolicyDraft = {
  readonly key: "privacy" | "terms" | "subscription-terms";
  readonly path: "/privacy" | "/terms" | "/subscription-terms";
  readonly title: string;
  readonly status: PolicyStatus;
  readonly version: string;
  /** Name/role of the approving legal reviewer once approved. */
  readonly approvedBy: string | null;
  readonly summary: string;
  readonly sections: readonly PolicySection[];
};

export const DRAFT_NOTICE =
  "Draft for HealthTimes legal review. This page is not a published policy and does not create rights or obligations.";

export const POLICY_DRAFTS: readonly PolicyDraft[] = Object.freeze([
  {
    key: "privacy",
    path: "/privacy",
    title: "Privacy Policy",
    status: "draft-pending-legal-review",
    version: "draft-2026-11-14",
    approvedBy: null,
    summary:
      "What the HealthTimes Reader currently collects, where it is kept and which services process it. HealthTimes and its legal adviser must write and approve the published policy before launch.",
    sections: [
      {
        heading: "Who is responsible",
        decisions: [
          "Legal name and contact details of the HealthTimes entity responsible for personal data.",
          "Data-protection contact, and whether a data protection officer must be designated.",
          "Applicable law and regulator, confirmed by legal review (including Zimbabwe's Cyber and Data Protection Act)."
        ]
      },
      {
        heading: "Reader accounts",
        facts: [
          "Creating a reader account records an email address, a password and an optional display name.",
          "Passwords are handled by the authentication service (Supabase Auth); the apps do not store them.",
          "Signed-in sessions are kept on the device: in secure storage on Android and iOS, and in browser storage on the web."
        ],
        decisions: [
          "How long inactive accounts are kept.",
          "The account-deletion process and timeline. An in-app deletion request is designed but not yet live."
        ]
      },
      {
        heading: "Information kept on your device",
        facts: [
          "Saved stories, reading positions, appearance (light or dark) and the Premium preview window are stored on the device.",
          "The web Reader uses a service worker to keep recently opened public pages available offline."
        ]
      },
      {
        heading: "Analytics and advertising",
        facts: [
          "The Reader checks the format of engagement events, such as Premium preview views and advertisement impressions, but does not currently send analytics to any provider.",
          "Advertising is sold directly by HealthTimes. The apps contain no third-party advertising SDK."
        ],
        decisions: ["Whether to enable an analytics provider and, if so, the consent mechanism."]
      },
      {
        heading: "Notifications",
        facts: ["On Android and iOS, a push-notification token is created only after the reader allows notifications."],
        decisions: ["Notification categories and opt-out wording."]
      },
      {
        heading: "Newsletters",
        facts: [
          "Public newsletter sign-up is switched off at launch.",
          "When switched on, sign-up records the email address, the purpose (for example the newsletter) and the policy version agreed to, and passes the address to the email service (Brevo)."
        ],
        decisions: ["Consent wording, double opt-in and unsubscribe handling."]
      },
      {
        heading: "Payments",
        facts: [
          "Online payments are switched off.",
          "If Premium payments are switched on, Paynow processes the payment; HealthTimes records transaction references and payment status, not card or mobile-money credentials."
        ]
      },
      {
        heading: "Service providers",
        facts: [
          "Hosting: Vercel. Database, sign-in and file storage: Supabase. Public archive images: Cloudflare Pages.",
          "Email, when enabled: Brevo and Resend. Payments, when enabled: Paynow."
        ],
        decisions: ["Data-processing agreements and the basis for any international transfer for each provider."]
      },
      {
        heading: "Technical logs",
        facts: ["Hosting providers record technical request logs, including IP addresses, for security and operations."],
        decisions: ["How long logs are kept."]
      },
      {
        heading: "Your rights and how to contact us",
        decisions: ["The rights readers have, how to exercise them, response times and how to complain."]
      }
    ]
  },
  {
    key: "terms",
    path: "/terms",
    title: "Terms of Use",
    status: "draft-pending-legal-review",
    version: "draft-2026-11-14",
    approvedBy: null,
    summary:
      "The topics the HealthTimes Terms of Use must cover for the Reader and Newsroom. HealthTimes and its legal adviser must write and approve the text.",
    sections: [
      { heading: "Using HealthTimes", decisions: ["Acceptance of the terms and the minimum age for reader accounts."] },
      {
        heading: "Accounts",
        facts: [
          "Reader accounts use an email address and password.",
          "Newsroom Studio access for staff requires separately issued credentials and a staff role."
        ],
        decisions: ["When HealthTimes may suspend or close an account."]
      },
      { heading: "Health information", decisions: ["Wording that HealthTimes journalism is not medical advice, and what to do in an emergency."] },
      { heading: "Content and copyright", decisions: ["Ownership of articles, photographs and video; permitted sharing and quotation; the takedown process."] },
      {
        heading: "Comments and discussion",
        facts: ["Article discussion, where enabled, is moderated by HealthTimes staff."],
        decisions: ["Community rules and the moderation policy."]
      },
      {
        heading: "Corrections",
        facts: ["Readers can request a correction by email from the About page."],
        decisions: ["The corrections policy and response times."]
      },
      { heading: "Advertising and sponsored content", decisions: ["How advertising and sponsored content are labelled."] },
      { heading: "Premium", facts: ["Premium purchases are not available at launch. See the Subscription Terms."] },
      { heading: "Liability, governing law and changes", decisions: ["Limits of liability, governing law and courts, and how changes to the terms are announced."] }
    ]
  },
  {
    key: "subscription-terms",
    path: "/subscription-terms",
    title: "Subscription Terms",
    status: "draft-pending-legal-review",
    version: "draft-2026-11-14",
    approvedBy: null,
    summary:
      "Premium purchases are switched off. This draft records what the subscription terms must state before any payment is enabled.",
    sections: [
      {
        heading: "Plan and price",
        facts: ["The implemented plan is a monthly Premium membership designed to be charged in US dollars. No price is configured."],
        decisions: ["Price, billing interval, taxes and what Premium includes."]
      },
      {
        heading: "Payment",
        facts: [
          "Payments are designed to be processed by Paynow on the web.",
          "The Android and iOS apps do not offer purchases."
        ],
        decisions: ["Accepted payment methods and receipts."]
      },
      { heading: "Renewal and cancellation", decisions: ["Whether memberships renew automatically, how to cancel and when access ends."] },
      {
        heading: "Refunds",
        facts: ["Refund handling is not implemented."],
        decisions: ["A refund policy approved by HealthTimes Finance and consistent with consumer law."]
      },
      {
        heading: "Access",
        facts: ["Premium access is granted only after the payment provider confirms payment. Returning from the checkout page alone does not grant access."]
      },
      { heading: "Existing members on mobile", decisions: ["Whether app users can sign in to an existing web membership, and the wording shown in the apps."] }
    ]
  }
]);

export function policyByKey(key: PolicyDraft["key"]): PolicyDraft {
  const policy = POLICY_DRAFTS.find((item) => item.key === key);
  if (!policy) throw new Error("Unknown policy " + key);
  return policy;
}

/** G5 launch gate: every public policy approved by a named legal reviewer. */
export function policiesApprovedForLaunch(policies: readonly PolicyDraft[] = POLICY_DRAFTS): boolean {
  return policies.length === 3 && policies.every((policy) => policy.status === "approved" && Boolean(policy.approvedBy));
}
