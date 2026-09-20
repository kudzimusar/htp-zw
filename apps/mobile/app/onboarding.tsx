import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Chip, Page } from "../src/ui/Layout";
import { radius, spacing } from "../src/theme/tokens";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { useAppearance } from "../src/theme/AppearanceProvider";
import type { NotificationPreferences } from "../src/security/notification-preferences";

const steps=[
  {title:"Welcome to HealthTimes",text:"Global health journalism, Live coverage, Watch, Listen and Premium intelligence in one trusted Reader."},
  {title:"Select your edition",text:"Choose the edition that leads your Home feed without losing access to global reporting."},
  {title:"Choose interests",text:"Follow health desks and topics while editorial curation remains authoritative."},
  {title:"Notifications",text:"Choose the alerts you want. Native delivery still requires server-issued registration authority."}
];

export default function OnboardingScreen(){
  const router=useRouter();
  const { palette }=useAppearance();
  const taxonomy=useAsync(()=>services.taxonomy.getSnapshot(),[]);
  const storedPreferences=useAsync(()=>services.reader.getPreferences(),[]);
  const storedNotifications=useAsync(()=>services.deviceSecurity.getNotificationPreferences(),[]);
  const [initialized,setInitialized]=useState(false);
  const [step,setStep]=useState(0);
  const [edition,setEdition]=useState("Global");
  const [topics,setTopics]=useState<string[]>([]);
  const [notifications,setNotifications]=useState<NotificationPreferences>({
    breaking:true,live:true,followedTopics:true,premium:true,system:true
  });
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    if(initialized || !storedPreferences.data || !storedNotifications.data) return;
    setEdition(storedPreferences.data.primaryEdition || "Global");
    setTopics(storedPreferences.data.followedTopics);
    setNotifications(storedNotifications.data);
    setInitialized(true);
  },[initialized,storedPreferences.data,storedNotifications.data]);

  const current=steps[step]!;
  const editions=useMemo(()=>(taxonomy.data?.geographicZones ?? [])
    .filter((zone)=>zone.level==="global" || zone.level==="continent" || zone.level==="region" || zone.level==="country")
    .map((zone)=>zone.name),[taxonomy.data]);
  const interests=useMemo(()=>{
    const snapshot=taxonomy.data;
    if(!snapshot) return [];
    return snapshot.topics.length ? snapshot.topics.map((item)=>item.name) : snapshot.editorialDesks.map((item)=>item.name);
  },[taxonomy.data]);

  const toggleTopic=(value:string)=>setTopics((currentTopics)=>currentTopics.includes(value)?currentTopics.filter((item)=>item!==value):[...currentTopics,value]);
  const toggleNotification=(key:keyof NotificationPreferences)=>setNotifications((currentNotifications)=>({...currentNotifications,[key]:!currentNotifications[key]}));

  const finish=async()=>{
    setSaving(true);
    try{
      await Promise.all([
        services.reader.savePreferences({
          primaryEdition:edition,
          followedCountries:storedPreferences.data?.followedCountries ?? [],
          followedTopics:topics
        }),
        services.deviceSecurity.saveNotificationPreferences(notifications)
      ]);
      router.replace("/" as never);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <View style={styles.wrap}>
        <View style={[styles.brandPanel,{backgroundColor:palette.navy}]}>
          <Text style={styles.brand}>HealthTimes</Text>
          <Text style={styles.brandTag}>GLOBAL HEALTH JOURNALISM</Text>
        </View>
        <Text style={[styles.counter,{color:palette.blue}]}>{step+1} / {steps.length}</Text>
        <Text style={[styles.title,{color:palette.ink}]}>{current.title}</Text>
        <Text style={[styles.text,{color:palette.inkMuted}]}>{current.text}</Text>

        {step===1 && <View style={styles.chips}>{editions.slice(0,12).map((item)=><Chip key={item} active={edition===item} onPress={()=>setEdition(item)}>{item}</Chip>)}</View>}
        {step===2 && <View style={styles.chips}>{interests.slice(0,12).map((item)=><Chip key={item} active={topics.includes(item)} onPress={()=>toggleTopic(item)}>{item}</Chip>)}</View>}
        {step===3 && (
          <View style={styles.chips}>
            <Chip active={notifications.breaking} onPress={()=>toggleNotification("breaking")}>Breaking</Chip>
            <Chip active={notifications.live} onPress={()=>toggleNotification("live")}>Live</Chip>
            <Chip active={notifications.followedTopics} onPress={()=>toggleNotification("followedTopics")}>Followed topics</Chip>
            <Chip active={notifications.premium} onPress={()=>toggleNotification("premium")}>Premium</Chip>
          </View>
        )}

        <Pressable
          style={[styles.cta,{backgroundColor:palette.blue}]}
          disabled={saving}
          onPress={()=>step<steps.length-1?setStep(step+1):void finish()}
        >
          <Text style={[styles.ctaText,{color:palette.paper}]}>{saving?"Saving…":step<steps.length-1?"Continue":"Open HealthTimes"}</Text>
        </Pressable>
        {step===0 && <Pressable style={styles.secondary} onPress={()=>router.push("/account-access" as never)}><Text style={[styles.signin,{color:palette.inkMuted}]}>Existing account? Sign in</Text></Pressable>}
      </View>
    </Page>
  );
}
const styles=StyleSheet.create({
  wrap:{paddingVertical:56,maxWidth:680,alignSelf:"center",width:"100%",gap:spacing.lg},
  brandPanel:{padding:spacing.xl,borderRadius:radius.md,gap:4},
  brand:{fontSize:28,fontWeight:"900",color:"#FFFFFF",letterSpacing:-0.7},
  brandTag:{fontSize:10,fontWeight:"900",letterSpacing:1.2,color:"#9DC7F5"},
  counter:{fontSize:12,fontWeight:"800"},
  title:{fontSize:36,lineHeight:42,fontWeight:"900",letterSpacing:-0.7},
  text:{fontSize:17,lineHeight:26},
  chips:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  cta:{minHeight:52,alignSelf:"flex-start",justifyContent:"center",paddingHorizontal:20,borderRadius:radius.sm},
  ctaText:{fontWeight:"900"},
  secondary:{minHeight:44,justifyContent:"center",alignSelf:"flex-start"},
  signin:{fontWeight:"700"}
});
