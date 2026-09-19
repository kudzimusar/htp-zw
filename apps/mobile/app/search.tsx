import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Chip, Page, Section, SectionHeader } from "../src/ui/Layout";
import { StoryGrid } from "../src/ui/Cards";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { colors, radius, spacing } from "../src/theme/tokens";
import { event } from "../src/growth/events";

export default function SearchScreen(){
  const [query,setQuery]=useState("");
  const [submitted,setSubmitted]=useState("");
  const [format,setFormat]=useState<"article"|"video"|"audio"|"live"|undefined>();
  const results=useAsync(()=>services.search.search({text:submitted,format}),[submitted,format]);

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
      // Raw search text is deliberately excluded until AG-05 privacy/consent policy
      // explicitly allows it; health-related search queries can reveal sensitive interests.
      query_redacted:true
    },{pagePath:"/search"}));
  },[submitted,format,results.data]);

  return (
    <Page title="Intelligent Search">
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search topics, countries, people and meaning"
          placeholderTextColor={colors.inkMuted}
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={()=>setSubmitted(query)}
          accessibilityLabel="Search HealthTimes"
        />
        <Pressable style={styles.button} onPress={()=>setSubmitted(query)}><Text style={styles.buttonText}>Search</Text></Pressable>
      </View>

      <Text style={styles.explainer}>Find relevant HealthTimes reporting using topics, countries, people and meaning — not only exact keywords.</Text>

      <View style={styles.filters}>
        {([
          ["All",undefined],
          ["Articles","article"],
          ["Videos","video"],
          ["Audio","audio"],
          ["Live","live"]
        ] as const).map(([label,value])=><Chip key={label} active={format===value} onPress={()=>setFormat(value)}>{label}</Chip>)}
      </View>

      <Section>
        <SectionHeader title={submitted ? "Results" : "Suggested coverage"} />
        {results.data?.articles.length ? <StoryGrid stories={results.data.articles} /> : <Text style={styles.empty}>No article results. Try a broader health topic, country or organization.</Text>}
      </Section>

      {!!results.data?.videos.length && <Section><SectionHeader title="Video matches" /><Text style={styles.meta}>{results.data.videos.length} fixture video result(s)</Text></Section>}
      {!!results.data?.audio.length && <Section><SectionHeader title="Audio matches" /><Text style={styles.meta}>{results.data.audio.length} fixture audio result(s)</Text></Section>}
      {!!results.data?.live.length && <Section><SectionHeader title="Live matches" /><Text style={styles.meta}>{results.data.live.length} fixture live result(s)</Text></Section>}
    </Page>
  );
}
const styles=StyleSheet.create({
  searchRow:{marginTop:spacing.xl,flexDirection:"row",gap:spacing.sm},
  input:{flex:1,minHeight:52,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:spacing.lg,fontSize:16,color:colors.ink},
  button:{minHeight:52,justifyContent:"center",paddingHorizontal:18,backgroundColor:colors.blue,borderRadius:radius.md},
  buttonText:{color:"#FFFFFF",fontWeight:"900"},
  explainer:{marginTop:spacing.md,fontSize:14,lineHeight:21,color:colors.inkMuted,maxWidth:760},
  filters:{marginTop:spacing.lg,flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  empty:{color:colors.inkMuted,fontSize:15,lineHeight:22},
  meta:{color:colors.inkMuted}
});
