import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

test("UI-WF-04 Screen 8 (Saved & Offline) converges library header, counts, and offline cards without inventing video/audio persistence", () => {
  const saved = read("app/saved.tsx");
  const persistence = read("src/services/reader-persistence.ts");

  assert.match(saved, /testID="saved-library-header"/);
  assert.match(saved, /testID="saved-library-summary"/);
  assert.match(saved, /type LibraryTab = "saved" \| "offline" \| "history"/);
  assert.match(saved, /services\.reader\.getSavedArticleIds/);
  assert.match(saved, /services\.reader\.getDownloadedArticles/);
  assert.match(saved, /services\.reader\.getReadingHistoryIds/);
  assert.match(saved, /services\.articles\.getById/);
  assert.match(saved, /removeDownloadedArticle/);
  assert.match(saved, /Premium stories are not stored here without verified offline access/);
  assert.doesNotMatch(saved, /"videos"|"audio"|Watch Later|Reader storage boundary/i);
  assert.doesNotMatch(persistence, /saveVideo|getSavedVideoIds|saveAudio|getSavedAudioIds/);
});

test("UI-WF-04 Screen 9 (My HealthTimes) enforces consumer account hierarchy and removes duplicate institutional directory clutter", () => {
  const my = read("app/(reader)/my.tsx");
  const about = read("app/about.tsx");

  const idxIdentity = my.indexOf('testID="my-ht-identity-card"');
  const idxPremium = my.indexOf('testID="my-ht-premium-card"');
  const idxGroups = my.indexOf("{groups.map");
  const idxSignOut = my.indexOf('title="Sign Out"');
  const idxStudio = my.indexOf("staffAuthorized &&");

  assert.ok(idxIdentity > 0, "missing identity card");
  assert.ok(idxPremium > idxIdentity, "Premium status/action must follow identity");
  assert.ok(idxGroups > idxPremium, "account groups must follow Premium card");
  assert.ok(idxSignOut > idxGroups, "Sign Out must follow account groups");
  assert.ok(idxStudio > idxSignOut, "staff-gated Studio must remain subordinate after Sign Out");

  for (const label of [
    "My Profile",
    "Countries & Interests",
    "Saved",
    "Downloads",
    "Reading History",
    "Notifications",
    "My Subscriptions",
    "Notification Settings",
    "Appearance / Theme",
    "Devices & Sessions",
    "Account deletion status",
    "Help & Support",
    "About HealthTimes"
  ]) {
    assert.ok(my.includes(label), "missing consumer account item: " + label);
  }

  assert.doesNotMatch(my, /PUBLICATION & INSTITUTIONAL/);
  assert.match(about, /Corrections & editorial standards/);
  assert.match(about, /Authors & journalists/);
  assert.match(about, /HealthTimes products & channels/);
});

test("UI-WF-04 Screen 10 (Edition & Preferences) enforces search-first hierarchy, primary radio selection, progressive disclosure, and billing separation", () => {
  const edition = read("app/edition.tsx");

  const idxSummary = edition.indexOf('testID="edition-active-summary"');
  const idxSearch = edition.indexOf('testID="edition-search-wrap"');
  const idxPrimary = edition.indexOf('title="Primary Edition"');
  const idxMoreLocations = edition.indexOf('testID="edition-more-locations"');
  const idxFollowed = edition.indexOf('title="Followed Countries & Regions"');
  const idxTopics = edition.indexOf('title="Content Preferences"');
  const idxBillingNote = edition.indexOf("Edition and billing country are different");
  const idxSave = edition.indexOf("Save Preferences");

  assert.ok(idxSummary > 0);
  assert.ok(idxSearch > idxSummary, "search must lead the interactive controls");
  assert.ok(idxPrimary > idxSearch, "Primary Edition must follow search");
  assert.ok(idxMoreLocations > idxPrimary, "Show More Locations must follow primary list");
  assert.ok(idxFollowed > idxMoreLocations, "Followed Countries & Regions must follow Primary Edition");
  assert.ok(idxTopics > idxFollowed, "Content Preferences must follow Followed Countries & Regions");
  assert.ok(idxBillingNote > idxTopics, "edition-vs-billing notice must precede Save Preferences");
  assert.ok(idxSave > idxBillingNote, "Save Preferences must close the form");

  assert.doesNotMatch(edition, /Popular/);
  assert.doesNotMatch(edition, /Zimbabwe/);
});
