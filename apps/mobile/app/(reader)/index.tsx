import { useState } from "react";
import { useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type {
  ArticleSummary,
  CuratedHomepageSectionKey,
  EditionPreference,
  PublicationLink,
  PublicHomepagePresentation
} from "../../src/domain/models";
import { validateEditionSlug } from "../../src/domain/models";
import { AdSlot, HeroStory, LiveRail, StoryGrid, StoryList, VideoCard } from "../../src/ui/Cards";
import { Chip, EmptyState, LoadingBlock, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { radius, spacing } from "../../src/theme/tokens";
import { useAppearance } from "../../src/theme/AppearanceProvider";

type HomeFilter="for-you"|"latest"|"edition"|"world"|"health";

function publishedTime(story:ArticleSummary){
  return story.publishedAt ? new Date(story.publishedAt).getTime() : 0;
}

function normalized(value:string){
  return value.trim().toLowerCase();
}

function storyIdentity(story: ArticleSummary): string {
  return story.canonicalStoryId || story.slug || story.id;
}

function sourceTerms(story:ArticleSummary){
  return new Set((story.legacyTaxonomy ?? story.topics).map((term)=>normalized(term.name)));
}

function hasSourceTerm(story:ArticleSummary,...names:string[]){
  const terms=sourceTerms(story);
  return names.some((name)=>terms.has(normalized(name)));
}

function matchesPreferences(story:ArticleSummary,preferences:EditionPreference){
  const countries=new Set(preferences.followedCountries.map((item)=>item.toLowerCase()));
  const topics=new Set(preferences.followedTopics.map((item)=>item.toLowerCase()));
  if(preferences.primaryEdition && preferences.primaryEdition.toLowerCase()!=="global"){
    countries.add(preferences.primaryEdition.toLowerCase());
  }
  return (
    story.geography.some((zone)=>countries.has(zone.name.toLowerCase())) ||
    story.topics.some((topic)=>topics.has(topic.name.toLowerCase()))
  );
}

function isHealthStory(story:ArticleSummary){
  const section=story.primarySection?.name.toLowerCase() ?? "";
  return section.includes("health") || story.topics.some((topic)=>topic.name.toLowerCase().includes("health"));
}

function uniqueStories(stories:ArticleSummary[]){
  const seen=new Set<string>();
  return stories.filter((story)=>{
    const id = storyIdentity(story);
    if(seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function overlayCuratedSection(
  sectionKey: CuratedHomepageSectionKey,
  naturalList: ArticleSummary[],
  presentations: PublicHomepagePresentation[],
  excludedIdentities: Set<string>
): ArticleSummary[] {
  if (!presentations.length) return naturalList;

  const curatedByRank = new Map<number, ArticleSummary>();
  for (let rank = 1; rank <= 6; rank++) {
    const editionItem = presentations.find(
      (p) => p.editionPlacement?.section === sectionKey && p.editionPlacement.rank === rank && p.editionPlacement.active
    );
    if (editionItem) {
      curatedByRank.set(rank, editionItem.article);
    } else {
      const globalItem = presentations.find(
        (p) => p.globalPlacement?.section === sectionKey && p.globalPlacement.rank === rank && p.globalPlacement.active
      );
      if (globalItem) {
        curatedByRank.set(rank, globalItem.article);
      }
    }
  }

  if (curatedByRank.size === 0) return naturalList;

  const result: ArticleSummary[] = [];
  const localSeen = new Set<string>();

  const sortedRanks = Array.from(curatedByRank.keys()).sort((a, b) => a - b);
  for (const rank of sortedRanks) {
    const item = curatedByRank.get(rank)!;
    const id = storyIdentity(item);
    if (!excludedIdentities.has(id) && !localSeen.has(id)) {
      result.push(item);
      localSeen.add(id);
    }
  }

  for (const item of naturalList) {
    const id = storyIdentity(item);
    if (!excludedIdentities.has(id) && !localSeen.has(id)) {
      result.push(item);
      localSeen.add(id);
    }
  }

  return result;
}

function EditorialSection({
  title,
  eyebrow,
  stories,
  onExplore,
  presentation="grid"
}:{
  title:string;
  eyebrow?:string;
  stories:ArticleSummary[];
  onExplore?:()=>void;
  presentation?:"grid"|"list";
}){
  if(!stories.length) return null;
  const visible=stories.slice(0,presentation==="list"?4:3);
  return (
    <Section>
      <SectionHeader title={title} eyebrow={eyebrow} action={onExplore?"Explore":undefined} onAction={onExplore} />
      {presentation==="list" ? <StoryList stories={visible} /> : <StoryGrid stories={visible} />}
    </Section>
  );
}

function OpportunityLinks({links}:{links:PublicationLink[]}){
  const { palette }=useAppearance();
  if(!links.length) return null;
  return (
    <View style={styles.opportunityGrid}>
      {links.map((link)=>(
        <Pressable
          key={link.key}
          accessibilityRole="link"
          accessibilityLabel={link.label}
          style={[styles.opportunityCard,{borderColor:palette.border,backgroundColor:palette.paper}]}
          onPress={()=>void Linking.openURL(link.url)}
        >
          <Text style={[styles.opportunityEyebrow,{color:palette.blue}]}>HEALTHTIMES</Text>
          <Text style={[styles.opportunityTitle,{color:palette.ink}]}>{link.label}</Text>
          <Text style={[styles.opportunityAction,{color:palette.inkMuted}]}>Explore opportunity →</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const router=useRouter();
  const { palette }=useAppearance();
  const [activeFilter,setActiveFilter]=useState<HomeFilter>("for-you");
  const home=useAsync(() => services.articles.getHome(), []);
  const live=useAsync(() => services.live.list(), []);
  const video=useAsync(() => services.video.list(), []);
  const publication=useAsync(()=>services.publication.getProfile(),[]);
  const preferences=useAsync(() => services.reader.getPreferences(), []);
  const taxonomy=useAsync(() => services.taxonomy.getSnapshot(), []);

  const preferenceState=preferences.data ?? {primaryEdition:"Global",followedCountries:[],followedTopics:[]};
  const edition=preferenceState.primaryEdition?.trim() || "Global";

  const resolvedEditionSlug = (() => {
    if (!edition || edition.toLowerCase() === "global") return null;
    const zones = taxonomy.data?.geographicZones ?? [];
    const match = zones.find(
      (z) => z.name.toLowerCase() === edition.toLowerCase() || z.slug.toLowerCase() === edition.toLowerCase()
    );
    if (match) return match.slug;
    const sanitized = edition.toLowerCase().replace(/\s+/g, "-");
    return validateEditionSlug(sanitized) ? sanitized : null;
  })();

  const presentationState = useAsync(async () => {
    try {
      return await services.presentation.getPublicHomepagePresentations(resolvedEditionSlug);
    } catch {
      return [];
    }
  }, [resolvedEditionSlug]);
  const presentations = presentationState.data ?? [];

  if (home.loading) return <Page><LoadingBlock label="Loading Home…" /></Page>;
  if (home.error) return <Page><Text style={{color:palette.inkMuted}}>{home.error.message}</Text></Page>;
  if (!home.data) return <Page><LoadingBlock label="Loading Home…" /></Page>;

  const source=[...home.data].sort((a,b)=>publishedTime(b)-publishedTime(a));
  const editionStories=edition.toLowerCase()==="global"
    ? source.filter((item)=>item.geography.some((zone)=>zone.slug==="global"))
    : source.filter((item)=>item.geography.some((zone)=>zone.name.toLowerCase()===edition.toLowerCase()));

  const filteredStories=(()=>{
    if(activeFilter==="latest") return source;
    if(activeFilter==="edition") return editionStories.length ? editionStories : source;
    if(activeFilter==="world"){
      const matches=source.filter((item)=>item.geography.some((zone)=>zone.slug==="global"));
      return matches.length ? matches : source;
    }
    if(activeFilter==="health"){
      const matches=source.filter(isHealthStory);
      return matches.length ? matches : source;
    }
    const matches=source.filter((item)=>matchesPreferences(item,preferenceState));
    return matches.length ? matches : source;
  })();

  const [naturalHero, ...filteredRemainder] = filteredStories;
  let hero = naturalHero;
  let topStories = filteredRemainder.slice(0, 6);

  if (activeFilter === "for-you" || activeFilter === "edition") {
    const editionHero = presentations.find(
      (p) => p.editionPlacement?.section === "hero" && p.editionPlacement.active
    );
    const globalHero = presentations.find(
      (p) => p.globalPlacement?.section === "hero" && p.globalPlacement.active
    );
    const curatedHero = editionHero?.article ?? globalHero?.article ?? null;

    if (curatedHero) {
      hero = curatedHero;
    }

    const curatedTopByRank = new Map<number, ArticleSummary>();
    for (let rank = 1; rank <= 6; rank++) {
      const editionItem = presentations.find(
        (p) => p.editionPlacement?.section === "top-stories" && p.editionPlacement.rank === rank && p.editionPlacement.active
      );
      if (editionItem) {
        curatedTopByRank.set(rank, editionItem.article);
      } else {
        const globalItem = presentations.find(
          (p) => p.globalPlacement?.section === "top-stories" && p.globalPlacement.rank === rank && p.globalPlacement.active
        );
        if (globalItem) {
          curatedTopByRank.set(rank, globalItem.article);
        }
      }
    }

    if (curatedHero || curatedTopByRank.size > 0) {
      const placedIds = new Set<string>();
      if (hero) placedIds.add(storyIdentity(hero));

      const effectiveTop: ArticleSummary[] = [];
      let remIdx = 0;
      for (let rank = 1; rank <= 6; rank++) {
        if (curatedTopByRank.has(rank)) {
          const curated = curatedTopByRank.get(rank)!;
          const cid = storyIdentity(curated);
          if (!placedIds.has(cid)) {
            effectiveTop.push(curated);
            placedIds.add(cid);
            continue;
          }
        }
        while (remIdx < filteredStories.length) {
          const candidate = filteredStories[remIdx++];
          if (!candidate) continue;
          const candidateId = storyIdentity(candidate);
          if (!placedIds.has(candidateId)) {
            effectiveTop.push(candidate);
            placedIds.add(candidateId);
            break;
          }
        }
      }
      topStories = effectiveTop;
    }
  }

  const excludedFromSections = new Set<string>();
  if (hero) excludedFromSections.add(storyIdentity(hero));
  for (const s of topStories) excludedFromSections.add(storyIdentity(s));

  const latest = source.filter((story) => storyIdentity(story) !== (hero ? storyIdentity(hero) : "")).slice(0, 6);
  const features = overlayCuratedSection("features", source.filter((story) => hasSourceTerm(story, "Features")), presentations, excludedFromSections);
  const research = overlayCuratedSection("research", source.filter((story) =>
    story.primarySection?.slug === "research" ||
    hasSourceTerm(story, "Research & Findings", "Reseach Findings", "Academic & Research")
  ), presentations, excludedFromSections);
  const financing = overlayCuratedSection("health-business", source.filter((story) =>
    story.primarySection?.slug === "health-business" ||
    hasSourceTerm(story, "Health Financing")
  ), presentations, excludedFromSections);
  const hiv = overlayCuratedSection("hiv-aids", source.filter((story) => hasSourceTerm(story, "HIV/AIDS")), presentations, excludedFromSections);
  const globalHealth = overlayCuratedSection("global-health", source.filter((story) =>
    story.primarySection?.slug === "global-health" ||
    story.geography.some((zone) => zone.slug === "global")
  ), presentations, excludedFromSections);
  const publicHealth = overlayCuratedSection("public-health", source.filter((story) =>
    story.primarySection?.slug === "public-health" &&
    !hasSourceTerm(story, "Features", "Health Financing", "HIV/AIDS")
  ), presentations, excludedFromSections);
  const premium = source.filter((story)=>story.accessPolicy==="premium");
  const featuredVideos = video.data?.slice(0, 4) ?? [];
  const liveItems = live.data?.length ? live.data.filter((item) => item.status === "live") : [];
  const opportunityLinks = (publication.data?.sourceLinks ?? []).filter((link) =>
    ["jobs", "fellowships-grants", "training-courses", "academic-research", "baraza-e-paper"].includes(link.key)
  );
  const usedIds = new Set(uniqueStories([
    ...(hero ? [hero] : []),
    ...topStories,
    ...latest.slice(0, 3),
    ...features.slice(0, 3),
    ...publicHealth.slice(0, 3),
    ...research.slice(0, 3),
    ...financing.slice(0, 3),
    ...hiv.slice(0, 3),
    ...globalHealth.slice(0, 3),
    ...premium.slice(0, 3)
  ]).map(storyIdentity));
  const furtherCoverage = source.filter((story) => !usedIds.has(storyIdentity(story))).slice(0, 6);

  const filters:{key:HomeFilter;label:string}[]=[
    {key:"for-you",label:"For You"},
    {key:"latest",label:"Latest"},
    {key:"edition",label:edition},
    {key:"world",label:"World"},
    {key:"health",label:"Health"}
  ];

  return (
    <Page>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.editorialFilterRail}
        contentContainerStyle={styles.editorialFilters}
        accessibilityLabel="Editorial filters"
      >
        {filters.map((item)=>(
          <Chip key={item.key} active={activeFilter===item.key} onPress={()=>setActiveFilter(item.key)}>{item.label}</Chip>
        ))}
      </ScrollView>

      {hero ? <HeroStory story={hero} /> : null}

      <AdSlot placement="hospaz-header-direct" sensitiveHealthContext />

      {!!liveItems.length && (
        <View style={styles.prioritySection}>
          <SectionHeader title="Live Now" eyebrow="LIVE" action="Open Live" onAction={() => router.push("/live" as never)} />
          <LiveRail items={liveItems} />
        </View>
      )}

      <AdSlot placement="home_after_live" />

      <View style={styles.prioritySection}>
        <SectionHeader title="Top Stories" eyebrow="EDITOR'S DESK" action="Explore" onAction={() => router.push("/explore" as never)} />
        {topStories.length
          ? <StoryList stories={topStories} />
          : <EmptyState title="More reporting is on the way" message="Choose another front-page filter or explore more HealthTimes coverage." />}
      </View>

      <EditorialSection title="Latest" eyebrow="JUST PUBLISHED" stories={latest} presentation="list" onExplore={()=>setActiveFilter("latest")} />
      <EditorialSection title="Features" eyebrow="LONGFORM & PEOPLE" stories={features} onExplore={()=>router.push("/explore" as never)} />
      <EditorialSection title="Public Health" stories={publicHealth} presentation="list" onExplore={()=>router.push("/explore" as never)} />
      <EditorialSection title="Research & Findings" stories={research} onExplore={()=>router.push("/explore" as never)} />
      <EditorialSection title="Health Financing & Health Business" stories={financing} presentation="list" onExplore={()=>router.push("/explore" as never)} />
      <EditorialSection title="HIV/AIDS" stories={hiv} onExplore={()=>router.push("/explore" as never)} />
      <EditorialSection title="Global Health" stories={globalHealth} presentation="list" onExplore={()=>router.push("/explore" as never)} />

      <Section>
        <SectionHeader title="Watch" eyebrow="HEALTHTIMES VIDEO" action="Open Watch" onAction={() => router.push("/watch" as never)} />
        {featuredVideos.length ? (
          <View style={styles.watchGrid}>
            {featuredVideos.map((item) => <View key={item.id} style={styles.watchItem}><VideoCard item={item} /></View>)}
          </View>
        ) : (
          <EmptyState title="No videos available" message="New HealthTimes videos will appear here when published." />
        )}
      </Section>

      <Section>
        <SectionHeader title="Premium Intelligence" eyebrow="MEMBER REPORTING" action="View Premium" onAction={() => router.push("/premium" as never)} />
        {premium.length
          ? <StoryGrid stories={premium.slice(0,3)} />
          : (
            <EmptyState
              title="Discover HealthTimes Premium"
              message="Member reporting and analysis will appear here as it becomes available."
              action={
                <Pressable accessibilityRole="button" accessibilityLabel="Explore HealthTimes Premium" onPress={() => router.push("/premium" as never)}>
                  <Text style={[styles.premiumLink,{color:palette.blue}]}>Explore Premium →</Text>
                </Pressable>
              }
            />
          )}
      </Section>

      <AdSlot placement="home_watch" />

      {!!opportunityLinks.length && (
        <Section>
          <SectionHeader title="Opportunities" eyebrow="CAREERS, LEARNING & RESEARCH" action="Explore" onAction={() => router.push("/explore" as never)} />
          <OpportunityLinks links={opportunityLinks} />
        </Section>
      )}

      <Section>
        <SectionHeader title={edition + " Edition"} eyebrow="Primary Edition" action="Change edition" onAction={() => router.push("/edition" as never)} />
        {editionStories.length ? (
          <StoryGrid stories={editionStories.slice(0,3)} />
        ) : (
          <EmptyState title={"More "+edition+" coverage is coming"} message="Explore the latest HealthTimes reporting while this edition grows." />
        )}
      </Section>

      {!!furtherCoverage.length && (
        <Section>
          <SectionHeader title="Further Coverage" eyebrow="MORE FROM HEALTHTIMES" action="Explore all" onAction={() => router.push("/explore" as never)} />
          <StoryGrid stories={furtherCoverage} />
        </Section>
      )}

      <AdSlot placement="home_deep_feed" />
    </Page>
  );
}

const styles=StyleSheet.create({
  editorialFilterRail:{marginHorizontal:-spacing.sm},
  editorialFilters:{paddingVertical:spacing.md,paddingHorizontal:spacing.sm,flexDirection:"row",gap:spacing.sm},
  prioritySection:{marginTop:spacing.xl},
  premiumLink:{minHeight:44,textAlignVertical:"center",fontSize:13,fontWeight:"900",paddingVertical:12},
  previewNotice:{borderTopWidth:1,borderBottomWidth:1,paddingVertical:spacing.md,paddingHorizontal:spacing.lg,marginBottom:spacing.xl,flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,alignItems:"center"},
  previewLabel:{fontSize:10,fontWeight:"900",letterSpacing:1.2},
  previewText:{fontSize:12,lineHeight:18,flex:1,minWidth:220},
  watchGrid:{flexDirection:"row",flexWrap:"wrap",gap:spacing.xl},
  watchItem:{minWidth:260,flex:1},
  opportunityGrid:{flexDirection:"row",flexWrap:"wrap",gap:spacing.md},
  opportunityCard:{minWidth:220,flexGrow:1,flexBasis:220,borderWidth:1,borderRadius:radius.md,padding:spacing.lg,gap:spacing.sm},
  opportunityEyebrow:{fontSize:9,fontWeight:"900",letterSpacing:1.1},
  opportunityTitle:{fontSize:18,fontWeight:"900",lineHeight:23},
  opportunityAction:{fontSize:12,lineHeight:18}
});
