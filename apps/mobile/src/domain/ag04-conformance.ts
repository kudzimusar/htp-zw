import { AG03_SOURCE_READINESS } from "./source";

export type AG04ReaderRepositoryEvidence = {
  ag03AuthoritativeSourcePackageAccepted: boolean;
  rehearsalImportCertified: boolean;
  postPageReconciliationComplete: boolean;
  authorsReconciled: boolean;
  taxonomyReconciled: boolean;
  mediaReconciled: boolean;
  exceptionsLedgerCertified: boolean;
  canonicalStoryFieldsCertified: boolean;
  premiumMarkersReconciled: boolean;
  internalLinksReconciled: boolean;
  idempotentImportCertified: boolean;
  stableWordPressProvenanceCertified: boolean;
  storyGeographyRelationCertified: boolean;
  readerSafePublicReadPolicyCertified: boolean;
  premiumBodyAccessBoundaryCertified: boolean;
  readerProjectionConformanceCertified: boolean;
  unexplainedContentLossCount: number | null;
  unexplainedMediaLossCount: number | null;
  unexplainedBrokenInternalLinkCount: number | null;
};

export type AG04ReaderRepositoryBlockerCode =
  | "ag03-source-package-not-accepted"
  | "ag04-rehearsal-import-not-certified"
  | "post-page-reconciliation-incomplete"
  | "author-reconciliation-incomplete"
  | "taxonomy-reconciliation-incomplete"
  | "media-reconciliation-incomplete"
  | "exceptions-ledger-not-certified"
  | "canonical-story-fields-not-certified"
  | "premium-markers-not-reconciled"
  | "internal-links-not-reconciled"
  | "idempotent-import-not-certified"
  | "stable-wordpress-provenance-not-certified"
  | "story-geography-relation-not-certified"
  | "reader-safe-public-read-policy-not-certified"
  | "premium-body-boundary-not-certified"
  | "reader-projection-conformance-not-certified"
  | "unexplained-content-loss"
  | "unexplained-media-loss"
  | "unexplained-broken-internal-links";

export type AG04ReaderRepositoryBlocker = {
  code: AG04ReaderRepositoryBlockerCode;
  owner: "AG-03" | "AG-04" | "NM-03" | "NM-06";
  detail: string;
};

export type AG04ReaderRepositoryReadiness = {
  ready: boolean;
  status: "blocked" | "ready";
  blockers: AG04ReaderRepositoryBlocker[];
};

function pushIf(
  blockers: AG04ReaderRepositoryBlocker[],
  condition: boolean,
  blocker: AG04ReaderRepositoryBlocker
) {
  if (condition) blockers.push(blocker);
}

export function evaluateAG04ReaderRepositoryReadiness(
  evidence: AG04ReaderRepositoryEvidence
): AG04ReaderRepositoryReadiness {
  const blockers: AG04ReaderRepositoryBlocker[] = [];

  pushIf(blockers, !evidence.ag03AuthoritativeSourcePackageAccepted, {
    code: "ag03-source-package-not-accepted",
    owner: "AG-03",
    detail: "AG-03 has not accepted an authoritative database + uploads source package with provenance validation."
  });
  pushIf(blockers, !evidence.rehearsalImportCertified, {
    code: "ag04-rehearsal-import-not-certified",
    owner: "AG-04",
    detail: "No AG-04 staging rehearsal import has been certified."
  });
  pushIf(blockers, !evidence.postPageReconciliationComplete, {
    code: "post-page-reconciliation-incomplete",
    owner: "AG-04",
    detail: "Expected published posts/pages are not yet fully accounted for or exception-listed."
  });
  pushIf(blockers, !evidence.authorsReconciled, {
    code: "author-reconciliation-incomplete",
    owner: "AG-04",
    detail: "Authors/bylines are not yet fully mapped or exception-listed."
  });
  pushIf(blockers, !evidence.taxonomyReconciled, {
    code: "taxonomy-reconciliation-incomplete",
    owner: "AG-04",
    detail: "Legacy taxonomy provenance and approved canonical mapping are not yet certified."
  });
  pushIf(blockers, !evidence.mediaReconciled, {
    code: "media-reconciliation-incomplete",
    owner: "AG-04",
    detail: "Required media, storage rewrite and source/destination provenance are not yet certified."
  });
  pushIf(blockers, !evidence.exceptionsLedgerCertified, {
    code: "exceptions-ledger-not-certified",
    owner: "AG-04",
    detail: "Shortcode/custom-field and other migration exceptions are not yet certified complete."
  });
  pushIf(blockers, !evidence.canonicalStoryFieldsCertified, {
    code: "canonical-story-fields-not-certified",
    owner: "AG-04",
    detail: "Canonical URLs, slugs, publication/modified dates and Reader story fields are not yet certified."
  });
  pushIf(blockers, !evidence.premiumMarkersReconciled, {
    code: "premium-markers-not-reconciled",
    owner: "AG-04",
    detail: "Source Premium/access markers have not yet been reconciled as migration provenance."
  });
  pushIf(blockers, !evidence.internalLinksReconciled, {
    code: "internal-links-not-reconciled",
    owner: "AG-04",
    detail: "Migrated internal links have not yet passed reconciliation."
  });
  pushIf(blockers, !evidence.idempotentImportCertified, {
    code: "idempotent-import-not-certified",
    owner: "AG-04",
    detail: "Importer restart/idempotency has not yet been certified."
  });
  pushIf(blockers, !evidence.stableWordPressProvenanceCertified, {
    code: "stable-wordpress-provenance-not-certified",
    owner: "AG-04",
    detail: "Stable WordPress IDs, stable keys, checksums and source provenance are not yet certified end-to-end."
  });
  pushIf(blockers, !evidence.storyGeographyRelationCertified, {
    code: "story-geography-relation-not-certified",
    owner: "AG-04",
    detail: "No certified story-to-canonical-geography relation/query is available to the Reader repository."
  });
  pushIf(blockers, !evidence.readerSafePublicReadPolicyCertified, {
    code: "reader-safe-public-read-policy-not-certified",
    owner: "AG-04",
    detail: "Reader-safe public staging read policies for published content/media are not yet certified."
  });
  pushIf(blockers, !evidence.premiumBodyAccessBoundaryCertified, {
    code: "premium-body-boundary-not-certified",
    owner: "NM-06",
    detail: "The protected Premium-body access boundary is not yet certified for the migrated repository path."
  });
  pushIf(blockers, !evidence.readerProjectionConformanceCertified, {
    code: "reader-projection-conformance-not-certified",
    owner: "NM-03",
    detail: "The AG-04 repository projection has not yet passed the NM-03 ArticleDetail conformance suite."
  });
  pushIf(blockers, evidence.unexplainedContentLossCount !== 0, {
    code: "unexplained-content-loss",
    owner: "AG-04",
    detail:
      evidence.unexplainedContentLossCount === null
        ? "Content-loss reconciliation evidence is not yet certified."
        : `${evidence.unexplainedContentLossCount} unexplained content reconciliation difference(s) remain.`
  });
  pushIf(blockers, evidence.unexplainedMediaLossCount !== 0, {
    code: "unexplained-media-loss",
    owner: "AG-04",
    detail:
      evidence.unexplainedMediaLossCount === null
        ? "Media-loss reconciliation evidence is not yet certified."
        : `${evidence.unexplainedMediaLossCount} unexplained media reconciliation difference(s) remain.`
  });
  pushIf(blockers, evidence.unexplainedBrokenInternalLinkCount !== 0, {
    code: "unexplained-broken-internal-links",
    owner: "AG-04",
    detail:
      evidence.unexplainedBrokenInternalLinkCount === null
        ? "Broken-link reconciliation evidence is not yet certified."
        : `${evidence.unexplainedBrokenInternalLinkCount} unexplained broken internal link(s) remain.`
  });

  return {
    ready: blockers.length === 0,
    status: blockers.length === 0 ? "ready" : "blocked",
    blockers
  };
}

export const CURRENT_AG04_READER_REPOSITORY_EVIDENCE: AG04ReaderRepositoryEvidence = {
  ag03AuthoritativeSourcePackageAccepted: AG03_SOURCE_READINESS.status === "ready",
  rehearsalImportCertified: false,
  postPageReconciliationComplete: false,
  authorsReconciled: false,
  taxonomyReconciled: false,
  mediaReconciled: false,
  exceptionsLedgerCertified: false,
  canonicalStoryFieldsCertified: false,
  premiumMarkersReconciled: false,
  internalLinksReconciled: false,
  idempotentImportCertified: false,
  stableWordPressProvenanceCertified: false,
  storyGeographyRelationCertified: false,
  readerSafePublicReadPolicyCertified: false,
  premiumBodyAccessBoundaryCertified: false,
  readerProjectionConformanceCertified: false,
  unexplainedContentLossCount: null,
  unexplainedMediaLossCount: null,
  unexplainedBrokenInternalLinkCount: null
};

export const CURRENT_AG04_READER_REPOSITORY_READINESS =
  evaluateAG04ReaderRepositoryReadiness(CURRENT_AG04_READER_REPOSITORY_EVIDENCE);
