import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { services } from "../services";
import { colors, radius, spacing } from "../theme/tokens";

const CANONICAL_OWNER_EMAIL = "kudzimusar@gmail.com";
const CANONICAL_INVITATION_ID = "3c277c48-5319-429f-a2c3-1bf2dbae4c2a";

export function StudioActivate() {
  const router = useRouter();
  const [email] = useState(CANONICAL_OWNER_EMAIL);
  const [invitationToken] = useState(CANONICAL_INVITATION_ID);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const strongEnough = password.length >= 8;
  const passwordsMatch = password === confirmPassword;

  const handleActivate = async () => {
    if (!strongEnough) {
      setStatusMessage("Password must be at least 8 characters.");
      setIsError(true);
      return;
    }
    if (!passwordsMatch) {
      setStatusMessage("Passwords do not match.");
      setIsError(true);
      return;
    }

    setLoading(true);
    setStatusMessage("Verifying authorization and activating credentials...");
    setIsError(false);

    try {
      const result = await services.newsroomStaff.activateOwner(password);
      if (!result.success && result.error) {
        throw new Error(result.error);
      }

      setIsSuccess(true);
      setStatusMessage("Publisher / Owner account activated successfully. Redirecting to Newsroom OS...");
      setTimeout(() => {
        router.replace("/studio" as never);
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setIsError(true);
      setStatusMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>HEALTHTIMES NEWSROOM OS · FIRST OWNER ACTIVATION</Text>
          <Text style={styles.title}>Activate Publisher / Owner Account</Text>
          <Text style={styles.subtitle}>
            Authenticate with Kudzi Musarurwa's pre-provisioned executive credentials.
            This single ceremony locks the initial Publisher/Owner role and unlocks
            unrestricted operational oversight across all 7 newsroom domains.
          </Text>
        </View>

        {/* Security Info */}
        <View style={styles.badgeRow}>
          <View style={[styles.securityBadge, styles.activeBadge]}>
            <Text style={[styles.securityBadgeText, styles.activeBadgeText]}>Role: Publisher / Owner</Text>
          </View>
          <View style={styles.securityBadge}>
            <Text style={styles.securityBadgeText}>Domains: All 7 Newsroom OS Domains</Text>
          </View>
          <View style={styles.securityBadge}>
            <Text style={styles.securityBadgeText}>Environment: HealthTimes Staging</Text>
          </View>
        </View>

        {/* Credentials Form */}
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>AUTHORIZED OWNER EMAIL (CANONICAL BOUND)</Text>
            <View style={styles.disabledInput}>
              <Text style={styles.disabledText}>{email}</Text>
            </View>
            <Text style={styles.helperText}>
              Security bound: only kudzimusar@gmail.com is permitted by staging migration 93.
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>INVITATION TOKEN</Text>
            <View style={styles.disabledInput}>
              <Text style={styles.disabledText}>{invitationToken}</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>SET SECURE PASSWORD (MIN 8 CHARS)</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Enter strong password"
              placeholderTextColor="#627D98"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Repeat password"
              placeholderTextColor="#627D98"
              autoCapitalize="none"
            />
          </View>

          {/* Status Message */}
          {statusMessage && (
            <View style={[styles.statusBox, isError ? styles.statusError : styles.statusSuccess]}>
              <Text style={[styles.statusText, isError ? styles.statusTextError : styles.statusTextSuccess]}>
                {statusMessage}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <Pressable
            style={[styles.activateButton, (!strongEnough || !passwordsMatch || loading) && styles.disabledButton]}
            onPress={handleActivate}
            disabled={!strongEnough || !passwordsMatch || loading || isSuccess}
          >
            {loading ? (
              <ActivityIndicator color="#0D1821" />
            ) : (
              <Text style={styles.activateButtonText}>
                {isSuccess ? "Activated ✓" : "Activate Owner Account →"}
              </Text>
            )}
          </Pressable>

          <View style={styles.footerRow}>
            <Pressable onPress={() => router.push("/studio" as never)}>
              <Text style={styles.footerLink}>Already active? Open Studio →</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/owner-preview/studio" as never)}>
              <Text style={styles.footerLink}>View Owner Preview →</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D1821",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg
  },
  card: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#132332",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#203A4E",
    padding: spacing.xl,
    gap: spacing.lg
  },
  header: {
    gap: 6
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: "#70D1D1"
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF"
  },
  subtitle: {
    fontSize: 13,
    color: "#9FB3C8",
    lineHeight: 18
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  securityBadge: {
    backgroundColor: "#1A364E",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#203A4E"
  },
  securityBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9FB3C8",
    letterSpacing: 0.5
  },
  activeBadge: {
    borderColor: "#70D1D1"
  },
  activeBadgeText: {
    color: "#70D1D1"
  },
  form: {
    gap: spacing.md
  },
  fieldGroup: {
    gap: 4
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9FB3C8",
    letterSpacing: 0.6
  },
  disabledInput: {
    backgroundColor: "#0F1A24",
    borderWidth: 1,
    borderColor: "#203A4E",
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  disabledText: {
    color: "#70D1D1",
    fontSize: 13,
    fontFamily: "monospace"
  },
  helperText: {
    fontSize: 11,
    color: "#627D98"
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#D5DFE8",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#102A43"
  },
  statusBox: {
    padding: 12,
    borderRadius: radius.sm,
    borderWidth: 1
  },
  statusError: {
    backgroundColor: "#FFE3E3",
    borderColor: "#D9383A"
  },
  statusSuccess: {
    backgroundColor: "#E3FCEF",
    borderColor: "#0E8A16"
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16
  },
  statusTextError: {
    color: "#A61B1B"
  },
  statusTextSuccess: {
    color: "#085710"
  },
  activateButton: {
    backgroundColor: "#70D1D1",
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm
  },
  disabledButton: {
    opacity: 0.4
  },
  activateButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0D1821",
    letterSpacing: 0.5
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs
  },
  footerLink: {
    fontSize: 12,
    fontWeight: "700",
    color: "#70D1D1"
  }
});
