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
  const [libraryVersion,setLibraryVersion]=useState(0);
  const videos=useAsync(()=>services.video.list(),[]);
  const savedVideoIds=useAsync(()=>services.reader.getSavedMediaIds("video"),[libraryVersion]);
  const featured=videos.data?.[0];
  const toggleSaved=async(id:string)=>{await services.reader.toggleSavedMedia("video",id);setLibraryVersion((value)=>value+1);};
  const remaining=videos.data?.slice(1) ?? [];

  const unavailableCopy:Record<Exclude<WatchTab,"latest">,string>={
    popular:"Popular videos will appear when HealthTimes audience ranking is available.",
    series:"HealthTimes series will appear when programme grouping is available.",
    live:"Open Live to see current and scheduled HealthTimes live coverage.",
    shorts:"Short-form videos will appear when HealthTimes publishes them with that format."
  };

  return (
    <Page title="Watch">
      <Text style={[styles.lede,{color:palette.inkMuted}]}>Watch HealthTimes interviews, explainers, investigations and health coverage. Videos open only when a published viewing destination is available.</Text>
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
            {featured ? <VideoCard item={featured} saved={savedVideoIds.data?.includes(featured.id)} onToggleSaved={()=>void toggleSaved(featured.id)} /> : <EmptyState title="No featured video" message="New HealthTimes videos will appear here when published." />}
          </Section>
          <Section>
            <SectionHeader title="Latest" />
            {remaining.length ? (
              <View style={styles.grid}>
                {remaining.map((item)=><View style={styles.item} key={item.id}><VideoCard item={item} saved={savedVideoIds.data?.includes(item.id)} onToggleSaved={()=>void toggleSaved(item.id)} /></View>)}
              </View>
            ) : (
              <EmptyState title="No additional videos" message="There are no more HealthTimes videos in this view." />
            )}
          </Section>
        </>
      ) : (
        <Section>
          <EmptyState
            title={active==="live" ? "Open live video coverage" : "Nothing here yet"}
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
