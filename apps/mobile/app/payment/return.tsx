import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Page } from "../../src/ui/Layout";
import { useAppearance } from "../../src/theme/AppearanceProvider";
import { radius, spacing } from "../../src/theme/tokens";

type PaymentStatus={
  payment_verified?:boolean;
  internal_status?:string;
  provider_status?:string|null;
  purpose?:string;
};

const terminal=new Set(["PAYMENT_VERIFIED","RECONCILIATION_PENDING","RECONCILED","CANCELLED","FAILED","REFUNDED","DISPUTED"]);

export default function PaymentReturn(){
  const {palette}=useAppearance();
  const router=useRouter();
  const params=useLocalSearchParams<{reference?:string}>();
  const reference=typeof params.reference==="string" ? params.reference : "";
  const [status,setStatus]=useState<PaymentStatus|null>(null);
  const [message,setMessage]=useState("HealthTimes is confirming your payment with Paynow.");

  useEffect(()=>{
    if(!/^HT-(PREM|INV|CONN)-[0-9A-HJKMNP-TV-Z]{26}$/.test(reference)){
      setMessage("This payment return link is incomplete.");
      return;
    }
    let active=true;
    let timer:ReturnType<typeof setTimeout>|undefined;
    let attempts=0;
    const check=async()=>{
      attempts+=1;
      try{
        const response=await fetch(`/api/commerce?action=status&reference=${encodeURIComponent(reference)}`,{
          headers:{Accept:"application/json"},credentials:"include"
        });
        const next=await response.json() as PaymentStatus;
        if(!active) return;
        if(response.ok){
          setStatus(next);
          if(next.payment_verified===true){
            setMessage(next.purpose==="PROVIDER_CONNECTIVITY_TEST"
              ? "Provider test verified. No membership or accounting changes were made."
              : next.purpose==="PREMIUM_SUBSCRIPTION"
                ? "Payment verified. HealthTimes is completing membership reconciliation."
                : "Payment verified. HealthTimes is completing payment reconciliation.");
            return;
          }
          if(next.internal_status==="CANCELLED"){
            setMessage("The Paynow payment was cancelled. No Premium access was granted.");
            return;
          }
          if(next.internal_status==="FAILED"){
            setMessage("Paynow could not complete the payment. No Premium access was granted.");
            return;
          }
          if(terminal.has(next.internal_status || "")) return;
        }
      }catch{
        if(!active) return;
      }
      if(active && attempts<20) timer=setTimeout(check,3000);
      else if(active) setMessage("Payment verification is still pending. You may return later; access remains locked until verification completes.");
    };
    void check();
    return()=>{active=false;if(timer) clearTimeout(timer);};
  },[reference]);

  return <Page>
    <View style={[styles.card,{backgroundColor:palette.paper,borderColor:palette.border}]}>
      <Text style={[styles.eyebrow,{color:palette.blue}]}>PAYNOW PAYMENT STATUS</Text>
      <Text accessibilityRole="header" style={[styles.title,{color:palette.ink}]}>Payment confirmation</Text>
      <Text style={[styles.message,{color:palette.inkMuted}]}>{message}</Text>
      {status?.provider_status ? <Text style={[styles.provider,{color:palette.inkMuted}]}>Provider status: {status.provider_status}</Text> : null}
      <Pressable accessibilityRole="button" onPress={()=>router.replace("/premium" as never)} style={[styles.button,{backgroundColor:palette.blue}]}>
        <Text style={styles.buttonText}>Return to Premium</Text>
      </Pressable>
    </View>
  </Page>;
}

const styles=StyleSheet.create({
  card:{maxWidth:640,width:"100%",alignSelf:"center",borderWidth:1,borderRadius:radius.lg,padding:spacing.xl,marginTop:spacing.xl},
  eyebrow:{fontSize:12,fontWeight:"800",letterSpacing:1.1,marginBottom:spacing.sm},
  title:{fontSize:30,fontWeight:"800",marginBottom:spacing.md},
  message:{fontSize:17,lineHeight:26},
  provider:{fontSize:14,marginTop:spacing.md},
  button:{alignSelf:"flex-start",borderRadius:radius.md,paddingHorizontal:spacing.lg,paddingVertical:spacing.md,marginTop:spacing.xl},
  buttonText:{color:"#fff",fontWeight:"800",fontSize:15}
});
