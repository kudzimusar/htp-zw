import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Page, Section, SectionHeader } from "../../src/ui/Layout";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { layout, radius, spacing } from "../../src/theme/tokens";
import { appEnvironment } from "../../src/platform/config";
import { useAppearance } from "../../src/theme/AppearanceProvider";

type MenuItem={label:string;path?:string;detail?:string};

const groups:{title:string;items:MenuItem[]}[]=[
  {title:"Account",items:[
    {label:"My Profile",path:"/account-access"},
    {label:"Countries & Interests",path:"/edition"},
    {label:"My Subscriptions",path:"/premium"},
    {label:"Payment Methods",path:"/premium"},
    {label:"Privacy",detail:"Policy linkage pending"}
  ]},
  {title:"Reading",items:[
    {label:"Saved",path:"/saved"},
    {label:"Downloads",path:"/saved"},
    {label:"Reading History",path:"/saved"},
    {label:"Notifications",path:"/notifications"}
  ]},
  {title:"App & security",items:[
    {label:"Notification Settings",path:"/notification-settings"},
    {label:"Appearance / Theme",path:"/appearance"},
    {label:"Security",path:"/devices-sessions"},
    {label:"Devices / Sessions",path:"/devices-sessions"},
    {label:"System Status",path:"/system-status"},
    {label:"Growth & Commercial Readiness",path:"/growth-status"},
    {label:"Help & Support",detail:"Support service pending"},
    {label:"Sign Out / Account deletion",path:"/devices-sessions"}
  ]}
];

export default function MyHealthTimesScreen(){
  const router=useRouter();
  const { palette }=useAppearance();
  const profile=useAsync(()=>services.auth.getReader(),[]);
  const membership=profile.data?.membership ?? "anonymous";

  return (
    <Page title="My HealthTimes">
      <View style={[styles.profile,{borderBottomColor:palette.border}]}>
        <View style={[styles.avatar,{backgroundColor:palette.ink}]}><Text style={[styles.avatarText,{color:palette.paper}]}>HT</Text></View>
        <View style={styles.profileCopy}>
          <Text style={[styles.name,{color:palette.ink}]}>{profile.data?.displayName ?? "Reader"}</Text>
          <Text style={[styles.membership,{color:palette.inkMuted}]}>{membership} membership · {appEnvironment}</Text>
        </View>
        <Pressable
          style={[styles.premium,{borderColor:palette.blue}]}
          onPress={()=>router.push("/premium" as never)}
          accessibilityRole="button"
        >
          <Text style={[styles.premiumText,{color:palette.blue}]}>{membership==="premium" ? "Premium" : "Go Premium"}</Text>
        </Pressable>
      </View>

      {groups.map((group)=>(
        <Section key={group.title}>
          <SectionHeader title={group.title} />
          <View>
            {group.items.map((item)=>(
              <Pressable
                key={item.label}
                disabled={!item.path}
                onPress={item.path ? ()=>router.push(item.path as never) : undefined}
                style={[styles.row,{borderBottomColor:palette.border}]}
                accessibilityRole={item.path ? "button" : undefined}
              >
                <Text style={[styles.rowText,{color:palette.ink}]}>{item.label}</Text>
                <View style={styles.rowEnd}>
                  {!!item.detail && <Text style={[styles.detail,{color:palette.inkMuted}]}>{item.detail}</Text>}
                  {!!item.path && <Text style={[styles.chevron,{color:palette.inkMuted}]}>›</Text>}
                </View>
              </Pressable>
            ))}
          </View>
        </Section>
      ))}

      <Section>
        <Pressable style={[styles.studio,{backgroundColor:palette.navy,borderRadius:radius.md}]} onPress={()=>router.push("/studio" as never)}>
          <Text style={styles.studioTitle}>HealthTimes Studio</Text>
          <Text style={styles.studioText}>Open the staff workspace. Access remains capability-gated by AG-06 server authority; this Reader cannot grant roles locally.</Text>
        </Pressable>
      </Section>
    </Page>
  );
}
const styles=StyleSheet.create({
  profile:{marginTop:spacing.xl,flexDirection:"row",alignItems:"center",gap:spacing.md,paddingBottom:spacing.xl,borderBottomWidth:1,flexWrap:"wrap"},
  avatar:{width:56,height:56,borderRadius:28,alignItems:"center",justifyContent:"center"},
  avatarText:{fontWeight:"900"},
  profileCopy:{flex:1,minWidth:180},
  name:{fontSize:20,fontWeight:"900"},
  membership:{fontSize:13,marginTop:2,textTransform:"capitalize"},
  premium:{minHeight:layout.touchMin,justifyContent:"center",paddingHorizontal:14,borderWidth:1,borderRadius:radius.sm},
  premiumText:{fontWeight:"900"},
  row:{minHeight:58,borderBottomWidth:1,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:spacing.md},
  rowText:{fontSize:16,fontWeight:"700",flex:1},
  rowEnd:{flexDirection:"row",alignItems:"center",gap:spacing.sm,maxWidth:"48%"},
  detail:{fontSize:11,textAlign:"right"},
  chevron:{fontSize:24},
  studio:{padding:spacing.xl,gap:spacing.sm},
  studioTitle:{fontSize:20,fontWeight:"900",color:"#FFFFFF"},
  studioText:{fontSize:14,lineHeight:21,color:"#C9D5E1"}
});
