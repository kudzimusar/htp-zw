import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { layout, radius, spacing } from "../theme/tokens";
import { useAppearance } from "../theme/AppearanceProvider";

export function PremiumPaywall({
  onGoPremium,
  onSignIn
}: {
  onGoPremium: () => void;
  onSignIn: () => void;
}) {
  const { palette } = useAppearance();
  const [primaryFocused, setPrimaryFocused] = useState(false);
  const [secondaryFocused, setSecondaryFocused] = useState(false);
  return (
    <View
      testID="premium-article-paywall"
      style={[
        styles.card,
        {
          backgroundColor: palette.paperMuted,
          borderColor: palette.border,
          borderTopColor: palette.premium
        }
      ]}
      accessibilityLiveRegion="polite"
      accessibilityLabel="HealthTimes Premium article paywall"
    >
      <View style={styles.headerRow}>
        <View style={styles.identityRow}>
          <Text style={[styles.mark, { color: palette.premium }]}>✦</Text>
          <Text style={[styles.identity, { color: palette.premium }]}>HEALTHTIMES PREMIUM</Text>
        </View>
        <Text style={[styles.continuationTag, { color: palette.inkMuted }]}>MEMBER JOURNALISM</Text>
      </View>

      <Text style={[styles.title, { color: palette.ink }]}>Continue reading with HealthTimes Premium</Text>
      <Text style={[styles.body, { color: palette.inkMuted }]}>
        This article continues for HealthTimes members after the 20-second preview. Explore HealthTimes Premium membership options, or sign in to restore existing member access on this device.
      </Text>

      <View style={[styles.divider, { borderTopColor: palette.border }]} />

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to HealthTimes Premium"
          onFocus={() => setPrimaryFocused(true)}
          onBlur={() => setPrimaryFocused(false)}
          style={({ pressed }) => [
            styles.primary,
            primaryFocused && styles.actionFocused,
            {
              backgroundColor: palette.blue,
              borderColor: primaryFocused ? palette.ink : palette.blue,
              opacity: pressed ? 0.9 : 1
            }
          ]}
          onPress={onGoPremium}
        >
          <Text style={[styles.primaryText, { color: palette.paper }]}>Go Premium</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in as an existing member"
          onFocus={() => setSecondaryFocused(true)}
          onBlur={() => setSecondaryFocused(false)}
          style={({ pressed }) => [
            styles.secondary,
            secondaryFocused && styles.actionFocused,
            {
              backgroundColor: pressed ? palette.border : palette.paper,
              borderColor: secondaryFocused ? palette.blue : palette.border
            }
          ]}
          onPress={onSignIn}
        >
          <Text style={[styles.secondaryText, { color: palette.ink }]}>Member sign in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: layout.articleMax,
    alignSelf: "center",
    borderWidth: 1,
    borderTopWidth: 3,
    borderRadius: radius.sm,
    padding: spacing.xl,
    gap: spacing.md
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  mark: {
    fontSize: 15,
    fontWeight: "900"
  },
  identity: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1
  },
  continuationTag: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.9
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    letterSpacing: -0.4
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 640
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginVertical: 2
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm
  },
  primary: {
    minHeight: layout.touchMin,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.sm
  },
  primaryText: {
    fontSize: 14,
    fontWeight: "900"
  },
  secondary: {
    minHeight: layout.touchMin,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.sm
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: "800"
  },
  actionFocused: {
    borderWidth: 2
  }
});
