import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Chip, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { StoryGrid } from "../../src/ui/Cards";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { colors, radius, spacing } from "../../src/theme/tokens";

const browseGroups=[
  ["Countries",["Global","Zimbabwe","South Africa","Kenya","Nigeria"]],
  ["Regions",["Africa","Southern Africa","East Africa","West Africa","Central Africa","North Africa"]],
  ["Topics",["Public Health","Health Systems","Research","Health Financing","Digital Health","Community Health"]],
  ["Desks",["Global Health","Africa","Research","Policy","Investigations","Public Health","Health Systems","Health Business"]],
  ["Formats",["Articles","Live","Video","Audio","Premium"]],
  ["More",["Authors","Jobs","Fellowships & Grants","E-Paper","Archive"]]
] as const;

export default function ExploreScreen(){
  const router=useRouter();
  const stories=useAsync(()=>services.articles.getHome(),[]);
  const [active,setActive]=useState("Global");
  return (
    <Page title="Explore">
      <Pressable style={styles.search} onPress={()=>router.push("/search" as never)}>
        <Text style={styles.searchText}>Search HealthTimes reporting…</Text>
      </Pressable>

      {browseGroups.map(([title,items])=>(
        <Section key={title}>
          <SectionHeader title={title} />
          <View style={styles.chips}>
            {items.map((item)=><Chip key={item} active={active===item} onPress={()=>setActive(item)}>{item}</Chip>)}
          </View>
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
