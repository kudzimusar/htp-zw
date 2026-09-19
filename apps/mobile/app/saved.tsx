import { StyleSheet, Text, View } from "react-native";
import { Chip, EmptyState, Page, Section, SectionHeader } from "../src/ui/Layout";
import { StoryGrid } from "../src/ui/Cards";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { colors, spacing } from "../src/theme/tokens";

export default function SavedScreen(){
  const saved=useAsync(async()=>{
    const [ids,home]=await Promise.all([services.reader.getSavedArticleIds(),services.articles.getHome()]);
    return home.filter((item)=>ids.includes(item.id));
  },[]);
  return (
    <Page title="Saved & Offline">
      <View style={styles.tabs}><Chip active>Articles</Chip><Chip>Videos</Chip><Chip>Audio</Chip><Chip>Offline</Chip></View>
      <Section>
        <SectionHeader title="Saved articles" />
        {saved.data?.length ? <StoryGrid stories={saved.data} /> : <EmptyState title="Nothing saved yet" message="Save stories from the Article Reader. Downloaded/offline content will be visually distinct when NM-04 adds persistent device storage." />}
      </Section>
      <Section>
        <Text style={styles.note}>NM-01 keeps fixture state in memory only. It is intentionally not permanent authority and resets when the app reloads.</Text>
      </Section>
    </Page>
  );
}
const styles=StyleSheet.create({
  tabs:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,marginTop:spacing.lg},
  note:{fontSize:13,lineHeight:20,color:colors.inkMuted}
});
