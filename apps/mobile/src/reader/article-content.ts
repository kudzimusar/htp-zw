export type ArticleInline={text:string;strong:boolean;emphasis:boolean;href:string|null};
export type ArticleContentBlock=
|{kind:"paragraph";inlines:ArticleInline[]}
|{kind:"heading";level:2|3;inlines:ArticleInline[]}
|{kind:"blockquote";inlines:ArticleInline[]}
|{kind:"list";ordered:boolean;items:ArticleInline[][]}
|{kind:"figure";src:string;alt:string|null;href:string|null;caption:ArticleInline[]};
type TextNode={kind:"text";value:string};
type ElementNode={kind:"element";name:string;attrs:Record<string,string>;children:HtmlNode[]};
type HtmlNode=TextNode|ElementNode;
type ParsedTag={closing:boolean;name:string;attrs:Record<string,string>;selfClosing:boolean};
const ALLOWED_TAGS=new Set(["p","h2","h3","blockquote","ul","ol","li","figure","figcaption","img","a","strong","b","em","i","br","div","span"]);
const VOID_TAGS=new Set(["img","br"]);
const DROP_TAGS=new Set(["script","style","iframe","object","embed","form","input","button","template","noscript"]);
const KEPT_ATTRIBUTES=new Set(["href","src","alt","title"]);
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
function collect(node:HtmlNode,out:ArticleInline[],base:string|null,state:Omit<ArticleInline,"text">){if(node.kind==="text"){pushInline(out,node.value,state);return;}if(node.name==="img"||node.name==="ul"||node.name==="ol")return;if(node.name==="br"){pushInline(out,"\n",state);return;}const next={strong:state.strong||node.name==="strong"||node.name==="b",emphasis:state.emphasis||node.name==="em"||node.name==="i",href:node.name==="a"?safeUrl(node.attrs.href,base,false):state.href};for(const child of node.children)collect(child,out,base,next);}
function inlines(nodes:HtmlNode[],base:string|null){const out:ArticleInline[]=[];for(const node of nodes)collect(node,out,base,{strong:false,emphasis:false,href:null});while(out.length&&!out[0]?.text.trim())out.shift();while(out.length&&!out[out.length-1]?.text.trim())out.pop();if(out[0])out[0].text=out[0].text.trimStart();const last=out[out.length-1];if(last)last.text=last.text.trimEnd();return out.filter(x=>x.text.length>0);}
function inlineText(items:ArticleInline[]){return items.map(x=>x.text).join("").trim();}
function findImage(node:HtmlNode,base:string|null,link:string|null=null):{src:string;alt:string|null;href:string|null}|null{if(node.kind==="text")return null;const href=node.name==="a"?safeUrl(node.attrs.href,base,false):link;if(node.name==="img"){const src=safeUrl(node.attrs.src,base,true);return src?{src,alt:node.attrs.alt?.trim()||null,href}:null;}for(const child of node.children){const found=findImage(child,base,href);if(found)return found;}return null;}
function findElement(node:HtmlNode,name:string):ElementNode|null{if(node.kind==="text")return null;if(node.name===name)return node;for(const child of node.children){const found=findElement(child,name);if(found)return found;}return null;}
function blocks(node:HtmlNode,base:string|null):ArticleContentBlock[]{
 if(node.kind==="text"){const content=inlines([node],base);return inlineText(content)?[{kind:"paragraph",inlines:content}]:[];}
 if(node.name==="root"||node.name==="div"||node.name==="span")return node.children.flatMap(c=>blocks(c,base));
 if(node.name==="figure"){const image=findImage(node,base);if(!image)return[];const cap=findElement(node,"figcaption");return[{kind:"figure",src:image.src,alt:image.alt,href:image.href,caption:cap?inlines(cap.children,base):[]}];}
 if(node.name==="p"){const content=inlines(node.children,base),image=findImage(node,base),out:ArticleContentBlock[]=[];if(inlineText(content))out.push({kind:"paragraph",inlines:content});if(image)out.push({kind:"figure",src:image.src,alt:image.alt,href:image.href,caption:[]});return out;}
 if(node.name==="h2"||node.name==="h3"){const content=inlines(node.children,base);return inlineText(content)?[{kind:"heading",level:node.name==="h2"?2:3,inlines:content}]:[];}
 if(node.name==="blockquote"){const content=inlines(node.children,base);return inlineText(content)?[{kind:"blockquote",inlines:content}]:[];}
 if(node.name==="ul"||node.name==="ol"){const items=node.children.filter((c):c is ElementNode=>c.kind==="element"&&c.name==="li").map(x=>inlines(x.children,base)).filter(x=>inlineText(x).length>0);return items.length?[{kind:"list",ordered:node.name==="ol",items}]:[];}
 if(node.name==="img"||node.name==="a"){const image=findImage(node,base);if(image)return[{kind:"figure",src:image.src,alt:image.alt,href:image.href,caption:[]}];}
 const content=inlines(node.children,base);return inlineText(content)?[{kind:"paragraph",inlines:content}]:[];
}
export function parseArticleContent(html:string|null,baseUrl:string|null):ArticleContentBlock[]{if(!html?.trim())return[];return parseHtml(html).children.flatMap(child=>blocks(child,baseUrl));}
