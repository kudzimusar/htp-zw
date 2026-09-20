import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AdSlot, VideoCard } from "../../src/ui/Cards";
import { Chip, EmptyState, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { spacing } from "../../src/theme/tokens";
import { useAppearance } from "../../src/theme/AppearanceProvider";

type WatchTab="latest"|"popular"|"series"|"live"|"shorts";

export default function WatchScreen(){
  const router=useRouter();
  const { palette }=useAppearance();
  const [active,setActive]=useState<WatchTab>("latest");
  const videos=useAsync(()=>services.video.list(),[]);
  const featured=videos.data?.[0];
  const remaining=videos.data?.slice(1) ?? [];

  const unavailableCopy:Record<Exclude<WatchTab,"latest">,string>={
    popular:"AG-05 audience signals will determine verified popularity; the client does not fabricate rankings.",
    series:"AG-04 migrated video metadata will identify authoritative series.",
    live:"Live video is routed through the HealthTimes Live service so status remains authoritative.",
    shorts:"Short-form classification will come from authoritative AG-04 video metadata."
  };

  return (
    <Page title="Watch">
      <Text style={[styles.lede,{color:palette.inkMuted}]}>HealthTimes video is a first-class editorial destination with the same publication identity across iOS, Android and PWA.</Text>
      <View style={styles.tabs}>
        {([
          ["latest","Latest"],
          ["popular","Popular"],
          ["series","Series"],
          ["live","Live"],
          ["shorts","Shorts"]
        ] as const).map(([key,label])=><Chip key={key} active={active===key} onPress={()=>setActive(key)}>{label}</Chip>)}
      </View>

      {active==="latest" ? (
        <>
          <Section>
            <SectionHeader title="Featured video" eyebrow="WATCH" />
            {featured ? <VideoCard item={featured} /> : <EmptyState title="No featured video" message="Video content will appear when the Video service returns published items." />}
          </Section>
          <Section>
            <SectionHeader title="Latest" />
            {remaining.length ? (
              <View style={styles.grid}>
                {remaining.map((item)=><View style={styles.item} key={item.id}><VideoCard item={item} /></View>)}
              </View>
            ) : (
              <EmptyState title="No additional videos" message="The current service has no more published video items." />
            )}
          </Section>
        </>
      ) : (
        <Section>
          <EmptyState
            title={active==="live" ? "Open live video coverage" : "Authoritative metadata required"}
            message={unavailableCopy[active]}
            action={active==="live" ? (
              <Pressable accessibilityRole="button" style={[styles.liveAction,{borderColor:palette.border}]} onPress={()=>router.push("/live" as never)}>
                <Text style={[styles.liveActionText,{color:palette.blue}]}>Open Live</Text>
              </Pressable>
            ) : undefined}
          />
        </Section>
      )}

      <Section><AdSlot placement="watch_feed" /></Section>
    </Page>
  );
}
const styles=StyleSheet.create({
  lede:{fontSize:15,lineHeight:23,maxWidth:760,marginTop:spacing.sm},
  tabs:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,marginTop:spacing.lg},
  grid:{flexDirection:"row",flexWrap:"wrap",gap:spacing.xl},
  item:{minWidth:260,flex:1},
  liveAction:{minHeight:44,alignSelf:"flex-start",justifyContent:"center",paddingHorizontal:14,borderWidth:1},
  liveActionText:{fontWeight:"900"}
});
