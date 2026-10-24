import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Chip, EmptyState, Page, Section, SectionHeader } from "../src/ui/Layout";
import { layout, radius, spacing } from "../src/theme/tokens";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { useAppearance } from "../src/theme/AppearanceProvider";

const PRIMARY_LIMIT=6;
const TOPIC_LIMIT=8;

export default function EditionScreen(){
  const { palette }=useAppearance();
  const taxonomy=useAsync(()=>services.taxonomy.getSnapshot(),[]);
  const preferences=useAsync(()=>services.reader.getPreferences(),[]);
  const [initialized,setInitialized]=useState(false);
  const [query,setQuery]=useState("");
  const [primary,setPrimary]=useState("Global");
  const [followed,setFollowed]=useState<string[]>([]);
  const [selectedTopics,setSelectedTopics]=useState<string[]>([]);
  const [showMoreLocations,setShowMoreLocations]=useState(false);
  const [showMoreTopics,setShowMoreTopics]=useState(false);
  const [status,setStatus]=useState("");

  useEffect(()=>{
    if(initialized || !preferences.data) return;
    setPrimary(preferences.data.primaryEdition || "Global");
    setFollowed(preferences.data.followedCountries);
    setSelectedTopics(preferences.data.followedTopics);
    setInitialized(true);
  },[initialized,preferences.data]);

  const zones=taxonomy.data?.geographicZones ?? [];
  const zoneMetaByName=useMemo(()=>{
    const map=new Map<string,{level:string;code?:string|null}>();
    for(const z of zones){
      map.set(z.name,{level:z.level,code:z.isoCountryCode});
    }
    return map;
  },[zones]);

  const editions=useMemo(()=>zones
    .filter((zone)=>zone.level==="global" || zone.level==="continent" || zone.level==="region" || zone.level==="country")
    .map((zone)=>zone.name),[zones]);
  const interestOptions=(taxonomy.data?.topics.length
    ? taxonomy.data.topics.map((topic)=>topic.name)
    : taxonomy.data?.editorialDesks.filter((desk)=>desk.active).map((desk)=>desk.name)) ?? [];

  const filteredEditions=useMemo(()=>{
    const term=query.trim().toLowerCase();
    return term ? editions.filter((item)=>item.toLowerCase().includes(term)) : editions;
  },[query,editions.join("|")]);

  const conciseEditions=useMemo(()=>{
    const ordered=[primary,...editions];
    return [...new Set(ordered)].slice(0,PRIMARY_LIMIT);
  },[primary,editions.join("|")]);

  const locationChoices=query.trim()
    ? filteredEditions
    : showMoreLocations
      ? editions
      : conciseEditions;

  const followedChoices=useMemo(()=>{
    const candidates=locationChoices.filter((item)=>item!=="Global");
    return [...new Set([...followed,...candidates])];
  },[followed.join("|"),locationChoices.join("|")]);

  const topicChoices=showMoreTopics
    ? interestOptions
    : [...new Set([...selectedTopics,...interestOptions.slice(0,TOPIC_LIMIT)])];

  const toggle=(value:string,list:string[],setter:(value:string[])=>void)=>
    setter(list.includes(value)?list.filter((item)=>item!==value):[...list,value]);

  const save=async()=>{
    await services.reader.savePreferences({
      primaryEdition:primary,
      followedCountries:followed,
      followedTopics:selectedTopics
    });
    setStatus("Preferences saved on this device.");
  };

  return (
    <Page title="Edition & Preferences">
      <View
        testID="edition-active-summary"
        style={[
          styles.summaryCard,
          {borderColor:palette.border,backgroundColor:palette.paper}
        ]}
      >
        <Text style={[styles.lede,{color:palette.inkMuted}]}>
          Choose one primary edition for Home, then separately follow places and topics you want to see more often.
        </Text>
        <View style={styles.summaryPills}>
          <View style={[styles.summaryPill,{borderColor:palette.blue,backgroundColor:palette.paperMuted}]}>
            <Text style={[styles.summaryPillLabel,{color:palette.inkMuted}]}>PRIMARY EDITION</Text>
            <Text style={[styles.summaryPillValue,{color:palette.ink}]}>{primary}</Text>
          </View>
          <View style={[styles.summaryPill,{borderColor:palette.border,backgroundColor:palette.paperMuted}]}>
            <Text style={[styles.summaryPillLabel,{color:palette.inkMuted}]}>FOLLOWED PLACES</Text>
            <Text style={[styles.summaryPillValue,{color:palette.ink}]}>{followed.length}</Text>
          </View>
          <View style={[styles.summaryPill,{borderColor:palette.border,backgroundColor:palette.paperMuted}]}>
            <Text style={[styles.summaryPillLabel,{color:palette.inkMuted}]}>TOPICS</Text>
            <Text style={[styles.summaryPillValue,{color:palette.ink}]}>{selectedTopics.length}</Text>
          </View>
        </View>
      </View>

      {(taxonomy.loading || preferences.loading) && (
        <Section>
          <Text accessibilityLiveRegion="polite" style={[styles.stateText,{color:palette.inkMuted}]}>Loading edition preferences…</Text>
        </Section>
      )}

      {!taxonomy.loading && !preferences.loading && (taxonomy.error || preferences.error) && (
        <Section>
          <EmptyState title="Edition preferences are temporarily unavailable" message="Countries, regions and topics could not be loaded. Try again shortly." />
        </Section>
      )}

      {!taxonomy.loading && !preferences.loading && !taxonomy.error && !preferences.error && (
        <>
          <View
            testID="edition-search-wrap"
            style={[styles.searchWrap,{borderColor:palette.border,backgroundColor:palette.paper}]}
          >
            <Text style={[styles.searchIcon,{color:palette.inkMuted}]}>⌕</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search country or region"
              placeholderTextColor={palette.inkMuted}
              style={[styles.search,{color:palette.ink}]}
              accessibilityLabel="Search country or region"
            />
            {!!query.trim() && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear location search"
                onPress={()=>setQuery("")}
                style={styles.clearButton}
              >
                <Text style={[styles.clearText,{color:palette.inkMuted}]}>✕</Text>
              </Pressable>
            )}
          </View>

          <Section>
            <SectionHeader title="Primary Edition" eyebrow="ONE SELECTION" />
            <Text style={[styles.helper,{color:palette.inkMuted}]}>
              Your primary edition leads editorial discovery. You can change it at any time.
            </Text>
            {locationChoices.length ? (
              <View accessibilityRole="radiogroup" style={styles.primaryList}>
                {locationChoices.map((item)=>{
                  const selected=primary===item;
                  const meta=zoneMetaByName.get(item);
                  const badgeText=meta?.code ? meta.code.toUpperCase() : (meta?.level ? meta.level.toUpperCase() : "EDITION");
                  return (
                    <Pressable
                      key={item}
                      testID="primary-edition-option"
                      accessibilityRole="radio"
                      accessibilityState={{selected}}
                      aria-checked={selected}
                      accessibilityLabel={item+" primary edition"}
                      onPress={()=>setPrimary(item)}
                      style={({ pressed, focused }: any)=>[
                        styles.primaryRow,
                        {
                          borderColor:selected?palette.blue:palette.border,
                          backgroundColor:selected?palette.paperMuted:palette.paper
                        },
                        focused && [styles.actionFocused,{borderColor:palette.blue}],
                        pressed && styles.actionPressed
                      ]}
                    >
                      <View style={[styles.radio,{borderColor:selected?palette.blue:palette.inkMuted}]}>
                        {selected && <View style={[styles.radioDot,{backgroundColor:palette.blue}]} />}
                      </View>
                      <View style={styles.primaryLabelWrap}>
                        <Text style={[styles.primaryLabel,{color:palette.ink}]}>{item}</Text>
                        <Text style={[styles.zoneBadge,{color:palette.inkMuted,borderColor:palette.border}]}>
                          {badgeText}
                        </Text>
                      </View>
                      {selected && <Text style={[styles.selectedLabel,{color:palette.blue}]}>SELECTED</Text>}
                    </Pressable>
                  );
                })}
              </View>
            ) : <EmptyState title="No matching edition" message="Try a broader country or region name." />}

            {!query.trim() && editions.length>conciseEditions.length && (
              <Pressable
                testID="edition-more-locations"
                accessibilityRole="button"
                accessibilityState={{expanded:showMoreLocations}}
                style={({ pressed, focused }: any)=>[
                  styles.moreButton,
                  {borderColor:palette.border,backgroundColor:palette.paper},
                  focused && [styles.actionFocused,{borderColor:palette.blue}],
                  pressed && styles.actionPressed
                ]}
                onPress={()=>setShowMoreLocations((value)=>!value)}
              >
                <Text style={[styles.moreText,{color:palette.blue}]}>
                  {showMoreLocations ? "Show Fewer Countries/Regions" : "Show More Countries/Regions"}
                </Text>
              </Pressable>
            )}
          </Section>

          <Section>
            <SectionHeader title="Followed Countries & Regions" eyebrow="ADDITIONAL PLACES" />
            <Text style={[styles.helper,{color:palette.inkMuted}]}>
              Followed locations add interests without changing your primary edition.
            </Text>
            {followedChoices.length ? (
              <View style={styles.chips}>
                {followedChoices.map((item)=><Chip key={item} active={followed.includes(item)} onPress={()=>toggle(item,followed,setFollowed)}>{item}</Chip>)}
              </View>
            ) : <EmptyState title="No matching locations" message="Try another country or region name." />}
          </Section>

          <Section>
            <SectionHeader title="Content Preferences" eyebrow="TOPICS & DESKS" />
            <Text style={[styles.helper,{color:palette.inkMuted}]}>
              Select health topics and desks you want highlighted across your Reader feeds.
            </Text>
            {interestOptions.length ? (
              <>
                <View style={styles.chips}>
                  {topicChoices.map((item)=><Chip key={item} active={selectedTopics.includes(item)} onPress={()=>toggle(item,selectedTopics,setSelectedTopics)}>{item}</Chip>)}
                </View>
                {interestOptions.length>TOPIC_LIMIT && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{expanded:showMoreTopics}}
                    style={({ pressed, focused }: any)=>[
                      styles.moreButton,
                      {borderColor:palette.border,backgroundColor:palette.paper},
                      focused && [styles.actionFocused,{borderColor:palette.blue}],
                      pressed && styles.actionPressed
                    ]}
                    onPress={()=>setShowMoreTopics((value)=>!value)}
                  >
                    <Text style={[styles.moreText,{color:palette.blue}]}>
                      {showMoreTopics ? "Show Fewer Topics" : "Show More Topics"}
                    </Text>
                  </Pressable>
                )}
              </>
            ) : <EmptyState title="No topics available yet" message="HealthTimes topics will appear here as they become available." />}
          </Section>

          <Section>
            <View style={[styles.note,{borderColor:palette.border,backgroundColor:palette.paperMuted}]}>
              <Text style={[styles.noteTitle,{color:palette.ink}]}>Edition and billing country are different</Text>
              <Text style={[styles.noteText,{color:palette.inkMuted}]}>
                Edition preferences shape editorial discovery. Residence, billing country and storefront currency are managed separately.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              style={({ pressed, focused }: any)=>[
                styles.save,
                {backgroundColor:palette.blue},
                focused && [styles.actionFocused,{borderColor:palette.ink}],
                pressed && styles.actionPressed
              ]}
              onPress={()=>void save()}
            >
              <Text style={[styles.saveText,{color:palette.paper}]}>Save Preferences</Text>
            </Pressable>
            {!!status && <Text accessibilityLiveRegion="polite" style={[styles.status,{color:palette.inkMuted}]}>{status}</Text>}
          </Section>
        </>
      )}
    </Page>
  );
}

const styles=StyleSheet.create({
  summaryCard:{
    marginTop:spacing.md,
    borderWidth:1,
    borderRadius:radius.md,
    padding:spacing.lg,
    gap:spacing.md
  },
  lede:{fontSize:14,lineHeight:21,maxWidth:760},
  summaryPills:{
    flexDirection:"row",
    flexWrap:"wrap",
    gap:spacing.sm
  },
  summaryPill:{
    borderWidth:1,
    borderRadius:radius.sm,
    paddingHorizontal:12,
    paddingVertical:8,
    minWidth:110,
    gap:2
  },
  summaryPillLabel:{
    fontSize:9,
    fontWeight:"900",
    letterSpacing:0.8
  },
  summaryPillValue:{
    fontSize:14,
    fontWeight:"900"
  },
  searchWrap:{
    marginTop:spacing.lg,
    borderWidth:1,
    borderRadius:radius.md,
    flexDirection:"row",
    alignItems:"center",
    paddingHorizontal:spacing.md,
    maxWidth:760
  },
  searchIcon:{fontSize:16,fontWeight:"700",marginRight:spacing.sm},
  search:{flex:1,minHeight:50,fontSize:15},
  clearButton:{
    minHeight:layout.touchMin,
    minWidth:layout.touchMin,
    alignItems:"center",
    justifyContent:"center"
  },
  clearText:{fontSize:14,fontWeight:"800"},
  helper:{fontSize:13,lineHeight:20,maxWidth:760,marginBottom:spacing.sm},
  primaryList:{gap:spacing.sm,maxWidth:760},
  primaryRow:{
    minHeight:52,
    borderWidth:1,
    borderRadius:radius.md,
    paddingHorizontal:spacing.md,
    paddingVertical:spacing.sm,
    flexDirection:"row",
    alignItems:"center",
    gap:spacing.md
  },
  radio:{width:20,height:20,borderRadius:10,borderWidth:2,alignItems:"center",justifyContent:"center"},
  radioDot:{width:10,height:10,borderRadius:5},
  primaryLabelWrap:{
    flex:1,
    flexDirection:"row",
    alignItems:"center",
    flexWrap:"wrap",
    gap:spacing.sm
  },
  primaryLabel:{fontSize:15,fontWeight:"800"},
  zoneBadge:{
    fontSize:9,
    fontWeight:"800",
    letterSpacing:0.6,
    borderWidth:1,
    borderRadius:radius.sm,
    paddingHorizontal:6,
    paddingVertical:2
  },
  selectedLabel:{fontSize:9,fontWeight:"900",letterSpacing:.8},
  chips:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  moreButton:{
    minHeight:layout.touchMin,
    alignSelf:"flex-start",
    justifyContent:"center",
    paddingHorizontal:14,
    borderWidth:1,
    borderRadius:radius.sm,
    marginTop:spacing.md
  },
  moreText:{fontSize:13,fontWeight:"900"},
  note:{
    padding:spacing.lg,
    borderWidth:1,
    borderRadius:radius.md,
    gap:spacing.xs,
    maxWidth:760
  },
  noteTitle:{fontSize:16,fontWeight:"900"},
  noteText:{fontSize:13,lineHeight:20},
  save:{
    marginTop:spacing.lg,
    minHeight:52,
    alignSelf:"stretch",
    maxWidth:520,
    justifyContent:"center",
    alignItems:"center",
    paddingHorizontal:18,
    borderRadius:radius.sm
  },
  saveText:{fontWeight:"900",fontSize:15},
  status:{fontSize:13,marginTop:spacing.sm},
  stateText:{fontSize:14,lineHeight:22},
  actionFocused:{borderWidth:2},
  actionPressed:{opacity:0.86}
});
