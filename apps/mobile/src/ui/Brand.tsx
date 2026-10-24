import Constants from "expo-constants";
import { Image, Platform, StyleSheet, Text, View } from "react-native";

const configuredBaseUrl =
  ((Constants.expoConfig?.experiments as { baseUrl?: string } | undefined)?.baseUrl ?? "")
    .trim()
    .replace(/\/+$/, "");
const logoUri = configuredBaseUrl + "/healthtimes-icon.svg";

export function HealthTimesBrand({
  compact = false,
  inverse = false,
  studio = false
}: {
  compact?: boolean;
  inverse?: boolean;
  studio?: boolean;
}) {
  const markSize = compact ? 24 : 30;
  return (
    <View style={styles.row}>
      {Platform.OS === "web" && (
        <Image
          source={{ uri: logoUri }}
          style={{ width: markSize, height: markSize }}
          resizeMode="contain"
          accessible
          accessibilityLabel="HealthTimes logo"
        />
      )}
      <View style={styles.copy}>
        <Text style={[styles.name, compact && styles.nameCompact, inverse && styles.nameInverse]}>HealthTimes</Text>
        {studio && <Text style={[styles.studio, inverse && styles.studioInverse]}>STUDIO</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  copy: { justifyContent: "center" },
  name: { fontSize: 22, fontWeight: "900", letterSpacing: -0.6, color: "#102A43" },
  nameCompact: { fontSize: 20 },
  nameInverse: { color: "#FFFFFF" },
  studio: { marginTop: 1, fontSize: 8, fontWeight: "900", letterSpacing: 1.2, color: "#486581" },
  studioInverse: { color: "#70D1D1" }
});
