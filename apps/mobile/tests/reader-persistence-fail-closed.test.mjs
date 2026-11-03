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
  let writeError = new Error("Error Domain=NSCocoaErrorDomain Code=512 \"The file “manifest.json” couldn’t be saved in the folder “RCTAsyncLocalStorage_V1”.\" UserInfo={NSUnderlyingError=0x130e44540 {Error Domain=NSPOSIXErrorDomain Code=5 \"Input/output error\"}}");

  const storage = {
    store,
    setFailWrites(fail, err) {
      failWrites = fail;
      if (err) writeError = err;
    },
    async getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async setItem(key, value) {
      if (failWrites) {
        throw writeError;
      }
      store.set(key, String(value));
    },
    async removeItem(key) {
      if (failWrites) {
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

test("Premium preview restrictions fail closed: storage failure locks preview (null window)", async () => {
  const { storage, mocks } = createMockStorage();
  const repoModule = loadTs("src/services/reader-persistence.ts", { mocks });
  const repo = repoModule.persistentReaderRepository;

  // Force storage write failure
  storage.setFailWrites(true);

  const preview = await repo.getPremiumPreviewWindow("premium-story-404", 20);
  assert.equal(preview, null, "getPremiumPreviewWindow must return null (locked) if storage cannot persist the ledger");

  const promptResult = await repo.requestPremiumPreviewPrompt("premium-story-404");
  assert.equal(promptResult, false, "requestPremiumPreviewPrompt must return false when storage write fails");
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
