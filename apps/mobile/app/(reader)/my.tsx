import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Page, Section, SectionHeader } from "../../src/ui/Layout";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { layout, radius, spacing } from "../../src/theme/tokens";
import { useAppearance } from "../../src/theme/AppearanceProvider";

type MenuItem={label:string;path?:string;url?:string;detail?:string};

export default function MyHealthTimesScreen(){
  const router=useRouter();
  const { palette }=useAppearance();
  const profile=useAsync(()=>services.auth.getReader(),[]);
  const publication=useAsync(()=>services.publication.getProfile(),[]);
  const authorization=useAsync(()=>services.authorization.getSnapshot(),[]);
  const store=useAsync(()=>services.premiumStore.getState(),[]);
  const [signOutStatus,setSignOutStatus]=useState("");

  const membership=profile.data?.membership ?? "anonymous";
  const membershipLabel=
    membership==="premium" ? "Premium member" :
    membership==="registered" ? "Registered reader" :
    "Reader";
  const staffAuthorized=
    authorization.data?.status==="authorized" &&
    authorization.data.source==="server" &&
    Boolean(authorization.data.staffProfileId);
  const paymentAvailable=store.data?.status==="available";

  const groups:{title:string;items:MenuItem[]}[]=[
    {title:"Account",items:[
      {label:"My Profile",path:"/account-access"},
      {label:"Countries & Interests",path:"/edition"}
    ]},
    {title:"Reading",items:[
      {label:"Saved",path:"/saved?tab=saved",detail:"Bookmarked stories"},
      {label:"Downloads",path:"/saved?tab=offline",detail:"Stories stored for offline reading"},
      {label:"Reading History",path:"/saved?tab=history",detail:"Recently read stories"},
      {label:"Notifications",path:"/notifications"}
    ]},
    {title:"Membership",items:[
      {label:"My Subscriptions",path:"/premium",detail:paymentAvailable ? "Membership status and available payment options" : "Membership status"}
    ]},
    {title:"Settings",items:[
      {label:"Notification Settings",path:"/notification-settings"},
      {label:"Appearance / Theme",path:"/appearance"},
      {label:"Devices & Sessions",path:"/devices-sessions",detail:"Current device session"},
      {label:"Account deletion status",path:"/devices-sessions",detail:"Server-managed availability"}
    ]},
    {title:"Help & About",items:[
      publication.data?.contactUrl
        ? {label:"Help & Support",url:publication.data.contactUrl}
        : {label:"Help & Support",detail:"Support contact is not available here yet"},
      {label:"About HealthTimes",path:"/about"},
      {label:"Authors",path:"/authors"},
      {label:"Corrections & Editorial Standards",path:"/about",detail:"Editorial standards and contact"}
    ]}
  ];

  const signOut=async()=>{
    setSignOutStatus("");
    await services.auth.signOut();
    setSignOutStatus("Signed out on this device.");
    router.replace("/account-access" as never);
  };

  return (
    <Page title="My HealthTimes">
      <View style={[styles.profile,{borderBottomColor:palette.border}]}>
        <View style={[styles.avatar,{backgroundColor:palette.ink}]}><Text style={[styles.avatarText,{color:palette.paper}]}>HT</Text></View>
        <View style={styles.profileCopy}>
          <Text style={[styles.name,{color:palette.ink}]}>{profile.data?.displayName ?? "Reader"}</Text>
          <Text style={[styles.membership,{color:palette.inkMuted}]}>{membershipLabel}</Text>
        </View>
      </View>

      <Pressable
        style={[styles.premiumCard,{backgroundColor:palette.navy,borderRadius:radius.md}]}
        onPress={()=>router.push("/premium" as never)}
        accessibilityRole="button"
        accessibilityLabel={membership==="premium" ? "View HealthTimes Premium membership" : "Explore HealthTimes Premium"}
      >
        <View style={styles.premiumCopy}>
          <Text style={styles.premiumEyebrow}>HEALTHTIMES PREMIUM</Text>
          <Text style={styles.premiumTitle}>{membership==="premium" ? "Premium access active" : "Make more of HealthTimes"}</Text>
          <Text style={styles.premiumText}>
            {membership==="premium"
              ? "View your membership status and available subscription options."
              : "See Premium stories and any membership options currently available to your account."}
          </Text>
        </View>
        <Text style={styles.premiumAction}>{membership==="premium" ? "View membership →" : "Explore Premium →"}</Text>
      </Pressable>

      {groups.map((group)=>(
        <Section key={group.title}>
          <SectionHeader title={group.title} />
          <View>
            {group.items.map((item)=>(
              <Pressable
                key={item.label}
                disabled={!item.path && !item.url}
                onPress={()=>{
                  if(item.path) return router.push(item.path as never);
                  if(item.url) return void Linking.openURL(item.url);
                }}
                style={[styles.row,{borderBottomColor:palette.border},!item.path&&!item.url&&styles.rowDisabled]}
                accessibilityRole={item.url ? "link" : item.path ? "button" : undefined}
                accessibilityState={!item.path&&!item.url ? {disabled:true} : undefined}
              >
                <Text style={[styles.rowText,{color:palette.ink}]}>{item.label}</Text>
                <View style={styles.rowEnd}>
                  {!!item.detail && <Text style={[styles.detail,{color:palette.inkMuted}]}>{item.detail}</Text>}
                  {!!item.path && <Text style={[styles.chevron,{color:palette.inkMuted}]}>›</Text>}
                  {!!item.url && <Text style={[styles.chevron,{color:palette.inkMuted}]}>↗</Text>}
                </View>
              </Pressable>
            ))}
          </View>
        </Section>
      ))}

      <Section>
        <SectionHeader title="Sign Out" />
        <Pressable
          accessibilityRole="button"
          style={[styles.signOut,{borderColor:palette.border}]}
          onPress={()=>void signOut()}
        >
          <Text style={[styles.signOutText,{color:palette.ink}]}>Sign out this device</Text>
        </Pressable>
        {!!signOutStatus && <Text accessibilityLiveRegion="polite" style={[styles.status,{color:palette.inkMuted}]}>{signOutStatus}</Text>}
      </Section>

      {staffAuthorized && (
        <Section>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open HealthTimes Studio staff workspace"
            style={[styles.studio,{backgroundColor:palette.navy,borderRadius:radius.md}]}
            onPress={()=>router.push("/studio" as never)}
          >
            <Text style={styles.studioTitle}>HealthTimes Studio</Text>
            <Text style={styles.studioText}>Open the staff workspace for this server-authorized HealthTimes account.</Text>
          </Pressable>
        </Section>
      )}
    </Page>
  );
}

const styles=StyleSheet.create({
  profile:{marginTop:spacing.xl,flexDirection:"row",alignItems:"center",gap:spacing.md,paddingBottom:spacing.xl,borderBottomWidth:1,flexWrap:"wrap"},
  avatar:{width:56,height:56,borderRadius:28,alignItems:"center",justifyContent:"center"},
  avatarText:{fontWeight:"900"},
  profileCopy:{flex:1,minWidth:180},
  name:{fontSize:20,fontWeight:"900"},
  membership:{fontSize:13,marginTop:2},
  premiumCard:{marginTop:spacing.xl,padding:spacing.xl,gap:spacing.lg,flexDirection:"row",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"},
  premiumCopy:{flex:1,minWidth:230,gap:6},
  premiumEyebrow:{fontSize:10,fontWeight:"900",letterSpacing:1.2,color:"#8ED7FF"},
  premiumTitle:{fontSize:22,fontWeight:"900",color:"#FFFFFF"},
  premiumText:{fontSize:14,lineHeight:21,color:"#C9D5E1",maxWidth:700},
  premiumAction:{fontSize:13,fontWeight:"900",color:"#FFFFFF"},
  row:{minHeight:58,borderBottomWidth:1,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:spacing.md},
  rowDisabled:{opacity:.65},
  rowText:{fontSize:16,fontWeight:"700",flex:1},
  rowEnd:{flexDirection:"row",alignItems:"center",gap:spacing.sm,maxWidth:"52%"},
  detail:{fontSize:11,textAlign:"right",lineHeight:16},
  chevron:{fontSize:24},
  signOut:{minHeight:layout.touchMin,alignSelf:"flex-start",justifyContent:"center",paddingHorizontal:16,borderWidth:1,borderRadius:radius.sm},
  signOutText:{fontWeight:"900"},
  status:{fontSize:13,lineHeight:20,marginTop:spacing.sm},
  studio:{padding:spacing.xl,gap:spacing.sm},
  studioTitle:{fontSize:20,fontWeight:"900",color:"#FFFFFF"},
  studioText:{fontSize:14,lineHeight:21,color:"#C9D5E1"}
});
