import { useState } from "react";
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
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        focused && styles.actionFocused,
        {
          borderColor: focused || selected ? palette.blue : "transparent",
          backgroundColor: selected || pressed ? palette.paperMuted : "transparent"
        }
      ]}
    >
      <Text style={[styles.glyph, { color: selected ? palette.blue : palette.ink }]}>{glyph}</Text>
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
  const [offlineFocused, setOfflineFocused] = useState(false);
  return (
    <View style={[styles.wrap, { borderBottomColor: palette.border }]}>
      <View style={styles.primaryRow} accessibilityRole="toolbar" accessibilityLabel="Article actions">
        <ToolbarAction glyph="←" label="Back" onPress={onBack} />
        <View style={styles.spacer} />
        <View style={styles.utilityCluster}>
          <ToolbarAction
            glyph="Aa"
            label={"Text size " + Math.round(textScale * 100) + "%"}
            selected={textScale !== 1}
            onPress={onTextScale}
          />
          <ToolbarAction glyph="☆" label="Save article" onPress={onSave} />
          <ToolbarAction glyph="▶" label="Listen to article" onPress={onListen} />
          <ToolbarAction glyph="↗" label="Share article" onPress={onShare} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Download article for offline reading"
            accessibilityHint="Stores this eligible article on this device for offline reading"
            onFocus={() => setOfflineFocused(true)}
            onBlur={() => setOfflineFocused(false)}
            onPress={onOffline}
            style={({ pressed }) => [
              styles.offline,
              offlineFocused && styles.actionFocused,
              {
                borderColor: offlineFocused ? palette.blue : "transparent",
                backgroundColor: pressed ? palette.paperMuted : "transparent"
              }
            ]}
          >
            <Text style={[styles.offlineText, { color: palette.inkMuted }]}>↓ Offline</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    maxWidth: layout.articleMax,
    alignSelf: "center",
    marginTop: spacing.xs,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  primaryRow: {
    minHeight: layout.touchMin,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 2
  },
  spacer: { flex: 1, minWidth: spacing.xs },
  utilityCluster: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 2
  },
  action: {
    minHeight: layout.touchMin,
    minWidth: layout.touchMin,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row"
  },
  actionFocused: { borderWidth: 2 },
  glyph: { fontSize: 15, fontWeight: "800" },
  offline: {
    minHeight: layout.touchMin,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    borderWidth: 1,
    borderRadius: radius.sm
  },
  offlineText: {
    fontSize: 11,
    fontWeight: "700"
  }
});
