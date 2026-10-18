import { useCallback, useEffect, useMemo, useState } from "react";
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
  NEWSROOM_WHATSAPP_BROADCAST_STATUSES,
  NEWSROOM_WHATSAPP_BROADCAST_TYPES,
  NEWSROOM_WHATSAPP_DISPATCH_STATUSES,
  validateWhatsAppBroadcastCreateInput,
  type NewsroomWhatsAppBroadcast,
  type NewsroomWhatsAppBroadcastCreateInput,
  type NewsroomWhatsAppBroadcastStatus,
  type NewsroomWhatsAppBroadcastType,
  type NewsroomWhatsAppDispatch,
  type NewsroomWhatsAppDispatchResult,
  type NewsroomWhatsAppDispatchStatus
} from "../domain/models";
import {
  hasServerCapability,
  hasWhatsAppDeskAccess,
  resolveWhatsAppDeskCapabilityState,
  type AuthorizationSnapshot,
  type WhatsAppDeskCapabilityMatrix
} from "../security/capabilities";
import { services } from "../services";
import { breakpoints, colors, radius, spacing } from "../theme/tokens";

const TYPE_STYLES: Record<NewsroomWhatsAppBroadcastType, ViewStyle> = {
  breaking_alert: { backgroundColor: "#FEE2E2" },
  daily_briefing: { backgroundColor: "#E0F2FE" },
  story_update: { backgroundColor: "#FEF3C7" },
  health_alert: { backgroundColor: "#FCE7F3" }
};

const STATUS_STYLES: Record<NewsroomWhatsAppBroadcastStatus, ViewStyle> = {
  draft: { backgroundColor: "#F1F5F9" },
  approved: { backgroundColor: "#DCFCE7" },
  sent: { backgroundColor: "#DBEAFE" },
  rejected: { backgroundColor: "#FEE2E2" }
};

const DISPATCH_STATUS_STYLES: Record<NewsroomWhatsAppDispatchStatus, ViewStyle> = {
  "submitted": { backgroundColor: "#FEF3C7" },
  "provider-accepted": { backgroundColor: "#DCFCE7" },
  "partially-accepted": { backgroundColor: "#FEF3C7" },
  "provider-rejected": { backgroundColor: "#FEE2E2" },
  "unconfigured": { backgroundColor: "#F3E8FF" },
  "delivery-failed": { backgroundColor: "#FEE2E2" }
};

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (isNaN(parsed.getTime())) return "—";
  return parsed.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function formatTypeLabel(type: NewsroomWhatsAppBroadcastType): string {
  switch (type) {
    case "breaking_alert":
      return "Breaking Alert";
    case "daily_briefing":
      return "Daily Briefing";
    case "story_update":
      return "Story Update";
    case "health_alert":
      return "Health Alert";
    default:
      return type;
  }
}

export interface StudioWhatsAppDeskViewProps {
  broadcasts: NewsroomWhatsAppBroadcast[];
  selectedBroadcastId: string | null;
  onSelectBroadcast: (id: string) => void;
  statusFilter: NewsroomWhatsAppBroadcastStatus | "all";
  onChangeStatusFilter: (filter: NewsroomWhatsAppBroadcastStatus | "all") => void;
  typeFilter: NewsroomWhatsAppBroadcastType | "all";
  onChangeTypeFilter: (filter: NewsroomWhatsAppBroadcastType | "all") => void;
  searchQuery: string;
  onChangeSearchQuery: (query: string) => void;
  isCreating: boolean;
  onStartCreate: () => void;
  onCancelCreate: () => void;
  onCreateBroadcast: (input: NewsroomWhatsAppBroadcastCreateInput) => Promise<void>;
  onApproveBroadcast: (id: string) => Promise<void>;
  onRejectBroadcast: (id: string, reason?: string) => Promise<void>;
  onDispatchBroadcast: (id: string) => Promise<void>;
  capabilities: WhatsAppDeskCapabilityMatrix;
  isSubmitting: boolean;
  actionMessage: string | null;
  actionErrorMessage: string | null;
  onDismissMessage: () => void;
}

export function StudioWhatsAppDeskView({
  broadcasts,
  selectedBroadcastId,
  onSelectBroadcast,
  statusFilter,
  onChangeStatusFilter,
  typeFilter,
  onChangeTypeFilter,
  searchQuery,
  onChangeSearchQuery,
  isCreating,
  onStartCreate,
  onCancelCreate,
  onCreateBroadcast,
  onApproveBroadcast,
  onRejectBroadcast,
  onDispatchBroadcast,
  capabilities,
  isSubmitting,
  actionMessage,
  actionErrorMessage,
  onDismissMessage
}: StudioWhatsAppDeskViewProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.tablet;

  // New broadcast form state
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newType, setNewType] = useState<NewsroomWhatsAppBroadcastType>("breaking_alert");
  const [newStoryId, setNewStoryId] = useState("");
  const [createValidationMessage, setCreateValidationMessage] = useState<string | null>(null);

  // Dispatch confirmation dialog state
  const [confirmDispatchVisible, setConfirmDispatchVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectDialogVisible, setRejectDialogVisible] = useState(false);

  const selectedBroadcast = useMemo(
    () => broadcasts.find((b) => b.id === selectedBroadcastId) ?? null,
    [broadcasts, selectedBroadcastId]
  );

  const filteredBroadcasts = useMemo(() => {
    return broadcasts.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (typeFilter !== "all" && b.broadcastType !== typeFilter) return false;
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        return (
          b.title.toLowerCase().includes(q) ||
          b.body.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [broadcasts, statusFilter, typeFilter, searchQuery]);

  const handleCreateSubmit = async () => {
    const input: NewsroomWhatsAppBroadcastCreateInput = {
      title: newTitle.trim(),
      body: newBody.trim(),
      broadcast_type: newType,
      channel_identity: "healthtimes-whatsapp-channel",
      related_story_id: newStoryId.trim() ? newStoryId.trim() : null
    };

    const validation = validateWhatsAppBroadcastCreateInput(input);
    if (!validation.valid) {
      setCreateValidationMessage(validation.error || "Invalid input");
      return;
    }

    setCreateValidationMessage(null);
    try {
      await onCreateBroadcast(input);
      setNewTitle("");
      setNewBody("");
      setNewStoryId("");
      setNewType("breaking_alert");
      onCancelCreate();
    } catch {
      // Error handled by parent
    }
  };

  const handleDispatchConfirmed = async () => {
    if (!selectedBroadcast) return;
    setConfirmDispatchVisible(false);
    await onDispatchBroadcast(selectedBroadcast.id);
  };

  const handleRejectConfirmed = async () => {
    if (!selectedBroadcast) return;
    setRejectDialogVisible(false);
    await onRejectBroadcast(selectedBroadcast.id, rejectReason.trim());
    setRejectReason("");
  };

  return (
    <View style={styles.container} testID="whatsapp-desk">
      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>WhatsApp Distribution Desk</Text>
          <Text style={styles.headerSubtitle}>
            Editorial broadcasts & WhatsApp Cloud API delivery ledger
          </Text>
        </View>
        {capabilities.canCreate && !isCreating && (
          <Pressable
            style={styles.primaryButton}
            onPress={onStartCreate}
            accessibilityRole="button"
            testID="whatsapp-new-broadcast-btn"
          >
            <Text style={styles.primaryButtonText}>+ New Broadcast</Text>
          </Pressable>
        )}
      </View>

      {/* Notifications / Messages */}
      {actionMessage && (
        <View style={styles.messageBanner}>
          <Text style={styles.messageBannerText}>{actionMessage}</Text>
          <Pressable onPress={onDismissMessage}>
            <Text style={styles.messageBannerClose}>✕</Text>
          </Pressable>
        </View>
      )}

      {actionErrorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{actionErrorMessage}</Text>
          <Pressable onPress={onDismissMessage}>
            <Text style={styles.errorBannerClose}>✕</Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.mainLayout, isDesktop ? styles.desktopLayout : styles.mobileLayout]}>
        {/* Left Column: Filter & Broadcast List */}
        <View style={[styles.listColumn, isDesktop && styles.desktopListColumn]}>
          {/* Search Bar */}
          <TextInput
            style={styles.searchInput}
            placeholder="Search broadcasts…"
            placeholderTextColor={colors.inkMuted}
            value={searchQuery}
            onChangeText={onChangeSearchQuery}
            testID="whatsapp-search-input"
          />

          {/* Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {(["all", ...NEWSROOM_WHATSAPP_BROADCAST_STATUSES] as const).map((st) => (
              <Pressable
                key={st}
                style={[
                  styles.filterPill,
                  statusFilter === st && styles.filterPillActive
                ]}
                onPress={() => onChangeStatusFilter(st)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    statusFilter === st && styles.filterPillTextActive
                  ]}
                >
                  {st === "all" ? "All" : st.charAt(0).toUpperCase() + st.slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Broadcast List */}
          <ScrollView style={styles.broadcastList} testID="whatsapp-broadcast-list">
            {filteredBroadcasts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No broadcasts found</Text>
                <Text style={styles.emptyStateSubtitle}>
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting filters or search query."
                    : "Create a new WhatsApp broadcast to begin."}
                </Text>
              </View>
            ) : (
              filteredBroadcasts.map((b) => {
                const isSelected = b.id === selectedBroadcastId;
                return (
                  <Pressable
                    key={b.id}
                    style={[
                      styles.broadcastItem,
                      isSelected && styles.broadcastItemSelected
                    ]}
                    onPress={() => onSelectBroadcast(b.id)}
                    testID={`whatsapp-broadcast-item-${b.id}`}
                  >
                    <View style={styles.broadcastItemHeader}>
                      <View
                        style={[
                          styles.badge,
                          TYPE_STYLES[b.broadcastType] || styles.badgeDefault
                        ]}
                      >
                        <Text style={styles.badgeText}>
                          {formatTypeLabel(b.broadcastType)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.badge,
                          STATUS_STYLES[b.status] || styles.badgeDefault
                        ]}
                      >
                        <Text style={styles.badgeText}>{b.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.broadcastItemTitle} numberOfLines={2}>
                      {b.title}
                    </Text>
                    <Text style={styles.broadcastItemMeta}>
                      {formatTimestamp(b.createdAt)}
                    </Text>
                    {b.dispatch && (
                      <View style={styles.dispatchSummaryRow}>
                        <View
                          style={[
                            styles.microBadge,
                            DISPATCH_STATUS_STYLES[b.dispatch.transportStatus]
                          ]}
                        >
                          <Text style={styles.microBadgeText}>
                            {b.dispatch.transportStatus}
                          </Text>
                        </View>
                        <Text style={styles.dispatchSummaryText}>
                          {b.dispatch.acceptedCount} acc • {b.dispatch.deliveredCount} del • {b.dispatch.readCount} read
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* Right Column: Broadcast Details / Create Form */}
        <ScrollView style={styles.detailColumn}>
          {isCreating ? (
            /* Creation Form */
            <View style={styles.formContainer}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>New WhatsApp Broadcast</Text>
                <Pressable onPress={onCancelCreate}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>

              {createValidationMessage && (
                <View style={styles.formError}>
                  <Text style={styles.formErrorText}>{createValidationMessage}</Text>
                </View>
              )}

              {/* Title */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Broadcast Title (3–200 chars)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. BREAKING: Health Ministry updates cholera guidelines"
                  placeholderTextColor={colors.inkMuted}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  maxLength={200}
                  testID="whatsapp-title-input"
                />
                <Text style={styles.charCounter}>{newTitle.length}/200</Text>
              </View>

              {/* Type */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Broadcast Type</Text>
                <View style={styles.typeSelector}>
                  {NEWSROOM_WHATSAPP_BROADCAST_TYPES.map((t) => (
                    <Pressable
                      key={t}
                      style={[
                        styles.typeButton,
                        newType === t && styles.typeButtonSelected
                      ]}
                      onPress={() => setNewType(t)}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          newType === t && styles.typeButtonTextSelected
                        ]}
                      >
                        {formatTypeLabel(t)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Body */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Message Body (10–4096 chars)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Draft your full WhatsApp update here. Use WhatsApp formatting like *bold* or _italic_ as desired."
                  placeholderTextColor={colors.inkMuted}
                  value={newBody}
                  onChangeText={setNewBody}
                  multiline
                  numberOfLines={6}
                  maxLength={4096}
                  testID="whatsapp-body-input"
                />
                <Text style={styles.charCounter}>{newBody.length}/4096</Text>
              </View>

              {/* Related Story ID */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Related Story UUID (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 11111111-1111-1111-1111-111111111111"
                  placeholderTextColor={colors.inkMuted}
                  value={newStoryId}
                  onChangeText={setNewStoryId}
                  autoCapitalize="none"
                  testID="whatsapp-story-id-input"
                />
              </View>

              {/* Channel Identity */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Channel Identity</Text>
                <Text style={styles.readOnlyField}>healthtimes-whatsapp-channel</Text>
              </View>

              {/* Submit Buttons */}
              <View style={styles.buttonRow}>
                <Pressable
                  style={[
                    styles.primaryButton,
                    (!newTitle.trim() || newBody.trim().length < 10 || isSubmitting) &&
                      styles.buttonDisabled
                  ]}
                  onPress={handleCreateSubmit}
                  disabled={!newTitle.trim() || newBody.trim().length < 10 || isSubmitting}
                  testID="whatsapp-create-submit-btn"
                >
                  <Text style={styles.primaryButtonText}>
                    {isSubmitting ? "Creating…" : "Save as Draft"}
                  </Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={onCancelCreate}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : selectedBroadcast ? (
            /* Selected Broadcast Detail */
            <View style={styles.detailContainer}>
              <View style={styles.detailHeader}>
                <View>
                  <View style={styles.detailBadgeRow}>
                    <View
                      style={[
                        styles.badge,
                        TYPE_STYLES[selectedBroadcast.broadcastType]
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {formatTypeLabel(selectedBroadcast.broadcastType)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        STATUS_STYLES[selectedBroadcast.status]
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {selectedBroadcast.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.detailTitle}>{selectedBroadcast.title}</Text>
                  <Text style={styles.detailMeta}>
                    Created: {formatTimestamp(selectedBroadcast.createdAt)}
                    {selectedBroadcast.approvedAt &&
                      ` • Approved: ${formatTimestamp(selectedBroadcast.approvedAt)}`}
                    {selectedBroadcast.sentAt &&
                      ` • Sent: ${formatTimestamp(selectedBroadcast.sentAt)}`}
                    {selectedBroadcast.rejectedAt &&
                      ` • Rejected: ${formatTimestamp(selectedBroadcast.rejectedAt)}`}
                  </Text>
                </View>
              </View>

              {/* Rejection Reason notice if rejected */}
              {selectedBroadcast.status === "rejected" && selectedBroadcast.rejectionReason && (
                <View style={styles.rejectedBanner}>
                  <Text style={styles.rejectedBannerTitle}>Editorial Rejection</Text>
                  <Text style={styles.rejectedBannerText}>
                    {selectedBroadcast.rejectionReason}
                  </Text>
                </View>
              )}

              {/* WhatsApp Live Simulation Preview */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionCardTitle}>WhatsApp Preview</Text>
                <View style={styles.whatsappPreviewWindow}>
                  <View style={styles.whatsappTopBar}>
                    <View style={styles.whatsappAvatar} />
                    <View>
                      <Text style={styles.whatsappChannelName}>
                        HealthTimes Zimbabwe ✓
                      </Text>
                      <Text style={styles.whatsappChannelSub}>Verified Channel</Text>
                    </View>
                  </View>
                  <View style={styles.whatsappBubble}>
                    <Text style={styles.whatsappBubbleTitle}>
                      *{selectedBroadcast.title}*
                    </Text>
                    <Text style={styles.whatsappBubbleBody}>
                      {selectedBroadcast.body}
                    </Text>
                    <View style={styles.whatsappBubbleFooter}>
                      <Text style={styles.whatsappBubbleTime}>
                        {formatTimestamp(selectedBroadcast.createdAt).slice(11, 16)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Delivery Ledger Card (if dispatched) */}
              {selectedBroadcast.dispatch && (
                <View style={styles.sectionCard} testID="whatsapp-delivery-ledger">
                  <Text style={styles.sectionCardTitle}>Delivery Ledger</Text>
                  <View style={styles.ledgerGrid}>
                    <View style={styles.ledgerMetric}>
                      <Text style={styles.ledgerMetricValue}>
                        {selectedBroadcast.dispatch.recipientCount}
                      </Text>
                      <Text style={styles.ledgerMetricLabel}>Recipients</Text>
                    </View>
                    <View style={styles.ledgerMetric}>
                      <Text style={styles.ledgerMetricValue}>
                        {selectedBroadcast.dispatch.acceptedCount}
                      </Text>
                      <Text style={styles.ledgerMetricLabel}>Accepted</Text>
                    </View>
                    <View style={styles.ledgerMetric}>
                      <Text style={styles.ledgerMetricValue}>
                        {selectedBroadcast.dispatch.deliveredCount}
                      </Text>
                      <Text style={styles.ledgerMetricLabel}>Delivered</Text>
                    </View>
                    <View style={styles.ledgerMetric}>
                      <Text style={styles.ledgerMetricValue}>
                        {selectedBroadcast.dispatch.readCount}
                      </Text>
                      <Text style={styles.ledgerMetricLabel}>Read</Text>
                    </View>
                  </View>
                  <View style={styles.ledgerMetaList}>
                    <Text style={styles.ledgerMetaItem}>
                      Transport Status:{" "}
                      <Text style={styles.boldText}>
                        {selectedBroadcast.dispatch.transportStatus}
                      </Text>
                    </Text>
                    <Text style={styles.ledgerMetaItem}>
                      Provider: {selectedBroadcast.dispatch.provider}
                    </Text>
                    <Text style={styles.ledgerMetaItem}>
                      Dispatched:{" "}
                      {formatTimestamp(selectedBroadcast.dispatch.dispatchedAt)}
                    </Text>
                    {selectedBroadcast.dispatch.failureReason && (
                      <Text style={styles.ledgerMetaError}>
                        Failure: {selectedBroadcast.dispatch.failureReason}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Action Bar */}
              <View style={styles.actionBar}>
                {selectedBroadcast.status === "draft" && (
                  <>
                    {capabilities.canApprove ? (
                      <Pressable
                        style={[styles.approveButton, isSubmitting && styles.buttonDisabled]}
                        onPress={() => onApproveBroadcast(selectedBroadcast.id)}
                        disabled={isSubmitting}
                        testID="whatsapp-approve-btn"
                      >
                        <Text style={styles.approveButtonText}>
                          {isSubmitting ? "Approving…" : "✓ Approve for Distribution"}
                        </Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.permissionHint}>
                        Approving requires `story.publish` capability.
                      </Text>
                    )}

                    {capabilities.canReject && (
                      <Pressable
                        style={styles.rejectButton}
                        onPress={() => setRejectDialogVisible(true)}
                        disabled={isSubmitting}
                        testID="whatsapp-reject-btn"
                      >
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </Pressable>
                    )}
                  </>
                )}

                {selectedBroadcast.status === "approved" && (
                  <>
                    {capabilities.canDispatch ? (
                      <Pressable
                        style={[styles.dispatchButton, isSubmitting && styles.buttonDisabled]}
                        onPress={() => setConfirmDispatchVisible(true)}
                        disabled={isSubmitting}
                        testID="whatsapp-dispatch-btn"
                      >
                        <Text style={styles.dispatchButtonText}>
                          {isSubmitting ? "Dispatching…" : "🚀 Dispatch to WhatsApp"}
                        </Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.permissionHint}>
                        Dispatching requires `story.publish` capability.
                      </Text>
                    )}

                    {capabilities.canReject && (
                      <Pressable
                        style={styles.rejectButton}
                        onPress={() => setRejectDialogVisible(true)}
                        disabled={isSubmitting}
                      >
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </Pressable>
                    )}
                  </>
                )}

                {selectedBroadcast.status === "sent" && (
                  <View style={styles.sentNotice}>
                    <Text style={styles.sentNoticeText}>
                      ✓ This broadcast has been dispatched. Delivery status updates via webhook receipts.
                    </Text>
                  </View>
                )}
              </View>

              {/* Dispatch Confirmation Modal */}
              {confirmDispatchVisible && (
                <View style={styles.modalOverlay}>
                  <View style={styles.modalCard}>
                    <Text style={styles.modalTitle}>Confirm WhatsApp Broadcast</Text>
                    <Text style={styles.modalBody}>
                      Are you sure you want to broadcast "{selectedBroadcast.title}" to WhatsApp?
                      This action will initiate irreversible provider delivery via the WhatsApp Cloud API.
                    </Text>
                    <View style={styles.modalActions}>
                      <Pressable
                        style={styles.primaryButton}
                        onPress={handleDispatchConfirmed}
                        testID="whatsapp-confirm-dispatch-btn"
                      >
                        <Text style={styles.primaryButtonText}>Confirm & Send</Text>
                      </Pressable>
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() => setConfirmDispatchVisible(false)}
                      >
                        <Text style={styles.secondaryButtonText}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}

              {/* Reject Reason Dialog */}
              {rejectDialogVisible && (
                <View style={styles.modalOverlay}>
                  <View style={styles.modalCard}>
                    <Text style={styles.modalTitle}>Reject WhatsApp Broadcast</Text>
                    <Text style={styles.modalBody}>
                      Provide an editorial rationale for rejecting this broadcast:
                    </Text>
                    <TextInput
                      style={[styles.textInput, { marginVertical: spacing.md }]}
                      placeholder="e.g. Unverified source / headline tone needs adjustment"
                      placeholderTextColor={colors.inkMuted}
                      value={rejectReason}
                      onChangeText={setRejectReason}
                      testID="whatsapp-reject-reason-input"
                    />
                    <View style={styles.modalActions}>
                      <Pressable
                        style={styles.dangerButton}
                        onPress={handleRejectConfirmed}
                        testID="whatsapp-confirm-reject-btn"
                      >
                        <Text style={styles.dangerButtonText}>Reject Broadcast</Text>
                      </Pressable>
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() => setRejectDialogVisible(false)}
                      >
                        <Text style={styles.secondaryButtonText}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}
            </View>
          ) : (
            /* No Selection */
            <View style={styles.emptyDetail}>
              <Text style={styles.emptyDetailText}>
                Select a broadcast to review its status and delivery ledger, or click "+ New Broadcast" to draft.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

export function StudioWhatsAppDesk() {
  const [broadcasts, setBroadcasts] = useState<NewsroomWhatsAppBroadcast[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<NewsroomWhatsAppBroadcastStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<NewsroomWhatsAppBroadcastType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [capabilities, setCapabilities] = useState<WhatsAppDeskCapabilityMatrix>({
    hasDeskAccess: false,
    canCreate: false,
    canApprove: false,
    canReject: false,
    canDispatch: false
  });

  const loadCapabilities = useCallback(async () => {
    try {
      const snapshot = await services.authorization.getSnapshot();
      setCapabilities(resolveWhatsAppDeskCapabilityState(snapshot));
    } catch {
      setCapabilities({
        hasDeskAccess: false,
        canCreate: false,
        canApprove: false,
        canReject: false,
        canDispatch: false
      });
    }
  }, []);

  const loadBroadcasts = useCallback(async () => {
    try {
      const list = await services.newsroomWhatsApp.listBroadcasts();
      setBroadcasts(list);
      if (list.length > 0 && !selectedId && list[0]) {
        setSelectedId(list[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load WhatsApp broadcasts");
    }
  }, [selectedId]);

  useEffect(() => {
    loadCapabilities();
    loadBroadcasts();
  }, [loadCapabilities, loadBroadcasts]);

  const handleCreateBroadcast = async (input: NewsroomWhatsAppBroadcastCreateInput) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const newId = await services.newsroomWhatsApp.createBroadcast(input);
      setActionMessage("Broadcast draft created successfully.");
      setIsCreating(false);
      await loadBroadcasts();
      setSelectedId(newId);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create broadcast");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveBroadcast = async (id: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await services.newsroomWhatsApp.approveBroadcast(id);
      setActionMessage("Broadcast approved for distribution.");
      await loadBroadcasts();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to approve broadcast");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectBroadcast = async (id: string, reason?: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await services.newsroomWhatsApp.rejectBroadcast(id, reason);
      setActionMessage("Broadcast rejected.");
      await loadBroadcasts();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reject broadcast");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatchBroadcast = async (id: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await services.newsroomWhatsApp.dispatchBroadcast(id);
      setActionMessage(`Broadcast dispatched: ${res.transport_status} (${res.accepted_count} accepted).`);
      await loadBroadcasts();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to dispatch broadcast");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StudioWhatsAppDeskView
      broadcasts={broadcasts}
      selectedBroadcastId={selectedId}
      onSelectBroadcast={setSelectedId}
      statusFilter={statusFilter}
      onChangeStatusFilter={setStatusFilter}
      typeFilter={typeFilter}
      onChangeTypeFilter={setTypeFilter}
      searchQuery={searchQuery}
      onChangeSearchQuery={setSearchQuery}
      isCreating={isCreating}
      onStartCreate={() => setIsCreating(true)}
      onCancelCreate={() => setIsCreating(false)}
      onCreateBroadcast={handleCreateBroadcast}
      onApproveBroadcast={handleApproveBroadcast}
      onRejectBroadcast={handleRejectBroadcast}
      onDispatchBroadcast={handleDispatchBroadcast}
      capabilities={capabilities}
      isSubmitting={isSubmitting}
      actionMessage={actionMessage}
      actionErrorMessage={errorMessage}
      onDismissMessage={() => {
        setActionMessage(null);
        setErrorMessage(null);
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  headerTitleGroup: {
    flex: 1
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.ink
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 2
  },
  mainLayout: {
    flex: 1
  },
  desktopLayout: {
    flexDirection: "row"
  },
  mobileLayout: {
    flexDirection: "column"
  },
  listColumn: {
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: colors.border,
    padding: spacing.md
  },
  desktopListColumn: {
    width: 360
  },
  detailColumn: {
    flex: 1,
    padding: spacing.xl
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: "#F8FAFC",
    marginBottom: spacing.sm
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: "#F1F5F9"
  },
  filterPillActive: {
    backgroundColor: colors.ink
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.inkMuted
  },
  filterPillTextActive: {
    color: "#FFFFFF"
  },
  broadcastList: {
    flex: 1
  },
  broadcastItem: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF",
    marginBottom: spacing.sm,
    gap: spacing.xs
  },
  broadcastItemSelected: {
    borderColor: colors.blue,
    backgroundColor: "#F0F9FF"
  },
  broadcastItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  broadcastItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    lineHeight: 18
  },
  broadcastItemMeta: {
    fontSize: 11,
    color: colors.inkMuted
  },
  badge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  badgeDefault: {
    backgroundColor: "#F1F5F9"
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink
  },
  microBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.sm
  },
  microBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.ink
  },
  dispatchSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 2
  },
  dispatchSummaryText: {
    fontSize: 10,
    color: colors.inkMuted
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: 4
  },
  emptyDetail: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl
  },
  emptyDetailText: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: "center"
  },
  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink
  },
  cancelText: {
    fontSize: 14,
    color: colors.blue,
    fontWeight: "600"
  },
  formError: {
    backgroundColor: "#FEE2E2",
    padding: spacing.md,
    borderRadius: radius.sm
  },
  formErrorText: {
    fontSize: 13,
    color: "#991B1B",
    fontWeight: "600"
  },
  formGroup: {
    gap: spacing.xs
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: "#FFFFFF"
  },
  textArea: {
    height: 120,
    textAlignVertical: "top"
  },
  charCounter: {
    fontSize: 11,
    color: colors.inkMuted,
    textAlign: "right"
  },
  typeSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  typeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF"
  },
  typeButtonSelected: {
    borderColor: colors.blue,
    backgroundColor: "#EFF6FF"
  },
  typeButtonText: {
    fontSize: 12,
    color: colors.inkMuted,
    fontWeight: "600"
  },
  typeButtonTextSelected: {
    color: colors.blue,
    fontWeight: "700"
  },
  readOnlyField: {
    fontSize: 13,
    color: colors.inkMuted,
    backgroundColor: "#F8FAFC",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md
  },
  primaryButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700"
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "600"
  },
  dangerButton: {
    backgroundColor: "#DC2626",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  dangerButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700"
  },
  buttonDisabled: {
    opacity: 0.5
  },
  detailContainer: {
    gap: spacing.lg
  },
  detailHeader: {
    backgroundColor: "#FFFFFF",
    padding: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  detailBadgeRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.sm
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
    lineHeight: 24
  },
  detailMeta: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: spacing.xs
  },
  rejectedBanner: {
    backgroundColor: "#FEE2E2",
    padding: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626"
  },
  rejectedBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#991B1B"
  },
  rejectedBannerText: {
    fontSize: 12,
    color: "#7F1D1D",
    marginTop: 2
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink
  },
  whatsappPreviewWindow: {
    backgroundColor: "#E5DDD5",
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D1D5DB"
  },
  whatsappTopBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#075E54",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  whatsappAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#128C7E"
  },
  whatsappChannelName: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13
  },
  whatsappChannelSub: {
    color: "#D1FAE5",
    fontSize: 10
  },
  whatsappBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    padding: spacing.md,
    margin: spacing.md,
    maxWidth: "85%",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    gap: 4
  },
  whatsappBubbleTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827"
  },
  whatsappBubbleBody: {
    fontSize: 13,
    color: "#1F2937",
    lineHeight: 18
  },
  whatsappBubbleFooter: {
    alignSelf: "flex-end"
  },
  whatsappBubbleTime: {
    fontSize: 10,
    color: "#6B7280"
  },
  ledgerGrid: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.xs
  },
  ledgerMetric: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: "center"
  },
  ledgerMetricValue: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.ink
  },
  ledgerMetricLabel: {
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2
  },
  ledgerMetaList: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md
  },
  ledgerMetaItem: {
    fontSize: 12,
    color: colors.inkMuted
  },
  ledgerMetaError: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600"
  },
  boldText: {
    fontWeight: "700",
    color: colors.ink
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "#FFFFFF",
    padding: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  approveButton: {
    backgroundColor: "#16A34A",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md
  },
  approveButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14
  },
  dispatchButton: {
    backgroundColor: "#059669",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md
  },
  dispatchButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14
  },
  rejectButton: {
    borderWidth: 1,
    borderColor: "#DC2626",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md
  },
  rejectButtonText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 14
  },
  permissionHint: {
    fontSize: 12,
    color: colors.inkMuted,
    fontStyle: "italic"
  },
  sentNotice: {
    flex: 1
  },
  sentNoticeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#059669"
  },
  messageBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#86EFAC"
  },
  messageBannerText: {
    fontSize: 13,
    color: "#166534",
    fontWeight: "600"
  },
  messageBannerClose: {
    fontSize: 14,
    color: "#166534",
    padding: 4
  },
  errorBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#FCA5A5"
  },
  errorBannerText: {
    fontSize: 13,
    color: "#991B1B",
    fontWeight: "600"
  },
  errorBannerClose: {
    fontSize: 14,
    color: "#991B1B",
    padding: 4
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 480,
    gap: spacing.md
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.ink
  },
  modalBody: {
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm
  }
});
