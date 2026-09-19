import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chip, Page, Section, SectionHeader } from "../src/ui/Layout";
import { useAppearance } from "../src/theme/AppearanceProvider";
import { colors, radius, spacing } from "../src/theme/tokens";

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
              active={appearance.theme === theme}
              onPress={() => updateAppearance({ ...appearance, theme })}
            >
              {theme[0]!.toUpperCase() + theme.slice(1)}
            </Chip>
          ))}
        </View>
      </Section>

      <Section>
        <SectionHeader title="Article text" />
        <View style={[styles.preview, { backgroundColor: palette.paperMuted, borderColor: palette.border }]}>
          <Text
            style={{
              color: palette.ink,
              fontSize: 18 * appearance.textScale,
              lineHeight: 29 * appearance.textScale
            }}
          >
            HealthTimes keeps long-form journalism readable and allows the reader to choose a comfortable text size.
          </Text>
        </View>
        <View style={styles.row}>
          {[0.9, 1, 1.15, 1.3].map((textScale) => (
            <Chip
              key={textScale}
              active={Math.abs(appearance.textScale - textScale) < 0.01}
              onPress={() => updateAppearance({ ...appearance, textScale })}
            >
              {Math.round(textScale * 100)}%
            </Chip>
          ))}
        </View>
      </Section>

      <Section>
        <SectionHeader title="Content density" />
        <View style={styles.row}>
          {(["comfortable", "compact"] as const).map((density) => (
            <Chip
              key={density}
              active={appearance.density === density}
              onPress={() => updateAppearance({ ...appearance, density })}
            >
              {density[0]!.toUpperCase() + density.slice(1)}
            </Chip>
          ))}
        </View>
        <Text style={[styles.note, { color: palette.inkMuted }]}>
          Tablet and desktop story grids use this preference to increase or relax visual density without changing editorial ordering.
        </Text>
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  preview: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.xl,
    marginBottom: spacing.lg
  },
  note: { marginTop: spacing.md, fontSize: 13, lineHeight: 20 }
});
