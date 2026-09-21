import type { PropsWithChildren } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import type { AdPlacementKey, ArticleSummary, AudioItem, LiveItem, VideoItem } from "../domain/models";
import { breakpoints, colors, radius, spacing, type } from "../theme/tokens";
import { useAppearance } from "../theme/AppearanceProvider";
import { services } from "../services";
import { useAsync } from "../hooks/useAsync";

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function HeroStory({ story }: { story: ArticleSummary }) {
  const router=useRouter();
  const { palette }=useAppearance();
  const { width }=useWindowDimensions();
  const desktop=width >= breakpoints.desktop;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={story.title}
      accessibilityHint="Opens the full HealthTimes article"
      style={[styles.hero,{borderBottomColor:palette.border},desktop && styles.heroDesktop]}
      onPress={() => router.push(("/article/" + story.id) as never)}
    >
      {story.heroMedia?.publicUrl ? (
        <Image
          source={{ uri: story.heroMedia.publicUrl }}
          style={[styles.heroImage,{backgroundColor:palette.paperMuted},desktop && styles.heroImageDesktop]}
          accessibilityLabel={story.heroMedia.altText ?? story.title}
        />
      ) : null}
      <View style={[styles.heroBody,desktop && styles.heroBodyDesktop]}>
        <View style={styles.metaRow}>
          <Text style={[styles.kicker,{color:palette.blue}]}>{story.primarySection?.name ?? "HealthTimes"}</Text>
          {story.accessPolicy === "premium" && <PremiumBadge />}
        </View>
        <Text style={[styles.heroTitle,{color:palette.ink},desktop && styles.heroTitleDesktop]}>{story.title}</Text>
        {!!story.standfirst && <Text style={[styles.standfirst,{color:palette.inkMuted}]}>{story.standfirst}</Text>}
        <Text style={[styles.meta,{color:palette.inkMuted}]}>{story.author?.displayName ?? "HealthTimes"} · {formatDate(story.publishedAt)}</Text>
      </View>
    </Pressable>
  );
}

export function StoryCard({ story, compact = false }: { story: ArticleSummary; compact?: boolean }) {
  const router=useRouter();
  const { palette }=useAppearance();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={story.title}
      accessibilityHint="Opens the full HealthTimes article"
      style={[styles.storyCard,{borderBottomColor:palette.border}, compact && styles.storyCompact]}
      onPress={() => router.push(("/article/" + story.id) as never)}
    >
      {story.heroMedia?.publicUrl ? (
        <Image
          source={{ uri: story.heroMedia.publicUrl }}
          style={[styles.storyImage,{backgroundColor:palette.paperMuted}, compact && styles.storyImageCompact]}
          accessibilityLabel={story.heroMedia.altText ?? story.title}
        />
      ) : null}
      <View style={styles.storyBody}>
        <View style={styles.metaRow}>
          <Text style={[styles.kicker,{color:palette.blue}]}>{story.primarySection?.name ?? "HealthTimes"}</Text>
          {story.accessPolicy === "premium" && <PremiumBadge />}
        </View>
        <Text style={[styles.storyTitle,{color:palette.ink}]}>{story.title}</Text>
        {!compact && !!story.excerpt && <Text style={[styles.excerpt,{color:palette.inkMuted}]}>{story.excerpt}</Text>}
        <Text style={[styles.meta,{color:palette.inkMuted}]}>{story.author?.displayName ? story.author.displayName+" · " : ""}{formatDate(story.publishedAt)}</Text>
      </View>
    </Pressable>
  );
}

export function StoryGrid({ stories }: { stories: ArticleSummary[] }) {
  const { width }=useWindowDimensions();
  const tablet=width >= breakpoints.tablet;
  const desktop=width >= breakpoints.desktop;
  return (
    <View style={[styles.grid, tablet && styles.gridResponsive]}>
      {stories.map((story) => (
        <View
          key={story.id}
          style={desktop ? styles.gridItemDesktop : tablet ? styles.gridItemTablet : styles.gridItemMobile}
        >
          <StoryCard story={story} />
        </View>
      ))}
    </View>
  );
}

export function StoryList({ stories }: { stories: ArticleSummary[] }) {
  const { width }=useWindowDimensions();
  const desktop=width >= breakpoints.desktop;
  return (
    <View style={[styles.storyList,desktop && styles.storyListDesktop]}>
      {stories.map((story)=>(
        <View key={story.id} style={desktop ? styles.storyListItemDesktop : styles.storyListItem}>
          <StoryCard story={story} compact />
        </View>
      ))}
    </View>
  );
}

export function LiveRail({ items }: { items: LiveItem[] }) {
  const { palette }=useAppearance();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
      {items.map((item) => (
        <View style={[styles.liveCard,{borderColor:palette.border,backgroundColor:palette.paper}]} key={item.id}>
          {item.media?.publicUrl ? <Image source={{ uri:item.media.publicUrl }} style={styles.liveImage} accessibilityLabel={item.media.altText ?? item.title} /> : null}
          <View style={styles.liveBody}>
            <Text style={[styles.liveBadge,{backgroundColor:palette.live}]}>{item.status === "live" ? "LIVE" : "UPCOMING"}</Text>
            <Text style={[styles.liveTitle,{color:palette.ink}]}>{item.title}</Text>
            <Text style={[styles.meta,{color:palette.inkMuted}]}>{item.updateCount ? item.updateCount + " updates" : "HealthTimes Live"}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function verifiedVideoDestination(item:VideoItem){
  const value=item.sourceUrl?.trim();
  if(!value||!/^https:\/\//i.test(value)||/^https:\/\/(?:www\.)?healthtimes\.co\.zw\/?$/i.test(value)) return null;
  const unresolved=(item.sourceProvenance?.exceptions??[]).some((exception)=>exception.classification==="requires-review"&&exception.field==="sourceUrl");
  return unresolved?null:value;
}
export function VideoCard({item}:{item:VideoItem}){
  const{palette}=useAppearance();
  const duration=item.durationSeconds?Math.floor(item.durationSeconds/60)+":"+String(item.durationSeconds%60).padStart(2,"0"):"";
  const destination=verifiedVideoDestination(item);
  return (
    <Pressable style={styles.videoCard} disabled={!destination} accessibilityRole={destination?"link":undefined} accessibilityState={{disabled:!destination}} accessibilityLabel={destination?"Watch "+item.title:item.title+" video unavailable"} onPress={destination?()=>{void Linking.openURL(destination);}:undefined}>
      {item.thumbnail?.publicUrl?<Image source={{uri:item.thumbnail.publicUrl}} style={[styles.videoImage,{backgroundColor:palette.paperMuted}]} accessibilityLabel={item.thumbnail.altText??item.title}/>:<View style={[styles.videoFallback,{backgroundColor:palette.navy}]}><Text style={styles.videoFallbackBrand}>HealthTimes</Text><Text style={styles.videoFallbackLabel}>VIDEO</Text><Text style={styles.videoFallbackNote}>Thumbnail unavailable</Text></View>}
      {destination&&<View style={styles.playBadge}><Text style={styles.playText}>▶</Text></View>}
      {!!duration&&<View style={styles.duration}><Text style={styles.durationText}>{duration}</Text></View>}
      <Text style={[styles.videoTitle,{color:palette.ink}]}>{item.title}</Text>
      <View style={styles.videoMetaRow}>{!!item.publishedAt&&<Text style={[styles.meta,{color:palette.inkMuted}]}>{formatDate(item.publishedAt)}</Text>}<Text style={[styles.videoAction,{color:destination?palette.blue:palette.inkMuted}]}>{destination?"Watch video ↗":"Video unavailable"}</Text></View>
    </Pressable>
  );
}

export function AudioCard({ item }: { item: AudioItem }) {
  const { palette }=useAppearance();
  const minutes=item.durationSeconds ? Math.round(item.durationSeconds/60) : null;
  return (
    <View style={[styles.audioCard,{borderBottomColor:palette.border}]}>
      <View style={[styles.audioButton,{backgroundColor:palette.ink}]}><Text style={[styles.audioButtonText,{color:palette.paper}]}>▶</Text></View>
      <View style={{flex:1}}>
        <Text style={[styles.audioTitle,{color:palette.ink}]}>{item.title}</Text>
        <Text style={[styles.meta,{color:palette.inkMuted}]}>{minutes ? minutes + " min" : "Audio"} · {formatDate(item.publishedAt)}</Text>
      </View>
    </View>
  );
}

export function AdSlot({
  placement,
  sensitiveHealthContext = true
}: {
  placement: AdPlacementKey;
  sensitiveHealthContext?: boolean;
}) {
  const { palette }=useAppearance();
  const decision=useAsync(
    ()=>services.advertising.getDecision(placement,{
      consentForPersonalizedAds:false,
      sensitiveHealthContext
    }),
    [placement,sensitiveHealthContext]
  );

  const adDecision=decision.data;
  if(!adDecision || adDecision.source === "none") return null;
  const message=adDecision.policyReason ?? "Advertising delivery is controlled by the HealthTimes advertising service.";

  return (
    <View
      style={[styles.adSlot,{backgroundColor:palette.paperMuted,borderColor:palette.border}]}
      accessibilityLabel={"Advertising placement " + placement}
    >
      <Text style={[styles.adLabel,{color:palette.inkMuted}]}>ADVERTISEMENT</Text>
      <Text style={[styles.adPlacement,{color:palette.ink}]}>{adDecision.disclosureLabel ?? "Sponsored"}</Text>
      <Text style={[styles.adMessage,{color:palette.inkMuted}]}>{message}</Text>
    </View>
  );
}

export function PremiumBadge() {
  return <Text style={styles.premiumBadge}>PREMIUM</Text>;
}

export function Surface({ children }: PropsWithChildren) {
  const { palette }=useAppearance();
  return <View style={[styles.surface,{borderColor:palette.border,backgroundColor:palette.paper}]}>{children}</View>;
}

const styles=StyleSheet.create({
  hero:{borderBottomWidth:1,paddingBottom:spacing.xl},
  heroDesktop:{flexDirection:"row",alignItems:"stretch",gap:spacing.xl,paddingTop:spacing.lg},
  heroImage:{width:"100%",aspectRatio:16/9},
  heroImageDesktop:{width:"59%",aspectRatio:16/10},
  heroBody:{paddingTop:spacing.lg,gap:spacing.sm},
  heroBodyDesktop:{flex:1,paddingTop:spacing.sm,justifyContent:"center",paddingRight:spacing.lg},
  heroTitle:{fontSize:type.hero,fontWeight:"900",lineHeight:38,letterSpacing:-0.7,maxWidth:900},
  heroTitleDesktop:{fontSize:40,lineHeight:46,letterSpacing:-1},
  standfirst:{fontSize:type.standfirst,lineHeight:24,maxWidth:820},
  metaRow:{flexDirection:"row",alignItems:"center",gap:spacing.sm,flexWrap:"wrap"},
  kicker:{fontSize:type.label,fontWeight:"900",textTransform:"uppercase",letterSpacing:0.8},
  meta:{fontSize:type.meta},
  storyCard:{borderBottomWidth:1,paddingBottom:spacing.lg,gap:spacing.md},
  storyCompact:{flexDirection:"row",alignItems:"flex-start"},
  storyImage:{width:"100%",aspectRatio:16/9},
  storyImageCompact:{width:132,height:92,aspectRatio:undefined},
  storyBody:{gap:spacing.xs,flex:1},
  storyTitle:{fontSize:type.story,lineHeight:25,fontWeight:"900"},
  excerpt:{fontSize:14,lineHeight:21},
  grid:{gap:spacing.xl},
  gridResponsive:{flexDirection:"row",flexWrap:"wrap"},
  gridItemDesktop:{width:"31.7%"},
  gridItemTablet:{width:"48%"},
  gridItemMobile:{width:"100%"},
  storyList:{gap:spacing.lg},
  storyListDesktop:{flexDirection:"row",flexWrap:"wrap",columnGap:spacing.xl},
  storyListItem:{width:"100%"},
  storyListItemDesktop:{width:"48.8%"},
  rail:{gap:spacing.md,paddingRight:spacing.lg},
  liveCard:{width:300,borderWidth:1,borderRadius:radius.md,overflow:"hidden"},
  liveImage:{width:"100%",height:148},
  liveBody:{padding:spacing.md,gap:spacing.xs},
  liveBadge:{alignSelf:"flex-start",fontSize:11,fontWeight:"900",color:"#FFFFFF",paddingHorizontal:7,paddingVertical:4,borderRadius:4,letterSpacing:0.8},
  liveTitle:{fontSize:18,lineHeight:23,fontWeight:"900"},
  videoCard:{gap:spacing.sm,position:"relative"},
  videoImage:{width:"100%",aspectRatio:16/9},
  videoFallback:{width:"100%",aspectRatio:16/9,alignItems:"center",justifyContent:"center",padding:spacing.xl,gap:4},
  videoFallbackBrand:{color:"#FFFFFF",fontSize:22,fontWeight:"900",letterSpacing:-.5},
  videoFallbackLabel:{color:"#69D1C5",fontSize:10,fontWeight:"900",letterSpacing:1.8},
  videoFallbackNote:{color:"#C9D5E1",fontSize:10,lineHeight:15,textAlign:"center",maxWidth:260,marginTop:spacing.sm},
  playBadge:{position:"absolute",left:12,top:12,width:42,height:42,borderRadius:21,backgroundColor:"rgba(7,26,43,0.86)",alignItems:"center",justifyContent:"center"},
  playText:{color:"#FFFFFF",fontSize:16},
  duration:{position:"absolute",right:8,top:8,backgroundColor:"rgba(7,26,43,0.86)",paddingHorizontal:6,paddingVertical:4,borderRadius:4},
  durationText:{color:"#FFFFFF",fontSize:11,fontWeight:"800"},
  videoTitle:{fontSize:18,fontWeight:"900",lineHeight:23},
  videoMetaRow:{flexDirection:"row",alignItems:"center",gap:spacing.sm,flexWrap:"wrap"},
  videoAction:{fontSize:10,fontWeight:"900",letterSpacing:.5},
  audioCard:{flexDirection:"row",alignItems:"center",gap:spacing.md,borderBottomWidth:1,paddingVertical:spacing.lg},
  audioButton:{width:52,height:52,borderRadius:26,alignItems:"center",justifyContent:"center"},
  audioButtonText:{fontSize:18},
  audioTitle:{fontSize:17,fontWeight:"900",lineHeight:22},
  adSlot:{minHeight:136,borderTopWidth:1,borderBottomWidth:1,alignItems:"center",justifyContent:"center",padding:spacing.lg,gap:spacing.xs},
  adLabel:{fontSize:9,fontWeight:"900",letterSpacing:1.4},
  adPlacement:{fontSize:13,fontWeight:"800"},
  adMessage:{fontSize:12,lineHeight:18,textAlign:"center",maxWidth:520},
  premiumBadge:{fontSize:10,fontWeight:"900",letterSpacing:0.8,color:colors.premium,borderWidth:1,borderColor:colors.premium,paddingHorizontal:6,paddingVertical:3,borderRadius:4},
  surface:{borderWidth:1,borderRadius:radius.md,padding:spacing.lg}
});
