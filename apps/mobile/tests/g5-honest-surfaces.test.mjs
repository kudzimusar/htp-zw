// HT-MVP-PUBLIC-LAUNCH-01-G5: unfinished features must not be presented as working.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFileSync(join(root, path), "utf8");
function load(path) {
  const output = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", "require", output)(module, module.exports, () => { throw new Error("Unexpected require"); });
  return module.exports;
}
const caps = load("src/launch/reader-capabilities.ts");

test("audio playback is not implemented, so the launch capability is off and frozen", () => {
  assert.equal(caps.READER_LAUNCH_CAPABILITIES.audioPlayback, false);
  assert.ok(Object.isFrozen(caps.READER_LAUNCH_CAPABILITIES));
  // The Listen screen has no player: it may only describe unavailability.
  const listen = read("app/listen.tsx");
  assert.doesNotMatch(listen, /expo-av|expo-audio|\.play\(|<audio\b/);
  assert.match(listen, /Playback unavailable/);
  // AudioCard lists published items honestly, without a play control.
  const cards = read("src/ui/Cards.tsx");
  const audioCard = cards.slice(cards.indexOf("export function AudioCard"), cards.indexOf("export function AdSlot"));
  assert.match(audioCard, /Audio playback unavailable\./);
  assert.doesNotMatch(audioCard, /onPress|Pressable|\.play\(/);
});

test("Explore lists Audio only when playback exists", () => {
  assert.deepEqual(caps.exploreFormats({ premiumAvailable: false }), ["Articles", "Live", "Video"]);
  assert.deepEqual(caps.exploreFormats({ premiumAvailable: true }), ["Articles", "Live", "Video", "Premium"]);
  assert.deepEqual(caps.exploreFormats({ premiumAvailable: true, audioPlayback: true }), ["Articles", "Live", "Video", "Audio", "Premium"]);
  assert.match(read("app/(reader)/explore.tsx"), /\["Formats",exploreFormats\(\{premiumAvailable\}\)\]/);
});

test("article toolbar offers Listen only when the article supplies a handler", () => {
  const toolbar = read("src/ui/ArticleToolbar.tsx");
  assert.match(toolbar, /onListen\?: \(\) => void;/);
  assert.match(toolbar, /\{onListen \? <ToolbarAction glyph="▶" label="Listen to article" onPress=\{onListen\} \/> : null\}/);
  assert.match(read("app/article/[id].tsx"), /onListen=\{READER_LAUNCH_CAPABILITIES\.audioPlayback \? \(\)=>router\.push\("\/listen" as never\) : undefined\}/);
});

test("Premium benefits never advertise audio while playback is unavailable", () => {
  const benefits = [{ title: "A" }, { title: "Audio", requires: "audioPlayback" }, { title: "B" }];
  assert.deepEqual(caps.availableClaims(benefits).map(b => b.title), ["A", "B"]);
  assert.deepEqual(caps.availableClaims(benefits, { audioPlayback: true }).map(b => b.title), ["A", "Audio", "B"]);
  const premium = read("app/premium.tsx");
  assert.match(premium, /const PREMIUM_BENEFITS = availableClaims\(\[/);
  assert.match(premium, /title: "Article audio where available",[\s\S]*?requires: "audioPlayback"/);
  assert.match(premium, /READER_LAUNCH_CAPABILITIES\.audioPlayback \? "Audio & saved reading" : "Saved reading"/);
});
