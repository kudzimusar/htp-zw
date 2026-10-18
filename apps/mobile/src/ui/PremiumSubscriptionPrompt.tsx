import { useEffect, useState } from "react";
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
  const [closeFocused, setCloseFocused] = useState(false);
  const [primaryFocused, setPrimaryFocused] = useState(false);
  const [signInFocused, setSignInFocused] = useState(false);
  const [notNowFocused, setNotNowFocused] = useState(false);

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
            {
              backgroundColor: palette.paper,
              borderColor: palette.border,
              borderTopColor: palette.premium
            }
          ]}
        >
          {phone && (
            <View accessible={false} style={styles.sheetHandleWrap}>
              <View style={[styles.sheetHandle, { backgroundColor: palette.border }]} />
            </View>
          )}
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.topRow}>
              <View style={styles.identityRow}>
                <Text style={[styles.mark, { color: palette.premium }]}>✦</Text>
                <Text style={[styles.identity, { color: palette.premium }]}>HEALTHTIMES PREMIUM</Text>
              </View>
              <Pressable
                testID="premium-prompt-close"
                accessibilityRole="button"
                accessibilityLabel="Close Premium membership prompt"
                onFocus={() => setCloseFocused(true)}
                onBlur={() => setCloseFocused(false)}
                onPress={onDismiss}
                style={({ pressed }) => [
                  styles.close,
                  closeFocused && styles.actionFocused,
                  {
                    borderColor: closeFocused ? palette.blue : palette.border,
                    backgroundColor: pressed ? palette.paperMuted : "transparent"
                  }
                ]}
              >
                <Text style={[styles.closeText, { color: palette.ink }]}>×</Text>
              </Pressable>
            </View>

            <View style={styles.headingGroup}>
              <Text accessibilityRole="header" style={[styles.title, { color: palette.ink }]}>
                Keep reading with HealthTimes Premium
              </Text>
              <Text style={[styles.body, { color: palette.inkMuted }]}>
                {commerceAvailable
                  ? "Your 20-second article preview has ended. Become a Premium member for full access to member journalism and other supported Premium features."
                  : "Your 20-second article preview has ended. Become a Premium member for full access to member journalism and other supported Premium features, or sign in if you already have member access."}
              </Text>
            </View>

            <View style={[styles.benefits, { backgroundColor: palette.paperMuted, borderColor: palette.border }]}>
              <Text style={[styles.benefit, { color: palette.ink }]}>• Member journalism and investigations</Text>
              <Text style={[styles.benefit, { color: palette.ink }]}>• Supported reading, audio and saved-story features</Text>
              <Text style={[styles.benefit, { color: palette.ink }]}>• Existing members can sign in to restore access</Text>
            </View>

            <View style={styles.actions}>
              <Pressable
                testID="premium-prompt-primary"
                accessibilityRole="button"
                accessibilityLabel={commerceAvailable ? "Become Premium" : "Explore Premium"}
                onFocus={() => setPrimaryFocused(true)}
                onBlur={() => setPrimaryFocused(false)}
                onPress={onPrimary}
                style={({ pressed }) => [
                  styles.primary,
                  primaryFocused && styles.actionFocused,
                  {
                    backgroundColor: palette.blue,
                    borderColor: primaryFocused ? palette.ink : palette.blue,
                    opacity: pressed ? 0.9 : 1
                  }
                ]}
              >
                <Text style={[styles.primaryText, { color: palette.paper }]}>
                  {commerceAvailable ? "Become Premium" : "Explore Premium"}
                </Text>
              </Pressable>
              <Pressable
                testID="premium-prompt-sign-in"
                accessibilityRole="button"
                accessibilityLabel="Member sign in"
                onFocus={() => setSignInFocused(true)}
                onBlur={() => setSignInFocused(false)}
                onPress={onSignIn}
                style={({ pressed }) => [
                  styles.secondary,
                  signInFocused && styles.actionFocused,
                  {
                    borderColor: signInFocused ? palette.blue : palette.border,
                    backgroundColor: pressed ? palette.paperMuted : "transparent"
                  }
                ]}
              >
                <Text style={[styles.secondaryText, { color: palette.ink }]}>Member sign in</Text>
              </Pressable>
              <Pressable
                testID="premium-prompt-not-now"
                accessibilityRole="button"
                accessibilityLabel="Not now"
                onFocus={() => setNotNowFocused(true)}
                onBlur={() => setNotNowFocused(false)}
                onPress={onDismiss}
                style={({ pressed }) => [
                  styles.notNow,
                  notNowFocused && styles.actionFocused,
                  {
                    borderColor: notNowFocused ? palette.blue : "transparent",
                    backgroundColor: pressed ? palette.paperMuted : "transparent"
                  }
                ]}
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
    borderRadius: radius.md
  },
  sheetHandleWrap: {
    alignItems: "center",
    paddingTop: spacing.sm
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 999
  },
  content: {
    padding: spacing.xl,
    gap: spacing.md
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
    gap: spacing.xs
  },
  mark: {
    color: colors.premium,
    fontSize: 16,
    fontWeight: "900"
  },
  identity: {
    color: colors.premium,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1
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
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "700"
  },
  headingGroup: {
    gap: spacing.xs
  },
  title: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "900",
    letterSpacing: -0.4
  },
  body: {
    fontSize: 14,
    lineHeight: 21
  },
  benefits: {
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.xs
  },
  benefit: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600"
  },
  actions: {
    gap: spacing.xs
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
  notNow: {
    minHeight: layout.touchMin,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.sm
  },
  notNowText: {
    fontSize: 13,
    fontWeight: "800"
  },
  actionFocused: {
    borderWidth: 2
  }
});
