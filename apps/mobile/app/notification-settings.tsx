import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Page, Section, SectionHeader } from "../src/ui/Layout";
import { services } from "../src/services";
import type { NotificationPreferences } from "../src/security/notification-preferences";
import { layout, radius, spacing } from "../src/theme/tokens";
import { useAppearance } from "../src/theme/AppearanceProvider";

const rows: Array<[keyof NotificationPreferences,string,string]> = [
  ["breaking","Breaking news","Urgent HealthTimes reporting."],
  ["live","Live coverage","Live blogs, briefings and events."],
  ["followedTopics","Followed topics","Topics and countries you chose to follow."],
  ["premium","Premium","Premium reporting and membership notices."],
  ["system","System","Account and service notices."]
];

export default function NotificationSettingsScreen(){
  const { palette }=useAppearance();
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
      <Text style={[styles.lede,{color:palette.inkMuted}]}>Choose what HealthTimes may notify you about. Preference storage is real; server token registration and remote delivery remain separate AG-06 responsibilities.</Text>

      <Section>
        <SectionHeader title="Alert preferences" eyebrow="READER CHOICE" />
        {preferences && rows.map(([key,title,description])=>(
          <View style={[styles.row,{borderBottomColor:palette.border}]} key={key}>
            <View style={styles.copy}>
              <Text style={[styles.title,{color:palette.ink}]}>{title}</Text>
              <Text style={[styles.description,{color:palette.inkMuted}]}>{description}</Text>
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
        <SectionHeader title="Native push" eyebrow="DEVICE PERMISSION" />
        <View style={[styles.pushCard,{borderColor:palette.border,backgroundColor:palette.paper}]}>
          <Text style={[styles.description,{color:palette.inkMuted}]}>Permission is requested only when you choose it. A device token is not treated as registered until AG-06 supplies a server registration and revocation endpoint.</Text>
          <Pressable accessibilityRole="button" style={[styles.button,{backgroundColor:palette.blue}]} onPress={()=>void enablePush()}>
            <Text style={[styles.buttonText,{color:palette.paper}]}>Enable native push</Text>
          </Pressable>
          {!!pushStatus && <Text accessibilityLiveRegion="polite" style={[styles.status,{color:palette.inkMuted}]}>{pushStatus}</Text>}
        </View>
      </Section>
    </Page>
  );
}

const styles=StyleSheet.create({
  lede:{fontSize:15,lineHeight:23,maxWidth:760,marginTop:spacing.sm},
  row:{minHeight:72,flexDirection:"row",alignItems:"center",gap:spacing.md,borderBottomWidth:1,paddingVertical:spacing.md},
  copy:{flex:1},
  title:{fontSize:16,fontWeight:"900"},
  description:{fontSize:14,lineHeight:21,maxWidth:720},
  pushCard:{borderWidth:1,borderRadius:radius.md,padding:spacing.lg,gap:spacing.lg,maxWidth:760},
  button:{minHeight:layout.touchMin,alignSelf:"flex-start",justifyContent:"center",paddingHorizontal:16,borderRadius:radius.sm},
  buttonText:{fontWeight:"900"},
  status:{fontSize:13,lineHeight:20}
});
