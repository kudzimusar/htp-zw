import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Linking,
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
  validateVideoCreateInput,
  validateVideoHttpsUrl,
  validateVideoPatch,
  type NewsroomStory,
  type NewsroomVideo,
  type NewsroomVideoCreateInput,
  type NewsroomVideoPatch,
  type NewsroomVideoStatus
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
  rose800: "#9F1239",
  rose900: "#881337"
};

export function hasVideoDeskAuthority(snapshot: unknown): boolean {
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
    s.capabilities.includes("media.manage")
  );
}

export function hasVideoPublicationAuthority(snapshot: unknown): boolean {
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

export function formatDurationSeconds(seconds: number | null | undefined): string {
  if (seconds == null || isNaN(seconds) || seconds < 0) {
    return "Unknown duration";
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Unknown date";
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

export type StudioVideoDeskViewProps = {
  videos: NewsroomVideo[];
  stories?: Array<{ id: string; title: string }>;
  loading?: boolean;
  error?: string | null;
  selectedVideoId?: string | null;
  onSelectVideo?: (video: NewsroomVideo | null) => void;
  searchQuery?: string;
  onSearch?: (query: string) => void;
  statusFilter?: "all" | "draft" | "ready";
  onStatusFilterChange?: (filter: "all" | "draft" | "ready") => void;
  onRefresh?: () => void;
  isOwnerPreview?: boolean;
  canPublish?: boolean;
  onCreateVideo?: (input: NewsroomVideoCreateInput) => Promise<string | void>;
  onSaveVideo?: (
    videoId: string,
    expectedVersion: number,
    patch: NewsroomVideoPatch
  ) => Promise<number | void>;
  onToggleReady?: (
    videoId: string,
    expectedVersion: number,
    ready: boolean
  ) => Promise<number | void>;
  onPublishVideo?: (
    videoId: string,
    expectedVersion: number,
    featured?: boolean
  ) => Promise<number | void>;
  onUnpublishVideo?: (
    videoId: string,
    expectedVersion: number
  ) => Promise<number | void>;
  onSetFeatured?: (
    videoId: string,
    expectedVersion: number,
    featured: boolean
  ) => Promise<number | void>;
};

export function StudioVideoDeskView({
  videos,
  stories = [],
  loading = false,
  error = null,
  selectedVideoId = null,
  onSelectVideo,
  searchQuery: searchQueryProp,
  onSearch,
  statusFilter = "all",
  onStatusFilterChange,
  onRefresh,
  isOwnerPreview = false,
  canPublish = false,
  onCreateVideo,
  onSaveVideo,
  onToggleReady,
  onPublishVideo,
  onUnpublishVideo,
  onSetFeatured
}: StudioVideoDeskViewProps) {
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

  // New Video Form State (Starts Blank per Section 14)
  const [newTitle, setNewTitle] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newThumbnailUrl, setNewThumbnailUrl] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [newRelatedStoryId, setNewRelatedStoryId] = useState<string | null>(null);
  const [newProvenance, setNewProvenance] = useState("");
  const [createFeedback, setCreateFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Active Selected Video
  const selectedVideo = useMemo(
    () => videos.find((v) => v.id === selectedVideoId) ?? null,
    [videos, selectedVideoId]
  );

  // Edit Video Form State
  const [editTitle, setEditTitle] = useState("");
  const [editSourceUrl, setEditSourceUrl] = useState("");
  const [editThumbnailUrl, setEditThumbnailUrl] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editRelatedStoryId, setEditRelatedStoryId] = useState<string | null>(null);
  const [editProvenance, setEditProvenance] = useState("");
  const [saveFeedback, setSaveFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [saveSubmitting, setSaveSubmitting] = useState(false);
  const [readySubmitting, setReadySubmitting] = useState(false);
  const [publishSubmitting, setPublishSubmitting] = useState(false);
  const [unpublishSubmitting, setUnpublishSubmitting] = useState(false);
  const [featureSubmitting, setFeatureSubmitting] = useState(false);

  // Sync edit form with selected video
  useEffect(() => {
    if (selectedVideo) {
      setEditTitle(selectedVideo.title);
      setEditSourceUrl(selectedVideo.sourceUrl);
      setEditThumbnailUrl(selectedVideo.thumbnailUrl ?? "");
      setEditDuration(
        selectedVideo.durationSeconds !== null ? String(selectedVideo.durationSeconds) : ""
      );
      setEditRelatedStoryId(selectedVideo.relatedStoryId);
      setEditProvenance(selectedVideo.sourceProvenance);
      setSaveFeedback(null);
      setIsCreatingNew(false);
    }
  }, [selectedVideo]);

  // Counters
  const counts = useMemo(() => {
    let draft = 0;
    let ready = 0;
    for (const v of videos) {
      if (v.status === "ready") ready++;
      else draft++;
    }
    return { total: videos.length, draft, ready };
  }, [videos]);

  // Filtered Registry
  const filteredVideos = useMemo(() => {
    let list = videos;
    if (statusFilter !== "all") {
      list = list.filter((v) => v.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.sourceProvenance.toLowerCase().includes(q) ||
          v.sourceUrl.toLowerCase().includes(q)
      );
    }
    return list;
  }, [videos, statusFilter, searchQuery]);

  const handleSearchChange = (text: string) => {
    setInternalSearchQuery(text);
    onSearch?.(text);
  };

  const handleStartCreate = () => {
    setIsCreatingNew(true);
    onSelectVideo?.(null);
    setNewTitle("");
    setNewSourceUrl("");
    setNewThumbnailUrl("");
    setNewDuration("");
    setNewRelatedStoryId(null);
    setNewProvenance("");
    setCreateFeedback(null);
  };

  const handleCancelCreate = () => {
    setIsCreatingNew(false);
    setCreateFeedback(null);
  };

  const handleSubmitCreate = async () => {
    if (createSubmitting) return;
    setCreateFeedback(null);

    let parsedDuration: number | null = null;
    if (newDuration.trim()) {
      const n = Number(newDuration.trim());
      if (isNaN(n) || !Number.isInteger(n) || n < 0) {
        setCreateFeedback({
          type: "error",
          message: "Duration must be a positive integer in seconds."
        });
        return;
      }
      parsedDuration = n;
    }

    const input: NewsroomVideoCreateInput = {
      title: newTitle.trim(),
      sourceUrl: newSourceUrl.trim(),
      thumbnailUrl: newThumbnailUrl.trim() || null,
      durationSeconds: parsedDuration,
      relatedStoryId: newRelatedStoryId || null,
      sourceProvenance: newProvenance.trim()
    };

    const val = validateVideoCreateInput(input);
    if (!val.valid) {
      setCreateFeedback({ type: "error", message: val.error || "Invalid video data." });
      return;
    }

    setCreateSubmitting(true);
    try {
      if (onCreateVideo) {
        await onCreateVideo(input);
        setIsCreatingNew(false);
      } else {
        setCreateFeedback({
          type: "success",
          message: "Video created successfully (visual state)."
        });
      }
    } catch (err) {
      setCreateFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to create video."
      });
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleSaveVideo = async () => {
    if (!selectedVideo || saveSubmitting) return;
    setSaveFeedback(null);

    // CRITICAL SECURITY BOUNDARY UX: Do not attempt to save metadata while published
    if (selectedVideo.publishedAt) {
      setSaveFeedback({
        type: "error",
        message: "Unpublish this video before changing its public metadata."
      });
      return;
    }

    let parsedDuration: number | null = null;
    if (editDuration.trim()) {
      const n = Number(editDuration.trim());
      if (isNaN(n) || !Number.isInteger(n) || n < 0) {
        setSaveFeedback({
          type: "error",
          message: "Duration must be a positive integer in seconds."
        });
        return;
      }
      parsedDuration = n;
    }

    const patch: NewsroomVideoPatch = {};
    if (editTitle.trim() !== selectedVideo.title) patch.title = editTitle.trim();
    if (editSourceUrl.trim() !== selectedVideo.sourceUrl) patch.sourceUrl = editSourceUrl.trim();
    const cleanThumb = editThumbnailUrl.trim() || null;
    if (cleanThumb !== selectedVideo.thumbnailUrl) patch.thumbnailUrl = cleanThumb;
    if (parsedDuration !== selectedVideo.durationSeconds) patch.durationSeconds = parsedDuration;
    if (editRelatedStoryId !== selectedVideo.relatedStoryId) patch.relatedStoryId = editRelatedStoryId;
    if (editProvenance.trim() !== selectedVideo.sourceProvenance) {
      patch.sourceProvenance = editProvenance.trim();
    }

    if (Object.keys(patch).length === 0) {
      setSaveFeedback({ type: "error", message: "No changes detected to save." });
      return;
    }

    const val = validateVideoPatch(patch);
    if (!val.valid) {
      setSaveFeedback({ type: "error", message: val.error || "Invalid patch data." });
      return;
    }

    setSaveSubmitting(true);
    try {
      if (onSaveVideo) {
        await onSaveVideo(selectedVideo.id, selectedVideo.lockVersion, patch);
        setSaveFeedback({
          type: "success",
          message: isOwnerPreview
            ? "Preview state saved: Video metadata and story association updated locally (non-persistent)."
            : "Video metadata saved successfully."
        });
      } else {
        setSaveFeedback({
          type: "success",
          message: isOwnerPreview
            ? "Preview state saved: Video metadata and story association updated locally (non-persistent)."
            : "Changes recorded in visual sample session."
        });
      }
    } catch (err) {
      setSaveFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Save failed."
      });
    } finally {
      setSaveSubmitting(false);
    }
  };

  const handleToggleReady = async (targetReady: boolean) => {
    if (!selectedVideo || readySubmitting) return;
    setSaveFeedback(null);

    // CRITICAL SECURITY BOUNDARY UX: Do not transition published video to draft
    if (!targetReady && selectedVideo.publishedAt) {
      setSaveFeedback({
        type: "error",
        message: "Published video cannot be transitioned to draft. Unpublish first."
      });
      return;
    }

    setReadySubmitting(true);
    try {
      if (onToggleReady) {
        await onToggleReady(selectedVideo.id, selectedVideo.lockVersion, targetReady);
        setSaveFeedback({
          type: "success",
          message: targetReady
            ? "Video marked as Ready for public delivery."
            : "Video returned to Draft status."
        });
      } else {
        setSaveFeedback({
          type: "success",
          message: targetReady
            ? "Status updated to Ready in preview."
            : "Status returned to Draft in preview."
        });
      }
    } catch (err) {
      setSaveFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Status transition failed."
      });
    } finally {
      setReadySubmitting(false);
    }
  };

  const handlePublish = async (featured = false) => {
    if (!selectedVideo || publishSubmitting) return;
    setSaveFeedback(null);
    setPublishSubmitting(true);
    try {
      if (onPublishVideo) {
        await onPublishVideo(selectedVideo.id, selectedVideo.lockVersion, featured);
        setSaveFeedback({
          type: "success",
          message: isOwnerPreview
            ? featured
              ? "Preview state only: Video marked as featured on Watch (publication readiness recorded; live reader publication requires production release)."
              : "Preview state only: Video marked ready for Watch (publication readiness recorded; live reader publication requires production release)."
            : featured
            ? "Video published and featured on Watch."
            : "Video published to Watch."
        });
      } else {
        setSaveFeedback({
          type: "success",
          message: isOwnerPreview
            ? "Preview state only: Publication readiness recorded in preview memory."
            : featured
            ? "Simulated: Video published and featured on Watch."
            : "Simulated: Video published to Watch."
        });
      }
    } catch (err) {
      setSaveFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to publish video."
      });
    } finally {
      setPublishSubmitting(false);
    }
  };

  const handleUnpublish = async () => {
    if (!selectedVideo || unpublishSubmitting) return;
    setSaveFeedback(null);
    setUnpublishSubmitting(true);
    try {
      if (onUnpublishVideo) {
        await onUnpublishVideo(selectedVideo.id, selectedVideo.lockVersion);
        setSaveFeedback({
          type: "success",
          message: isOwnerPreview
            ? "Preview state only: Video removed from simulated Watch feed. Metadata editing unlocked locally."
            : "Video unpublished from Watch. Metadata editing is now unlocked."
        });
      } else {
        setSaveFeedback({
          type: "success",
          message: isOwnerPreview
            ? "Preview state only: Video removed from simulated Watch feed."
            : "Simulated: Video unpublished from Watch."
        });
      }
    } catch (err) {
      setSaveFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to unpublish video."
      });
    } finally {
      setUnpublishSubmitting(false);
    }
  };

  const handleSetFeatured = async (featured: boolean) => {
    if (!selectedVideo || featureSubmitting) return;
    setSaveFeedback(null);
    setFeatureSubmitting(true);
    try {
      if (onSetFeatured) {
        await onSetFeatured(selectedVideo.id, selectedVideo.lockVersion, featured);
        setSaveFeedback({
          type: "success",
          message: featured
            ? "Video featured on Watch."
            : "Video removed from Featured."
        });
      } else {
        setSaveFeedback({
          type: "success",
          message: featured
            ? "Simulated: Video featured on Watch."
            : "Simulated: Video removed from Featured."
        });
      }
    } catch (err) {
      setSaveFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update featured state."
      });
    } finally {
      setFeatureSubmitting(false);
    }
  };

  const isSourceUrlValid = validateVideoHttpsUrl(editSourceUrl);
  const isThumbnailUrlValid = validateVideoHttpsUrl(editThumbnailUrl);

  return (
    <View style={styles.container} testID="studio-video-desk-root">
      {/* Header and Counters */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerKicker}>STUDIO · MULTIMEDIA OPERATIONS</Text>
          <Text style={styles.headerTitle}>Video Desk</Text>
          <Text style={styles.headerSubtitle}>
            Canonical Video Registry · Editorial Destination Metadata · Production Control
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.primaryButton, isCreatingNew && styles.primaryButtonActive]}
            onPress={handleStartCreate}
            testID="video-desk-new-button"
          >
            <Text style={styles.primaryButtonText}>+ New Video</Text>
          </Pressable>
          {onRefresh && (
            <Pressable
              style={styles.secondaryButton}
              onPress={onRefresh}
              testID="video-desk-refresh-button"
            >
              <Text style={styles.secondaryButtonText}>Refresh</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Metric Counters (Truthful Result-Set Labels per Defect B2) */}
      <View style={styles.metricsRow} testID="video-desk-metrics">
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{counts.total}</Text>
          <Text style={styles.metricLabel}>Loaded Results</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: colors.amber700 }]}>{counts.draft}</Text>
          <Text style={styles.metricLabel}>Draft in Results</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: colors.emerald700 }]}>{counts.ready}</Text>
          <Text style={styles.metricLabel}>Ready in Results</Text>
        </View>
        <View style={styles.metricDisclaimer}>
          <Text style={styles.metricDisclaimerText}>
            Showing up to 100 server-matched videos. Results reflect current query criteria.
          </Text>
        </View>
      </View>

      {/* Search and Status Filters */}
      <View style={styles.filterBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title, provenance, or destination URL..."
          placeholderTextColor={colors.gray400}
          value={searchQuery}
          onChangeText={handleSearchChange}
          testID="video-desk-search-input"
        />
        <View style={styles.filterPills}>
          <Pressable
            style={[styles.filterPill, statusFilter === "all" && styles.filterPillActive]}
            onPress={() => onStatusFilterChange?.("all")}
            testID="video-desk-filter-all"
          >
            <Text
              style={[styles.filterPillText, statusFilter === "all" && styles.filterPillTextActive]}
            >
              All ({counts.total})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterPill, statusFilter === "draft" && styles.filterPillActive]}
            onPress={() => onStatusFilterChange?.("draft")}
            testID="video-desk-filter-draft"
          >
            <Text
              style={[
                styles.filterPillText,
                statusFilter === "draft" && styles.filterPillTextActive
              ]}
            >
              Draft ({counts.draft})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterPill, statusFilter === "ready" && styles.filterPillActive]}
            onPress={() => onStatusFilterChange?.("ready")}
            testID="video-desk-filter-ready"
          >
            <Text
              style={[
                styles.filterPillText,
                statusFilter === "ready" && styles.filterPillTextActive
              ]}
            >
              Ready ({counts.ready})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Workspace Layout */}
      <View style={[styles.workspace, isDesktop ? styles.workspaceRow : styles.workspaceColumn]}>
        {/* Left Registry List */}
        <View style={[styles.listColumn, isDesktop && styles.listColumnDesktop]}>
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderTitle}>Video Registry</Text>
            <Text style={styles.listHeaderCount}>
              {filteredVideos.length} {filteredVideos.length === 1 ? "video" : "videos"}
            </Text>
          </View>

          {loading ? (
            <View style={styles.centerMessage}>
              <Text style={styles.mutedText}>Loading videos...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{error}</Text>
            </View>
          ) : filteredVideos.length === 0 ? (
            <View style={styles.centerMessage} testID="video-desk-empty-state">
              <Text style={styles.emptyTitle}>No Videos Found</Text>
              <Text style={styles.mutedText}>
                {searchQuery || statusFilter !== "all"
                  ? "No videos match your search or status filter."
                  : "The video registry is currently empty. Click '+ New Video' to create an entry."}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.videoListScroll} testID="video-desk-registry-list">
              {filteredVideos.map((video) => {
                const isSelected = video.id === selectedVideoId && !isCreatingNew;
                return (
                  <Pressable
                    key={video.id}
                    style={[styles.videoCard, isSelected && styles.videoCardSelected]}
                    onPress={() => {
                      setIsCreatingNew(false);
                      onSelectVideo?.(video);
                    }}
                    testID={`video-card-${video.id}`}
                  >
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {video.title}
                      </Text>
                      <View style={styles.badgeRow}>
                        <View
                          style={[
                            styles.statusBadge,
                            video.status === "ready"
                              ? styles.statusBadgeReady
                              : styles.statusBadgeDraft
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              video.status === "ready"
                                ? styles.statusBadgeTextReady
                                : styles.statusBadgeTextDraft
                            ]}
                          >
                            {video.status.toUpperCase()}
                          </Text>
                        </View>
                        {Boolean(video.publishedAt) && (
                          <View style={styles.statusBadgePublished} testID={`badge-published-${video.id}`}>
                            <Text style={styles.statusBadgeTextPublished}>PUBLISHED</Text>
                          </View>
                        )}
                        {Boolean(video.watchFeatured) && (
                          <View style={styles.statusBadgeFeatured} testID={`badge-featured-${video.id}`}>
                            <Text style={styles.statusBadgeTextFeatured}>FEATURED ON WATCH</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <Text style={styles.cardProvenance} numberOfLines={1}>
                      Source: {video.sourceProvenance}
                    </Text>

                    <Text style={styles.cardUrl} numberOfLines={1}>
                      {video.sourceUrl}
                    </Text>

                    <View style={styles.cardBottomRow}>
                      <Text style={styles.cardDuration}>
                        ⏱ {formatDurationSeconds(video.durationSeconds)}
                      </Text>
                      <Text style={styles.cardDate}>
                        {isOwnerPreview ? formatDate(video.updatedAt) : `v${video.lockVersion} · ${formatDate(video.updatedAt)}`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Right Inspector / Editor */}
        <View style={[styles.inspectorColumn, isDesktop && styles.inspectorColumnDesktop]}>
          {isCreatingNew ? (
            /* New Video Form */
            <ScrollView style={styles.inspectorScroll} testID="video-desk-new-form">
              <View style={styles.inspectorHeader}>
                <View>
                  <Text style={styles.inspectorKicker}>
                    {isOwnerPreview ? "NEW VIDEO ENTRY" : "CREATE REGISTRY ENTRY"}
                  </Text>
                  <Text style={styles.inspectorTitle}>New Video Metadata</Text>
                </View>
                <Pressable style={styles.cancelLink} onPress={handleCancelCreate}>
                  <Text style={styles.cancelLinkText}>Cancel</Text>
                </Pressable>
              </View>

              {createFeedback && (
                <View
                  style={[
                    styles.feedbackBanner,
                    createFeedback.type === "success"
                      ? styles.feedbackBannerSuccess
                      : styles.feedbackBannerError
                  ]}
                  testID="video-create-feedback"
                >
                  <Text
                    style={[
                      styles.feedbackBannerText,
                      createFeedback.type === "success"
                        ? styles.feedbackBannerTextSuccess
                        : styles.feedbackBannerTextError
                    ]}
                  >
                    {createFeedback.message}
                  </Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Video Title *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Enter headline or title for this video..."
                  placeholderTextColor={colors.gray400}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  testID="video-create-title-input"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Public Viewing Destination (Source URL) *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="https://... (absolute HTTPS URL required)"
                  placeholderTextColor={colors.gray400}
                  value={newSourceUrl}
                  onChangeText={setNewSourceUrl}
                  autoCapitalize="none"
                  testID="video-create-source-url-input"
                />
                <Text style={styles.fieldHelper}>
                  Must be an absolute HTTPS URL without embedded credentials (e.g. YouTube, Vimeo, direct publisher destination).
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Thumbnail URL (Optional)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="https://... (absolute HTTPS URL required if provided)"
                  placeholderTextColor={colors.gray400}
                  value={newThumbnailUrl}
                  onChangeText={setNewThumbnailUrl}
                  autoCapitalize="none"
                  testID="video-create-thumbnail-url-input"
                />
                <Text style={styles.fieldHelper}>
                  Optional. If supplied, must be an absolute HTTPS image URL.
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Duration in Seconds (Optional)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. 185 (leave blank for unknown duration)"
                  placeholderTextColor={colors.gray400}
                  value={newDuration}
                  onChangeText={setNewDuration}
                  keyboardType="numeric"
                  testID="video-create-duration-input"
                />
                <Text style={styles.fieldHelper}>
                  Integer seconds $\ge$ 0. "Unknown duration" is valid if left blank.
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Related Story (Optional)</Text>
                <View style={styles.pickerContainer}>
                  <Pressable
                    style={[
                      styles.storyOption,
                      newRelatedStoryId === null && styles.storyOptionSelected
                    ]}
                    onPress={() => setNewRelatedStoryId(null)}
                  >
                    <Text
                      style={[
                        styles.storyOptionText,
                        newRelatedStoryId === null && styles.storyOptionTextSelected
                      ]}
                    >
                      None (Independent Video)
                    </Text>
                  </Pressable>
                  {stories.map((story) => {
                    const isSelected = newRelatedStoryId === story.id;
                    return (
                      <Pressable
                        key={story.id}
                        style={[styles.storyOption, isSelected && styles.storyOptionSelected]}
                        onPress={() => setNewRelatedStoryId(story.id)}
                      >
                        <Text
                          style={[
                            styles.storyOptionText,
                            isSelected && styles.storyOptionTextSelected
                          ]}
                          numberOfLines={1}
                        >
                          📰 {story.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Source Provenance * (Starts Blank)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. direct HealthTimes production, external verified publisher destination"
                  placeholderTextColor={colors.gray400}
                  value={newProvenance}
                  onChangeText={setNewProvenance}
                  testID="video-create-provenance-input"
                />
                <Text style={styles.fieldHelper}>
                  Editorial attribution and source origin. Deliberate operator input required.
                </Text>
              </View>

              <View style={styles.formActions}>
                <Pressable
                  style={[styles.primaryButton, createSubmitting && styles.buttonDisabled]}
                  onPress={handleSubmitCreate}
                  disabled={createSubmitting}
                  testID="video-create-submit-button"
                >
                  <Text style={styles.primaryButtonText}>
                    {createSubmitting ? "Creating..." : "Create Registry Entry"}
                  </Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={handleCancelCreate}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : selectedVideo ? (
            /* Selected Video Inspector / Editor */
            <ScrollView style={styles.inspectorScroll} testID="video-desk-inspector">
              <View style={styles.inspectorHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inspectorKicker}>
                    {isOwnerPreview ? "VIDEO INSPECTOR" : "VIDEO REGISTRY INSPECTOR"}
                  </Text>
                  <Text style={styles.inspectorTitle} numberOfLines={2}>
                    {selectedVideo.title}
                  </Text>
                </View>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      selectedVideo.status === "ready"
                        ? styles.statusBadgeReady
                        : styles.statusBadgeDraft
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        selectedVideo.status === "ready"
                          ? styles.statusBadgeTextReady
                          : styles.statusBadgeTextDraft
                      ]}
                    >
                      {selectedVideo.status.toUpperCase()}
                    </Text>
                  </View>
                  {Boolean(selectedVideo.publishedAt) && (
                    <View style={styles.statusBadgePublished} testID="inspector-badge-published">
                      <Text style={styles.statusBadgeTextPublished}>PUBLISHED</Text>
                    </View>
                  )}
                  {Boolean(selectedVideo.watchFeatured) && (
                    <View style={styles.statusBadgeFeatured} testID="inspector-badge-featured">
                      <Text style={styles.statusBadgeTextFeatured}>FEATURED ON WATCH</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Publication / Ready State Distinction Banners */}
              {selectedVideo.publishedAt ? (
                <>
                  <View style={styles.publishedDistinctionBanner} testID="video-published-distinction-banner">
                    <Text style={styles.publishedDistinctionTitle}>
                      ● {isOwnerPreview ? "SIMULATED PUBLICATION RECORD" : "PUBLISHED TO READER WATCH"} {selectedVideo.watchFeatured ? "(FEATURED)" : ""}
                    </Text>
                    <Text style={styles.publishedDistinctionBody}>
                      {isOwnerPreview
                        ? "Publication readiness recorded in preview memory. Video is marked ready for Watch delivery (live reader publication requires production release)."
                        : "This video is live on HealthTimes Watch. Viewing destination opens directly from Reader Watch cards."}
                    </Text>
                  </View>
                  <View style={styles.publishedLockBanner} testID="video-published-lock-banner">
                    <Text style={styles.publishedLockTitle}>
                      🔒 PUBLISHED ON WATCH · METADATA LOCKED
                    </Text>
                    <Text style={styles.publishedLockBody}>
                      Unpublish this video before changing its public metadata.
                    </Text>
                  </View>
                </>
              ) : selectedVideo.status === "ready" ? (
                <View style={styles.readyDistinctionBanner} testID="video-ready-distinction-banner">
                  <Text style={styles.readyDistinctionTitle}>
                    ✓ EDITORIAL METADATA READY FOR PUBLIC DELIVERY
                  </Text>
                  <Text style={styles.readyDistinctionBody}>
                    This video is validated and ready for public Watch delivery. Use "Publish to Watch" below to make it visible to readers.
                  </Text>
                </View>
              ) : (
                <View style={styles.draftDistinctionBanner}>
                  <Text style={styles.draftDistinctionTitle}>DRAFT EDITORIAL METADATA</Text>
                  <Text style={styles.draftDistinctionBody}>
                    Work in progress. Complete required title, valid HTTPS destination, and source provenance to mark as Ready.
                  </Text>
                </View>
              )}

              {saveFeedback && (
                <View
                  style={[
                    styles.feedbackBanner,
                    saveFeedback.type === "success"
                      ? styles.feedbackBannerSuccess
                      : styles.feedbackBannerError
                  ]}
                  testID="video-editor-feedback"
                >
                  <Text
                    style={[
                      styles.feedbackBannerText,
                      saveFeedback.type === "success"
                        ? styles.feedbackBannerTextSuccess
                        : styles.feedbackBannerTextError
                    ]}
                  >
                    {saveFeedback.message}
                  </Text>
                </View>
              )}

              {/* Visual Video Stream / Thumbnail Inspection Card */}
              <View style={styles.visualInspectionCard} testID="video-visual-inspection-card">
                <Text style={styles.visualInspectionTitle}>Visual Inspection & Media Slate</Text>
                {selectedVideo.thumbnailUrl && isThumbnailUrlValid ? (
                  <View style={styles.visualInspectionThumbnailWrap}>
                    <Image
                      source={{ uri: selectedVideo.thumbnailUrl }}
                      style={styles.visualInspectionImage}
                      resizeMode="cover"
                      testID="video-inspector-main-thumbnail"
                    />
                    <View style={styles.visualInspectionOverlay}>
                      <Text style={styles.visualInspectionDurationBadge}>
                        ⏱ {formatDurationSeconds(selectedVideo.durationSeconds)}
                      </Text>
                      <Pressable
                        style={styles.visualInspectionActionBtn}
                        onPress={() => Linking.openURL(selectedVideo.sourceUrl)}
                        testID="video-play-stream-button"
                      >
                        <Text style={styles.visualInspectionActionText}>▶ Open Video Stream ↗</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.visualInspectionFallbackSlate} testID="video-inspector-fallback-slate">
                    <View style={styles.visualInspectionSlateIcon}>
                      <Text style={styles.visualInspectionSlateIconText}>🎬</Text>
                    </View>
                    <View style={styles.visualInspectionSlateMeta}>
                      <Text style={styles.visualInspectionSlateTitle} numberOfLines={2}>
                        {selectedVideo.title}
                      </Text>
                      <Text style={styles.visualInspectionSlateDetail}>
                        Duration: {formatDurationSeconds(selectedVideo.durationSeconds)} · Format: Web Stream
                      </Text>
                      <Text style={styles.visualInspectionSlateUrl} numberOfLines={1}>
                        Destination: {selectedVideo.sourceUrl}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.visualInspectionActionBtn}
                      onPress={() => Linking.openURL(selectedVideo.sourceUrl)}
                      testID="video-play-stream-button"
                    >
                      <Text style={styles.visualInspectionActionText}>▶ Play / Inspect Stream ↗</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Editorial & Asset Attributes */}
              <View style={styles.readOnlyGrid}>
                <View style={styles.readOnlyItem}>
                  <Text style={styles.readOnlyLabel}>{isOwnerPreview ? "Catalog Reference" : "Video UUID"}</Text>
                  <Text style={styles.readOnlyValue} numberOfLines={1}>
                    {isOwnerPreview ? selectedVideo.id.slice(0, 13) : selectedVideo.id}
                  </Text>
                </View>
                <View style={styles.readOnlyItem}>
                  <Text style={styles.readOnlyLabel}>{isOwnerPreview ? "Format" : "Lock Version"}</Text>
                  <Text style={styles.readOnlyValue}>{isOwnerPreview ? "Web Stream / Video" : `v${selectedVideo.lockVersion}`}</Text>
                </View>
                <View style={styles.readOnlyItem}>
                  <Text style={styles.readOnlyLabel}>Created At</Text>
                  <Text style={styles.readOnlyValue}>{formatDate(selectedVideo.createdAt)}</Text>
                </View>
                <View style={styles.readOnlyItem}>
                  <Text style={styles.readOnlyLabel}>Last Updated</Text>
                  <Text style={styles.readOnlyValue}>{formatDate(selectedVideo.updatedAt)}</Text>
                </View>
                <View style={styles.readOnlyItem}>
                  <Text style={styles.readOnlyLabel}>Created By</Text>
                  <Text style={styles.readOnlyValue} numberOfLines={1}>
                    {isOwnerPreview ? "Editorial Staff" : (selectedVideo.createdByStaffId || "System")}
                  </Text>
                </View>
                <View style={styles.readOnlyItem}>
                  <Text style={styles.readOnlyLabel}>Updated By</Text>
                  <Text style={styles.readOnlyValue} numberOfLines={1}>
                    {isOwnerPreview ? "Editorial Staff" : (selectedVideo.updatedByStaffId || "System")}
                  </Text>
                </View>
                <View style={styles.readOnlyItem}>
                  <Text style={styles.readOnlyLabel}>Published At</Text>
                  <Text style={styles.readOnlyValue}>
                    {selectedVideo.publishedAt ? formatDate(selectedVideo.publishedAt) : "Unpublished"}
                  </Text>
                </View>
                <View style={styles.readOnlyItem}>
                  <Text style={styles.readOnlyLabel}>Watch Featured</Text>
                  <Text style={styles.readOnlyValue}>
                    {selectedVideo.watchFeatured ? "Yes (Featured on Watch)" : "No"}
                  </Text>
                </View>
              </View>

              {/* Editable Fields */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Title *</Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    Boolean(selectedVideo.publishedAt) && styles.fieldInputDisabled
                  ]}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  editable={!selectedVideo.publishedAt}
                  testID="video-editor-title-input"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Public Viewing Destination (Source URL) *</Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    Boolean(selectedVideo.publishedAt) && styles.fieldInputDisabled
                  ]}
                  value={editSourceUrl}
                  onChangeText={setEditSourceUrl}
                  editable={!selectedVideo.publishedAt}
                  autoCapitalize="none"
                  testID="video-editor-source-url-input"
                />
                {/* Safe URL Destination Link (Section 28) */}
                {isSourceUrlValid ? (
                  <View style={styles.urlPreviewBar}>
                    <Text style={styles.urlPreviewText} numberOfLines={1}>
                      Verified HTTPS: {editSourceUrl}
                    </Text>
                    <Pressable
                      style={styles.openUrlButton}
                      onPress={() => Linking.openURL(editSourceUrl)}
                      testID="video-open-destination-button"
                    >
                      <Text style={styles.openUrlButtonText}>Open Destination ↗</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.fieldError}>
                    Invalid source URL: Must be a valid absolute HTTPS URL without embedded credentials.
                  </Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Thumbnail URL (Optional)</Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    Boolean(selectedVideo.publishedAt) && styles.fieldInputDisabled
                  ]}
                  value={editThumbnailUrl}
                  onChangeText={setEditThumbnailUrl}
                  editable={!selectedVideo.publishedAt}
                  autoCapitalize="none"
                  placeholder="https://..."
                  placeholderTextColor={colors.gray400}
                  testID="video-editor-thumbnail-url-input"
                />
                {/* Thumbnail Preview or Truthful Placeholder (Section 29) */}
                <View style={styles.thumbnailPreviewContainer}>
                  {editThumbnailUrl.trim() && isThumbnailUrlValid ? (
                    <View style={styles.thumbnailWrapper}>
                      <Image
                        source={{ uri: editThumbnailUrl.trim() }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                        testID="video-thumbnail-preview"
                      />
                    </View>
                  ) : (
                    <View style={styles.thumbnailPlaceholder} testID="video-thumbnail-placeholder">
                      <Text style={styles.thumbnailPlaceholderText}>
                        No thumbnail assigned.
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Duration in Seconds (Optional)</Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    Boolean(selectedVideo.publishedAt) && styles.fieldInputDisabled
                  ]}
                  value={editDuration}
                  onChangeText={setEditDuration}
                  editable={!selectedVideo.publishedAt}
                  keyboardType="numeric"
                  placeholder="e.g. 185"
                  placeholderTextColor={colors.gray400}
                  testID="video-editor-duration-input"
                />
                <Text style={styles.fieldHelper}>
                  Current: {formatDurationSeconds(editDuration.trim() ? Number(editDuration) : null)}
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Related Story (Optional)</Text>
                <View style={styles.pickerContainer} testID="video-editor-related-story-picker">
                  <Pressable
                    style={[
                      styles.storyOption,
                      editRelatedStoryId === null && styles.storyOptionSelected,
                      Boolean(selectedVideo.publishedAt) && styles.storyOptionDisabled
                    ]}
                    onPress={() => {
                      if (!selectedVideo.publishedAt) setEditRelatedStoryId(null);
                    }}
                    disabled={Boolean(selectedVideo.publishedAt)}
                  >
                    <Text
                      style={[
                        styles.storyOptionText,
                        editRelatedStoryId === null && styles.storyOptionTextSelected
                      ]}
                    >
                      None (Independent Video)
                    </Text>
                  </Pressable>
                  {stories.map((story) => {
                    const isSelected = editRelatedStoryId === story.id;
                    return (
                      <Pressable
                        key={story.id}
                        style={[
                          styles.storyOption,
                          isSelected && styles.storyOptionSelected,
                          Boolean(selectedVideo.publishedAt) && styles.storyOptionDisabled
                        ]}
                        onPress={() => {
                          if (!selectedVideo.publishedAt) setEditRelatedStoryId(story.id);
                        }}
                        disabled={Boolean(selectedVideo.publishedAt)}
                      >
                        <Text
                          style={[
                            styles.storyOptionText,
                            isSelected && styles.storyOptionTextSelected
                          ]}
                          numberOfLines={1}
                        >
                          📰 {story.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Source Provenance *</Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    Boolean(selectedVideo.publishedAt) && styles.fieldInputDisabled
                  ]}
                  value={editProvenance}
                  onChangeText={setEditProvenance}
                  editable={!selectedVideo.publishedAt}
                  testID="video-editor-provenance-input"
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.formActions}>
                <Pressable
                  style={[
                    styles.primaryButton,
                    (saveSubmitting || Boolean(selectedVideo.publishedAt) || isOwnerPreview) &&
                      styles.buttonDisabled
                  ]}
                  onPress={handleSaveVideo}
                  disabled={saveSubmitting || Boolean(selectedVideo.publishedAt) || isOwnerPreview}
                  testID="video-editor-save-button"
                >
                  <Text style={styles.primaryButtonText}>
                    {saveSubmitting
                      ? "Saving..."
                      : selectedVideo.publishedAt
                      ? "Locked While Published"
                      : "Save Changes"}
                  </Text>
                </Pressable>

                {selectedVideo.status === "draft" ? (
                  <Pressable
                    style={[
                      styles.readyButton,
                      (readySubmitting || Boolean(selectedVideo.publishedAt) || isOwnerPreview) &&
                        styles.buttonDisabled
                    ]}
                    onPress={() => handleToggleReady(true)}
                    disabled={readySubmitting || Boolean(selectedVideo.publishedAt) || isOwnerPreview}
                    testID="video-editor-ready-button"
                  >
                    <Text style={styles.readyButtonText}>
                      {readySubmitting ? "Updating..." : "Mark as Ready"}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={[
                      styles.draftButton,
                      (readySubmitting || Boolean(selectedVideo.publishedAt) || isOwnerPreview) &&
                        styles.buttonDisabled
                    ]}
                    onPress={() => handleToggleReady(false)}
                    disabled={readySubmitting || Boolean(selectedVideo.publishedAt) || isOwnerPreview}
                    testID="video-editor-draft-button"
                  >
                    <Text style={styles.draftButtonText}>
                      {readySubmitting ? "Updating..." : "Return to Draft"}
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Publication Action Buttons (Section 38 & 39) */}
              {canPublish && (
                <View style={styles.publicationActionRow} testID="video-publication-actions">
                  {!selectedVideo.publishedAt && selectedVideo.status === "ready" && (
                    <>
                      <Pressable
                        style={[
                          styles.publishButton,
                          (publishSubmitting || isOwnerPreview) && styles.buttonDisabled
                        ]}
                        onPress={() => handlePublish(false)}
                        disabled={publishSubmitting || isOwnerPreview}
                        testID="video-publish-button"
                      >
                        <Text style={styles.publishButtonText}>
                          {publishSubmitting ? "Publishing..." : "Publish to Watch"}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.publishFeatureButton,
                          (publishSubmitting || isOwnerPreview) && styles.buttonDisabled
                        ]}
                        onPress={() => handlePublish(true)}
                        disabled={publishSubmitting || isOwnerPreview}
                        testID="video-publish-feature-button"
                      >
                        <Text style={styles.publishFeatureButtonText}>
                          {publishSubmitting ? "Publishing..." : "Publish & Feature"}
                        </Text>
                      </Pressable>
                    </>
                  )}

                  {Boolean(selectedVideo.publishedAt) && (
                    <>
                      <Pressable
                        style={[
                          styles.unpublishButton,
                          (unpublishSubmitting || isOwnerPreview) && styles.buttonDisabled
                        ]}
                        onPress={handleUnpublish}
                        disabled={unpublishSubmitting || isOwnerPreview}
                        testID="video-unpublish-button"
                      >
                        <Text style={styles.unpublishButtonText}>
                          {unpublishSubmitting ? "Unpublishing..." : "Unpublish"}
                        </Text>
                      </Pressable>

                      {!selectedVideo.watchFeatured ? (
                        <Pressable
                          style={[
                            styles.featureButton,
                            (featureSubmitting || isOwnerPreview) && styles.buttonDisabled
                          ]}
                          onPress={() => handleSetFeatured(true)}
                          disabled={featureSubmitting || isOwnerPreview}
                          testID="video-feature-button"
                        >
                          <Text style={styles.featureButtonText}>
                            {featureSubmitting ? "Updating..." : "Feature on Watch"}
                          </Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          style={[
                            styles.unfeatureButton,
                            (featureSubmitting || isOwnerPreview) && styles.buttonDisabled
                          ]}
                          onPress={() => handleSetFeatured(false)}
                          disabled={featureSubmitting || isOwnerPreview}
                          testID="video-unfeature-button"
                        >
                          <Text style={styles.unfeatureButtonText}>
                            {featureSubmitting ? "Updating..." : "Remove Featured"}
                          </Text>
                        </Pressable>
                      )}
                    </>
                  )}
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.centerMessage} testID="video-desk-no-selection">
              <Text style={styles.emptyTitle}>No Video Selected</Text>
              <Text style={styles.mutedText}>
                Select an entry from the registry list to view and edit editorial metadata, or click "+ New Video" to register a new public video.
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export function StudioVideoDesk() {
  const [videos, setVideos] = useState<NewsroomVideo[]>([]);
  const [stories, setStories] = useState<Array<{ id: string; title: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "ready">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [videoList, storyList] = await Promise.all([
        services.newsroomVideo.listVideos({
          status: statusFilter === "all" ? undefined : statusFilter,
          search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
          limit: 100
        }),
        services.newsroomStories.listStories(50).catch(() => [] as NewsroomStory[])
      ]);
      setVideos(videoList);
      setStories(storyList.map((s) => ({ id: s.id, title: s.title })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load video desk.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, debouncedSearch]);

  const handleCreateVideo = async (input: NewsroomVideoCreateInput) => {
    const newId = await services.newsroomVideo.createVideo(input);
    await loadData();
    setSelectedVideoId(newId);
  };

  const handleSaveVideo = async (
    videoId: string,
    expectedVersion: number,
    patch: NewsroomVideoPatch
  ) => {
    await services.newsroomVideo.saveVideo(videoId, expectedVersion, patch);
    await loadData();
  };

  const handleToggleReady = async (
    videoId: string,
    expectedVersion: number,
    ready: boolean
  ) => {
    await services.newsroomVideo.setReady(videoId, expectedVersion, ready);
    await loadData();
  };

  const authSnapshot = services.authorization.getSnapshot();
  const canPublish = hasVideoPublicationAuthority(authSnapshot);

  const handlePublishVideo = async (
    videoId: string,
    expectedVersion: number,
    featured?: boolean
  ) => {
    await services.newsroomVideo.publishVideo(videoId, expectedVersion, featured);
    await loadData();
  };

  const handleUnpublishVideo = async (
    videoId: string,
    expectedVersion: number
  ) => {
    await services.newsroomVideo.unpublishVideo(videoId, expectedVersion);
    await loadData();
  };

  const handleSetFeatured = async (
    videoId: string,
    expectedVersion: number,
    featured: boolean
  ) => {
    await services.newsroomVideo.setFeatured(videoId, expectedVersion, featured);
    await loadData();
  };

  return (
    <StudioAccessGate capability="media.manage">
      <StudioVideoDeskView
        videos={videos}
        stories={stories}
        loading={loading}
        error={error}
        selectedVideoId={selectedVideoId}
        onSelectVideo={(v) => setSelectedVideoId(v ? v.id : null)}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onRefresh={loadData}
        canPublish={canPublish}
        onCreateVideo={handleCreateVideo}
        onSaveVideo={handleSaveVideo}
        onToggleReady={handleToggleReady}
        onPublishVideo={handlePublishVideo}
        onUnpublishVideo={handleUnpublishVideo}
        onSetFeatured={handleSetFeatured}
      />
    </StudioAccessGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.md
  },
  headerLeft: {
    flex: 1,
    minWidth: 280
  },
  headerKicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.gray500,
    marginBottom: 4
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.gray900
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.gray600,
    marginTop: 2
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  primaryButton: {
    backgroundColor: colors.emerald700,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md
  },
  primaryButtonActive: {
    backgroundColor: colors.emerald800
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13
  },
  secondaryButton: {
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray300
  },
  secondaryButtonText: {
    color: colors.gray700,
    fontWeight: "600",
    fontSize: 13
  },
  buttonDisabled: {
    opacity: 0.5
  },
  readyButton: {
    backgroundColor: colors.emerald600,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md
  },
  readyButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13
  },
  draftButton: {
    backgroundColor: colors.amber600,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md
  },
  draftButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    flexWrap: "wrap"
  },
  metricCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    minWidth: 120
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
    marginTop: 2
  },
  metricDisclaimer: {
    justifyContent: "center",
    paddingLeft: spacing.sm,
    flex: 1,
    minWidth: 200
  },
  metricDisclaimerText: {
    fontSize: 11,
    color: colors.gray500,
    fontStyle: "italic",
    lineHeight: 15
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    gap: spacing.md,
    flexWrap: "wrap"
  },
  searchInput: {
    flex: 1,
    minWidth: 260,
    height: 38,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 13,
    color: colors.gray900,
    backgroundColor: colors.gray50
  },
  filterPills: {
    flexDirection: "row",
    gap: spacing.xs
  },
  filterPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.gray100
  },
  filterPillActive: {
    backgroundColor: colors.gray900
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray700
  },
  filterPillTextActive: {
    color: colors.white
  },
  workspace: {
    flex: 1
  },
  workspaceRow: {
    flexDirection: "row"
  },
  workspaceColumn: {
    flexDirection: "column"
  },
  listColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: colors.gray200,
    backgroundColor: colors.white
  },
  listColumnDesktop: {
    maxWidth: 420
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    backgroundColor: colors.gray50
  },
  listHeaderTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray700,
    letterSpacing: 0.5
  },
  listHeaderCount: {
    fontSize: 11,
    color: colors.gray500
  },
  videoListScroll: {
    flex: 1
  },
  videoCard: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    backgroundColor: colors.white
  },
  videoCardSelected: {
    backgroundColor: colors.blue50,
    borderLeftWidth: 4,
    borderLeftColor: colors.blue600
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray900
  },
  statusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  statusBadgeDraft: {
    backgroundColor: colors.amber100
  },
  statusBadgeReady: {
    backgroundColor: colors.emerald100
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800"
  },
  statusBadgeTextDraft: {
    color: colors.amber800
  },
  statusBadgeTextReady: {
    color: colors.emerald800
  },
  cardProvenance: {
    fontSize: 12,
    color: colors.gray600,
    marginTop: 4
  },
  cardUrl: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 2
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm
  },
  cardDuration: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray600
  },
  cardDate: {
    fontSize: 10,
    color: colors.gray400
  },
  inspectorColumn: {
    flex: 1.4,
    backgroundColor: colors.gray50
  },
  inspectorColumnDesktop: {
    minWidth: 480
  },
  inspectorScroll: {
    flex: 1,
    padding: spacing.lg
  },
  inspectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200
  },
  inspectorKicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.gray500
  },
  inspectorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.gray900,
    marginTop: 2
  },
  readyDistinctionBanner: {
    backgroundColor: colors.emerald50,
    borderColor: colors.emerald300,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md
  },
  readyDistinctionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.emerald800
  },
  readyDistinctionBody: {
    fontSize: 11,
    color: colors.emerald700,
    marginTop: 4,
    lineHeight: 16
  },
  draftDistinctionBanner: {
    backgroundColor: colors.amber50,
    borderColor: colors.amber300,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md
  },
  draftDistinctionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.amber800
  },
  draftDistinctionBody: {
    fontSize: 11,
    color: colors.amber700,
    marginTop: 4,
    lineHeight: 16
  },
  feedbackBanner: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md
  },
  feedbackBannerSuccess: {
    backgroundColor: colors.emerald100
  },
  feedbackBannerError: {
    backgroundColor: colors.rose100
  },
  feedbackBannerText: {
    fontSize: 12,
    fontWeight: "600"
  },
  feedbackBannerTextSuccess: {
    color: colors.emerald900
  },
  feedbackBannerTextError: {
    color: colors.rose900
  },
  readOnlyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.md,
    marginTop: spacing.md
  },
  readOnlyItem: {
    width: "48%",
    minWidth: 140
  },
  readOnlyLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray400,
    textTransform: "uppercase"
  },
  readOnlyValue: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray800,
    marginTop: 2
  },
  formGroup: {
    marginTop: spacing.md
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray800,
    marginBottom: 4
  },
  fieldInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 13,
    color: colors.gray900
  },
  fieldHelper: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 4
  },
  fieldError: {
    fontSize: 11,
    color: colors.rose600,
    marginTop: 4,
    fontWeight: "600"
  },
  urlPreviewBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: 4
  },
  urlPreviewText: {
    fontSize: 11,
    color: colors.gray700,
    flex: 1
  },
  openUrlButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.gray900,
    borderRadius: radius.sm,
    marginLeft: spacing.sm
  },
  openUrlButtonText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "700"
  },
  thumbnailPreviewContainer: {
    marginTop: spacing.sm
  },
  thumbnailWrapper: {
    width: "100%",
    height: 180,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.gray300
  },
  thumbnailImage: {
    width: "100%",
    height: "100%"
  },
  thumbnailPlaceholder: {
    width: "100%",
    height: 90,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.gray300,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center"
  },
  thumbnailPlaceholderText: {
    fontSize: 12,
    color: colors.gray500,
    fontStyle: "italic"
  },
  pickerContainer: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.md,
    maxHeight: 160,
    padding: spacing.xs
  },
  storyOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginBottom: 2
  },
  storyOptionSelected: {
    backgroundColor: colors.blue100
  },
  storyOptionText: {
    fontSize: 12,
    color: colors.gray800
  },
  storyOptionTextSelected: {
    fontWeight: "700",
    color: colors.blue900
  },
  formActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray200
  },
  cancelLink: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4
  },
  cancelLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray600
  },
  centerMessage: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.gray700,
    marginBottom: 4
  },
  mutedText: {
    fontSize: 12,
    color: colors.gray500,
    textAlign: "center"
  },
  errorBox: {
    padding: spacing.md,
    backgroundColor: colors.rose50,
    borderColor: colors.rose200,
    borderWidth: 1,
    margin: spacing.md,
    borderRadius: radius.md
  },
  errorBoxText: {
    color: colors.rose800,
    fontSize: 12
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap"
  },
  statusBadgePublished: {
    backgroundColor: colors.blue100,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  statusBadgeTextPublished: {
    color: colors.blue900,
    fontSize: 10,
    fontWeight: "800"
  },
  statusBadgeFeatured: {
    backgroundColor: colors.amber100,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  statusBadgeTextFeatured: {
    color: colors.amber800,
    fontSize: 10,
    fontWeight: "800"
  },
  publishedDistinctionBanner: {
    backgroundColor: colors.blue50,
    borderColor: colors.blue600,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md
  },
  publishedDistinctionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.blue900
  },
  publishedDistinctionBody: {
    fontSize: 11,
    color: colors.blue900,
    marginTop: 4,
    lineHeight: 16
  },
  publishedLockBanner: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray300,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm
  },
  publishedLockTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.gray800
  },
  publishedLockBody: {
    fontSize: 11,
    color: colors.gray600,
    marginTop: 4,
    lineHeight: 16
  },
  publicationActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray200
  },
  publishButton: {
    backgroundColor: colors.blue600,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md
  },
  publishButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13
  },
  publishFeatureButton: {
    backgroundColor: colors.amber600,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md
  },
  publishFeatureButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13
  },
  unpublishButton: {
    backgroundColor: colors.rose600,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md
  },
  unpublishButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13
  },
  featureButton: {
    backgroundColor: colors.amber700,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md
  },
  featureButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13
  },
  unfeatureButton: {
    backgroundColor: colors.gray600,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md
  },
  unfeatureButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13
  },
  fieldInputDisabled: {
    backgroundColor: colors.gray100,
    color: colors.gray500,
    borderColor: colors.gray200
  },
  storyOptionDisabled: {
    opacity: 0.6
  },
  visualInspectionCard: {
    backgroundColor: colors.gray900,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  visualInspectionTitle: {
    color: colors.gray200,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm
  },
  visualInspectionThumbnailWrap: {
    position: "relative",
    borderRadius: radius.md,
    overflow: "hidden",
    height: 180,
    backgroundColor: "#000000"
  },
  visualInspectionImage: {
    width: "100%",
    height: "100%"
  },
  visualInspectionOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.65)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  visualInspectionDurationBadge: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600"
  },
  visualInspectionFallbackSlate: {
    backgroundColor: colors.gray800,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "column",
    gap: spacing.sm
  },
  visualInspectionSlateIcon: {
    alignSelf: "flex-start",
    backgroundColor: colors.gray700,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  visualInspectionSlateIconText: {
    fontSize: 20
  },
  visualInspectionSlateMeta: {
    flex: 1
  },
  visualInspectionSlateTitle: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 4
  },
  visualInspectionSlateDetail: {
    color: colors.gray300,
    fontSize: 12,
    marginBottom: 2
  },
  visualInspectionSlateUrl: {
    color: "#38BDF8",
    fontSize: 11
  },
  visualInspectionActionBtn: {
    backgroundColor: "#0284C7",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    alignSelf: "flex-start",
    marginTop: 4
  },
  visualInspectionActionText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 12
  }
});
