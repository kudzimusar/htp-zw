import { useState, useMemo } from "react";
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
import { useAsync } from "../hooks/useAsync";
import { hasServerCapability } from "../security/capabilities";
import {
  CURATED_HOMEPAGE_SECTIONS,
  deriveHomepageCurationState,
  isStoryPublishable,
  mergeHomepageDistribution,
  parseHomepagePlacement,
  type CuratedHomepageSectionKey,
  type HomepageCurationState,
  type HomepagePlacement,
  type NewsroomStory
} from "../domain/models";
import { breakpoints, colors, radius, spacing } from "../theme/tokens";

export function hasHomepageAuthority(snapshot: unknown): boolean {
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
    s.capabilities.includes("distribution.manage")
  );
}

export function formatSectionTitle(key: CuratedHomepageSectionKey): string {
  switch (key) {
    case "hero":
      return "Hero Story";
    case "top-stories":
      return "Top Stories (Ranks 1–6)";
    case "features":
      return "Features";
    case "public-health":
      return "Public Health";
    case "research":
      return "Research & Findings";
    case "health-business":
      return "Health Business & Financing";
    case "hiv-aids":
      return "HIV / AIDS";
    case "global-health":
      return "Global Health";
    case "premium":
      return "Premium Investigative";
    case "further-coverage":
      return "Further Coverage";
    default:
      return String(key);
  }
}

export type ConfirmationState = {
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
};

export type StudioHomepageViewProps = {
  stories: NewsroomStory[];
  curationState: HomepageCurationState;
  loading: boolean;
  error: Error | null;
  savingId: string | null;
  actionMessage: string | null;
  conflictError: string | null;
  onRefresh: () => void;
  onSetHero: (storyId: string) => void | Promise<void>;
  onRemoveHero: () => void | Promise<void>;
  onAssignPlacement: (
    section: CuratedHomepageSectionKey,
    rank: number,
    storyId: string
  ) => void | Promise<void>;
  onRemovePlacement: (storyId: string) => void | Promise<void>;
  onOpenStoryWorkspace?: (storyId: string) => void;
  topSlot?: React.ReactNode;
};

export function StudioHomepageView({
  stories,
  curationState,
  loading,
  error,
  savingId,
  actionMessage,
  conflictError,
  onRefresh,
  onSetHero,
  onRemoveHero,
  onAssignPlacement,
  onRemovePlacement,
  onOpenStoryWorkspace,
  topSlot
}: StudioHomepageViewProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.tablet;

  // Search and candidate filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deskFilter, setDeskFilter] = useState("All");
  const [policyFilter, setPolicyFilter] = useState("All");
  const [activeCuratedTab, setActiveCuratedTab] =
    useState<CuratedHomepageSectionKey>("features");

  // Selection modal state for adding a candidate to a slot
  const [targetSlot, setTargetSlot] = useState<{
    section: CuratedHomepageSectionKey;
    rank: number;
  } | null>(null);

  // Confirmation dialog
  const [pendingConfirmation, setPendingConfirmation] =
    useState<ConfirmationState | null>(null);

  // Available desks from candidate set
  const availableDesks = useMemo(() => {
    const set = new Set<string>();
    for (const s of stories) {
      if (s.desk && s.desk.trim()) set.add(s.desk.trim());
    }
    return ["All", ...Array.from(set).sort()];
  }, [stories]);

  // Filter eligible candidate stories
  const candidateStories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stories.filter((story) => {
      if (!isStoryPublishable(story)) return false;
      if (statusFilter !== "All") {
        const ws = (story.workflowStatus || story.status || "").toLowerCase();
        if (ws !== statusFilter.toLowerCase()) return false;
      }
      if (deskFilter !== "All" && story.desk !== deskFilter) {
        return false;
      }
      if (policyFilter !== "All" && story.accessPolicy !== policyFilter) {
        return false;
      }
      if (q) {
        const titleMatch = (story.title || "").toLowerCase().includes(q);
        const slugMatch = (story.slug || "").toLowerCase().includes(q);
        const standfirstMatch = (story.standfirst || "")
          .toLowerCase()
          .includes(q);
        if (!titleMatch && !slugMatch && !standfirstMatch) return false;
      }
      return true;
    });
  }, [stories, searchQuery, statusFilter, deskFilter, policyFilter]);

  // Handle hero replacement confirmation
  const initiateSetHero = (targetStoryId: string) => {
    const target = stories.find((s) => s.id === targetStoryId);
    if (!target) return;

    if (curationState.hero && curationState.hero.id !== targetStoryId) {
      setPendingConfirmation({
        title: "Replace Active Hero?",
        message: `Story "${curationState.hero.title}" is currently the active homepage Hero. It will be replaced by "${target.title}". The previous Hero will be unassigned. Proceed?`,
        onConfirm: async () => {
          setPendingConfirmation(null);
          await onSetHero(targetStoryId);
        }
      });
    } else {
      void onSetHero(targetStoryId);
    }
  };

  // Handle hero removal confirmation
  const initiateRemoveHero = () => {
    if (!curationState.hero) return;
    setPendingConfirmation({
      title: "Remove Active Hero?",
      message: `Are you sure you want to remove "${curationState.hero.title}" from Hero placement? The homepage will fall back to source-driven ranking.`,
      onConfirm: async () => {
        setPendingConfirmation(null);
        await onRemoveHero();
      }
    });
  };

  // Handle slot assignment with displacement confirmation
  const initiateAssignSlot = (
    section: CuratedHomepageSectionKey,
    rank: number,
    targetStoryId: string
  ) => {
    const target = stories.find((s) => s.id === targetStoryId);
    if (!target) return;

    let existingInSlot: NewsroomStory | undefined;
    if (section === "hero") {
      existingInSlot = curationState.hero || undefined;
    } else if (section === "top-stories") {
      existingInSlot = curationState.topStories.find((s) => {
        const p = parseHomepagePlacement(s.distribution?.homepage);
        return p?.rank === rank;
      });
    } else {
      existingInSlot = (curationState.sections[section] || []).find((s) => {
        const p = parseHomepagePlacement(s.distribution?.homepage);
        return p?.rank === rank;
      });
    }

    if (existingInSlot && existingInSlot.id !== targetStoryId) {
      setPendingConfirmation({
        title: `Displace Rank ${rank} Story?`,
        message: `Slot #${rank} in ${formatSectionTitle(section)} is currently assigned to "${existingInSlot.title}". It will be displaced by "${target.title}". Proceed?`,
        onConfirm: async () => {
          setPendingConfirmation(null);
          setTargetSlot(null);
          await onAssignPlacement(section, rank, targetStoryId);
        }
      });
    } else {
      setTargetSlot(null);
      void onAssignPlacement(section, rank, targetStoryId);
    }
  };

  const hasAnyCuration = Boolean(
    curationState.hero ||
      curationState.topStories.length > 0 ||
      Object.values(curationState.sections).some((arr) => arr.length > 0)
  );

  return (
    <View style={styles.container} testID="studio-homepage-view">
      {topSlot}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <View style={styles.headerTagRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.headerTag}>
                HealthTimes Newsroom OS • Distribution Control-Plane
              </Text>
            </View>
            <Text style={styles.title}>Homepage Curation</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              style={styles.refreshBtn}
              onPress={onRefresh}
              accessibilityRole="button"
              accessibilityLabel="Refresh Homepage Curation"
            >
              <Text style={styles.refreshBtnText}>Refresh Data</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Authoritative editorial control-plane for HealthTimes Home. Curate
          Hero, Top Stories, and key thematic sections with optimistic
          concurrency and full distribution key safety.
        </Text>
      </View>

      {/* Editorial Delivery Information Notice */}
      <View style={styles.deliveryNoticeBanner} testID="homepage-delivery-notice">
        <Text style={styles.deliveryNoticeText}>
          Homepage placements are stored as canonical Newsroom presentation metadata. Public Reader consumption will activate after the certified presentation delivery contract is connected.
        </Text>
      </View>

      {/* Notifications */}
      {actionMessage && (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>{actionMessage}</Text>
        </View>
      )}

      {conflictError && (
        <View style={styles.conflictBanner}>
          <Text style={styles.conflictTitle}>
            {conflictError.includes("partially applied")
              ? "Reconciliation Error"
              : "Version Conflict"}
          </Text>
          <Text style={styles.conflictText}>{conflictError}</Text>
          <Pressable style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryBtnText}>Reload Latest Stories</Text>
          </Pressable>
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}

      {loading && (
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>
            Loading server-authorized homepage curation state…
          </Text>
        </View>
      )}

      {/* Initial empty notice */}
      {!loading && !hasAnyCuration && (
        <View style={styles.emptyNoticeBox}>
          <Text style={styles.emptyNoticeTitle}>
            No Explicit Homepage Curation Saved
          </Text>
          <Text style={styles.emptyNoticeText}>
            No explicit Homepage curation has been saved yet. Assign a Hero or
            Top Stories below to activate explicit editorial curation. Public
            Reader consumption will activate after the certified presentation
            delivery contract is connected.
          </Text>
        </View>
      )}

      {/* Main Grid: Left = Active Curation, Right = Candidate Story Picker */}
      <View
        style={[
          styles.mainLayout,
          isDesktop ? styles.mainLayoutDesktop : styles.mainLayoutMobile
        ]}
      >
        {/* Left Column: Current Homepage Curation */}
        <View style={styles.curationColumn}>
          {/* Section 1: Hero Story */}
          <View style={styles.panelBox}>
            <View style={styles.panelHeaderRow}>
              <View>
                <Text style={styles.panelEyebrow}>PRIMARY POSITION</Text>
                <Text style={styles.panelTitle}>Hero Story (Max 1)</Text>
              </View>
              {curationState.hero && (
                <Pressable
                  style={styles.removeBtn}
                  onPress={initiateRemoveHero}
                  accessibilityRole="button"
                >
                  <Text style={styles.removeBtnText}>Remove Hero</Text>
                </Pressable>
              )}
            </View>

            {curationState.hero ? (
              <View style={styles.storyCard}>
                <View style={styles.cardTopRow}>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>ACTIVE HERO · RANK 1</Text>
                  </View>
                  <View style={styles.policyBadge}>
                    <Text style={styles.policyBadgeText}>
                      {curationState.hero.accessPolicy.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.versionText}>
                    v{curationState.hero.lockVersion}
                  </Text>
                </View>
                <Text style={styles.cardTitle}>{curationState.hero.title}</Text>
                {curationState.hero.standfirst && (
                  <Text style={styles.cardStandfirst} numberOfLines={2}>
                    {curationState.hero.standfirst}
                  </Text>
                )}
                <View style={styles.cardFooter}>
                  <Text style={styles.cardMeta}>
                    Slug:{" "}
                    <Text style={styles.cardMetaBold}>
                      {curationState.hero.slug}
                    </Text>
                  </Text>
                  <Text style={styles.cardMeta}>
                    Status: {curationState.hero.workflowStatus}
                  </Text>
                  {onOpenStoryWorkspace && (
                    <Pressable
                      style={styles.openLink}
                      onPress={() =>
                        onOpenStoryWorkspace(curationState.hero!.id)
                      }
                    >
                      <Text style={styles.openLinkText}>Edit in Workspace →</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.slotEmptyCard}>
                <Text style={styles.slotEmptyText}>
                  No active Hero curated. Reader Home displays the newest
                  published lead story as fallback.
                </Text>
                <Pressable
                  style={styles.assignSlotBtn}
                  onPress={() =>
                    setTargetSlot({ section: "hero", rank: 1 })
                  }
                >
                  <Text style={styles.assignSlotBtnText}>
                    + Assign Hero Story
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Section 2: Top Stories (Ranks 1 to 6) */}
          <View style={styles.panelBox}>
            <View style={styles.panelHeaderRow}>
              <View>
                <Text style={styles.panelEyebrow}>ORDERED LEAD PACKAGE</Text>
                <Text style={styles.panelTitle}>Top Stories (Ranks 1–6)</Text>
              </View>
              <Text style={styles.countBadge}>
                {curationState.topStories.length} / 6 Active
              </Text>
            </View>

            <View style={styles.slotsList}>
              {[1, 2, 3, 4, 5, 6].map((rank) => {
                const story = curationState.topStories.find((s) => {
                  const p = parseHomepagePlacement(s.distribution?.homepage);
                  return p?.rank === rank;
                });

                return (
                  <View key={`top-${rank}`} style={styles.slotRow}>
                    <View style={styles.rankPill}>
                      <Text style={styles.rankPillText}>#{rank}</Text>
                    </View>

                    {story ? (
                      <View style={styles.slotContent}>
                        <View style={styles.slotStoryHeader}>
                          <Text style={styles.slotStoryTitle} numberOfLines={1}>
                            {story.title}
                          </Text>
                          <View style={styles.slotActions}>
                            <Pressable
                              style={styles.slotChangeBtn}
                              onPress={() =>
                                setTargetSlot({
                                  section: "top-stories",
                                  rank
                                })
                              }
                            >
                              <Text style={styles.slotChangeBtnText}>
                                Replace
                              </Text>
                            </Pressable>
                            <Pressable
                              style={styles.slotRemoveBtn}
                              onPress={() => onRemovePlacement(story.id)}
                            >
                              <Text style={styles.slotRemoveBtnText}>✕</Text>
                            </Pressable>
                          </View>
                        </View>
                        <Text style={styles.slotMeta}>
                          {story.desk || "General"} · {story.accessPolicy} · v
                          {story.lockVersion}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.slotContentEmpty}>
                        <Text style={styles.slotFallbackNotice}>
                          Fallback story will fill slot #{rank}
                        </Text>
                        <Pressable
                          style={styles.slotAssignBtn}
                          onPress={() =>
                            setTargetSlot({
                              section: "top-stories",
                              rank
                            })
                          }
                        >
                          <Text style={styles.slotAssignBtnText}>
                            + Assign #{rank}
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Section 3: Curated Thematic Sections */}
          <View style={styles.panelBox}>
            <View style={styles.panelHeaderRow}>
              <View>
                <Text style={styles.panelEyebrow}>THEMATIC CURATION</Text>
                <Text style={styles.panelTitle}>Curated Sections (1–6)</Text>
              </View>
            </View>

            {/* Section tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.sectionTabsRail}
              contentContainerStyle={styles.sectionTabsContent}
            >
              {(
                [
                  "features",
                  "public-health",
                  "research",
                  "health-business",
                  "hiv-aids",
                  "global-health",
                  "premium",
                  "further-coverage"
                ] as CuratedHomepageSectionKey[]
              ).map((sec) => (
                <Pressable
                  key={sec}
                  style={[
                    styles.sectionTab,
                    activeCuratedTab === sec && styles.sectionTabActive
                  ]}
                  onPress={() => setActiveCuratedTab(sec)}
                >
                  <Text
                    style={[
                      styles.sectionTabText,
                      activeCuratedTab === sec && styles.sectionTabTextActive
                    ]}
                  >
                    {formatSectionTitle(sec)} (
                    {curationState.sections[sec]?.length || 0})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Active section slots */}
            <View style={styles.slotsList}>
              {[1, 2, 3, 4, 5, 6].map((rank) => {
                const story = (
                  curationState.sections[activeCuratedTab] || []
                ).find((s) => {
                  const p = parseHomepagePlacement(s.distribution?.homepage);
                  return p?.rank === rank;
                });

                return (
                  <View
                    key={`${activeCuratedTab}-${rank}`}
                    style={styles.slotRow}
                  >
                    <View style={styles.rankPill}>
                      <Text style={styles.rankPillText}>#{rank}</Text>
                    </View>

                    {story ? (
                      <View style={styles.slotContent}>
                        <View style={styles.slotStoryHeader}>
                          <Text style={styles.slotStoryTitle} numberOfLines={1}>
                            {story.title}
                          </Text>
                          <View style={styles.slotActions}>
                            <Pressable
                              style={styles.slotChangeBtn}
                              onPress={() =>
                                setTargetSlot({
                                  section: activeCuratedTab,
                                  rank
                                })
                              }
                            >
                              <Text style={styles.slotChangeBtnText}>
                                Replace
                              </Text>
                            </Pressable>
                            <Pressable
                              style={styles.slotRemoveBtn}
                              onPress={() => onRemovePlacement(story.id)}
                            >
                              <Text style={styles.slotRemoveBtnText}>✕</Text>
                            </Pressable>
                          </View>
                        </View>
                        <Text style={styles.slotMeta}>
                          {story.desk || "General"} · {story.accessPolicy} · v
                          {story.lockVersion}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.slotContentEmpty}>
                        <Text style={styles.slotFallbackNotice}>
                          Fallback story will fill slot #{rank}
                        </Text>
                        <Pressable
                          style={styles.slotAssignBtn}
                          onPress={() =>
                            setTargetSlot({
                              section: activeCuratedTab,
                              rank
                            })
                          }
                        >
                          <Text style={styles.slotAssignBtnText}>
                            + Assign #{rank}
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Right Column: Candidate Stories Picker */}
        <View style={styles.candidateColumn}>
          <View style={styles.panelBox}>
            <View style={styles.panelHeaderRow}>
              <View>
                <Text style={styles.panelEyebrow}>CANONICAL INVENTORY</Text>
                <Text style={styles.panelTitle}>Candidate Story Picker</Text>
              </View>
              <Text style={styles.countBadge}>
                {candidateStories.length} Eligible
              </Text>
            </View>

            {targetSlot && (
              <View style={styles.activeSlotTargetBox}>
                <Text style={styles.activeSlotTargetText}>
                  Assigning to:{" "}
                  <Text style={styles.activeSlotTargetBold}>
                    {formatSectionTitle(targetSlot.section)} (Slot #
                    {targetSlot.rank})
                  </Text>
                </Text>
                <Pressable
                  style={styles.cancelSlotTargetBtn}
                  onPress={() => setTargetSlot(null)}
                >
                  <Text style={styles.cancelSlotTargetBtnText}>Cancel</Text>
                </Pressable>
              </View>
            )}

            {/* Filter controls */}
            <View style={styles.filterControls}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search candidates by title, slug, or standfirst..."
                placeholderTextColor={colors.inkMuted}
              />

              <View style={styles.filterRow}>
                <View style={styles.filterPillGroup}>
                  <Text style={styles.filterLabel}>Desk:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {availableDesks.slice(0, 5).map((desk) => (
                      <Pressable
                        key={desk}
                        style={[
                          styles.deskFilterChip,
                          deskFilter === desk && styles.deskFilterChipActive
                        ]}
                        onPress={() => setDeskFilter(desk)}
                      >
                        <Text
                          style={[
                            styles.deskFilterChipText,
                            deskFilter === desk &&
                              styles.deskFilterChipTextActive
                          ]}
                        >
                          {desk}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            {/* Candidate list */}
            <View style={styles.candidateList}>
              {candidateStories.length === 0 ? (
                <View style={styles.noCandidatesBox}>
                  <Text style={styles.noCandidatesText}>
                    No eligible candidate stories match current filters.
                  </Text>
                </View>
              ) : (
                candidateStories.map((story) => {
                  const currentPlacement = parseHomepagePlacement(
                    story.distribution?.homepage
                  );
                  const isSavingThis = savingId === story.id;

                  return (
                    <View key={story.id} style={styles.candidateCard}>
                      <View style={styles.candidateCardHeader}>
                        <View style={styles.candidateCardBadges}>
                          <View style={styles.miniPolicyBadge}>
                            <Text style={styles.miniPolicyBadgeText}>
                              {story.accessPolicy.toUpperCase()}
                            </Text>
                          </View>
                          {currentPlacement?.active && (
                            <View style={styles.curatedPill}>
                              <Text style={styles.curatedPillText}>
                                {currentPlacement.section.toUpperCase()} #
                                {currentPlacement.rank}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.candidateLockVersion}>
                          v{story.lockVersion}
                        </Text>
                      </View>

                      <Text style={styles.candidateTitle} numberOfLines={2}>
                        {story.title}
                      </Text>
                      <Text style={styles.candidateSlug}>{story.slug}</Text>

                      {/* Action buttons */}
                      <View style={styles.candidateActions}>
                        {targetSlot ? (
                          <Pressable
                            style={[
                              styles.assignTargetBtn,
                              isSavingThis && styles.disabledBtn
                            ]}
                            disabled={isSavingThis}
                            onPress={() =>
                              initiateAssignSlot(
                                targetSlot.section,
                                targetSlot.rank,
                                story.id
                              )
                            }
                          >
                            <Text style={styles.assignTargetBtnText}>
                              {isSavingThis
                                ? "Saving…"
                                : `Place in ${formatSectionTitle(
                                    targetSlot.section
                                  )} #${targetSlot.rank}`}
                            </Text>
                          </Pressable>
                        ) : (
                          <>
                            <Pressable
                              style={[
                                styles.quickHeroBtn,
                                isSavingThis && styles.disabledBtn
                              ]}
                              disabled={isSavingThis}
                              onPress={() => initiateSetHero(story.id)}
                            >
                              <Text style={styles.quickHeroBtnText}>
                                Set Hero
                              </Text>
                            </Pressable>

                            <Pressable
                              style={[
                                styles.quickTopBtn,
                                isSavingThis && styles.disabledBtn
                              ]}
                              disabled={isSavingThis}
                              onPress={() =>
                                initiateAssignSlot(
                                  "top-stories",
                                  Math.min(
                                    6,
                                    curationState.topStories.length + 1
                                  ),
                                  story.id
                                )
                              }
                            >
                              <Text style={styles.quickTopBtnText}>
                                + Top Story
                              </Text>
                            </Pressable>

                            {currentPlacement?.active && (
                              <Pressable
                                style={styles.quickRemoveBtn}
                                onPress={() => onRemovePlacement(story.id)}
                              >
                                <Text style={styles.quickRemoveBtnText}>
                                  Unassign
                                </Text>
                              </Pressable>
                            )}
                          </>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Confirmation Modal */}
      {pendingConfirmation && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{pendingConfirmation.title}</Text>
            <Text style={styles.modalMessage}>
              {pendingConfirmation.message}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setPendingConfirmation(null)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalConfirmBtn}
                onPress={pendingConfirmation.onConfirm}
              >
                <Text style={styles.modalConfirmBtnText}>
                  Confirm & Update
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

export function StudioHomepage() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Authority snapshot
  const authAsync = useAsync(
    () => services.authorization.getSnapshot(),
    [refreshKey]
  );
  const authSnapshot = authAsync.data;
  const isAuthorized = hasHomepageAuthority(authSnapshot);

  // Stories query
  const storiesAsync = useAsync(async () => {
    if (!isAuthorized) return [];
    return await services.newsroomStories.listStories(200);
  }, [isAuthorized, refreshKey]);

  const stories = Array.isArray(storiesAsync.data) ? storiesAsync.data : [];
  const curationState = useMemo(
    () => deriveHomepageCurationState(stories),
    [stories]
  );

  // Set hero with confirmation and compensating rollback
  const handleSetHero = async (storyId: string) => {
    const target = stories.find((s) => s.id === storyId);
    if (!target) return;

    let serverMutationOccurred = false;
    try {
      setSavingId(storyId);
      setConflictError(null);
      setActionMessage(null);

      // Check if previous hero existed and needs displacement
      const displacedStory =
        curationState.hero && curationState.hero.id !== storyId
          ? curationState.hero
          : null;

      let displacedOriginalDistribution: Record<string, unknown> | null = null;
      let displacedNewLockVersion: number | null = null;

      if (displacedStory) {
        // Step A: Capture displaced story's original distribution and lockVersion
        displacedOriginalDistribution = displacedStory.distribution
          ? JSON.parse(JSON.stringify(displacedStory.distribution))
          : {};
        const displacedDist = mergeHomepageDistribution(
          displacedStory.distribution,
          null
        );

        // Step B: Save displaced story removal, capturing the new lockVersion returned by saveStory
        displacedNewLockVersion = await services.newsroomStories.saveStory(
          displacedStory.id,
          displacedStory.lockVersion,
          { distribution: displacedDist },
          "Homepage hero replaced"
        );
        serverMutationOccurred = true;
      }

      // Step C: Attempt target placement save
      const targetNextDist = mergeHomepageDistribution(target.distribution, {
        section: "hero",
        rank: 1,
        active: true
      });

      try {
        await services.newsroomStories.saveStory(
          target.id,
          target.lockVersion,
          { distribution: targetNextDist },
          "Homepage hero assigned"
        );
        serverMutationOccurred = true;

        // Step D (Target Success):
        setActionMessage(`Active Hero set to "${target.title}".`);
      } catch (targetErr: unknown) {
        // Step E (Target Failure): If displaced story was removed, attempt compensating rollback
        if (
          displacedStory &&
          displacedNewLockVersion !== null &&
          displacedOriginalDistribution !== null
        ) {
          try {
            await services.newsroomStories.saveStory(
              displacedStory.id,
              displacedNewLockVersion,
              { distribution: displacedOriginalDistribution },
              "Homepage replacement rollback"
            );
            const msg =
              targetErr instanceof Error ? targetErr.message : String(targetErr);
            if (
              msg.includes("VERSION_CONFLICT") ||
              msg.includes("version conflict")
            ) {
              setConflictError(
                `Version Conflict: Story "${target.title}" was modified concurrently by another editor. Previous Hero was restored.`
              );
            } else {
              setConflictError(
                `Failed to save Hero placement: ${msg}. Previous Hero was restored.`
              );
            }
            return;
          } catch (rollbackErr: unknown) {
            // Rollback failed -> reconciliation error
            setConflictError(
              "Homepage replacement was only partially applied. Canonical state has been reloaded; review the affected slot before continuing."
            );
            return;
          }
        }
        throw targetErr;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("VERSION_CONFLICT") ||
        msg.includes("version conflict")
      ) {
        setConflictError(
          `Version Conflict: Story "${target.title}" was modified concurrently by another editor. Please reload and retry.`
        );
      } else {
        setConflictError(`Failed to save Hero placement: ${msg}`);
      }
    } finally {
      if (serverMutationOccurred) {
        setRefreshKey((k) => k + 1);
      }
      setSavingId(null);
    }
  };

  // Remove hero
  const handleRemoveHero = async () => {
    if (!curationState.hero) return;
    const hero = curationState.hero;
    let serverMutationOccurred = false;
    try {
      setSavingId(hero.id);
      setConflictError(null);
      setActionMessage(null);

      const nextDist = mergeHomepageDistribution(hero.distribution, null);
      await services.newsroomStories.saveStory(
        hero.id,
        hero.lockVersion,
        { distribution: nextDist },
        "Homepage hero removed"
      );
      serverMutationOccurred = true;

      setActionMessage("Active Hero unassigned. Falling back to source-driven lead.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setConflictError(`Failed to remove Hero: ${msg}`);
    } finally {
      if (serverMutationOccurred) {
        setRefreshKey((k) => k + 1);
      }
      setSavingId(null);
    }
  };

  // Assign slot with compensating rollback
  const handleAssignPlacement = async (
    section: CuratedHomepageSectionKey,
    rank: number,
    storyId: string
  ) => {
    const target = stories.find((s) => s.id === storyId);
    if (!target) return;

    let serverMutationOccurred = false;
    try {
      setSavingId(storyId);
      setConflictError(null);
      setActionMessage(null);

      // Check if another story currently occupies this slot
      let existingStory: NewsroomStory | undefined;
      if (section === "hero") {
        existingStory = curationState.hero || undefined;
      } else if (section === "top-stories") {
        existingStory = curationState.topStories.find((s) => {
          const p = parseHomepagePlacement(s.distribution?.homepage);
          return p?.rank === rank;
        });
      } else {
        existingStory = (curationState.sections[section] || []).find((s) => {
          const p = parseHomepagePlacement(s.distribution?.homepage);
          return p?.rank === rank;
        });
      }

      const displacedStory =
        existingStory && existingStory.id !== storyId ? existingStory : null;
      let displacedOriginalDistribution: Record<string, unknown> | null = null;
      let displacedNewLockVersion: number | null = null;

      if (displacedStory) {
        // Step A: Capture displaced story's original distribution and lockVersion
        displacedOriginalDistribution = displacedStory.distribution
          ? JSON.parse(JSON.stringify(displacedStory.distribution))
          : {};
        const displacedDist = mergeHomepageDistribution(
          displacedStory.distribution,
          null
        );

        // Step B: Save displaced story removal, capturing the new lockVersion returned by saveStory
        displacedNewLockVersion = await services.newsroomStories.saveStory(
          displacedStory.id,
          displacedStory.lockVersion,
          { distribution: displacedDist },
          "Homepage curation updated - displaced"
        );
        serverMutationOccurred = true;
      }

      // Step C: Attempt target placement save
      const targetNextDist = mergeHomepageDistribution(target.distribution, {
        section,
        rank,
        active: true
      });

      try {
        await services.newsroomStories.saveStory(
          target.id,
          target.lockVersion,
          { distribution: targetNextDist },
          "Homepage curation updated"
        );
        serverMutationOccurred = true;

        // Step D (Target Success):
        setActionMessage(
          `Assigned "${target.title}" to ${formatSectionTitle(section)} #${rank}.`
        );
      } catch (targetErr: unknown) {
        // Step E (Target Failure): If displaced story was removed, attempt compensating rollback
        if (
          displacedStory &&
          displacedNewLockVersion !== null &&
          displacedOriginalDistribution !== null
        ) {
          try {
            await services.newsroomStories.saveStory(
              displacedStory.id,
              displacedNewLockVersion,
              { distribution: displacedOriginalDistribution },
              "Homepage replacement rollback"
            );
            const msg =
              targetErr instanceof Error ? targetErr.message : String(targetErr);
            if (
              msg.includes("VERSION_CONFLICT") ||
              msg.includes("version conflict")
            ) {
              setConflictError(
                `Version Conflict: Story "${target.title}" was modified concurrently. Displaced story was restored.`
              );
            } else {
              setConflictError(
                `Failed to assign placement: ${msg}. Displaced story was restored.`
              );
            }
            return;
          } catch (rollbackErr: unknown) {
            // Rollback failed -> reconciliation error
            setConflictError(
              "Homepage replacement was only partially applied. Canonical state has been reloaded; review the affected slot before continuing."
            );
            return;
          }
        }
        throw targetErr;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("VERSION_CONFLICT") ||
        msg.includes("version conflict")
      ) {
        setConflictError(
          `Version Conflict: Story "${target.title}" was modified concurrently. Please reload.`
        );
      } else {
        setConflictError(`Failed to assign placement: ${msg}`);
      }
    } finally {
      if (serverMutationOccurred) {
        setRefreshKey((k) => k + 1);
      }
      setSavingId(null);
    }
  };

  // Remove placement
  const handleRemovePlacement = async (storyId: string) => {
    const target = stories.find((s) => s.id === storyId);
    if (!target) return;

    let serverMutationOccurred = false;
    try {
      setSavingId(storyId);
      setConflictError(null);
      setActionMessage(null);

      const nextDist = mergeHomepageDistribution(target.distribution, null);
      await services.newsroomStories.saveStory(
        target.id,
        target.lockVersion,
        { distribution: nextDist },
        "Homepage curation updated - removed"
      );
      serverMutationOccurred = true;

      setActionMessage(`Removed "${target.title}" from homepage curation.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setConflictError(`Failed to remove placement: ${msg}`);
    } finally {
      if (serverMutationOccurred) {
        setRefreshKey((k) => k + 1);
      }
      setSavingId(null);
    }
  };

  // Fail-closed authorization checks
  if (authAsync.loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>
            Verifying distribution and homepage management authority with server…
          </Text>
        </View>
      </View>
    );
  }

  if (authAsync.error || authSnapshot?.status === "server-policy-unavailable") {
    return (
      <View style={styles.container}>
        <View style={styles.unauthorizedBox}>
          <Text style={styles.unauthorizedTitle}>Server Policy Unavailable</Text>
          <Text style={styles.unauthorizedText}>
            Unable to verify staff authorization policy from server. Homepage
            curation access is fail-closed.
          </Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => setRefreshKey((k) => k + 1)}
          >
            <Text style={styles.retryBtnText}>Retry Check</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!isAuthorized) {
    return (
      <View style={styles.container}>
        <View style={styles.unauthorizedBox}>
          <Text style={styles.unauthorizedTitle}>
            ACCESS RESTRICTED — Distribution Authority Required
          </Text>
          <Text style={styles.unauthorizedText}>
            Access to the Homepage Editorial Curation control-plane requires the
            "distribution.manage" server capability. Your authenticated staff
            session does not hold distribution authority.
          </Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => router.push("/studio/stories" as never)}
          >
            <Text style={styles.retryBtnText}>Return to Stories Workspace</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <StudioHomepageView
      stories={stories}
      curationState={curationState}
      loading={storiesAsync.loading}
      error={storiesAsync.error}
      savingId={savingId}
      actionMessage={actionMessage}
      conflictError={conflictError}
      onRefresh={() => setRefreshKey((k) => k + 1)}
      onSetHero={handleSetHero}
      onRemoveHero={handleRemoveHero}
      onAssignPlacement={handleAssignPlacement}
      onRemovePlacement={handleRemovePlacement}
      onOpenStoryWorkspace={(storyId) =>
        router.push({
          pathname: "/studio/[module]",
          params: { module: "create-edit", storyId }
        } as never)
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.lg,
    maxWidth: 1400,
    width: "100%",
    alignSelf: "center"
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.sm
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: spacing.md
  },
  headerTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.blue
  },
  headerTag: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.blue,
    letterSpacing: 0.5,
    textTransform: "uppercase"
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.ink,
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkMuted,
    maxWidth: 900
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  refreshBtn: {
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 38,
    justifyContent: "center"
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink
  },
  deliveryNoticeBanner: {
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: radius.sm,
    padding: spacing.md
  },
  deliveryNoticeText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#0369A1",
    fontWeight: "600"
  },
  successBanner: {
    backgroundColor: "#EAF7ED",
    borderWidth: 1,
    borderColor: "#B4E3C1",
    borderRadius: radius.sm,
    padding: spacing.md
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.success
  },
  conflictBanner: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.xs
  },
  conflictTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.warning
  },
  conflictText: {
    fontSize: 13,
    color: colors.ink
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.sm,
    padding: spacing.md
  },
  errorText: {
    fontSize: 13,
    color: colors.live,
    fontWeight: "600"
  },
  loadingBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingText: {
    fontSize: 14,
    color: colors.inkMuted
  },
  unauthorizedBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.sm
  },
  unauthorizedTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink
  },
  unauthorizedText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted
  },
  retryBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.blue,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.xs
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700"
  },
  emptyNoticeBox: {
    backgroundColor: "#EEF5FF",
    borderWidth: 1,
    borderColor: "#B8D5FA",
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs
  },
  emptyNoticeTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.blue
  },
  emptyNoticeText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink
  },
  mainLayout: {
    gap: spacing.lg
  },
  mainLayoutDesktop: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  mainLayoutMobile: {
    flexDirection: "column"
  },
  curationColumn: {
    flex: 3,
    gap: spacing.lg,
    minWidth: 320
  },
  candidateColumn: {
    flex: 2,
    minWidth: 300
  },
  panelBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md
  },
  panelHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  panelEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.inkMuted,
    letterSpacing: 0.5
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink
  },
  countBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.blue,
    backgroundColor: "#EEF5FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999
  },
  storyCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.xs
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  heroBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#FECACA"
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.live
  },
  policyBadge: {
    backgroundColor: colors.paperMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border
  },
  policyBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.inkMuted
  },
  versionText: {
    fontSize: 10,
    color: colors.inkMuted,
    marginLeft: "auto"
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
    lineHeight: 22
  },
  cardStandfirst: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkMuted
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  cardMeta: {
    fontSize: 11,
    color: colors.inkMuted
  },
  cardMetaBold: {
    fontWeight: "700",
    color: colors.ink
  },
  openLink: {
    marginLeft: "auto"
  },
  openLinkText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.blue
  },
  slotEmptyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.paperMuted
  },
  slotEmptyText: {
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: "center"
  },
  assignSlotBtn: {
    backgroundColor: colors.blue,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm
  },
  assignSlotBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },
  removeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2"
  },
  removeBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.live
  },
  slotsList: {
    gap: spacing.xs
  },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.xs,
    backgroundColor: "#FFFFFF"
  },
  rankPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.paperMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  rankPillText: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.ink
  },
  slotContent: {
    flex: 1,
    gap: 2
  },
  slotStoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  slotStoryTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    marginRight: spacing.sm
  },
  slotActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  slotChangeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border
  },
  slotChangeBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink
  },
  slotRemoveBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center"
  },
  slotRemoveBtnText: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.live
  },
  slotMeta: {
    fontSize: 10,
    color: colors.inkMuted
  },
  slotContentEmpty: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  slotFallbackNotice: {
    fontSize: 12,
    fontStyle: "italic",
    color: colors.inkMuted
  },
  slotAssignBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: "#EEF5FF",
    borderWidth: 1,
    borderColor: "#B8D5FA"
  },
  slotAssignBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.blue
  },
  sectionTabsRail: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs
  },
  sectionTabsContent: {
    gap: spacing.xs
  },
  sectionTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border
  },
  sectionTabActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue
  },
  sectionTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink
  },
  sectionTabTextActive: {
    color: "#FFFFFF"
  },
  activeSlotTargetBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EEF5FF",
    borderWidth: 1,
    borderColor: "#B8D5FA",
    borderRadius: radius.sm,
    padding: spacing.sm
  },
  activeSlotTargetText: {
    fontSize: 12,
    color: colors.ink
  },
  activeSlotTargetBold: {
    fontWeight: "800",
    color: colors.blue
  },
  cancelSlotTargetBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border
  },
  cancelSlotTargetBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink
  },
  filterControls: {
    gap: spacing.xs
  },
  searchInput: {
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.ink
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  filterPillGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted
  },
  deskFilterChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 4
  },
  deskFilterChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  deskFilterChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink
  },
  deskFilterChipTextActive: {
    color: "#FFFFFF"
  },
  candidateList: {
    gap: spacing.xs,
    maxHeight: 650,
    overflow: "scroll"
  },
  noCandidatesBox: {
    padding: spacing.lg,
    alignItems: "center"
  },
  noCandidatesText: {
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: "center"
  },
  candidateCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 2
  },
  candidateCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  candidateCardBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  miniPolicyBadge: {
    backgroundColor: colors.paperMuted,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2
  },
  miniPolicyBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.inkMuted
  },
  curatedPill: {
    backgroundColor: "#EAF7ED",
    borderWidth: 1,
    borderColor: "#B4E3C1",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2
  },
  curatedPillText: {
    fontSize: 9,
    fontWeight: "900",
    color: colors.success
  },
  candidateLockVersion: {
    fontSize: 10,
    color: colors.inkMuted
  },
  candidateTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    lineHeight: 18
  },
  candidateSlug: {
    fontSize: 11,
    color: colors.inkMuted
  },
  candidateActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4
  },
  assignTargetBtn: {
    backgroundColor: colors.blue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    flex: 1,
    alignItems: "center"
  },
  assignTargetBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800"
  },
  quickHeroBtn: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  quickHeroBtnText: {
    color: colors.live,
    fontSize: 11,
    fontWeight: "800"
  },
  quickTopBtn: {
    backgroundColor: "#EEF5FF",
    borderWidth: 1,
    borderColor: "#B8D5FA",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  quickTopBtnText: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "800"
  },
  quickRemoveBtn: {
    marginLeft: "auto",
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  quickRemoveBtnText: {
    fontSize: 11,
    color: colors.live,
    fontWeight: "700"
  },
  disabledBtn: {
    opacity: 0.5
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    zIndex: 999
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    padding: spacing.xl,
    maxWidth: 480,
    width: "100%",
    gap: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink
  },
  modalMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink
  },
  modalActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  modalCancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink
  },
  modalConfirmBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.blue
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF"
  }
});
