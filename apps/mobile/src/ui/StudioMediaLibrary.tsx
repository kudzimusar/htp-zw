import { useState, useMemo, useEffect } from "react";
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
import { useRouter } from "expo-router";
import { services } from "../services";
import { useAsync } from "../hooks/useAsync";
import {
  classifyMediaMimeType,
  deriveStorageCustodyCategory,
  validateMediaMetadataPatch,
  type NewsroomMediaAsset,
  type NewsroomMediaAssetStatus,
  type NewsroomMediaAssetTypeGroup,
  type NewsroomMediaMetadataPatch,
  type NewsroomMediaUsage
} from "../domain/models";
import { breakpoints, colors, radius, spacing } from "../theme/tokens";

export function hasMediaLibraryAuthority(snapshot: unknown): boolean {
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

export function formatByteSize(bytes: number | null | undefined): string {
  if (bytes == null || isNaN(bytes) || bytes <= 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Unknown date";
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", {
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

export type StudioMediaLibraryViewProps = {
  assets: NewsroomMediaAsset[];
  loading?: boolean;
  error?: string | null;
  selectedAssetId?: string | null;
  onSelectAsset?: (asset: NewsroomMediaAsset | null) => void;
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
  onSaveMetadata?: (
    assetId: string,
    patch: NewsroomMediaMetadataPatch
  ) => Promise<void>;
  savingId?: string | null;
  saveError?: string | null;
  saveSuccess?: boolean;
  searchQuery?: string;
  isOwnerPreview?: boolean;
  watermarkBanner?: string;
};

export function StudioMediaLibraryView({
  assets,
  loading = false,
  error = null,
  selectedAssetId = null,
  onSelectAsset,
  onSearch,
  onRefresh,
  onSaveMetadata,
  savingId = null,
  saveError = null,
  saveSuccess = false,
  searchQuery: initialSearchQuery = "",
  isOwnerPreview = false,
  watermarkBanner
}: StudioMediaLibraryViewProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;

  const [searchInput, setSearchInput] = useState(initialSearchQuery);
  const [typeFilter, setTypeFilter] = useState<NewsroomMediaAssetTypeGroup | "All">("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [usageFilter, setUsageFilter] = useState<"All" | "used" | "unused">("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filtered assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      // Type group filter
      if (typeFilter !== "All") {
        const group = asset.typeGroup ?? classifyMediaMimeType(asset.mimeType);
        if (group !== typeFilter) return false;
      }
      // Status filter
      if (statusFilter !== "All") {
        if (asset.status !== statusFilter) return false;
      }
      // Usage filter
      if (usageFilter === "used" && asset.usage.length === 0) return false;
      if (usageFilter === "unused" && asset.usage.length > 0) return false;

      return true;
    });
  }, [assets, typeFilter, statusFilter, usageFilter]);

  // Selected asset
  const selectedAsset = useMemo(() => {
    if (!selectedAssetId) return filteredAssets[0] ?? null;
    return assets.find((a) => a.id === selectedAssetId) ?? filteredAssets[0] ?? null;
  }, [assets, filteredAssets, selectedAssetId]);

  // Draft metadata state for the selected asset
  const [draftAltText, setDraftAltText] = useState("");
  const [draftCaption, setDraftCaption] = useState("");
  const [draftCredit, setDraftCredit] = useState("");
  const [draftProvenance, setDraftProvenance] = useState("");
  const [clientValidationError, setClientValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedAsset) {
      setDraftAltText(selectedAsset.altText ?? "");
      setDraftCaption(selectedAsset.caption ?? "");
      setDraftCredit(selectedAsset.credit ?? "");
      setDraftProvenance(selectedAsset.sourceProvenance ?? "");
      setClientValidationError(null);
    }
  }, [selectedAsset?.id]);

  const handleSearchSubmit = () => {
    if (onSearch) {
      onSearch(searchInput.trim());
    }
  };

  const handleClearSearch = () => {
    setSearchInput("");
    if (onSearch) {
      onSearch("");
    }
  };

  const handleSave = async () => {
    if (!selectedAsset || !onSaveMetadata) return;
    setClientValidationError(null);

    const patch: NewsroomMediaMetadataPatch = {
      altText: draftAltText.trim() === "" ? null : draftAltText.trim(),
      caption: draftCaption.trim() === "" ? null : draftCaption.trim(),
      credit: draftCredit.trim() === "" ? null : draftCredit.trim(),
      sourceProvenance: draftProvenance.trim() === "" ? null : draftProvenance.trim()
    };

    const validation = validateMediaMetadataPatch(selectedAsset, patch);
    if (!validation.valid) {
      setClientValidationError(validation.error ?? "Validation failed.");
      return;
    }

    await onSaveMetadata(selectedAsset.id, patch);
  };

  const isSaving = savingId === selectedAsset?.id;

  return (
    <View style={styles.container} testID="studio-media-library-view">
      {watermarkBanner ? (
        <View style={styles.previewNoticeBanner}>
          <Text style={styles.previewNoticeText}>{watermarkBanner}</Text>
        </View>
      ) : null}

      {/* Media Library Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.headerTitle}>Media Library</Text>
            <Text style={styles.headerSubtitle}>
              Editorial asset management, technical metadata, accessibility, and story usage.
            </Text>
          </View>
          <View style={styles.headerBadgesRow}>
            <View style={styles.countBadge} testID="media-inventory-count-badge">
              <Text style={styles.countBadgeText}>
                {assets.length} assets loaded (capped at 100/250)
              </Text>
            </View>
            <View style={styles.scopeBadge}>
              <Text style={styles.scopeBadgeText}>Bounded latest/search set</Text>
            </View>
          </View>
        </View>

        {/* Search & Filters Controls */}
        <View style={styles.controlsBar}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by filename, caption, credit, source provenance..."
              placeholderTextColor={colors.inkMuted}
              value={searchInput}
              onChangeText={setSearchInput}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              testID="media-library-search-input"
            />
            <Pressable
              style={styles.searchButton}
              onPress={handleSearchSubmit}
              accessibilityRole="button"
              accessibilityLabel="Execute media search"
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </Pressable>
            {searchInput.trim() !== "" ? (
              <Pressable
                style={styles.clearButton}
                onPress={handleClearSearch}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </Pressable>
            ) : null}
            {onRefresh ? (
              <Pressable
                style={styles.refreshButton}
                onPress={onRefresh}
                accessibilityRole="button"
                accessibilityLabel="Refresh media library"
              >
                <Text style={styles.refreshButtonText}>↻ Refresh</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Filters Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {/* Type Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupLabel}>Type:</Text>
              {(["All", "Images", "Video", "Audio", "Documents", "Other"] as const).map(
                (grp) => (
                  <Pressable
                    key={grp}
                    style={[
                      styles.filterChip,
                      typeFilter === grp && styles.filterChipActive
                    ]}
                    onPress={() => setTypeFilter(grp)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: typeFilter === grp }}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        typeFilter === grp && styles.filterChipTextActive
                      ]}
                    >
                      {grp}
                    </Text>
                  </Pressable>
                )
              )}
            </View>

            {/* Status Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupLabel}>Status:</Text>
              {[
                "All",
                "pending",
                "missing_from_uploads_archive",
                "private_ready",
                "published"
              ].map((st) => (
                <Pressable
                  key={st}
                  style={[
                    styles.filterChip,
                    statusFilter === st && styles.filterChipActive
                  ]}
                  onPress={() => setStatusFilter(st)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: statusFilter === st }}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      statusFilter === st && styles.filterChipTextActive
                    ]}
                  >
                    {st === "All" ? "All" : st.replace(/_/g, " ")}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Usage Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupLabel}>Usage:</Text>
              {(["All", "used", "unused"] as const).map((u) => (
                <Pressable
                  key={u}
                  style={[
                    styles.filterChip,
                    usageFilter === u && styles.filterChipActive
                  ]}
                  onPress={() => setUsageFilter(u)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: usageFilter === u }}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      usageFilter === u && styles.filterChipTextActive
                    ]}
                  >
                    {u === "All" ? "All" : u === "used" ? "Used in Stories" : "Unused"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* View Mode Toggle */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupLabel}>View:</Text>
              <Pressable
                style={[
                  styles.filterChip,
                  viewMode === "grid" && styles.filterChipActive
                ]}
                onPress={() => setViewMode("grid")}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.filterChipText,
                    viewMode === "grid" && styles.filterChipTextActive
                  ]}
                >
                  Grid
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.filterChip,
                  viewMode === "list" && styles.filterChipActive
                ]}
                onPress={() => setViewMode("list")}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.filterChipText,
                    viewMode === "list" && styles.filterChipTextActive
                  ]}
                >
                  List
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Main Content Workspace */}
      <View style={[styles.mainWorkspace, isDesktop && styles.mainWorkspaceDesktop]}>
        {/* Left Column: Asset Grid/List */}
        <View style={styles.inventoryColumn}>
          {loading ? (
            <View style={styles.centerBlock}>
              <Text style={styles.statusNoticeText}>Loading media assets…</Text>
            </View>
          ) : error ? (
            <View style={styles.errorBlock}>
              <Text style={styles.errorTitle}>Error loading media inventory</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              {onRefresh ? (
                <Pressable style={styles.retryButton} onPress={onRefresh}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>
              ) : null}
            </View>
          ) : filteredAssets.length === 0 ? (
            <View style={styles.emptyBlock} testID="media-empty-state">
              <Text style={styles.emptyTitle}>No matching media assets</Text>
              <Text style={styles.emptyText}>
                No assets match the active search query and filters.
              </Text>
            </View>
          ) : viewMode === "grid" ? (
            <ScrollView contentContainerStyle={styles.gridContainer}>
              {filteredAssets.map((asset) => {
                const isSelected = asset.id === selectedAsset?.id;
                const isImage = (asset.typeGroup ?? classifyMediaMimeType(asset.mimeType)) === "Images";
                const hasPublicUrl = Boolean(asset.publicUrl);

                return (
                  <Pressable
                    key={asset.id}
                    style={[styles.gridCard, isSelected && styles.gridCardSelected]}
                    onPress={() => onSelectAsset?.(asset)}
                    testID={`media-card-${asset.id}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Asset ${asset.filename}, status ${asset.status}`}
                  >
                    <View style={styles.gridThumbnailBox}>
                      {isImage && hasPublicUrl ? (
                        <Image
                          source={{ uri: asset.publicUrl! }}
                          style={styles.gridThumbnailImage}
                          resizeMode="cover"
                          accessibilityLabel={asset.altText ?? asset.filename}
                        />
                      ) : (
                        <View style={styles.iconPlaceholder}>
                          <Text style={styles.iconPlaceholderText}>
                            {asset.typeGroup === "Video"
                              ? "🎬"
                              : asset.typeGroup === "Audio"
                              ? "🎵"
                              : asset.typeGroup === "Documents"
                              ? "📄"
                              : isImage
                              ? "🖼️"
                              : "📦"}
                          </Text>
                          <Text style={styles.iconPlaceholderMime}>
                            {asset.mimeType.split("/")[1] ?? asset.mimeType}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.gridCardBody}>
                      <Text style={styles.gridFilename} numberOfLines={1}>
                        {asset.filename}
                      </Text>
                      <View style={styles.gridBadgeRow}>
                        <View style={styles.mimeBadge}>
                          <Text style={styles.mimeBadgeText}>{asset.typeGroup}</Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            asset.status === "published"
                              ? styles.statusPublished
                              : asset.status === "pending"
                              ? styles.statusPending
                              : styles.statusMissing
                          ]}
                        >
                          <Text style={styles.statusBadgeText}>
                            {asset.status.replace(/_/g, " ")}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.gridMetaRow}>
                        <Text style={styles.gridMetaText}>
                          {formatByteSize(asset.byteSize)}
                        </Text>
                        <Text style={styles.gridUsageText}>
                          {asset.usage.length > 0
                            ? `${asset.usage.length} story`
                            : "Unused"}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.listContainer}>
              {filteredAssets.map((asset) => {
                const isSelected = asset.id === selectedAsset?.id;
                return (
                  <Pressable
                    key={asset.id}
                    style={[styles.listRow, isSelected && styles.listRowSelected]}
                    onPress={() => onSelectAsset?.(asset)}
                    testID={`media-row-${asset.id}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={styles.listIconBox}>
                      <Text style={styles.listIcon}>
                        {asset.typeGroup === "Video"
                          ? "🎬"
                          : asset.typeGroup === "Audio"
                          ? "🎵"
                          : asset.typeGroup === "Documents"
                          ? "📄"
                          : "🖼️"}
                      </Text>
                    </View>
                    <View style={styles.listDetails}>
                      <Text style={styles.listFilename} numberOfLines={1}>
                        {asset.filename}
                      </Text>
                      <Text style={styles.listMeta}>
                        {asset.mimeType} • {formatByteSize(asset.byteSize)} •{" "}
                        {asset.status.replace(/_/g, " ")}
                      </Text>
                    </View>
                    <View style={styles.listUsageBox}>
                      <Text style={styles.listUsageText}>
                        {asset.usage.length > 0
                          ? `Used in ${asset.usage.length}`
                          : "Unused"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Right Column: Asset Inspector & Metadata Editor */}
        <View style={styles.inspectorColumn} testID="media-inspector-column">
          {selectedAsset ? (
            <ScrollView contentContainerStyle={styles.inspectorScroll}>
              <View style={styles.inspectorHeader}>
                <Text style={styles.inspectorTitle}>Asset Inspector</Text>
                <Text style={styles.inspectorAssetId} numberOfLines={1}>
                  ID: {selectedAsset.id}
                </Text>
              </View>

              {/* Preview Panel */}
              <View style={styles.inspectorSection} testID="media-preview-panel">
                <Text style={styles.sectionHeading}>Preview</Text>
                {selectedAsset.publicUrl &&
                (selectedAsset.typeGroup ?? classifyMediaMimeType(selectedAsset.mimeType)) ===
                  "Images" ? (
                  <View style={styles.previewImageBox}>
                    <Image
                      source={{ uri: selectedAsset.publicUrl }}
                      style={styles.previewImage}
                      resizeMode="contain"
                      accessibilityLabel={selectedAsset.altText || "Editorial image"}
                      testID="media-public-image-preview"
                    />
                    {!selectedAsset.altText || selectedAsset.altText.trim().length === 0 ? (
                      <View style={styles.warningBox} testID="missing-alt-text-warning">
                        <Text style={styles.warningText}>
                          ⚠️ Missing alt text — required editorial accessibility metadata.
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.previewUnavailableBox} testID="preview-unavailable-notice">
                    <Text style={styles.previewUnavailableIcon}>🔒</Text>
                    <Text style={styles.previewUnavailableText}>
                      Public preview unavailable for this asset.
                    </Text>
                    <Text style={styles.previewUnavailableSubtext}>
                      {selectedAsset.typeGroup === "Video" || selectedAsset.typeGroup === "Audio"
                        ? "Audio and video playback controls are not wired in this phase."
                        : selectedAsset.typeGroup === "Documents"
                        ? "Document preview viewer is not enabled."
                        : "Private or pending migrated storage asset."}
                    </Text>
                  </View>
                )}
              </View>

              {/* Technical Metadata (Immutable) */}
              <View style={styles.inspectorSection} testID="media-technical-metadata">
                <Text style={styles.sectionHeading}>Technical Metadata</Text>
                <View style={styles.metaGrid}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaKey}>Filename</Text>
                    <Text style={styles.metaVal}>{selectedAsset.filename}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaKey}>MIME Type</Text>
                    <Text style={styles.metaVal}>{selectedAsset.mimeType}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaKey}>Status</Text>
                    <Text style={styles.metaVal}>{selectedAsset.status}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaKey}>File Size</Text>
                    <Text style={styles.metaVal}>{formatByteSize(selectedAsset.byteSize)}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaKey}>Dimensions</Text>
                    <Text style={styles.metaVal}>
                      {selectedAsset.width && selectedAsset.height
                        ? `${selectedAsset.width} × ${selectedAsset.height} px`
                        : "Not recorded"}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaKey}>Storage Custody</Text>
                    <Text style={styles.metaVal}>
                      {selectedAsset.storageCustodyCategory ??
                        deriveStorageCustodyCategory(selectedAsset)}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaKey}>Checksum</Text>
                    <Text style={styles.metaVal} numberOfLines={1}>
                      {selectedAsset.checksum ?? "None"}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaKey}>Uploaded Date</Text>
                    <Text style={styles.metaVal}>{formatDate(selectedAsset.createdAt)}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaKey}>Uploader</Text>
                    <Text style={styles.metaVal}>
                      {selectedAsset.uploadedByStaffId ? "Uploader recorded" : "System / Unknown"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Copyright Truth Notice */}
              <View style={styles.copyrightNoticeBox} testID="media-copyright-notice">
                <Text style={styles.copyrightNoticeTitle}>Copyright Policy</Text>
                <Text style={styles.copyrightNoticeText}>
                  Copyright metadata is not available in the current canonical media contract.
                </Text>
              </View>

              {/* Metadata Editor */}
              <View style={styles.inspectorSection} testID="media-metadata-editor">
                <Text style={styles.sectionHeading}>Editorial Metadata Editor</Text>
                <Text style={styles.editorNote}>
                  Editable fields authorized by canonical Newsroom metadata RPC.
                </Text>

                {/* Alt Text */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Alt Text (Accessibility)
                    {selectedAsset.mimeType.startsWith("image/") ? " *" : ""}
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={draftAltText}
                    onChangeText={setDraftAltText}
                    placeholder="Descriptive accessibility text for screen readers…"
                    placeholderTextColor={colors.inkMuted}
                    testID="media-alt-text-input"
                  />
                  {selectedAsset.mimeType.startsWith("image/") ? (
                    <Text style={styles.fieldHelp}>
                      Required for images (minimum 2 characters).
                    </Text>
                  ) : null}
                </View>

                {/* Caption */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Caption</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={draftCaption}
                    onChangeText={setDraftCaption}
                    placeholder="Editorial context and narrative caption…"
                    placeholderTextColor={colors.inkMuted}
                    multiline
                    numberOfLines={3}
                    testID="media-caption-input"
                  />
                </View>

                {/* Credit */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Credit</Text>
                  <TextInput
                    style={styles.textInput}
                    value={draftCredit}
                    onChangeText={setDraftCredit}
                    placeholder="Photographer, wire service, agency or creator…"
                    placeholderTextColor={colors.inkMuted}
                    testID="media-credit-input"
                  />
                </View>

                {/* Source Provenance */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Source Provenance</Text>
                  <TextInput
                    style={styles.textInput}
                    value={draftProvenance}
                    onChangeText={setDraftProvenance}
                    placeholder="Archival provenance (e.g. wordpress-migration, direct-assignment)…"
                    placeholderTextColor={colors.inkMuted}
                    testID="media-provenance-input"
                  />
                  <Text style={styles.fieldHelp}>
                    Institutional or archival origin (separate from author/credit).
                  </Text>
                </View>

                {/* Validation and Error Alerts */}
                {clientValidationError ? (
                  <View style={styles.errorAlert} testID="media-validation-error">
                    <Text style={styles.errorAlertText}>⚠️ {clientValidationError}</Text>
                  </View>
                ) : null}

                {saveError ? (
                  <View style={styles.errorAlert} testID="media-save-error">
                    <Text style={styles.errorAlertText}>❌ {saveError}</Text>
                  </View>
                ) : null}

                {saveSuccess ? (
                  <View style={styles.successAlert} testID="media-save-success">
                    <Text style={styles.successAlertText}>✓ Metadata saved successfully.</Text>
                  </View>
                ) : null}

                {/* Save Button */}
                <Pressable
                  style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={isSaving}
                  testID="media-save-metadata-button"
                  accessibilityRole="button"
                >
                  <Text style={styles.saveButtonText}>
                    {isSaving ? "Saving Metadata…" : "Save Metadata"}
                  </Text>
                </Pressable>
              </View>

              {/* Usage Panel */}
              <View style={styles.inspectorSection} testID="media-usage-panel">
                <Text style={styles.sectionHeading}>
                  Story Usage ({selectedAsset.usage.length})
                </Text>
                {selectedAsset.usage.length === 0 ? (
                  <Text style={styles.noUsageText}>No active story usage recorded.</Text>
                ) : (
                  <View style={styles.usageList}>
                    {selectedAsset.usage.map((u, idx) => (
                      <View key={`${u.storyId}-${idx}`} style={styles.usageCard}>
                        <View style={styles.usageCardTop}>
                          <View style={styles.usageTypeBadge}>
                            <Text style={styles.usageTypeBadgeText}>{u.usageType}</Text>
                          </View>
                          {u.sourceContext ? (
                            <Text style={styles.usageContextText}>{u.sourceContext}</Text>
                          ) : null}
                        </View>
                        <Text style={styles.usageStoryId} numberOfLines={1}>
                          Story ID: {u.storyId}
                        </Text>
                        <Pressable
                          style={styles.storyWorkspaceLink}
                          onPress={() => {
                            if (isOwnerPreview) {
                              router.push(
                                `/owner-preview/studio/create-edit?storyId=${u.storyId}` as never
                              );
                            } else {
                              router.push(`/studio/create-edit?storyId=${u.storyId}` as never);
                            }
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Open story ${u.storyId} in workspace`}
                        >
                          <Text style={styles.storyWorkspaceLinkText}>
                            Open in Story Workspace →
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.emptyInspector}>
              <Text style={styles.emptyInspectorText}>
                Select an asset from the inventory to view its technical details, edit metadata,
                or inspect story usages.
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export function StudioMediaLibrary() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Authority snapshot
  const authAsync = useAsync(
    () => services.authorization.getSnapshot(),
    [refreshKey]
  );
  const authSnapshot = authAsync.data;
  const isAuthorized = hasMediaLibraryAuthority(authSnapshot);

  // Media listing: FAIL-CLOSED. Must NOT call listMedia if unauthorized!
  const mediaAsync = useAsync(async () => {
    if (!isAuthorized) return [];
    return await services.newsroomMedia.listMedia(searchQuery, 100);
  }, [isAuthorized, searchQuery, refreshKey]);

  const assets = Array.isArray(mediaAsync.data) ? mediaAsync.data : [];

  const handleSaveMetadata = async (
    mediaId: string,
    patch: NewsroomMediaMetadataPatch
  ) => {
    try {
      setSavingId(mediaId);
      setSaveError(null);
      setSaveSuccess(false);

      await services.newsroomMedia.updateMediaMetadata(mediaId, patch);
      setSaveSuccess(true);
      // Trigger refresh
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update media metadata.");
    } finally {
      setSavingId(null);
    }
  };

  if (authAsync.loading) {
    return (
      <View style={styles.centerBlock}>
        <Text style={styles.statusNoticeText}>Checking media authority…</Text>
      </View>
    );
  }

  if (!isAuthorized) {
    return (
      <View style={styles.unauthorizedBlock} testID="media-unauthorized-gate">
        <Text style={styles.unauthorizedTitle}>Access Restricted</Text>
        <Text style={styles.unauthorizedBody}>
          Media Library operations require server-authorized Newsroom staff credentials with the
          `media.manage` capability.
        </Text>
      </View>
    );
  }

  return (
    <StudioMediaLibraryView
      assets={assets}
      loading={mediaAsync.loading}
      error={mediaAsync.error ? mediaAsync.error.message : null}
      selectedAssetId={selectedAssetId}
      onSelectAsset={(asset) => {
        setSelectedAssetId(asset ? asset.id : null);
        setSaveError(null);
        setSaveSuccess(false);
      }}
      onSearch={(q) => setSearchQuery(q)}
      onRefresh={() => setRefreshKey((k) => k + 1)}
      onSaveMetadata={handleSaveMetadata}
      savingId={savingId}
      saveError={saveError}
      saveSuccess={saveSuccess}
      searchQuery={searchQuery}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paperMuted
  },
  previewNoticeBanner: {
    backgroundColor: colors.navy,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: "center"
  },
  previewNoticeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.md
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.ink
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 2
  },
  headerBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  countBadge: {
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink
  },
  scopeBadge: {
    backgroundColor: colors.blue + "15",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  scopeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.blue
  },
  controlsBar: {
    gap: spacing.sm
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.ink
  },
  searchButton: {
    backgroundColor: colors.navy,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 9
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700"
  },
  clearButton: {
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9
  },
  clearButtonText: {
    fontSize: 13,
    color: colors.inkMuted,
    fontWeight: "600"
  },
  refreshButton: {
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9
  },
  refreshButtonText: {
    fontSize: 13,
    color: colors.ink,
    fontWeight: "600"
  },
  filterScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.xs
  },
  filterGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  filterGroupLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkMuted,
    marginRight: 2
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border
  },
  filterChipActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink
  },
  filterChipTextActive: {
    color: "#FFFFFF"
  },
  mainWorkspace: {
    flex: 1,
    flexDirection: "column"
  },
  mainWorkspaceDesktop: {
    flexDirection: "row"
  },
  inventoryColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.paperMuted
  },
  gridContainer: {
    padding: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  gridCard: {
    width: 220,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden"
  },
  gridCardSelected: {
    borderColor: colors.blue,
    borderWidth: 2
  },
  gridThumbnailBox: {
    height: 130,
    backgroundColor: colors.paperMuted,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  gridThumbnailImage: {
    width: "100%",
    height: "100%"
  },
  iconPlaceholder: {
    alignItems: "center",
    justifyContent: "center"
  },
  iconPlaceholderText: {
    fontSize: 32
  },
  iconPlaceholderMime: {
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 4,
    fontWeight: "600"
  },
  gridCardBody: {
    padding: spacing.sm
  },
  gridFilename: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 4
  },
  gridBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6
  },
  mimeBadge: {
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1
  },
  mimeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.inkMuted
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1
  },
  statusPublished: {
    backgroundColor: colors.success + "20"
  },
  statusPending: {
    backgroundColor: colors.warning + "20"
  },
  statusMissing: {
    backgroundColor: colors.live + "20"
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink
  },
  gridMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  gridMetaText: {
    fontSize: 11,
    color: colors.inkMuted
  },
  gridUsageText: {
    fontSize: 11,
    color: colors.blue,
    fontWeight: "600"
  },
  listContainer: {
    padding: spacing.md,
    gap: spacing.xs
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.md
  },
  listRowSelected: {
    borderColor: colors.blue,
    backgroundColor: colors.blue + "08"
  },
  listIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.paperMuted,
    justifyContent: "center",
    alignItems: "center"
  },
  listIcon: {
    fontSize: 18
  },
  listDetails: {
    flex: 1
  },
  listFilename: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink
  },
  listMeta: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2
  },
  listUsageBox: {
    paddingHorizontal: spacing.sm
  },
  listUsageText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.blue
  },
  inspectorColumn: {
    width: 380,
    backgroundColor: "#FFFFFF"
  },
  inspectorScroll: {
    padding: spacing.lg,
    gap: spacing.lg
  },
  inspectorHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm
  },
  inspectorTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink
  },
  inspectorAssetId: {
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2
  },
  inspectorSection: {
    gap: spacing.sm
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  previewImageBox: {
    backgroundColor: colors.paperMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: "center"
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: radius.sm
  },
  warningBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.warning + "15",
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.sm,
    padding: spacing.sm,
    width: "100%"
  },
  warningText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: "700"
  },
  previewUnavailableBox: {
    backgroundColor: colors.paperMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center"
  },
  previewUnavailableIcon: {
    fontSize: 24,
    marginBottom: spacing.xs
  },
  previewUnavailableText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center"
  },
  previewUnavailableSubtext: {
    fontSize: 11,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: 4
  },
  metaGrid: {
    backgroundColor: colors.paperMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 6
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  metaKey: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.inkMuted
  },
  metaVal: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink,
    maxWidth: 200
  },
  copyrightNoticeBox: {
    backgroundColor: "#F8F9FA",
    borderLeftWidth: 3,
    borderLeftColor: colors.inkMuted,
    padding: spacing.sm,
    borderRadius: radius.sm
  },
  copyrightNoticeTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.inkMuted,
    textTransform: "uppercase"
  },
  copyrightNoticeText: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2
  },
  editorNote: {
    fontSize: 12,
    color: colors.inkMuted
  },
  formGroup: {
    gap: 4
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink
  },
  fieldHelp: {
    fontSize: 11,
    color: colors.inkMuted
  },
  textInput: {
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.ink
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: "top"
  },
  errorAlert: {
    backgroundColor: colors.live + "15",
    borderWidth: 1,
    borderColor: colors.live,
    borderRadius: radius.sm,
    padding: spacing.sm
  },
  errorAlertText: {
    fontSize: 12,
    color: colors.live,
    fontWeight: "600"
  },
  successAlert: {
    backgroundColor: colors.success + "15",
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.sm,
    padding: spacing.sm
  },
  successAlertText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: "700"
  },
  saveButton: {
    backgroundColor: colors.navy,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: "center"
  },
  saveButtonDisabled: {
    opacity: 0.6
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },
  usageList: {
    gap: spacing.sm
  },
  usageCard: {
    backgroundColor: colors.paperMuted,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 4
  },
  usageCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  usageTypeBadge: {
    backgroundColor: colors.navy,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1
  },
  usageTypeBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  usageContextText: {
    fontSize: 11,
    color: colors.inkMuted
  },
  usageStoryId: {
    fontSize: 11,
    color: colors.ink
  },
  storyWorkspaceLink: {
    marginTop: 2
  },
  storyWorkspaceLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.blue
  },
  noUsageText: {
    fontSize: 12,
    color: colors.inkMuted,
    fontStyle: "italic"
  },
  emptyInspector: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl
  },
  emptyInspectorText: {
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center",
    lineHeight: 20
  },
  centerBlock: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl
  },
  statusNoticeText: {
    fontSize: 14,
    color: colors.inkMuted,
    fontWeight: "600"
  },
  errorBlock: {
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.live
  },
  errorMessage: {
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center"
  },
  retryButton: {
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.sm
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700"
  },
  emptyBlock: {
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.xs
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink
  },
  emptyText: {
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center"
  },
  unauthorizedBlock: {
    padding: spacing.xl,
    margin: spacing.lg,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm
  },
  unauthorizedTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.live
  },
  unauthorizedBody: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkMuted
  }
});
