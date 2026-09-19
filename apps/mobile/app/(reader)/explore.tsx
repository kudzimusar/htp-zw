import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Chip, EmptyState, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { StoryGrid } from "../../src/ui/Cards";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { colors, radius, spacing } from "../../src/theme/tokens";

export default function ExploreScreen(){
  const router=useRouter();
  const stories=useAsync(()=>services.articles.getHome(),[]);
  const taxonomy=useAsync(()=>services.taxonomy.getSnapshot(),[]);
  const [active,setActive]=useState("Global");

  const zones=taxonomy.data?.geographicZones ?? [];
  const countries=zones.filter((zone)=>zone.level==="country").map((zone)=>zone.name);
  const regions=zones.filter((zone)=>zone.level==="continent" || zone.level==="region").map((zone)=>zone.name);
  const desks=(taxonomy.data?.editorialDesks ?? []).map((desk)=>desk.name);
  const topics=(taxonomy.data?.topics ?? []).map((topic)=>topic.name);

  const groups=[
    ["Countries",countries],
    ["Regions",regions],
    ["Topics",topics],
    ["Desks",desks],
    ["Formats",["Articles","Live","Video","Audio","Premium"]],
    ["More",["Authors","Jobs","Fellowships & Grants","E-Paper","Archive"]]
  ] as const;

  return (
    <Page title="Explore">
      <Pressable style={styles.search} onPress={()=>router.push("/search" as never)}>
        <Text style={styles.searchText}>Search HealthTimes reporting…</Text>
      </Pressable>

      {groups.map(([title,items])=>(
        <Section key={title}>
          <SectionHeader title={title} />
          {items.length ? (
            <View style={styles.chips}>
              {items.map((item)=><Chip key={item} active={active===item} onPress={()=>setActive(item)}>{item}</Chip>)}
            </View>
          ) : (
            <EmptyState
              title={`${title} awaiting migrated taxonomy`}
              message="The client model supports this dimension, but AG-04 has not yet populated authoritative migrated values."
            />
          )}
        </Section>
      ))}

      <Section>
        <SectionHeader title="Discover reporting" />
        {stories.data ? <StoryGrid stories={stories.data} /> : <Text>Loading…</Text>}
      </Section>
    </Page>
  );
}
const styles=StyleSheet.create({
  search:{marginTop:spacing.lg,minHeight:54,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,justifyContent:"center",paddingHorizontal:spacing.lg,backgroundColor:colors.paperMuted},
  searchText:{color:colors.inkMuted,fontSize:15},
  chips:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm}
});
