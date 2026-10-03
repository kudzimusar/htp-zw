import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Chip, EmptyState, Page, Section, SectionHeader } from "../src/ui/Layout";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { radius, spacing } from "../src/theme/tokens";
import { useAppearance } from "../src/theme/AppearanceProvider";
import type { NotificationItem } from "../src/domain/models";

type NotificationFilter="all"|NotificationItem["category"];

export default function NotificationsScreen(){
  const router=useRouter();
  const { palette }=useAppearance();
  const [active,setActive]=useState<NotificationFilter>("all");
  const notifications=useAsync(()=>services.notifications.list(),[]);
  const filtered=useMemo(()=>active==="all" ? notifications.data ?? [] : (notifications.data ?? []).filter((item)=>item.category===active),[active,notifications.data]);

  return (
    <Page title="Notifications">
      <View style={styles.headerRow}>
        <View style={styles.tabs}>
          {([
            ["all","All"],
            ["breaking","Breaking"],
            ["live","Live"],
            ["topic","Topics"],
            ["premium","Premium"],
            ["system","System"]
          ] as const).map(([key,label])=><Chip key={key} active={active===key} onPress={()=>setActive(key)}>{label}</Chip>)}
        </View>
        <Pressable accessibilityRole="button" style={styles.settings} onPress={()=>router.push("/notification-settings" as never)}><Text style={[styles.settingsText,{color:palette.blue}]}>Notification settings</Text></Pressable>
      </View>
      <Section>
        <SectionHeader title={active==="all" ? "Latest" : "Filtered alerts"} />
        {filtered.length ? filtered.map((item)=>(
          <Pressable
            key={item.id}
            disabled={!item.destination}
            onPress={item.destination ? ()=>router.push(item.destination as never) : undefined}
            style={[styles.row,{borderBottomColor:palette.border}]}
            accessibilityRole={item.destination ? "link" : undefined}
          >
            <View style={[styles.dot,{backgroundColor:item.read?palette.border:palette.blue}]} />
            <View style={styles.copy}>
              <View style={styles.titleRow}>
                <Text style={[styles.category,{color:palette.blue}]}>{item.category.toUpperCase()}</Text>
                <Text style={[styles.time,{color:palette.inkMuted}]}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
              <Text style={[styles.title,{color:palette.ink}]}>{item.title}</Text>
              <Text style={[styles.description,{color:palette.inkMuted}]}>{item.description}</Text>
            </View>
            {!!item.destination && <Text style={[styles.chevron,{color:palette.inkMuted}]}>›</Text>}
          </Pressable>
        )):<EmptyState title="No notifications" message="Breaking, Live, followed-topic, Premium and system alerts will appear here when the selected filter has matches." />}
      </Section>
      <Section>
        <View style={[styles.authority,{backgroundColor:palette.paperMuted,borderRadius:radius.md}]}>
          <Text style={[styles.authorityTitle,{color:palette.ink}]}>Your alerts</Text>
          <Text style={[styles.authorityText,{color:palette.inkMuted}]}>Choose which HealthTimes alerts you want to receive. Availability may vary by device and account.</Text>
        </View>
      </Section>
    </Page>
  );
}
const styles=StyleSheet.create({
  headerRow:{marginTop:spacing.lg,gap:spacing.md},
  tabs:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  settings:{minHeight:44,alignSelf:"flex-start",justifyContent:"center"},
  settingsText:{fontWeight:"900"},
  row:{minHeight:84,borderBottomWidth:1,flexDirection:"row",gap:spacing.md,paddingVertical:spacing.md,alignItems:"flex-start"},
  dot:{width:9,height:9,borderRadius:5,marginTop:8},
  copy:{flex:1,gap:2},
  titleRow:{flexDirection:"row",justifyContent:"space-between",gap:spacing.sm,flexWrap:"wrap"},
  category:{fontSize:9,fontWeight:"900",letterSpacing:1},
  title:{fontSize:16,fontWeight:"900"},
  description:{fontSize:14,lineHeight:20,marginTop:2},
  time:{fontSize:10},
  chevron:{fontSize:24},
  authority:{padding:spacing.lg,gap:spacing.sm},
  authorityTitle:{fontSize:17,fontWeight:"900"},
  authorityText:{fontSize:13,lineHeight:20}
});
