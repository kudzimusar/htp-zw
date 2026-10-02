import { StyleSheet, Text, View } from "react-native";
import { AudioCard } from "../src/ui/Cards";
import { EmptyState, LoadingBlock, Page, Section, SectionHeader } from "../src/ui/Layout";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { radius, spacing } from "../src/theme/tokens";
import { useAppearance } from "../src/theme/AppearanceProvider";

function dateLabel(value:string|null){
  if(!value) return null;
  const date=new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
}

export default function ListenScreen(){
  const { palette }=useAppearance();
  const audio=useAsync(()=>services.audio.list(),[]);
  const featured=audio.data?.[0];
  const remaining=audio.data?.slice(1) ?? [];
  const featuredDate=featured ? dateLabel(featured.publishedAt) : null;

  return (
    <Page title="Listen">
      <View style={styles.identity}>
        <Text style={[styles.identityLabel,{color:palette.blue}]}>HEALTHTIMES AUDIO</Text>
        <Text style={[styles.lede,{color:palette.inkMuted}]}>Audio from HealthTimes will appear here when a published listening format is available.</Text>
      </View>

      {audio.loading && !audio.data ? <LoadingBlock label="Loading audio…" /> : null}

      {audio.error && !audio.data ? (
        <Section>
          <EmptyState
            title="Audio is temporarily unavailable"
            message="HealthTimes could not load Listen right now. Please try again when your connection is available."
          />
        </Section>
      ) : null}

      {!audio.loading && !audio.error && !featured ? (
        <Section>
          <EmptyState
            title="No audio published yet"
            message="HealthTimes audio will appear here when a listening edition is published."
          />
        </Section>
      ) : null}

      {featured ? (
        <>
          <Section>
            <SectionHeader title="Featured audio" eyebrow="LISTEN" />
            <View
              style={[styles.preview,{backgroundColor:palette.navy}]}
              accessibilityLabel={featured.title+". Audio playback unavailable."}
            >
              <Text style={styles.previewLabel}>FEATURED AUDIO</Text>
              <Text style={styles.previewTitle}>{featured.title}</Text>
              {(featured.durationSeconds || featuredDate) ? (
                <Text style={styles.previewMeta}>
                  {featured.durationSeconds ? Math.round(featured.durationSeconds/60)+" min" : ""}
                  {featured.durationSeconds && featuredDate ? " · " : ""}
                  {featuredDate ?? ""}
                </Text>
              ) : null}
              <View style={styles.unavailable}>
                <Text style={styles.unavailableText}>Playback unavailable</Text>
              </View>
            </View>
          </Section>

          <Section>
            <SectionHeader title="Latest audio" />
            <AudioCard item={featured} />
            {remaining.map((item)=><AudioCard key={item.id} item={item} />)}
          </Section>
        </>
      ) : null}
    </Page>
  );
}

const styles=StyleSheet.create({
  identity:{marginTop:spacing.sm,gap:4,maxWidth:820},
  identityLabel:{fontSize:10,fontWeight:"900",letterSpacing:1.5},
  lede:{fontSize:16,lineHeight:24},
  preview:{padding:spacing.xl,borderRadius:radius.md,gap:spacing.md},
  previewLabel:{fontSize:10,fontWeight:"900",color:"#8EC8FF",letterSpacing:1.2},
  previewTitle:{fontSize:30,lineHeight:36,fontWeight:"900",color:"#FFFFFF",maxWidth:780},
  previewMeta:{fontSize:13,lineHeight:20,color:"#C9D5E1"},
  unavailable:{alignSelf:"flex-start",minHeight:36,justifyContent:"center",paddingHorizontal:12,borderWidth:1,borderColor:"#526A80",borderRadius:radius.sm},
  unavailableText:{fontSize:11,fontWeight:"900",letterSpacing:.5,color:"#C9D5E1"}
});
