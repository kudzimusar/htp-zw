import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Page, Section, SectionHeader } from "../src/ui/Layout";
import { services } from "../src/services";
import { useAsync } from "../src/hooks/useAsync";
import { appEnvironment, editorialDataMode } from "../src/platform/config";
import { colors, radius, spacing } from "../src/theme/tokens";
import { AG03_SOURCE_READINESS } from "../src/domain/source";

export default function SystemStatusScreen() {
  const [attempt, setAttempt] = useState(0);
  const report = useAsync(() => services.platform.checkConnectivity(), [attempt]);

  return (
    <Page title="System Status">
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>HealthTimes platform diagnostics</Text>
        <Text style={styles.summaryText}>
          App environment: {appEnvironment}. Editorial data: {editorialDataMode}.
          Staging infrastructure may be live while migrated editorial content remains fixture-backed.
        </Text>
      </View>

      <Section>
        <SectionHeader title="Connectivity" />
        {report.loading && <Text style={styles.muted}>Checking staging services…</Text>}
        {report.error && <Text style={styles.error}>{report.error.message}</Text>}
        {report.data?.checks.map((check) => (
          <View style={styles.row} key={check.key}>
            <View style={[styles.status, check.status === "pass" ? styles.pass : styles.fail]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{check.label}</Text>
              <Text style={styles.detail}>{check.detail}</Text>
            </View>
          </View>
        ))}

        <Pressable style={styles.retry} onPress={() => setAttempt((value) => value + 1)}>
          <Text style={styles.retryText}>Run checks again</Text>
        </Pressable>
      </Section>

      <Section>
        <SectionHeader title="Source readiness" />
        <View style={styles.row}>
          <View style={[styles.status, AG03_SOURCE_READINESS.status === "ready" ? styles.pass : styles.fail]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>AG-03 authoritative source package</Text>
            <Text style={styles.detail}>{AG03_SOURCE_READINESS.reason}</Text>
            <Text style={styles.detail}>
              Database validated: {String(AG03_SOURCE_READINESS.authoritativeDatabaseValidated)} · Uploads validated: {String(AG03_SOURCE_READINESS.completeUploadsValidated)} · Content frozen: {String(AG03_SOURCE_READINESS.contentFrozen)}
            </Text>
          </View>
        </View>
      </Section>

      <Section>
        <View style={styles.boundary}>
          <Text style={styles.boundaryTitle}>Current data boundary</Text>
          <Text style={styles.boundaryText}>
            AG-02 staging infrastructure is live. Authoritative stories, media, subscribers and staff
            remain unavailable until the migration lanes populate and authorize them. This screen never
            displays the publishable key and no service-role/database secret belongs in the app.
          </Text>
        </View>
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  summary: {
    marginTop: spacing.xl,
    backgroundColor: colors.paperMuted,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.sm
  },
  summaryTitle: { fontSize: 20, fontWeight: "900", color: colors.ink },
  summaryText: { fontSize: 14, lineHeight: 21, color: colors.inkMuted },
  row: {
    minHeight: 72,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.md,
    alignItems: "flex-start"
  },
  status: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  pass: { backgroundColor: colors.success },
  fail: { backgroundColor: colors.live },
  label: { fontSize: 15, fontWeight: "900", color: colors.ink },
  detail: { fontSize: 13, lineHeight: 20, color: colors.inkMuted, marginTop: 2 },
  retry: {
    alignSelf: "flex-start",
    marginTop: spacing.lg,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.blue
  },
  retryText: { color: colors.blue, fontWeight: "900" },
  muted: { color: colors.inkMuted },
  error: { color: colors.live, fontWeight: "800" },
  boundary: { borderLeftWidth: 4, borderLeftColor: colors.blue, paddingLeft: spacing.lg, gap: spacing.sm },
  boundaryTitle: { fontSize: 17, fontWeight: "900", color: colors.ink },
  boundaryText: { fontSize: 14, lineHeight: 21, color: colors.inkMuted }
});
