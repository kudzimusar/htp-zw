import Head from "expo-router/head";
import { usePathname } from "expo-router";
import { Platform } from "react-native";
import { policiesApprovedForLaunch } from "../legal/policy-drafts";
import { SITE_NAME, articleMetadata, routeMetadata } from "./route-metadata";

/** Article head for /article/<id>: canonical points at the preserved public URL. */
export function ArticleSeoHead({ story }: { story: Parameters<typeof articleMetadata>[0] }) {
  if (Platform.OS !== "web") return null;
  const meta = articleMetadata(story);
  return (
    <Head>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      {!!meta.canonicalUrl && <link rel="canonical" href={meta.canonicalUrl} />}
      <meta property="og:type" content="article" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      {!!meta.canonicalUrl && <meta property="og:url" content={meta.canonicalUrl} />}
      {!!meta.image && <meta property="og:image" content={meta.image} />}
      <meta name="twitter:card" content={meta.image ? "summary_large_image" : "summary"} />
    </Head>
  );
}

/** Route-level head tags for the web export; story pages supply their own. */
export function RouteSeoHead() {
  const pathname = usePathname();
  if (Platform.OS !== "web") return null;
  const meta = routeMetadata(pathname, { policiesApproved: policiesApprovedForLaunch() });
  if (!meta) return null;
  return (
    <Head>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta name="robots" content={meta.robots} />
      <link rel="canonical" href={meta.canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={meta.canonicalUrl} />
      <meta name="twitter:card" content="summary" />
    </Head>
  );
}
