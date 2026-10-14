/* Regression tests for the combined browser scripts. No API credentials needed. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.resolve(__dirname,'..');
const SCRIPT_NAMES=['app.js','cloud.js','pro.js','discovery.js'];
const SRC=SCRIPT_NAMES.map(name=>fs.readFileSync(path.join(ROOT,name),'utf8')).join('\n');

function boot(){
 const events=new Map(),windowEvents=new Map(),elements=new Map(),messages=[];
 const store=()=>{const data=new Map();return{
  getItem(key){return data.has(key)?data.get(key):null;},
  setItem(key,value){data.set(key,String(value));},
  removeItem(key){data.delete(key);},
  clear(){data.clear();}
 }};
 const localStorage=store(),sessionStorage=store();
 function el(id){
  if(!elements.has(id)){
   elements.set(id,{id,innerHTML:'',textContent:'',value:'',dataset:{},checked:false,
    style:{},disabled:false,files:[],
    classList:{add(){},remove(){},contains(){return false;},toggle(){}},
    querySelector(){return null;},querySelectorAll(){return [];},
    addEventListener(){},insertAdjacentHTML(){},focus(){},append(){},
    remove(){},click(){},setAttribute(){}});
  }
  return elements.get(id);
 }
 const document={
  head:{append(){}},body:{append(){}},hidden:false,
  getElementById:el,querySelector(){return el('document-query');},
  querySelectorAll(){return [];},createElement(tag){return el('created-'+tag);},
  addEventListener(type,fn){if(!events.has(type))events.set(type,[]);events.get(type).push(fn);}
 };
 const window={
  localStorage,sessionStorage,TREND_CONFIG:{},supabase:null,scrollTo(){},
  addEventListener(type,fn){if(!windowEvents.has(type))windowEvents.set(type,[]);windowEvents.get(type).push(fn);},
  dispatchEvent(event){for(const fn of windowEvents.get(event.type)||[])fn(event);}
 };
 const context=vm.createContext({
  window,document,localStorage,sessionStorage,
  setTimeout(){return 1;},clearTimeout(){},setInterval(){return 1;},
  Event:class{constructor(type){this.type=type;}},
  location:{origin:'https://example.test',pathname:'/'},
  crypto:{randomUUID(){return 'test-'+Date.now();}},
  confirm(){return true;},prompt(){return '';},alert(){},
  URL,Blob,fetch:async()=>{throw Error('Network must be mocked for tests.');}
 });
 vm.runInContext(SRC,context,{timeout:12000,filename:'trend-studio-integrated.js'});
 const evaluate=(source)=>vm.runInContext(source,context,{timeout:12000});
 const fire=(type,target)=>{
  for(const fn of events.get(type)||[])fn({target,preventDefault(){},key:''});
 };
 const click=dataset=>{
  const b={dataset,classList:{contains(){return false;}},closest(){return b;}};
  fire('click',b);
 };
 const change=(id,dataset,value,other={})=>{
  fire('change',{id,dataset,value,matches(){return false;},...other});
 };
 const html=()=>el('page-root').innerHTML;
 const flush=async()=>{
  for(let i=0;i<12;i++)await Promise.resolve();
 };
 return{evaluate,click,change,html,el,window,document,flush,messages};
}

test('every tab renders with all browser modules loaded together',()=>{
 const app=boot();
 for(const page of [
  'overview','radar','competitors','topics','ideas','planner',
  'settings','compilation','account','youtube','recommended','analytics'
 ]){
  assert.doesNotThrow(()=>app.evaluate('setPage('+JSON.stringify(page)+')'),page);
  assert.ok(app.html().length>300,page+' is blank');
  assert.match(app.html(),/page-header/,page+' lacks a heading');
 }
 assert.match(app.html(),/FIRST-PARTY PERFORMANCE/i);
});

test('idea generation, production status and navigation are functional',()=>{
 const app=boot();
 app.click({action:'generate'});
 assert.equal(app.evaluate('state.ideas.length'),3);
 assert.equal(app.evaluate('state.page'),'ideas');
 app.click({go:'planner'});
 assert.match(app.html(),/kanban-card/);
 app.change('',{status:'0'},'Published');
 assert.equal(app.evaluate('state.ideas[0].status'),'Published');
 app.click({go:'compilation'});
 assert.match(app.html(),/Under Construction/);
 assert.doesNotMatch(app.html(),/data-studio-render/);
 app.click({go:'radar'});
 assert.match(app.html(),/world-search-form/);
});

test('worldwide Radar ranks relevant video metadata and filters video format',async()=>{
 const app=boot(), now=new Date(Date.now()-2*86400000).toISOString();
 const videos=[
  {id:'abcdefghijk',title:'Pink vs Black Color Challenge',description:'Pink color team competition',
   tags:['color challenge','pink'],views:1000000,likes:60000,duration:85,
   channel:'Challenge Creator',channelId:'UC1234567890123456789012',
   subscriberCount:500000,publishedAt:now},
  {id:'bcdefghijkl',title:'Blue Wall House Painting Tutorial',description:'Painting with colors',
   tags:['home repair'],views:2000000,likes:15000,duration:800,
   channel:'Home Creator',channelId:'UC2234567890123456789012',
   subscriberCount:1000000,publishedAt:now},
  {id:'cdefghijklm',title:'Red vs Blue Color Challenge',description:'Team competition',
   tags:['color challenge'],views:200000,likes:16000,duration:540,
   channel:'Another Creator',channelId:'UC3234567890123456789012',
   subscriberCount:30000,publishedAt:now}
 ];
 const queries=[];
 app.window.TrendBridge={
  connected(){return true;},creatorProfile(){return{topics:['color challenge']};},
  async searchGlobalVideos(term,options){queries.push({term,options});return {videos,nextPageToken:null};},
  ownChannel(){return null;},ownVideos(){return[];},publicChannels(){return{};}
 };
 app.evaluate('setPage("radar")');
 await app.flush();
 assert.equal(queries.at(-1).term,'color challenge');
 assert.match(app.html(),/Pink vs Black Color Challenge/);
 assert.match(app.html(),/Red vs Blue Color Challenge/);
 assert.doesNotMatch(app.html(),/Blue Wall House Painting Tutorial/);
 app.click({worldFormat:'shortCandidate'});
 await app.flush();
 assert.equal(queries.at(-1).options.videoDuration,'short');
 assert.match(app.html(),/Pink vs Black Color Challenge/);
 assert.doesNotMatch(app.html(),/Red vs Blue Color Challenge/);
 app.change('',{worldFilter:'minViews'},500000);
 assert.match(app.html(),/Pink vs Black Color Challenge/);
 app.click({worldReset:''});
 await app.flush();
 assert.match(app.html(),/Red vs Blue Color Challenge/);
});

test('Radar analysis, saved ideas and account switch never crash',async()=>{
 const app=boot(),date=new Date().toISOString();
 app.window.TrendBridge={
  connected(){return true;},creatorProfile(){return{topics:['color challenge']};},
  ownChannel(){return null;},ownVideos(){return [];},publicChannels(){return {};},
  async searchGlobalVideos(){return{videos:[{
   id:'abcdefghijk',title:'Color Challenge Pink vs Blue',description:'Teams compete in colors',
   tags:['challenge','color'],views:123456,likes:12000,duration:82,
   channel:'Sample Creator',channelId:'UC1234567890123456789012',
   subscriberCount:5000,publishedAt:date
  }],nextPageToken:null};}
 };
 app.evaluate('setPage("radar")');await app.flush();
 app.click({worldVideo:'abcdefghijk'});
 assert.match(app.el('modal-root').innerHTML,/VIDEO ANALYSIS/);
 app.click({worldSave:'abcdefghijk'});
 assert.equal(app.evaluate('state.ideas.length'),1);
 app.window.dispatchEvent({type:'trend-studio:account-changed'});
 app.evaluate('setPage("recommended")');
 assert.match(app.html(),/Recommended for/);
 app.evaluate('setPage("analytics")');
 assert.match(app.html(),/FIRST-PARTY PERFORMANCE/i);
});

test('preference reset and metadata basics stay type-safe',()=>{
 const app=boot();
 assert.equal(app.evaluate("matchTopic('Blue room makeover')"),'Other');
 assert.equal(app.evaluate("matchTopic('Pink vs Blue Challenge')"),'Color vs Color');
 assert.equal(app.evaluate("normalizeVideos([{title:'Pink vs Black Challenge',channel:'Creator',views:1000,publishedAt:new Date().toISOString()}]).length"),1);
 assert.equal(app.evaluate("TOPICS.some(t=>t.name==='Mystery Box')"),true);
});
