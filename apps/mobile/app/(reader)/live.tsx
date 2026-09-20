import { useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { LiveRail, AdSlot } from "../../src/ui/Cards";
import { Chip, EmptyState, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { radius, spacing } from "../../src/theme/tokens";
import { useAppearance } from "../../src/theme/AppearanceProvider";

type LiveTab="live"|"blog"|"upcoming";

export default function LiveScreen(){
  const { palette }=useAppearance();
  const [active,setActive]=useState<LiveTab>("live");
  const live=useAsync(()=>services.live.list(),[]);

  const items=useMemo(()=>{
    const source=live.data ?? [];
    if(active==="blog") return source.filter((item)=>item.kind==="live-blog");
    if(active==="upcoming") return source.filter((item)=>item.status==="upcoming");
    return source.filter((item)=>item.status==="live");
  },[active,live.data]);

  const [featured,...secondary]=items;

  return (
    <Page title="Live">
      <Text style={[styles.lede,{color:palette.inkMuted}]}>Follow verified HealthTimes live blogs, streams and scheduled health events from the same editorial service used across native and PWA.</Text>
      <View style={styles.tabs}>
        <Chip active={active==="live"} onPress={()=>setActive("live")}>Live Now</Chip>
        <Chip active={active==="blog"} onPress={()=>setActive("blog")}>Live Blog</Chip>
        <Chip active={active==="upcoming"} onPress={()=>setActive("upcoming")}>Upcoming</Chip>
      </View>

      <Section>
        <SectionHeader title={active==="upcoming" ? "Upcoming" : "Live Now"} eyebrow={active==="upcoming" ? "SCHEDULE" : "LIVE"} />
        {featured ? (
          <View style={[styles.featured,{borderColor:palette.border}]}>
            {featured.media?.publicUrl ? (
              <Image source={{uri:featured.media.publicUrl}} style={[styles.featuredImage,{backgroundColor:palette.paperMuted}]} accessibilityLabel={featured.media.altText ?? featured.title} />
            ) : null}
            <View style={styles.featuredBody}>
              <Text style={[styles.liveBadge,{backgroundColor:featured.status==="live"?palette.live:palette.inkMuted}]}>
                {featured.status==="live" ? "LIVE" : "UPCOMING"}
              </Text>
              <Text style={[styles.featuredTitle,{color:palette.ink}]}>{featured.title}</Text>
              <Text style={[styles.meta,{color:palette.inkMuted}]}>
                {featured.updateCount ? featured.updateCount + " updates · " : ""}Updated {new Date(featured.updatedAt).toLocaleString()}
              </Text>
            </View>
          </View>
        ) : (
          <EmptyState
            title={active==="upcoming" ? "No scheduled live coverage" : "No active live coverage"}
            message="This surface collapses cleanly when the Live service has no matching authoritative event."
          />
        )}
      </Section>

      {!!secondary.length && (
        <Section>
          <SectionHeader title="More live coverage" />
          <LiveRail items={secondary} />
        </Section>
      )}

      <Section>
        <View style={[styles.note,{borderLeftColor:palette.live}]}>
          <Text style={[styles.noteTitle,{color:palette.ink}]}>Live is a first-class format</Text>
          <Text style={[styles.noteText,{color:palette.inkMuted}]}>AG-04 owns migrated Live/media records. Viewer and audience metrics appear only when an authoritative service supplies them; this client does not invent counts.</Text>
        </View>
      </Section>

      <Section><AdSlot placement="live_feed" /></Section>
    </Page>
  );
}
const styles=StyleSheet.create({
  lede:{fontSize:15,lineHeight:23,maxWidth:760,marginTop:spacing.sm},
  tabs:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,marginTop:spacing.lg},
  featured:{borderWidth:1,borderRadius:radius.md,overflow:"hidden"},
  featuredImage:{width:"100%",aspectRatio:16/8},
  featuredBody:{padding:spacing.xl,gap:spacing.sm},
  liveBadge:{alignSelf:"flex-start",color:"#FFFFFF",fontSize:10,fontWeight:"900",letterSpacing:1,paddingHorizontal:8,paddingVertical:5,borderRadius:4},
  featuredTitle:{fontSize:28,lineHeight:34,fontWeight:"900",letterSpacing:-0.5,maxWidth:850},
  meta:{fontSize:12,lineHeight:18},
  note:{borderLeftWidth:4,paddingLeft:spacing.lg,gap:spacing.sm},
  noteTitle:{fontSize:20,fontWeight:"900"},
  noteText:{fontSize:15,lineHeight:22}
});
