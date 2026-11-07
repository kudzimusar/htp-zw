import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..", "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const readRepo = (path) => readFileSync(join(repoRoot, path), "utf8");

test("UI-WF-02B ArticleToolbar converges to a single compact publication bar with quiet resting controls", () => {
  const toolbar = read("src/ui/ArticleToolbar.tsx");
  assert.match(toolbar, /maxWidth:\s*layout\.articleMax/);
  assert.match(toolbar, /borderBottomWidth:\s*StyleSheet\.hairlineWidth/);
  assert.match(toolbar, /utilityCluster/);
  assert.match(toolbar, /borderColor:\s*focused \|\| selected \? palette\.blue : "transparent"/);
  assert.match(toolbar, /minHeight:\s*layout\.touchMin/);
  assert.match(toolbar, /actionFocused:\s*\{\s*borderWidth:\s*2\s*\}/);

  const rowStart = toolbar.indexOf('accessibilityRole="toolbar"');
  const backIdx = toolbar.indexOf('label="Back"', rowStart);
  const scaleIdx = toolbar.indexOf('glyph="Aa"', rowStart);
  const saveIdx = toolbar.indexOf('label="Save article"', rowStart);
  const listenIdx = toolbar.indexOf('label="Listen to article"', rowStart);
  const shareIdx = toolbar.indexOf('label="Share article"', rowStart);
  const offlineIdx = toolbar.indexOf('accessibilityLabel="Download article for offline reading"', rowStart);
  assert.ok(rowStart > 0 && backIdx > rowStart && scaleIdx > backIdx && saveIdx > scaleIdx && listenIdx > saveIdx && shareIdx > listenIdx && offlineIdx > shareIdx);
});

test("UI-WF-02B ArticleReader establishes Screen 4 opening hierarchy and 760px reading column", () => {
  const article = read("app/article/[id].tsx");
  assert.match(article, /const \[responsiveReady,setResponsiveReady\]=useState\(Platform\.OS!=="web"\)/);
  assert.match(article, /const width=responsiveReady \? rawWidth : 0/);
  assert.match(article, /<Page\s+chrome=\{desktop\}/);
  assert.match(article, /titleTablet:\{fontSize:38,lineHeight:44/);
  assert.match(article, /titleDesktop:\{fontSize:44,lineHeight:50/);
  assert.match(article, /standfirstDesktop:\{fontSize:19,lineHeight:29\}/);
  assert.match(article, /geoLabel:\{fontSize:11,fontWeight:"600",borderWidth:0/);
  assert.match(article, /postArticle:\{maxWidth:layout\.articleMax,alignSelf:"center",width:"100%"/);

  const renderStart = article.indexOf("<ArticleToolbar");
  const heroIdx = article.indexOf('testID="article-hero-media"', renderStart);
  const headerIdx = article.indexOf("styles.articleHeader", renderStart);
  const kickerIdx = article.indexOf("styles.kicker", headerIdx);
  const titleIdx = article.indexOf("styles.title", headerIdx);
  const standfirstIdx = article.indexOf("styles.standfirst", headerIdx);
  const bylineIdx = article.indexOf("styles.byline", headerIdx);
  const timeIdx = article.indexOf("styles.timeMeta", headerIdx);
  const bodyIdx = article.indexOf("styles.body", headerIdx);
  const postIdx = article.indexOf("styles.postArticle", bodyIdx);

  assert.ok(renderStart > 0);
  assert.ok(heroIdx > renderStart, "Hero media must follow compact ArticleToolbar");
  assert.ok(headerIdx > heroIdx, "Article header must follow hero media");
  assert.ok(kickerIdx > headerIdx && titleIdx > kickerIdx && standfirstIdx > titleIdx && bylineIdx > standfirstIdx && timeIdx > bylineIdx);
  assert.ok(bodyIdx > timeIdx && postIdx > bodyIdx);
});

test("UI-WF-02B preserves frozen Premium security, advertising placements, and Search/Home/routing custody", () => {
  const article = read("app/article/[id].tsx");
  const vercel = JSON.parse(readRepo("vercel.json"));
  assert.equal(vercel.cleanUrls, true);
  assert.match(article, /parseArticleContent\(protectedBody \? null : story\.bodyHtml,story\.canonicalUrl\)/);
  assert.match(article, /AdSlot placement="article_after_intro"/);
  assert.match(article, /AdSlot placement="article_end"/);
  assert.match(article, /PremiumPaywall/);
  assert.match(article, /PremiumSubscriptionPrompt/);
  assert.match(article, /ReaderDiscussionPanel/);
});
