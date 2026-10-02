import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { loadTs, mobileRoot } from "./ts-module-loader.mjs";

const read=(relative)=>readFileSync(join(mobileRoot,relative),"utf8");

test("source-parity Premium authority is bounded before WordPress detail content is decided",async()=>{
  const previousFetch=global.fetch;
  const requests=[];
  global.fetch=async(url,options={})=>{
    requests.push({url:String(url),options});
    return {
      ok:true,
      async json(){
        return {
          source_id:"33190",
          access_policy:"premium_marker_review",
          body_html:null,
          premium_teaser_html:"<p>AUTHORIZED PUBLIC TEASER</p>"
        };
      }
    };
  };

  try{
    const authorityModule=loadTs("src/services/premium-teaser-authority.ts",{
      mocks:{
        "../platform/config":{
          hasStagingConfig:true,
          stagingConfig:{
            url:"https://example.supabase.co",
            publishableKey:"sb_publishable_test"
          }
        }
      }
    });

    const authority=await authorityModule.getPublicPremiumTeaserAuthority(
      "https://healthtimes.co.zw/2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/"
    );
    assert.deepEqual(authority,{
      sourceId:"33190",
      accessPolicy:"premium",
      premiumTeaserHtml:"<p>AUTHORIZED PUBLIC TEASER</p>"
    });
    assert.equal(requests.length,1);
    assert.match(requests[0].url,/\/rest\/v1\/rpc\/ag05_public_story_teaser_document$/);
    assert.equal(requests[0].options.headers.apikey,"sb_publishable_test");
    assert.deepEqual(JSON.parse(requests[0].options.body),{
      p_path:"/2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/"
    });

    const decision=authorityModule.sourceParityPremiumDetailDecision("public",authority,false);
    assert.equal(decision.accessPolicy,"premium");
    assert.equal(decision.includeWordPressContent,false);
    assert.equal(decision.premiumTeaserHtml,"<p>AUTHORIZED PUBLIC TEASER</p>");

    const missingTeaserDecision=authorityModule.sourceParityPremiumDetailDecision(
      "premium",
      null,
      false
    );
    assert.equal(missingTeaserDecision.includeWordPressContent,false);
    assert.equal(missingTeaserDecision.premiumTeaserHtml,null);
  }finally{
    global.fetch=previousFetch;
  }
});

test("malformed Premium projection remains Premium and falls to immediate paywall",async()=>{
  const previousFetch=global.fetch;
  global.fetch=async()=>({
    ok:true,
    async json(){
      return {
        source_id:"33190",
        access_policy:"premium_marker_review",
        body_html:"PROTECTED BODY MUST NOT BE CONSUMED",
        premium_teaser_html:"<p>TEASER</p><p>SECOND</p>"
      };
    }
  });

  try{
    const authorityModule=loadTs("src/services/premium-teaser-authority.ts",{
      mocks:{
        "../platform/config":{
          hasStagingConfig:true,
          stagingConfig:{url:"https://example.supabase.co",publishableKey:"sb_publishable_test"}
        }
      }
    });
    const authority=await authorityModule.getPublicPremiumTeaserAuthority(
      "https://healthtimes.co.zw/premium/"
    );
    assert.equal(authority.accessPolicy,"premium");
    assert.equal(authority.premiumTeaserHtml,null);
    const decision=authorityModule.sourceParityPremiumDetailDecision("public",authority,false);
    assert.equal(decision.includeWordPressContent,false);
  }finally{
    global.fetch=previousFetch;
  }
});

test("persistent 20-second preview refresh does not reset and prompt request is one-shot",async()=>{
  const values=new Map();
  const storage={
    async getItem(key){return values.has(key)?values.get(key):null;},
    async setItem(key,value){values.set(key,String(value));},
    async removeItem(key){values.delete(key);}
  };
  const originalNow=Date.now;
  let now=1_000_000;
  Date.now=()=>now;

  try{
    const module=loadTs("src/services/reader-persistence.ts",{
      mocks:{"@react-native-async-storage/async-storage":storage}
    });
    const reader=module.persistentReaderRepository;

    const first=await reader.getPremiumPreviewWindow("story-33190",20);
    assert.equal(first.remainingSeconds,20);
    const firstStartedAt=first.startedAt;

    now+=5_000;
    const refreshed=await reader.getPremiumPreviewWindow("story-33190",20);
    assert.equal(refreshed.startedAt,firstStartedAt);
    assert.equal(refreshed.remainingSeconds,15);

    now+=16_000;
    const expired=await reader.getPremiumPreviewWindow("story-33190",20);
    assert.equal(expired.startedAt,firstStartedAt);
    assert.equal(expired.remainingSeconds,0);

    assert.equal(await reader.requestPremiumPreviewPrompt("story-33190"),true);
    assert.equal(await reader.requestPremiumPreviewPrompt("story-33190"),false);
    assert.equal(await reader.requestPremiumPreviewPrompt("story-never-previewed"),false);
  }finally{
    Date.now=originalNow;
  }
});

test("UI-03 handoff state preserves expiry, commerce and dismissal semantics",()=>{
  const module=loadTs("src/growth/premium-consumer.ts");
  const available=module.premiumPreviewConsumerState({
    previewState:"preview",
    remainingSeconds:20,
    teaserAvailable:true,
    commerceStatus:"configuration-required",
    promptRequested:false
  });
  assert.deepEqual(available,{
    state:"available",
    remainingSeconds:20,
    teaserAvailable:true,
    commerceAvailable:false,
    commerceStatus:"configuration-required",
    promptRequested:false
  });

  const warning=module.premiumPreviewConsumerState({
    previewState:"warning",
    remainingSeconds:4,
    teaserAvailable:true,
    commerceStatus:"available",
    promptRequested:false
  });
  assert.equal(warning.state,"warning");
  assert.equal(warning.commerceAvailable,true);

  const expired=module.premiumPreviewConsumerState({
    previewState:"locked",
    remainingSeconds:0,
    teaserAvailable:true,
    commerceStatus:"configuration-required",
    promptRequested:true
  });
  assert.equal(expired.state,"expired");
  assert.equal(expired.promptRequested,true);

  const unavailable=module.premiumPreviewConsumerState({
    previewState:"locked",
    remainingSeconds:0,
    teaserAvailable:false,
    commerceStatus:"unavailable",
    promptRequested:false
  });
  assert.equal(unavailable.state,"unavailable");
});

test("Web commerce remains configuration-required and checkout cannot grant entitlement",async()=>{
  const previousEndpoint=process.env.EXPO_PUBLIC_HEALTHTIMES_COMMERCE_AUTHORITY_URL;
  const previousFetch=global.fetch;
  process.env.EXPO_PUBLIC_HEALTHTIMES_COMMERCE_AUTHORITY_URL="https://commerce.example.test/api/commerce";

  let mode="authority";
  global.fetch=async(url,options={})=>{
    if(mode==="authority"){
      assert.equal(options.method,"GET");
      return {
        ok:true,
        async json(){
          return {
            status:"authority-incomplete",
            paymentGatewayMigrationComplete:false,
            currentProvider:null,
            currentPrice:null,
            currentCurrency:null,
            productPlanIds:[]
          };
        }
      };
    }
    if(mode==="unavailable"){
      assert.equal(options.method,"POST");
      assert.match(String(url),/action=checkout/);
      return {
        ok:false,
        status:503,
        async json(){
          return {
            status:"configuration-required",
            checkoutUrl:null,
            entitlementGranted:false
          };
        }
      };
    }
    return {
      ok:true,
      async json(){
        return {
          status:"ready",
          checkoutUrl:"https://provider.example.test/checkout/session",
          entitlementGranted:true
        };
      }
    };
  };

  try{
    const module=loadTs("src/growth/premium-commerce.ts",{
      mocks:{"react-native":{Platform:{OS:"web"}}}
    });
    const service=module.createPremiumCommerceService();

    const authority=await service.getAuthority();
    assert.equal(authority.status,"configuration-required");
    assert.equal(authority.provider,null);
    assert.equal(authority.price,null);
    assert.equal(authority.currency,null);
    assert.equal(authority.checkoutUrl,null);
    assert.equal(authority.entitlementGranted,false);

    mode="unavailable";
    const unavailable=await service.startCheckout();
    assert.equal(unavailable.status,"configuration-required");
    assert.equal(unavailable.checkoutUrl,null);
    assert.equal(unavailable.entitlementGranted,false);

    mode="future";
    const redirect=await service.startCheckout();
    assert.equal(redirect.status,"redirect-required");
    assert.equal(redirect.checkoutUrl,"https://provider.example.test/checkout/session");
    assert.equal(
      redirect.entitlementGranted,
      false,
      "Even a checkout response may not directly unlock Premium content"
    );
  }finally{
    if(previousEndpoint===undefined) delete process.env.EXPO_PUBLIC_HEALTHTIMES_COMMERCE_AUTHORITY_URL;
    else process.env.EXPO_PUBLIC_HEALTHTIMES_COMMERCE_AUTHORITY_URL=previousEndpoint;
    global.fetch=previousFetch;
  }
});

test("iOS and Android commerce consumers never bypass native storefront through web checkout",async()=>{
  const previousEndpoint=process.env.EXPO_PUBLIC_HEALTHTIMES_COMMERCE_AUTHORITY_URL;
  const previousFetch=global.fetch;
  process.env.EXPO_PUBLIC_HEALTHTIMES_COMMERCE_AUTHORITY_URL="https://commerce.example.test/api/commerce";
  let fetchCount=0;
  global.fetch=async()=>{fetchCount+=1;throw new Error("native must not call web commerce");};

  try{
    for(const os of ["ios","android"]){
      const module=loadTs("src/growth/premium-commerce.ts",{
        mocks:{"react-native":{Platform:{OS:os}}}
      });
      const service=module.createPremiumCommerceService();
      const authority=await service.getAuthority();
      const checkout=await service.startCheckout();

      assert.equal(authority.channel,"native-store");
      assert.equal(authority.status,"configuration-required");
      assert.equal(authority.entitlementGranted,false);
      assert.equal(checkout.status,"configuration-required");
      assert.equal(checkout.checkoutUrl,null);
      assert.equal(checkout.entitlementGranted,false);
    }
    assert.equal(fetchCount,0);
  }finally{
    if(previousEndpoint===undefined) delete process.env.EXPO_PUBLIC_HEALTHTIMES_COMMERCE_AUTHORITY_URL;
    else process.env.EXPO_PUBLIC_HEALTHTIMES_COMMERCE_AUTHORITY_URL=previousEndpoint;
    global.fetch=previousFetch;
  }
});

test("repository integration preserves protected-body and platform authority boundaries",()=>{
  const sourceParity=read("src/services/source-parity.ts");
  const snapshot=read("src/source-parity/snapshot.ts");
  const migrated=read("src/services/migrated-corpus.ts");
  const mapper=read("src/services/migrated-corpus-mapper.ts");
  const article=read("app/article/[id].tsx");
  const premium=read("app/premium.tsx");
  const commerce=read("src/growth/premium-commerce.ts");

  assert.match(sourceParity,/wpPostQuery\(\{includeContent:false\}\)/);
  assert.match(sourceParity,/const metadataPost=metadata\?\.\[0\] \?\? null/);
  assert.match(sourceParity,/trustedPremiumSourceUrl=metadataPost\?\.link/);
  assert.match(sourceParity,/getPublicPremiumTeaserAuthority\(trustedPremiumSourceUrl\)/);
  assert.match(sourceParity,/if\(!detailDecision\.includeWordPressContent\)\{[\s\S]*return boundedCurrent/);
  assert.match(sourceParity,/wpPostQuery\(\{includeContent:true\}\)/);
  assert.doesNotMatch(sourceParity,/getPublicPremiumTeaserAuthority\(current\.canonicalUrl\)/);
  assert.ok(
    sourceParity.indexOf("wpPostQuery({includeContent:false})") <
      sourceParity.indexOf("getPublicPremiumTeaserAuthority(trustedPremiumSourceUrl)")
  );
  assert.ok(
    sourceParity.indexOf("getPublicPremiumTeaserAuthority(trustedPremiumSourceUrl)") <
      sourceParity.indexOf("wpPostQuery({includeContent:true})")
  );
  assert.match(sourceParity,/bodyHtml:accessPolicy==="premium" \? null/);
  assert.match(snapshot,/accessPolicy:"premium"/);
  assert.match(snapshot,/source_id 33190/);

  assert.match(migrated,/ag05_public_story_teaser_document/);
  assert.match(migrated,/ag05_public_story_document/);
  assert.match(mapper,/bodyHtml: accessPolicy === "public" \? doc\.body_html : null/);
  assert.match(mapper,/premiumTeaserHtml: accessPolicy === "premium"/);

  assert.match(article,/premiumPreviewConsumerState/);
  assert.match(article,/requestPremiumPreviewPrompt/);
  assert.match(article,/previewConfig\.seconds===20/);
  assert.match(article,/services\.premium\.getProtectedArticle/);
  assert.match(article,/entitlement\.data!==true/);

  assert.match(premium,/Platform\.OS==="web"/);
  assert.match(premium,/services\.premiumCommerce\.startCheckout/);
  assert.match(premium,/services\.premiumStore\.startPurchase/);
  assert.doesNotMatch(premium,/event\("subscription_completed"/);

  assert.match(commerce,/Platform\.OS!=="web"/);
  assert.match(commerce,/EXPO_PUBLIC_HEALTHTIMES_COMMERCE_AUTHORITY_URL/);
  assert.doesNotMatch(commerce,/paynow|paypal|US\$5|ca-app-pub/i);
});
