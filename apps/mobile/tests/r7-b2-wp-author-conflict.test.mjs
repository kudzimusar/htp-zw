// HT-MVP-G3G5-R7-B2: Executable behavioral regression matrix for WordPress author ID conflicts.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveWpAuthorAttribution } from "../src/services/wp-author-attribution.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const verifiedAuthors = [
  { displayName: "Michael Gwarisa", slug: "michael-gwarisa" },
  { displayName: "Kudakwashe Pembere", slug: "kuda-pembere" }
];

test("R7-B2 (1): post.author=13 vs embedded author id=12 rejects conflicting embedded identity and never links a profile", () => {
  const conflict = resolveWpAuthorAttribution({
    postId: 9001,
    postAuthor: 13,
    embeddedAuthor: {
      id: 12,
      name: "Incorrect Writer",
      slug: "incorrect-writer",
      link: "https://example.invalid/author/incorrect-writer/"
    },
    fallbackAuthor: null,
    verifiedAuthors
  });
  assert.equal(conflict.author, null);
  assert.equal(conflict.postAuthorId, 13);
  assert.deepEqual(conflict.authorIdConflict, { postAuthorId: 13, embeddedAuthorId: 12 });
  assert.equal(conflict.authorIdentityVerified, false);
  assert.equal(conflict.exception?.kind, "author-unresolved");
  assert.match(conflict.exception?.note ?? "", /13.*12/);

  const withTrusted = resolveWpAuthorAttribution({
    postId: 9001,
    postAuthor: 13,
    embeddedAuthor: { id: 12, name: "Incorrect Writer", slug: "incorrect-writer" },
    fallbackAuthor: {
      id: "wordpress-author-13",
      displayName: "Verified Writer 13",
      slug: "verified-writer-13",
      sourceProvenance: { wordpress: { authorId: "13" } }
    },
    verifiedAuthors
  });
  assert.equal(withTrusted.author?.displayName, "Verified Writer 13");
  assert.equal(withTrusted.author?.slug, "");
  assert.equal(withTrusted.author?.id, "source-author-unresolved:9001");
  assert.equal(withTrusted.author?.sourceProvenance?.sourceUrl, null);
  assert.equal(withTrusted.exception?.kind, "author-unresolved");

  const withUnrelated = resolveWpAuthorAttribution({
    postId: 9001,
    postAuthor: 13,
    embeddedAuthor: { id: 12, name: "Incorrect Writer", slug: "incorrect-writer" },
    fallbackAuthor: {
      id: "wordpress-author-99",
      displayName: "Unrelated Writer",
      slug: "unrelated-writer",
      sourceProvenance: { wordpress: { authorId: "99" } }
    },
    verifiedAuthors
  });
  assert.equal(withUnrelated.author, null);
});

test("R7-B2 (2-7): matching IDs, missing embedded author, embed-only, both absent, fallback mismatch, and multi-post stability", () => {
  const matched = resolveWpAuthorAttribution({
    postId: 9002,
    postAuthor: 13,
    embeddedAuthor: {
      id: 13,
      name: "Verified Writer",
      slug: "verified-writer",
      link: "https://example.invalid/author/verified-writer/"
    },
    fallbackAuthor: null,
    verifiedAuthors
  });
  assert.equal(matched.author?.id, "wordpress-author-13");
  assert.equal(matched.author?.slug, "verified-writer");
  assert.equal(matched.author?.displayName, "Verified Writer");
  assert.equal(matched.authorIdentityVerified, true);
  assert.equal(matched.exception, null);

  const noEmbed = resolveWpAuthorAttribution({
    postId: 9003,
    postAuthor: 13,
    embeddedAuthor: undefined,
    fallbackAuthor: null,
    verifiedAuthors
  });
  assert.equal(noEmbed.author, null);
  assert.equal(noEmbed.postAuthorId, 13);
  assert.equal(noEmbed.exception?.kind, "author-unresolved");

  const embedOnly = resolveWpAuthorAttribution({
    postId: 9004,
    postAuthor: undefined,
    embeddedAuthor: { id: 14, name: "Guest Writer", slug: "guest-writer" },
    fallbackAuthor: null,
    verifiedAuthors
  });
  assert.equal(embedOnly.author?.id, "wordpress-author-14");
  assert.equal(embedOnly.author?.slug, "guest-writer");
  assert.equal(embedOnly.postAuthorId, null);

  const bothAbsent = resolveWpAuthorAttribution({
    postId: 9005,
    postAuthor: undefined,
    embeddedAuthor: { id: 0, name: "Unverified Byliner" },
    fallbackAuthor: null,
    verifiedAuthors
  });
  assert.equal(bothAbsent.author?.displayName, "Unverified Byliner");
  assert.equal(bothAbsent.author?.slug, "");
  assert.equal(bothAbsent.author?.id, "source-author-unresolved:9005");
  assert.equal(bothAbsent.exception?.kind, "author-unresolved");

  const nameMismatch = resolveWpAuthorAttribution({
    postId: 9006,
    postAuthor: undefined,
    embeddedAuthor: { id: 0, name: "Other Writer" },
    fallbackAuthor: {
      id: "source-author-michael-gwarisa",
      displayName: "Michael Gwarisa",
      slug: "michael-gwarisa"
    },
    verifiedAuthors
  });
  assert.equal(nameMismatch.author?.displayName, "Other Writer");
  assert.equal(nameMismatch.author?.slug, "");

  const postA = resolveWpAuthorAttribution({
    postId: 9007,
    postAuthor: 13,
    embeddedAuthor: { id: 13, name: "Verified Writer", slug: "verified-writer" },
    fallbackAuthor: null,
    verifiedAuthors
  });
  const postB = resolveWpAuthorAttribution({
    postId: 9008,
    postAuthor: 13,
    embeddedAuthor: { id: 13, name: "Verified Writer", slug: "verified-writer" },
    fallbackAuthor: null,
    verifiedAuthors
  });
  assert.equal(postA.author?.id, postB.author?.id);
  assert.equal(postA.author?.slug, postB.author?.slug);
});

test("R7-B2 (8-14): similar names, Unicode variants, verified aliases, listByAuthor, byline click guard, Premium fail-closed, and wiring", () => {
  const simA = resolveWpAuthorAttribution({
    postId: 9009,
    embeddedAuthor: { id: 0, name: "Dr. José Moyo" },
    fallbackAuthor: null,
    verifiedAuthors
  });
  const simB = resolveWpAuthorAttribution({
    postId: 9010,
    embeddedAuthor: { id: 0, name: "Dr Jose Moyo" },
    fallbackAuthor: null,
    verifiedAuthors
  });
  assert.equal(simA.author?.slug, "");
  assert.equal(simB.author?.slug, "");
  assert.notEqual(simA.author?.id, simB.author?.id);

  const verifiedAlias = resolveWpAuthorAttribution({
    postId: 9011,
    embeddedAuthor: { id: 0, name: "Kudakwashe Pembere" },
    fallbackAuthor: {
      id: "source-author-kuda-pembere",
      displayName: "Kudakwashe Pembere",
      slug: "kuda-pembere"
    },
    verifiedAuthors
  });
  assert.equal(verifiedAlias.author?.slug, "kuda-pembere");

  const conflict = resolveWpAuthorAttribution({
    postId: 9001,
    postAuthor: 13,
    embeddedAuthor: { id: 12, name: "Incorrect Writer", slug: "incorrect-writer" },
    fallbackAuthor: null,
    verifiedAuthors
  });
  const matched = resolveWpAuthorAttribution({
    postId: 9002,
    postAuthor: 13,
    embeddedAuthor: { id: 13, name: "Verified Writer", slug: "verified-writer" },
    fallbackAuthor: null,
    verifiedAuthors
  });
  const articles = [
    { slug: "conflict-story", author: conflict.author },
    { slug: "matched-story", author: matched.author },
    { slug: "sim-a", author: simA.author }
  ];
  const listByAuthor = (slug) => (!slug ? [] : articles.filter((a) => Boolean(a.author?.slug) && a.author.slug === slug));
  assert.deepEqual(listByAuthor("incorrect-writer"), []);
  assert.deepEqual(listByAuthor(""), []);
  assert.deepEqual(listByAuthor("verified-writer").map((a) => a.slug), ["matched-story"]);

  const articleScreen = read("app/article/[id].tsx");
  assert.match(articleScreen, /story\.author && story\.author\.slug\.trim\(\)/);

  const service = read("src/services/source-parity.ts");
  assert.match(service, /import \{ resolveWpAuthorAttribution \} from "\.\/wp-author-attribution";/);
  assert.match(service, /const authorResolution=resolveWpAuthorAttribution\(/);
  assert.match(service, /author:authorResolution\.author,/);
  assert.match(service, /bodyHtml:accessPolicy==="premium" \? null/);
  assert.match(service, /if\(!current\) return null;/);
});
