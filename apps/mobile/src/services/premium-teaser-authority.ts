import type { AccessPolicy } from "../domain/models";
import { hasStagingConfig, stagingConfig } from "../platform/config";

type PublicTeaserProjection = {
  source_id?: string | number | null;
  access_policy?: string | null;
  body_html?: string | null;
  premium_teaser_html?: string | null;
};

export type PremiumTeaserAuthority = {
  sourceId: string | null;
  accessPolicy: AccessPolicy;
  premiumTeaserHtml: string | null;
};

export function canonicalPremiumSourcePath(value:string|null|undefined){
  if(!value?.trim()) return null;
  try{
    const url=new URL(value);
    const path=url.pathname.replace(/\/{2,}/g,"/");
    return path.endsWith("/") ? path : path+"/";
  }catch{
    return null;
  }
}

function oneEditorialParagraph(value:string|null|undefined){
  const html=value?.trim() ?? "";
  if(!html || /<(?:script|style)\b/i.test(html)) return null;
  const paragraphs=html.match(/<p(?:\s[^>]*)?>[\s\S]*?<\/p>/gi) ?? [];
  if(paragraphs.length!==1) return null;
  return paragraphs[0].trim()===html ? html : null;
}

export function sourceParityPremiumDetailDecision(
  currentAccessPolicy:AccessPolicy,
  authority:PremiumTeaserAuthority|null,
  taxonomyUnresolved:boolean
){
  const accessPolicy:AccessPolicy=
    currentAccessPolicy==="premium" || authority?.accessPolicy==="premium"
      ? "premium"
      : "public";
  return {
    accessPolicy,
    includeWordPressContent:accessPolicy==="public" && !taxonomyUnresolved,
    premiumTeaserHtml:
      accessPolicy==="premium" && authority?.accessPolicy==="premium"
        ? authority.premiumTeaserHtml
        : null
  };
}

export async function getPublicPremiumTeaserAuthority(
  canonicalUrl:string|null|undefined
):Promise<PremiumTeaserAuthority|null>{
  const path=canonicalPremiumSourcePath(canonicalUrl);
  if(!path || !hasStagingConfig) return null;

  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),7000);
  try{
    const response=await fetch(
      stagingConfig.url.replace(/\/$/,"")+"/rest/v1/rpc/ag05_public_story_teaser_document",
      {
        method:"POST",
        headers:{
          apikey:stagingConfig.publishableKey,
          Accept:"application/json",
          "Content-Type":"application/json",
          "x-healthtimes-client":"reader-nm05-source-parity-teaser"
        },
        body:JSON.stringify({p_path:path}),
        signal:controller.signal
      }
    );
    if(!response.ok) return null;

    const raw=await response.json() as PublicTeaserProjection|null;
    if(!raw || typeof raw!=="object") return null;

    const normalizedAccess=String(raw.access_policy ?? "").trim().toLowerCase();
    if(normalizedAccess==="public"){
      return {
        sourceId:raw.source_id===null || raw.source_id===undefined ? null : String(raw.source_id),
        accessPolicy:"public",
        premiumTeaserHtml:null
      };
    }

    if(!normalizedAccess) return null;

    // Once the bounded authority classifies a story as Premium, never downgrade
    // it merely because the teaser is unavailable or malformed. That state must
    // become an immediate paywall and must never authorize a WordPress body fetch.
    const teaser=raw.body_html===null ? oneEditorialParagraph(raw.premium_teaser_html) : null;
    return {
      sourceId:raw.source_id===null || raw.source_id===undefined ? null : String(raw.source_id),
      accessPolicy:"premium",
      premiumTeaserHtml:teaser
    };
  }catch{
    return null;
  }finally{
    clearTimeout(timeout);
  }
}
