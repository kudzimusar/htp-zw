import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AdSlot, FeaturedVideoCard, VideoCard } from "../../src/ui/Cards";
import { EmptyState, LoadingBlock, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { radius, spacing } from "../../src/theme/tokens";
import { useAppearance } from "../../src/theme/AppearanceProvider";

export default function WatchScreen(){
  const router=useRouter();
  const { palette }=useAppearance();
  const videos=useAsync(()=>services.video.list(),[]);
  const featured=videos.data?.[0];
  const remaining=videos.data?.slice(1) ?? [];

  return (
    <Page title="Watch">
      <View style={styles.identity}>
        <Text style={[styles.identityLabel,{color:palette.blue}]}>HEALTHTIMES TV</Text>
        <Text style={[styles.lede,{color:palette.inkMuted}]}>Interviews, explainers, investigations and health reporting from HealthTimes video.</Text>
      </View>

      <View style={[styles.watchBar,{borderColor:palette.border}]}>
        <View style={styles.watchBarCopy}>
          <Text style={[styles.watchBarTitle,{color:palette.ink}]}>Latest videos</Text>
          <Text style={[styles.watchBarText,{color:palette.inkMuted}]}>Published viewing destinations open directly from each available video.</Text>
        </View>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Open HealthTimes Live coverage"
          style={[styles.liveAction,{borderColor:palette.border}]}
          onPress={()=>router.push("/live" as never)}
        >
          <Text style={[styles.liveActionText,{color:palette.blue}]}>Live coverage →</Text>
        </Pressable>
      </View>

      {videos.loading && !videos.data ? <LoadingBlock label="Loading videos…" /> : null}

      {videos.error && !videos.data ? (
        <Section>
          <EmptyState
            title="Videos are temporarily unavailable"
            message="HealthTimes could not load Watch right now. Please try again when your connection is available."
          />
        </Section>
      ) : null}

      {!videos.loading && !videos.error && !featured ? (
        <Section>
          <EmptyState
            title="No videos available"
            message="New HealthTimes video reporting will appear here when it is published."
          />
        </Section>
      ) : null}

      {featured ? (
        <>
          <Section>
            <SectionHeader title="Featured video" eyebrow="WATCH" />
            <FeaturedVideoCard item={featured} />
          </Section>

          <AdSlot placement="watch_feed" />

          {!!remaining.length && (
            <Section>
              <SectionHeader title="Latest videos" />
              <View style={styles.grid}>
                {remaining.map((item)=><View style={styles.item} key={item.id}><VideoCard item={item} /></View>)}
              </View>
            </Section>
          )}
        </>
      ) : null}
    </Page>
  );
}

const styles=StyleSheet.create({
  identity:{marginTop:spacing.sm,gap:4,maxWidth:820},
  identityLabel:{fontSize:10,fontWeight:"900",letterSpacing:1.5},
  lede:{fontSize:16,lineHeight:24},
  watchBar:{marginTop:spacing.xl,borderTopWidth:1,borderBottomWidth:1,paddingVertical:spacing.md,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:spacing.md},
  watchBarCopy:{flex:1,gap:2},
  watchBarTitle:{fontSize:15,fontWeight:"900"},
  watchBarText:{fontSize:12,lineHeight:18},
  liveAction:{minHeight:44,justifyContent:"center",paddingHorizontal:spacing.md,borderWidth:1,borderRadius:radius.sm},
  liveActionText:{fontSize:12,fontWeight:"900"},
  grid:{flexDirection:"row",flexWrap:"wrap",gap:spacing.xl},
  item:{minWidth:260,flex:1,flexBasis:300}
});
