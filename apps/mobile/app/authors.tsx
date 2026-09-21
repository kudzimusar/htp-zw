import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { EmptyState, Page, Section, SectionHeader } from "../src/ui/Layout";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { radius, spacing } from "../src/theme/tokens";
import { useAppearance } from "../src/theme/AppearanceProvider";

export default function AuthorsScreen(){
  const router=useRouter();
  const { palette }=useAppearance();
  const authors=useAsync(()=>services.publication.listAuthors(),[]);

  return (
    <Page title="Authors">
      <Text style={[styles.lede,{color:palette.inkMuted}]}>
        Public HealthTimes editorial identities are shown from the current source publication. AG-04 remains authoritative for final migrated author records and IDs.
      </Text>
      <Section>
        <SectionHeader title="Editorial team" eyebrow="SOURCE PARITY" />
        {authors.data?.length ? (
          <View style={styles.grid}>
            {authors.data.map((author)=>(
              <Pressable
                key={author.id}
                accessibilityRole="link"
                style={[styles.card,{borderColor:palette.border,backgroundColor:palette.paper}]}
                onPress={()=>router.push(("/author/"+author.slug) as never)}
              >
                <Text style={[styles.name,{color:palette.ink}]}>{author.displayName}</Text>
                {!!author.role && <Text style={[styles.role,{color:palette.blue}]}>{author.role}</Text>}
                <Text style={[styles.open,{color:palette.inkMuted}]}>View source-parity coverage →</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState title="No public author profiles available" message="The final author directory will be reconciled by AG-04." />
        )}
      </Section>
    </Page>
  );
}

const styles=StyleSheet.create({
  lede:{fontSize:15,lineHeight:23,maxWidth:780,marginTop:spacing.sm},
  grid:{flexDirection:"row",flexWrap:"wrap",gap:spacing.lg},
  card:{width:"100%",maxWidth:360,borderWidth:1,borderRadius:radius.md,padding:spacing.lg,gap:spacing.xs},
  name:{fontSize:19,fontWeight:"900"},
  role:{fontSize:12,fontWeight:"900",textTransform:"uppercase",letterSpacing:0.7},
  open:{fontSize:13,marginTop:spacing.sm}
});
