import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
function load(){
  const source=readFileSync(join(root,"src/reader/media-player.ts"),"utf8");
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const module={exports:{}};
  const require=(name)=>{
    if(name==="react") return {useEffect:()=>{},useRef:()=>({current:null}),useState:()=>[null,()=>{}]};
    if(name==="react-native") return {Platform:{OS:"web"}};
    throw new Error("Unexpected require "+name);
  };
  new Function("module","exports","require",output)(module,module.exports,require);
  return module.exports;
}
const media=load();

test("media playback state transitions are deterministic",()=>{
  let state=media.INITIAL_MEDIA_PLAYBACK_STATE;
  state=media.reduceMediaPlaybackState(state,{type:"load",itemId:"audio-1",durationSeconds:120});
  assert.equal(state.status,"loading");
  state=media.reduceMediaPlaybackState(state,{type:"playing"});
  assert.equal(state.status,"playing");
  state=media.reduceMediaPlaybackState(state,{type:"progress",elapsedSeconds:30});
  assert.equal(state.elapsedSeconds,30);
  state=media.reduceMediaPlaybackState(state,{type:"pause"});
  assert.equal(state.status,"paused");
  state=media.reduceMediaPlaybackState(state,{type:"seek",elapsedSeconds:200});
  assert.equal(state.elapsedSeconds,120);
  state=media.reduceMediaPlaybackState(state,{type:"rate",playbackRate:1.5});
  assert.equal(state.playbackRate,1.5);
  state=media.reduceMediaPlaybackState(state,{type:"presentation",presentation:"mini"});
  assert.equal(state.presentation,"mini");
  state=media.reduceMediaPlaybackState(state,{type:"ended"});
  assert.equal(state.status,"ended");
  assert.equal(state.elapsedSeconds,120);
});

test("audio playback source must be verified and HTTP(S)",()=>{
  const base={id:"a",title:"A",durationSeconds:10,publishedAt:null};
  assert.equal(media.verifiedAudioSource({...base,source:null}),null);
  assert.equal(media.verifiedAudioSource({...base,source:{url:"https://media.example.test/a.mp3",provider:"fixture",providerAssetId:"a",mimeType:"audio/mpeg",verified:false,downloadable:false}}),null);
  assert.equal(media.verifiedAudioSource({...base,source:{url:"javascript:alert(1)",provider:"fixture",providerAssetId:"a",mimeType:"audio/mpeg",verified:true,downloadable:false}}),null);
  assert.equal(media.verifiedAudioSource({...base,source:{url:"https://media.example.test/a.mp3",provider:"fixture",providerAssetId:"a",mimeType:"audio/mpeg",verified:true,downloadable:false}}).url,"https://media.example.test/a.mp3");
});


test("old audio listeners are removed and cannot dispatch after item switch",()=>{
  class FakeAudio {
    constructor(){this.currentTime=0;this.duration=30;this.playbackRate=1;this.listeners=new Map();}
    pause(){}
    async play(){}
    addEventListener(name,listener){const list=this.listeners.get(name)??[];list.push(listener);this.listeners.set(name,list);}
    removeEventListener(name,listener){this.listeners.set(name,(this.listeners.get(name)??[]).filter((value)=>value!==listener));}
    emit(name){for(const listener of this.listeners.get(name)??[]) listener();}
  }
  const oldAudio=new FakeAudio(),nextAudio=new FakeAudio(),actions=[];
  let current=oldAudio;
  const cleanupOld=media.attachWebAudioListeners(oldAudio,30,()=>current===oldAudio,(action)=>actions.push(action));
  oldAudio.currentTime=5;oldAudio.emit("timeupdate");
  assert.equal(actions.at(-1).type,"progress");
  cleanupOld();
  current=nextAudio;
  media.attachWebAudioListeners(nextAudio,30,()=>current===nextAudio,(action)=>actions.push(action));
  const before=actions.length;
  oldAudio.currentTime=20;oldAudio.emit("timeupdate");
  oldAudio.emit("ended");
  oldAudio.emit("error");
  assert.equal(actions.length,before,"detached old transport must not dispatch");
  nextAudio.currentTime=7;nextAudio.emit("timeupdate");
  assert.equal(actions.at(-1).elapsedSeconds,7);
});

test("listener guard rejects stale transport callbacks even before physical removal",()=>{
  class FakeAudio {
    constructor(){this.currentTime=1;this.duration=10;this.playbackRate=1;this.listeners=new Map();}
    pause(){}
    async play(){}
    addEventListener(name,listener){this.listeners.set(name,[...(this.listeners.get(name)??[]),listener]);}
    removeEventListener(){}
    emit(name){for(const listener of this.listeners.get(name)??[]) listener();}
  }
  const audio=new FakeAudio(),actions=[];
  let current=true;
  media.attachWebAudioListeners(audio,10,()=>current,(action)=>actions.push(action));
  current=false;
  audio.emit("timeupdate");audio.emit("ended");audio.emit("error");
  assert.equal(actions.length,0);
});
