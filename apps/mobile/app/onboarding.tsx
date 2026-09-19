import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Chip, Page } from "../src/ui/Layout";
import { colors, radius, spacing } from "../src/theme/tokens";

const steps=[
  {title:"Welcome to HealthTimes",text:"Global health journalism with strong African reporting, Live coverage, Watch, Listen and Premium intelligence."},
  {title:"Select your edition",text:"Choose a primary edition without losing access to global reporting."},
  {title:"Choose interests",text:"Follow topics and countries while editorial curation remains authoritative."},
  {title:"Notifications",text:"Control breaking, Live, topic and Premium alerts. Device registration arrives with NM-06."}
];

export default function OnboardingScreen(){
  const router=useRouter();
  const [step,setStep]=useState(0);
  const current=steps[step]!;
  return (
    <Page>
      <View style={styles.wrap}>
        <Text style={styles.brand}>HealthTimes</Text>
        <Text style={styles.counter}>{step+1} / {steps.length}</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.text}>{current.text}</Text>

        {step===1 && <View style={styles.chips}><Chip active>Global</Chip><Chip>Africa</Chip><Chip>Zimbabwe</Chip></View>}
        {step===2 && <View style={styles.chips}><Chip active>Public Health</Chip><Chip>Research</Chip><Chip>Health Systems</Chip><Chip>Policy</Chip></View>}
        {step===3 && <View style={styles.chips}><Chip active>Breaking</Chip><Chip active>Live</Chip><Chip>Premium</Chip></View>}

        <Pressable style={styles.cta} onPress={()=>step<steps.length-1?setStep(step+1):router.replace("/" as never)}>
          <Text style={styles.ctaText}>{step<steps.length-1?"Continue":"Open HealthTimes"}</Text>
        </Pressable>
        {step===0 && <Pressable onPress={()=>router.replace("/" as never)}><Text style={styles.signin}>Existing account? Continue to development Home</Text></Pressable>}
      </View>
    </Page>
  );
}
const styles=StyleSheet.create({
  wrap:{paddingVertical:64,maxWidth:620,alignSelf:"center",width:"100%",gap:spacing.lg},
  brand:{fontSize:24,fontWeight:"900",color:colors.ink},
  counter:{fontSize:12,fontWeight:"800",color:colors.blue},
  title:{fontSize:36,lineHeight:42,fontWeight:"900",color:colors.ink,letterSpacing:-0.7},
  text:{fontSize:17,lineHeight:26,color:colors.inkMuted},
  chips:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  cta:{minHeight:52,alignSelf:"flex-start",justifyContent:"center",paddingHorizontal:20,backgroundColor:colors.blue,borderRadius:radius.sm},
  ctaText:{color:"#FFFFFF",fontWeight:"900"},
  signin:{color:colors.inkMuted,fontWeight:"700"}
});
