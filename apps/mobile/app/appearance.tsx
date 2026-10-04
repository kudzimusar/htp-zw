import { StyleSheet, Text, View } from "react-native";
import { Chip, Page, Section, SectionHeader } from "../src/ui/Layout";
import { useAppearance } from "../src/theme/AppearanceProvider";
import { spacing } from "../src/theme/tokens";

export default function AppearanceScreen() {
  const { appearance, palette, updateAppearance } = useAppearance();

  return (
    <Page title="Appearance">
      <Section>
        <SectionHeader title="Theme" />
        <View style={styles.row}>
          {(["system", "light", "dark"] as const).map((theme) => (
            <Chip
              key={theme}
              active={appearance === theme}
              onPress={() => updateAppearance(theme)}
            >
              {theme[0]!.toUpperCase() + theme.slice(1)}
            </Chip>
          ))}
        </View>
        <Text style={[styles.note, { color: palette.inkMuted }]}>
          System follows the device appearance. Light and Dark override it for HealthTimes only.
        </Text>
      </Section>

      <Section>
        <SectionHeader title="Reading accessibility" />
        <Text style={[styles.note, { color: palette.inkMuted }]}>
          Article text controls support larger reading text, shared controls use at least 44-point touch targets, and tablet story grids automatically expand to two or three columns without changing editorial order.
        </Text>
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  note: { marginTop: spacing.md, fontSize: 14, lineHeight: 22 }
});
