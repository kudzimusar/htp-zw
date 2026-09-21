import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { ArticleSummary, EditionPreference, PublicationLink } from "../../src/domain/models";
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
    if(seen.has(story.id)) return false;
    seen.add(story.id);
    return true;
  });
}

function EditorialSection({
  title,
  eyebrow,
  stories,
  onExplore
}:{
  title:string;
  eyebrow?:string;
  stories:ArticleSummary[];
  onExplore?:()=>void;
}){
  if(!stories.length) return null;
  return (
    <Section>
      <SectionHeader title={title} eyebrow={eyebrow} action={onExplore?"Explore":undefined} onAction={onExplore} />
      <StoryGrid stories={stories.slice(0,3)} />
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
          <Text style={[styles.opportunityAction,{color:palette.inkMuted}]}>Open current publication destination →</Text>
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

  if (home.loading || !home.data) return <Page><LoadingBlock label="Loading Home…" /></Page>;
  if (home.error) return <Page><Text style={{color:palette.inkMuted}}>{home.error.message}</Text></Page>;

  const source=[...home.data].sort((a,b)=>publishedTime(b)-publishedTime(a));
  const preferenceState=preferences.data ?? {primaryEdition:"Global",followedCountries:[],followedTopics:[]};
  const edition=preferenceState.primaryEdition?.trim() || "Global";
  const editionStories=edition.toLowerCase()==="global"
    ? source.filter((item)=>item.geography.some((zone)=>zone.slug==="global"))
    : source.filter((item)=>item.geography.some((zone)=>zone.name.toLowerCase()===edition.toLowerCase()));

  const filteredStories=useMemo(()=>{
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
  },[
    activeFilter,
    home.data,
    edition,
    preferenceState.followedCountries.join("|"),
    preferenceState.followedTopics.join("|")
  ]);

  const [hero,...filteredRemainder]=filteredStories;
  const topStories=filteredRemainder.slice(0,6);
  const latest=source.filter((story)=>story.id!==hero?.id).slice(0,6);
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
  const premium=source.filter((story)=>story.accessPolicy==="premium");
  const featuredVideos=video.data?.slice(0,4) ?? [];
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
    {key:"edition",label:edition},
    {key:"world",label:"World"},
    {key:"health",label:"Health"}
  ];

  return (
    <Page>
      <View style={styles.editorialFilters} accessibilityLabel="Editorial filters">
        {filters.map((item)=>(
          <Chip key={item.key} active={activeFilter===item.key} onPress={()=>setActiveFilter(item.key)}>{item.label}</Chip>
        ))}
      </View>

      <View style={[styles.previewNotice,{borderColor:palette.border,backgroundColor:palette.paperMuted}]}>
        <Text style={[styles.previewLabel,{color:palette.blue}]}>SOURCE PARITY PREVIEW</Text>
        <Text style={[styles.previewText,{color:palette.inkMuted}]}>The approved HealthTimes design is presenting current public HealthTimes journalism through a read-only bridge. AG-03/AG-04 remain authoritative for migration completeness and the final repository.</Text>
      </View>

      {hero ? <HeroStory story={hero} /> : null}

      {!!live.data?.some((item)=>item.status==="live") && (
        <Section>
          <SectionHeader title="Live Now" eyebrow="LIVE" action="Open Live" onAction={() => router.push("/live" as never)} />
          <LiveRail items={live.data.filter((item)=>item.status==="live")} />
        </Section>
      )}

      <Section><AdSlot placement="home_after_live" /></Section>

      <Section>
        <SectionHeader title="Top Stories" eyebrow="EDITOR'S DESK" action="Explore" onAction={() => router.push("/explore" as never)} />
        {topStories.length
          ? <StoryList stories={topStories} />
          : <EmptyState title="No additional stories in this view" message="Choose another front-page filter or Explore the wider HealthTimes taxonomy." />}
      </Section>

      <EditorialSection title="Latest" eyebrow="JUST PUBLISHED" stories={latest} onExplore={()=>setActiveFilter("latest")} />
      <EditorialSection title="Features" eyebrow="LONGFORM & PEOPLE" stories={features} onExplore={()=>router.push("/explore" as never)} />
      <EditorialSection title="Public Health" stories={publicHealth} onExplore={()=>router.push("/explore" as never)} />
      <EditorialSection title="Research & Findings" stories={research} onExplore={()=>router.push("/explore" as never)} />
      <EditorialSection title="Health Financing & Health Business" stories={financing} onExplore={()=>router.push("/explore" as never)} />
      <EditorialSection title="HIV/AIDS" stories={hiv} onExplore={()=>router.push("/explore" as never)} />
      <EditorialSection title="Global Health" stories={globalHealth} onExplore={()=>router.push("/explore" as never)} />

      <Section>
        <SectionHeader title="Watch" eyebrow="HEALTHTIMES VIDEO" action="Open Watch" onAction={() => router.push("/watch" as never)} />
        {featuredVideos.length ? (
          <View style={styles.watchGrid}>
            {featuredVideos.map((item) => <View key={item.id} style={styles.watchItem}><VideoCard item={item} /></View>)}
          </View>
        ) : (
          <EmptyState title="No verified video available" message="Watch activates only with source-backed video metadata through the existing VideoService." />
        )}
      </Section>

      <Section>
        <SectionHeader title="Premium Intelligence" eyebrow="MEMBER REPORTING" action="View Premium" onAction={() => router.push("/premium" as never)} />
        {premium.length
          ? <StoryGrid stories={premium.slice(0,3)} />
          : <EmptyState title="Premium reporting unavailable in this source window" message="Premium presentation remains fail-closed until source metadata and entitlement authority are available." />}
      </Section>

      <Section><AdSlot placement="home_watch" /></Section>

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
          <EmptyState title="Edition coverage is being prepared" message="The edition is supported by the global model, but the current bounded public source does not contain enough matching reporting yet." />
        )}
      </Section>

      {!!furtherCoverage.length && (
        <Section>
          <SectionHeader title="Further Coverage" eyebrow="MORE FROM HEALTHTIMES" action="Explore all" onAction={() => router.push("/explore" as never)} />
          <StoryGrid stories={furtherCoverage} />
        </Section>
      )}

      <Section>
        <SectionHeader title="Most Read / Trending" />
        <EmptyState
          title="Awaiting verified audience data"
          message="AG-05 supplies real audience and analytics signals. This approved Home position remains reserved without fabricating a ranking."
        />
      </Section>

      <Section><AdSlot placement="home_deep_feed" /></Section>
    </Page>
  );
}

const styles=StyleSheet.create({
  editorialFilters:{paddingVertical:spacing.lg,flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
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
