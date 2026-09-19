import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AdSlot, HeroStory, LiveRail, StoryGrid, VideoCard } from "../../src/ui/Cards";
import { EmptyState, LoadingBlock, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { colors, radius, spacing } from "../../src/theme/tokens";

export default function HomeScreen() {
  const router=useRouter();
  const home=useAsync(() => services.articles.getHome(), []);
  const live=useAsync(() => services.live.list(), []);
  const video=useAsync(() => services.video.list(), []);

  if (home.loading || !home.data) return <Page><LoadingBlock label="Loading Home…" /></Page>;
  if (home.error) return <Page><Text>{home.error.message}</Text></Page>;

  const [hero,...rest]=home.data;
  return (
    <Page>
      <View style={styles.breaking}>
        <Text style={styles.breakingLabel}>DEVELOPING</Text>
        <Text style={styles.breakingText}>HealthTimes native foundation is running with controlled NM-01 fixtures.</Text>
      </View>

      {hero ? <HeroStory story={hero} /> : null}

      <Section>
        <SectionHeader title="Live Now" action="Open Live" onAction={() => router.push("/live" as never)} />
        {live.data?.length ? <LiveRail items={live.data} /> : <Text style={styles.muted}>No live event.</Text>}
      </Section>

      <Section>
        <AdSlot placement="home_after_live" />
      </Section>

      <Section>
        <SectionHeader title="Top Stories" action="Explore" onAction={() => router.push("/explore" as never)} />
        <StoryGrid stories={rest} />
      </Section>

      <Section>
        <SectionHeader title="For You" />
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>Personalization without replacing editorial judgment</Text>
          <Text style={styles.calloutText}>Edition, followed countries and topics can shape discovery. The lead story remains editor-controlled.</Text>
          <Pressable style={styles.calloutButton} onPress={() => router.push("/edition" as never)}>
            <Text style={styles.calloutButtonText}>Choose edition and interests</Text>
          </Pressable>
        </View>
      </Section>

      <Section>
        <SectionHeader title="Primary Edition" action="Change edition" onAction={() => router.push("/edition" as never)} />
        <StoryGrid stories={home.data.filter((item) => item.geography.some((zone) => zone.slug === "zimbabwe")).slice(0, 2)} />
      </Section>

      <Section>
        <SectionHeader title="Research & Findings" />
        <StoryGrid stories={home.data.filter((item) => item.primarySection?.slug === "research").slice(0, 2)} />
      </Section>

      <Section>
        <SectionHeader title="Health Business" />
        <StoryGrid stories={home.data.filter((item) => item.primarySection?.slug === "health-business").slice(0, 2)} />
      </Section>

      <Section>
        <SectionHeader title="Premium Intelligence" action="View Premium" onAction={() => router.push("/premium" as never)} />
        <StoryGrid stories={home.data.filter((item) => item.accessPolicy === "premium").slice(0, 2)} />
      </Section>

      <Section>
        <SectionHeader title="Watch" action="Open Watch" onAction={() => router.push("/watch" as never)} />
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
          message="AG-05 supplies real audience and analytics signals. NM-01 preserves this approved Home position without fabricating a ranking."
        />
      </Section>

      <Section>
        <AdSlot placement="home_deep_feed" />
      </Section>
    </Page>
  );
}

const styles=StyleSheet.create({
  breaking:{marginVertical:spacing.lg,borderLeftWidth:4,borderLeftColor:colors.live,paddingLeft:spacing.md,gap:spacing.xs},
  breakingLabel:{fontSize:11,fontWeight:"900",color:colors.live,letterSpacing:1},
  breakingText:{fontSize:14,color:colors.ink,fontWeight:"700"},
  muted:{color:colors.inkMuted},
  callout:{backgroundColor:colors.paperMuted,borderRadius:radius.md,padding:spacing.xl,gap:spacing.sm},
  calloutTitle:{fontSize:20,fontWeight:"900",color:colors.ink},
  calloutText:{fontSize:15,lineHeight:22,color:colors.inkMuted,maxWidth:720},
  calloutButton:{alignSelf:"flex-start",minHeight:44,justifyContent:"center",backgroundColor:colors.blue,paddingHorizontal:16,borderRadius:radius.sm,marginTop:spacing.sm},
  calloutButtonText:{color:"#FFFFFF",fontWeight:"900"},
  watchGrid:{flexDirection:"row",flexWrap:"wrap",gap:spacing.xl},
  watchItem:{minWidth:260,flex:1}
});
