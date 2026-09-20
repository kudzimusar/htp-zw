import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { EmptyState, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { StoryGrid } from "../../src/ui/Cards";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { breakpoints, radius, spacing } from "../../src/theme/tokens";
import { useAppearance } from "../../src/theme/AppearanceProvider";

export default function ExploreScreen(){
  const router=useRouter();
  const { palette }=useAppearance();
  const { width }=useWindowDimensions();
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
    ["More",["Authors","About HealthTimes","Jobs","Fellowships & Grants","E-Paper","Archive"]]
  ] as const;

  const filteredStories=useMemo(()=>{
    const source=stories.data ?? [];
    if(active==="Global") return source.filter((item)=>item.geography.some((zone)=>zone.slug==="global"));
    const lower=active.toLowerCase();
    const matches=source.filter((item)=>
      item.primarySection?.name.toLowerCase()===lower ||
      item.geography.some((zone)=>zone.name.toLowerCase()===lower) ||
      item.topics.some((topic)=>topic.name.toLowerCase()===lower)
    );
    return matches.length ? matches : source;
  },[active,stories.data]);

  const columns=width >= breakpoints.desktop ? 4 : width >= breakpoints.tablet ? 3 : 2;
  const tileWidth=columns===4 ? "23.2%" : columns===3 ? "31.3%" : "48%";

  return (
    <Page title="Explore">
      <Text style={[styles.intro,{color:palette.inkMuted}]}>Browse the real current HealthTimes publication through AG-01 canonical desks while preserving legacy WordPress categories for reconciliation. This read-only bridge will be replaced by the AG-04 Supabase repository without changing the screen contract.</Text>

      <Pressable style={[styles.search,{borderColor:palette.border,backgroundColor:palette.paperMuted}]} onPress={()=>router.push("/search" as never)}>
        <Text style={[styles.searchLabel,{color:palette.ink}]}>Search HealthTimes</Text>
        <Text style={[styles.searchText,{color:palette.inkMuted}]}>Topics, countries, people and meaning</Text>
      </Pressable>

      <Section>
        <SectionHeader title="Browse" eyebrow="TAXONOMY GATEWAY" />
        <View style={styles.gateway}>
          {groups.map(([title,items])=>(
            <View key={title} style={[styles.gatewayGroup,{borderColor:palette.border}]}>
              <Text style={[styles.gatewayTitle,{color:palette.ink}]}>{title}</Text>
              {items.length ? (
                <View style={styles.tiles}>
                  {items.slice(0,title==="More"?6:12).map((item)=>(
                    <Pressable
                      key={item}
                      onPress={()=>{
                        if(item==="Authors") return router.push("/authors" as never);
                        if(item==="About HealthTimes") return router.push("/about" as never);
                        setActive(item);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{selected:active===item}}
                      style={[
                        styles.tile,
                        {width:tileWidth,borderColor:active===item?palette.blue:palette.border,backgroundColor:active===item?palette.paperMuted:palette.paper}
                      ]}
                    >
                      <Text numberOfLines={2} style={[styles.tileText,{color:active===item?palette.blue:palette.ink}]}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <EmptyState
                  title={title + " awaiting migrated taxonomy"}
                  message="The platform contract supports this dimension, but authoritative migrated values are not available yet."
                />
              )}
            </View>
          ))}
        </View>
      </Section>

      <Section>
        <SectionHeader title={active + " reporting"} eyebrow="DISCOVER" action="Intelligent Search" onAction={()=>router.push("/search" as never)} />
        {filteredStories.length ? <StoryGrid stories={filteredStories} /> : <EmptyState title="No matching source-parity stories" message="The taxonomy selection is valid; the complete archive remains an AG-04 migration responsibility." />}
      </Section>
    </Page>
  );
}
const styles=StyleSheet.create({
  intro:{fontSize:15,lineHeight:23,maxWidth:800,marginTop:spacing.sm},
  search:{marginTop:spacing.xl,minHeight:68,borderWidth:1,borderRadius:radius.md,justifyContent:"center",paddingHorizontal:spacing.lg,gap:3},
  searchLabel:{fontSize:15,fontWeight:"900"},
  searchText:{fontSize:13},
  gateway:{gap:spacing.xl},
  gatewayGroup:{borderTopWidth:1,paddingTop:spacing.lg,gap:spacing.md},
  gatewayTitle:{fontSize:17,fontWeight:"900"},
  tiles:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  tile:{minHeight:58,borderWidth:1,borderRadius:radius.sm,paddingHorizontal:spacing.md,paddingVertical:spacing.sm,justifyContent:"center"},
  tileText:{fontSize:13,lineHeight:17,fontWeight:"800"}
});
