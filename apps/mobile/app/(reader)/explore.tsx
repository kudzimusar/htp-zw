import { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { EmptyState, LoadingBlock, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { StoryList } from "../../src/ui/Cards";
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

type ShortcutKind="Desk"|"Topic";

export default function ExploreScreen(){
  const router=useRouter();
  const { palette }=useAppearance();
  const { width }=useWindowDimensions();
  const stories=useAsync(()=>services.articles.getHome(),[]);
  const taxonomy=useAsync(()=>services.taxonomy.getSnapshot(),[]);
  const publication=useAsync(()=>services.publication.getProfile(),[]);
  const [active,setActive]=useState<string|null>(null);
  const [expanded,setExpanded]=useState(false);

  const zones=taxonomy.data?.geographicZones ?? [];
  const countries=zones.filter((zone)=>zone.level==="country").map((zone)=>zone.name);
  const regions=zones
    .filter((zone)=>zone.level==="global" || zone.level==="continent" || zone.level==="region")
    .map((zone)=>zone.name);
  const desks=orderedExisting(
    (taxonomy.data?.editorialDesks ?? []).filter((desk)=>desk.active).map((desk)=>desk.name),
    ["Public Health","Research","Policy","Health Business","Global Health","Africa","Health Systems","Investigations"]
  );
  const topics=orderedExisting(
    (taxonomy.data?.topics ?? []).map((topic)=>topic.name),
    [
      "HIV/AIDS","Health Financing","Communicable Diseases","NCDs","Noncommunicable Diseases",
      "Pharmaceuticals","Global Health","SRHR","Family Health","Opinion","Features","Health News"
    ]
  );
  const sourceProducts=(publication.data?.sourceLinks ?? [])
    .filter((link)=>link.kind==="product")
    .map((link)=>link.label);

  const primaryShortcuts=useMemo(()=>{
    const seen=new Set<string>();
    const candidates:[
      string,
      ShortcutKind
    ][]=[
      ...desks.slice(0,4).map((item)=>[item,"Desk"] as [string,ShortcutKind]),
      ...topics.slice(0,5).map((item)=>[item,"Topic"] as [string,ShortcutKind])
    ];
    return candidates.filter(([label])=>{
      const key=normalized(label);
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0,6);
  },[desks,topics]);

  const premiumAvailable=(stories.data ?? []).some((story)=>story.accessPolicy==="premium");
  const groups=[
    ["Places",orderedExisting([...countries,...regions],["Zimbabwe","Africa","Southern Africa","Global"])],
    ["Editorial desks",desks],
    ["Topics & categories",topics],
    ["Formats",["Articles","Live","Video","Audio",...(premiumAvailable?["Premium"]:[])]],
    ["More from HealthTimes",["Authors","About HealthTimes",...sourceProducts]]
  ] as const;

  const filteredStories=useMemo(()=>{
    const source=stories.data ?? [];
    if(!active || active==="Articles") return source.slice(0,10);
    if(active==="Premium") return source.filter((item)=>item.accessPolicy==="premium").slice(0,10);
    const lower=normalized(active);
    return source.filter((item)=>
      normalized(item.primarySection?.name ?? "")===lower ||
      normalized(item.primarySection?.slug ?? "")===lower ||
      item.geography.some((zone)=>normalized(zone.name)===lower || normalized(zone.slug)===lower) ||
      item.topics.some((topic)=>normalized(topic.name)===lower || normalized(topic.slug)===lower) ||
      (item.legacyTaxonomy ?? []).some((term)=>normalized(term.name)===lower || normalized(term.slug)===lower)
    ).slice(0,10);
  },[active,stories.data]);

  const primaryTileWidth=width>=breakpoints.desktop?"31.5%":width>=breakpoints.tablet?"31%":"48%";
  const browseTileWidth=width>=breakpoints.desktop?"23.5%":width>=breakpoints.tablet?"31%":"48%";

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

  const discoveryLoading=!stories.data && stories.loading && !taxonomy.data && taxonomy.loading;
  const discoveryUnavailable=!stories.data && Boolean(stories.error) && !taxonomy.data && Boolean(taxonomy.error);

  return (
    <Page title="Explore">
      <Text style={[styles.intro,{color:palette.inkMuted}]}>
        Find HealthTimes reporting by health topic, editorial desk, place and format.
      </Text>

      <Pressable
        style={[styles.search,{borderColor:palette.border,backgroundColor:palette.paperMuted}]}
        onPress={()=>router.push("/search" as never)}
        accessibilityRole="button"
        accessibilityLabel="Search HealthTimes"
        accessibilityHint="Opens Intelligent Search"
      >
        <View style={styles.searchCopy}>
          <Text style={[styles.searchEyebrow,{color:palette.blue}]}>SEARCH</Text>
          <Text style={[styles.searchLabel,{color:palette.ink}]}>What are you looking for?</Text>
          <Text style={[styles.searchText,{color:palette.inkMuted}]}>Stories, people, topics and places</Text>
        </View>
        <Text style={[styles.searchArrow,{color:palette.blue}]}>→</Text>
      </Pressable>

      {discoveryLoading ? <LoadingBlock label="Loading Explore…" /> : null}

      {discoveryUnavailable ? (
        <Section>
          <EmptyState
            title="Explore is temporarily unavailable"
            message="HealthTimes could not load discovery content. Search or try again when your connection is available."
            action={
              <Pressable accessibilityRole="button" onPress={()=>router.push("/search" as never)} style={styles.inlineAction}>
                <Text style={[styles.inlineActionText,{color:palette.blue}]}>Open Search →</Text>
              </Pressable>
            }
          />
        </Section>
      ) : null}

      {!discoveryUnavailable && (
        <>
          <Section>
            <SectionHeader title="Explore by topic" eyebrow="START HERE" />
            {taxonomy.loading && !taxonomy.data ? (
              <LoadingBlock label="Loading topics…" />
            ) : primaryShortcuts.length ? (
              <View style={styles.primaryTiles}>
                {primaryShortcuts.map(([label,kind],index)=>(
                  <Pressable
                    key={label}
                    onPress={()=>activate(label)}
                    accessibilityRole="button"
                    accessibilityState={{selected:active===label}}
                    accessibilityLabel={label+" "+kind.toLowerCase()}
                    style={[
                      styles.primaryTile,
                      {
                        width:primaryTileWidth,
                        borderColor:active===label?palette.blue:palette.border,
                        backgroundColor:active===label?palette.paperMuted:palette.paper
                      }
                    ]}
                  >
                    <Text style={[styles.primaryIndex,{color:palette.blue}]}>{String(index+1).padStart(2,"0")}</Text>
                    <Text numberOfLines={2} style={[styles.primaryTitle,{color:palette.ink}]}>{label}</Text>
                    <Text style={[styles.primaryKind,{color:palette.inkMuted}]}>{kind}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <EmptyState
                title="Topics are not available yet"
                message="HealthTimes will show available discovery topics here as the publication taxonomy grows."
              />
            )}
          </Section>

          <View style={[styles.disclosure,{borderColor:palette.border}]}>
            <View style={styles.disclosureCopy}>
              <Text style={[styles.disclosureTitle,{color:palette.ink}]}>More ways to explore</Text>
              <Text style={[styles.disclosureText,{color:palette.inkMuted}]}>Browse places, additional topics, formats and publication links.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{expanded}}
              accessibilityLabel={expanded?"Hide all discovery options":"Browse all discovery options"}
              style={[styles.disclosureButton,{borderColor:palette.border}]}
              onPress={()=>setExpanded((value)=>!value)}
            >
              <Text style={[styles.disclosureButtonText,{color:palette.blue}]}>{expanded?"Hide":"Browse all"}</Text>
            </Pressable>
          </View>

          {expanded && (
            <View style={styles.browseGroups} accessibilityLabel="Expanded discovery options">
              {groups.map(([title,items])=>(
                <View key={title} style={[styles.gatewayGroup,{borderColor:palette.border}]}>
                  <Text style={[styles.gatewayTitle,{color:palette.ink}]}>{title}</Text>
                  {items.length ? (
                    <View style={styles.tiles}>
                      {items.slice(0,title==="More from HealthTimes"?10:24).map((item)=>{
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
                              {
                                width:browseTileWidth,
                                borderColor:active===item?palette.blue:palette.border,
                                backgroundColor:active===item?palette.paperMuted:palette.paper
                              }
                            ]}
                          >
                            <Text numberOfLines={2} style={[styles.tileText,{color:external||active===item?palette.blue:palette.ink}]}>{item}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={[styles.unavailableText,{color:palette.inkMuted}]}>No {title.toLowerCase()} are available.</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          <Section>
            <SectionHeader
              title={active ? active+" reporting" : "HealthTimes reporting"}
              eyebrow="DISCOVER STORIES"
              action={active?"Show all":undefined}
              onAction={active?()=>setActive(null):undefined}
            />
            {stories.loading && !stories.data ? (
              <LoadingBlock label="Loading reporting…" />
            ) : stories.error && !stories.data ? (
              <EmptyState
                title="Reporting could not be loaded"
                message="Try Search or return when your connection is available."
              />
            ) : filteredStories.length ? (
              <StoryList stories={filteredStories} />
            ) : (
              <EmptyState
                title={active?"No "+active+" stories found":"No reporting available"}
                message={active
                  ?"Try another topic, desk, place or format."
                  :"HealthTimes reporting will appear here when it is available."}
              />
            )}
          </Section>
        </>
      )}
    </Page>
  );
}

const styles=StyleSheet.create({
  intro:{fontSize:16,lineHeight:24,maxWidth:760,marginTop:spacing.sm},
  search:{marginTop:spacing.xl,minHeight:92,borderWidth:1,borderRadius:radius.md,paddingHorizontal:spacing.lg,paddingVertical:spacing.md,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:spacing.md},
  searchCopy:{gap:2,flex:1},
  searchEyebrow:{fontSize:9,fontWeight:"900",letterSpacing:1.1},
  searchLabel:{fontSize:19,lineHeight:24,fontWeight:"900"},
  searchText:{fontSize:13,lineHeight:19},
  searchArrow:{fontSize:24,fontWeight:"800"},
  primaryTiles:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  primaryTile:{minHeight:124,borderWidth:1,borderRadius:radius.md,padding:spacing.md,justifyContent:"space-between"},
  primaryIndex:{fontSize:10,fontWeight:"900",letterSpacing:1},
  primaryTitle:{fontSize:17,lineHeight:21,fontWeight:"900"},
  primaryKind:{fontSize:10,fontWeight:"800",letterSpacing:.8,textTransform:"uppercase"},
  disclosure:{marginTop:spacing.xxl,borderTopWidth:1,borderBottomWidth:1,paddingVertical:spacing.md,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:spacing.md},
  disclosureCopy:{flex:1,gap:2},
  disclosureTitle:{fontSize:15,fontWeight:"900"},
  disclosureText:{fontSize:12,lineHeight:18},
  disclosureButton:{minHeight:44,borderWidth:1,borderRadius:radius.sm,paddingHorizontal:spacing.md,justifyContent:"center"},
  disclosureButtonText:{fontSize:12,fontWeight:"900"},
  browseGroups:{marginTop:spacing.xl,gap:spacing.xl},
  gatewayGroup:{borderTopWidth:1,paddingTop:spacing.lg,gap:spacing.md},
  gatewayTitle:{fontSize:18,fontWeight:"900"},
  tiles:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  tile:{minHeight:54,borderWidth:1,borderRadius:radius.sm,paddingHorizontal:spacing.md,paddingVertical:spacing.sm,justifyContent:"center"},
  tileText:{fontSize:13,lineHeight:17,fontWeight:"800"},
  unavailableText:{fontSize:13,lineHeight:20},
  inlineAction:{minHeight:44,alignSelf:"flex-start",justifyContent:"center",marginTop:spacing.sm},
  inlineActionText:{fontSize:13,fontWeight:"900"}
});
