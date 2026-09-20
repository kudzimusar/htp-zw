import { StyleSheet, Text, View } from "react-native";
import { Page, Section, SectionHeader } from "../src/ui/Layout";
import {
  MOBILE_GROWTH_CONFIGURATION,
  VERIFIED_SELLER_DECLARATION,
  VERIFIED_WEB_GROWTH_IDENTITIES
} from "../src/growth/config";
import { colors, radius, spacing } from "../src/theme/tokens";
import { useAppearance } from "../src/theme/AppearanceProvider";

const readiness = [
  ["Native GA4 stream", MOBILE_GROWTH_CONFIGURATION.ga4MobileStreamId],
  ["Native GA4 measurement ID", MOBILE_GROWTH_CONFIGURATION.ga4MobileMeasurementId],
  ["AdMob application ID", MOBILE_GROWTH_CONFIGURATION.adMobAppId],
  ["AdMob banner unit", MOBILE_GROWTH_CONFIGURATION.adMobBannerUnitId],
  ["iOS monthly product", MOBILE_GROWTH_CONFIGURATION.iosMonthlyProductId],
  ["iOS yearly product", MOBILE_GROWTH_CONFIGURATION.iosYearlyProductId],
  ["Android monthly product", MOBILE_GROWTH_CONFIGURATION.androidMonthlyProductId],
  ["Android yearly product", MOBILE_GROWTH_CONFIGURATION.androidYearlyProductId]
] as const;

export default function GrowthStatusScreen(){
  const { palette }=useAppearance();
  const configured=readiness.filter(([,value])=>Boolean(value)).length;

  return (
    <Page title="Growth & Commercial Readiness">
      <Text style={[styles.lede,{color:palette.inkMuted}]}>Verified web continuity identities stay separate from native analytics, advertising and storefront identities. Nothing is transposed between providers or platforms.</Text>

      <View style={styles.summary}>
        <View style={[styles.summaryCard,{borderColor:palette.border,backgroundColor:palette.paper}]}>
          <Text style={[styles.summaryLabel,{color:palette.inkMuted}]}>VERIFIED WEB CONTINUITY</Text>
          <Text style={[styles.summaryValue,{color:colors.success}]}>AVAILABLE</Text>
        </View>
        <View style={[styles.summaryCard,{borderColor:palette.border,backgroundColor:palette.paper}]}>
          <Text style={[styles.summaryLabel,{color:palette.inkMuted}]}>NATIVE ACTIVATION GATES</Text>
          <Text style={[styles.summaryValue,{color:configured===readiness.length?colors.success:palette.live}]}>{configured}/{readiness.length} CONFIGURED</Text>
        </View>
      </View>

      <Section>
        <SectionHeader title="Verified web continuity identities" eyebrow="AG-05 INPUT" />
        <View style={[styles.panel,{backgroundColor:palette.paperMuted}]}>
          <Text style={[styles.label,{color:palette.inkMuted}]}>Google tag</Text>
          <Text style={[styles.value,{color:palette.ink}]}>{VERIFIED_WEB_GROWTH_IDENTITIES.googleTag}</Text>
          <Text style={[styles.label,{color:palette.inkMuted}]}>GA4 property</Text>
          <Text style={[styles.value,{color:palette.ink}]}>{VERIFIED_WEB_GROWTH_IDENTITIES.ga4PropertyId}</Text>
          <Text style={[styles.label,{color:palette.inkMuted}]}>Search Console property</Text>
          <Text style={[styles.value,{color:palette.ink}]}>{VERIFIED_WEB_GROWTH_IDENTITIES.searchConsoleProperty}</Text>
          <Text style={[styles.label,{color:palette.inkMuted}]}>AdSense publisher</Text>
          <Text style={[styles.value,{color:palette.ink}]}>{VERIFIED_WEB_GROWTH_IDENTITIES.adsensePublisherId}</Text>
          <Text style={[styles.label,{color:palette.inkMuted}]}>Verified seller declaration</Text>
          <Text selectable style={[styles.mono,{color:palette.ink}]}>{VERIFIED_SELLER_DECLARATION}</Text>
        </View>
      </Section>

      <Section>
        <SectionHeader title="Native activation gates" eyebrow="MOBILE PROVIDERS" />
        {readiness.map(([label,value])=>(
          <View key={label} style={[styles.row,{borderBottomColor:palette.border}]}>
            <View style={[styles.dot,{backgroundColor:value?colors.success:palette.live}]} />
            <View style={styles.rowCopy}>
              <Text style={[styles.rowTitle,{color:palette.ink}]}>{label}</Text>
              <Text style={[styles.rowText,{color:palette.inkMuted}]}>{value ? "Configured" : "Not configured — no native identifier is inferred from the web configuration."}</Text>
            </View>
          </View>
        ))}
      </Section>

      <Section>
        <View style={[styles.noteBox,{backgroundColor:palette.paperMuted,borderRadius:radius.md}]}>
          <Text style={[styles.noteTitle,{color:palette.ink}]}>Activation policy</Text>
          <Text style={[styles.note,{color:palette.inkMuted}]}>AG-05 account-level evidence and approved native products/providers are still required. HealthTimes does not reuse the web GA4 measurement ID as a native stream, invent AdMob unit IDs, fabricate store prices, or treat the verified AdSense seller line as proof of an AdMob account.</Text>
        </View>
      </Section>
    </Page>
  );
}

const styles=StyleSheet.create({
  lede:{fontSize:15,lineHeight:23,maxWidth:800,marginTop:spacing.sm},
  summary:{marginTop:spacing.xl,flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  summaryCard:{minWidth:220,flexGrow:1,borderWidth:1,borderRadius:radius.md,padding:spacing.lg,gap:4},
  summaryLabel:{fontSize:9,fontWeight:"900",letterSpacing:1},
  summaryValue:{fontSize:16,fontWeight:"900"},
  panel:{borderRadius:radius.md,padding:spacing.xl,gap:spacing.xs},
  label:{marginTop:spacing.sm,fontSize:11,fontWeight:"900",textTransform:"uppercase"},
  value:{fontSize:16,fontWeight:"800"},
  mono:{fontSize:12,lineHeight:19},
  row:{flexDirection:"row",gap:spacing.md,paddingVertical:spacing.md,borderBottomWidth:1},
  rowCopy:{flex:1},
  dot:{width:10,height:10,borderRadius:5,marginTop:5},
  rowTitle:{fontSize:15,fontWeight:"900"},
  rowText:{fontSize:13,lineHeight:19,marginTop:2},
  noteBox:{padding:spacing.lg,gap:spacing.sm},
  noteTitle:{fontSize:16,fontWeight:"900"},
  note:{fontSize:14,lineHeight:22}
});
