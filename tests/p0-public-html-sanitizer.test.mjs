import test from "node:test";
import assert from "node:assert/strict";
import { parseFragment } from "parse5";
import {
  publicPlainText,
  safeLinkUrl,
  safeMediaUrl,
  sanitizePublicHtml
} from "../scripts/editorial/public-html-sanitizer.mjs";

const BASE="https://healthtimes.co.zw/some-story/";
const clean=(html)=>sanitizePublicHtml(html,{baseUrl:BASE});

const READER_ELEMENTS=new Set(["p","h2","h3","blockquote","ul","ol","li","figure","figcaption","img","a","strong","b","em","i","br"]);
const READER_ATTRIBUTES=new Set(["href","src","alt","title"]);
const HTML_NAMESPACE="http://www.w3.org/1999/xhtml";

// Re-parses the output with a spec-compliant parser: what a browser would build
// from these bytes must contain only allowlisted elements and attributes.
function assertReparsesToAllowlist(output,label){
  const visit=(node)=>{
    if(node.tagName){
      assert.equal(node.namespaceURI,HTML_NAMESPACE,label+": foreign namespace "+node.tagName);
      assert.ok(READER_ELEMENTS.has(node.tagName),label+": element "+node.tagName);
      for(const attr of node.attrs){
        assert.ok(READER_ATTRIBUTES.has(attr.name),label+": attribute "+attr.name);
        if(attr.name==="href") assert.match(attr.value,/^(?:https:|http:|mailto:)/,label+": href "+attr.value);
        if(attr.name==="src") assert.match(attr.value,/^https:\/\/(?:www\.)?healthtimes\.co\.zw\/wp-content\/uploads\//,label+": src "+attr.value);
      }
    }
    for(const child of node.childNodes??[]) visit(child);
  };
  visit(parseFragment(output));
}

const ATTACKS={
  "img onerror":'<img src=x onerror=alert(1)>',
  "event handler":'<p onclick="alert(1)">text</p>',
  "uppercase event handler":'<p ONCLICK=alert(1)>text</p>',
  "slash separated handler":'<p/onclick=alert(1)>text</p>',
  "javascript link":'<a href="javascript:alert(1)">x</a>',
  "mixed case javascript link":'<a href="JaVaScRiPt:alert(1)">x</a>',
  "newline split scheme":'<a href="java&#10;script:alert(1)">x</a>',
  "tab split scheme":'<a href="java\tscript:alert(1)">x</a>',
  "entity encoded scheme":'<a href="&#106;&#97;vascript:alert(1)">x</a>',
  "hex entity encoded scheme":'<a href="&#x6A;avascript:alert(1)">x</a>',
  "leading space scheme":'<a href="   javascript:alert(1)">x</a>',
  "leading control scheme":'<a href="\u0001javascript:alert(1)">x</a>',
  "data link":'<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>',
  "vbscript link":'<a href="vbscript:msgbox(1)">x</a>',
  "svg script":'<svg><script>alert(1)</script></svg>',
  "svg onload":'<svg onload=alert(1)></svg>',
  "svg xlink":'<svg><a xlink:href="javascript:alert(1)"><text>x</text></a></svg>',
  "svg foreignObject":'<svg><foreignObject><img src=x onerror=alert(1)></foreignObject></svg>',
  "mathml mutation":'<math><mtext><table><mglyph><style><img src=x onerror=alert(1)></style></mglyph></table></mtext></math>',
  "mathml href":'<math href="javascript:alert(1)">x</math>',
  "style attribute url":'<p style="background:url(javascript:alert(1))">x</p>',
  "style attribute expression":'<div style="width:expression(alert(1))">x</div>',
  "style element import":'<style>@import url(https://evil.example/x.css);</style>',
  "style element url":'<style>p{background:url("javascript:alert(1)")}</style>',
  "nested script tags":'<scr<script>ipt>alert(1)</scr</script>ipt>',
  "double open bracket":'<<img src=x onerror=alert(1)>',
  "comment payload":'<!--<img src=x onerror=alert(1)>-->',
  "conditional comment":'<!--[if IE]><img src=x onerror=alert(1)><![endif]-->',
  "cdata payload":'<![CDATA[<img src=x onerror=alert(1)>]]>',
  "noscript mutation":'<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>',
  "template payload":'<template><img src=x onerror=alert(1)></template>',
  "iframe":'<iframe src="https://evil.example"></iframe>',
  "iframe srcdoc":'<iframe srcdoc="<script>alert(1)</script>"></iframe>',
  "object":'<object data="https://evil.example/x.swf"></object>',
  "embed":'<embed src="https://evil.example/x.swf">',
  "form":'<form action="https://evil.example"><input name=x><button formaction="javascript:alert(1)">x</button></form>',
  "base":'<base href="https://evil.example/">',
  "meta refresh":'<meta http-equiv="refresh" content="0;url=https://evil.example">',
  "link stylesheet":'<link rel=stylesheet href="https://evil.example/x.css">',
  "video poster":'<video poster="https://evil.example/x.jpg" src="https://evil.example/x.mp4"></video>',
  "attribute breakout":'<img alt="&quot; onerror=&quot;alert(1)" src="https://healthtimes.co.zw/wp-content/uploads/a.jpg">',
  "unterminated tag":'<img src="https://evil.example/x.jpg" onerror="alert(1)"'
};

for(const [label,payload] of Object.entries(ATTACKS)){
  test("neutralizes "+label,()=>{
    const output=clean(payload);
    assertReparsesToAllowlist(output,label);
    assert.equal(clean(output),output,label+": sanitizing must be idempotent");
  });
}

test("srcset is removed while the validated src survives",()=>{
  const output=clean('<img src="https://healthtimes.co.zw/wp-content/uploads/a.jpg" srcset="https://evil.example/x.jpg 2x" sizes="100vw" alt="Lab">');
  assert.equal(output,'<img src="https://healthtimes.co.zw/wp-content/uploads/a.jpg" alt="Lab">');
});

test("publisher markup keeps editorial structure and drops presentation attributes",()=>{
  const output=clean('<p class="wp-block"><strong>Bold</strong> and <a href="https://www.who.int/" rel="noopener">WHO</a></p><h2 class="x">Head</h2>');
  assert.equal(output,'<p><strong>Bold</strong> and <a href="https://www.who.int/">WHO</a></p><h2>Head</h2>');
});

test("WordPress figures keep image and caption",()=>{
  const output=clean('<figure class="wp-block-image"><img decoding="async" width="10" height="10" src="https://healthtimes.co.zw/wp-content/uploads/2026/11/a.jpg" alt="A" class="x" srcset="x 1x"><figcaption class="c">Caption</figcaption></figure>');
  assert.equal(output,'<figure><img src="https://healthtimes.co.zw/wp-content/uploads/2026/11/a.jpg" alt="A"><figcaption>Caption</figcaption></figure>');
});

test("unsupported wrappers are removed but their text is preserved",()=>{
  assert.equal(clean('<div style="x"><span class="y">Kept</span></div>'),'Kept');
});

test("text is escaped so literal angle brackets cannot become markup",()=>{
  assert.equal(clean('<p>1 &lt; 2 &amp; 3 &gt; 2</p>'),'<p>1 &lt; 2 &amp; 3 &gt; 2</p>');
  assert.equal(clean('<p>&lt;img src=x onerror=alert(1)&gt;</p>'),'<p>&lt;img src=x onerror=alert(1)&gt;</p>');
});

test("media must be HTTPS uploads on the publisher host",()=>{
  for(const rejected of [
    "http://healthtimes.co.zw/wp-content/uploads/a.jpg",
    "https://evil.example/wp-content/uploads/a.jpg",
    "https://healthtimes.co.zw.evil.example/wp-content/uploads/a.jpg",
    "https://user:pw@healthtimes.co.zw/wp-content/uploads/a.jpg",
    "https://healthtimes.co.zw:8443/wp-content/uploads/a.jpg",
    "https://healthtimes.co.zw/redirect?to=https://evil.example/a.jpg",
    "https://healthtimes.co.zw/wp-content/uploads/../../redirect",
    "//evil.example/wp-content/uploads/a.jpg",
    "data:image/svg+xml,<svg onload=alert(1)>",
    "javascript:alert(1)",
    ""
  ]) assert.equal(safeMediaUrl(rejected,BASE),null,rejected);
  assert.equal(safeMediaUrl("/wp-content/uploads/a.jpg",BASE),"https://healthtimes.co.zw/wp-content/uploads/a.jpg");
  assert.equal(safeMediaUrl("https://www.healthtimes.co.zw/wp-content/uploads/a.jpg",BASE),"https://www.healthtimes.co.zw/wp-content/uploads/a.jpg");
});

test("off-host images are removed from article bodies",()=>{
  assert.equal(clean('<p>Text</p><img src="https://evil.example/tracker.gif" alt="t">'),'<p>Text</p>');
});

test("links allow only web and mailto targets without embedded credentials",()=>{
  assert.equal(safeLinkUrl("https://www.who.int/x",BASE),"https://www.who.int/x");
  assert.equal(safeLinkUrl("mailto:editor@healthtimes.co.zw",BASE),"mailto:editor@healthtimes.co.zw");
  assert.equal(safeLinkUrl("/relative/",BASE),"https://healthtimes.co.zw/relative/");
  for(const rejected of ["javascript:alert(1)","data:text/html,x","https://user:pw@evil.example/","ftp://x.example/",""]) {
    assert.equal(safeLinkUrl(rejected,BASE),null,rejected);
  }
});

test("a rejected link keeps its visible text",()=>{
  assert.equal(clean('<p><a href="javascript:alert(1)">Read</a></p>'),'<p>Read</p>');
});

test("output re-parses to itself even when unwrapping would nest headings",()=>{
  const output=clean("<h2><div><h3>x</h3></div></h2>");
  assert.equal(clean(output),output);
  assertReparsesToAllowlist(output,"nested headings");
});

test("deep nesting cannot overflow the sanitizer",()=>{
  assert.equal(typeof clean("<div>".repeat(20000)+"x"),"string");
});

test("oversized and non-string input fails closed",()=>{
  assert.equal(clean("<p>x</p>".repeat(400000)),"");
  assert.equal(clean(null),"");
  assert.equal(clean(undefined),"");
  assert.equal(clean({}),"");
});

test("plain text extraction drops markup, scripts and read-more links",()=>{
  assert.equal(publicPlainText('<p>Excerpt &amp; more.</p><a class="read-more" href="#">Read More</a><script>alert(1)</script>'),"Excerpt & more.");
  assert.equal(publicPlainText(null),"");
});
