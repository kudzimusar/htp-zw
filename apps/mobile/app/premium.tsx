import { Pressable, StyleSheet, Text, View } from "react-native";
import { Page, Section, SectionHeader } from "../src/ui/Layout";
import { colors, radius, spacing } from "../src/theme/tokens";

export default function PremiumScreen(){
  return (
    <Page title="Go Premium">
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>HEALTHTIMES PREMIUM</Text>
        <Text style={styles.title}>Deeper health intelligence. Full reporting. One clear membership.</Text>
        <Text style={styles.text}>Production prices are intentionally not hardcoded here. Native pricing will come from App Store / Google Play storefront products; web pricing will come from the approved billing provider.</Text>
      </View>
      <Section>
        <SectionHeader title="Choose your plan" />
        <View style={styles.plans}>
          <View style={styles.plan}>
            <Text style={styles.planTitle}>Monthly</Text>
            <Text style={styles.price}>Store price</Text>
            <Text style={styles.planText}>Full Premium entitlement after server verification.</Text>
          </View>
          <View style={[styles.plan,styles.recommended]}>
            <Text style={styles.popular}>MOST POPULAR</Text>
            <Text style={styles.planTitle}>Yearly</Text>
            <Text style={styles.price}>Store price</Text>
            <Text style={styles.planText}>Annual storefront product, subject to approved commercial terms.</Text>
          </View>
        </View>
      </Section>
      <Section>
        <SectionHeader title="Benefits" />
        {["Premium investigations and research","Article audio where available","Saved and offline reading","Followed countries and topics","Member-only briefings where published"].map((item)=><Text key={item} style={styles.benefit}>✓ {item}</Text>)}
        <Pressable style={styles.cta}><Text style={styles.ctaText}>Store integration pending NM-05</Text></Pressable>
        <Text style={styles.signin}>Already a member? Sign in through the AG-06 identity service when connected.</Text>
      </Section>
    </Page>
  );
}
const styles=StyleSheet.create({
  hero:{marginTop:spacing.xl,maxWidth:820,gap:spacing.md},
  eyebrow:{fontSize:11,fontWeight:"900",letterSpacing:1.2,color:colors.premium},
  title:{fontSize:34,lineHeight:40,fontWeight:"900",color:colors.ink,letterSpacing:-0.6},
  text:{fontSize:16,lineHeight:24,color:colors.inkMuted},
  plans:{flexDirection:"row",flexWrap:"wrap",gap:spacing.lg},
  plan:{flex:1,minWidth:250,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.xl,gap:spacing.sm},
  recommended:{borderColor:colors.blue,borderWidth:2},
  popular:{fontSize:10,fontWeight:"900",color:colors.blue,letterSpacing:1},
  planTitle:{fontSize:22,fontWeight:"900",color:colors.ink},
  price:{fontSize:28,fontWeight:"900",color:colors.ink},
  planText:{fontSize:14,lineHeight:21,color:colors.inkMuted},
  benefit:{fontSize:15,lineHeight:28,color:colors.ink},
  cta:{marginTop:spacing.lg,alignSelf:"flex-start",minHeight:48,justifyContent:"center",paddingHorizontal:18,backgroundColor:colors.blue,borderRadius:radius.sm},
  ctaText:{color:"#FFFFFF",fontWeight:"900"},
  signin:{marginTop:spacing.md,fontSize:13,color:colors.inkMuted}
});
