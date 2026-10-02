import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(path)=>readFileSync(join(root,path),"utf8");

test("Phase 4 Live keeps service authority and removes product-explanatory copy",()=>{
  const live=read("app/(reader)/live.tsx");
  assert.match(live,/services\.live\.list/);
  assert.match(live,/No live coverage right now/);
  assert.match(live,/Live Now/);
  assert.match(live,/Live Blog/);
  assert.match(live,/Upcoming/);
  assert.match(live,/AdSlot placement="live_feed"/);
  assert.doesNotMatch(live,/Live is a first-class format/);
  assert.doesNotMatch(live,/Viewer and audience figures appear only/);
  assert.doesNotMatch(live,/<Section><AdSlot placement="live_feed"/);
});

test("Phase 4 Watch exposes only supported discovery and preserves direct verified video destinations",()=>{
  const watch=read("app/(reader)/watch.tsx");
  const cards=read("src/ui/Cards.tsx");
  assert.match(watch,/services\.video\.list/);
  assert.match(watch,/FeaturedVideoCard/);
  assert.match(watch,/Latest videos/);
  assert.match(watch,/Live coverage/);
  assert.match(watch,/AdSlot placement="watch_feed"/);
  assert.doesNotMatch(watch,/Popular/);
  assert.doesNotMatch(watch,/Series/);
  assert.doesNotMatch(watch,/Shorts/);
  assert.doesNotMatch(watch,/<Section><AdSlot placement="watch_feed"/);
  assert.match(cards,/verifiedVideoDestination/);
  assert.match(cards,/isYouTubeDestination/);
  assert.match(cards,/Watch on YouTube/);
  assert.match(cards,/Linking\.openURL/);
  assert.match(cards,/FeaturedVideoCard/);
});

test("Phase 4 Listen never presents non-authoritative audio as playable",()=>{
  const listen=read("app/listen.tsx");
  const cards=read("src/ui/Cards.tsx");
  assert.match(listen,/services\.audio\.list/);
  assert.match(listen,/No audio published yet/);
  assert.match(listen,/Playback unavailable/);
  assert.match(listen,/AudioCard/);
  assert.doesNotMatch(listen,/Play featured audio/);
  assert.doesNotMatch(listen,/progressFill|1×|setStatus/);
  assert.doesNotMatch(listen,/Podcasts|Offline/);
  assert.match(cards,/Audio playback unavailable/);
  assert.match(cards,/audioTypeBadge/);
  assert.doesNotMatch(cards,/audioButton:/);
});

test("Phase 4 exact-head evidence treats all browser errors and overflow as fatal",()=>{
  const workflow=read("../../.github/workflows/ui01-phase4-media.yml");
  assert.match(workflow,/consoleErrors\.length/);
  assert.match(workflow,/pageErrors\.length/);
  assert.match(workflow,/React #418/);
  assert.match(workflow,/horizontalOverflow/);
  assert.match(workflow,/390,844/);
  assert.match(workflow,/834,1112/);
  assert.match(workflow,/1440,1000/);
  assert.match(workflow,/dark-watch/);
  assert.match(workflow,/dark-live/);
  assert.match(workflow,/dark-listen/);
  assert.match(workflow,/NOT AVAILABLE FROM AUTHORITATIVE SOURCE/);
  assert.match(workflow,/phase3-regression-explore/);
  assert.match(workflow,/phase3-regression-search/);
  assert.match(workflow,/phase2-regression-article/);
  assert.match(workflow,/phase2-regression-premium/);
});
