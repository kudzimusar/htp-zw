import { useCallback, useRef } from "react";
import type { PropsWithChildren, ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { breakpoints, colors, layout, radius, spacing, type } from "../theme/tokens";
import { environmentSummary } from "../platform/config";

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
    <View style={styles.page}>
      <EnvironmentBanner />
      <AppHeader title={title} />
      <ContentWidth>{children}</ContentWidth>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
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
  return (
    <View style={styles.environment}>
      <Text style={styles.environmentText}>{environmentSummary()}</Text>
    </View>
  );
}

export function AppHeader({ title }: { title?: string }) {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const desktop = width >= breakpoints.desktop;
  const go = (path: string) => router.push(path as never);

  return (
    <View style={styles.header}>
      <Pressable onPress={() => go("/")} style={styles.brandButton} accessibilityRole="button">
        <Text style={styles.brand}>HealthTimes</Text>
        <Text style={styles.edition}>Global</Text>
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
            <Pressable key={path} onPress={() => go(path)} style={styles.desktopNavItem}>
              <Text style={styles.desktopNavText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.headerActions}>
        <Pressable onPress={() => go("/search")} style={styles.actionButton} accessibilityLabel="Search HealthTimes">
          <Text style={styles.actionText}>Search</Text>
        </Pressable>
        <Pressable onPress={() => go("/notifications")} style={styles.actionButton} accessibilityLabel="Notifications">
          <Text style={styles.actionText}>Alerts</Text>
        </Pressable>
      </View>
      {!!title && !desktop && <Text style={styles.mobileTitle}>{title}</Text>}
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
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!action && (
        <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Section({ children }: PropsWithChildren) {
  return <View style={styles.section}>{children}</View>;
}

export function Chip({ children, active = false, onPress }: PropsWithChildren<{ active?: boolean; onPress?: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{children}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action}
    </View>
  );
}

export function LoadingBlock({ label = "Loading HealthTimes…" }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <View style={styles.skeletonWide} />
      <View style={styles.skeletonMid} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.paper},
  scrollContent:{flexGrow:1,backgroundColor:colors.paper},
  page:{flex:1,backgroundColor:colors.paper},
  content:{width:"100%",alignSelf:"center"},
  environment:{backgroundColor:colors.navy,paddingVertical:6,paddingHorizontal:12},
  environmentText:{color:"#FFFFFF",fontSize:10,fontWeight:"800",textAlign:"center",letterSpacing:0.7},
  header:{minHeight:72,borderBottomWidth:1,borderBottomColor:colors.border,flexDirection:"row",alignItems:"center",paddingHorizontal:layout.mobileGutter,gap:spacing.md,backgroundColor:colors.paper,flexWrap:"wrap"},
  brandButton:{minHeight:layout.touchMin,justifyContent:"center"},
  brand:{fontSize:type.brand,fontWeight:"900",color:colors.ink,letterSpacing:-0.7},
  edition:{fontSize:11,color:colors.blue,fontWeight:"800",textTransform:"uppercase",letterSpacing:0.8},
  desktopNav:{flex:1,flexDirection:"row",justifyContent:"center",gap:spacing.sm},
  desktopNavItem:{minHeight:layout.touchMin,justifyContent:"center",paddingHorizontal:spacing.md},
  desktopNavText:{fontSize:14,fontWeight:"700",color:colors.ink},
  headerActions:{marginLeft:"auto",flexDirection:"row",gap:spacing.sm},
  actionButton:{minHeight:layout.touchMin,justifyContent:"center",paddingHorizontal:spacing.md,borderWidth:1,borderColor:colors.border,borderRadius:radius.sm},
  actionText:{fontSize:13,fontWeight:"800",color:colors.ink},
  mobileTitle:{width:"100%",fontSize:type.screen,fontWeight:"900",color:colors.ink,paddingBottom:spacing.md},
  section:{marginTop:spacing.section},
  sectionHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:spacing.lg,gap:spacing.md},
  sectionTitle:{fontSize:23,fontWeight:"900",color:colors.ink,letterSpacing:-0.4},
  sectionAction:{minHeight:layout.touchMin,justifyContent:"center"},
  sectionActionText:{fontSize:13,fontWeight:"800",color:colors.blue},
  chip:{borderWidth:1,borderColor:colors.border,borderRadius:radius.sm,minHeight:36,paddingHorizontal:12,justifyContent:"center",backgroundColor:colors.paper},
  chipActive:{backgroundColor:colors.ink,borderColor:colors.ink},
  chipText:{fontSize:13,fontWeight:"700",color:colors.ink},
  chipTextActive:{color:"#FFFFFF"},
  empty:{borderTopWidth:1,borderBottomWidth:1,borderColor:colors.border,paddingVertical:spacing.xxl,gap:spacing.sm},
  emptyTitle:{fontSize:20,fontWeight:"900",color:colors.ink},
  emptyMessage:{fontSize:15,lineHeight:22,color:colors.inkMuted,maxWidth:620},
  loading:{paddingVertical:spacing.xxl,gap:spacing.sm},
  skeletonWide:{height:18,width:"90%",backgroundColor:colors.paperMuted,borderRadius:radius.sm},
  skeletonMid:{height:18,width:"60%",backgroundColor:colors.paperMuted,borderRadius:radius.sm},
  loadingText:{fontSize:13,color:colors.inkMuted}
});
