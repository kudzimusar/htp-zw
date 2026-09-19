import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { EmptyState, Page, Section, SectionHeader } from "../src/ui/Layout";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { event } from "../src/growth/events";
import { colors, radius, spacing } from "../src/theme/tokens";

export default function PremiumScreen(){
  const store=useAsync(()=>services.premiumStore.getState(),[]);
  const [status,setStatus]=useState("");

  const purchase=async(storeProductId:string,productKey:"monthly"|"yearly")=>{
    try{
      await services.analytics.track(event("subscription_started",{
        plan_key:productKey,
        source_path:"/premium"
      },{pagePath:"/premium"}));
      await services.premiumStore.startPurchase(storeProductId);
    }catch(error){
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const restore=async()=>{
    const result=await services.premiumStore.restorePurchases();
    setStatus(result.restored ? "Purchase restored. Entitlement verification is pending." : "No verified purchase was restored.");
  };

  return (
    <Page title="Go Premium">
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>HEALTHTIMES PREMIUM</Text>
        <Text style={styles.title}>Deeper health intelligence. Full reporting. One clear membership.</Text>
        <Text style={styles.text}>
          Native product IDs, localized prices and transaction receipts must come from approved App Store / Google Play configuration.
          HealthTimes does not hardcode or invent production prices.
        </Text>
      </View>

      <Section>
        <SectionHeader title="Choose your plan" />
        {store.data?.status==="available" && store.data.offers.length ? (
          <View style={styles.plans}>
            {store.data.offers.map((offer)=>(
              <View style={styles.plan} key={offer.storeProductId}>
                <Text style={styles.planTitle}>{offer.productKey==="monthly" ? "Monthly" : "Yearly"}</Text>
                <Text style={styles.price}>{offer.displayPrice}</Text>
                <Text style={styles.planText}>{offer.periodLabel}</Text>
                <Pressable
                  accessibilityRole="button"
                  style={styles.cta}
                  onPress={()=>void purchase(offer.storeProductId,offer.productKey)}
                >
                  <Text style={styles.ctaText}>Continue with store</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            title="Native storefront configuration required"
            message={store.data?.message ?? "Storefront state is loading. No plan or price is shown until the platform returns verified products."}
          />
        )}
      </Section>

      <Section>
        <SectionHeader title="Benefits" />
        {["Premium investigations and research","Article audio where available","Saved and offline reading","Followed countries and topics","Member-only briefings where published"].map((item)=><Text key={item} style={styles.benefit}>✓ {item}</Text>)}
        <Pressable accessibilityRole="button" style={styles.restore} onPress={()=>void restore()}>
          <Text style={styles.restoreText}>Restore purchases</Text>
        </Pressable>
        {!!status && <Text accessibilityLiveRegion="polite" style={styles.status}>{status}</Text>}
        <Text style={styles.signin}>Server entitlement remains authoritative and is completed in NM-06 / AG-06.</Text>
      </Section>
    </Page>
  );
}

const styles=StyleSheet.create({
  hero:{marginTop:spacing.xl,maxWidth:820,gap:spacing.md},
  eyebrow:{fontSize:11,fontWeight:"900",letterSpacing:1.2,color:colors.premium},
  title:{fontSize:34,lineHeight:40,fontWeight:"900",color:colors.ink,letterSpacing:-0.6},
  text:{fontSize:16,lineHeight:24,color:colors.inkMuted},
  plans:{flexDirection:"row",flexWrap:"wrap",gap:spacing.lg},
  plan:{flex:1,minWidth:250,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.xl,gap:spacing.sm},
  planTitle:{fontSize:22,fontWeight:"900",color:colors.ink},
  price:{fontSize:28,fontWeight:"900",color:colors.ink},
  planText:{fontSize:14,lineHeight:21,color:colors.inkMuted},
  benefit:{fontSize:15,lineHeight:28,color:colors.ink},
  cta:{marginTop:spacing.sm,alignSelf:"flex-start",minHeight:48,justifyContent:"center",paddingHorizontal:18,backgroundColor:colors.blue,borderRadius:radius.sm},
  ctaText:{color:"#FFFFFF",fontWeight:"900"},
  restore:{marginTop:spacing.lg,minHeight:44,justifyContent:"center",alignSelf:"flex-start",paddingHorizontal:12,borderWidth:1,borderColor:colors.border,borderRadius:radius.sm},
  restoreText:{fontWeight:"900",color:colors.ink},
  status:{marginTop:spacing.sm,fontSize:13,lineHeight:20,color:colors.inkMuted},
  signin:{marginTop:spacing.md,fontSize:13,color:colors.inkMuted}
});
