import { useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { LiveRail, AdSlot } from "../../src/ui/Cards";
import { Chip, EmptyState, LoadingBlock, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { radius, spacing } from "../../src/theme/tokens";
import { useAppearance } from "../../src/theme/AppearanceProvider";

type LiveTab="live"|"blog"|"upcoming";

function updatedLabel(value:string){
  const date=new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

export default function LiveScreen(){
  const { palette }=useAppearance();
  const [active,setActive]=useState<LiveTab>("live");
  const live=useAsync(()=>services.live.list(),[]);
  const source=live.data ?? [];

  const items=useMemo(()=>{
    if(active==="blog") return source.filter((item)=>item.kind==="live-blog");
    if(active==="upcoming") return source.filter((item)=>item.status==="upcoming");
    return source.filter((item)=>item.status==="live");
  },[active,source]);

  const [featured,...secondary]=items;
  const hasCoverage=source.length>0;
  const updated=featured ? updatedLabel(featured.updatedAt) : null;

  return (
    <Page title="Live">
      <View style={[styles.identity,{borderLeftColor:palette.live}]}>
        <Text style={[styles.identityLabel,{color:palette.live}]}>HEALTHTIMES LIVE</Text>
        <Text style={[styles.lede,{color:palette.inkMuted}]}>Live reporting, event updates and scheduled health coverage from the HealthTimes newsroom.</Text>
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

      {!live.loading && !live.error && !hasCoverage ? (
        <Section>
          <EmptyState
            title="No live coverage right now"
            message="When HealthTimes opens live reporting or schedules an event, it will appear here."
          />
        </Section>
      ) : null}

      {hasCoverage ? (
        <>
          <View style={styles.tabs} accessibilityLabel="Live coverage views">
            <Chip active={active==="live"} onPress={()=>setActive("live")}>Live Now</Chip>
            <Chip active={active==="blog"} onPress={()=>setActive("blog")}>Live Blog</Chip>
            <Chip active={active==="upcoming"} onPress={()=>setActive("upcoming")}>Upcoming</Chip>
          </View>

          <Section>
            <SectionHeader
              title={active==="upcoming" ? "Upcoming coverage" : active==="blog" ? "Live blogs" : "Live now"}
              eyebrow={active==="upcoming" ? "SCHEDULE" : "LIVE"}
            />
            {featured ? (
              <View style={[styles.featured,{borderColor:palette.border}]}>
                {featured.media?.publicUrl ? (
                  <Image
                    source={{uri:featured.media.publicUrl}}
                    style={[styles.featuredImage,{backgroundColor:palette.paperMuted}]}
                    accessibilityLabel={featured.media.altText ?? featured.title}
                  />
                ) : null}
                <View style={styles.featuredBody}>
                  <Text style={[styles.liveBadge,{backgroundColor:featured.status==="live"?palette.live:palette.inkMuted}]}>
                    {featured.status==="live" ? "LIVE" : "UPCOMING"}
                  </Text>
                  <Text style={[styles.featuredTitle,{color:palette.ink}]}>{featured.title}</Text>
                  {(featured.updateCount || updated) ? (
                    <Text style={[styles.meta,{color:palette.inkMuted}]}>
                      {featured.updateCount ? featured.updateCount+" updates" : ""}
                      {featured.updateCount && updated ? " · " : ""}
                      {updated ? "Updated "+updated : ""}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <EmptyState
                title={active==="upcoming" ? "No scheduled coverage" : active==="blog" ? "No live blogs right now" : "No active live coverage"}
                message={active==="upcoming"
                  ? "Scheduled HealthTimes live coverage will appear here when it is published."
                  : "Choose another Live view or return when new coverage begins."}
              />
            )}
          </Section>

          {!!secondary.length && (
            <Section>
              <SectionHeader title="More live coverage" />
              <LiveRail items={secondary} />
            </Section>
          )}
        </>
      ) : null}

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
  featuredImage:{width:"100%",aspectRatio:16/8},
  featuredBody:{padding:spacing.xl,gap:spacing.sm},
  liveBadge:{alignSelf:"flex-start",color:"#FFFFFF",fontSize:10,fontWeight:"900",letterSpacing:1,paddingHorizontal:8,paddingVertical:5,borderRadius:4},
  featuredTitle:{fontSize:30,lineHeight:36,fontWeight:"900",letterSpacing:-0.6,maxWidth:900},
  meta:{fontSize:12,lineHeight:18}
});
