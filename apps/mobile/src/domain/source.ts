export type SourceSystem = "wordpress" | "healthtimes-native";

export type SourceReconciliationClassification =
  | "match"
  | "expected-source-drift"
  | "requires-review"
  | "missing-from-database"
  | "database-only";

export type SourceExceptionKind =
  | "unknown-shortcode"
  | "unmapped-custom-field"
  | "missing-media"
  | "author-unresolved"
  | "taxonomy-unresolved"
  | "premium-history-unresolved"
  | "commerce-history-unresolved"
  | "other";

export type SourceException = {
  kind: SourceExceptionKind;
  classification: SourceReconciliationClassification;
  field?: string;
  note?: string;
};

export type WordPressSourceIdentity = {
  postId?: string;
  authorId?: string;
  featuredMediaId?: string;
  categoryIds?: string[];
  tagIds?: string[];
  legacyPath?: string;
};

export type SourceProvenance = {
  system: SourceSystem;
  sourceId: string | null;
  stableKey: string | null;
  sourceUrl: string | null;
  checksum: string | null;
  capturedAt: string | null;
  wordpress?: WordPressSourceIdentity;
  exceptions: SourceException[];
};

export type ContentIntegrityState = "verified" | "requires-review" | "unknown";

export type PremiumSourceContext = {
  accessPolicy: "public" | "premium";
  legacyMembershipSignal:
    | "none"
    | "woocommerce-membership"
    | "woocommerce-subscription"
    | "wordpress-premium"
    | "unknown";
  providerReferencePresent: boolean;
  reconciliation: SourceReconciliationClassification | null;
};

export type CommercialSourceContext = {
  source:
    | "direct"
    | "adsense"
    | "ad-inserter"
    | "woocommerce"
    | "paynow"
    | "paypal"
    | "house"
    | "unknown";
  sourceReference: string | null;
  reconciliation: SourceReconciliationClassification | null;
};

export type GlobalGeographyLevel = "global" | "continent" | "region" | "country" | "subnational";

export type GeographyRef = {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  parentId: string | null;
  level: GlobalGeographyLevel;
  isoCountryCode: string | null;
};

export type TaxonomySnapshot = {
  editorialDesks: Array<{ id: string; name: string; slug: string; active: boolean }>;
  geographicZones: GeographyRef[];
  sections: Array<{ id: string; name: string; slug: string; parentId: string | null }>;
  topics: Array<{ id: string; name: string; slug: string }>;
};

export type SourceReadiness = {
  checkpoint: "AG-03";
  status: "blocked" | "ready";
  authoritativeDatabaseValidated: boolean;
  completeUploadsValidated: boolean;
  contentFrozen: boolean;
  reason: string;
};

export const AG03_SOURCE_READINESS: SourceReadiness = {
  checkpoint: "AG-03",
  status: "blocked",
  authoritativeDatabaseValidated: false,
  completeUploadsValidated: false,
  contentFrozen: false,
  reason:
    "Authoritative WordPress database export and complete wp-content/uploads archive have not been received and validated."
};
