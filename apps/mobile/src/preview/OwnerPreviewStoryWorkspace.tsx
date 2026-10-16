import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";

import type {
  NewsroomPublicAuthor,
  NewsroomSection,
  NewsroomStory,
  NewsroomStoryAutosave,
  NewsroomStoryCorrection,
  NewsroomStoryReview,
  NewsroomStoryRevision,
  PrepareStoryMediaPayload,
  StoryMediaPromotionItem,
  StoryMediaSelectedFile,
  StoryMediaUsageType
} from "../domain/models";
import {
  StudioStoryWorkspaceView,
  type TabId
} from "../ui/StudioStoryWorkspace";
import {
  StudioStoryMediaPanelView,
  type AttachedMediaItem
} from "../ui/StudioStoryMedia";
import { colors, radius, spacing } from "../theme/tokens";
import {
  buildPreviewMediaAssets,
  buildPreviewStories,
  PREVIEW_PUBLIC_AUTHORS,
  PREVIEW_SECTIONS,
  PREVIEW_STAFF_DIRECTORY,
  PREVIEW_STORY_AUTOSAVE,
  PREVIEW_STORY_CORRECTIONS,
  PREVIEW_STORY_DISCUSSION,
  PREVIEW_STORY_REVIEWS,
  PREVIEW_STORY_REVISIONS,
  type PreviewDiscussionMessage
} from "./newsroomPreviewData";

export type WorkspaceTabKey = TabId;

export function OwnerPreviewStoryWorkspace({
  initialStoryId,
  initialTab = "writing"
}: {
  initialStoryId?: string | undefined;
  initialTab?: WorkspaceTabKey;
}) {
  const router = useRouter();
  const initialStories = useMemo(() => buildPreviewStories(), []);
  const [stories, setStories] = useState<NewsroomStory[]>(initialStories);
  const [selectedStoryId, setSelectedStoryId] = useState<string>(
    initialStoryId && initialStories.some((s) => s.id === initialStoryId)
      ? initialStoryId
      : initialStories[0]?.id ?? "00000000-0000-4000-8000-000000001001"
  );
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const currentStory = useMemo(() => {
    const fallback = stories[0]!;
    return stories.find((s) => s.id === selectedStoryId) ?? fallback;
  }, [stories, selectedStoryId]);

  // Form Fields
  const [title, setTitle] = useState(currentStory.title);
  const [slug, setSlug] = useState(currentStory.slug);
  const [standfirst, setStandfirst] = useState(currentStory.standfirst ?? "");
  const [body, setBody] = useState(currentStory.bodyHtml ?? "");
  const [desk, setDesk] = useState(currentStory.desk ?? "Investigations");
  const [topic, setTopic] = useState(currentStory.topic ?? "Public Health");
  const [country, setCountry] = useState(currentStory.country ?? "Zimbabwe");
  const [region, setRegion] = useState(currentStory.region ?? "Harare");
  const [sourceNotes, setSourceNotes] = useState(currentStory.sourceNotes ?? "");
  const [internalNotes, setInternalNotes] = useState(currentStory.internalNotes ?? "");
  const [deadlineAt, setDeadlineAt] = useState(currentStory.deadlineAt ?? "");
  const [authorId, setAuthorId] = useState(currentStory.authorId ?? PREVIEW_PUBLIC_AUTHORS[0]?.id ?? "");
  const [primarySectionId, setPrimarySectionId] = useState(currentStory.primarySectionId ?? PREVIEW_SECTIONS[0]?.id ?? "");
  const [accessPolicy, setAccessPolicy] = useState(currentStory.accessPolicy ?? "public");
  const [commentPolicy, setCommentPolicy] = useState(currentStory.commentPolicy ?? "disabled");
  const [distributionPublicReader, setDistributionPublicReader] = useState(Boolean(currentStory.distribution?.public_reader));
  const [adSetting, setAdSetting] = useState(currentStory.adSetting ?? "Standard");
  const [seoTitle, setSeoTitle] = useState(currentStory.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(currentStory.seoDescription ?? "");
  const [scheduledAt, setScheduledAt] = useState(currentStory.scheduledAt ?? "");

  // Concurrency & Autosave state
  const [expectedVersion, setExpectedVersion] = useState<number>(currentStory.lockVersion ?? 1);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "autosaving" | "saved" | "conflict" | "error"
  >("saved");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Revisions & History state
  const [revisions, setRevisions] = useState<NewsroomStoryRevision[]>(PREVIEW_STORY_REVISIONS);
  const [autosave, setAutosave] = useState<NewsroomStoryAutosave | null>(PREVIEW_STORY_AUTOSAVE);
  const [reviews, setReviews] = useState<NewsroomStoryReview[]>(PREVIEW_STORY_REVIEWS);
  const [corrections, setCorrections] = useState<NewsroomStoryCorrection[]>(PREVIEW_STORY_CORRECTIONS);
  const [discussionMessages, setDiscussionMessages] = useState<PreviewDiscussionMessage[]>(PREVIEW_STORY_DISCUSSION);
  const [newDiscussionText, setNewDiscussionText] = useState("");

  // Modal / Prompt states
  const [promptAction, setPromptAction] = useState<"requestChanges" | "correction" | "recordReview" | null>(null);
  const [promptReason, setPromptReason] = useState("");
  const [reviewType, setReviewType] = useState("fact_check");
  const [reviewOutcome, setReviewOutcome] = useState<"completed" | "approved" | "changes_requested">("completed");
  const [reviewNotes, setReviewNotes] = useState("");
  const [confirmRestoreRev, setConfirmRestoreRev] = useState<NewsroomStoryRevision | null>(null);

  // Sync state when selected story changes
  useEffect(() => {
    setTitle(currentStory.title);
    setSlug(currentStory.slug);
    setStandfirst(currentStory.standfirst ?? "");
    setBody(currentStory.bodyHtml ?? "");
    setDesk(currentStory.desk ?? "Investigations");
    setTopic(currentStory.topic ?? "Public Health");
    setCountry(currentStory.country ?? "Zimbabwe");
    setRegion(currentStory.region ?? "Harare");
    setSourceNotes(currentStory.sourceNotes ?? "");
    setInternalNotes(currentStory.internalNotes ?? "");
    setDeadlineAt(currentStory.deadlineAt ?? "");
    setAuthorId(currentStory.authorId ?? PREVIEW_PUBLIC_AUTHORS[0]?.id ?? "");
    setPrimarySectionId(currentStory.primarySectionId ?? PREVIEW_SECTIONS[0]?.id ?? "");
    setAccessPolicy(currentStory.accessPolicy ?? "public");
    setCommentPolicy(currentStory.commentPolicy ?? "disabled");
    setDistributionPublicReader(Boolean(currentStory.distribution?.public_reader));
    setAdSetting(currentStory.adSetting ?? "Standard");
    setSeoTitle(currentStory.seoTitle ?? "");
    setSeoDescription(currentStory.seoDescription ?? "");
    setScheduledAt(currentStory.scheduledAt ?? "");
    setExpectedVersion(currentStory.lockVersion ?? 1);
    setIsDirty(false);
    setSaveStatus("saved");
    setStatusMessage(null);
  }, [selectedStoryId, currentStory]);

  const markDirty = () => {
    setIsDirty(true);
    if (saveStatus === "saved") {
      setSaveStatus("idle");
    }
  };

  const handleSave = async (reason = "Manual save") => {
    setSaveStatus("saving");
    setStatusMessage("Preview saving (writes disabled)…");
    setTimeout(() => {
      const nextVer = expectedVersion + 1;
      setExpectedVersion(nextVer);
      setIsDirty(false);
      setSaveStatus("saved");
      setStatusMessage("Preview state updated locally (writes disabled).");
      setStories((prev) =>
        prev.map((s) =>
          s.id === selectedStoryId
            ? {
                ...s,
                title,
                slug,
                standfirst,
                bodyHtml: body,
                desk,
                topic,
                country,
                region,
                sourceNotes,
                internalNotes,
                deadlineAt,
                authorId,
                primarySectionId,
                accessPolicy,
                distribution: { ...(s.distribution ?? {}), public_reader: distributionPublicReader },
                adSetting,
                seoTitle,
                seoDescription,
                scheduledAt,
                lockVersion: nextVer
              }
            : s
        )
      );
    }, 150);
  };

  const loadStory = async (id: string) => {
    setSelectedStoryId(id);
  };

  const handleTransition = async (nextStatus: string, reason?: string) => {
    if (nextStatus === "Scheduled") {
      const valid = scheduledAt.trim() !== "" && !Number.isNaN(Date.parse(scheduledAt));
      if (!valid) {
        setStatusMessage("A valid publication date and time is required to schedule publication.");
        return;
      }
    }
    setStories((prev) =>
      prev.map((s) =>
        s.id === selectedStoryId
          ? { ...s, workflowStatus: nextStatus, status: nextStatus === "Published" ? "publish" : "draft" }
          : s
      )
    );
    setStatusMessage(`Status updated to ${nextStatus} (preview state only).`);
  };

  const handleOpenRecordReview = () => {
    setReviewType("fact_check");
    setPromptAction("recordReview");
  };

  const executeRequestChanges = async () => {
    setPromptAction(null);
    setPromptReason("");
    await handleTransition("Draft", "Changes requested");
    setStatusMessage("Changes requested. Story returned to Draft (preview state only).");
  };

  const executeRecordReview = async () => {
    const newRecord: NewsroomStoryReview = {
      id: `preview-review-${Date.now()}`,
      storyId: selectedStoryId,
      reviewType,
      status: reviewOutcome,
      notes: reviewNotes.trim() || null,
      assignedTo: PREVIEW_STAFF_DIRECTORY[0]?.id ?? "00000000-0000-4000-8000-000000000101",
      createdBy: PREVIEW_STAFF_DIRECTORY[0]?.id ?? "00000000-0000-4000-8000-000000000101",
      completedBy: PREVIEW_STAFF_DIRECTORY[0]?.id ?? "00000000-0000-4000-8000-000000000101",
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };
    setReviews((prev) => [newRecord, ...prev]);
    setPromptAction(null);
    setReviewNotes("");
    setStatusMessage("Review record saved (preview state only).");
  };

  const executeCorrection = async () => {
    if (!promptReason.trim()) return;
    const newCorr: NewsroomStoryCorrection = {
      id: `preview-correction-${Date.now()}`,
      storyId: selectedStoryId,
      reason: promptReason.trim(),
      changedBy: PREVIEW_STAFF_DIRECTORY[0]?.id ?? "00000000-0000-4000-8000-000000000101",
      changedAt: new Date().toISOString(),
      previousRevisionId: null,
      newRevisionId: null
    };
    setCorrections((prev) => [newCorr, ...prev]);
    setPromptAction(null);
    setPromptReason("");
    setStatusMessage("Correction published (preview state only).");
  };

  const executeRestoreRevision = async () => {
    if (!confirmRestoreRev) return;
    setTitle(confirmRestoreRev.title ?? "Untitled");
    setExpectedVersion((v) => v + 1);
    setConfirmRestoreRev(null);
    setStatusMessage(`Revision #${confirmRestoreRev.revisionNumber} restored (preview state only).`);
  };

  const handleSetCommentPolicy = async (nextPolicy: "disabled" | "read_only" | "open") => {
    setCommentPolicy(nextPolicy);
    setStatusMessage(`Comment policy set to ${nextPolicy} (preview state only).`);
  };

  const availableReviewTypes = [
    { type: "fact_check", label: "Fact Check" },
    { type: "health_review", label: "Health / Science Review" },
    { type: "copy_edit", label: "Copy Edit" },
    { type: "editor_review", label: "Editor Review" }
  ];

  const transitionOptions = [
    { label: "Submit for Review", status: "Submitted", allowed: true },
    { label: "Send to Fact Check", status: "Fact check", allowed: true },
    { label: "Send to Health Review", status: "Health / Science review", allowed: true },
    { label: "Send to Copy Edit", status: "Copy edit", allowed: true },
    { label: "Send to Editor Review", status: "Editor review", allowed: true },
    { label: "Mark as Ready", status: "Ready", allowed: true },
    { label: "Publish Now", status: "Published", allowed: true },
    { label: "Schedule Publication", status: "Scheduled", allowed: scheduledAt.trim() !== "" },
    { label: "Archive Story", status: "Archived", allowed: true }
  ];

  const handlePostDiscussionMessage = () => {
    const text = newDiscussionText.trim();
    if (!text) return;
    const msg: PreviewDiscussionMessage = {
      id: `preview-msg-${Date.now()}`,
      authorLabel: "Dr. Farai Muringani (Investigations)",
      roleBadge: "Senior Investigative Reporter",
      body: text,
      createdAt: new Date().toISOString(),
      resolved: false
    };
    setDiscussionMessages((prev) => [...prev, msg]);
    setNewDiscussionText("");
  };

  const discussionSlot = (
    <View style={previewStyles.discussionContainer}>
      <Text style={previewStyles.discussionHeader}>
        Internal Story Discussion & Desk Coordination (Sample Preview Thread)
      </Text>
      <View style={previewStyles.discussionList}>
        {discussionMessages.map((msg) => (
          <View key={msg.id} style={previewStyles.discussionCard}>
            <View style={previewStyles.discussionTopRow}>
              <Text style={previewStyles.discussionAuthor}>{msg.authorLabel}</Text>
              <Text style={previewStyles.discussionRole}>{msg.roleBadge}</Text>
              <Text style={previewStyles.discussionTime}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
            <Text style={previewStyles.discussionBody}>{msg.body}</Text>
          </View>
        ))}
      </View>
      <View style={previewStyles.composerBox}>
        <TextInput
          style={previewStyles.composerInput}
          value={newDiscussionText}
          onChangeText={setNewDiscussionText}
          placeholder="Add an internal note or editorial guidance (preview only)..."
          placeholderTextColor="#94A3B8"
          multiline
        />
        <Pressable
          style={[previewStyles.composerSendBtn, !newDiscussionText.trim() && previewStyles.composerSendBtnDisabled]}
          onPress={handlePostDiscussionMessage}
          disabled={!newDiscussionText.trim()}
        >
          <Text style={previewStyles.composerSendBtnText}>Post Internal Note (Preview)</Text>
        </Pressable>
      </View>
    </View>
  );

  // Media attachments & promotion plan local state (simulated in-memory)
  const [previewAttachments, setPreviewAttachments] = useState<AttachedMediaItem[]>([
    {
      mediaId: "00000000-0000-4000-8000-000000007001",
      usageType: "featured",
      filename: "clinical-ward-vaccination.jpg",
      mimeType: "image/jpeg",
      byteSize: 2458900,
      status: "private_ready",
      publicUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=80",
      altText: "Harare Central Hospital maternal clinic nurses reviewing child immunization registry cards",
      caption: "Maternal clinic nurses review pediatric immunization schedules during the October catchment drive.",
      credit: "HealthTimes Staff / Tafadzwa Moyo",
      sourceProvenance: "uploads/2026/10/clinical-ward-vaccination.jpg",
      storageBucket: "newsroom-private",
      storageKey: `story-media/${selectedStoryId}/00000000-0000-4000-8000-000000007001/clinical-ward-vaccination.jpg`,
      checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    },
    {
      mediaId: "00000000-0000-4000-8000-000000007002",
      usageType: "inline",
      filename: "water-purification-infographic.png",
      mimeType: "image/png",
      byteSize: 1245000,
      status: "public_staged",
      publicUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
      altText: "Diagram outlining four-step community water treatment for borehole purification",
      caption: "Step-by-step chlorine dosage and boiling guide for peri-urban household boreholes.",
      credit: "Ministry of Health and Child Care / Visual Unit",
      sourceProvenance: "uploads/2026/10/water-purification-infographic.png",
      storageBucket: "newsroom-public",
      storageKey: `story-media/${selectedStoryId}/00000000-0000-4000-8000-000000007002/ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb/water-purification-infographic.png`,
      checksum: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb"
    },
    {
      mediaId: "00000000-0000-4000-8000-000000007003",
      usageType: "supporting_document",
      filename: "epidemiology-monthly-bulletin.pdf",
      mimeType: "application/pdf",
      byteSize: 5410200,
      status: "private_ready",
      publicUrl: null,
      altText: null,
      caption: "National Epidemiological Bulletin — Epidemiological Week 41 Official Tables",
      credit: "Department of Epidemiology & Disease Control",
      sourceProvenance: "uploads/2026/10/epidemiology-monthly-bulletin.pdf",
      storageBucket: "newsroom-private",
      storageKey: `story-media/${selectedStoryId}/00000000-0000-4000-8000-000000007003/epidemiology-monthly-bulletin.pdf`,
      checksum: "4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce"
    }
  ]);

  const [previewPromotionPlan, setPreviewPromotionPlan] = useState<StoryMediaPromotionItem[]>([
    {
      mediaId: "00000000-0000-4000-8000-000000007001",
      usageType: "featured",
      privateBucket: "newsroom-private",
      privateKey: `story-media/${selectedStoryId}/00000000-0000-4000-8000-000000007001/clinical-ward-vaccination.jpg`,
      filename: "clinical-ward-vaccination.jpg",
      mimeType: "image/jpeg",
      byteSize: 2458900,
      checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      publicStorageBucket: null,
      publicStorageKey: null,
      publicUrl: null,
      mediaStatus: "private_ready"
    },
    {
      mediaId: "00000000-0000-4000-8000-000000007002",
      usageType: "inline",
      privateBucket: "newsroom-private",
      privateKey: `story-media/${selectedStoryId}/00000000-0000-4000-8000-000000007002/water-purification-infographic.png`,
      filename: "water-purification-infographic.png",
      mimeType: "image/png",
      byteSize: 1245000,
      checksum: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
      publicStorageBucket: "newsroom-public",
      publicStorageKey: `story-media/${selectedStoryId}/00000000-0000-4000-8000-000000007002/ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb/water-purification-infographic.png`,
      publicUrl: `https://preview-media.local/storage/v1/object/public/newsroom-public/story-media/${selectedStoryId}/00000000-0000-4000-8000-000000007002/ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb/water-purification-infographic.png`,
      mediaStatus: "public_staged"
    }
  ]);

  const handlePreviewUpload = async (
    payload: PrepareStoryMediaPayload,
    fileBytes: Uint8Array | ArrayBuffer | Blob
  ) => {
    const fakeId = `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`;
    const newItem: AttachedMediaItem = {
      mediaId: fakeId,
      usageType: payload.usageType,
      filename: payload.filename,
      mimeType: payload.mimeType,
      byteSize: payload.byteSize,
      status: "private_ready",
      publicUrl: payload.mimeType.startsWith("image/")
        ? "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=80"
        : null,
      altText: payload.altText ?? null,
      caption: payload.caption ?? null,
      credit: payload.credit ?? null,
      sourceProvenance: payload.sourceProvenance,
      storageBucket: "newsroom-private",
      storageKey: `story-media/${selectedStoryId}/${fakeId}/${payload.filename}`,
      checksum: payload.checksum ?? null
    };

    setPreviewAttachments((prev) => {
      let filtered = prev;
      if (payload.usageType === "featured") {
        filtered = prev.filter((a) => a.usageType !== "featured");
      }
      return [newItem, ...filtered];
    });

    if (payload.usageType === "featured" || payload.usageType === "inline") {
      const planItem: StoryMediaPromotionItem = {
        mediaId: fakeId,
        usageType: payload.usageType,
        privateBucket: "newsroom-private",
        privateKey: `story-media/${selectedStoryId}/${fakeId}/${payload.filename}`,
        filename: payload.filename,
        mimeType: payload.mimeType,
        byteSize: payload.byteSize,
        checksum: payload.checksum ?? null,
        publicStorageBucket: null,
        publicStorageKey: null,
        publicUrl: null,
        mediaStatus: "private_ready"
      };
      setPreviewPromotionPlan((prev) => {
        let next = prev;
        if (payload.usageType === "featured") {
          next = prev.filter((p) => p.usageType !== "featured");
        }
        return [planItem, ...next];
      });
    }

    setExpectedVersion((v) => v + 1);
    setStatusMessage(`Uploaded and attached ${payload.filename} as ${payload.usageType} (simulated v${expectedVersion + 1}).`);
  };

  const handlePreviewAttachExisting = async (
    mediaId: string,
    usageType: StoryMediaUsageType
  ) => {
    const all = buildPreviewMediaAssets();
    const found = all.find((a) => a.id === mediaId);
    if (!found) return;

    const attached: AttachedMediaItem = {
      mediaId: found.id,
      usageType,
      filename: found.filename,
      mimeType: found.mimeType,
      byteSize: found.byteSize,
      status: found.status === "published" ? "published" : "private_ready",
      publicUrl: found.publicUrl,
      altText: found.altText,
      caption: found.caption,
      credit: found.credit,
      sourceProvenance: found.sourceProvenance,
      storageBucket: found.storageBucket,
      storageKey: found.storageKey,
      checksum: found.checksum
    };

    setPreviewAttachments((prev) => {
      let next = prev;
      if (usageType === "featured") {
        next = prev.filter((a) => a.usageType !== "featured");
      }
      return [attached, ...next.filter((a) => a.mediaId !== mediaId)];
    });

    if (usageType === "featured" || usageType === "inline") {
      const planItem: StoryMediaPromotionItem = {
        mediaId: found.id,
        usageType,
        privateBucket: found.storageBucket ?? "newsroom-private",
        privateKey: found.storageKey ?? "",
        filename: found.filename,
        mimeType: found.mimeType,
        byteSize: found.byteSize ?? 0,
        checksum: found.checksum ?? null,
        publicStorageBucket: found.status === "published" ? "newsroom-public" : null,
        publicStorageKey: found.status === "published" ? found.storageKey : null,
        publicUrl: found.publicUrl,
        mediaStatus: found.status === "published" ? "public_staged" : "private_ready"
      };
      setPreviewPromotionPlan((prev) => {
        let next = prev;
        if (usageType === "featured") {
          next = prev.filter((p) => p.usageType !== "featured");
        }
        return [planItem, ...next];
      });
    }

    setExpectedVersion((v) => v + 1);
    setStatusMessage(`Attached existing asset ${found.filename} (simulated v${expectedVersion + 1}).`);
  };

  const handlePreviewDetach = async (
    mediaId: string,
    usageType: StoryMediaUsageType
  ) => {
    setPreviewAttachments((prev) => prev.filter((a) => a.mediaId !== mediaId || a.usageType !== usageType));
    setPreviewPromotionPlan((prev) => prev.filter((p) => p.mediaId !== mediaId));
    setExpectedVersion((v) => v + 1);
    setStatusMessage(`Detached media asset (simulated v${expectedVersion + 1}).`);
  };

  const handlePreviewStagePromotion = async (item: StoryMediaPromotionItem) => {
    const stagedKey = `story-media/${selectedStoryId}/${item.mediaId}/${item.checksum || "checksum"}/${item.filename}`;
    setPreviewPromotionPlan((prev) =>
      prev.map((p) =>
        p.mediaId === item.mediaId
          ? {
              ...p,
              mediaStatus: "public_staged",
              publicStorageBucket: "newsroom-public",
              publicStorageKey: stagedKey,
              publicUrl: `https://preview-media.local/storage/v1/object/public/newsroom-public/${stagedKey}`
            }
          : p
      )
    );
    setPreviewAttachments((prev) =>
      prev.map((a) =>
        a.mediaId === item.mediaId
          ? { ...a, status: "public_staged", storageBucket: "newsroom-public" }
          : a
      )
    );
    setStatusMessage(`Promoted and staged ${item.filename} in newsroom-public (PUBLIC STAGED).`);
  };

  const handlePreviewClearStaged = async (item: StoryMediaPromotionItem) => {
    setPreviewPromotionPlan((prev) =>
      prev.map((p) =>
        p.mediaId === item.mediaId
          ? {
              ...p,
              mediaStatus: "private_ready",
              publicStorageBucket: null,
              publicStorageKey: null,
              publicUrl: null
            }
          : p
      )
    );
    setPreviewAttachments((prev) =>
      prev.map((a) =>
        a.mediaId === item.mediaId
          ? { ...a, status: "private_ready", storageBucket: "newsroom-private" }
          : a
      )
    );
    setStatusMessage(`Reverted staged promotion for ${item.filename} to private_ready.`);
  };

  const mediaSlot = (
    <StudioStoryMediaPanelView
      storyId={selectedStoryId}
      storyTitle={title}
      storyWorkflowStatus={currentStory.workflowStatus ?? "Draft"}
      storyAccessPolicy={accessPolicy as "public" | "premium"}
      featuredMedia={previewAttachments.find((a) => a.usageType === "featured") ?? null}
      inlineMedia={previewAttachments.filter((a) => a.usageType === "inline")}
      supportingDocuments={previewAttachments.filter((a) => a.usageType === "supporting_document")}
      promotionPlan={previewPromotionPlan}
      loadingPlan={false}
      canManageMedia={true}
      canEditStory={true}
      canPublish={true}
      isReadOnly={false}
      existingAssets={buildPreviewMediaAssets()}
      onPickFile={async (): Promise<StoryMediaSelectedFile> => ({
        filename: "clinic-immunization-review.jpg",
        mimeType: "image/jpeg",
        byteSize: 128,
        bytes: new Uint8Array(128)
      })}
      onUploadMedia={handlePreviewUpload}
      onAttachExisting={handlePreviewAttachExisting}
      onDetachMedia={handlePreviewDetach}
      onStagePromotion={handlePreviewStagePromotion}
      onClearStagedPromotion={handlePreviewClearStaged}
      onOpenInMediaLibrary={(mediaId) => router.push(`/owner-preview/studio/media` as never)}
    />
  );

  const topControlsSlot = (
    <View style={previewStyles.previewControlsCard} testID="owner-preview-story-controls">
      <View style={previewStyles.previewNoticeBox}>
        <Text style={previewStyles.previewNoticeTitle}>PREVIEW STATE ONLY — NOT SAVED TO SERVER</Text>
        <Text style={previewStyles.previewNoticeBody}>
          Shared presentation component `StudioStoryWorkspaceView` is rendered with non-persistent sample data.
          All 7 tabs, workflow transitions, review records, media attachments, and revision restores are interactive locally.
        </Text>
      </View>

      <View style={previewStyles.selectorRow}>
        <Text style={previewStyles.selectorLabel}>Switch Sample Story:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={previewStyles.pillsScroll}>
          {stories.map((st) => {
            const active = st.id === selectedStoryId;
            return (
              <Pressable
                key={st.id}
                style={[previewStyles.storyPill, active && previewStyles.storyPillActive]}
                onPress={() => setSelectedStoryId(st.id)}
              >
                <Text style={[previewStyles.storyPillText, active && previewStyles.storyPillTextActive]}>
                  {st.title.slice(0, 32)}… ({st.workflowStatus ?? "Draft"})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={previewStyles.actionsRow}>
        <Pressable
          style={previewStyles.actionBtn}
          onPress={() => {
            setSaveStatus("conflict");
            setStatusMessage(
              `SIMULATED CONFLICT: Another staff member updated this story on the server (expected v${expectedVersion}).`
            );
          }}
        >
          <Text style={previewStyles.actionBtnText}>⚡ Simulate Version Conflict</Text>
        </Pressable>
        <Pressable
          style={previewStyles.actionBtn}
          onPress={() => {
            setSaveStatus("saved");
            setStatusMessage("Conflict cleared (simulated).");
          }}
        >
          <Text style={previewStyles.actionBtnText}>✓ Clear Conflict</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <StudioStoryWorkspaceView
      storyId={selectedStoryId}
      story={currentStory}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      loading={false}
      isReadOnly={false}
      expectedVersion={expectedVersion}
      isDirty={isDirty}
      saveStatus={saveStatus}
      statusMessage={statusMessage}
      title={title}
      setTitle={setTitle}
      slug={slug}
      setSlug={setSlug}
      standfirst={standfirst}
      setStandfirst={setStandfirst}
      body={body}
      setBody={setBody}
      desk={desk}
      setDesk={setDesk}
      topic={topic}
      setTopic={setTopic}
      country={country}
      setCountry={setCountry}
      region={region}
      setRegion={setRegion}
      sourceNotes={sourceNotes}
      setSourceNotes={setSourceNotes}
      internalNotes={internalNotes}
      setInternalNotes={setInternalNotes}
      deadlineAt={deadlineAt}
      setDeadlineAt={setDeadlineAt}
      authorId={authorId}
      setAuthorId={setAuthorId}
      primarySectionId={primarySectionId}
      setPrimarySectionId={setPrimarySectionId}
      accessPolicy={accessPolicy}
      setAccessPolicy={setAccessPolicy}
      commentPolicy={commentPolicy}
      distributionPublicReader={distributionPublicReader}
      setDistributionPublicReader={setDistributionPublicReader}
      adSetting={adSetting}
      setAdSetting={setAdSetting}
      seoTitle={seoTitle}
      setSeoTitle={setSeoTitle}
      seoDescription={seoDescription}
      setSeoDescription={setSeoDescription}
      scheduledAt={scheduledAt}
      setScheduledAt={setScheduledAt}
      authors={PREVIEW_PUBLIC_AUTHORS}
      sections={PREVIEW_SECTIONS}
      revisions={revisions}
      autosave={autosave}
      reviews={reviews}
      corrections={corrections}
      canEditAll={true}
      canManagePremium={true}
      canManageDistribution={true}
      canManageAdSetting={true}
      canSchedule={true}
      canConfigureComments={true}
      canEnableComments={true}
      canRequestChanges={true}
      canCorrect={true}
      currentWorkflowStatus={currentStory.workflowStatus ?? "Draft"}
      transitionOptions={transitionOptions}
      availableReviewTypes={availableReviewTypes}
      promptAction={promptAction}
      setPromptAction={setPromptAction}
      promptReason={promptReason}
      setPromptReason={setPromptReason}
      reviewType={reviewType}
      setReviewType={setReviewType}
      reviewOutcome={reviewOutcome}
      setReviewOutcome={setReviewOutcome}
      reviewNotes={reviewNotes}
      setReviewNotes={setReviewNotes}
      confirmRestoreRev={confirmRestoreRev}
      setConfirmRestoreRev={setConfirmRestoreRev}
      markDirty={markDirty}
      handleSave={handleSave}
      loadStory={loadStory}
      handleTransition={handleTransition}
      handleOpenRecordReview={handleOpenRecordReview}
      executeRequestChanges={executeRequestChanges}
      executeRecordReview={executeRecordReview}
      executeCorrection={executeCorrection}
      executeRestoreRevision={executeRestoreRevision}
      handleSetCommentPolicy={handleSetCommentPolicy}
      onBackToStories={() => router.push("/owner-preview/studio/stories" as never)}
      topControlsSlot={topControlsSlot}
      discussionSlot={discussionSlot}
      mediaSlot={mediaSlot}
    />
  );
}

const previewStyles = StyleSheet.create({
  previewControlsCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  previewNoticeBox: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: radius.sm,
    padding: 10,
    gap: 4
  },
  previewNoticeTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "#92400E"
  },
  previewNoticeBody: {
    fontSize: 12,
    lineHeight: 17,
    color: "#78350F"
  },
  selectorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap"
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink
  },
  pillsScroll: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2
  },
  storyPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1"
  },
  storyPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy
  },
  storyPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.ink
  },
  storyPillTextActive: {
    color: "#FFFFFF"
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1"
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155"
  },
  discussionContainer: {
    gap: spacing.md
  },
  discussionHeader: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink
  },
  discussionList: {
    gap: spacing.sm
  },
  discussionCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4
  },
  discussionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap"
  },
  discussionAuthor: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink
  },
  discussionRole: {
    fontSize: 11,
    color: colors.blue,
    fontWeight: "600"
  },
  discussionTime: {
    fontSize: 11,
    color: colors.inkMuted,
    marginLeft: "auto"
  },
  discussionBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink
  },
  composerBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm
  },
  composerInput: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    fontSize: 13,
    color: colors.ink
  },
  composerSendBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.blue,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm
  },
  composerSendBtnDisabled: {
    opacity: 0.5
  },
  composerSendBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  }
});
