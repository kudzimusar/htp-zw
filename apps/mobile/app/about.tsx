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
            <SectionHeader title="Corrections & editorial standards" eyebrow="READER TRUST" />
            <Text style={[styles.note,{color:palette.inkMuted}]}>
              HealthTimes welcomes correction requests. Readers can contact the editorial desk directly, and published editorial principles are shown below.
            </Text>
            <View style={styles.actions}>
              <Pressable
                style={[styles.action,{borderColor:palette.border}]}
                onPress={()=>void Linking.openURL("mailto:"+publication.data!.editorialEmail+"?subject="+encodeURIComponent("Correction request — HealthTimes"))}
              >
                <Text style={[styles.actionText,{color:palette.blue}]}>Request a correction</Text>
              </Pressable>
            </View>
          </Section>

          <Section>
            <SectionHeader title="Source publication" />
            <Text style={[styles.note,{color:palette.inkMuted}]}>
              Learn more about HealthTimes, its editorial principles and ways to contact the publication.
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

          {!!publication.data.sourceLinks?.length && (
            <Section>
              <SectionHeader title="HealthTimes products & channels" eyebrow="HEALTHTIMES" />
              <Text style={[styles.note,{color:palette.inkMuted}]}>
                Explore HealthTimes products and official public channels.
              </Text>
              <View style={styles.linkGroups}>
                {(["product","contact","social"] as const).map((kind)=>{
                  const links=publication.data!.sourceLinks!.filter((link)=>link.kind===kind);
                  if(!links.length) return null;
                  const label=kind==="product" ? "Products" : kind==="contact" ? "Contact" : "Social";
                  return (
                    <View key={kind} style={styles.linkGroup}>
                      <Text style={[styles.linkGroupTitle,{color:palette.ink}]}>{label}</Text>
                      <View style={styles.actions}>
                        {links.map((link)=>(
                          <Pressable key={link.key} style={[styles.action,{borderColor:palette.border}]} onPress={()=>void Linking.openURL(link.url)}>
                            <Text style={[styles.actionText,{color:palette.blue}]}>{link.label}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            </Section>
          )}
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
  linkGroups:{gap:spacing.lg,marginTop:spacing.lg},
  linkGroup:{gap:spacing.xs},
  linkGroupTitle:{fontSize:13,fontWeight:"900",textTransform:"uppercase",letterSpacing:0.7},
  action:{minHeight:44,justifyContent:"center",paddingHorizontal:14,borderWidth:1,borderRadius:radius.sm},
  actionText:{fontWeight:"900"}
});
