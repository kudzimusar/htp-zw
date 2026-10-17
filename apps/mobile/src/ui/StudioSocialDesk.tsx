import { useEffect, useMemo, useState } from "react";
import {
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
import { StudioAnyCapabilityGate } from "./Studio";
import {
  SOCIAL_DESK_CAPABILITIES,
  hasServerCapability,
  hasSocialDeskAccess,
  type AuthorizationSnapshot
} from "../security/capabilities";
import {
  validateSocialDraftCreateInput,
  type NewsroomSocialAccount,
  type NewsroomSocialDraftCreateInput,
  type NewsroomSocialPost,
  type NewsroomSocialPostStatus,
  type NewsroomSocialPreparePublishResult,
  type NewsroomSocialPublicationAttempt,
  type NewsroomStory
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

export interface SocialDeskCapabilityMatrix {
  canAccess: boolean;
  canCompose: boolean;
  canApprove: boolean;
  canPublish: boolean;
  canManageAccounts: boolean;
}

export function hasSocialDeskAuthority(snapshot: AuthorizationSnapshot | null | undefined): boolean {
  if (!snapshot) return false;
  return hasSocialDeskAccess(snapshot);
}

export function getSocialDeskCapabilityMatrix(
  snapshot: AuthorizationSnapshot | null | undefined
): SocialDeskCapabilityMatrix {
  if (!snapshot) {
    return {
      canAccess: false,
      canCompose: false,
      canApprove: false,
      canPublish: false,
      canManageAccounts: false
    };
  }
  return {
    canAccess: hasSocialDeskAccess(snapshot),
    canCompose: hasServerCapability(snapshot, "social.compose"),
    canApprove: hasServerCapability(snapshot, "social.approve"),
    canPublish: hasServerCapability(snapshot, "social.publish"),
    canManageAccounts: hasServerCapability(snapshot, "social.manage_accounts")
  };
}

export function formatPublishPrepareFeedback(result: NewsroomSocialPreparePublishResult): string {
  if (!result.providerReady) {
    return "Provider not configured — publication was not sent.";
  }
  return "Publication handoff prepared.";
}

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "Not recorded";
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

function formatProviderLabel(provider: string): string {
  const normalized = provider.trim().toLowerCase();
  if (normalized === "x" || normalized === "twitter") return "X / Twitter";
  if (normalized === "facebook") return "Facebook";
  if (normalized === "linkedin") return "LinkedIn";
  if (normalized === "instagram") return "Instagram";
  if (normalized === "whatsapp") return "WhatsApp";
  if (normalized === "youtube") return "YouTube";
  return provider.toUpperCase();
}

export interface StudioSocialDeskViewProps {
  accounts: NewsroomSocialAccount[];
  posts: NewsroomSocialPost[];
  stories: NewsroomStory[];
  attemptsByPostId: Record<string, NewsroomSocialPublicationAttempt[]>;
  capabilities: SocialDeskCapabilityMatrix;
  loading?: boolean;
  errorMessage?: string | null;
  actionBusy?: boolean;
  actionFeedback?: { tone: "info" | "warning" | "error"; message: string } | null;
  onRefresh?: () => void;
  onCreateDraft?: (input: NewsroomSocialDraftCreateInput) => Promise<void>;
  onApprovePost?: (postId: string) => Promise<void>;
  onPreparePublish?: (postId: string) => Promise<void>;
  onSelectPost?: (postId: string) => void;
  selectedPostId?: string | null;
  isPreview?: boolean;
}

const STATUS_FILTERS: ReadonlyArray<{ key: "all" | NewsroomSocialPostStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "approved", label: "Approved" },
  { key: "published", label: "Published" },
  { key: "failed", label: "Failed" },
  { key: "cancelled", label: "Cancelled" }
];

export function StudioSocialDeskView({
  accounts,
  posts,
  stories,
  attemptsByPostId,
  capabilities,
  loading = false,
  errorMessage = null,
  actionBusy = false,
  actionFeedback = null,
  onRefresh,
  onCreateDraft,
  onApprovePost,
  onPreparePublish,
  onSelectPost,
  selectedPostId: controlledSelectedPostId,
  isPreview = false
}: StudioSocialDeskViewProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState<"all" | NewsroomSocialPostStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [internalSelectedPostId, setInternalSelectedPostId] = useState<string | null>(
    posts[0]?.id ?? null
  );

  // Compose draft form state
  const [composeOpen, setComposeOpen] = useState(false);
  const [storySearch, setStorySearch] = useState("");
  const [selectedStoryId, setSelectedStoryId] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [draftBody, setDraftBody] = useState("");
  const [composeError, setComposeError] = useState<string | null>(null);

  const activePostId =
    controlledSelectedPostId !== undefined ? controlledSelectedPostId : internalSelectedPostId;

  useEffect(() => {
    if (controlledSelectedPostId !== undefined) return;
    if (posts.length === 0) {
      setInternalSelectedPostId(null);
      return;
    }
    if (!internalSelectedPostId || !posts.some((p) => p.id === internalSelectedPostId)) {
      setInternalSelectedPostId(posts[0]?.id ?? null);
    }
  }, [posts, controlledSelectedPostId, internalSelectedPostId]);

  useEffect(() => {
    if (!selectedAccountId && accounts[0]) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  useEffect(() => {
    if (!selectedStoryId && stories[0]) {
      setSelectedStoryId(stories[0].id);
    }
  }, [stories, selectedStoryId]);

  const storyMap = useMemo(() => {
    const map = new Map<string, NewsroomStory>();
    for (const s of stories) {
      map.set(s.id, s);
    }
    return map;
  }, [stories]);

  const accountMap = useMemo(() => {
    const map = new Map<string, NewsroomSocialAccount>();
    for (const a of accounts) {
      map.set(a.id, a);
    }
    return map;
  }, [accounts]);

  const counters = useMemo(() => {
    let draft = 0;
    let approved = 0;
    let published = 0;
    let failed = 0;
    let cancelled = 0;
    for (const p of posts) {
      if (p.status === "draft") draft += 1;
      else if (p.status === "approved") approved += 1;
      else if (p.status === "published") published += 1;
      else if (p.status === "failed") failed += 1;
      else if (p.status === "cancelled") cancelled += 1;
    }
    return {
      total: posts.length,
      draft,
      approved,
      published,
      failed,
      cancelled
    };
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return posts.filter((post) => {
      if (statusFilter !== "all" && post.status !== statusFilter) return false;
      if (!q) return true;
      const storyTitle = storyMap.get(post.storyId)?.title?.toLowerCase() ?? "";
      const accountLabel =
        (post.socialAccountId ? accountMap.get(post.socialAccountId)?.accountLabel : "")?.toLowerCase() ?? "";
      return (
        post.body.toLowerCase().includes(q) ||
        post.provider.toLowerCase().includes(q) ||
        storyTitle.includes(q) ||
        accountLabel.includes(q)
      );
    });
  }, [posts, statusFilter, searchQuery, storyMap, accountMap]);

  const selectedPost = useMemo(() => {
    if (!activePostId) return filteredPosts[0] ?? null;
    return posts.find((p) => p.id === activePostId) ?? filteredPosts[0] ?? null;
  }, [posts, filteredPosts, activePostId]);

  const filteredStories = useMemo(() => {
    const q = storySearch.trim().toLowerCase();
    if (!q) return stories.slice(0, 12);
    return stories
      .filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.slug && s.slug.toLowerCase().includes(q)) ||
          s.status.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [stories, storySearch]);

  const selectedAccountForCompose = useMemo(() => {
    if (!selectedAccountId) return accounts[0] ?? null;
    return accounts.find((a) => a.id === selectedAccountId) ?? accounts[0] ?? null;
  }, [accounts, selectedAccountId]);

  function handleSelectPost(postId: string) {
    if (onSelectPost) {
      onSelectPost(postId);
    } else {
      setInternalSelectedPostId(postId);
    }
  }

  async function handleSubmitDraft() {
    setComposeError(null);
    if (accounts.length === 0 || !selectedAccountForCompose) {
      setComposeError(
        "No social provider accounts are configured. Configure a provider account before creating a social draft."
      );
      return;
    }
    const input: NewsroomSocialDraftCreateInput = {
      storyId: selectedStoryId,
      provider: selectedAccountForCompose.provider,
      body: draftBody,
      socialAccountId: selectedAccountForCompose.id
    };
    const check = validateSocialDraftCreateInput(input);
    if (!check.valid) {
      setComposeError(check.error || "Invalid social draft input.");
      return;
    }
    if (!onCreateDraft) return;
    try {
      await onCreateDraft(input);
      setDraftBody("");
      setComposeOpen(false);
    } catch (err: any) {
      setComposeError(err?.message || "Failed to create social draft.");
    }
  }

  const selectedPostStory = selectedPost ? storyMap.get(selectedPost.storyId) ?? null : null;
  const selectedPostAccount =
    selectedPost?.socialAccountId ? accountMap.get(selectedPost.socialAccountId) ?? null : null;
  const selectedPostAttempts =
    selectedPost && capabilities.canPublish ? attemptsByPostId[selectedPost.id] ?? [] : [];

  return (
    <View style={styles.container} testID="studio-social-desk">
      {/* Header & Authority Strip */}
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleCol}>
            <View style={styles.eyebrowRow}>
              <Text style={styles.eyebrow}>HT-NR-06A • DISTRIBUTION CONTROL PLANE</Text>
              <View style={styles.authorityBadge}>
                <Text style={styles.authorityBadgeText}>
                  {isPreview ? "OWNER PREVIEW • READ-ONLY" : "SERVER SOCIAL AUTHORITY"}
                </Text>
              </View>
            </View>
            <Text style={styles.headerTitle}>Social Desk & Outbound Distribution</Text>
            <Text style={styles.headerSubtitle}>
              Story-bound social draft composition, editorial approval, and provider publication handoff backed by canonical social_accounts, social_posts, and social_publication_attempts.
            </Text>
          </View>
          <View style={styles.headerActions}>
            {onRefresh && (
              <Pressable
                style={styles.secondaryButton}
                onPress={onRefresh}
                disabled={loading || actionBusy}
                testID="social-desk-refresh-btn"
              >
                <Text style={styles.secondaryButtonText}>
                  {loading ? "Refreshing…" : "Refresh Desk"}
                </Text>
              </Pressable>
            )}
            {capabilities.canCompose && (
              <Pressable
                style={styles.primaryButton}
                onPress={() => {
                  setComposeError(null);
                  setComposeOpen((prev) => !prev);
                }}
                testID="social-desk-new-draft-btn"
              >
                <Text style={styles.primaryButtonText}>
                  {composeOpen ? "Close Composer" : "+ New Social Draft"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.capabilityPillRow}>
          <Text style={styles.capabilityStripLabel}>Active session capabilities:</Text>
          {capabilities.canCompose && (
            <View style={styles.capabilityChip}>
              <Text style={styles.capabilityChipText}>social.compose</Text>
            </View>
          )}
          {capabilities.canApprove && (
            <View style={styles.capabilityChip}>
              <Text style={styles.capabilityChipText}>social.approve</Text>
            </View>
          )}
          {capabilities.canPublish && (
            <View style={styles.capabilityChip}>
              <Text style={styles.capabilityChipText}>social.publish</Text>
            </View>
          )}
          {capabilities.canManageAccounts && (
            <View style={styles.capabilityChip}>
              <Text style={styles.capabilityChipText}>social.manage_accounts</Text>
            </View>
          )}
        </View>
      </View>

      {/* Error / Action Feedback Banner */}
      {errorMessage && (
        <View style={styles.errorBanner} testID="social-desk-error-banner">
          <Text style={styles.errorBannerTitle}>Social Desk Data Error</Text>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}

      {actionFeedback && (
        <View
          style={[
            styles.feedbackBanner,
            actionFeedback.tone === "warning" && styles.feedbackBannerWarning,
            actionFeedback.tone === "error" && styles.feedbackBannerError
          ]}
          testID="social-desk-feedback-banner"
        >
          <Text
            style={[
              styles.feedbackBannerText,
              actionFeedback.tone === "warning" && styles.feedbackBannerTextWarning,
              actionFeedback.tone === "error" && styles.feedbackBannerTextError
            ]}
          >
            {actionFeedback.message}
          </Text>
        </View>
      )}

      {/* Summary Counters */}
      <View style={styles.metricsGrid} testID="social-desk-counters">
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>DRAFT</Text>
          <Text style={styles.metricValue}>{counters.draft}</Text>
          <Text style={styles.metricHint}>Awaiting editorial approval</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>APPROVED</Text>
          <Text style={[styles.metricValue, { color: colors.blue700 }]}>{counters.approved}</Text>
          <Text style={styles.metricHint}>Ready for publish handoff</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>PUBLISHED</Text>
          <Text style={[styles.metricValue, { color: colors.emerald700 }]}>{counters.published}</Text>
          <Text style={styles.metricHint}>Confirmed by provider worker</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>FAILED</Text>
          <Text style={[styles.metricValue, { color: colors.rose700 }]}>{counters.failed}</Text>
          <Text style={styles.metricHint}>Provider delivery failed</Text>
        </View>
      </View>

      {/* Provider Account Readiness Summary */}
      <View style={styles.sectionCard} testID="social-desk-accounts-section">
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionEyebrow}>PROVIDER ACCOUNT REGISTRY</Text>
            <Text style={styles.sectionTitle}>Social Account Readiness</Text>
          </View>
          <Text style={styles.integrationNotice}>
            Account configuration is controlled by provider integration.
          </Text>
        </View>

        {accounts.length === 0 ? (
          <View style={styles.emptyAccountsBox} testID="social-desk-no-accounts">
            <Text style={styles.emptyAccountsTitle}>
              No social provider accounts are configured.
            </Text>
            <Text style={styles.emptyAccountsSub}>
              Account configuration is controlled by provider integration. No fabricated provider accounts or external tokens exist in this environment.
            </Text>
          </View>
        ) : (
          <View style={styles.accountsGrid}>
            {accounts.map((acc) => (
              <View key={acc.id} style={styles.accountCard} testID={`social-account-${acc.id}`}>
                <View style={styles.accountCardTop}>
                  <Text style={styles.accountProviderBadge}>
                    {formatProviderLabel(acc.provider)}
                  </Text>
                  <View
                    style={[
                      styles.accountStatusBadge,
                      acc.status === "ready" && styles.accountStatusReady,
                      acc.status === "unconfigured" && styles.accountStatusUnconfigured,
                      (acc.status === "disabled" || acc.status === "error") &&
                        styles.accountStatusError
                    ]}
                  >
                    <Text
                      style={[
                        styles.accountStatusText,
                        acc.status === "ready" && styles.accountStatusTextReady,
                        acc.status === "unconfigured" && styles.accountStatusTextUnconfigured,
                        (acc.status === "disabled" || acc.status === "error") &&
                          styles.accountStatusTextError
                      ]}
                    >
                      {acc.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.accountLabel}>{acc.accountLabel}</Text>
                <Text style={styles.accountMeta}>
                  Environment: {acc.environment.toUpperCase()}
                  {acc.providerAccountId ? ` • ID: ${acc.providerAccountId}` : " • No external account ID"}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Compose Social Draft Panel (gated by social.compose) */}
      {capabilities.canCompose && composeOpen && (
        <View style={styles.composeCard} testID="social-desk-compose-panel">
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionEyebrow}>COMPOSE SOCIAL DRAFT • SOCIAL.COMPOSE</Text>
              <Text style={styles.sectionTitle}>Create Story-Linked Social Draft</Text>
            </View>
          </View>

          {accounts.length === 0 ? (
            <View style={styles.composeBlockedBox} testID="social-compose-no-accounts-warning">
              <Text style={styles.composeBlockedTitle}>
                No social provider accounts are configured.
              </Text>
              <Text style={styles.composeBlockedText}>
                Configure a provider account before creating a social draft. Canonical server RPC communications_create_social_draft requires a registered provider account in public.social_accounts.
              </Text>
            </View>
          ) : (
            <>
              {/* Story Picker */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>1. Select Canonical Newsroom Story</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Filter stories by headline or status…"
                  placeholderTextColor={colors.gray400}
                  value={storySearch}
                  onChangeText={setStorySearch}
                  testID="social-compose-story-search"
                />
                {filteredStories.length === 0 ? (
                  <Text style={styles.fieldHint}>No canonical stories available to link.</Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.pickerScroll}
                  >
                    {filteredStories.map((story) => {
                      const selected = story.id === selectedStoryId;
                      return (
                        <Pressable
                          key={story.id}
                          style={[styles.pickerPill, selected && styles.pickerPillSelected]}
                          onPress={() => setSelectedStoryId(story.id)}
                          testID={`social-compose-story-option-${story.id}`}
                        >
                          <Text
                            style={[
                              styles.pickerPillTitle,
                              selected && styles.pickerPillTitleSelected
                            ]}
                            numberOfLines={1}
                          >
                            {story.title}
                          </Text>
                          <Text style={styles.pickerPillMeta}>
                            {story.status.toUpperCase()}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              {/* Provider / Account Picker */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>2. Select Configured Provider Account</Text>
                <View style={styles.pickerRow}>
                  {accounts.map((acc) => {
                    const selected = acc.id === selectedAccountForCompose?.id;
                    return (
                      <Pressable
                        key={acc.id}
                        style={[styles.pickerPill, selected && styles.pickerPillSelected]}
                        onPress={() => setSelectedAccountId(acc.id)}
                        testID={`social-compose-account-option-${acc.id}`}
                      >
                        <Text
                          style={[
                            styles.pickerPillTitle,
                            selected && styles.pickerPillTitleSelected
                          ]}
                        >
                          {acc.accountLabel} ({formatProviderLabel(acc.provider)})
                        </Text>
                        <Text style={styles.pickerPillMeta}>
                          Status: {acc.status.toUpperCase()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Post Copy Input */}
              <View style={styles.formField}>
                <View style={styles.fieldHeaderRow}>
                  <Text style={styles.fieldLabel}>3. Social Post Copy</Text>
                  <Text style={styles.charCounter}>{draftBody.trim().length} / 10000</Text>
                </View>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Write story-linked social copy for editorial review…"
                  placeholderTextColor={colors.gray400}
                  multiline
                  value={draftBody}
                  onChangeText={setDraftBody}
                  testID="social-compose-body-input"
                />
              </View>

              {composeError && (
                <Text style={styles.composeErrorText} testID="social-compose-error">
                  {composeError}
                </Text>
              )}

              <View style={styles.composeActionsRow}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => setComposeOpen(false)}
                  disabled={actionBusy}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.primaryButton,
                    (actionBusy || accounts.length === 0 || !selectedStoryId) &&
                      styles.buttonDisabled
                  ]}
                  onPress={handleSubmitDraft}
                  disabled={actionBusy || accounts.length === 0 || !selectedStoryId}
                  testID="social-compose-submit-btn"
                >
                  <Text style={styles.primaryButtonText}>
                    {actionBusy ? "Saving Draft…" : "Create Social Draft"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}

      {/* Main Split Workspace: Registry + Selected Post Inspector */}
      <View style={[styles.workspaceSplit, isDesktop && styles.workspaceSplitDesktop]}>
        {/* Left Column: Social Post Registry */}
        <View style={[styles.registryCol, isDesktop && styles.registryColDesktop]}>
          <View style={styles.filterCard}>
            <TextInput
              style={styles.textInput}
              placeholder="Search social posts by copy, story headline, or provider…"
              placeholderTextColor={colors.gray400}
              value={searchQuery}
              onChangeText={setSearchQuery}
              testID="social-desk-search-input"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsRow}
            >
              {STATUS_FILTERS.map((f) => {
                const active = statusFilter === f.key;
                return (
                  <Pressable
                    key={f.key}
                    style={[styles.filterPill, active && styles.filterPillActive]}
                    onPress={() => setStatusFilter(f.key)}
                    testID={`social-filter-${f.key}`}
                  >
                    <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {filteredPosts.length === 0 ? (
            <View style={styles.emptyRegistryCard} testID="social-desk-empty-posts">
              <Text style={styles.emptyRegistryTitle}>
                {posts.length === 0
                  ? "No social posts have been created yet."
                  : "No social posts match the current filter."}
              </Text>
              <Text style={styles.emptyRegistrySub}>
                {posts.length === 0
                  ? "Social posts are created from canonical stories via communications_create_social_draft once a provider account is registered."
                  : "Clear the status or search filter to inspect other social posts."}
              </Text>
            </View>
          ) : (
            <View style={styles.postList}>
              {filteredPosts.map((post) => {
                const isSelected = selectedPost?.id === post.id;
                const linkedStory = storyMap.get(post.storyId);
                const linkedAccount = post.socialAccountId
                  ? accountMap.get(post.socialAccountId)
                  : null;
                return (
                  <Pressable
                    key={post.id}
                    style={[styles.postCard, isSelected && styles.postCardSelected]}
                    onPress={() => handleSelectPost(post.id)}
                    testID={`social-post-card-${post.id}`}
                  >
                    <View style={styles.postCardHeader}>
                      <View style={styles.postBadgeRow}>
                        <Text style={styles.providerBadge}>
                          {formatProviderLabel(post.provider)}
                        </Text>
                        {linkedAccount && (
                          <Text style={styles.accountTag}>{linkedAccount.accountLabel}</Text>
                        )}
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          post.status === "draft" && styles.statusDraft,
                          post.status === "approved" && styles.statusApproved,
                          post.status === "published" && styles.statusPublished,
                          (post.status === "failed" || post.status === "cancelled") &&
                            styles.statusFailed
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            post.status === "draft" && styles.statusDraftText,
                            post.status === "approved" && styles.statusApprovedText,
                            post.status === "published" && styles.statusPublishedText,
                            (post.status === "failed" || post.status === "cancelled") &&
                              styles.statusFailedText
                          ]}
                        >
                          {post.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.postStoryTitle} numberOfLines={1}>
                      Story: {linkedStory ? linkedStory.title : `Story ${post.storyId.slice(0, 8)}`}
                    </Text>

                    <Text style={styles.postBodyPreview} numberOfLines={3}>
                      {post.body}
                    </Text>

                    <View style={styles.postFooterRow}>
                      <Text style={styles.postTimestamp}>
                        Updated {formatTimestamp(post.updatedAt)}
                      </Text>
                      {post.providerPostId && (
                        <Text style={styles.providerIdTag}>
                          Ref: {post.providerPostId}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Right Column: Selected Post Inspector & Lifecycle Actions */}
        <View style={[styles.inspectorCol, isDesktop && styles.inspectorColDesktop]}>
          {!selectedPost ? (
            <View style={styles.inspectorEmptyCard} testID="social-desk-inspector-empty">
              <Text style={styles.inspectorEmptyTitle}>Select a Social Post</Text>
              <Text style={styles.inspectorEmptyText}>
                Choose a story-linked social post from the registry to inspect its editorial approval state, linked story, and publication attempt history.
              </Text>
            </View>
          ) : (
            <View style={styles.inspectorCard} testID="social-desk-inspector">
              <View style={styles.inspectorHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>SOCIAL POST INSPECTOR</Text>
                  <Text style={styles.inspectorTitle}>
                    {formatProviderLabel(selectedPost.provider)} Distribution Item
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    selectedPost.status === "draft" && styles.statusDraft,
                    selectedPost.status === "approved" && styles.statusApproved,
                    selectedPost.status === "published" && styles.statusPublished,
                    (selectedPost.status === "failed" || selectedPost.status === "cancelled") &&
                      styles.statusFailed
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      selectedPost.status === "draft" && styles.statusDraftText,
                      selectedPost.status === "approved" && styles.statusApprovedText,
                      selectedPost.status === "published" && styles.statusPublishedText,
                      (selectedPost.status === "failed" || selectedPost.status === "cancelled") &&
                        styles.statusFailedText
                    ]}
                  >
                    {selectedPost.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Story Link Block */}
              <View style={styles.inspectorBlock}>
                <Text style={styles.blockLabel}>LINKED NEWSROOM STORY</Text>
                <Text style={styles.blockTitle}>
                  {selectedPostStory
                    ? selectedPostStory.title
                    : `Canonical Story (${selectedPost.storyId})`}
                </Text>
                <View style={styles.storyMetaRow}>
                  {selectedPostStory && (
                    <Text style={styles.blockMeta}>
                      Workflow: {selectedPostStory.status.toUpperCase()}
                    </Text>
                  )}
                  {!isPreview && (
                    <Pressable
                      style={styles.linkButton}
                      onPress={() =>
                        router.push(
                          `/studio/create-edit?storyId=${encodeURIComponent(selectedPost.storyId)}` as never
                        )
                      }
                      testID="social-inspector-open-story-btn"
                    >
                      <Text style={styles.linkButtonText}>Open Story Workspace →</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Account & Provenance Block */}
              <View style={styles.inspectorBlock}>
                <Text style={styles.blockLabel}>PROVIDER ACCOUNT & PROVENANCE</Text>
                <Text style={styles.blockValue}>
                  Account:{" "}
                  {selectedPostAccount
                    ? `${selectedPostAccount.accountLabel} (${selectedPostAccount.status.toUpperCase()})`
                    : "Unassigned / Default Provider Account"}
                </Text>
                <Text style={styles.blockMeta}>
                  Created: {formatTimestamp(selectedPost.createdAt)}
                </Text>
                <Text style={styles.blockMeta}>
                  Approved: {formatTimestamp(selectedPost.approvedAt)}
                </Text>
                <Text style={styles.blockMeta}>
                  Published: {formatTimestamp(selectedPost.publishedAt)}
                </Text>
                {selectedPost.providerPostId && (
                  <Text style={styles.blockMeta}>
                    Provider Post ID: {selectedPost.providerPostId}
                  </Text>
                )}
              </View>

              {/* Post Copy Block */}
              <View style={styles.inspectorBlock}>
                <Text style={styles.blockLabel}>SOCIAL POST COPY</Text>
                <View style={styles.copyBox}>
                  <Text style={styles.copyText}>{selectedPost.body}</Text>
                </View>
              </View>

              {/* Distinct Editorial Approval vs Publication Preparation Actions */}
              <View style={styles.workflowActionsBlock} testID="social-desk-workflow-actions">
                <Text style={styles.blockLabel}>WORKFLOW AUTHORITY ACTIONS</Text>
                <View style={styles.workflowButtonsRow}>
                  {capabilities.canApprove && selectedPost.status === "draft" && (
                    <Pressable
                      style={[styles.approveButton, actionBusy && styles.buttonDisabled]}
                      onPress={() => onApprovePost && onApprovePost(selectedPost.id)}
                      disabled={actionBusy}
                      testID="social-approve-draft-btn"
                    >
                      <Text style={styles.approveButtonText}>
                        {actionBusy ? "Approving…" : "Approve Draft"}
                      </Text>
                    </Pressable>
                  )}

                  {capabilities.canPublish && selectedPost.status === "approved" && (
                    <Pressable
                      style={[styles.publishButton, actionBusy && styles.buttonDisabled]}
                      onPress={() => onPreparePublish && onPreparePublish(selectedPost.id)}
                      disabled={actionBusy}
                      testID="social-prepare-publish-btn"
                    >
                      <Text style={styles.publishButtonText}>
                        {actionBusy ? "Preparing…" : "Prepare Publication"}
                      </Text>
                    </Pressable>
                  )}
                </View>

                <Text style={styles.workflowNotice}>
                  Editorial approval (social.approve) transitions a draft to approved without publishing. Publication preparation (social.publish) records a handoff attempt in social_publication_attempts; external provider completion is recorded exclusively by server worker authority.
                </Text>
              </View>

              {/* Publication Attempt History (visible when social.publish is held) */}
              {capabilities.canPublish && (
                <View style={styles.attemptsBlock} testID="social-desk-attempts-history">
                  <Text style={styles.blockLabel}>
                    PUBLICATION ATTEMPT HISTORY ({selectedPostAttempts.length})
                  </Text>
                  {selectedPostAttempts.length === 0 ? (
                    <Text style={styles.emptyAttemptsText}>
                      No publication attempts recorded for this social post.
                    </Text>
                  ) : (
                    <View style={styles.attemptsList}>
                      {selectedPostAttempts.map((att) => (
                        <View
                          key={att.id}
                          style={styles.attemptRow}
                          testID={`social-attempt-${att.id}`}
                        >
                          <View style={styles.attemptHeaderRow}>
                            <Text style={styles.attemptProvider}>
                              {formatProviderLabel(att.provider)}
                            </Text>
                            <View
                              style={[
                                styles.attemptStatusBadge,
                                att.status === "succeeded" && styles.statusPublished,
                                att.status === "pending" && styles.statusApproved,
                                att.status === "unconfigured" && styles.statusDraft,
                                att.status === "failed" && styles.statusFailed
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  att.status === "succeeded" && styles.statusPublishedText,
                                  att.status === "pending" && styles.statusApprovedText,
                                  att.status === "unconfigured" && styles.statusDraftText,
                                  att.status === "failed" && styles.statusFailedText
                                ]}
                              >
                                {att.status.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.attemptMeta}>
                            Attempted: {formatTimestamp(att.attemptedAt)}
                            {att.completedAt ? ` • Completed: ${formatTimestamp(att.completedAt)}` : ""}
                          </Text>
                          {att.providerPostId && (
                            <Text style={styles.attemptMeta}>
                              Provider Post ID: {att.providerPostId}
                            </Text>
                          )}
                          {att.safeReason && (
                            <Text style={styles.attemptReason}>
                              Reason: {att.safeReason}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export function StudioSocialDesk() {
  const [snapshot, setSnapshot] = useState<AuthorizationSnapshot | null>(null);
  const [accounts, setAccounts] = useState<NewsroomSocialAccount[]>([]);
  const [posts, setPosts] = useState<NewsroomSocialPost[]>([]);
  const [stories, setStories] = useState<NewsroomStory[]>([]);
  const [attemptsByPostId, setAttemptsByPostId] = useState<
    Record<string, NewsroomSocialPublicationAttempt[]>
  >({});
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    tone: "info" | "warning" | "error";
    message: string;
  } | null>(null);

  const capabilities = useMemo(() => getSocialDeskCapabilityMatrix(snapshot), [snapshot]);

  async function loadDeskData(preferredPostId?: string | null) {
    setLoading(true);
    setErrorMessage(null);
    try {
      const authSnap = await services.authorization.getSnapshot();
      setSnapshot(authSnap);
      const caps = getSocialDeskCapabilityMatrix(authSnap);
      if (!caps.canAccess) {
        setAccounts([]);
        setPosts([]);
        setStories([]);
        setLoading(false);
        return;
      }

      const canReadAccounts =
        caps.canManageAccounts || caps.canCompose || caps.canPublish;
      const canReadPosts = caps.canCompose || caps.canApprove || caps.canPublish;

      const [loadedAccounts, loadedPosts, loadedStories] = await Promise.all([
        canReadAccounts ? services.newsroomSocial.listAccounts() : Promise.resolve([]),
        canReadPosts ? services.newsroomSocial.listPosts({ limit: 100 }) : Promise.resolve([]),
        services.newsroomStories.listStories(100).catch(() => [] as NewsroomStory[])
      ]);

      setAccounts(loadedAccounts);
      setPosts(loadedPosts);
      setStories(loadedStories);

      const targetPostId =
        preferredPostId ??
        (selectedPostId && loadedPosts.some((p) => p.id === selectedPostId)
          ? selectedPostId
          : loadedPosts[0]?.id ?? null);
      setSelectedPostId(targetPostId);

      if (targetPostId && caps.canPublish) {
        const attempts = await services.newsroomSocial.listPublicationAttempts(targetPostId);
        setAttemptsByPostId((prev) => ({ ...prev, [targetPostId]: attempts }));
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to load Social Desk data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDeskData();
  }, []);

  async function handleSelectPost(postId: string) {
    setSelectedPostId(postId);
    if (capabilities.canPublish) {
      try {
        const attempts = await services.newsroomSocial.listPublicationAttempts(postId);
        setAttemptsByPostId((prev) => ({ ...prev, [postId]: attempts }));
      } catch (err: any) {
        setErrorMessage(err?.message || "Failed to load publication attempts.");
      }
    }
  }

  async function handleCreateDraft(input: NewsroomSocialDraftCreateInput) {
    setActionBusy(true);
    setActionFeedback(null);
    try {
      const newPostId = await services.newsroomSocial.createDraft(input);
      await loadDeskData(newPostId);
      setActionFeedback({
        tone: "info",
        message: "Social draft created and queued for editorial approval."
      });
    } finally {
      setActionBusy(false);
    }
  }

  async function handleApprovePost(postId: string) {
    setActionBusy(true);
    setActionFeedback(null);
    try {
      await services.newsroomSocial.approvePost(postId);
      await loadDeskData(postId);
      setActionFeedback({
        tone: "info",
        message: "Social draft approved. Ready for publication handoff preparation."
      });
    } catch (err: any) {
      setActionFeedback({
        tone: "error",
        message: err?.message || "Failed to approve social draft."
      });
    } finally {
      setActionBusy(false);
    }
  }

  async function handlePreparePublish(postId: string) {
    setActionBusy(true);
    setActionFeedback(null);
    try {
      const result = await services.newsroomSocial.preparePublish(postId);
      await loadDeskData(postId);
      const message = formatPublishPrepareFeedback(result);
      setActionFeedback({
        tone: result.providerReady ? "info" : "warning",
        message
      });
    } catch (err: any) {
      setActionFeedback({
        tone: "error",
        message: err?.message || "Failed to prepare social publication."
      });
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <StudioAnyCapabilityGate capabilities={SOCIAL_DESK_CAPABILITIES}>
      <StudioSocialDeskView
        accounts={accounts}
        posts={posts}
        stories={stories}
        attemptsByPostId={attemptsByPostId}
        capabilities={capabilities}
        loading={loading}
        errorMessage={errorMessage}
        actionBusy={actionBusy}
        actionFeedback={actionFeedback}
        onRefresh={() => void loadDeskData(selectedPostId)}
        onCreateDraft={handleCreateDraft}
        onApprovePost={handleApprovePost}
        onPreparePublish={handlePreparePublish}
        onSelectPost={(id) => void handleSelectPost(id)}
        selectedPostId={selectedPostId}
      />
    </StudioAnyCapabilityGate>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    gap: spacing.lg
  },
  headerCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: spacing.md
  },
  headerTitleCol: {
    flex: 1,
    minWidth: 260,
    gap: 6
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    color: colors.blue700
  },
  authorityBadge: {
    backgroundColor: colors.blue50,
    borderWidth: 1,
    borderColor: colors.blue100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  authorityBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: colors.blue900,
    letterSpacing: 0.6
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.ink
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
    maxWidth: 780
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  capabilityPillRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray100
  },
  capabilityStripLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.gray600,
    marginRight: 4
  },
  capabilityChip: {
    backgroundColor: colors.gray100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  capabilityChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.gray800
  },
  errorBanner: {
    backgroundColor: colors.rose50,
    borderWidth: 1,
    borderColor: colors.rose200,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4
  },
  errorBannerTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.rose800
  },
  errorBannerText: {
    fontSize: 13,
    color: colors.rose700
  },
  feedbackBanner: {
    backgroundColor: colors.emerald50,
    borderWidth: 1,
    borderColor: colors.emerald300,
    borderRadius: radius.md,
    padding: spacing.md
  },
  feedbackBannerWarning: {
    backgroundColor: colors.amber50,
    borderColor: colors.amber300
  },
  feedbackBannerError: {
    backgroundColor: colors.rose50,
    borderColor: colors.rose200
  },
  feedbackBannerText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.emerald800
  },
  feedbackBannerTextWarning: {
    color: colors.amber800
  },
  feedbackBannerTextError: {
    color: colors.rose800
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  metricCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: colors.gray500
  },
  metricValue: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.ink
  },
  metricHint: {
    fontSize: 11,
    color: colors.gray500
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: colors.blue700
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.ink,
    marginTop: 2
  },
  integrationNotice: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray600,
    backgroundColor: colors.gray50,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gray200
  },
  emptyAccountsBox: {
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 4
  },
  emptyAccountsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink
  },
  emptyAccountsSub: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.gray600
  },
  accountsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  accountCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 6
  },
  accountCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.xs
  },
  accountProviderBadge: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.blue900
  },
  accountStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.gray200
  },
  accountStatusReady: {
    backgroundColor: colors.emerald100
  },
  accountStatusUnconfigured: {
    backgroundColor: colors.amber100
  },
  accountStatusError: {
    backgroundColor: colors.rose100
  },
  accountStatusText: {
    fontSize: 9,
    fontWeight: "900",
    color: colors.gray800
  },
  accountStatusTextReady: {
    color: colors.emerald800
  },
  accountStatusTextUnconfigured: {
    color: colors.amber800
  },
  accountStatusTextError: {
    color: colors.rose800
  },
  accountLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink
  },
  accountMeta: {
    fontSize: 11,
    color: colors.gray600
  },
  composeCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.blue600,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md
  },
  composeBlockedBox: {
    backgroundColor: colors.amber50,
    borderWidth: 1,
    borderColor: colors.amber300,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 4
  },
  composeBlockedTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.amber800
  },
  composeBlockedText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.amber800
  },
  formField: {
    gap: 8
  },
  fieldHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink
  },
  fieldHint: {
    fontSize: 12,
    color: colors.gray500
  },
  charCounter: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray500
  },
  textInput: {
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.ink
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: "top"
  },
  pickerScroll: {
    gap: spacing.sm,
    paddingVertical: 4
  },
  pickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  pickerPill: {
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 280,
    gap: 2
  },
  pickerPillSelected: {
    backgroundColor: colors.blue50,
    borderColor: colors.blue600
  },
  pickerPillTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink
  },
  pickerPillTitleSelected: {
    color: colors.blue700
  },
  pickerPillMeta: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray500
  },
  composeErrorText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.rose700
  },
  composeActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm
  },
  workspaceSplit: {
    gap: spacing.lg
  },
  workspaceSplitDesktop: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  registryCol: {
    gap: spacing.md
  },
  registryColDesktop: {
    flex: 1.15
  },
  inspectorCol: {
    gap: spacing.md
  },
  inspectorColDesktop: {
    flex: 1
  },
  filterCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm
  },
  filterPillsRow: {
    gap: spacing.xs
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200
  },
  filterPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.gray700
  },
  filterPillTextActive: {
    color: colors.white
  },
  emptyRegistryCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: 6
  },
  emptyRegistryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink
  },
  emptyRegistrySub: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.gray600
  },
  postList: {
    gap: spacing.sm
  },
  postCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 8
  },
  postCardSelected: {
    borderColor: colors.blue600,
    backgroundColor: colors.blue50
  },
  postCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  },
  postBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap"
  },
  providerBadge: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.blue900,
    backgroundColor: colors.blue100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  accountTag: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray600
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.gray200
  },
  statusDraft: {
    backgroundColor: colors.amber100
  },
  statusApproved: {
    backgroundColor: colors.blue100
  },
  statusPublished: {
    backgroundColor: colors.emerald100
  },
  statusFailed: {
    backgroundColor: colors.rose100
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: colors.gray800
  },
  statusDraftText: {
    color: colors.amber800
  },
  statusApprovedText: {
    color: colors.blue900
  },
  statusPublishedText: {
    color: colors.emerald800
  },
  statusFailedText: {
    color: colors.rose800
  },
  postStoryTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.gray700
  },
  postBodyPreview: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink
  },
  postFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  postTimestamp: {
    fontSize: 11,
    color: colors.gray500
  },
  providerIdTag: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.emerald700
  },
  inspectorEmptyCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: 6
  },
  inspectorEmptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink
  },
  inspectorEmptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.gray600
  },
  inspectorCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md
  },
  inspectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  inspectorTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink,
    marginTop: 2
  },
  inspectorBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: spacing.md,
    gap: 4
  },
  blockLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: colors.gray500
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink
  },
  blockValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink
  },
  blockMeta: {
    fontSize: 12,
    color: colors.gray600
  },
  storyMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: 4
  },
  linkButton: {
    paddingVertical: 4
  },
  linkButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.blue600
  },
  copyBox: {
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: 4
  },
  copyText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.ink
  },
  workflowActionsBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: spacing.md,
    gap: spacing.sm
  },
  workflowButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  approveButton: {
    backgroundColor: colors.blue600,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.sm
  },
  approveButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.white
  },
  publishButton: {
    backgroundColor: colors.emerald600,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.sm
  },
  publishButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.white
  },
  workflowNotice: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.gray500
  },
  attemptsBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: spacing.md,
    gap: spacing.sm
  },
  emptyAttemptsText: {
    fontSize: 12,
    color: colors.gray500
  },
  attemptsList: {
    gap: spacing.xs
  },
  attemptRow: {
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 4
  },
  attemptHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  attemptProvider: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink
  },
  attemptStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  attemptMeta: {
    fontSize: 11,
    color: colors.gray600
  },
  attemptReason: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.amber800
  },
  primaryButton: {
    backgroundColor: colors.navy,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.sm
  },
  primaryButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.sm
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink
  },
  buttonDisabled: {
    opacity: 0.5
  }
});
