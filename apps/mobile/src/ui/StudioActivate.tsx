import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { services } from "../services";
import { radius, spacing } from "../theme/tokens";
import { HealthTimesBrand } from "./Brand";

const publicClientReview = process.env.EXPO_PUBLIC_HEALTHTIMES_PUBLIC_CLIENT_REVIEW === "1";

export function StudioActivate() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (publicClientReview) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <HealthTimesBrand inverse studio />
          <View style={styles.header}>
            <Text style={styles.eyebrow}>PUBLIC CLIENT REVIEW</Text>
            <Text style={styles.title}>Owner activation is not available in this build</Text>
            <Text style={styles.subtitle}>
              This public Reader/PWA review intentionally excludes private staging activation credentials and Owner authorization ceremony.
            </Text>
          </View>
          <View style={styles.footerRow}>
            <Pressable onPress={() => router.replace("/" as never)}>
              <Text style={styles.footerLink}>Open Reader →</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/owner-preview/studio" as never)}>
              <Text style={styles.footerLink}>Open safe Owner Preview →</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const strongEnough = password.length >= 8;
  const passwordsMatch = password === confirmPassword;
  const validEmail = email.trim().includes("@");

  const handleActivate = async () => {
    if (!validEmail) {
      setStatusMessage("Enter the authorized Owner email.");
      setIsError(true);
      return;
    }
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
    setStatusMessage("Verifying Owner identity with the staging authorization service...");
    setIsError(false);

    try {
      const result = await services.newsroomStaff.activateOwner({
        email: email.trim(),
        password
      });
      if (!result.success && result.error) throw new Error(result.error);
      setIsSuccess(true);
      setStatusMessage("Owner account activated successfully. Redirecting to Studio...");
      setTimeout(() => router.replace("/studio" as never), 1500);
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
        <HealthTimesBrand inverse studio />
        <View style={styles.header}>
          <Text style={styles.eyebrow}>OWNER-CONTROLLED STAGING ACCESS</Text>
          <Text style={styles.title}>Activate Publisher / Owner Access</Text>
          <Text style={styles.subtitle}>
            Enter the Owner identity supplied through the private staging UAT channel. Canonical invitation authority stays on the server and is never embedded in this client.
          </Text>
        </View>

        <View style={styles.badgeRow}>
          <View style={[styles.securityBadge, styles.activeBadge]}>
            <Text style={[styles.securityBadgeText, styles.activeBadgeText]}>Role: Publisher / Owner</Text>
          </View>
          <View style={styles.securityBadge}>
            <Text style={styles.securityBadgeText}>Environment: HealthTimes Staging</Text>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>AUTHORIZED OWNER EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Owner email"
              placeholderTextColor="#627D98"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
            />
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
              autoComplete="new-password"
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
              autoComplete="new-password"
            />
          </View>

          {statusMessage && (
            <View style={[styles.statusBox, isError ? styles.statusError : styles.statusSuccess]}>
              <Text style={[styles.statusText, isError ? styles.statusTextError : styles.statusTextSuccess]}>
                {statusMessage}
              </Text>
            </View>
          )}

          <Pressable
            style={[styles.activateButton, (!validEmail || !strongEnough || !passwordsMatch || loading) && styles.disabledButton]}
            onPress={handleActivate}
            disabled={!validEmail || !strongEnough || !passwordsMatch || loading || isSuccess}
          >
            {loading ? (
              <ActivityIndicator color="#0D1821" />
            ) : (
              <Text style={styles.activateButtonText}>{isSuccess ? "Activated ✓" : "Verify and Activate →"}</Text>
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
  container: { flex: 1, backgroundColor: "#0D1821", justifyContent: "center", alignItems: "center", padding: spacing.lg },
  card: { width: "100%", maxWidth: 560, backgroundColor: "#132332", borderRadius: radius.lg, borderWidth: 1, borderColor: "#203A4E", padding: spacing.xl, gap: spacing.lg },
  header: { gap: 6 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2, color: "#70D1D1" },
  title: { fontSize: 24, fontWeight: "900", color: "#FFFFFF" },
  subtitle: { fontSize: 13, color: "#9FB3C8", lineHeight: 19 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  securityBadge: { backgroundColor: "#1A364E", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: "#203A4E" },
  securityBadgeText: { fontSize: 10, fontWeight: "800", color: "#9FB3C8", letterSpacing: 0.5 },
  activeBadge: { borderColor: "#70D1D1" },
  activeBadgeText: { color: "#70D1D1" },
  form: { gap: spacing.md },
  fieldGroup: { gap: 4 },
  label: { fontSize: 10, fontWeight: "800", color: "#9FB3C8", letterSpacing: 0.6 },
  input: { backgroundColor: "#FFFFFF", borderRadius: radius.sm, borderWidth: 1, borderColor: "#D5DFE8", paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#102A43" },
  statusBox: { padding: 12, borderRadius: radius.sm, borderWidth: 1 },
  statusError: { backgroundColor: "#FFE3E3", borderColor: "#D9383A" },
  statusSuccess: { backgroundColor: "#E3FCEF", borderColor: "#0E8A16" },
  statusText: { fontSize: 12, fontWeight: "600", lineHeight: 16 },
  statusTextError: { color: "#A61B1B" },
  statusTextSuccess: { color: "#085710" },
  activateButton: { backgroundColor: "#70D1D1", borderRadius: radius.sm, paddingVertical: 14, alignItems: "center", justifyContent: "center", marginTop: spacing.sm },
  disabledButton: { opacity: 0.4 },
  activateButtonText: { fontSize: 14, fontWeight: "900", color: "#0D1821", letterSpacing: 0.5 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.xs },
  footerLink: { fontSize: 12, fontWeight: "700", color: "#70D1D1" }
});
