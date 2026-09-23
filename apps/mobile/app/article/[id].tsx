import { useEffect, useRef, useState } from "react";
import type { ArticleDetail } from "../../src/domain/models";
import { Image, Linking, Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AdSlot, PremiumBadge, StoryCard } from "../../src/ui/Cards";
import { LoadingBlock, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { breakpoints, colors, layout, radius, spacing, type } from "../../src/theme/tokens";
import { useAppearance } from "../../src/theme/AppearanceProvider";
import { event } from "../../src/growth/events";
import { SOURCE_PARITY_STATIC_ARTICLE_IDS } from "../../src/source-parity/snapshot";
import { parseArticleContent, type ArticleInline } from "../../src/reader/article-content";
import { ReaderDiscussionPanel } from "../../src/ui/ReaderDiscussion";

export function generateStaticParams() {
  return [
    ...SOURCE_PARITY_STATIC_ARTICLE_IDS.map((id)=>({id})),
    { id: "fixture-001" },
    { id: "fixture-002" },
    { id: "fixture-003" }
  ];
}

function renderInlines(inlines:ArticleInline[],keyPrefix:string,linkColor:string){return inlines.map((inline,index)=><Text key={keyPrefix+"-"+index} style={[inline.strong&&styles.inlineStrong,inline.emphasis&&styles.inlineEmphasis,inline.href?{color:linkColor,textDecorationLine:"underline"}:null]} onPress={inline.href?()=>{void Linking.openURL(inline.href!);}:undefined} accessibilityRole={inline.href?"link":undefined}>{inline.text}</Text>);}

function formatArticleTime(value:string|null){
  if(!value) return "";
  return new Date(value).toLocaleString(undefined,{
    year:"numeric",
    month:"short",
    day:"numeric",
    hour:"numeric",
    minute:"2-digit"
  });
}

export function ArticleReader({ initialStory = null }: { initialStory?: ArticleDetail | null }){
  const { id }=useLocalSearchParams<{id:string}>();
  const router=useRouter();
  const { palette }=useAppearance();
  const { width }=useWindowDimensions();
  const [textScale,setTextScale]=useState(1);
  const [actionStatus,setActionStatus]=useState("");
  const lastProgressWrite=useRef({at:0,value:0});
  const trackedArticleId=useRef<string|null>(null);
  const trackedProgressEvents=useRef(new Set<string>());
  const premiumLockTracked=useRef(false);
  const article=useAsync(()=>initialStory ? Promise.resolve(initialStory) : services.articles.getById(String(id)),[id,initialStory?.id]);
  const related=useAsync(()=>initialStory ? Promise.resolve([]) : services.articles.getRelated(String(id)),[id,initialStory?.id]);
  const entitlement=useAsync(()=>services.premium.hasEntitlement(),[]);
  const readPosition=useAsync(()=>services.reader.getReadPosition(String(id)),[id]);
  const entitledArticle=useAsync(async()=>{
    const current=article.data;
    if(!current || current.accessPolicy!=="premium" || entitlement.data!==true) return null;
    return services.premium.getProtectedArticle(current.id);
  },[article.data?.id,article.data?.accessPolicy,entitlement.data]);

  useEffect(()=>{
    const current=article.data;
    if(!current) return;

    void services.reader.recordReadingHistory(current.id);

    if(trackedArticleId.current!==current.id){
      trackedArticleId.current=current.id;
      trackedProgressEvents.current.clear();
      premiumLockTracked.current=false;
      void services.analytics.track(event("article_view",{
        premium_state:current.accessPolicy,
        section:current.primarySection?.slug ?? "unassigned"
      },{storyId:current.id,pagePath:"/article/"+current.id}));
    }

    if(current.accessPolicy==="premium" && entitlement.data===false && !premiumLockTracked.current){
      premiumLockTracked.current=true;
      void services.analytics.track(event("premium_locked",{
        seconds_elapsed:0
      },{storyId:current.id,pagePath:"/article/"+current.id}));
    }
  },[article.data?.id,entitlement.data]);

  if(article.loading) return <Page><LoadingBlock label="Loading article…" /></Page>;
  if(!article.data) return <Page title="Article"><Text style={[styles.muted,{color:palette.inkMuted}]}>Article not found.</Text></Page>;

  const publicStory=article.data;
  const verifiedPremiumStory=
    entitlement.data===true && entitledArticle.data?.bodyHtml
      ? entitledArticle.data
      : null;
  const story=verifiedPremiumStory ?? publicStory;
  const protectedBody=
    publicStory.accessPolicy==="premium" &&
    !verifiedPremiumStory?.bodyHtml;
  const blocks=parseArticleContent(protectedBody ? null : story.bodyHtml,story.canonicalUrl);
  const desktop=width >= breakpoints.desktop;
  const publishedLabel=formatArticleTime(story.publishedAt);
  const modifiedLabel=formatArticleTime(story.modifiedAt);
  const showUpdated=Boolean(story.modifiedAt && story.modifiedAt!==story.publishedAt);

  const persistProgress=(progress:number)=>{
    const now=Date.now();
    const previous=lastProgressWrite.current;
    if(now-previous.at<1000 && Math.abs(progress-previous.value)<0.03) return;
    lastProgressWrite.current={at:now,value:progress};
    void services.reader.setReadPosition(story.id,progress);

    const milestones=[
      {threshold:0.25,name:"article_25_percent" as const,depth:25},
      {threshold:0.50,name:"article_50_percent" as const,depth:50},
      {threshold:0.75,name:"article_75_percent" as const,depth:75},
      {threshold:0.98,name:"article_complete" as const,depth:100}
    ];
    for(const milestone of milestones){
      if(progress>=milestone.threshold && !trackedProgressEvents.current.has(milestone.name)){
        trackedProgressEvents.current.add(milestone.name);
        void services.analytics.track(event(milestone.name,{
          scroll_depth:milestone.depth
        },{storyId:story.id,pagePath:"/article/"+story.id}));
      }
    }
  };

  const share=async()=>{
    const url=await services.social.buildAttributedShareUrl(story,"system");
    await Share.share({message:story.title+" — "+url,url});
    await services.analytics.track(event("story_shared",{
      channel:"system"
    },{storyId:story.id,pagePath:"/article/"+story.id}));
  };

  const save=async()=>{
    const saved=await services.reader.toggleSavedArticle(story.id);
    setActionStatus(saved ? "Saved" : "Removed from saved");
    if(saved){
      await services.analytics.track(event("story_saved",{
        reader_state:"local-reader"
      },{storyId:story.id,pagePath:"/article/"+story.id}));
    }
  };

  const download=async()=>{
    if(story.accessPolicy==="premium"){
      setActionStatus("Premium body is not available for offline storage until a verified offline entitlement policy exists.");
      return;
    }
    await services.reader.downloadArticle(story);
    setActionStatus("Available offline");
  };

  const actionButton=(label:string,onPress:()=>void,accessibilityLabel=label)=>(
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.action,{borderColor:palette.border,backgroundColor:palette.paper}]}
      onPress={onPress}
    >
      <Text style={[styles.actionText,{color:palette.ink}]}>{label}</Text>
    </Pressable>
  );

  return (
    <Page
      initialScrollProgress={readPosition.data ?? 0}
      onScrollProgress={persistProgress}
    >
      <View style={styles.actions}>
        {actionButton("Back",()=>router.back(),"Go back")}
        {actionButton("Text " + Math.round(textScale*100) + "%",()=>setTextScale(textScale>=1.25?0.9:textScale+0.1),"Change article text size")}
        {actionButton("Save",()=>{void save();},"Save article")}
        {actionButton("Offline",()=>{void download();},"Download article for offline reading")}
        {actionButton("Listen",()=>router.push("/listen" as never),"Listen to article")}
        {actionButton("Share",()=>{void share();},"Share article")}
      </View>
      {!!actionStatus && <Text accessibilityLiveRegion="polite" style={[styles.actionStatus,{color:colors.success}]}>{actionStatus}</Text>}

      <View style={styles.articleHeader}>
        <View style={styles.metaRow}>
          <Text style={[styles.kicker,{color:palette.blue}]}>{story.primarySection?.name ?? "HealthTimes"}</Text>
          {story.accessPolicy==="premium" && <PremiumBadge />}
        </View>
        <Text style={[styles.title,{color:palette.ink},desktop && styles.titleDesktop]}>{story.title}</Text>
        {!!story.standfirst && <Text style={[styles.standfirst,{color:palette.inkMuted}]}>{story.standfirst}</Text>}
        <View style={styles.publicationMeta}>
          {story.author ? (
            <Pressable accessibilityRole="link" onPress={()=>router.push(("/author/"+story.author!.slug) as never)}>
              <Text style={[styles.byline,{color:palette.blue}]}>By {story.author.displayName}</Text>
            </Pressable>
          ) : (
            <Text style={[styles.byline,{color:palette.inkMuted}]}>HealthTimes</Text>
          )}
          {!!publishedLabel && <Text style={[styles.timeMeta,{color:palette.inkMuted}]}>Published {publishedLabel}</Text>}
          {showUpdated && !!modifiedLabel && <Text style={[styles.timeMeta,{color:palette.inkMuted}]}>Updated {modifiedLabel}</Text>}
        </View>
        {!!story.primarySection && (
          <View style={styles.sourceTaxonomy}>
            <Text style={[styles.sourceTaxonomyLabel,{color:palette.blue}]}>Canonical desk</Text>
            <View style={styles.geography}>
              <Text style={[styles.geoLabel,{color:palette.ink,borderColor:palette.border}]}>{story.primarySection.name}</Text>
            </View>
          </View>
        )}
        {!!story.geography.length && (
          <View style={styles.geography}>
            {story.geography.map((zone)=><Text key={zone.id} style={[styles.geoLabel,{color:palette.inkMuted,borderColor:palette.border}]}>{zone.name}</Text>)}
          </View>
        )}
        {!!story.legacyTaxonomy?.length && (
          <View style={styles.sourceTaxonomy}>
            <Text style={[styles.sourceTaxonomyLabel,{color:palette.inkMuted}]}>Legacy source taxonomy</Text>
            <View style={styles.geography}>
              {story.legacyTaxonomy.map((term)=><Text key={term.id} style={[styles.geoLabel,{color:palette.inkMuted,borderColor:palette.border}]}>{term.name}</Text>)}
            </View>
          </View>
        )}
      </View>

      {story.heroMedia?.publicUrl && (
        <View style={styles.heroWrap}>
          <Image source={{uri:story.heroMedia.publicUrl}} style={[styles.hero,{backgroundColor:palette.paperMuted}]} accessibilityLabel={story.heroMedia.altText ?? story.title} />
          {!!story.heroMedia.caption && <Text style={[styles.caption,{color:palette.inkMuted}]}>{story.heroMedia.caption}</Text>}
          {!!story.heroMedia.credit && <Text style={[styles.credit,{color:palette.inkMuted}]}>{story.heroMedia.credit}</Text>}
        </View>
      )}

      <View style={styles.body}>
        {protectedBody ? (
          <>
            <Text style={[styles.paragraph,{fontSize:type.body*textScale,lineHeight:29*textScale,color:palette.ink}]}>{story.excerpt ?? story.standfirst}</Text>
            <View style={[styles.lock,{borderTopColor:colors.premium}]}>
              <Text style={[styles.lockTitle,{color:palette.ink}]}>Premium member access</Text>
              <Text style={[styles.lockText,{color:palette.inkMuted}]}>
                {entitlement.data===true
                  ? "Your membership entitlement is verified, but protected article delivery is not currently available. The source body remains protected."
                  : "This Premium article is locked. HealthTimes must verify member entitlement before protected body content can be requested."}
              </Text>
              <View style={styles.lockActions}>
                <Pressable style={[styles.primary,{backgroundColor:palette.blue}]} onPress={()=>router.push("/premium" as never)}><Text style={[styles.primaryText,{color:palette.paper}]}>View Premium access</Text></Pressable>
                <Pressable style={[styles.secondary,{borderColor:palette.border}]} onPress={()=>router.push("/account-access" as never)}><Text style={[styles.secondaryText,{color:palette.ink}]}>Member sign in</Text></Pressable>
              </View>
            </View>
          </>
        ):(
          <>
            {blocks.length ? (
              blocks.map((block,index)=>(
                <View key={String(index)}>
                  {block.kind==="heading" ? (
                    <Text style={[styles.bodyHeading,{fontSize:(block.level===2?24:20)*textScale,lineHeight:(block.level===2?31:27)*textScale,color:palette.ink}]}>{renderInlines(block.inlines,"heading-"+index,palette.blue)}</Text>
                  ) : block.kind==="blockquote" ? (
                    <View style={[styles.quote,{borderLeftColor:palette.blue}]}><Text style={[styles.quoteText,{fontSize:19*textScale,lineHeight:29*textScale,color:palette.ink}]}>{renderInlines(block.inlines,"quote-"+index,palette.blue)}</Text></View>
                  ) : block.kind==="list" ? (
                    <View style={styles.articleList}>{block.items.map((item,itemIndex)=><View style={styles.listRow} key={"list-"+index+"-"+itemIndex}><Text style={[styles.listBullet,{color:palette.blue}]}>{block.ordered?String(itemIndex+1)+".":"•"}</Text><Text style={[styles.listText,{fontSize:type.body*textScale,lineHeight:29*textScale,color:palette.ink}]}>{renderInlines(item,"list-"+index+"-"+itemIndex,palette.blue)}</Text></View>)}</View>
                  ) : block.kind==="figure" ? (
                    <View style={styles.inlineFigure}>{block.href?<Pressable accessibilityRole="link" onPress={()=>{void Linking.openURL(block.href!);}}><Image source={{uri:block.src}} style={[styles.inlineFigureImage,{backgroundColor:palette.paperMuted}]} accessibilityLabel={block.alt??"Article image"} /></Pressable>:<Image source={{uri:block.src}} style={[styles.inlineFigureImage,{backgroundColor:palette.paperMuted}]} accessibilityLabel={block.alt??"Article image"} />}{!!block.caption.length&&<Text style={[styles.caption,{color:palette.inkMuted}]}>{renderInlines(block.caption,"caption-"+index,palette.blue)}</Text>}</View>
                  ) : (
                    <Text style={[styles.paragraph,{fontSize:type.body*textScale,lineHeight:29*textScale,color:palette.ink}]}>{renderInlines(block.inlines,"paragraph-"+index,palette.blue)}</Text>
                  )}
                  {index===0 && (
                    <View style={styles.inlineAd}>
                      <AdSlot placement="article_after_intro" />
                    </View>
                  )}
                </View>
              ))
            ) : (
              <Text style={[styles.paragraph,{fontSize:type.body*textScale,lineHeight:29*textScale,color:palette.ink}]}>{story.excerpt ?? ""}</Text>
            )}
          </>
        )}
      </View>

      <ReaderDiscussionPanel canonicalStoryId={story.canonicalStoryId} />

      {!!(story.canonicalUrl ?? story.sourceProvenance?.sourceUrl) && (<Section><SectionHeader title="Original publication" /><View style={styles.sourceBlock}><Pressable accessibilityRole="link" style={[styles.sourceButton,{borderColor:palette.border}]} onPress={()=>void Linking.openURL((story.canonicalUrl ?? story.sourceProvenance?.sourceUrl)!)}><Text style={[styles.sourceButtonText,{color:palette.blue}]}>View article on HealthTimes.co.zw →</Text></Pressable></View></Section>)}

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
  action:{minHeight:layout.touchMin,justifyContent:"center",paddingHorizontal:12,borderWidth:1,borderRadius:radius.sm},
  actionText:{fontSize:13,fontWeight:"800"},
  actionStatus:{fontSize:12,fontWeight:"700",marginTop:spacing.sm},
  articleHeader:{marginTop:spacing.xl,gap:spacing.md,maxWidth:layout.articleMax,alignSelf:"center",width:"100%"},
  metaRow:{flexDirection:"row",gap:spacing.sm,alignItems:"center",flexWrap:"wrap"},
  kicker:{fontSize:12,fontWeight:"900",textTransform:"uppercase",letterSpacing:0.8},
  title:{fontSize:36,lineHeight:42,fontWeight:"900",letterSpacing:-0.9},
  titleDesktop:{fontSize:48,lineHeight:54,letterSpacing:-1.2},
  standfirst:{fontSize:18,lineHeight:27},
  publicationMeta:{gap:3},
  byline:{fontSize:13,fontWeight:"800"},
  timeMeta:{fontSize:11,lineHeight:17},
  geography:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  sourceTaxonomy:{gap:spacing.sm,marginTop:spacing.xs},
  sourceTaxonomyLabel:{fontSize:10,fontWeight:"900",letterSpacing:0.8,textTransform:"uppercase"},
  geoLabel:{fontSize:11,fontWeight:"700",borderWidth:1,borderRadius:radius.sm,paddingHorizontal:8,paddingVertical:5},
  heroWrap:{marginTop:spacing.xl},
  hero:{width:"100%",aspectRatio:16/9},
  caption:{fontSize:12,lineHeight:18,marginTop:spacing.sm,maxWidth:900},
  credit:{fontSize:11,marginTop:spacing.xs},
  body:{maxWidth:layout.articleMax,alignSelf:"center",width:"100%",marginTop:spacing.xl},
  paragraph:{marginBottom:spacing.lg},
  bodyHeading:{fontWeight:"900",letterSpacing:-.4,marginTop:spacing.lg,marginBottom:spacing.md},
  quote:{borderLeftWidth:3,paddingLeft:spacing.lg,marginVertical:spacing.lg},
  quoteText:{fontWeight:"700",fontStyle:"italic"},
  articleList:{marginBottom:spacing.md},
  listRow:{flexDirection:"row",alignItems:"flex-start",gap:spacing.sm,marginBottom:spacing.md},
  listBullet:{fontSize:18,fontWeight:"900",lineHeight:29},
  listText:{flex:1},
  inlineFigure:{marginBottom:spacing.xl,gap:spacing.sm},
  inlineFigureImage:{width:"100%",aspectRatio:16/9},
  inlineStrong:{fontWeight:"900"},
  inlineEmphasis:{fontStyle:"italic"},
  inlineAd:{marginVertical:spacing.lg},
  lock:{marginTop:spacing.xl,borderTopWidth:3,paddingTop:spacing.xl,gap:spacing.sm},
  lockTitle:{fontSize:24,fontWeight:"900"},
  lockText:{fontSize:15,lineHeight:22},
  primary:{alignSelf:"flex-start",minHeight:44,justifyContent:"center",paddingHorizontal:16,marginTop:spacing.sm,borderRadius:radius.sm},
  primaryText:{fontWeight:"900"},
  muted:{fontSize:14,lineHeight:21},
  sourceBlock:{gap:spacing.md,maxWidth:760},
  sourceButton:{minHeight:44,alignSelf:"flex-start",justifyContent:"center",paddingHorizontal:14,borderWidth:1,borderRadius:radius.sm},
  sourceButtonText:{fontWeight:"900"},
  related:{gap:spacing.xl},
  relatedItem:{maxWidth:520}
});

export default function ArticleScreen(){
  return <ArticleReader />;
}
