import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

test("Screen 5 (Live) follows approved wireframe composition, service authority, and red identity", () => {
  assert.equal(existsSync(join(root, "app/(reader)/live.tsx")), true, "Live must live at app/(reader)/live.tsx");
  const live = read("app/(reader)/live.tsx");

  assert.match(live, /services\.live\.list/);
  assert.match(live, /HEALTHTIMES LIVE/);
  assert.match(live, /borderLeftColor:\s*palette\.live/);
  assert.match(live, /Live Now/);
  assert.match(live, /Live Blog/);
  assert.match(live, /Upcoming/);
  assert.match(live, /No live coverage right now/);
  assert.match(live, /LiveRail/);
  assert.match(live, /AdSlot placement="live_feed"/);
  assert.doesNotMatch(live, /<Section><AdSlot placement="live_feed"/);
  assert.doesNotMatch(live, /Live is a first-class format/);
  assert.doesNotMatch(live, /Viewer and audience figures appear only/);
});

test("Screen 6 (Watch) implements TV brand, watch bar, centered play icon, and verified YouTube destinations", () => {
  assert.equal(existsSync(join(root, "app/(reader)/watch.tsx")), true, "Watch must live at app/(reader)/watch.tsx");
  const watch = read("app/(reader)/watch.tsx");
  const cards = read("src/ui/Cards.tsx");

  assert.match(watch, /services\.video\.list/);
  assert.match(watch, /HEALTHTIMES TV/);
  assert.match(watch, /Latest videos/);
  assert.match(watch, /Live coverage/);
  assert.match(watch, /router\.push\("\/live"/);
  assert.match(watch, /FeaturedVideoCard/);
  assert.match(watch, /VideoCard/);
  assert.match(watch, /AdSlot placement="watch_feed"/);
  assert.doesNotMatch(watch, /<Section><AdSlot placement="watch_feed"/);
  assert.doesNotMatch(watch, /Popular/);
  assert.doesNotMatch(watch, /Series/);
  assert.doesNotMatch(watch, /Shorts/);

  // Cards authority for Watch
  assert.match(cards, /verifiedVideoDestination/);
  assert.match(cards, /isYouTubeDestination/);
  assert.match(cards, /renderableVideoThumbnail/);
  assert.match(cards, /img\\.youtube\\.com/);
  assert.match(cards, /Watch on YouTube/);
  assert.match(cards, /Linking\.openURL/);
  assert.match(cards, /featuredPlayBadge/);
  assert.match(cards, /featuredPlayBadge:\{position:"absolute",top:"50%",left:"50%"/);
  assert.match(cards, /playBadge:\{position:"absolute",top:"50%",left:"50%"/);
  assert.match(cards, /duration:\{position:"absolute",right:8,bottom:8/);
});

test("Screen 7 (Listen) preserves fail-closed audio authority without fake playback or podcast discovery", () => {
  assert.equal(existsSync(join(root, "app/listen.tsx")), true, "Listen must live at app/listen.tsx");
  const listen = read("app/listen.tsx");
  const cards = read("src/ui/Cards.tsx");

  assert.match(listen, /services\.audio\.list/);
  assert.match(listen, /HEALTHTIMES AUDIO/);
  assert.match(listen, /No audio published yet/);
  assert.match(listen, /Playback unavailable/);
  assert.match(listen, /AudioCard/);
  assert.doesNotMatch(listen, /Play featured audio/);
  assert.doesNotMatch(listen, /progressFill|1×|setStatus/);
  assert.doesNotMatch(listen, /Podcasts|Offline/);
  assert.doesNotMatch(listen, /certified media playback adapter|later media playback lane|Classification metadata required/);

  // Cards authority for Listen
  assert.match(cards, /Audio playback unavailable/);
  assert.match(cards, /audioTypeBadge/);
  assert.doesNotMatch(cards, /audioButton:/);
});

test("Additive MediaComponents module exports typed wireframe-faithful components", () => {
  assert.equal(existsSync(join(root, "src/ui/MediaComponents.tsx")), true);
  const media = read("src/ui/MediaComponents.tsx");

  assert.match(media, /export function LiveFeaturedCard/);
  assert.match(media, /export function LiveRowItem/);
  assert.match(media, /export function WatchVideoRow/);
  assert.match(media, /export function ListenPlayerSurface/);
  assert.match(media, /export function ListenAudioRow/);
  assert.match(media, /Playback unavailable/);
  assert.match(media, /Watch on YouTube/);
});

test("Upstream frozen routes remain untouched", () => {
  const home = read("app/(reader)/index.tsx");
  const search = read("app/(reader)/search.tsx");
  const article = read("app/article/[id].tsx");

  assert.match(home, /Top Stories/);
  assert.match(home, /LiveRail/);
  assert.match(search, /Intelligent Search/);
  assert.match(article, /PremiumPaywall/);
});
