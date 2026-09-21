export type ArticleInline={text:string;strong:boolean;emphasis:boolean;href:string|null};
export type ArticleListItem={inlines:ArticleInline[];children:ArticleListBlock[]};
export type ArticleListBlock={kind:"list";ordered:boolean;items:ArticleListItem[]};
export type ArticleFigureItem={src:string;alt:string|null;href:string|null;caption:ArticleInline[];credit:ArticleInline[]};
export type ArticleTableCell={inlines:ArticleInline[];header:boolean};
export type ArticleTableRow={cells:ArticleTableCell[]};
export type ArticleContentBlock=
|{kind:"paragraph";inlines:ArticleInline[]}
|{kind:"heading";level:2|3;inlines:ArticleInline[]}
|{kind:"blockquote";inlines:ArticleInline[]}
|{kind:"pullquote";inlines:ArticleInline[];credit:ArticleInline[]}
|ArticleListBlock
|({kind:"figure"}&ArticleFigureItem)
|{kind:"gallery";items:ArticleFigureItem[]}
|{kind:"table";caption:ArticleInline[];rows:ArticleTableRow[]}
|{kind:"document";href:string;label:ArticleInline[]}
|{kind:"media";mediaType:"audio"|"video";src:string;poster:string|null;caption:ArticleInline[]};

type TextNode={kind:"text";value:string};
type ElementNode={kind:"element";name:string;attrs:Record<string,string>;children:HtmlNode[]};
type HtmlNode=TextNode|ElementNode;
type ParsedTag={closing:boolean;name:string;attrs:Record<string,string>;selfClosing:boolean};

const ALLOWED_TAGS=new Set([
 "p","h2","h3","blockquote","ul","ol","li","figure","figcaption","img","a","strong","b","em","i","br","div","span",
 "table","thead","tbody","tfoot","tr","th","td","caption","cite","small","video","audio","source"
]);
const VOID_TAGS=new Set(["img","br","source"]);
const DROP_TAGS=new Set(["script","style","iframe","object","embed","form","input","button","template","noscript"]);
const KEPT_ATTRIBUTES=new Set(["href","src","alt","title","class","poster","type","download"]);

function decodeEntities(value:string){
 const named:Record<string,string>={amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" ",ndash:"–",mdash:"—",rsquo:"’",lsquo:"‘",ldquo:"“",rdquo:"”",hellip:"…"};
 return value.replace(/&#(\d+);/g,(m,c)=>{const p=Number(c);return Number.isFinite(p)?String.fromCodePoint(p):m;})
 .replace(/&#x([0-9a-f]+);/gi,(m,c)=>{const p=Number.parseInt(c,16);return Number.isFinite(p)?String.fromCodePoint(p):m;})
 .replace(/&([a-z]+);/gi,(m,n)=>named[n.toLowerCase()]??m);
}
function findTagEnd(html:string,start:number){let quote:'"'|"'"|null=null;for(let i=start;i<html.length;i+=1){const ch=html[i];if(!ch)continue;if(quote){if(ch===quote)quote=null;continue;}if(ch==='"'||ch==="'"){quote=ch;continue;}if(ch===">")return i;}return-1;}
function parseTag(raw:string):ParsedTag|null{
 const source=raw.trim();if(!source||source.startsWith("!")||source.startsWith("?"))return null;
 let cursor=0,closing=false;if(source[cursor]==="/"){closing=true;cursor+=1;}while(cursor<source.length&&/\s/.test(source[cursor]??""))cursor+=1;
 const start=cursor;while(cursor<source.length&&/[a-z0-9:-]/i.test(source[cursor]??""))cursor+=1;const name=source.slice(start,cursor).toLowerCase();
 if(!name)return null;if(closing)return{closing:true,name,attrs:{},selfClosing:false};const attrs:Record<string,string>={};
 while(cursor<source.length){while(cursor<source.length&&/[\s/]/.test(source[cursor]??""))cursor+=1;if(cursor>=source.length)break;
  const a=cursor;while(cursor<source.length&&/[^\s=/>]/.test(source[cursor]??""))cursor+=1;const attrName=source.slice(a,cursor).toLowerCase();while(cursor<source.length&&/\s/.test(source[cursor]??""))cursor+=1;let value="";
  if(source[cursor]==="="){cursor+=1;while(cursor<source.length&&/\s/.test(source[cursor]??""))cursor+=1;const q=source[cursor];
   if(q==='"'||q==="'"){cursor+=1;const s=cursor;while(cursor<source.length&&source[cursor]!==q)cursor+=1;value=source.slice(s,cursor);if(source[cursor]===q)cursor+=1;}
   else{const s=cursor;while(cursor<source.length&&/[^\s>]/.test(source[cursor]??""))cursor+=1;value=source.slice(s,cursor);}}
  if(attrName&&KEPT_ATTRIBUTES.has(attrName))attrs[attrName]=decodeEntities(value);}
 return{closing:false,name,attrs,selfClosing:source.endsWith("/")||VOID_TAGS.has(name)};
}
function parseHtml(html:string){
 const root:ElementNode={kind:"element",name:"root",attrs:{},children:[]},stack:ElementNode[]=[root];let blocked:string|null=null,depth=0,cursor=0;
 while(cursor<html.length){const open=html.indexOf("<",cursor);
  if(open<0){if(!blocked){const p=stack[stack.length-1];if(p)p.children.push({kind:"text",value:html.slice(cursor)});}break;}
  if(open>cursor&&!blocked){const p=stack[stack.length-1];if(p)p.children.push({kind:"text",value:html.slice(cursor,open)});}
  if(html.startsWith("<!--",open)){const end=html.indexOf("-->",open+4);cursor=end<0?html.length:end+3;continue;}
  const close=findTagEnd(html,open+1);if(close<0){if(!blocked){const p=stack[stack.length-1];if(p)p.children.push({kind:"text",value:html.slice(open)});}break;}
  const tag=parseTag(html.slice(open+1,close));cursor=close+1;if(!tag)continue;
  if(blocked){if(!tag.closing&&tag.name===blocked&&!tag.selfClosing)depth+=1;if(tag.closing&&tag.name===blocked){depth-=1;if(depth<=0){blocked=null;depth=0;}}continue;}
  if(!tag.closing&&DROP_TAGS.has(tag.name)){if(!tag.selfClosing){blocked=tag.name;depth=1;}continue;}if(!ALLOWED_TAGS.has(tag.name))continue;
  if(tag.closing){for(let i=stack.length-1;i>0;i-=1){if(stack[i]?.name===tag.name){stack.length=i;break;}}continue;}
  const p=stack[stack.length-1];if(!p)continue;const el:ElementNode={kind:"element",name:tag.name,attrs:tag.attrs,children:[]};p.children.push(el);if(!tag.selfClosing)stack.push(el);}
 return root;
}
function safeUrl(raw:string|undefined,base:string|null,media:boolean){
 const value=decodeEntities(raw??"").trim();if(!value||/[\u0000-\u001F]/.test(value))return null;
 try{const u=base?new URL(value,base):new URL(value),p=u.protocol.toLowerCase();if(media)return p==="https:"||p==="http:"?u.href:null;return p==="https:"||p==="http:"||p==="mailto:"?u.href:null;}catch{return null;}
}
function pushInline(out:ArticleInline[],text:string,state:Omit<ArticleInline,"text">){const value=decodeEntities(text).replace(/\s+/g," ");if(!value)return;const prev=out[out.length-1];if(prev&&prev.strong===state.strong&&prev.emphasis===state.emphasis&&prev.href===state.href){prev.text+=value;return;}out.push({text:value,...state});}
function collect(node:HtmlNode,out:ArticleInline[],base:string|null,state:Omit<ArticleInline,"text">){
 if(node.kind==="text"){pushInline(out,node.value,state);return;}
 if(node.name==="img"||node.name==="ul"||node.name==="ol"||node.name==="table"||node.name==="video"||node.name==="audio"||node.name==="source")return;
 if(node.name==="br"){pushInline(out,"\n",state);return;}
 const next={strong:state.strong||node.name==="strong"||node.name==="b",emphasis:state.emphasis||node.name==="em"||node.name==="i",href:node.name==="a"?safeUrl(node.attrs.href,base,false):state.href};
 for(const child of node.children)collect(child,out,base,next);
}
function inlines(nodes:HtmlNode[],base:string|null){const out:ArticleInline[]=[];for(const node of nodes)collect(node,out,base,{strong:false,emphasis:false,href:null});while(out.length&&!out[0]?.text.trim())out.shift();while(out.length&&!out[out.length-1]?.text.trim())out.pop();if(out[0])out[0].text=out[0].text.trimStart();const last=out[out.length-1];if(last)last.text=last.text.trimEnd();return out.filter(x=>x.text.length>0);}
function inlineText(items:ArticleInline[]){return items.map(x=>x.text).join("").trim();}
function elements(node:HtmlNode,name:string,out:ElementNode[]=[]):ElementNode[]{if(node.kind==="text")return out;if(node.name===name)out.push(node);for(const child of node.children)elements(child,name,out);return out;}
function findElement(node:HtmlNode,name:string):ElementNode|null{return elements(node,name,[])[0]??null;}
function imageFrom(node:ElementNode,base:string|null,link:string|null=null):ArticleFigureItem|null{
 const href=node.name==="a"?safeUrl(node.attrs.href,base,false):link;
 if(node.name==="img"){const src=safeUrl(node.attrs.src,base,true);return src?{src,alt:node.attrs.alt?.trim()||null,href,caption:[],credit:[]}:null;}
 for(const child of node.children){if(child.kind==="element"){const found=imageFrom(child,base,href);if(found)return found;}}
 return null;
}
function figureItem(node:ElementNode,base:string|null):ArticleFigureItem|null{
 const image=imageFrom(node,base);if(!image)return null;
 const cap=findElement(node,"figcaption"),credit=findElement(node,"cite")??findElement(node,"small");
 return{...image,caption:cap?inlines(cap.children.filter(child=>child!==credit),base):[],credit:credit?inlines(credit.children,base):[]};
}
function mediaFrom(node:ElementNode,base:string|null):ArticleContentBlock|null{
 const media=node.name==="audio"||node.name==="video"?node:(findElement(node,"video")??findElement(node,"audio"));
 if(!media)return null;
 const direct=safeUrl(media.attrs.src,base,true);
 const source=direct??elements(media,"source",[]).map(x=>safeUrl(x.attrs.src,base,true)).find(Boolean)??null;
 if(!source)return null;
 const caption=findElement(node,"figcaption");
 return{kind:"media",mediaType:media.name==="video"?"video":"audio",src:source,poster:safeUrl(media.attrs.poster,base,true),caption:caption?inlines(caption.children,base):[]};
}
function documentFrom(node:ElementNode,base:string|null):ArticleContentBlock|null{
 let link:ElementNode|null=null;
 if(node.name==="a")link=node;
 if(node.name==="p"){
   const significant=node.children.filter(child=>child.kind==="element"||child.value.trim());
   if(significant.length===1&&significant[0]?.kind==="element"&&significant[0].name==="a")link=significant[0];
 }
 if(!link)return null;
 const href=safeUrl(link.attrs.href,base,false);if(!href)return null;
 const path=href.split(/[?#]/)[0]?.toLowerCase()??"";
 const downloadable="download" in link.attrs||/\.(pdf|docx?|xlsx?|pptx?|csv|zip|rtf|txt)$/.test(path);
 if(!downloadable)return null;
 const label=inlines(link.children,base);
 return{kind:"document",href,label:inlineText(label)?label:[{text:"Download document",strong:false,emphasis:false,href:null}]};
}
function listBlock(node:ElementNode,base:string|null):ArticleListBlock{
 const items=node.children.filter((child):child is ElementNode=>child.kind==="element"&&child.name==="li").map((item)=>{
   const children=item.children.filter((child):child is ElementNode=>child.kind==="element"&&(child.name==="ul"||child.name==="ol")).map(child=>listBlock(child,base));
   return{inlines:inlines(item.children,base),children};
 }).filter(item=>inlineText(item.inlines).length>0||item.children.length>0);
 return{kind:"list",ordered:node.name==="ol",items};
}
function tableBlock(node:ElementNode,base:string|null):ArticleContentBlock|null{
 const rows=elements(node,"tr",[]).map(row=>({
   cells:row.children.filter((child):child is ElementNode=>child.kind==="element"&&(child.name==="th"||child.name==="td")).map(cell=>({inlines:inlines(cell.children,base),header:cell.name==="th"}))
 })).filter(row=>row.cells.length>0);
 if(!rows.length)return null;
 const caption=node.children.find((child):child is ElementNode=>child.kind==="element"&&child.name==="caption");
 return{kind:"table",caption:caption?inlines(caption.children,base):[],rows};
}
function blocks(node:HtmlNode,base:string|null):ArticleContentBlock[]{
 if(node.kind==="text"){const content=inlines([node],base);return inlineText(content)?[{kind:"paragraph",inlines:content}]:[];}
 if(node.name==="root"||node.name==="div"||node.name==="span")return node.children.flatMap(c=>blocks(c,base));
 const doc=documentFrom(node,base);if(doc)return[doc];
 if(node.name==="table"){const table=tableBlock(node,base);return table?[table]:[];}
 if(node.name==="audio"||node.name==="video"){const media=mediaFrom(node,base);return media?[media]:[];}
 if(node.name==="figure"){
   const classes=node.attrs.class??"";
   const quote=findElement(node,"blockquote");
   if(/(?:^|\s)wp-block-pullquote(?:\s|$)/.test(classes)&&quote){
     const credit=findElement(node,"cite");
     const content=inlines(quote.children,base);
     return inlineText(content)?[{kind:"pullquote",inlines:content,credit:credit?inlines(credit.children,base):[]}]:[];
   }
   const media=mediaFrom(node,base);if(media)return[media];
   const directFigures=node.children.filter((child):child is ElementNode=>child.kind==="element"&&child.name==="figure");
   if(directFigures.length>1){
     const items=directFigures.map(child=>figureItem(child,base)).filter((item):item is ArticleFigureItem=>Boolean(item));
     return items.length?[{kind:"gallery",items}]:[];
   }
   const allImages=elements(node,"img",[]);
   if(allImages.length>1){
     const items=allImages.map(image=>imageFrom(image,base)).filter((item):item is ArticleFigureItem=>Boolean(item));
     return items.length?[{kind:"gallery",items}]:[];
   }
   const item=figureItem(node,base);return item?[{kind:"figure",...item}]:[];
 }
 if(node.name==="p"){
   const content=inlines(node.children,base),image=elements(node,"img",[])[0],out:ArticleContentBlock[]=[];
   if(inlineText(content))out.push({kind:"paragraph",inlines:content});
   if(image){const item=imageFrom(image,base);if(item)out.push({kind:"figure",...item});}
   return out;
 }
 if(node.name==="h2"||node.name==="h3"){const content=inlines(node.children,base);return inlineText(content)?[{kind:"heading",level:node.name==="h2"?2:3,inlines:content}]:[];}
 if(node.name==="blockquote"){const content=inlines(node.children,base);return inlineText(content)?[{kind:"blockquote",inlines:content}]:[];}
 if(node.name==="ul"||node.name==="ol"){const list=listBlock(node,base);return list.items.length?[list]:[];}
 if(node.name==="img"||node.name==="a"){const item=imageFrom(node,base);if(item)return[{kind:"figure",...item}];}
 const content=inlines(node.children,base);return inlineText(content)?[{kind:"paragraph",inlines:content}]:[];
}
export function parseArticleContent(html:string|null,baseUrl:string|null):ArticleContentBlock[]{if(!html?.trim())return[];return parseHtml(html).children.flatMap(child=>blocks(child,baseUrl));}
