import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { loadTs, mobileRoot } from "./ts-module-loader.mjs";

test("NM-05R preserves the diagnosed slug-only fallback but never uses it as Premium teaser authority",()=>{
  const snapshot=loadTs("src/source-parity/snapshot.ts");
  const authority=loadTs("src/services/premium-teaser-authority.ts",{
    mocks:{
      "../platform/config":{
        hasStagingConfig:false,
        stagingConfig:{url:"",publishableKey:""}
      }
    }
  });
  const story=snapshot.sourceParityArticles.find(
    (article)=>article.id==="source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks"
  );
  assert.ok(story);

  const preRemediationPath=authority.canonicalPremiumSourcePath(story.canonicalUrl);
  assert.equal(
    preRemediationPath,
    "/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/"
  );

  const acceptedMetadataUrl=
    "https://healthtimes.co.zw/2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/";
  const resolvedPath=authority.canonicalPremiumSourcePath(acceptedMetadataUrl);
  assert.equal(
    resolvedPath,
    "/2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/"
  );

  const sourceParity=readFileSync(join(mobileRoot,"src/services/source-parity.ts"),"utf8");
  assert.match(sourceParity,/legacyDatedPermalinkCandidate/);
  assert.match(sourceParity,/boundedTeaserAuthority\(current\)/);
  assert.match(sourceParity,/article\.publishedAt/);
  assert.match(sourceParity,/article\.slug/);
  assert.doesNotMatch(sourceParity,/trustedPremiumSourceUrl=metadataPost/);
  assert.doesNotMatch(sourceParity,/const metadata=await sourceGet<WpPost\[\]>/);

  console.log(JSON.stringify({
    source_id:"33190",
    canonical_candidate_p_path:preRemediationPath,
    dated_candidate_p_path:resolvedPath,
    browser_wordpress_metadata_required:false
  }));
});
