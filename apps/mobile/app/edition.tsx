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
      <Text style={[styles.lede,{color:palette.inkMuted}]}>Choose one primary edition for Home, then separately follow places and topics you want to see more often.</Text>

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
      <View style={[styles.searchWrap,{borderColor:palette.border,backgroundColor:palette.paper}]}>
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
        <SectionHeader title="Primary Edition" eyebrow="ONE SELECTION" />
        <Text style={[styles.helper,{color:palette.inkMuted}]}>Your primary edition leads editorial discovery. You can change it at any time.</Text>
        {locationChoices.length ? (
          <View accessibilityRole="radiogroup" style={styles.primaryList}>
            {locationChoices.map((item)=>{
              const selected=primary===item;
              return (
                <Pressable
                  key={item}
                  testID="primary-edition-option"
                  accessibilityRole="radio"
                  accessibilityState={{selected,checked:selected}}
                  accessibilityLabel={item+" primary edition"}
                  onPress={()=>setPrimary(item)}
                  style={[styles.primaryRow,{borderColor:selected?palette.blue:palette.border,backgroundColor:selected?palette.paperMuted:palette.paper}]}
                >
                  <View style={[styles.radio,{borderColor:selected?palette.blue:palette.inkMuted}]}>
                    {selected && <View style={[styles.radioDot,{backgroundColor:palette.blue}]} />}
                  </View>
                  <Text style={[styles.primaryLabel,{color:palette.ink}]}>{item}</Text>
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
            style={styles.moreButton}
            onPress={()=>setShowMoreLocations((value)=>!value)}
          >
            <Text style={[styles.moreText,{color:palette.blue}]}>{showMoreLocations ? "Show Fewer Countries/Regions" : "Show More Countries/Regions"}</Text>
          </Pressable>
        )}
      </Section>

      <Section>
        <SectionHeader title="Followed Countries & Regions" />
        <Text style={[styles.helper,{color:palette.inkMuted}]}>Followed locations add interests without changing your primary edition.</Text>
        {followedChoices.length ? (
          <View style={styles.chips}>
            {followedChoices.map((item)=><Chip key={item} active={followed.includes(item)} onPress={()=>toggle(item,followed,setFollowed)}>{item}</Chip>)}
          </View>
        ) : <EmptyState title="No matching locations" message="Try another country or region name." />}
      </Section>

      <Section>
        <SectionHeader title="Content Preferences" />
        {interestOptions.length ? (
          <>
            <View style={styles.chips}>
              {topicChoices.map((item)=><Chip key={item} active={selectedTopics.includes(item)} onPress={()=>toggle(item,selectedTopics,setSelectedTopics)}>{item}</Chip>)}
            </View>
            {interestOptions.length>TOPIC_LIMIT && (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{expanded:showMoreTopics}}
                style={styles.moreButton}
                onPress={()=>setShowMoreTopics((value)=>!value)}
              >
                <Text style={[styles.moreText,{color:palette.blue}]}>{showMoreTopics ? "Show Fewer Topics" : "Show More Topics"}</Text>
              </Pressable>
            )}
          </>
        ) : <EmptyState title="No topics available yet" message="HealthTimes topics will appear here as they become available." />}
      </Section>

      <Section>
        <View style={[styles.note,{backgroundColor:palette.paperMuted}]}>
          <Text style={[styles.noteTitle,{color:palette.ink}]}>Edition and billing country are different</Text>
          <Text style={[styles.noteText,{color:palette.inkMuted}]}>Edition preferences shape editorial discovery. Residence, billing country and storefront currency are managed separately.</Text>
        </View>
        <Pressable accessibilityRole="button" style={[styles.save,{backgroundColor:palette.blue}]} onPress={()=>void save()}>
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
  lede:{fontSize:15,lineHeight:23,maxWidth:760,marginTop:spacing.sm},
  searchWrap:{marginTop:spacing.xl,borderWidth:1,borderRadius:radius.md},
  search:{minHeight:52,paddingHorizontal:spacing.lg,fontSize:15},
  helper:{fontSize:13,lineHeight:20,maxWidth:760,marginBottom:spacing.md},
  primaryList:{gap:spacing.sm,maxWidth:760},
  primaryRow:{minHeight:layout.touchMin,borderWidth:1,borderRadius:radius.md,paddingHorizontal:spacing.md,paddingVertical:spacing.sm,flexDirection:"row",alignItems:"center",gap:spacing.md},
  radio:{width:20,height:20,borderRadius:10,borderWidth:2,alignItems:"center",justifyContent:"center"},
  radioDot:{width:10,height:10,borderRadius:5},
  primaryLabel:{fontSize:15,fontWeight:"800",flex:1},
  selectedLabel:{fontSize:9,fontWeight:"900",letterSpacing:.8},
  chips:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  moreButton:{minHeight:layout.touchMin,alignSelf:"flex-start",justifyContent:"center",marginTop:spacing.md},
  moreText:{fontSize:13,fontWeight:"900"},
  note:{padding:spacing.lg,borderRadius:radius.md,gap:spacing.sm},
  noteTitle:{fontSize:17,fontWeight:"900"},
  noteText:{fontSize:14,lineHeight:21},
  save:{marginTop:spacing.lg,minHeight:52,alignSelf:"stretch",maxWidth:520,justifyContent:"center",alignItems:"center",paddingHorizontal:18,borderRadius:radius.sm},
  saveText:{fontWeight:"900",fontSize:15},
  status:{fontSize:12,marginTop:spacing.sm},
  stateText:{fontSize:14,lineHeight:22}
});
