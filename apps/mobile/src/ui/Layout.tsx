import { useCallback, useRef } from "react";
import type { PropsWithChildren, ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { breakpoints, layout, radius, spacing, type } from "../theme/tokens";
import { environmentSummary } from "../platform/config";
import { useAppearance } from "../theme/AppearanceProvider";

export function Page({
  children,
  scroll = true,
  title,
  initialScrollProgress = 0,
  onScrollProgress
}: PropsWithChildren<{
  scroll?: boolean;
  title?: string;
  initialScrollProgress?: number;
  onScrollProgress?: (progress: number) => void;
}>) {
  const { palette } = useAppearance();
  const scrollRef = useRef<ScrollView>(null);
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const restoredRef = useRef(false);

  const restorePosition = useCallback(() => {
    if (restoredRef.current || !scroll || initialScrollProgress <= 0) return;
    const maxScroll = Math.max(0, contentHeightRef.current - viewportHeightRef.current);
    if (maxScroll <= 0) return;
    const progress = Math.max(0, Math.min(1, initialScrollProgress));
    restoredRef.current = true;
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: maxScroll * progress, animated: false }));
  }, [initialScrollProgress, scroll]);

  const body = (
    <View style={[styles.page, { backgroundColor: palette.paper }]}>
      <EnvironmentBanner />
      <AppHeader title={title} />
      <ContentWidth>{children}</ContentWidth>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.paper }]} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          style={{ backgroundColor: palette.paper }}
          contentContainerStyle={[styles.scrollContent, { backgroundColor: palette.paper }]}
          scrollEventThrottle={250}
          onLayout={(event) => {
            viewportHeightRef.current = event.nativeEvent.layout.height;
            restorePosition();
          }}
          onContentSizeChange={(_width, height) => {
            contentHeightRef.current = height;
            restorePosition();
          }}
          onScroll={(event) => {
            if (!onScrollProgress) return;
            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            const maxScroll = Math.max(1, contentSize.height - layoutMeasurement.height);
            onScrollProgress(Math.max(0, Math.min(1, contentOffset.y / maxScroll)));
          }}
        >
          {body}
        </ScrollView>
      ) : body}
    </SafeAreaView>
  );
}

export function ContentWidth({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  const horizontal =
    width >= breakpoints.desktop ? layout.desktopGutter : width >= breakpoints.tablet ? layout.tabletGutter : layout.mobileGutter;
  return (
    <View style={[styles.content, { maxWidth: layout.contentMax, paddingHorizontal: horizontal }]}>
      {children}
    </View>
  );
}

export function EnvironmentBanner() {
  const { palette } = useAppearance();
  return (
    <View style={[styles.environment, { backgroundColor: palette.navy }]}>
      <Text style={styles.environmentText}>{environmentSummary()}</Text>
    </View>
  );
}

export function AppHeader({ title }: { title?: string }) {
  const { palette } = useAppearance();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const desktop = width >= breakpoints.desktop;
  const go = (path: string) => router.push(path as never);

  return (
    <View style={[styles.header, { borderBottomColor: palette.border, backgroundColor: palette.paper }]}>
      <Pressable onPress={() => go("/")} style={styles.brandButton} accessibilityRole="button">
        <Text style={[styles.brand, { color: palette.ink }]}>HealthTimes</Text>
        <Text style={[styles.edition, { color: palette.blue }]}>Global</Text>
      </Pressable>

      {desktop && (
        <View style={styles.desktopNav}>
          {([
            ["Home", "/"],
            ["Explore", "/explore"],
            ["Live", "/live"],
            ["Watch", "/watch"],
            ["My HealthTimes", "/my"]
          ] as const).map(([label, path]) => (
            <Pressable
              key={path}
              onPress={() => go(path)}
              style={styles.desktopNavItem}
              accessibilityRole="link"
              accessibilityLabel={label}
            >
              <Text style={[styles.desktopNavText, { color: palette.ink }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.headerActions}>
        <Pressable
          onPress={() => go("/search")}
          style={[styles.actionButton, { borderColor: palette.border }]}
          accessibilityLabel="Search HealthTimes"
          accessibilityRole="button"
        >
          <Text style={[styles.actionText, { color: palette.ink }]}>Search</Text>
        </Pressable>
        <Pressable
          onPress={() => go("/notifications")}
          style={[styles.actionButton, { borderColor: palette.border }]}
          accessibilityLabel="Notifications"
          accessibilityRole="button"
        >
          <Text style={[styles.actionText, { color: palette.ink }]}>Alerts</Text>
        </Pressable>
      </View>
      {!!title && !desktop && <Text style={[styles.mobileTitle, { color: palette.ink }]}>{title}</Text>}
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  onAction
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { palette } = useAppearance();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: palette.ink }]}>{title}</Text>
      {!!action && (
        <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction} style={styles.sectionAction}>
          <Text style={[styles.sectionActionText, { color: palette.blue }]}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Section({ children }: PropsWithChildren) {
  return <View style={styles.section}>{children}</View>;
}

export function Chip({ children, active = false, onPress }: PropsWithChildren<{ active?: boolean; onPress?: () => void }>) {
  const { palette } = useAppearance();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: active ? palette.ink : palette.border, backgroundColor: active ? palette.ink : palette.paper }
      ]}
    >
      <Text style={[styles.chipText, { color: active ? palette.paper : palette.ink }]}>{children}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  const { palette } = useAppearance();
  return (
    <View style={[styles.empty, { borderColor: palette.border }]}>
      <Text style={[styles.emptyTitle, { color: palette.ink }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: palette.inkMuted }]}>{message}</Text>
      {action}
    </View>
  );
}

export function LoadingBlock({ label = "Loading HealthTimes…" }: { label?: string }) {
  const { palette } = useAppearance();
  return (
    <View style={styles.loading} accessibilityLiveRegion="polite">
      <View style={[styles.skeletonWide, { backgroundColor: palette.paperMuted }]} />
      <View style={[styles.skeletonMid, { backgroundColor: palette.paperMuted }]} />
      <Text style={[styles.loadingText, { color: palette.inkMuted }]}>{label}</Text>
    </View>
  );
}

const styles=StyleSheet.create({
  safe:{flex:1},
  scrollContent:{flexGrow:1},
  page:{flex:1},
  content:{width:"100%",alignSelf:"center"},
  environment:{paddingVertical:6,paddingHorizontal:12},
  environmentText:{color:"#FFFFFF",fontSize:10,fontWeight:"800",textAlign:"center",letterSpacing:0.7},
  header:{minHeight:72,borderBottomWidth:1,flexDirection:"row",alignItems:"center",paddingHorizontal:layout.mobileGutter,gap:spacing.md,flexWrap:"wrap"},
  brandButton:{minHeight:layout.touchMin,justifyContent:"center"},
  brand:{fontSize:type.brand,fontWeight:"900",letterSpacing:-0.7},
  edition:{fontSize:11,fontWeight:"800",textTransform:"uppercase",letterSpacing:0.8},
  desktopNav:{flex:1,flexDirection:"row",justifyContent:"center",gap:spacing.sm},
  desktopNavItem:{minHeight:layout.touchMin,justifyContent:"center",paddingHorizontal:spacing.md},
  desktopNavText:{fontSize:14,fontWeight:"700"},
  headerActions:{marginLeft:"auto",flexDirection:"row",gap:spacing.sm},
  actionButton:{minHeight:layout.touchMin,justifyContent:"center",paddingHorizontal:spacing.md,borderWidth:1,borderRadius:radius.sm},
  actionText:{fontSize:13,fontWeight:"800"},
  mobileTitle:{width:"100%",fontSize:type.screen,fontWeight:"900",paddingBottom:spacing.md},
  section:{marginTop:spacing.section},
  sectionHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:spacing.lg,gap:spacing.md},
  sectionTitle:{fontSize:23,fontWeight:"900",letterSpacing:-0.4},
  sectionAction:{minHeight:layout.touchMin,justifyContent:"center"},
  sectionActionText:{fontSize:13,fontWeight:"800"},
  chip:{borderWidth:1,borderRadius:radius.sm,minHeight:layout.touchMin,paddingHorizontal:12,justifyContent:"center"},
  chipText:{fontSize:13,fontWeight:"700"},
  empty:{borderTopWidth:1,borderBottomWidth:1,paddingVertical:spacing.xxl,gap:spacing.sm},
  emptyTitle:{fontSize:20,fontWeight:"900"},
  emptyMessage:{fontSize:15,lineHeight:22,maxWidth:620},
  loading:{paddingVertical:spacing.xxl,gap:spacing.sm},
  skeletonWide:{height:18,width:"90%",borderRadius:radius.sm},
  skeletonMid:{height:18,width:"60%",borderRadius:radius.sm},
  loadingText:{fontSize:13}
});
