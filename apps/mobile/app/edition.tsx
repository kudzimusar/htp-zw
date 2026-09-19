import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chip, EmptyState, Page, Section, SectionHeader } from "../src/ui/Layout";
import { colors, radius, spacing } from "../src/theme/tokens";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";

export default function EditionScreen(){
  const taxonomy=useAsync(()=>services.taxonomy.getSnapshot(),[]);
  const editions=(taxonomy.data?.geographicZones ?? []).map((zone)=>zone.name);
  const interestOptions=(taxonomy.data?.topics.length
    ? taxonomy.data.topics.map((topic)=>topic.name)
    : taxonomy.data?.editorialDesks.map((desk)=>desk.name)) ?? [];

  const [primary,setPrimary]=useState("Global");
  const [followed,setFollowed]=useState<string[]>(["Zimbabwe"]);
  const [selectedTopics,setSelectedTopics]=useState<string[]>(["Public Health","Research"]);
  const toggle=(value:string,list:string[],setter:(value:string[])=>void)=>setter(list.includes(value)?list.filter((item)=>item!==value):[...list,value]);
  const save=()=>services.reader.savePreferences({primaryEdition:primary,followedCountries:followed,followedTopics:selectedTopics});

  return (
    <Page title="Select Your Edition">
      <Section>
        <SectionHeader title="Primary Edition" />
        {editions.length ? (
          <View style={styles.chips}>{editions.map((item)=><Chip key={item} active={primary===item} onPress={()=>setPrimary(item)}>{item}</Chip>)}</View>
        ) : <EmptyState title="Edition taxonomy unavailable" message="The global edition model is defined, but the taxonomy service has not returned values." />}
      </Section>
      <Section>
        <SectionHeader title="Followed Countries / Regions" />
        <View style={styles.chips}>{editions.filter((item)=>item!=="Global").map((item)=><Chip key={item} active={followed.includes(item)} onPress={()=>toggle(item,followed,setFollowed)}>{item}</Chip>)}</View>
      </Section>
      <Section>
        <SectionHeader title="Content preferences" />
        <View style={styles.chips}>{interestOptions.map((item)=><Chip key={item} active={selectedTopics.includes(item)} onPress={()=>toggle(item,selectedTopics,setSelectedTopics)}>{item}</Chip>)}</View>
      </Section>
      <Section>
        <View style={styles.note}>
          <Text style={styles.noteTitle}>News edition and billing country are different</Text>
          <Text style={styles.noteText}>This screen controls discovery preferences only. Residence/billing country and storefront currency remain separate service-owned concepts.</Text>
        </View>
        <Pressable style={styles.save} onPress={save}><Text style={styles.saveText}>Save Preferences</Text></Pressable>
      </Section>
    </Page>
  );
}
const styles=StyleSheet.create({
  chips:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  note:{backgroundColor:colors.paperMuted,padding:spacing.lg,borderRadius:radius.md,gap:spacing.sm},
  noteTitle:{fontSize:17,fontWeight:"900",color:colors.ink},
  noteText:{fontSize:14,lineHeight:21,color:colors.inkMuted},
  save:{marginTop:spacing.lg,minHeight:48,alignSelf:"flex-start",justifyContent:"center",paddingHorizontal:18,backgroundColor:colors.blue,borderRadius:radius.sm},
  saveText:{color:"#FFFFFF",fontWeight:"900"}
});
