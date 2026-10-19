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

  const groups:{title:string;eyebrow:string;items:MenuItem[]}[]=[
    {title:"Account",eyebrow:"PROFILE & EDITION",items:[
      {label:"My Profile",path:"/account-access",detail:"Account access and sign-in"},
      {label:"Countries & Interests",path:"/edition",detail:"Primary edition and followed topics"}
    ]},
    {title:"Reading",eyebrow:"LIBRARY & ALERTS",items:[
      {label:"Saved",path:"/saved?tab=saved",detail:"Bookmarked stories"},
      {label:"Downloads",path:"/saved?tab=offline",detail:"Stories stored for offline reading"},
      {label:"Reading History",path:"/saved?tab=history",detail:"Recently read stories"},
      {label:"Notifications",path:"/notifications",detail:"Breaking and followed alerts"}
    ]},
    {title:"Membership",eyebrow:"HEALTHTIMES PREMIUM",items:[
      {label:"My Subscriptions",path:"/premium",detail:paymentAvailable ? "Membership status and available payment options" : "Membership status"}
    ]},
    {title:"Settings",eyebrow:"PREFERENCES & SECURITY",items:[
      {label:"Notification Settings",path:"/notification-settings",detail:"Alert categories"},
      {label:"Appearance / Theme",path:"/appearance",detail:"System, Light or Dark"},
      {label:"Devices & Sessions",path:"/devices-sessions",detail:"Current device session"},
      {label:"Account deletion status",path:"/devices-sessions",detail:"Server-managed availability"}
    ]},
    {title:"Help",eyebrow:"SUPPORT & EDITORIAL TRUST",items:[
      publication.data?.contactUrl
        ? {label:"Help & Support",url:publication.data.contactUrl,detail:"Reader support"}
        : {label:"Help & Support",detail:"Support contact is not available here yet"},
      {label:"About HealthTimes",path:"/about",detail:"Editorial standards, corrections and contact"}
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
      <View
        testID="my-ht-identity-card"
        style={[
          styles.profileCard,
          {borderColor:palette.border,backgroundColor:palette.paper}
        ]}
      >
        <View style={[styles.avatar,{backgroundColor:palette.navy}]}>
          <Text style={styles.avatarText}>HT</Text>
        </View>
        <View style={styles.profileCopy}>
          <View style={styles.identityHeaderRow}>
            <Text style={[styles.name,{color:palette.ink}]}>{profile.data?.displayName ?? "Reader"}</Text>
            <View
              style={[
                styles.membershipBadge,
                {
                  borderColor:membership==="premium" ? palette.premium : palette.border,
                  backgroundColor:palette.paperMuted
                }
              ]}
            >
              <Text
                style={[
                  styles.membershipBadgeText,
                  {color:membership==="premium" ? palette.premium : palette.inkMuted}
                ]}
              >
                {membershipLabel}
              </Text>
            </View>
          </View>
          <Text style={[styles.membershipSubtext,{color:palette.inkMuted}]}>
            {membership==="premium"
              ? "Active HealthTimes Premium member access across your reading library."
              : "Manage your edition preferences, personal reading library, and account settings."}
          </Text>
        </View>
      </View>

      <Pressable
        testID="my-ht-premium-card"
        style={({ pressed, focused }: any)=>[
          styles.premiumCard,
          {
            backgroundColor:palette.navy,
            borderColor:palette.premium,
            borderRadius:radius.md
          },
          focused && [styles.actionFocused,{borderColor:palette.blue}],
          pressed && styles.actionPressed
        ]}
        onPress={()=>router.push("/premium" as never)}
        accessibilityRole="button"
        accessibilityLabel={membership==="premium" ? "View HealthTimes Premium membership" : "Explore HealthTimes Premium"}
      >
        <View style={styles.premiumCopy}>
          <View style={styles.premiumIdentityRow}>
            <Text style={styles.premiumCrown}>✦</Text>
            <Text style={styles.premiumEyebrow}>HEALTHTIMES PREMIUM</Text>
          </View>
          <Text style={styles.premiumTitle}>{membership==="premium" ? "Premium access active" : "Make more of HealthTimes"}</Text>
          <Text style={styles.premiumText}>
            {membership==="premium"
              ? "View your membership status and available subscription options."
              : "See Premium stories and any membership options currently available to your account."}
          </Text>
        </View>
        <View style={styles.premiumActionPill}>
          <Text style={styles.premiumAction}>{membership==="premium" ? "View membership →" : "Explore Premium →"}</Text>
        </View>
      </Pressable>

      {groups.map((group)=>(
        <Section key={group.title}>
          <SectionHeader title={group.title} eyebrow={group.eyebrow} />
          <View style={[styles.groupCard,{borderColor:palette.border,backgroundColor:palette.paper}]}>
            {group.items.map((item,index)=>(
              <Pressable
                key={item.label}
                disabled={!item.path && !item.url}
                onPress={()=>{
                  if(item.path) return router.push(item.path as never);
                  if(item.url) return void Linking.openURL(item.url);
                }}
                style={({ pressed, focused }: any)=>[
                  styles.row,
                  index<group.items.length-1 && {borderBottomWidth:1,borderBottomColor:palette.border},
                  !item.path&&!item.url&&styles.rowDisabled,
                  focused && [styles.actionFocused,{borderColor:palette.blue}],
                  pressed && (item.path || item.url) && styles.actionPressed
                ]}
                accessibilityRole={item.url ? "link" : "button"}
                accessibilityLabel={item.detail ? item.label+". "+item.detail : item.label}
                accessibilityState={{disabled:!item.path&&!item.url}}
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
        <SectionHeader title="Sign Out" eyebrow="DEVICE SESSION" />
        <View style={[styles.signOutCard,{borderColor:palette.border,backgroundColor:palette.paperMuted}]}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed, focused }: any)=>[
              styles.signOut,
              {borderColor:palette.border,backgroundColor:palette.paper},
              focused && [styles.actionFocused,{borderColor:palette.blue}],
              pressed && styles.actionPressed
            ]}
            onPress={()=>void signOut()}
          >
            <Text style={[styles.signOutText,{color:palette.ink}]}>Sign out this device</Text>
          </Pressable>
          {!!signOutStatus && <Text accessibilityLiveRegion="polite" style={[styles.status,{color:palette.inkMuted}]}>{signOutStatus}</Text>}
        </View>
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
  profileCard:{
    marginTop:spacing.md,
    borderWidth:1,
    borderRadius:radius.md,
    padding:spacing.lg,
    flexDirection:"row",
    alignItems:"center",
    gap:spacing.md,
    flexWrap:"wrap"
  },
  avatar:{width:52,height:52,borderRadius:26,alignItems:"center",justifyContent:"center"},
  avatarText:{fontWeight:"900",color:"#FFFFFF",fontSize:16},
  profileCopy:{flex:1,minWidth:180,gap:4},
  identityHeaderRow:{
    flexDirection:"row",
    alignItems:"center",
    flexWrap:"wrap",
    gap:spacing.sm
  },
  name:{fontSize:20,fontWeight:"900"},
  membershipBadge:{
    borderWidth:1,
    borderRadius:radius.sm,
    paddingHorizontal:8,
    paddingVertical:2
  },
  membershipBadgeText:{
    fontSize:11,
    fontWeight:"800",
    letterSpacing:0.4
  },
  membershipSubtext:{
    fontSize:13,
    lineHeight:19
  },
  premiumCard:{
    marginTop:spacing.lg,
    padding:spacing.lg,
    borderWidth:1,
    borderLeftWidth:3,
    gap:spacing.md,
    flexDirection:"row",
    alignItems:"center",
    justifyContent:"space-between",
    flexWrap:"wrap"
  },
  premiumCopy:{flex:1,minWidth:220,gap:4},
  premiumIdentityRow:{flexDirection:"row",alignItems:"center",gap:6},
  premiumCrown:{fontSize:13,fontWeight:"900",color:"#E6C16A"},
  premiumEyebrow:{fontSize:10,fontWeight:"900",letterSpacing:1.2,color:"#E6C16A"},
  premiumTitle:{fontSize:20,fontWeight:"900",color:"#FFFFFF"},
  premiumText:{fontSize:13,lineHeight:20,color:"#C9D5E1",maxWidth:680},
  premiumActionPill:{
    borderWidth:1,
    borderColor:"#E6C16A",
    borderRadius:radius.sm,
    paddingHorizontal:12,
    paddingVertical:8
  },
  premiumAction:{fontSize:13,fontWeight:"900",color:"#FFFFFF"},
  groupCard:{
    borderWidth:1,
    borderRadius:radius.md,
    overflow:"hidden"
  },
  row:{
    minHeight:56,
    paddingHorizontal:spacing.md,
    paddingVertical:spacing.sm,
    flexDirection:"row",
    alignItems:"center",
    justifyContent:"space-between",
    gap:spacing.md,
    flexWrap:"wrap"
  },
  rowDisabled:{opacity:.65},
  rowText:{fontSize:15,fontWeight:"800",flex:1},
  rowEnd:{flexDirection:"row",alignItems:"center",gap:spacing.sm,maxWidth:"52%",minWidth:0,flexShrink:1},
  detail:{fontSize:12,textAlign:"right",lineHeight:16,flexShrink:1},
  chevron:{fontSize:20,fontWeight:"700"},
  signOutCard:{
    borderWidth:1,
    borderRadius:radius.md,
    padding:spacing.md,
    gap:spacing.sm
  },
  signOut:{
    minHeight:layout.touchMin,
    alignSelf:"flex-start",
    justifyContent:"center",
    paddingHorizontal:16,
    borderWidth:1,
    borderRadius:radius.sm
  },
  signOutText:{fontWeight:"900",fontSize:14},
  status:{fontSize:13,lineHeight:20},
  studio:{padding:spacing.lg,gap:spacing.xs},
  studioTitle:{fontSize:18,fontWeight:"900",color:"#FFFFFF"},
  studioText:{fontSize:13,lineHeight:20,color:"#C9D5E1"},
  actionFocused:{borderWidth:2},
  actionPressed:{opacity:0.86}
});
