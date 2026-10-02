import { useEffect, useRef, useState } from "react";
import type { ArticleDetail } from "../../src/domain/models";
import { Image, Linking, Platform, Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AdSlot, PremiumBadge, StoryCard } from "../../src/ui/Cards";
import { LoadingBlock, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { ArticleToolbar } from "../../src/ui/ArticleToolbar";
import { PremiumPaywall } from "../../src/ui/PremiumPaywall";
import { PremiumSubscriptionPrompt } from "../../src/ui/PremiumSubscriptionPrompt";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { breakpoints, colors, layout, radius, spacing, type } from "../../src/theme/tokens";
import { useAppearance } from "../../src/theme/AppearanceProvider";
import { event } from "../../src/growth/events";
import { premiumPreviewConfiguration } from "../../src/growth/config";
import { premiumPreviewConsumerState } from "../../src/growth/premium-consumer";
import { SOURCE_PARITY_STATIC_ARTICLE_IDS } from "../../src/source-parity/snapshot";
import { parseArticleContent, type ArticleContentBlock, type ArticleInline } from "../../src/reader/article-content";
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

function estimateReadingMinutes(bodyHtml:string|null){
  if(!bodyHtml) return null;
  const text=bodyHtml
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/&[a-z0-9#]+;/gi," ")
    .replace(/\s+/g," ")
    .trim();
  if(!text) return null;
  const words=text.split(" ").filter(Boolean).length;
  if(words<20) return null;
  return Math.max(1,Math.ceil(words/220));
}

function readerFacingStandfirst(value:string|null|undefined,authorName:string|null|undefined){
  const text=value?.trim();
  if(!text) return null;
  const author=authorName?.trim();
  if(!author) return text;
  const lower=text.toLowerCase();
  for(const prefix of ["By "+author+" ","By "+author+": ","By "+author+" — ","By "+author+" - "]){
    if(lower.startsWith(prefix.toLowerCase())){
      const stripped=text.slice(prefix.length).trim();
      return stripped || text;
    }
  }
  return text;
}

function readerFacingMediaCredit(value:string|null|undefined){
  const text=value?.trim();
  if(!text) return null;
  const internal=/current healthtimes public source|runtime media url|read-only source bridge|source parity|migration authority/i;
  return internal.test(text) ? null : text;
}

function premiumTeaserParagraph(
  value:string|null|undefined,
  canonicalUrl:string|null
):Extract<ArticleContentBlock,{kind:"paragraph"}>|null{
  if(!value?.trim()) return null;
  const teaserBlocks=parseArticleContent(value,canonicalUrl);
  if(teaserBlocks.length!==1) return null;
  const block=teaserBlocks[0];
  if(!block || block.kind!=="paragraph") return null;
  if(!block.inlines.some((inline)=>inline.text.trim())) return null;
  return block;
}

type PremiumPreviewState="preview"|"warning"|"locked";

export function ArticleReader({ initialStory = null }: { initialStory?: ArticleDetail | null }){
  const { id }=useLocalSearchParams<{id:string}>();
  const router=useRouter();
  const { palette }=useAppearance();
  const { width }=useWindowDimensions();
  const previewConfig=premiumPreviewConfiguration();
  const [textScale,setTextScale]=useState(1);
  const [actionStatus,setActionStatus]=useState("");
  const [premiumState,setPremiumState]=useState<PremiumPreviewState>("locked");
  const [premiumRemainingSeconds,setPremiumRemainingSeconds]=useState(0);
  const [premiumPromptRequested,setPremiumPromptRequested]=useState(false);
  const [premiumPromptVisible,setPremiumPromptVisible]=useState(false);
  const lastProgressWrite=useRef({at:0,value:0});
  const trackedArticleId=useRef<string|null>(null);
  const trackedProgressEvents=useRef(new Set<string>());
  const premiumSessionKey=useRef("");
  const premiumPromptOpenedSession=useRef("");
  const article=useAsync(()=>initialStory ? Promise.resolve(initialStory) : services.articles.getById(String(id)),[id,initialStory?.id]);
  const related=useAsync(()=>initialStory ? Promise.resolve([]) : services.articles.getRelated(String(id)),[id,initialStory?.id]);
  const entitlement=useAsync(()=>services.premium.hasEntitlement(),[]);
  const commerce=useAsync(()=>services.premiumCommerce.getAuthority(),[]);
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
      void services.analytics.track(event("article_view",{
        premium_state:current.accessPolicy,
        section:current.primarySection?.slug ?? "unassigned"
      },{storyId:current.id,pagePath:"/article/"+current.id}));
    }
  },[article.data?.id]);

  useEffect(()=>{
    const current=article.data;
    if(!current || current.accessPolicy!=="premium") return;
    if(entitlement.loading || entitlement.data===true || entitlement.data!==false) return;

    const stableStoryId=current.canonicalStoryId ?? current.id;
    const teaserBlock=premiumTeaserParagraph(current.premiumTeaserHtml,current.canonicalUrl);
    const policyValid=
      previewConfig.source==="owner-policy" &&
      previewConfig.paragraphCount===1 &&
      previewConfig.seconds===20;

    const sessionKey=stableStoryId+"|"+previewConfig.source+"|"+previewConfig.paragraphCount+"|"+previewConfig.seconds;
    if(premiumSessionKey.current===sessionKey) return;
    premiumSessionKey.current=sessionKey;
    setPremiumPromptRequested(false);
    setPremiumRemainingSeconds(0);

    if(!policyValid || !teaserBlock){
      setPremiumState("locked");
      void services.analytics.track(event("premium_locked",{
        seconds_elapsed:0
      },{storyId:current.id,pagePath:"/article/"+current.id}));
      return;
    }

    let cancelled=false;
    let warningTimer:ReturnType<typeof setTimeout>|null=null;
    let lockTimer:ReturnType<typeof setTimeout>|null=null;
    let remainingTimer:ReturnType<typeof setInterval>|null=null;

    const requestPromptOnce=async()=>{
      const shouldRequest=await services.reader.requestPremiumPreviewPrompt(stableStoryId);
      if(!cancelled && shouldRequest) setPremiumPromptRequested(true);
    };

    void (async()=>{
      const previewWindow=await services.reader.getPremiumPreviewWindow(stableStoryId,previewConfig.seconds);
      if(cancelled) return;

      if(!previewWindow || previewWindow.remainingSeconds<=0){
        setPremiumState("locked");
        setPremiumRemainingSeconds(0);
        void requestPromptOnce();
        void services.analytics.track(event("premium_locked",{
          seconds_elapsed:previewConfig.seconds
        },{storyId:current.id,pagePath:"/article/"+current.id}));
        return;
      }

      const warningRemaining=Math.max(1,Math.ceil(previewConfig.seconds*0.25));
      const warningDelaySeconds=Math.max(0,previewWindow.remainingSeconds-warningRemaining);
      const expiresAt=new Date(previewWindow.expiresAt).getTime();

      setPremiumRemainingSeconds(previewWindow.remainingSeconds);
      setPremiumState(
        previewWindow.remainingSeconds<=warningRemaining
          ? "warning"
          : "preview"
      );

      remainingTimer=setInterval(()=>{
        const remaining=Math.max(0,Math.ceil((expiresAt-Date.now())/1000));
        setPremiumRemainingSeconds(remaining);
      },1000);

      void services.analytics.track(event("premium_preview_started",{
        surface:"article_reader",
        preview_seconds:previewConfig.seconds,
        preview_remaining_seconds:previewWindow.remainingSeconds
      },{storyId:current.id,pagePath:"/article/"+current.id}));

      if(warningDelaySeconds>0){
        warningTimer=setTimeout(()=>{
          setPremiumState("warning");
          void services.analytics.track(event("premium_warning_shown",{
            seconds_elapsed:previewConfig.seconds-warningRemaining,
            seconds_remaining:warningRemaining
          },{storyId:current.id,pagePath:"/article/"+current.id}));
        },warningDelaySeconds*1000);
      }

      lockTimer=setTimeout(()=>{
        setPremiumState("locked");
        setPremiumRemainingSeconds(0);
        if(remainingTimer) clearInterval(remainingTimer);
        void requestPromptOnce();
        void services.analytics.track(event("premium_locked",{
          seconds_elapsed:previewConfig.seconds
        },{storyId:current.id,pagePath:"/article/"+current.id}));
      },previewWindow.remainingSeconds*1000);
    })();

    return ()=>{
      cancelled=true;
      if(warningTimer) clearTimeout(warningTimer);
      if(lockTimer) clearTimeout(lockTimer);
      if(remainingTimer) clearInterval(remainingTimer);
    };
  },[
    article.data?.id,
    article.data?.canonicalStoryId,
    article.data?.accessPolicy,
    article.data?.premiumTeaserHtml,
    entitlement.data,
    entitlement.loading,
    previewConfig.paragraphCount,
    previewConfig.seconds,
    previewConfig.source
  ]);

  const previewArticle=article.data;
  const previewTeaserBlock=previewArticle
    ? premiumTeaserParagraph(previewArticle.premiumTeaserHtml,previewArticle.canonicalUrl)
    : null;
  const premiumPreview=premiumPreviewConsumerState({
    previewState:premiumState,
    remainingSeconds:premiumRemainingSeconds,
    teaserAvailable:
      previewTeaserBlock!==null &&
      previewConfig.source==="owner-policy" &&
      previewConfig.paragraphCount===1 &&
      previewConfig.seconds===20,
    commerceStatus:commerce.loading ? "loading" : (commerce.data?.status ?? "unavailable"),
    promptRequested:premiumPromptRequested
  });

  useEffect(()=>{
    const current=article.data;
    if(!current || current.accessPolicy!=="premium" || entitlement.data!==false){
      setPremiumPromptVisible(false);
      return;
    }
    const stableStoryId=current.canonicalStoryId ?? current.id;
    const sessionKey=stableStoryId+"|"+previewConfig.source+"|"+previewConfig.paragraphCount+"|"+previewConfig.seconds;
    if(premiumPreview.state!=="expired" || premiumPreview.promptRequested!==true) return;
    if(premiumPromptOpenedSession.current===sessionKey) return;
    premiumPromptOpenedSession.current=sessionKey;
    setPremiumPromptVisible(true);
  },[
    article.data?.id,
    article.data?.canonicalStoryId,
    article.data?.accessPolicy,
    entitlement.data,
    premiumPreview.state,
    premiumPreview.promptRequested,
    previewConfig.paragraphCount,
    previewConfig.seconds,
    previewConfig.source
  ]);

  if(article.loading) return <Page><LoadingBlock label="Loading article…" /></Page>;
  if(!article.data) return <Page title="Article"><Text style={[styles.muted,{color:palette.inkMuted}]}>Article not found.</Text></Page>;

  const publicStory=article.data;
  const verifiedPremiumStory=
    entitlement.data===true && entitledArticle.data?.bodyHtml
      ? entitledArticle.data
      : null;
  const story=verifiedPremiumStory ?? publicStory;
  const displayStandfirst=readerFacingStandfirst(story.standfirst ?? story.excerpt,story.author?.displayName);
  const premiumTeaserBlock=previewTeaserBlock;
  const displayMediaCredit=readerFacingMediaCredit(story.heroMedia?.credit);
  const protectedBody=
    publicStory.accessPolicy==="premium" &&
    !verifiedPremiumStory?.bodyHtml;
  const blocks=parseArticleContent(protectedBody ? null : story.bodyHtml,story.canonicalUrl);
  const desktop=width >= breakpoints.desktop;
  const publishedLabel=formatArticleTime(story.publishedAt);
  const modifiedLabel=formatArticleTime(story.modifiedAt);
  const showUpdated=Boolean(story.modifiedAt && story.modifiedAt!==story.publishedAt);
  const readingMinutes=protectedBody ? null : estimateReadingMinutes(story.bodyHtml);
  const nonEntitledPremium=publicStory.accessPolicy==="premium" && entitlement.data===false && !verifiedPremiumStory;
  // UI-03 consumes the NM-05 preview/commerce/prompt state derived above.
  const previewVisible=
    nonEntitledPremium &&
    (premiumPreview.state==="available" || premiumPreview.state==="warning");
  const entitledDeliveryUnavailable=publicStory.accessPolicy==="premium" && entitlement.data===true && !verifiedPremiumStory?.bodyHtml;
  const showInContentAd=!protectedBody && blocks.length>=4;
  const showArticleEndAd=!protectedBody && blocks.length>=3;

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
      setActionStatus("Premium body is not available for offline storage without entitlement. Offline Premium persistence also remains disabled until a verified offline entitlement policy exists.");
      return;
    }
    await services.reader.downloadArticle(story);
    setActionStatus("Available offline");
  };

  const dismissPremiumPrompt=()=>{
    setPremiumPromptVisible(false);
  };

  const signInFromPrompt=()=>{
    setPremiumPromptVisible(false);
    router.push("/account-access" as never);
  };

  const startPremiumAcquisition=async()=>{
    if(Platform.OS!=="web" || !premiumPreview.commerceAvailable){
      setPremiumPromptVisible(false);
      router.push("/premium" as never);
      return;
    }

    try{
      await services.analytics.track(event("subscription_started",{
        source_path:"/article/"+story.id,
        commerce_channel:"web-server"
      },{storyId:story.id,pagePath:"/article/"+story.id}));
      const result=await services.premiumCommerce.startCheckout({
        productPlanId:commerce.data?.productPlanId ?? null
      });
      const checkoutUrl=result.checkoutUrl?.trim() ?? "";
      if(result.status==="redirect-required" && /^https:\/\//i.test(checkoutUrl)){
        setPremiumPromptVisible(false);
        await Linking.openURL(checkoutUrl);
        return;
      }
      setPremiumPromptVisible(false);
      setActionStatus(result.message || "Premium checkout is unavailable. No membership access has been granted.");
    }catch{
      setPremiumPromptVisible(false);
      setActionStatus("Premium checkout is unavailable. No membership access has been granted.");
    }
  };

  return (
    <Page
      initialScrollProgress={readPosition.data ?? 0}
      onScrollProgress={persistProgress}
    >
      <ArticleToolbar
        textScale={textScale}
        onBack={()=>router.back()}
        onTextScale={()=>setTextScale(textScale>=1.25?0.9:textScale+0.1)}
        onSave={()=>{void save();}}
        onListen={()=>router.push("/listen" as never)}
        onShare={()=>{void share();}}
        onOffline={()=>{void download();}}
      />
      {!!actionStatus && <Text accessibilityLiveRegion="polite" style={[styles.actionStatus,{color:colors.success}]}>{actionStatus}</Text>}

      {story.heroMedia?.publicUrl && (
        <View style={styles.heroWrap}>
          <Image testID="article-hero-media" source={{uri:story.heroMedia.publicUrl}} style={[styles.hero,{backgroundColor:palette.paperMuted}]} accessibilityLabel={story.heroMedia.altText ?? story.title} />
          {!!story.heroMedia.caption && <Text style={[styles.caption,{color:palette.inkMuted}]}>{story.heroMedia.caption}</Text>}
          {!!displayMediaCredit && <Text style={[styles.credit,{color:palette.inkMuted}]}>{displayMediaCredit}</Text>}
        </View>
      )}

      <View style={styles.articleHeader}>
        <View style={styles.metaRow}>
          <Text style={[styles.kicker,{color:palette.blue}]}>{story.primarySection?.name ?? "HealthTimes"}</Text>
          {story.accessPolicy==="premium" && <PremiumBadge />}
        </View>
        <Text style={[styles.title,{color:palette.ink},desktop && styles.titleDesktop]}>{story.title}</Text>
        {!!displayStandfirst && <Text style={[styles.standfirst,{color:palette.inkMuted}]}>{displayStandfirst}</Text>}
        <View style={styles.publicationMeta}>
          {story.author ? (
            <Pressable accessibilityRole="link" onPress={()=>router.push(("/author/"+story.author!.slug) as never)}>
              <Text style={[styles.byline,{color:palette.blue}]}>By {story.author.displayName}</Text>
            </Pressable>
          ) : (
            <Text style={[styles.byline,{color:palette.inkMuted}]}>HealthTimes</Text>
          )}
          <View style={styles.readingContext}>
            {!!publishedLabel && <Text style={[styles.timeMeta,{color:palette.inkMuted}]}>Published {publishedLabel}</Text>}
            {showUpdated && !!modifiedLabel && <Text style={[styles.timeMeta,{color:palette.inkMuted}]}>Updated {modifiedLabel}</Text>}
            {!!readingMinutes && <Text style={[styles.timeMeta,{color:palette.inkMuted}]}>{readingMinutes} min read</Text>}
          </View>
        </View>
        {!!story.geography.length && (
          <View style={styles.geography}>
            {story.geography.map((zone)=><Text key={zone.id} style={[styles.geoLabel,{color:palette.inkMuted,borderColor:palette.border}]}>{zone.name}</Text>)}
          </View>
        )}
      </View>

      <View style={styles.body}>
        {publicStory.accessPolicy==="premium" && entitlement.loading ? (
          <View style={[styles.memberState,{borderColor:palette.border}]}>
            <Text style={[styles.memberStateTitle,{color:palette.ink}]}>Checking member access…</Text>
            <Text style={[styles.memberStateText,{color:palette.inkMuted}]}>HealthTimes is confirming whether this account can open the full article.</Text>
          </View>
        ) : entitledDeliveryUnavailable ? (
          <View style={[styles.memberState,{borderColor:palette.border}]}>
            <Text style={[styles.memberStateTitle,{color:palette.ink}]}>Premium member access is active</Text>
            <Text style={[styles.memberStateText,{color:palette.inkMuted}]}>This protected article is not available to load right now. No protected text has been exposed.</Text>
          </View>
        ) : nonEntitledPremium ? (
          previewVisible ? (
            <View style={styles.preview}>
              {premiumTeaserBlock && (
                <Text style={[styles.paragraph,{fontSize:type.body*textScale,lineHeight:29*textScale,color:palette.ink}]}>
                  {renderInlines(premiumTeaserBlock.inlines,"premium-teaser",palette.blue)}
                </Text>
              )}
              <View style={[styles.previewNotice,{borderColor:colors.premium,backgroundColor:palette.paperMuted}]}>
                <Text style={styles.previewLabel}>PREMIUM PREVIEW</Text>
                <Text style={[styles.previewCountdown,{color:palette.ink}]}>
                  {premiumPreview.state==="warning"
                    ? "Your Premium preview is ending soon"
                    : "Premium preview · "+premiumPreview.remainingSeconds+" seconds remaining"}
                </Text>
                <Text
                  accessibilityLiveRegion={premiumPreview.state==="warning" ? "polite" : undefined}
                  style={[styles.previewText,{color:palette.inkMuted}]}
                >
                  {premiumPreview.state==="warning"
                    ? "Members can continue with the full article after the preview ends."
                    : "You are reading the authorized first-paragraph preview. The full member article has not been downloaded."}
                </Text>
              </View>
            </View>
          ) : (
            <PremiumPaywall
              onGoPremium={()=>router.push("/premium" as never)}
              onSignIn={()=>router.push("/account-access" as never)}
            />
          )
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
                  {showInContentAd && index===1 && (
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

      {showArticleEndAd && <Section><AdSlot placement="article_end" /></Section>}

      <PremiumSubscriptionPrompt
        visible={
          premiumPromptVisible &&
          nonEntitledPremium &&
          premiumPreview.state==="expired" &&
          premiumPreview.promptRequested===true
        }
        commerceAvailable={premiumPreview.commerceAvailable}
        onPrimary={()=>{void startPremiumAcquisition();}}
        onSignIn={signInFromPrompt}
        onDismiss={dismissPremiumPrompt}
      />
    </Page>
  );
}
const styles=StyleSheet.create({
  actionStatus:{fontSize:12,fontWeight:"700",marginTop:spacing.sm},
  heroWrap:{marginTop:spacing.lg,width:"100%",alignSelf:"center"},
  hero:{width:"100%",aspectRatio:16/9,borderRadius:radius.sm},
  articleHeader:{marginTop:spacing.xl,gap:spacing.md,maxWidth:layout.articleMax,alignSelf:"center",width:"100%"},
  metaRow:{flexDirection:"row",gap:spacing.sm,alignItems:"center",flexWrap:"wrap"},
  kicker:{fontSize:12,fontWeight:"900",textTransform:"uppercase",letterSpacing:0.8},
  title:{fontSize:36,lineHeight:42,fontWeight:"900",letterSpacing:-0.9},
  titleDesktop:{fontSize:48,lineHeight:54,letterSpacing:-1.2},
  standfirst:{fontSize:18,lineHeight:28,maxWidth:700},
  publicationMeta:{gap:5},
  readingContext:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  byline:{fontSize:13,fontWeight:"800"},
  timeMeta:{fontSize:11,lineHeight:17},
  geography:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  geoLabel:{fontSize:11,fontWeight:"700",borderWidth:1,borderRadius:radius.sm,paddingHorizontal:8,paddingVertical:5},
  caption:{fontSize:12,lineHeight:18,marginTop:spacing.sm,maxWidth:900},
  credit:{fontSize:11,marginTop:spacing.xs},
  body:{maxWidth:layout.articleMax,alignSelf:"center",width:"100%",marginTop:spacing.xl},
  paragraph:{marginBottom:spacing.xl},
  bodyHeading:{fontWeight:"900",letterSpacing:-.4,marginTop:spacing.xl,marginBottom:spacing.md},
  quote:{borderLeftWidth:3,paddingLeft:spacing.lg,marginVertical:spacing.xl},
  quoteText:{fontWeight:"700",fontStyle:"italic"},
  articleList:{marginBottom:spacing.lg},
  listRow:{flexDirection:"row",alignItems:"flex-start",gap:spacing.sm,marginBottom:spacing.md},
  listBullet:{fontSize:18,fontWeight:"900",lineHeight:29},
  listText:{flex:1},
  inlineFigure:{marginVertical:spacing.xl,gap:spacing.sm},
  inlineFigureImage:{width:"100%",aspectRatio:16/9,borderRadius:radius.sm},
  inlineStrong:{fontWeight:"900"},
  inlineEmphasis:{fontStyle:"italic"},
  inlineAd:{marginVertical:spacing.xxl},
  preview:{gap:spacing.md},
  previewNotice:{borderLeftWidth:3,padding:spacing.lg,gap:spacing.xs},
  previewLabel:{fontSize:10,fontWeight:"900",letterSpacing:1.1,color:colors.premium},
  previewCountdown:{fontSize:14,lineHeight:21,fontWeight:"900"},
  previewText:{fontSize:13,lineHeight:20},
  memberState:{borderTopWidth:1,borderBottomWidth:1,paddingVertical:spacing.xl,gap:spacing.sm},
  memberStateTitle:{fontSize:21,fontWeight:"900"},
  memberStateText:{fontSize:14,lineHeight:22,maxWidth:620},
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
