import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Chip, EmptyState, Page, Section, SectionHeader } from "../src/ui/Layout";
import { radius, spacing } from "../src/theme/tokens";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { useAppearance } from "../src/theme/AppearanceProvider";

export default function EditionScreen(){
  const { palette }=useAppearance();
  const taxonomy=useAsync(()=>services.taxonomy.getSnapshot(),[]);
  const preferences=useAsync(()=>services.reader.getPreferences(),[]);
  const [initialized,setInitialized]=useState(false);
  const [query,setQuery]=useState("");
  const [primary,setPrimary]=useState("Global");
  const [followed,setFollowed]=useState<string[]>([]);
  const [selectedTopics,setSelectedTopics]=useState<string[]>([]);
  const [status,setStatus]=useState("");

  useEffect(()=>{
    if(initialized || !preferences.data) return;
    setPrimary(preferences.data.primaryEdition || "Global");
    setFollowed(preferences.data.followedCountries);
    setSelectedTopics(preferences.data.followedTopics);
    setInitialized(true);
  },[initialized,preferences.data]);

  const zones=taxonomy.data?.geographicZones ?? [];
  const editions=zones.filter((zone)=>zone.level==="global" || zone.level==="continent" || zone.level==="region" || zone.level==="country").map((zone)=>zone.name);
  const interestOptions=(taxonomy.data?.topics.length
    ? taxonomy.data.topics.map((topic)=>topic.name)
    : taxonomy.data?.editorialDesks.map((desk)=>desk.name)) ?? [];
  const filteredEditions=useMemo(()=>{
    const term=query.trim().toLowerCase();
    return term ? editions.filter((item)=>item.toLowerCase().includes(term)) : editions;
  },[query,editions.join("|")]);

  const toggle=(value:string,list:string[],setter:(value:string[])=>void)=>setter(list.includes(value)?list.filter((item)=>item!==value):[...list,value]);
  const save=async()=>{
    await services.reader.savePreferences({primaryEdition:primary,followedCountries:followed,followedTopics:selectedTopics});
    setStatus("Preferences saved on this device.");
  };

  return (
    <Page title="Select Your Edition">
      <Text style={[styles.lede,{color:palette.inkMuted}]}>Choose the edition that leads your Home feed, then follow additional countries, regions and topics. Global reporting remains available in every edition.</Text>

      <View style={[styles.searchWrap,{borderColor:palette.border}]}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search country or region"
          placeholderTextColor={palette.inkMuted}
          style={[styles.search,{color:palette.ink}]}
          accessibilityLabel="Search country or region"
        />
      </View>

      <Section>
        <SectionHeader title="Primary Edition" eyebrow="DISCOVERY" />
        {filteredEditions.length ? (
          <View style={styles.chips}>{filteredEditions.map((item)=><Chip key={item} active={primary===item} onPress={()=>setPrimary(item)}>{item}</Chip>)}</View>
        ) : <EmptyState title="No matching edition" message="Try a broader country or region name." />}
      </Section>

      <Section>
        <SectionHeader title="Followed Countries / Regions" />
        <View style={styles.chips}>
          {editions.filter((item)=>item!=="Global").map((item)=><Chip key={item} active={followed.includes(item)} onPress={()=>toggle(item,followed,setFollowed)}>{item}</Chip>)}
        </View>
      </Section>

      <Section>
        <SectionHeader title="Content preferences" />
        {interestOptions.length ? (
          <View style={styles.chips}>{interestOptions.map((item)=><Chip key={item} active={selectedTopics.includes(item)} onPress={()=>toggle(item,selectedTopics,setSelectedTopics)}>{item}</Chip>)}</View>
        ) : <EmptyState title="No topics available yet" message="HealthTimes topics will appear here as they become available." />}
      </Section>

      <Section>
        <View style={[styles.note,{backgroundColor:palette.paperMuted}]}>
          <Text style={[styles.noteTitle,{color:palette.ink}]}>Edition and billing country are different</Text>
          <Text style={[styles.noteText,{color:palette.inkMuted}]}>Edition preferences shape editorial discovery. Residence, billing country and storefront currency are managed separately.</Text>
        </View>
        <Pressable style={[styles.save,{backgroundColor:palette.blue}]} onPress={()=>void save()}><Text style={[styles.saveText,{color:palette.paper}]}>Save Preferences</Text></Pressable>
        {!!status && <Text accessibilityLiveRegion="polite" style={[styles.status,{color:palette.inkMuted}]}>{status}</Text>}
      </Section>
    </Page>
  );
}
const styles=StyleSheet.create({
  lede:{fontSize:15,lineHeight:23,maxWidth:760,marginTop:spacing.sm},
  searchWrap:{marginTop:spacing.xl,borderWidth:1,borderRadius:radius.md},
  search:{minHeight:52,paddingHorizontal:spacing.lg,fontSize:15},
  chips:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  note:{padding:spacing.lg,borderRadius:radius.md,gap:spacing.sm},
  noteTitle:{fontSize:17,fontWeight:"900"},
  noteText:{fontSize:14,lineHeight:21},
  save:{marginTop:spacing.lg,minHeight:48,alignSelf:"flex-start",justifyContent:"center",paddingHorizontal:18,borderRadius:radius.sm},
  saveText:{fontWeight:"900"},
  status:{fontSize:12,marginTop:spacing.sm}
});
