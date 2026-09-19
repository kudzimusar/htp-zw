import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { StudioPlaceholder, StudioShell } from "../../src/ui/Studio";
import { colors, spacing } from "../../src/theme/tokens";

const actions=[
  ["Stories","stories","Draft, review, assignment and publication workflows"],
  ["Create / Edit","create-edit","Server-authorized story creation and editing"],
  ["Live Desk","live-desk","Live blogs, streams and scheduled events"],
  ["Video Desk","video-desk","Video publishing and metadata"],
  ["Advertising","advertising","Campaigns, creatives and placements"],
  ["Analytics","analytics","KPI-first views from AG-05 real services"],
  ["Staff & Roles","staff-roles","Server-authorized staff and capabilities"]
] as const;

export default function StudioToday(){
  const router=useRouter();
  return (
    <StudioShell title="Today">
      <StudioPlaceholder owner="AG-06 / AG-05" description="Studio foundations are operationally laid out, but identity, permissions, analytics and commercial data remain service-owned and are not invented in NM-01." />
      <View style={styles.grid}>
        {actions.map(([title,path,description])=>(
          <Pressable key={path} style={styles.card} onPress={()=>router.push(("/studio/"+path) as never)}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardText}>{description}</Text>
            <Text style={styles.open}>Open →</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.status}>
        <Text style={styles.statusTitle}>Checkpoint status</Text>
        <Text style={styles.statusText}>CP1 baseline: available • CP2 staging: available • CP3 authoritative source package: blocked • AG-04/05/06 integrated data: pending</Text>
      </View>
    </StudioShell>
  );
}
const styles=StyleSheet.create({
  grid:{marginTop:spacing.xl,flexDirection:"row",flexWrap:"wrap",gap:spacing.lg},
  card:{minWidth:240,flex:1,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:colors.border,padding:spacing.xl,gap:spacing.sm},
  cardTitle:{fontSize:18,fontWeight:"900",color:colors.ink},
  cardText:{fontSize:13,lineHeight:20,color:colors.inkMuted},
  open:{fontSize:12,fontWeight:"900",color:colors.blue,marginTop:spacing.sm},
  status:{marginTop:spacing.xl,borderLeftWidth:4,borderLeftColor:colors.warning,paddingLeft:spacing.lg,gap:spacing.sm},
  statusTitle:{fontSize:16,fontWeight:"900",color:colors.ink},
  statusText:{fontSize:13,lineHeight:20,color:colors.inkMuted}
});
