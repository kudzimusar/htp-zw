import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const discussion=readFileSync(join(root,"src/ui/ReaderDiscussion.tsx"),"utf8");

test("UI-03 discussion fallback is reader-facing",()=>{
  assert.match(discussion,/Discussion isn't available for this article yet\./);
  assert.doesNotMatch(discussion,/source-parity|fixture story|canonical HealthTimes story identity|certified yet/i);
});

test("UI-03 discussion follows the active appearance palette",()=>{
  assert.match(discussion,/useAppearance/);
  assert.match(discussion,/backgroundColor:palette\.paper/);
  assert.match(discussion,/color:palette\.ink/);
  assert.match(discussion,/placeholderTextColor=\{palette\.inkMuted\}/);
});
