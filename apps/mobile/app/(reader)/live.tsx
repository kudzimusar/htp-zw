import { StyleSheet, Text, View } from "react-native";
import { LiveRail, AdSlot } from "../../src/ui/Cards";
import { Chip, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { colors, spacing } from "../../src/theme/tokens";

export default function LiveScreen(){
  const live=useAsync(()=>services.live.list(),[]);
  return (
    <Page title="Live">
      <View style={styles.tabs}>
        <Chip active>Live Now</Chip><Chip>Live Blog</Chip><Chip>Upcoming</Chip>
      </View>
      <Section>
        <SectionHeader title="Live Now" />
        {live.data?.length ? <LiveRail items={live.data} /> : <Text style={styles.muted}>No active live coverage.</Text>}
      </Section>
      <Section>
        <View style={styles.note}>
          <Text style={styles.noteTitle}>Live is a first-class format</Text>
          <Text style={styles.noteText}>Fixture events prove the layout only. AG-backed Live publishing and viewer/update metadata will replace this service later.</Text>
        </View>
      </Section>
      <Section><AdSlot placement="live_feed" /></Section>
    </Page>
  );
}
const styles=StyleSheet.create({
  tabs:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,marginTop:spacing.lg},
  muted:{color:colors.inkMuted},
  note:{borderLeftWidth:4,borderLeftColor:colors.live,paddingLeft:spacing.lg,gap:spacing.sm},
  noteTitle:{fontSize:20,fontWeight:"900",color:colors.ink},
  noteText:{fontSize:15,lineHeight:22,color:colors.inkMuted}
});
