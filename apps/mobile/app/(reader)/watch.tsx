import { StyleSheet, Text, View } from "react-native";
import { AdSlot, VideoCard } from "../../src/ui/Cards";
import { Chip, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { colors, spacing } from "../../src/theme/tokens";

export default function WatchScreen(){
  const videos=useAsync(()=>services.video.list(),[]);
  return (
    <Page title="Watch">
      <View style={styles.tabs}><Chip active>Latest</Chip><Chip>Popular</Chip><Chip>Series</Chip><Chip>Live</Chip><Chip>Shorts</Chip></View>
      <Section>
        <SectionHeader title="Featured video" />
        {videos.data?.[0] ? <VideoCard item={videos.data[0]} /> : <Text style={styles.muted}>No video.</Text>}
      </Section>
      <Section>
        <SectionHeader title="Latest" />
        <View style={styles.grid}>
          {videos.data?.slice(1).map((item)=><View style={styles.item} key={item.id}><VideoCard item={item} /></View>)}
        </View>
      </Section>
      <Section><AdSlot placement="watch_feed" /></Section>
    </Page>
  );
}
const styles=StyleSheet.create({
  tabs:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,marginTop:spacing.lg},
  grid:{flexDirection:"row",flexWrap:"wrap",gap:spacing.xl},
  item:{minWidth:260,flex:1},
  muted:{color:colors.inkMuted}
});
