import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LiveRail, AdSlot, formatLiveUpdateCountLabel } from "../../src/ui/Cards";
import { Chip, EmptyState, LoadingBlock, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { radius, spacing } from "../../src/theme/tokens";
import { useAppearance } from "../../src/theme/AppearanceProvider";
import type { LiveBlogUpdate, LiveItem } from "../../src/domain/models";

type LiveTab="live"|"blog"|"upcoming";

export const LIVE_BLOG_POLL_INTERVAL_MS = 10_000;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidLiveCoverageId(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  return UUID_REGEX.test(value.trim());
}

export function computeMaxStreamSeq(
  updates: LiveBlogUpdate[],
  currentMax: number | null = null
): number | null {
  let maxSeq =
    typeof currentMax === "number" && Number.isSafeInteger(currentMax) && currentMax >= 1
      ? currentMax
      : null;
  for (const item of updates) {
    if (
      item &&
      typeof item.streamSeq === "number" &&
      Number.isSafeInteger(item.streamSeq) &&
      item.streamSeq >= 1
    ) {
      if (maxSeq === null || item.streamSeq > maxSeq) {
        maxSeq = item.streamSeq;
      }
    }
  }
  return maxSeq;
}

export function mergeAndSortLiveUpdates(
  existing: LiveBlogUpdate[],
  incoming: LiveBlogUpdate[]
): LiveBlogUpdate[] {
  const byId = new Map<string, LiveBlogUpdate>();
  const seenSeq = new Set<number>();

  for (const item of incoming) {
    if (item && typeof item.id === "string") {
      byId.set(item.id, item);
      if (typeof item.streamSeq === "number" && Number.isSafeInteger(item.streamSeq)) {
        seenSeq.add(item.streamSeq);
      }
    }
  }
  for (const item of existing) {
    if (item && typeof item.id === "string" && !byId.has(item.id)) {
      if (
        typeof item.streamSeq === "number" &&
        Number.isSafeInteger(item.streamSeq) &&
        seenSeq.has(item.streamSeq)
      ) {
        continue;
      }
      byId.set(item.id, item);
      if (typeof item.streamSeq === "number" && Number.isSafeInteger(item.streamSeq)) {
        seenSeq.add(item.streamSeq);
      }
    }
  }

  const merged = Array.from(byId.values());
  merged.sort((a, b) => {
    const seqA = typeof a.streamSeq === "number" && Number.isSafeInteger(a.streamSeq) ? a.streamSeq : 0;
    const seqB = typeof b.streamSeq === "number" && Number.isSafeInteger(b.streamSeq) ? b.streamSeq : 0;
    if (seqB !== seqA) return seqB - seqA;
    const tA = Date.parse(a.publishedAt);
    const tB = Date.parse(b.publishedAt);
    const validA = Number.isNaN(tA) ? 0 : tA;
    const validB = Number.isNaN(tB) ? 0 : tB;
    if (validB !== validA) return validB - validA;
    return b.id.localeCompare(a.id);
  });
  return merged;
}

export function advanceLiveStreamCursor(
  state: { updates: LiveBlogUpdate[]; lastSeenStreamSeq: number | null },
  incoming: LiveBlogUpdate[]
): { updates: LiveBlogUpdate[]; lastSeenStreamSeq: number | null } {
  const merged = mergeAndSortLiveUpdates(state.updates, incoming);
  const nextCursor = computeMaxStreamSeq(merged, computeMaxStreamSeq(incoming, state.lastSeenStreamSeq));
  return {
    updates: merged,
    lastSeenStreamSeq: nextCursor
  };
}

function updatedLabel(value:string){
  const date=new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

export default function LiveScreen(){
  const router=useRouter();
  const params=useLocalSearchParams<{ id?: string | string[] }>();
  const paramId=Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { palette }=useAppearance();
  const [active,setActive]=useState<LiveTab>("live");
  const [selectedCoverageId,setSelectedCoverageId]=useState<string | null>(() =>
    typeof paramId === "string" && paramId.trim().length > 0 ? paramId.trim() : null
  );

  useEffect(() => {
    const normalized = typeof paramId === "string" && paramId.trim().length > 0 ? paramId.trim() : null;
    setSelectedCoverageId(normalized);
  }, [paramId]);

  const live=useAsync(()=>services.live.list(),[]);
  const [polledSource,setPolledSource]=useState<LiveItem[] | null>(null);
  const source=polledSource ?? live.data ?? [];

  const [updates,setUpdates]=useState<LiveBlogUpdate[]>([]);
  const [updatesLoading,setUpdatesLoading]=useState(false);
  const [updatesRefreshing,setUpdatesRefreshing]=useState(false);
  const [updatesError,setUpdatesError]=useState<string | null>(null);
  const [streamEnded,setStreamEnded]=useState(false);

  const pollSeqRef=useRef(0);
  const lastSeenStreamSeqRef=useRef<number | null>(null);

  const selectedCoverage=useMemo(() => {
    if (!selectedCoverageId) return null;
    return source.find((item) => item.id === selectedCoverageId) ?? null;
  }, [selectedCoverageId, source]);

  const loadInitialStream = useCallback(async (coverageId: string) => {
    if (!isValidLiveCoverageId(coverageId)) {
      setUpdates([]);
      setUpdatesLoading(false);
      setUpdatesRefreshing(false);
      setUpdatesError(null);
      setStreamEnded(false);
      lastSeenStreamSeqRef.current = null;
      return;
    }

    const seq = ++pollSeqRef.current;
    setUpdatesLoading(true);
    setUpdatesError(null);
    setStreamEnded(false);
    lastSeenStreamSeqRef.current = null;

    try {
      const [latestCoverage, initialUpdates] = await Promise.all([
        services.live.list(),
        services.live.listUpdates(coverageId, { afterSeq: null, limit: 100 })
      ]);
      if (seq !== pollSeqRef.current) return;

      setPolledSource(latestCoverage);
      const nextState = advanceLiveStreamCursor(
        { updates: [], lastSeenStreamSeq: null },
        initialUpdates
      );
      setUpdates(nextState.updates);
      lastSeenStreamSeqRef.current = nextState.lastSeenStreamSeq;

      const matched = latestCoverage.find((c) => c.id === coverageId) ?? null;
      if (!matched || matched.status === "ended" || matched.kind !== "live-blog") {
        setStreamEnded(true);
      }
    } catch {
      if (seq !== pollSeqRef.current) return;
      setUpdatesError("Live updates are temporarily unavailable.");
    } finally {
      if (seq === pollSeqRef.current) {
        setUpdatesLoading(false);
        setUpdatesRefreshing(false);
      }
    }
  }, []);

  const refreshLiveStream = useCallback(async (coverageId: string, isManual = false) => {
    if (!isValidLiveCoverageId(coverageId)) return;
    const seq = ++pollSeqRef.current;
    if (isManual) {
      setUpdatesRefreshing(true);
      setUpdatesError(null);
    }

    try {
      const afterSeqCursor = lastSeenStreamSeqRef.current;
      const [latestCoverage, incomingUpdates] = await Promise.all([
        services.live.list(),
        services.live.listUpdates(coverageId, { afterSeq: afterSeqCursor, limit: 100 })
      ]);
      if (seq !== pollSeqRef.current) return;

      setPolledSource(latestCoverage);
      setUpdates((prev) => {
        const nextState = advanceLiveStreamCursor(
          { updates: prev, lastSeenStreamSeq: lastSeenStreamSeqRef.current },
          incomingUpdates
        );
        lastSeenStreamSeqRef.current = nextState.lastSeenStreamSeq;
        return nextState.updates;
      });

      const matched = latestCoverage.find((c) => c.id === coverageId) ?? null;
      if (!matched || matched.status === "ended" || matched.kind !== "live-blog") {
        setStreamEnded(true);
      } else {
        setStreamEnded(false);
      }
    } catch {
      if (seq !== pollSeqRef.current) return;
      if (isManual) {
        setUpdatesError("Live updates are temporarily unavailable.");
      }
    } finally {
      if (seq === pollSeqRef.current) {
        setUpdatesRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!selectedCoverageId) {
      pollSeqRef.current += 1;
      setUpdates([]);
      setUpdatesLoading(false);
      setUpdatesRefreshing(false);
      setUpdatesError(null);
      setStreamEnded(false);
      lastSeenStreamSeqRef.current = null;
      return;
    }
    void loadInitialStream(selectedCoverageId);
  }, [selectedCoverageId, loadInitialStream]);

  const shouldPoll = Boolean(
    selectedCoverageId &&
      isValidLiveCoverageId(selectedCoverageId) &&
      selectedCoverage &&
      selectedCoverage.kind === "live-blog" &&
      selectedCoverage.status === "live" &&
      !streamEnded &&
      !updatesLoading
  );

  useEffect(() => {
    if (!shouldPoll || !selectedCoverageId) return;
    const intervalId = setInterval(() => {
      void refreshLiveStream(selectedCoverageId, false);
    }, LIVE_BLOG_POLL_INTERVAL_MS);
    return () => {
      clearInterval(intervalId);
    };
  }, [shouldPoll, selectedCoverageId, refreshLiveStream]);

  const openCoverage = useCallback((item: LiveItem) => {
    if (item.kind !== "live-blog") return;
    setSelectedCoverageId(item.id);
    router.push(("/live?id=" + encodeURIComponent(item.id)) as never);
  }, [router]);

  const closeCoverage = useCallback(() => {
    setSelectedCoverageId(null);
    router.replace("/live" as never);
  }, [router]);

  const items=useMemo(()=>{
    if(active==="blog") return source.filter((item)=>item.kind==="live-blog");
    if(active==="upcoming") return source.filter((item)=>item.status==="upcoming");
    return source.filter((item)=>item.status==="live");
  },[active,source]);

  const [featured,...secondary]=items;
  const hasCoverage=source.length>0;
  const updated=featured ? updatedLabel(featured.updatedAt) : null;
  const featuredUpdateLabel=featured ? formatLiveUpdateCountLabel(featured) : null;

  const renderDetailView = () => {
    if (!selectedCoverageId) return null;

    if (!isValidLiveCoverageId(selectedCoverageId)) {
      return (
        <Section>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to all live coverage"
            style={[styles.backButton,{borderColor:palette.border}]}
            onPress={closeCoverage}
          >
            <Text style={[styles.backButtonText,{color:palette.ink}]}>← All live coverage</Text>
          </Pressable>
          <EmptyState
            title="Invalid live coverage reference."
            message="The requested live coverage link is malformed or invalid. Return to Live to view active HealthTimes reporting."
          />
        </Section>
      );
    }

    if ((live.loading && !live.data && !polledSource) || updatesLoading) {
      return (
        <Section>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to all live coverage"
            style={[styles.backButton,{borderColor:palette.border}]}
            onPress={closeCoverage}
          >
            <Text style={[styles.backButtonText,{color:palette.ink}]}>← All live coverage</Text>
          </Pressable>
          <LoadingBlock label="Loading live updates…" />
        </Section>
      );
    }

    if (updatesError) {
      return (
        <Section>
          <View style={styles.streamTopBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to all live coverage"
              style={[styles.backButton,{borderColor:palette.border}]}
              onPress={closeCoverage}
            >
              <Text style={[styles.backButtonText,{color:palette.ink}]}>← All live coverage</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh updates"
              style={[styles.refreshButton,{borderColor:palette.border,backgroundColor:palette.paper}]}
              onPress={() => void loadInitialStream(selectedCoverageId)}
            >
              <Text style={[styles.refreshButtonText,{color:palette.blue}]}>Refresh updates</Text>
            </Pressable>
          </View>
          <EmptyState
            title="Live updates are temporarily unavailable."
            message="HealthTimes could not load updates for this live blog right now. Please try again."
          />
        </Section>
      );
    }

    const isEndedOrNotPublic =
      !selectedCoverage ||
      selectedCoverage.status === "ended" ||
      selectedCoverage.kind !== "live-blog" ||
      streamEnded;

    if (isEndedOrNotPublic) {
      return (
        <Section>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to all live coverage"
            style={[styles.backButton,{borderColor:palette.border}]}
            onPress={closeCoverage}
          >
            <Text style={[styles.backButtonText,{color:palette.ink}]}>← All live coverage</Text>
          </Pressable>
          <EmptyState
            title="This live coverage has ended or is no longer active."
            message="Live blog updates are shown while coverage is active. Choose another active event on HealthTimes Live."
          />
          {updates.length > 0 ? (
            <View style={styles.updateFeed}>
              {updates.map((entry) => {
                const entryTime = updatedLabel(entry.publishedAt) ?? entry.publishedAt;
                return (
                  <View key={entry.id} style={[styles.updateCard,{borderColor:palette.border,backgroundColor:palette.paper}]}>
                    <Text style={[styles.updateTimestamp,{color:palette.live}]}>{entryTime}</Text>
                    {entry.headline ? (
                      <Text style={[styles.updateHeadline,{color:palette.ink}]}>{entry.headline}</Text>
                    ) : null}
                    <Text style={[styles.updateBody,{color:palette.ink}]}>{entry.body}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </Section>
      );
    }

    const effectiveCount = Math.max(selectedCoverage.updateCount ?? 0, updates.length);
    const countLabel = effectiveCount === 1 ? "1 update" : effectiveCount + " updates";
    const coverageUpdated = updatedLabel(selectedCoverage.updatedAt);

    return (
      <Section>
        <View style={styles.streamTopBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to all live coverage"
            style={[styles.backButton,{borderColor:palette.border}]}
            onPress={closeCoverage}
          >
            <Text style={[styles.backButtonText,{color:palette.ink}]}>← All live coverage</Text>
          </Pressable>
          <View style={styles.streamControls}>
            {selectedCoverage.status === "live" ? (
              <Text style={[styles.pollingHint,{color:palette.inkMuted}]}>
                {updatesRefreshing ? "Refreshing…" : "Auto-updating every 10s"}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh updates"
              disabled={updatesRefreshing}
              style={[styles.refreshButton,{borderColor:palette.border,backgroundColor:palette.paper}]}
              onPress={() => void refreshLiveStream(selectedCoverageId, true)}
            >
              <Text style={[styles.refreshButtonText,{color:palette.blue}]}>Refresh updates</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.featured,{borderColor:palette.border}]}>
          {selectedCoverage.media?.publicUrl ? (
            <Image
              source={{uri:selectedCoverage.media.publicUrl}}
              style={[styles.featuredImage,{backgroundColor:palette.paperMuted}]}
              accessibilityLabel={selectedCoverage.media.altText ?? selectedCoverage.title}
            />
          ) : null}
          <View style={styles.featuredBody}>
            <View style={styles.badgeRow}>
              <Text style={[styles.liveBadge,{backgroundColor:selectedCoverage.status==="live"?palette.live:palette.inkMuted}]}>
                {selectedCoverage.status==="live" ? "LIVE" : "UPCOMING"}
              </Text>
              <Text style={[styles.kindLabel,{color:palette.live}]}>LIVE BLOG</Text>
            </View>
            <Text style={[styles.featuredTitle,{color:palette.ink}]}>{selectedCoverage.title}</Text>
            {selectedCoverage.summary ? (
              <Text style={[styles.coverageSummary,{color:palette.inkMuted}]}>{selectedCoverage.summary}</Text>
            ) : null}
            <Text style={[styles.meta,{color:palette.inkMuted}]}>
              {countLabel}
              {coverageUpdated ? " · Updated " + coverageUpdated : ""}
            </Text>
          </View>
        </View>

        {updates.length === 0 ? (
          <EmptyState
            title="Live coverage is active. Updates will appear here as the newsroom publishes them."
            message="The HealthTimes newsroom has opened this live blog. Entries will appear here in real time as reporters file them."
          />
        ) : (
          <View style={styles.updateFeed} accessibilityLabel="Live blog update stream">
            {updates.map((entry) => {
              const entryTime = updatedLabel(entry.publishedAt) ?? entry.publishedAt;
              return (
                <View key={entry.id} style={[styles.updateCard,{borderColor:palette.border,backgroundColor:palette.paper}]}>
                  <View style={styles.updateHeaderRow}>
                    <View style={[styles.updateDot,{backgroundColor:palette.live}]} />
                    <Text style={[styles.updateTimestamp,{color:palette.live}]}>{entryTime}</Text>
                  </View>
                  {entry.headline ? (
                    <Text style={[styles.updateHeadline,{color:palette.ink}]}>{entry.headline}</Text>
                  ) : null}
                  <Text style={[styles.updateBody,{color:palette.ink}]}>{entry.body}</Text>
                  {entry.media?.publicUrl ? (
                    <View style={[styles.updateMediaBlock,{borderColor:palette.border,backgroundColor:palette.paperMuted}]}>
                      <Image
                        source={{uri:entry.media.publicUrl}}
                        style={styles.updateMediaImage}
                        accessibilityLabel={entry.media.altText ?? entry.headline ?? selectedCoverage.title}
                      />
                      {(entry.media.caption || entry.media.credit) ? (
                        <View style={styles.updateMediaCaptionRow}>
                          {entry.media.caption ? (
                            <Text style={[styles.updateMediaCaption,{color:palette.inkMuted}]}>{entry.media.caption}</Text>
                          ) : null}
                          {entry.media.credit ? (
                            <Text style={[styles.updateMediaCredit,{color:palette.inkMuted}]}>Credit: {entry.media.credit}</Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </Section>
    );
  };

  return (
    <Page title="Live">
      <View style={[styles.identity,{borderLeftColor:palette.live}]}>
        <Text style={[styles.identityLabel,{color:palette.live}]}>HEALTHTIMES LIVE</Text>
        <Text style={[styles.lede,{color:palette.inkMuted}]}>Live reporting, event updates and scheduled health coverage from the HealthTimes newsroom.</Text>
      </View>

      {selectedCoverageId ? (
        renderDetailView()
      ) : (
        <>
          {live.loading && !live.data ? <LoadingBlock label="Loading live coverage…" /> : null}

          {live.error && !live.data ? (
            <Section>
              <EmptyState
                title="Live coverage is temporarily unavailable"
                message="HealthTimes could not load Live right now. Please try again when your connection is available."
              />
            </Section>
          ) : null}

          {!live.loading && !live.error && !hasCoverage ? (
            <Section>
              <EmptyState
                title="No live coverage right now"
                message="When HealthTimes opens live reporting or schedules an event, it will appear here."
              />
            </Section>
          ) : null}

          {hasCoverage ? (
            <>
              <View style={styles.tabs} accessibilityLabel="Live coverage views">
                <Chip active={active==="live"} onPress={()=>setActive("live")}>Live Now</Chip>
                <Chip active={active==="blog"} onPress={()=>setActive("blog")}>Live Blog</Chip>
                <Chip active={active==="upcoming"} onPress={()=>setActive("upcoming")}>Upcoming</Chip>
              </View>

              <Section>
                <SectionHeader
                  title={active==="upcoming" ? "Upcoming coverage" : active==="blog" ? "Live blogs" : "Live now"}
                  eyebrow={active==="upcoming" ? "SCHEDULE" : "LIVE"}
                />
                {featured ? (
                  featured.kind === "live-blog" ? (
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={"Open live blog: " + featured.title}
                      style={[styles.featured,{borderColor:palette.border}]}
                      onPress={() => openCoverage(featured)}
                    >
                      {featured.media?.publicUrl ? (
                        <Image
                          source={{uri:featured.media.publicUrl}}
                          style={[styles.featuredImage,{backgroundColor:palette.paperMuted}]}
                          accessibilityLabel={featured.media.altText ?? featured.title}
                        />
                      ) : null}
                      <View style={styles.featuredBody}>
                        <View style={styles.badgeRow}>
                          <Text style={[styles.liveBadge,{backgroundColor:featured.status==="live"?palette.live:palette.inkMuted}]}>
                            {featured.status==="live" ? "LIVE" : "UPCOMING"}
                          </Text>
                          <Text style={[styles.kindLabel,{color:palette.live}]}>LIVE BLOG</Text>
                        </View>
                        <Text style={[styles.featuredTitle,{color:palette.ink}]}>{featured.title}</Text>
                        {featured.summary ? (
                          <Text style={[styles.coverageSummary,{color:palette.inkMuted}]}>{featured.summary}</Text>
                        ) : null}
                        {(featuredUpdateLabel || updated) ? (
                          <Text style={[styles.meta,{color:palette.inkMuted}]}>
                            {featuredUpdateLabel ?? ""}
                            {featuredUpdateLabel && updated ? " · " : ""}
                            {updated ? "Updated "+updated : ""}
                          </Text>
                        ) : null}
                        <Text style={[styles.openStreamAction,{color:palette.blue}]}>Open live blog stream →</Text>
                      </View>
                    </Pressable>
                  ) : (
                    <View style={[styles.featured,{borderColor:palette.border}]}>
                      {featured.media?.publicUrl ? (
                        <Image
                          source={{uri:featured.media.publicUrl}}
                          style={[styles.featuredImage,{backgroundColor:palette.paperMuted}]}
                          accessibilityLabel={featured.media.altText ?? featured.title}
                        />
                      ) : null}
                      <View style={styles.featuredBody}>
                        <Text style={[styles.liveBadge,{backgroundColor:featured.status==="live"?palette.live:palette.inkMuted}]}>
                          {featured.status==="live" ? "LIVE" : "UPCOMING"}
                        </Text>
                        <Text style={[styles.featuredTitle,{color:palette.ink}]}>{featured.title}</Text>
                        {featured.summary ? (
                          <Text style={[styles.coverageSummary,{color:palette.inkMuted}]}>{featured.summary}</Text>
                        ) : null}
                        {updated ? (
                          <Text style={[styles.meta,{color:palette.inkMuted}]}>
                            {"Updated "+updated}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  )
                ) : (
                  <EmptyState
                    title={active==="upcoming" ? "No scheduled coverage" : active==="blog" ? "No live blogs right now" : "No active live coverage"}
                    message={active==="upcoming"
                      ? "Scheduled HealthTimes live coverage will appear here when it is published."
                      : "Choose another Live view or return when new coverage begins."}
                  />
                )}
              </Section>

              {!!secondary.length && (
                <Section>
                  <SectionHeader title="More live coverage" />
                  <LiveRail items={secondary} onSelectItem={openCoverage} />
                </Section>
              )}
            </>
          ) : null}
        </>
      )}

      <AdSlot placement="live_feed" />
    </Page>
  );
}

const styles=StyleSheet.create({
  identity:{marginTop:spacing.sm,borderLeftWidth:4,paddingLeft:spacing.md,gap:4,maxWidth:820},
  identityLabel:{fontSize:10,fontWeight:"900",letterSpacing:1.5},
  lede:{fontSize:16,lineHeight:24},
  tabs:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,marginTop:spacing.xl},
  featured:{borderWidth:1,borderRadius:radius.md,overflow:"hidden"},
  featuredImage:{width:"100%",aspectRatio:16/8},
  featuredBody:{padding:spacing.xl,gap:spacing.sm},
  badgeRow:{flexDirection:"row",alignItems:"center",gap:spacing.sm},
  liveBadge:{alignSelf:"flex-start",color:"#FFFFFF",fontSize:10,fontWeight:"900",letterSpacing:1,paddingHorizontal:8,paddingVertical:5,borderRadius:4},
  kindLabel:{fontSize:10,fontWeight:"900",letterSpacing:1.2},
  featuredTitle:{fontSize:30,lineHeight:36,fontWeight:"900",letterSpacing:-0.6,maxWidth:900},
  coverageSummary:{fontSize:15,lineHeight:22,maxWidth:820},
  meta:{fontSize:12,lineHeight:18},
  openStreamAction:{fontSize:13,fontWeight:"800",marginTop:spacing.xs},
  streamTopBar:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:spacing.sm,marginBottom:spacing.md},
  streamControls:{flexDirection:"row",alignItems:"center",gap:spacing.sm},
  backButton:{alignSelf:"flex-start",borderWidth:1,borderRadius:radius.sm,paddingHorizontal:spacing.md,paddingVertical:spacing.xs},
  backButtonText:{fontSize:13,fontWeight:"700"},
  refreshButton:{borderWidth:1,borderRadius:radius.sm,paddingHorizontal:spacing.md,paddingVertical:spacing.xs},
  refreshButtonText:{fontSize:12,fontWeight:"800"},
  pollingHint:{fontSize:12,fontWeight:"600"},
  updateFeed:{gap:spacing.md,marginTop:spacing.md},
  updateCard:{borderWidth:1,borderRadius:radius.md,padding:spacing.lg,gap:spacing.sm},
  updateHeaderRow:{flexDirection:"row",alignItems:"center",gap:spacing.xs},
  updateDot:{width:8,height:8,borderRadius:4},
  updateTimestamp:{fontSize:12,fontWeight:"800",letterSpacing:0.4},
  updateHeadline:{fontSize:20,lineHeight:26,fontWeight:"900"},
  updateBody:{fontSize:15,lineHeight:23},
  updateMediaBlock:{borderWidth:1,borderRadius:radius.sm,overflow:"hidden",marginTop:spacing.xs},
  updateMediaImage:{width:"100%",aspectRatio:16/9},
  updateMediaCaptionRow:{padding:spacing.sm,gap:2},
  updateMediaCaption:{fontSize:12,lineHeight:17},
  updateMediaCredit:{fontSize:11,fontWeight:"700"}
});

