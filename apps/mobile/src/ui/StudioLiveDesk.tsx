import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from "react-native";
import { services } from "../services";
import { StudioAccessGate } from "./Studio";
import {
  validateLiveCoverageCreateInput,
  validateLiveCoveragePatch,
  type NewsroomLiveCoverage,
  type NewsroomLiveCoverageCreateInput,
  type NewsroomLiveCoverageKind,
  type NewsroomLiveCoverageListOptions,
  type NewsroomLiveCoveragePatch,
  type NewsroomLiveCoverageStatus
} from "../domain/models";
import { breakpoints, colors as tokenColors, radius, spacing } from "../theme/tokens";

const colors = {
  ...tokenColors,
  white: "#FFFFFF",
  gray50: "#F8FAFC",
  gray100: "#F1F5F9",
  gray200: "#E2E8F0",
  gray300: "#CBD5E1",
  gray400: "#94A3B8",
  gray500: "#64748B",
  gray600: "#475569",
  gray700: "#334155",
  gray800: "#1E293B",
  gray900: "#0F172A",
  blue50: "#EFF6FF",
  blue100: "#DBEAFE",
  blue600: "#2563EB",
  blue700: "#1D4ED8",
  blue900: "#1E3A8A",
  amber50: "#FFFBEB",
  amber100: "#FEF3C7",
  amber300: "#FCD34D",
  amber600: "#D97706",
  amber700: "#B45309",
  amber800: "#92400E",
  emerald50: "#ECFDF5",
  emerald100: "#D1FAE5",
  emerald300: "#6EE7B7",
  emerald600: "#059669",
  emerald700: "#047857",
  emerald800: "#065F46",
  emerald900: "#064E3B",
  rose50: "#FFF1F2",
  rose100: "#FFE4E6",
  rose200: "#FECDD3",
  rose600: "#E11D48",
  rose700: "#BE123C",
  rose800: "#9F1239",
  rose900: "#881337"
};

export function hasLiveDeskAuthority(snapshot: unknown): boolean {
  if (!snapshot || typeof snapshot !== "object") return false;
  const s = snapshot as {
    status?: unknown;
    source?: unknown;
    capabilities?: unknown;
  };
  return (
    s.status === "authorized" &&
    s.source === "server" &&
    Array.isArray(s.capabilities) &&
    s.capabilities.includes("story.publish")
  );
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Not set";
  try {
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? iso
      : d.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
  } catch {
    return iso;
  }
}

export type StudioLiveDeskViewProps = {
  coverage: NewsroomLiveCoverage[];
  stories?: Array<{ id: string; title: string }>;
  mediaAssets?: Array<{ id: string; filename?: string; publicUrl?: string | null; altText?: string | null }>;
  loading?: boolean;
  error?: string | null;
  selectedCoverageId?: string | null;
  onSelectCoverage?: (id: string | null) => void;
  searchQuery?: string;
  onSearch?: (query: string) => void;
  statusFilter?: "all" | NewsroomLiveCoverageStatus;
  onStatusFilterChange?: (status: "all" | NewsroomLiveCoverageStatus) => void;
  kindFilter?: "all" | NewsroomLiveCoverageKind;
  onKindFilterChange?: (kind: "all" | NewsroomLiveCoverageKind) => void;
  onRefresh?: () => void;
  isOwnerPreview?: boolean;
  onCreateCoverage?: (input: NewsroomLiveCoverageCreateInput) => Promise<string | void>;
  onSaveCoverage?: (
    id: string,
    expectedVersion: number,
    patch: NewsroomLiveCoveragePatch
  ) => Promise<number | void>;
  onStartCoverage?: (
    id: string,
    expectedVersion: number
  ) => Promise<number | void>;
  onEndCoverage?: (
    id: string,
    expectedVersion: number
  ) => Promise<number | void>;
};

export function StudioLiveDeskView({
  coverage,
  stories = [],
  mediaAssets = [],
  loading = false,
  error = null,
  selectedCoverageId = null,
  onSelectCoverage,
  searchQuery: searchQueryProp,
  onSearch,
  statusFilter = "all",
  onStatusFilterChange,
  kindFilter = "all",
  onKindFilterChange,
  onRefresh,
  isOwnerPreview = false,
  onCreateCoverage,
  onSaveCoverage,
  onStartCoverage,
  onEndCoverage
}: StudioLiveDeskViewProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;

  const [internalSearchQuery, setInternalSearchQuery] = useState(searchQueryProp ?? "");
  const searchQuery = searchQueryProp !== undefined ? searchQueryProp : internalSearchQuery;

  useEffect(() => {
    if (searchQueryProp !== undefined) {
      setInternalSearchQuery(searchQueryProp);
    }
  }, [searchQueryProp]);

  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // New Coverage Form State
  const [newTitle, setNewTitle] = useState("");
  const [newKind, setNewKind] = useState<NewsroomLiveCoverageKind>("live-blog");
  const [newScheduledAt, setNewScheduledAt] = useState("");
  const [newRelatedStoryId, setNewRelatedStoryId] = useState<string | null>(null);
  const [newMediaId, setNewMediaId] = useState<string | null>(null);
  const [newProvenance, setNewProvenance] = useState("HealthTimes Live Desk Operations");
  const [createFeedback, setCreateFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Active Selected Item
  const selectedItem = useMemo(
    () => coverage.find((c) => c.id === selectedCoverageId) ?? null,
    [coverage, selectedCoverageId]
  );

  // Edit Coverage Form State
  const [editTitle, setEditTitle] = useState("");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [editRelatedStoryId, setEditRelatedStoryId] = useState<string | null>(null);
  const [editMediaId, setEditMediaId] = useState<string | null>(null);
  const [editProvenance, setEditProvenance] = useState("");
  const [saveFeedback, setSaveFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [saveSubmitting, setSaveSubmitting] = useState(false);
  const [startSubmitting, setStartSubmitting] = useState(false);
  const [endSubmitting, setEndSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"start" | "end" | null>(null);

  // Sync edit form with selected item
  useEffect(() => {
    if (selectedItem) {
      setEditTitle(selectedItem.title);
      setEditScheduledAt(selectedItem.scheduledAt ?? "");
      setEditRelatedStoryId(selectedItem.relatedStoryId);
      setEditMediaId(selectedItem.mediaId);
      setEditProvenance(selectedItem.sourceProvenance);
      setSaveFeedback(null);
      setConfirmAction(null);
      setIsCreatingNew(false);
    }
  }, [selectedItem]);

  // Counters
  const counts = useMemo(() => {
    let upcoming = 0;
    let live = 0;
    let ended = 0;
    for (const c of coverage) {
      if (c.status === "upcoming") upcoming++;
      else if (c.status === "live") live++;
      else if (c.status === "ended") ended++;
    }
    return { total: coverage.length, upcoming, live, ended };
  }, [coverage]);

  // Filtered Registry
  const filteredCoverage = useMemo(() => {
    let list = coverage;
    if (statusFilter !== "all") {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (kindFilter !== "all") {
      list = list.filter((c) => c.kind === kindFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.sourceProvenance.toLowerCase().includes(q)
      );
    }
    return list;
  }, [coverage, statusFilter, kindFilter, searchQuery]);

  const handleSearchChange = (text: string) => {
    setInternalSearchQuery(text);
    onSearch?.(text);
  };

  const handleStartCreate = () => {
    setIsCreatingNew(true);
    onSelectCoverage?.(null);
    setNewTitle("");
    setNewKind("live-blog");
    setNewScheduledAt("");
    setNewRelatedStoryId(null);
    setNewMediaId(null);
    setNewProvenance("HealthTimes Live Desk Operations");
    setCreateFeedback(null);
    setConfirmAction(null);
  };

  const handleCancelCreate = () => {
    setIsCreatingNew(false);
    setCreateFeedback(null);
  };

  const handleSubmitCreate = async () => {
    if (createSubmitting) return;
    setCreateFeedback(null);

    const input: NewsroomLiveCoverageCreateInput = {
      title: newTitle.trim(),
      kind: newKind,
      scheduledAt: newScheduledAt.trim().length > 0 ? newScheduledAt.trim() : null,
      relatedStoryId: newRelatedStoryId,
      mediaId: newMediaId,
      sourceProvenance: newProvenance.trim()
    };

    const val = validateLiveCoverageCreateInput(input);
    if (!val.valid) {
      setCreateFeedback({ type: "error", message: val.error || "Invalid coverage input." });
      return;
    }

    try {
      setCreateSubmitting(true);
      if (onCreateCoverage) {
        const newId = await onCreateCoverage(input);
        if (newId) {
          onSelectCoverage?.(newId);
          setIsCreatingNew(false);
        }
      }
    } catch (err: any) {
      setCreateFeedback({
        type: "error",
        message: err?.message || "Failed to create live coverage."
      });
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleSaveCoverage = async () => {
    if (!selectedItem || saveSubmitting) return;
    setSaveFeedback(null);

    const patch: NewsroomLiveCoveragePatch = {};
    if (editTitle.trim() !== selectedItem.title) {
      patch.title = editTitle.trim();
    }
    const currentSched = selectedItem.scheduledAt ?? "";
    if (editScheduledAt.trim() !== currentSched) {
      patch.scheduledAt = editScheduledAt.trim().length > 0 ? editScheduledAt.trim() : null;
    }
    if (editRelatedStoryId !== selectedItem.relatedStoryId) {
      patch.relatedStoryId = editRelatedStoryId;
    }
    if (editMediaId !== selectedItem.mediaId) {
      patch.mediaId = editMediaId;
    }
    if (editProvenance.trim() !== selectedItem.sourceProvenance) {
      patch.sourceProvenance = editProvenance.trim();
    }

    if (Object.keys(patch).length === 0) {
      setSaveFeedback({ type: "error", message: "No changes detected to save." });
      return;
    }

    const val = validateLiveCoveragePatch(patch);
    if (!val.valid) {
      setSaveFeedback({ type: "error", message: val.error || "Invalid patch values." });
      return;
    }

    try {
      setSaveSubmitting(true);
      if (onSaveCoverage) {
        await onSaveCoverage(selectedItem.id, selectedItem.lockVersion, patch);
        setSaveFeedback({ type: "success", message: "Live coverage metadata saved successfully." });
      }
    } catch (err: any) {
      setSaveFeedback({
        type: "error",
        message: err?.message || "Failed to save live coverage."
      });
    } finally {
      setSaveSubmitting(false);
    }
  };

  const handleStartLive = async () => {
    if (!selectedItem || startSubmitting) return;
    setSaveFeedback(null);
    try {
      setStartSubmitting(true);
      if (onStartCoverage) {
        await onStartCoverage(selectedItem.id, selectedItem.lockVersion);
        setConfirmAction(null);
        setSaveFeedback({
          type: "success",
          message: "Live coverage started successfully! Now publicly visible in HealthTimes Live."
        });
      }
    } catch (err: any) {
      setSaveFeedback({
        type: "error",
        message: err?.message || "Failed to start live coverage."
      });
    } finally {
      setStartSubmitting(false);
    }
  };

  const handleEndLive = async () => {
    if (!selectedItem || endSubmitting) return;
    setSaveFeedback(null);
    try {
      setEndSubmitting(true);
      if (onEndCoverage) {
        await onEndCoverage(selectedItem.id, selectedItem.lockVersion);
        setConfirmAction(null);
        setSaveFeedback({
          type: "success",
          message: "Live coverage ended and locked. Public projection updated."
        });
      }
    } catch (err: any) {
      setSaveFeedback({
        type: "error",
        message: err?.message || "Failed to end live coverage."
      });
    } finally {
      setEndSubmitting(false);
    }
  };

  const selectedMediaAsset = useMemo(() => {
    if (!selectedItem?.mediaId) return null;
    return mediaAssets.find((m) => m.id === selectedItem.mediaId) ?? null;
  }, [selectedItem, mediaAssets]);

  return (
    <View style={styles.container} testID="studio-live-desk-container">
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Live Desk Control Plane</Text>
          <Text style={styles.headerSubtitle}>
            Editorial coordination, scheduling, related story linking, and public HealthTimes Live projection.
          </Text>
        </View>
        <View style={styles.headerActions}>
          {onRefresh && (
            <Pressable
              style={styles.refreshBtn}
              onPress={onRefresh}
              accessibilityLabel="Refresh live coverage"
            >
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.newCoverageBtn, isCreatingNew && styles.btnDisabled]}
            onPress={handleStartCreate}
            disabled={isCreatingNew}
            testID="new-live-coverage-button"
          >
            <Text style={styles.newCoverageBtnText}>+ New Coverage</Text>
          </Pressable>
        </View>
      </View>

      {/* Metrics Counters */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{counts.total}</Text>
          <Text style={styles.metricLabel}>Total Registry</Text>
        </View>
        <View style={[styles.metricCard, { borderLeftColor: colors.blue600 }]}>
          <Text style={[styles.metricValue, { color: colors.blue700 }]}>{counts.upcoming}</Text>
          <Text style={styles.metricLabel}>Upcoming</Text>
        </View>
        <View style={[styles.metricCard, { borderLeftColor: colors.rose600 }]}>
          <Text style={[styles.metricValue, { color: colors.rose700 }]}>{counts.live}</Text>
          <Text style={styles.metricLabel}>Currently Live</Text>
        </View>
        <View style={[styles.metricCard, { borderLeftColor: colors.gray500 }]}>
          <Text style={[styles.metricValue, { color: colors.gray700 }]}>{counts.ended}</Text>
          <Text style={styles.metricLabel}>Ended & Locked</Text>
        </View>
      </View>

      {/* Filter / Search Bar */}
      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title or provenance…"
            placeholderTextColor={colors.gray400}
            value={searchQuery}
            onChangeText={handleSearchChange}
            testID="live-desk-search-input"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => handleSearchChange("")} style={styles.clearSearchBtn}>
              <Text style={styles.clearSearchText}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* Status Filters */}
        <View style={styles.filterPills}>
          <Text style={styles.filterGroupLabel}>Status:</Text>
          {(["all", "upcoming", "live", "ended"] as const).map((s) => (
            <Pressable
              key={s}
              style={[
                styles.filterPill,
                statusFilter === s && styles.filterPillActive
              ]}
              onPress={() => onStatusFilterChange?.(s)}
              testID={`filter-status-${s}`}
            >
              <Text
                style={[
                  styles.filterPillText,
                  statusFilter === s && styles.filterPillTextActive
                ]}
              >
                {s === "all" ? "All Status" : s.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Kind Filters */}
        <View style={styles.filterPills}>
          <Text style={styles.filterGroupLabel}>Kind:</Text>
          {(["all", "live-blog", "scheduled"] as const).map((k) => (
            <Pressable
              key={k}
              style={[
                styles.filterPill,
                kindFilter === k && styles.filterPillActive
              ]}
              onPress={() => onKindFilterChange?.(k)}
              testID={`filter-kind-${k}`}
            >
              <Text
                style={[
                  styles.filterPillText,
                  kindFilter === k && styles.filterPillTextActive
                ]}
              >
                {k === "all" ? "All Kinds" : k === "live-blog" ? "Live Blog" : "Scheduled"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Error state */}
      {error && (
        <View style={styles.globalErrorBanner}>
          <Text style={styles.globalErrorText}>{error}</Text>
        </View>
      )}

      {/* Main Content Area: Split List / Inspector on Desktop */}
      <View style={[styles.mainArea, isDesktop && styles.mainAreaDesktop]}>
        {/* Coverage List Registry */}
        <View style={[styles.listPane, isDesktop && styles.listPaneDesktop]}>
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderTitle}>
              Coverage Registry ({filteredCoverage.length})
            </Text>
          </View>
          {loading && filteredCoverage.length === 0 ? (
            <View style={styles.loadingBox}>
              <Text style={styles.loadingText}>Loading live coverage…</Text>
            </View>
          ) : filteredCoverage.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No live coverage found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || statusFilter !== "all" || kindFilter !== "all"
                  ? "Try clearing your search or status/kind filters."
                  : "Click '+ New Coverage' above to create editorial live coverage."}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.listScroll}>
              {filteredCoverage.map((item) => {
                const isSelected = item.id === selectedCoverageId && !isCreatingNew;
                return (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.coverageCard,
                      isSelected && styles.coverageCardSelected
                    ]}
                    onPress={() => {
                      setIsCreatingNew(false);
                      onSelectCoverage?.(item.id);
                    }}
                    testID={`coverage-card-${item.id}`}
                  >
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.badgeRow}>
                        <View
                          style={[
                            styles.statusBadge,
                            item.status === "live"
                              ? styles.badgeLive
                              : item.status === "upcoming"
                              ? styles.badgeUpcoming
                              : styles.badgeEnded
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              item.status === "live"
                                ? styles.badgeTextLive
                                : item.status === "upcoming"
                                ? styles.badgeTextUpcoming
                                : styles.badgeTextEnded
                            ]}
                          >
                            {item.status.toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.kindBadge}>
                          <Text style={styles.kindBadgeText}>
                            {item.kind === "live-blog" ? "LIVE BLOG" : "SCHEDULED"}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.cardDate}>
                        {item.status === "upcoming" && item.scheduledAt
                          ? `Sched: ${formatDate(item.scheduledAt)}`
                          : `Updated: ${formatDate(item.updatedAt)}`}
                      </Text>
                    </View>

                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>

                    <View style={styles.cardMetaRow}>
                      <Text style={styles.cardMetaText} numberOfLines={1}>
                        Provenance: {item.sourceProvenance}
                      </Text>
                      {item.relatedStoryId && (
                        <Text style={styles.cardStoryLinkText}>Story Linked</Text>
                      )}
                      {item.mediaId && (
                        <Text style={styles.cardMediaLinkText}>Media Attached</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Inspector / Editor / Creator Pane */}
        <View style={[styles.inspectorPane, isDesktop && styles.inspectorPaneDesktop]}>
          {isCreatingNew ? (
            <ScrollView style={styles.inspectorScroll}>
              <View style={styles.inspectorHeader}>
                <Text style={styles.inspectorTitle}>Create New Live Coverage</Text>
                <Pressable onPress={handleCancelCreate} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>Cancel</Text>
                </Pressable>
              </View>

              {createFeedback && (
                <View
                  style={[
                    styles.feedbackBanner,
                    createFeedback.type === "error"
                      ? styles.feedbackError
                      : styles.feedbackSuccess
                  ]}
                >
                  <Text
                    style={[
                      styles.feedbackText,
                      createFeedback.type === "error"
                        ? styles.feedbackTextError
                        : styles.feedbackTextSuccess
                    ]}
                  >
                    {createFeedback.message}
                  </Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., Live Updates: National Health Summit 2026"
                  placeholderTextColor={colors.gray400}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  testID="new-coverage-title-input"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Kind *</Text>
                <View style={styles.kindSelectorRow}>
                  <Pressable
                    style={[
                      styles.kindOptionBtn,
                      newKind === "live-blog" && styles.kindOptionBtnActive
                    ]}
                    onPress={() => setNewKind("live-blog")}
                    testID="new-coverage-kind-live-blog"
                  >
                    <Text
                      style={[
                        styles.kindOptionText,
                        newKind === "live-blog" && styles.kindOptionTextActive
                      ]}
                    >
                      Live Blog (HT-NR-05D-A)
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.kindOptionBtn,
                      newKind === "scheduled" && styles.kindOptionBtnActive
                    ]}
                    onPress={() => setNewKind("scheduled")}
                    testID="new-coverage-kind-scheduled"
                  >
                    <Text
                      style={[
                        styles.kindOptionText,
                        newKind === "scheduled" && styles.kindOptionTextActive
                      ]}
                    >
                      Scheduled Event
                    </Text>
                  </Pressable>
                </View>
                <Text style={styles.formHint}>
                  Note: live-video is reserved for a future task and cannot be selected.
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Scheduled Time (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., 2026-10-20T09:00:00Z"
                  placeholderTextColor={colors.gray400}
                  value={newScheduledAt}
                  onChangeText={setNewScheduledAt}
                  testID="new-coverage-scheduled-input"
                />
                <Text style={styles.formHint}>
                  Optional ISO timestamp. Starting coverage always requires an explicit operator action.
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Related Story (Optional)</Text>
                <ScrollView horizontal style={styles.storySelectScroll}>
                  <Pressable
                    style={[
                      styles.storyOptionChip,
                      newRelatedStoryId === null && styles.storyOptionChipActive
                    ]}
                    onPress={() => setNewRelatedStoryId(null)}
                  >
                    <Text
                      style={[
                        styles.storyOptionText,
                        newRelatedStoryId === null && styles.storyOptionTextActive
                      ]}
                    >
                      None / Detached
                    </Text>
                  </Pressable>
                  {stories.map((s) => (
                    <Pressable
                      key={s.id}
                      style={[
                        styles.storyOptionChip,
                        newRelatedStoryId === s.id && styles.storyOptionChipActive
                      ]}
                      onPress={() => setNewRelatedStoryId(s.id)}
                    >
                      <Text
                        style={[
                          styles.storyOptionText,
                          newRelatedStoryId === s.id && styles.storyOptionTextActive
                        ]}
                        numberOfLines={1}
                      >
                        {s.title}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Media Asset (Optional)</Text>
                <ScrollView horizontal style={styles.storySelectScroll}>
                  <Pressable
                    style={[
                      styles.storyOptionChip,
                      newMediaId === null && styles.storyOptionChipActive
                    ]}
                    onPress={() => setNewMediaId(null)}
                  >
                    <Text
                      style={[
                        styles.storyOptionText,
                        newMediaId === null && styles.storyOptionTextActive
                      ]}
                    >
                      No Media
                    </Text>
                  </Pressable>
                  {mediaAssets.map((m) => (
                    <Pressable
                      key={m.id}
                      style={[
                        styles.storyOptionChip,
                        newMediaId === m.id && styles.storyOptionChipActive
                      ]}
                      onPress={() => setNewMediaId(m.id)}
                    >
                      <Text
                        style={[
                          styles.storyOptionText,
                          newMediaId === m.id && styles.storyOptionTextActive
                        ]}
                        numberOfLines={1}
                      >
                        {m.filename || m.altText || m.id.slice(0, 8)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Source Provenance *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., HealthTimes Live Desk Operations"
                  placeholderTextColor={colors.gray400}
                  value={newProvenance}
                  onChangeText={setNewProvenance}
                  testID="new-coverage-provenance-input"
                />
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.primaryActionBtn, createSubmitting && styles.btnDisabled]}
                  onPress={handleSubmitCreate}
                  disabled={createSubmitting}
                  testID="submit-create-coverage-btn"
                >
                  <Text style={styles.primaryActionBtnText}>
                    {createSubmitting ? "Creating…" : "Create Upcoming Coverage"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : selectedItem ? (
            <ScrollView style={styles.inspectorScroll}>
              {/* Status Header */}
              <View style={styles.inspectorHeader}>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      selectedItem.status === "live"
                        ? styles.badgeLive
                        : selectedItem.status === "upcoming"
                        ? styles.badgeUpcoming
                        : styles.badgeEnded
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        selectedItem.status === "live"
                          ? styles.badgeTextLive
                          : selectedItem.status === "upcoming"
                          ? styles.badgeTextUpcoming
                          : styles.badgeTextEnded
                      ]}
                    >
                      {selectedItem.status.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.kindBadge}>
                    <Text style={styles.kindBadgeText}>
                      {selectedItem.kind === "live-blog" ? "LIVE BLOG" : "SCHEDULED"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.lockVersionBadge}>
                  v{selectedItem.lockVersion}
                </Text>
              </View>

              {/* Status Explanatory Banner per Section 41 */}
              <View
                style={[
                  styles.statusExplainBanner,
                  selectedItem.status === "live"
                    ? styles.explainLive
                    : selectedItem.status === "upcoming"
                    ? styles.explainUpcoming
                    : styles.explainEnded
                ]}
              >
                <Text
                  style={[
                    styles.statusExplainText,
                    selectedItem.status === "live"
                      ? styles.explainTextLive
                      : selectedItem.status === "upcoming"
                      ? styles.explainTextUpcoming
                      : styles.explainTextEnded
                  ]}
                >
                  {selectedItem.status === "upcoming"
                    ? "Scheduled/editorial coverage prepared but not currently live."
                    : selectedItem.status === "live"
                    ? "Publicly visible in HealthTimes Live."
                    : "Coverage has ended and is locked in 05D-A."}
                </Text>
              </View>

              {/* Lifecycle Actions */}
              {selectedItem.status === "upcoming" && (
                <View style={styles.lifecycleActionCard}>
                  <Text style={styles.lifecycleCardTitle}>Start Live Coverage</Text>
                  <Text style={styles.lifecycleCardBody}>
                    Starting live coverage makes it live and featured in HealthTimes Live for all readers.
                  </Text>
                  {confirmAction === "start" ? (
                    <View style={styles.confirmBox}>
                      <Text style={styles.confirmWarning}>
                        Confirm: Start live coverage now?
                      </Text>
                      <View style={styles.confirmButtonRow}>
                        <Pressable
                          style={[styles.confirmStartBtn, startSubmitting && styles.btnDisabled]}
                          onPress={handleStartLive}
                          disabled={startSubmitting}
                          testID="confirm-start-live-btn"
                        >
                          <Text style={styles.confirmStartBtnText}>
                            {startSubmitting ? "Starting…" : "Yes, Go Live"}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={styles.cancelConfirmBtn}
                          onPress={() => setConfirmAction(null)}
                        >
                          <Text style={styles.cancelConfirmBtnText}>Cancel</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      style={styles.startLiveBtn}
                      onPress={() => setConfirmAction("start")}
                      testID="start-live-btn"
                    >
                      <Text style={styles.startLiveBtnText}>● Start Live Coverage</Text>
                    </Pressable>
                  )}
                </View>
              )}

              {selectedItem.status === "live" && (
                <View style={[styles.lifecycleActionCard, { borderColor: colors.rose200 }]}>
                  <Text style={styles.lifecycleCardTitle}>Conclude Live Coverage</Text>
                  <Text style={styles.lifecycleCardBody}>
                    Ending coverage sets status to ended and permanently locks metadata in 05D-A.
                  </Text>
                  {confirmAction === "end" ? (
                    <View style={styles.confirmBox}>
                      <Text style={styles.confirmWarning}>
                        Confirm: End this live coverage permanently?
                      </Text>
                      <View style={styles.confirmButtonRow}>
                        <Pressable
                          style={[styles.confirmEndBtn, endSubmitting && styles.btnDisabled]}
                          onPress={handleEndLive}
                          disabled={endSubmitting}
                          testID="confirm-end-live-btn"
                        >
                          <Text style={styles.confirmEndBtnText}>
                            {endSubmitting ? "Ending…" : "Yes, End Coverage"}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={styles.cancelConfirmBtn}
                          onPress={() => setConfirmAction(null)}
                        >
                          <Text style={styles.cancelConfirmBtnText}>Cancel</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      style={styles.endLiveBtn}
                      onPress={() => setConfirmAction("end")}
                      testID="end-live-btn"
                    >
                      <Text style={styles.endLiveBtnText}>■ End Live Coverage</Text>
                    </Pressable>
                  )}
                </View>
              )}

              {saveFeedback && (
                <View
                  style={[
                    styles.feedbackBanner,
                    saveFeedback.type === "error"
                      ? styles.feedbackError
                      : styles.feedbackSuccess
                  ]}
                >
                  <Text
                    style={[
                      styles.feedbackText,
                      saveFeedback.type === "error"
                        ? styles.feedbackTextError
                        : styles.feedbackTextSuccess
                    ]}
                  >
                    {saveFeedback.message}
                  </Text>
                </View>
              )}

              {/* Metadata Form Fields */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title *</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    selectedItem.status === "ended" && styles.inputLocked
                  ]}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  editable={selectedItem.status !== "ended"}
                  testID="edit-coverage-title-input"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Scheduled Time</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    selectedItem.status === "ended" && styles.inputLocked
                  ]}
                  placeholder="Not scheduled"
                  placeholderTextColor={colors.gray400}
                  value={editScheduledAt}
                  onChangeText={setEditScheduledAt}
                  editable={selectedItem.status !== "ended"}
                  testID="edit-coverage-scheduled-input"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Related Story</Text>
                {selectedItem.status === "ended" ? (
                  <Text style={styles.lockedValueText}>
                    {stories.find((s) => s.id === editRelatedStoryId)?.title ||
                      editRelatedStoryId ||
                      "None / Detached"}
                  </Text>
                ) : (
                  <ScrollView horizontal style={styles.storySelectScroll}>
                    <Pressable
                      style={[
                        styles.storyOptionChip,
                        editRelatedStoryId === null && styles.storyOptionChipActive
                      ]}
                      onPress={() => setEditRelatedStoryId(null)}
                    >
                      <Text
                        style={[
                          styles.storyOptionText,
                          editRelatedStoryId === null && styles.storyOptionTextActive
                        ]}
                      >
                        None / Detached
                      </Text>
                    </Pressable>
                    {stories.map((s) => (
                      <Pressable
                        key={s.id}
                        style={[
                          styles.storyOptionChip,
                          editRelatedStoryId === s.id && styles.storyOptionChipActive
                        ]}
                        onPress={() => setEditRelatedStoryId(s.id)}
                      >
                        <Text
                          style={[
                            styles.storyOptionText,
                            editRelatedStoryId === s.id && styles.storyOptionTextActive
                          ]}
                          numberOfLines={1}
                        >
                          {s.title}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Attached Media</Text>
                {selectedMediaAsset?.publicUrl && (
                  <View style={styles.mediaPreviewCard}>
                    <Image
                      source={{ uri: selectedMediaAsset.publicUrl }}
                      style={styles.mediaPreviewThumb}
                    />
                    <View style={styles.mediaPreviewInfo}>
                      <Text style={styles.mediaPreviewName} numberOfLines={1}>
                        {selectedMediaAsset.filename || selectedMediaAsset.altText || "Attached Asset"}
                      </Text>
                      <Text style={styles.mediaPreviewId} numberOfLines={1}>
                        ID: {selectedMediaAsset.id}
                      </Text>
                    </View>
                  </View>
                )}
                {selectedItem.status === "ended" ? (
                  <Text style={styles.lockedValueText}>
                    {selectedMediaAsset ? "Media attached (locked)" : "No media attached"}
                  </Text>
                ) : (
                  <ScrollView horizontal style={styles.storySelectScroll}>
                    <Pressable
                      style={[
                        styles.storyOptionChip,
                        editMediaId === null && styles.storyOptionChipActive
                      ]}
                      onPress={() => setEditMediaId(null)}
                    >
                      <Text
                        style={[
                          styles.storyOptionText,
                          editMediaId === null && styles.storyOptionTextActive
                        ]}
                      >
                        No Media
                      </Text>
                    </Pressable>
                    {mediaAssets.map((m) => (
                      <Pressable
                        key={m.id}
                        style={[
                          styles.storyOptionChip,
                          editMediaId === m.id && styles.storyOptionChipActive
                        ]}
                        onPress={() => setEditMediaId(m.id)}
                      >
                        <Text
                          style={[
                            styles.storyOptionText,
                            editMediaId === m.id && styles.storyOptionTextActive
                          ]}
                          numberOfLines={1}
                        >
                          {m.filename || m.altText || m.id.slice(0, 8)}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Source Provenance *</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    selectedItem.status === "ended" && styles.inputLocked
                  ]}
                  value={editProvenance}
                  onChangeText={setEditProvenance}
                  editable={selectedItem.status !== "ended"}
                  testID="edit-coverage-provenance-input"
                />
              </View>

              {/* Audit Details */}
              <View style={styles.auditCard}>
                <Text style={styles.auditTitle}>Editorial Audit Details</Text>
                <Text style={styles.auditLine}>ID: {selectedItem.id}</Text>
                <Text style={styles.auditLine}>
                  Started At: {formatDate(selectedItem.startedAt)}
                </Text>
                <Text style={styles.auditLine}>
                  Ended At: {formatDate(selectedItem.endedAt)}
                </Text>
                <Text style={styles.auditLine}>
                  Created: {formatDate(selectedItem.createdAt)} by staff {selectedItem.createdByStaffId.slice(0, 8)}
                </Text>
                <Text style={styles.auditLine}>
                  Last Updated: {formatDate(selectedItem.updatedAt)} by staff {selectedItem.updatedByStaffId.slice(0, 8)}
                </Text>
              </View>

              {/* Save Button for active editable items */}
              {selectedItem.status !== "ended" && (
                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.primaryActionBtn, saveSubmitting && styles.btnDisabled]}
                    onPress={handleSaveCoverage}
                    disabled={saveSubmitting}
                    testID="save-coverage-metadata-btn"
                  >
                    <Text style={styles.primaryActionBtnText}>
                      {saveSubmitting ? "Saving…" : "Save Metadata Changes"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.emptyInspector}>
              <Text style={styles.emptyInspectorTitle}>No coverage selected</Text>
              <Text style={styles.emptyInspectorSubtitle}>
                Select an item from the registry on the left to inspect, edit, or manage its live lifecycle, or click '+ New Coverage' to start.
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function StudioLiveDeskContainer() {
  const [coverage, setCoverage] = useState<NewsroomLiveCoverage[]>([]);
  const [stories, setStories] = useState<Array<{ id: string; title: string }>>([]);
  const [mediaAssets, setMediaAssets] = useState<
    Array<{ id: string; filename?: string; publicUrl?: string | null; altText?: string | null }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCoverageId, setSelectedCoverageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | NewsroomLiveCoverageStatus>("all");
  const [kindFilter, setKindFilter] = useState<"all" | NewsroomLiveCoverageKind>("all");

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const items = await services.newsroomLive.listCoverage({
        status: statusFilter === "all" ? undefined : statusFilter,
        kind: kindFilter === "all" ? undefined : kindFilter,
        search: searchQuery.trim().length > 0 ? searchQuery.trim() : undefined
      });
      setCoverage(items);

      // Load stories
      try {
        const storyRows = await services.newsroomStories.listStories(100);
        setStories(
          storyRows.map((s) => ({
            id: s.id,
            title: s.title
          }))
        );
      } catch {
        // Stories remain optional
      }

      // Load media
      try {
        const mediaRows = await services.newsroomMedia.listMedia(null, 50);
        setMediaAssets(
          mediaRows.map((m) => ({
            id: m.id,
            filename: m.filename,
            publicUrl: m.publicUrl,
            altText: m.altText
          }))
        );
      } catch {
        // Media remains optional
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load live coverage registry from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, kindFilter]);

  const handleCreateCoverage = async (input: NewsroomLiveCoverageCreateInput) => {
    const newId = await services.newsroomLive.createCoverage(input);
    await loadData();
    return newId;
  };

  const handleSaveCoverage = async (
    id: string,
    expectedVersion: number,
    patch: NewsroomLiveCoveragePatch
  ) => {
    const nextVer = await services.newsroomLive.saveCoverage(id, expectedVersion, patch);
    await loadData();
    return nextVer;
  };

  const handleStartCoverage = async (id: string, expectedVersion: number) => {
    const nextVer = await services.newsroomLive.startCoverage(id, expectedVersion);
    await loadData();
    return nextVer;
  };

  const handleEndCoverage = async (id: string, expectedVersion: number) => {
    const nextVer = await services.newsroomLive.endCoverage(id, expectedVersion);
    await loadData();
    return nextVer;
  };

  return (
    <StudioLiveDeskView
      coverage={coverage}
      stories={stories}
      mediaAssets={mediaAssets}
      loading={loading}
      error={error}
      selectedCoverageId={selectedCoverageId}
      onSelectCoverage={setSelectedCoverageId}
      searchQuery={searchQuery}
      onSearch={setSearchQuery}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      kindFilter={kindFilter}
      onKindFilterChange={setKindFilter}
      onRefresh={loadData}
      onCreateCoverage={handleCreateCoverage}
      onSaveCoverage={handleSaveCoverage}
      onStartCoverage={handleStartCoverage}
      onEndCoverage={handleEndCoverage}
    />
  );
}

export function StudioLiveDesk() {
  return (
    <StudioAccessGate capability="story.publish">
      <StudioLiveDeskContainer />
    </StudioAccessGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    gap: spacing.md
  },
  headerLeft: {
    flex: 1
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.5
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.gray600,
    marginTop: 4,
    lineHeight: 18
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center"
  },
  refreshBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.white
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray700
  },
  newCoverageBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.blue600
  },
  newCoverageBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white
  },
  btnDisabled: {
    opacity: 0.5
  },
  metricsRow: {
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  metricCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderLeftWidth: 4,
    borderLeftColor: colors.gray400
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.gray900
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray500,
    marginTop: 2,
    textTransform: "uppercase"
  },
  filterBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: colors.gray900
  },
  clearSearchBtn: {
    padding: 6
  },
  clearSearchText: {
    fontSize: 14,
    color: colors.gray500
  },
  filterPills: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap"
  },
  filterGroupLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray600,
    marginRight: 4
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300
  },
  filterPillActive: {
    backgroundColor: colors.blue600,
    borderColor: colors.blue600
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray700
  },
  filterPillTextActive: {
    color: colors.white
  },
  globalErrorBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.rose50,
    borderColor: colors.rose200,
    borderWidth: 1,
    borderRadius: radius.sm
  },
  globalErrorText: {
    fontSize: 13,
    color: colors.rose900,
    fontWeight: "600"
  },
  mainArea: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md
  },
  mainAreaDesktop: {
    flexDirection: "row",
    gap: spacing.md
  },
  listPane: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gray200,
    overflow: "hidden"
  },
  listPaneDesktop: {
    maxWidth: 480
  },
  listHeader: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    backgroundColor: colors.gray50
  },
  listHeaderTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray700,
    textTransform: "uppercase"
  },
  listScroll: {
    flex: 1
  },
  loadingBox: {
    padding: spacing.xl,
    alignItems: "center"
  },
  loadingText: {
    fontSize: 14,
    color: colors.gray500
  },
  emptyBox: {
    padding: spacing.xl,
    alignItems: "center"
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.gray800
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 4,
    textAlign: "center"
  },
  coverageCard: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    gap: 6
  },
  coverageCardSelected: {
    backgroundColor: colors.blue50,
    borderLeftWidth: 4,
    borderLeftColor: colors.blue600
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  badgeUpcoming: {
    backgroundColor: colors.blue100
  },
  badgeLive: {
    backgroundColor: colors.rose100
  },
  badgeEnded: {
    backgroundColor: colors.gray200
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  badgeTextUpcoming: {
    color: colors.blue900
  },
  badgeTextLive: {
    color: colors.rose900
  },
  badgeTextEnded: {
    color: colors.gray700
  },
  kindBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.gray100
  },
  kindBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.gray600
  },
  cardDate: {
    fontSize: 11,
    color: colors.gray500
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.gray900,
    lineHeight: 20
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap"
  },
  cardMetaText: {
    fontSize: 11,
    color: colors.gray500,
    flex: 1
  },
  cardStoryLinkText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.blue700,
    backgroundColor: colors.blue50,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3
  },
  cardMediaLinkText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.emerald700,
    backgroundColor: colors.emerald50,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3
  },
  inspectorPane: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gray200,
    overflow: "hidden"
  },
  inspectorPaneDesktop: {
    minWidth: 420
  },
  inspectorScroll: {
    flex: 1,
    padding: spacing.lg
  },
  inspectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md
  },
  inspectorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.gray900
  },
  lockVersionBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray500,
    backgroundColor: colors.gray100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  closeBtn: {
    padding: 6
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray600
  },
  statusExplainBanner: {
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginBottom: spacing.md
  },
  explainUpcoming: {
    backgroundColor: colors.blue50,
    borderColor: colors.blue100
  },
  explainLive: {
    backgroundColor: colors.rose50,
    borderColor: colors.rose100
  },
  explainEnded: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray200
  },
  statusExplainText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18
  },
  explainTextUpcoming: {
    color: colors.blue900
  },
  explainTextLive: {
    color: colors.rose900
  },
  explainTextEnded: {
    color: colors.gray700
  },
  lifecycleActionCard: {
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.blue100,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
    gap: 8
  },
  lifecycleCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.gray900
  },
  lifecycleCardBody: {
    fontSize: 12,
    color: colors.gray600,
    lineHeight: 16
  },
  startLiveBtn: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.rose600,
    borderRadius: radius.sm,
    alignItems: "center"
  },
  startLiveBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 0.5
  },
  endLiveBtn: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray800,
    borderRadius: radius.sm,
    alignItems: "center"
  },
  endLiveBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 0.5
  },
  confirmBox: {
    padding: spacing.md,
    backgroundColor: colors.rose50,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.rose200,
    gap: spacing.sm
  },
  confirmWarning: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.rose900
  },
  confirmButtonRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  confirmStartBtn: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.rose600,
    borderRadius: radius.sm
  },
  confirmStartBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white
  },
  confirmEndBtn: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray900,
    borderRadius: radius.sm
  },
  confirmEndBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white
  },
  cancelConfirmBtn: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.sm
  },
  cancelConfirmBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray700
  },
  feedbackBanner: {
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginBottom: spacing.md
  },
  feedbackError: {
    backgroundColor: colors.rose50,
    borderColor: colors.rose200
  },
  feedbackSuccess: {
    backgroundColor: colors.emerald50,
    borderColor: colors.emerald300
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: "600"
  },
  feedbackTextError: {
    color: colors.rose900
  },
  feedbackTextSuccess: {
    color: colors.emerald900
  },
  formGroup: {
    marginBottom: spacing.md
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray700,
    marginBottom: 4
  },
  formInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.gray900
  },
  inputLocked: {
    backgroundColor: colors.gray100,
    color: colors.gray600
  },
  lockedValueText: {
    fontSize: 13,
    color: colors.gray700,
    paddingVertical: 4
  },
  formHint: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 4
  },
  kindSelectorRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  kindOptionBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
    alignItems: "center"
  },
  kindOptionBtnActive: {
    borderColor: colors.blue600,
    backgroundColor: colors.blue50
  },
  kindOptionText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray700
  },
  kindOptionTextActive: {
    color: colors.blue700,
    fontWeight: "800"
  },
  storySelectScroll: {
    flexDirection: "row",
    marginVertical: 4
  },
  storyOptionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
    marginRight: 6,
    maxWidth: 240
  },
  storyOptionChipActive: {
    borderColor: colors.blue600,
    backgroundColor: colors.blue50
  },
  storyOptionText: {
    fontSize: 12,
    color: colors.gray700,
    fontWeight: "600"
  },
  storyOptionTextActive: {
    color: colors.blue700,
    fontWeight: "800"
  },
  mediaPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm
  },
  mediaPreviewThumb: {
    width: 60,
    height: 40,
    borderRadius: 4,
    backgroundColor: colors.gray200
  },
  mediaPreviewInfo: {
    flex: 1
  },
  mediaPreviewName: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray800
  },
  mediaPreviewId: {
    fontSize: 10,
    color: colors.gray500,
    marginTop: 2
  },
  auditCard: {
    padding: spacing.md,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
    gap: 4
  },
  auditTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.gray600,
    textTransform: "uppercase",
    marginBottom: 2
  },
  auditLine: {
    fontSize: 11,
    color: colors.gray600
  },
  actionRow: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl
  },
  primaryActionBtn: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.blue600,
    borderRadius: radius.sm,
    alignItems: "center"
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white
  },
  emptyInspector: {
    flex: 1,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyInspectorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.gray700
  },
  emptyInspectorSubtitle: {
    fontSize: 13,
    color: colors.gray500,
    marginTop: 6,
    textAlign: "center",
    maxWidth: 320,
    lineHeight: 18
  }
});
