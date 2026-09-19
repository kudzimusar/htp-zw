import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Page, Section, SectionHeader } from "../../src/ui/Layout";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { colors, layout, spacing } from "../../src/theme/tokens";
import { appEnvironment } from "../../src/platform/config";

const items=[
  ["Account Access","/account-access"],
  ["Countries & Interests","/edition"],
  ["Saved","/saved"],
  ["Downloads","/saved"],
  ["Reading History","/saved"],
  ["Notifications","/notifications"],
  ["Notification Settings","/notification-settings"],
  ["My Subscriptions","/premium"],
  ["Payment Methods","/premium"],
  ["Appearance / Theme","/appearance"],
  ["Privacy","/my"],
  ["Security","/devices-sessions"],
  ["Devices / Sessions","/devices-sessions"],
  ["Settings","/notification-settings"],
  ["System Status","/system-status"],
  ["Growth & Commercial Readiness","/growth-status"],
  ["Help & Support","/my"],
  ["Sign Out / Account deletion","/devices-sessions"]
] as const;

export default function MyHealthTimesScreen(){
  const router=useRouter();
  const profile=useAsync(()=>services.auth.getReader(),[]);
  return (
    <Page title="My HealthTimes">
      <View style={styles.profile}>
        <View style={styles.avatar}><Text style={styles.avatarText}>HT</Text></View>
        <View style={{flex:1}}>
          <Text style={styles.name}>{profile.data?.displayName ?? "Reader"}</Text>
          <Text style={styles.membership}>{profile.data?.membership ?? "anonymous"} membership • {appEnvironment}</Text>
        </View>
        <Pressable style={styles.premium} onPress={()=>router.push("/premium" as never)}><Text style={styles.premiumText}>Go Premium</Text></Pressable>
      </View>

      <Section>
        <SectionHeader title="Account & preferences" />
        <View>
          {items.map(([label,path])=>(
            <Pressable key={label} onPress={()=>router.push(path as never)} style={styles.row}>
              <Text style={styles.rowText}>{label}</Text><Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section>
        <Pressable style={styles.studio} onPress={()=>router.push("/studio" as never)}>
          <Text style={styles.studioTitle}>HealthTimes Studio</Text>
          <Text style={styles.studioText}>Staff shell only. AG-06 will supply real identity, capabilities and server authorization.</Text>
        </Pressable>
      </Section>
    </Page>
  );
}
const styles=StyleSheet.create({
  profile:{marginTop:spacing.xl,flexDirection:"row",alignItems:"center",gap:spacing.md},
  avatar:{width:56,height:56,borderRadius:28,backgroundColor:colors.ink,alignItems:"center",justifyContent:"center"},
  avatarText:{color:"#FFFFFF",fontWeight:"900"},
  name:{fontSize:20,fontWeight:"900",color:colors.ink},
  membership:{fontSize:13,color:colors.inkMuted,marginTop:2},
  premium:{minHeight:layout.touchMin,justifyContent:"center",paddingHorizontal:14,borderWidth:1,borderColor:colors.blue},
  premiumText:{color:colors.blue,fontWeight:"900"},
  row:{minHeight:56,borderBottomWidth:1,borderBottomColor:colors.border,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  rowText:{fontSize:16,fontWeight:"700",color:colors.ink},
  chevron:{fontSize:24,color:colors.inkMuted},
  studio:{backgroundColor:colors.navy,padding:spacing.xl,gap:spacing.sm},
  studioTitle:{fontSize:20,fontWeight:"900",color:"#FFFFFF"},
  studioText:{fontSize:14,lineHeight:21,color:"#C9D5E1"}
});
