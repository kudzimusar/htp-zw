import Constants from "expo-constants";
import { Image, Platform, StyleSheet, Text, View } from "react-native";
import { useOptionalAppearance } from "../theme/AppearanceProvider";

const configuredBaseUrl =
  ((Constants.expoConfig?.experiments as { baseUrl?: string } | undefined)?.baseUrl ?? "")
    .trim()
    .replace(/\/+$/, "");
const logoUri = configuredBaseUrl + "/healthtimes-icon.svg";

export function HealthTimesBrand({
  compact = false,
  inverse = false,
  studio = false,
  palette: propPalette
}: {
  compact?: boolean;
  inverse?: boolean;
  studio?: boolean;
  palette?: { ink?: string; inkMuted?: string; paper?: string };
}) {
  const appearance = useOptionalAppearance();
  const palette = propPalette ?? appearance?.palette;
  const isDark =
    appearance?.appearance === "dark" ||
    palette?.paper === "#0B1622" ||
    (typeof document !== "undefined" &&
      (document.documentElement.getAttribute("data-theme") === "dark" ||
       document.documentElement.style.getPropertyValue("--ht-paper") === "#0B1622"));
  const markSize = compact ? 24 : 30;
  const defaultInk = isDark ? "#F3F7FA" : "#0B1F33";
  const defaultMuted = isDark ? "#A9B7C5" : "#486581";
  const nameColor = inverse ? "#FFFFFF" : (isDark ? "#F3F7FA" : (palette?.ink ?? defaultInk));
  const studioColor = inverse ? "#70D1D1" : (isDark ? "#A9B7C5" : (palette?.inkMuted ?? defaultMuted));

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
        <Text style={[styles.name, { color: nameColor }, compact && styles.nameCompact]}>HealthTimes</Text>
        {studio && <Text style={[styles.studio, { color: studioColor }]}>STUDIO</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  copy: { justifyContent: "center" },
  name: { fontSize: 22, fontWeight: "900", letterSpacing: -0.6 },
  nameCompact: { fontSize: 20 },
  nameInverse: { color: "#FFFFFF" },
  studio: { marginTop: 1, fontSize: 8, fontWeight: "900", letterSpacing: 1.2 },
  studioInverse: { color: "#70D1D1" }
});
