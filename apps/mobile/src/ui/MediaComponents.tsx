import { useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { AudioItem, LiveItem, VideoItem } from "../domain/models";
import { breakpoints, radius, spacing } from "../theme/tokens";
import { useAppearance } from "../theme/AppearanceProvider";

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return minutes + ":" + String(remaining).padStart(2, "0");
}

function verifiedVideoDestination(item: VideoItem) {
  const value = item.sourceUrl?.trim();
  if (!value || !/^https:\/\//i.test(value) || /^https:\/\/(?:www\.)?healthtimes\.co\.zw\/?$/i.test(value)) return null;
  const unresolved = (item.sourceProvenance?.exceptions ?? []).some(
    (exception) => exception.classification === "requires-review" && exception.field === "sourceUrl"
  );
  return unresolved ? null : value;
}

function isYouTubeDestination(value: string | null) {
  return Boolean(value && /^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(value));
}

function videoActionLabel(destination: string | null) {
  if (!destination) return "Video unavailable";
  return isYouTubeDestination(destination) ? "Watch on YouTube ↗" : "Watch video ↗";
}

function videoAccessibilityLabel(item: VideoItem, destination: string | null) {
  if (!destination) return item.title + " video unavailable";
  return isYouTubeDestination(destination) ? "Watch " + item.title + " on YouTube" : "Watch " + item.title;
}

function renderableVideoThumbnail(item: VideoItem) {
  const value = item.thumbnail?.publicUrl?.trim() ?? "";
  if (!value) return null;
  if (/^https:\/\/img\.youtube\.com\//i.test(value)) return null;
  return value;
}

/**
 * Screen 5: Dedicated featured card for live reporting.
 */
export function LiveFeaturedCard({ item }: { item: LiveItem }) {
  const { palette } = useAppearance();
  const { width } = useWindowDimensions();
  const desktop = width >= breakpoints.desktop;
  const updated = item.updatedAt ? new Date(item.updatedAt).toLocaleString() : null;

  return (
    <View style={[styles.liveFeatured, desktop && styles.liveFeaturedDesktop, { borderColor: palette.border, backgroundColor: palette.paper }]}>
      {item.media?.publicUrl ? (
        <Image
          source={{ uri: item.media.publicUrl }}
          style={[styles.liveFeaturedMedia, desktop && styles.liveFeaturedMediaDesktop, { backgroundColor: palette.paperMuted }]}
          accessibilityLabel={item.media.altText ?? item.title}
        />
      ) : (
        <View style={[styles.liveFeaturedFallback, desktop && styles.liveFeaturedMediaDesktop, { backgroundColor: palette.navy }]}>
          <Text style={styles.fallbackBrand}>HealthTimes</Text>
          <Text style={[styles.fallbackLabel, { color: item.status === "live" ? palette.live : "#8EC8FF" }]}>
            {item.status === "live" ? "LIVE" : "SCHEDULED"}
          </Text>
          <Text style={styles.fallbackNote}>HealthTimes live coverage</Text>
        </View>
      )}
      <View style={[styles.liveFeaturedBody, desktop && styles.liveFeaturedBodyDesktop]}>
        <Text style={[styles.liveBadge, { backgroundColor: item.status === "live" ? palette.live : palette.inkMuted }]}>
          {item.status === "live" ? "LIVE" : "UPCOMING"}
        </Text>
        <Text style={[styles.liveFeaturedTitle, desktop && styles.liveFeaturedTitleDesktop, { color: palette.ink }]}>{item.title}</Text>
        {(item.updateCount || updated) ? (
          <Text style={[styles.meta, { color: palette.inkMuted }]}>
            {item.updateCount ? item.updateCount + " updates" : ""}
            {item.updateCount && updated ? " · " : ""}
            {updated ? "Updated " + updated : ""}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Screen 5: Compact row item for secondary live coverage.
 */
export function LiveRowItem({ item }: { item: LiveItem }) {
  const { palette } = useAppearance();
  return (
    <View style={[styles.liveRow, { borderBottomColor: palette.border }]}>
      <View style={[styles.liveRowThumb, { backgroundColor: palette.paperMuted }]}>
        {item.media?.publicUrl ? (
          <Image source={{ uri: item.media.publicUrl }} style={styles.liveRowImage} accessibilityLabel={item.media.altText ?? item.title} />
        ) : (
          <View style={[styles.liveRowFallback, { backgroundColor: palette.navy }]}>
            <Text style={[styles.liveRowFallbackText, { color: palette.live }]}>LIVE</Text>
          </View>
        )}
      </View>
      <View style={styles.liveRowCopy}>
        <Text style={[styles.liveBadgeSmall, { backgroundColor: item.status === "live" ? palette.live : palette.inkMuted }]}>
          {item.status === "live" ? "LIVE" : "UPCOMING"}
        </Text>
        <Text numberOfLines={2} style={[styles.liveRowTitle, { color: palette.ink }]}>{item.title}</Text>
        <Text style={[styles.meta, { color: palette.inkMuted }]}>
          {item.updateCount ? item.updateCount + " updates" : "HealthTimes Live"}
        </Text>
      </View>
    </View>
  );
}

/**
 * Screen 6: Compact horizontal row for video feeds.
 */
export function WatchVideoRow({ item }: { item: VideoItem }) {
  const { palette } = useAppearance();
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const destination = verifiedVideoDestination(item);
  const duration = formatDuration(item.durationSeconds);
  const thumbnailUrl = renderableVideoThumbnail(item);
  const showThumbnail = Boolean(thumbnailUrl) && !thumbnailFailed;

  return (
    <Pressable
      style={[styles.watchRow, { borderBottomColor: palette.border }]}
      disabled={!destination}
      accessibilityRole={destination ? "link" : undefined}
      accessibilityState={{ disabled: !destination }}
      accessibilityLabel={videoAccessibilityLabel(item, destination)}
      accessibilityHint={destination ? "Opens the published video destination" : undefined}
      onPress={destination ? () => { void Linking.openURL(destination); } : undefined}
    >
      <View style={[styles.watchRowThumb, { backgroundColor: palette.paperMuted }]}>
        {showThumbnail && thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.watchRowImage}
            accessibilityLabel={item.thumbnail?.altText ?? item.title}
            onError={() => setThumbnailFailed(true)}
          />
        ) : (
          <View style={[styles.watchRowFallback, { backgroundColor: palette.navy }]}>
            <Text style={styles.watchRowFallbackBrand}>HT</Text>
          </View>
        )}
        {destination && (
          <View style={styles.watchRowPlayBadge}>
            <Text style={styles.watchRowPlayText}>▶</Text>
          </View>
        )}
        {!!duration && (
          <View style={styles.watchRowDuration}>
            <Text style={styles.watchRowDurationText}>{duration}</Text>
          </View>
        )}
      </View>
      <View style={styles.watchRowCopy}>
        <Text numberOfLines={2} style={[styles.watchRowTitle, { color: palette.ink }]}>{item.title}</Text>
        <View style={styles.watchRowMetaRow}>
          {!!item.publishedAt && <Text style={[styles.meta, { color: palette.inkMuted }]}>{formatDate(item.publishedAt)}</Text>}
          <Text style={[styles.watchRowAction, { color: destination ? palette.blue : palette.inkMuted }]}>{videoActionLabel(destination)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Screen 7: High-fidelity audio player preview surface.
 */
export function ListenPlayerSurface({ item }: { item: AudioItem }) {
  const { palette } = useAppearance();
  const { width } = useWindowDimensions();
  const desktop = width >= breakpoints.desktop;
  const dateStr = formatDate(item.publishedAt);
  const minutes = item.durationSeconds ? Math.round(item.durationSeconds / 60) : null;

  return (
    <View
      style={[styles.listenSurface, { backgroundColor: palette.navy }]}
      accessibilityLabel={item.title + ". Audio playback unavailable."}
    >
      <View style={styles.listenSurfaceHeader}>
        <Text style={styles.listenSurfaceLabel}>FEATURED AUDIO</Text>
        <View style={styles.listenWaveIcon}>
          <View style={[styles.waveBar, { height: 12 }]} />
          <View style={[styles.waveBar, { height: 20 }]} />
          <View style={[styles.waveBar, { height: 16 }]} />
          <View style={[styles.waveBar, { height: 8 }]} />
        </View>
      </View>
      <Text style={[styles.listenSurfaceTitle, desktop && styles.listenSurfaceTitleDesktop]}>{item.title}</Text>
      {(minutes || dateStr) ? (
        <Text style={styles.listenSurfaceMeta}>
          {minutes ? minutes + " min" : ""}
          {minutes && dateStr ? " · " : ""}
          {dateStr}
        </Text>
      ) : null}
      <View style={styles.unavailableBadge}>
        <Text style={styles.unavailableBadgeText}>Playback unavailable</Text>
      </View>
    </View>
  );
}

/**
 * Screen 7: Audio item row with fail-closed playback indicator.
 */
export function ListenAudioRow({ item }: { item: AudioItem }) {
  const { palette } = useAppearance();
  const minutes = item.durationSeconds ? Math.round(item.durationSeconds / 60) : null;

  return (
    <View
      style={[styles.audioRow, { borderBottomColor: palette.border }]}
      accessibilityLabel={item.title + ". Audio playback unavailable."}
    >
      <View style={[styles.audioRowBadge, { borderColor: palette.border, backgroundColor: palette.paperMuted }]}>
        <Text style={[styles.audioRowBadgeText, { color: palette.inkMuted }]}>AUDIO</Text>
      </View>
      <View style={styles.audioRowCopy}>
        <Text style={[styles.audioRowTitle, { color: palette.ink }]}>{item.title}</Text>
        {(minutes || item.publishedAt) ? (
          <Text style={[styles.meta, { color: palette.inkMuted }]}>
            {minutes ? minutes + " min" : ""}
            {minutes && item.publishedAt ? " · " : ""}
            {item.publishedAt ? formatDate(item.publishedAt) : ""}
          </Text>
        ) : null}
        <Text style={[styles.audioRowUnavailable, { color: palette.inkMuted }]}>Playback unavailable</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  liveFeatured: { borderWidth: 1, borderRadius: radius.md, overflow: "hidden" },
  liveFeaturedDesktop: { flexDirection: "row", alignItems: "stretch" },
  liveFeaturedMedia: { width: "100%", aspectRatio: 16 / 9 },
  liveFeaturedMediaDesktop: { width: "58%" },
  liveFeaturedFallback: { width: "100%", aspectRatio: 16 / 9, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: 4 },
  liveFeaturedBody: { padding: spacing.xl, gap: spacing.sm },
  liveFeaturedBodyDesktop: { flex: 1, justifyContent: "center" },
  liveFeaturedTitle: { fontSize: 26, lineHeight: 32, fontWeight: "900", letterSpacing: -0.5, maxWidth: 900 },
  liveFeaturedTitleDesktop: { fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  liveBadge: { alignSelf: "flex-start", color: "#FFFFFF", fontSize: 10, fontWeight: "900", letterSpacing: 1, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 4 },
  liveBadgeSmall: { alignSelf: "flex-start", color: "#FFFFFF", fontSize: 9, fontWeight: "900", letterSpacing: 0.8, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 3, marginBottom: 2 },
  liveRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1 },
  liveRowThumb: { width: 104, height: 68, borderRadius: radius.sm, overflow: "hidden" },
  liveRowImage: { width: "100%", height: "100%" },
  liveRowFallback: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  liveRowFallbackText: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  liveRowCopy: { flex: 1, gap: 2 },
  liveRowTitle: { fontSize: 15, fontWeight: "900", lineHeight: 20 },
  watchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1 },
  watchRowThumb: { width: 120, height: 72, borderRadius: radius.sm, overflow: "hidden", position: "relative" },
  watchRowImage: { width: "100%", height: "100%" },
  watchRowFallback: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  watchRowFallbackBrand: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  watchRowPlayBadge: { position: "absolute", top: "50%", left: "50%", marginTop: -14, marginLeft: -14, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(7,26,43,0.86)", alignItems: "center", justifyContent: "center" },
  watchRowPlayText: { color: "#FFFFFF", fontSize: 11 },
  watchRowDuration: { position: "absolute", right: 4, bottom: 4, backgroundColor: "rgba(7,26,43,0.88)", paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3 },
  watchRowDurationText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },
  watchRowCopy: { flex: 1, gap: 2 },
  watchRowTitle: { fontSize: 15, fontWeight: "900", lineHeight: 20 },
  watchRowMetaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap", marginTop: 2 },
  watchRowAction: { fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },
  listenSurface: { padding: spacing.xl, borderRadius: radius.md, gap: spacing.md },
  listenSurfaceHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  listenSurfaceLabel: { fontSize: 10, fontWeight: "900", color: "#8EC8FF", letterSpacing: 1.2 },
  listenWaveIcon: { flexDirection: "row", alignItems: "center", gap: 3 },
  waveBar: { width: 3, backgroundColor: "#8EC8FF", borderRadius: 1.5 },
  listenSurfaceTitle: { fontSize: 26, lineHeight: 32, fontWeight: "900", color: "#FFFFFF", maxWidth: 780 },
  listenSurfaceTitleDesktop: { fontSize: 30, lineHeight: 36 },
  listenSurfaceMeta: { fontSize: 13, lineHeight: 20, color: "#C9D5E1" },
  unavailableBadge: { alignSelf: "flex-start", minHeight: 36, justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: "#526A80", borderRadius: radius.sm },
  unavailableBadgeText: { fontSize: 11, fontWeight: "900", letterSpacing: 0.5, color: "#C9D5E1" },
  audioRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderBottomWidth: 1, paddingVertical: spacing.lg },
  audioRowBadge: { minWidth: 52, minHeight: 52, borderWidth: 1, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm },
  audioRowBadgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  audioRowCopy: { flex: 1, gap: 3 },
  audioRowTitle: { fontSize: 17, fontWeight: "900", lineHeight: 22 },
  audioRowUnavailable: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  fallbackBrand: { color: "#FFFFFF", fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  fallbackLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  fallbackNote: { color: "#C9D5E1", fontSize: 10, lineHeight: 15, textAlign: "center", maxWidth: 260, marginTop: spacing.sm },
  meta: { fontSize: 12, lineHeight: 18 }
});
