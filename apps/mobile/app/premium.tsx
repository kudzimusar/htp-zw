import { useEffect, useRef, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { EmptyState, LoadingBlock, Page, Section, SectionHeader } from "../src/ui/Layout";
import { StoryGrid } from "../src/ui/Cards";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { event } from "../src/growth/events";
import { layout, radius, spacing } from "../src/theme/tokens";
import { useAppearance } from "../src/theme/AppearanceProvider";

export default function PremiumScreen(){
  const router=useRouter();
  const { palette }=useAppearance();
  const store=useAsync(()=>services.premiumStore.getState(),[]);
  const commerce=useAsync(()=>services.premiumCommerce.getAuthority(),[]);
  const sourceStories=useAsync(()=>services.articles.getHome(),[]);
  const entitlement=useAsync(()=>services.premium.hasEntitlement(),[]);
  const premiumStories=(sourceStories.data ?? []).filter((story)=>story.accessPolicy==="premium");
  const webCommerce=Platform.OS==="web";
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
    setStatus("");
    try{
      await services.analytics.track(event("subscription_started",{
        plan_key:productKey,
        source_path:"/premium"
      },{pagePath:"/premium"}));
      await services.premiumStore.startPurchase(storeProductId);
    }catch{
      setStatus("We couldn't start checkout. Please try again when membership purchases are available.");
    }
  };

  const startWebCheckout=async()=>{
    setStatus("");
    try{
      await services.analytics.track(event("subscription_started",{
        source_path:"/premium",
        commerce_channel:"web-server"
      },{pagePath:"/premium"}));
      const result=await services.premiumCommerce.startCheckout({
        productPlanId:commerce.data?.productPlanId ?? null
      });
      setStatus(result.message);
      if(result.status==="redirect-required" && result.checkoutUrl){
        await Linking.openURL(result.checkoutUrl);
      }
    }catch{
      setStatus("Premium checkout is unavailable. No membership access has been granted.");
    }
  };

  const restore=async()=>{
    setStatus("");
    try{
      const result=await services.premiumStore.restorePurchases();
      setStatus(result.restored ? "Purchase restored. HealthTimes is confirming member access." : "No previous purchase was restored.");
    }catch{
      setStatus("We couldn't restore purchases right now. Please try again later.");
    }
  };

  return (
    <Page>
      <View style={[styles.hero,{borderBottomColor:palette.border}]}>
        <View style={styles.identityRow}>
          <Text style={[styles.crown,{color:palette.premium}]}>✦</Text>
          <Text style={[styles.eyebrow,{color:palette.premium}]}>HEALTHTIMES PREMIUM</Text>
        </View>
        <Text style={[styles.title,{color:palette.ink}]}>Deeper reporting for readers who want the full health story.</Text>
        <Text style={[styles.text,{color:palette.inkMuted}]}>HealthTimes Premium brings member journalism together with reader features available to you. Membership options will appear here when purchasing is available.</Text>
      </View>

      <Section>
        <SectionHeader title="Your membership" eyebrow="MEMBER ACCESS" />
        <View style={[styles.accessState,{borderColor:palette.border,backgroundColor:palette.paper}]}>
          <Text style={[styles.accessTitle,{color:palette.ink}]}>
            {entitlement.loading
              ? "Checking member access…"
              : entitlement.data===true
                ? "Premium member access is active"
                : "Already a member?"}
          </Text>
          <Text style={[styles.accessText,{color:palette.inkMuted}]}>
            {entitlement.loading
              ? "HealthTimes is checking the membership connected to this account."
              : entitlement.data===true
                ? "Your Premium access is active."
                : webCommerce
                  ? "Sign in to check your existing membership."
                  : "Sign in to check your existing membership, or restore a previous store purchase."}
          </Text>
          {entitlement.data!==true && !entitlement.loading && (
            <Pressable accessibilityRole="button" style={[styles.secondaryAction,{borderColor:palette.border}]} onPress={()=>router.push("/account-access" as never)}>
              <Text style={[styles.secondaryActionText,{color:palette.ink}]}>Sign in as existing member</Text>
            </Pressable>
          )}
        </View>
      </Section>

      <Section>
        <SectionHeader title="Membership options" eyebrow="GO PREMIUM" />
        {webCommerce ? (
          commerce.loading ? (
            <LoadingBlock label="Checking membership options…" />
          ) : commerce.data?.status==="available" && commerce.data.price && commerce.data.currency ? (
            <View style={styles.plans} accessibilityLabel="Available HealthTimes Premium web membership">
              <View style={[styles.plan,{borderColor:palette.border,backgroundColor:palette.paper}]}>
                <Text style={[styles.planTitle,{color:palette.ink}]}>Premium membership</Text>
                <Text style={[styles.price,{color:palette.ink}]}>{commerce.data.price+" "+commerce.data.currency}</Text>
                {!!commerce.data.billingInterval && <Text style={[styles.planText,{color:palette.inkMuted}]}>{commerce.data.billingInterval}</Text>}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue to Premium checkout"
                  style={[styles.cta,{backgroundColor:palette.blue}]}
                  onPress={()=>void startWebCheckout()}
                >
                  <Text style={[styles.ctaText,{color:palette.paper}]}>Become Premium</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={[styles.unavailable,{borderColor:palette.border,backgroundColor:palette.paperMuted}]}>
              <Text style={[styles.unavailableTitle,{color:palette.ink}]}>Membership options aren't available here yet</Text>
              <Text style={[styles.unavailableText,{color:palette.inkMuted}]}>Existing members can still sign in. Available membership options will appear here when secure web checkout is configured.</Text>
              <View style={styles.unavailableActions}>
                <Pressable accessibilityRole="button" style={[styles.secondaryAction,{borderColor:palette.border}]} onPress={()=>router.push("/account-access" as never)}>
                  <Text style={[styles.secondaryActionText,{color:palette.ink}]}>Member sign in</Text>
                </Pressable>
              </View>
            </View>
          )
        ) : store.loading ? (
          <LoadingBlock label="Checking membership options…" />
        ) : store.data?.status==="available" && store.data.offers.length ? (
          <View style={styles.plans} accessibilityLabel="Available HealthTimes Premium plans">
            {store.data.offers.map((offer)=>(
              <View style={[styles.plan,{borderColor:palette.border,backgroundColor:palette.paper}]} key={offer.storeProductId}>
                <Text style={[styles.planTitle,{color:palette.ink}]}>{offer.productKey==="monthly" ? "Monthly" : "Yearly"}</Text>
                <Text style={[styles.price,{color:palette.ink}]}>{offer.displayPrice}</Text>
                <Text style={[styles.planText,{color:palette.inkMuted}]}>{offer.periodLabel}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={"Continue with "+offer.productKey+" Premium plan"}
                  style={[styles.cta,{backgroundColor:palette.blue}]}
                  onPress={()=>void purchase(offer.storeProductId,offer.productKey)}
                >
                  <Text style={[styles.ctaText,{color:palette.paper}]}>Continue with store</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.unavailable,{borderColor:palette.border,backgroundColor:palette.paperMuted}]}>
            <Text style={[styles.unavailableTitle,{color:palette.ink}]}>Membership options aren't available here yet</Text>
            <Text style={[styles.unavailableText,{color:palette.inkMuted}]}>Existing members can still sign in or restore purchases. Available membership options will appear here when purchasing is available.</Text>
            <View style={styles.unavailableActions}>
              <Pressable accessibilityRole="button" style={[styles.secondaryAction,{borderColor:palette.border}]} onPress={()=>router.push("/account-access" as never)}>
                <Text style={[styles.secondaryActionText,{color:palette.ink}]}>Member sign in</Text>
              </Pressable>
              <Pressable accessibilityRole="button" style={[styles.secondaryAction,{borderColor:palette.border}]} onPress={()=>void restore()}>
                <Text style={[styles.secondaryActionText,{color:palette.ink}]}>Restore purchases</Text>
              </Pressable>
            </View>
          </View>
        )}
        {!!status && <Text accessibilityLiveRegion="polite" style={[styles.status,{color:palette.inkMuted}]}>{status}</Text>}
      </Section>

      <Section>
        <SectionHeader title="From HealthTimes Premium" eyebrow="MEMBER JOURNALISM" />
        {sourceStories.loading ? (
          <View accessibilityLabel="Premium stories loading">
            <LoadingBlock label="Loading Premium journalism…" />
          </View>
        ) : sourceStories.error ? (
          <View accessibilityLabel="Premium stories unavailable">
            <EmptyState title="Premium journalism is temporarily unavailable" message="Please try again shortly." />
          </View>
        ) : premiumStories.length > 0 ? (
          <View accessibilityLabel="Source-backed Premium journalism">
            <StoryGrid stories={premiumStories} />
          </View>
        ) : (
          <View accessibilityLabel="Premium stories empty">
            <EmptyState title="No Premium stories available" message="Premium reporting will appear here when published." />
          </View>
        )}
      </Section>

      <Section>
        <SectionHeader title="Premium benefits" />
        <View style={styles.benefits}>
          {[
            "Premium investigations and research",
            "Article audio where available",
            "Saved reading and offline access where supported",
            "Followed countries and topics",
            "Member briefings where published"
          ].map((item)=><View key={item} style={styles.benefitRow}><Text style={[styles.benefitCheck,{color:palette.premium}]}>✓</Text><Text style={[styles.benefit,{color:palette.ink}]}>{item}</Text></View>)}
        </View>
        <View style={styles.memberActions}>
          {!webCommerce && (
            <Pressable accessibilityRole="button" style={[styles.secondaryAction,{borderColor:palette.border}]} onPress={()=>void restore()}>
              <Text style={[styles.secondaryActionText,{color:palette.ink}]}>Restore purchases</Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" style={[styles.secondaryAction,{borderColor:palette.border}]} onPress={()=>router.push("/account-access" as never)}>
            <Text style={[styles.secondaryActionText,{color:palette.ink}]}>Sign in as existing member</Text>
          </Pressable>
        </View>
        <Text style={[styles.signin,{color:palette.inkMuted}]}>
          {webCommerce
            ? "Already a member? Sign in to restore your HealthTimes Premium access."
            : "Already a member? Sign in or restore a store purchase to recover your HealthTimes Premium access."}
        </Text>
      </Section>
    </Page>
  );
}

const styles=StyleSheet.create({
  hero:{marginTop:spacing.xl,maxWidth:860,gap:spacing.md,paddingBottom:spacing.xl,borderBottomWidth:1},
  identityRow:{flexDirection:"row",alignItems:"center",gap:spacing.sm},
  crown:{fontSize:18,fontWeight:"900"},
  eyebrow:{fontSize:11,fontWeight:"900",letterSpacing:1.2},
  title:{fontSize:36,lineHeight:42,fontWeight:"900",letterSpacing:-0.8,maxWidth:820},
  text:{fontSize:16,lineHeight:25,maxWidth:760},
  plans:{flexDirection:"row",flexWrap:"wrap",gap:spacing.lg},
  plan:{flexGrow:1,flexBasis:280,maxWidth:420,minWidth:250,borderWidth:1,borderRadius:radius.md,padding:spacing.xl,gap:spacing.sm},
  planTitle:{fontSize:22,fontWeight:"900"},
  price:{fontSize:30,fontWeight:"900"},
  planText:{fontSize:14,lineHeight:21},
  cta:{marginTop:spacing.sm,alignSelf:"flex-start",minHeight:layout.touchMin,justifyContent:"center",paddingHorizontal:18,borderRadius:radius.sm},
  ctaText:{fontWeight:"900"},
  accessState:{borderTopWidth:1,borderBottomWidth:1,paddingVertical:spacing.xl,gap:spacing.sm,maxWidth:760},
  accessTitle:{fontSize:20,fontWeight:"900"},
  accessText:{fontSize:14,lineHeight:22,maxWidth:620},
  unavailable:{borderWidth:1,borderRadius:radius.md,padding:spacing.xl,gap:spacing.md,maxWidth:760},
  unavailableTitle:{fontSize:21,lineHeight:27,fontWeight:"900"},
  unavailableText:{fontSize:14,lineHeight:22,maxWidth:620},
  unavailableActions:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  benefits:{gap:spacing.sm,maxWidth:700},
  benefitRow:{flexDirection:"row",alignItems:"flex-start",gap:spacing.sm},
  benefitCheck:{fontWeight:"900",lineHeight:24},
  benefit:{fontSize:15,lineHeight:24,flex:1},
  memberActions:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,marginTop:spacing.xl},
  secondaryAction:{minHeight:layout.touchMin,justifyContent:"center",alignSelf:"flex-start",paddingHorizontal:14,borderWidth:1,borderRadius:radius.sm},
  secondaryActionText:{fontWeight:"900"},
  status:{marginTop:spacing.sm,fontSize:13,lineHeight:20},
  signin:{marginTop:spacing.md,fontSize:13,lineHeight:20}
});
