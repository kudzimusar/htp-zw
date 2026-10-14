import { useState } from "react";
import { useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ArticleSummary, EditionPreference, PublicationLink } from "../../src/domain/models";
import { AdSlot, HeroStory, LiveRail, StoryGrid, StoryList, TopStoriesList, VideoCard } from "../../src/ui/Cards";
import { EmptyState, LoadingBlock, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { radius, spacing } from "../../src/theme/tokens";
import { useAppearance } from "../../src/theme/AppearanceProvider";

type HomeFilter="for-you"|"latest"|"zimbabwe"|"world"|"premium";

function publishedTime(story:ArticleSummary){
  return story.publishedAt ? new Date(story.publishedAt).getTime() : 0;
}

function normalized(value:string){
  return value.trim().toLowerCase();
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

function isZimbabweStory(story:ArticleSummary){
  return story.geography.some((zone)=>
    normalized(zone.name)==="zimbabwe" || normalized(zone.slug)==="zimbabwe"
  );
}

function isWorldStory(story:ArticleSummary){
  return story.geography.some((zone)=>
    normalized(zone.name)==="global" || normalized(zone.slug)==="global"
  );
}

function uniqueStories(stories:ArticleSummary[]){
  const seen=new Set<string>();
  return stories.filter((story)=>{
    if(seen.has(story.id)) return false;
    seen.add(story.id);
    return true;
  });
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

  if (home.loading) return <Page><LoadingBlock label="Loading Home…" /></Page>;
  if (home.error) return <Page><Text style={{color:palette.inkMuted}}>{home.error.message}</Text></Page>;
  if (!home.data) return <Page><LoadingBlock label="Loading Home…" /></Page>;

  const source=[...home.data].sort((a,b)=>publishedTime(b)-publishedTime(a));
  const preferenceState=preferences.data ?? {primaryEdition:"Global",followedCountries:[],followedTopics:[]};
  const edition=preferenceState.primaryEdition?.trim() || "Global";
  const editionStories=edition.toLowerCase()==="global"
    ? source.filter(isWorldStory)
    : source.filter((item)=>item.geography.some((zone)=>zone.name.toLowerCase()===edition.toLowerCase()));
  const zimbabweStories=source.filter(isZimbabweStory);
  const worldStories=source.filter(isWorldStory);
  const premiumStories=source.filter((story)=>story.accessPolicy==="premium");

  const filteredStories=(()=>{
    if(activeFilter==="latest") return source;
    if(activeFilter==="zimbabwe") return zimbabweStories;
    if(activeFilter==="world") return worldStories;
    if(activeFilter==="premium") return premiumStories;
    const matches=source.filter((item)=>matchesPreferences(item,preferenceState));
    return matches.length ? matches : source;
  })();

  const [hero,...filteredRemainder]=filteredStories;
  const topStories=filteredRemainder.slice(0,6);
  const immediateIds=new Set<string>(topStories.map((story)=>story.id));
  if(hero) immediateIds.add(hero.id);
  const latest=source.filter((story)=>!immediateIds.has(story.id)).slice(0,6);
  const features=source.filter((story)=>hasSourceTerm(story,"Features"));
  const research=source.filter((story)=>
    story.primarySection?.slug==="research" ||
    hasSourceTerm(story,"Research & Findings","Reseach Findings","Academic & Research")
  );
  const financing=source.filter((story)=>
    story.primarySection?.slug==="health-business" ||
    hasSourceTerm(story,"Health Financing")
  );
  const hiv=source.filter((story)=>hasSourceTerm(story,"HIV/AIDS"));
  const globalHealth=source.filter((story)=>
    story.primarySection?.slug==="global-health" ||
    story.geography.some((zone)=>zone.slug==="global")
  );
  const publicHealth=source.filter((story)=>
    story.primarySection?.slug==="public-health" &&
    !hasSourceTerm(story,"Features","Health Financing","HIV/AIDS")
  );
  const premium=premiumStories;
  const featuredVideos=video.data?.slice(0,4) ?? [];
  const liveItems=live.data?.length ? live.data.filter((item)=>item.status==="live") : [];
  const opportunityLinks=(publication.data?.sourceLinks ?? []).filter((link)=>
    ["jobs","fellowships-grants","training-courses","academic-research","baraza-e-paper"].includes(link.key)
  );
  const usedIds=new Set(uniqueStories([
    ...(hero?[hero]:[]),
    ...topStories,
    ...latest.slice(0,3),
    ...features.slice(0,3),
    ...publicHealth.slice(0,3),
    ...research.slice(0,3),
    ...financing.slice(0,3),
    ...hiv.slice(0,3),
    ...globalHealth.slice(0,3),
    ...premium.slice(0,3)
  ]).map((story)=>story.id));
  const furtherCoverage=source.filter((story)=>!usedIds.has(story.id)).slice(0,6);

  const filters:{key:HomeFilter;label:string}[]=[
    {key:"for-you",label:"For You"},
    {key:"latest",label:"Latest"},
    {key:"zimbabwe",label:"Zimbabwe"},
    {key:"world",label:"World"},
    {key:"premium",label:"Premium"}
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
        {filters.map((item)=>{
          const active=activeFilter===item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label+" Home filter"}
              accessibilityState={{selected:active}}
              onPress={()=>setActiveFilter(item.key)}
              style={[
                styles.editorialFilter,
                {borderBottomColor:active?palette.blue:"transparent"}
              ]}
            >
              <Text style={[styles.editorialFilterText,{color:active?palette.ink:palette.inkMuted}]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {hero ? <HeroStory story={hero} /> : (
        <EmptyState
          title={activeFilter==="premium" ? "HealthTimes Premium" : "No stories in this Home view"}
          message={
            activeFilter==="premium"
              ? "Source-backed Premium journalism will appear here when member stories are available."
              : activeFilter==="zimbabwe"
                ? "No source-backed Zimbabwe stories are available in this Home feed right now."
                : activeFilter==="world"
                  ? "No source-backed World stories are available in this Home feed right now."
                  : "No source-backed stories are available for this Home view right now."
          }
          action={activeFilter==="premium" ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Explore HealthTimes Premium" onPress={() => router.push("/premium" as never)}>
              <Text style={[styles.premiumLink,{color:palette.blue}]}>Explore Premium →</Text>
            </Pressable>
          ) : undefined}
        />
      )}

      <AdSlot placement="hospaz-header-direct" sensitiveHealthContext />

      {!!liveItems.length && (
        <View style={styles.prioritySection}>
          <SectionHeader title="Live Now" eyebrow="LIVE" action="Open Live" onAction={() => router.push("/live" as never)} />
          <LiveRail items={liveItems} />
        </View>
      )}

      <View style={styles.prioritySection}>
        <SectionHeader title="Top Stories" action="Explore" onAction={() => router.push("/explore" as never)} />
        {topStories.length
          ? <TopStoriesList stories={topStories} />
          : <EmptyState title="More reporting is on the way" message="Choose another front-page filter or explore more HealthTimes coverage." />}
      </View>

      <AdSlot placement="home_after_live" />

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
  editorialFilters:{paddingVertical:spacing.sm,paddingHorizontal:spacing.sm,flexDirection:"row",gap:spacing.lg,alignItems:"center"},
  editorialFilter:{minHeight:44,justifyContent:"center",paddingHorizontal:2,borderBottomWidth:2},
  editorialFilterText:{fontSize:12,fontWeight:"900",letterSpacing:.15},
  prioritySection:{marginTop:spacing.lg},
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
