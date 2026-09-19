import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chip, EmptyState, Page, Section, SectionHeader } from "../src/ui/Layout";
import { StoryCard, StoryGrid } from "../src/ui/Cards";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { colors, spacing } from "../src/theme/tokens";
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
      <View style={styles.tabs}>
        {tabs.map(([key,label])=>(
          <Chip key={key} active={active===key} onPress={()=>setActive(key)}>{label}</Chip>
        ))}
      </View>

      {active==="articles" && (
        <Section>
          <SectionHeader title="Saved articles" />
          {library.data?.saved.length
            ? <StoryGrid stories={library.data.saved} />
            : <EmptyState title="Nothing saved yet" message="Save stories from the Article Reader and they will remain available across app restarts." />}
        </Section>
      )}

      {active==="offline" && (
        <Section>
          <SectionHeader title="Available offline" />
          {library.data?.downloads.length ? (
            <View style={styles.offlineList}>
              {library.data.downloads.map((story)=>(
                <View style={[styles.offlineRow,{borderTopColor:palette.border}]} key={story.id}>
                  <View style={styles.offlineBadgeRow}>
                    <Text style={styles.offlineBadge}>AVAILABLE OFFLINE</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${story.title} from offline downloads`}
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
            <EmptyState title="No offline articles" message="Use Download in the Article Reader. Downloaded content is stored separately from bookmarks and is clearly marked here." />
          )}
        </Section>
      )}

      {active==="history" && (
        <Section>
          <SectionHeader title="Reading history" />
          {library.data?.history.length
            ? <StoryGrid stories={library.data.history} />
            : <EmptyState title="No reading history yet" message="Articles you open are recorded locally in most-recently-read order." />}
        </Section>
      )}

      {active==="videos" && (
        <Section>
          <EmptyState title="Saved video is not connected yet" message="The Video service contract exists; persistent video downloads require the later native media lane." />
        </Section>
      )}

      {active==="audio" && (
        <Section>
          <EmptyState title="Saved audio is not connected yet" message="The Audio service contract exists; persistent audio downloads require the later native media lane." />
        </Section>
      )}

      <Section>
        <Text style={[styles.note,{color:palette.inkMuted}]}>Saved IDs, offline article bodies, read position and reading history use versioned device storage shared by native and PWA. Protected Premium bodies are not cached without entitlement.</Text>
      </Section>
    </Page>
  );
}

const styles=StyleSheet.create({
  tabs:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,marginTop:spacing.lg},
  offlineList:{gap:spacing.xl},
  offlineRow:{borderTopWidth:1,borderTopColor:colors.border,paddingTop:spacing.md},
  offlineBadgeRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:spacing.md,marginBottom:spacing.md},
  offlineBadge:{fontSize:10,fontWeight:"900",letterSpacing:1,color:colors.success},
  removeButton:{minHeight:44,justifyContent:"center",paddingHorizontal:10},
  removeText:{fontSize:12,fontWeight:"800",color:colors.blue},
  note:{fontSize:13,lineHeight:20,color:colors.inkMuted}
});
