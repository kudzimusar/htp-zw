import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chip, EmptyState, Page, Section, SectionHeader } from "../src/ui/Layout";
import { StoryCard, StoryGrid, StoryList } from "../src/ui/Cards";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { colors, radius, spacing } from "../src/theme/tokens";
import { useAppearance } from "../src/theme/AppearanceProvider";

type LibraryTab = "articles" | "videos" | "audio" | "offline" | "history";

export default function SavedScreen(){
  const { palette }=useAppearance();
  const [active,setActive]=useState<LibraryTab>("articles");
  const [refresh,setRefresh]=useState(0);

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
    ["articles","Articles"],
    ["videos","Videos"],
    ["audio","Audio"],
    ["offline","Offline"],
    ["history","History"]
  ];

  return (
    <Page title="Saved & Offline">
      <Text style={[styles.lede,{color:palette.inkMuted}]}>Bookmarks, offline article snapshots and reading history are kept as distinct Reader states so saving a story never silently downloads it.</Text>

      <View style={styles.summary}>
        <View style={[styles.stat,{borderColor:palette.border,backgroundColor:palette.paper}]}>
          <Text style={[styles.statValue,{color:palette.ink}]}>{library.data?.saved.length ?? 0}</Text>
          <Text style={[styles.statLabel,{color:palette.inkMuted}]}>Saved articles</Text>
        </View>
        <View style={[styles.stat,{borderColor:palette.border,backgroundColor:palette.paper}]}>
          <Text style={[styles.statValue,{color:palette.ink}]}>{library.data?.downloads.length ?? 0}</Text>
          <Text style={[styles.statLabel,{color:palette.inkMuted}]}>Offline</Text>
        </View>
        <View style={[styles.stat,{borderColor:palette.border,backgroundColor:palette.paper}]}>
          <Text style={[styles.statValue,{color:palette.ink}]}>{library.data?.history.length ?? 0}</Text>
          <Text style={[styles.statLabel,{color:palette.inkMuted}]}>Recent reads</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {tabs.map(([key,label])=>(
          <Chip key={key} active={active===key} onPress={()=>setActive(key)}>{label}</Chip>
        ))}
      </View>

      {active==="articles" && (
        <Section>
          <SectionHeader title="Saved articles" eyebrow="BOOKMARKS" />
          {library.data?.saved.length
            ? <StoryGrid stories={library.data.saved} />
            : <EmptyState title="Nothing saved yet" message="Save stories from the Article Reader and they will remain available across app restarts." />}
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
            <EmptyState title="No offline articles" message="Use Offline in the Article Reader. Downloaded content is stored separately from bookmarks and is clearly marked here." />
          )}
        </Section>
      )}

      {active==="history" && (
        <Section>
          <SectionHeader title="Reading history" eyebrow="RECENT" />
          {library.data?.history.length
            ? <StoryList stories={library.data.history} />
            : <EmptyState title="No reading history yet" message="Articles you open are recorded locally in most-recently-read order." />}
        </Section>
      )}

      {active==="videos" && (
        <Section>
          <EmptyState title="Saved video is not connected yet" message="The Video service contract exists; persistent video downloads require a certified native media adapter rather than a second storage model." />
        </Section>
      )}

      {active==="audio" && (
        <Section>
          <EmptyState title="Saved audio is not connected yet" message="The Audio service contract exists; persistent audio downloads require a certified native media adapter rather than a second storage model." />
        </Section>
      )}

      <Section>
        <View style={[styles.noteBox,{backgroundColor:palette.paperMuted,borderRadius:radius.md}]}>
          <Text style={[styles.noteTitle,{color:palette.ink}]}>Reader storage boundary</Text>
          <Text style={[styles.note,{color:palette.inkMuted}]}>Saved IDs, offline article bodies, read position and reading history use versioned device storage shared by native and PWA. Protected Premium bodies are not cached without entitlement.</Text>
        </View>
      </Section>
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
  removeText:{fontSize:12,fontWeight:"800"},
  noteBox:{padding:spacing.lg,gap:spacing.sm},
  noteTitle:{fontSize:16,fontWeight:"900"},
  note:{fontSize:13,lineHeight:20}
});
