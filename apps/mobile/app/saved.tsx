import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chip, EmptyState, Page, Section, SectionHeader } from "../src/ui/Layout";
import { AudioCard, StoryCard, StoryGrid, StoryList, VideoCard } from "../src/ui/Cards";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { colors, radius, spacing } from "../src/theme/tokens";
import { useAppearance } from "../src/theme/AppearanceProvider";
import { compareSourceFreshness, useReaderConnectivity } from "../src/reader/offline-state";

type LibraryTab = "articles" | "videos" | "audio" | "offline" | "history";

export default function SavedScreen(){
  const { palette }=useAppearance();
  const connectivity=useReaderConnectivity();
  const [active,setActive]=useState<LibraryTab>("articles");
  const [refresh,setRefresh]=useState(0);

  const library=useAsync(async()=>{
    const [savedIds,home,offlineRecords,historyIds,savedVideoIds,savedAudioIds,videos,audio]=await Promise.all([
      services.reader.getSavedArticleIds(),
      services.articles.getHome(),
      services.reader.getOfflineArticleRecords(),
      services.reader.getReadingHistoryIds(),
      services.reader.getSavedMediaIds("video"),
      services.reader.getSavedMediaIds("audio"),
      services.video.list(),
      services.audio.list()
    ]);

    const byId=new Map(home.map((item)=>[item.id,item]));
    return {
      saved:home.filter((item)=>savedIds.includes(item.id)),
      offline:offlineRecords.map((record)=>({
        record,
        displayState:compareSourceFreshness(record,byId.get(record.article.id)?.modifiedAt ?? null)
      })),
      history:historyIds.map((id)=>byId.get(id)).filter((item): item is NonNullable<typeof item>=>Boolean(item)),
      videos:videos.filter((item)=>savedVideoIds.includes(item.id)),
      audio:audio.filter((item)=>savedAudioIds.includes(item.id)),
      savedVideoIds,
      savedAudioIds
    };
  },[refresh]);

  const removeDownload=async(id:string)=>{
    await services.reader.removeDownloadedArticle(id);
    setRefresh((value)=>value+1);
  };
  const toggleVideo=async(id:string)=>{await services.reader.toggleSavedMedia("video",id);setRefresh((value)=>value+1);};
  const toggleAudio=async(id:string)=>{await services.reader.toggleSavedMedia("audio",id);setRefresh((value)=>value+1);};

  const tabs:[LibraryTab,string][]=[
    ["articles","Articles"],
    ["videos","Videos"],
    ["audio","Audio"],
    ["offline","Offline"],
    ["history","History"]
  ];

  return (
    <Page title="Saved & Offline">
      <Text style={[styles.lede,{color:palette.inkMuted}]}>Bookmarks, downloaded article snapshots, saved media and reading history are distinct Reader states. Device storage is local-only; account synchronization belongs to NM-06/AG-06.</Text>
      <Text accessibilityLiveRegion="polite" style={[styles.connectivity,{color:palette.inkMuted}]}>Connectivity: {connectivity}</Text>

      <View style={styles.summary}>
        <View style={[styles.stat,{borderColor:palette.border,backgroundColor:palette.paper}]}>
          <Text style={[styles.statValue,{color:palette.ink}]}>{library.data?.saved.length ?? 0}</Text>
          <Text style={[styles.statLabel,{color:palette.inkMuted}]}>Saved articles</Text>
        </View>
        <View style={[styles.stat,{borderColor:palette.border,backgroundColor:palette.paper}]}>
          <Text style={[styles.statValue,{color:palette.ink}]}>{library.data?.offline.filter((entry)=>entry.record.textAvailable).length ?? 0}</Text>
          <Text style={[styles.statLabel,{color:palette.inkMuted}]}>Offline articles</Text>
        </View>
        <View style={[styles.stat,{borderColor:palette.border,backgroundColor:palette.paper}]}>
          <Text style={[styles.statValue,{color:palette.ink}]}>{(library.data?.videos.length ?? 0)+(library.data?.audio.length ?? 0)}</Text>
          <Text style={[styles.statLabel,{color:palette.inkMuted}]}>Saved media</Text>
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
            : <EmptyState title="Nothing saved yet" message="Save stories from the Article Reader. Saving does not download article content." />}
        </Section>
      )}

      {active==="offline" && (
        <Section>
          <SectionHeader title="Offline article state" eyebrow="DEVICE STORAGE" />
          {library.data?.offline.length ? (
            <View style={styles.offlineList}>
              {library.data.offline.map(({record,displayState})=>(
                <View style={[styles.offlineRow,{borderTopColor:palette.border}]} key={record.article.id}>
                  <View style={styles.offlineBadgeRow}>
                    <View style={{gap:3}}>
                      <Text style={[styles.offlineBadge,{color:displayState==="available"?colors.success:palette.inkMuted}]}>{displayState.toUpperCase()}</Text>
                      <Text style={[styles.offlineMeta,{color:palette.inkMuted}]}>Text: {record.textAvailable?"available":"unavailable"} · Media: {record.mediaAvailable?"available":"not cached"} · Sync: {record.syncMode}</Text>
                      {!!record.downloadedAt&&<Text style={[styles.offlineMeta,{color:palette.inkMuted}]}>Downloaded {new Date(record.downloadedAt).toLocaleString()}</Text>}
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={"Remove " + record.article.title + " from offline storage"}
                      onPress={()=>void removeDownload(record.article.id)}
                      style={styles.removeButton}
                    >
                      <Text style={[styles.removeText,{color:palette.blue}]}>Remove</Text>
                    </Pressable>
                  </View>
                  <StoryCard story={record.article} compact />
                </View>
              ))}
            </View>
          ) : (
            <EmptyState title="No offline articles" message="Use Offline in the Article Reader. Public article bodies are stored separately from bookmarks; Premium bodies remain fail-closed." />
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
          <SectionHeader title="Saved videos" eyebrow="SAVED · NOT DOWNLOADED" />
          {library.data?.videos.length
            ? <View style={styles.mediaGrid}>{library.data.videos.map((item)=><View style={styles.mediaItem} key={item.id}><VideoCard item={item} saved onToggleSaved={()=>void toggleVideo(item.id)} /></View>)}</View>
            : <EmptyState title="No saved videos" message="Save verified Watch items to collect them here. Saving a video does not download its media." />}
        </Section>
      )}

      {active==="audio" && (
        <Section>
          <SectionHeader title="Saved audio" eyebrow="SAVED · NOT DOWNLOADED" />
          {library.data?.audio.length
            ? library.data.audio.map((item)=><AudioCard key={item.id} item={item} saved onToggleSaved={()=>void toggleAudio(item.id)} />)
            : <EmptyState title="No saved audio" message="Save audio items from Listen when AG-04 supplies verified media records." />}
        </Section>
      )}

      <Section>
        <View style={[styles.noteBox,{backgroundColor:palette.paperMuted,borderRadius:radius.md}]}>
          <Text style={[styles.noteTitle,{color:palette.ink}]}>Reader storage boundary</Text>
          <Text style={[styles.note,{color:palette.inkMuted}]}>Offline storage is versioned device persistence. Protected Premium bodies are sanitized to null at the repository boundary. Server bookmarks, entitlement and cross-device state remain NM-06/AG-06 responsibilities.</Text>
        </View>
      </Section>
    </Page>
  );
}

const styles=StyleSheet.create({
  lede:{fontSize:15,lineHeight:23,maxWidth:760,marginTop:spacing.sm},
  connectivity:{fontSize:11,fontWeight:"800",marginTop:spacing.sm,textTransform:"uppercase",letterSpacing:.6},
  summary:{marginTop:spacing.xl,flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  stat:{minWidth:132,flexGrow:1,borderWidth:1,padding:spacing.lg,gap:2},
  statValue:{fontSize:26,fontWeight:"900"},
  statLabel:{fontSize:11,fontWeight:"800",textTransform:"uppercase",letterSpacing:0.6},
  tabs:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,marginTop:spacing.xl},
  offlineList:{gap:spacing.xl},
  offlineRow:{borderTopWidth:1,paddingTop:spacing.md},
  offlineBadgeRow:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:spacing.md,marginBottom:spacing.md},
  offlineBadge:{fontSize:10,fontWeight:"900",letterSpacing:1},
  offlineMeta:{fontSize:10,lineHeight:15},
  removeButton:{minHeight:44,minWidth:64,justifyContent:"center",alignItems:"center",paddingHorizontal:10},
  removeText:{fontSize:12,fontWeight:"800"},
  mediaGrid:{flexDirection:"row",flexWrap:"wrap",gap:spacing.xl},
  mediaItem:{minWidth:260,flex:1},
  noteBox:{padding:spacing.lg,gap:spacing.sm},
  noteTitle:{fontSize:16,fontWeight:"900"},
  note:{fontSize:13,lineHeight:20}
});
