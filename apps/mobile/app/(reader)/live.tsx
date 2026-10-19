import { useMemo, useState } from "react";
import { Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LiveRail, AdSlot } from "../../src/ui/Cards";
import { Chip, EmptyState, LoadingBlock, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { breakpoints, radius, spacing } from "../../src/theme/tokens";
import { useAppearance } from "../../src/theme/AppearanceProvider";

type LiveTab="live"|"blog"|"upcoming";

function updatedLabel(value:string){
  const date=new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

export default function LiveScreen(){
  const { palette }=useAppearance();
  const { width }=useWindowDimensions();
  const desktop=width>=breakpoints.desktop;
  const [active,setActive]=useState<LiveTab>("live");
  const live=useAsync(()=>services.live.list(),[]);
  const source=live.data ?? [];

  const items=useMemo(()=>{
    if(active==="blog") return source.filter((item)=>item.kind==="live-blog");
    if(active==="upcoming") return source.filter((item)=>item.status==="upcoming");
    return source.filter((item)=>item.status==="live");
  },[active,source]);

  const [featured,...secondary]=items;
  const updated=featured ? updatedLabel(featured.updatedAt) : null;

  return (
    <Page title="Live">
      <View style={[styles.identity,{borderLeftColor:palette.live}]}>
        <Text style={[styles.identityLabel,{color:palette.live}]}>HEALTHTIMES LIVE</Text>
        <Text style={[styles.lede,{color:palette.inkMuted}]}>Live reporting, event updates and scheduled health coverage from the HealthTimes newsroom.</Text>
      </View>

      <View style={styles.tabs} accessibilityLabel="Live coverage views">
        <Chip active={active==="live"} onPress={()=>setActive("live")}>Live Now</Chip>
        <Chip active={active==="blog"} onPress={()=>setActive("blog")}>Live Blog</Chip>
        <Chip active={active==="upcoming"} onPress={()=>setActive("upcoming")}>Upcoming</Chip>
      </View>

      {live.loading && !live.data ? <LoadingBlock label="Loading live coverage…" /> : null}

      {live.error && !live.data ? (
        <Section>
          <EmptyState
            title="Live coverage is temporarily unavailable"
            message="HealthTimes could not load Live right now. Please try again when your connection is available."
          />
        </Section>
      ) : null}

      {!live.loading && !live.error && (
        <>
          {featured ? (
            <Section>
              <SectionHeader
                title={active==="upcoming" ? "Upcoming coverage" : active==="blog" ? "Live blogs" : "Live now"}
                eyebrow={active==="upcoming" ? "SCHEDULE" : "LIVE"}
              />
              <View style={[styles.featured, desktop&&styles.featuredDesktop, {borderColor:palette.border, backgroundColor:palette.paper}]}>
                {featured.media?.publicUrl ? (
                  <Image
                    source={{uri:featured.media.publicUrl}}
                    style={[styles.featuredImage, desktop&&styles.featuredImageDesktop, {backgroundColor:palette.paperMuted}]}
                    accessibilityLabel={featured.media.altText ?? featured.title}
                  />
                ) : (
                  <View style={[styles.featuredFallback, desktop&&styles.featuredFallbackDesktop, {backgroundColor:palette.navy}]}>
                    <Text style={styles.fallbackBrand}>HealthTimes</Text>
                    <Text style={styles.fallbackLabel}>LIVE</Text>
                    <Text style={styles.fallbackNote}>HealthTimes live coverage</Text>
                  </View>
                )}
                <View style={[styles.featuredBody, desktop&&styles.featuredBodyDesktop]}>
                  <Text style={[styles.liveBadge,{backgroundColor:featured.status==="live"?palette.live:palette.inkMuted}]}>
                    {featured.status==="live" ? "LIVE" : "UPCOMING"}
                  </Text>
                  <Text style={[styles.featuredTitle, desktop&&styles.featuredTitleDesktop, {color:palette.ink}]}>{featured.title}</Text>
                  {(featured.updateCount || updated) ? (
                    <Text style={[styles.meta,{color:palette.inkMuted}]}>
                      {featured.updateCount ? featured.updateCount+" updates" : ""}
                      {featured.updateCount && updated ? " · " : ""}
                      {updated ? "Updated "+updated : ""}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Section>
          ) : (
            <Section>
              <EmptyState
                title={active==="upcoming" ? "No scheduled coverage" : active==="blog" ? "No live blogs right now" : "No live coverage right now"}
                message={active==="upcoming"
                  ? "Scheduled HealthTimes live coverage will appear here when it is published."
                  : "When HealthTimes opens live reporting or schedules an event, it will appear here."}
              />
            </Section>
          )}

          {!!secondary.length && (
            <Section>
              <SectionHeader title="More live coverage" />
              <LiveRail items={secondary} />
            </Section>
          )}
        </>
      )}

      <AdSlot placement="live_feed" />
    </Page>
  );
}

const styles=StyleSheet.create({
  identity:{marginTop:spacing.sm,borderLeftWidth:4,paddingLeft:spacing.md,gap:4,maxWidth:820},
  identityLabel:{fontSize:10,fontWeight:"900",letterSpacing:1.5},
  lede:{fontSize:16,lineHeight:24},
  tabs:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,marginTop:spacing.xl},
  featured:{borderWidth:1,borderRadius:radius.md,overflow:"hidden"},
  featuredDesktop:{flexDirection:"row",alignItems:"stretch"},
  featuredImage:{width:"100%",aspectRatio:16/9},
  featuredImageDesktop:{width:"58%"},
  featuredFallback:{width:"100%",aspectRatio:16/9,alignItems:"center",justifyContent:"center",padding:spacing.xl,gap:4},
  featuredFallbackDesktop:{width:"58%"},
  fallbackBrand:{color:"#FFFFFF",fontSize:22,fontWeight:"900",letterSpacing:-.5},
  fallbackLabel:{color:"#FF4D4D",fontSize:10,fontWeight:"900",letterSpacing:1.8},
  fallbackNote:{color:"#C9D5E1",fontSize:10,lineHeight:15,textAlign:"center",maxWidth:260,marginTop:spacing.sm},
  featuredBody:{padding:spacing.xl,gap:spacing.sm},
  featuredBodyDesktop:{flex:1,justifyContent:"center"},
  liveBadge:{alignSelf:"flex-start",color:"#FFFFFF",fontSize:10,fontWeight:"900",letterSpacing:1,paddingHorizontal:8,paddingVertical:5,borderRadius:4},
  featuredTitle:{fontSize:26,lineHeight:32,fontWeight:"900",letterSpacing:-0.5,maxWidth:900},
  featuredTitleDesktop:{fontSize:30,lineHeight:36,letterSpacing:-0.6},
  meta:{fontSize:12,lineHeight:18}
});
