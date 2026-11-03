import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTs } from "./ts-module-loader.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

function createMockStorage() {
  const store = new Map();
  let failWrites = false;
  let failReads = false;
  let failReadKeys = new Set();
  let failWriteKeys = new Set();
  let writeError = new Error("Error Domain=NSCocoaErrorDomain Code=512 \"The file “manifest.json” couldn’t be saved in the folder “RCTAsyncLocalStorage_V1”.\" UserInfo={NSUnderlyingError=0x130e44540 {Error Domain=NSPOSIXErrorDomain Code=5 \"Input/output error\"}}");
  let readError = new Error("Error Domain=NSPOSIXErrorDomain Code=5 \"Input/output error reading storage\"");

  const storage = {
    store,
    setFailWrites(fail, err) {
      failWrites = fail;
      if (err) writeError = err;
    },
    setFailReads(fail, err) {
      failReads = fail;
      if (err) readError = err;
    },
    setFailReadKeys(keys, err) {
      failReadKeys = new Set(keys);
      if (err) readError = err;
    },
    setFailWriteKeys(keys, err) {
      failWriteKeys = new Set(keys);
      if (err) writeError = err;
    },
    async getItem(key) {
      if (failReads || failReadKeys.has(key)) {
        throw readError;
      }
      return store.has(key) ? store.get(key) : null;
    },
    async setItem(key, value) {
      if (failWrites || failWriteKeys.has(key)) {
        throw writeError;
      }
      store.set(key, String(value));
    },
    async removeItem(key) {
      if (failWrites || failWriteKeys.has(key)) {
        throw writeError;
      }
      store.delete(key);
    }
  };

  return {
    storage,
    mocks: {
      "@react-native-async-storage/async-storage": {
        default: storage,
        ...storage
      }
    }
  };
}

test("Reader persistence persists saved articles to durable AsyncStorage", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  assert.deepEqual(await repo.getSavedArticleIds(), []);

  const saved = await repo.toggleSavedArticle("story-101");
  assert.equal(saved, true);

  const raw = storage.store.get("ht:nm04:reader:saved:v1");
  assert.ok(raw, "must write to storage key ht:nm04:reader:saved:v1");
  assert.deepEqual(JSON.parse(raw), ["story-101"]);
  assert.deepEqual(await repo.getSavedArticleIds(), ["story-101"]);

  const removed = await repo.toggleSavedArticle("story-101");
  assert.equal(removed, false);
  assert.deepEqual(JSON.parse(storage.store.get("ht:nm04:reader:saved:v1")), []);
});

test("Fail-closed on storage write rejection (save article): rejects, never reports false success", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  // Pre-populate with existing saved story
  storage.store.set("ht:nm04:reader:saved:v1", JSON.stringify(["existing-story"]));

  // Force storage write failure (simulating iOS Code=512 / EIO or out-of-disk)
  storage.setFailWrites(true);

  await assert.rejects(
    async () => {
      await repo.toggleSavedArticle("new-story");
    },
    /NSCocoaErrorDomain Code=512|Input\/output error/,
    "toggleSavedArticle must reject when durable storage write fails"
  );

  // Turn off failures to read back durable storage
  storage.setFailWrites(false);

  // Invariant: Existing saved records remain untouched and new-story is NOT present
  const durableAfter = await repo.getSavedArticleIds();
  assert.deepEqual(durableAfter, ["existing-story"]);
  assert.equal(durableAfter.includes("new-story"), false, "failed write must never be retained as saved");
});

test("Fail-closed on storage write rejection (offline download): rejects and leaves downloads empty", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  storage.setFailWrites(true);

  const sampleArticle = {
    id: "offline-story-1",
    title: "Test Offline Story",
    accessPolicy: "free",
    canonicalUrl: "/article/offline-story-1"
  };

  await assert.rejects(
    async () => {
      await repo.downloadArticle(sampleArticle);
    },
    /NSCocoaErrorDomain Code=512|Input\/output error/,
    "downloadArticle must reject when durable storage write fails"
  );

  storage.setFailWrites(false);
  const downloads = await repo.getDownloadedArticles();
  assert.deepEqual(downloads, [], "downloads must remain empty if storage write failed");
});

test("Recovery after storage failure: subsequent retry succeeds and persists durably", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  // Step 1: Storage write fails
  storage.setFailWrites(true);
  await assert.rejects(async () => repo.toggleSavedArticle("retry-story"));

  // Step 2: Storage recovers
  storage.setFailWrites(false);

  // Step 3: Retry succeeds
  const saved = await repo.toggleSavedArticle("retry-story");
  assert.equal(saved, true);
  assert.deepEqual(await repo.getSavedArticleIds(), ["retry-story"]);
});

test("Work Package A - Scenario 1: Both keys legitimately absent (clean first visit) grants 20-second preview", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  const preview = await repo.getPremiumPreviewWindow("clean-story-1", 20);
  assert.ok(preview, "must grant preview on clean first use");
  assert.equal(preview.storyId, "clean-story-1");
  assert.equal(preview.remainingSeconds, 20);
  assert.ok(preview.scopeId.startsWith("anonymous-"));
  assert.ok(Date.parse(preview.startedAt) > 0);
  assert.ok(Date.parse(preview.expiresAt) > Date.parse(preview.startedAt));

  // Verify storage was initialized with both keys
  assert.ok(storage.store.has("ht:ag05:premium-preview:scope:v1"));
  assert.ok(storage.store.has("ht:ag05:premium-preview:ledger:v1"));
});

test("Work Package A - Scenario 2: Empty ledger fails closed (null window, false prompt; never reset to first use)", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  storage.store.set("ht:ag05:premium-preview:scope:v1", "scope-valid-1");
  storage.store.set("ht:ag05:premium-preview:ledger:v1", "");

  const windowResult = await repo.getPremiumPreviewWindow("story-empty-ledger", 20);
  assert.equal(windowResult, null, "MUST fail closed on present-but-empty ledger; never treat as missing/first-use");

  const promptResult = await repo.requestPremiumPreviewPrompt("story-empty-ledger");
  assert.equal(promptResult, false, "MUST fail closed on empty ledger");

  // Invariant: empty ledger must not be overwritten with a new ledger
  assert.equal(storage.store.get("ht:ag05:premium-preview:ledger:v1"), "");
});

test("Work Package A - Scenario 3: Whitespace-only ledger fails closed (null window, false prompt)", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  storage.store.set("ht:ag05:premium-preview:scope:v1", "scope-valid-2");
  storage.store.set("ht:ag05:premium-preview:ledger:v1", "   \n\t  ");

  const windowResult = await repo.getPremiumPreviewWindow("story-ws-ledger", 20);
  assert.equal(windowResult, null, "MUST fail closed on whitespace-only ledger");

  const promptResult = await repo.requestPremiumPreviewPrompt("story-ws-ledger");
  assert.equal(promptResult, false, "MUST fail closed on whitespace-only ledger");

  assert.equal(storage.store.get("ht:ag05:premium-preview:ledger:v1"), "   \n\t  ");
});

test("Work Package A - Scenario 4: Malformed ledger JSON fails closed (null window, false prompt)", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  storage.store.set("ht:ag05:premium-preview:scope:v1", "scope-user-2");
  storage.store.set("ht:ag05:premium-preview:ledger:v1", "{ MALFORMED_JSON_CORRUPTED_ENTRY ");

  const windowResult = await repo.getPremiumPreviewWindow("story-corrupt", 20);
  assert.equal(windowResult, null, "MUST fail closed on corrupt ledger; never reset to empty ledger");

  const promptResult = await repo.requestPremiumPreviewPrompt("story-corrupt");
  assert.equal(promptResult, false, "MUST fail closed on corrupt ledger");

  // Corrupt data must not be overwritten
  assert.equal(storage.store.get("ht:ag05:premium-preview:ledger:v1"), "{ MALFORMED_JSON_CORRUPTED_ENTRY ");
});

test("Work Package A - Scenario 5: Invalid ledger structure fails closed (null window, false prompt)", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  storage.store.set("ht:ag05:premium-preview:scope:v1", "scope-user-5");

  // Array instead of object
  storage.store.set("ht:ag05:premium-preview:ledger:v1", JSON.stringify(["not", "an", "object"]));
  assert.equal(await repo.getPremiumPreviewWindow("story-struct-1", 20), null);
  assert.equal(await repo.requestPremiumPreviewPrompt("story-struct-1"), false);

  // Primitive number instead of object
  storage.store.set("ht:ag05:premium-preview:ledger:v1", "12345");
  assert.equal(await repo.getPremiumPreviewWindow("story-struct-2", 20), null);
  assert.equal(await repo.requestPremiumPreviewPrompt("story-struct-2"), false);

  // Object entry missing required timestamps or storyId
  storage.store.set("ht:ag05:premium-preview:ledger:v1", JSON.stringify({
    "scope-user-5|story-bad-entry": { storyId: "", startedAt: -50 }
  }));
  assert.equal(await repo.getPremiumPreviewWindow("story-bad-entry", 20), null);
  assert.equal(await repo.requestPremiumPreviewPrompt("story-bad-entry"), false);
});

test("Work Package A - Scenario 6: Empty scope fails closed and does NOT regenerate scope", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  storage.store.set("ht:ag05:premium-preview:scope:v1", "");
  storage.store.set("ht:ag05:premium-preview:ledger:v1", JSON.stringify({}));

  const windowResult = await repo.getPremiumPreviewWindow("story-empty-scope", 20);
  assert.equal(windowResult, null, "Must fail closed if scope is present but empty");

  const promptResult = await repo.requestPremiumPreviewPrompt("story-empty-scope");
  assert.equal(promptResult, false, "Must fail closed if scope is present but empty");

  // Invariant: empty scope MUST NOT be replaced with a freshly generated scope!
  assert.equal(storage.store.get("ht:ag05:premium-preview:scope:v1"), "");
});

test("Work Package A - Scenario 7: Whitespace-only scope fails closed and does NOT regenerate scope", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  storage.store.set("ht:ag05:premium-preview:scope:v1", "   \t\n  ");
  storage.store.set("ht:ag05:premium-preview:ledger:v1", JSON.stringify({}));

  const windowResult = await repo.getPremiumPreviewWindow("story-ws-scope", 20);
  assert.equal(windowResult, null, "Must fail closed if scope is whitespace-only");

  const promptResult = await repo.requestPremiumPreviewPrompt("story-ws-scope");
  assert.equal(promptResult, false, "Must fail closed if scope is whitespace-only");

  // Invariant: whitespace scope MUST NOT be replaced with a freshly generated scope!
  assert.equal(storage.store.get("ht:ag05:premium-preview:scope:v1"), "   \t\n  ");
});

test("Work Package A - Scenario 8: Storage read failure on scope fails closed (null window, false prompt)", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  storage.setFailReadKeys(["ht:ag05:premium-preview:scope:v1"]);

  const windowResult = await repo.getPremiumPreviewWindow("story-scope-err", 20);
  assert.equal(windowResult, null, "Must fail closed if scope read fails");

  const promptResult = await repo.requestPremiumPreviewPrompt("story-scope-err");
  assert.equal(promptResult, false, "Must fail closed if scope read fails");
});

test("Work Package A - Scenario 9: Storage write failure on scope fails closed (null window, false prompt)", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  // Both keys absent: clean first use, but scope write fails
  storage.setFailWriteKeys(["ht:ag05:premium-preview:scope:v1"]);

  const windowResult = await repo.getPremiumPreviewWindow("story-scope-write-err", 20);
  assert.equal(windowResult, null, "Must fail closed if scope cannot be persisted");

  const promptResult = await repo.requestPremiumPreviewPrompt("story-scope-write-err");
  assert.equal(promptResult, false, "Must fail closed if scope cannot be persisted");
});

test("Work Package A - Scenario 10: Storage read failure on ledger fails closed (null window, false prompt)", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  storage.store.set("ht:ag05:premium-preview:scope:v1", "scope-user-10");
  const existingLedger = {
    "scope-user-10|story-consumed": {
      storyId: "story-consumed",
      scopeId: "scope-user-10",
      startedAt: Date.now() - 30000,
      promptRequestedAt: Date.now() - 10000
    }
  };
  storage.store.set("ht:ag05:premium-preview:ledger:v1", JSON.stringify(existingLedger));

  storage.setFailReadKeys(["ht:ag05:premium-preview:ledger:v1"]);

  const windowResult = await repo.getPremiumPreviewWindow("story-consumed", 20);
  assert.equal(windowResult, null, "MUST fail closed on ledger read failure; never reset/grant preview");

  const promptResult = await repo.requestPremiumPreviewPrompt("story-consumed");
  assert.equal(promptResult, false, "MUST fail closed on ledger read failure; never grant prompt");

  storage.setFailReadKeys([]);
  const rawLedger = storage.store.get("ht:ag05:premium-preview:ledger:v1");
  assert.deepEqual(JSON.parse(rawLedger), existingLedger);
});

test("Work Package A - Scenario 11: Storage write failure on ledger fails closed (null window, false prompt)", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  storage.store.set("ht:ag05:premium-preview:scope:v1", "scope-valid-11");
  storage.store.set("ht:ag05:premium-preview:ledger:v1", JSON.stringify({}));
  storage.setFailWriteKeys(["ht:ag05:premium-preview:ledger:v1"]);

  const windowResult = await repo.getPremiumPreviewWindow("story-ledger-write-err", 20);
  assert.equal(windowResult, null, "Must fail closed if initial ledger entry cannot be saved");

  const promptResult = await repo.requestPremiumPreviewPrompt("story-ledger-write-err");
  assert.equal(promptResult, false, "Must fail closed if ledger update cannot be saved");
});

test("Work Package A - Scenario 12: Existing scope with absent ledger (partial state) fails closed", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  storage.store.set("ht:ag05:premium-preview:scope:v1", "scope-isolated");
  // Ledger key is completely absent (null in AsyncStorage)

  const windowResult = await repo.getPremiumPreviewWindow("story-partial-scope", 20);
  assert.equal(windowResult, null, "Inconsistent partial state (scope exists without ledger) MUST fail closed");

  const promptResult = await repo.requestPremiumPreviewPrompt("story-partial-scope");
  assert.equal(promptResult, false, "Inconsistent partial state MUST fail closed");
});

test("Work Package A - Scenario 13: Absent scope with existing ledger (partial state) fails closed", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  // Scope key is completely absent (null in AsyncStorage)
  storage.store.set("ht:ag05:premium-preview:ledger:v1", JSON.stringify({
    "scope-prior|story-x": { storyId: "story-x", scopeId: "scope-prior", startedAt: Date.now() }
  }));

  const windowResult = await repo.getPremiumPreviewWindow("story-x", 20);
  assert.equal(windowResult, null, "Inconsistent partial state (ledger exists without scope) MUST fail closed");

  const promptResult = await repo.requestPremiumPreviewPrompt("story-x");
  assert.equal(promptResult, false, "Inconsistent partial state MUST fail closed");
});

test("Work Package A - Scenario 14: Interrupted first-use initialization leaves partial state that fails closed", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  // Simulate an interrupted operation: scope was written on first use, but app crashed before ledger was written
  storage.store.set("ht:ag05:premium-preview:scope:v1", "interrupted-scope");

  const windowResult = await repo.getPremiumPreviewWindow("any-story", 20);
  assert.equal(windowResult, null, "Interrupted partial initialization must deny unintended preview access");
});

test("Work Package A - Scenario 15: Expired preview returns 0 remaining seconds and does not reset", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  storage.store.set("ht:ag05:premium-preview:scope:v1", "scope-user-15");
  const startedAt = Date.now() - 25000; // 25s ago (> 20s)
  storage.store.set("ht:ag05:premium-preview:ledger:v1", JSON.stringify({
    "scope-user-15|story-expired": {
      storyId: "story-expired",
      scopeId: "scope-user-15",
      startedAt
    }
  }));

  const windowResult = await repo.getPremiumPreviewWindow("story-expired", 20);
  assert.ok(windowResult);
  assert.equal(windowResult.remainingSeconds, 0, "Expired preview window must have 0 remaining seconds");
  assert.equal(Date.parse(windowResult.startedAt), startedAt, "startedAt must NOT be reset");
});

test("Work Package A - Scenario 16: Previously consumed preview after application restart preserves expiry and consumed prompt", async () => {
  const { storage, mocks } = createMockStorage();

  // First session: preview consumed
  const repoModule1 = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo1 = repoModule1.persistentReaderRepository;
  const initial = await repo1.getPremiumPreviewWindow("story-restart-test", 20);
  assert.ok(initial);
  const promptOk = await repo1.requestPremiumPreviewPrompt("story-restart-test");
  assert.equal(promptOk, true);

  // Fast forward time past duration (simulate 25 seconds later)
  const originalNow = Date.now;
  try {
    Date.now = () => originalNow() + 25000;

    // Second session: simulate fresh app start / new module instance reading from same storage
    const repoModule2 = loadTs("src/services/reader-persistence.ts", { mocks });
    const repo2 = repoModule2.persistentReaderRepository;

    const restoredWindow = await repo2.getPremiumPreviewWindow("story-restart-test", 20);
    assert.ok(restoredWindow);
    assert.equal(restoredWindow.remainingSeconds, 0, "Must remain expired across app restart");

    const secondPrompt = await repo2.requestPremiumPreviewPrompt("story-restart-test");
    assert.equal(secondPrompt, false, "Consumed prompt must remain consumed across app restart");
  } finally {
    Date.now = originalNow;
  }
});

test("Work Package A - Scenario 17: Storage recovery after failure allows subsequent retry to succeed durably", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  // Step 1: Storage failure
  storage.setFailReadKeys(["ht:ag05:premium-preview:scope:v1"]);
  const failedWindow = await repo.getPremiumPreviewWindow("story-recover", 20);
  assert.equal(failedWindow, null, "Must fail closed during outage");

  // Step 2: Storage recovers
  storage.setFailReadKeys([]);

  // Step 3: Clean first use succeeds
  const recoveredWindow = await repo.getPremiumPreviewWindow("story-recover", 20);
  assert.ok(recoveredWindow, "Must succeed once storage recovers");
  assert.equal(recoveredWindow.storyId, "story-recover");
  assert.equal(recoveredWindow.remainingSeconds, 20);
});

test("Work Package A - Scenario 11: Ordinary non-security preferences preserve fallback resilience", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  // Non-security settings should not throw when storage is unavailable
  storage.setFailReads(true);

  const preferences = await repo.getPreferences();
  assert.deepEqual(preferences, {
    primaryEdition: "Global",
    followedCountries: [],
    followedTopics: ["Public Health", "Research"]
  });

  const appearance = await repo.getAppearance();
  assert.equal(appearance, "system");

  const savedIds = await repo.getSavedArticleIds();
  assert.deepEqual(savedIds, []);

  const downloaded = await repo.getDownloadedArticles();
  assert.deepEqual(downloaded, []);

  const progress = await repo.getReadPosition("any-story");
  assert.equal(progress, 0);

  const history = await repo.getReadingHistoryIds();
  assert.deepEqual(history, []);
});

test("Article UI source contracts guarantee truthful, fail-closed persistence feedback", () => {
  const articleSource = read("app/article/[id].tsx");

  // Invariant 1: In save(), error catch block sets 'Failed to save article', never 'Saved'
  assert.match(articleSource, /catch\s*\{\s*setActionStatus\("Failed to save article"\);?\s*\}/);
  assert.doesNotMatch(articleSource, /catch\s*\{\s*setActionStatus\("Saved"\);?\s*\}/);

  // Invariant 2: In download(), error catch block sets 'Offline download failed', never 'Available offline'
  assert.match(articleSource, /catch\s*\{\s*setActionStatus\("Offline download failed"\);?\s*\}/);
  assert.doesNotMatch(articleSource, /catch\s*\{\s*setActionStatus\("Available offline"\);?\s*\}/);

  // Invariant 3: Persistence service does not contain inMemoryCache false-positive masking
  const persistenceSource = read("src/services/reader-persistence.ts");
  assert.doesNotMatch(persistenceSource, /inMemoryCache/);
  assert.doesNotMatch(persistenceSource, /fallback to in-memory/);
});
