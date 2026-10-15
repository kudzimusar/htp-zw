import { useEffect, useState, useRef, useMemo } from "react";
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

type TabId = "writing" | "reporting" | "editorial" | "publication" | "history" | "discussion";

type Props = {
  storyId?: string;
};

export function StudioStoryWorkspace({ storyId: propStoryId }: Props) {
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
  const [excerpt, setExcerpt] = useState("");
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
  const [commentPolicy, setCommentPolicy] = useState<string>("open");
  const [distributionPublicReader, setDistributionPublicReader] = useState<boolean>(true);
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
  const [reviewType, setReviewType] = useState("fact_check");
  const [reviewOutcome, setReviewOutcome] = useState("passed");
  const [reviewNotes, setReviewNotes] = useState("");

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

  const canEditStory = hasCap("story.edit_all") || hasCap("story.edit_own");
  const canPublish = hasCap("story.publish");
  const canSubmit = hasCap("story.submit");
  const canFactCheck = hasCap("story.fact_check");
  const canHealthReview = hasCap("story.health_review");
  const canCopyEdit = hasCap("story.copy_edit");
  const canCorrect = hasCap("story.correct");
  const canManagePremium = hasCap("premium.assign") || hasCap("premium.manage");
  const canManageDistribution = hasCap("distribution.manage") || hasCap("story.edit_all");

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setExcerpt(data.excerpt ?? "");
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
      setCommentPolicy(data.commentPolicy ?? "open");
      setDistributionPublicReader(Boolean(data.distribution?.public_reader));
      setAdSetting(data.adSetting ?? "Standard");
      setSeoTitle(data.seoTitle ?? "");
      setSeoDescription(data.seoDescription ?? "");
      setScheduledAt(data.scheduledAt ?? "");
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
      setIsDirty(false);
      setSaveStatus("idle");
    }
  }, [storyId]);

  // Build patch
  const buildPatch = (): SaveStoryPatch => {
    return {
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
      author_id: authorId || null,
      primary_section_id: primarySectionId || null,
      access_policy: accessPolicy,
      comment_policy: commentPolicy,
      distribution: { public_reader: distributionPublicReader },
      ad_setting: adSetting,
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
      scheduled_at: scheduledAt || null
    };
  };

  // Perform Save
  const handleSave = async (reason = "Manual save") => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    if (!storyId) {
      // Create new story flow
      setSaveStatus("saving");
      setStatusMessage("Creating new story on server…");
      try {
        const newId = await services.newsroomStories.createStory({
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
          author_id: authorId || null,
          primary_section_id: primarySectionId || null,
          access_policy: accessPolicy,
          comment_policy: commentPolicy,
          seo_title: seoTitle || null,
          seo_description: seoDescription || null
        });
        setStoryId(newId);
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

    // Existing story save
    const isAuto = reason.toLowerCase() === "autosave";
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
      setIsDirty(false);
      setSaveStatus("saved");
      setStatusMessage(isAuto ? "Autosaved." : "Changes saved.");
      if (story) {
        setStory({
          ...story,
          ...patch,
          lockVersion: newVersion
        } as NewsroomStory);
      }
      void refreshHistory(storyId);
    } catch (err: any) {
      if (err.message && err.message.includes("VERSION_CONFLICT")) {
        setSaveStatus("conflict");
        setStatusMessage(
          "VERSION CONFLICT: Another staff member or session updated this story. Please reload to inspect server content."
        );
      } else {
        setSaveStatus("error");
        setStatusMessage(err.message || "Save failed.");
      }
    }
  };

  // Debounced Autosave (~10 seconds)
  useEffect(() => {
    if (!isDirty || !storyId || saveStatus === "saving" || saveStatus === "conflict") {
      return;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      void handleSave("Autosave");
    }, 10000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    isDirty,
    storyId,
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
    commentPolicy,
    distributionPublicReader,
    adSetting,
    seoTitle,
    seoDescription,
    scheduledAt
  ]);

  const markDirty = () => {
    setIsDirty(true);
    if (saveStatus === "saved") {
      setSaveStatus("idle");
    }
  };

  // Workflow transition
  const handleTransition = async (nextStatus: string, reason?: string) => {
    if (!storyId) return;
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

  // Restore Revision
  const handleRestoreRevision = async (rev: NewsroomStoryRevision) => {
    if (!storyId) return;
    setLoading(true);
    setStatusMessage(`Restoring revision #${rev.revisionNumber}…`);
    try {
      const newVersion = await services.newsroomStories.restoreRevision(
        storyId,
        rev.id,
        expectedVersion
      );
      setExpectedVersion(newVersion);
      setStatusMessage(`Revision #${rev.revisionNumber} restored.`);
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
    if (!storyId || !promptReason.trim()) return;
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

  // Record review execution
  const executeRecordReview = async () => {
    if (!storyId) return;
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
    const opts: Array<{ label: string; status: string; capability: HealthTimesCapability }> = [];
    const cur = currentWorkflowStatus;

    if (["Pitch", "Approved", "Assigned", "Reporting", "Draft"].includes(cur)) {
      opts.push({ label: "Submit for Review", status: "Submitted", capability: "story.submit" });
    }
    if (["Submitted", "Fact check"].includes(cur)) {
      opts.push({ label: "Send to Fact Check", status: "Fact check", capability: "story.fact_check" });
    }
    if (["Fact check", "Health / Science review"].includes(cur)) {
      opts.push({ label: "Send to Health Review", status: "Health / Science review", capability: "story.health_review" });
    }
    if (["Health / Science review", "Copy edit"].includes(cur)) {
      opts.push({ label: "Send to Copy Edit", status: "Copy edit", capability: "story.copy_edit" });
    }
    if (["Copy edit", "Editor review"].includes(cur)) {
      opts.push({ label: "Send to Editor Review", status: "Editor review", capability: "story.edit_all" });
    }
    if (["Editor review", "Ready"].includes(cur)) {
      opts.push({ label: "Mark as Ready", status: "Ready", capability: "story.edit_all" });
    }
    if (["Ready", "Scheduled"].includes(cur)) {
      opts.push({ label: "Publish Now", status: "Published", capability: "story.publish" });
      opts.push({ label: "Schedule Publication", status: "Scheduled", capability: "story.publish" });
    }
    if (cur !== "Published") {
      opts.push({ label: "Archive Story", status: "Archived", capability: "story.edit_all" });
    }

    return opts;
  }, [currentWorkflowStatus]);

  return (
    <View style={styles.container}>
      {/* Workspace Header */}
      <View style={styles.workspaceHeader}>
        <View style={styles.headerInfoGroup}>
          <Pressable
            style={styles.backLink}
            onPress={() => router.push("/studio/stories" as never)}
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
            {saveStatus === "saved" && (isDirty ? "Unsaved edits" : "All changes saved")}
            {saveStatus === "conflict" && "VERSION CONFLICT!"}
            {saveStatus === "error" && "Save error"}
            {saveStatus === "idle" && (isDirty ? "Unsaved changes" : "Draft ready")}
          </Text>

          {saveStatus === "conflict" ? (
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
                (!canEditStory && !!storyId) && styles.disabledButton
              ]}
              onPress={() => void handleSave("Manual save")}
              disabled={(!canEditStory && !!storyId) || loading}
            >
              <Text style={styles.saveButtonText}>
                {storyId ? "Save Story" : "Create Story"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

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
        {([
          ["writing", "Writing"],
          ["reporting", "Reporting & Desk"],
          ["editorial", "Editorial & Review"],
          ["publication", "Publication & SEO"],
          ["history", "History & Revisions"],
          ["discussion", "Internal Notes & Desk"]
        ] as const).map(([id, label]) => {
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

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Excerpt / Teaser</Text>
            <TextInput
              style={[styles.input, styles.textareaSm]}
              value={excerpt}
              onChangeText={(text) => {
                setExcerpt(text);
                markDirty();
              }}
              placeholder="Short excerpt for feeds and teasers…"
              placeholderTextColor={colors.inkMuted}
              multiline
            />
          </View>
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
          {/* Canonical Author & Section selectors */}
          <View style={styles.cardSection}>
            <Text style={styles.sectionHeader}>Canonical Author & Section Authority</Text>
            <Text style={styles.sectionHelp}>
              Only server-backed canonical authors and sections are accepted by the Newsroom kernel.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Canonical Public Author (Byline)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceChips}>
                {authors.map((auth) => {
                  const selected = authorId === auth.id;
                  return (
                    <Pressable
                      key={auth.id}
                      style={[styles.choiceChip, selected && styles.choiceChipSelected]}
                      onPress={() => {
                        setAuthorId(auth.id);
                        markDirty();
                      }}
                    >
                      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
                        {auth.displayName} ({auth.slug})
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Canonical Section</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceChips}>
                {sections.map((sec) => {
                  const selected = primarySectionId === sec.id;
                  return (
                    <Pressable
                      key={sec.id}
                      style={[styles.choiceChip, selected && styles.choiceChipSelected]}
                      onPress={() => {
                        setPrimarySectionId(sec.id);
                        markDirty();
                      }}
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
                Transitions require dedicated Newsroom server capabilities.
              </Text>

              <View style={styles.actionButtonsRow}>
                {transitionOptions.map((opt) => {
                  const allowed = hasCap(opt.capability);
                  return (
                    <Pressable
                      key={opt.status}
                      style={[styles.transitionBtn, !allowed && styles.disabledButton]}
                      onPress={() => void handleTransition(opt.status)}
                      disabled={!allowed || loading}
                    >
                      <Text style={styles.transitionBtnText}>{opt.label}</Text>
                    </Pressable>
                  );
                })}

                {/* Request Changes Action */}
                {["Submitted", "Fact check", "Health / Science review", "Copy edit", "Editor review"].includes(
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
                <Pressable
                  style={styles.recordReviewBtn}
                  onPress={() => setPromptAction("recordReview")}
                >
                  <Text style={styles.recordReviewBtnText}>Record Review Entry</Text>
                </Pressable>

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
                    {([
                      ["fact_check", "Fact Check", "story.fact_check"],
                      ["health_review", "Health / Science Review", "story.health_review"],
                      ["copy_edit", "Copy Edit", "story.copy_edit"],
                      ["editor_review", "Editor Review", "story.edit_all"]
                    ] as const).map(([type, label, cap]) => (
                      <Pressable
                        key={type}
                        style={[styles.choiceChip, reviewType === type && styles.choiceChipSelected]}
                        onPress={() => setReviewType(type)}
                      >
                        <Text style={[styles.choiceChipText, reviewType === type && styles.choiceChipTextSelected]}>
                          {label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>Review Status</Text>
                  <View style={styles.choiceChips}>
                    {["passed", "flagged", "rejected"].map((outcome) => (
                      <Pressable
                        key={outcome}
                        style={[styles.choiceChip, reviewOutcome === outcome && styles.choiceChipSelected]}
                        onPress={() => setReviewOutcome(outcome)}
                      >
                        <Text style={[styles.choiceChipText, reviewOutcome === outcome && styles.choiceChipTextSelected]}>
                          {outcome.toUpperCase()}
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
                    Mandatory reason is required by Newsroom kernel audit rules.
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

      {/* TAB 4: Publication & Commercial */}
      {activeTab === "publication" && (
        <View style={styles.tabContent}>
          <View style={styles.cardSection}>
            <Text style={styles.sectionHeader}>Access & Commercial Policies</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Access Policy</Text>
              <View style={styles.choiceChips}>
                {["public", "premium"].map((pol) => {
                  const selected = accessPolicy === pol;
                  return (
                    <Pressable
                      key={pol}
                      style={[
                        styles.choiceChip,
                        selected && styles.choiceChipSelected,
                        !canManagePremium && styles.disabledButton
                      ]}
                      onPress={() => {
                        if (canManagePremium) {
                          setAccessPolicy(pol);
                          markDirty();
                        }
                      }}
                      disabled={!canManagePremium}
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
              <View style={styles.choiceChips}>
                {([
                  ["open", "Open Comments"],
                  ["read_only", "Read Only"],
                  ["disabled", "Disabled"]
                ] as const).map(([pol, label]) => {
                  const selected = commentPolicy === pol;
                  return (
                    <Pressable
                      key={pol}
                      style={[styles.choiceChip, selected && styles.choiceChipSelected]}
                      onPress={() => {
                        setCommentPolicy(pol);
                        markDirty();
                      }}
                    >
                      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Public Reader Distribution</Text>
              <Pressable
                style={[
                  styles.choiceChip,
                  distributionPublicReader && styles.choiceChipSelected,
                  !canManageDistribution && styles.disabledButton
                ]}
                onPress={() => {
                  if (canManageDistribution) {
                    setDistributionPublicReader(!distributionPublicReader);
                    markDirty();
                  }
                }}
                disabled={!canManageDistribution}
              >
                <Text style={[styles.choiceChipText, distributionPublicReader && styles.choiceChipTextSelected]}>
                  {distributionPublicReader ? "✓ Included in Public Reader App" : "Excluded from Reader App"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Advertising Tier</Text>
              <View style={styles.choiceChips}>
                {["Standard", "Sensitive_NoAds", "Sponsor"].map((tier) => {
                  const selected = adSetting === tier;
                  return (
                    <Pressable
                      key={tier}
                      style={[styles.choiceChip, selected && styles.choiceChipSelected]}
                      onPress={() => {
                        setAdSetting(tier);
                        markDirty();
                      }}
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
                No pending autosave cache on server. (All changes committed to revisions or unchanged).
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
                    style={styles.restoreBtn}
                    onPress={() => void handleRestoreRevision(rev)}
                    disabled={loading || !canEditStory}
                  >
                    <Text style={styles.restoreBtnText}>Restore this revision</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>

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
          {storyId ? (
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
