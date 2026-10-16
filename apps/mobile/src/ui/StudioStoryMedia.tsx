import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import { services } from "../services";
import { newsroomStorageService, computeSha256Hex } from "../services/newsroom-storage";
import { useAsync } from "../hooks/useAsync";
import { hasServerCapability, type HealthTimesCapability } from "../security/capabilities";
import {
  ALLOWED_STORY_MEDIA_MIME_TYPES,
  MAX_STORY_MEDIA_BYTES,
  buildCanonicalPublicStorageKey,
  classifyMediaMimeType,
  deriveStorageCustodyCategory,
  isMediaAssetAttachable,
  isValidSha256Checksum,
  validateStoryMediaUpload,
  type NewsroomMediaAsset,
  type PrepareStoryMediaPayload,
  type StoryMediaOperationState,
  type StoryMediaPromotionItem,
  type StoryMediaSelectedFile,
  type StoryMediaStageResult,
  type StoryMediaUsageType
} from "../domain/models";
import { pickStoryMediaFile } from "../services/file-picker";
import { colors, radius, spacing } from "../theme/tokens";
import { formatByteSize, formatMediaUsageSourceContext } from "./StudioMediaLibrary";

// =========================================================================
// PRESENTATION CONTRACT FOR SHARED VIEW
// =========================================================================

export type UploadReconciliationState = {
  stage: "upload_failed" | "finalize_failed";
  mediaId: string;
  storyId: string;
  usageType: StoryMediaUsageType;
  storageBucket: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
  checksum: string;
  errorMessage: string;
};

export interface AttachedMediaItem {
  mediaId: string;
  usageType: StoryMediaUsageType;
  filename: string;
  mimeType: string;
  byteSize: number | null;
  status: string;
  publicUrl: string | null;
  altText: string | null;
  caption: string | null;
  credit: string | null;
  sourceProvenance: string | null;
  storageBucket: string | null;
  storageKey: string | null;
  checksum: string | null;
}

export interface StudioStoryMediaPanelViewProps {
  storyId: string;
  storyTitle: string;
  storyWorkflowStatus: string;
  storyAccessPolicy: "public" | "premium";
  featuredMedia: AttachedMediaItem | null;
  inlineMedia: AttachedMediaItem[];
  supportingDocuments: AttachedMediaItem[];
  promotionPlan: StoryMediaPromotionItem[];
  loadingPlan: boolean;
  canManageMedia: boolean;
  canEditStory: boolean;
  canPublish: boolean;
  isReadOnly?: boolean;
  // Actions
  onUploadMedia?: (
    payload: PrepareStoryMediaPayload,
    fileBytes: Uint8Array | ArrayBuffer | Blob
  ) => Promise<void>;
  onAttachExisting?: (mediaId: string, usageType: StoryMediaUsageType) => Promise<void>;
  onDetachMedia?: (mediaId: string, usageType: StoryMediaUsageType) => Promise<void>;
  onStagePromotion?: (item: StoryMediaPromotionItem) => Promise<void>;
  onClearStagedPromotion?: (item: StoryMediaPromotionItem) => Promise<void>;
  onOpenInMediaLibrary?: (mediaId: string) => void;
  // File selection adapter
  onPickFile?: () => Promise<StoryMediaSelectedFile | null>;
  // Reconciliation retry handlers
  reconciliationState?: UploadReconciliationState | null;
  onRetryUpload?: () => Promise<void>;
  onRetryFinalize?: () => Promise<void>;
  // Available existing assets for picker
  existingAssets?: NewsroomMediaAsset[];
  loadingExistingAssets?: boolean;
  onRefreshExistingAssets?: () => void;
}

export function StudioStoryMediaPanelView({
  storyId,
  storyTitle,
  storyWorkflowStatus,
  storyAccessPolicy,
  featuredMedia,
  inlineMedia,
  supportingDocuments,
  promotionPlan,
  loadingPlan,
  canManageMedia,
  canEditStory,
  canPublish,
  isReadOnly = false,
  onUploadMedia,
  onAttachExisting,
  onDetachMedia,
  onStagePromotion,
  onClearStagedPromotion,
  onOpenInMediaLibrary,
  onPickFile,
  reconciliationState,
  onRetryUpload,
  onRetryFinalize,
  existingAssets = [],
  loadingExistingAssets = false,
  onRefreshExistingAssets
}: StudioStoryMediaPanelViewProps) {
  // Modal / dialog states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [pickerUsageType, setPickerUsageType] = useState<StoryMediaUsageType>("featured");
  const [confirmReplaceFeatured, setConfirmReplaceFeatured] = useState<NewsroomMediaAsset | null>(null);
  const [pendingUploadPayload, setPendingUploadPayload] = useState<{
    payload: PrepareStoryMediaPayload;
    bytes: Uint8Array;
  } | null>(null);
  const [confirmDetachItem, setConfirmDetachItem] = useState<{
    mediaId: string;
    usageType: StoryMediaUsageType;
    filename: string;
  } | null>(null);

  // Selected real file state
  const [selectedFile, setSelectedFile] = useState<StoryMediaSelectedFile | null>(null);
  const [calculatingHash, setCalculatingHash] = useState(false);
  const [computedChecksum, setComputedChecksum] = useState<string | null>(null);

  // Upload Form fields
  const [uploadUsageType, setUploadUsageType] = useState<StoryMediaUsageType>("featured");
  const [uploadAltText, setUploadAltText] = useState("");
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadCredit, setUploadCredit] = useState("");
  const [uploadSourceProvenance, setUploadSourceProvenance] = useState("");

  // Async operation state
  const [opState, setOpState] = useState<StoryMediaOperationState>("idle");
  const [opError, setOpError] = useState<string | null>(null);
  const [opSuccessMessage, setOpSuccessMessage] = useState<string | null>(null);
  const [activePromotingMediaId, setActivePromotingMediaId] = useState<string | null>(null);

  // Check publication blockers
  const isPublicationState =
    storyWorkflowStatus === "Ready" ||
    storyWorkflowStatus === "Scheduled" ||
    storyWorkflowStatus === "Published" ||
    storyWorkflowStatus === "Updated / Corrected";

  const hasUnstagedReaderMedia = useMemo(() => {
    return promotionPlan.some(
      (item) => item.mediaStatus !== "public_staged" && item.mediaStatus !== "published"
    );
  }, [promotionPlan]);

  const publicationBlocker = isPublicationState && hasUnstagedReaderMedia;

  const handlePickFile = async () => {
    if (!onPickFile) return;
    setOpError(null);
    try {
      const file = await onPickFile();
      if (!file) return;
      setSelectedFile(file);
      setCalculatingHash(true);
      const hash = await computeSha256Hex(file.bytes);
      setComputedChecksum(hash);
      setCalculatingHash(false);

      if (!file.mimeType.startsWith("image/") && uploadUsageType !== "supporting_document") {
        setUploadUsageType("supporting_document");
      }
    } catch (err) {
      setCalculatingHash(false);
      setOpError(err instanceof Error ? err.message : "Failed to select file.");
    }
  };

  // Handle Upload Submission
  const handleExecuteUpload = async () => {
    setOpError(null);
    setOpSuccessMessage(null);

    if (!selectedFile) {
      setOpError("Please select a file to upload.");
      return;
    }

    const checksum = computedChecksum || (await computeSha256Hex(selectedFile.bytes));

    const payload: PrepareStoryMediaPayload = {
      filename: selectedFile.filename,
      mimeType: selectedFile.mimeType,
      byteSize: selectedFile.byteSize,
      checksum,
      altText: selectedFile.mimeType.startsWith("image/") ? uploadAltText.trim() : null,
      caption: uploadCaption.trim() || null,
      credit: uploadCredit.trim() || null,
      sourceProvenance: uploadSourceProvenance.trim(),
      usageType: uploadUsageType
    };

    const validation = validateStoryMediaUpload(payload);
    if (!validation.valid) {
      setOpError(validation.error || "Upload validation failed.");
      return;
    }

    if (uploadUsageType === "featured" && featuredMedia) {
      setPendingUploadPayload({ payload, bytes: selectedFile.bytes });
      return;
    }

    try {
      setOpState("uploading");
      if (onUploadMedia) {
        await onUploadMedia(payload, selectedFile.bytes);
      }
      setOpState("success");
      setOpSuccessMessage(`Successfully uploaded and finalized ${payload.filename} as private_ready.`);
      setShowUploadModal(false);
      resetUploadForm();
    } catch (err) {
      setOpState("error");
      setOpError(err instanceof Error ? err.message : "Media upload failed.");
    }
  };

  const handleConfirmReplaceFeaturedUpload = async () => {
    if (!pendingUploadPayload) return;
    try {
      setOpState("uploading");
      if (onUploadMedia) {
        await onUploadMedia(pendingUploadPayload.payload, pendingUploadPayload.bytes);
      }
      setOpState("success");
      setOpSuccessMessage(
        `Successfully uploaded and replaced featured media with ${pendingUploadPayload.payload.filename}.`
      );
      setPendingUploadPayload(null);
      setShowUploadModal(false);
      resetUploadForm();
    } catch (err) {
      setOpState("error");
      setOpError(err instanceof Error ? err.message : "Media upload failed.");
      setPendingUploadPayload(null);
    }
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setComputedChecksum(null);
    setUploadAltText("");
    setUploadCaption("");
    setUploadCredit("");
    setUploadSourceProvenance("");
  };

  // Handle Existing Media Attachment
  const handleSelectExistingAsset = async (asset: NewsroomMediaAsset) => {
    if (pickerUsageType === "featured" && featuredMedia && featuredMedia.mediaId !== asset.id) {
      setConfirmReplaceFeatured(asset);
      return;
    }

    try {
      setOpState("preparing");
      if (onAttachExisting) {
        await onAttachExisting(asset.id, pickerUsageType);
      }
      setOpState("success");
      setOpSuccessMessage(`Attached ${asset.filename} to story as ${pickerUsageType}.`);
      setShowPickerModal(false);
    } catch (err) {
      setOpState("error");
      setOpError(err instanceof Error ? err.message : "Failed to attach media asset.");
    }
  };

  const handleConfirmReplaceFeaturedExisting = async () => {
    if (!confirmReplaceFeatured) return;
    try {
      setOpState("preparing");
      if (onAttachExisting) {
        await onAttachExisting(confirmReplaceFeatured.id, "featured");
      }
      setOpState("success");
      setOpSuccessMessage(
        `Replaced featured media with ${confirmReplaceFeatured.filename}.`
      );
      setConfirmReplaceFeatured(null);
      setShowPickerModal(false);
    } catch (err) {
      setOpState("error");
      setOpError(err instanceof Error ? err.message : "Failed to replace featured media.");
      setConfirmReplaceFeatured(null);
    }
  };

  // Handle Detach
  const handleExecuteDetach = async () => {
    if (!confirmDetachItem) return;
    try {
      setOpState("clearing");
      if (onDetachMedia) {
        await onDetachMedia(confirmDetachItem.mediaId, confirmDetachItem.usageType);
      }
      setOpState("success");
      setOpSuccessMessage(
        `Detached ${confirmDetachItem.filename} (${confirmDetachItem.usageType}) from story.`
      );
      setConfirmDetachItem(null);
    } catch (err) {
      setOpState("error");
      setOpError(err instanceof Error ? err.message : "Failed to detach media.");
      setConfirmDetachItem(null);
    }
  };

  // Handle Promotion Staging
  const handleStagePromotion = async (item: StoryMediaPromotionItem) => {
    setActivePromotingMediaId(item.mediaId);
    setOpError(null);
    setOpSuccessMessage(null);
    try {
      setOpState("staging");
      if (onStagePromotion) {
        await onStagePromotion(item);
      }
      setOpState("success");
      setOpSuccessMessage(`Staged ${item.filename} to public promotion (PUBLIC STAGED).`);
    } catch (err) {
      setOpState("error");
      setOpError(err instanceof Error ? err.message : "Failed to stage public media promotion.");
    } finally {
      setActivePromotingMediaId(null);
    }
  };

  // Handle Clear Staged Promotion
  const handleClearStagedPromotion = async (item: StoryMediaPromotionItem) => {
    setActivePromotingMediaId(item.mediaId);
    setOpError(null);
    setOpSuccessMessage(null);
    try {
      setOpState("clearing");
      if (onClearStagedPromotion) {
        await onClearStagedPromotion(item);
      }
      setOpState("success");
      setOpSuccessMessage(`Cleared staged public promotion for ${item.filename} (reverted to private_ready).`);
    } catch (err) {
      setOpState("error");
      setOpError(err instanceof Error ? err.message : "Failed to clear staged promotion.");
    } finally {
      setActivePromotingMediaId(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Media & Attachments</Text>
          <Text style={styles.subtitle}>
            Governed media ingestion, editorial attachment, and public promotion for{" "}
            <Text style={styles.boldText}>{storyTitle || "Untitled Story"}</Text>
          </Text>
        </View>
        <View style={styles.headerBadges}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{storyWorkflowStatus}</Text>
          </View>
          <View
            style={[
              styles.policyBadge,
              storyAccessPolicy === "premium" ? styles.policyBadgePremium : styles.policyBadgePublic
            ]}
          >
            <Text style={styles.policyBadgeText}>{storyAccessPolicy.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* Operation Feedback */}
      {opError ? (
        <View style={styles.errorBanner} accessibilityRole="alert">
          <Text style={styles.errorBannerTitle}>Operation Error</Text>
          <Text style={styles.errorBannerText}>{opError}</Text>
          <Pressable style={styles.dismissErrorBtn} onPress={() => setOpError(null)}>
            <Text style={styles.dismissErrorText}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      {opSuccessMessage ? (
        <View style={styles.successBanner} accessibilityRole="alert">
          <Text style={styles.successBannerText}>{opSuccessMessage}</Text>
          <Pressable style={styles.dismissErrorBtn} onPress={() => setOpSuccessMessage(null)}>
            <Text style={styles.dismissSuccessText}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Publication Blocker Banner */}
      {publicationBlocker ? (
        <View style={styles.blockerBanner} accessibilityRole="alert">
          <Text style={styles.blockerBannerTitle}>Publication Blocker</Text>
          <Text style={styles.blockerBannerText}>
            Reader-bound media must be publicly staged before publication.
          </Text>
          <Text style={styles.blockerBannerSubtext}>
            This story is in {storyWorkflowStatus} state. Use the Public Media Staging section below to stage Reader-bound assets into newsroom-public.
          </Text>
        </View>
      ) : null}

      {/* Quick Action Toolbar */}
      {!isReadOnly && canManageMedia && canEditStory ? (
        <View style={styles.toolbar}>
          <Pressable
            style={[styles.primaryBtn, opState === "uploading" && styles.disabledBtn]}
            onPress={() => {
              resetUploadForm();
              setUploadUsageType("featured");
              setShowUploadModal(true);
            }}
          >
            <Text style={styles.primaryBtnText}>+ Upload New Media</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => {
              setPickerUsageType("featured");
              if (onRefreshExistingAssets) onRefreshExistingAssets();
              setShowPickerModal(true);
            }}
          >
            <Text style={styles.secondaryBtnText}>Choose from Media Library</Text>
          </Pressable>
        </View>
      ) : null}

      {/* SECTION 1: FEATURED MEDIA */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Featured Media</Text>
            <Text style={styles.sectionSubtitle}>Primary presentation lead asset (max 1)</Text>
          </View>
          {featuredMedia && !isReadOnly && canManageMedia && canEditStory ? (
            <View style={styles.itemActions}>
              <Pressable
                style={styles.actionBtnSmall}
                onPress={() => {
                  setPickerUsageType("featured");
                  if (onRefreshExistingAssets) onRefreshExistingAssets();
                  setShowPickerModal(true);
                }}
              >
                <Text style={styles.actionBtnSmallText}>Replace</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtnSmall, styles.actionBtnDanger]}
                onPress={() =>
                  setConfirmDetachItem({
                    mediaId: featuredMedia.mediaId,
                    usageType: "featured",
                    filename: featuredMedia.filename
                  })
                }
              >
                <Text style={styles.actionBtnDangerText}>Detach</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {featuredMedia ? (
          <View style={styles.mediaCard}>
            {featuredMedia.publicUrl ? (
              <Image source={{ uri: featuredMedia.publicUrl }} style={styles.featuredImagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>
                  Private Custody ({featuredMedia.status})
                </Text>
                <Text style={styles.imagePlaceholderSubtext}>
                  {featuredMedia.storageBucket}/{featuredMedia.storageKey}
                </Text>
              </View>
            )}
            <View style={styles.mediaCardBody}>
              <View style={styles.badgeRow}>
                <View style={styles.featuredUsageBadge}>
                  <Text style={styles.featuredUsageBadgeText}>FEATURED</Text>
                </View>
                <View
                  style={[
                    styles.statusBadgeSmall,
                    featuredMedia.status === "public_staged"
                      ? styles.statusStaged
                      : featuredMedia.status === "published"
                        ? styles.statusPublished
                        : styles.statusPrivate
                  ]}
                >
                  <Text style={styles.statusBadgeSmallText}>
                    {featuredMedia.status === "public_staged" ? "PUBLIC STAGED" : featuredMedia.status.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.formatBadge}>
                  <Text style={styles.formatBadgeText}>{featuredMedia.mimeType}</Text>
                </View>
              </View>
              <Text style={styles.mediaCardTitle} numberOfLines={1}>
                {featuredMedia.filename}
              </Text>
              {featuredMedia.altText ? (
                <Text style={styles.mediaMetaLine}>
                  <Text style={styles.metaLabel}>Alt:</Text> {featuredMedia.altText}
                </Text>
              ) : null}
              {featuredMedia.caption ? (
                <Text style={styles.mediaMetaLine}>
                  <Text style={styles.metaLabel}>Caption:</Text> {featuredMedia.caption}
                </Text>
              ) : null}
              {featuredMedia.credit ? (
                <Text style={styles.mediaMetaLine}>
                  <Text style={styles.metaLabel}>Credit:</Text> {featuredMedia.credit}
                </Text>
              ) : null}
              {featuredMedia.sourceProvenance ? (
                <Text style={styles.mediaMetaLine}>
                  <Text style={styles.metaLabel}>Provenance:</Text> {featuredMedia.sourceProvenance}
                </Text>
              ) : null}
              {featuredMedia.checksum ? (
                <Text style={styles.checksumText} numberOfLines={1}>
                  SHA-256: {featuredMedia.checksum}
                </Text>
              ) : null}
              {onOpenInMediaLibrary ? (
                <Pressable
                  style={styles.linkButton}
                  onPress={() => onOpenInMediaLibrary(featuredMedia.mediaId)}
                >
                  <Text style={styles.linkButtonText}>Open in Media Library →</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>No featured media attached to this story.</Text>
            {!isReadOnly && canManageMedia && canEditStory ? (
              <View style={styles.emptyCardActions}>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => {
                    resetUploadForm();
                    setUploadUsageType("featured");
                    setShowUploadModal(true);
                  }}
                >
                  <Text style={styles.actionBtnText}>+ Upload Featured Image</Text>
                </Pressable>
                <Pressable
                  style={styles.actionBtnSecondary}
                  onPress={() => {
                    setPickerUsageType("featured");
                    if (onRefreshExistingAssets) onRefreshExistingAssets();
                    setShowPickerModal(true);
                  }}
                >
                  <Text style={styles.actionBtnSecondaryText}>Choose Existing</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {/* SECTION 2: INLINE MEDIA */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Inline Media</Text>
            <Text style={styles.sectionSubtitle}>
              Editorial images bound into story body paragraphs ({inlineMedia.length})
            </Text>
          </View>
          {!isReadOnly && canManageMedia && canEditStory ? (
            <Pressable
              style={styles.actionBtnSmall}
              onPress={() => {
                resetUploadForm();
                setUploadUsageType("inline");
                setShowUploadModal(true);
              }}
            >
              <Text style={styles.actionBtnSmallText}>+ Add Inline</Text>
            </Pressable>
          ) : null}
        </View>

        {inlineMedia.length > 0 ? (
          inlineMedia.map((item) => (
            <View key={item.mediaId} style={styles.inlineItemCard}>
              <View style={styles.inlineThumbnail}>
                {item.publicUrl ? (
                  <Image source={{ uri: item.publicUrl }} style={styles.inlineThumbImg} />
                ) : (
                  <View style={styles.inlineThumbPlaceholder}>
                    <Text style={styles.inlineThumbPlaceholderText}>DOC</Text>
                  </View>
                )}
              </View>
              <View style={styles.inlineDetails}>
                <View style={styles.badgeRow}>
                  <View style={styles.inlineUsageBadge}>
                    <Text style={styles.inlineUsageBadgeText}>INLINE</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadgeSmall,
                      item.status === "public_staged"
                        ? styles.statusStaged
                        : item.status === "published"
                          ? styles.statusPublished
                          : styles.statusPrivate
                    ]}
                  >
                    <Text style={styles.statusBadgeSmallText}>
                      {item.status === "public_staged" ? "PUBLIC STAGED" : item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.inlineItemTitle} numberOfLines={1}>
                  {item.filename}
                </Text>
                {item.altText ? (
                  <Text style={styles.inlineItemMeta} numberOfLines={1}>
                    <Text style={styles.metaLabel}>Alt:</Text> {item.altText}
                  </Text>
                ) : null}
              </View>
              {!isReadOnly && canManageMedia && canEditStory ? (
                <Pressable
                  style={[styles.actionBtnSmall, styles.actionBtnDanger]}
                  onPress={() =>
                    setConfirmDetachItem({
                      mediaId: item.mediaId,
                      usageType: "inline",
                      filename: item.filename
                    })
                  }
                >
                  <Text style={styles.actionBtnDangerText}>Detach</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>No inline media attached to this story.</Text>
          </View>
        )}
      </View>

      {/* SECTION 3: SUPPORTING DOCUMENTS */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Supporting Documents</Text>
            <Text style={styles.sectionSubtitle}>
              Private reference documents, bulletins, and briefs ({supportingDocuments.length})
            </Text>
          </View>
          {!isReadOnly && canManageMedia && canEditStory ? (
            <Pressable
              style={styles.actionBtnSmall}
              onPress={() => {
                resetUploadForm();
                setUploadUsageType("supporting_document");
                setShowUploadModal(true);
              }}
            >
              <Text style={styles.actionBtnSmallText}>+ Add Document</Text>
            </Pressable>
          ) : null}
        </View>

        {supportingDocuments.length > 0 ? (
          supportingDocuments.map((item) => (
            <View key={item.mediaId} style={styles.docItemCard}>
              <View style={styles.docIconBox}>
                <Text style={styles.docIconText}>PDF</Text>
              </View>
              <View style={styles.docDetails}>
                <View style={styles.badgeRow}>
                  <View style={styles.docUsageBadge}>
                    <Text style={styles.docUsageBadgeText}>SUPPORTING DOCUMENT</Text>
                  </View>
                  <View style={styles.docPrivateBadge}>
                    <Text style={styles.docPrivateBadgeText}>PRIVATE ONLY</Text>
                  </View>
                </View>
                <Text style={styles.docItemTitle} numberOfLines={1}>
                  {item.filename}
                </Text>
                <Text style={styles.docItemMeta}>
                  {formatByteSize(item.byteSize)} • {item.storageBucket}/{item.storageKey}
                </Text>
              </View>
              {!isReadOnly && canManageMedia && canEditStory ? (
                <Pressable
                  style={[styles.actionBtnSmall, styles.actionBtnDanger]}
                  onPress={() =>
                    setConfirmDetachItem({
                      mediaId: item.mediaId,
                      usageType: "supporting_document",
                      filename: item.filename
                    })
                  }
                >
                  <Text style={styles.actionBtnDangerText}>Detach</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>No supporting documents attached.</Text>
          </View>
        )}
      </View>

      {/* SECTION 4: PUBLIC PROMOTION STAGING */}
      {canPublish ? (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Public Media Staging</Text>
              <Text style={styles.sectionSubtitle}>
                Governed promotion of Reader-bound private assets into newsroom-public
              </Text>
            </View>
            <View style={styles.badgeRow}>
              <View style={styles.authorityBadge}>
                <Text style={styles.authorityBadgeText}>story.publish required</Text>
              </View>
            </View>
          </View>

          {loadingPlan ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.blue} />
              <Text style={styles.loadingText}>Retrieving canonical promotion plan…</Text>
            </View>
          ) : promotionPlan.length > 0 ? (
            <View style={styles.planList}>
              {promotionPlan.map((item) => {
                const isStaged = item.mediaStatus === "public_staged";
                const isPublished = item.mediaStatus === "published";
                const isReady = item.mediaStatus === "private_ready";
                const isPromoting = activePromotingMediaId === item.mediaId;

                return (
                  <View key={item.mediaId} style={styles.planCard}>
                    <View style={styles.planCardHeader}>
                      <View style={styles.badgeRow}>
                        <View style={styles.planUsageBadge}>
                          <Text style={styles.planUsageBadgeText}>{item.usageType.toUpperCase()}</Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadgeSmall,
                            isStaged
                              ? styles.statusStaged
                              : isPublished
                                ? styles.statusPublished
                                : styles.statusPrivate
                          ]}
                        >
                          <Text style={styles.statusBadgeSmallText}>
                            {isStaged ? "PUBLIC STAGED" : item.mediaStatus.toUpperCase()}
                          </Text>
                        </View>
                        {item.checksum ? (
                          <View style={styles.checksumBadge}>
                            <Text style={styles.checksumBadgeText}>CHECKSUM VERIFIED</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Promotion Actions */}
                      {!isReadOnly ? (
                        <View style={styles.planActions}>
                          {isReady ? (
                            <Pressable
                              style={[styles.primaryBtnSmall, isPromoting && styles.disabledBtn]}
                              disabled={isPromoting}
                              onPress={() => handleStagePromotion(item)}
                            >
                              {isPromoting ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Text style={styles.primaryBtnSmallText}>Stage Public Promotion</Text>
                              )}
                            </Pressable>
                          ) : null}

                          {isStaged && !isPublished && storyWorkflowStatus !== "Published" ? (
                            <Pressable
                              style={[styles.secondaryBtnSmall, isPromoting && styles.disabledBtn]}
                              disabled={isPromoting}
                              onPress={() => handleClearStagedPromotion(item)}
                            >
                              {isPromoting ? (
                                <ActivityIndicator size="small" color={colors.ink} />
                              ) : (
                                <Text style={styles.secondaryBtnSmallText}>Clear Staged Promotion</Text>
                              )}
                            </Pressable>
                          ) : null}

                          {isPublished ? (
                            <View style={styles.publishedNote}>
                              <Text style={styles.publishedNoteText}>Final Published Asset</Text>
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.planItemTitle}>{item.filename}</Text>
                    <Text style={styles.planItemPath}>
                      Private: {item.privateBucket}/{item.privateKey}
                    </Text>
                    {item.publicStorageKey ? (
                      <Text style={styles.planItemPublicPath}>
                        Public: newsroom-public/{item.publicStorageKey}
                      </Text>
                    ) : null}
                    {item.checksum ? (
                      <Text style={styles.checksumHash} numberOfLines={1}>
                        SHA-256: {item.checksum}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>
                No Reader-bound media items found for this story.
              </Text>
              <Text style={styles.emptyCardSubtext}>
                Only featured images and bound inline public images are promotable by server policy. Supporting documents remain private.
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {/* MODAL 1: UPLOAD NEW MEDIA */}
      {showUploadModal ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload New Story Media</Text>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setShowUploadModal(false)}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody}>
              {reconciliationState ? (
                <View
                  style={styles.reconciliationAlert}
                  testID={
                    reconciliationState.stage === "upload_failed"
                      ? "upload-pending-retry-banner"
                      : "upload-finalization-unconfirmed-banner"
                  }
                >
                  <Text style={styles.reconciliationAlertTitle}>
                    {reconciliationState.stage === "upload_failed"
                      ? "UPLOAD PENDING — RETRY AVAILABLE"
                      : "PRIVATE OBJECT UPLOADED — FINALIZATION NOT CONFIRMED"}
                  </Text>
                  <Text style={styles.reconciliationAlertText}>
                    {reconciliationState.errorMessage}
                  </Text>
                  <Text style={styles.reconciliationAlertSub}>
                    Asset: {reconciliationState.filename} ({reconciliationState.mediaId})
                  </Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Usage Role *</Text>
              <View style={styles.radioGroup}>
                {(["featured", "inline", "supporting_document"] as StoryMediaUsageType[]).map((role) => (
                  <Pressable
                    key={role}
                    style={[
                      styles.radioBtn,
                      uploadUsageType === role && styles.radioBtnActive
                    ]}
                    onPress={() => setUploadUsageType(role)}
                  >
                    <Text
                      style={[
                        styles.radioBtnText,
                        uploadUsageType === role && styles.radioBtnTextActive
                      ]}
                    >
                      {role.replace("_", " ").toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Real File Selection */}
              <Text style={styles.inputLabel}>File Selection *</Text>
              <View style={styles.filePickerBox}>
                <Pressable
                  style={styles.pickerBtn}
                  onPress={handlePickFile}
                  accessibilityRole="button"
                  accessibilityLabel="Select File"
                  testID="media-select-file-button"
                >
                  <Text style={styles.pickerBtnText}>📂 Select File…</Text>
                </Pressable>
                {selectedFile ? (
                  <View style={styles.selectedFileInfo} testID="selected-file-info">
                    <Text style={styles.selectedFileName}>📄 {selectedFile.filename}</Text>
                    <Text style={styles.selectedFileMeta}>
                      MIME: {selectedFile.mimeType} • Size: {formatByteSize(selectedFile.byteSize)}
                    </Text>
                    {calculatingHash ? (
                      <Text style={styles.selectedFileChecksum}>Computing SHA-256…</Text>
                    ) : computedChecksum ? (
                      <Text style={styles.selectedFileChecksum} numberOfLines={1}>
                        SHA-256: {computedChecksum}
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.noFileSelectedText}>No file selected. Please choose a local asset.</Text>
                )}
              </View>

              {selectedFile && selectedFile.mimeType.startsWith("image/") ? (
                <>
                  <Text style={styles.inputLabel}>Image Alt Text * (accessibility)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={uploadAltText}
                    onChangeText={setUploadAltText}
                    placeholder="Descriptive text for visually impaired readers (min 2 chars)"
                    placeholderTextColor={colors.inkMuted}
                    testID="upload-alt-text-input"
                  />
                </>
              ) : null}

              <Text style={styles.inputLabel}>Caption</Text>
              <TextInput
                style={styles.textInput}
                value={uploadCaption}
                onChangeText={setUploadCaption}
                placeholder="Editorial context or story reference"
                placeholderTextColor={colors.inkMuted}
                testID="upload-caption-input"
              />

              <Text style={styles.inputLabel}>Credit</Text>
              <TextInput
                style={styles.textInput}
                value={uploadCredit}
                onChangeText={setUploadCredit}
                placeholder="Photographer, agency, or author attribution"
                placeholderTextColor={colors.inkMuted}
                testID="upload-credit-input"
              />

              <Text style={styles.inputLabel}>Source / Provenance * (mandatory)</Text>
              <TextInput
                style={styles.textInput}
                value={uploadSourceProvenance}
                onChangeText={setUploadSourceProvenance}
                placeholder="e.g. editorial/harare-central-catchment/2026-10"
                placeholderTextColor={colors.inkMuted}
                testID="upload-provenance-input"
              />
            </ScrollView>
            <View style={styles.modalFooter}>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => setShowUploadModal(false)}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>

              {reconciliationState?.stage === "upload_failed" ? (
                <Pressable
                  style={[styles.primaryBtn, opState === "uploading" && styles.disabledBtn]}
                  onPress={async () => {
                    if (onRetryUpload) {
                      setOpState("uploading");
                      try {
                        await onRetryUpload();
                        setOpState("success");
                        setShowUploadModal(false);
                        resetUploadForm();
                      } catch (err) {
                        setOpState("error");
                        setOpError(err instanceof Error ? err.message : "Retry upload failed.");
                      }
                    }
                  }}
                  disabled={opState === "uploading"}
                  testID="media-retry-upload-button"
                >
                  <Text style={styles.primaryBtnText}>
                    {opState === "uploading" ? "Retrying Upload…" : "Retry Upload"}
                  </Text>
                </Pressable>
              ) : reconciliationState?.stage === "finalize_failed" ? (
                <Pressable
                  style={[styles.primaryBtn, opState === "uploading" && styles.disabledBtn]}
                  onPress={async () => {
                    if (onRetryFinalize) {
                      setOpState("uploading");
                      try {
                        await onRetryFinalize();
                        setOpState("success");
                        setShowUploadModal(false);
                        resetUploadForm();
                      } catch (err) {
                        setOpState("error");
                        setOpError(err instanceof Error ? err.message : "Retry finalize failed.");
                      }
                    }
                  }}
                  disabled={opState === "uploading"}
                  testID="media-retry-finalize-button"
                >
                  <Text style={styles.primaryBtnText}>
                    {opState === "uploading" ? "Retrying Finalize…" : "Retry Finalize"}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[
                    styles.primaryBtn,
                    (!selectedFile || opState === "uploading") && styles.disabledBtn
                  ]}
                  disabled={!selectedFile || opState === "uploading"}
                  onPress={handleExecuteUpload}
                  testID="media-upload-submit-button"
                >
                  {opState === "uploading" ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Execute Private Upload</Text>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        </View>
      ) : null}

      {/* MODAL 2: EXISTING MEDIA PICKER */}
      {showPickerModal ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialogLarge}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Choose from Media Library ({pickerUsageType.toUpperCase()})
              </Text>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setShowPickerModal(false)}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody}>
              {loadingExistingAssets ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={colors.blue} />
                  <Text style={styles.loadingText}>Loading library media assets…</Text>
                </View>
              ) : existingAssets.filter((a) => isMediaAssetAttachable(a, pickerUsageType).eligible).length > 0 ? (
                existingAssets
                  .filter((a) => isMediaAssetAttachable(a, pickerUsageType).eligible)
                  .map((asset) => (
                    <View key={asset.id} style={styles.pickerRow}>
                      <View style={styles.pickerDetails}>
                        <Text style={styles.pickerFilename}>{asset.filename}</Text>
                        <Text style={styles.pickerMeta}>
                          {asset.mimeType} • {formatByteSize(asset.byteSize)} • Status: {asset.status}
                        </Text>
                        {asset.altText ? (
                          <Text style={styles.pickerAlt}>Alt: {asset.altText}</Text>
                        ) : null}
                      </View>
                      <Pressable
                        style={styles.pickerSelectBtn}
                        onPress={() => handleSelectExistingAsset(asset)}
                      >
                        <Text style={styles.pickerSelectBtnText}>Attach</Text>
                      </Pressable>
                    </View>
                  ))
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyCardText}>No compatible media assets found in library.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      ) : null}

      {/* DIALOG 3: FEATURED REPLACEMENT CONFIRMATION */}
      {confirmReplaceFeatured ? (
        <View style={styles.modalOverlay}>
          <View style={styles.confirmDialog}>
            <Text style={styles.confirmTitle}>Replace current featured media?</Text>
            <Text style={styles.confirmBody}>
              This story already has a featured asset (
              <Text style={styles.boldText}>{featuredMedia?.filename}</Text>). Attaching{" "}
              <Text style={styles.boldText}>{confirmReplaceFeatured.filename}</Text> will replace it.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => setConfirmReplaceFeatured(null)}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.dangerBtn}
                onPress={handleConfirmReplaceFeaturedExisting}
              >
                <Text style={styles.dangerBtnText}>Replace Featured Media</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {/* DIALOG 4: PENDING UPLOAD FEATURED REPLACEMENT CONFIRMATION */}
      {pendingUploadPayload ? (
        <View style={styles.modalOverlay}>
          <View style={styles.confirmDialog}>
            <Text style={styles.confirmTitle}>Replace current featured media?</Text>
            <Text style={styles.confirmBody}>
              This story already has a featured asset (
              <Text style={styles.boldText}>{featuredMedia?.filename}</Text>). Uploading{" "}
              <Text style={styles.boldText}>{pendingUploadPayload.payload.filename}</Text> will replace it as the story&apos;s lead image.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => setPendingUploadPayload(null)}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.dangerBtn}
                onPress={handleConfirmReplaceFeaturedUpload}
              >
                <Text style={styles.dangerBtnText}>Confirm & Upload</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {/* DIALOG 5: DETACH CONFIRMATION */}
      {confirmDetachItem ? (
        <View style={styles.modalOverlay}>
          <View style={styles.confirmDialog}>
            <Text style={styles.confirmTitle}>
              Detach {confirmDetachItem.usageType.toUpperCase()} Media?
            </Text>
            <Text style={styles.confirmBody}>
              Are you sure you want to detach{" "}
              <Text style={styles.boldText}>{confirmDetachItem.filename}</Text> from this story?
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => setConfirmDetachItem(null)}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.dangerBtn}
                onPress={handleExecuteDetach}
              >
                <Text style={styles.dangerBtnText}>Confirm Detach</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

// =========================================================================
// OPERATIONAL CONTAINER
// =========================================================================

export interface StudioStoryMediaPanelProps {
  storyId: string;
  storyTitle?: string;
  title?: string;
  storyWorkflowStatus?: string;
  workflowStatus?: string;
  storyAccessPolicy?: "public" | "premium";
  onStoryUpdated?: () => void;
}

export function StudioStoryMediaPanel({
  storyId,
  storyTitle,
  title,
  storyWorkflowStatus,
  workflowStatus,
  storyAccessPolicy = "public",
  onStoryUpdated
}: StudioStoryMediaPanelProps) {
  const effectiveTitle = storyTitle || title || "Story";
  const effectiveWorkflowStatus = storyWorkflowStatus || workflowStatus || "Draft";
  const router = useRouter();

  // 1. Session Authority
  const authAsync = useAsync(() => services.authorization.getSnapshot(), []);
  const auth = authAsync.data;
  const canManageMedia = auth ? hasServerCapability(auth, "media.manage") : false;
  const canEditStory = auth ? hasServerCapability(auth, "story.edit_all") || hasServerCapability(auth, "story.edit_own") : false;
  const canPublish = auth ? hasServerCapability(auth, "story.publish") : false;

  // 2. Load Promotion Plan
  const [promotionPlan, setPromotionPlan] = useState<StoryMediaPromotionItem[]>([]);
  const [loadingPlan, setLoadingPlan] = useState(false);

  const refreshPlan = useCallback(async () => {
    if (!canPublish || !storyId) return;
    setLoadingPlan(true);
    try {
      const plan = await services.newsroomMedia.getPromotionPlan(storyId);
      setPromotionPlan(plan);
    } catch {
      setPromotionPlan([]);
    } finally {
      setLoadingPlan(false);
    }
  }, [canPublish, storyId]);

  useEffect(() => {
    void refreshPlan();
  }, [refreshPlan]);

  // 3. Load Current Story Media Attachments via Canonical Story Media RPC
  const [storyAttachments, setStoryAttachments] = useState<NewsroomMediaAsset[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  const refreshStoryAttachments = useCallback(async () => {
    if (!canManageMedia || !storyId) return;
    setLoadingAttachments(true);
    try {
      const list = await services.newsroomMedia.listStoryMedia(storyId);
      setStoryAttachments(list);
    } catch {
      setStoryAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  }, [canManageMedia, storyId]);

  useEffect(() => {
    void refreshStoryAttachments();
  }, [refreshStoryAttachments]);

  // 4. Load Existing Media Assets for Picker Modal ONLY
  const [mediaAssets, setMediaAssets] = useState<NewsroomMediaAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const refreshAssets = useCallback(async () => {
    if (!canManageMedia) return;
    setLoadingAssets(true);
    try {
      const list = await services.newsroomMedia.listMedia(null, 150);
      setMediaAssets(list);
    } catch {
      setMediaAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  }, [canManageMedia]);

  useEffect(() => {
    void refreshAssets();
  }, [refreshAssets]);

  // 5. Derive Attached Media Items from Story Attachments RPC
  const { featured, inlines, docs } = useMemo(() => {
    let featuredItem: AttachedMediaItem | null = null;
    const inlineItems: AttachedMediaItem[] = [];
    const docItems: AttachedMediaItem[] = [];

    for (const a of storyAttachments) {
      const matchingUsage = a.usage.find((u) => u.storyId === storyId) || a.usage[0];
      if (!matchingUsage) continue;

      const item: AttachedMediaItem = {
        mediaId: a.id,
        usageType: matchingUsage.usageType as StoryMediaUsageType,
        filename: a.filename,
        mimeType: a.mimeType,
        byteSize: a.byteSize,
        status: a.status,
        publicUrl: a.publicUrl,
        altText: a.altText,
        caption: a.caption,
        credit: a.credit,
        sourceProvenance: a.sourceProvenance,
        storageBucket: a.storageBucket,
        storageKey: a.storageKey,
        checksum: a.checksum
      };

      if (matchingUsage.usageType === "featured") {
        featuredItem = item;
      } else if (matchingUsage.usageType === "inline") {
        inlineItems.push(item);
      } else if (matchingUsage.usageType === "supporting_document") {
        docItems.push(item);
      }
    }

    return { featured: featuredItem, inlines: inlineItems, docs: docItems };
  }, [storyAttachments, storyId]);

  // 6. Reconciliation State for Two-Stage Private Failure
  const [reconciliationState, setReconciliationState] = useState<UploadReconciliationState | null>(null);

  // 7. Operational Handlers
  const handleUploadMedia = async (
    payload: PrepareStoryMediaPayload,
    fileBytes: Uint8Array | ArrayBuffer | Blob
  ) => {
    const rawBytes = fileBytes instanceof Uint8Array ? fileBytes : new Uint8Array(fileBytes as ArrayBuffer);
    let mediaId: string;
    let storageBucket: string;
    let storageKey: string;

    if (reconciliationState && reconciliationState.stage === "upload_failed") {
      // Retry with SAME prepared asset!
      mediaId = reconciliationState.mediaId;
      storageBucket = reconciliationState.storageBucket;
      storageKey = reconciliationState.storageKey;
    } else {
      // Step 1: Prepare RPC
      const prep = await services.newsroomMedia.prepareStoryMedia(storyId, payload);
      mediaId = prep.mediaId;
      storageBucket = prep.storageBucket;
      storageKey = prep.storageKey;
    }

    // Step 2: Authenticated Storage Upload
    try {
      await newsroomStorageService.uploadPrivateObject(
        storageBucket,
        storageKey,
        rawBytes,
        payload.mimeType
      );
    } catch (uploadErr) {
      setReconciliationState({
        stage: "upload_failed",
        mediaId,
        storyId,
        usageType: payload.usageType,
        storageBucket,
        storageKey,
        filename: payload.filename,
        mimeType: payload.mimeType,
        bytes: rawBytes,
        checksum: payload.checksum || "",
        errorMessage: uploadErr instanceof Error ? uploadErr.message : "Private storage upload failed."
      });
      throw uploadErr;
    }

    // Step 3: Finalize RPC
    try {
      await services.newsroomMedia.finalizeStoryMedia(
        mediaId,
        storyId,
        payload.usageType,
        payload.checksum || null
      );
    } catch (finalizeErr) {
      setReconciliationState({
        stage: "finalize_failed",
        mediaId,
        storyId,
        usageType: payload.usageType,
        storageBucket,
        storageKey,
        filename: payload.filename,
        mimeType: payload.mimeType,
        bytes: rawBytes,
        checksum: payload.checksum || "",
        errorMessage: finalizeErr instanceof Error ? finalizeErr.message : "Media finalization failed."
      });
      throw finalizeErr;
    }

    // Success: clear reconciliation context and refresh canonical state
    setReconciliationState(null);
    await Promise.all([refreshStoryAttachments(), refreshPlan()]);
    if (onStoryUpdated) onStoryUpdated();
  };

  const handleRetryUpload = async () => {
    if (!reconciliationState || reconciliationState.stage !== "upload_failed") return;
    await newsroomStorageService.uploadPrivateObject(
      reconciliationState.storageBucket,
      reconciliationState.storageKey,
      reconciliationState.bytes,
      reconciliationState.mimeType
    );
    await services.newsroomMedia.finalizeStoryMedia(
      reconciliationState.mediaId,
      storyId,
      reconciliationState.usageType,
      reconciliationState.checksum
    );
    setReconciliationState(null);
    await Promise.all([refreshStoryAttachments(), refreshPlan()]);
    if (onStoryUpdated) onStoryUpdated();
  };

  const handleRetryFinalize = async () => {
    if (!reconciliationState || reconciliationState.stage !== "finalize_failed") return;
    try {
      await services.newsroomMedia.getUploadContext(reconciliationState.mediaId, storyId);
    } catch {
      // Proceed to finalize
    }
    await services.newsroomMedia.finalizeStoryMedia(
      reconciliationState.mediaId,
      storyId,
      reconciliationState.usageType,
      reconciliationState.checksum
    );
    setReconciliationState(null);
    await Promise.all([refreshStoryAttachments(), refreshPlan()]);
    if (onStoryUpdated) onStoryUpdated();
  };

  const handleAttachExisting = async (mediaId: string, usageType: StoryMediaUsageType) => {
    await services.newsroomMedia.attachStoryMedia(mediaId, storyId, usageType);
    await Promise.all([refreshStoryAttachments(), refreshPlan()]);
    if (onStoryUpdated) onStoryUpdated();
  };

  const handleDetachMedia = async (mediaId: string, usageType: StoryMediaUsageType) => {
    await services.newsroomMedia.detachStoryMedia(mediaId, storyId, usageType);
    await Promise.all([refreshStoryAttachments(), refreshPlan()]);
    if (onStoryUpdated) onStoryUpdated();
  };

  const handleStagePromotion = async (item: StoryMediaPromotionItem) => {
    // 1. Download private object, calculate exact byte SHA-256 BEFORE building key, and upload to public
    const { verifiedChecksum, publicKey } = await newsroomStorageService.copyPrivateToCanonicalPublic({
      storyId,
      mediaId: item.mediaId,
      privateBucket: item.privateBucket,
      privateKey: item.privateKey,
      filename: item.filename,
      mimeType: item.mimeType,
      expectedChecksum: item.checksum
    });

    // 2. Stage Promotion RPC with verified checksum
    try {
      await services.newsroomMedia.stagePromotion(
        storyId,
        item.mediaId,
        publicKey,
        verifiedChecksum
      );
    } catch (rpcErr) {
      // Refresh canonical state to check if RPC committed despite response error
      let refreshedPlan: StoryMediaPromotionItem[] = [];
      try {
        refreshedPlan = await services.newsroomMedia.getPromotionPlan(storyId);
      } catch {
        // ignore
      }

      const refreshedItem = refreshedPlan.find((p) => p.mediaId === item.mediaId);
      if (refreshedItem && refreshedItem.mediaStatus === "public_staged") {
        setPromotionPlan(refreshedPlan);
        await refreshStoryAttachments();
        return;
      }

      // Bounded compensation: delete newly uploaded staged public object using corrected authority
      try {
        await newsroomStorageService.deleteStagedPublicObject("newsroom-public", publicKey);
        throw new Error(
          `Stage promotion failed: ${rpcErr instanceof Error ? rpcErr.message : String(rpcErr)}. Public storage staging was safely rolled back.`
        );
      } catch (cleanupErr) {
        throw new Error(
          `RECONCILIATION REQUIRED: Stage promotion failed (${
            rpcErr instanceof Error ? rpcErr.message : String(rpcErr)
          }) and public storage cleanup also failed (${
            cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr)
          }) for public key "${publicKey}".`
        );
      }
    }

    // 3. Refresh Plan
    await Promise.all([refreshPlan(), refreshStoryAttachments()]);
  };

  const handleClearStagedPromotion = async (item: StoryMediaPromotionItem) => {
    if (item.mediaStatus === "published" || effectiveWorkflowStatus === "Published") {
      throw new Error("Published media assets cannot be cleared from public storage.");
    }

    if (item.mediaStatus !== "public_staged" || !item.publicStorageKey) {
      throw new Error("Item must be in public_staged status with a valid public storage key to clear.");
    }

    const publicBucket = item.publicStorageBucket || "newsroom-public";
    const publicKey = item.publicStorageKey;

    // 1. Delete Storage object FIRST while DB is still public_staged
    await newsroomStorageService.deleteStagedPublicObject(publicBucket, publicKey);

    // 2. Call clear RPC
    try {
      await services.newsroomMedia.clearStagedPromotion(storyId, item.mediaId);
    } catch (clearRpcErr) {
      // Refresh canonical state to check if DB reverted despite error
      const refreshedPlan = await services.newsroomMedia.getPromotionPlan(storyId);
      const refreshedItem = refreshedPlan.find((p) => p.mediaId === item.mediaId);

      if (refreshedItem && refreshedItem.mediaStatus === "private_ready") {
        setPromotionPlan(refreshedPlan);
        await refreshStoryAttachments();
        return;
      }

      // DB remains public_staged: RESTORE public object from canonical private bytes
      try {
        await newsroomStorageService.copyPrivateToPublic(
          item.privateBucket,
          item.privateKey,
          publicBucket,
          publicKey,
          item.mimeType,
          item.checksum
        );
      } catch (restoreErr) {
        throw new Error(
          `RECONCILIATION FAILURE: Clear RPC failed and restoration of public object failed: ${
            restoreErr instanceof Error ? restoreErr.message : String(restoreErr)
          }`
        );
      }

      throw new Error(
        `Clear RPC failed (${clearRpcErr instanceof Error ? clearRpcErr.message : String(clearRpcErr)}). Public storage object has been restored.`
      );
    }

    // 3. Refresh
    await Promise.all([refreshPlan(), refreshStoryAttachments()]);
  };

  return (
    <StudioStoryMediaPanelView
      storyId={storyId}
      storyTitle={effectiveTitle}
      storyWorkflowStatus={effectiveWorkflowStatus}
      storyAccessPolicy={storyAccessPolicy}
      featuredMedia={featured}
      inlineMedia={inlines}
      supportingDocuments={docs}
      promotionPlan={promotionPlan}
      loadingPlan={loadingPlan}
      canManageMedia={canManageMedia}
      canEditStory={canEditStory}
      canPublish={canPublish}
      onUploadMedia={handleUploadMedia}
      onAttachExisting={handleAttachExisting}
      onDetachMedia={handleDetachMedia}
      onStagePromotion={handleStagePromotion}
      onClearStagedPromotion={handleClearStagedPromotion}
      onOpenInMediaLibrary={(mediaId) => router.push(`/studio/media?select=${mediaId}` as any)}
      onPickFile={pickStoryMediaFile}
      reconciliationState={reconciliationState}
      onRetryUpload={handleRetryUpload}
      onRetryFinalize={handleRetryFinalize}
      existingAssets={mediaAssets}
      loadingExistingAssets={loadingAssets}
      onRefreshExistingAssets={refreshAssets}
    />
  );
}

// =========================================================================
// STYLES
// =========================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paperMuted
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: 100
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink
  },
  subtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    marginTop: 4
  },
  boldText: {
    fontWeight: "600",
    color: colors.ink
  },
  headerBadges: {
    flexDirection: "row",
    gap: spacing.sm
  },
  statusBadge: {
    backgroundColor: colors.paper,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink
  },
  policyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  policyBadgePublic: {
    backgroundColor: "#ecfdf5"
  },
  policyBadgePremium: {
    backgroundColor: "#eff6ff"
  },
  policyBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669"
  },
  toolbar: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg
  },
  primaryBtn: {
    backgroundColor: colors.blue,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: "center"
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600"
  },
  secondaryBtn: {
    backgroundColor: colors.paper,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center"
  },
  secondaryBtnText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "500"
  },
  disabledBtn: {
    opacity: 0.5
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    borderColor: "#f87171",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  errorBannerTitle: {
    color: "#b91c1c",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 4
  },
  errorBannerText: {
    color: "#991b1b",
    fontSize: 13
  },
  dismissErrorBtn: {
    marginTop: 8,
    alignSelf: "flex-end"
  },
  dismissErrorText: {
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: "600"
  },
  successBanner: {
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  successBannerText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "500"
  },
  dismissSuccessText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "600"
  },
  blockerBanner: {
    backgroundColor: "#fffbeb",
    borderColor: "#f59e0b",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg
  },
  blockerBannerTitle: {
    color: "#b45309",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 4
  },
  blockerBannerText: {
    color: "#92400e",
    fontSize: 14,
    fontWeight: "600"
  },
  blockerBannerSubtext: {
    color: "#b45309",
    fontSize: 12,
    marginTop: 4
  },
  sectionCard: {
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md
  },
  sectionTitleRow: {
    flex: 1
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 2
  },
  mediaCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.paper
  },
  featuredImagePreview: {
    width: 220,
    height: 160,
    backgroundColor: "#f1f5f9"
  },
  imagePlaceholder: {
    width: 220,
    height: 160,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.sm
  },
  imagePlaceholderText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkMuted,
    textAlign: "center"
  },
  imagePlaceholderSubtext: {
    fontSize: 11,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: 4
  },
  mediaCardBody: {
    flex: 1,
    padding: spacing.md
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 6
  },
  featuredUsageBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  featuredUsageBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#92400e"
  },
  statusBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  statusBadgeSmallText: {
    fontSize: 10,
    fontWeight: "700"
  },
  statusPrivate: {
    backgroundColor: "#f1f5f9"
  },
  statusStaged: {
    backgroundColor: "#dbeafe"
  },
  statusPublished: {
    backgroundColor: "#d1fae5"
  },
  formatBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  formatBadgeText: {
    fontSize: 10,
    color: colors.inkMuted
  },
  mediaCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: 4
  },
  mediaMetaLine: {
    fontSize: 13,
    color: colors.ink,
    marginBottom: 2
  },
  metaLabel: {
    fontWeight: "600",
    color: colors.inkMuted
  },
  checksumText: {
    fontSize: 11,
    fontFamily: "monospace",
    color: colors.inkMuted,
    marginTop: 4
  },
  linkButton: {
    marginTop: 8
  },
  linkButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.blue
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: "center"
  },
  emptyCardText: {
    fontSize: 14,
    color: colors.inkMuted,
    marginBottom: spacing.sm
  },
  emptyCardSubtext: {
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: "center"
  },
  emptyCardActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  actionBtn: {
    backgroundColor: colors.blue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600"
  },
  actionBtnSecondary: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm
  },
  actionBtnSecondaryText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "500"
  },
  itemActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  actionBtnSmall: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  actionBtnSmallText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.ink
  },
  actionBtnDanger: {
    borderColor: "#fca5a5",
    backgroundColor: "#fef2f2"
  },
  actionBtnDangerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#b91c1c"
  },
  inlineItemCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.paper
  },
  inlineThumbnail: {
    width: 60,
    height: 60,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: "#f1f5f9",
    marginRight: spacing.md
  },
  inlineThumbImg: {
    width: "100%",
    height: "100%"
  },
  inlineThumbPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#cbd5e1"
  },
  inlineThumbPlaceholderText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted
  },
  inlineDetails: {
    flex: 1
  },
  inlineUsageBadge: {
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  inlineUsageBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#3730a3"
  },
  inlineItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink
  },
  inlineItemMeta: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2
  },
  docItemCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.paper
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md
  },
  docIconText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#991b1b"
  },
  docDetails: {
    flex: 1
  },
  docUsageBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  docUsageBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#475569"
  },
  docPrivateBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  docPrivateBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#92400e"
  },
  docItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink
  },
  docItemMeta: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2
  },
  authorityBadge: {
    backgroundColor: "#f3e8ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  authorityBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7e22ce"
  },
  loadingBox: {
    padding: spacing.lg,
    alignItems: "center"
  },
  loadingText: {
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: spacing.sm
  },
  planList: {
    gap: spacing.md
  },
  planCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.paper
  },
  planCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  planUsageBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  planUsageBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#92400e"
  },
  checksumBadge: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  checksumBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#059669"
  },
  planActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  primaryBtnSmall: {
    backgroundColor: colors.blue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm
  },
  primaryBtnSmallText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600"
  },
  secondaryBtnSmall: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm
  },
  secondaryBtnSmallText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "500"
  },
  publishedNote: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  publishedNoteText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669"
  },
  planItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: 2
  },
  planItemPath: {
    fontSize: 12,
    color: colors.inkMuted,
    fontFamily: "monospace"
  },
  planItemPublicPath: {
    fontSize: 12,
    color: "#0284c7",
    fontFamily: "monospace",
    marginTop: 2
  },
  checksumHash: {
    fontSize: 11,
    color: colors.inkMuted,
    fontFamily: "monospace",
    marginTop: 4
  },
  // Modal Styles
  modalOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000
  },
  modalDialog: {
    width: "90%",
    maxWidth: 580,
    maxHeight: "85%",
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    overflow: "hidden"
  },
  modalDialogLarge: {
    width: "90%",
    maxWidth: 720,
    maxHeight: "85%",
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    overflow: "hidden"
  },
  confirmDialog: {
    width: "90%",
    maxWidth: 440,
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: spacing.lg
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: spacing.sm
  },
  confirmBody: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
    marginBottom: spacing.lg
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.md
  },
  dangerBtn: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md
  },
  dangerBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600"
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink
  },
  modalCloseBtn: {
    padding: 6
  },
  modalCloseBtnText: {
    fontSize: 16,
    color: colors.inkMuted
  },
  modalBody: {
    padding: spacing.lg
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.border
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: 4,
    marginTop: spacing.md
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.paper
  },
  textArea: {
    minHeight: 60
  },
  radioGroup: {
    flexDirection: "row",
    gap: spacing.sm
  },
  radioBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.paper
  },
  radioBtnActive: {
    borderColor: colors.blue,
    backgroundColor: "#eff6ff"
  },
  radioBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.inkMuted
  },
  radioBtnTextActive: {
    color: colors.blue
  },
  pickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  pickerDetails: {
    flex: 1,
    marginRight: spacing.md
  },
  pickerFilename: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink
  },
  pickerMeta: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2
  },
  pickerAlt: {
    fontSize: 12,
    color: colors.ink,
    marginTop: 2
  },
  pickerSelectBtn: {
    backgroundColor: colors.blue,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.sm
  },
  pickerSelectBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600"
  },
  filePickerBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: "#f8fafc",
    gap: spacing.sm
  },
  pickerBtn: {
    backgroundColor: colors.blue,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: "center"
  },
  pickerBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600"
  },
  selectedFileInfo: {
    padding: spacing.sm,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    gap: 4
  },
  selectedFileName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink
  },
  selectedFileMeta: {
    fontSize: 12,
    color: colors.inkMuted
  },
  selectedFileChecksum: {
    fontSize: 11,
    color: colors.inkMuted,
    fontFamily: "monospace"
  },
  noFileSelectedText: {
    fontSize: 13,
    color: colors.inkMuted,
    fontStyle: "italic",
    textAlign: "center"
  },
  reconciliationAlert: {
    backgroundColor: "#fff7ed",
    borderColor: "#ea580c",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 4
  },
  reconciliationAlertTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#c2410c"
  },
  reconciliationAlertText: {
    fontSize: 13,
    color: "#9a3412"
  },
  reconciliationAlertSub: {
    fontSize: 11,
    color: "#c2410c",
    fontWeight: "600"
  }
});
