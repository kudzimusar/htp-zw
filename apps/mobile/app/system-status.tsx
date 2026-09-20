import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Page, Section, SectionHeader } from "../src/ui/Layout";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { appEnvironment, editorialDataMode } from "../src/platform/config";
import { colors, radius, spacing } from "../src/theme/tokens";
import { AG03_SOURCE_READINESS } from "../src/domain/source";
import { useAppearance } from "../src/theme/AppearanceProvider";

export default function SystemStatusScreen() {
  const { palette }=useAppearance();
  const [attempt, setAttempt] = useState(0);
  const report = useAsync(() => services.platform.checkConnectivity(), [attempt]);

  return (
    <Page title="System Status">
      <Text style={[styles.lede,{color:palette.inkMuted}]}>Operational diagnostics distinguish live staging infrastructure from fixture-backed editorial data and blocked migration prerequisites.</Text>

      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard,{borderColor:palette.border,backgroundColor:palette.paper}]}>
          <Text style={[styles.summaryLabel,{color:palette.inkMuted}]}>APP ENVIRONMENT</Text>
          <Text style={[styles.summaryValue,{color:palette.ink}]}>{appEnvironment}</Text>
        </View>
        <View style={[styles.summaryCard,{borderColor:palette.border,backgroundColor:palette.paper}]}>
          <Text style={[styles.summaryLabel,{color:palette.inkMuted}]}>EDITORIAL DATA</Text>
          <Text style={[styles.summaryValue,{color:palette.ink}]}>{editorialDataMode}</Text>
        </View>
        <View style={[styles.summaryCard,{borderColor:palette.border,backgroundColor:palette.paper}]}>
          <Text style={[styles.summaryLabel,{color:palette.inkMuted}]}>AG-03 SOURCE</Text>
          <Text style={[styles.summaryValue,{color:AG03_SOURCE_READINESS.status==="ready"?colors.success:palette.live}]}>{AG03_SOURCE_READINESS.status}</Text>
        </View>
      </View>

      <Section>
        <SectionHeader title="Connectivity" eyebrow="STAGING PLATFORM" />
        {report.loading && <Text style={[styles.muted,{color:palette.inkMuted}]}>Checking staging services…</Text>}
        {report.error && <Text style={[styles.error,{color:palette.live}]}>{report.error.message}</Text>}
        {report.data?.checks.map((check) => (
          <View style={[styles.row,{borderBottomColor:palette.border}]} key={check.key}>
            <View style={[styles.status, {backgroundColor:check.status==="pass"?colors.success:palette.live}]} />
            <View style={styles.rowCopy}>
              <Text style={[styles.label,{color:palette.ink}]}>{check.label}</Text>
              <Text style={[styles.detail,{color:palette.inkMuted}]}>{check.detail}</Text>
            </View>
          </View>
        ))}

        <Pressable style={[styles.retry,{borderColor:palette.blue}]} onPress={() => setAttempt((value) => value + 1)}>
          <Text style={[styles.retryText,{color:palette.blue}]}>Run checks again</Text>
        </Pressable>
      </Section>

      <Section>
        <SectionHeader title="Source readiness" eyebrow="AG-03" />
        <View style={[styles.sourceCard,{borderColor:palette.border,backgroundColor:palette.paper}]}>
          <View style={styles.sourceHeading}>
            <View style={[styles.status,{backgroundColor:AG03_SOURCE_READINESS.status==="ready"?colors.success:palette.live}]} />
            <Text style={[styles.label,{color:palette.ink}]}>Authoritative source package</Text>
          </View>
          <Text style={[styles.detail,{color:palette.inkMuted}]}>{AG03_SOURCE_READINESS.reason}</Text>
          <View style={styles.sourceFacts}>
            <Text style={[styles.fact,{color:palette.inkMuted}]}>Database validated: {String(AG03_SOURCE_READINESS.authoritativeDatabaseValidated)}</Text>
            <Text style={[styles.fact,{color:palette.inkMuted}]}>Uploads validated: {String(AG03_SOURCE_READINESS.completeUploadsValidated)}</Text>
            <Text style={[styles.fact,{color:palette.inkMuted}]}>Content frozen: {String(AG03_SOURCE_READINESS.contentFrozen)}</Text>
          </View>
        </View>
      </Section>

      <Section>
        <View style={[styles.boundary,{borderLeftColor:palette.blue}]}>
          <Text style={[styles.boundaryTitle,{color:palette.ink}]}>Current data boundary</Text>
          <Text style={[styles.boundaryText,{color:palette.inkMuted}]}>AG-02 staging infrastructure is live. Authoritative stories, media, subscribers and staff remain unavailable until the migration lanes populate and authorize them. This screen never displays the publishable key and no service-role/database secret belongs in the app.</Text>
        </View>
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  lede:{fontSize:15,lineHeight:23,maxWidth:800,marginTop:spacing.sm},
  summaryGrid:{marginTop:spacing.xl,flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  summaryCard:{minWidth:180,flexGrow:1,borderWidth:1,borderRadius:radius.md,padding:spacing.lg,gap:4},
  summaryLabel:{fontSize:9,fontWeight:"900",letterSpacing:1},
  summaryValue:{fontSize:17,fontWeight:"900",textTransform:"uppercase"},
  row:{minHeight:72,borderBottomWidth:1,flexDirection:"row",gap:spacing.md,paddingVertical:spacing.md,alignItems:"flex-start"},
  rowCopy:{flex:1},
  status:{width:10,height:10,borderRadius:5,marginTop:6},
  label:{fontSize:15,fontWeight:"900"},
  detail:{fontSize:13,lineHeight:20,marginTop:2},
  retry:{alignSelf:"flex-start",marginTop:spacing.lg,minHeight:44,justifyContent:"center",paddingHorizontal:14,borderWidth:1,borderRadius:radius.sm},
  retryText:{fontWeight:"900"},
  muted:{fontSize:14},
  error:{fontWeight:"800"},
  sourceCard:{borderWidth:1,borderRadius:radius.md,padding:spacing.lg,gap:spacing.md},
  sourceHeading:{flexDirection:"row",alignItems:"flex-start",gap:spacing.md},
  sourceFacts:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  fact:{fontSize:11,fontWeight:"700",paddingVertical:5},
  boundary:{borderLeftWidth:4,paddingLeft:spacing.lg,gap:spacing.sm},
  boundaryTitle:{fontSize:17,fontWeight:"900"},
  boundaryText:{fontSize:14,lineHeight:21}
});
