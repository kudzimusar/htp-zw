import { useEffect, useState, useRef, useMemo, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { services } from "../services";
import { useAsync } from "../hooks/useAsync";
import { hasServerCapability, type HealthTimesCapability } from "../security/capabilities";
import type {
  CreateStoryInput,
  NewsroomPublicAuthor,
  NewsroomSection,
  NewsroomStory,
  NewsroomStoryAutosave,
  NewsroomStoryCorrection,
  NewsroomStoryReview,
  NewsroomStoryRevision,
  SaveStoryPatch
} from "../domain/models";
import { colors, radius, spacing } from "../theme/tokens";
import { StudioStoryDiscussionPanel } from "./StudioCommunications";
import { StudioStoryMediaPanel } from "./StudioStoryMedia";

export const STORY_WORKSPACE_TABS = [
  ["writing", "Writing"],
  ["reporting", "Reporting & Desk"],
  ["editorial", "Editorial & Review"],
  ["media", "Media & Attachments"],
  ["publication", "Publication & SEO"],
  ["history", "History & Revisions"],
  ["discussion", "Internal Notes & Desk"]
] as const;

export type TabId = (typeof STORY_WORKSPACE_TABS)[number][0];

type Props = {
  storyId?: string;
  discussionSlot?: ReactNode;
  mediaSlot?: ReactNode;
};

const REVIEW_STATUSES = ["completed", "approved", "changes_requested"] as const;

export function StudioStoryWorkspace({
  storyId: propStoryId,
  discussionSlot,
  mediaSlot: propMediaSlot
}: Props) {
  const router = useRouter();
  const [storyId, setStoryId] = useState<string | null>(propStoryId ?? null);
  const [activeTab, setActiveTab] = useState<TabId>("writing");

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [story, setStory] = useState<NewsroomStory | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [standfirst, setStandfirst] = useState("");
  const [body, setBody] = useState("");
  const [desk, setDesk] = useState("");
  const [topic, setTopic] = useState("");
  const [country, setCountry] = useState("Zimbabwe");
  const [region, setRegion] = useState("");
  const [sourceNotes, setSourceNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [authorId, setAuthorId] = useState<string>("");
  const [primarySectionId, setPrimarySectionId] = useState<string>("");
  const [accessPolicy, setAccessPolicy] = useState<string>("public");
  const [commentPolicy, setCommentPolicy] = useState<string>("disabled");
  const [distributionPublicReader, setDistributionPublicReader] = useState<boolean>(false);
  const [adSetting, setAdSetting] = useState<string>("Standard");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  // Concurrency & Autosave state
  const [expectedVersion, setExpectedVersion] = useState<number>(1);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "autosaving" | "saved" | "conflict" | "error"
  >("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Modal / Prompt states
  const [promptAction, setPromptAction] = useState<"requestChanges" | "correction" | "recordReview" | null>(null);
  const [promptReason, setPromptReason] = useState("");
  const [reviewType, setReviewType] = useState("");
  const [reviewOutcome, setReviewOutcome] = useState<"completed" | "approved" | "changes_requested">("completed");
  const [reviewNotes, setReviewNotes] = useState("");
  const [confirmRestoreRev, setConfirmRestoreRev] = useState<NewsroomStoryRevision | null>(null);

  // History states
  const [revisions, setRevisions] = useState<NewsroomStoryRevision[]>([]);
  const [autosave, setAutosave] = useState<NewsroomStoryAutosave | null>(null);
  const [reviews, setReviews] = useState<NewsroomStoryReview[]>([]);
  const [corrections, setCorrections] = useState<NewsroomStoryCorrection[]>([]);

  // Metadata dropdowns
  const [authors, setAuthors] = useState<NewsroomPublicAuthor[]>([]);
  const [sections, setSections] = useState<NewsroomSection[]>([]);

  // Auth snapshot
  const authAsync = useAsync(() => services.authorization.getSnapshot(), []);
  const auth = authAsync.data;
  const hasCap = (cap: HealthTimesCapability) =>
    auth ? hasServerCapability(auth, cap) : false;

  const canCreate = hasCap("story.create");
  const canEditOwn = hasCap("story.edit_own");
  const canEditAll = hasCap("story.edit_all");
  const canEditStory = canEditAll || canEditOwn;
  const isReadOnly = Boolean(storyId && !canEditStory);

  const canPublish = hasCap("story.publish");
  const canSubmit = hasCap("story.submit");
  const canFactCheck = hasCap("story.fact_check");
  const canHealthReview = hasCap("story.health_review");
  const canCopyEdit = hasCap("story.copy_edit");
  const canCorrect = hasCap("story.correct");
  const canManagePremium = hasCap("premium.assign") || hasCap("premium.manage");
  const canManageDistribution = hasCap("distribution.manage") || hasCap("story.edit_all");
  const canManageAdSetting = hasCap("story.edit_all");
  const canSchedule = hasCap("story.publish");
  const canConfigureComments = hasCap("comment.configure");
  const canRequestChanges = canEditAll || canFactCheck || canHealthReview || canCopyEdit || canPublish;

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRevisionRef = useRef(0);
  const lastSaveHadNewerEditsRef = useRef(false);

  // Load auxiliary data
  useEffect(() => {
    services.newsroomStories
      .listAuthors()
      .then(setAuthors)
      .catch(() => {});
    services.newsroomStories
      .listSections()
      .then(setSections)
      .catch(() => {});
  }, []);

  // Load Story
  const loadStory = async (id: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await services.newsroomStories.getStory(id);
      if (!data) {
        setLoadError("Story not found on server.");
        return;
      }
      setStory(data);
      setExpectedVersion(data.lockVersion);
      setTitle(data.title);
      setSlug(data.slug);
      setStandfirst(data.standfirst ?? "");
      setBody(data.bodyHtml ?? "");
      setDesk(data.desk ?? "");
      setTopic(data.topic ?? "");
      setCountry(data.country ?? "Zimbabwe");
      setRegion(data.region ?? "");
      setSourceNotes(data.sourceNotes ?? "");
      setInternalNotes(data.internalNotes ?? "");
      setDeadlineAt(data.deadlineAt ?? "");
      setAuthorId(data.authorId ?? "");
      setPrimarySectionId(data.primarySectionId ?? "");
      setAccessPolicy(data.accessPolicy ?? "public");
      setCommentPolicy(data.commentPolicy ?? "disabled");
      setDistributionPublicReader(Boolean(data.distribution?.public_reader));
      setAdSetting(data.adSetting ?? "Standard");
      setSeoTitle(data.seoTitle ?? "");
      setSeoDescription(data.seoDescription ?? "");
      setScheduledAt(data.scheduledAt ?? "");
      dirtyRevisionRef.current = 0;
      setIsDirty(false);
      setSaveStatus("saved");
      refreshHistory(id);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load story.");
    } finally {
      setLoading(false);
    }
  };

  const refreshHistory = async (id: string) => {
    try {
      const [revs, auto, revws, corrs] = await Promise.all([
        services.newsroomStories.listRevisions(id),
        services.newsroomStories.listAutosave(id),
        services.newsroomStories.listReviews(id),
        services.newsroomStories.listCorrections(id)
      ]);
      setRevisions(revs);
      setAutosave(auto);
      setReviews(revws);
      setCorrections(corrs);
    } catch {
      // non-fatal history loading
    }
  };

  useEffect(() => {
    if (storyId) {
      void loadStory(storyId);
    } else {
      dirtyRevisionRef.current = 0;
      setIsDirty(false);
      setSaveStatus("idle");
    }
  }, [storyId]);

  // Build patch for existing story saves
  const buildPatch = (): SaveStoryPatch => {
    const p: SaveStoryPatch = {
      title,
      slug: slug || undefined,
      standfirst: standfirst || null,
      body: body || null,
      desk: desk || null,
      topic: topic || null,
      country: country || null,
      region: region || null,
      sources: sourceNotes || null,
      notes: internalNotes || null,
      deadline_at: deadlineAt || null,
      primary_section_id: primarySectionId || null,
      seo_title: seoTitle || null,
      seo_description: seoDescription || null
    };

    if (canEditAll) {
      p.author_id = authorId || null;
    }

    if (canManagePremium) {
      p.access_policy = accessPolicy;
    }

    if (canManageDistribution) {
      p.distribution = {
        ...(story?.distribution ?? {}),
        public_reader: distributionPublicReader
      };
    }

    if (canManageAdSetting) {
      p.ad_setting = adSetting;
    }

    if (canSchedule) {
      p.scheduled_at = scheduledAt || null;
    }

    return p;
  };

  // Perform Save internally (returns true on success)
  const saveStoryInternal = async (reason = "Manual save"): Promise<boolean> => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    if (!storyId || isReadOnly) return false;

    const isAuto = reason.toLowerCase() === "autosave";
    const savingRevision = dirtyRevisionRef.current;

    setSaveStatus(isAuto ? "autosaving" : "saving");
    setStatusMessage(isAuto ? "Autosaving…" : "Saving changes…");

    try {
      const patch = buildPatch();
      const newVersion = await services.newsroomStories.saveStory(
        storyId,
        expectedVersion,
        patch,
        reason
      );
      setExpectedVersion(newVersion);

      if (story) {
        setStory({
          ...story,
          title,
          slug: slug || story.slug,
          standfirst: standfirst || null,
          bodyHtml: body || null,
          desk: desk || null,
          topic: topic || null,
          country: country || null,
          region: region || null,
          sourceNotes: sourceNotes || null,
          internalNotes: internalNotes || null,
          deadlineAt: deadlineAt || null,
          authorId: canEditAll ? (authorId || null) : story.authorId,
          primarySectionId: primarySectionId || null,
          accessPolicy: canManagePremium ? accessPolicy : story.accessPolicy,
          distribution: canManageDistribution
            ? { ...(story.distribution ?? {}), public_reader: distributionPublicReader }
            : story.distribution,
          adSetting: canManageAdSetting ? adSetting : story.adSetting,
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null,
          scheduledAt: canSchedule ? (scheduledAt || null) : story.scheduledAt,
          lockVersion: newVersion
        });
      }

      const currentGenerationPersisted = dirtyRevisionRef.current === savingRevision;
      lastSaveHadNewerEditsRef.current = !currentGenerationPersisted;

      if (dirtyRevisionRef.current === savingRevision) {
        setIsDirty(false);
        setSaveStatus("saved");
        setStatusMessage(isAuto ? "Autosaved." : "Changes saved.");
        void refreshHistory(storyId);
        return true;
      } else {
        setIsDirty(true);
        setSaveStatus("idle");
        setStatusMessage("Earlier changes saved; newer edits pending.");
        void refreshHistory(storyId);
        return false;
      }
    } catch (err: any) {
      lastSaveHadNewerEditsRef.current = false;
      if (err.message && err.message.includes("VERSION_CONFLICT")) {
        setSaveStatus("conflict");
        setStatusMessage(
          `VERSION CONFLICT: Another staff member or session updated this story (expected v${expectedVersion}). Please reload to inspect server content.`
        );
      } else {
        setSaveStatus("error");
        setStatusMessage(err.message || "Save failed.");
      }
      return false;
    }
  };

  // User-invoked Save / Create handler
  const handleSave = async (reason = "Manual save") => {
    if (!storyId) {
      if (!canCreate) {
        setStatusMessage("Creation authority required: story.create.");
        return;
      }
      setSaveStatus("saving");
      setStatusMessage("Creating new story on server…");
      try {
        const createInput: CreateStoryInput = {
          title: title || "Untitled story",
          slug: slug || null,
          standfirst: standfirst || null,
          body: body || null,
          desk: desk || null,
          topic: topic || null,
          country: country || null,
          region: region || null,
          sources: sourceNotes || null,
          notes: internalNotes || null,
          deadline_at: deadlineAt || null,
          primary_section_id: primarySectionId || null,
          seo_title: seoTitle || null,
          seo_description: seoDescription || null
        };
        if (canEditAll && authorId && authorId.trim()) {
          createInput.author_id = authorId.trim();
        }

        const newId = await services.newsroomStories.createStory(createInput);
        setStoryId(newId);
        dirtyRevisionRef.current = 0;
        setIsDirty(false);
        setSaveStatus("saved");
        setStatusMessage("Story created.");
        router.setParams({ storyId: newId });
        await loadStory(newId);
      } catch (err: any) {
        setSaveStatus("error");
        setStatusMessage(err.message || "Failed to create story.");
      }
      return;
    }

    await saveStoryInternal(reason);
  };

  // Debounced Autosave (~10 seconds)
  useEffect(() => {
    if (
      !isDirty ||
      !storyId ||
      isReadOnly ||
      saveStatus === "saving" ||
      saveStatus === "autosaving" ||
      saveStatus === "conflict"
    ) {
      return;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      void saveStoryInternal("Autosave");
    }, 10000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    isDirty,
    storyId,
    isReadOnly,
    title,
    slug,
    standfirst,
    body,
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
    distributionPublicReader,
    adSetting,
    seoTitle,
    seoDescription,
    scheduledAt
  ]);

  const markDirty = () => {
    if (isReadOnly) return;
    dirtyRevisionRef.current += 1;
    setIsDirty(true);
    if (saveStatus === "saved") {
      setSaveStatus("idle");
    }
  };

  // Dedicated Comment Policy Handler
  const isPublished = (story?.status ?? "").toLowerCase() === "publish" || (story?.status ?? "").toLowerCase() === "published";
  const isPublicStory = (story?.accessPolicy ?? "").toLowerCase() === "public";
  const canEnableComments = isPublished && isPublicStory;

  const handleSetCommentPolicy = async (nextPolicy: "disabled" | "read_only" | "open") => {
    if (!storyId || !canConfigureComments || isReadOnly) return;
    if (isDirty || saveStatus === "saving" || saveStatus === "autosaving" || saveStatus === "conflict") {
      setStatusMessage("Save pending story changes before changing reader comment policy.");
      return;
    }
    if (nextPolicy !== "disabled" && !canEnableComments) {
      setStatusMessage("Comments can only be enabled on published public stories.");
      return;
    }
    setLoading(true);
    try {
      const updated = await services.newsroomStories.setCommentPolicy(storyId, nextPolicy);
      setCommentPolicy(updated);
      if (story) {
        setStory({ ...story, commentPolicy: updated });
      }
      setStatusMessage(`Comment policy set to ${updated}.`);
    } catch (err: any) {
      setStatusMessage(err.message || "Failed to update comment policy.");
    } finally {
      setLoading(false);
    }
  };

  // Workflow transition
  const handleTransition = async (nextStatus: string, reason?: string) => {
    if (!storyId) return;
    if (nextStatus === "Scheduled") {
      const validSchedule = scheduledAt.trim() !== "" && !Number.isNaN(Date.parse(scheduledAt));
      if (!validSchedule) {
        setStatusMessage("A valid publication date and time is required to schedule publication.");
        return;
      }
    }
    if (isDirty) {
      setStatusMessage("Saving unsaved edits before transition…");
      const saved = await saveStoryInternal("Manual save");
      if (!saved) {
        if (lastSaveHadNewerEditsRef.current) {
          setStatusMessage("Newer edits appeared while saving. Save the latest changes before changing workflow state.");
        }
        return;
      }
    }
    setLoading(true);
    setStatusMessage(`Transitioning story to ${nextStatus}…`);
    try {
      await services.newsroomStories.transitionStory(storyId, nextStatus, reason);
      await loadStory(storyId);
      setStatusMessage(`Status updated to ${nextStatus}.`);
    } catch (err: any) {
      setStatusMessage(err.message || `Failed to transition story to ${nextStatus}.`);
    } finally {
      setLoading(false);
    }
  };

  // Restore Revision Execution
  const executeRestoreRevision = async () => {
    if (!storyId || !confirmRestoreRev) return;
    if (isDirty) {
      setStatusMessage("Unsaved edits exist. Save or reload before restoring a revision.");
      return;
    }
    setLoading(true);
    setStatusMessage(`Restoring revision #${confirmRestoreRev.revisionNumber}…`);
    try {
      const newVersion = await services.newsroomStories.restoreRevision(
        storyId,
        confirmRestoreRev.id,
        expectedVersion
      );
      setExpectedVersion(newVersion);
      setConfirmRestoreRev(null);
      setStatusMessage(`Revision #${confirmRestoreRev.revisionNumber} restored.`);
      await loadStory(storyId);
    } catch (err: any) {
      if (err.message && err.message.includes("VERSION_CONFLICT")) {
        setSaveStatus("conflict");
        setStatusMessage("VERSION CONFLICT: Reload story before restoring revision.");
      } else {
        setStatusMessage(err.message || "Failed to restore revision.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Request changes execution
  const executeRequestChanges = async () => {
    if (!storyId || !promptReason.trim() || !canRequestChanges) return;
    if (isDirty) {
      setStatusMessage("Saving unsaved edits before requesting changes…");
      const saved = await saveStoryInternal("Manual save");
      if (!saved) {
        if (lastSaveHadNewerEditsRef.current) {
          setStatusMessage("Newer edits appeared while saving. Save the latest changes before requesting changes.");
        }
        return;
      }
    }
    setLoading(true);
    try {
      await services.newsroomStories.requestChanges(storyId, promptReason.trim());
      setPromptAction(null);
      setPromptReason("");
      await loadStory(storyId);
      setStatusMessage("Changes requested. Story returned to Draft.");
    } catch (err: any) {
      setStatusMessage(err.message || "Failed to request changes.");
    } finally {
      setLoading(false);
    }
  };

  // Available review types based on server capabilities
  const availableReviewTypes = useMemo(() => {
    const list: Array<{ type: string; label: string; cap: HealthTimesCapability }> = [];
    if (canFactCheck) list.push({ type: "fact_check", label: "Fact Check", cap: "story.fact_check" });
    if (canHealthReview) list.push({ type: "health_review", label: "Health / Science Review", cap: "story.health_review" });
    if (canCopyEdit) list.push({ type: "copy_edit", label: "Copy Edit", cap: "story.copy_edit" });
    if (canEditAll) list.push({ type: "editor_review", label: "Editor Review", cap: "story.edit_all" });
    return list;
  }, [canFactCheck, canHealthReview, canCopyEdit, canEditAll]);

  const handleOpenRecordReview = () => {
    const first = availableReviewTypes[0];
    if (!first) return;
    setReviewType(first.type);
    setPromptAction("recordReview");
  };

  // Record review execution
  const executeRecordReview = async () => {
    if (!storyId || availableReviewTypes.length === 0) return;
    const isAuthorizedType = availableReviewTypes.some((item) => item.type === reviewType);
    if (!isAuthorizedType) {
      setStatusMessage("Unauthorized review type. Please select an authorized review category.");
      return;
    }
    if (isDirty) {
      setStatusMessage("Saving unsaved edits before recording review…");
      const saved = await saveStoryInternal("Manual save");
      if (!saved) {
        if (lastSaveHadNewerEditsRef.current) {
          setStatusMessage("Newer edits appeared while saving. Save the latest changes before recording review.");
        }
        return;
      }
    }
    setLoading(true);
    try {
      await services.newsroomStories.recordReview(
        storyId,
        reviewType,
        reviewOutcome,
        reviewNotes.trim() || null
      );
      setPromptAction(null);
      setReviewNotes("");
      await refreshHistory(storyId);
      setStatusMessage("Review record saved.");
    } catch (err: any) {
      setStatusMessage(err.message || "Failed to record review.");
    } finally {
      setLoading(false);
    }
  };

  // Publish correction execution
  const executeCorrection = async () => {
    if (!storyId || !promptReason.trim()) return;
    setPromptAction(null);
    await handleTransition("Updated / Corrected", promptReason.trim());
    setPromptReason("");
  };

  const currentWorkflowStatus = story?.workflowStatus ?? "Draft";

  // Allowed transitions calculation
  const transitionOptions = useMemo(() => {
    const opts: Array<{ label: string; status: string; allowed: boolean }> = [];
    const cur = currentWorkflowStatus;

    if (["Pitch", "Approved", "Assigned", "Reporting", "Draft"].includes(cur)) {
      opts.push({ label: "Submit for Review", status: "Submitted", allowed: canSubmit && canEditStory });
    }
    if (["Submitted", "Fact check"].includes(cur)) {
      opts.push({ label: "Send to Fact Check", status: "Fact check", allowed: canFactCheck });
    }
    if (["Fact check", "Health / Science review"].includes(cur)) {
      opts.push({ label: "Send to Health Review", status: "Health / Science review", allowed: canHealthReview });
    }
    if (["Health / Science review", "Copy edit"].includes(cur)) {
      opts.push({ label: "Send to Copy Edit", status: "Copy edit", allowed: canCopyEdit });
    }
    if (["Copy edit", "Editor review"].includes(cur)) {
      opts.push({ label: "Send to Editor Review", status: "Editor review", allowed: canEditAll || canCopyEdit });
    }
    if (["Editor review", "Ready"].includes(cur)) {
      opts.push({ label: "Mark as Ready", status: "Ready", allowed: canEditAll });
    }
    const hasValidSchedule = scheduledAt.trim() !== "" && !Number.isNaN(Date.parse(scheduledAt));
    if (["Ready", "Scheduled"].includes(cur)) {
      opts.push({ label: "Publish Now", status: "Published", allowed: canPublish });
      opts.push({ label: "Schedule Publication", status: "Scheduled", allowed: canPublish && hasValidSchedule });
    }
    if (cur !== "Published") {
      opts.push({ label: "Archive Story", status: "Archived", allowed: canEditAll });
    }

    return opts;
  }, [currentWorkflowStatus, canSubmit, canEditStory, canFactCheck, canHealthReview, canCopyEdit, canEditAll, canPublish, scheduledAt]);

  // Fail-closed gate for new story creation without story.create capability
  if (!storyId && auth && !canCreate) {
    return (
      <View style={styles.permissionBox}>
        <Text style={styles.permissionTitle}>Creation Authority Required</Text>
        <Text style={styles.permissionText}>
          You do not have server authorization to create newsroom stories. Required capability: story.create.
        </Text>
        <Pressable
          style={styles.backButton}
          onPress={() => router.push("/studio/stories" as never)}
        >
          <Text style={styles.backButtonText}>← Return to Stories</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <StudioStoryWorkspaceView
      storyId={storyId}
      story={story}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      loading={loading}
      isReadOnly={isReadOnly}
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
      authors={authors}
      sections={sections}
      revisions={revisions}
      autosave={autosave}
      reviews={reviews}
      corrections={corrections}
      canEditAll={canEditAll}
      canManagePremium={canManagePremium}
      canManageDistribution={canManageDistribution}
      canManageAdSetting={canManageAdSetting}
      canSchedule={canSchedule}
      canConfigureComments={canConfigureComments}
      canEnableComments={canEnableComments}
      canRequestChanges={canRequestChanges}
      canCorrect={canCorrect}
      currentWorkflowStatus={currentWorkflowStatus}
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
      onBackToStories={() => router.push("/studio/stories" as never)}
      discussionSlot={discussionSlot}
      mediaSlot={
        propMediaSlot ??
        (storyId ? (
          <StudioStoryMediaPanel
            storyId={storyId}
            title={title}
            workflowStatus={story?.workflowStatus ?? "Draft"}
          />
        ) : undefined)
      }
    />
  );
}

export type StudioStoryWorkspaceViewProps = {
  storyId: string | null;
  story: NewsroomStory | null;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  loading: boolean;
  isReadOnly: boolean;
  expectedVersion: number;
  isDirty: boolean;
  saveStatus: "idle" | "saving" | "autosaving" | "saved" | "conflict" | "error";
  statusMessage: string | null;
  title: string;
  setTitle: (v: string) => void;
  slug: string;
  setSlug: (v: string) => void;
  standfirst: string;
  setStandfirst: (v: string) => void;
  body: string;
  setBody: (v: string) => void;
  desk: string;
  setDesk: (v: string) => void;
  topic: string;
  setTopic: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  region: string;
  setRegion: (v: string) => void;
  sourceNotes: string;
  setSourceNotes: (v: string) => void;
  internalNotes: string;
  setInternalNotes: (v: string) => void;
  deadlineAt: string;
  setDeadlineAt: (v: string) => void;
  authorId: string;
  setAuthorId: (v: string) => void;
  primarySectionId: string;
  setPrimarySectionId: (v: string) => void;
  accessPolicy: string;
  setAccessPolicy: (v: string) => void;
  commentPolicy: string;
  distributionPublicReader: boolean;
  setDistributionPublicReader: (v: boolean) => void;
  adSetting: string;
  setAdSetting: (v: string) => void;
  seoTitle: string;
  setSeoTitle: (v: string) => void;
  seoDescription: string;
  setSeoDescription: (v: string) => void;
  scheduledAt: string;
  setScheduledAt: (v: string) => void;
  authors: NewsroomPublicAuthor[];
  sections: NewsroomSection[];
  revisions: NewsroomStoryRevision[];
  autosave: NewsroomStoryAutosave | null;
  reviews: NewsroomStoryReview[];
  corrections: NewsroomStoryCorrection[];
  canEditAll: boolean;
  canManagePremium: boolean;
  canManageDistribution: boolean;
  canManageAdSetting: boolean;
  canSchedule: boolean;
  canConfigureComments: boolean;
  canEnableComments: boolean;
  canRequestChanges: boolean;
  canCorrect: boolean;
  currentWorkflowStatus: string;
  transitionOptions: Array<{ label: string; status: string; allowed: boolean }>;
  availableReviewTypes: Array<{ type: string; label: string; cap?: HealthTimesCapability }>;
  promptAction: "requestChanges" | "correction" | "recordReview" | null;
  setPromptAction: (action: "requestChanges" | "correction" | "recordReview" | null) => void;
  promptReason: string;
  setPromptReason: (v: string) => void;
  reviewType: string;
  setReviewType: (v: string) => void;
  reviewOutcome: "completed" | "approved" | "changes_requested";
  setReviewOutcome: (v: "completed" | "approved" | "changes_requested") => void;
  reviewNotes: string;
  setReviewNotes: (v: string) => void;
  confirmRestoreRev: NewsroomStoryRevision | null;
  setConfirmRestoreRev: (rev: NewsroomStoryRevision | null) => void;
  markDirty: () => void;
  handleSave: (reason?: string) => void | Promise<void>;
  loadStory: (id: string) => void | Promise<void>;
  handleTransition: (nextStatus: string, reason?: string) => void | Promise<void>;
  handleOpenRecordReview: () => void;
  executeRequestChanges: () => void | Promise<void>;
  executeRecordReview: () => void | Promise<void>;
  executeCorrection: () => void | Promise<void>;
  executeRestoreRevision: () => void | Promise<void>;
  handleSetCommentPolicy: (nextPolicy: "disabled" | "read_only" | "open") => void | Promise<void>;
  onBackToStories: () => void;
  isPreview?: boolean;
  topControlsSlot?: ReactNode;
  discussionSlot?: ReactNode;
  mediaSlot?: ReactNode;
};

export function StudioStoryWorkspaceView({
  storyId,
  story,
  activeTab,
  setActiveTab,
  loading,
  isReadOnly,
  expectedVersion,
  isDirty,
  saveStatus,
  statusMessage,
  isPreview = false,
  title,
  setTitle,
  slug,
  setSlug,
  standfirst,
  setStandfirst,
  body,
  setBody,
  desk,
  setDesk,
  topic,
  setTopic,
  country,
  setCountry,
  region,
  setRegion,
  sourceNotes,
  setSourceNotes,
  internalNotes,
  setInternalNotes,
  deadlineAt,
  setDeadlineAt,
  authorId,
  setAuthorId,
  primarySectionId,
  setPrimarySectionId,
  accessPolicy,
  setAccessPolicy,
  commentPolicy,
  distributionPublicReader,
  setDistributionPublicReader,
  adSetting,
  setAdSetting,
  seoTitle,
  setSeoTitle,
  seoDescription,
  setSeoDescription,
  scheduledAt,
  setScheduledAt,
  authors,
  sections,
  revisions,
  autosave,
  reviews,
  corrections,
  canEditAll,
  canManagePremium,
  canManageDistribution,
  canManageAdSetting,
  canSchedule,
  canConfigureComments,
  canEnableComments,
  canRequestChanges,
  canCorrect,
  currentWorkflowStatus,
  transitionOptions,
  availableReviewTypes,
  promptAction,
  setPromptAction,
  promptReason,
  setPromptReason,
  reviewType,
  setReviewType,
  reviewOutcome,
  setReviewOutcome,
  reviewNotes,
  setReviewNotes,
  confirmRestoreRev,
  setConfirmRestoreRev,
  markDirty,
  handleSave,
  loadStory,
  handleTransition,
  handleOpenRecordReview,
  executeRequestChanges,
  executeRecordReview,
  executeCorrection,
  executeRestoreRevision,
  handleSetCommentPolicy,
  onBackToStories,
  topControlsSlot,
  discussionSlot,
  mediaSlot
}: StudioStoryWorkspaceViewProps) {
  return (
    <View style={styles.container}>
      {topControlsSlot}
      {/* Workspace Header */}
      <View style={styles.workspaceHeader}>
        <View style={styles.headerInfoGroup}>
          <Pressable
            style={styles.backLink}
            onPress={onBackToStories}
          >
            <Text style={styles.backLinkText}>← Back to Stories</Text>
          </Pressable>

          <View style={styles.titleAndStatusRow}>
            <Text style={styles.workspaceTitle} numberOfLines={1}>
              {storyId ? title || "Untitled story" : "New Story Draft"}
            </Text>
            {story && (
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{story.workflowStatus ?? "Draft"}</Text>
              </View>
            )}
            {story && (
              <Text style={styles.lockBadge}>
                v{expectedVersion} {isDirty && "• modified"}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.saveControls}>
          <Text style={styles.saveStateIndicator}>
            {saveStatus === "saving" && "Saving…"}
            {saveStatus === "autosaving" && "Autosaving (~10s)…"}
            {saveStatus === "saved" &&
              (isPreview
                ? (isDirty ? "Unsaved preview edits" : "Preview state saved locally (non-persistent)")
                : (isDirty ? "Unsaved edits" : "All changes saved"))}
            {saveStatus === "conflict" && "VERSION CONFLICT!"}
            {saveStatus === "error" && "Save error"}
            {saveStatus === "idle" && (isDirty ? "Unsaved changes" : "Draft ready")}
          </Text>

          {!isReadOnly && (
            saveStatus === "conflict" ? (
              <Pressable
                style={styles.conflictReloadButton}
                onPress={() => storyId && void loadStory(storyId)}
              >
                <Text style={styles.conflictReloadButtonText}>Reload Latest Content</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[
                  styles.saveButton,
                  loading && styles.disabledButton
                ]}
                onPress={() => void handleSave("Manual save")}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>
                  {storyId ? "Save Story" : "Create Story"}
                </Text>
              </Pressable>
            )
          )}
        </View>
      </View>

      {/* Read-Only Mode Banner */}
      {isReadOnly && (
        <View style={styles.readOnlyBanner}>
          <Text style={styles.readOnlyBannerTitle}>Read-Only Access</Text>
          <Text style={styles.readOnlyBannerText}>
            You are viewing this story with newsroom read permissions. Editing requires story.edit_own or story.edit_all capability.
          </Text>
        </View>
      )}

      {/* Prominent Conflict / Status Banner */}
      {saveStatus === "conflict" && (
        <View style={styles.conflictBanner}>
          <Text style={styles.conflictBannerTitle}>Version Conflict Detected</Text>
          <Text style={styles.conflictBannerText}>
            Another staff member or background session updated this story while you were editing (expected v{expectedVersion}).
            Your changes were not overwritten on the server. Please reload the story to inspect the current server version.
          </Text>
          <Pressable
            style={styles.conflictActionBtn}
            onPress={() => storyId && void loadStory(storyId)}
          >
            <Text style={styles.conflictActionBtnText}>Reload Server Version</Text>
          </Pressable>
        </View>
      )}

      {statusMessage && saveStatus !== "conflict" && (
        <View style={styles.messageBanner}>
          <Text style={styles.messageBannerText}>{statusMessage}</Text>
        </View>
      )}

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        {STORY_WORKSPACE_TABS.map(([id, label]) => {
          const active = activeTab === id;
          return (
            <Pressable
              key={id}
              style={[styles.tabItem, active && styles.tabItemActive]}
              onPress={() => setActiveTab(id as TabId)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* TAB 1: Writing */}
      {activeTab === "writing" && (
        <View style={styles.tabContent}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Headline / Title *</Text>
            <TextInput
              style={styles.headlineInput}
              value={title}
              editable={!isReadOnly}
              onChangeText={(text) => {
                setTitle(text);
                markDirty();
              }}
              placeholder="Enter comprehensive editorial headline"
              placeholderTextColor={colors.inkMuted}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>URL Slug</Text>
            <TextInput
              style={styles.input}
              value={slug}
              editable={!isReadOnly}
              onChangeText={(text) => {
                setSlug(text);
                markDirty();
              }}
              placeholder="article-slug-format"
              placeholderTextColor={colors.inkMuted}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Standfirst / Deck</Text>
            <TextInput
              style={[styles.input, styles.textareaSm]}
              value={standfirst}
              editable={!isReadOnly}
              onChangeText={(text) => {
                setStandfirst(text);
                markDirty();
              }}
              placeholder="Summary or standfirst displayed below the headline…"
              placeholderTextColor={colors.inkMuted}
              multiline
            />
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Editorial Body (HTML / Prose)</Text>
              <Text style={styles.counterText}>
                {body.length} characters • ~{body.trim().split(/\s+/).filter(Boolean).length} words
              </Text>
            </View>
            <TextInput
              style={[styles.input, styles.textareaBody]}
              value={body}
              editable={!isReadOnly}
              onChangeText={(text) => {
                setBody(text);
                markDirty();
              }}
              placeholder="<p>Write or paste validated article content here…</p>"
              placeholderTextColor={colors.inkMuted}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Excerpt: Read-only server field to prevent silent data loss */}
          {story?.excerpt ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Server Excerpt (Read-only)</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyFieldText}>{story.excerpt}</Text>
              </View>
              <Text style={styles.fieldNote}>
                {isPreview
                  ? "Story excerpt will be generated automatically or set upon editorial publishing."
                  : "Excerpt mutation is deferred; current certified save/create RPC contract does not support excerpt mutation."}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* TAB 2: Reporting & Desk */}
      {activeTab === "reporting" && (
        <View style={styles.tabContent}>
          <View style={styles.gridRow}>
            <View style={[styles.fieldGroup, styles.gridCol]}>
              <Text style={styles.fieldLabel}>Desk</Text>
              <TextInput
                style={styles.input}
                value={desk}
                editable={!isReadOnly}
                onChangeText={(text) => {
                  setDesk(text);
                  markDirty();
                }}
                placeholder="National / Investigation / Clinical / Policy"
                placeholderTextColor={colors.inkMuted}
              />
            </View>

            <View style={[styles.fieldGroup, styles.gridCol]}>
              <Text style={styles.fieldLabel}>Topic</Text>
              <TextInput
                style={styles.input}
                value={topic}
                editable={!isReadOnly}
                onChangeText={(text) => {
                  setTopic(text);
                  markDirty();
                }}
                placeholder="Infectious Disease / Health Financing"
                placeholderTextColor={colors.inkMuted}
              />
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={[styles.fieldGroup, styles.gridCol]}>
              <Text style={styles.fieldLabel}>Country</Text>
              <TextInput
                style={styles.input}
                value={country}
                editable={!isReadOnly}
                onChangeText={(text) => {
                  setCountry(text);
                  markDirty();
                }}
                placeholder="Zimbabwe"
                placeholderTextColor={colors.inkMuted}
              />
            </View>

            <View style={[styles.fieldGroup, styles.gridCol]}>
              <Text style={styles.fieldLabel}>Region / Province</Text>
              <TextInput
                style={styles.input}
                value={region}
                editable={!isReadOnly}
                onChangeText={(text) => {
                  setRegion(text);
                  markDirty();
                }}
                placeholder="Harare / Bulawayo / Manicaland"
                placeholderTextColor={colors.inkMuted}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Editorial Deadline (ISO / Date)</Text>
            <TextInput
              style={styles.input}
              value={deadlineAt}
              editable={!isReadOnly}
              onChangeText={(text) => {
                setDeadlineAt(text);
                markDirty();
              }}
              placeholder="2026-10-20T17:00:00Z"
              placeholderTextColor={colors.inkMuted}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Sources & Interview Notes</Text>
            <TextInput
              style={[styles.input, styles.textareaMd]}
              value={sourceNotes}
              editable={!isReadOnly}
              onChangeText={(text) => {
                setSourceNotes(text);
                markDirty();
              }}
              placeholder="Verified sources consulted, situational briefs, research references…"
              placeholderTextColor={colors.inkMuted}
              multiline
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Internal Editorial Notes</Text>
            <TextInput
              style={[styles.input, styles.textareaMd]}
              value={internalNotes}
              editable={!isReadOnly}
              onChangeText={(text) => {
                setInternalNotes(text);
                markDirty();
              }}
              placeholder="Staff guidance, verification requirements, desk remarks…"
              placeholderTextColor={colors.inkMuted}
              multiline
            />
          </View>
        </View>
      )}

      {/* TAB 3: Editorial & Review */}
      {activeTab === "editorial" && (
        <View style={styles.tabContent}>
          {/* Author & Section selectors */}
          <View style={styles.cardSection}>
            <Text style={styles.sectionHeader}>Author & Section</Text>
            <Text style={styles.sectionHelp}>
              Select verified authors and editorial sections for this story.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Author Byline</Text>
              {!storyId && !canEditAll ? (
                <View style={styles.noticeBox}>
                  <Text style={styles.noticeBoxText}>
                    Your author byline will be applied automatically upon creation.
                  </Text>
                </View>
              ) : (
                <>
                  {storyId && !canEditAll && (
                    <Text style={styles.fieldNote}>
                      Reassigning the author requires editor permissions.
                    </Text>
                  )}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceChips}>
                    {authors.map((authItem) => {
                      const selected = authorId === authItem.id;
                      const allowed = !isReadOnly && canEditAll;
                      return (
                        <Pressable
                          key={authItem.id}
                          style={[
                            styles.choiceChip,
                            selected && styles.choiceChipSelected,
                            !allowed && styles.disabledButton
                          ]}
                          onPress={() => {
                            if (allowed) {
                              setAuthorId(authItem.id);
                              markDirty();
                            }
                          }}
                          disabled={!allowed}
                        >
                          <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
                            {authItem.displayName} ({authItem.slug})
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Canonical Section</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceChips}>
                {sections.map((sec) => {
                  const selected = primarySectionId === sec.id;
                  const allowed = !isReadOnly;
                  return (
                    <Pressable
                      key={sec.id}
                      style={[
                        styles.choiceChip,
                        selected && styles.choiceChipSelected,
                        !allowed && styles.disabledButton
                      ]}
                      onPress={() => {
                        if (allowed) {
                          setPrimarySectionId(sec.id);
                          markDirty();
                        }
                      }}
                      disabled={!allowed}
                    >
                      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
                        {sec.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {/* Workflow Transitions */}
          {story && (
            <View style={styles.cardSection}>
              <Text style={styles.sectionHeader}>Workflow Lifecycle & Actions</Text>
              <Text style={styles.sectionHelp}>
                Current Status: <Text style={styles.strongText}>{currentWorkflowStatus}</Text>.
                Transitions require editorial review permissions.
              </Text>

              <View style={styles.actionButtonsRow}>
                {transitionOptions.map((opt) => (
                  <Pressable
                    key={opt.status}
                    style={[styles.transitionBtn, !opt.allowed && styles.disabledButton]}
                    onPress={() => void handleTransition(opt.status)}
                    disabled={!opt.allowed || loading}
                  >
                    <Text style={styles.transitionBtnText}>{opt.label}</Text>
                  </Pressable>
                ))}

                {/* Request Changes Action */}
                {canRequestChanges &&
                  ["Submitted", "Fact check", "Health / Science review", "Copy edit", "Editor review", "Ready"].includes(
                    currentWorkflowStatus
                  ) && (
                    <Pressable
                      style={styles.requestChangesBtn}
                      onPress={() => setPromptAction("requestChanges")}
                    >
                      <Text style={styles.requestChangesBtnText}>Request Changes</Text>
                    </Pressable>
                  )}

                {/* Record Review Action */}
                {availableReviewTypes.length > 0 && (
                  <Pressable
                    style={styles.recordReviewBtn}
                    onPress={handleOpenRecordReview}
                  >
                    <Text style={styles.recordReviewBtnText}>Record Review Entry</Text>
                  </Pressable>
                )}

                {/* Correction Action */}
                {currentWorkflowStatus === "Published" && canCorrect && (
                  <Pressable
                    style={styles.correctionBtn}
                    onPress={() => setPromptAction("correction")}
                  >
                    <Text style={styles.correctionBtnText}>Publish Correction</Text>
                  </Pressable>
                )}
              </View>

              {/* Prompt Box: Request Changes */}
              {promptAction === "requestChanges" && (
                <View style={styles.promptBox}>
                  <Text style={styles.promptTitle}>Request Editorial Changes</Text>
                  <Text style={styles.promptDesc}>
                    This will transition the story back to Draft and notify the reporter.
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textareaSm]}
                    value={promptReason}
                    onChangeText={setPromptReason}
                    placeholder="Describe required changes or missing evidence…"
                    placeholderTextColor={colors.inkMuted}
                    multiline
                  />
                  <View style={styles.promptActions}>
                    <Pressable
                      style={styles.promptSubmitBtn}
                      onPress={() => void executeRequestChanges()}
                      disabled={!promptReason.trim() || loading}
                    >
                      <Text style={styles.promptSubmitBtnText}>Submit Change Request</Text>
                    </Pressable>
                    <Pressable
                      style={styles.promptCancelBtn}
                      onPress={() => setPromptAction(null)}
                    >
                      <Text style={styles.promptCancelBtnText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Prompt Box: Record Review */}
              {promptAction === "recordReview" && (
                <View style={styles.promptBox}>
                  <Text style={styles.promptTitle}>Record Formal Review Entry</Text>
                  <Text style={styles.fieldLabel}>Review Type</Text>
                  <View style={styles.choiceChips}>
                    {availableReviewTypes.map((rt) => (
                      <Pressable
                        key={rt.type}
                        style={[styles.choiceChip, reviewType === rt.type && styles.choiceChipSelected]}
                        onPress={() => setReviewType(rt.type)}
                      >
                        <Text style={[styles.choiceChipText, reviewType === rt.type && styles.choiceChipTextSelected]}>
                          {rt.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>Review Status</Text>
                  <View style={styles.choiceChips}>
                    {REVIEW_STATUSES.map((outcome) => (
                      <Pressable
                        key={outcome}
                        style={[styles.choiceChip, reviewOutcome === outcome && styles.choiceChipSelected]}
                        onPress={() => setReviewOutcome(outcome)}
                      >
                        <Text style={[styles.choiceChipText, reviewOutcome === outcome && styles.choiceChipTextSelected]}>
                          {outcome.replace("_", " ").toUpperCase()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <TextInput
                    style={[styles.input, styles.textareaSm]}
                    value={reviewNotes}
                    onChangeText={setReviewNotes}
                    placeholder="Review notes or evidence remarks…"
                    placeholderTextColor={colors.inkMuted}
                    multiline
                  />

                  <View style={styles.promptActions}>
                    <Pressable
                      style={styles.promptSubmitBtn}
                      onPress={() => void executeRecordReview()}
                      disabled={loading}
                    >
                      <Text style={styles.promptSubmitBtnText}>Save Review Record</Text>
                    </Pressable>
                    <Pressable
                      style={styles.promptCancelBtn}
                      onPress={() => setPromptAction(null)}
                    >
                      <Text style={styles.promptCancelBtnText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Prompt Box: Correction */}
              {promptAction === "correction" && (
                <View style={styles.promptBox}>
                  <Text style={styles.promptTitle}>Publish Correction / Update</Text>
                  <Text style={styles.promptDesc}>
                    A reason is required for the editorial audit trail.
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textareaSm]}
                    value={promptReason}
                    onChangeText={setPromptReason}
                    placeholder="Specify exact error corrected or updated findings…"
                    placeholderTextColor={colors.inkMuted}
                    multiline
                  />
                  <View style={styles.promptActions}>
                    <Pressable
                      style={styles.promptSubmitBtn}
                      onPress={() => void executeCorrection()}
                      disabled={!promptReason.trim() || loading}
                    >
                      <Text style={styles.promptSubmitBtnText}>Publish Correction</Text>
                    </Pressable>
                    <Pressable
                      style={styles.promptCancelBtn}
                      onPress={() => setPromptAction(null)}
                    >
                      <Text style={styles.promptCancelBtnText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* TAB: Media & Attachments */}
      {activeTab === "media" && (
        <View style={styles.tabContent}>
          {mediaSlot !== undefined ? (
            mediaSlot
          ) : storyId ? (
            <StudioStoryMediaPanel
              storyId={storyId}
              title={title}
              workflowStatus={story?.workflowStatus ?? "Draft"}
            />
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Media Ingestion Unavailable</Text>
              <Text style={styles.emptyText}>
                Save or create the story draft first before preparing and attaching media assets.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* TAB 4: Publication & Commercial */}
      {activeTab === "publication" && (
        <View style={styles.tabContent}>
          {!storyId && (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeBoxText}>
                {isPreview
                  ? "Publication, commercial, and scheduling controls become active after saving the draft."
                  : "Publication, commercial, and scheduling controls will become active after the draft is created on the server."}
              </Text>
            </View>
          )}

          <View style={styles.cardSection}>
            <Text style={styles.sectionHeader}>Access & Commercial Policies</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Access Policy</Text>
              <View style={styles.choiceChips}>
                {["public", "premium"].map((pol) => {
                  const selected = accessPolicy === pol;
                  const allowed = Boolean(storyId && !isReadOnly && canManagePremium);
                  return (
                    <Pressable
                      key={pol}
                      style={[
                        styles.choiceChip,
                        selected && styles.choiceChipSelected,
                        !allowed && styles.disabledButton
                      ]}
                      onPress={() => {
                        if (allowed) {
                          setAccessPolicy(pol);
                          markDirty();
                        }
                      }}
                      disabled={!allowed}
                    >
                      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
                        {pol.toUpperCase()} {pol === "premium" ? "(Subscriber Only)" : "(Free Reader)"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Reader Comment Policy</Text>
              {!storyId ? (
                <View style={styles.noticeBox}>
                  <Text style={styles.noticeBoxText}>
                    Default comment policy (disabled) will be assigned on draft creation.
                  </Text>
                </View>
              ) : (
                <>
                  {isDirty && (
                    <Text style={styles.warningText}>
                      Save pending story changes before changing reader comment policy.
                    </Text>
                  )}
                  {!canEnableComments && (
                    <Text style={styles.fieldNote}>
                      Discussion can only be enabled (&apos;read_only&apos; or &apos;open&apos;) on published public stories. Non-published and Premium stories remain disabled.
                    </Text>
                  )}
                  <View style={styles.choiceChips}>
                    {([
                      ["disabled", "Disabled", true],
                      ["read_only", "Read Only", canEnableComments],
                      ["open", "Open Comments", canEnableComments]
                    ] as const).map(([pol, label, eligible]) => {
                      const selected = commentPolicy === pol;
                      const allowed =
                        canConfigureComments &&
                        eligible &&
                        !isReadOnly &&
                        !isDirty &&
                        saveStatus !== "saving" &&
                        saveStatus !== "autosaving" &&
                        saveStatus !== "conflict";
                      return (
                        <Pressable
                          key={pol}
                          style={[
                            styles.choiceChip,
                            selected && styles.choiceChipSelected,
                            !allowed && styles.disabledButton
                          ]}
                          onPress={() => void handleSetCommentPolicy(pol)}
                          disabled={!allowed || loading}
                        >
                          <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Public Reader Distribution</Text>
              {(() => {
                const allowed = Boolean(storyId && !isReadOnly && canManageDistribution);
                return (
                  <Pressable
                    style={[
                      styles.choiceChip,
                      distributionPublicReader && styles.choiceChipSelected,
                      !allowed && styles.disabledButton
                    ]}
                    onPress={() => {
                      if (allowed) {
                        setDistributionPublicReader(!distributionPublicReader);
                        markDirty();
                      }
                    }}
                    disabled={!allowed}
                  >
                    <Text style={[styles.choiceChipText, distributionPublicReader && styles.choiceChipTextSelected]}>
                      {distributionPublicReader ? "✓ Included in Public Reader App" : "Excluded from Reader App"}
                    </Text>
                  </Pressable>
                );
              })()}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Advertising Tier</Text>
              <View style={styles.choiceChips}>
                {["Standard", "Sensitive_NoAds", "Sponsor"].map((tier) => {
                  const selected = adSetting === tier;
                  const allowed = Boolean(storyId && !isReadOnly && canManageAdSetting);
                  return (
                    <Pressable
                      key={tier}
                      style={[
                        styles.choiceChip,
                        selected && styles.choiceChipSelected,
                        !allowed && styles.disabledButton
                      ]}
                      onPress={() => {
                        if (allowed) {
                          setAdSetting(tier);
                          markDirty();
                        }
                      }}
                      disabled={!allowed}
                    >
                      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
                        {tier}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.cardSection}>
            <Text style={styles.sectionHeader}>SEO & Scheduling Metadata</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>SEO Meta Title</Text>
              <TextInput
                style={styles.input}
                value={seoTitle}
                editable={!isReadOnly}
                onChangeText={(text) => {
                  setSeoTitle(text);
                  markDirty();
                }}
                placeholder="Optimized headline for search engines"
                placeholderTextColor={colors.inkMuted}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>SEO Meta Description</Text>
              <TextInput
                style={[styles.input, styles.textareaSm]}
                value={seoDescription}
                editable={!isReadOnly}
                onChangeText={(text) => {
                  setSeoDescription(text);
                  markDirty();
                }}
                placeholder="Meta description for search snippets…"
                placeholderTextColor={colors.inkMuted}
                multiline
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Scheduled Publication Date (UTC ISO)</Text>
              <TextInput
                style={styles.input}
                value={scheduledAt}
                editable={Boolean(storyId && !isReadOnly && canSchedule)}
                onChangeText={(text) => {
                  setScheduledAt(text);
                  markDirty();
                }}
                placeholder="2026-10-25T06:00:00Z"
                placeholderTextColor={colors.inkMuted}
              />
            </View>

            {story?.canonicalUrl && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Canonical URL</Text>
                <Text style={styles.canonicalUrlDisplay}>{story.canonicalUrl}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* TAB 5: History & Revisions */}
      {activeTab === "history" && (
        <View style={styles.tabContent}>
          {/* Latest Autosave info */}
          <View style={styles.cardSection}>
            <Text style={styles.sectionHeader}>Latest Autosave Cache</Text>
            {autosave ? (
              <View style={styles.historyCard}>
                <Text style={styles.historyMeta}>
                  Last autosaved by <Text style={styles.strongText}>{autosave.savedBy}</Text> at{" "}
                  {new Date(autosave.savedAt).toLocaleString()} (lock v{autosave.lockVersion})
                </Text>
                <Text style={styles.historySnippet} numberOfLines={2}>
                  {autosave.title ?? "Untitled"}
                </Text>
              </View>
            ) : (
              <Text style={styles.emptyHistoryText}>
                No pending draft changes. (All changes saved or unchanged).
              </Text>
            )}
          </View>

          {/* Revisions list */}
          <View style={styles.cardSection}>
            <Text style={styles.sectionHeader}>Revision History</Text>
            {revisions.length === 0 ? (
              <Text style={styles.emptyHistoryText}>No revisions recorded yet.</Text>
            ) : (
              revisions.map((rev) => (
                <View key={rev.id} style={styles.revisionCard}>
                  <View style={styles.revisionHeader}>
                    <Text style={styles.revisionNumberBadge}>Revision #{rev.revisionNumber}</Text>
                    <Text style={styles.revisionDate}>
                      {new Date(rev.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <Text style={styles.revisionSummary}>
                    {rev.changeSummary || "Milestone save"}
                  </Text>
                  <Text style={styles.revisionTitleSnippet} numberOfLines={1}>
                    Title: {rev.title ?? "Untitled"}
                  </Text>
                  <Pressable
                    style={[styles.restoreBtn, (loading || isReadOnly) && styles.disabledButton]}
                    onPress={() => setConfirmRestoreRev(rev)}
                    disabled={loading || isReadOnly}
                  >
                    <Text style={styles.restoreBtnText}>Restore this revision</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>

          {/* Revision Restore Confirmation Prompt */}
          {confirmRestoreRev && (
            <View style={styles.promptBox}>
              <Text style={styles.promptTitle}>
                Confirm Restore: Revision #{confirmRestoreRev.revisionNumber}
              </Text>
              <Text style={styles.promptDesc}>
                Created on {new Date(confirmRestoreRev.createdAt).toLocaleString()}. Expected lock version: v{expectedVersion}.
              </Text>
              {isDirty ? (
                <Text style={styles.warningText}>
                  ⚠️ You have unsaved edits in the editor. Please save or reload before restoring this revision to prevent accidental data loss.
                </Text>
              ) : (
                <Text style={styles.fieldNote}>
                  Restoring will update the story title and body to this milestone revision and increment the version.
                </Text>
              )}
              <View style={styles.promptActions}>
                <Pressable
                  style={[styles.promptSubmitBtn, isDirty && styles.disabledButton]}
                  onPress={() => void executeRestoreRevision()}
                  disabled={isDirty || loading}
                >
                  <Text style={styles.promptSubmitBtnText}>Confirm Restore</Text>
                </Pressable>
                <Pressable
                  style={styles.promptCancelBtn}
                  onPress={() => setConfirmRestoreRev(null)}
                >
                  <Text style={styles.promptCancelBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Reviews list */}
          <View style={styles.cardSection}>
            <Text style={styles.sectionHeader}>Formal Reviews</Text>
            {reviews.length === 0 ? (
              <Text style={styles.emptyHistoryText}>No formal reviews recorded yet.</Text>
            ) : (
              reviews.map((r) => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.revisionHeader}>
                    <Text style={styles.strongText}>{r.reviewType.toUpperCase()}</Text>
                    <Text style={styles.badge}>{r.status.toUpperCase()}</Text>
                  </View>
                  {r.notes && <Text style={styles.reviewNotes}>{r.notes}</Text>}
                  <Text style={styles.metaSub}>Recorded at {new Date(r.createdAt).toLocaleString()}</Text>
                </View>
              ))
            )}
          </View>

          {/* Corrections list */}
          <View style={styles.cardSection}>
            <Text style={styles.sectionHeader}>Published Corrections</Text>
            {corrections.length === 0 ? (
              <Text style={styles.emptyHistoryText}>No corrections logged for this story.</Text>
            ) : (
              corrections.map((c) => (
                <View key={c.id} style={styles.reviewCard}>
                  <Text style={styles.strongText}>Reason: {c.reason}</Text>
                  <Text style={styles.metaSub}>Changed at {new Date(c.changedAt).toLocaleString()}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      )}

      {/* TAB 6: Internal Discussion */}
      {activeTab === "discussion" && (
        <View style={styles.tabContent}>
          {discussionSlot !== undefined ? (
            discussionSlot
          ) : storyId ? (
            <StudioStoryDiscussionPanel storyId={storyId} />
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Discussion Unavailable</Text>
              <Text style={styles.emptyText}>
                Save the story first to initiate an authoritative internal story discussion thread.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
    gap: spacing.lg
  },
  permissionBox: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xl
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink
  },
  permissionText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkMuted,
    textAlign: "center",
    maxWidth: 400
  },
  backButton: {
    marginTop: spacing.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.paperMuted,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.blue
  },
  readOnlyBanner: {
    backgroundColor: "#F4F5F7",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4
  },
  readOnlyBannerTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.ink
  },
  readOnlyBannerText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkMuted
  },
  workspaceHeader: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    flexWrap: "wrap"
  },
  headerInfoGroup: {
    flex: 1,
    minWidth: 280,
    gap: spacing.xs
  },
  backLink: {
    alignSelf: "flex-start",
    paddingVertical: 2
  },
  backLinkText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.blue
  },
  titleAndStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  workspaceTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.ink
  },
  statusPill: {
    backgroundColor: "#EEF5FF",
    borderWidth: 1,
    borderColor: colors.blue,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.blue
  },
  lockBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.inkMuted
  },
  saveControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  saveStateIndicator: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkMuted
  },
  saveButton: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 18,
    backgroundColor: colors.blue,
    borderRadius: radius.sm
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF"
  },
  conflictReloadButton: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: colors.live,
    borderRadius: radius.sm
  },
  conflictReloadButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF"
  },
  disabledButton: {
    opacity: 0.4
  },
  conflictBanner: {
    backgroundColor: "#FDF2F2",
    borderWidth: 1,
    borderColor: "#F5C2C2",
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm
  },
  conflictBannerTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.live
  },
  conflictBannerText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink
  },
  conflictActionBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.live,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    marginTop: 4
  },
  conflictActionBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF"
  },
  messageBanner: {
    backgroundColor: "#E6F7F7",
    borderWidth: 1,
    borderColor: "#A5E5E5",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  messageBannerText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.teal
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 3,
    borderBottomColor: "transparent"
  },
  tabItemActive: {
    borderBottomColor: colors.blue
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.inkMuted
  },
  tabTextActive: {
    color: colors.blue,
    fontWeight: "900"
  },
  tabContent: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.lg
  },
  fieldGroup: {
    gap: spacing.xs
  },
  fieldLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink
  },
  headlineInput: {
    minHeight: 48,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink
  },
  input: {
    minHeight: 42,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.ink
  },
  readOnlyField: {
    minHeight: 40,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center"
  },
  readOnlyFieldText: {
    fontSize: 13,
    color: colors.inkMuted,
    fontStyle: "italic"
  },
  fieldNote: {
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2
  },
  noticeBox: {
    backgroundColor: "#EEF5FF",
    borderWidth: 1,
    borderColor: "#B8D5FA",
    borderRadius: radius.sm,
    padding: spacing.md
  },
  noticeBoxText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.blue,
    fontWeight: "600"
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.warning,
    fontWeight: "700"
  },
  textareaSm: {
    minHeight: 70,
    paddingVertical: 8,
    textAlignVertical: "top"
  },
  textareaMd: {
    minHeight: 110,
    paddingVertical: 8,
    textAlignVertical: "top"
  },
  textareaBody: {
    minHeight: 280,
    paddingVertical: 12,
    textAlignVertical: "top",
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 20
  },
  counterText: {
    fontSize: 11,
    color: colors.inkMuted
  },
  gridRow: {
    flexDirection: "row",
    gap: spacing.md
  },
  gridCol: {
    flex: 1
  },
  cardSection: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.paperMuted,
    gap: spacing.md
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.ink
  },
  sectionHelp: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkMuted
  },
  strongText: {
    fontWeight: "900",
    color: colors.ink
  },
  choiceChips: {
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "wrap",
    paddingVertical: 2
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.sm,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border
  },
  choiceChipSelected: {
    backgroundColor: colors.blue,
    borderColor: colors.blue
  },
  choiceChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.ink
  },
  choiceChipTextSelected: {
    color: "#FFFFFF"
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
    marginTop: spacing.xs
  },
  transitionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.ink,
    borderRadius: radius.sm
  },
  transitionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  requestChangesBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.warning,
    borderRadius: radius.sm
  },
  requestChangesBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  recordReviewBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.teal,
    borderRadius: radius.sm
  },
  recordReviewBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  correctionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.live,
    borderRadius: radius.sm
  },
  correctionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  promptBox: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  promptTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.ink
  },
  promptDesc: {
    fontSize: 12,
    color: colors.inkMuted
  },
  promptActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  promptSubmitBtn: {
    backgroundColor: colors.blue,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm
  },
  promptSubmitBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  promptCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm
  },
  promptCancelBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.inkMuted
  },
  canonicalUrlDisplay: {
    fontSize: 12,
    color: colors.inkMuted,
    fontFamily: "monospace"
  },
  historyCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.xs
  },
  historyMeta: {
    fontSize: 12,
    color: colors.inkMuted
  },
  historySnippet: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink
  },
  emptyHistoryText: {
    fontSize: 12,
    color: colors.inkMuted,
    fontStyle: "italic"
  },
  revisionCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.xs
  },
  revisionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  revisionNumberBadge: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.blue
  },
  revisionDate: {
    fontSize: 11,
    color: colors.inkMuted
  },
  revisionSummary: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink
  },
  revisionTitleSnippet: {
    fontSize: 12,
    color: colors.inkMuted
  },
  restoreBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border
  },
  restoreBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.ink
  },
  reviewCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.xs
  },
  badge: {
    fontSize: 10,
    fontWeight: "900",
    backgroundColor: colors.paperMuted,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  reviewNotes: {
    fontSize: 12,
    color: colors.ink
  },
  metaSub: {
    fontSize: 10,
    color: colors.inkMuted
  },
  emptyBox: {
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.xs
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.ink
  },
  emptyText: {
    fontSize: 13,
    color: colors.inkMuted
  }
});
