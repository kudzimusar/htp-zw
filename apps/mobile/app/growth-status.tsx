import { StyleSheet, Text, View } from "react-native";
import { Page, Section, SectionHeader } from "../src/ui/Layout";
import {
  MOBILE_GROWTH_CONFIGURATION,
  VERIFIED_SELLER_DECLARATION,
  VERIFIED_WEB_GROWTH_IDENTITIES
} from "../src/growth/config";
import { colors, radius, spacing } from "../src/theme/tokens";

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
  return (
    <Page title="Growth & Commercial Readiness">
      <Section>
        <SectionHeader title="Verified web continuity identities" />
        <View style={styles.panel}>
          <Text style={styles.label}>Google tag</Text>
          <Text style={styles.value}>{VERIFIED_WEB_GROWTH_IDENTITIES.googleTag}</Text>
          <Text style={styles.label}>GA4 property</Text>
          <Text style={styles.value}>{VERIFIED_WEB_GROWTH_IDENTITIES.ga4PropertyId}</Text>
          <Text style={styles.label}>Search Console property</Text>
          <Text style={styles.value}>{VERIFIED_WEB_GROWTH_IDENTITIES.searchConsoleProperty}</Text>
          <Text style={styles.label}>AdSense publisher</Text>
          <Text style={styles.value}>{VERIFIED_WEB_GROWTH_IDENTITIES.adsensePublisherId}</Text>
          <Text style={styles.label}>Verified seller declaration</Text>
          <Text style={styles.mono}>{VERIFIED_SELLER_DECLARATION}</Text>
        </View>
      </Section>

      <Section>
        <SectionHeader title="Native activation gates" />
        {readiness.map(([label,value])=>(
          <View key={label} style={styles.row}>
            <View style={[styles.dot,value ? styles.ready : styles.blocked]} />
            <View style={{flex:1}}>
              <Text style={styles.rowTitle}>{label}</Text>
              <Text style={styles.rowText}>
                {value ? "Configured" : "Not configured — no native identifier is inferred from the web configuration."}
              </Text>
            </View>
          </View>
        ))}
      </Section>

      <Section>
        <Text style={styles.note}>
          AG-05 account-level evidence and approved native products/providers are still required. HealthTimes does not
          reuse the web GA4 measurement ID as a native stream, invent AdMob unit IDs, fabricate store prices, or treat
          the verified AdSense seller line as proof of an AdMob account.
        </Text>
      </Section>
    </Page>
  );
}

const styles=StyleSheet.create({
  panel:{backgroundColor:colors.paperMuted,borderRadius:radius.md,padding:spacing.xl,gap:spacing.xs},
  label:{marginTop:spacing.sm,fontSize:11,fontWeight:"900",textTransform:"uppercase",color:colors.inkMuted},
  value:{fontSize:16,fontWeight:"800",color:colors.ink},
  mono:{fontSize:12,lineHeight:19,color:colors.ink},
  row:{flexDirection:"row",gap:spacing.md,paddingVertical:spacing.md,borderBottomWidth:1,borderBottomColor:colors.border},
  dot:{width:10,height:10,borderRadius:5,marginTop:5},
  ready:{backgroundColor:colors.success},
  blocked:{backgroundColor:colors.live},
  rowTitle:{fontSize:15,fontWeight:"900",color:colors.ink},
  rowText:{fontSize:13,lineHeight:19,color:colors.inkMuted,marginTop:2},
  note:{fontSize:14,lineHeight:22,color:colors.inkMuted}
});
