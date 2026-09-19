import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Page, Section, SectionHeader } from "../src/ui/Layout";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { colors, layout, spacing } from "../src/theme/tokens";

export default function DevicesSessionsScreen(){
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
      <Section>
        <SectionHeader title="Current device" />
        <View style={styles.card}>
          <Text style={styles.label}>Session</Text>
          <Text style={styles.value}>{session.data?.authenticated ? "Authenticated" : "Not signed in"}</Text>
          <Text style={styles.label}>Expires</Text>
          <Text style={styles.value}>
            {session.data?.expiresAt ? new Date(session.data.expiresAt*1000).toLocaleString() : "No active session"}
          </Text>
          <Text style={styles.note}>
            Remote device/session listing and revocation are not available until AG-06 exposes audited server endpoints.
          </Text>
        </View>
        <Pressable accessibilityRole="button" style={styles.button} onPress={()=>void signOut()}>
          <Text style={styles.buttonText}>Sign out this device</Text>
        </Pressable>
      </Section>

      <Section>
        <SectionHeader title="Account deletion" />
        <Text style={styles.note}>
          Deleting an identity requires server-side removal, entitlement/subscriber reconciliation and an audit trail. The app cannot delete Supabase Auth users with a publishable key.
        </Text>
        <Pressable accessibilityRole="button" style={styles.danger} onPress={()=>void deletion()}>
          <Text style={styles.dangerText}>Request deletion status</Text>
        </Pressable>
        {!!status && <Text accessibilityLiveRegion="polite" style={styles.status}>{status}</Text>}
      </Section>
    </Page>
  );
}

const styles=StyleSheet.create({
  card:{gap:spacing.xs,maxWidth:680},
  label:{marginTop:spacing.sm,fontSize:11,fontWeight:"900",textTransform:"uppercase",color:colors.inkMuted},
  value:{fontSize:16,fontWeight:"800",color:colors.ink},
  note:{fontSize:14,lineHeight:22,color:colors.inkMuted,maxWidth:720},
  button:{marginTop:spacing.lg,minHeight:layout.touchMin,alignSelf:"flex-start",justifyContent:"center",paddingHorizontal:14,borderWidth:1,borderColor:colors.border},
  buttonText:{fontWeight:"900",color:colors.ink},
  danger:{marginTop:spacing.lg,minHeight:layout.touchMin,alignSelf:"flex-start",justifyContent:"center",paddingHorizontal:14,borderWidth:1,borderColor:colors.live},
  dangerText:{fontWeight:"900",color:colors.live},
  status:{marginTop:spacing.sm,fontSize:13,lineHeight:20,color:colors.inkMuted}
});
