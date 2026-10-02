import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./ts-module-loader.mjs";

test("PRE-REMEDIATION DIAGNOSTIC captures source-parity fallback p_path for source 33190",async()=>{
  const snapshot=loadTs("src/source-parity/snapshot.ts");
  const story=snapshot.sourceParityArticles.find(
    (article)=>article.id==="source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks"
  );
  assert.ok(story,"source 33190 fallback story must exist");

  const requests=[];
  const previousFetch=global.fetch;
  global.fetch=async(url,options={})=>{
    requests.push({url:String(url),body:String(options.body ?? "")});
    return {
      ok:true,
      async json(){return null;}
    };
  };

  try{
    const authority=loadTs("src/services/premium-teaser-authority.ts",{
      mocks:{
        "../platform/config":{
          hasStagingConfig:true,
          stagingConfig:{
            url:"https://example.supabase.co",
            publishableKey:"sb_publishable_redacted"
          }
        }
      }
    });

    await authority.getPublicPremiumTeaserAuthority(story.canonicalUrl);

    assert.equal(requests.length,1);
    const body=JSON.parse(requests[0].body);
    console.log(JSON.stringify({
      story_id:story.id,
      canonical_url:story.canonicalUrl,
      snapshot_legacy_path:story.sourceProvenance?.wordpress?.legacyPath ?? null,
      outgoing_p_path:body.p_path
    }));

    assert.equal(
      body.p_path,
      "/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/",
      "diagnostic must capture the current slug-only lookup key before remediation"
    );
    assert.notEqual(
      body.p_path,
      "/2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/",
      "current fallback path must be proven different from the accepted live dated path"
    );
  }finally{
    global.fetch=previousFetch;
  }
});
