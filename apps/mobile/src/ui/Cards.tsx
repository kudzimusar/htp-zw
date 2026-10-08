import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import type { AdPlacementKey, ArticleSummary, AudioItem, LiveItem, VideoItem } from "../domain/models";
import { breakpoints, radius, spacing, type } from "../theme/tokens";
import { useAppearance } from "../theme/AppearanceProvider";
import { services } from "../services";
import { useAsync } from "../hooks/useAsync";
import { event } from "../growth/events";

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function useHydratedCardWidth() {
  const { width }=useWindowDimensions();
  const [responsiveReady,setResponsiveReady]=useState(Platform.OS!=="web");
  useEffect(()=>{ if(Platform.OS==="web") setResponsiveReady(true); },[]);
  return responsiveReady ? width : 0;
}

export function HeroStory({ story }: { story: ArticleSummary }) {
  const router=useRouter();
  const { palette }=useAppearance();
  const width=useHydratedCardWidth();
  const phone=width < breakpoints.tablet;
  const tablet=width >= breakpoints.tablet && width < breakpoints.desktop;
  const desktop=width >= breakpoints.desktop;
  const [mediaFailed,setMediaFailed]=useState(false);
  const hasMedia=Boolean(story.heroMedia?.publicUrl) && !mediaFailed;
  const imageHeadline=phone && hasMedia;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={story.title}
      accessibilityHint="Opens the full HealthTimes article"
      style={[
        styles.hero,
        imageHeadline && styles.heroPhoneMedia,
        tablet && styles.heroTablet,
        desktop && styles.heroDesktop
      ]}
      onPress={() => router.push(("/article/" + story.id) as never)}
    >
      {hasMedia && story.heroMedia?.publicUrl ? (
        <Image
          source={{ uri: story.heroMedia.publicUrl }}
          resizeMode="cover"
          onError={()=>setMediaFailed(true)}
          style={[
            styles.heroImage,
            {backgroundColor:palette.paperMuted},
            phone && styles.heroImagePhone,
            tablet && styles.heroImageTablet,
            desktop && styles.heroImageDesktop
          ]}
          accessibilityLabel={story.heroMedia.altText ?? story.title}
        />
      ) : null}
      <View style={[
        styles.heroBody,
        imageHeadline && styles.heroBodyOverlay,
        tablet && styles.heroBodyTablet,
        desktop && styles.heroBodyDesktop
      ]}>
        <View style={styles.metaRow}>
          <Text style={[styles.kicker,{color:imageHeadline?"#D9F5F3":palette.blue}]}>{story.primarySection?.name ?? "HealthTimes"}</Text>
          {story.accessPolicy === "premium" && <PremiumBadge />}
        </View>
        <Text
          numberOfLines={imageHeadline ? 4 : undefined}
          style={[
            styles.heroTitle,
            {color:imageHeadline?"#FFFFFF":palette.ink},
            imageHeadline && styles.heroTitleOverlay,
            tablet && styles.heroTitleTablet,
            desktop && styles.heroTitleDesktop
          ]}
        >
          {story.title}
        </Text>
        {!imageHeadline && !!story.standfirst && <Text style={[styles.standfirst,{color:palette.inkMuted}]}>{story.standfirst}</Text>}
        <Text style={[styles.meta,{color:imageHeadline?"#E7EDF3":palette.inkMuted}]}>
          {story.author?.displayName ?? "HealthTimes"} · {formatDate(story.publishedAt)}
        </Text>
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
function isYouTubeDestination(value:string|null){
  return Boolean(value && /^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(value));
}
function videoActionLabel(destination:string|null){
  if(!destination) return "Video unavailable";
  return isYouTubeDestination(destination) ? "Watch on YouTube ↗" : "Watch video ↗";
}
function videoAccessibilityLabel(item:VideoItem,destination:string|null){
  if(!destination) return item.title+" video unavailable";
  return isYouTubeDestination(destination) ? "Watch "+item.title+" on YouTube" : "Watch "+item.title;
}
function renderableVideoThumbnail(item:VideoItem){
  const value=item.thumbnail?.publicUrl?.trim() ?? "";
  if(!value) return null;
  // The accepted source snapshot records YouTube maxres thumbnail references, but
  // those provider assets are not guaranteed to exist. Do not create a broken
  // resource request or derive an unverified replacement thumbnail URL.
  if(/^https:\/\/img\.youtube\.com\//i.test(value)) return null;
  return value;
}

export function FeaturedVideoCard({item}:{item:VideoItem}){
  const { palette }=useAppearance();
  const { width }=useWindowDimensions();
  const [thumbnailFailed,setThumbnailFailed]=useState(false);
  const desktop=width>=breakpoints.desktop;
  const duration=item.durationSeconds?Math.floor(item.durationSeconds/60)+":"+String(item.durationSeconds%60).padStart(2,"0"):"";
  const destination=verifiedVideoDestination(item);
  const thumbnailUrl=renderableVideoThumbnail(item);
  const showThumbnail=Boolean(thumbnailUrl)&&!thumbnailFailed;
  return (
    <Pressable
      style={[styles.featuredVideo,desktop&&styles.featuredVideoDesktop,{borderColor:palette.border}]}
      disabled={!destination}
      accessibilityRole={destination?"link":undefined}
      accessibilityState={{disabled:!destination}}
      accessibilityLabel={videoAccessibilityLabel(item,destination)}
      accessibilityHint={destination?"Opens the published video destination":undefined}
      onPress={destination?()=>{void Linking.openURL(destination);}:undefined}
    >
      <View style={[styles.featuredVideoMedia,desktop&&styles.featuredVideoMediaDesktop]}>
        {showThumbnail&&thumbnailUrl ? (
          <Image
            source={{uri:thumbnailUrl}}
            style={[styles.featuredVideoImage,{backgroundColor:palette.paperMuted}]}
            accessibilityLabel={item.thumbnail?.altText??item.title}
            onError={()=>setThumbnailFailed(true)}
          />
        ) : (
          <View style={[styles.featuredVideoFallback,{backgroundColor:palette.navy}]}>
            <Text style={styles.videoFallbackBrand}>HealthTimes</Text>
            <Text style={styles.videoFallbackLabel}>VIDEO</Text>
            <Text style={styles.videoFallbackNote}>HealthTimes video</Text>
          </View>
        )}
        {destination&&<View style={styles.featuredPlayBadge}><Text style={styles.featuredPlayText}>▶</Text></View>}
        {!!duration&&<View style={styles.duration}><Text style={styles.durationText}>{duration}</Text></View>}
      </View>
      <View style={[styles.featuredVideoBody,desktop&&styles.featuredVideoBodyDesktop]}>
        <Text style={[styles.kicker,{color:palette.blue}]}>FEATURED VIDEO</Text>
        <Text style={[styles.featuredVideoTitle,{color:palette.ink}]}>{item.title}</Text>
        {!!item.publishedAt&&<Text style={[styles.meta,{color:palette.inkMuted}]}>{formatDate(item.publishedAt)}</Text>}
        <Text style={[styles.featuredVideoAction,{color:destination?palette.blue:palette.inkMuted}]}>{videoActionLabel(destination)}</Text>
      </View>
    </Pressable>
  );
}

export function VideoCard({item}:{item:VideoItem}){
  const{palette}=useAppearance();
  const [thumbnailFailed,setThumbnailFailed]=useState(false);
  const duration=item.durationSeconds?Math.floor(item.durationSeconds/60)+":"+String(item.durationSeconds%60).padStart(2,"0"):"";
  const destination=verifiedVideoDestination(item);
  const thumbnailUrl=renderableVideoThumbnail(item);
  const showThumbnail=Boolean(thumbnailUrl)&&!thumbnailFailed;
  return (
    <Pressable
      style={styles.videoCard}
      disabled={!destination}
      accessibilityRole={destination?"link":undefined}
      accessibilityState={{disabled:!destination}}
      accessibilityLabel={videoAccessibilityLabel(item,destination)}
      accessibilityHint={destination?"Opens the published video destination":undefined}
      onPress={destination?()=>{void Linking.openURL(destination);}:undefined}
    >
      {showThumbnail&&thumbnailUrl ? (
        <Image
          source={{uri:thumbnailUrl}}
          style={[styles.videoImage,{backgroundColor:palette.paperMuted}]}
          accessibilityLabel={item.thumbnail?.altText??item.title}
          onError={()=>setThumbnailFailed(true)}
        />
      ) : (
        <View style={[styles.videoFallback,{backgroundColor:palette.navy}]}>
          <Text style={styles.videoFallbackBrand}>HealthTimes</Text>
          <Text style={styles.videoFallbackLabel}>VIDEO</Text>
          <Text style={styles.videoFallbackNote}>HealthTimes video</Text>
        </View>
      )}
      {destination&&<View style={styles.playBadge}><Text style={styles.playText}>▶</Text></View>}
      {!!duration&&<View style={styles.duration}><Text style={styles.durationText}>{duration}</Text></View>}
      <Text style={[styles.videoTitle,{color:palette.ink}]}>{item.title}</Text>
      <View style={styles.videoMetaRow}>
        {!!item.publishedAt&&<Text style={[styles.meta,{color:palette.inkMuted}]}>{formatDate(item.publishedAt)}</Text>}
        <Text style={[styles.videoAction,{color:destination?palette.blue:palette.inkMuted}]}>{videoActionLabel(destination)}</Text>
      </View>
    </Pressable>
  );
}

export function AudioCard({ item }: { item: AudioItem }) {
  const { palette }=useAppearance();
  const minutes=item.durationSeconds ? Math.round(item.durationSeconds/60) : null;
  return (
    <View
      style={[styles.audioCard,{borderBottomColor:palette.border}]}
      accessibilityLabel={item.title+". Audio playback unavailable."}
    >
      <View style={[styles.audioTypeBadge,{borderColor:palette.border,backgroundColor:palette.paperMuted}]}>
        <Text style={[styles.audioTypeText,{color:palette.inkMuted}]}>AUDIO</Text>
      </View>
      <View style={styles.audioCopy}>
        <Text style={[styles.audioTitle,{color:palette.ink}]}>{item.title}</Text>
        {(minutes||item.publishedAt) ? (
          <Text style={[styles.meta,{color:palette.inkMuted}]}>
            {minutes ? minutes+" min" : ""}
            {minutes&&item.publishedAt ? " · " : ""}
            {item.publishedAt ? formatDate(item.publishedAt) : ""}
          </Text>
        ) : null}
        <Text style={[styles.audioUnavailable,{color:palette.inkMuted}]}>Playback unavailable</Text>
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
  const { width }=useWindowDimensions();
  const impressionKey=useRef("");
  const [creativeAspect,setCreativeAspect]=useState<number|null>(null);
  const decision=useAsync(
    ()=>services.advertising.getDecision(placement,{
      consentForPersonalizedAds:false,
      sensitiveHealthContext
    }),
    [placement,sensitiveHealthContext]
  );

  const adDecision=decision.data;

  useEffect(()=>{
    setCreativeAspect(null);
  },[adDecision?.creativeUrl]);

  useEffect(()=>{
    if(adDecision?.source!=="direct" || !adDecision.creativeUrl) return;
    const key=placement+"|"+adDecision.creativeUrl;
    if(impressionKey.current===key) return;
    impressionKey.current=key;
    void services.analytics.track(event("ad_impression",{
      surface:"reader",
      placement_key:placement,
      direct_ad_source:"direct"
    }));
  },[placement,adDecision?.source,adDecision?.creativeUrl]);

  if(!adDecision || adDecision.source === "none" || !adDecision.creativeUrl) return null;

  const destination=adDecision.destinationUrl?.trim() ?? "";
  const clickable=/^https:\/\//i.test(destination);
  const desktop=width>=breakpoints.desktop;
  const tablet=width>=breakpoints.tablet && !desktop;
  const inArticle=placement==="article_after_intro";
  const articleEnd=placement==="article_end";
  const fallbackAspect=inArticle && width<breakpoints.tablet ? 6/5 : desktop ? 8/1 : tablet ? 6/1 : 16/3;

  const openDestination=()=>{
    if(!clickable) return;
    void services.analytics.track(event("ad_click",{
      surface:"reader",
      placement_key:placement,
      direct_ad_source:"direct"
    }));
    void Linking.openURL(destination);
  };

  const creative=(
    <Image
      source={{uri:adDecision.creativeUrl}}
      style={[
        styles.adCreative,
        {backgroundColor:palette.paper,aspectRatio:creativeAspect ?? fallbackAspect}
      ]}
      resizeMode="contain"
      onLoad={(event)=>{
        const source=event.nativeEvent.source;
        const naturalWidth=Number(source?.width ?? 0);
        const naturalHeight=Number(source?.height ?? 0);
        if(naturalWidth>0 && naturalHeight>0) setCreativeAspect(naturalWidth/naturalHeight);
      }}
      accessibilityLabel={adDecision.disclosureLabel || "Advertisement"}
    />
  );

  return (
    <View
      style={[
        styles.adSlot,
        {backgroundColor:palette.paperMuted,borderColor:palette.border},
        inArticle && styles.adSlotInArticle,
        inArticle && width<breakpoints.tablet && styles.adSlotMobileRectangle,
        inArticle && tablet && styles.adSlotTablet,
        inArticle && desktop && styles.adSlotDesktop,
        articleEnd && styles.adSlotArticleEnd
      ]}
      accessibilityLabel={adDecision.disclosureLabel || "Advertisement"}
    >
      <Text style={[styles.adLabel,{color:palette.inkMuted}]}>ADVERTISEMENT</Text>
      {!!adDecision.disclosureLabel && <Text style={[styles.adPlacement,{color:palette.ink}]}>{adDecision.disclosureLabel}</Text>}
      {clickable ? (
        <Pressable accessibilityRole="link" accessibilityLabel={"Open "+adDecision.disclosureLabel} onPress={openDestination} style={styles.adCreativePressable}>
          {creative}
        </Pressable>
      ) : creative}
      {!clickable && adDecision.source==="direct" && (
        <Text style={[styles.adNoDestination,{color:palette.inkMuted}]}>No verified destination is available for this advertisement.</Text>
      )}
    </View>
  );
}
export function PremiumBadge() {
  const { palette }=useAppearance();
  return <Text style={[styles.premiumBadge,{color:palette.premium,borderColor:palette.premium}]}>PREMIUM</Text>;
}

export function Surface({ children }: PropsWithChildren) {
  const { palette }=useAppearance();
  return <View style={[styles.surface,{borderColor:palette.border,backgroundColor:palette.paper}]}>{children}</View>;
}

const styles=StyleSheet.create({
  hero:{paddingBottom:spacing.xl,position:"relative"},
  heroPhoneMedia:{paddingBottom:0,overflow:"hidden"},
  heroTablet:{flexDirection:"row",alignItems:"stretch",gap:spacing.lg,paddingTop:spacing.md},
  heroDesktop:{flexDirection:"row",alignItems:"stretch",gap:spacing.xl,paddingTop:spacing.lg},
  heroImage:{width:"100%",aspectRatio:16/9},
  heroImagePhone:{aspectRatio:4/3},
  heroImageTablet:{width:"56%",aspectRatio:4/3},
  heroImageDesktop:{width:"59%",aspectRatio:16/10},
  heroBody:{paddingTop:spacing.lg,gap:spacing.sm},
  heroBodyOverlay:{position:"absolute",left:0,right:0,bottom:0,paddingHorizontal:spacing.lg,paddingTop:spacing.xxl,paddingBottom:spacing.lg,backgroundColor:"rgba(7,26,43,0.76)"},
  heroBodyTablet:{flex:1,paddingTop:spacing.sm,justifyContent:"center",paddingRight:spacing.sm},
  heroBodyDesktop:{flex:1,paddingTop:spacing.sm,justifyContent:"center",paddingRight:spacing.lg},
  heroTitle:{fontSize:type.hero,fontWeight:"900",lineHeight:38,letterSpacing:-0.7,maxWidth:900},
  heroTitleOverlay:{fontSize:31,lineHeight:35,letterSpacing:-0.75},
  heroTitleTablet:{fontSize:30,lineHeight:35},
  heroTitleDesktop:{fontSize:40,lineHeight:46,letterSpacing:-1},
  standfirst:{fontSize:type.standfirst,lineHeight:24,maxWidth:820},
  metaRow:{flexDirection:"row",alignItems:"center",gap:spacing.sm,flexWrap:"wrap"},
  kicker:{fontSize:type.label,fontWeight:"900",textTransform:"uppercase",letterSpacing:0.8},
  meta:{fontSize:type.meta},
  storyCard:{borderBottomWidth:1,paddingBottom:spacing.lg,gap:spacing.md},
  storyCompact:{flexDirection:"row",alignItems:"flex-start"},
  storyImage:{width:"100%",aspectRatio:16/9},
  storyImageCompact:{width:112,height:78,aspectRatio:undefined},
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
  featuredVideo:{borderWidth:1,borderRadius:radius.md,overflow:"hidden"},
  featuredVideoDesktop:{flexDirection:"row",alignItems:"stretch"},
  featuredVideoMedia:{position:"relative",width:"100%"},
  featuredVideoMediaDesktop:{width:"62%"},
  featuredVideoImage:{width:"100%",aspectRatio:16/9},
  featuredVideoFallback:{width:"100%",aspectRatio:16/9,alignItems:"center",justifyContent:"center",padding:spacing.xl,gap:4},
  featuredVideoBody:{padding:spacing.xl,gap:spacing.sm,justifyContent:"center"},
  featuredVideoBodyDesktop:{flex:1},
  featuredVideoTitle:{fontSize:28,lineHeight:34,fontWeight:"900",letterSpacing:-.5},
  featuredVideoAction:{fontSize:12,fontWeight:"900",letterSpacing:.4,marginTop:spacing.sm},
  featuredPlayBadge:{position:"absolute",left:18,top:18,width:56,height:56,borderRadius:28,backgroundColor:"rgba(7,26,43,0.88)",alignItems:"center",justifyContent:"center"},
  featuredPlayText:{color:"#FFFFFF",fontSize:20},
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
  audioTypeBadge:{minWidth:52,minHeight:52,borderWidth:1,borderRadius:radius.sm,alignItems:"center",justifyContent:"center",paddingHorizontal:spacing.sm},
  audioTypeText:{fontSize:9,fontWeight:"900",letterSpacing:1},
  audioCopy:{flex:1,gap:3},
  audioTitle:{fontSize:17,fontWeight:"900",lineHeight:22},
  audioUnavailable:{fontSize:10,fontWeight:"800",letterSpacing:.4,textTransform:"uppercase"},
  adSlot:{width:"100%",borderTopWidth:1,borderBottomWidth:1,alignItems:"center",justifyContent:"center",paddingVertical:spacing.md,paddingHorizontal:spacing.sm,gap:spacing.xs},
  adSlotInArticle:{alignSelf:"center",maxWidth:760},
  adSlotMobileRectangle:{maxWidth:360,paddingVertical:spacing.lg},
  adSlotTablet:{maxWidth:640},
  adSlotDesktop:{maxWidth:900},
  adSlotArticleEnd:{maxWidth:980,alignSelf:"center"},
  adLabel:{fontSize:9,fontWeight:"900",letterSpacing:1.4},
  adPlacement:{fontSize:12,fontWeight:"800",textAlign:"center"},
  adCreativePressable:{width:"100%"},
  adCreative:{width:"100%"},
  adNoDestination:{fontSize:11,lineHeight:16,textAlign:"center",maxWidth:620,fontStyle:"italic"},
  premiumBadge:{fontSize:10,fontWeight:"900",letterSpacing:0.8,borderWidth:1,paddingHorizontal:6,paddingVertical:3,borderRadius:4},
  surface:{borderWidth:1,borderRadius:radius.md,padding:spacing.lg}
});
