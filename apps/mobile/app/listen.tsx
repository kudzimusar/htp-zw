import { StyleSheet, Text, View } from "react-native";
import { AudioCard } from "../src/ui/Cards";
import { Chip, Page, Section, SectionHeader } from "../src/ui/Layout";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { colors, radius, spacing } from "../src/theme/tokens";

export default function ListenScreen(){
  const audio=useAsync(()=>services.audio.list(),[]);
  return (
    <Page title="Listen">
      <View style={styles.tabs}><Chip active>Latest</Chip><Chip>Podcasts</Chip><Chip>Articles</Chip><Chip>Offline</Chip></View>
      <Section>
        <SectionHeader title="Featured audio" />
        <View style={styles.player}>
          <Text style={styles.playerLabel}>NOW READY FOR NM-01 UI</Text>
          <Text style={styles.playerTitle}>{audio.data?.[0]?.title ?? "HealthTimes audio"}</Text>
          <View style={styles.progress}><View style={styles.progressFill} /></View>
          <Text style={styles.playerMeta}>Background playback and lock-screen controls are NM-04/NM-06 native integrations.</Text>
        </View>
      </Section>
      <Section>
        <SectionHeader title="Latest" />
        {audio.data?.map((item)=><AudioCard key={item.id} item={item} />)}
      </Section>
    </Page>
  );
}
const styles=StyleSheet.create({
  tabs:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,marginTop:spacing.lg},
  player:{backgroundColor:colors.navy,padding:spacing.xl,borderRadius:radius.md,gap:spacing.md},
  playerLabel:{fontSize:10,fontWeight:"900",color:"#8EC8FF",letterSpacing:1},
  playerTitle:{fontSize:26,lineHeight:32,fontWeight:"900",color:"#FFFFFF"},
  playerMeta:{fontSize:13,lineHeight:20,color:"#C9D5E1"},
  progress:{height:4,backgroundColor:"#31465A"},
  progressFill:{height:4,width:"28%",backgroundColor:"#FFFFFF"}
});
