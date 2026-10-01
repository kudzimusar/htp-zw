import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { Chip, EmptyState, LoadingBlock, Page, Section, SectionHeader } from "../src/ui/Layout";
import { AudioCard, LiveRail, StoryList, VideoCard } from "../src/ui/Cards";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import type { SearchResult } from "../src/domain/models";
import { breakpoints, radius, spacing } from "../src/theme/tokens";
import { event } from "../src/growth/events";
import { useAppearance } from "../src/theme/AppearanceProvider";

type ResultView="all"|"article"|"video"|"audio"|"authors";

export default function SearchScreen(){
  const router=useRouter();
  const { palette }=useAppearance();
  const { width }=useWindowDimensions();
  const inputRef=useRef<TextInput>(null);
  const [query,setQuery]=useState("");
  const [submitted,setSubmitted]=useState("");
  const [view,setView]=useState<ResultView>("all");
  const [country,setCountry]=useState<string|undefined>();
  const [topic,setTopic]=useState<string|undefined>();
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [retryKey,setRetryKey]=useState(0);
  const taxonomy=useAsync(()=>services.taxonomy.getSnapshot(),[]);

  const serviceFormat=view==="article"||view==="video"||view==="audio" ? view : undefined;
  const hasFilters=Boolean(country||topic);
  const searchActive=Boolean(submitted||hasFilters||view!=="all");
  const results=useAsync<SearchResult|null>(
    ()=>searchActive
      ? services.search.search({text:submitted,format:serviceFormat,country,topic})
      : Promise.resolve(null),
    [searchActive,submitted,serviceFormat,country,topic,retryKey]
  );

  const countries=useMemo(()=>
    (taxonomy.data?.geographicZones ?? [])
      .filter((item)=>item.level==="country")
      .map((item)=>item.name)
      .slice(0,12)
  ,[taxonomy.data]);

  const topics=useMemo(()=>{
    const sourceTopics=(taxonomy.data?.topics ?? []).map((item)=>item.name);
    const desks=(taxonomy.data?.editorialDesks ?? []).filter((item)=>item.active).map((item)=>item.name);
    return Array.from(new Set([...desks,...sourceTopics])).slice(0,24);
  },[taxonomy.data]);

  const suggestions=useMemo(()=>
    Array.from(new Set([
      ...topics.slice(0,6),
      ...countries.slice(0,3)
    ])).slice(0,8)
  ,[topics,countries]);

  const visibleArticles=(view==="all"||view==="article") ? results.data?.articles ?? [] : [];
  const visibleAuthors=(view==="all"||view==="authors") && !hasFilters ? results.data?.authors ?? [] : [];
  const visibleVideos=(view==="all"||view==="video") ? results.data?.videos ?? [] : [];
  const visibleAudio=(view==="all"||view==="audio") ? results.data?.audio ?? [] : [];
  const visibleLive=view==="all" ? results.data?.live ?? [] : [];
  const totalResults=visibleArticles.length+visibleAuthors.length+visibleVideos.length+visibleAudio.length+visibleLive.length;

  useEffect(()=>{
    if(Platform.OS==="web" && width>=breakpoints.desktop){
      inputRef.current?.focus();
    }
  },[width]);

  useEffect(()=>{
    if(!searchActive || !results.data) return;
    void services.analytics.track(event("search_performed",{
      result_count:totalResults,
      format:view,
      country_filter:Boolean(country),
      topic_filter:Boolean(topic),
      query_redacted:true
    },{pagePath:"/search"}));
  },[searchActive,view,country,topic,results.data,totalResults]);

  const submit=(value=query)=>{
    const next=value.trim();
    setQuery(next);
    setSubmitted(next);
  };

  const clearFilters=()=>{
    setCountry(undefined);
    setTopic(undefined);
  };

  const reset=()=>{
    setQuery("");
    setSubmitted("");
    setView("all");
    clearFilters();
    setFiltersOpen(false);
    requestAnimationFrame(()=>inputRef.current?.focus());
  };

  const chooseView=(next:ResultView)=>{
    setView(next);
    if(next==="authors") clearFilters();
  };

  const formatTabs:[
    string,
    ResultView
  ][]=[
    ["All","all"],
    ["Articles","article"],
    ["Videos","video"],
    ["Audio","audio"],
    ["Authors","authors"]
  ];

  const resultTitle=submitted
    ? totalResults+" "+(totalResults===1?"result":"results")+" for “"+submitted+"”"
    : hasFilters||view!=="all"
      ? totalResults+" "+(totalResults===1?"result":"results")
      : "Search results";

  return (
    <Page title="Intelligent Search">
      <Text style={[styles.lede,{color:palette.inkMuted}]}>
        Search HealthTimes reporting by words, author, topic, country and supported media format.
      </Text>

      <View style={[styles.searchPanel,{borderColor:palette.border,backgroundColor:palette.paperMuted}]}>
        <Text style={[styles.searchLabel,{color:palette.ink}]}>Search HealthTimes</Text>
        <View style={styles.searchRow}>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search stories, people and topics"
            placeholderTextColor={palette.inkMuted}
            style={[styles.input,{borderColor:palette.border,color:palette.ink,backgroundColor:palette.paper}]}
            returnKeyType="search"
            onSubmitEditing={()=>submit()}
            accessibilityLabel="Search HealthTimes"
            accessibilityHint="Enter words, an author, a topic or a country, then submit your search"
            autoCorrect={false}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Submit HealthTimes search"
            style={[styles.button,{backgroundColor:palette.blue}]}
            onPress={()=>submit()}
          >
            <Text style={[styles.buttonText,{color:"#FFFFFF"}]}>Search</Text>
          </Pressable>
        </View>
        <Text style={[styles.searchHelp,{color:palette.inkMuted}]}>
          Matches use existing HealthTimes wording, authors, topics, geography and publication recency.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.formatRail}
        contentContainerStyle={styles.formatTabs}
        accessibilityLabel="Search result types"
      >
        {formatTabs.map(([label,value])=>
          <Chip key={label} active={view===value} onPress={()=>chooseView(value)}>{label}</Chip>
        )}
      </ScrollView>

      {view!=="authors" && (
        <View style={[styles.filterDisclosure,{borderColor:palette.border}]}>
          <View style={styles.filterDisclosureCopy}>
            <Text style={[styles.filterDisclosureTitle,{color:palette.ink}]}>Filter results</Text>
            <Text style={[styles.filterDisclosureText,{color:palette.inkMuted}]}>
              {hasFilters ? [country,topic].filter(Boolean).join(" · ") : "Country and topic filters"}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{expanded:filtersOpen}}
            accessibilityLabel={filtersOpen?"Hide search filters":"Show search filters"}
            style={[styles.filterButton,{borderColor:palette.border}]}
            onPress={()=>setFiltersOpen((value)=>!value)}
          >
            <Text style={[styles.filterButtonText,{color:palette.blue}]}>{filtersOpen?"Hide":"Filters"}{hasFilters?" · "+[country,topic].filter(Boolean).length:""}</Text>
          </Pressable>
        </View>
      )}

      {filtersOpen && view!=="authors" && (
        <View style={[styles.filterPanel,{borderColor:palette.border,backgroundColor:palette.paper}]}>
          {!!countries.length && (
            <View style={styles.filterBlock}>
              <Text style={[styles.filterLabel,{color:palette.inkMuted}]}>COUNTRY</Text>
              <View style={styles.filters}>
                {countries.map((item)=>
                  <Chip key={item} active={country===item} onPress={()=>setCountry(country===item?undefined:item)}>{item}</Chip>
                )}
              </View>
            </View>
          )}

          {!!topics.length && (
            <View style={styles.filterBlock}>
              <Text style={[styles.filterLabel,{color:palette.inkMuted}]}>TOPIC / DESK</Text>
              <View style={styles.filters}>
                {topics.map((item)=>
                  <Chip key={item} active={topic===item} onPress={()=>setTopic(topic===item?undefined:item)}>{item}</Chip>
                )}
              </View>
            </View>
          )}

          {taxonomy.loading && !taxonomy.data ? <LoadingBlock label="Loading filters…" /> : null}
          {taxonomy.error && !taxonomy.data ? (
            <Text style={[styles.filterUnavailable,{color:palette.inkMuted}]}>Filters are unavailable right now. You can still search by words or author.</Text>
          ) : null}

          {hasFilters && (
            <Pressable accessibilityRole="button" style={styles.clear} onPress={clearFilters}>
              <Text style={[styles.clearText,{color:palette.blue}]}>Clear filters</Text>
            </Pressable>
          )}
        </View>
      )}

      {!searchActive && (
        <Section>
          <SectionHeader title="Suggested searches" eyebrow="EXPLORE A TOPIC" />
          {taxonomy.loading && !taxonomy.data ? (
            <LoadingBlock label="Loading suggestions…" />
          ) : suggestions.length ? (
            <View style={styles.suggestions}>
              {suggestions.map((item)=><Chip key={item} onPress={()=>submit(item)}>{item}</Chip>)}
            </View>
          ) : (
            <Text style={[styles.initialNote,{color:palette.inkMuted}]}>
              Enter a word, author, topic or country to search HealthTimes.
            </Text>
          )}
          <Text style={[styles.privacyNote,{color:palette.inkMuted}]}>
            Your raw health search words are not sent to Reader analytics.
          </Text>
        </Section>
      )}

      {searchActive && results.loading ? (
        <Section>
          <LoadingBlock label="Searching HealthTimes…" />
        </Section>
      ) : null}

      {searchActive && results.error ? (
        <Section>
          <EmptyState
            title="Search is temporarily unavailable"
            message="HealthTimes could not complete this search. Check your connection and try again."
            action={
              <Pressable accessibilityRole="button" accessibilityLabel="Retry search" style={styles.inlineAction} onPress={()=>setRetryKey((value)=>value+1)}>
                <Text style={[styles.inlineActionText,{color:palette.blue}]}>Try again</Text>
              </Pressable>
            }
          />
        </Section>
      ) : null}

      {searchActive && !results.loading && !results.error && results.data && (
        <>
          <Section>
            <SectionHeader title={resultTitle} eyebrow="HEALTHTIMES SEARCH" />
            {totalResults===0 ? (
              <EmptyState
                title="No HealthTimes results found"
                message="Try fewer words, a broader health topic, an author name, or remove a filter."
                action={
                  <View style={styles.noResultActions}>
                    {(hasFilters||view!=="all") && <Chip onPress={reset}>Reset search</Chip>}
                    {suggestions.slice(0,4).map((item)=><Chip key={"retry-"+item} onPress={()=>submit(item)}>{item}</Chip>)}
                  </View>
                }
              />
            ) : (
              <View style={styles.resultSummary}>
                <Text style={[styles.resultSummaryText,{color:palette.inkMuted}]}>
                  {visibleArticles.length?"Articles "+visibleArticles.length:""}
                  {visibleAuthors.length?(visibleArticles.length?" · ":"")+"Authors "+visibleAuthors.length:""}
                  {visibleVideos.length?((visibleArticles.length||visibleAuthors.length)?" · ":"")+"Videos "+visibleVideos.length:""}
                  {visibleAudio.length?((visibleArticles.length||visibleAuthors.length||visibleVideos.length)?" · ":"")+"Audio "+visibleAudio.length:""}
                  {visibleLive.length?((visibleArticles.length||visibleAuthors.length||visibleVideos.length||visibleAudio.length)?" · ":"")+"Live "+visibleLive.length:""}
                </Text>
                <Pressable accessibilityRole="button" style={styles.resetAction} onPress={reset}>
                  <Text style={[styles.resetActionText,{color:palette.blue}]}>New search</Text>
                </Pressable>
              </View>
            )}
          </Section>

          {!!visibleArticles.length && (
            <Section>
              <SectionHeader title="Articles" eyebrow="REPORTING" />
              <StoryList stories={visibleArticles} />
            </Section>
          )}

          {!!visibleAuthors.length && (
            <Section>
              <SectionHeader title="Author matches" eyebrow="PEOPLE" />
              <View style={styles.authorGrid}>
                {visibleAuthors.map((author)=>(
                  <Pressable
                    key={author.id}
                    accessibilityRole="link"
                    accessibilityLabel={"View stories by "+author.displayName}
                    style={[styles.authorCard,{borderColor:palette.border,backgroundColor:palette.paper}]}
                    onPress={()=>router.push(("/author/"+author.slug) as never)}
                  >
                    <Text style={[styles.authorName,{color:palette.ink}]}>{author.displayName}</Text>
                    {!!author.role && <Text style={[styles.authorRole,{color:palette.inkMuted}]}>{author.role}</Text>}
                    <Text style={[styles.authorAction,{color:palette.blue}]}>View stories →</Text>
                  </Pressable>
                ))}
              </View>
            </Section>
          )}

          {!!visibleVideos.length && (
            <Section>
              <SectionHeader title="Videos" eyebrow="WATCH" />
              <View style={styles.mediaGrid}>
                {visibleVideos.map((item)=><View key={item.id} style={styles.mediaItem}><VideoCard item={item} /></View>)}
              </View>
            </Section>
          )}

          {!!visibleAudio.length && (
            <Section>
              <SectionHeader title="Audio" eyebrow="LISTEN" />
              <View>{visibleAudio.map((item)=><AudioCard key={item.id} item={item} />)}</View>
            </Section>
          )}

          {!!visibleLive.length && (
            <Section>
              <SectionHeader title="Live" eyebrow="NOW" />
              <LiveRail items={visibleLive} />
            </Section>
          )}

          {totalResults===0 && (
            <Text style={[styles.privacyNote,{color:palette.inkMuted}]}>
              Your raw health search words are not sent to Reader analytics.
            </Text>
          )}
        </>
      )}
    </Page>
  );
}

const styles=StyleSheet.create({
  lede:{fontSize:16,lineHeight:24,maxWidth:760,marginTop:spacing.sm},
  searchPanel:{marginTop:spacing.xl,borderWidth:1,borderRadius:radius.md,padding:spacing.lg,gap:spacing.sm},
  searchLabel:{fontSize:18,fontWeight:"900"},
  searchRow:{flexDirection:"row",gap:spacing.sm,flexWrap:"wrap"},
  input:{flex:1,minWidth:220,minHeight:54,borderWidth:1,borderRadius:radius.md,paddingHorizontal:spacing.lg,fontSize:16},
  button:{minHeight:54,justifyContent:"center",paddingHorizontal:22,borderRadius:radius.md},
  buttonText:{fontWeight:"900"},
  searchHelp:{fontSize:12,lineHeight:18,maxWidth:720},
  formatRail:{marginTop:spacing.lg,marginHorizontal:-spacing.sm},
  formatTabs:{paddingHorizontal:spacing.sm,gap:spacing.sm},
  filterDisclosure:{marginTop:spacing.md,borderTopWidth:1,borderBottomWidth:1,paddingVertical:spacing.sm,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:spacing.md},
  filterDisclosureCopy:{flex:1,gap:2},
  filterDisclosureTitle:{fontSize:14,fontWeight:"900"},
  filterDisclosureText:{fontSize:12,lineHeight:18},
  filterButton:{minHeight:44,borderWidth:1,borderRadius:radius.sm,paddingHorizontal:spacing.md,justifyContent:"center"},
  filterButtonText:{fontSize:12,fontWeight:"900"},
  filterPanel:{borderBottomWidth:1,paddingVertical:spacing.lg,gap:spacing.lg},
  filters:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  filterBlock:{gap:spacing.sm},
  filterLabel:{fontSize:9,fontWeight:"900",letterSpacing:1.1},
  filterUnavailable:{fontSize:13,lineHeight:20},
  clear:{alignSelf:"flex-start",minHeight:44,justifyContent:"center"},
  clearText:{fontSize:13,fontWeight:"900"},
  suggestions:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  initialNote:{fontSize:14,lineHeight:21},
  privacyNote:{fontSize:12,lineHeight:18,marginTop:spacing.lg},
  inlineAction:{minHeight:44,alignSelf:"flex-start",justifyContent:"center",marginTop:spacing.sm},
  inlineActionText:{fontSize:13,fontWeight:"900"},
  noResultActions:{marginTop:spacing.md,flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  resultSummary:{minHeight:44,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:spacing.md},
  resultSummaryText:{fontSize:13,lineHeight:20,flex:1},
  resetAction:{minHeight:44,justifyContent:"center"},
  resetActionText:{fontSize:13,fontWeight:"900"},
  authorGrid:{flexDirection:"row",flexWrap:"wrap",gap:spacing.md},
  authorCard:{minWidth:220,flexGrow:1,flexBasis:220,borderWidth:1,borderRadius:radius.md,padding:spacing.lg,gap:4},
  authorName:{fontSize:18,fontWeight:"900"},
  authorRole:{fontSize:12,lineHeight:18},
  authorAction:{fontSize:12,fontWeight:"800",marginTop:spacing.sm},
  mediaGrid:{flexDirection:"row",flexWrap:"wrap",gap:spacing.xl},
  mediaItem:{minWidth:260,flex:1}
});
