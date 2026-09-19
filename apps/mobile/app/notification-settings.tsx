import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Page, Section, SectionHeader } from "../src/ui/Layout";
import { services } from "../src/services";
import type { NotificationPreferences } from "../src/security/notification-preferences";
import { colors, layout, spacing } from "../src/theme/tokens";

const rows: Array<[keyof NotificationPreferences,string,string]> = [
  ["breaking","Breaking news","Urgent HealthTimes reporting."],
  ["live","Live coverage","Live blogs, briefings and events."],
  ["followedTopics","Followed topics","Topics and countries you chose to follow."],
  ["premium","Premium","Premium reporting and membership notices."],
  ["system","System","Account and service notices."]
];

export default function NotificationSettingsScreen(){
  const [preferences,setPreferences]=useState<NotificationPreferences|null>(null);
  const [pushStatus,setPushStatus]=useState("");

  useEffect(()=>{
    services.deviceSecurity.getNotificationPreferences().then(setPreferences);
  },[]);

  const toggle=async(key:keyof NotificationPreferences)=>{
    if(!preferences) return;
    const next={...preferences,[key]:!preferences[key]};
    setPreferences(next);
    await services.deviceSecurity.saveNotificationPreferences(next);
  };

  const enablePush=async()=>{
    const result=await services.deviceSecurity.requestPushRegistration();
    setPushStatus(result.message);
  };

  return (
    <Page title="Notification Settings">
      <Section>
        <SectionHeader title="Alert preferences" />
        {preferences && rows.map(([key,title,description])=>(
          <View style={styles.row} key={key}>
            <View style={{flex:1}}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
            <Switch
              value={preferences[key]}
              onValueChange={()=>void toggle(key)}
              accessibilityLabel={title}
            />
          </View>
        ))}
      </Section>

      <Section>
        <SectionHeader title="Native push" />
        <Text style={styles.description}>
          Permission is requested only when you choose it. A device token is not treated as registered until AG-06 supplies a server registration and revocation endpoint.
        </Text>
        <Pressable accessibilityRole="button" style={styles.button} onPress={()=>void enablePush()}>
          <Text style={styles.buttonText}>Enable native push</Text>
        </Pressable>
        {!!pushStatus && <Text accessibilityLiveRegion="polite" style={styles.status}>{pushStatus}</Text>}
      </Section>
    </Page>
  );
}

const styles=StyleSheet.create({
  row:{minHeight:72,flexDirection:"row",alignItems:"center",gap:spacing.md,borderBottomWidth:1,borderBottomColor:colors.border,paddingVertical:spacing.md},
  title:{fontSize:16,fontWeight:"900",color:colors.ink},
  description:{fontSize:14,lineHeight:21,color:colors.inkMuted,maxWidth:720},
  button:{marginTop:spacing.lg,minHeight:layout.touchMin,alignSelf:"flex-start",justifyContent:"center",paddingHorizontal:16,backgroundColor:colors.blue},
  buttonText:{color:"#FFFFFF",fontWeight:"900"},
  status:{marginTop:spacing.sm,fontSize:13,lineHeight:20,color:colors.inkMuted}
});
