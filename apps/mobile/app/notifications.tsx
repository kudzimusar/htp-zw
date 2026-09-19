import { StyleSheet, Text, View } from "react-native";
import { Chip, EmptyState, Page, Section, SectionHeader } from "../src/ui/Layout";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { colors, spacing } from "../src/theme/tokens";

export default function NotificationsScreen(){
  const notifications=useAsync(()=>services.notifications.list(),[]);
  return (
    <Page title="Notifications">
      <View style={styles.tabs}><Chip active>All</Chip><Chip>Breaking</Chip><Chip>Live</Chip><Chip>Topics</Chip><Chip>Premium</Chip><Chip>System</Chip></View>
      <Section>
        <SectionHeader title="Latest" />
        {notifications.data?.length ? notifications.data.map((item)=>(
          <View style={styles.row} key={item.id}>
            <View style={[styles.dot,item.read&&styles.dotRead]} />
            <View style={{flex:1}}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
              <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
          </View>
        )):<EmptyState title="No notifications" message="Breaking, Live, followed-topic and Premium alerts will appear here." />}
      </Section>
    </Page>
  );
}
const styles=StyleSheet.create({
  tabs:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,marginTop:spacing.lg},
  row:{minHeight:74,borderBottomWidth:1,borderBottomColor:colors.border,flexDirection:"row",gap:spacing.md,paddingVertical:spacing.md,alignItems:"flex-start"},
  dot:{width:9,height:9,borderRadius:5,backgroundColor:colors.blue,marginTop:7},
  dotRead:{backgroundColor:colors.border},
  title:{fontSize:16,fontWeight:"900",color:colors.ink},
  description:{fontSize:14,lineHeight:20,color:colors.inkMuted,marginTop:2},
  time:{fontSize:11,color:colors.inkMuted,marginTop:4}
});
