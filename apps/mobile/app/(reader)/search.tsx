import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Chip, EmptyState, LoadingBlock, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { AudioCard, LiveRail, StoryGrid, StoryList, VideoCard } from "../../src/ui/Cards";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import type { SearchResult } from "../../src/domain/models";
import { breakpoints, layout, radius, spacing } from "../../src/theme/tokens";
import { event } from "../../src/growth/events";
import { useAppearance } from "../../src/theme/AppearanceProvider";

type ResultView="all"|"article"|"video"|"audio"|"authors";

function FormatTabButton({
  label,
  active,
  onPress
}:{
  label:string;
  active:boolean;
  onPress:()=>void;
}){
  const { palette }=useAppearance();
  const [focused,setFocused]=useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{selected:active}}
      onFocus={()=>setFocused(true)}
      onBlur={()=>setFocused(false)}
      onPress={onPress}
      style={[
        styles.formatTab,
        focused && styles.controlFocused,
        {
          backgroundColor:active ? palette.blue : palette.paperMuted,
          borderColor:focused ? palette.blue : active ? palette.blue : palette.border
        }
      ]}
    >
      <Text style={[styles.formatTabText,{color:active ? "#FFFFFF" : palette.ink}]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SuggestionRow({
  label,
  compactColumn,
  onPress
}:{
  label:string;
  compactColumn:boolean;
  onPress:()=>void;
}){
  const { palette }=useAppearance();
  const [focused,setFocused]=useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onFocus={()=>setFocused(true)}
      onBlur={()=>setFocused(false)}
      onPress={onPress}
      style={({pressed})=>[
        styles.suggestionRow,
        compactColumn && styles.suggestionRowColumn,
        focused && styles.controlFocused,
        {
          backgroundColor:pressed ? palette.border : palette.paperMuted,
          borderColor:focused ? palette.blue : palette.border
        }
      ]}
    >
      <View accessible={false} style={styles.suggestionIconWrap}>
        <SymbolView
          name={{ios:"magnifyingglass",android:"search",web:"search"}}
          tintColor={palette.inkMuted}
          size={15}
        />
      </View>
      <Text numberOfLines={1} style={[styles.suggestionText,{color:palette.ink}]}>
        {label}
      </Text>
      <Text accessible={false} style={[styles.suggestionArrow,{color:palette.inkMuted}]}>
        ↗
      </Text>
    </Pressable>
  );
}

export default function SearchScreen(){
  const router=useRouter();
  const { palette }=useAppearance();
  const { width:rawWidth }=useWindowDimensions();
  const [responsiveReady,setResponsiveReady]=useState(Platform.OS!=="web");
  useEffect(()=>{
    if(Platform.OS==="web") setResponsiveReady(true);
  },[]);
  const width=responsiveReady ? rawWidth : 0;
  const tablet=width>=breakpoints.tablet && width<breakpoints.desktop;
  const desktop=width>=breakpoints.desktop;
  const wideLayout=tablet||desktop;

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

  const activeFilterCount=[country,topic].filter(Boolean).length;

  const resultTitle=submitted
    ? totalResults+" "+(totalResults===1?"result":"results")+" for “"+submitted+"”"
    : hasFilters||view!=="all"
      ? totalResults+" "+(totalResults===1?"result":"results")
      : "Search results";

  return (
    <Page chrome={desktop}>
      <View style={[styles.root,!desktop && styles.mobileBottomReserve,wideLayout && styles.wideContainer]}>
        <View style={[styles.searchFieldWrap,{borderColor:palette.border,backgroundColor:palette.paperMuted}]}>
          <View accessible={false} style={styles.searchLeadingIcon}>
            <SymbolView
              name={{ios:"magnifyingglass",android:"search",web:"search"}}
              tintColor={palette.inkMuted}
              size={18}
            />
          </View>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search articles, topics, authors…"
            placeholderTextColor={palette.inkMuted}
            style={[styles.input,{color:palette.ink}]}
            returnKeyType="search"
            onSubmitEditing={()=>submit()}
            accessibilityLabel="Search HealthTimes"
            accessibilityHint="Enter words, an author, a topic or a country, then submit your search"
            autoCorrect={false}
          />
          {!!query && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search query"
              onPress={reset}
              style={styles.iconAction}
            >
              <SymbolView
                name={{ios:"xmark.circle.fill",android:"cancel",web:"cancel"}}
                tintColor={palette.inkMuted}
                size={18}
              />
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Submit HealthTimes search"
            onPress={()=>submit()}
            style={({pressed})=>[
              styles.submitIconButton,
              {backgroundColor:pressed ? palette.navy : palette.blue}
            ]}
          >
            <SymbolView
              name={{ios:"arrow.forward",android:"arrow_forward",web:"arrow_forward"}}
              tintColor="#FFFFFF"
              size={16}
            />
          </Pressable>
        </View>

        <View style={[styles.controlsBar,wideLayout && styles.controlsBarWide]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.formatRail}
            contentContainerStyle={styles.formatTabs}
            accessibilityLabel="Search result types"
          >
            {formatTabs.map(([label,value])=>(
              <FormatTabButton
                key={label}
                label={label}
                active={view===value}
                onPress={()=>chooseView(value)}
              />
            ))}
          </ScrollView>

          {view!=="authors" && (
            <View style={styles.filterUtilityRow}>
              {hasFilters && !filtersOpen ? (
                <Text numberOfLines={1} style={[styles.activeFilterSummary,{color:palette.inkMuted}]}>
                  {[country,topic].filter(Boolean).join(" · ")}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{expanded:filtersOpen}}
                accessibilityLabel={filtersOpen?"Hide search filters":"Show search filters"}
                style={[
                  styles.filterToggleButton,
                  {
                    borderColor:filtersOpen||hasFilters ? palette.blue : palette.border,
                    backgroundColor:filtersOpen ? palette.paperMuted : palette.paper
                  }
                ]}
                onPress={()=>setFiltersOpen((value)=>!value)}
              >
                <View accessible={false} style={styles.filterToggleIcon}>
                  <SymbolView
                    name={{ios:"slider.horizontal.3",android:"tune",web:"tune"}}
                    tintColor={filtersOpen||hasFilters ? palette.blue : palette.inkMuted}
                    size={14}
                  />
                </View>
                <Text style={[styles.filterToggleText,{color:filtersOpen||hasFilters ? palette.blue : palette.ink}]}>
                  {filtersOpen ? "Hide filters" : "Filters"}{activeFilterCount ? " · "+activeFilterCount : ""}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {filtersOpen && view!=="authors" && (
          <View style={[styles.filterPanel,{borderColor:palette.border,backgroundColor:palette.paperMuted}]}>
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
              <Text style={[styles.filterUnavailable,{color:palette.inkMuted}]}>
                Filters are unavailable right now. You can still search by words or author.
              </Text>
            ) : null}

            {hasFilters && (
              <Pressable accessibilityRole="button" accessibilityLabel="Clear filters" style={styles.clear} onPress={clearFilters}>
                <Text style={[styles.clearText,{color:palette.blue}]}>Clear filters</Text>
              </Pressable>
            )}
          </View>
        )}

        {!searchActive && (
          <>
            <View style={styles.suggestionsSection}>
              <Text style={[styles.trySearchingHeading,{color:palette.ink}]}>Try searching for</Text>
              {taxonomy.loading && !taxonomy.data ? (
                <LoadingBlock label="Loading suggestions…" />
              ) : suggestions.length ? (
                <View style={[styles.suggestionsList,wideLayout && styles.suggestionsGridWide]}>
                  {suggestions.map((item)=>(
                    <SuggestionRow
                      key={item}
                      label={item}
                      compactColumn={wideLayout}
                      onPress={()=>submit(item)}
                    />
                  ))}
                </View>
              ) : (
                <Text style={[styles.initialNote,{color:palette.inkMuted}]}>
                  Enter a word, author, topic or country to search HealthTimes.
                </Text>
              )}
            </View>

            <View style={[styles.explanationCard,{borderColor:palette.border,backgroundColor:palette.paperMuted}]}>
              <View style={styles.explanationHeader}>
                <View accessible={false} style={[styles.explanationBadge,{backgroundColor:palette.paper,borderColor:palette.border}]}>
                  <SymbolView
                    name={{ios:"sparkle.magnifyingglass",android:"manage_search",web:"manage_search"}}
                    tintColor={palette.blue}
                    size={18}
                  />
                </View>
                <View style={styles.explanationTitleWrap}>
                  <Text style={[styles.explanationTitle,{color:palette.ink}]}>Intelligent Search</Text>
                  <Text style={[styles.explanationSubtitle,{color:palette.inkMuted}]}>
                    HealthTimes Journalism & Discovery
                  </Text>
                </View>
              </View>
              <Text style={[styles.explanationBody,{color:palette.inkMuted}]}>
                Search HealthTimes reporting by headline, topic, author, country, video and audio using publication taxonomy and recency.
              </Text>
              <Text style={[styles.privacyNote,{color:palette.inkMuted}]}>
                Your raw health search words are not sent to Reader analytics.
              </Text>
            </View>
          </>
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
                      {(hasFilters||view!=="all"||submitted) && <Chip onPress={reset}>Reset search</Chip>}
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
                {desktop && visibleArticles.length>=3
                  ? <StoryGrid stories={visibleArticles} />
                  : <StoryList stories={visibleArticles} />}
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
              <Text style={[styles.privacyNoteStandalone,{color:palette.inkMuted}]}>
                Your raw health search words are not sent to Reader analytics.
              </Text>
            )}
          </>
        )}
      </View>
    </Page>
  );
}

const styles=StyleSheet.create({
  root:{paddingTop:spacing.md,gap:spacing.md},
  mobileBottomReserve:{paddingBottom:spacing.xxl},
  wideContainer:{maxWidth:860,width:"100%",alignSelf:"center",paddingTop:spacing.xl,gap:spacing.lg},
  searchFieldWrap:{
    minHeight:50,
    borderWidth:1,
    borderRadius:radius.lg,
    paddingLeft:spacing.md,
    paddingRight:6,
    flexDirection:"row",
    alignItems:"center",
    gap:spacing.xs
  },
  searchLeadingIcon:{width:26,alignItems:"center",justifyContent:"center"},
  input:{
    flex:1,
    minWidth:140,
    minHeight:48,
    paddingVertical:spacing.sm,
    paddingHorizontal:4,
    fontSize:16
  },
  iconAction:{
    width:layout.touchMin,
    height:layout.touchMin,
    alignItems:"center",
    justifyContent:"center"
  },
  submitIconButton:{
    width:38,
    height:38,
    minWidth:38,
    minHeight:38,
    borderRadius:radius.md,
    alignItems:"center",
    justifyContent:"center"
  },
  controlsBar:{gap:spacing.xs},
  controlsBarWide:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:spacing.md},
  formatRail:{marginHorizontal:-spacing.xs,flexGrow:0},
  formatTabs:{paddingHorizontal:spacing.xs,gap:spacing.sm,alignItems:"center"},
  formatTab:{
    minHeight:40,
    paddingHorizontal:14,
    borderRadius:999,
    borderWidth:1,
    alignItems:"center",
    justifyContent:"center"
  },
  formatTabText:{fontSize:13,fontWeight:"800"},
  controlFocused:{borderWidth:2},
  filterUtilityRow:{
    flexDirection:"row",
    alignItems:"center",
    justifyContent:"flex-end",
    gap:spacing.sm
  },
  activeFilterSummary:{fontSize:12,flex:1},
  filterToggleButton:{
    minHeight:38,
    paddingHorizontal:12,
    borderRadius:999,
    borderWidth:1,
    flexDirection:"row",
    alignItems:"center",
    gap:6
  },
  filterToggleIcon:{alignItems:"center",justifyContent:"center"},
  filterToggleText:{fontSize:12,fontWeight:"800"},
  filterPanel:{
    borderWidth:1,
    borderRadius:radius.md,
    padding:spacing.lg,
    gap:spacing.md
  },
  filters:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  filterBlock:{gap:spacing.sm},
  filterLabel:{fontSize:10,fontWeight:"900",letterSpacing:1.1},
  filterUnavailable:{fontSize:13,lineHeight:20},
  clear:{alignSelf:"flex-start",minHeight:layout.touchMin,justifyContent:"center"},
  clearText:{fontSize:13,fontWeight:"900"},
  suggestionsSection:{marginTop:spacing.xs,gap:spacing.sm},
  trySearchingHeading:{fontSize:16,fontWeight:"900",letterSpacing:-0.2},
  suggestionsList:{gap:spacing.sm},
  suggestionsGridWide:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  suggestionRow:{
    minHeight:layout.touchMin,
    borderWidth:1,
    borderRadius:radius.md,
    paddingHorizontal:spacing.md,
    paddingVertical:10,
    flexDirection:"row",
    alignItems:"center",
    gap:spacing.sm
  },
  suggestionRowColumn:{flexBasis:"48%",flexGrow:1,minWidth:240},
  suggestionIconWrap:{width:20,alignItems:"center",justifyContent:"center"},
  suggestionText:{flex:1,fontSize:14,fontWeight:"700"},
  suggestionArrow:{fontSize:13,fontWeight:"700"},
  initialNote:{fontSize:14,lineHeight:21},
  explanationCard:{
    marginTop:spacing.xs,
    borderWidth:1,
    borderRadius:radius.md,
    padding:spacing.lg,
    gap:spacing.sm
  },
  explanationHeader:{flexDirection:"row",alignItems:"center",gap:spacing.md},
  explanationBadge:{
    width:40,
    height:40,
    borderRadius:radius.md,
    borderWidth:1,
    alignItems:"center",
    justifyContent:"center"
  },
  explanationTitleWrap:{flex:1,gap:2},
  explanationTitle:{fontSize:16,fontWeight:"900",letterSpacing:-0.2},
  explanationSubtitle:{fontSize:12,fontWeight:"700"},
  explanationBody:{fontSize:13,lineHeight:19},
  privacyNote:{fontSize:12,lineHeight:18},
  privacyNoteStandalone:{fontSize:12,lineHeight:18,marginTop:spacing.md},
  inlineAction:{minHeight:layout.touchMin,alignSelf:"flex-start",justifyContent:"center",marginTop:spacing.sm},
  inlineActionText:{fontSize:13,fontWeight:"900"},
  noResultActions:{marginTop:spacing.md,flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  resultSummary:{minHeight:layout.touchMin,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:spacing.md},
  resultSummaryText:{fontSize:13,lineHeight:20,flex:1},
  resetAction:{minHeight:layout.touchMin,justifyContent:"center"},
  resetActionText:{fontSize:13,fontWeight:"900"},
  authorGrid:{flexDirection:"row",flexWrap:"wrap",gap:spacing.md},
  authorCard:{minWidth:220,flexGrow:1,flexBasis:220,borderWidth:1,borderRadius:radius.md,padding:spacing.lg,gap:4},
  authorName:{fontSize:18,fontWeight:"900"},
  authorRole:{fontSize:12,lineHeight:18},
  authorAction:{fontSize:12,fontWeight:"800",marginTop:spacing.sm},
  mediaGrid:{flexDirection:"row",flexWrap:"wrap",gap:spacing.xl},
  mediaItem:{minWidth:260,flex:1}
});
