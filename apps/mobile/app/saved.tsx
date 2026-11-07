import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Chip, EmptyState, Page, Section, SectionHeader } from "../src/ui/Layout";
import { StoryCard, StoryGrid, StoryList } from "../src/ui/Cards";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { colors, layout, radius, spacing } from "../src/theme/tokens";
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
    const [savedIds,downloads,historyIds]=await Promise.all([
      services.reader.getSavedArticleIds(),
      services.reader.getDownloadedArticles(),
      services.reader.getReadingHistoryIds()
    ]);

    const resolveArticles=async(ids:string[])=>{
      const stories=await Promise.all(ids.map((id)=>services.articles.getById(id)));
      return stories.filter((item): item is NonNullable<typeof item>=>Boolean(item));
    };
    const [saved,history]=await Promise.all([
      resolveArticles(savedIds),
      resolveArticles(historyIds)
    ]);

    return {saved,downloads,history};
  },[refresh]);

  const removeDownload=async(id:string)=>{
    await services.reader.removeDownloadedArticle(id);
    setRefresh((value)=>value+1);
  };

  const tabs:[LibraryTab,string,string][]=[
    ["saved","Saved","Bookmarked articles"],
    ["offline","Offline","Stored on this device"],
    ["history","History","Recently opened"]
  ];

  const savedCount=library.loading ? "—" : (library.data?.saved.length ?? 0);
  const offlineCount=library.loading ? "—" : (library.data?.downloads.length ?? 0);
  const historyCount=library.loading ? "—" : (library.data?.history.length ?? 0);

  return (
    <Page title="Saved & Offline">
      <View
        testID="saved-library-header"
        style={[
          styles.headerCard,
          {borderColor:palette.border,backgroundColor:palette.paper}
        ]}
      >
        <View style={styles.headerTopRow}>
          <Text style={[styles.headerEyebrow,{color:palette.blue}]}>PERSONAL READING LIBRARY</Text>
          <Text style={[styles.scopeTag,{color:palette.inkMuted,borderColor:palette.border,backgroundColor:palette.paperMuted}]}>
            ARTICLES
          </Text>
        </View>
        <Text style={[styles.lede,{color:palette.inkMuted}]}>
          Saved bookmarks, offline downloads and reading history are separate. Saving a story does not download it for offline reading.
        </Text>

        <View testID="saved-library-summary" style={styles.summary}>
          <View
            style={[
              styles.stat,
              {
                borderColor:active==="saved" ? palette.blue : palette.border,
                borderTopColor:active==="saved" ? palette.blue : palette.border,
                backgroundColor:active==="saved" ? palette.paperMuted : palette.paper
              }
            ]}
          >
            <Text style={[styles.statValue,{color:palette.ink}]}>{savedCount}</Text>
            <Text style={[styles.statLabel,{color:palette.ink}]}>Saved</Text>
            <Text style={[styles.statHint,{color:palette.inkMuted}]}>Bookmarks</Text>
          </View>
          <View
            style={[
              styles.stat,
              {
                borderColor:active==="offline" ? palette.success : palette.border,
                borderTopColor:active==="offline" ? palette.success : palette.border,
                backgroundColor:active==="offline" ? palette.paperMuted : palette.paper
              }
            ]}
          >
            <Text style={[styles.statValue,{color:palette.ink}]}>{offlineCount}</Text>
            <Text style={[styles.statLabel,{color:palette.ink}]}>Offline</Text>
            <Text style={[styles.statHint,{color:palette.inkMuted}]}>On device</Text>
          </View>
          <View
            style={[
              styles.stat,
              {
                borderColor:active==="history" ? palette.blue : palette.border,
                borderTopColor:active==="history" ? palette.blue : palette.border,
                backgroundColor:active==="history" ? palette.paperMuted : palette.paper
              }
            ]}
          >
            <Text style={[styles.statValue,{color:palette.ink}]}>{historyCount}</Text>
            <Text style={[styles.statLabel,{color:palette.ink}]}>History</Text>
            <Text style={[styles.statHint,{color:palette.inkMuted}]}>Recent</Text>
          </View>
        </View>

        <View style={[styles.tabsWrap,{borderTopColor:palette.border}]}>
          <View style={styles.tabs} accessibilityRole="tablist">
            {tabs.map(([key,label])=>(
              <Chip key={key} active={active===key} onPress={()=>setActive(key)}>{label}</Chip>
            ))}
          </View>
        </View>
      </View>

      {library.loading && (
        <Section>
          <Text accessibilityLiveRegion="polite" style={[styles.libraryState,{color:palette.inkMuted}]}>Loading your library…</Text>
        </Section>
      )}

      {!library.loading && library.error && (
        <Section>
          <EmptyState title="Your library is temporarily unavailable" message="Saved stories, offline downloads and reading history could not be loaded. Try again shortly." />
        </Section>
      )}

      {!library.loading && !library.error && active==="saved" && (
        <Section>
          <SectionHeader title="Saved stories" eyebrow="BOOKMARKS" />
          {library.data?.saved.length
            ? <StoryGrid stories={library.data.saved} />
            : <EmptyState title="Nothing saved yet" message="Bookmarked stories will appear here. Saving a story does not make it available offline." />}
        </Section>
      )}

      {!library.loading && !library.error && active==="offline" && (
        <Section>
          <SectionHeader title="Available offline" eyebrow="DOWNLOADED" />
          {library.data?.downloads.length ? (
            <View style={styles.offlineList}>
              {library.data.downloads.map((story)=>(
                <View
                  style={[
                    styles.offlineRow,
                    {
                      borderColor:palette.border,
                      borderLeftColor:palette.success,
                      backgroundColor:palette.paper
                    }
                  ]}
                  key={story.id}
                >
                  <View style={[styles.offlineBadgeRow,{borderBottomColor:palette.border}]}>
                    <View style={styles.offlineStatusWrap}>
                      <Text style={[styles.offlineDot,{color:palette.success}]}>●</Text>
                      <Text style={[styles.offlineBadge,{color:palette.success}]}>AVAILABLE OFFLINE</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={"Remove " + story.title + " from offline downloads"}
                      onPress={()=>void removeDownload(story.id)}
                      style={({ pressed, focused }: any)=>[
                        styles.removeButton,
                        {borderColor:palette.border,backgroundColor:palette.paperMuted},
                        focused && [styles.actionFocused,{borderColor:palette.blue}],
                        pressed && styles.actionPressed
                      ]}
                    >
                      <Text style={[styles.removeText,{color:palette.blue}]}>Remove download</Text>
                    </Pressable>
                  </View>
                  <StoryCard story={story} compact />
                </View>
              ))}
              <View style={[styles.offlinePolicyNote,{borderColor:palette.border,backgroundColor:palette.paperMuted}]}>
                <Text style={[styles.offlinePolicyText,{color:palette.inkMuted}]}>
                  Eligible public stories stored here can be read without a connection. Premium stories are not stored here without verified offline access.
                </Text>
              </View>
            </View>
          ) : (
            <EmptyState title="No offline stories" message="Choose Offline in an eligible article to store it on this device. Premium stories are not stored here without verified offline access." />
          )}
        </Section>
      )}

      {!library.loading && !library.error && active==="history" && (
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
  headerCard:{
    marginTop:spacing.md,
    borderWidth:1,
    borderRadius:radius.md,
    padding:spacing.lg,
    gap:spacing.md
  },
  headerTopRow:{
    flexDirection:"row",
    alignItems:"center",
    justifyContent:"space-between",
    flexWrap:"wrap",
    gap:spacing.sm
  },
  headerEyebrow:{
    fontSize:11,
    fontWeight:"900",
    letterSpacing:1.1
  },
  scopeTag:{
    fontSize:10,
    fontWeight:"800",
    letterSpacing:0.8,
    borderWidth:1,
    borderRadius:radius.sm,
    paddingHorizontal:8,
    paddingVertical:2
  },
  lede:{fontSize:14,lineHeight:21,maxWidth:760},
  summary:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  stat:{
    minWidth:104,
    flexGrow:1,
    flexBasis:104,
    borderWidth:1,
    borderTopWidth:3,
    borderRadius:radius.sm,
    padding:spacing.md,
    gap:2
  },
  statValue:{fontSize:24,fontWeight:"900"},
  statLabel:{fontSize:11,fontWeight:"900",textTransform:"uppercase",letterSpacing:0.6},
  statHint:{fontSize:11,lineHeight:15},
  tabsWrap:{
    borderTopWidth:1,
    paddingTop:spacing.md
  },
  tabs:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  offlineList:{gap:spacing.lg},
  offlineRow:{
    borderWidth:1,
    borderLeftWidth:3,
    borderRadius:radius.md,
    padding:spacing.md,
    gap:spacing.sm
  },
  offlineBadgeRow:{
    flexDirection:"row",
    alignItems:"center",
    justifyContent:"space-between",
    flexWrap:"wrap",
    gap:spacing.sm,
    paddingBottom:spacing.sm,
    borderBottomWidth:1
  },
  offlineStatusWrap:{
    flexDirection:"row",
    alignItems:"center",
    gap:6
  },
  offlineDot:{fontSize:10,fontWeight:"900"},
  offlineBadge:{fontSize:10,fontWeight:"900",letterSpacing:1,color:colors.success},
  removeButton:{
    minHeight:layout.touchMin,
    justifyContent:"center",
    paddingHorizontal:12,
    borderWidth:1,
    borderRadius:radius.sm
  },
  removeText:{fontSize:12,fontWeight:"800"},
  offlinePolicyNote:{
    borderWidth:1,
    borderRadius:radius.sm,
    padding:spacing.md
  },
  offlinePolicyText:{
    fontSize:13,
    lineHeight:19
  },
  actionFocused:{borderWidth:2},
  actionPressed:{opacity:0.86},
  libraryState:{fontSize:14,lineHeight:22}
});
