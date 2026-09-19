import type { PropsWithChildren } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import type { ArticleSummary, AudioItem, LiveItem, VideoItem } from "../domain/models";
import { breakpoints, colors, layout, radius, spacing, type } from "../theme/tokens";

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function HeroStory({ story }: { story: ArticleSummary }) {
  const router=useRouter();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={story.title}
      accessibilityHint="Opens the full HealthTimes article"
      style={styles.hero}
      onPress={() => router.push(("/article/" + story.id) as never)}
    >
      {story.heroMedia?.publicUrl ? (
        <Image source={{ uri: story.heroMedia.publicUrl }} style={styles.heroImage} accessibilityLabel={story.heroMedia.altText ?? story.title} />
      ) : null}
      <View style={styles.heroBody}>
        <View style={styles.metaRow}>
          <Text style={styles.kicker}>{story.primarySection?.name ?? "HealthTimes"}</Text>
          {story.accessPolicy === "premium" && <PremiumBadge />}
        </View>
        <Text style={styles.heroTitle}>{story.title}</Text>
        {!!story.standfirst && <Text style={styles.standfirst}>{story.standfirst}</Text>}
        <Text style={styles.meta}>{story.author?.displayName ?? "HealthTimes"} · {formatDate(story.publishedAt)}</Text>
      </View>
    </Pressable>
  );
}

export function StoryCard({ story, compact = false }: { story: ArticleSummary; compact?: boolean }) {
  const router=useRouter();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={story.title}
      accessibilityHint="Opens the full HealthTimes article"
      style={[styles.storyCard, compact && styles.storyCompact]}
      onPress={() => router.push(("/article/" + story.id) as never)}
    >
      {story.heroMedia?.publicUrl ? (
        <Image source={{ uri: story.heroMedia.publicUrl }} style={[styles.storyImage, compact && styles.storyImageCompact]} accessibilityLabel={story.heroMedia.altText ?? story.title} />
      ) : null}
      <View style={styles.storyBody}>
        <View style={styles.metaRow}>
          <Text style={styles.kicker}>{story.primarySection?.name ?? "HealthTimes"}</Text>
          {story.accessPolicy === "premium" && <PremiumBadge />}
        </View>
        <Text style={styles.storyTitle}>{story.title}</Text>
        {!compact && !!story.excerpt && <Text style={styles.excerpt}>{story.excerpt}</Text>}
        <Text style={styles.meta}>{formatDate(story.publishedAt)}</Text>
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
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
      {items.map((item) => (
        <View style={styles.liveCard} key={item.id}>
          {item.media?.publicUrl ? <Image source={{ uri:item.media.publicUrl }} style={styles.liveImage} /> : null}
          <View style={styles.liveBody}>
            <Text style={styles.liveBadge}>{item.status === "live" ? "LIVE" : "UPCOMING"}</Text>
            <Text style={styles.liveTitle}>{item.title}</Text>
            <Text style={styles.meta}>{item.updateCount ? item.updateCount + " updates" : "HealthTimes Live"}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

export function VideoCard({ item }: { item: VideoItem }) {
  const duration=item.durationSeconds ? Math.floor(item.durationSeconds/60) + ":" + String(item.durationSeconds%60).padStart(2,"0") : "";
  return (
    <View style={styles.videoCard}>
      {item.thumbnail?.publicUrl ? <Image source={{uri:item.thumbnail.publicUrl}} style={styles.videoImage} /> : null}
      <View style={styles.playBadge}><Text style={styles.playText}>▶</Text></View>
      {!!duration && <View style={styles.duration}><Text style={styles.durationText}>{duration}</Text></View>}
      <Text style={styles.videoTitle}>{item.title}</Text>
      <Text style={styles.meta}>{formatDate(item.publishedAt)}</Text>
    </View>
  );
}

export function AudioCard({ item }: { item: AudioItem }) {
  const minutes=item.durationSeconds ? Math.round(item.durationSeconds/60) : null;
  return (
    <View style={styles.audioCard}>
      <View style={styles.audioButton}><Text style={styles.audioButtonText}>▶</Text></View>
      <View style={{flex:1}}>
        <Text style={styles.audioTitle}>{item.title}</Text>
        <Text style={styles.meta}>{minutes ? minutes + " min" : "Audio"} · {formatDate(item.publishedAt)}</Text>
      </View>
    </View>
  );
}

export function AdSlot({ placement, message="Reserved inventory. Delivery is controlled by AdvertisingService." }: { placement: string; message?: string }) {
  return (
    <View style={styles.adSlot}>
      <Text style={styles.adLabel}>ADVERTISEMENT</Text>
      <Text style={styles.adPlacement}>{placement}</Text>
      <Text style={styles.adMessage}>{message}</Text>
    </View>
  );
}

export function PremiumBadge() {
  return <Text style={styles.premiumBadge}>PREMIUM</Text>;
}

export function Surface({ children }: PropsWithChildren) {
  return <View style={styles.surface}>{children}</View>;
}

const styles=StyleSheet.create({
  hero:{borderBottomWidth:1,borderBottomColor:colors.border,paddingBottom:spacing.xl},
  heroImage:{width:"100%",aspectRatio:16/9,backgroundColor:colors.paperMuted},
  heroBody:{paddingTop:spacing.lg,gap:spacing.sm},
  heroTitle:{fontSize:type.hero,fontWeight:"900",lineHeight:38,color:colors.ink,letterSpacing:-0.7,maxWidth:900},
  standfirst:{fontSize:type.standfirst,lineHeight:24,color:colors.inkMuted,maxWidth:820},
  metaRow:{flexDirection:"row",alignItems:"center",gap:spacing.sm,flexWrap:"wrap"},
  kicker:{fontSize:type.label,fontWeight:"900",color:colors.blue,textTransform:"uppercase",letterSpacing:0.8},
  meta:{fontSize:type.meta,color:colors.inkMuted},
  storyCard:{borderBottomWidth:1,borderBottomColor:colors.border,paddingBottom:spacing.lg,gap:spacing.md},
  storyCompact:{flexDirection:"row"},
  storyImage:{width:"100%",aspectRatio:16/9,backgroundColor:colors.paperMuted},
  storyImageCompact:{width:128,height:88,aspectRatio:undefined},
  storyBody:{gap:spacing.xs,flex:1},
  storyTitle:{fontSize:type.story,lineHeight:25,fontWeight:"900",color:colors.ink},
  excerpt:{fontSize:14,lineHeight:21,color:colors.inkMuted},
  grid:{gap:spacing.xl},
  gridResponsive:{flexDirection:"row",flexWrap:"wrap"},
  gridItemDesktop:{width:"31.7%"},
  gridItemTablet:{width:"48%"},
  gridItemMobile:{width:"100%"},
  rail:{gap:spacing.md,paddingRight:spacing.lg},
  liveCard:{width:285,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,overflow:"hidden",backgroundColor:colors.paper},
  liveImage:{width:"100%",height:140},
  liveBody:{padding:spacing.md,gap:spacing.xs},
  liveBadge:{alignSelf:"flex-start",fontSize:11,fontWeight:"900",color:"#FFFFFF",backgroundColor:colors.live,paddingHorizontal:7,paddingVertical:4,borderRadius:4,letterSpacing:0.8},
  liveTitle:{fontSize:18,lineHeight:23,fontWeight:"900",color:colors.ink},
  videoCard:{gap:spacing.sm,position:"relative"},
  videoImage:{width:"100%",aspectRatio:16/9,backgroundColor:colors.paperMuted},
  playBadge:{position:"absolute",left:12,top:12,width:42,height:42,borderRadius:21,backgroundColor:"rgba(7,26,43,0.86)",alignItems:"center",justifyContent:"center"},
  playText:{color:"#FFFFFF",fontSize:16},
  duration:{position:"absolute",right:8,top:8,backgroundColor:"rgba(7,26,43,0.86)",paddingHorizontal:6,paddingVertical:4,borderRadius:4},
  durationText:{color:"#FFFFFF",fontSize:11,fontWeight:"800"},
  videoTitle:{fontSize:18,fontWeight:"900",lineHeight:23,color:colors.ink},
  audioCard:{flexDirection:"row",alignItems:"center",gap:spacing.md,borderBottomWidth:1,borderBottomColor:colors.border,paddingVertical:spacing.lg},
  audioButton:{width:52,height:52,borderRadius:26,backgroundColor:colors.ink,alignItems:"center",justifyContent:"center"},
  audioButtonText:{color:"#FFFFFF",fontSize:18},
  audioTitle:{fontSize:17,fontWeight:"900",color:colors.ink,lineHeight:22},
  adSlot:{minHeight:140,backgroundColor:colors.adSurface,borderTopWidth:1,borderBottomWidth:1,borderColor:colors.border,alignItems:"center",justifyContent:"center",padding:spacing.lg,gap:spacing.xs},
  adLabel:{fontSize:10,fontWeight:"900",letterSpacing:1.2,color:colors.inkMuted},
  adPlacement:{fontSize:13,fontWeight:"800",color:colors.ink},
  adMessage:{fontSize:12,color:colors.inkMuted,textAlign:"center",maxWidth:520},
  premiumBadge:{fontSize:10,fontWeight:"900",letterSpacing:0.8,color:colors.premium,borderWidth:1,borderColor:colors.premium,paddingHorizontal:6,paddingVertical:3,borderRadius:4},
  surface:{borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.lg,backgroundColor:colors.paper}
});
