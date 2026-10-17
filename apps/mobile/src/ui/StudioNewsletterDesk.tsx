import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import {
  NEWSROOM_CAMPAIGN_PURPOSES,
  NEWSROOM_CAMPAIGN_STATUSES,
  validateCampaignCreateInput,
  type NewsroomCampaign,
  type NewsroomCampaignCreateInput,
  type NewsroomCampaignPrepareSendResult,
  type NewsroomCampaignPurpose,
  type NewsroomCampaignStatus,
  type NewsroomContactSegment,
  type NewsroomSegmentSyncState
} from "../domain/models";
import {
  hasNewsletterDeskAccess,
  hasServerCapability,
  type AuthorizationSnapshot
} from "../security/capabilities";
import { services } from "../services";
import { breakpoints, colors, radius, spacing } from "../theme/tokens";

export interface NewsletterDeskCapabilityMatrix {
  hasDeskAccess: boolean;
  canCreate: boolean;
  canApprove: boolean;
  canSend: boolean;
  canViewAnalytics: boolean;
}

export function resolveNewsletterDeskCapabilityState(
  snapshot: AuthorizationSnapshot | null | undefined
): NewsletterDeskCapabilityMatrix {
  if (
    !snapshot ||
    snapshot.status !== "authorized" ||
    snapshot.source !== "server"
  ) {
    return {
      hasDeskAccess: false,
      canCreate: false,
      canApprove: false,
      canSend: false,
      canViewAnalytics: false
    };
  }

  return {
    hasDeskAccess: hasNewsletterDeskAccess(snapshot),
    canCreate: hasServerCapability(snapshot, "marketing.create"),
    canApprove: hasServerCapability(snapshot, "marketing.approve"),
    canSend: hasServerCapability(snapshot, "marketing.send"),
    canViewAnalytics: hasServerCapability(snapshot, "marketing.analytics")
  };
}

export function sanitizeHtmlForBoundedPreview(
  rawHtml: string | null | undefined
): string {
  if (!rawHtml || typeof rawHtml !== "string") return "";
  return rawHtml
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(p|div|h1|h2|h3|h4|li|tr|section|article|header|footer)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (isNaN(parsed.getTime())) return "—";
  return parsed.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function formatPurposeLabel(purpose: NewsroomCampaignPurpose): string {
  switch (purpose) {
    case "NEWSLETTER":
      return "Newsletter";
    case "BREAKING_NEWS":
      return "Breaking News";
    case "MARKETING":
      return "Marketing";
    case "RESEARCH_UPDATES":
      return "Research Updates";
    case "EVENTS":
      return "Events";
    case "PARTNER_CONTENT":
      return "Partner Content";
    default:
      return purpose;
  }
}

function campaignStatusBadgeTone(status: NewsroomCampaignStatus): {
  bg: string;
  fg: string;
  border: string;
  label: string;
} {
  switch (status) {
    case "draft":
      return {
        bg: "#F8FAFC",
        fg: "#334155",
        border: "#CBD5E1",
        label: "DRAFT"
      };
    case "approved":
      return {
        bg: "#EFF6FF",
        fg: "#1D4ED8",
        border: "#BFDBFE",
        label: "APPROVED"
      };
    case "scheduled":
      return {
        bg: "#F5F3FF",
        fg: "#6D28D9",
        border: "#DDD6FE",
        label: "SCHEDULED"
      };
    case "sending":
      return {
        bg: "#FEF3C7",
        fg: "#B45309",
        border: "#FDE68A",
        label: "SENDING"
      };
    case "sent":
      return {
        bg: "#ECFDF5",
        fg: "#047857",
        border: "#A7F3D0",
        label: "SENT"
      };
    case "failed":
      return {
        bg: "#FEF2F2",
        fg: "#B91C1C",
        border: "#FECACA",
        label: "FAILED"
      };
    case "cancelled":
      return {
        bg: "#F1F5F9",
        fg: "#64748B",
        border: "#E2E8F0",
        label: "CANCELLED"
      };
  }
}

function segmentSyncBadgeTone(syncState: NewsroomSegmentSyncState): {
  bg: string;
  fg: string;
  border: string;
  label: string;
} {
  switch (syncState) {
    case "synced":
      return {
        bg: "#ECFDF5",
        fg: "#047857",
        border: "#A7F3D0",
        label: "BREVO SYNCED"
      };
    case "pending":
      return {
        bg: "#FEF3C7",
        fg: "#B45309",
        border: "#FDE68A",
        label: "SYNC PENDING"
      };
    case "failed":
      return {
        bg: "#FEF2F2",
        fg: "#B91C1C",
        border: "#FECACA",
        label: "SYNC FAILED"
      };
    case "not_configured":
      return {
        bg: "#F8FAFC",
        fg: "#475569",
        border: "#CBD5E1",
        label: "NOT CONFIGURED"
      };
  }
}

export interface StudioNewsletterDeskViewProps {
  campaigns: NewsroomCampaign[];
  segments: NewsroomContactSegment[];
  selectedCampaignId: string | null;
  onSelectCampaign: (campaignId: string) => void;
  statusFilter: NewsroomCampaignStatus | "all";
  onChangeStatusFilter: (status: NewsroomCampaignStatus | "all") => void;
  purposeFilter: NewsroomCampaignPurpose | "all";
  onChangePurposeFilter: (purpose: NewsroomCampaignPurpose | "all") => void;
  searchQuery?: string;
  onChangeSearchQuery?: (query: string) => void;
  capabilities: {
    canCreate: boolean;
    canApprove: boolean;
    canSend: boolean;
    canViewAnalytics: boolean;
  };
  previewMode?: boolean;
  loading?: boolean;
  error?: string | null;
  feedbackMessage?: string | null;
  actionErrorMessage?: string | null;
  preparedHandoff?: NewsroomCampaignPrepareSendResult | null;
  initialComposerOpen?: boolean;
  onCreateCampaign?: (input: NewsroomCampaignCreateInput) => Promise<void> | void;
  onApproveCampaign?: (campaignId: string) => Promise<void> | void;
  onPrepareSend?: (campaignId: string) => Promise<void> | void;
  onRefresh?: () => void;
}

export function StudioNewsletterDeskView({
  campaigns,
  segments,
  selectedCampaignId,
  onSelectCampaign,
  statusFilter,
  onChangeStatusFilter,
  purposeFilter,
  onChangePurposeFilter,
  searchQuery = "",
  onChangeSearchQuery,
  capabilities,
  previewMode = false,
  loading = false,
  error = null,
  feedbackMessage = null,
  actionErrorMessage = null,
  preparedHandoff = null,
  initialComposerOpen = false,
  onCreateCampaign,
  onApproveCampaign,
  onPrepareSend,
  onRefresh
}: StudioNewsletterDeskViewProps) {
  const { width } = useWindowDimensions();
  const [responsiveReady, setResponsiveReady] = useState(Platform.OS !== "web");
  useEffect(() => {
    if (Platform.OS === "web") setResponsiveReady(true);
  }, []);
  const isWide = (responsiveReady ? width : 1280) >= breakpoints.desktop;

  const [composerOpen, setComposerOpen] = useState(initialComposerOpen);
  const [composerName, setComposerName] = useState("");
  const [composerPurpose, setComposerPurpose] =
    useState<NewsroomCampaignPurpose>("NEWSLETTER");
  const [composerSegmentId, setComposerSegmentId] = useState<string>(
    segments[0]?.id ?? ""
  );
  const [composerSubject, setComposerSubject] = useState("");
  const [composerTextContent, setComposerTextContent] = useState("");
  const [composerHtmlContent, setComposerHtmlContent] = useState("");
  const [composerValidationError, setComposerValidationError] = useState<
    string | null
  >(null);
  const [submittingAction, setSubmittingAction] = useState<
    "create" | "approve" | "send" | null
  >(null);
  const [previewTab, setPreviewTab] = useState<"rendered" | "text" | "html">(
    "rendered"
  );

  useEffect(() => {
    if (!composerSegmentId && segments.length > 0 && segments[0]?.id) {
      setComposerSegmentId(segments[0].id);
    }
  }, [segments, composerSegmentId]);

  const segmentMap = useMemo(() => {
    const map = new Map<string, NewsroomContactSegment>();
    for (const seg of segments) {
      map.set(seg.id, seg);
    }
    return map;
  }, [segments]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      if (statusFilter !== "all" && campaign.status !== statusFilter) {
        return false;
      }
      if (purposeFilter !== "all" && campaign.purpose !== purposeFilter) {
        return false;
      }
      if (searchQuery && searchQuery.trim().length > 0) {
        const queryLower = searchQuery.trim().toLowerCase();
        if (!campaign.name.toLowerCase().includes(queryLower)) {
          return false;
        }
      }
      return true;
    });
  }, [campaigns, statusFilter, purposeFilter, searchQuery]);

  const selectedCampaign = useMemo(() => {
    if (!selectedCampaignId) return filteredCampaigns[0] ?? null;
    return (
      filteredCampaigns.find((c) => c.id === selectedCampaignId) ??
      campaigns.find((c) => c.id === selectedCampaignId) ??
      filteredCampaigns[0] ??
      null
    );
  }, [campaigns, filteredCampaigns, selectedCampaignId]);

  const selectedSegment = useMemo(() => {
    if (!selectedCampaign?.segmentId) return null;
    return segmentMap.get(selectedCampaign.segmentId) ?? null;
  }, [selectedCampaign, segmentMap]);

  const statusCounts = useMemo(() => {
    const counts = {
      total: campaigns.length,
      draft: 0,
      approved: 0,
      sending: 0,
      sent: 0,
      failed: 0
    };
    for (const c of campaigns) {
      if (c.status === "draft") counts.draft += 1;
      else if (c.status === "approved") counts.approved += 1;
      else if (c.status === "sending") counts.sending += 1;
      else if (c.status === "sent") counts.sent += 1;
      else if (c.status === "failed") counts.failed += 1;
    }
    return counts;
  }, [campaigns]);

  const syncedSegmentCount = useMemo(
    () => segments.filter((s) => s.syncState === "synced").length,
    [segments]
  );

  const handleCreateSubmit = async () => {
    setComposerValidationError(null);
    if (segments.length === 0) {
      setComposerValidationError(
        "No canonical audience segments are configured."
      );
      return;
    }

    const payload: NewsroomCampaignCreateInput = {
      name: composerName.trim(),
      purpose: composerPurpose,
      subject: composerSubject.trim(),
      textContent: composerTextContent.trim() || null,
      htmlContent: composerHtmlContent.trim() || null,
      segmentId: composerSegmentId.trim()
    };

    const validation = validateCampaignCreateInput(payload);
    if (!validation.valid) {
      setComposerValidationError(
        validation.error || "Invalid campaign create input."
      );
      return;
    }

    if (!onCreateCampaign) return;
    try {
      setSubmittingAction("create");
      await onCreateCampaign(payload);
      setComposerName("");
      setComposerSubject("");
      setComposerTextContent("");
      setComposerHtmlContent("");
      setComposerOpen(false);
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleApprove = async (campaignId: string) => {
    if (!onApproveCampaign) return;
    try {
      setSubmittingAction("approve");
      await onApproveCampaign(campaignId);
    } finally {
      setSubmittingAction(null);
    }
  };

  const handlePrepareSend = async (campaignId: string) => {
    if (!onPrepareSend) return;
    try {
      setSubmittingAction("send");
      await onPrepareSend(campaignId);
    } finally {
      setSubmittingAction(null);
    }
  };

  const activeHandoff =
    preparedHandoff &&
    selectedCampaign &&
    preparedHandoff.campaignId === selectedCampaign.id
      ? preparedHandoff
      : null;

  return (
    <View style={styles.root} testID="studio-newsletter-desk-view">
      {/* Header & Capability Bar */}
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.eyebrow}>
              HT-NR-06B • CANONICAL NEWSLETTER & CAMPAIGN DESK
            </Text>
            <Text style={styles.headerTitle}>
              Newsletter & Consented Campaign Control Plane
            </Text>
            <Text style={styles.headerDescription}>
              Compose editorial newsletters, record human approval, and prepare
              consented Brevo send handoffs without exposing subscriber emails or
              direct provider credentials.
            </Text>
          </View>
          <View style={styles.headerActions}>
            {onRefresh && (
              <Pressable
                style={styles.secondaryButton}
                onPress={onRefresh}
                accessibilityRole="button"
                testID="newsletter-refresh-button"
              >
                <Text style={styles.secondaryButtonText}>Refresh Registry</Text>
              </Pressable>
            )}
            {capabilities.canCreate && (
              <Pressable
                style={[
                  styles.primaryButton,
                  composerOpen && styles.primaryButtonActive
                ]}
                onPress={() => {
                  setComposerValidationError(null);
                  setComposerOpen((prev) => !prev);
                }}
                accessibilityRole="button"
                testID="newsletter-toggle-composer-button"
              >
                <Text style={styles.primaryButtonText}>
                  {composerOpen ? "Close Composer" : "New Campaign Draft"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.capabilityBar}>
          <Text style={styles.capabilityBarLabel}>SERVER AUTHORITY:</Text>
          <View
            style={[
              styles.capPill,
              capabilities.canCreate ? styles.capPillActive : styles.capPillMuted
            ]}
          >
            <Text
              style={
                capabilities.canCreate
                  ? styles.capPillTextActive
                  : styles.capPillTextMuted
              }
            >
              marketing.create: {capabilities.canCreate ? "GRANTED" : "DENIED"}
            </Text>
          </View>
          <View
            style={[
              styles.capPill,
              capabilities.canApprove
                ? styles.capPillActive
                : styles.capPillMuted
            ]}
          >
            <Text
              style={
                capabilities.canApprove
                  ? styles.capPillTextActive
                  : styles.capPillTextMuted
              }
            >
              marketing.approve:{" "}
              {capabilities.canApprove ? "GRANTED" : "DENIED"}
            </Text>
          </View>
          <View
            style={[
              styles.capPill,
              capabilities.canSend ? styles.capPillActive : styles.capPillMuted
            ]}
          >
            <Text
              style={
                capabilities.canSend
                  ? styles.capPillTextActive
                  : styles.capPillTextMuted
              }
            >
              marketing.send: {capabilities.canSend ? "GRANTED" : "DENIED"}
            </Text>
          </View>
          <View
            style={[
              styles.capPill,
              capabilities.canViewAnalytics
                ? styles.capPillActive
                : styles.capPillMuted
            ]}
          >
            <Text
              style={
                capabilities.canViewAnalytics
                  ? styles.capPillTextActive
                  : styles.capPillTextMuted
              }
            >
              marketing.analytics:{" "}
              {capabilities.canViewAnalytics ? "GRANTED" : "DENIED"}
            </Text>
          </View>
          <View style={styles.privacyGuardBadge}>
            <Text style={styles.privacyGuardText}>
              RECIPIENT PRIVACY: AGGREGATE ELIGIBILITY ONLY · ZERO RECIPIENT IDENTITY EXPOSURE
            </Text>
          </View>
        </View>

        {/* Summary Counters */}
        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{statusCounts.total}</Text>
            <Text style={styles.metricLabel}>Loaded Results</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{statusCounts.draft}</Text>
            <Text style={styles.metricLabel}>Draft in Results</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{statusCounts.approved}</Text>
            <Text style={styles.metricLabel}>Approved in Results</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{statusCounts.sent}</Text>
            <Text style={styles.metricLabel}>Sent in Results</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{statusCounts.failed}</Text>
            <Text style={styles.metricLabel}>Failed in Results</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>
              {syncedSegmentCount} / {segments.length}
            </Text>
            <Text style={styles.metricLabel}>Brevo Synced Segments</Text>
          </View>
        </View>

        {/* Result Window Disclosure */}
        <View style={styles.disclosureRow} testID="newsletter-desk-disclosure">
          <Text style={styles.disclosureText}>
            Showing up to 100 server-matched campaigns.
            {Boolean(
              (searchQuery && searchQuery.trim()) ||
                statusFilter !== "all" ||
                purposeFilter !== "all"
            ) && " Displayed metrics describe the current query result set."}
          </Text>
        </View>
      </View>

      {/* Operational Feedback / Error Banners */}
      {error && (
        <View style={styles.errorBanner} testID="newsletter-query-error-banner">
          <Text style={styles.errorBannerTitle}>
            CANONICAL CAMPAIGN REGISTRY ERROR
          </Text>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {actionErrorMessage && (
        <View
          style={styles.errorBanner}
          testID="newsletter-action-error-banner"
        >
          <Text style={styles.errorBannerTitle}>
            SERVER AUTHORITY / HANDOFF REJECTED
          </Text>
          <Text style={styles.errorBannerText}>{actionErrorMessage}</Text>
        </View>
      )}

      {feedbackMessage && (
        <View
          style={styles.feedbackBanner}
          testID="newsletter-feedback-banner"
        >
          <Text style={styles.feedbackBannerText}>{feedbackMessage}</Text>
        </View>
      )}

      {/* Prepared Send Handoff Eligibility Summary Banner */}
      {activeHandoff && (
        <View
          style={styles.handoffCard}
          testID="newsletter-prepare-send-handoff-card"
        >
          <View style={styles.handoffHeaderRow}>
            <View>
              <Text style={styles.handoffEyebrow}>
                CONSENTED SEND PREPARATION HANDOFF • BACKEND WORKER AUTHORITY
              </Text>
              <Text style={styles.handoffTitle}>Send handoff prepared.</Text>
              <Text style={styles.handoffSubtitle}>
                Campaign &ldquo;{activeHandoff.name}&rdquo; ({activeHandoff.purpose}
                ) is evaluated for Brevo list{" "}
                <Text style={styles.monoStrong}>{activeHandoff.brevoListId}</Text>
                . Provider execution and completion recording remain
                service-role controlled.
              </Text>
            </View>
            <View style={styles.handoffStatusPill}>
              <Text style={styles.handoffStatusPillText}>
                HANDOFF READY • NOT YET SENT
              </Text>
            </View>
          </View>

          <View style={styles.eligibilityGrid}>
            <View
              style={styles.eligibilityCardEligible}
              testID="newsletter-eligibility-eligible"
            >
              <Text style={styles.eligibilityLabel}>Eligible</Text>
              <Text style={styles.eligibilityValueEligible}>
                {activeHandoff.eligibleCount}
              </Text>
              <Text style={styles.eligibilityCaption}>
                Explicitly consented &amp; unsuppressed
              </Text>
            </View>
            <View
              style={styles.eligibilityCardNeutral}
              testID="newsletter-eligibility-no-consent"
            >
              <Text style={styles.eligibilityLabel}>No consent</Text>
              <Text style={styles.eligibilityValueNeutral}>
                {activeHandoff.noConsentCount}
              </Text>
              <Text style={styles.eligibilityCaption}>
                Excluded (no active purpose grant)
              </Text>
            </View>
            <View
              style={styles.eligibilityCardWarning}
              testID="newsletter-eligibility-suppressed"
            >
              <Text style={styles.eligibilityLabel}>Suppressed</Text>
              <Text style={styles.eligibilityValueWarning}>
                {activeHandoff.suppressedCount}
              </Text>
              <Text style={styles.eligibilityCaption}>
                Excluded (unsubscribe / bounce / policy)
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* New Campaign Composer */}
      {composerOpen && capabilities.canCreate && (
        <View
          style={styles.composerCard}
          testID="newsletter-campaign-composer"
        >
          <View style={styles.composerHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>
                CREATE CAMPAIGN DRAFT • RPC communications_create_campaign
              </Text>
              <Text style={styles.sectionTitle}>New Newsletter / Campaign</Text>
            </View>
            <Text style={styles.composerNotice}>
              New campaigns enter canonical status &ldquo;draft&rdquo; and
              require separate human approval before send preparation.
            </Text>
          </View>

          {segments.length === 0 && (
            <View
              style={styles.noSegmentsWarning}
              testID="newsletter-no-segments-warning"
            >
              <Text style={styles.noSegmentsWarningTitle}>
                No canonical audience segments are configured.
              </Text>
              <Text style={styles.noSegmentsWarningBody}>
                Campaign creation requires a canonical contact segment in
                public.contact_segments. Create Campaign submission is disabled
                until an audience segment is provisioned.
              </Text>
            </View>
          )}

          {composerValidationError && (
            <View style={styles.composerErrorBox}>
              <Text style={styles.composerErrorText}>
                {composerValidationError}
              </Text>
            </View>
          )}

          <View style={styles.formGrid}>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Campaign Name *</Text>
              <TextInput
                style={styles.textInput}
                value={composerName}
                onChangeText={setComposerName}
                placeholder="e.g. Harare Public Health Morning Briefing — Weekly Digest"
                placeholderTextColor={colors.inkMuted}
                testID="composer-name-input"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Consent Purpose *</Text>
              <View style={styles.pillGroup}>
                {NEWSROOM_CAMPAIGN_PURPOSES.map((purpose) => {
                  const selected = composerPurpose === purpose;
                  return (
                    <Pressable
                      key={purpose}
                      style={[
                        styles.filterPill,
                        selected && styles.filterPillActive
                      ]}
                      onPress={() => setComposerPurpose(purpose)}
                      accessibilityRole="button"
                      testID={`composer-purpose-${purpose}`}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          selected && styles.filterPillTextActive
                        ]}
                      >
                        {purpose}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Canonical Audience Segment *</Text>
              {segments.length === 0 ? (
                <Text style={styles.emptyInlineText}>
                  No canonical audience segments are configured.
                </Text>
              ) : (
                <View style={styles.segmentSelectGrid}>
                  {segments.map((segment) => {
                    const selected = composerSegmentId === segment.id;
                    const syncBadge = segmentSyncBadgeTone(segment.syncState);
                    return (
                      <Pressable
                        key={segment.id}
                        style={[
                          styles.segmentOptionCard,
                          selected && styles.segmentOptionCardSelected
                        ]}
                        onPress={() => setComposerSegmentId(segment.id)}
                        accessibilityRole="button"
                        testID={`composer-segment-${segment.key}`}
                      >
                        <View style={styles.segmentOptionTop}>
                          <Text style={styles.segmentOptionName}>
                            {segment.name}
                          </Text>
                          <View
                            style={[
                              styles.badge,
                              {
                                backgroundColor: syncBadge.bg,
                                borderColor: syncBadge.border
                              }
                            ]}
                          >
                            <Text
                              style={[styles.badgeText, { color: syncBadge.fg }]}
                            >
                              {syncBadge.label}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.segmentOptionMeta}>
                          Key: {segment.key} • List ID:{" "}
                          {segment.providerSegmentId ?? "Unassigned"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Email Subject Line *</Text>
              <TextInput
                style={styles.textInput}
                value={composerSubject}
                onChangeText={setComposerSubject}
                placeholder="e.g. Zimbabwe Maternal & Cholera Surveillance Update: Key Clinical Briefings"
                placeholderTextColor={colors.inkMuted}
                testID="composer-subject-input"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>
                Plain-Text Editorial Body (Required if HTML empty)
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={composerTextContent}
                onChangeText={setComposerTextContent}
                placeholder="Plain-text edition summary for accessible and low-bandwidth readers..."
                placeholderTextColor={colors.inkMuted}
                multiline
                testID="composer-text-input"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>
                HTML Editorial Markup (Optional if plain text provided; min 11
                chars if used)
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea, styles.monoInput]}
                value={composerHtmlContent}
                onChangeText={setComposerHtmlContent}
                placeholder="<article><h1>HealthTimes Weekly Briefing</h1><p>Lead dispatch...</p></article>"
                placeholderTextColor={colors.inkMuted}
                multiline
                testID="composer-html-input"
              />
            </View>
          </View>

          <View style={styles.composerFooter}>
            {previewMode && (
              <Text style={styles.previewDisabledNote}>
                Owner Preview mode: sample state only — server writes disabled.
              </Text>
            )}
            <Pressable
              style={[
                styles.primaryButton,
                (segments.length === 0 || submittingAction === "create") &&
                  styles.buttonDisabled
              ]}
              disabled={segments.length === 0 || submittingAction === "create"}
              onPress={handleCreateSubmit}
              accessibilityRole="button"
              testID="composer-submit-create-campaign"
            >
              <Text style={styles.primaryButtonText}>
                {submittingAction === "create"
                  ? "Creating Draft..."
                  : "Create Campaign"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Audience Segment Readiness Strip */}
      <View
        style={styles.segmentStripCard}
        testID="newsletter-segment-readiness-panel"
      >
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionEyebrow}>
              CANONICAL CONTACT SEGMENTS • BREVO SYNCHRONIZATION STATE
            </Text>
            <Text style={styles.sectionTitle}>Audience Segment Readiness</Text>
          </View>
          <Text style={styles.sectionMetaText}>
            {segments.length === 0
              ? "No canonical audience segments are configured."
              : `${segments.length} configured segment${segments.length === 1 ? "" : "s"}`}
          </Text>
        </View>

        {segments.length === 0 ? (
          <View style={styles.emptySegmentBox}>
            <Text style={styles.emptySegmentTitle}>
              No canonical audience segments are configured.
            </Text>
            <Text style={styles.emptySegmentSubtitle}>
              Staging currently contains 0 rows in public.contact_segments.
              Create Campaign submission remains disabled until a canonical
              segment exists.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.segmentCardsRow}
          >
            {segments.map((seg) => {
              const badge = segmentSyncBadgeTone(seg.syncState);
              return (
                <View
                  key={seg.id}
                  style={styles.segmentCard}
                  testID={`segment-readiness-card-${seg.key}`}
                >
                  <View style={styles.segmentCardHeader}>
                    <Text style={styles.segmentCardName}>{seg.name}</Text>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: badge.bg,
                          borderColor: badge.border
                        }
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: badge.fg }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.segmentCardKey}>Key: {seg.key}</Text>
                  <Text style={styles.segmentCardDetail}>
                    Provider: {seg.provider ?? "unassigned"} • Brevo List:{" "}
                    {seg.providerSegmentId ?? "Not linked"}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Filters Bar */}
      <View style={styles.filterCard}>
        <View style={styles.searchGroup}>
          <Text style={styles.filterLabel}>Search campaign names</Text>
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search campaign names…"
              accessibilityLabel="Search campaign names"
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={onChangeSearchQuery}
              maxLength={80}
              autoCapitalize="none"
              autoCorrect={false}
              testID="newsletter-search-input"
            />
            {Boolean(searchQuery && searchQuery.length > 0) && (
              <Pressable
                onPress={() => onChangeSearchQuery?.("")}
                style={styles.clearSearchBtn}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                testID="newsletter-clear-search-button"
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>STATUS FILTER:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillGroup}
          >
            {(["all", ...NEWSROOM_CAMPAIGN_STATUSES] as const).map((st) => {
              const active = statusFilter === st;
              return (
                <Pressable
                  key={st}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => onChangeStatusFilter(st)}
                  accessibilityRole="button"
                  testID={`filter-status-${st}`}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      active && styles.filterPillTextActive
                    ]}
                  >
                    {st === "all" ? "ALL STATUSES" : st.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>PURPOSE FILTER:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillGroup}
          >
            {(["all", ...NEWSROOM_CAMPAIGN_PURPOSES] as const).map((purp) => {
              const active = purposeFilter === purp;
              return (
                <Pressable
                  key={purp}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => onChangePurposeFilter(purp)}
                  accessibilityRole="button"
                  testID={`filter-purpose-${purp}`}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      active && styles.filterPillTextActive
                    ]}
                  >
                    {purp === "all" ? "ALL PURPOSES" : purp}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Main Split Workspace: Campaign Registry + Campaign Inspector */}
      <View style={[styles.workspaceGrid, isWide && styles.workspaceGridWide]}>
        {/* Left Column: Campaign Registry */}
        <View style={[styles.registryColumn, isWide && styles.registryColumnWide]}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionEyebrow}>
                PUBLIC.AUDIENCE_CAMPAIGNS
              </Text>
              <Text style={styles.sectionTitle}>
                Campaign Registry ({filteredCampaigns.length})
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.emptyRegistryBox}>
              <Text style={styles.emptyRegistryTitle}>
                Loading canonical campaigns...
              </Text>
            </View>
          ) : filteredCampaigns.length === 0 ? (
            <View
              style={styles.emptyRegistryBox}
              testID="newsletter-empty-campaigns-state"
            >
              <Text style={styles.emptyRegistryTitle}>
                No audience campaigns match the current filter.
              </Text>
              <Text style={styles.emptyRegistrySubtitle}>
                {campaigns.length === 0
                  ? "Canonical table public.audience_campaigns currently has 0 rows. No mock campaigns or fabricated subscriber counts are displayed."
                  : "Adjust the status or purpose filter above to inspect other canonical campaigns."}
              </Text>
            </View>
          ) : (
            <View style={styles.campaignList}>
              {filteredCampaigns.map((campaign) => {
                const isSelected = selectedCampaign?.id === campaign.id;
                const statusBadge = campaignStatusBadgeTone(campaign.status);
                const seg = campaign.segmentId
                  ? segmentMap.get(campaign.segmentId)
                  : null;
                const segBadge = seg
                  ? segmentSyncBadgeTone(seg.syncState)
                  : null;

                return (
                  <Pressable
                    key={campaign.id}
                    style={[
                      styles.campaignRowCard,
                      isSelected && styles.campaignRowCardSelected
                    ]}
                    onPress={() => onSelectCampaign(campaign.id)}
                    accessibilityRole="button"
                    testID={`campaign-row-${campaign.id}`}
                  >
                    <View style={styles.campaignRowTop}>
                      <View style={styles.campaignRowBadges}>
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: statusBadge.bg,
                              borderColor: statusBadge.border
                            }
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              { color: statusBadge.fg }
                            ]}
                          >
                            {statusBadge.label}
                          </Text>
                        </View>
                        <View style={styles.purposePill}>
                          <Text style={styles.purposePillText}>
                            {campaign.purpose}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.campaignRowDate}>
                        {formatTimestamp(campaign.updatedAt)}
                      </Text>
                    </View>

                    <Text style={styles.campaignRowName}>{campaign.name}</Text>
                    <Text style={styles.campaignRowSubject}>
                      Subject: {campaign.subject}
                    </Text>

                    <View style={styles.campaignRowFooter}>
                      <Text style={styles.campaignRowSegment}>
                        Segment: {seg ? seg.name : "Unresolved segment"}
                      </Text>
                      {segBadge && (
                        <Text
                          style={[
                            styles.campaignRowSyncText,
                            { color: segBadge.fg }
                          ]}
                        >
                          {segBadge.label}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Right Column: Campaign Inspector & Governance Actions */}
        <View
          style={[styles.inspectorColumn, isWide && styles.inspectorColumnWide]}
          testID="newsletter-campaign-inspector"
        >
          {!selectedCampaign ? (
            <View style={styles.emptyInspectorBox}>
              <Text style={styles.sectionEyebrow}>CAMPAIGN INSPECTOR</Text>
              <Text style={styles.emptyRegistryTitle}>
                Select a campaign to inspect content, segment readiness, and
                lifecycle authority
              </Text>
              <Text style={styles.emptyRegistrySubtitle}>
                Editorial content preview, human approval, and consented send
                preparation appear here when a canonical campaign is selected.
              </Text>
            </View>
          ) : (
            <View style={styles.inspectorContent}>
              {(() => {
                const statusBadge = campaignStatusBadgeTone(
                  selectedCampaign.status
                );
                const segBadge = selectedSegment
                  ? segmentSyncBadgeTone(selectedSegment.syncState)
                  : null;
                const canApproveSelected =
                  capabilities.canApprove &&
                  selectedCampaign.status === "draft";
                const canPrepareSendSelected =
                  capabilities.canSend &&
                  selectedCampaign.status === "approved";

                return (
                  <>
                    <View style={styles.inspectorHeader}>
                      <View style={styles.campaignRowBadges}>
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: statusBadge.bg,
                              borderColor: statusBadge.border
                            }
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              { color: statusBadge.fg }
                            ]}
                          >
                            {statusBadge.label}
                          </Text>
                        </View>
                        <View style={styles.purposePill}>
                          <Text style={styles.purposePillText}>
                            {selectedCampaign.purpose} (
                            {formatPurposeLabel(selectedCampaign.purpose)})
                          </Text>
                        </View>
                        <View style={styles.purposePill}>
                          <Text style={styles.purposePillText}>
                            CHANNEL: {selectedCampaign.channel.toUpperCase()} •
                            PROVIDER: {selectedCampaign.provider.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.inspectorTitle}>
                        {selectedCampaign.name}
                      </Text>
                      <Text style={styles.inspectorSubject}>
                        Subject: {selectedCampaign.subject}
                      </Text>
                    </View>

                    {/* Segment & Lifecycle Metadata Grid */}
                    <View style={styles.metadataGrid}>
                      <View style={styles.metadataCell}>
                        <Text style={styles.metadataLabel}>
                          TARGET AUDIENCE SEGMENT
                        </Text>
                        <Text style={styles.metadataValue}>
                          {selectedSegment
                            ? `${selectedSegment.name} (${selectedSegment.key})`
                            : selectedCampaign.segmentId ?? "Missing segment"}
                        </Text>
                      </View>
                      <View style={styles.metadataCell}>
                        <Text style={styles.metadataLabel}>
                          BREVO SEGMENT SYNC
                        </Text>
                        <Text
                          style={[
                            styles.metadataValue,
                            segBadge ? { color: segBadge.fg } : null
                          ]}
                        >
                          {selectedSegment
                            ? `${selectedSegment.syncState.toUpperCase()} (${selectedSegment.providerSegmentId ?? "No list ID"})`
                            : "UNRESOLVED"}
                        </Text>
                      </View>
                      <View style={styles.metadataCell}>
                        <Text style={styles.metadataLabel}>APPROVED AT</Text>
                        <Text style={styles.metadataValue}>
                          {formatTimestamp(selectedCampaign.approvedAt)}
                        </Text>
                      </View>
                      <View style={styles.metadataCell}>
                        <Text style={styles.metadataLabel}>
                          PROVIDER SENT AT
                        </Text>
                        <Text style={styles.metadataValue}>
                          {formatTimestamp(selectedCampaign.sentAt)}
                        </Text>
                      </View>
                      <View style={styles.metadataCell}>
                        <Text style={styles.metadataLabel}>
                          PROVIDER CAMPAIGN ID
                        </Text>
                        <Text style={styles.metadataValue}>
                          {selectedCampaign.providerCampaignId ??
                            "Awaiting provider worker completion"}
                        </Text>
                      </View>
                      <View style={styles.metadataCell}>
                        <Text style={styles.metadataLabel}>LAST UPDATED</Text>
                        <Text style={styles.metadataValue}>
                          {formatTimestamp(selectedCampaign.updatedAt)}
                        </Text>
                      </View>
                    </View>

                    {/* Unsynced Segment Warning */}
                    {selectedSegment &&
                      selectedSegment.syncState !== "synced" && (
                        <View
                          style={styles.unsyncedSegmentBanner}
                          testID="inspector-unsynced-segment-warning"
                        >
                          <Text style={styles.unsyncedSegmentTitle}>
                            Brevo segment synchronization is not ready (
                            {selectedSegment.syncState})
                          </Text>
                          <Text style={styles.unsyncedSegmentBody}>
                            Segment &ldquo;{selectedSegment.name}&rdquo; is
                            currently in state &ldquo;
                            {selectedSegment.syncState}&rdquo;. Server RPC
                            communications_prepare_campaign_send requires a
                            synced Brevo list ID and consented unsuppressed
                            recipients before handoff succeeds.
                          </Text>
                        </View>
                      )}

                    {/* Governance Action Bar */}
                    <View
                      style={styles.governanceBar}
                      testID="inspector-governance-actions"
                    >
                      <View style={styles.governanceInfo}>
                        <Text style={styles.sectionEyebrow}>
                          LIFECYCLE GOVERNANCE • SEPARATE HUMAN APPROVAL &amp;
                          SEND PREPARATION
                        </Text>
                        <Text style={styles.governanceHint}>
                          {selectedCampaign.status === "draft"
                            ? "Draft campaign requires human approval (marketing.approve) before send preparation."
                            : selectedCampaign.status === "approved"
                              ? "Campaign is human-approved. Authorized senders (marketing.send) may execute Prepare Send."
                              : selectedCampaign.status === "sent"
                                ? "Campaign send was completed and recorded by backend service-role authority."
                                : selectedCampaign.status === "failed"
                                  ? "Provider execution reported failure via service-role completion authority."
                                  : `Campaign is currently in ${selectedCampaign.status} state.`}
                        </Text>
                      </View>

                      <View style={styles.governanceButtons}>
                        {canApproveSelected && (
                          <Pressable
                            style={[
                              styles.approveButton,
                              submittingAction === "approve" &&
                                styles.buttonDisabled
                            ]}
                            disabled={submittingAction === "approve"}
                            onPress={() => handleApprove(selectedCampaign.id)}
                            accessibilityRole="button"
                            testID="inspector-approve-campaign-button"
                          >
                            <Text style={styles.approveButtonText}>
                              {submittingAction === "approve"
                                ? "Approving..."
                                : "Approve Campaign"}
                            </Text>
                          </Pressable>
                        )}

                        {canPrepareSendSelected && (
                          <Pressable
                            style={[
                              styles.prepareSendButton,
                              submittingAction === "send" &&
                                styles.buttonDisabled
                            ]}
                            disabled={submittingAction === "send"}
                            onPress={() =>
                              handlePrepareSend(selectedCampaign.id)
                            }
                            accessibilityRole="button"
                            testID="inspector-prepare-send-button"
                          >
                            <Text style={styles.prepareSendButtonText}>
                              {submittingAction === "send"
                                ? "Preparing Handoff..."
                                : "Prepare Send"}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>

                    {/* Bounded Safe Content Preview */}
                    <View
                      style={styles.previewSection}
                      testID="inspector-content-preview"
                    >
                      <View style={styles.previewHeaderRow}>
                        <View>
                          <Text style={styles.sectionEyebrow}>
                            BOUNDED EDITORIAL PREVIEW • NO SCRIPT EXECUTION
                          </Text>
                          <Text style={styles.sectionTitle}>
                            Campaign Content Inspection
                          </Text>
                        </View>
                        <View style={styles.pillGroup}>
                          {(
                            [
                              ["rendered", "Sanitized Copy"],
                              ["text", "Plain Text"],
                              ["html", "HTML Source (Read-Only)"]
                            ] as const
                          ).map(([tabKey, label]) => {
                            const active = previewTab === tabKey;
                            return (
                              <Pressable
                                key={tabKey}
                                style={[
                                  styles.filterPill,
                                  active && styles.filterPillActive
                                ]}
                                onPress={() => setPreviewTab(tabKey)}
                                accessibilityRole="button"
                                testID={`preview-tab-${tabKey}`}
                              >
                                <Text
                                  style={[
                                    styles.filterPillText,
                                    active && styles.filterPillTextActive
                                  ]}
                                >
                                  {label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>

                      <View style={styles.previewSubjectBox}>
                        <Text style={styles.previewSubjectLabel}>SUBJECT:</Text>
                        <Text style={styles.previewSubjectValue}>
                          {selectedCampaign.subject}
                        </Text>
                      </View>

                      <View style={styles.previewBodyBox}>
                        {previewTab === "rendered" && (
                          <Text
                            style={styles.previewBodyText}
                            testID="preview-sanitized-copy"
                          >
                            {sanitizeHtmlForBoundedPreview(
                              selectedCampaign.htmlContent
                            ) ||
                              selectedCampaign.textContent ||
                              "No content body."}
                          </Text>
                        )}
                        {previewTab === "text" && (
                          <Text
                            style={styles.previewBodyText}
                            testID="preview-plain-text"
                          >
                            {selectedCampaign.textContent ||
                              "No plain-text body stored for this campaign."}
                          </Text>
                        )}
                        {previewTab === "html" && (
                          <Text
                            style={[styles.previewBodyText, styles.monoText]}
                            testID="preview-html-source"
                          >
                            {selectedCampaign.htmlContent ||
                              "No HTML source stored for this campaign."}
                          </Text>
                        )}
                      </View>
                    </View>
                  </>
                );
              })()}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export function StudioNewsletterDesk() {
  const [snapshot, setSnapshot] = useState<AuthorizationSnapshot | null>(null);
  const [campaigns, setCampaigns] = useState<NewsroomCampaign[]>([]);
  const [segments, setSegments] = useState<NewsroomContactSegment[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<
    NewsroomCampaignStatus | "all"
  >("all");
  const [purposeFilter, setPurposeFilter] = useState<
    NewsroomCampaignPurpose | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const requestSeqRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(
    null
  );
  const [preparedHandoff, setPreparedHandoff] =
    useState<NewsroomCampaignPrepareSendResult | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadWorkspace = useCallback(
    async (targetSearch = debouncedSearch) => {
      const currentSeq = ++requestSeqRef.current;
      setLoading(true);
      setError(null);
      try {
        const authSnap = await services.authorization.getSnapshot();
        if (currentSeq !== requestSeqRef.current) return;
        setSnapshot(authSnap);

        const capState = resolveNewsletterDeskCapabilityState(authSnap);
        if (!capState.hasDeskAccess) {
          setCampaigns([]);
          setSegments([]);
          setLoading(false);
          return;
        }

        const [loadedCampaigns, loadedSegments] = await Promise.all([
          services.newsroomCampaigns.listCampaigns({
            status: statusFilter === "all" ? undefined : statusFilter,
            purpose: purposeFilter === "all" ? undefined : purposeFilter,
            search: targetSearch.trim() ? targetSearch.trim() : undefined,
            limit: 100
          }),
          services.newsroomCampaigns.listSegments()
        ]);

        if (currentSeq !== requestSeqRef.current) return;

        setCampaigns(loadedCampaigns);
        setSegments(loadedSegments);
        setSelectedCampaignId((prev) => {
          if (prev && loadedCampaigns.some((c) => c.id === prev)) return prev;
          return loadedCampaigns[0]?.id ?? null;
        });
      } catch (err: any) {
        if (currentSeq !== requestSeqRef.current) return;
        setError(
          err?.message || "Failed to load canonical Newsletter Desk data."
        );
      } finally {
        if (currentSeq === requestSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [statusFilter, purposeFilter, debouncedSearch]
  );

  useEffect(() => {
    void loadWorkspace(debouncedSearch);
  }, [loadWorkspace, debouncedSearch]);

  const capabilityMatrix = useMemo(
    () => resolveNewsletterDeskCapabilityState(snapshot),
    [snapshot]
  );

  const handleCreateCampaign = useCallback(
    async (input: NewsroomCampaignCreateInput) => {
      setFeedbackMessage(null);
      setActionErrorMessage(null);
      try {
        const newId = await services.newsroomCampaigns.createCampaign(input);
        await loadWorkspace(debouncedSearch);
        setSelectedCampaignId(newId);
        setFeedbackMessage("Campaign draft created in canonical registry.");
      } catch (err: any) {
        setActionErrorMessage(
          err?.message || "Failed to create campaign draft."
        );
      }
    },
    [loadWorkspace, debouncedSearch]
  );

  const handleApproveCampaign = useCallback(
    async (campaignId: string) => {
      setFeedbackMessage(null);
      setActionErrorMessage(null);
      try {
        await services.newsroomCampaigns.approveCampaign(campaignId);
        await loadWorkspace(debouncedSearch);
        setSelectedCampaignId(campaignId);
        setFeedbackMessage(
          "Campaign approved. Ready for consented send preparation."
        );
      } catch (err: any) {
        setActionErrorMessage(err?.message || "Failed to approve campaign.");
      }
    },
    [loadWorkspace, debouncedSearch]
  );

  const handlePrepareSend = useCallback(
    async (campaignId: string) => {
      setFeedbackMessage(null);
      setActionErrorMessage(null);
      try {
        const result =
          await services.newsroomCampaigns.prepareSend(campaignId);
        setPreparedHandoff(result);
        setFeedbackMessage("Send handoff prepared.");
        await loadWorkspace(debouncedSearch);
        setSelectedCampaignId(campaignId);
      } catch (err: any) {
        setPreparedHandoff(null);
        setActionErrorMessage(
          err?.message || "Failed to prepare consented campaign send."
        );
      }
    },
    [loadWorkspace, debouncedSearch]
  );

  return (
    <StudioNewsletterDeskView
      campaigns={campaigns}
      segments={segments}
      selectedCampaignId={selectedCampaignId}
      onSelectCampaign={setSelectedCampaignId}
      statusFilter={statusFilter}
      onChangeStatusFilter={setStatusFilter}
      purposeFilter={purposeFilter}
      onChangePurposeFilter={setPurposeFilter}
      searchQuery={searchQuery}
      onChangeSearchQuery={setSearchQuery}
      capabilities={capabilityMatrix}
      loading={loading}
      error={error}
      feedbackMessage={feedbackMessage}
      actionErrorMessage={actionErrorMessage}
      preparedHandoff={preparedHandoff}
      onCreateCampaign={handleCreateCampaign}
      onApproveCampaign={handleApproveCampaign}
      onPrepareSend={handlePrepareSend}
      onRefresh={() => loadWorkspace(debouncedSearch)}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.lg,
    marginTop: spacing.md
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.md
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: spacing.md
  },
  headerTitleGroup: {
    flex: 1,
    minWidth: 260,
    gap: 4
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    color: colors.live
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.ink
  },
  headerDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkMuted
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  primaryButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.sm
  },
  primaryButtonActive: {
    backgroundColor: colors.live
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },
  secondaryButton: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.sm
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700"
  },
  buttonDisabled: {
    opacity: 0.48
  },
  capabilityBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  capabilityBarLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.inkMuted,
    marginRight: 4
  },
  capPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1
  },
  capPillActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0"
  },
  capPillMuted: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0"
  },
  capPillTextActive: {
    fontSize: 11,
    fontWeight: "800",
    color: "#047857"
  },
  capPillTextMuted: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B"
  },
  privacyGuardBadge: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  privacyGuardText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#1D4ED8",
    letterSpacing: 0.4
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  metricBox: {
    flex: 1,
    minWidth: 130,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 2
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.ink
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 4
  },
  errorBannerTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#991B1B",
    letterSpacing: 0.6
  },
  errorBannerText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#B91C1C",
    fontWeight: "600"
  },
  feedbackBanner: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: radius.md,
    padding: spacing.md
  },
  feedbackBannerText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#065F46"
  },
  handoffCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.md
  },
  handoffHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: spacing.md
  },
  handoffEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "#15803D"
  },
  handoffTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#14532D",
    marginTop: 2
  },
  handoffSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: "#166534",
    marginTop: 4,
    maxWidth: 740
  },
  monoStrong: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "900"
  },
  handoffStatusPill: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#4ADE80",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm
  },
  handoffStatusPillText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#15803D"
  },
  eligibilityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  eligibilityCardEligible: {
    flex: 1,
    minWidth: 170,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 2
  },
  eligibilityCardNeutral: {
    flex: 1,
    minWidth: 170,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 2
  },
  eligibilityCardWarning: {
    flex: 1,
    minWidth: 170,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 2
  },
  eligibilityLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.ink,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  eligibilityValueEligible: {
    fontSize: 24,
    fontWeight: "900",
    color: "#047857"
  },
  eligibilityValueNeutral: {
    fontSize: 24,
    fontWeight: "900",
    color: "#334155"
  },
  eligibilityValueWarning: {
    fontSize: 24,
    fontWeight: "900",
    color: "#B45309"
  },
  eligibilityCaption: {
    fontSize: 11,
    color: colors.inkMuted
  },
  composerCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.md
  },
  composerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  composerNotice: {
    fontSize: 12,
    color: colors.inkMuted,
    maxWidth: 420
  },
  noSegmentsWarning: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 4
  },
  noSegmentsWarningTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#92400E"
  },
  noSegmentsWarningBody: {
    fontSize: 12,
    lineHeight: 18,
    color: "#B45309"
  },
  composerErrorBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.sm,
    padding: spacing.md
  },
  composerErrorText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B91C1C"
  },
  formGrid: {
    gap: spacing.md
  },
  formField: {
    gap: 6
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.ink
  },
  textArea: {
    minHeight: 84,
    textAlignVertical: "top"
  },
  monoInput: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12
  },
  segmentSelectGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  segmentOptionCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 4
  },
  segmentOptionCardSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: colors.blue
  },
  segmentOptionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.xs
  },
  segmentOptionName: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink
  },
  segmentOptionMeta: {
    fontSize: 11,
    color: colors.inkMuted
  },
  composerFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  previewDisabledNote: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkMuted
  },
  segmentStripCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: colors.inkMuted
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.ink
  },
  sectionMetaText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkMuted
  },
  emptySegmentBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 4
  },
  emptySegmentTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink
  },
  emptySegmentSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkMuted
  },
  emptyInlineText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309"
  },
  segmentCardsRow: {
    gap: spacing.sm
  },
  segmentCard: {
    minWidth: 250,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 4
  },
  segmentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.xs
  },
  segmentCardName: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink
  },
  segmentCardKey: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted
  },
  segmentCardDetail: {
    fontSize: 11,
    color: colors.inkMuted
  },
  disclosureRow: {
    paddingHorizontal: 4,
    paddingTop: 4
  },
  disclosureText: {
    fontSize: 11,
    color: colors.inkMuted,
    fontStyle: "italic"
  },
  searchGroup: {
    gap: 6,
    marginBottom: spacing.xs
  },
  searchBox: {
    position: "relative",
    justifyContent: "center"
  },
  searchInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    paddingRight: 36,
    fontSize: 13,
    color: colors.ink
  },
  clearSearchBtn: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: [{ translateY: -10 }],
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center"
  },
  clearSearchText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted,
    lineHeight: 12
  },
  filterCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm
  },
  filterGroup: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.inkMuted,
    minWidth: 110
  },
  pillGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  filterPill: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm
  },
  filterPillActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.ink
  },
  filterPillTextActive: {
    color: "#FFFFFF"
  },
  workspaceGrid: {
    gap: spacing.lg
  },
  workspaceGridWide: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  registryColumn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md
  },
  registryColumnWide: {
    flex: 5
  },
  inspectorColumn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.md
  },
  inspectorColumnWide: {
    flex: 7
  },
  emptyRegistryBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.xl,
    gap: 6
  },
  emptyInspectorBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.xl,
    gap: 6
  },
  emptyRegistryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink
  },
  emptyRegistrySubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkMuted
  },
  campaignList: {
    gap: spacing.sm
  },
  campaignRowCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 6
  },
  campaignRowCardSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: colors.blue,
    borderWidth: 1.5
  },
  campaignRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  campaignRowBadges: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4
  },
  purposePill: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  purposePillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#334155"
  },
  campaignRowDate: {
    fontSize: 11,
    color: colors.inkMuted
  },
  campaignRowName: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.ink
  },
  campaignRowSubject: {
    fontSize: 12,
    color: colors.inkMuted
  },
  campaignRowFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2
  },
  campaignRowSegment: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink
  },
  campaignRowSyncText: {
    fontSize: 10,
    fontWeight: "900"
  },
  inspectorContent: {
    gap: spacing.lg
  },
  inspectorHeader: {
    gap: 6,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  inspectorTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.ink,
    marginTop: 4
  },
  inspectorSubject: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.inkMuted
  },
  metadataGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  metadataCell: {
    flex: 1,
    minWidth: 180,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 3
  },
  metadataLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.inkMuted,
    letterSpacing: 0.4
  },
  metadataValue: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink
  },
  unsyncedSegmentBanner: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 4
  },
  unsyncedSegmentTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#92400E"
  },
  unsyncedSegmentBody: {
    fontSize: 12,
    lineHeight: 18,
    color: "#B45309"
  },
  governanceBar: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.md
  },
  governanceInfo: {
    flex: 1,
    minWidth: 220,
    gap: 4
  },
  governanceHint: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkMuted
  },
  governanceButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  approveButton: {
    backgroundColor: "#1D4ED8",
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.sm
  },
  approveButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },
  prepareSendButton: {
    backgroundColor: "#047857",
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.sm
  },
  prepareSendButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },
  previewSection: {
    gap: spacing.sm
  },
  previewHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  previewSubjectBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  previewSubjectLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.inkMuted
  },
  previewSubjectValue: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink,
    flex: 1
  },
  previewBodyBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.lg,
    minHeight: 140
  },
  previewBodyText: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.ink
  },
  monoText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12
  }
});
