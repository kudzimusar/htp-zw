import { useEffect, useMemo, useState } from "react";
import Head from "expo-router/head";
import { Link, usePathname } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { ArticleReader } from "./article/[id]";
import { Page, Section, SectionHeader } from "../src/ui/Layout";
import { colors, radius, spacing } from "../src/theme/tokens";
import {
  fetchPublicWebCapability,
  injectedPublicWebCapability,
  storyFromPublicCapability,
  type PublicWebCapability,
  type PublicWebContextCapability,
  type PublicWebStoryCapability
} from "../src/services/public-web";

function CapabilityHead({ capability }: { capability: PublicWebStoryCapability | PublicWebContextCapability }) {
  const seo = capability.seo;
  const description = capability.kind === "story" ? capability.seo.description : undefined;
  const openGraph = seo.openGraph;
  return (
    <Head>
      <title>{seo.title}</title>
      {!!description && <meta name="description" content={description} />}
      <meta name="robots" content={seo.robots} />
      <link rel="canonical" href={seo.canonicalUrl} />
      <meta property="og:type" content={openGraph.type} />
      <meta property="og:site_name" content={openGraph.siteName} />
      <meta property="og:title" content={openGraph.title} />
      {"description" in openGraph && !!openGraph.description && <meta property="og:description" content={openGraph.description} />}
      <meta property="og:url" content={openGraph.url} />
      {"image" in openGraph && !!openGraph.image && <meta property="og:image" content={openGraph.image} />}
      <meta name="twitter:card" content={seo.twitterCard} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(seo.structuredData) }} />
    </Head>
  );
}

function ContextScreen({ capability }: { capability: PublicWebContextCapability }) {
  return (
    <Page title={capability.name}>
      <CapabilityHead capability={capability} />
      <Section>
        <SectionHeader title="Coverage archive" />
        <Text style={styles.copy}>
          Explore HealthTimes reporting connected to {capability.name}. Use Explore or Search to continue through the Reader.
        </Text>
        <View style={styles.links}>
          <Link href="/explore" style={styles.link}>Explore coverage</Link>
          <Link href="/search" style={styles.link}>Search HealthTimes</Link>
        </View>
      </Section>
    </Page>
  );
}

function MissingScreen() {
  return (
    <Page title="Page not found">
      <Head>
        <title>Page not found — HealthTimes</title>
        <meta name="robots" content="noindex,follow" />
      </Head>
      <Section>
        <SectionHeader title="This page is not available" />
        <Text style={styles.copy}>No authoritative HealthTimes destination is known for this address.</Text>
        <Link href="/" style={styles.link}>Return to HealthTimes</Link>
      </Section>
    </Page>
  );
}

export default function PublicWebFallback() {
  const pathname = usePathname();
  const injected = useMemo(() => injectedPublicWebCapability(), []);
  const [capability, setCapability] = useState<PublicWebCapability | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let active = true;

    if (injected) {
      setCapability(injected);
      setResolved(true);
      return () => { active = false; };
    }

    void fetchPublicWebCapability(pathname).then(value => {
      if (!active) return;
      setCapability(value);
      setResolved(true);
    });
    return () => { active = false; };
  }, [injected, pathname]);

  if (!resolved) {
    return <Page><Text style={styles.copy}>Loading HealthTimes…</Text></Page>;
  }

  if (capability?.kind === "story") {
    return (
      <>
        <CapabilityHead capability={capability} />
        <ArticleReader initialStory={storyFromPublicCapability(capability)} />
      </>
    );
  }

  if (capability?.kind === "context") {
    return <ContextScreen capability={capability} />;
  }

  return <MissingScreen />;
}

const styles = StyleSheet.create({
  copy: { fontSize: 16, lineHeight: 25, color: colors.inkMuted, maxWidth: 720 },
  links: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.lg },
  link: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.blue,
    fontWeight: "800"
  }
});
