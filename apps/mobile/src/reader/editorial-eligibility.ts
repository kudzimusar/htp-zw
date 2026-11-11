// Which stored stories may appear as news. Each lane is judged on its own provenance:
// a native story has no legacy source, so that absence must not count against it.
export type ReaderLane =
  | "wordpress-post"
  | "native-newsroom"
  | "excluded-test"
  | "excluded-page"
  | "excluded-unreleased"
  | "excluded-unknown-source";

export type EditorialRecord = {
  sourceSystem: string | null;
  sourceType: string | null;
  stableKey: string | null;
  status: string | null;
  accessPolicy: string | null;
  publishedAt: string | null;
  workflowStatus?: string | null;
  publicReaderReleased?: boolean | null;
  approvedByStaff?: boolean | null;
  testClassification?: "test" | "production" | null;
  title?: string | null;
  slug?: string | null;
};

export type EligibilityDecision = { lane: ReaderLane; listed: boolean; bodyAllowed: boolean };

const WORDPRESS_POST_KEY = /^wordpress:post:[0-9]+$/;
const NATIVE_RELEASED_STATES = new Set(["Published", "Updated / Corrected"]);
const TEST_TITLE_MARKER = /^\s*\[(?:uat|test|fixture|qa)[^\]]*\]/i;
// Deliberately narrow: "test-kits-reach-rural-clinics" is real health news.
const TEST_SLUG_PREFIX = /^(?:uat(?:\d+[a-z]?)?-|fixture-|test-(?:story|article|post|fixture)\b)/i;

export function isSuspectedTestStory({ title, slug }: { title?: string | null; slug?: string | null }) {
  return TEST_TITLE_MARKER.test(title ?? "") || TEST_SLUG_PREFIX.test(slug ?? "");
}

const excluded = (lane: ReaderLane): EligibilityDecision => ({ lane, listed: false, bodyAllowed: false });

function isPublished(record: EditorialRecord, now: number) {
  const status = (record.status ?? "").toLowerCase();
  if (status !== "publish" && status !== "published") return false;
  return !record.publishedAt || Date.parse(record.publishedAt) <= now;
}

export function readerEligibility(record: EditorialRecord, now: number = Date.now()): EligibilityDecision {
  if (record.testClassification === "test") return excluded("excluded-test");
  // Anything but an exact "public" keeps its body protected.
  const bodyAllowed = record.accessPolicy === "public";

  if (record.sourceSystem) {
    if (record.sourceSystem === "wordpress" && record.sourceType === "page") return excluded("excluded-page");
    if (record.sourceSystem !== "wordpress" || record.sourceType !== "post" || !WORDPRESS_POST_KEY.test(record.stableKey ?? "")) {
      return excluded("excluded-unknown-source");
    }
    return isPublished(record, now) ? { lane: "wordpress-post", listed: true, bodyAllowed } : excluded("excluded-unreleased");
  }

  if (record.testClassification !== "production" && isSuspectedTestStory(record)) return excluded("excluded-test");
  const released = record.publicReaderReleased === true && record.approvedByStaff === true &&
    NATIVE_RELEASED_STATES.has(record.workflowStatus ?? "") && isPublished(record, now);
  return released ? { lane: "native-newsroom", listed: true, bodyAllowed } : excluded("excluded-unreleased");
}
