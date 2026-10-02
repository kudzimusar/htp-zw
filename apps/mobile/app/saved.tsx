import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Chip, EmptyState, Page, Section, SectionHeader } from "../src/ui/Layout";
import { StoryCard, StoryGrid, StoryList } from "../src/ui/Cards";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { colors, spacing } from "../src/theme/tokens";
import { useAppearance } from "../src/theme/AppearanceProvider";

type LibraryTab = "saved" | "offline" | "history";

function readerTab(value:string|string[]|undefined):LibraryTab{
  const selected=Array.isArray(value) ? value[0] : value;
  return selected==="offline" || selected==="history" ? selected : "saved";
}

export default function SavedScreen(){
  const { palette }=useAppearance();
  const params=useLocalSearchParams<{tab?:string|string[]}>();
  const requestedTab=readerTab(params.tab);
  const [active,setActive]=useState<LibraryTab>(requestedTab);
  const [refresh,setRefresh]=useState(0);

  useEffect(()=>{
    setActive(requestedTab);
  },[requestedTab]);

  const library=useAsync(async()=>{
    const [savedIds,home,downloads,historyIds]=await Promise.all([
      services.reader.getSavedArticleIds(),
      services.articles.getHome(),
      services.reader.getDownloadedArticles(),
      services.reader.getReadingHistoryIds()
    ]);

    const byId=new Map(home.map((item)=>[item.id,item]));
    return {
      saved:home.filter((item)=>savedIds.includes(item.id)),
      downloads,
      history:historyIds.map((id)=>byId.get(id)).filter((item): item is NonNullable<typeof item>=>Boolean(item))
    };
  },[refresh]);

  const removeDownload=async(id:string)=>{
    await services.reader.removeDownloadedArticle(id);
    setRefresh((value)=>value+1);
  };

  const tabs:[LibraryTab,string][]=[
    ["saved","Saved"],
    ["offline","Offline"],
    ["history","History"]
  ];

  return (
    <Page title="Saved & Offline">
      <Text style={[styles.lede,{color:palette.inkMuted}]}>Saved bookmarks, offline downloads and reading history are separate. Saving a story does not download it for offline reading.</Text>

      <View style={styles.summary}>
        <View style={[styles.stat,{borderColor:palette.border,backgroundColor:palette.paper}]}>
          <Text style={[styles.statValue,{color:palette.ink}]}>{library.data?.saved.length ?? 0}</Text>
          <Text style={[styles.statLabel,{color:palette.inkMuted}]}>Saved</Text>
        </View>
        <View style={[styles.stat,{borderColor:palette.border,backgroundColor:palette.paper}]}>
          <Text style={[styles.statValue,{color:palette.ink}]}>{library.data?.downloads.length ?? 0}</Text>
          <Text style={[styles.statLabel,{color:palette.inkMuted}]}>Offline</Text>
        </View>
        <View style={[styles.stat,{borderColor:palette.border,backgroundColor:palette.paper}]}>
          <Text style={[styles.statValue,{color:palette.ink}]}>{library.data?.history.length ?? 0}</Text>
          <Text style={[styles.statLabel,{color:palette.inkMuted}]}>History</Text>
        </View>
      </View>

      <View style={styles.tabs} accessibilityRole="tablist">
        {tabs.map(([key,label])=>(
          <Chip key={key} active={active===key} onPress={()=>setActive(key)}>{label}</Chip>
        ))}
      </View>

      {active==="saved" && (
        <Section>
          <SectionHeader title="Saved stories" eyebrow="BOOKMARKS" />
          {library.data?.saved.length
            ? <StoryGrid stories={library.data.saved} />
            : <EmptyState title="Nothing saved yet" message="Bookmarked stories will appear here. Saving a story does not make it available offline." />}
        </Section>
      )}

      {active==="offline" && (
        <Section>
          <SectionHeader title="Available offline" eyebrow="DOWNLOADED" />
          {library.data?.downloads.length ? (
            <View style={styles.offlineList}>
              {library.data.downloads.map((story)=>(
                <View style={[styles.offlineRow,{borderTopColor:palette.border}]} key={story.id}>
                  <View style={styles.offlineBadgeRow}>
                    <Text style={styles.offlineBadge}>AVAILABLE OFFLINE</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={"Remove " + story.title + " from offline downloads"}
                      onPress={()=>void removeDownload(story.id)}
                      style={styles.removeButton}
                    >
                      <Text style={[styles.removeText,{color:palette.blue}]}>Remove download</Text>
                    </Pressable>
                  </View>
                  <StoryCard story={story} compact />
                </View>
              ))}
            </View>
          ) : (
            <EmptyState title="No offline stories" message="Choose Offline in an eligible article to store it on this device. Premium stories are not stored here without verified offline access." />
          )}
        </Section>
      )}

      {active==="history" && (
        <Section>
          <SectionHeader title="Reading history" eyebrow="RECENT" />
          {library.data?.history.length
            ? <StoryList stories={library.data.history} />
            : <EmptyState title="No reading history yet" message="Stories you open will appear here in recently read order." />}
        </Section>
      )}
    </Page>
  );
}

const styles=StyleSheet.create({
  lede:{fontSize:15,lineHeight:23,maxWidth:760,marginTop:spacing.sm},
  summary:{marginTop:spacing.xl,flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  stat:{minWidth:132,flexGrow:1,borderWidth:1,padding:spacing.lg,gap:2},
  statValue:{fontSize:26,fontWeight:"900"},
  statLabel:{fontSize:11,fontWeight:"800",textTransform:"uppercase",letterSpacing:0.6},
  tabs:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,marginTop:spacing.xl},
  offlineList:{gap:spacing.xl},
  offlineRow:{borderTopWidth:1,paddingTop:spacing.md},
  offlineBadgeRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:spacing.md,marginBottom:spacing.md},
  offlineBadge:{fontSize:10,fontWeight:"900",letterSpacing:1,color:colors.success},
  removeButton:{minHeight:44,justifyContent:"center",paddingHorizontal:10},
  removeText:{fontSize:12,fontWeight:"800"}
});
