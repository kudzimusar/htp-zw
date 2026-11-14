import { StyleSheet, Text, View } from "react-native";
import { Page, PolicyLinks, Section } from "./Layout";
import { radius, spacing } from "../theme/tokens";
import { useAppearance } from "../theme/AppearanceProvider";
import { DRAFT_NOTICE, type PolicyDraft } from "../legal/policy-drafts";

export function PolicyDocumentScreen({ policy }: { policy: PolicyDraft }) {
  const { palette } = useAppearance();
  const draft = policy.status !== "approved";
  return (
    <Page title={policy.title}>
      {draft && (
        <Section>
          <View
            testID="policy-draft-notice"
            accessibilityLabel={"Draft notice. " + DRAFT_NOTICE}
            style={[styles.notice, { borderLeftColor: palette.premium, backgroundColor: palette.paperMuted }]}
          >
            <Text style={[styles.noticeTitle, { color: palette.ink }]}>Draft — not yet published</Text>
            <Text style={[styles.noticeText, { color: palette.inkMuted }]}>{DRAFT_NOTICE}</Text>
            <Text style={[styles.noticeMeta, { color: palette.inkMuted }]}>Working version {policy.version}</Text>
          </View>
        </Section>
      )}
      <Section>
        <Text style={[styles.summary, { color: palette.ink }]}>{policy.summary}</Text>
      </Section>
      {policy.sections.map((section) => (
        <Section key={section.heading}>
          <Text accessibilityRole="header" style={[styles.heading, { color: palette.ink }]}>{section.heading}</Text>
          {!!section.facts?.length && (
            <View style={styles.group}>
              {draft && <Text style={[styles.groupLabel, { color: palette.blue }]}>HOW HEALTHTIMES WORKS TODAY</Text>}
              {section.facts.map((fact) => (
                <Text key={fact} style={[styles.item, { color: palette.ink }]}>{"• " + fact}</Text>
              ))}
            </View>
          )}
          {draft && !!section.decisions?.length && (
            <View style={styles.group}>
              <Text style={[styles.groupLabel, { color: palette.premium }]}>FOR HEALTHTIMES LEGAL REVIEW</Text>
              {section.decisions.map((decision) => (
                <Text key={decision} style={[styles.item, { color: palette.inkMuted }]}>{"• " + decision}</Text>
              ))}
            </View>
          )}
        </Section>
      ))}
      <Section>
        <PolicyLinks current={policy.key} />
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  notice: { borderLeftWidth: 4, borderRadius: radius.sm, padding: spacing.lg, gap: spacing.xs, maxWidth: 760 },
  noticeTitle: { fontSize: 16, fontWeight: "900" },
  noticeText: { fontSize: 15, lineHeight: 23 },
  noticeMeta: { fontSize: 13, lineHeight: 20 },
  summary: { fontSize: 17, lineHeight: 27, maxWidth: 760 },
  heading: { fontSize: 20, lineHeight: 27, fontWeight: "900", marginBottom: spacing.sm },
  group: { gap: spacing.xs, maxWidth: 760, marginTop: spacing.sm },
  groupLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 0.6 },
  item: { fontSize: 16, lineHeight: 25 }
});
