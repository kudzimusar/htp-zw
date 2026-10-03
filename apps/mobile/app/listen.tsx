import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AudioCard } from "../src/ui/Cards";
import { Chip, EmptyState, Page, Section, SectionHeader } from "../src/ui/Layout";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { radius, spacing } from "../src/theme/tokens";
import { useAppearance } from "../src/theme/AppearanceProvider";

type ListenTab="latest"|"podcasts"|"articles"|"offline";

export default function ListenScreen(){
  const { palette }=useAppearance();
  const [active,setActive]=useState<ListenTab>("latest");
  const [status,setStatus]=useState("");
  const audio=useAsync(()=>services.audio.list(),[]);
  const featured=audio.data?.[0];

  return (
    <Page title="Listen">
      <Text style={[styles.lede,{color:palette.inkMuted}]}>Listen to HealthTimes programmes and article audio when they are published.</Text>
      <View style={styles.tabs}>
        {([
          ["latest","Latest"],
          ["podcasts","Podcasts"],
          ["articles","Articles"],
          ["offline","Offline"]
        ] as const).map(([key,label])=><Chip key={key} active={active===key} onPress={()=>setActive(key)}>{label}</Chip>)}
      </View>

      {active==="latest" ? (
        <>
          <Section>
            <SectionHeader title="Featured audio" eyebrow="LISTEN" />
            {featured ? (
              <View style={[styles.player,{backgroundColor:palette.navy}]}>
                <Text style={styles.playerLabel}>FEATURED AUDIO</Text>
                <Text style={styles.playerTitle}>{featured.title}</Text>
                <Text style={styles.playerMeta}>{featured.durationSeconds ? Math.round(featured.durationSeconds/60) + " min" : "HealthTimes audio"}</Text>
                <View style={styles.playerControls}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Play featured audio"
                    style={styles.play}
                    onPress={()=>setStatus("Playback is not available for this item yet.")}
                  >
                    <Text style={styles.playText}>Play</Text>
                  </Pressable>
                  <View style={styles.progress}><View style={styles.progressFill} /></View>
                  <Text style={styles.speed}>1×</Text>
                </View>
                {!!status && <Text accessibilityLiveRegion="polite" style={styles.playerMeta}>{status}</Text>}
              </View>
            ) : <EmptyState title="No featured audio" message="HealthTimes audio will appear here when published." />}
          </Section>
          <Section>
            <SectionHeader title="Latest" />
            {audio.data?.length ? audio.data.map((item)=><AudioCard key={item.id} item={item} />) : <EmptyState title="No audio yet" message="Published HealthTimes audio will appear here." />}
          </Section>
        </>
      ) : (
        <Section>
          <EmptyState
            title={active==="offline" ? "No offline audio yet" : "No audio in this section yet"}
            message={active==="offline"
              ? "Audio saved for offline listening will appear here when that feature is available."
              : "No audio is available in this category yet."}
          />
        </Section>
      )}
    </Page>
  );
}
const styles=StyleSheet.create({
  lede:{fontSize:15,lineHeight:23,maxWidth:760,marginTop:spacing.sm},
  tabs:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,marginTop:spacing.lg},
  player:{padding:spacing.xl,borderRadius:radius.md,gap:spacing.md},
  playerLabel:{fontSize:10,fontWeight:"900",color:"#8EC8FF",letterSpacing:1.1},
  playerTitle:{fontSize:28,lineHeight:34,fontWeight:"900",color:"#FFFFFF",maxWidth:760},
  playerMeta:{fontSize:13,lineHeight:20,color:"#C9D5E1"},
  playerControls:{flexDirection:"row",alignItems:"center",gap:spacing.md},
  play:{minWidth:64,minHeight:48,borderRadius:24,backgroundColor:"#FFFFFF",alignItems:"center",justifyContent:"center"},
  playText:{fontWeight:"900",color:"#071A2B"},
  progress:{height:4,backgroundColor:"#31465A",flex:1},
  progressFill:{height:4,width:"0%",backgroundColor:"#FFFFFF"},
  speed:{color:"#FFFFFF",fontWeight:"900"}
});
