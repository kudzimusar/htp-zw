import type { ArticleDetail, SearchQuery, SearchResult, TaxonomyRef } from "../domain/models";
import type { ArticleRepository, SearchService, TaxonomyService } from "../domain/contracts";
import type { SourceException } from "../domain/source";
import { scoreReaderSearch } from "../reader/search-ranking";
import { stagingConfig } from "../platform/config";
import { getStagingSupabaseClient } from "../platform/supabase";
import { sourceParityServices } from "./source-parity";

type FeedRow = {
  title: string;
  canonical_url: string | null;
  published_at: string | null;
  modified_at: string | null;
  author_name: string | null;
  description: string | null;
};

type StoryDocument = {
  story_id: string;
  source_id: string | null;
  source_type: string | null;
  source_url: string | null;
  old_path: string | null;
  new_path: string | null;
  title: string | null;
  story_title: string | null;
  description: string | null;
  canonical_url: string | null;
  featured_storage_object: string | null;
  featured_source_url: string | null;
  featured_alt_text: string | null;
  published_at: string | null;
  modified_at: string | null;
  author: { name?: string; slug?: string; bio?: string | null } | null;
  section: { name?: string; slug?: string } | null;
  access_policy: string | null;
  body_html: string | null;
  standfirst: string | null;
  excerpt: string | null;
};

type PathResolution = { resolution?: string; http_status?: number; target_path?: string | null };

const CACHE_MS=120_000;
let cache:{at:number;articles:ArticleDetail[]}|null=null;

async function rpc<T>(name:string,args:Record<string,unknown>):Promise<T>{
  const client=getStagingSupabaseClient() as any;
  const {data,error}=await client.rpc(name,args);
  if(error) throw new Error(error.message || "HealthTimes migrated-content request failed.");
  return data as T;
}
function pathFromUrl(value:string|null){
  if(!value) return null;
  try{
    const parsed=new URL(value);
    if(parsed.hostname!=="healthtimes.co.zw" && parsed.hostname!=="www.healthtimes.co.zw") return null;
    return parsed.pathname.endsWith("/") ? parsed.pathname : parsed.pathname+"/";
  }catch{return null;}
}
function slugFromPath(value:string|null){return value ? (value.split("/").filter(Boolean).at(-1) ?? "") : "";}
function storagePublicUrl(objectName:string|null){
  if(!objectName) return null;
  return stagingConfig.url+"/storage/v1/object/public/migrated-media/"+objectName.split("/").map(encodeURIComponent).join("/");
}
function mapDocument(doc:StoryDocument):ArticleDetail{
  const rawAccess=(doc.access_policy ?? "unknown").toLowerCase();
  const accessPolicy=rawAccess==="public" ? "public" as const : "premium" as const;
  const canonicalPath=pathFromUrl(doc.canonical_url) ?? doc.old_path ?? doc.new_path;
  const slug=slugFromPath(canonicalPath) || String(doc.source_id ?? doc.story_id);
  const exceptions:SourceException[]=[];
  if(rawAccess!=="public" && rawAccess!=="premium"){
    exceptions.push({kind:"premium-history-unresolved",classification:"requires-review",field:"accessPolicy",note:"Migrated source access marker remains unresolved; Native fails closed as Premium."});
  }
  const authorSlug=doc.author?.slug?.trim() || "healthtimes";
  const sectionSlug=doc.section?.slug?.trim() || "";
  const heroUrl=storagePublicUrl(doc.featured_storage_object) ?? doc.featured_source_url ?? null;
  return {
    id:doc.story_id,canonicalStoryId:doc.story_id,
    title:doc.story_title?.trim() || doc.title?.trim() || slug,slug,
    standfirst:doc.standfirst ?? doc.description ?? null,excerpt:doc.excerpt ?? doc.description ?? null,
    bodyHtml:accessPolicy==="public" ? doc.body_html : null,canonicalUrl:doc.canonical_url,
    accessPolicy,status:"published",publishedAt:doc.published_at,modifiedAt:doc.modified_at,
    author:doc.author?.name ? {
      id:"wordpress-author:"+authorSlug,displayName:String(doc.author.name),slug:authorSlug,
      sourceProvenance:{system:"wordpress",sourceId:null,stableKey:"wordpress-author:"+authorSlug,sourceUrl:null,checksum:null,capturedAt:null,exceptions:[]}
    } : null,
    primarySection:sectionSlug ? {id:"ag05-section:"+sectionSlug,name:String(doc.section?.name ?? sectionSlug),slug:sectionSlug} : null,
    geography:[],geographyRefs:[],topics:[],legacyTaxonomy:[],
    heroMedia:heroUrl ? {
      id:"ag05-media:"+doc.story_id,publicUrl:heroUrl,altText:doc.featured_alt_text,caption:null,credit:null,
      sourceProvenance:{system:"wordpress",sourceId:null,stableKey:doc.featured_storage_object ? "migrated-media:"+doc.featured_storage_object : null,sourceUrl:doc.featured_source_url,checksum:null,capturedAt:null,exceptions:[]}
    } : null,
    sourceProvenance:{
      system:"wordpress",sourceId:doc.source_id,
      stableKey:doc.source_id ? "wordpress-"+String(doc.source_type ?? "post")+":"+doc.source_id : null,
      sourceUrl:doc.source_url ?? doc.canonical_url,checksum:null,capturedAt:null,
      wordpress:{postId:doc.source_id ?? undefined,legacyPath:doc.old_path ?? undefined},exceptions
    },
    contentIntegrity:exceptions.length ? "requires-review" : "verified",
    premiumSourceContext:{accessPolicy,legacyMembershipSignal:accessPolicy==="premium" ? "unknown" : "none",providerReferencePresent:false,reconciliation:exceptions.length ? "requires-review" : "match"}
  };
}
async function storyDocumentForPath(path:string){
  const doc=await rpc<StoryDocument|null>("ag05_public_story_document",{p_path:path});
  return doc?.story_id ? mapDocument(doc) : null;
}
async function storyDocumentForUrl(url:string|null){const path=pathFromUrl(url);return path ? storyDocumentForPath(path) : null;}
async function mapInBatches<T,R>(items:T[],size:number,fn:(item:T)=>Promise<R>){
  const output:R[]=[];for(let index=0;index<items.length;index+=size) output.push(...await Promise.all(items.slice(index,index+size).map(fn)));return output;
}
async function refreshedArticles(){
  if(cache && Date.now()-cache.at<CACHE_MS) return cache.articles;
  const feed=await rpc<FeedRow[]>("ag05_public_feed_rows",{p_limit:60});
  const mapped=await mapInBatches(feed ?? [],6,storyDocumentForUrl);
  const articles=mapped.filter((article):article is ArticleDetail=>Boolean(article));
  cache={at:Date.now(),articles};return articles;
}
async function resolveRequestedPath(id:string){
  if(id.startsWith("/")) return id.endsWith("/") ? id : id+"/";
  const direct="/"+id.replace(/^\/+|\/+$/g,"")+"/";
  const resolution=await rpc<PathResolution|null>("ag05_resolve_public_path",{p_path:direct});
  return typeof resolution?.target_path==="string" && resolution.target_path.startsWith("/") ? resolution.target_path : direct;
}
const articles:ArticleRepository={
  async getHome(){return refreshedArticles();},
  async getById(id){
    const current=(await refreshedArticles()).find((article)=>article.id===id || article.slug===id);
    if(current) return current;
    if(/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)) return null;
    return storyDocumentForPath(await resolveRequestedPath(id));
  },
  async getRelated(id){
    const all=await refreshedArticles();const current=all.find((article)=>article.id===id || article.slug===id);
    if(!current) return all.slice(0,3);
    return all.filter((article)=>article.id!==current.id).sort((a,b)=>(b.primarySection?.slug===current.primarySection?.slug?1:0)-(a.primarySection?.slug===current.primarySection?.slug?1:0)).slice(0,3);
  },
  async listBySection(sectionSlug){return (await refreshedArticles()).filter((article)=>article.primarySection?.slug===sectionSlug);},
  async listByAuthor(authorSlug){return (await refreshedArticles()).filter((article)=>article.author?.slug===authorSlug);}
};
const normalized=(value:string)=>value.trim().toLowerCase();
const publishedTime=(value:string|null)=>{const t=value?new Date(value).getTime():0;return Number.isFinite(t)?t:0;};
const search:SearchService={
  async search(query:SearchQuery):Promise<SearchResult>{
    const all=await refreshedArticles();const q=query.text.trim();
    const articleMatches=query.format && query.format!=="article" ? [] : all.filter((article)=>{
      if(query.country){const country=normalized(query.country);if(!article.geography.some((zone)=>normalized(zone.name)===country||normalized(zone.slug)===country))return false;}
      if(query.topic){const topic=normalized(query.topic);if(normalized(article.primarySection?.name??"")!==topic&&normalized(article.primarySection?.slug??"")!==topic)return false;}
      return true;
    }).map((article)=>({article,score:scoreReaderSearch(q,{title:article.title,slug:article.slug,standfirst:article.standfirst,excerpt:article.excerpt,author:article.author?.displayName??null,section:article.primarySection?.name??null,taxonomy:article.topics.map((term)=>term.name),geography:article.geography.map((zone)=>zone.name),publishedAt:article.publishedAt})}))
      .filter((entry):entry is {article:ArticleDetail;score:number}=>entry.score!==null)
      .sort((a,b)=>b.score-a.score||publishedTime(b.article.publishedAt)-publishedTime(a.article.publishedAt)).map((entry)=>entry.article);
    const parity=await sourceParityServices.search.search({...query,format:query.format});return {...parity,articles:articleMatches};
  }
};
const taxonomy:TaxonomyService={
  async getSnapshot(){
    const [baseSnapshot,items]=await Promise.all([sourceParityServices.taxonomy.getSnapshot(),refreshedArticles()]);
    const sections=new Map<string,TaxonomyRef & {parentId:string|null}>();for(const section of baseSnapshot.sections)sections.set(section.slug,section);
    for(const item of items)if(item.primarySection)sections.set(item.primarySection.slug,{...item.primarySection,parentId:null});
    return {...baseSnapshot,sections:Array.from(sections.values())};
  }
};
export const stagingEditorialServices={...sourceParityServices,articles,search,taxonomy};
