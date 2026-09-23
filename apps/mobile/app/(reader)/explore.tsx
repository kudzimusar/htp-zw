import { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { EmptyState, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { StoryGrid } from "../../src/ui/Cards";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { breakpoints, radius, spacing } from "../../src/theme/tokens";
import { useAppearance } from "../../src/theme/AppearanceProvider";

function normalized(value:string){
  return value.trim().toLowerCase();
}

function orderedExisting(values:string[],priority:string[]){
  const unique=Array.from(new Set(values));
  const ranks=new Map(priority.map((value,index)=>[normalized(value),index]));
  return unique.sort((a,b)=>{
    const ar=ranks.get(normalized(a)) ?? 999;
    const br=ranks.get(normalized(b)) ?? 999;
    return ar===br ? a.localeCompare(b) : ar-br;
  });
}

export default function ExploreScreen(){
  const router=useRouter();
  const { palette }=useAppearance();
  const { width }=useWindowDimensions();
  const stories=useAsync(()=>services.articles.getHome(),[]);
  const taxonomy=useAsync(()=>services.taxonomy.getSnapshot(),[]);
  const publication=useAsync(()=>services.publication.getProfile(),[]);
  const [active,setActive]=useState("Global");

  const zones=taxonomy.data?.geographicZones ?? [];
  const countries=zones.filter((zone)=>zone.level==="country").map((zone)=>zone.name);
  const regions=zones.filter((zone)=>zone.level==="global" || zone.level==="continent" || zone.level==="region").map((zone)=>zone.name);
  const desks=orderedExisting(
    (taxonomy.data?.editorialDesks ?? []).filter((desk)=>desk.active).map((desk)=>desk.name),
    ["Public Health","Policy","Research","Health Business","Global Health","Africa","Health Systems","Investigations"]
  );
  const legacyTopics=orderedExisting(
    (taxonomy.data?.topics ?? []).map((topic)=>topic.name),
    [
      "Health Financing","HIV/AIDS","Communicable Diseases","NCDs","Noncommunicable Diseases",
      "Pharmaceuticals","Global Health","Opinion","Features","Health News","SRHR","Family Health"
    ]
  );
  const sourceProducts=(publication.data?.sourceLinks ?? [])
    .filter((link)=>link.kind==="product")
    .map((link)=>link.label);

  const groups=[
    ["Countries",countries],
    ["Regions",regions],
    ["Editorial desks",desks],
    ["Topics & categories",legacyTopics],
    ["Formats",["Articles","Live","Video","Audio","Premium"]],
    ["Publication",["Authors","About HealthTimes",...sourceProducts]]
  ] as const;

  const filteredStories=useMemo(()=>{
    const source=stories.data ?? [];
    if(active==="Articles") return source;
    if(active==="Premium") return source.filter((item)=>item.accessPolicy==="premium");
    const lower=normalized(active);
    return source.filter((item)=>
      normalized(item.primarySection?.name ?? "")===lower ||
      normalized(item.primarySection?.slug ?? "")===lower ||
      item.geography.some((zone)=>normalized(zone.name)===lower || normalized(zone.slug)===lower) ||
      item.topics.some((topic)=>normalized(topic.name)===lower || normalized(topic.slug)===lower) ||
      (item.legacyTaxonomy ?? []).some((term)=>normalized(term.name)===lower || normalized(term.slug)===lower)
    );
  },[active,stories.data]);

  const columns=width >= breakpoints.desktop ? 4 : width >= breakpoints.tablet ? 3 : 2;
  const tileWidth=columns===4 ? "23.2%" : columns===3 ? "31.3%" : "48%";

  const activate=(item:string)=>{
    if(item==="Authors") return router.push("/authors" as never);
    if(item==="About HealthTimes") return router.push("/about" as never);
    if(item==="Live") return router.push("/live" as never);
    if(item==="Video") return router.push("/watch" as never);
    if(item==="Audio") return router.push("/listen" as never);
    const sourceLink=publication.data?.sourceLinks?.find((link)=>link.label===item);
    if(sourceLink) return void Linking.openURL(sourceLink.url);
    setActive(item);
  };

  return (
    <Page title="Explore">
      <Text style={[styles.intro,{color:palette.inkMuted}]}>Browse HealthTimes by editorial desk, publication category, geography, format and author. Editorial desks and publication categories are kept separate so readers can explore both clearly.</Text>

      <Pressable style={[styles.search,{borderColor:palette.border,backgroundColor:palette.paperMuted}]} onPress={()=>router.push("/search" as never)}>
        <Text style={[styles.searchLabel,{color:palette.ink}]}>Search HealthTimes</Text>
        <Text style={[styles.searchText,{color:palette.inkMuted}]}>Topics, countries, people and meaning</Text>
      </Pressable>

      <Section>
        <SectionHeader title="Browse" eyebrow="DISCOVER HEALTHTIMES" />
        <View style={styles.gateway}>
          {groups.map(([title,items])=>(
            <View key={title} style={[styles.gatewayGroup,{borderColor:palette.border}]}>
              <View style={styles.groupHeading}>
                <Text style={[styles.gatewayTitle,{color:palette.ink}]}>{title}</Text>
                {(title==="Editorial desks" || title==="Topics & categories") && (
                  <Text style={[styles.groupSource,{color:palette.inkMuted}]}>
                    {title==="Editorial desks" ? "HEALTHTIMES DESKS" : "HEALTH TOPICS"}
                  </Text>
                )}
              </View>
              {items.length ? (
                <View style={styles.tiles}>
                  {items.slice(0,title==="Publication"?10:18).map((item)=>{
                    const sourceLink=publication.data?.sourceLinks?.find((link)=>link.label===item);
                    const external=Boolean(sourceLink);
                    const navigates=["Authors","About HealthTimes","Live","Video","Audio"].includes(item);
                    return (
                      <Pressable
                        key={item}
                        onPress={()=>activate(item)}
                        accessibilityRole={external||navigates?"link":"button"}
                        accessibilityState={external||navigates?undefined:{selected:active===item}}
                        style={[
                          styles.tile,
                          {width:tileWidth,borderColor:active===item?palette.blue:palette.border,backgroundColor:active===item?palette.paperMuted:palette.paper}
                        ]}
                      >
                        <Text numberOfLines={2} style={[styles.tileText,{color:external||active===item?palette.blue:palette.ink}]}>{item}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <EmptyState
                  title={"No "+title.toLowerCase()+" available"}
                  message={title==="Topics & categories"
                    ? "No categories are available for this section yet."
                    : "No values are available for this section yet."}
                />
              )}
            </View>
          ))}
        </View>
      </Section>

      <Section>
        <SectionHeader title={active + " reporting"} eyebrow="DISCOVER" action="Intelligent Search" onAction={()=>router.push("/search" as never)} />
        {filteredStories.length
          ? <StoryGrid stories={filteredStories} />
          : <EmptyState title={"No "+active+" stories found"} message="Try another HealthTimes desk, topic or category." />}
      </Section>
    </Page>
  );
}

const styles=StyleSheet.create({
  intro:{fontSize:15,lineHeight:23,maxWidth:840,marginTop:spacing.sm},
  search:{marginTop:spacing.xl,minHeight:68,borderWidth:1,borderRadius:radius.md,justifyContent:"center",paddingHorizontal:spacing.lg,gap:3},
  searchLabel:{fontSize:15,fontWeight:"900"},
  searchText:{fontSize:13},
  legend:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,marginBottom:spacing.xl},
  legendItem:{borderWidth:1,borderRadius:radius.sm,padding:spacing.md,minWidth:240,flex:1,gap:4},
  legendLabel:{fontSize:9,fontWeight:"900",letterSpacing:1},
  legendText:{fontSize:12,lineHeight:18},
  gateway:{gap:spacing.xl},
  gatewayGroup:{borderTopWidth:1,paddingTop:spacing.lg,gap:spacing.md},
  groupHeading:{gap:3},
  gatewayTitle:{fontSize:17,fontWeight:"900"},
  groupSource:{fontSize:9,fontWeight:"800",letterSpacing:.8},
  tiles:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  tile:{minHeight:58,borderWidth:1,borderRadius:radius.sm,paddingHorizontal:spacing.md,paddingVertical:spacing.sm,justifyContent:"center"},
  tileText:{fontSize:13,lineHeight:17,fontWeight:"800"}
});
