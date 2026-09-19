import type { PropsWithChildren } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
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
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={story.title}
      accessibilityHint="Opens the full HealthTimes article"
      style={[styles.hero,{borderBottomColor:palette.border}]}
      onPress={() => router.push(("/article/" + story.id) as never)}
    >
      {story.heroMedia?.publicUrl ? (
        <Image source={{ uri: story.heroMedia.publicUrl }} style={[styles.heroImage,{backgroundColor:palette.paperMuted}]} accessibilityLabel={story.heroMedia.altText ?? story.title} />
      ) : null}
      <View style={styles.heroBody}>
        <View style={styles.metaRow}>
          <Text style={[styles.kicker,{color:palette.blue}]}>{story.primarySection?.name ?? "HealthTimes"}</Text>
          {story.accessPolicy === "premium" && <PremiumBadge />}
        </View>
        <Text style={[styles.heroTitle,{color:palette.ink}]}>{story.title}</Text>
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
        <Text style={[styles.meta,{color:palette.inkMuted}]}>{formatDate(story.publishedAt)}</Text>
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

export function VideoCard({ item }: { item: VideoItem }) {
  const { palette }=useAppearance();
  const duration=item.durationSeconds ? Math.floor(item.durationSeconds/60) + ":" + String(item.durationSeconds%60).padStart(2,"0") : "";
  return (
    <View style={styles.videoCard}>
      {item.thumbnail?.publicUrl ? <Image source={{uri:item.thumbnail.publicUrl}} style={[styles.videoImage,{backgroundColor:palette.paperMuted}]} accessibilityLabel={item.thumbnail.altText ?? item.title} /> : null}
      <View style={styles.playBadge}><Text style={styles.playText}>▶</Text></View>
      {!!duration && <View style={styles.duration}><Text style={styles.durationText}>{duration}</Text></View>}
      <Text style={[styles.videoTitle,{color:palette.ink}]}>{item.title}</Text>
      <Text style={[styles.meta,{color:palette.inkMuted}]}>{formatDate(item.publishedAt)}</Text>
    </View>
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

  const message=decision.data?.policyReason ??
    "Reserved inventory. Delivery is controlled by AdvertisingService.";

  return (
    <View style={[styles.adSlot,{backgroundColor:palette.paperMuted,borderColor:palette.border}]}>
      <Text style={[styles.adLabel,{color:palette.inkMuted}]}>
        {decision.data?.source === "none" ? "AD INVENTORY" : decision.data?.disclosureLabel ?? "ADVERTISEMENT"}
      </Text>
      <Text style={[styles.adPlacement,{color:palette.ink}]}>{placement}</Text>
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
  heroImage:{width:"100%",aspectRatio:16/9},
  heroBody:{paddingTop:spacing.lg,gap:spacing.sm},
  heroTitle:{fontSize:type.hero,fontWeight:"900",lineHeight:38,letterSpacing:-0.7,maxWidth:900},
  standfirst:{fontSize:type.standfirst,lineHeight:24,maxWidth:820},
  metaRow:{flexDirection:"row",alignItems:"center",gap:spacing.sm,flexWrap:"wrap"},
  kicker:{fontSize:type.label,fontWeight:"900",textTransform:"uppercase",letterSpacing:0.8},
  meta:{fontSize:type.meta},
  storyCard:{borderBottomWidth:1,paddingBottom:spacing.lg,gap:spacing.md},
  storyCompact:{flexDirection:"row"},
  storyImage:{width:"100%",aspectRatio:16/9},
  storyImageCompact:{width:128,height:88,aspectRatio:undefined},
  storyBody:{gap:spacing.xs,flex:1},
  storyTitle:{fontSize:type.story,lineHeight:25,fontWeight:"900"},
  excerpt:{fontSize:14,lineHeight:21},
  grid:{gap:spacing.xl},
  gridResponsive:{flexDirection:"row",flexWrap:"wrap"},
  gridItemDesktop:{width:"31.7%"},
  gridItemTablet:{width:"48%"},
  gridItemMobile:{width:"100%"},
  rail:{gap:spacing.md,paddingRight:spacing.lg},
  liveCard:{width:285,borderWidth:1,borderRadius:radius.md,overflow:"hidden"},
  liveImage:{width:"100%",height:140},
  liveBody:{padding:spacing.md,gap:spacing.xs},
  liveBadge:{alignSelf:"flex-start",fontSize:11,fontWeight:"900",color:"#FFFFFF",paddingHorizontal:7,paddingVertical:4,borderRadius:4,letterSpacing:0.8},
  liveTitle:{fontSize:18,lineHeight:23,fontWeight:"900"},
  videoCard:{gap:spacing.sm,position:"relative"},
  videoImage:{width:"100%",aspectRatio:16/9},
  playBadge:{position:"absolute",left:12,top:12,width:42,height:42,borderRadius:21,backgroundColor:"rgba(7,26,43,0.86)",alignItems:"center",justifyContent:"center"},
  playText:{color:"#FFFFFF",fontSize:16},
  duration:{position:"absolute",right:8,top:8,backgroundColor:"rgba(7,26,43,0.86)",paddingHorizontal:6,paddingVertical:4,borderRadius:4},
  durationText:{color:"#FFFFFF",fontSize:11,fontWeight:"800"},
  videoTitle:{fontSize:18,fontWeight:"900",lineHeight:23},
  audioCard:{flexDirection:"row",alignItems:"center",gap:spacing.md,borderBottomWidth:1,paddingVertical:spacing.lg},
  audioButton:{width:52,height:52,borderRadius:26,alignItems:"center",justifyContent:"center"},
  audioButtonText:{fontSize:18},
  audioTitle:{fontSize:17,fontWeight:"900",lineHeight:22},
  adSlot:{minHeight:140,borderTopWidth:1,borderBottomWidth:1,alignItems:"center",justifyContent:"center",padding:spacing.lg,gap:spacing.xs},
  adLabel:{fontSize:10,fontWeight:"900",letterSpacing:1.2},
  adPlacement:{fontSize:13,fontWeight:"800"},
  adMessage:{fontSize:12,textAlign:"center",maxWidth:520},
  premiumBadge:{fontSize:10,fontWeight:"900",letterSpacing:0.8,color:colors.premium,borderWidth:1,borderColor:colors.premium,paddingHorizontal:6,paddingVertical:3,borderRadius:4},
  surface:{borderWidth:1,borderRadius:radius.md,padding:spacing.lg}
});
