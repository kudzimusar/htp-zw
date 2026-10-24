import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ViewStyle
} from "react-native";
import {
  NEWSROOM_PUSH_ALERT_CATEGORIES,
  NEWSROOM_PUSH_ALERT_STATUSES,
  NEWSROOM_PUSH_DISPATCH_STATUSES,
  SUPPORTED_PREVIEW_TIMEZONES,
  formatPreviewScheduleTimestamp,
  parseAndFormatPreviewSchedule,
  validatePushAlertCreateInput,
  validatePushAlertPatch,
  type NewsroomPushAlert,
  type NewsroomPushAlertCategory,
  type NewsroomPushAlertCreateInput,
  type NewsroomPushAlertPatch,
  type NewsroomPushAlertPrepareResult,
  type NewsroomPushAlertStatus,
  type NewsroomPushDispatch,
  type NewsroomPushDispatchResult,
  type NewsroomPushDispatchStatus
} from "../domain/models";
import {
  hasPushDeskAccess,
  hasServerCapability,
  type AuthorizationSnapshot
} from "../security/capabilities";
import { services } from "../services";
import { breakpoints, colors, radius, spacing } from "../theme/tokens";

const CATEGORY_STYLES: Record<NewsroomPushAlertCategory, ViewStyle> = {
  breaking: { backgroundColor: "#FEE2E2" },
  live: { backgroundColor: "#FEF3C7" },
  topic: { backgroundColor: "#E0F2FE" },
  premium: { backgroundColor: "#FEF3C7" },
  system: { backgroundColor: "#F1F5F9" }
};

const STATUS_STYLES: Record<NewsroomPushAlertStatus, ViewStyle> = {
  draft: { backgroundColor: "#F1F5F9" },
  approved: { backgroundColor: "#DCFCE7" },
  prepared: { backgroundColor: "#DBEAFE" }
};

const DISPATCH_STATUS_STYLES: Record<NewsroomPushDispatchStatus, ViewStyle> = {
  "dispatching": { backgroundColor: "#FEF3C7" },
  "provider-accepted": { backgroundColor: "#DCFCE7" },
  "partially-accepted": { backgroundColor: "#FEF3C7" },
  "provider-rejected": { backgroundColor: "#FEE2E2" },
  "delivery-failed": { backgroundColor: "#FEE2E2" },
  "zero-recipients": { backgroundColor: "#F1F5F9" }
};

export interface PushAlertDeskCapabilityMatrix {
  hasDeskAccess: boolean;
  canCreate: boolean;
  canSave: boolean;
  canApprove: boolean;
  canPrepare: boolean;
  canDispatch: boolean;
}

export function resolvePushAlertDeskCapabilityState(
  snapshot: AuthorizationSnapshot | null | undefined
): PushAlertDeskCapabilityMatrix {
  if (
    !snapshot ||
    snapshot.status !== "authorized" ||
    snapshot.source !== "server"
  ) {
    return {
      hasDeskAccess: false,
      canCreate: false,
      canSave: false,
      canApprove: false,
      canPrepare: false,
      canDispatch: false
    };
  }

  return {
    hasDeskAccess: hasPushDeskAccess(snapshot),
    canCreate: hasServerCapability(snapshot, "distribution.manage"),
    canSave: hasServerCapability(snapshot, "distribution.manage"),
    canApprove: hasServerCapability(snapshot, "story.publish"),
    canPrepare: hasServerCapability(snapshot, "story.publish"),
    canDispatch: hasServerCapability(snapshot, "story.publish")
  };
}

export function resolveActivePushAlertHandoff(
  preparedHandoff: NewsroomPushAlertPrepareResult | null,
  selectedAlert: NewsroomPushAlert | null
): NewsroomPushAlertPrepareResult | null {
  if (!preparedHandoff || !selectedAlert) return null;
  return preparedHandoff.alert_id === selectedAlert.id ? preparedHandoff : null;
}

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (isNaN(parsed.getTime())) return "—";
  return parsed.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function formatCategoryLabel(cat: NewsroomPushAlertCategory): string {
  switch (cat) {
    case "breaking":
      return "Breaking";
    case "live":
      return "Live";
    case "topic":
      return "Topic";
    case "premium":
      return "Premium";
    case "system":
      return "System";
    default:
      return cat;
  }
}

function formatStatusLabel(st: NewsroomPushAlertStatus): string {
  switch (st) {
    case "draft":
      return "Draft";
    case "approved":
      return "Approved";
    case "prepared":
      return "Prepared";
    default:
      return st;
  }
}

function formatDispatchStatusLabel(st: NewsroomPushDispatchStatus): string {
  switch (st) {
    case "dispatching":
      return "Dispatching";
    case "provider-accepted":
      return "Accepted by Provider";
    case "partially-accepted":
      return "Partially Accepted";
    case "provider-rejected":
      return "Rejected by Provider";
    case "delivery-failed":
      return "Delivery Failed";
    case "zero-recipients":
      return "Zero Recipients";
    default:
      return st;
  }
}

export interface StudioPushAlertDeskViewProps {
  alerts: NewsroomPushAlert[];
  selectedAlert: NewsroomPushAlert | null;
  onSelectAlert: (alert: NewsroomPushAlert | null) => void;
  searchQuery: string;
  onChangeSearchQuery: (query: string) => void;
  statusFilter: string;
  onChangeStatusFilter: (status: string) => void;
  categoryFilter: string;
  onChangeCategoryFilter: (category: string) => void;
  preparedHandoff: NewsroomPushAlertPrepareResult | null;
  dispatchRecord?: NewsroomPushDispatch | null;
  canCreate: boolean;
  canApprove: boolean;
  canDispatch?: boolean;
  onCreateAlert?: (input: NewsroomPushAlertCreateInput) => Promise<void>;
  onSaveAlert?: (id: string, patch: NewsroomPushAlertPatch) => Promise<void>;
  onApproveAlert?: (id: string) => Promise<void>;
  onPrepareAlert?: (id: string) => Promise<void>;
  onDispatchAlert?: (id: string) => Promise<void>;
  onOpenStory?: (storyId: string) => void;
  stories?: Array<{ id: string; title: string; slug?: string | null; status?: string }>;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  isOwnerPreview?: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
}

export function StudioPushAlertDeskView({
  alerts,
  selectedAlert,
  onSelectAlert,
  searchQuery,
  onChangeSearchQuery,
  statusFilter,
  onChangeStatusFilter,
  categoryFilter,
  onChangeCategoryFilter,
  preparedHandoff,
  dispatchRecord = null,
  canCreate,
  canApprove,
  canDispatch = false,
  onCreateAlert,
  onSaveAlert,
  onApproveAlert,
  onPrepareAlert,
  onDispatchAlert,
  onOpenStory,
  stories = [],
  loading = false,
  refreshing = false,
  onRefresh,
  isOwnerPreview = false,
  errorMessage = null,
  successMessage = null
}: StudioPushAlertDeskViewProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.tablet;

  // New alert composer modal state
  const [showComposer, setShowComposer] = useState(false);
  const [composerTitle, setComposerTitle] = useState("");
  const [composerBody, setComposerBody] = useState("");
  const [composerCategory, setComposerCategory] =
    useState<NewsroomPushAlertCategory>("breaking");
  const [composerDestination, setComposerDestination] = useState("");
  const [composerStoryId, setComposerStoryId] = useState("");
  const [composerTargetSegment, setComposerTargetSegment] =
    useState("All Registered Devices");
  const [composerConsentBasis, setComposerConsentBasis] = useState(
    "Strict Opt-In Readers Only (Push Enabled & Unsuppressed)"
  );
  const [composerPriority, setComposerPriority] = useState<"normal" | "high">(
    "normal"
  );
  const [composerScheduleDate, setComposerScheduleDate] = useState("");
  const [composerScheduleTime, setComposerScheduleTime] = useState("");
  const [composerTimezone, setComposerTimezone] = useState(
    "Africa/Harare (CAT, UTC+2)"
  );
  const [composerSubmitting, setComposerSubmitting] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  // Edit draft mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editCategory, setEditCategory] =
    useState<NewsroomPushAlertCategory>("breaking");
  const [editDestination, setEditDestination] = useState("");
  const [editStoryId, setEditStoryId] = useState("");
  const [editPriority, setEditPriority] = useState<"normal" | "high">("normal");
  const [editTargetSegment, setEditTargetSegment] =
    useState("All Registered Devices");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Dispatch irreversible execution state
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchConfirmed, setDispatchConfirmed] = useState(false);
  const [dispatchSubmitting, setDispatchSubmitting] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const handleOpenDispatchModal = () => {
    setDispatchConfirmed(false);
    setDispatchError(null);
    setShowDispatchModal(true);
  };

  const handleConfirmDispatch = async () => {
    if (!selectedAlert || !onDispatchAlert || !dispatchConfirmed) return;
    setDispatchSubmitting(true);
    setDispatchError(null);
    try {
      await onDispatchAlert(selectedAlert.id);
      setShowDispatchModal(false);
    } catch (err: any) {
      setDispatchError(err?.message || "Failed to execute push dispatch");
    } finally {
      setDispatchSubmitting(false);
    }
  };

  // Sync editing fields when selectedAlert changes
  useEffect(() => {
    if (selectedAlert) {
      setEditTitle(selectedAlert.title);
      setEditBody(selectedAlert.body);
      setEditCategory(selectedAlert.category);
      setEditDestination(selectedAlert.destination ?? "");
      setEditStoryId(selectedAlert.relatedStoryId ?? "");
      setEditPriority(
        (selectedAlert.priority as "normal" | "high") ?? "normal"
      );
      setEditTargetSegment(
        selectedAlert.targetSegment ?? "All Registered Devices"
      );
      setIsEditing(false);
      setEditError(null);
    }
  }, [selectedAlert]);

  // Active handoff strictly scoped to selected alert
  const activeHandoff = resolveActivePushAlertHandoff(
    preparedHandoff,
    selectedAlert
  );

  // Result metrics
  const loadedCount = alerts.length;
  const draftCount = alerts.filter((a) => a.status === "draft").length;
  const approvedCount = alerts.filter((a) => a.status === "approved").length;
  const preparedCount = alerts.filter((a) => a.status === "prepared").length;

  const handleOpenComposer = () => {
    setComposerTitle("");
    setComposerBody("");
    setComposerCategory("breaking");
    setComposerDestination("");
    setComposerStoryId("");
    setComposerTargetSegment("All Registered Devices");
    setComposerConsentBasis(
      "Strict Opt-In Readers Only (Push Enabled & Unsuppressed)"
    );
    setComposerPriority("normal");
    setComposerScheduleDate("");
    setComposerScheduleTime("");
    setComposerError(null);
    setShowComposer(true);
  };

  const handleSubmitComposer = async () => {
    if (!onCreateAlert) return;
    const scheduleCheck = parseAndFormatPreviewSchedule(
      composerScheduleDate,
      composerScheduleTime,
      composerTimezone
    );
    if (!scheduleCheck.valid) {
      setComposerError(
        scheduleCheck.error || "Invalid schedule date or time."
      );
      return;
    }
    const scheduledAt = scheduleCheck.utcIso;

    const segmentEligibility =
      composerTargetSegment === "Harare Healthcare Workers"
        ? "Active verified healthcare personnel in Harare metropolitan province"
        : composerTargetSegment === "Subscribers & Premium Readers"
          ? "All active subscribers with push enabled"
          : "All active registered push-enabled devices (Aggregate)";

    const input: NewsroomPushAlertCreateInput = {
      title: composerTitle.trim(),
      body: composerBody.trim(),
      category: composerCategory,
      destination: composerDestination.trim() || null,
      related_story_id: composerStoryId.trim() || null,
      targetSegment: composerTargetSegment,
      audienceEligibility: `${composerConsentBasis} · ${segmentEligibility}`,
      priority: composerPriority,
      scheduledAt
    };

    const check = validatePushAlertCreateInput(input);
    if (!check.valid) {
      setComposerError(check.error || "Invalid input.");
      return;
    }

    setComposerSubmitting(true);
    setComposerError(null);
    try {
      await onCreateAlert(input);
      setShowComposer(false);
    } catch (err: any) {
      setComposerError(err?.message || "Failed to create push alert draft.");
    } finally {
      setComposerSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!onSaveAlert || !selectedAlert) return;
    const patch: NewsroomPushAlertPatch = {
      title: editTitle.trim(),
      body: editBody.trim(),
      category: editCategory,
      destination: editDestination.trim() || null,
      related_story_id: editStoryId.trim() || null,
      priority: editPriority,
      targetSegment: editTargetSegment
    };

    const check = validatePushAlertPatch(patch);
    if (!check.valid) {
      setEditError(check.error || "Invalid patch.");
      return;
    }

    setEditSubmitting(true);
    setEditError(null);
    try {
      await onSaveAlert(selectedAlert.id, patch);
      setIsEditing(false);
    } catch (err: any) {
      setEditError(err?.message || "Failed to save push alert.");
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <View style={styles.container} testID="studio-push-alert-desk">
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEyebrow}>DISTRIBUTION · PUSH ALERT OPERATIONS</Text>
          <Text style={styles.headerTitle}>Push Alerts</Text>
          <Text style={styles.headerDescription}>
            Reader push notification operations, editorial draft composition,
            human approval, and automated provider preparation.
          </Text>
        </View>
        <View style={styles.headerActions}>
          {canCreate && (
            <Pressable
              style={styles.primaryButton}
              onPress={handleOpenComposer}
              testID="new-push-alert-button"
            >
              <Text style={styles.primaryButtonText}>+ New Push Alert</Text>
            </Pressable>
          )}
          {onRefresh && (
            <Pressable
              style={styles.secondaryButton}
              onPress={onRefresh}
              disabled={refreshing}
            >
              <Text style={styles.secondaryButtonText}>
                {refreshing ? "Refreshing..." : "↻ Refresh"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Recipient Privacy Banner */}
      <View style={styles.privacyBanner} testID="push-privacy-banner">
        <View style={styles.privacyIconContainer}>
          <Text style={styles.privacyIcon}>🔒</Text>
        </View>
        <View style={styles.privacyContent}>
          <Text style={styles.privacyKicker}>ZERO IDENTIFIER LEAKAGE</Text>
          <Text style={styles.privacyText}>
            RECIPIENT PRIVACY: AGGREGATE DEVICE ELIGIBILITY ONLY · ZERO PUSH TOKEN
            OR READER IDENTITY EXPOSURE
          </Text>
        </View>
      </View>

      {/* Error & Success Feedback */}
      {errorMessage && (
        <View style={styles.errorBox} testID="push-error-box">
          <Text style={styles.errorText}>⚠ {errorMessage}</Text>
        </View>
      )}
      {successMessage && (
        <View style={styles.successBox} testID="push-success-box">
          <Text style={styles.successText}>✓ {successMessage}</Text>
        </View>
      )}

      {/* Search & Filters */}
      <View style={styles.filtersCard}>
        {/* Search input */}
        <View style={styles.searchRow}>
          <Text style={styles.filterLabel}>Search push alerts</Text>
          <View style={styles.searchInputWrapper}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={onChangeSearchQuery}
              placeholder="Filter by title or alert body..."
              placeholderTextColor={colors.inkMuted}
              accessibilityLabel="Search push alerts"
              testID="search-push-alerts-input"
            />
            {searchQuery.length > 0 && (
              <Pressable
                style={styles.clearSearchBtn}
                onPress={() => onChangeSearchQuery("")}
                accessibilityLabel="Clear search"
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Status Filters */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Status</Text>
          <View style={styles.filterPillsRow}>
            {["all", "draft", "approved", "prepared"].map((st) => {
              const active = statusFilter === st;
              return (
                <Pressable
                  key={st}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => onChangeStatusFilter(st)}
                  testID={`filter-status-${st}`}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      active && styles.filterPillTextActive
                    ]}
                  >
                    {st === "all" ? "All Statuses" : formatStatusLabel(st as any)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Category Filters */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Category</Text>
          <View style={styles.filterPillsRow}>
            {["all", ...NEWSROOM_PUSH_ALERT_CATEGORIES].map((cat) => {
              const active = categoryFilter === cat;
              return (
                <Pressable
                  key={cat}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => onChangeCategoryFilter(cat)}
                  testID={`filter-category-${cat}`}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      active && styles.filterPillTextActive
                    ]}
                  >
                    {cat === "all"
                      ? "All Categories"
                      : formatCategoryLabel(cat as any)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Restrained Disclosure */}
        <Text style={styles.disclosureText}>
          {isOwnerPreview
            ? "Showing up to 100 push alerts matching the current filters."
            : "Showing up to 100 server-matched push alerts."}
        </Text>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Loaded Results</Text>
          <Text style={styles.metricValue}>{loadedCount}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Draft in Results</Text>
          <Text style={styles.metricValue}>{draftCount}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Approved in Results</Text>
          <Text style={styles.metricValue}>{approvedCount}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Prepared in Results</Text>
          <Text style={styles.metricValue}>{preparedCount}</Text>
        </View>
      </View>

      {/* Main Content: Alert List + Inspector */}
      <View style={[styles.mainLayout, !isDesktop && styles.mainLayoutMobile]}>
        {/* Left: Alerts Registry List */}
        <View style={[styles.listColumn, !isDesktop && styles.listColumnMobile]}>
          <Text style={styles.columnTitle}>
            Alert Registry ({alerts.length})
          </Text>
          {loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Loading push alerts...</Text>
            </View>
          ) : alerts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Push Alerts Found</Text>
              <Text style={styles.emptyText}>
                No alerts match the active filters or search criteria.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.listScroll}>
              {alerts.map((alert) => {
                const isSelected = selectedAlert?.id === alert.id;
                return (
                  <Pressable
                    key={alert.id}
                    style={[styles.alertCard, isSelected && styles.alertCardSelected]}
                    onPress={() => onSelectAlert(alert)}
                    testID={`alert-card-${alert.id}`}
                  >
                    <View style={styles.alertCardTopRow}>
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 4,
                          flexWrap: "wrap",
                          alignItems: "center"
                        }}
                      >
                        <View
                          style={[
                            styles.categoryBadge,
                            CATEGORY_STYLES[alert.category]
                          ]}
                        >
                          <Text style={styles.categoryBadgeText}>
                            {formatCategoryLabel(alert.category).toUpperCase()}
                          </Text>
                        </View>
                        {alert.priority === "high" && (
                          <View
                            style={[
                              styles.priorityBadge,
                              {
                                backgroundColor: "#FEE2E2",
                                borderColor: "#FECACA"
                              }
                            ]}
                          >
                            <Text
                              style={[
                                styles.priorityBadgeText,
                                { color: "#991B1B" }
                              ]}
                            >
                              HIGH PRIORITY
                            </Text>
                          </View>
                        )}
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          STATUS_STYLES[alert.status]
                        ]}
                      >
                        <Text style={styles.statusBadgeText}>
                          {formatStatusLabel(alert.status).toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.alertCardTitle} numberOfLines={2}>
                      {alert.title}
                    </Text>
                    <Text style={styles.alertCardBodySnippet} numberOfLines={2}>
                      {alert.body}
                    </Text>
                    <View style={{ gap: 2, marginTop: 4 }}>
                      <Text style={styles.alertCardSegmentText}>
                        Target: {alert.targetSegment || "All Registered Devices"}
                      </Text>
                      {alert.createdByName && (
                        <Text style={styles.alertCardAuthorText}>
                          Created by: {alert.createdByName}
                        </Text>
                      )}
                      {alert.scheduledAt && (
                        <Text style={styles.alertCardScheduledText}>
                          Scheduled:{" "}
                          {isOwnerPreview
                            ? formatPreviewScheduleTimestamp(
                                alert.scheduledAt,
                                composerTimezone
                              )
                            : formatTimestamp(alert.scheduledAt)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.alertCardBottomRow}>
                      <Text style={styles.alertCardTime}>
                        Updated: {formatTimestamp(alert.updatedAt)}
                      </Text>
                      {alert.destination ? (
                        <Text style={styles.alertCardDestBadge}>
                          ↗ {alert.destination}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Right: Selected Alert Inspector */}
        <View style={[styles.detailColumn, !isDesktop && styles.detailColumnMobile]}>
          {selectedAlert ? (
            <ScrollView style={styles.detailScroll}>
              {/* Detail Header */}
              <View style={styles.detailHeaderCard}>
                <View style={styles.detailHeaderPills}>
                  <View
                    style={[
                      styles.categoryBadge,
                      CATEGORY_STYLES[selectedAlert.category]
                    ]}
                  >
                    <Text style={styles.categoryBadgeText}>
                      {formatCategoryLabel(selectedAlert.category).toUpperCase()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      STATUS_STYLES[selectedAlert.status]
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {formatStatusLabel(selectedAlert.status).toUpperCase()}
                    </Text>
                  </View>
                </View>

                {isEditing ? (
                  <View style={styles.editForm}>
                    <Text style={styles.fieldLabel}>Alert Title (max 140)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editTitle}
                      onChangeText={setEditTitle}
                      maxLength={140}
                      testID="edit-alert-title-input"
                    />

                    <Text style={styles.fieldLabel}>Alert Body (max 500)</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={editBody}
                      onChangeText={setEditBody}
                      multiline
                      numberOfLines={4}
                      maxLength={500}
                      testID="edit-alert-body-input"
                    />

                    <Text style={styles.fieldLabel}>Category</Text>
                    <View style={styles.filterPillsRow}>
                      {NEWSROOM_PUSH_ALERT_CATEGORIES.map((cat) => (
                        <Pressable
                          key={cat}
                          style={[
                            styles.filterPill,
                            editCategory === cat && styles.filterPillActive
                          ]}
                          onPress={() => setEditCategory(cat)}
                        >
                          <Text
                            style={[
                              styles.filterPillText,
                              editCategory === cat && styles.filterPillTextActive
                            ]}
                          >
                            {formatCategoryLabel(cat)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Text style={styles.fieldLabel}>Alert Priority</Text>
                    <View style={styles.filterPillsRow}>
                      {(["normal", "high"] as const).map((pr) => (
                        <Pressable
                          key={pr}
                          style={[
                            styles.filterPill,
                            editPriority === pr && styles.filterPillActive
                          ]}
                          onPress={() => setEditPriority(pr)}
                        >
                          <Text
                            style={[
                              styles.filterPillText,
                              editPriority === pr && styles.filterPillTextActive
                            ]}
                          >
                            {pr === "high" ? "🔥 High Priority" : "Normal Priority"}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Text style={styles.fieldLabel}>Target Audience Segment</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editTargetSegment}
                      onChangeText={setEditTargetSegment}
                      placeholder="e.g. All Registered Devices"
                      placeholderTextColor={colors.inkMuted}
                    />

                    <Text style={styles.fieldLabel}>
                      Destination (optional internal path)
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      value={editDestination}
                      onChangeText={setEditDestination}
                      placeholder="/live, /article/slug, /explore..."
                      placeholderTextColor={colors.inkMuted}
                      testID="edit-alert-destination-input"
                    />

                    <Text style={styles.fieldLabel}>
                      {isOwnerPreview || stories.length > 0
                        ? "Linked Editorial Story (Optional)"
                        : "Related Story ID (optional UUID)"}
                    </Text>
                    {isOwnerPreview || stories.length > 0 ? (
                      <View style={styles.filterPillsRow}>
                        <Pressable
                          style={[
                            styles.filterPill,
                            !editStoryId && styles.filterPillActive
                          ]}
                          onPress={() => setEditStoryId("")}
                          testID="edit-story-option-none"
                        >
                          <Text
                            style={[
                              styles.filterPillText,
                              !editStoryId && styles.filterPillTextActive
                            ]}
                          >
                            Standalone Alert (No Linked Story)
                          </Text>
                        </Pressable>
                        {stories.map((st) => (
                          <Pressable
                            key={st.id}
                            style={[
                              styles.filterPill,
                              editStoryId === st.id && styles.filterPillActive
                            ]}
                            onPress={() => setEditStoryId(st.id)}
                            testID={`edit-story-option-${st.id}`}
                          >
                            <Text
                              style={[
                                styles.filterPillText,
                                editStoryId === st.id &&
                                  styles.filterPillTextActive
                              ]}
                              numberOfLines={1}
                            >
                              {st.title}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      <TextInput
                        style={styles.textInput}
                        value={editStoryId}
                        onChangeText={setEditStoryId}
                        placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                        placeholderTextColor={colors.inkMuted}
                        testID="edit-alert-story-input"
                      />
                    )}

                    {editError && (
                      <Text style={styles.formErrorText}>⚠ {editError}</Text>
                    )}

                    <View style={styles.formBtnRow}>
                      <Pressable
                        style={styles.primaryButton}
                        onPress={handleSaveEdit}
                        disabled={editSubmitting}
                        testID="save-edit-button"
                      >
                        <Text style={styles.primaryButtonText}>
                          {editSubmitting ? "Saving..." : "Save Changes"}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() => setIsEditing(false)}
                      >
                        <Text style={styles.secondaryButtonText}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={styles.detailTitle}>{selectedAlert.title}</Text>
                    <Text style={styles.detailBody}>{selectedAlert.body}</Text>

                    {/* Metadata items */}
                    <View style={styles.detailMetaGrid}>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Target Segment</Text>
                        <Text style={styles.metaValue}>
                          {selectedAlert.targetSegment || "All Registered Devices"}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Audience Eligibility</Text>
                        <Text style={styles.metaValue}>
                          {selectedAlert.audienceEligibility || "All push-enabled registered readers (Aggregate)"}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Priority</Text>
                        <Text style={styles.metaValue}>
                          {selectedAlert.priority ? selectedAlert.priority.toUpperCase() : "NORMAL"}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Scheduled For</Text>
                        <Text style={styles.metaValue}>
                          {selectedAlert.scheduledAt
                            ? isOwnerPreview
                              ? formatPreviewScheduleTimestamp(
                                  selectedAlert.scheduledAt,
                                  composerTimezone
                                )
                              : formatTimestamp(selectedAlert.scheduledAt)
                            : "Immediate dispatch upon approval"}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Created By</Text>
                        <Text style={styles.metaValue}>
                          {selectedAlert.createdByName || selectedAlert.createdBy || "Staff Reporter"}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Approved By</Text>
                        <Text style={styles.metaValue}>
                          {selectedAlert.approvedByName || (selectedAlert.status === "draft" ? "Pending editorial approval" : "Not recorded")}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Destination</Text>
                        <Text style={styles.metaValue}>
                          {selectedAlert.destination || "None (default home)"}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Created</Text>
                        <Text style={styles.metaValue}>
                          {formatTimestamp(selectedAlert.createdAt)}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Updated</Text>
                        <Text style={styles.metaValue}>
                          {formatTimestamp(selectedAlert.updatedAt)}
                        </Text>
                      </View>
                      {selectedAlert.approvedAt && (
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Approved At</Text>
                          <Text style={styles.metaValue}>
                            {formatTimestamp(selectedAlert.approvedAt)}
                          </Text>
                        </View>
                      )}
                      {selectedAlert.preparedAt && (
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Prepared At</Text>
                          <Text style={styles.metaValue}>
                            {formatTimestamp(selectedAlert.preparedAt)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Audience Consent & Opt-In Governance (UAT04A-052) */}
                    <View
                      style={styles.storyLinkSection}
                      testID="inspector-consent-governance-box"
                    >
                      <Text style={styles.metaLabel}>
                        AUDIENCE CONSENT & OPT-IN GOVERNANCE
                      </Text>
                      <View style={styles.linkedStoryBox}>
                        <Text style={styles.linkedStoryText}>
                          ✓ Push notifications enabled · ✓ Reader opt-in required · ✓ Suppressed/disabled devices excluded
                        </Text>
                      </View>
                    </View>

                    {/* Linked Editorial Story Handoff / Navigation */}
                    <View style={styles.storyLinkSection}>
                      <Text style={styles.metaLabel}>LINKED EDITORIAL STORY</Text>
                      {selectedAlert.relatedStoryId ? (
                        <View style={styles.linkedStoryBox}>
                          <Text style={styles.linkedStoryText}>
                            {isOwnerPreview
                              ? `Linked Story: ${stories.find((s) => s.id === selectedAlert.relatedStoryId)?.title || "Editorial Newsroom Story"}`
                              : stories.find((s) => s.id === selectedAlert.relatedStoryId)
                              ? `Linked Story: ${stories.find((s) => s.id === selectedAlert.relatedStoryId)?.title}`
                              : `Story UUID: ${selectedAlert.relatedStoryId}`}
                          </Text>
                          <Pressable
                            style={styles.openStoryButton}
                            onPress={() => {
                              if (onOpenStory) {
                                onOpenStory(selectedAlert.relatedStoryId!);
                              }
                            }}
                            accessibilityRole="button"
                            testID="open-linked-story-button"
                          >
                            <Text style={styles.openStoryButtonText}>
                              Open Linked Story Workspace →
                            </Text>
                          </Pressable>
                        </View>
                      ) : (
                        <View style={styles.unlinkedStoryBox}>
                          <Text style={styles.unlinkedStoryText}>
                            Unlinked Story Alert — Standalone alert not linked to a specific published story.
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Action Bar */}
                    <View style={styles.detailActionBar}>
                      {selectedAlert.status === "draft" && canCreate && (
                        <Pressable
                          style={styles.secondaryButton}
                          onPress={() => setIsEditing(true)}
                          testID="edit-draft-button"
                        >
                          <Text style={styles.secondaryButtonText}>
                            ✏ Edit Draft
                          </Text>
                        </Pressable>
                      )}

                      {selectedAlert.status === "draft" && canApprove && onApproveAlert && (
                        <Pressable
                          style={styles.approveButton}
                          onPress={() => onApproveAlert(selectedAlert.id)}
                          testID="approve-alert-button"
                        >
                          <Text style={styles.approveButtonText}>
                            ✓ Approve Alert
                          </Text>
                        </Pressable>
                      )}

                      {selectedAlert.status === "approved" && canApprove && onPrepareAlert && (
                        <Pressable
                          style={styles.prepareButton}
                          onPress={() => onPrepareAlert(selectedAlert.id)}
                          testID="prepare-push-button"
                        >
                          <Text style={styles.prepareButtonText}>
                            ⚡ Prepare Push
                          </Text>
                        </Pressable>
                      )}

                      {selectedAlert.status === "prepared" && (
                        <View style={styles.actionRow}>
                          <View style={styles.preparedNoticeBadge}>
                            <Text style={styles.preparedNoticeText}>
                              ✓ PREPARED FOR PROVIDER EXECUTION
                            </Text>
                          </View>
                          {!dispatchRecord && canDispatch && onDispatchAlert && (
                            <Pressable
                              style={styles.dispatchButton}
                              onPress={handleOpenDispatchModal}
                              testID="execute-provider-dispatch-button"
                            >
                              <Text style={styles.dispatchButtonText}>
                                🚀 Execute Provider Dispatch
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      )}
                    </View>
                  </>
                )}
              </View>

              {/* Prepared Send Handoff Card (Scoped strictly to selected alert) */}
              {activeHandoff && (
                <View
                  style={styles.handoffCard}
                  testID="push-prepared-handoff-card"
                >
                  <View style={styles.handoffHeader}>
                    <Text style={styles.handoffKicker}>
                      PROVIDER SEND HANDOFF · SECURE DISPATCH BOUNDARY
                    </Text>
                    <Text style={styles.handoffTitle}>
                      Push Alert Delivery Payload Prepared
                    </Text>
                    <Text style={styles.handoffNotice}>
                      Editorial approval complete. Payload ready for automated provider dispatch. Zero notifications sent until dispatch executed.
                    </Text>
                  </View>

                  <View style={styles.handoffBody}>
                    <View style={styles.handoffRow}>
                      <Text style={styles.handoffLabel}>
                        {isOwnerPreview ? "Alert Reference:" : "Alert ID:"}
                      </Text>
                      <Text style={styles.handoffValue}>
                        {isOwnerPreview
                          ? "Editorial Push Alert"
                          : activeHandoff.alert_id}
                      </Text>
                    </View>
                    <View style={styles.handoffRow}>
                      <Text style={styles.handoffLabel}>Title:</Text>
                      <Text style={styles.handoffValue}>
                        {activeHandoff.title}
                      </Text>
                    </View>
                    <View style={styles.handoffRow}>
                      <Text style={styles.handoffLabel}>Body:</Text>
                      <Text style={styles.handoffValue}>
                        {activeHandoff.body}
                      </Text>
                    </View>
                    <View style={styles.handoffRow}>
                      <Text style={styles.handoffLabel}>Category:</Text>
                      <Text style={styles.handoffValue}>
                        {formatCategoryLabel(activeHandoff.category)}
                      </Text>
                    </View>
                    {activeHandoff.destination ? (
                      <View style={styles.handoffRow}>
                        <Text style={styles.handoffLabel}>Destination:</Text>
                        <Text style={styles.handoffValue}>
                          {activeHandoff.destination}
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.handoffStatRow}>
                      <Text style={styles.handoffStatLabel}>
                        {isOwnerPreview
                          ? "Consented & Eligible Sample Devices:"
                          : "Eligible Active Devices:"}
                      </Text>
                      <Text style={styles.handoffStatValue}>
                        {activeHandoff.eligible_device_count}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.handoffFooter}>
                    <Text style={styles.handoffFooterText}>
                      🔒 AGGREGATE DEVICE COUNT ONLY · ZERO TOKENS OR IDENTITIES
                      RETURNED
                    </Text>
                  </View>
                </View>
              )}

              {/* Delivery Ledger Card */}
              {dispatchRecord && (
                <View
                  style={styles.ledgerCard}
                  testID="push-dispatch-ledger-card"
                >
                  <View style={styles.ledgerHeader}>
                    <View style={styles.ledgerHeaderTop}>
                      <Text style={styles.ledgerKicker}>
                        DELIVERY LEDGER · DISPATCH & AUDIT RECORD
                      </Text>
                      <View
                        style={[
                          styles.dispatchBadge,
                          DISPATCH_STATUS_STYLES[dispatchRecord.status]
                        ]}
                      >
                        <Text style={styles.dispatchBadgeText}>
                          {formatDispatchStatusLabel(dispatchRecord.status).toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.ledgerTitle}>
                      Provider Execution & Transport Ledger
                    </Text>
                    {dispatchRecord.failureReason ? (
                      <View style={styles.ledgerFailureBox}>
                        <Text style={styles.ledgerFailureText}>
                          ⚠ {dispatchRecord.failureReason}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.ledgerGrid}>
                    <View style={styles.ledgerMetricBox}>
                      <Text style={styles.ledgerMetricLabel}>
                        {isOwnerPreview ? "Consented Sample Devices" : "Eligible Devices"}
                      </Text>
                      <Text style={styles.ledgerMetricValue}>
                        {dispatchRecord.eligibleDeviceCount}
                      </Text>
                    </View>
                    <View style={styles.ledgerMetricBox}>
                      <Text style={styles.ledgerMetricLabel}>Provider Accepted</Text>
                      <Text style={[styles.ledgerMetricValue, { color: "#166534" }]}>
                        {dispatchRecord.providerAcceptedCount}
                      </Text>
                    </View>
                    <View style={styles.ledgerMetricBox}>
                      <Text style={styles.ledgerMetricLabel}>Provider Rejected</Text>
                      <Text
                        style={[
                          styles.ledgerMetricValue,
                          {
                            color:
                              dispatchRecord.providerRejectedCount > 0
                                ? "#991B1B"
                                : colors.ink
                          }
                        ]}
                      >
                        {dispatchRecord.providerRejectedCount}
                      </Text>
                    </View>
                    <View style={styles.ledgerMetricBox}>
                      <Text style={styles.ledgerMetricLabel}>Confirmed Delivered</Text>
                      <Text style={styles.ledgerMetricValue}>
                        {dispatchRecord.confirmedDeliveryCount}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.ledgerMeta}>
                    <View style={styles.ledgerMetaRow}>
                      <Text style={styles.ledgerMetaLabel}>
                        {isOwnerPreview ? "Dispatch Reference:" : "Dispatch ID:"}
                      </Text>
                      <Text style={styles.ledgerMetaValue}>
                        {isOwnerPreview ? "Simulated Push Dispatch" : dispatchRecord.id}
                      </Text>
                    </View>
                    <View style={styles.ledgerMetaRow}>
                      <Text style={styles.ledgerMetaLabel}>Idempotency Key:</Text>
                      <Text style={styles.ledgerMetaValue}>
                        {dispatchRecord.idempotencyKey}
                      </Text>
                    </View>
                    <View style={styles.ledgerMetaRow}>
                      <Text style={styles.ledgerMetaLabel}>Dispatched At:</Text>
                      <Text style={styles.ledgerMetaValue}>
                        {formatTimestamp(dispatchRecord.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.ledgerMetaRow}>
                      <Text style={styles.ledgerMetaLabel}>Last Updated:</Text>
                      <Text style={styles.ledgerMetaValue}>
                        {formatTimestamp(dispatchRecord.updatedAt)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.ledgerFootnote}>
                    <Text style={styles.ledgerFootnoteText}>
                      ℹ Receipt polling not executed in this phase; delivery confirmation requires separate receipt polling.
                    </Text>
                    <Text style={styles.ledgerFootnoteText}>
                      🔒 Aggregate device metrics only · Client has zero device tokens, token hashes, or recipient identities.
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.emptyDetailBox}>
              <Text style={styles.emptyDetailTitle}>No Alert Selected</Text>
              <Text style={styles.emptyDetailText}>
                Select an alert from the registry to inspect its payload,
                approval state, or send preparation status.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* New Push Alert Composer Modal */}
      {showComposer && (
        <View style={styles.modalOverlay} testID="new-push-alert-modal">
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Compose Push Alert Draft</Text>
              <Pressable onPress={() => setShowComposer(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.fieldLabel}>Alert Title (max 140) *</Text>
              <TextInput
                style={styles.textInput}
                value={composerTitle}
                onChangeText={setComposerTitle}
                placeholder="Brief, urgent, factual headline..."
                placeholderTextColor={colors.inkMuted}
                maxLength={140}
                testID="composer-title-input"
              />

              <Text style={styles.fieldLabel}>Alert Body (max 500) *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={composerBody}
                onChangeText={setComposerBody}
                placeholder="Essential summary of the breaking development or health update..."
                placeholderTextColor={colors.inkMuted}
                multiline
                numberOfLines={4}
                maxLength={500}
                testID="composer-body-input"
              />

              <Text style={styles.fieldLabel}>Category *</Text>
              <View style={styles.filterPillsRow}>
                {NEWSROOM_PUSH_ALERT_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.filterPill,
                      composerCategory === cat && styles.filterPillActive
                    ]}
                    onPress={() => setComposerCategory(cat)}
                    testID={`composer-category-${cat}`}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        composerCategory === cat && styles.filterPillTextActive
                      ]}
                    >
                      {formatCategoryLabel(cat)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Target Audience Segment *</Text>
              <View style={styles.filterPillsRow}>
                {[
                  "All Registered Devices",
                  "Harare Healthcare Workers",
                  "Subscribers & Premium Readers",
                  "Breaking News Opt-Ins"
                ].map((seg) => (
                  <Pressable
                    key={seg}
                    style={[
                      styles.filterPill,
                      composerTargetSegment === seg && styles.filterPillActive
                    ]}
                    onPress={() => setComposerTargetSegment(seg)}
                    testID={`composer-segment-${seg.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        composerTargetSegment === seg &&
                          styles.filterPillTextActive
                      ]}
                    >
                      {seg}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>
                Audience Consent & Opt-In Governance *
              </Text>
              <View
                style={styles.linkedStoryBox}
                testID="composer-consent-governance-box"
              >
                <Text style={styles.linkedStoryText}>
                  Audience eligibility:{"\n"}✓ Push notifications enabled{"\n"}✓ Reader opt-in required{"\n"}✓ Suppressed/disabled devices excluded
                </Text>
                <View style={[styles.filterPillsRow, { marginTop: 8 }]}>
                  {[
                    "Strict Opt-In Readers Only (Push Enabled & Unsuppressed)",
                    "Breaking News Opt-In Cohort",
                    "Verified Subscriber Opt-In Cohort"
                  ].map((policy) => (
                    <Pressable
                      key={policy}
                      style={[
                        styles.filterPill,
                        composerConsentBasis === policy && styles.filterPillActive
                      ]}
                      onPress={() => setComposerConsentBasis(policy)}
                      testID={`composer-consent-policy-${policy.slice(0, 14).toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          composerConsentBasis === policy &&
                            styles.filterPillTextActive
                        ]}
                      >
                        {policy}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Text style={styles.fieldLabel}>Alert Priority *</Text>
              <View style={styles.filterPillsRow}>
                {(["normal", "high"] as const).map((pr) => (
                  <Pressable
                    key={pr}
                    style={[
                      styles.filterPill,
                      composerPriority === pr && styles.filterPillActive
                    ]}
                    onPress={() => setComposerPriority(pr)}
                    testID={`composer-priority-${pr}`}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        composerPriority === pr && styles.filterPillTextActive
                      ]}
                    >
                      {pr === "high" ? "🔥 High / Urgent" : "Normal Priority"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Scheduling Controls */}
              <Text style={styles.fieldLabel}>
                Scheduled Dispatch (Optional — Default: Immediate upon approval)
              </Text>
              <View style={styles.scheduleRow}>
                <View style={styles.scheduleField}>
                  <Text style={styles.subFieldLabel}>Send Date</Text>
                  <TextInput
                    style={styles.textInput}
                    value={composerScheduleDate}
                    onChangeText={setComposerScheduleDate}
                    placeholder="YYYY-MM-DD (e.g. 2026-10-25)"
                    placeholderTextColor={colors.inkMuted}
                    testID="composer-schedule-date-input"
                  />
                </View>
                <View style={styles.scheduleField}>
                  <Text style={styles.subFieldLabel}>Send Time</Text>
                  <TextInput
                    style={styles.textInput}
                    value={composerScheduleTime}
                    onChangeText={setComposerScheduleTime}
                    placeholder="HH:MM (e.g. 08:00)"
                    placeholderTextColor={colors.inkMuted}
                    testID="composer-schedule-time-input"
                  />
                </View>
                <View style={styles.scheduleField}>
                  <Text style={styles.subFieldLabel}>Timezone</Text>
                  <View style={styles.filterPillsRow}>
                    {SUPPORTED_PREVIEW_TIMEZONES.map((tz) => {
                      const active = composerTimezone.startsWith(tz);
                      return (
                        <Pressable
                          key={tz}
                          style={[
                            styles.filterPill,
                            active && styles.filterPillActive
                          ]}
                          onPress={() =>
                            setComposerTimezone(
                              tz === "Africa/Harare"
                                ? "Africa/Harare (CAT, UTC+2)"
                                : "UTC"
                            )
                          }
                          testID={`push-schedule-tz-${tz.replace("/", "-")}`}
                        >
                          <Text
                            style={[
                              styles.filterPillText,
                              active && styles.filterPillTextActive
                            ]}
                          >
                            {tz === "Africa/Harare"
                              ? "Africa/Harare (CAT, UTC+2)"
                              : "UTC"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              <Text style={styles.fieldLabel}>
                Destination (optional internal deep link)
              </Text>
              <TextInput
                style={styles.textInput}
                value={composerDestination}
                onChangeText={setComposerDestination}
                placeholder="e.g. /live, /explore, /article/cholera-brief"
                placeholderTextColor={colors.inkMuted}
                testID="composer-destination-input"
              />

              <Text style={styles.fieldLabel}>
                {isOwnerPreview || stories.length > 0
                  ? "Linked Editorial Story (Optional)"
                  : "Related Story ID (optional UUID)"}
              </Text>
              {isOwnerPreview || stories.length > 0 ? (
                <View
                  style={styles.filterPillsRow}
                  testID="composer-story-selector"
                >
                  <Pressable
                    style={[
                      styles.filterPill,
                      !composerStoryId && styles.filterPillActive
                    ]}
                    onPress={() => setComposerStoryId("")}
                    testID="composer-story-option-none"
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        !composerStoryId && styles.filterPillTextActive
                      ]}
                    >
                      Standalone Alert (No Linked Story)
                    </Text>
                  </Pressable>
                  {stories.map((st) => (
                    <Pressable
                      key={st.id}
                      style={[
                        styles.filterPill,
                        composerStoryId === st.id && styles.filterPillActive
                      ]}
                      onPress={() => setComposerStoryId(st.id)}
                      testID={`composer-story-option-${st.id}`}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          composerStoryId === st.id &&
                            styles.filterPillTextActive
                        ]}
                        numberOfLines={1}
                      >
                        {st.title}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <TextInput
                  style={styles.textInput}
                  value={composerStoryId}
                  onChangeText={setComposerStoryId}
                  placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                  placeholderTextColor={colors.inkMuted}
                  testID="composer-story-input"
                />
              )}

              {composerError && (
                <Text style={styles.formErrorText}>⚠ {composerError}</Text>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.primaryButton}
                onPress={handleSubmitComposer}
                disabled={composerSubmitting}
                testID="composer-submit-button"
              >
                <Text style={styles.primaryButtonText}>
                  {composerSubmitting ? "Creating..." : "Create Draft"}
                </Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setShowComposer(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Irreversible Push Dispatch Confirmation Modal */}
      {showDispatchModal && selectedAlert && (
        <View style={styles.modalOverlay} testID="dispatch-confirm-modal">
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Push Alert Broadcast</Text>
              <Pressable
                onPress={() => {
                  if (!dispatchSubmitting) setShowDispatchModal(false);
                }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.dispatchWarningBox}>
                <Text style={styles.dispatchWarningKicker}>
                  ⚠ IRREVERSIBLE BROADCAST WARNING
                </Text>
                <Text style={styles.dispatchWarningText}>
                  Once initiated, push notification dispatch cannot be recalled,
                  paused, or undone. Notifications will be dispatched immediately to
                  all eligible reader devices.
                </Text>
              </View>

              <View style={styles.dispatchSummaryCard}>
                <Text style={styles.dispatchSummaryTitle}>Alert Summary</Text>
                <View style={styles.handoffRow}>
                  <Text style={styles.handoffLabel}>Title:</Text>
                  <Text style={styles.handoffValue}>{selectedAlert.title}</Text>
                </View>
                <View style={styles.handoffRow}>
                  <Text style={styles.handoffLabel}>Category:</Text>
                  <Text style={styles.handoffValue}>
                    {formatCategoryLabel(selectedAlert.category)}
                  </Text>
                </View>
                {selectedAlert.destination ? (
                  <View style={styles.handoffRow}>
                    <Text style={styles.handoffLabel}>Destination:</Text>
                    <Text style={styles.handoffValue}>
                      {selectedAlert.destination}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.handoffStatRow}>
                  <Text style={styles.handoffStatLabel}>
                    {isOwnerPreview
                      ? "Consented & Eligible Sample Devices:"
                      : "Eligible Active Devices:"}
                  </Text>
                  <Text style={styles.handoffStatValue}>
                    {activeHandoff?.eligible_device_count ?? 0}
                  </Text>
                </View>
              </View>

              {dispatchError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠ {dispatchError}</Text>
                </View>
              )}

              <Pressable
                style={styles.checkboxRow}
                onPress={() => setDispatchConfirmed(!dispatchConfirmed)}
                testID="dispatch-confirm-checkbox"
              >
                <View
                  style={[
                    styles.checkboxBox,
                    dispatchConfirmed && styles.checkboxBoxChecked
                  ]}
                >
                  {dispatchConfirmed && (
                    <Text style={styles.checkboxCheckmark}>✓</Text>
                  )}
                </View>
                <Text style={styles.checkboxLabel}>
                  I understand this broadcast cannot be cancelled or recalled.
                </Text>
              </Pressable>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[
                  styles.executeButton,
                  (!dispatchConfirmed || dispatchSubmitting) && styles.buttonDisabled
                ]}
                onPress={handleConfirmDispatch}
                disabled={!dispatchConfirmed || dispatchSubmitting}
                testID="confirm-execute-dispatch-button"
              >
                <Text style={styles.executeButtonText}>
                  {dispatchSubmitting
                    ? "Dispatching..."
                    : "🚀 Confirm & Dispatch Now"}
                </Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setShowDispatchModal(false)}
                disabled={dispatchSubmitting}
                testID="cancel-dispatch-button"
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

export function StudioPushAlertDesk() {
  const [alerts, setAlerts] = useState<NewsroomPushAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<NewsroomPushAlert | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [preparedHandoff, setPreparedHandoff] =
    useState<NewsroomPushAlertPrepareResult | null>(null);
  const [dispatches, setDispatches] = useState<
    Record<string, NewsroomPushDispatch | null>
  >({});

  const [capabilities, setCapabilities] =
    useState<PushAlertDeskCapabilityMatrix>({
      hasDeskAccess: false,
      canCreate: false,
      canSave: false,
      canApprove: false,
      canPrepare: false,
      canDispatch: false
    });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const requestSeqRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search query changes (~350ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Load capabilities snapshot
  useEffect(() => {
    let mounted = true;
    services.authorization
      .getSnapshot()
      .then((snapshot) => {
        if (!mounted) return;
        setCapabilities(resolvePushAlertDeskCapabilityState(snapshot));
      })
      .catch(() => {
        if (!mounted) return;
        setCapabilities(resolvePushAlertDeskCapabilityState(null));
      });
    return () => {
      mounted = false;
    };
  }, []);

  const loadAlerts = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setErrorMessage(null);

    try {
      const options: {
        status?: NewsroomPushAlertStatus | null;
        category?: NewsroomPushAlertCategory | null;
        search?: string | null;
        limit?: number;
      } = {
        limit: 100
      };

      if (statusFilter !== "all") {
        options.status = statusFilter as NewsroomPushAlertStatus;
      }
      if (categoryFilter !== "all") {
        options.category = categoryFilter as NewsroomPushAlertCategory;
      }
      if (debouncedSearch.trim().length > 0) {
        options.search = debouncedSearch.trim();
      }

      const results = await services.newsroomPushAlerts.listAlerts(options);

      if (seq === requestSeqRef.current) {
        setAlerts(results);
        // Retain selected alert if present in updated list, else update
        if (selectedAlert) {
          const matched = results.find((a) => a.id === selectedAlert.id);
          setSelectedAlert(matched ?? null);
        }
      }
    } catch (err: any) {
      if (seq === requestSeqRef.current) {
        setErrorMessage(err?.message || "Failed to load push alerts.");
      }
    } finally {
      if (seq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [statusFilter, categoryFilter, debouncedSearch, selectedAlert]);

  useEffect(() => {
    loadAlerts();
  }, [statusFilter, categoryFilter, debouncedSearch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  const handleCreateAlert = async (input: NewsroomPushAlertCreateInput) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const newId = await services.newsroomPushAlerts.createAlert(input);
    setSuccessMessage("Push alert draft created successfully.");
    await loadAlerts();
    // Select newly created alert
    const fresh = await services.newsroomPushAlerts.listAlerts({ limit: 100 });
    const created = fresh.find((a) => a.id === newId);
    if (created) {
      setSelectedAlert(created);
    }
  };

  const handleSaveAlert = async (
    id: string,
    patch: NewsroomPushAlertPatch
  ) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    await services.newsroomPushAlerts.saveAlert(id, patch);
    setSuccessMessage("Push alert draft updated.");
    await loadAlerts();
  };

  const handleApproveAlert = async (id: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    await services.newsroomPushAlerts.approveAlert(id);
    setSuccessMessage("Push alert approved for distribution.");
    await loadAlerts();
  };

  const handlePrepareAlert = async (id: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const handoff = await services.newsroomPushAlerts.prepareAlert(id);
    setPreparedHandoff(handoff);
    setSuccessMessage(
      `Push alert prepared for distribution (${handoff.eligible_device_count} eligible devices).`
    );
    await loadAlerts();
  };

  useEffect(() => {
    let active = true;
    if (selectedAlert && selectedAlert.status === "prepared") {
      services.newsroomPushAlerts
        .getDispatch(selectedAlert.id)
        .then((record) => {
          if (active) {
            setDispatches((prev) => ({ ...prev, [selectedAlert.id]: record }));
          }
        })
        .catch(() => {
          if (active) {
            setDispatches((prev) => ({ ...prev, [selectedAlert.id]: null }));
          }
        });
    }
    return () => {
      active = false;
    };
  }, [selectedAlert?.id, selectedAlert?.status]);

  const handleDispatchAlert = async (id: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const result = await services.newsroomPushAlerts.dispatchAlert(id);
    const updatedDispatch: NewsroomPushDispatch = {
      id: result.dispatch_id,
      alertId: result.alert_id,
      idempotencyKey: "",
      status: result.status,
      eligibleDeviceCount: result.eligible_device_count,
      providerAcceptedCount: result.provider_accepted_count,
      providerRejectedCount: result.provider_rejected_count,
      confirmedDeliveryCount: result.confirmed_delivery_count,
      failureReason: result.failure_reason,
      createdAt: result.dispatched_at,
      updatedAt: result.dispatched_at
    };
    setDispatches((prev) => ({ ...prev, [id]: updatedDispatch }));
    setSuccessMessage(`Push dispatch executed with status: ${result.status}`);
    await loadAlerts();
  };

  return (
    <StudioPushAlertDeskView
      alerts={alerts}
      selectedAlert={selectedAlert}
      onSelectAlert={setSelectedAlert}
      searchQuery={searchQuery}
      onChangeSearchQuery={setSearchQuery}
      statusFilter={statusFilter}
      onChangeStatusFilter={setStatusFilter}
      categoryFilter={categoryFilter}
      onChangeCategoryFilter={setCategoryFilter}
      preparedHandoff={preparedHandoff}
      dispatchRecord={
        selectedAlert ? dispatches[selectedAlert.id] ?? null : null
      }
      canCreate={capabilities.canCreate}
      canApprove={capabilities.canApprove}
      canDispatch={capabilities.canDispatch}
      onCreateAlert={handleCreateAlert}
      onSaveAlert={handleSaveAlert}
      onApproveAlert={handleApproveAlert}
      onPrepareAlert={handlePrepareAlert}
      onDispatchAlert={handleDispatchAlert}
      loading={loading}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      errorMessage={errorMessage}
      successMessage={successMessage}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: spacing.md,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl
  },
  headerLeft: {
    flex: 1,
    minWidth: 260,
    gap: spacing.xs
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.blue,
    letterSpacing: 0.8
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.ink
  },
  headerDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center"
  },
  primaryButton: {
    backgroundColor: colors.blue,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700"
  },
  secondaryButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "600"
  },
  approveButton: {
    backgroundColor: "#059669",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  approveButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700"
  },
  prepareButton: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  prepareButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700"
  },
  privacyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: radius.md,
    padding: spacing.md
  },
  privacyIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center"
  },
  privacyIcon: {
    fontSize: 16
  },
  privacyContent: {
    flex: 1,
    gap: 2
  },
  privacyKicker: {
    fontSize: 10,
    fontWeight: "900",
    color: "#1D4ED8",
    letterSpacing: 0.8
  },
  privacyText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E40AF",
    lineHeight: 17
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.sm,
    padding: spacing.md
  },
  errorText: {
    fontSize: 13,
    color: "#B91C1C",
    fontWeight: "600"
  },
  successBox: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: radius.sm,
    padding: spacing.md
  },
  successText: {
    fontSize: 13,
    color: "#047857",
    fontWeight: "600"
  },
  filtersCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md
  },
  searchRow: {
    gap: spacing.xs
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  searchInputWrapper: {
    position: "relative",
    justifyContent: "center"
  },
  searchInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.ink,
    paddingRight: 36
  },
  clearSearchBtn: {
    position: "absolute",
    right: 10,
    padding: 4
  },
  clearSearchText: {
    fontSize: 14,
    color: colors.inkMuted,
    fontWeight: "700"
  },
  filterGroup: {
    gap: spacing.xs
  },
  filterPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  filterPill: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: 999
  },
  filterPillActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink
  },
  filterPillTextActive: {
    color: "#FFFFFF"
  },
  disclosureText: {
    fontSize: 11,
    fontStyle: "italic",
    color: colors.inkMuted,
    marginTop: 2
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  metricCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.ink
  },
  mainLayout: {
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "flex-start"
  },
  mainLayoutMobile: {
    flexDirection: "column"
  },
  listColumn: {
    flex: 1,
    minWidth: 320,
    gap: spacing.sm
  },
  listColumnMobile: {
    width: "100%",
    minWidth: "100%"
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: 0.3
  },
  listScroll: {
    maxHeight: 650
  },
  alertCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs
  },
  alertCardSelected: {
    borderColor: colors.blue,
    backgroundColor: "#F8FAFC"
  },
  alertCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  category_breaking: {
    backgroundColor: "#FEE2E2"
  },
  category_live: {
    backgroundColor: "#FEF3C7"
  },
  category_topic: {
    backgroundColor: "#E0E7FF"
  },
  category_premium: {
    backgroundColor: "#F3E8FF"
  },
  category_system: {
    backgroundColor: "#F3F4F6"
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.ink
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  status_draft: {
    backgroundColor: "#F3F4F6"
  },
  status_approved: {
    backgroundColor: "#D1FAE5"
  },
  status_prepared: {
    backgroundColor: "#EDE9FE"
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.ink
  },
  alertCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
    lineHeight: 19
  },
  alertCardBodySnippet: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkMuted
  },
  alertCardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4
  },
  alertCardTime: {
    fontSize: 10,
    color: colors.inkMuted
  },
  alertCardDestBadge: {
    fontSize: 10,
    color: colors.blue,
    fontWeight: "700"
  },
  detailColumn: {
    flex: 1.2,
    minWidth: 340
  },
  detailColumnMobile: {
    width: "100%",
    minWidth: "100%"
  },
  detailScroll: {
    maxHeight: 750
  },
  detailHeaderCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.md
  },
  detailHeaderPills: {
    flexDirection: "row",
    gap: spacing.xs
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink,
    lineHeight: 24
  },
  detailBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.ink,
    backgroundColor: "#F9FAFB",
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  detailMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md
  },
  metaItem: {
    minWidth: 130,
    gap: 2
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.inkMuted,
    textTransform: "uppercase"
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink
  },
  detailActionBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md
  },
  preparedNoticeBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm
  },
  preparedNoticeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#6D28D9"
  },
  handoffCard: {
    marginTop: spacing.md,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md
  },
  handoffHeader: {
    gap: spacing.xs
  },
  handoffKicker: {
    fontSize: 10,
    fontWeight: "900",
    color: "#6D28D9",
    letterSpacing: 0.8
  },
  handoffTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#4C1D95"
  },
  handoffNotice: {
    fontSize: 12,
    lineHeight: 17,
    color: "#5B21B6"
  },
  handoffBody: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.xs
  },
  handoffRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  handoffLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.inkMuted,
    minWidth: 80
  },
  handoffValue: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink,
    flex: 1
  },
  handoffStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "#F3E8FF"
  },
  handoffStatLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: "#4C1D95"
  },
  handoffStatValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#6D28D9"
  },
  handoffFooter: {
    borderTopWidth: 1,
    borderTopColor: "#E9D5FF",
    paddingTop: spacing.xs
  },
  handoffFooterText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#7C3AED",
    letterSpacing: 0.5
  },
  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink
  },
  emptyText: {
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: "center"
  },
  emptyDetailBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs
  },
  emptyDetailTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink
  },
  emptyDetailText: {
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 18
  },
  editForm: {
    gap: spacing.sm
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink,
    marginTop: spacing.xs
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 13,
    color: colors.ink
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top"
  },
  formErrorText: {
    fontSize: 12,
    color: "#B91C1C",
    fontWeight: "600"
  },
  formBtnRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    padding: spacing.md
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    width: "100%",
    maxWidth: 540,
    maxHeight: "85%",
    padding: spacing.xl,
    gap: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.inkMuted,
    padding: 4
  },
  modalScroll: {
    gap: spacing.sm
  },
  modalFooter: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center"
  },
  dispatchButton: {
    backgroundColor: "#DC2626",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  dispatchButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700"
  },
  ledgerCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md
  },
  ledgerHeader: {
    gap: spacing.xs
  },
  ledgerHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  ledgerKicker: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.blue,
    letterSpacing: 0.8
  },
  dispatchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999
  },
  dispatchBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.ink
  },
  ledgerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.ink
  },
  ledgerFailureBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs
  },
  ledgerFailureText: {
    fontSize: 12,
    color: "#991B1B",
    fontWeight: "600"
  },
  ledgerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  ledgerMetricBox: {
    flex: 1,
    minWidth: 100,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    alignItems: "center"
  },
  ledgerMetricLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.inkMuted,
    marginBottom: 2
  },
  ledgerMetricValue: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink
  },
  ledgerMeta: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6"
  },
  ledgerMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  ledgerMetaLabel: {
    fontSize: 12,
    color: colors.inkMuted
  },
  ledgerMetaValue: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink
  },
  ledgerFootnote: {
    gap: 4,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6"
  },
  ledgerFootnoteText: {
    fontSize: 11,
    color: colors.inkMuted,
    lineHeight: 15
  },
  dispatchWarningBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.sm
  },
  dispatchWarningKicker: {
    fontSize: 11,
    fontWeight: "900",
    color: "#991B1B",
    letterSpacing: 0.8
  },
  dispatchWarningText: {
    fontSize: 12,
    color: "#7F1D1D",
    lineHeight: 17
  },
  dispatchSummaryCard: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.md
  },
  dispatchSummaryTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: spacing.xs
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.inkMuted,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  checkboxBoxChecked: {
    backgroundColor: colors.blue,
    borderColor: colors.blue
  },
  checkboxCheckmark: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900"
  },
  checkboxLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
    flex: 1
  },
  executeButton: {
    backgroundColor: "#DC2626",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  executeButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700"
  },
  buttonDisabled: {
    opacity: 0.4
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: "900"
  },
  storyLinkSection: {
    padding: spacing.sm,
    backgroundColor: colors.paperMuted,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4
  },
  linkedStoryBox: {
    gap: 6
  },
  linkedStoryText: {
    fontSize: 12,
    color: colors.ink
  },
  openStoryButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.blue,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  openStoryButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700"
  },
  unlinkedStoryBox: {
    paddingVertical: 2
  },
  unlinkedStoryText: {
    fontSize: 12,
    color: colors.inkMuted,
    fontStyle: "italic"
  },
  scheduleRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
    marginTop: 4
  },
  scheduleField: {
    flex: 1,
    minWidth: 140,
    gap: 4
  },
  subFieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted
  },
  alertCardAuthorText: {
    fontSize: 11,
    color: colors.inkMuted
  },
  alertCardScheduledText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.blue
  },
  alertCardSegmentText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.navy
  }
});
