import { Pressable, StyleSheet, Text, View } from "react-native";
import { layout, radius, spacing } from "../theme/tokens";
import { useAppearance } from "../theme/AppearanceProvider";

type ToolbarActionProps = {
  glyph: string;
  label: string;
  onPress: () => void;
  selected?: boolean;
};

function ToolbarAction({ glyph, label, onPress, selected = false }: ToolbarActionProps) {
  const { palette } = useAppearance();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.action,
        {
          borderColor: selected ? palette.blue : palette.border,
          backgroundColor: selected ? palette.paperMuted : palette.paper
        }
      ]}
    >
      <Text style={[styles.glyph, { color: palette.ink }]}>{glyph}</Text>
    </Pressable>
  );
}

export function ArticleToolbar({
  textScale,
  onBack,
  onTextScale,
  onSave,
  onListen,
  onShare,
  onOffline
}: {
  textScale: number;
  onBack: () => void;
  onTextScale: () => void;
  onSave: () => void;
  onListen: () => void;
  onShare: () => void;
  onOffline: () => void;
}) {
  const { palette } = useAppearance();
  return (
    <View style={[styles.wrap, { borderBottomColor: palette.border }]}>
      <View style={styles.primaryRow} accessibilityRole="toolbar" accessibilityLabel="Article actions">
        <ToolbarAction glyph="←" label="Back" onPress={onBack} />
        <View style={styles.spacer} />
        <ToolbarAction
          glyph="Aa"
          label={"Text size " + Math.round(textScale * 100) + "%"}
          selected={textScale !== 1}
          onPress={onTextScale}
        />
        <ToolbarAction glyph="☆" label="Save article" onPress={onSave} />
        <ToolbarAction glyph="▶" label="Listen to article" onPress={onListen} />
        <ToolbarAction glyph="↗" label="Share article" onPress={onShare} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Download article for offline reading"
        onPress={onOffline}
        style={styles.offline}
      >
        <Text style={[styles.offlineText, { color: palette.inkMuted }]}>↓ Offline</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.xs
  },
  primaryRow: {
    minHeight: layout.touchMin,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  spacer: { flex: 1 },
  action: {
    minHeight: layout.touchMin,
    minWidth: layout.touchMin,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row"
  },
  glyph: { fontSize: 16, fontWeight: "900" },
  offline: {
    alignSelf: "flex-end",
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: spacing.xs
  },
  offlineText: {
    fontSize: 11,
    fontWeight: "800"
  }
});
