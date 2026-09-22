import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Page, Section, SectionHeader } from "../src/ui/Layout";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { layout, radius, spacing } from "../src/theme/tokens";
import { useAppearance } from "../src/theme/AppearanceProvider";

export default function DevicesSessionsScreen(){
  const { palette }=useAppearance();
  const [refresh,setRefresh]=useState(0);
  const session=useAsync(()=>services.deviceSecurity.getCurrentSession(),[refresh]);
  const [status,setStatus]=useState("");

  const signOut=async()=>{
    await services.auth.signOut();
    setStatus("Signed out on this device.");
    setRefresh((value)=>value+1);
  };

  const deletion=async()=>{
    const result=await services.auth.requestAccountDeletion();
    setStatus(result.message);
  };

  return (
    <Page title="Devices & Sessions">
      <Text style={[styles.lede,{color:palette.inkMuted}]}>This screen shows only authority the current services can prove. Remote session lists and revocation remain unavailable until AG-06 exposes audited endpoints.</Text>

      <Section>
        <SectionHeader title="Current device" eyebrow="SESSION" />
        <View style={[styles.card,{borderColor:palette.border,backgroundColor:palette.paper}]}>
          <View style={styles.fact}>
            <Text style={[styles.label,{color:palette.inkMuted}]}>Session</Text>
            <Text style={[styles.value,{color:palette.ink}]}>{session.data?.authenticated ? "Authenticated" : "Not signed in"}</Text>
          </View>
          <View style={styles.fact}>
            <Text style={[styles.label,{color:palette.inkMuted}]}>Expires</Text>
            <Text style={[styles.value,{color:palette.ink}]}>{session.data?.expiresAt ? new Date(session.data.expiresAt*1000).toLocaleString() : "No active session"}</Text>
          </View>
          <View style={styles.fact}>
            <Text style={[styles.label,{color:palette.inkMuted}]}>Remote management</Text>
            <Text style={[styles.value,{color:palette.ink}]}>{session.data?.remoteSessionManagementAvailable ? "Available" : "Not yet available"}</Text>
          </View>
          <Text style={[styles.note,{color:palette.inkMuted}]}>Current-device sign-out is real. Remote device/session listing and revocation are not simulated.</Text>
        </View>
        <Pressable accessibilityRole="button" style={[styles.button,{borderColor:palette.border}]} onPress={()=>void signOut()}>
          <Text style={[styles.buttonText,{color:palette.ink}]}>Sign out this device</Text>
        </Pressable>
      </Section>

      <Section>
        <SectionHeader title="Account deletion" eyebrow="SERVER ACTION" />
        <Text style={[styles.note,{color:palette.inkMuted}]}>Deleting an identity requires server-side removal, entitlement/subscriber reconciliation and an audit trail. The app cannot delete Supabase Auth users with a publishable key.</Text>
        <Pressable accessibilityRole="button" style={[styles.danger,{borderColor:palette.live}]} onPress={()=>void deletion()}>
          <Text style={[styles.dangerText,{color:palette.live}]}>Request deletion status</Text>
        </Pressable>
        {!!status && <Text accessibilityLiveRegion="polite" style={[styles.status,{color:palette.inkMuted}]}>{status}</Text>}
      </Section>
    </Page>
  );
}

const styles=StyleSheet.create({
  lede:{fontSize:15,lineHeight:23,maxWidth:760,marginTop:spacing.sm},
  card:{gap:spacing.md,maxWidth:720,borderWidth:1,borderRadius:radius.md,padding:spacing.lg},
  fact:{gap:3},
  label:{fontSize:10,fontWeight:"900",textTransform:"uppercase",letterSpacing:0.8},
  value:{fontSize:16,fontWeight:"800"},
  note:{fontSize:14,lineHeight:22,maxWidth:720},
  button:{marginTop:spacing.lg,minHeight:layout.touchMin,alignSelf:"flex-start",justifyContent:"center",paddingHorizontal:14,borderWidth:1,borderRadius:radius.sm},
  buttonText:{fontWeight:"900"},
  danger:{marginTop:spacing.lg,minHeight:layout.touchMin,alignSelf:"flex-start",justifyContent:"center",paddingHorizontal:14,borderWidth:1,borderRadius:radius.sm},
  dangerText:{fontWeight:"900"},
  status:{marginTop:spacing.sm,fontSize:13,lineHeight:20}
});
