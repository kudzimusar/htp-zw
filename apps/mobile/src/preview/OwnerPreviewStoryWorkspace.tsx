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
  NewsroomStoryRevision
} from "../domain/models";
import {
  StudioStoryWorkspaceView,
  type TabId
} from "../ui/StudioStoryWorkspace";
import { colors, radius, spacing } from "../theme/tokens";
import {
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

  const topControlsSlot = (
    <View style={previewStyles.previewControlsCard} testID="owner-preview-story-controls">
      <View style={previewStyles.previewNoticeBox}>
        <Text style={previewStyles.previewNoticeTitle}>PREVIEW STATE ONLY — NOT SAVED TO SERVER</Text>
        <Text style={previewStyles.previewNoticeBody}>
          Shared presentation component `StudioStoryWorkspaceView` is rendered with non-persistent sample data.
          All 6 tabs, workflow transitions, review records, and revision restores are interactive locally.
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
