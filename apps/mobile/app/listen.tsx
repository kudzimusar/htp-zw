import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AudioCard } from "../src/ui/Cards";
import { Chip, EmptyState, Page, Section, SectionHeader } from "../src/ui/Layout";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { radius, spacing } from "../src/theme/tokens";
import { useAppearance } from "../src/theme/AppearanceProvider";
import { useReaderAudioPlayer, verifiedAudioSource } from "../src/reader/media-player";
import { useReaderConnectivity } from "../src/reader/offline-state";
import type { AudioItem } from "../src/domain/models";

type ListenTab="latest"|"podcasts"|"articles"|"offline";

function formatClock(value:number){
  const safe=Math.max(0,Math.round(value));
  return Math.floor(safe/60)+":"+String(safe%60).padStart(2,"0");
}

export default function ListenScreen(){
  const { palette }=useAppearance();
  const connectivity=useReaderConnectivity();
  const [active,setActive]=useState<ListenTab>("latest");
  const [libraryVersion,setLibraryVersion]=useState(0);
  const audio=useAsync(()=>services.audio.list(),[]);
  const savedAudioIds=useAsync(()=>services.reader.getSavedMediaIds("audio"),[libraryVersion]);
  const player=useReaderAudioPlayer();
  const featured=audio.data?.[0];
  const current=audio.data?.find((item)=>item.id===player.state.currentItemId) ?? featured ?? null;
  const progress=(player.state.durationSeconds&&player.state.durationSeconds>0)
    ? Math.min(100,(player.state.elapsedSeconds/player.state.durationSeconds)*100)
    : 0;

  const toggleSaved=async(id:string)=>{
    await services.reader.toggleSavedMedia("audio",id);
    setLibraryVersion((value)=>value+1);
  };

  const start=async(item:AudioItem)=>{
    await player.play(item);
  };

  const cycleSpeed=()=>{
    const speeds=[0.75,1,1.25,1.5,2];
    const index=speeds.indexOf(player.state.playbackRate);
    player.setPlaybackRate(speeds[(index+1)%speeds.length] ?? 1);
  };

  const offlineCapable=(audio.data??[]).filter((item)=>Boolean(item.source?.verified&&item.source.downloadable));

  return (
    <Page title="Listen">
      <Text style={[styles.lede,{color:palette.inkMuted}]}>Listen to HealthTimes programmes and article audio when a verified playback source exists. Web playback uses the Reader media adapter; native background and lock-screen playback remain a later certification item.</Text>
      <View style={styles.tabs}>
        {([
          ["latest","Latest"],
          ["podcasts","Podcasts"],
          ["articles","Articles"],
          ["offline","Offline"]
        ] as const).map(([key,label])=><Chip key={key} active={active===key} onPress={()=>setActive(key)}>{label}</Chip>)}
      </View>

      {active==="latest" ? (
        <>
          <Section>
            <SectionHeader title="Player" eyebrow={player.state.presentation==="mini"?"MINI PLAYER":"LISTEN"} />
            {current ? (
              <View style={[styles.player,{backgroundColor:palette.navy}]}>
                <View style={styles.playerTopline}>
                  <View style={{flex:1,gap:4}}>
                    <Text style={styles.playerLabel}>{verifiedAudioSource(current)?"VERIFIED AUDIO":"AUDIO UNAVAILABLE"}</Text>
                    <Text style={[styles.playerTitle,player.state.presentation==="mini"&&styles.playerTitleMini]}>{current.title}</Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={player.state.presentation==="mini"?"Open full player":"Minimize player"} style={styles.presentationButton} onPress={()=>player.setPresentation(player.state.presentation==="mini"?"full":"mini")}>
                    <Text style={styles.presentationText}>{player.state.presentation==="mini"?"Full":"Mini"}</Text>
                  </Pressable>
                </View>
                <Text style={styles.playerMeta}>{formatClock(player.state.elapsedSeconds)} / {formatClock(player.state.durationSeconds??current.durationSeconds??0)} · {player.state.status}</Text>
                <View style={styles.playerControls}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={player.state.status==="playing"?"Pause audio":"Play audio"}
                    accessibilityState={{disabled:!verifiedAudioSource(current)}}
                    disabled={!verifiedAudioSource(current)}
                    style={[styles.play,!verifiedAudioSource(current)&&styles.playDisabled]}
                    onPress={()=>player.state.status==="playing"?player.pause():void start(current)}
                  >
                    <Text style={styles.playText}>{player.state.status==="playing"?"Pause":"Play"}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Seek back 15 seconds" style={styles.seek} onPress={()=>player.seek(Math.max(0,player.state.elapsedSeconds-15))}><Text style={styles.seekText}>−15s</Text></Pressable>
                  <View style={styles.progress} accessibilityLabel={"Playback progress "+Math.round(progress)+" percent"}><View style={[styles.progressFill,{width:(progress+"%") as `${number}%`}]} /></View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Seek forward 15 seconds" style={styles.seek} onPress={()=>player.seek(player.state.elapsedSeconds+15)}><Text style={styles.seekText}>+15s</Text></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={"Playback speed "+player.state.playbackRate+" times"} style={styles.speedButton} onPress={cycleSpeed}><Text style={styles.speed}>{player.state.playbackRate}×</Text></Pressable>
                </View>
                {!!player.state.error&&<Text accessibilityLiveRegion="polite" style={styles.error}>{player.state.error}</Text>}
                {connectivity==="offline"&&<Text accessibilityLiveRegion="polite" style={styles.playerMeta}>Offline: only previously available local media can play. This checkpoint does not claim media downloads.</Text>}
              </View>
            ) : <EmptyState title="No featured audio" message="HealthTimes audio will appear here when AG-04 supplies verified media records." />}
          </Section>

          <Section>
            <SectionHeader title="Latest" />
            {audio.data?.length ? audio.data.map((item)=><AudioCard key={item.id} item={item} saved={savedAudioIds.data?.includes(item.id)} onPlay={(value)=>void start(value)} onToggleSaved={()=>void toggleSaved(item.id)} />) : <EmptyState title="No audio yet" message="No verified HealthTimes audio records are available in the current repository." />}
          </Section>
        </>
      ) : active==="offline" ? (
        <Section>
          <SectionHeader title="Offline audio" eyebrow="CAPABILITY" />
          {offlineCapable.length ? (
            <>
              <Text style={[styles.note,{color:palette.inkMuted}]}>These sources declare download capability, but this Reader checkpoint does not download media files or claim native background playback.</Text>
              {offlineCapable.map((item)=><AudioCard key={item.id} item={item} saved={savedAudioIds.data?.includes(item.id)} onPlay={(value)=>void start(value)} onToggleSaved={()=>void toggleSaved(item.id)} />)}
            </>
          ) : <EmptyState title="No offline-capable audio" message="Saved audio and downloaded audio are separate states. AG-04 must provide media metadata and a later native adapter must prove media downloads." />}
        </Section>
      ) : (
        <Section>
          <EmptyState title="Classification metadata required" message="No audio is available in this category yet. NM-04 does not infer podcast or article-audio classification." />
        </Section>
      )}
    </Page>
  );
}
const styles=StyleSheet.create({
  lede:{fontSize:15,lineHeight:23,maxWidth:760,marginTop:spacing.sm},
  tabs:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,marginTop:spacing.lg},
  player:{padding:spacing.xl,borderRadius:radius.md,gap:spacing.md},
  playerTopline:{flexDirection:"row",alignItems:"flex-start",gap:spacing.md},
  playerLabel:{fontSize:10,fontWeight:"900",color:"#8EC8FF",letterSpacing:1.1},
  playerTitle:{fontSize:28,lineHeight:34,fontWeight:"900",color:"#FFFFFF",maxWidth:760},
  playerTitleMini:{fontSize:18,lineHeight:23},
  playerMeta:{fontSize:13,lineHeight:20,color:"#C9D5E1"},
  playerControls:{flexDirection:"row",alignItems:"center",gap:spacing.sm,flexWrap:"wrap"},
  play:{minWidth:68,minHeight:48,borderRadius:24,backgroundColor:"#FFFFFF",alignItems:"center",justifyContent:"center"},
  playDisabled:{opacity:.45},
  playText:{fontWeight:"900",color:"#071A2B"},
  seek:{minHeight:44,minWidth:52,alignItems:"center",justifyContent:"center"},
  seekText:{color:"#FFFFFF",fontWeight:"900"},
  progress:{height:6,backgroundColor:"#31465A",flexGrow:1,flexBasis:160,minWidth:120},
  progressFill:{height:6,backgroundColor:"#FFFFFF"},
  speedButton:{minHeight:44,minWidth:48,alignItems:"center",justifyContent:"center"},
  speed:{color:"#FFFFFF",fontWeight:"900"},
  presentationButton:{minHeight:44,minWidth:58,borderWidth:1,borderColor:"#5A7085",alignItems:"center",justifyContent:"center",borderRadius:radius.sm},
  presentationText:{color:"#FFFFFF",fontWeight:"900",fontSize:12},
  error:{fontSize:12,lineHeight:18,color:"#FFD2D2",fontWeight:"700"},
  note:{fontSize:13,lineHeight:20,marginBottom:spacing.md}
});
