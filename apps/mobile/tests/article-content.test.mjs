import test from"node:test";import assert from"node:assert/strict";import{readFileSync}from"node:fs";import{dirname,join}from"node:path";import{fileURLToPath}from"node:url";import ts from"typescript";const root=join(dirname(fileURLToPath(import.meta.url)),"..");function load(path){const source=readFileSync(join(root,path),"utf8"),output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,module={exports:{}};new Function("module","exports","require",output)(module,module.exports,()=>{throw new Error("Unexpected require")});return module.exports;}const{parseArticleContent}=load("src/reader/article-content.ts");
test("structured article preserves required journalism blocks",()=>{const b=parseArticleContent('<p>Intro <strong>bold</strong> <em>careful</em> <a href="https://www.who.int/news">WHO source</a>.</p><h2>Main</h2><h3>Sub</h3><ul><li>One</li><li>Two</li></ul><ol><li>First</li><li>Second</li></ol><blockquote><p>Quote</p></blockquote><figure><a href="https://healthtimes.co.zw/photo/"><img src="/wp-content/uploads/photo.jpg" alt="Clinic"></a><figcaption>Photo <em>caption</em></figcaption></figure>',"https://healthtimes.co.zw/story/");assert.deepEqual(b.map(x=>x.kind),["paragraph","heading","heading","list","list","blockquote","figure"]);assert.equal(b[3].ordered,false);assert.equal(b[4].ordered,true);assert.equal(b[0].inlines.find(x=>x.text==="bold")?.strong,true);assert.equal(b[0].inlines.find(x=>x.text==="careful")?.emphasis,true);assert.equal(b[0].inlines.find(x=>x.text==="WHO source")?.href,"https://www.who.int/news");assert.equal(b[6].src,"https://healthtimes.co.zw/wp-content/uploads/photo.jpg");assert.equal(b[6].caption.map(x=>x.text).join(""),"Photo caption");});
test("scripts embeds and unsafe URLs fail closed",()=>{const b=parseArticleContent('<script>alert("owned")</script><iframe>bad frame</iframe><object>bad object</object><p><a href="javascript:alert(1)">unsafe link</a> <a href="/safe/">safe link</a><img src="data:text/html,boom"></p>',"https://healthtimes.co.zw/story/"),s=JSON.stringify(b);assert.doesNotMatch(s,/owned|bad frame|bad object|javascript:|data:text/i);const p=b.find(x=>x.kind==="paragraph");assert.equal(p.inlines.find(x=>x.text.includes("unsafe link"))?.href,null);assert.equal(p.inlines.find(x=>x.text.trim()==="safe link")?.href,"https://healthtimes.co.zw/safe/");});


test("normalized migrated content supports tables galleries pull quotes documents media and nested lists",()=>{
  const html='<figure class="wp-block-pullquote"><blockquote>Health equity matters.</blockquote><cite>HealthTimes Desk</cite></figure><table><caption>Coverage</caption><thead><tr><th>Province</th><th>Rate</th></tr></thead><tbody><tr><td>Harare</td><td>81%</td></tr></tbody></table><figure class="wp-block-gallery"><figure><img src="/a.jpg" alt="A"><figcaption>First</figcaption></figure><figure><img src="/b.jpg" alt="B"><figcaption>Second</figcaption></figure></figure><p><a href="/files/report.pdf">Download report</a></p><video poster="/poster.jpg"><source src="/video.mp4" type="video/mp4"></video><audio src="/audio.mp3"></audio><ul><li>Parent<ul><li>Child</li></ul></li></ul>';
  const blocks=parseArticleContent(html,"https://healthtimes.co.zw/story/");
  assert.deepEqual(blocks.map(x=>x.kind),["pullquote","table","gallery","document","media","media","list"]);
  assert.equal(blocks[0].credit.map(x=>x.text).join(""),"HealthTimes Desk");
  assert.equal(blocks[1].rows[0].cells[0].header,true);
  assert.equal(blocks[2].items.length,2);
  assert.equal(blocks[3].href,"https://healthtimes.co.zw/files/report.pdf");
  assert.equal(blocks[4].src,"https://healthtimes.co.zw/video.mp4");
  assert.equal(blocks[5].mediaType,"audio");
  assert.equal(blocks[6].items[0].children[0].items[0].inlines.map(x=>x.text).join(""),"Child");
});

test("executable embeds remain dropped even beside normalized media",()=>{
  const blocks=parseArticleContent('<iframe src="https://video.example/embed">bad</iframe><embed src="/bad.swf"><form><input value="x"></form><video src="https://media.example/video.mp4"></video>',"https://healthtimes.co.zw/");
  const serialized=JSON.stringify(blocks);
  assert.doesNotMatch(serialized,/iframe|bad\.swf|input|form/);
  assert.equal(blocks.length,1);
  assert.equal(blocks[0].kind,"media");
});
