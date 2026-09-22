import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here=dirname(fileURLToPath(import.meta.url));
const homeSource=readFileSync(join(here,"../app/(reader)/index.tsx"),"utf8");
const componentStart=homeSource.indexOf("export default function HomeScreen()");
const component=homeSource.slice(componentStart);

test("Home has no conditional hook after its async loading guards",()=>{
  assert.ok(componentStart>=0,"HomeScreen component must be present");
  assert.doesNotMatch(component,/\buseMemo\s*\(/,"Home filtering must not add a hook after an async early return");

  const firstGuard=component.indexOf("if (home.loading)");
  const finalGuard=component.indexOf("if (!home.data)");
  assert.ok(firstGuard>=0 && finalGuard>firstGuard,"Home loading/data guards must be present");

  const afterGuards=component.slice(finalGuard);
  assert.doesNotMatch(
    afterGuards,
    /\buse(?:State|Effect|Memo|Callback|Ref|Reducer|Context|LayoutEffect|ImperativeHandle|DebugValue|DeferredValue|Transition|Id|SyncExternalStore|InsertionEffect|Optimistic|ActionState)\s*\(/,
    "No React hook may be introduced after Home can return early"
  );
});

test("Home fetch errors are reachable before the null-data fallback",()=>{
  const loadingGuard=component.indexOf("if (home.loading)");
  const errorGuard=component.indexOf("if (home.error)");
  const nullDataGuard=component.indexOf("if (!home.data)");

  assert.ok(loadingGuard>=0,"loading guard must exist");
  assert.ok(errorGuard>loadingGuard,"error guard must follow the loading guard");
  assert.ok(nullDataGuard>errorGuard,"null-data fallback must not shadow the error UI");
  assert.match(
    component.slice(errorGuard,nullDataGuard),
    /home\.error\.message/,
    "reachable error branch must render the actual Home fetch error"
  );
});
