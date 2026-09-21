import type {
  AdvertisingService,
  ArticleRepository,
  PublicationRepository,
  SearchService,
  TaxonomyService,
  VideoService
} from "../domain/contracts";
import type {
  ArticleDetail,
  ArticleSummary,
  AuthorProfile,
  SearchQuery,
  TaxonomyRef
} from "../domain/models";
import type { SourceException } from "../domain/source";
import { fixtureServices } from "./fixtures";
import { certifiedTaxonomyFixtureService } from "./taxonomy";
import {
  SOURCE_PARITY_PUBLIC_BASE_URL,
  SOURCE_PARITY_VERIFIED_AT,
  canonicalSectionForLegacy,
  sourceParityAdvertisingReference,
  sourceParityArticles,
  sourceParityAuthors,
  sourceParityPublication,
  sourceParityVideos
} from "../source-parity/snapshot";

type WpRendered={rendered?:string};
type WpTerm={id:number;name:string;slug:string;taxonomy?:string};
type WpAuthor={id:number;name:string;slug:string;link?:string};
type WpMedia={
  id:number;
  source_url?:string;
  alt_text?:string;
  caption?:WpRendered;
};
type WpPost={
  id:number;
  date?:string;
  modified?:string;
  slug:string;
  link?:string;
  author?:number;
  featured_media?:number;
  categories?:number[];
  tags?:number[];
  title?:WpRendered;
  excerpt?:WpRendered;
  content?:WpRendered;
  _embedded?:{
    author?:WpAuthor[];
    "wp:featuredmedia"?:WpMedia[];
    "wp:term"?:WpTerm[][];
  };
};

const sourceBase=(process.env.EXPO_PUBLIC_HEALTHTIMES_SOURCE_BASE_URL || SOURCE_PARITY_PUBLIC_BASE_URL).replace(/\/$/,"");
const wpBase=sourceBase+"/wp-json/wp/v2";
const cache={at:0,articles:null as ArticleDetail[]|null};
const cacheMs=5*60*1000;
const wpMetadataFields=[
  "id","date","modified","slug","link","author","featured_media","categories","tags",
  "title","excerpt","_links","_embedded"
].join(",");
const wpPublicDetailFields=wpMetadataFields+",content";

function wpPostQuery(options:{includeContent:boolean}){
  return "&_embed=1&_fields="+encodeURIComponent(options.includeContent ? wpPublicDetailFields : wpMetadataFields);
}

function decodeEntities(value:string){
  const named:Record<string,string>={
    amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" ",ndash:"–",mdash:"—",rsquo:"’",lsquo:"‘",ldquo:"“",rdquo:"”",hellip:"…"
  };
  return value
    .replace(/&#(\d+);/g,(_,code)=>String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi,(_,code)=>String.fromCodePoint(parseInt(code,16)))
    .replace(/&([a-z]+);/gi,(match,name)=>named[name.toLowerCase()] ?? match);
}

function stripHtml(value:string|undefined){
  return decodeEntities((value ?? "").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim());
}

function flattenTerms(post:WpPost){
  return (post._embedded?.["wp:term"] ?? []).flat().filter(Boolean);
}

function legacyTaxonomy(post:WpPost):TaxonomyRef[]{
  const terms=flattenTerms(post);
  const seen=new Set<string>();
  return terms
    .filter((term)=>term.taxonomy==="category" || term.taxonomy==="post_tag")
    .filter((term)=>{
      const key=term.taxonomy+":"+term.id;
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((term)=>({id:"wordpress-term-"+term.id,name:decodeEntities(term.name),slug:term.slug}));
}

const canonicalLegacyNames=new Set([
  "africa",
  "global health",
  "health financing",
  "reseach findings",
  "research & findings",
  "academic & research",
  "policy",
  "public health",
  "health news",
  "hiv/aids",
  "epidemics",
  "family health",
  "srhr"
]);

function inferPrimarySection(legacyNames:string[],fallback:ArticleDetail|null){
  if(fallback?.primarySection) return fallback.primarySection;
  const normalized=legacyNames.map((name)=>name.toLowerCase());
  if(!normalized.some((name)=>canonicalLegacyNames.has(name))) return null;
  return canonicalSectionForLegacy(legacyNames);
}

function inferGeography(post:WpPost,fallback:ArticleDetail|null){
  if(fallback?.geography?.length) return fallback.geography;
  const categories=legacyTaxonomy(post).map((term)=>term.name.toLowerCase());
  const text=(stripHtml(post.title?.rendered)+" "+stripHtml(post.excerpt?.rendered)).toLowerCase();
  if(categories.includes("africa")) return [{id:"zone-africa",name:"Africa",slug:"africa"}];
  if(categories.includes("global health")) return [{id:"zone-global",name:"Global",slug:"global"}];
  if(/\bzimbabwe\b|\bharare\b|\bbulawayo\b|\bmutare\b|\bmasvingo\b|\bmidlands\b/.test(text)){
    return [{id:"zone-zimbabwe",name:"Zimbabwe",slug:"zimbabwe"}];
  }
  return [];
}

function mappingExceptions(
  post:WpPost,
  fallback:ArticleDetail|null,
  legacy:TaxonomyRef[],
  embeddedAuthor:WpAuthor|undefined,
  media:WpMedia|undefined,
  primarySection:TaxonomyRef|null,
  geography:TaxonomyRef[]
):SourceException[]{
  const exceptions:SourceException[]=[];
  const taxonomyIds=[...(post.categories ?? []),...(post.tags ?? [])];
  if(taxonomyIds.length && !legacy.length){
    exceptions.push({
      kind:"taxonomy-unresolved",
      classification:"requires-review",
      field:"legacyTaxonomy",
      note:"WordPress term IDs were present but _embed did not supply resolvable category/tag records."
    });
  }
  if(post.author && !embeddedAuthor && !fallback?.author){
    exceptions.push({
      kind:"author-unresolved",
      classification:"requires-review",
      field:"author",
      note:"WordPress author ID is preserved, but the public _embed response did not include a verified display identity."
    });
  }
  if(post.featured_media && !media && !fallback?.heroMedia){
    exceptions.push({
      kind:"missing-media",
      classification:"requires-review",
      field:"heroMedia",
      note:"WordPress featured-media ID is preserved, but the public _embed response did not include a verified media record."
    });
  }
  if(!primarySection){
    exceptions.push({
      kind:"taxonomy-unresolved",
      classification:"requires-review",
      field:"primarySection",
      note:"No AG-01 canonical desk is inferred because the observed legacy taxonomy has no explicit approved mapping."
    });
  }
  if(!geography.length){
    exceptions.push({
      kind:"other",
      classification:"requires-review",
      field:"geography",
      note:"Geography is left unassigned because the public source metadata does not provide enough evidence for a verified mapping."
    });
  }
  const rawBody=post.content?.rendered ?? "";
  if(/\[[a-z][a-z0-9_-]*(?:\s[^\]]*)?\]/i.test(rawBody)){
    exceptions.push({
      kind:"unknown-shortcode",
      classification:"requires-review",
      field:"bodyHtml",
      note:"The public rendered body still contains shortcode-like syntax and requires migration-time reconciliation."
    });
  }
  if(!stripHtml(post.excerpt?.rendered) && !fallback?.excerpt){
    exceptions.push({
      kind:"other",
      classification:"requires-review",
      field:"excerpt",
      note:"No public excerpt/standfirst was supplied for this post."
    });
  }
  return exceptions;
}

function mapWpPost(post:WpPost,fallback:ArticleDetail|null):ArticleDetail{
  const legacy=legacyTaxonomy(post);
  const legacyNames=legacy.map((term)=>term.name);
  const accessPolicy=
    fallback?.accessPolicy==="premium" ||
    legacyNames.some((name)=>name.toLowerCase()==="healthtimes premium")
      ? "premium"
      : "public";
  const embeddedAuthor=post._embedded?.author?.[0];
  const media=post._embedded?.["wp:featuredmedia"]?.[0];
  const canonicalUrl=post.link || fallback?.canonicalUrl || sourceBase+"/"+post.slug+"/";
  const excerpt=stripHtml(post.excerpt?.rendered) || fallback?.excerpt || null;
  const authorName=embeddedAuthor?.name ? decodeEntities(embeddedAuthor.name) : fallback?.author?.displayName ?? "HealthTimes";
  const authorSlug=embeddedAuthor?.slug || fallback?.author?.slug || "healthtimes";
  const authorId=embeddedAuthor?.id ?? post.author ?? null;
  const primarySection=inferPrimarySection(legacyNames,fallback);
  const geography=inferGeography(post,fallback);
  const exceptions=mappingExceptions(post,fallback,legacy,embeddedAuthor,media,primarySection,geography);
  return {
    id:fallback?.id ?? "source-"+post.slug,
    title:stripHtml(post.title?.rendered) || fallback?.title || post.slug,
    slug:post.slug,
    standfirst:excerpt || fallback?.standfirst || null,
    excerpt,
    bodyHtml:accessPolicy==="premium" ? null : (post.content?.rendered ?? fallback?.bodyHtml ?? null),
    canonicalUrl,
    accessPolicy,
    status:"published",
    publishedAt:post.date || fallback?.publishedAt || null,
    modifiedAt:post.modified || fallback?.modifiedAt || null,
    author:{
      id:authorId ? "wordpress-author-"+authorId : fallback?.author?.id ?? "source-author-"+authorSlug,
      displayName:authorName,
      slug:authorSlug,
      sourceProvenance:{
        system:"wordpress",
        sourceId:authorId ? String(authorId) : null,
        stableKey:authorId ? "wordpress-author:"+authorId : "wordpress-author:"+authorSlug,
        sourceUrl:embeddedAuthor?.link ?? fallback?.author?.sourceProvenance?.sourceUrl ?? null,
        checksum:null,
        capturedAt:new Date().toISOString(),
        wordpress:{authorId:authorId ? String(authorId) : undefined},
        exceptions:post.author && !embeddedAuthor && !fallback?.author ? [{
          kind:"author-unresolved",
          classification:"requires-review",
          field:"author",
          note:"The WordPress author ID is preserved but the public _embed response did not provide a verified display identity."
        }] : []
      }
    },
    primarySection,
    geography,
    geographyRefs:fallback?.geographyRefs,
    topics:legacy,
    legacyTaxonomy:legacy,
    heroMedia:media?.source_url ? {
      id:"wordpress-media-"+media.id,
      publicUrl:media.source_url,
      altText:media.alt_text || fallback?.heroMedia?.altText || null,
      caption:stripHtml(media.caption?.rendered) || null,
      credit:fallback?.heroMedia?.credit ?? null,
      sourceProvenance:{
        system:"wordpress",
        sourceId:String(media.id),
        stableKey:"wordpress-media:"+media.id,
        sourceUrl:media.source_url,
        checksum:null,
        capturedAt:new Date().toISOString(),
        wordpress:{featuredMediaId:String(media.id)},
        exceptions:[]
      }
    } : fallback?.heroMedia ?? null,
    sourceProvenance:{
      system:"wordpress",
      sourceId:String(post.id),
      stableKey:"wordpress-post:"+post.id,
      sourceUrl:canonicalUrl,
      checksum:null,
      capturedAt:new Date().toISOString(),
      wordpress:{
        postId:String(post.id),
        authorId:post.author ? String(post.author) : undefined,
        featuredMediaId:post.featured_media ? String(post.featured_media) : undefined,
        categoryIds:(post.categories ?? []).map(String),
        tagIds:(post.tags ?? []).map(String),
        legacyPath:"/"+post.slug+"/"
      },
      exceptions
    },
    contentIntegrity:"requires-review",
    premiumSourceContext:{
      accessPolicy,
      legacyMembershipSignal:accessPolicy==="premium" ? "wordpress-premium" : "none",
      providerReferencePresent:false,
      reconciliation:"requires-review"
    }
  };
}

async function sourceGet<T>(path:string):Promise<T|null>{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),7000);
  try{
    const response=await fetch(wpBase+path,{
      method:"GET",
      credentials:"omit",
      headers:{Accept:"application/json"},
      signal:controller.signal
    });
    if(!response.ok) return null;
    return await response.json() as T;
  }catch{
    return null;
  }finally{
    clearTimeout(timeout);
  }
}

function snapshotBySlug(){
  return new Map(sourceParityArticles.map((article)=>[article.slug,article]));
}

async function refreshedArticles():Promise<ArticleDetail[]>{
  if(cache.articles && Date.now()-cache.at<cacheMs) return cache.articles;
  const fallbackBySlug=snapshotBySlug();
  const live=await sourceGet<WpPost[]>("/posts?per_page=50&status=publish&orderby=date&order=desc"+wpPostQuery({includeContent:false}));
  if(!live){
    cache.at=Date.now();
    cache.articles=sourceParityArticles;
    return sourceParityArticles;
  }
  const refreshed=new Map<string,ArticleDetail>();
  for(const post of live){
    const fallback=fallbackBySlug.get(post.slug) ?? null;
    refreshed.set(post.slug,mapWpPost(post,fallback));
  }

  const liveArticles=Array.from(refreshed.values()).sort((a,b)=>{
    const aTime=a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime=b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime-aTime;
  });
  const liveSlugs=new Set(liveArticles.map((article)=>article.slug));
  const snapshotFallbacks=sourceParityArticles.filter((article)=>!liveSlugs.has(article.slug));
  const merged=[...liveArticles,...snapshotFallbacks];

  cache.at=Date.now();
  cache.articles=merged;
  return merged;
}

const articleRepository:ArticleRepository={
  async getHome(){
    return refreshedArticles();
  },
  async getById(id){
    const current=(await refreshedArticles()).find((article)=>article.id===id) ?? null;
    if(!current) return null;
    const taxonomyUnresolved=(current.sourceProvenance?.exceptions ?? []).some((exception)=>
      exception.kind==="taxonomy-unresolved" &&
      (exception.field==="legacyTaxonomy" || exception.field==="primarySection")
    );
    const includeContent=current.accessPolicy==="public" && !taxonomyUnresolved;
    const live=await sourceGet<WpPost[]>(
      "/posts?slug="+encodeURIComponent(current.slug)+"&status=publish"+wpPostQuery({includeContent})
    );
    return live?.[0] ? mapWpPost(live[0],current) : current;
  },
  async getRelated(id){
    const all=await refreshedArticles();
    const current=all.find((article)=>article.id===id);
    if(!current) return all.slice(0,3);
    const terms=new Set((current.legacyTaxonomy ?? current.topics).map((term)=>term.slug));
    return all
      .filter((article)=>article.id!==id)
      .sort((a,b)=>{
        const aScore=(a.legacyTaxonomy ?? a.topics).filter((term)=>terms.has(term.slug)).length;
        const bScore=(b.legacyTaxonomy ?? b.topics).filter((term)=>terms.has(term.slug)).length;
        return bScore-aScore;
      })
      .slice(0,3);
  },
  async listBySection(sectionSlug){
    const all=await refreshedArticles();
    return all.filter((article)=>
      article.primarySection?.slug===sectionSlug ||
      (article.legacyTaxonomy ?? []).some((term)=>term.slug===sectionSlug)
    );
  },
  async listByAuthor(authorSlug){
    const all=await refreshedArticles();
    return all.filter((article)=>article.author?.slug===authorSlug);
  }
};

const normalized=(value:string)=>value.trim().toLowerCase();

const searchService:SearchService={
  async search(query:SearchQuery){
    const all=await refreshedArticles();
    const q=normalized(query.text);
    const articles=query.format && query.format!=="article" ? [] : all.filter((article)=>{
      if(query.country){
        const country=normalized(query.country);
        if(!article.geography.some((zone)=>normalized(zone.name)===country || normalized(zone.slug)===country)) return false;
      }
      if(query.topic){
        const topic=normalized(query.topic);
        const topicMatch=
          normalized(article.primarySection?.name ?? "")===topic ||
          normalized(article.primarySection?.slug ?? "")===topic ||
          article.topics.some((term)=>normalized(term.name)===topic || normalized(term.slug)===topic) ||
          (article.legacyTaxonomy ?? []).some((term)=>normalized(term.name)===topic || normalized(term.slug)===topic);
        if(!topicMatch) return false;
      }
      if(!q) return true;
      const haystack=[
        article.title,
        article.standfirst ?? "",
        article.excerpt ?? "",
        article.author?.displayName ?? "",
        article.primarySection?.name ?? "",
        ...(article.legacyTaxonomy ?? []).map((term)=>term.name),
        ...article.geography.map((zone)=>zone.name)
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
    const authors=query.format
      ? []
      : (await parityAuthors()).filter((author)=>{
          if(!q) return true;
          return [
            author.displayName,
            author.role ?? "",
            author.bio ?? ""
          ].join(" ").toLowerCase().includes(q);
        });
    const videos=query.format && query.format!=="video"
      ? []
      : sourceParityVideos.filter((item)=>!q || item.title.toLowerCase().includes(q));
    return {articles,authors,videos,audio:[],live:[]};
  }
};

const videoService:VideoService={
  async list(){
    return sourceParityVideos;
  }
};

async function parityAuthors():Promise<AuthorProfile[]>{
  const profiles=new Map(sourceParityAuthors.map((author)=>[author.slug,author]));
  const articles=await refreshedArticles();
  for(const article of articles){
    const author=article.author;
    if(!author) continue;
    const existing=profiles.get(author.slug);
    profiles.set(author.slug,{
      id:author.id,
      displayName:author.displayName,
      slug:author.slug,
      role:existing?.role ?? null,
      bio:existing?.bio ?? null,
      sourceUrl:author.sourceProvenance?.sourceUrl ?? existing?.sourceUrl ?? null,
      sourceProvenance:author.sourceProvenance ?? existing?.sourceProvenance ?? null
    });
  }
  return Array.from(profiles.values()).sort((a,b)=>a.displayName.localeCompare(b.displayName));
}

const publicationRepository:PublicationRepository={
  async getProfile(){
    return sourceParityPublication;
  },
  async listAuthors(){
    return parityAuthors();
  },
  async getAuthor(slug){
    const authors=await parityAuthors();
    return authors.find((author)=>author.slug===slug) ?? null;
  }
};

const taxonomyService:TaxonomyService={
  async getSnapshot(){
    const canonical=await certifiedTaxonomyFixtureService.getSnapshot();
    const articles=await refreshedArticles();
    const observedLegacy=Array.from(new Map(
      articles.flatMap((article)=>article.legacyTaxonomy ?? []).map((term)=>[term.slug,term])
    ).values());
    const observedSections=Array.from(new Map(
      articles
        .map((article)=>article.primarySection)
        .filter((section):section is TaxonomyRef=>Boolean(section))
        .map((section)=>[section.slug,{...section,parentId:null}])
    ).values());
    return {
      ...canonical,
      sections:observedSections,
      topics:observedLegacy
    };
  }
};

const advertisingService:AdvertisingService={
  async getDecision(placementKey){
    return {
      placementKey,
      source:"none",
      personalization:"none",
      disclosureLabel:"Advertisement",
      policyReason:sourceParityAdvertisingReference.note,
      commercialSourceContext:{
        source:"direct",
        sourceReference:sourceParityAdvertisingReference.campaignName+" | "+sourceParityAdvertisingReference.articleUrl,
        reconciliation:"requires-review"
      }
    };
  }
};

export const sourceParityServices={
  ...fixtureServices,
  articles:articleRepository,
  search:searchService,
  video:videoService,
  audio:{async list(){return [];}},
  live:{async list(){return [];}},
  taxonomy:taxonomyService,
  publication:publicationRepository,
  advertising:advertisingService
};

export const sourceParityStatus={
  mode:"read-only-public-source" as const,
  sourceBase,
  verifiedAt:SOURCE_PARITY_VERIFIED_AT,
  ag03AuthoritativeSnapshotRequired:true,
  ag04ReplacementRequired:true
};
