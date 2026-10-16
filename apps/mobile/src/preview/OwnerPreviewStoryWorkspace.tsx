import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import type {
  NewsroomStory,
  NewsroomStoryCorrection,
  NewsroomStoryReview,
  NewsroomStoryRevision
} from "../domain/models";
import { resolveWorkflowStatus } from "../ui/StudioStories";

type AccessPolicy = "public" | "premium";
type CommentPolicy = "disabled" | "read_only" | "open";
type NewsroomStoryReviewType = NewsroomStoryReview["reviewType"];
type NewsroomStoryReviewStatus = NewsroomStoryReview["status"];
type NewsroomWorkflowStatus =
  | "Draft"
  | "Submitted"
  | "Fact check"
  | "Health / Science review"
  | "Copy edit"
  | "Editor review"
  | "Ready"
  | "Scheduled"
  | "Published";
import { colors } from "../theme/tokens";
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

export type WorkspaceTabKey =
  | "writing"
  | "reporting"
  | "editorial"
  | "publication"
  | "history"
  | "discussion";

export type SimulatedSaveState =
  | "saved"
  | "dirty"
  | "saving"
  | "autosaved"
  | "conflict";

export type SimulatedDialogState =
  | null
  | "record_review"
  | "request_changes"
  | "restore_revision"
  | "workflow_transition";

const WORKSPACE_TABS: ReadonlyArray<{ key: WorkspaceTabKey; label: string }> = [
  { key: "writing", label: "Writing" },
  { key: "reporting", label: "Reporting" },
  { key: "editorial", label: "Editorial" },
  { key: "publication", label: "Publication" },
  { key: "history", label: "History" },
  { key: "discussion", label: "Discussion" }
];

const WORKFLOW_STATES: NewsroomWorkflowStatus[] = [
  "Draft",
  "Submitted",
  "Fact check",
  "Health / Science review",
  "Copy edit",
  "Editor review",
  "Ready",
  "Scheduled",
  "Published"
];

const REVIEW_TYPES: NewsroomStoryReviewType[] = [
  "fact_check",
  "health_review",
  "copy_edit",
  "editor_review"
];

const REVIEW_STATUSES: NewsroomStoryReviewStatus[] = [
  "pending",
  "changes_requested",
  "approved",
  "completed"
];

export function OwnerPreviewStoryWorkspace({
  initialStoryId,
  initialTab = "writing"
}: {
  initialStoryId?: string | undefined;
  initialTab?: WorkspaceTabKey;
}) {
  const initialStories = useMemo(() => buildPreviewStories(), []);
  const [stories, setStories] = useState<NewsroomStory[]>(initialStories);
  const [selectedStoryId, setSelectedStoryId] = useState<string>(
    initialStoryId && initialStories.some((s) => s.id === initialStoryId)
      ? initialStoryId
      : initialStories[0]?.id ?? "00000000-0000-4000-8000-000000001001"
  );
  const [isNewDraftMode, setIsNewDraftMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTabKey>(initialTab);
  const [saveState, setSaveState] = useState<SimulatedSaveState>("saved");
  const [activeDialog, setActiveDialog] = useState<SimulatedDialogState>(null);
  const [previewBanner, setPreviewBanner] = useState<string | null>(
    "Preview state only — not saved. All Story Workspace tabs, states, and dialogs are interactive locally (writes disabled)."
  );

  // Local workspace state derived from selected story
  const currentStory = useMemo(() => {
    const fallback = stories[0]!;
    return stories.find((s) => s.id === selectedStoryId) ?? fallback;
  }, [stories, selectedStoryId]);

  const [title, setTitle] = useState(currentStory.title);
  const [slug, setSlug] = useState(currentStory.slug);
  const [standfirst, setStandfirst] = useState(currentStory.standfirst ?? "");
  const [bodyHtml, setBodyHtml] = useState(currentStory.bodyHtml ?? "");
  const [seoTitle, setSeoTitle] = useState(currentStory.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    currentStory.seoDescription ?? ""
  );
  const [canonicalUrl, setCanonicalUrl] = useState(
    currentStory.canonicalUrl ?? ""
  );
  const [desk, setDesk] = useState(currentStory.desk ?? "Investigations");
  const [topic, setTopic] = useState(currentStory.topic ?? "");
  const [country, setCountry] = useState(currentStory.country ?? "Zimbabwe");
  const [region, setRegion] = useState(currentStory.region ?? "");
  const [deadlineAt, setDeadlineAt] = useState(currentStory.deadlineAt ?? "");
  const [sourceNotes, setSourceNotes] = useState(
    currentStory.sourceNotes ?? ""
  );
  const [internalNotes, setInternalNotes] = useState(
    currentStory.internalNotes ?? ""
  );
  const [authorId, setAuthorId] = useState(currentStory.authorId ?? "");
  const [primarySectionId, setPrimarySectionId] = useState(
    currentStory.primarySectionId ?? ""
  );
  const [ownerStaffId, setOwnerStaffId] = useState(
    currentStory.ownerStaffId ?? ""
  );
  const [assignedEditorStaffId, setAssignedEditorStaffId] = useState(
    currentStory.assignedEditorStaffId ?? ""
  );
  const [factCheckerStaffId, setFactCheckerStaffId] = useState(
    currentStory.factCheckerStaffId ?? ""
  );
  const [healthReviewerStaffId, setHealthReviewerStaffId] = useState(
    currentStory.healthReviewerStaffId ?? ""
  );
  const [copyEditorStaffId, setCopyEditorStaffId] = useState(
    currentStory.copyEditorStaffId ?? ""
  );
  const [workflowStatus, setWorkflowStatus] = useState<string>(
    resolveWorkflowStatus(currentStory)
  );
  const [accessPolicy, setAccessPolicy] = useState<AccessPolicy>(
    currentStory.accessPolicy === "premium" ? "premium" : "public"
  );
  const [scheduledAt, setScheduledAt] = useState(
    currentStory.scheduledAt ?? "2026-10-17T09:00:00.000Z"
  );
  const [adSetting, setAdSetting] = useState(
    currentStory.adSetting ?? "Standard"
  );
  const [distPublicReader, setDistPublicReader] = useState<boolean>(
    Boolean(currentStory.distribution?.public_reader ?? true)
  );
  const [distNewsletter, setDistNewsletter] = useState<boolean>(
    Boolean(currentStory.distribution?.newsletter_brief ?? false)
  );
  const [commentPolicy, setCommentPolicy] = useState<CommentPolicy>(
    (currentStory.commentPolicy as CommentPolicy) ?? "disabled"
  );
  const [lockVersion, setLockVersion] = useState<number>(
    currentStory.lockVersion
  );

  // Dialog local states
  const [reviewTypeInput, setReviewTypeInput] =
    useState<NewsroomStoryReviewType>("editor_review");
  const [reviewStatusInput, setReviewStatusInput] =
    useState<NewsroomStoryReviewStatus>("approved");
  const [reviewNotesInput, setReviewNotesInput] = useState(
    "PREVIEW REVIEW NOTE: Verified clinical and municipal data citations."
  );
  const [requestChangesReason, setRequestChangesReason] = useState(
    "PREVIEW REQUEST CHANGES: Please attach the updated municipal water testing table to source notes."
  );
  const [pendingWorkflowTarget, setPendingWorkflowTarget] =
    useState<NewsroomWorkflowStatus>("Ready");
  const [pendingRestoreRevision, setPendingRestoreRevision] =
    useState<NewsroomStoryRevision>(PREVIEW_STORY_REVISIONS[1]!);

  // History & Discussion local collections
  const [revisions, setRevisions] = useState<NewsroomStoryRevision[]>(
    PREVIEW_STORY_REVISIONS
  );
  const [reviews, setReviews] = useState<NewsroomStoryReview[]>(
    PREVIEW_STORY_REVIEWS
  );
  const [corrections] = useState<NewsroomStoryCorrection[]>(
    PREVIEW_STORY_CORRECTIONS
  );
  const [discussionMessages, setDiscussionMessages] = useState<
    PreviewDiscussionMessage[]
  >(PREVIEW_STORY_DISCUSSION);
  const [discussionDraft, setDiscussionDraft] = useState("");

  useEffect(() => {
    if (
      initialStoryId &&
      stories.some((s) => s.id === initialStoryId) &&
      initialStoryId !== selectedStoryId
    ) {
      selectStory(initialStoryId);
    }
  }, [initialStoryId]);

  function selectStory(storyId: string) {
    const found = stories.find((s) => s.id === storyId);
    if (!found) return;
    setIsNewDraftMode(false);
    setSelectedStoryId(found.id);
    setTitle(found.title);
    setSlug(found.slug);
    setStandfirst(found.standfirst ?? "");
    setBodyHtml(found.bodyHtml ?? "");
    setSeoTitle(found.seoTitle ?? "");
    setSeoDescription(found.seoDescription ?? "");
    setCanonicalUrl(found.canonicalUrl ?? "");
    setDesk(found.desk ?? "Investigations");
    setTopic(found.topic ?? "");
    setCountry(found.country ?? "Zimbabwe");
    setRegion(found.region ?? "");
    setDeadlineAt(found.deadlineAt ?? "");
    setSourceNotes(found.sourceNotes ?? "");
    setInternalNotes(found.internalNotes ?? "");
    setAuthorId(found.authorId ?? "");
    setPrimarySectionId(found.primarySectionId ?? "");
    setOwnerStaffId(found.ownerStaffId ?? "");
    setAssignedEditorStaffId(found.assignedEditorStaffId ?? "");
    setFactCheckerStaffId(found.factCheckerStaffId ?? "");
    setHealthReviewerStaffId(found.healthReviewerStaffId ?? "");
    setCopyEditorStaffId(found.copyEditorStaffId ?? "");
    setWorkflowStatus(resolveWorkflowStatus(found));
    setAccessPolicy(found.accessPolicy === "premium" ? "premium" : "public");
    setScheduledAt(found.scheduledAt ?? "2026-10-17T09:00:00.000Z");
    setAdSetting(found.adSetting ?? "Standard");
    setDistPublicReader(Boolean(found.distribution?.public_reader ?? true));
    setDistNewsletter(Boolean(found.distribution?.newsletter_brief ?? false));
    setCommentPolicy((found.commentPolicy as CommentPolicy) ?? "disabled");
    setLockVersion(found.lockVersion);
    setSaveState("saved");
    setPreviewBanner(
      `Loaded sample story "${found.title}" in Owner Visual Preview (writes disabled).`
    );
  }

  function enterNewDraftPreview() {
    setIsNewDraftMode(true);
    setTitle("PREVIEW — New untitled story draft");
    setSlug("preview-new-untitled-story-draft");
    setStandfirst("Sample standfirst for a newly initiated story draft.");
    setBodyHtml("<p><strong>PREVIEW SAMPLE DRAFT.</strong> Start writing...</p>");
    setSeoTitle("PREVIEW — New Story Draft");
    setSeoDescription("Sample SEO description.");
    setCanonicalUrl("");
    setDesk("Public Health");
    setTopic("Primary Care");
    setCountry("Zimbabwe");
    setRegion("National");
    setDeadlineAt("2026-10-20T15:00:00.000Z");
    setSourceNotes("PREVIEW SOURCE NOTES: Initial reporting notes.");
    setInternalNotes("PREVIEW INTERNAL NOTE: New story draft simulation.");
    setWorkflowStatus("Draft");
    setAccessPolicy("public");
    setCommentPolicy("disabled");
    setLockVersion(1);
    setSaveState("dirty");
    setPreviewBanner(
      "Preview state only — not saved: Simulated New Story Creation mode (writes disabled)."
    );
  }

  function handleFieldEdit<T>(setter: (val: T) => void, value: T) {
    setter(value);
    if (saveState === "saved") {
      setSaveState("dirty");
    }
  }

  function simulateSaveDraft() {
    setSaveState("saving");
    const nextLock = lockVersion + 1;
    setLockVersion(nextLock);
    setSaveState("saved");
    setStories((prev) =>
      prev.map((s) =>
        s.id === selectedStoryId
          ? {
              ...s,
              title,
              slug,
              standfirst,
              bodyHtml,
              seoTitle,
              seoDescription,
              canonicalUrl: canonicalUrl || null,
              desk,
              topic,
              country,
              region,
              deadlineAt: deadlineAt || null,
              sourceNotes,
              internalNotes,
              workflowStatus,
              accessPolicy,
              scheduledAt: scheduledAt || null,
              adSetting,
              commentPolicy,
              lockVersion: nextLock
            }
          : s
      )
    );
    setPreviewBanner(
      `Preview state only — not saved: Simulated manual save (lockVersion v${nextLock}, writes disabled).`
    );
  }

  function simulateRecordReviewConfirm() {
    const newReview: NewsroomStoryReview = {
      id: `preview-review-${Date.now()}`,
      storyId: selectedStoryId,
      reviewType: reviewTypeInput,
      status: reviewStatusInput,
      notes: reviewNotesInput,
      assignedTo: "Preview Editor (News Desk)",
      createdBy: "Preview Editor (News Desk)",
      completedBy: "Preview Editor (News Desk)",
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };
    setReviews((prev) => [newReview, ...prev]);
    setActiveDialog(null);
    setPreviewBanner(
      `Preview state only — not saved: Simulated recording ${reviewTypeInput} (${reviewStatusInput}).`
    );
  }

  function simulateRequestChangesConfirm() {
    setWorkflowStatus("Draft");
    setActiveDialog(null);
    setPreviewBanner(
      `Preview state only — not saved: Simulated Request Changes -> returned to Draft ("${requestChangesReason}").`
    );
  }

  function simulateRestoreRevisionConfirm() {
    setTitle(pendingRestoreRevision.title ?? "");
    setBodyHtml(pendingRestoreRevision.bodyHtml ?? "");
    setLockVersion((v) => v + 1);
    setRevisions((prev) => [
      {
        id: `preview-rev-${Date.now()}`,
        storyId: selectedStoryId,
        revisionNumber: (prev[0]?.revisionNumber ?? 3) + 1,
        title: pendingRestoreRevision.title,
        bodyHtml: pendingRestoreRevision.bodyHtml,
        changeSummary: `Restored from Revision #${pendingRestoreRevision.revisionNumber} (Preview only)`,
        editorId: "00000000-0000-4000-8000-000000000201",
        createdAt: new Date().toISOString()
      },
      ...prev
    ]);
    setActiveDialog(null);
    setPreviewBanner(
      `Preview state only — not saved: Simulated restoring Revision #${pendingRestoreRevision.revisionNumber} (writes disabled).`
    );
  }

  function simulateWorkflowTransitionConfirm() {
    setWorkflowStatus(pendingWorkflowTarget);
    setActiveDialog(null);
    setPreviewBanner(
      `Preview state only — not saved: Simulated workflow transition to "${pendingWorkflowTarget}" (writes disabled).`
    );
  }

  function simulatePostDiscussionMessage() {
    if (!discussionDraft.trim()) return;
    const msg: PreviewDiscussionMessage = {
      id: `preview-msg-${Date.now()}`,
      authorLabel: "Preview Editor (News Desk)",
      roleBadge: "NEWS DESK",
      body: discussionDraft.trim(),
      createdAt: new Date().toISOString(),
      resolved: false
    };
    setDiscussionMessages((prev) => [...prev, msg]);
    setDiscussionDraft("");
    setPreviewBanner(
      "Preview state only — not saved: Simulated internal discussion comment (writes disabled)."
    );
  }

  return (
    <View style={styles.container} testID="owner-preview-story-workspace">
      {/* Story Selector Bar */}
      <View style={styles.selectorCard}>
        <View style={styles.selectorHeaderRow}>
          <Text style={styles.selectorTitle}>
            INSPECT SAMPLE STORY PACKAGE OR NEW STORY CREATION
          </Text>
          <Pressable
            style={[
              styles.newDraftButton,
              isNewDraftMode && styles.newDraftButtonActive
            ]}
            onPress={enterNewDraftPreview}
            testID="preview-workspace-new-draft-btn"
          >
            <Text style={styles.newDraftButtonText}>+ New Story Draft</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storyPillsRow}
        >
          {stories.map((story) => {
            const active = !isNewDraftMode && story.id === selectedStoryId;
            return (
              <Pressable
                key={story.id}
                style={[styles.storyPill, active && styles.storyPillActive]}
                onPress={() => selectStory(story.id)}
                testID={`preview-story-select-${story.id}`}
              >
                <Text
                  style={[
                    styles.storyPillStage,
                    active && styles.storyPillTextActive
                  ]}
                >
                  {resolveWorkflowStatus(story).toUpperCase()}
                </Text>
                <Text
                  style={[
                    styles.storyPillTitle,
                    active && styles.storyPillTextActive
                  ]}
                  numberOfLines={1}
                >
                  {story.title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Visual State & Dialog Simulator Bar (Section 16) */}
      <View style={styles.simulatorCard} testID="preview-workspace-simulator-bar">
        <Text style={styles.simulatorHeading}>
          INTERACTIVE WORKSPACE STATE & DIALOG SIMULATOR (PREVIEW ONLY — WRITES DISABLED)
        </Text>
        <View style={styles.simulatorRow}>
          <Text style={styles.simulatorLabel}>Save / Concurrency State:</Text>
          {(
            [
              { key: "saved", label: "Saved" },
              { key: "dirty", label: "Dirty (Unsaved Edits)" },
              { key: "saving", label: "Saving…" },
              { key: "autosaved", label: "Autosaved Snapshot" },
              { key: "conflict", label: "Version Conflict Warning" }
            ] as const
          ).map((item) => (
            <Pressable
              key={item.key}
              style={[
                styles.simChip,
                saveState === item.key && styles.simChipActive
              ]}
              onPress={() => {
                setSaveState(item.key);
                setPreviewBanner(
                  `Preview state only — not saved: Displaying "${item.label}" workspace state.`
                );
              }}
              testID={`preview-sim-state-${item.key}`}
            >
              <Text
                style={[
                  styles.simChipText,
                  saveState === item.key && styles.simChipTextActive
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.simulatorRow}>
          <Text style={styles.simulatorLabel}>Editorial Dialogs & Confirmations:</Text>
          <Pressable
            style={[
              styles.simChip,
              activeDialog === "record_review" && styles.simChipActive
            ]}
            onPress={() => setActiveDialog("record_review")}
            testID="preview-sim-dialog-record-review"
          >
            <Text style={styles.simChipText}>Record Review Dialog</Text>
          </Pressable>
          <Pressable
            style={[
              styles.simChip,
              activeDialog === "request_changes" && styles.simChipActive
            ]}
            onPress={() => setActiveDialog("request_changes")}
            testID="preview-sim-dialog-request-changes"
          >
            <Text style={styles.simChipText}>Request Changes Dialog</Text>
          </Pressable>
          <Pressable
            style={[
              styles.simChip,
              activeDialog === "restore_revision" && styles.simChipActive
            ]}
            onPress={() => {
              setPendingRestoreRevision(revisions[1] ?? revisions[0]!);
              setActiveDialog("restore_revision");
            }}
            testID="preview-sim-dialog-restore-revision"
          >
            <Text style={styles.simChipText}>Revision Restore Confirmation</Text>
          </Pressable>
          <Pressable
            style={[
              styles.simChip,
              activeDialog === "workflow_transition" && styles.simChipActive
            ]}
            onPress={() => {
              setPendingWorkflowTarget("Ready");
              setActiveDialog("workflow_transition");
            }}
            testID="preview-sim-dialog-workflow-transition"
          >
            <Text style={styles.simChipText}>Workflow Transition Confirmation</Text>
          </Pressable>
        </View>
      </View>

      {/* Active Save / Conflict / Preview Feedback Banner */}
      {previewBanner ? (
        <View style={styles.previewFeedbackBanner} testID="preview-workspace-banner">
          <Text style={styles.previewFeedbackText}>{previewBanner}</Text>
        </View>
      ) : null}

      {saveState === "conflict" ? (
        <View style={styles.conflictBanner} testID="preview-conflict-warning">
          <Text style={styles.conflictTitle}>
            OPTIMISTIC CONCURRENCY CONFLICT DETECTED (SIMULATED PREVIEW)
          </Text>
          <Text style={styles.conflictBody}>
            Server lockVersion (v{lockVersion + 1}) is ahead of your local draft
            lockVersion (v{lockVersion}). Reload the latest revision or inspect
            autosave snapshot before saving.
          </Text>
        </View>
      ) : null}

      {/* Simulated Modal / Confirmation Dialogs */}
      {activeDialog === "record_review" ? (
        <View style={styles.dialogCard} testID="preview-dialog-record-review">
          <Text style={styles.dialogTitle}>
            RECORD EDITORIAL REVIEW (PREVIEW SIMULATION)
          </Text>
          <Text style={styles.dialogSub}>
            Select review gate, outcome status, and structured review notes.
          </Text>
          <View style={styles.chipGroup}>
            {REVIEW_TYPES.map((rt) => (
              <Pressable
                key={rt}
                style={[
                  styles.optionPill,
                  reviewTypeInput === rt && styles.optionPillActive
                ]}
                onPress={() => setReviewTypeInput(rt)}
              >
                <Text
                  style={[
                    styles.optionPillText,
                    reviewTypeInput === rt && styles.optionPillTextActive
                  ]}
                >
                  {rt}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.chipGroup}>
            {REVIEW_STATUSES.map((st) => (
              <Pressable
                key={st}
                style={[
                  styles.optionPill,
                  reviewStatusInput === st && styles.optionPillActive
                ]}
                onPress={() => setReviewStatusInput(st)}
              >
                <Text
                  style={[
                    styles.optionPillText,
                    reviewStatusInput === st && styles.optionPillTextActive
                  ]}
                >
                  {st}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.textAreaSmall}
            value={reviewNotesInput}
            onChangeText={setReviewNotesInput}
            multiline
          />
          <View style={styles.dialogActionRow}>
            <Pressable
              style={styles.primaryActionBtn}
              onPress={simulateRecordReviewConfirm}
            >
              <Text style={styles.primaryActionBtnText}>
                Confirm Review Record (Preview Only)
              </Text>
            </Pressable>
            <Pressable
              style={styles.secondaryActionBtn}
              onPress={() => setActiveDialog(null)}
            >
              <Text style={styles.secondaryActionBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {activeDialog === "request_changes" ? (
        <View style={styles.dialogCard} testID="preview-dialog-request-changes">
          <Text style={styles.dialogTitle}>
            REQUEST CHANGES & RETURN TO REPORTER (PREVIEW SIMULATION)
          </Text>
          <Text style={styles.dialogSub}>
            Requires structured revision instructions and transitions workflow back to Draft.
          </Text>
          <TextInput
            style={styles.textAreaSmall}
            value={requestChangesReason}
            onChangeText={setRequestChangesReason}
            multiline
          />
          <View style={styles.dialogActionRow}>
            <Pressable
              style={styles.dangerActionBtn}
              onPress={simulateRequestChangesConfirm}
            >
              <Text style={styles.primaryActionBtnText}>
                Return Story for Changes (Preview Only)
              </Text>
            </Pressable>
            <Pressable
              style={styles.secondaryActionBtn}
              onPress={() => setActiveDialog(null)}
            >
              <Text style={styles.secondaryActionBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {activeDialog === "restore_revision" ? (
        <View style={styles.dialogCard} testID="preview-dialog-restore-revision">
          <Text style={styles.dialogTitle}>
            CONFIRM REVISION RESTORE (PREVIEW SIMULATION)
          </Text>
          <Text style={styles.dialogSub}>
            Restore Revision #{pendingRestoreRevision.revisionNumber} ("
            {pendingRestoreRevision.title}") — {pendingRestoreRevision.changeSummary}?
          </Text>
          <View style={styles.dialogActionRow}>
            <Pressable
              style={styles.primaryActionBtn}
              onPress={simulateRestoreRevisionConfirm}
            >
              <Text style={styles.primaryActionBtnText}>
                Restore Revision #{pendingRestoreRevision.revisionNumber} (Preview Only)
              </Text>
            </Pressable>
            <Pressable
              style={styles.secondaryActionBtn}
              onPress={() => setActiveDialog(null)}
            >
              <Text style={styles.secondaryActionBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {activeDialog === "workflow_transition" ? (
        <View style={styles.dialogCard} testID="preview-dialog-workflow-transition">
          <Text style={styles.dialogTitle}>
            CONFIRM WORKFLOW TRANSITION (PREVIEW SIMULATION)
          </Text>
          <Text style={styles.dialogSub}>
            Transition "{title}" from {workflowStatus} to {pendingWorkflowTarget}?
          </Text>
          <View style={styles.dialogActionRow}>
            <Pressable
              style={styles.primaryActionBtn}
              onPress={simulateWorkflowTransitionConfirm}
            >
              <Text style={styles.primaryActionBtnText}>
                Confirm Transition to {pendingWorkflowTarget} (Preview Only)
              </Text>
            </Pressable>
            <Pressable
              style={styles.secondaryActionBtn}
              onPress={() => setActiveDialog(null)}
            >
              <Text style={styles.secondaryActionBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Story Workspace Header & Status Strip */}
      <View style={styles.workspaceHeaderCard}>
        <View style={styles.workspaceTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.workspaceKicker}>
              CANONICAL STORY WORKSPACE · LOCK VERSION v{lockVersion} ·{" "}
              {isNewDraftMode ? "NEW DRAFT MODE" : `STORY ID ${selectedStoryId.slice(-4)}`}
            </Text>
            <Text style={styles.workspaceHeadline}>{title}</Text>
          </View>
          <View style={styles.statusBadgesCol}>
            <View style={styles.workflowBadge}>
              <Text style={styles.workflowBadgeText}>{workflowStatus}</Text>
            </View>
            <View
              style={[
                styles.saveBadge,
                saveState === "dirty" && styles.saveBadgeDirty,
                saveState === "conflict" && styles.saveBadgeConflict
              ]}
            >
              <Text style={styles.saveBadgeText}>
                {saveState === "saved"
                  ? "SAVED (PREVIEW)"
                  : saveState === "dirty"
                  ? "DIRTY · UNSAVED EDITS"
                  : saveState === "saving"
                  ? "SAVING DRAFT…"
                  : saveState === "autosaved"
                  ? `AUTOSAVED ${PREVIEW_STORY_AUTOSAVE.savedAt.slice(11, 16)} UTC`
                  : "CONFLICT DETECTED"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActionBar}>
          <Pressable
            style={styles.primaryActionBtn}
            onPress={simulateSaveDraft}
            testID="preview-save-draft-btn"
          >
            <Text style={styles.primaryActionBtnText}>
              Save Story Draft (Preview Only)
            </Text>
          </Pressable>
          <Pressable
            style={styles.secondaryActionBtn}
            onPress={() => {
              setSaveState("autosaved");
              setPreviewBanner(
                "Preview state only — not saved: Simulated autosave snapshot capture (writes disabled)."
              );
            }}
          >
            <Text style={styles.secondaryActionBtnText}>
              Trigger Autosave Snapshot
            </Text>
          </Pressable>
          <Pressable
            style={styles.secondaryActionBtn}
            onPress={() => {
              setPendingWorkflowTarget("Submitted");
              setActiveDialog("workflow_transition");
            }}
          >
            <Text style={styles.secondaryActionBtnText}>Submit for Review</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryActionBtn}
            onPress={() => setActiveDialog("record_review")}
          >
            <Text style={styles.secondaryActionBtnText}>Record Review</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryActionBtn}
            onPress={() => setActiveDialog("request_changes")}
          >
            <Text style={styles.secondaryActionBtnText}>Request Changes</Text>
          </Pressable>
        </View>

        {/* 6-Tab Bar */}
        <View style={styles.tabBar} testID="preview-workspace-tabs">
          {WORKSPACE_TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tabButton, active && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.key)}
                testID={`preview-workspace-tab-${tab.key}`}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    active && styles.tabButtonTextActive
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* TAB 1: WRITING */}
      {activeTab === "writing" ? (
        <View style={styles.tabPanel} testID="preview-tab-panel-writing">
          <Text style={styles.sectionHeading}>WRITING & PACKAGE COPY</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Headline / Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={(v) => handleFieldEdit(setTitle, v)}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Canonical Slug</Text>
            <TextInput
              style={styles.input}
              value={slug}
              onChangeText={(v) => handleFieldEdit(setSlug, v)}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Standfirst / Deck</Text>
            <TextInput
              style={styles.textAreaSmall}
              value={standfirst}
              onChangeText={(v) => handleFieldEdit(setStandfirst, v)}
              multiline
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Server Excerpt (Read-Only Server Authority)
            </Text>
            <View style={styles.readOnlyBox}>
              <Text style={styles.readOnlyText}>
                {currentStory.excerpt ??
                  "No server-generated excerpt yet (read-only field)."}
              </Text>
            </View>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Story Body (HTML / Rich Copy)</Text>
            <TextInput
              style={styles.textAreaLarge}
              value={bodyHtml}
              onChangeText={(v) => handleFieldEdit(setBodyHtml, v)}
              multiline
            />
          </View>
          <Text style={styles.sectionHeading}>SEARCH & METADATA</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>SEO Title</Text>
            <TextInput
              style={styles.input}
              value={seoTitle}
              onChangeText={(v) => handleFieldEdit(setSeoTitle, v)}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>SEO Description</Text>
            <TextInput
              style={styles.textAreaSmall}
              value={seoDescription}
              onChangeText={(v) => handleFieldEdit(setSeoDescription, v)}
              multiline
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Canonical URL Override</Text>
            <TextInput
              style={styles.input}
              value={canonicalUrl}
              onChangeText={(v) => handleFieldEdit(setCanonicalUrl, v)}
              placeholder="https://healthtimes.co.zw/..."
            />
          </View>
        </View>
      ) : null}

      {/* TAB 2: REPORTING */}
      {activeTab === "reporting" ? (
        <View style={styles.tabPanel} testID="preview-tab-panel-reporting">
          <Text style={styles.sectionHeading}>
            REPORTING PROVENANCE, DESK & SOURCING
          </Text>
          <View style={styles.twoColRow}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Newsroom Desk</Text>
              <TextInput
                style={styles.input}
                value={desk}
                onChangeText={(v) => handleFieldEdit(setDesk, v)}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Coverage Topic</Text>
              <TextInput
                style={styles.input}
                value={topic}
                onChangeText={(v) => handleFieldEdit(setTopic, v)}
              />
            </View>
          </View>
          <View style={styles.twoColRow}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Country</Text>
              <TextInput
                style={styles.input}
                value={country}
                onChangeText={(v) => handleFieldEdit(setCountry, v)}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Province / Region</Text>
              <TextInput
                style={styles.input}
                value={region}
                onChangeText={(v) => handleFieldEdit(setRegion, v)}
              />
            </View>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Editorial Deadline (ISO-8601)</Text>
            <TextInput
              style={styles.input}
              value={deadlineAt}
              onChangeText={(v) => handleFieldEdit(setDeadlineAt, v)}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Primary Source Notes & Evidence Log (Fact-Check Authority)
            </Text>
            <TextInput
              style={styles.textAreaLarge}
              value={sourceNotes}
              onChangeText={(v) => handleFieldEdit(setSourceNotes, v)}
              multiline
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Internal Editorial Notes</Text>
            <TextInput
              style={styles.textAreaSmall}
              value={internalNotes}
              onChangeText={(v) => handleFieldEdit(setInternalNotes, v)}
              multiline
            />
          </View>
        </View>
      ) : null}

      {/* TAB 3: EDITORIAL */}
      {activeTab === "editorial" ? (
        <View style={styles.tabPanel} testID="preview-tab-panel-editorial">
          <Text style={styles.sectionHeading}>
            PUBLIC BYLINE & PRIMARY SECTION
          </Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Public Byline Author</Text>
            <View style={styles.chipGroup}>
              {PREVIEW_PUBLIC_AUTHORS.map((author) => (
                <Pressable
                  key={author.id}
                  style={[
                    styles.optionPill,
                    authorId === author.id && styles.optionPillActive
                  ]}
                  onPress={() => handleFieldEdit(setAuthorId, author.id)}
                >
                  <Text
                    style={[
                      styles.optionPillText,
                      authorId === author.id && styles.optionPillTextActive
                    ]}
                  >
                    {author.displayName}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Primary Section</Text>
            <View style={styles.chipGroup}>
              {PREVIEW_SECTIONS.map((sec) => (
                <Pressable
                  key={sec.id}
                  style={[
                    styles.optionPill,
                    primarySectionId === sec.id && styles.optionPillActive
                  ]}
                  onPress={() => handleFieldEdit(setPrimarySectionId, sec.id)}
                >
                  <Text
                    style={[
                      styles.optionPillText,
                      primarySectionId === sec.id && styles.optionPillTextActive
                    ]}
                  >
                    {sec.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Text style={styles.sectionHeading}>
            NEWSROOM STAFF ASSIGNMENTS (SAMPLE STAFF PROFILES)
          </Text>
          {(
            [
              {
                label: "Story Owner (Reporter)",
                val: ownerStaffId,
                set: setOwnerStaffId
              },
              {
                label: "Assigned Desk Editor",
                val: assignedEditorStaffId,
                set: setAssignedEditorStaffId
              },
              {
                label: "Fact Checker",
                val: factCheckerStaffId,
                set: setFactCheckerStaffId
              },
              {
                label: "Health / Science Reviewer",
                val: healthReviewerStaffId,
                set: setHealthReviewerStaffId
              },
              {
                label: "Copy Editor",
                val: copyEditorStaffId,
                set: setCopyEditorStaffId
              }
            ] as const
          ).map((roleSlot) => (
            <View key={roleSlot.label} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{roleSlot.label}</Text>
              <View style={styles.chipGroup}>
                {PREVIEW_STAFF_DIRECTORY.map((staff) => (
                  <Pressable
                    key={staff.id}
                    style={[
                      styles.optionPill,
                      roleSlot.val === staff.id && styles.optionPillActive
                    ]}
                    onPress={() => handleFieldEdit(roleSlot.set, staff.id)}
                  >
                    <Text
                      style={[
                        styles.optionPillText,
                        roleSlot.val === staff.id && styles.optionPillTextActive
                      ]}
                    >
                      {staff.displayName}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          <Text style={styles.sectionHeading}>
            CANONICAL WORKFLOW STAGE TRANSITIONS (PREVIEW SIMULATION)
          </Text>
          <View style={styles.chipGroup}>
            {WORKFLOW_STATES.map((stage) => (
              <Pressable
                key={stage}
                style={[
                  styles.optionPill,
                  workflowStatus === stage && styles.optionPillActive
                ]}
                onPress={() => {
                  setPendingWorkflowTarget(stage);
                  setActiveDialog("workflow_transition");
                }}
              >
                <Text
                  style={[
                    styles.optionPillText,
                    workflowStatus === stage && styles.optionPillTextActive
                  ]}
                >
                  {stage}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* TAB 4: PUBLICATION */}
      {activeTab === "publication" ? (
        <View style={styles.tabPanel} testID="preview-tab-panel-publication">
          <Text style={styles.sectionHeading}>
            PUBLICATION & ACCESS AUTHORITY
          </Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Reader Access Policy</Text>
            <View style={styles.chipGroup}>
              {(["public", "premium"] as const).map((pol) => (
                <Pressable
                  key={pol}
                  style={[
                    styles.optionPill,
                    accessPolicy === pol && styles.optionPillActive
                  ]}
                  onPress={() => handleFieldEdit(setAccessPolicy, pol)}
                >
                  <Text
                    style={[
                      styles.optionPillText,
                      accessPolicy === pol && styles.optionPillTextActive
                    ]}
                  >
                    {pol.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Scheduled Publication Timestamp (ISO-8601)
            </Text>
            <TextInput
              style={styles.input}
              value={scheduledAt}
              onChangeText={(v) => handleFieldEdit(setScheduledAt, v)}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Advertising Context Policy</Text>
            <TextInput
              style={styles.input}
              value={adSetting}
              onChangeText={(v) => handleFieldEdit(setAdSetting, v)}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Distribution Channels</Text>
            <View style={styles.chipGroup}>
              <Pressable
                style={[
                  styles.optionPill,
                  distPublicReader && styles.optionPillActive
                ]}
                onPress={() =>
                  handleFieldEdit(setDistPublicReader, !distPublicReader)
                }
              >
                <Text
                  style={[
                    styles.optionPillText,
                    distPublicReader && styles.optionPillTextActive
                  ]}
                >
                  Public Reader Feed: {distPublicReader ? "ON" : "OFF"}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.optionPill,
                  distNewsletter && styles.optionPillActive
                ]}
                onPress={() =>
                  handleFieldEdit(setDistNewsletter, !distNewsletter)
                }
              >
                <Text
                  style={[
                    styles.optionPillText,
                    distNewsletter && styles.optionPillTextActive
                  ]}
                >
                  Newsletter Brief: {distNewsletter ? "ON" : "OFF"}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Reader Comment Policy (Canonical Gate: Editable on Published Stories)
            </Text>
            <View style={styles.chipGroup}>
              {(["disabled", "read_only", "open"] as const).map((cp) => (
                <Pressable
                  key={cp}
                  style={[
                    styles.optionPill,
                    commentPolicy === cp && styles.optionPillActive
                  ]}
                  onPress={() => {
                    setCommentPolicy(cp);
                    setPreviewBanner(
                      `Preview state only — not saved: Simulated comment policy "${cp}" (writes disabled).`
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.optionPillText,
                      commentPolicy === cp && styles.optionPillTextActive
                    ]}
                  >
                    {cp.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.headerActionBar}>
            <Pressable
              style={styles.primaryActionBtn}
              onPress={() => {
                setWorkflowStatus("Published");
                setPreviewBanner(
                  "Preview state only — not saved: Simulated Publish Now transition (writes disabled)."
                );
              }}
            >
              <Text style={styles.primaryActionBtnText}>
                Publish Story Now (Preview Only)
              </Text>
            </Pressable>
            <Pressable
              style={styles.secondaryActionBtn}
              onPress={() => {
                setWorkflowStatus("Scheduled");
                setPreviewBanner(
                  `Preview state only — not saved: Simulated Schedule Publish for ${scheduledAt} (writes disabled).`
                );
              }}
            >
              <Text style={styles.secondaryActionBtnText}>
                Schedule Publication (Preview Only)
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* TAB 5: HISTORY */}
      {activeTab === "history" ? (
        <View style={styles.tabPanel} testID="preview-tab-panel-history">
          <Text style={styles.sectionHeading}>
            LATEST AUTOSAVE SNAPSHOT (PREVIEW DATA)
          </Text>
          <View style={styles.historyCard}>
            <Text style={styles.historyCardTitle}>
              Autosave Lock v{PREVIEW_STORY_AUTOSAVE.lockVersion} · Saved by{" "}
              {PREVIEW_STORY_AUTOSAVE.savedBy} at {PREVIEW_STORY_AUTOSAVE.savedAt}
            </Text>
            <Text style={styles.historyCardSub}>
              {PREVIEW_STORY_AUTOSAVE.standfirst}
            </Text>
          </View>

          <Text style={styles.sectionHeading}>
            REVISION HISTORY & RESTORE (PREVIEW DATA)
          </Text>
          {revisions.map((rev) => (
            <View key={rev.id} style={styles.historyCard}>
              <View style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyCardTitle}>
                    Revision #{rev.revisionNumber} — {rev.title}
                  </Text>
                  <Text style={styles.historyCardSub}>
                    {rev.changeSummary} · {rev.createdAt}
                  </Text>
                </View>
                <Pressable
                  style={styles.secondaryActionBtn}
                  onPress={() => {
                    setPendingRestoreRevision(rev);
                    setActiveDialog("restore_revision");
                  }}
                >
                  <Text style={styles.secondaryActionBtnText}>
                    Restore Revision #{rev.revisionNumber}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}

          <Text style={styles.sectionHeading}>
            EDITORIAL REVIEW RECORDS (FACT CHECK / CLINICAL / COPY / EDITOR)
          </Text>
          {reviews.map((rev) => (
            <View key={rev.id} style={styles.historyCard}>
              <Text style={styles.historyCardTitle}>
                [{rev.reviewType.toUpperCase()}] Status: {rev.status.toUpperCase()} ·{" "}
                Assigned: {rev.assignedTo}
              </Text>
              <Text style={styles.historyCardSub}>{rev.notes}</Text>
            </View>
          ))}

          <Text style={styles.sectionHeading}>
            POST-PUBLICATION CORRECTIONS LOG
          </Text>
          {corrections.map((corr) => (
            <View key={corr.id} style={styles.historyCard}>
              <Text style={styles.historyCardTitle}>
                [CORRECTION] {corr.changedBy} · {corr.changedAt}
              </Text>
              <Text style={styles.historyCardSub}>{corr.reason}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* TAB 6: DISCUSSION */}
      {activeTab === "discussion" ? (
        <View style={styles.tabPanel} testID="preview-tab-panel-discussion">
          <Text style={styles.sectionHeading}>
            INTERNAL EDITORIAL STORY DISCUSSION (PREVIEW DATA)
          </Text>
          {discussionMessages.map((msg) => (
            <View key={msg.id} style={styles.historyCard}>
              <Text style={styles.historyCardTitle}>
                {msg.authorLabel} ({msg.roleBadge}) ·{" "}
                {msg.createdAt.slice(0, 16).replace("T", " ")} UTC
              </Text>
              <Text style={styles.historyCardSub}>{msg.body}</Text>
            </View>
          ))}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Add Internal Editorial Note (Preview Simulation Only)
            </Text>
            <TextInput
              style={styles.textAreaSmall}
              value={discussionDraft}
              onChangeText={setDiscussionDraft}
              placeholder="Write an internal note for the desk..."
              multiline
            />
            <Pressable
              style={[styles.primaryActionBtn, { alignSelf: "flex-start" }]}
              onPress={simulatePostDiscussionMessage}
            >
              <Text style={styles.primaryActionBtnText}>
                Post Internal Comment (Preview Only)
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14
  },
  selectorCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    gap: 10
  },
  selectorHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8
  },
  selectorTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.inkMuted
  },
  newDraftButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border
  },
  newDraftButtonActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy
  },
  newDraftButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink
  },
  storyPillsRow: {
    gap: 8,
    paddingVertical: 2
  },
  storyPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paperMuted,
    maxWidth: 260,
    gap: 2
  },
  storyPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy
  },
  storyPillStage: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.live
  },
  storyPillTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink
  },
  storyPillTextActive: {
    color: "#FFFFFF"
  },
  simulatorCard: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 10,
    padding: 12,
    gap: 8
  },
  simulatorHeading: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: "#92400E"
  },
  simulatorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6
  },
  simulatorLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#78350F",
    marginRight: 4
  },
  simChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FCD34D"
  },
  simChipActive: {
    backgroundColor: "#B45309",
    borderColor: "#B45309"
  },
  simChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#78350F"
  },
  simChipTextActive: {
    color: "#FFFFFF"
  },
  previewFeedbackBanner: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#93C5FD",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  previewFeedbackText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E3A8A"
  },
  conflictBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#F87171",
    borderRadius: 8,
    padding: 12,
    gap: 4
  },
  conflictTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#991B1B"
  },
  conflictBody: {
    fontSize: 12,
    color: "#7F1D1D"
  },
  dialogCard: {
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.navy,
    borderRadius: 10,
    padding: 16,
    gap: 10
  },
  dialogTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.navy
  },
  dialogSub: {
    fontSize: 12,
    color: colors.inkMuted
  },
  dialogActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4
  },
  workspaceHeaderCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 16,
    gap: 12
  },
  workspaceTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 12
  },
  workspaceKicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: colors.inkMuted,
    marginBottom: 4
  },
  workspaceHeadline: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.ink
  },
  statusBadgesCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  workflowBadge: {
    backgroundColor: colors.navy,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  workflowBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  saveBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  saveBadgeDirty: {
    backgroundColor: "#FEF3C7"
  },
  saveBadgeConflict: {
    backgroundColor: "#FEE2E2"
  },
  saveBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1F2937"
  },
  headerActionBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  primaryActionBtn: {
    backgroundColor: colors.live,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6
  },
  dangerActionBtn: {
    backgroundColor: "#B91C1C",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6
  },
  primaryActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },
  secondaryActionBtn: {
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6
  },
  secondaryActionBtnText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700"
  },
  tabBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border
  },
  tabButtonActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkMuted
  },
  tabButtonTextActive: {
    color: "#FFFFFF"
  },
  tabPanel: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 16,
    gap: 14
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.navy,
    marginTop: 4
  },
  fieldGroup: {
    gap: 6
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkMuted
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.paperMuted
  },
  textAreaSmall: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    minHeight: 68,
    color: colors.ink,
    backgroundColor: colors.paperMuted
  },
  textAreaLarge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 130,
    color: colors.ink,
    backgroundColor: colors.paperMuted
  },
  readOnlyBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.paperMuted
  },
  readOnlyText: {
    fontSize: 12,
    color: colors.inkMuted,
    fontStyle: "italic"
  },
  twoColRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  optionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paperMuted
  },
  optionPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy
  },
  optionPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink
  },
  optionPillTextActive: {
    color: "#FFFFFF"
  },
  historyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.paperMuted,
    gap: 4
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8
  },
  historyCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink
  },
  historyCardSub: {
    fontSize: 12,
    color: colors.inkMuted
  }
});
