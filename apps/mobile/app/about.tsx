import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { Page, Section, SectionHeader } from "../src/ui/Layout";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { radius, spacing } from "../src/theme/tokens";
import { useAppearance } from "../src/theme/AppearanceProvider";

export default function AboutScreen(){
  const { palette }=useAppearance();
  const publication=useAsync(()=>services.publication.getProfile(),[]);

  return (
    <Page title="About HealthTimes">
      {publication.data && (
        <>
          <Text style={[styles.lede,{color:palette.inkMuted}]}>{publication.data.description}</Text>
          <View style={[styles.factBox,{borderColor:palette.border,backgroundColor:palette.paperMuted}]}>
            <Text style={[styles.fact,{color:palette.ink}]}><Text style={styles.bold}>Publisher:</Text> {publication.data.publisher}</Text>
            <Text style={[styles.fact,{color:palette.ink}]}><Text style={styles.bold}>Location:</Text> {publication.data.location}</Text>
            <Text style={[styles.fact,{color:palette.ink}]}><Text style={styles.bold}>Editorial:</Text> {publication.data.editorialEmail}</Text>
          </View>
          <Section>
            <SectionHeader title="Editorial principles" eyebrow="CURRENT PUBLIC SOURCE" />
            {publication.data.editorialPrinciples.map((principle)=>(
              <Text key={principle} style={[styles.principle,{color:palette.ink}]}>• {principle}</Text>
            ))}
          </Section>
          <Section>
            <SectionHeader title="Source publication" />
            <Text style={[styles.note,{color:palette.inkMuted}]}>
              This page is a read-only source-parity view. AG-03/AG-04 still own migration completeness, source capture and the final Supabase-backed institutional records.
            </Text>
            <View style={styles.actions}>
              <Pressable style={[styles.action,{borderColor:palette.border}]} onPress={()=>void Linking.openURL(publication.data!.aboutUrl)}>
                <Text style={[styles.actionText,{color:palette.blue}]}>Open legacy About page</Text>
              </Pressable>
              <Pressable style={[styles.action,{borderColor:palette.border}]} onPress={()=>void Linking.openURL(publication.data!.contactUrl)}>
                <Text style={[styles.actionText,{color:palette.blue}]}>Open legacy Contact page</Text>
              </Pressable>
              <Pressable style={[styles.action,{borderColor:palette.border}]} onPress={()=>void Linking.openURL("mailto:"+publication.data!.editorialEmail)}>
                <Text style={[styles.actionText,{color:palette.blue}]}>Email editorial desk</Text>
              </Pressable>
            </View>
          </Section>
        </>
      )}
    </Page>
  );
}

const styles=StyleSheet.create({
  lede:{fontSize:18,lineHeight:28,maxWidth:840,marginTop:spacing.lg},
  factBox:{borderWidth:1,borderRadius:radius.md,padding:spacing.lg,gap:spacing.sm,marginTop:spacing.xl,maxWidth:700},
  fact:{fontSize:14,lineHeight:21},
  bold:{fontWeight:"900"},
  principle:{fontSize:15,lineHeight:25},
  note:{fontSize:14,lineHeight:22,maxWidth:760},
  actions:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,marginTop:spacing.lg},
  action:{minHeight:44,justifyContent:"center",paddingHorizontal:14,borderWidth:1,borderRadius:radius.sm},
  actionText:{fontWeight:"900"}
});
