import { useEffect } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { breakpoints, colors, layout, radius, spacing } from "../theme/tokens";
import { useAppearance } from "../theme/AppearanceProvider";

export function PremiumSubscriptionPrompt({
  visible,
  commerceAvailable,
  onPrimary,
  onSignIn,
  onDismiss
}: {
  visible: boolean;
  commerceAvailable: boolean;
  onPrimary: () => void;
  onSignIn: () => void;
  onDismiss: () => void;
}) {
  const { palette } = useAppearance();
  const { width } = useWindowDimensions();
  const phone = width < breakpoints.tablet;

  useEffect(() => {
    if (!visible || Platform.OS !== "web" || typeof document === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [visible, onDismiss]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={phone ? "slide" : "fade"}
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View
        style={[styles.backdrop, phone ? styles.backdropPhone : styles.backdropCentered]}
        accessibilityViewIsModal
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          accessible={false}
          onPress={onDismiss}
        />
        <View
          testID="premium-subscription-prompt"
          style={[
            styles.card,
            phone ? styles.cardPhone : styles.cardDesktop,
            { backgroundColor: palette.paper, borderColor: palette.border }
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.topRow}>
              <View style={styles.identityRow}>
                <Text style={styles.mark}>✦</Text>
                <Text style={styles.identity}>HEALTHTIMES PREMIUM</Text>
              </View>
              <Pressable
                testID="premium-prompt-close"
                accessibilityRole="button"
                accessibilityLabel="Close Premium membership prompt"
                onPress={onDismiss}
                style={[styles.close, { borderColor: palette.border }]}
              >
                <Text style={[styles.closeText, { color: palette.ink }]}>×</Text>
              </Pressable>
            </View>

            <Text accessibilityRole="header" style={[styles.title, { color: palette.ink }]}>
              Keep reading with HealthTimes Premium
            </Text>
            <Text style={[styles.body, { color: palette.inkMuted }]}>
              Become a Premium member for full access to member journalism and other supported Premium features.
            </Text>

            <View style={styles.benefits}>
              <Text style={[styles.benefit, { color: palette.ink }]}>• Member journalism and investigations</Text>
              <Text style={[styles.benefit, { color: palette.ink }]}>• Supported reading, audio and saved-story features</Text>
              <Text style={[styles.benefit, { color: palette.ink }]}>• Existing members can sign in to restore access</Text>
            </View>

            <View style={styles.actions}>
              <Pressable
                testID="premium-prompt-primary"
                accessibilityRole="button"
                accessibilityLabel={commerceAvailable ? "Become Premium" : "Explore Premium"}
                onPress={onPrimary}
                style={[styles.primary, { backgroundColor: palette.blue }]}
              >
                <Text style={[styles.primaryText, { color: palette.paper }]}>
                  {commerceAvailable ? "Become Premium" : "Explore Premium"}
                </Text>
              </Pressable>
              <Pressable
                testID="premium-prompt-sign-in"
                accessibilityRole="button"
                accessibilityLabel="Member sign in"
                onPress={onSignIn}
                style={[styles.secondary, { borderColor: palette.border }]}
              >
                <Text style={[styles.secondaryText, { color: palette.ink }]}>Member sign in</Text>
              </Pressable>
              <Pressable
                testID="premium-prompt-not-now"
                accessibilityRole="button"
                accessibilityLabel="Not now"
                onPress={onDismiss}
                style={styles.notNow}
              >
                <Text style={[styles.notNowText, { color: palette.inkMuted }]}>Not now</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(5, 15, 25, 0.62)",
    paddingHorizontal: spacing.lg
  },
  backdropPhone: {
    justifyContent: "flex-end",
    paddingHorizontal: 0
  },
  backdropCentered: {
    alignItems: "center",
    justifyContent: "center"
  },
  card: {
    width: "100%",
    borderWidth: 1,
    borderTopWidth: 3,
    borderTopColor: colors.premium,
    overflow: "hidden"
  },
  cardPhone: {
    maxHeight: "88%",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.lg
  },
  cardDesktop: {
    maxWidth: 600,
    maxHeight: "82%",
    borderRadius: radius.lg
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  mark: {
    color: colors.premium,
    fontSize: 18,
    fontWeight: "900"
  },
  identity: {
    color: colors.premium,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2
  },
  close: {
    minWidth: layout.touchMin,
    minHeight: layout.touchMin,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: radius.sm
  },
  closeText: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: "700"
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -0.5
  },
  body: {
    fontSize: 15,
    lineHeight: 23
  },
  benefits: {
    gap: spacing.sm
  },
  benefit: {
    fontSize: 14,
    lineHeight: 21
  },
  actions: {
    gap: spacing.sm
  },
  primary: {
    minHeight: layout.touchMin,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm
  },
  primaryText: {
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
    fontWeight: "900"
  },
  notNow: {
    minHeight: layout.touchMin,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg
  },
  notNowText: {
    fontWeight: "800"
  }
});