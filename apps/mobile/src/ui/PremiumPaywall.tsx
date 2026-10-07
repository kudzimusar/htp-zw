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
  return (
    <View
      style={[styles.card, { backgroundColor: palette.paper, borderColor: palette.border, borderTopColor: palette.premium }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel="HealthTimes Premium article paywall"
    >
      <View style={styles.identityRow}>
        <Text style={[styles.mark,{color:palette.premium}]}>✦</Text>
        <Text style={[styles.identity,{color:palette.premium}]}>HEALTHTIMES PREMIUM</Text>
      </View>
      <Text style={[styles.title, { color: palette.ink }]}>Continue reading with HealthTimes Premium</Text>
      <Text style={[styles.body, { color: palette.inkMuted }]}>
        This article continues for members. Premium gives readers access to HealthTimes member journalism and other supported member features.
      </Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to HealthTimes Premium"
          style={[styles.primary, { backgroundColor: palette.blue }]}
          onPress={onGoPremium}
        >
          <Text style={[styles.primaryText, { color: palette.paper }]}>Go Premium</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in as an existing member"
          style={[styles.secondary, { borderColor: palette.border }]}
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
    maxWidth: 680,
    alignSelf: "center",
    borderWidth: 1,
    borderTopWidth: 3,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.md
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  mark: {
    fontSize: 16,
    fontWeight: "900"
  },
  identity: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2
  },
  title: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "900",
    letterSpacing: -0.4
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 580
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  primary: {
    minHeight: layout.touchMin,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm
  },
  primaryText: {
    fontWeight: "900"
  },
  secondary: {
    minHeight: layout.touchMin,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.sm
  },
  secondaryText: {
    fontWeight: "900"
  }
});
