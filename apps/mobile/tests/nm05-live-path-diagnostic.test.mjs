import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { loadTs, mobileRoot } from "./ts-module-loader.mjs";

test("NM-05R preserves the diagnosed slug-only fallback and adds a bounded dated compatibility candidate",()=>{
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
  assert.match(sourceParity,/const metadata=await sourceGet<WpPost\[\]>/);
  assert.match(sourceParity,/wpPostQuery\(\{includeContent:false\}\)/);
  assert.match(sourceParity,/function legacyDatedPermalinkCandidate/);
  assert.match(sourceParity,/currentPermalinkCandidate=metadataPost\?\.link/);
  assert.match(sourceParity,/datedPermalinkCandidate=metadataPost \? legacyDatedPermalinkCandidate\(metadataPost\) : null/);
  assert.match(sourceParity,/getPublicPremiumTeaserAuthority\(currentPermalinkCandidate\)/);
  assert.match(sourceParity,/getPublicPremiumTeaserAuthority\(datedPermalinkCandidate\)/);
  assert.doesNotMatch(sourceParity,/getPublicPremiumTeaserAuthority\(current\.canonicalUrl\)/);

  console.log(JSON.stringify({
    source_id:"33190",
    pre_remediation_snapshot_p_path:preRemediationPath,
    dated_compatibility_p_path:resolvedPath,
    product_consumer_uses_snapshot_p_path:false,
    product_consumer_falls_back_to_dated_candidate:true
  }));
});
