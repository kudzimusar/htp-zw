import { Pressable, StyleSheet, Text } from "react-native";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StoryGrid } from "../../src/ui/Cards";
import { EmptyState, Page, Section, SectionHeader } from "../../src/ui/Layout";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { sourceParityAuthors } from "../../src/source-parity/snapshot";
import { radius, spacing } from "../../src/theme/tokens";
import { useAppearance } from "../../src/theme/AppearanceProvider";

export function generateStaticParams(){
  return sourceParityAuthors.map((item)=>({slug:item.slug}));
}

export default function AuthorScreen(){
  const { slug }=useLocalSearchParams<{slug:string}>();
  const router=useRouter();
  const { palette }=useAppearance();
  const author=useAsync(()=>services.publication.getAuthor(String(slug)),[slug]);
  const stories=useAsync(()=>services.articles.listByAuthor(String(slug)),[slug]);

  if(author.loading) return <Page title="Author"><Text style={{color:palette.inkMuted}}>Loading author…</Text></Page>;
  if(!author.data) return <Page title="Author"><EmptyState title="Author not found" message="This public author identity is not present in the current source-parity snapshot." /></Page>;

  return (
    <Page>
      <Pressable style={[styles.back,{borderColor:palette.border}]} onPress={()=>router.back()}>
        <Text style={[styles.backText,{color:palette.ink}]}>Back</Text>
      </Pressable>
      <Text style={[styles.eyebrow,{color:palette.blue}]}>HEALTHTIMES AUTHOR</Text>
      <Text style={[styles.title,{color:palette.ink}]}>{author.data.displayName}</Text>
      {!!author.data.role && <Text style={[styles.role,{color:palette.inkMuted}]}>{author.data.role}</Text>}
      {!!author.data.bio && <Text style={[styles.bio,{color:palette.inkMuted}]}>{author.data.bio}</Text>}
      {!!author.data.sourceUrl && (
        <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(author.data!.sourceUrl!)}>
          <Text style={[styles.sourceLink,{color:palette.blue}]}>Open current public author page →</Text>
        </Pressable>
      )}
      <Section>
        <SectionHeader title="Recent source-parity coverage" eyebrow="CURRENT PUBLIC SOURCE" />
        {stories.data?.length
          ? <StoryGrid stories={stories.data} />
          : <EmptyState title="No snapshot stories for this author yet" message="The author identity is preserved; AG-04 will reconcile the complete author archive." />}
      </Section>
    </Page>
  );
}

const styles=StyleSheet.create({
  back:{alignSelf:"flex-start",minHeight:44,justifyContent:"center",paddingHorizontal:12,borderWidth:1,borderRadius:radius.sm,marginTop:spacing.lg},
  backText:{fontWeight:"900"},
  eyebrow:{fontSize:11,fontWeight:"900",letterSpacing:1.1,marginTop:spacing.xl},
  title:{fontSize:38,lineHeight:44,fontWeight:"900",letterSpacing:-0.8,marginTop:spacing.sm},
  role:{fontSize:15,fontWeight:"800",marginTop:spacing.sm},
  bio:{fontSize:16,lineHeight:24,maxWidth:760,marginTop:spacing.md},
  sourceLink:{fontSize:14,fontWeight:"900",marginTop:spacing.lg}
});
