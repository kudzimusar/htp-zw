import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AdSlot, HeroStory, LiveRail, StoryGrid, StoryList, VideoCard } from "../../src/ui/Cards";
import { Chip, EmptyState, LoadingBlock, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { radius, spacing } from "../../src/theme/tokens";
import { useAppearance } from "../../src/theme/AppearanceProvider";

export default function HomeScreen() {
  const router=useRouter();
  const { palette }=useAppearance();
  const home=useAsync(() => services.articles.getHome(), []);
  const live=useAsync(() => services.live.list(), []);
  const video=useAsync(() => services.video.list(), []);
  const preferences=useAsync(() => services.reader.getPreferences(), []);

  if (home.loading || !home.data) return <Page><LoadingBlock label="Loading Home…" /></Page>;
  if (home.error) return <Page><Text style={{color:palette.inkMuted}}>{home.error.message}</Text></Page>;

  const [hero,...rest]=home.data;
  const edition=preferences.data?.primaryEdition?.trim() || "Global";
  const editionStories=edition.toLowerCase()==="global"
    ? home.data.filter((item)=>item.geography.some((zone)=>zone.slug==="global"))
    : home.data.filter((item)=>item.geography.some((zone)=>zone.name.toLowerCase()===edition.toLowerCase()));

  return (
    <Page>
      <View style={styles.editorialFilters} accessibilityLabel="Editorial filters">
        {["For You","Latest",edition,"World","Health"].map((item,index)=>(
          <Chip key={item} active={index===0} onPress={index===2 ? ()=>router.push("/edition" as never) : undefined}>{item}</Chip>
        ))}
      </View>

      <View style={[styles.previewNotice,{borderColor:palette.border,backgroundColor:palette.paperMuted}]}>
        <Text style={[styles.previewLabel,{color:palette.blue}]}>PREVIEW BUILD</Text>
        <Text style={[styles.previewText,{color:palette.inkMuted}]}>Editorial fixtures remain clearly separated until AG-04 migrated stories and media are certified.</Text>
      </View>

      {hero ? <HeroStory story={hero} /> : null}

      <Section>
        <SectionHeader title="Live Now" eyebrow="NOW" action="Open Live" onAction={() => router.push("/live" as never)} />
        {live.data?.length ? <LiveRail items={live.data} /> : <Text style={[styles.muted,{color:palette.inkMuted}]}>No live event.</Text>}
      </Section>

      <Section>
        <AdSlot placement="home_after_live" />
      </Section>

      <Section>
        <SectionHeader title="Top Stories" eyebrow="EDITOR'S DESK" action="Explore" onAction={() => router.push("/explore" as never)} />
        <StoryList stories={rest} />
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
          <EmptyState title="Edition coverage is being prepared" message="The selected edition is supported by the global model, but the current controlled fixture set does not yet contain matching stories." />
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
  muted:{fontSize:14},
  callout:{borderRadius:radius.md,padding:spacing.xl,gap:spacing.lg,flexDirection:"row",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"},
  calloutCopy:{gap:spacing.sm,flex:1,minWidth:240},
  calloutTitle:{fontSize:20,fontWeight:"900"},
  calloutText:{fontSize:15,lineHeight:22,maxWidth:720},
  calloutButton:{alignSelf:"flex-start",minHeight:44,justifyContent:"center",paddingHorizontal:16,borderRadius:radius.sm},
  calloutButtonText:{fontWeight:"900"},
  watchGrid:{flexDirection:"row",flexWrap:"wrap",gap:spacing.xl},
  watchItem:{minWidth:260,flex:1}
});
