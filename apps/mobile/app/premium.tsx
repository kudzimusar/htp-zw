import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { EmptyState, Page, Section, SectionHeader } from "../src/ui/Layout";
import { StoryGrid } from "../src/ui/Cards";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { event } from "../src/growth/events";
import { colors, radius, spacing } from "../src/theme/tokens";
import { useAppearance } from "../src/theme/AppearanceProvider";

export default function PremiumScreen(){
  const router=useRouter();
  const { palette }=useAppearance();
  const store=useAsync(()=>services.premiumStore.getState(),[]);
  const sourceStories=useAsync(()=>services.articles.getHome(),[]);
  const entitlement=useAsync(()=>services.premium.hasEntitlement(),[]);
  const premiumStories=(sourceStories.data ?? []).filter((story)=>story.accessPolicy==="premium");
  const [status,setStatus]=useState("");
  const previewTracked=useRef(false);

  useEffect(()=>{
    if(previewTracked.current) return;
    previewTracked.current=true;
    void services.analytics.track(event("premium_preview_started",{
      surface:"premium_landing"
    },{pagePath:"/premium"}));
  },[]);

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
    setStatus(result.restored ? "Purchase restored. Server entitlement verification is pending." : "No verified purchase was restored.");
  };

  return (
    <Page title="Go Premium">
      <View style={[styles.hero,{borderBottomColor:palette.border}]}>
        <Text style={styles.eyebrow}>HEALTHTIMES PREMIUM</Text>
        <Text style={[styles.title,{color:palette.ink}]}>Deeper health intelligence. Full reporting. One clear membership.</Text>
        <Text style={[styles.text,{color:palette.inkMuted}]}>Join HealthTimes Premium for deeper reporting and member access. Membership options appear here only when they are available for your device and region.</Text>
      </View>

      <Section>
        <SectionHeader title="Premium access" eyebrow="MEMBER STATUS" />
        <View style={[styles.accessState,{borderColor:palette.border,backgroundColor:palette.paper}]}>
          <Text style={[styles.accessTitle,{color:palette.ink}]}>
            {entitlement.data===true ? "Premium entitlement verified" : "Premium entitlement is checked securely"}
          </Text>
          <Text style={[styles.accessText,{color:palette.inkMuted}]}>
            {entitlement.data===true
              ? "Your account has a verified Premium entitlement. Protected stories are requested only through the Premium service."
              : "Sign in to check existing member access. New membership options will appear here when they are available."}
          </Text>
          {entitlement.data!==true && (
            <Pressable accessibilityRole="button" style={[styles.restore,{borderColor:palette.border}]} onPress={()=>router.push("/account-access" as never)}>
              <Text style={[styles.restoreText,{color:palette.ink}]}>Check member access</Text>
            </Pressable>
          )}
        </View>
      </Section>

      <Section>
        <SectionHeader title="From HealthTimes Premium" eyebrow="MEMBER REPORTING" />
        {premiumStories.length
          ? <StoryGrid stories={premiumStories} />
          : <EmptyState title="No Premium stories available" message="Premium reporting will appear here when published." />}
      </Section>

      <Section>
        <SectionHeader title="Choose your plan" eyebrow="MEMBERSHIP OPTIONS" />
        {store.data?.status==="available" && store.data.offers.length ? (
          <View style={styles.plans}>
            {store.data.offers.map((offer)=>(
              <View style={[styles.plan,{borderColor:offer.productKey==="yearly"?palette.blue:palette.border,backgroundColor:palette.paper}]} key={offer.storeProductId}>
                {offer.productKey==="yearly" && <Text style={[styles.recommended,{color:palette.blue}]}>MOST POPULAR</Text>}
                <Text style={[styles.planTitle,{color:palette.ink}]}>{offer.productKey==="monthly" ? "Monthly" : "Yearly"}</Text>
                <Text style={[styles.price,{color:palette.ink}]}>{offer.displayPrice}</Text>
                <Text style={[styles.planText,{color:palette.inkMuted}]}>{offer.periodLabel}</Text>
                <Pressable accessibilityRole="button" style={[styles.cta,{backgroundColor:palette.blue}]} onPress={()=>void purchase(offer.storeProductId,offer.productKey)}>
                  <Text style={[styles.ctaText,{color:palette.paper}]}>Continue with store</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            title="Membership options are not available yet"
            message="HealthTimes will show membership options here when they are available. Existing members can sign in or restore a previous purchase."
          />
        )}
      </Section>

      <Section>
        <SectionHeader title="Benefits" />
        {["Premium investigations and research","Article audio where available","Saved and offline reading","Followed countries and topics","Member-only briefings where published"].map((item)=><Text key={item} style={[styles.benefit,{color:palette.ink}]}>✓ {item}</Text>)}
        <View style={styles.memberActions}>
          <Pressable accessibilityRole="button" style={[styles.restore,{borderColor:palette.border}]} onPress={()=>void restore()}>
            <Text style={[styles.restoreText,{color:palette.ink}]}>Restore purchases</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={[styles.restore,{borderColor:palette.border}]} onPress={()=>router.push("/account-access" as never)}>
            <Text style={[styles.restoreText,{color:palette.ink}]}>Sign in as existing member</Text>
          </Pressable>
        </View>
        {!!status && <Text accessibilityLiveRegion="polite" style={[styles.status,{color:palette.inkMuted}]}>{status}</Text>}
        <Text style={[styles.signin,{color:palette.inkMuted}]}>Already a member? Sign in to restore your HealthTimes Premium access.</Text>
      </Section>
    </Page>
  );
}

const styles=StyleSheet.create({
  hero:{marginTop:spacing.xl,maxWidth:820,gap:spacing.md,paddingBottom:spacing.xl,borderBottomWidth:1},
  eyebrow:{fontSize:11,fontWeight:"900",letterSpacing:1.2,color:colors.premium},
  title:{fontSize:34,lineHeight:40,fontWeight:"900",letterSpacing:-0.6},
  text:{fontSize:16,lineHeight:24},
  plans:{flexDirection:"row",flexWrap:"wrap",gap:spacing.lg},
  plan:{flex:1,minWidth:250,borderWidth:1,borderRadius:radius.md,padding:spacing.xl,gap:spacing.sm},
  recommended:{fontSize:10,fontWeight:"900",letterSpacing:1.1},
  planTitle:{fontSize:22,fontWeight:"900"},
  price:{fontSize:28,fontWeight:"900"},
  planText:{fontSize:14,lineHeight:21},
  benefit:{fontSize:15,lineHeight:28},
  cta:{marginTop:spacing.sm,alignSelf:"flex-start",minHeight:48,justifyContent:"center",paddingHorizontal:18,borderRadius:radius.sm},
  ctaText:{fontWeight:"900"},
  accessState:{borderWidth:1,borderRadius:radius.md,padding:spacing.lg,gap:spacing.sm},
  accessTitle:{fontSize:18,fontWeight:"900"},
  accessText:{fontSize:14,lineHeight:22},
  memberActions:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,marginTop:spacing.lg},
  restore:{minHeight:44,justifyContent:"center",alignSelf:"flex-start",paddingHorizontal:12,borderWidth:1,borderRadius:radius.sm},
  restoreText:{fontWeight:"900"},
  status:{marginTop:spacing.sm,fontSize:13,lineHeight:20},
  signin:{marginTop:spacing.md,fontSize:13,lineHeight:20}
});
