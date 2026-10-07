import { useCallback, useEffect, useRef, useState } from "react";
import type { PropsWithChildren, ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { breakpoints, layout, radius, spacing, type } from "../theme/tokens";
import { environmentSummary } from "../platform/config";
import { useAppearance } from "../theme/AppearanceProvider";
import { services } from "../services";
import { useAsync } from "../hooks/useAsync";

function useHydratedWindowWidth() {
  const { width } = useWindowDimensions();
  const [responsiveReady, setResponsiveReady] = useState(Platform.OS !== "web");

  useEffect(() => {
    if (Platform.OS === "web") setResponsiveReady(true);
  }, []);

  return responsiveReady ? width : 0;
}

export function Page({
  children,
  scroll = true,
  title,
  initialScrollProgress = 0,
  onScrollProgress,
  chrome = true
}: PropsWithChildren<{
  scroll?: boolean;
  title?: string;
  initialScrollProgress?: number;
  onScrollProgress?: (progress: number) => void;
  chrome?: boolean;
}>) {
  const { palette } = useAppearance();
  const width = useHydratedWindowWidth();
  const scrollRef = useRef<ScrollView>(null);
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const restoredRef = useRef(false);
  const mobileTabsVisible = chrome && width < breakpoints.desktop;

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
      {chrome && <AppHeader />}
      <ContentWidth bottomInset={mobileTabsVisible ? 96 : 64}>
        {!!title && (
          <View style={styles.screenHeading}>
            <Text style={[styles.screenTitle, { color: palette.ink }]}>{title}</Text>
          </View>
        )}
        {children}
      </ContentWidth>
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
          keyboardShouldPersistTaps="handled"
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

export function ContentWidth({
  children,
  bottomInset = 64
}: PropsWithChildren<{bottomInset?:number}>) {
  const width = useHydratedWindowWidth();
  const horizontal =
    width >= breakpoints.desktop ? layout.desktopGutter : width >= breakpoints.tablet ? layout.tabletGutter : layout.mobileGutter;
  return (
    <View style={[styles.content, { maxWidth: layout.contentMax, paddingHorizontal: horizontal, paddingBottom: bottomInset }]}>
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

export function AppHeader() {
  const { palette } = useAppearance();
  const width = useHydratedWindowWidth();
  const router = useRouter();
  const pathname = usePathname();
  const phone = width < breakpoints.tablet;
  const narrowPhone = width > 0 && width < 360;
  const desktop = width >= breakpoints.desktop;
  const horizontal =
    width >= breakpoints.desktop ? layout.desktopGutter : width >= breakpoints.tablet ? layout.tabletGutter : layout.mobileGutter;
  const preferences = useAsync(() => services.reader.getPreferences(), []);
  const edition = preferences.data?.primaryEdition?.trim() || "Global";
  const go = (path: string) => router.push(path as never);

  const nav = [
    ["Home", "/"],
    ["Explore", "/explore"],
    ["Live", "/live"],
    ["Watch", "/watch"],
    ["My HealthTimes", "/my"]
  ] as const;

  const isActive = (path: string) => path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(path + "/");

  const actions = (
    <View style={[styles.headerActions, phone && styles.phoneActions]}>
      <Pressable
        onPress={() => go("/search")}
        style={[styles.actionButton, phone && styles.phoneActionButton, { borderColor: palette.border }]}
        accessibilityLabel="Search HealthTimes"
        accessibilityRole="button"
      >
        <Text style={[styles.actionText, phone && styles.phoneActionText, { color: palette.ink }]}>Search</Text>
      </Pressable>
      <Pressable
        onPress={() => go("/notifications")}
        style={[styles.actionButton, phone && styles.phoneActionButton, { borderColor: palette.border }]}
        accessibilityLabel="Notifications"
        accessibilityRole="button"
      >
        <Text style={[styles.actionText, phone && styles.phoneActionText, { color: palette.ink }]}>Alerts</Text>
      </Pressable>
      <Pressable
        onPress={() => go("/premium")}
        style={[styles.actionButton, styles.premiumAction, phone && styles.phoneActionButton, { borderColor: palette.border }]}
        accessibilityLabel="HealthTimes Premium"
        accessibilityRole="button"
      >
        <Text style={[styles.actionText, phone && styles.phoneActionText, { color: palette.blue }]}>Premium</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.header, { borderBottomColor: palette.border, backgroundColor: palette.paper }]}>
      <View style={[styles.headerInner, phone && styles.phoneHeaderInner, narrowPhone && styles.narrowHeaderInner, { maxWidth: layout.contentMax, paddingHorizontal: horizontal }]}>
        <Pressable onPress={() => go("/")} style={styles.brandButton} accessibilityRole="button" accessibilityLabel="HealthTimes Home">
          <Text style={[styles.brand, phone && styles.phoneBrand, narrowPhone && styles.narrowBrand, { color: palette.ink }]}>HealthTimes</Text>
        </Pressable>

        <Pressable
          onPress={() => go("/edition")}
          style={[styles.editionButton, phone && styles.phoneEditionButton, { borderColor: palette.border }]}
          accessibilityRole="button"
          accessibilityLabel={"Edition " + edition + ". Change edition"}
        >
          {phone ? (
            <Text numberOfLines={1} style={[styles.phoneEditionValue, { color: palette.blue }]}>{edition}</Text>
          ) : (
            <>
              <Text style={[styles.editionLabel, { color: palette.inkMuted }]}>EDITION</Text>
              <Text numberOfLines={1} style={[styles.editionValue, { color: palette.blue }]}>{edition}</Text>
            </>
          )}
        </Pressable>

        {desktop && (
          <View style={styles.desktopNav}>
            {nav.map(([label, path]) => (
              <Pressable
                key={path}
                onPress={() => go(path)}
                style={[styles.desktopNavItem, isActive(path) && { borderBottomColor: palette.blue }]}
                accessibilityRole="link"
                accessibilityLabel={label}
                accessibilityState={{ selected: isActive(path) }}
              >
                <Text style={[styles.desktopNavText, { color: isActive(path) ? palette.blue : palette.ink }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {actions}
      </View>
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
  eyebrow
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  eyebrow?: string;
}) {
  const { palette } = useAppearance();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeadingCopy}>
        {!!eyebrow && <Text style={[styles.sectionEyebrow, { color: palette.blue }]}>{eyebrow}</Text>}
        <Text style={[styles.sectionTitle, { color: palette.ink }]}>{title}</Text>
      </View>
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

export function Chip({
  children,
  active = false,
  onPress,
  accessibilityLabel,
  accessibilityHint
}: PropsWithChildren<{
  active?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}>) {
  const { palette } = useAppearance();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: active }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[
        styles.chip,
        focused && styles.chipFocused,
        {
          borderColor: focused ? palette.blue : active ? palette.ink : palette.border,
          backgroundColor: active ? palette.ink : palette.paper
        }
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
    <View
      style={styles.loading}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
    >
      <View accessible={false} style={[styles.skeletonWide, { backgroundColor: palette.paperMuted }]} />
      <View accessible={false} style={[styles.skeletonMid, { backgroundColor: palette.paperMuted }]} />
      <Text accessible={false} style={[styles.loadingText, { color: palette.inkMuted }]}>{label}</Text>
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
  header:{borderBottomWidth:1},
  headerInner:{width:"100%",alignSelf:"center",minHeight:58,flexDirection:"row",alignItems:"center",gap:spacing.sm},
  phoneHeaderInner:{gap:4},
  brandButton:{minHeight:layout.touchMin,justifyContent:"center",flexShrink:0},
  brand:{fontSize:type.brand,fontWeight:"900",letterSpacing:-0.7},
  phoneBrand:{fontSize:21,letterSpacing:-0.6},
  narrowBrand:{fontSize:18,letterSpacing:-0.5},
  editionButton:{minHeight:layout.touchMin,maxWidth:122,justifyContent:"center",borderLeftWidth:1,paddingLeft:spacing.sm,flexShrink:1},
  phoneEditionButton:{maxWidth:52,paddingHorizontal:2,paddingLeft:2,borderLeftWidth:0,alignItems:"center"},
  editionLabel:{fontSize:8,fontWeight:"900",letterSpacing:.8},
  editionValue:{fontSize:11,fontWeight:"900",marginTop:1},
  phoneEditionValue:{fontSize:10,fontWeight:"900"},
  desktopNav:{flex:1,flexDirection:"row",justifyContent:"center",alignSelf:"stretch",gap:spacing.xs},
  desktopNavItem:{minHeight:layout.touchMin,justifyContent:"center",paddingHorizontal:spacing.md,borderBottomWidth:2,borderBottomColor:"transparent"},
  desktopNavText:{fontSize:14,fontWeight:"800"},
  headerActions:{marginLeft:"auto",flexDirection:"row",gap:spacing.xs,flexShrink:0},
  phoneActions:{gap:0},
  narrowHeaderInner:{flexWrap:"wrap",paddingTop:4,paddingBottom:4,gap:2},
  narrowActions:{width:"100%",marginLeft:0,justifyContent:"space-between"},
  actionButton:{minHeight:layout.touchMin,justifyContent:"center",paddingHorizontal:10,borderWidth:1,borderRadius:radius.sm},
  premiumAction:{borderColor:"transparent"},
  phoneActionButton:{paddingHorizontal:4,borderWidth:0,minWidth:44,alignItems:"center"},
  actionText:{fontSize:12,fontWeight:"900"},
  phoneActionText:{fontSize:10},
  screenHeading:{paddingTop:spacing.xl,paddingBottom:spacing.sm},
  screenTitle:{fontSize:type.screen,lineHeight:38,fontWeight:"900",letterSpacing:-0.7},
  section:{marginTop:spacing.section},
  sectionHeader:{flexDirection:"row",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",marginBottom:spacing.lg,gap:spacing.md},
  sectionHeadingCopy:{gap:2,flex:1},
  sectionEyebrow:{fontSize:10,fontWeight:"900",letterSpacing:1.1,textTransform:"uppercase"},
  sectionTitle:{fontSize:23,fontWeight:"900",letterSpacing:-0.4},
  sectionAction:{minHeight:layout.touchMin,justifyContent:"center"},
  sectionActionText:{fontSize:13,fontWeight:"800"},
  chip:{borderWidth:1,borderRadius:radius.sm,minHeight:layout.touchMin,maxWidth:"100%",paddingHorizontal:12,justifyContent:"center"},
  chipFocused:{borderWidth:2},
  chipText:{fontSize:13,fontWeight:"700",flexShrink:1},
  empty:{borderTopWidth:1,borderBottomWidth:1,paddingVertical:spacing.xxl,gap:spacing.sm},
  emptyTitle:{fontSize:20,fontWeight:"900"},
  emptyMessage:{fontSize:15,lineHeight:22,maxWidth:620},
  loading:{paddingVertical:spacing.xxl,gap:spacing.sm},
  skeletonWide:{height:18,width:"90%",borderRadius:radius.sm},
  skeletonMid:{height:18,width:"60%",borderRadius:radius.sm},
  loadingText:{fontSize:13}
});
