import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./ts-module-loader.mjs";

const media=loadTs("src/reader/media-player.ts",{mocks:{
  "react":{useEffect:()=>{},useRef:(value)=>({current:value}),useState:(value)=>[value,()=>{}]},
  "react-native":{Platform:{OS:"web"}}
}});

test("listen_started is emitted only after the tracker is told playback actually started",()=>{
  const events=[];
  const tracker=media.createMediaAnalyticsTracker((event)=>events.push(event));
  assert.equal(events.length,0);
  tracker.started("audio-1",120);
  assert.deepEqual(events,[{
    type:"listen_started",itemId:"audio-1",elapsedSeconds:0,durationSeconds:120
  }]);
  tracker.started("audio-1",120);
  assert.equal(events.length,1,"repeated playing transition for same item must not double-count start");
});

test("listen_completed requires a matching started item",()=>{
  const events=[];
  const tracker=media.createMediaAnalyticsTracker((event)=>events.push(event));
  tracker.completed("audio-1",120,120);
  assert.equal(events.length,0);
  tracker.started("audio-1",120);
  tracker.completed("audio-2",10,20);
  assert.equal(events.length,1);
  tracker.completed("audio-1",120,120);
  assert.equal(events.at(-1).type,"listen_completed");
  assert.equal(events.at(-1).elapsedSeconds,120);
});

test("actual ended transport callback drives completion hook",()=>{
  class FakeAudio{
    constructor(){this.currentTime=30;this.duration=30;this.playbackRate=1;this.listeners=new Map();}
    pause(){}
    async play(){}
    addEventListener(name,listener){this.listeners.set(name,[...(this.listeners.get(name)??[]),listener]);}
    removeEventListener(name,listener){this.listeners.set(name,(this.listeners.get(name)??[]).filter((item)=>item!==listener));}
    emit(name){for(const listener of this.listeners.get(name)??[])listener();}
  }
  const audio=new FakeAudio();
  const actions=[];
  let completed=0;
  media.attachWebAudioListeners(audio,30,()=>true,(action)=>actions.push(action),()=>{completed++;});
  assert.equal(completed,0);
  audio.emit("timeupdate");
  assert.equal(completed,0);
  audio.emit("ended");
  assert.equal(actions.at(-1).type,"ended");
  assert.equal(completed,1);
});
