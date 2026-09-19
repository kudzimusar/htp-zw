import { useEffect, useRef, useState } from "react";
import { Image, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AdSlot, PremiumBadge, StoryCard } from "../../src/ui/Cards";
import { LoadingBlock, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { colors, layout, spacing, type } from "../../src/theme/tokens";
import { useAppearance } from "../../src/theme/AppearanceProvider";

export function generateStaticParams() {
  return [{ id: "fixture-001" }, { id: "fixture-002" }, { id: "fixture-003" }];
}


function stripHtml(value:string){
  return value.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
}

export default function ArticleScreen(){
  const { id }=useLocalSearchParams<{id:string}>();
  const router=useRouter();
  const { palette }=useAppearance();
  const [textScale,setTextScale]=useState(1);
  const [actionStatus,setActionStatus]=useState("");
  const lastProgressWrite=useRef({at:0,value:0});
  const article=useAsync(()=>services.articles.getById(String(id)),[id]);
  const related=useAsync(()=>services.articles.getRelated(String(id)),[id]);
  const entitlement=useAsync(()=>services.premium.hasEntitlement(),[]);
  const readPosition=useAsync(()=>services.reader.getReadPosition(String(id)),[id]);

  useEffect(()=>{
    if(article.data) void services.reader.recordReadingHistory(article.data.id);
  },[article.data?.id]);

  if(article.loading) return <Page><LoadingBlock label="Loading article…" /></Page>;
  if(!article.data) return <Page title="Article"><Text style={[styles.muted,{color:palette.inkMuted}]}>Article not found.</Text></Page>;

  const story=article.data;
  const protectedBody=story.accessPolicy==="premium" && !entitlement.data;

  const persistProgress=(progress:number)=>{
    const now=Date.now();
    const previous=lastProgressWrite.current;
    if(now-previous.at<1000 && Math.abs(progress-previous.value)<0.03) return;
    lastProgressWrite.current={at:now,value:progress};
    void services.reader.setReadPosition(story.id,progress);
  };

  const share=async()=>{
    const url=await services.social.buildCanonicalShareUrl(story);
    await Share.share({message:story.title+" — "+url,url});
  };
  const save=async()=>{
    const saved=await services.reader.toggleSavedArticle(story.id);
    setActionStatus(saved ? "Saved" : "Removed from saved");
  };

  const download=async()=>{
    if(protectedBody){
      setActionStatus("Premium body is not available for offline storage without entitlement.");
      return;
    }
    await services.reader.downloadArticle(story);
    setActionStatus("Available offline");
  };

  return (
    <Page
      initialScrollProgress={readPosition.data ?? 0}
      onScrollProgress={persistProgress}
    >
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={[styles.action,{borderColor:palette.border}]} onPress={()=>router.back()}><Text style={[styles.actionText,{color:palette.ink}]}>Back</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Change article text size" style={styles.action} onPress={()=>setTextScale(textScale>=1.25?0.9:textScale+0.1)}><Text style={styles.actionText}>Text {Math.round(textScale*100)}%</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Save article" style={styles.action} onPress={save}><Text style={styles.actionText}>Save</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Download article for offline reading" style={styles.action} onPress={download}><Text style={styles.actionText}>Download</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Listen to article" style={styles.action} onPress={()=>router.push("/listen" as never)}><Text style={styles.actionText}>Listen</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Share article" style={styles.action} onPress={share}><Text style={styles.actionText}>Share</Text></Pressable>
      </View>
      {!!actionStatus && <Text accessibilityLiveRegion="polite" style={styles.actionStatus}>{actionStatus}</Text>}

      <View style={styles.articleHeader}>
        <View style={styles.metaRow}>
          <Text style={[styles.kicker,{color:palette.blue}]}>{story.primarySection?.name ?? "HealthTimes"}</Text>
          {story.accessPolicy==="premium" && <PremiumBadge />}
        </View>
        <Text style={[styles.title,{color:palette.ink}]}>{story.title}</Text>
        {!!story.standfirst && <Text style={[styles.standfirst,{color:palette.inkMuted}]}>{story.standfirst}</Text>}
        <Text style={[styles.byline,{color:palette.inkMuted}]}>{story.author?.displayName ?? "HealthTimes"} · {story.publishedAt ? new Date(story.publishedAt).toLocaleDateString() : ""}</Text>
      </View>

      {story.heroMedia?.publicUrl && (
        <View>
          <Image source={{uri:story.heroMedia.publicUrl}} style={styles.hero} accessibilityLabel={story.heroMedia.altText ?? story.title} />
          {!!story.heroMedia.credit && <Text style={[styles.credit,{color:palette.inkMuted}]}>{story.heroMedia.credit}</Text>}
        </View>
      )}

      <View style={styles.body}>
        {protectedBody ? (
          <>
            <Text style={[styles.paragraph,{fontSize:type.body*textScale,lineHeight:29*textScale,color:palette.ink}]}>{story.excerpt ?? story.standfirst}</Text>
            <View style={styles.lock}>
              <Text style={[styles.lockTitle,{color:palette.ink}]}>Premium reporting</Text>
              <Text style={[styles.lockText,{color:palette.inkMuted}]}>The protected article body is not shipped to this unauthenticated fixture client. AG-06 will enforce entitlement server-side.</Text>
              <Pressable style={styles.primary} onPress={()=>router.push("/premium" as never)}><Text style={styles.primaryText}>View Premium</Text></Pressable>
            </View>
          </>
        ):(
          <Text style={[styles.paragraph,{fontSize:type.body*textScale,lineHeight:29*textScale}]}>{stripHtml(story.bodyHtml ?? "")}</Text>
        )}
      </View>

      <Section><AdSlot placement="article_after_intro" /></Section>

      <Section>
        <SectionHeader title="Sources & references" />
        <Text style={[styles.muted,{color:palette.inkMuted}]}>Authoritative citations will come from migrated story provenance and editorial data. NM-04 does not fabricate references.</Text>
      </Section>

      <Section>
        <SectionHeader title="Related coverage" />
        <View style={styles.related}>
          {related.data?.map((item)=><View key={item.id} style={styles.relatedItem}><StoryCard story={item} /></View>)}
        </View>
      </Section>

      <Section><AdSlot placement="article_end" /></Section>
    </Page>
  );
}
const styles=StyleSheet.create({
  actions:{marginTop:spacing.lg,flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  action:{minHeight:layout.touchMin,justifyContent:"center",paddingHorizontal:12,borderWidth:1,borderColor:colors.border},
  actionText:{fontSize:13,fontWeight:"800",color:colors.ink},
  actionStatus:{fontSize:12,fontWeight:"700",color:colors.success,marginTop:spacing.sm},
  articleHeader:{marginTop:spacing.xl,gap:spacing.md,maxWidth:layout.articleMax,alignSelf:"center",width:"100%"},
  metaRow:{flexDirection:"row",gap:spacing.sm,alignItems:"center"},
  kicker:{fontSize:12,fontWeight:"900",color:colors.blue,textTransform:"uppercase",letterSpacing:0.8},
  title:{fontSize:38,lineHeight:44,fontWeight:"900",letterSpacing:-0.9,color:colors.ink},
  standfirst:{fontSize:18,lineHeight:27,color:colors.inkMuted},
  byline:{fontSize:13,fontWeight:"700",color:colors.inkMuted},
  hero:{width:"100%",aspectRatio:16/9,marginTop:spacing.xl,backgroundColor:colors.paperMuted},
  credit:{fontSize:11,color:colors.inkMuted,marginTop:spacing.xs},
  body:{maxWidth:layout.articleMax,alignSelf:"center",width:"100%",marginTop:spacing.xl},
  paragraph:{color:colors.ink},
  lock:{marginTop:spacing.xl,borderTopWidth:3,borderTopColor:colors.premium,paddingTop:spacing.xl,gap:spacing.sm},
  lockTitle:{fontSize:24,fontWeight:"900",color:colors.ink},
  lockText:{fontSize:15,lineHeight:22,color:colors.inkMuted},
  primary:{alignSelf:"flex-start",backgroundColor:colors.blue,minHeight:44,justifyContent:"center",paddingHorizontal:16,marginTop:spacing.sm},
  primaryText:{color:"#FFFFFF",fontWeight:"900"},
  muted:{fontSize:14,lineHeight:21,color:colors.inkMuted},
  related:{gap:spacing.xl},
  relatedItem:{maxWidth:520}
});
