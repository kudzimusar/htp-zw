import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Chip, EmptyState, Page, Section, SectionHeader } from "../src/ui/Layout";
import { AudioCard, LiveRail, StoryGrid, VideoCard } from "../src/ui/Cards";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { radius, spacing } from "../src/theme/tokens";
import { event } from "../src/growth/events";
import { useAppearance } from "../src/theme/AppearanceProvider";

export default function SearchScreen(){
  const { palette }=useAppearance();
  const [query,setQuery]=useState("");
  const [submitted,setSubmitted]=useState("");
  const [format,setFormat]=useState<"article"|"video"|"audio"|"live"|undefined>();
  const taxonomy=useAsync(()=>services.taxonomy.getSnapshot(),[]);
  const results=useAsync(()=>services.search.search({text:submitted,format}),[submitted,format]);

  const suggestions=useMemo(()=>{
    const desks=(taxonomy.data?.editorialDesks ?? []).map((item)=>item.name);
    const countries=(taxonomy.data?.geographicZones ?? []).filter((item)=>item.level==="country").map((item)=>item.name);
    return Array.from(new Set([...desks,...countries])).slice(0,8);
  },[taxonomy.data]);

  useEffect(()=>{
    if(!submitted || !results.data) return;
    const resultCount=
      results.data.articles.length+
      results.data.videos.length+
      results.data.audio.length+
      results.data.live.length;
    void services.analytics.track(event("search_performed",{
      result_count:resultCount,
      format:format ?? "all",
      query_redacted:true
    },{pagePath:"/search"}));
  },[submitted,format,results.data]);

  const submit=(value=query)=>{
    const next=value.trim();
    setQuery(next);
    setSubmitted(next);
  };

  return (
    <Page title="Intelligent Search">
      <Text style={[styles.lede,{color:palette.inkMuted}]}>Find relevant HealthTimes reporting using topics, countries, people and meaning — not only exact keywords.</Text>

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
        <Pressable style={[styles.button,{backgroundColor:palette.blue}]} onPress={()=>submit()}><Text style={[styles.buttonText,{color:palette.paper}]}>Search</Text></Pressable>
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

      {!submitted && !!suggestions.length && (
        <Section>
          <SectionHeader title="Suggested searches" eyebrow="FROM CANONICAL TAXONOMY" />
          <View style={styles.suggestions}>
            {suggestions.map((item)=><Chip key={item} onPress={()=>submit(item)}>{item}</Chip>)}
          </View>
        </Section>
      )}

      <Section>
        <SectionHeader title={submitted ? "Results" : "Suggested coverage"} eyebrow={submitted ? "DISCOVERY" : "EDITORIAL"} />
        {results.data?.articles.length ? <StoryGrid stories={results.data.articles} /> : <EmptyState title="No article results" message="Try a broader health topic, country, organization or format." />}
      </Section>

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

      {!!submitted && results.data && !results.data.articles.length && !results.data.videos.length && !results.data.audio.length && !results.data.live.length && (
        <Text style={[styles.privacyNote,{color:palette.inkMuted}]}>Search terms remain privacy-sensitive. Raw health queries are not sent to analytics by this client.</Text>
      )}
    </Page>
  );
}
const styles=StyleSheet.create({
  lede:{fontSize:15,lineHeight:23,maxWidth:760,marginTop:spacing.sm},
  searchRow:{marginTop:spacing.xl,flexDirection:"row",gap:spacing.sm,flexWrap:"wrap"},
  input:{flex:1,minWidth:220,minHeight:54,borderWidth:1,borderRadius:radius.md,paddingHorizontal:spacing.lg,fontSize:16},
  button:{minHeight:54,justifyContent:"center",paddingHorizontal:20,borderRadius:radius.md},
  buttonText:{fontWeight:"900"},
  filters:{marginTop:spacing.lg,flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  suggestions:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  mediaGrid:{flexDirection:"row",flexWrap:"wrap",gap:spacing.xl},
  mediaItem:{minWidth:260,flex:1},
  privacyNote:{fontSize:12,lineHeight:18,marginTop:spacing.lg}
});
