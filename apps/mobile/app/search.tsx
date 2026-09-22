import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Chip, EmptyState, Page, Section, SectionHeader } from "../src/ui/Layout";
import { AudioCard, LiveRail, StoryGrid, VideoCard } from "../src/ui/Cards";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { radius, spacing } from "../src/theme/tokens";
import { event } from "../src/growth/events";
import { useAppearance } from "../src/theme/AppearanceProvider";

export default function SearchScreen(){
  const router=useRouter();
  const { palette }=useAppearance();
  const [query,setQuery]=useState("");
  const [submitted,setSubmitted]=useState("");
  const [format,setFormat]=useState<"article"|"video"|"audio"|"live"|undefined>();
  const [country,setCountry]=useState<string|undefined>();
  const [topic,setTopic]=useState<string|undefined>();
  const taxonomy=useAsync(()=>services.taxonomy.getSnapshot(),[]);
  const results=useAsync(
    ()=>services.search.search({text:submitted,format,country,topic}),
    [submitted,format,country,topic]
  );

  const countries=useMemo(()=>
    (taxonomy.data?.geographicZones ?? [])
      .filter((item)=>item.level==="country")
      .map((item)=>item.name)
      .slice(0,10)
  ,[taxonomy.data]);

  const topics=useMemo(()=>{
    const legacy=(taxonomy.data?.topics ?? []).map((item)=>item.name);
    const desks=(taxonomy.data?.editorialDesks ?? []).filter((item)=>item.active).map((item)=>item.name);
    return Array.from(new Set([...legacy,...desks])).slice(0,16);
  },[taxonomy.data]);

  const suggestions=useMemo(()=>
    Array.from(new Set([
      ...topics.slice(0,6),
      ...countries.slice(0,4)
    ])).slice(0,10)
  ,[topics,countries]);

  useEffect(()=>{
    if(!submitted || !results.data) return;
    const resultCount=
      results.data.articles.length+
      results.data.authors.length+
      results.data.videos.length+
      results.data.audio.length+
      results.data.live.length;
    void services.analytics.track(event("search_performed",{
      result_count:resultCount,
      format:format ?? "all",
      country_filter:Boolean(country),
      topic_filter:Boolean(topic),
      query_redacted:true
    },{pagePath:"/search"}));
  },[submitted,format,country,topic,results.data]);

  const submit=(value=query)=>{
    const next=value.trim();
    setQuery(next);
    setSubmitted(next);
  };

  const clearFilters=()=>{
    setFormat(undefined);
    setCountry(undefined);
    setTopic(undefined);
  };

  const hasFilters=Boolean(format||country||topic);

  return (
    <Page title="Intelligent Search">
      <Text style={[styles.lede,{color:palette.inkMuted}]}>Search HealthTimes journalism by words, author, topic, country and format. Results are ranked using article wording, publication topics, authors, geography and recency.</Text>

      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search HealthTimes reporting"
          placeholderTextColor={palette.inkMuted}
          style={[styles.input,{borderColor:palette.border,color:palette.ink,backgroundColor:palette.paper}]}
          returnKeyType="search"
          onSubmitEditing={()=>submit()}
          accessibilityLabel="Search HealthTimes"
        />
        <Pressable style={[styles.button,{backgroundColor:palette.blue}]} onPress={()=>submit()}>
          <Text style={[styles.buttonText,{color:palette.paper}]}>Search</Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        {([
          ["All",undefined],
          ["Articles","article"],
          ["Videos","video"],
          ["Audio","audio"],
          ["Live","live"]
        ] as const).map(([label,value])=><Chip key={label} active={format===value} onPress={()=>setFormat(value)}>{label}</Chip>)}
      </View>

      {!!countries.length && (
        <View style={styles.filterBlock}>
          <Text style={[styles.filterLabel,{color:palette.inkMuted}]}>COUNTRY</Text>
          <View style={styles.filters}>
            {countries.map((item)=><Chip key={item} active={country===item} onPress={()=>setCountry(country===item?undefined:item)}>{item}</Chip>)}
          </View>
        </View>
      )}

      {!!topics.length && (
        <View style={styles.filterBlock}>
          <Text style={[styles.filterLabel,{color:palette.inkMuted}]}>TOPIC / DESK</Text>
          <View style={styles.filters}>
            {topics.map((item)=><Chip key={item} active={topic===item} onPress={()=>setTopic(topic===item?undefined:item)}>{item}</Chip>)}
          </View>
        </View>
      )}

      {hasFilters && (
        <Pressable accessibilityRole="button" style={styles.clear} onPress={clearFilters}>
          <Text style={[styles.clearText,{color:palette.blue}]}>Clear filters</Text>
        </Pressable>
      )}

      {!submitted && !hasFilters && !!suggestions.length && (
        <Section>
          <SectionHeader title="Suggested searches" eyebrow="FROM CURRENT TAXONOMY" />
          <View style={styles.suggestions}>
            {suggestions.map((item)=><Chip key={item} onPress={()=>submit(item)}>{item}</Chip>)}
          </View>
        </Section>
      )}

      <Section>
        <SectionHeader
          title={submitted||hasFilters ? "Article results" : "Current HealthTimes coverage"}
          eyebrow="HEALTHTIMES DISCOVERY"
        />
        {results.data?.articles.length
          ? <StoryGrid stories={results.data.articles} />
          : <EmptyState title="No article results" message="Try a broader health topic, country, organization, author or format." />}
      </Section>

      {!!results.data?.authors.length && !format && (
        <Section>
          <SectionHeader title="Author matches" eyebrow="HEALTHTIMES AUTHORS" />
          <View style={styles.authorGrid}>
            {results.data.authors.map((author)=>(
              <Pressable
                key={author.id}
                accessibilityRole="link"
                style={[styles.authorCard,{borderColor:palette.border}]}
                onPress={()=>router.push(("/author/"+author.slug) as never)}
              >
                <Text style={[styles.authorName,{color:palette.ink}]}>{author.displayName}</Text>
                {!!author.role && <Text style={[styles.authorRole,{color:palette.inkMuted}]}>{author.role}</Text>}
                <Text style={[styles.authorAction,{color:palette.blue}]}>View HealthTimes stories →</Text>
              </Pressable>
            ))}
          </View>
        </Section>
      )}

      {!!results.data?.videos.length && (
        <Section>
          <SectionHeader title="Video matches" eyebrow="WATCH" />
          <View style={styles.mediaGrid}>{results.data.videos.map((item)=><View key={item.id} style={styles.mediaItem}><VideoCard item={item} /></View>)}</View>
        </Section>
      )}

      {!!results.data?.audio.length && (
        <Section>
          <SectionHeader title="Audio matches" eyebrow="LISTEN" />
          <View>{results.data.audio.map((item)=><AudioCard key={item.id} item={item} />)}</View>
        </Section>
      )}

      {!!results.data?.live.length && (
        <Section>
          <SectionHeader title="Live matches" eyebrow="LIVE" />
          <LiveRail items={results.data.live} />
        </Section>
      )}

      {!!submitted && results.data &&
        !results.data.articles.length &&
        !results.data.authors.length &&
        !results.data.videos.length &&
        !results.data.audio.length &&
        !results.data.live.length && (
          <Section>
            <SectionHeader title="Refine your search" />
            <Text style={[styles.refineText,{color:palette.inkMuted}]}>Try fewer words, a related topic, an author name, or remove a filter.</Text>
            <View style={styles.suggestions}>
              {hasFilters&&<Chip onPress={clearFilters}>Clear filters</Chip>}
              {suggestions.slice(0,6).map((item)=><Chip key={"refine-"+item} onPress={()=>submit(item)}>{item}</Chip>)}
            </View>
            <Text style={[styles.privacyNote,{color:palette.inkMuted}]}>Raw health search terms are not sent to analytics by this Reader.</Text>
          </Section>
      )}
    </Page>
  );
}

const styles=StyleSheet.create({
  lede:{fontSize:15,lineHeight:23,maxWidth:800,marginTop:spacing.sm},
  searchRow:{marginTop:spacing.xl,flexDirection:"row",gap:spacing.sm,flexWrap:"wrap"},
  input:{flex:1,minWidth:220,minHeight:54,borderWidth:1,borderRadius:radius.md,paddingHorizontal:spacing.lg,fontSize:16},
  button:{minHeight:54,justifyContent:"center",paddingHorizontal:20,borderRadius:radius.md},
  buttonText:{fontWeight:"900"},
  filters:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  filterBlock:{marginTop:spacing.lg,gap:spacing.sm},
  filterLabel:{fontSize:9,fontWeight:"900",letterSpacing:1.1},
  clear:{alignSelf:"flex-start",minHeight:44,justifyContent:"center",marginTop:spacing.sm},
  clearText:{fontSize:13,fontWeight:"900"},
  suggestions:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  authorGrid:{flexDirection:"row",flexWrap:"wrap",gap:spacing.md},
  authorCard:{minWidth:220,flexGrow:1,flexBasis:220,borderWidth:1,borderRadius:radius.md,padding:spacing.lg,gap:4},
  authorName:{fontSize:18,fontWeight:"900"},
  authorRole:{fontSize:12},
  authorAction:{fontSize:12,fontWeight:"800",marginTop:spacing.sm},
  mediaGrid:{flexDirection:"row",flexWrap:"wrap",gap:spacing.xl},
  mediaItem:{minWidth:260,flex:1},
  refineText:{fontSize:14,lineHeight:21,marginBottom:spacing.md},
  privacyNote:{fontSize:12,lineHeight:18,marginTop:spacing.lg}
});
