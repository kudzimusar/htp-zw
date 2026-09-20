import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ArticleSummary, EditionPreference } from "../../src/domain/models";
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

export default function HomeScreen() {
  const router=useRouter();
  const { palette }=useAppearance();
  const [activeFilter,setActiveFilter]=useState<HomeFilter>("for-you");
  const home=useAsync(() => services.articles.getHome(), []);
  const live=useAsync(() => services.live.list(), []);
  const video=useAsync(() => services.video.list(), []);
  const preferences=useAsync(() => services.reader.getPreferences(), []);

  if (home.loading || !home.data) return <Page><LoadingBlock label="Loading Home…" /></Page>;
  if (home.error) return <Page><Text style={{color:palette.inkMuted}}>{home.error.message}</Text></Page>;

  const preferenceState=preferences.data ?? {primaryEdition:"Global",followedCountries:[],followedTopics:[]};
  const edition=preferenceState.primaryEdition?.trim() || "Global";
  const editionStories=edition.toLowerCase()==="global"
    ? home.data.filter((item)=>item.geography.some((zone)=>zone.slug==="global"))
    : home.data.filter((item)=>item.geography.some((zone)=>zone.name.toLowerCase()===edition.toLowerCase()));

  const filteredStories=useMemo(()=>{
    const source=home.data ?? [];
    if(activeFilter==="latest"){
      return [...source].sort((a,b)=>publishedTime(b)-publishedTime(a));
    }
    if(activeFilter==="edition"){
      return editionStories.length ? editionStories : source;
    }
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

  const [hero,...topStories]=filteredStories;
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
        <Text style={[styles.previewText,{color:palette.inkMuted}]}>Current public HealthTimes stories are presented through a read-only bridge. WordPress is never mutated; AG-03/AG-04 remain authoritative for migration completeness and the final Supabase repository.</Text>
      </View>

      {hero ? <HeroStory story={hero} /> : null}

      {!!live.data?.length && (
        <Section>
          <SectionHeader title="Live Now" eyebrow="NOW" action="Open Live" onAction={() => router.push("/live" as never)} />
          <LiveRail items={live.data.filter((item)=>item.status==="live")} />
        </Section>
      )}

      <Section>
        <AdSlot placement="home_after_live" />
      </Section>

      <Section>
        <SectionHeader title="Top Stories" eyebrow="EDITOR'S DESK" action="Explore" onAction={() => router.push("/explore" as never)} />
        {topStories.length
          ? <StoryList stories={topStories} />
          : <EmptyState title="No additional stories in this view" message="Choose another filter or Explore the wider HealthTimes taxonomy." />}
      </Section>

      <Section>
        <SectionHeader title="For You" eyebrow="PERSONALIZED DISCOVERY" />
        <View style={[styles.callout,{backgroundColor:palette.paperMuted}]}>
          <View style={styles.calloutCopy}>
            <Text style={[styles.calloutTitle,{color:palette.ink}]}>Your HealthTimes, without losing the front page</Text>
            <Text style={[styles.calloutText,{color:palette.inkMuted}]}>Edition, followed countries and topics shape discovery while editor-controlled lead journalism stays authoritative.</Text>
          </View>
          <Pressable style={[styles.calloutButton,{backgroundColor:palette.blue}]} onPress={() => router.push("/edition" as never)}>
            <Text style={[styles.calloutButtonText,{color:palette.paper}]}>Choose edition and interests</Text>
          </Pressable>
        </View>
      </Section>

      <Section>
        <SectionHeader title={edition + " Edition"} eyebrow="Primary Edition" action="Change edition" onAction={() => router.push("/edition" as never)} />
        {editionStories.length ? (
          <StoryGrid stories={editionStories.slice(0,3)} />
        ) : (
          <EmptyState title="Edition coverage is being prepared" message="The selected edition is supported by the global model, but the current bounded source-parity snapshot does not yet contain matching stories." />
        )}
      </Section>

      <Section>
        <SectionHeader title="Research & Findings" />
        <StoryGrid stories={home.data.filter((item) => item.primarySection?.slug === "research").slice(0, 3)} />
      </Section>

      <Section>
        <SectionHeader title="Health Business" />
        <StoryGrid stories={home.data.filter((item) => item.primarySection?.slug === "health-business").slice(0, 3)} />
      </Section>

      <Section>
        <SectionHeader title="Premium Intelligence" eyebrow="MEMBER REPORTING" action="View Premium" onAction={() => router.push("/premium" as never)} />
        <StoryGrid stories={home.data.filter((item) => item.accessPolicy === "premium").slice(0, 3)} />
      </Section>

      <Section>
        <SectionHeader title="Watch" eyebrow="VIDEO" action="Open Watch" onAction={() => router.push("/watch" as never)} />
        <View style={styles.watchGrid}>
          {video.data?.map((item) => <View key={item.id} style={styles.watchItem}><VideoCard item={item} /></View>)}
        </View>
      </Section>

      <Section>
        <AdSlot placement="home_watch" />
      </Section>

      <Section>
        <SectionHeader title="Global Health" />
        <StoryGrid stories={home.data.filter((item) => item.geography.some((zone) => zone.slug === "global")).slice(0, 3)} />
      </Section>

      <Section>
        <SectionHeader title="Most Read / Trending" />
        <EmptyState
          title="Awaiting verified audience data"
          message="AG-05 supplies real audience and analytics signals. This approved Home position remains reserved without fabricating a ranking."
        />
      </Section>

      <Section>
        <AdSlot placement="home_deep_feed" />
      </Section>
    </Page>
  );
}

const styles=StyleSheet.create({
  editorialFilters:{paddingVertical:spacing.lg,flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  previewNotice:{borderTopWidth:1,borderBottomWidth:1,paddingVertical:spacing.md,paddingHorizontal:spacing.lg,marginBottom:spacing.xl,flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,alignItems:"center"},
  previewLabel:{fontSize:10,fontWeight:"900",letterSpacing:1.2},
  previewText:{fontSize:12,lineHeight:18,flex:1,minWidth:220},
  callout:{borderRadius:radius.md,padding:spacing.xl,gap:spacing.lg,flexDirection:"row",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"},
  calloutCopy:{gap:spacing.sm,flex:1,minWidth:240},
  calloutTitle:{fontSize:20,fontWeight:"900"},
  calloutText:{fontSize:15,lineHeight:22,maxWidth:720},
  calloutButton:{alignSelf:"flex-start",minHeight:44,justifyContent:"center",paddingHorizontal:16,borderRadius:radius.sm},
  calloutButtonText:{fontWeight:"900"},
  watchGrid:{flexDirection:"row",flexWrap:"wrap",gap:spacing.xl},
  watchItem:{minWidth:260,flex:1}
});
