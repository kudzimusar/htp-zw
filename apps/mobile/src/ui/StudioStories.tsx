import { useState, useMemo } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { services } from "../services";
import { useAsync } from "../hooks/useAsync";
import { hasServerCapability } from "../security/capabilities";
import type { NewsroomStory } from "../domain/models";
import { colors, radius, spacing } from "../theme/tokens";

const WORKFLOW_STATUSES = [
  "All",
  "Draft",
  "Submitted",
  "Fact check",
  "Health / Science review",
  "Copy edit",
  "Editor review",
  "Ready",
  "Scheduled",
  "Published",
  "Updated / Corrected",
  "Archived"
] as const;

const ACCESS_POLICIES = ["All", "public", "premium"] as const;

export function resolveWorkflowStatus(story: { workflowStatus?: string | null; status?: string | null }): string {
  const ws = (story.workflowStatus ?? "").toLowerCase().trim();
  if (ws === "publish" || ws === "published") {
    return "Published";
  }
  if (story.workflowStatus && story.workflowStatus.trim()) {
    return story.workflowStatus.trim();
  }
  const lowerStatus = (story.status ?? "").toLowerCase().trim();
  if (lowerStatus === "publish" || lowerStatus === "published") {
    return "Published";
  }
  if (lowerStatus === "draft") {
    return "Draft";
  }
  if (lowerStatus) {
    return lowerStatus.charAt(0).toUpperCase() + lowerStatus.slice(1);
  }
  return "Draft";
}

function statusBadgeStyle(status: string | null) {
  switch (status) {
    case "Published":
      return { bg: "#EAF7ED", text: colors.success, border: "#B4E3C1" };
    case "Ready":
    case "Scheduled":
      return { bg: "#EEF5FF", text: colors.blue, border: "#B8D5FA" };
    case "Submitted":
    case "Fact check":
    case "Health / Science review":
    case "Copy edit":
    case "Editor review":
      return { bg: "#FFF8E6", text: colors.warning, border: "#F7D89C" };
    case "Updated / Corrected":
      return { bg: "#E6F7F7", text: colors.teal, border: "#A5E5E5" };
    default:
      return { bg: colors.paperMuted, text: colors.inkMuted, border: colors.border };
  }
}

export function StudioStories() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [policyFilter, setPolicyFilter] = useState<string>("All");
  const [deskFilter, setDeskFilter] = useState<string>("All");

  const storiesAsync = useAsync(
    () => services.newsroomStories.listStories(200),
    [refreshKey]
  );

  const authAsync = useAsync(
    () => services.authorization.getSnapshot(),
    []
  );

  const canCreate = authAsync.data
    ? hasServerCapability(authAsync.data, "story.create")
    : false;

  const stories = storiesAsync.data ?? [];

  const availableDesks = useMemo(() => {
    const set = new Set<string>();
    for (const story of stories) {
      if (story.desk && story.desk.trim()) {
        set.add(story.desk.trim());
      }
    }
    return ["All", ...Array.from(set).sort()];
  }, [stories]);

  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      if (statusFilter !== "All") {
        const curStatus = resolveWorkflowStatus(story);
        if (curStatus.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      if (policyFilter !== "All") {
        if (story.accessPolicy.toLowerCase() !== policyFilter.toLowerCase()) {
          return false;
        }
      }

      if (deskFilter !== "All") {
        if ((story.desk ?? "").trim().toLowerCase() !== deskFilter.toLowerCase()) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const titleMatch = story.title.toLowerCase().includes(query);
        const slugMatch = story.slug.toLowerCase().includes(query);
        const deskMatch = (story.desk ?? "").toLowerCase().includes(query);
        const topicMatch = (story.topic ?? "").toLowerCase().includes(query);
        if (!titleMatch && !slugMatch && !deskMatch && !topicMatch) {
          return false;
        }
      }

      return true;
    });
  }, [stories, statusFilter, policyFilter, deskFilter, searchQuery]);

  return (
    <View style={styles.container}>
      {/* Top Header & New Story Action */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.moduleTitle}>Newsroom Stories</Text>
          <Text style={styles.moduleSubtitle}>
            Server-backed editorial stories, drafts, reviews, and published coverage.
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.reviewQueueButton}
            onPress={() => router.push("/studio/review-queue" as never)}
            accessibilityRole="button"
          >
            <Text style={styles.reviewQueueButtonText}>Review Queue →</Text>
          </Pressable>
          <Pressable
            style={styles.refreshButton}
            onPress={() => setRefreshKey((k) => k + 1)}
            accessibilityRole="button"
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </Pressable>
          {canCreate && (
            <Pressable
              style={styles.newStoryButton}
              onPress={() => router.push("/studio/create-edit" as never)}
              accessibilityRole="button"
            >
              <Text style={styles.newStoryButtonText}>+ New Story</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Search & Filters */}
      <View style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by headline, slug, desk, or topic…"
          placeholderTextColor={colors.inkMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPills}
        >
          {WORKFLOW_STATUSES.map((status) => {
            const active = statusFilter === status;
            return (
              <Pressable
                key={status}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {status}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {availableDesks.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPills}
          >
            <Text style={[styles.filterLabel, { alignSelf: "center", marginRight: spacing.xs }]}>Desk:</Text>
            {availableDesks.map((d) => {
              const active = deskFilter === d;
              return (
                <Pressable
                  key={d}
                  style={[styles.subPill, active && styles.subPillActive]}
                  onPress={() => setDeskFilter(d)}
                >
                  <Text style={[styles.subPillText, active && styles.subPillTextActive]}>
                    {d}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.secondaryFilterRow}>
          <Text style={styles.filterLabel}>Access:</Text>
          {ACCESS_POLICIES.map((policy) => {
            const active = policyFilter === policy;
            return (
              <Pressable
                key={policy}
                style={[styles.subPill, active && styles.subPillActive]}
                onPress={() => setPolicyFilter(policy)}
              >
                <Text style={[styles.subPillText, active && styles.subPillTextActive]}>
                  {policy.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
          <Text style={styles.counterText}>
            Showing {filteredStories.length} of {stories.length} stories
          </Text>
        </View>
      </View>

      {/* Loading & Error States */}
      {storiesAsync.loading && (
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>Fetching Stories</Text>
          <Text style={styles.statusText}>Connecting to server-authoritative Newsroom kernel…</Text>
        </View>
      )}

      {storiesAsync.error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Failed to Load Stories</Text>
          <Text style={styles.errorText}>{storiesAsync.error.message}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => setRefreshKey((k) => k + 1)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Empty State */}
      {!storiesAsync.loading && !storiesAsync.error && filteredStories.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No Stories Found</Text>
          <Text style={styles.emptyText}>
            No stories match the active filters or query.
          </Text>
          {canCreate && (
            <Pressable
              style={styles.newStoryButtonSecondary}
              onPress={() => router.push("/studio/create-edit" as never)}
            >
              <Text style={styles.newStoryButtonSecondaryText}>Create First Story</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Story Cards List */}
      {!storiesAsync.loading && !storiesAsync.error && filteredStories.length > 0 && (
        <View style={styles.storyList}>
          {filteredStories.map((story) => {
            const curStatus = resolveWorkflowStatus(story);
            const statusStyle = statusBadgeStyle(curStatus);
            return (
              <Pressable
                key={story.id}
                style={styles.storyCard}
                onPress={() =>
                  router.push(`/studio/create-edit?storyId=${story.id}` as never)
                }
                accessibilityRole="button"
              >
                <View style={styles.cardHeader}>
                  <View style={styles.badgesRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: statusStyle.bg,
                          borderColor: statusStyle.border
                        }
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: statusStyle.text }
                        ]}
                      >
                        {curStatus}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.policyBadge,
                        story.accessPolicy === "premium" && styles.policyBadgePremium
                      ]}
                    >
                      <Text
                        style={[
                          styles.policyBadgeText,
                          story.accessPolicy === "premium" && styles.policyBadgePremiumText
                        ]}
                      >
                        {story.accessPolicy.toUpperCase()}
                      </Text>
                    </View>

                    {story.desk && (
                      <View style={styles.deskBadge}>
                        <Text style={styles.deskBadgeText}>{story.desk}</Text>
                      </View>
                    )}

                    {story.topic && (
                      <View style={styles.topicBadge}>
                        <Text style={styles.topicBadgeText}>{story.topic}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.lockVersion}>v{story.lockVersion}</Text>
                </View>

                <Text style={styles.storyTitle}>{story.title || "Untitled story"}</Text>

                {story.standfirst && (
                  <Text style={styles.storyStandfirst} numberOfLines={2}>
                    {story.standfirst}
                  </Text>
                )}

                <View style={styles.cardFooter}>
                  <Text style={styles.cardMeta}>
                    Slug: <Text style={styles.cardMetaHighlight}>{story.slug}</Text>
                  </Text>
                  <Text style={styles.cardMeta}>
                    Updated: {new Date(story.updatedAt).toLocaleDateString()}
                  </Text>
                  {story.deadlineAt && (
                    <Text style={styles.deadlineMeta}>
                      Deadline: {new Date(story.deadlineAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    flexWrap: "wrap"
  },
  headerTitleGroup: {
    flex: 1,
    minWidth: 260
  },
  moduleTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.ink
  },
  moduleSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
    marginTop: 2
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  refreshButton: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink
  },
  newStoryButton: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 18,
    backgroundColor: colors.blue,
    borderRadius: radius.sm
  },
  newStoryButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF"
  },
  filterSection: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm
  },
  searchInput: {
    minHeight: 42,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.ink
  },
  filterPills: {
    gap: spacing.xs,
    paddingVertical: 4
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border
  },
  pillActive: {
    backgroundColor: "#EEF5FF",
    borderColor: colors.blue
  },
  pillText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.inkMuted
  },
  pillTextActive: {
    color: colors.blue
  },
  secondaryFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexWrap: "wrap"
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.inkMuted
  },
  subPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.paperMuted
  },
  subPillActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  subPillText: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.inkMuted
  },
  subPillTextActive: {
    color: "#FFFFFF"
  },
  counterText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted,
    marginLeft: "auto"
  },
  statusBox: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.xs
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.ink
  },
  statusText: {
    fontSize: 13,
    color: colors.inkMuted
  },
  errorBox: {
    backgroundColor: "#FDF2F2",
    borderWidth: 1,
    borderColor: "#F5C2C2",
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.sm
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.live
  },
  errorText: {
    fontSize: 13,
    color: colors.ink
  },
  retryButton: {
    alignSelf: "flex-start",
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: colors.live,
    borderRadius: radius.sm
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  emptyBox: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.sm
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink
  },
  emptyText: {
    fontSize: 13,
    color: colors.inkMuted
  },
  newStoryButtonSecondary: {
    marginTop: spacing.sm,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 18,
    backgroundColor: colors.blue,
    borderRadius: radius.sm
  },
  newStoryButtonSecondaryText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF"
  },
  storyList: {
    gap: spacing.md
  },
  storyCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap"
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "900"
  },
  policyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border
  },
  policyBadgePremium: {
    backgroundColor: "#FAF3E8",
    borderColor: "#EAD6B5"
  },
  policyBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: colors.inkMuted
  },
  policyBadgePremiumText: {
    color: colors.premium
  },
  deskBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.paperMuted
  },
  deskBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.inkMuted
  },
  topicBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.paperMuted
  },
  topicBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.inkMuted
  },
  lockVersion: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.inkMuted
  },
  storyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink,
    lineHeight: 24
  },
  storyStandfirst: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexWrap: "wrap"
  },
  cardMeta: {
    fontSize: 11,
    color: colors.inkMuted
  },
  cardMetaHighlight: {
    fontWeight: "800",
    color: colors.ink
  },
  deadlineMeta: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.live,
    marginLeft: "auto"
  },
  reviewQueueButton: {
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
    justifyContent: "center"
  },
  reviewQueueButtonText: {
    color: colors.ink,
    fontWeight: "700",
    fontSize: 13
  }
});
