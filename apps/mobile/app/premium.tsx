import { useEffect, useRef, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { EmptyState, LoadingBlock, Page, Section, SectionHeader } from "../src/ui/Layout";
import { StoryGrid } from "../src/ui/Cards";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { event } from "../src/growth/events";
import { breakpoints, layout, radius, spacing } from "../src/theme/tokens";
import { useAppearance } from "../src/theme/AppearanceProvider";

const PREMIUM_PILLARS = [
  "Investigative reporting",
  "Policy & clinical depth",
  "Audio & saved reading"
] as const;

const PREMIUM_BENEFITS = [
  {
    title: "Premium investigations and research",
    detail: "Full access to in-depth HealthTimes investigations, health-finance reporting, and specialist policy coverage."
  },
  {
    title: "Article audio where available",
    detail: "Listen to narrated editions of supported HealthTimes stories across your reading sessions."
  },
  {
    title: "Saved reading and offline access where supported",
    detail: "Bookmark stories in your personal library and keep eligible reporting ready on your device."
  },
  {
    title: "Followed countries and topics",
    detail: "Tailor your edition around the regional health desks, countries, and clinical beats you follow."
  },
  {
    title: "Member briefings where published",
    detail: "Read curated editorial briefings from the HealthTimes newsroom when published."
  }
] as const;

function useHydratedPremiumWidth(){
  const { width }=useWindowDimensions();
  const [responsiveReady,setResponsiveReady]=useState(Platform.OS!=="web");
  useEffect(()=>{
    setResponsiveReady(true);
  },[]);
  return responsiveReady ? width : 0;
}

export default function PremiumScreen(){
  const router=useRouter();
  const { palette }=useAppearance();
  const viewportWidth=useHydratedPremiumWidth();
  const isTablet=viewportWidth>=breakpoints.tablet;
  const isDesktop=viewportWidth>=breakpoints.desktop;
  const store=useAsync(()=>services.premiumStore.getState(),[]);
  const commerce=useAsync(()=>services.premiumCommerce.getAuthority(),[]);
  const sourceStories=useAsync(()=>services.articles.getHome(),[]);
  const entitlement=useAsync(()=>services.premium.hasEntitlement(),[]);
  const premiumStories=(sourceStories.data ?? []).filter((story)=>story.accessPolicy==="premium");
  const webCommerce=Platform.OS==="web";
  const [status,setStatus]=useState("");
  const previewTracked=useRef(false);

  const webOfferAvailable=Boolean(
    webCommerce &&
    commerce.data?.status==="available" &&
    commerce.data.price &&
    commerce.data.currency
  );
  const storeOffersAvailable=Boolean(
    !webCommerce &&
    store.data?.status==="available" &&
    store.data.offers.length
  );
  const primaryStoreOffer=storeOffersAvailable ? (store.data?.offers[0] ?? null) : null;

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
      <View
        testID="premium-landing-masthead"
        style={[
          styles.mastheadCard,
          isTablet && styles.mastheadCardTablet,
          isDesktop && styles.mastheadCardDesktop,
          {
            borderColor:palette.border,
            borderTopColor:palette.premium,
            backgroundColor:palette.paper
          }
        ]}
      >
        <View style={[styles.mastheadLead,isDesktop && styles.mastheadLeadDesktop]}>
          <View style={styles.identityRow}>
            <View style={[styles.identityBadge,{borderColor:palette.premium,backgroundColor:palette.paperMuted}]}>
              <Text style={[styles.crown,{color:palette.premium}]}>✦</Text>
              <Text style={[styles.eyebrow,{color:palette.premium}]}>HEALTHTIMES PREMIUM</Text>
            </View>
            <Text style={[styles.identityTag,{color:palette.inkMuted}]}>MEMBER JOURNALISM</Text>
          </View>

          <Text style={[styles.title,isTablet && styles.titleTablet,{color:palette.ink}]}>
            Deeper reporting for readers who want the full health story.
          </Text>
          <Text style={[styles.text,{color:palette.inkMuted}]}>
            HealthTimes Premium brings investigative health reporting, policy analysis, and clinical intelligence together for readers who rely on the complete story.
          </Text>

          <View style={styles.pillarRow} accessibilityLabel="HealthTimes Premium editorial pillars">
            {PREMIUM_PILLARS.map((pillar)=>(
              <View
                key={pillar}
                style={[
                  styles.pillarChip,
                  {borderColor:palette.border,backgroundColor:palette.paperMuted}
                ]}
              >
                <Text style={[styles.pillarDot,{color:palette.premium}]}>•</Text>
                <Text style={[styles.pillarText,{color:palette.ink}]}>{pillar}</Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.mastheadAccessCol,
            isDesktop && styles.mastheadAccessColDesktop,
            {borderColor:palette.border,backgroundColor:palette.paperMuted}
          ]}
        >
          <View
            testID="premium-member-access-card"
            accessibilityLabel="Your membership"
            style={[styles.accessState,{borderBottomColor:palette.border}]}
          >
            <View style={styles.accessHeaderRow}>
              <Text style={[styles.sectionEyebrow,{color:palette.premium}]}>MEMBER ACCESS</Text>
              {entitlement.data===true && (
                <Text style={[styles.activeBadge,{color:palette.success,borderColor:palette.success}]}>
                  ACTIVE
                </Text>
              )}
            </View>
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
              <View style={styles.accessActionRow}>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed, focused }: any)=>[
                    styles.secondaryAction,
                    {borderColor:palette.border,backgroundColor:palette.paper},
                    focused && [styles.actionFocused,{borderColor:palette.blue}],
                    pressed && styles.actionPressed
                  ]}
                  onPress={()=>router.push("/account-access" as never)}
                >
                  <Text style={[styles.secondaryActionText,{color:palette.ink}]}>Sign in as existing member</Text>
                </Pressable>
                {!webCommerce && (
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed, focused }: any)=>[
                      styles.secondaryAction,
                      {borderColor:palette.border,backgroundColor:palette.paper},
                      focused && [styles.actionFocused,{borderColor:palette.blue}],
                      pressed && styles.actionPressed
                    ]}
                    onPress={()=>void restore()}
                  >
                    <Text style={[styles.secondaryActionText,{color:palette.ink}]}>Restore purchases</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          <View testID="premium-membership-options" style={styles.optionsBlock}>
            <Text style={[styles.sectionEyebrow,{color:palette.inkMuted}]}>GO PREMIUM · MEMBERSHIP OPTIONS</Text>
            {webCommerce ? (
              commerce.loading ? (
                <LoadingBlock label="Checking membership options…" />
              ) : webOfferAvailable && commerce.data ? (
                <View style={styles.plans} accessibilityLabel="Available HealthTimes Premium web membership">
                  <View style={[styles.plan,{borderColor:palette.border,backgroundColor:palette.paper}]}>
                    <Text style={[styles.planTitle,{color:palette.ink}]}>Premium membership</Text>
                    <Text style={[styles.price,{color:palette.ink}]}>{commerce.data.price+" "+commerce.data.currency}</Text>
                    {!!commerce.data.billingInterval && <Text style={[styles.planText,{color:palette.inkMuted}]}>{commerce.data.billingInterval}</Text>}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Continue to Premium checkout"
                      style={({ pressed, focused }: any)=>[
                        styles.cta,
                        {backgroundColor:palette.blue},
                        focused && [styles.actionFocused,{borderColor:palette.ink}],
                        pressed && styles.actionPressed
                      ]}
                      onPress={()=>void startWebCheckout()}
                    >
                      <Text style={[styles.ctaText,{color:palette.paper}]}>Become Premium</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View
                  testID="premium-commerce-unavailable"
                  style={[styles.unavailable,{borderColor:palette.border,backgroundColor:palette.paper}]}
                >
                  <Text style={[styles.unavailableTitle,{color:palette.ink}]}>Membership options aren't available here yet</Text>
                  <Text style={[styles.unavailableText,{color:palette.inkMuted}]}>
                    Online subscription enrolment is not open right now. Existing subscribers can sign in to read full Premium journalism.
                  </Text>
                  <View style={styles.unavailableActions}>
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed, focused }: any)=>[
                        styles.secondaryAction,
                        {borderColor:palette.border,backgroundColor:palette.paperMuted},
                        focused && [styles.actionFocused,{borderColor:palette.blue}],
                        pressed && styles.actionPressed
                      ]}
                      onPress={()=>router.push("/account-access" as never)}
                    >
                      <Text style={[styles.secondaryActionText,{color:palette.ink}]}>Member sign in</Text>
                    </Pressable>
                  </View>
                </View>
              )
            ) : store.loading ? (
              <LoadingBlock label="Checking membership options…" />
            ) : storeOffersAvailable && store.data ? (
              <View style={styles.plans} accessibilityLabel="Available HealthTimes Premium plans">
                {store.data.offers.map((offer)=>(
                  <View style={[styles.plan,{borderColor:palette.border,backgroundColor:palette.paper}]} key={offer.storeProductId}>
                    <Text style={[styles.planTitle,{color:palette.ink}]}>{offer.productKey==="monthly" ? "Monthly" : "Yearly"}</Text>
                    <Text style={[styles.price,{color:palette.ink}]}>{offer.displayPrice}</Text>
                    <Text style={[styles.planText,{color:palette.inkMuted}]}>{offer.periodLabel}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={"Continue with "+offer.productKey+" Premium plan"}
                      style={({ pressed, focused }: any)=>[
                        styles.cta,
                        {backgroundColor:palette.blue},
                        focused && [styles.actionFocused,{borderColor:palette.ink}],
                        pressed && styles.actionPressed
                      ]}
                      onPress={()=>void purchase(offer.storeProductId,offer.productKey)}
                    >
                      <Text style={[styles.ctaText,{color:palette.paper}]}>Continue with store</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <View
                testID="premium-commerce-unavailable"
                style={[styles.unavailable,{borderColor:palette.border,backgroundColor:palette.paper}]}
              >
                <Text style={[styles.unavailableTitle,{color:palette.ink}]}>Membership options aren't available here yet</Text>
                <Text style={[styles.unavailableText,{color:palette.inkMuted}]}>
                  In-app subscription enrolment is not open right now. Existing subscribers can sign in or restore purchases to read full Premium journalism.
                </Text>
                <View style={styles.unavailableActions}>
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed, focused }: any)=>[
                      styles.secondaryAction,
                      {borderColor:palette.border,backgroundColor:palette.paperMuted},
                      focused && [styles.actionFocused,{borderColor:palette.blue}],
                      pressed && styles.actionPressed
                    ]}
                    onPress={()=>router.push("/account-access" as never)}
                  >
                    <Text style={[styles.secondaryActionText,{color:palette.ink}]}>Member sign in</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed, focused }: any)=>[
                      styles.secondaryAction,
                      {borderColor:palette.border,backgroundColor:palette.paperMuted},
                      focused && [styles.actionFocused,{borderColor:palette.blue}],
                      pressed && styles.actionPressed
                    ]}
                    onPress={()=>void restore()}
                  >
                    <Text style={[styles.secondaryActionText,{color:palette.ink}]}>Restore purchases</Text>
                  </Pressable>
                </View>
              </View>
            )}
            {!!status && <Text accessibilityLiveRegion="polite" style={[styles.status,{color:palette.inkMuted}]}>{status}</Text>}
          </View>
        </View>
      </View>

      <Section>
        <View style={styles.journalismHeaderWrap}>
          <SectionHeader title="From HealthTimes Premium" eyebrow="MEMBER JOURNALISM" />
          <Text style={[styles.journalismDeck,{color:palette.inkMuted}]}>
            Exclusive investigations, policy reporting, and health-system analysis included with HealthTimes Premium.
          </Text>
        </View>
        {sourceStories.loading ? (
          <View accessibilityLabel="Premium stories loading">
            <LoadingBlock label="Loading Premium journalism…" />
          </View>
        ) : sourceStories.error ? (
          <View accessibilityLabel="Premium stories unavailable">
            <EmptyState title="Premium journalism is temporarily unavailable" message="Please try again shortly." />
          </View>
        ) : premiumStories.length > 0 ? (
          <View accessibilityLabel="Source-backed Premium journalism" testID="premium-journalism-showcase">
            <StoryGrid stories={premiumStories} />
          </View>
        ) : (
          <View accessibilityLabel="Premium stories empty">
            <EmptyState title="No Premium stories available" message="Premium reporting will appear here when published." />
          </View>
        )}
      </Section>

      <Section>
        <SectionHeader title="Premium benefits" eyebrow="INCLUDED WITH MEMBERSHIP" />
        <View style={[styles.benefitsGrid,isTablet && styles.benefitsGridTablet]}>
          {PREMIUM_BENEFITS.map((item)=>(
            <View
              key={item.title}
              style={[
                styles.benefitCard,
                isTablet && styles.benefitCardTablet,
                {borderColor:palette.border,backgroundColor:palette.paper}
              ]}
            >
              <View style={styles.benefitRow}>
                <Text style={[styles.benefitCheck,{color:palette.premium}]}>✓</Text>
                <View style={styles.benefitCopy}>
                  <Text style={[styles.benefit,{color:palette.ink}]}>{item.title}</Text>
                  <Text style={[styles.benefitDetail,{color:palette.inkMuted}]}>{item.detail}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.closingCard,{borderColor:palette.border,backgroundColor:palette.paperMuted}]}>
          <View style={styles.memberActions}>
            {webOfferAvailable && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Become Premium"
                style={({ pressed, focused }: any)=>[
                  styles.cta,
                  {backgroundColor:palette.blue,marginTop:0},
                  focused && [styles.actionFocused,{borderColor:palette.ink}],
                  pressed && styles.actionPressed
                ]}
                onPress={()=>void startWebCheckout()}
              >
                <Text style={[styles.ctaText,{color:palette.paper}]}>Become Premium</Text>
              </Pressable>
            )}
            {primaryStoreOffer && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue with store"
                style={({ pressed, focused }: any)=>[
                  styles.cta,
                  {backgroundColor:palette.blue,marginTop:0},
                  focused && [styles.actionFocused,{borderColor:palette.ink}],
                  pressed && styles.actionPressed
                ]}
                onPress={()=>void purchase(primaryStoreOffer.storeProductId,primaryStoreOffer.productKey)}
              >
                <Text style={[styles.ctaText,{color:palette.paper}]}>Continue with store</Text>
              </Pressable>
            )}
            {!webCommerce && (
              <Pressable
                accessibilityRole="button"
                style={({ pressed, focused }: any)=>[
                  styles.secondaryAction,
                  {borderColor:palette.border,backgroundColor:palette.paper},
                  focused && [styles.actionFocused,{borderColor:palette.blue}],
                  pressed && styles.actionPressed
                ]}
                onPress={()=>void restore()}
              >
                <Text style={[styles.secondaryActionText,{color:palette.ink}]}>Restore purchases</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              style={({ pressed, focused }: any)=>[
                styles.secondaryAction,
                {borderColor:palette.border,backgroundColor:palette.paper},
                focused && [styles.actionFocused,{borderColor:palette.blue}],
                pressed && styles.actionPressed
              ]}
              onPress={()=>router.push("/account-access" as never)}
            >
              <Text style={[styles.secondaryActionText,{color:palette.ink}]}>Sign in as existing member</Text>
            </Pressable>
          </View>
          <Text style={[styles.signin,{color:palette.inkMuted}]}>
            {webCommerce
              ? "Already a member? Sign in to restore your HealthTimes Premium access."
              : "Already a member? Sign in or restore a store purchase to recover your HealthTimes Premium access."}
          </Text>
        </View>
      </Section>
    </Page>
  );
}

const styles=StyleSheet.create({
  mastheadCard:{
    marginTop:spacing.md,
    borderWidth:1,
    borderTopWidth:3,
    borderRadius:radius.md,
    padding:spacing.lg,
    gap:spacing.lg
  },
  mastheadCardTablet:{
    padding:spacing.xl,
    gap:spacing.xl
  },
  mastheadCardDesktop:{
    flexDirection:"row",
    alignItems:"stretch",
    justifyContent:"space-between"
  },
  mastheadLead:{
    gap:spacing.md,
    flexShrink:1
  },
  mastheadLeadDesktop:{
    flex:1.25,
    paddingRight:spacing.lg,
    justifyContent:"space-between"
  },
  identityRow:{
    flexDirection:"row",
    alignItems:"center",
    flexWrap:"wrap",
    gap:spacing.sm
  },
  identityBadge:{
    flexDirection:"row",
    alignItems:"center",
    gap:6,
    borderWidth:1,
    borderRadius:radius.sm,
    paddingHorizontal:10,
    paddingVertical:4
  },
  crown:{fontSize:14,fontWeight:"900"},
  eyebrow:{fontSize:11,fontWeight:"900",letterSpacing:1.1},
  identityTag:{fontSize:10,fontWeight:"800",letterSpacing:1},
  title:{
    fontSize:28,
    lineHeight:34,
    fontWeight:"900",
    letterSpacing:-0.6,
    maxWidth:720
  },
  titleTablet:{
    fontSize:36,
    lineHeight:42,
    letterSpacing:-0.8
  },
  text:{
    fontSize:15,
    lineHeight:23,
    maxWidth:680
  },
  pillarRow:{
    flexDirection:"row",
    flexWrap:"wrap",
    gap:spacing.sm,
    marginTop:spacing.xs
  },
  pillarChip:{
    flexDirection:"row",
    alignItems:"center",
    gap:6,
    borderWidth:1,
    borderRadius:radius.sm,
    paddingHorizontal:10,
    paddingVertical:6
  },
  pillarDot:{fontSize:14,fontWeight:"900"},
  pillarText:{fontSize:12,fontWeight:"800"},
  mastheadAccessCol:{
    borderWidth:1,
    borderRadius:radius.md,
    padding:spacing.md,
    gap:spacing.md
  },
  mastheadAccessColDesktop:{
    flex:1,
    maxWidth:460
  },
  accessState:{
    borderBottomWidth:1,
    paddingBottom:spacing.md,
    gap:6
  },
  accessHeaderRow:{
    flexDirection:"row",
    alignItems:"center",
    justifyContent:"space-between",
    gap:spacing.sm
  },
  sectionEyebrow:{
    fontSize:10,
    fontWeight:"900",
    letterSpacing:1
  },
  activeBadge:{
    fontSize:10,
    fontWeight:"900",
    letterSpacing:0.8,
    borderWidth:1,
    borderRadius:radius.sm,
    paddingHorizontal:8,
    paddingVertical:2
  },
  accessTitle:{fontSize:18,lineHeight:24,fontWeight:"900"},
  accessText:{fontSize:13,lineHeight:20},
  accessActionRow:{
    flexDirection:"row",
    flexWrap:"wrap",
    gap:spacing.sm,
    marginTop:spacing.xs
  },
  optionsBlock:{
    gap:spacing.sm
  },
  plans:{flexDirection:"row",flexWrap:"wrap",gap:spacing.md},
  plan:{
    flexGrow:1,
    flexBasis:240,
    minWidth:220,
    borderWidth:1,
    borderRadius:radius.sm,
    padding:spacing.md,
    gap:spacing.xs
  },
  planTitle:{fontSize:18,fontWeight:"900"},
  price:{fontSize:26,fontWeight:"900"},
  planText:{fontSize:13,lineHeight:19},
  cta:{
    marginTop:spacing.xs,
    alignSelf:"flex-start",
    minHeight:layout.touchMin,
    justifyContent:"center",
    paddingHorizontal:18,
    borderRadius:radius.sm
  },
  ctaText:{fontWeight:"900",fontSize:14},
  unavailable:{
    borderWidth:1,
    borderRadius:radius.sm,
    padding:spacing.md,
    gap:6
  },
  unavailableTitle:{fontSize:15,lineHeight:21,fontWeight:"800"},
  unavailableText:{fontSize:13,lineHeight:19},
  unavailableActions:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,marginTop:spacing.xs},
  journalismHeaderWrap:{
    gap:4,
    marginBottom:spacing.xs
  },
  journalismDeck:{
    fontSize:14,
    lineHeight:21,
    maxWidth:720
  },
  benefitsGrid:{
    gap:spacing.sm
  },
  benefitsGridTablet:{
    flexDirection:"row",
    flexWrap:"wrap",
    gap:spacing.md
  },
  benefitCard:{
    borderWidth:1,
    borderRadius:radius.sm,
    padding:spacing.md
  },
  benefitCardTablet:{
    flexGrow:1,
    flexBasis:320,
    maxWidth:560
  },
  benefitRow:{
    flexDirection:"row",
    alignItems:"flex-start",
    gap:spacing.sm
  },
  benefitCheck:{fontWeight:"900",fontSize:16,lineHeight:22},
  benefitCopy:{flex:1,gap:2},
  benefit:{fontSize:15,lineHeight:22,fontWeight:"800"},
  benefitDetail:{fontSize:13,lineHeight:19},
  closingCard:{
    marginTop:spacing.md,
    borderWidth:1,
    borderRadius:radius.sm,
    padding:spacing.md,
    gap:spacing.sm
  },
  memberActions:{
    flexDirection:"row",
    flexWrap:"wrap",
    gap:spacing.sm
  },
  secondaryAction:{
    minHeight:layout.touchMin,
    justifyContent:"center",
    alignSelf:"flex-start",
    paddingHorizontal:14,
    borderWidth:1,
    borderRadius:radius.sm
  },
  secondaryActionText:{fontWeight:"800",fontSize:13},
  actionFocused:{borderWidth:2},
  actionPressed:{opacity:0.86},
  status:{marginTop:spacing.xs,fontSize:13,lineHeight:19},
  signin:{fontSize:13,lineHeight:19}
});
