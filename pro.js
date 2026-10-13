/* Trend Studio Pro: creator discovery, analytics, and guided highlights. */
(function(){
"use strict";
const api=()=>window.TrendBridge;
const esc=x=>html(String(x??""));
const safeId=x=>/^UC[\w-]{22}$/.test(String(x||""));
const thumbId=x=>/^[\w-]{11}$/.test(String(x||""));
const number=x=>Number(x||0).toLocaleString("en-US");
const compact=x=>Intl.NumberFormat("en",{notation:"compact",maximumFractionDigits:1}).format(Number(x)||0);
const when=x=>x?new Date(x).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}):"Not updated";
const imageFor=c=>c?.snippet?.thumbnails?.medium?.url||c?.snippet?.thumbnails?.default?.url||c?.avatar||"";
const pic=(src,name,cls)=>src&&/^https:\/\/(yt3\.ggpht\.com|[\w-]+\.ggpht\.com|[\w-]+\.googleusercontent\.com|i\.ytimg\.com|[\w-]+\.ytimg\.com)\//.test(src)?'<img class="'+(cls||"pro-avatar")+'" src="'+esc(src)+'" alt="'+esc(name)+'" loading="lazy" referrerpolicy="no-referrer">':'<span class="pro-avatar pro-initial">'+esc((name||"?")[0])+"</span>";
const ytPic=(id,title)=>thumbId(id)?'<img class="pro-video-image" loading="lazy" src="https://i.ytimg.com/vi/'+id+'/mqdefault.jpg" alt="Thumbnail for '+esc(title)+'">':"";
const ok=()=>Boolean(api()?.connected());
const toastPro=message=>toast(message);
let suggestions=[],searchCache=new Map(),searchTimer=null,searchSeq=0,searchBusy=false;
let popular=[],popularAt=0,popularRegion="US",popularError="",popularBusy=false;
let ownDaily=null,ownGeo=null,ownTraffic=null,ownAt=0,ownError="",ownBusy=false;
let publicAt=0,autoRefreshBusy=false;
const snapStorage="trend-studio:stats-history:v1";
let snapshots=[];try{snapshots=JSON.parse(localStorage.getItem(snapStorage)||"[]");if(!Array.isArray(snapshots))snapshots=[];publicAt=snapshots.at(-1)?.time||0;}catch{snapshots=[];}
const ww={step:1,theme:"",results:[],selected:new Set(),curves:new Map(),errors:new Map(),busy:false,building:false,found:false,matchCount:0};
let latestScope="";

function addWatchlist(info){
 if(!info||!safeId(info.id))return toastPro("Choose a channel from the search results.");
 if(state.channels.some(x=>x.channelId===info.id))return toastPro("This channel is already on your watchlist.");
 if(state.channels.length>=10)return toastPro("Your watchlist holds up to 10 channels. Remove one first.");
 const handle=info.snippet?.customUrl||info.snippet?.title||info.id;
 const title=info.snippet?.title||"YouTube channel";
 const img=imageFor(info);
 state.channels.push({handle:handle.startsWith("@")?handle:info.id,name:title,role:"competitor",channelId:info.id,avatar:img});
 if(info.statistics){const old=api()?.publicChannels()||{};/* live results read from scan after adding */}
 suggestions=[];state.warnings=[];render();toastPro(title+" added. Loading actual uploads…");
 if(ok())api().scan();
}
function showSuggestions(){
 const host=document.getElementById("pro-suggest");
 if(!host)return;
 if(!ok()){host.innerHTML='<p class="pro-helper">Connect YouTube first to search channels and load logos.</p>';return;}
 if(searchBusy){host.innerHTML='<p class="pro-helper">Searching YouTube channels…</p>';return;}
 if(!suggestions.length){host.innerHTML='<p class="pro-helper">Type at least 3 characters. Suggestions are fetched from YouTube (API search quota applies).</p>';return;}
 host.innerHTML=suggestions.map((c,i)=>'<button class="pro-suggest-row" data-pro-add="'+i+'">'+pic(imageFor(c),c.snippet?.title)+
 '<span><strong>'+esc(c.snippet?.title)+'</strong><small>'+esc(c.snippet?.customUrl||c.id)+'</small></span><span class="pro-add">＋ Watch</span></button>').join("");
}
function handleAutocomplete(val){
 const term=String(val||"").trim();
 clearTimeout(searchTimer);
 if(term.length<3){suggestions=[];searchBusy=false;showSuggestions();return;}
 if(!ok()){suggestions=[];showSuggestions();return;}
 const seq=++searchSeq;const cached=searchCache.get(term.toLowerCase());
 if(cached&&Date.now()-cached.time<10*60000){suggestions=cached.items;searchBusy=false;showSuggestions();return;}
 searchBusy=true;showSuggestions();
 searchTimer=setTimeout(async()=>{
  try{
   const matches=await api().searchChannels(term);
   const ids=matches.map(x=>x.id?.channelId).filter(safeId);
   const full=await api().channels(ids);
   const byId=new Map(full.map(x=>[x.id,x]));
   if(seq!==searchSeq)return;
   suggestions=ids.map(id=>byId.get(id)).filter(Boolean);
   searchCache.set(term.toLowerCase(),{time:Date.now(),items:suggestions});
   searchBusy=false;showSuggestions();
  }catch(e){if(seq!==searchSeq)return;searchBusy=false;suggestions=[];const h=document.getElementById("pro-suggest");if(h)h.innerHTML='<p class="pro-error">'+esc(e.message)+'</p>';}
 },800);
}
function watchCard(c,index){
 const stats=api()?.publicChannels()||{};
 const data=stats[c.channelId]||Object.values(stats).find(x=>x.snippet?.title===c.name);
 const title=data?.snippet?.title||c.name;const id=data?.id||c.channelId;
 const image=imageFor(data)||c.avatar;
 const items=state.videos.filter(v=>v.channelId===id||v.channelHandle===c.handle);
 const history=snapshots.filter(x=>x.id===id),first=history[0],last=history.at(-1);
 const delta=history.length>1&&last.time>first.time?'<div class="pro-observed">Since first local snapshot: '+(last.views>=first.views?"+":"")+short(last.views-first.views)+' views · '+(last.subs>=first.subs?"+":"")+short(last.subs-first.subs)+' subscribers</div>':"";
 const newest=items.sort((a,b)=>a.age-b.age)[0];
 return '<article class="pro-channel panel"><div class="pro-channel-head">'+pic(image,title)+
 '<div class="pro-channel-text"><strong>'+esc(title)+'</strong><small>'+esc(c.handle)+'</small></div></div>'+
 '<div class="pro-metrics"><span><b>'+ (data?.statistics?.hiddenSubscriberCount?"Hidden":data?.statistics?.subscriberCount!=null?compact(data.statistics.subscriberCount):"—")+'</b><small>subscribers</small></span>'+
 '<span><b>'+ (data?.statistics?.viewCount!=null?compact(data.statistics.viewCount):"—")+'</b><small>channel views</small></span>'+
 '<span><b>'+(data?.statistics?.videoCount!=null?compact(data.statistics.videoCount):"—")+'</b><small>uploads</small></span></div>'+
 delta+(newest?'<div class="pro-latest">'+ytPic(newest.id,newest.title)+'<div><small>RECENT UPLOAD</small><b>'+esc(newest.title)+'</b><span>'+compact(newest.views)+' views</span></div></div>':'<p class="pro-helper">Scan YouTube to load recent videos.</p>')+
 '<div class="pro-actions">'+(safeId(id)?'<button class="btn btn-outline" data-channel-detail="'+id+'">View public stats</button>':"")+
 '<button class="btn btn-outline" data-pro-remove="'+index+'">Remove</button></div></article>';
}
const previousCompetitors=competitors;
competitors=function(){
 return header('Your <span class="title-accent">watchlist.</span>','Find channels by name, compare public performance and research their latest uploads.','CHANNEL INTELLIGENCE',
 '<button class="btn btn-outline" data-go="recommended">✦ Recommended creators</button>')+banner()+
 '<div class="panel pro-searchbox"><div class="pro-row-between"><div><h3>Add any YouTube channel</h3><p>Search by channel name or @handle — no URLs required.</p></div><span class="tag">'+state.channels.length+' / 10 tracked</span></div>'+
 '<input id="new-channel" class="field wide" autocomplete="off" placeholder="Start typing: MrBeast, Ryan Trahan, Like Nastya…" aria-label="Search YouTube channels">'+
 '<div id="pro-suggest" class="pro-suggestions" aria-live="polite"><p class="pro-helper">'+(ok()?"Type three characters to see real YouTube channels.":"Connect YouTube first to search for channels.")+'</p></div>'+
 '<div class="pro-actions"><button class="btn btn-outline" data-go="recommended">Discover popular channels</button>'+
 '<button class="btn btn-primary" data-action="add-channel">Search / Add</button><button class="btn" data-pro-refresh="watchlist" '+(!ok()?"disabled":"")+'>↻ Refresh stats</button></div></div>'+
 '<div class="pro-heading"><h3>Tracked creators</h3><small>Public stats refresh when YouTube is connected. Private competitor CTR, retention and watch time are unavailable.</small></div>'+
 (state.channels.length?'<div class="pro-cardgrid">'+state.channels.map(watchCard).join("")+'</div>':'<div class="panel pro-searchbox">Your watchlist is empty. Search above or explore Recommended for Watchlist.</div>')+
 '<p class="pro-helper">Last successful YouTube scan: '+when(publicAt)+' · Public counts are snapshots, not instantaneous live counters.</p>';
};
addChannel=function(){
 const input=document.getElementById("new-channel"),q=(input?.value||"").trim();
 if(q.length<3)return toastPro("Type at least 3 characters.");
 if(!ok())return toastPro("Connect YouTube first.");
 if(suggestions.length===1)return addWatchlist(suggestions[0]);
 if(suggestions.length)return toastPro("Choose a matching channel from the suggestions.");
 handleAutocomplete(q);
};
async function loadPopular(force){
 if(!ok()){popularError="Connect YouTube to see current recommendations.";render();return;}
 if(popularBusy||(!force&&popularAt&&Date.now()-popularAt<15*60000))return;
 popularBusy=true;popularError="";render();
 try{
  const videos=await api().recentPopular(popularRegion);
  const pool=new Map();
  for(const v of videos){
   const id=v.snippet?.channelId;if(!safeId(id))continue;
   const entry=pool.get(id)||{id,count:0,views:0,video:v,score:0};
   entry.count++;entry.views+=Number(v.statistics?.viewCount)||0;pool.set(id,entry);
  }
  const rows=[...pool.values()].sort((a,b)=>b.count-a.count||b.views-a.views).slice(0,35);
  const full=await api().channels(rows.map(x=>x.id));
  const byId=new Map(rows.map(x=>[x.id,x]));
  popular=full.map(c=>({...byId.get(c.id),info:c})).filter(x=>x.id)
   .sort((a,b)=>b.count-a.count||b.views-a.views);
  popularAt=Date.now();
 }catch(e){popularError=e.message;}finally{popularBusy=false;render();}
}
function recommendedView(){
 return header('Recommended for <span class="title-accent">Watchlist.</span>','Discover creators behind currently popular videos in the selected country. Not a global fastest-growing-channel ranking.','CHANNEL DISCOVERY')+
 '<div class="panel pro-searchbox"><div class="pro-row-between"><div><h3>Popular-video creators</h3><p>Based on the official YouTube most-popular video feed, not invented growth scores.</p></div><div class="pro-actions"><select id="pro-region" class="field">'+
 [['US','United States'],['GB','United Kingdom'],['CA','Canada'],['BR','Brazil'],['IN','India'],['MX','Mexico'],['DE','Germany'],['AU','Australia']].map(x=>'<option value="'+x[0]+'" '+(popularRegion===x[0]?"selected":"")+'>'+x[1]+'</option>').join("")+'</select>'+
 '<button class="btn btn-primary" data-pro-refresh="popular" '+(!ok()||popularBusy?"disabled":"")+'>↻ Refresh</button></div></div>'+
 '<p class="pro-helper">'+(popularBusy?"Loading the latest popular videos…":"Last updated "+when(popularAt)+". Refreshes every 15 minutes while this page is open.")+'</p>'+
 (popularError?'<p class="pro-error">'+esc(popularError)+'</p>':"")+'</div>'+
 (popular.length?'<div class="pro-cardgrid">'+popular.slice(0,24).map((x)=>{
  const c=x.info,already=state.channels.some(y=>y.channelId===c.id);
  return '<article class="panel pro-channel"><div class="pro-channel-head">'+pic(imageFor(c),c.snippet?.title)+'<div class="pro-channel-text"><strong>'+esc(c.snippet?.title)+'</strong><small>'+esc(c.snippet?.customUrl||c.id)+'</small></div></div>'+
  '<div class="pro-metrics"><span><b>'+compact(c.statistics?.subscriberCount)+'</b><small>subscribers</small></span><span><b>'+x.count+'</b><small>popular videos</small></span><span><b>'+compact(x.views)+'</b><small>views, sampled videos</small></span></div>'+
  '<div class="pro-latest">'+ytPic(x.video.id,x.video.snippet?.title)+'<div><small>POPULAR VIDEO</small><b>'+esc(x.video.snippet?.title)+'</b></div></div>'+
  '<button class="btn btn-primary wide" data-pro-recommend="'+c.id+'" '+(already?"disabled":"")+'>'+(already?"✓ On watchlist":"＋ Add to watchlist")+'</button></article>';
 }).join("")+'</div>':'<div class="panel pro-searchbox">'+(popularBusy?"Finding creators…":"No popular creators loaded. Connect YouTube and click Refresh.")+'</div>');
}

filteredVideos=function(){
 const q=state.query.trim().toLowerCase(),ownedId=api()?.ownChannel()?.id||"";
 const pool=state.videos.filter(v=>{
  if(state.mode==="live"&&Number(state.days)&&v.age>state.days)return false;
  if(state.topic!=="All"&&v.topic!==state.topic)return false;
  if(q&&![v.title,v.channel,v.topic,v.channelHandle].join(" ").toLowerCase().includes(q))return false;
  const owned=Boolean(ownedId&&v.channelId===ownedId)||state.channels.some(c=>c.role==="my"&&(c.channelId&&c.channelId===v.channelId||c.handle===v.channelHandle||c.name===v.channel));
  return state.category==="My channels"?owned:state.category==="Competitors"?!owned:true;
 });
 return sortedVideos(pool);
};
const earlierRadar=radar;
radar=function(){
 const base=earlierRadar();
 const info='<div class="panel pro-radar-info"><span class="tag green">YouTube Data API</span> <b>'+state.videos.length+' videos indexed</b>'+
 ' <span>Last scanned '+when(publicAt)+'</span> <button class="btn btn-outline" data-pro-refresh="watchlist" '+(!ok()?"disabled":"")+'>↻ Refresh</button>'+
 '<p>Views and subscribers are public count snapshots. Average views/day is total views divided by video age, not real-time view velocity. Use the filters to compare recent videos.</p></div>';
 return base.replace('<div class="panel"><div class="controls">',info+'<div class="panel"><div class="controls">');
};
const previousOverview=overview;
overview=function(){
 return previousOverview().replace("Your home base for competitor intelligence, emerging concepts, and your next great Nastya Artem Mia shoot.",
 "Discover which formats are working for your channel and the creators you track.");
};

async function loadOwnDaily(force){
 if(!ok()||!api()?.ownChannel())return;
 if(ownBusy||(!force&&Date.now()-ownAt<12*60000))return;
 ownBusy=true;ownError="";render();
 try{
  const reports=await Promise.allSettled([api().ownDaily(28),api().ownBreakdown("country"),api().ownBreakdown("insightTrafficSourceType")]);
  if(reports[0].status==="rejected")throw reports[0].reason;
  ownDaily=reports[0].value;
  ownGeo=reports[1].status==="fulfilled"?reports[1].value:null;
  ownTraffic=reports[2].status==="fulfilled"?reports[2].value:null;
  ownAt=Date.now();
 }catch(e){ownError=e.message;}finally{ownBusy=false;render();}
}
const sumKey=(rows,index)=>rows.reduce((a,r)=>a+(Number(r[index])||0),0);
function ownAnalyticsView(){
 const channel=api()?.ownChannel(),videos=api()?.ownVideos()||[];
 const rows=ownDaily?.rows||[],total=sumKey(rows,1),minutes=sumKey(rows,2),gain=sumKey(rows,3),loss=sumKey(rows,4);
 const likes=sumKey(rows,6),comments=sumKey(rows,7),shares=sumKey(rows,8);
 const avg=total?rows.reduce((acc,r)=>acc+(Number(r[1])||0)*(Number(r[5])||0),0)/total:0;
 const breakdown=(report,label)=>(report?.rows||[]).slice(0,9).map(x=>'<div class="pro-breakdown-row"><span>'+esc(String(x[0]).replaceAll("_"," "))+'</span><b>'+compact(x[1])+' views</b></div>').join("")||'<p class="pro-helper">Not available for this channel or report.</p>';
 const series=rows.slice(-28),max=Math.max(1,...series.map(x=>Number(x[1])||0));
 return header('Your channel <span class="title-accent">analytics.</span>','Authorized YouTube Analytics reports plus public statistics for your own uploads.','FIRST-PARTY PERFORMANCE',
 '<button class="btn btn-outline" data-pro-refresh="analytics" '+(!ok()||ownBusy?"disabled":"")+'>↻ Refresh report</button>')+
 (!channel?'<div class="panel pro-searchbox"><h3>Connect your YouTube channel</h3><p>Authorize YouTube read-only access from the YouTube connection tab to see real analytics.</p><button class="btn btn-primary" data-go="youtube">▶ Connect YouTube</button></div>':
 '<div class="panel pro-searchbox"><div class="pro-row-between"><div><h3>'+esc(channel.title)+'</h3><p>Last analytics refresh '+when(ownAt)+' · Recent data may be delayed by YouTube.</p></div><span class="tag green">Owner-authorized report</span></div>'+
 (ownError?'<p class="pro-error">'+esc(ownError)+' — check the YouTube Analytics API authorization.</p>':"")+
 '<div class="pro-stats4"><div><small>Views · 28 days</small><strong>'+(rows.length?number(total):"—")+'</strong></div>'+
 '<div><small>Watch hours · 28 days</small><strong>'+(rows.length?number(Math.round(minutes/60)):"—")+'</strong></div>'+
 '<div><small>Subscribers gained</small><strong>'+(rows.length?number(gain):"—")+'</strong></div>'+
 '<div><small>Subscribers lost</small><strong>'+(rows.length?number(loss):"—")+'</strong></div></div>'+
 '<div class="pro-stats4 pro-engagement"><div><small>Likes · 28 days</small><strong>'+(rows.length?compact(likes):"—")+'</strong></div>'+
 '<div><small>Comments · 28 days</small><strong>'+(rows.length?compact(comments):"—")+'</strong></div>'+
 '<div><small>Shares · 28 days</small><strong>'+(rows.length?compact(shares):"—")+'</strong></div>'+
 '<div><small>Avg. view duration</small><strong>'+(rows.length?Math.floor(avg/60)+":"+String(Math.round(avg%60)).padStart(2,"0"):"—")+'</strong></div></div>'+
 '<div class="pro-chart"><div class="pro-row-between"><b>Daily video views · last 28 days</b><small>Official YouTube Analytics</small></div>'+
 (series.length?'<div class="pro-bars">'+series.map(x=>'<div title="'+esc(x[0])+': '+number(x[1])+' views" style="height:'+Math.max(3,Number(x[1])/max*100)+'%"></div>').join("")+'</div>':'<p>No daily report yet. Click Refresh to request it.</p>')+'</div><div class="pro-breakdown"><section><h4>Top audience countries</h4>'+breakdown(ownGeo,"countries")+'</section>'+
 '<section><h4>Traffic sources</h4>'+breakdown(ownTraffic,"sources")+'</section></div></div>'+
 '<div class="pro-heading"><h3>Your upload library ('+videos.length+')</h3><small>Public views, likes, and average lifetime views/day. Select a video for private retention and watch-time details.</small></div>'+
 '<div class="panel pro-searchbox"><div class="pro-upload-grid">'+videos.slice().sort((a,b)=>Number(b.statistics?.viewCount||0)-Number(a.statistics?.viewCount||0)).slice(0,60).map(v=>{
  const views=Number(v.statistics?.viewCount)||0;const days=Math.max(1,(Date.now()-new Date(v.snippet?.publishedAt||Date.now()).getTime())/86400000);
  return '<button class="pro-video-card" data-video-detail="'+esc(v.id)+'">'+ytPic(v.id,v.snippet?.title)+'<strong>'+esc(v.snippet?.title)+'</strong><span>'+compact(views)+' views · '+compact(views/days)+'/day avg · '+compact(v.statistics?.likeCount)+' likes</span></button>';
 }).join("")+'</div></div>');
}

const pageRender=render;
render=function(){
 if(state.page==="recommended"){document.getElementById("page-root").innerHTML=recommendedView();badge();return;}
 if(state.page==="analytics"){document.getElementById("page-root").innerHTML=ownAnalyticsView();badge();return;}
 pageRender();
};
const pageSet=setPage;
setPage=function(page){
 if(page!=="recommended"&&page!=="analytics"){pageSet(page);return;}
 state.page=page;document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
 document.getElementById("page-crumb").textContent=page==="recommended"?"Recommended for Watchlist":"Channel analytics";
 render();window.scrollTo(0,0);
 if(page==="recommended")loadPopular(false);
 if(page==="analytics")loadOwnDaily(false);
};
const nav=document.getElementById("nav");
if(nav&&!nav.querySelector('[data-page="recommended"]')){
 nav.insertAdjacentHTML("beforeend",'<button class="nav-link" data-page="recommended"><span>✦</span> Recommended for watchlist <em>NEW</em></button>'+
 '<button class="nav-link" data-page="analytics"><span>▤</span> Channel analytics <em>NEW</em></button>');
}
function rememberPublicSnapshot(){
 const data=api()?.publicChannels()||{},now=Date.now();
 for(const c of Object.values(data)){
  if(!safeId(c.id))continue;
  const prev=snapshots.filter(x=>x.id===c.id).at(-1);
  if(prev&&now-prev.time<9*60000)continue;
  snapshots.push({id:c.id,time:now,subs:Number(c.statistics?.subscriberCount)||0,views:Number(c.statistics?.viewCount)||0});
 }
 snapshots=snapshots.filter(x=>now-x.time<7*86400000).slice(-500);
 try{localStorage.setItem(snapStorage,JSON.stringify(snapshots));}catch{}
}
function startRefresh(){
 if(document.hidden||!ok()||autoRefreshBusy)return;
 if(Date.now()-publicAt<15*60000)return;
 autoRefreshBusy=true;
 api().scan().then(()=>{publicAt=Date.now();rememberPublicSnapshot();if(state.page==="recommended")loadPopular(false);if(state.page==="analytics")loadOwnDaily(false);})
 .catch(e=>toastPro(e.message)).finally(()=>{autoRefreshBusy=false;});
}
setInterval(startRefresh,15*60000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&state.page==="recommended")loadPopular(false);});
document.addEventListener("input",e=>{if(e.target?.id==="new-channel")handleAutocomplete(e.target.value);});
document.addEventListener("change",e=>{if(e.target?.id==="pro-region"){popularRegion=e.target.value;popularAt=0;loadPopular(true);}});
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.proAdd!==undefined){const c=suggestions[Number(b.dataset.proAdd)];if(c)addWatchlist(c);return;}
 if(b.dataset.proRemove!==undefined){const idx=Number(b.dataset.proRemove);if(idx>=0&&idx<state.channels.length){state.channels.splice(idx,1);render();toastPro("Channel removed.");}return;}
 if(b.dataset.proRecommend){const c=popular.find(x=>x.id===b.dataset.proRecommend)?.info;if(c)addWatchlist(c);return;}
 if(b.dataset.proRefresh==="watchlist"){if(!ok())return toastPro("Reconnect YouTube.");api().scan().then(()=>{publicAt=Date.now();rememberPublicSnapshot();}).catch(e=>toastPro(e.message));return;}
 if(b.dataset.proRefresh==="popular"){loadPopular(true);return;}
 if(b.dataset.proRefresh==="analytics"){loadOwnDaily(true);return;}
});
window.TrendPro={getLastUpdate:()=>publicAt,onScanDone:()=>{publicAt=Date.now();rememberPublicSnapshot();}};
const style=document.createElement("style");style.textContent=String.raw`.pro-searchbox{padding:22px;margin-bottom:18px}.pro-searchbox h3,.pro-heading h3{margin:0 0 8px}.pro-searchbox p{color:#aab9cc;font-size:13px}.pro-row-between{display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap}.pro-suggestions{max-height:340px;overflow:auto;margin:10px 0}.pro-suggest-row{width:100%;background:#1c273d;border:1px solid #344158;border-radius:10px;display:flex;gap:12px;align-items:center;text-align:left;color:#f3f4fe;margin:6px 0;padding:9px;cursor:pointer}.pro-suggest-row:hover,.pro-video-card:hover{border-color:#9977e9;background:#24314c}.pro-suggest-row span:nth-child(2){flex:1;min-width:0}.pro-suggest-row strong,.pro-suggest-row small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pro-suggest-row small,.pro-channel-text small{color:#9faec9;font-size:12px}.pro-add{font-size:12px;color:#c0aaff}.pro-avatar{width:53px;height:53px;border-radius:50%;object-fit:cover;flex-shrink:0}.pro-initial{display:flex;align-items:center;justify-content:center;background:#464277;font-size:24px}.pro-helper{color:#9faec9;font-size:12px;padding:9px 0}.pro-error{color:#ffacaf!important;line-height:1.4}.pro-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:12px;align-items:center}.pro-heading{display:flex;justify-content:space-between;align-items:end;flex-wrap:wrap;margin:24px 0 12px}.pro-heading small{color:#a3b0c5}.pro-cardgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(285px,1fr));gap:15px}.pro-channel{padding:17px}.pro-channel-head{display:flex;align-items:center;gap:11px;margin-bottom:15px}.pro-channel-text{min-width:0;flex:1}.pro-channel-text strong{display:block;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pro-channel-text small{display:block}.pro-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.pro-metrics span{min-width:0}.pro-metrics b{font-size:15px;display:block}.pro-metrics small{font-size:10px;color:#a3b5cc}.pro-observed{font-size:11px;color:#bde1d5;margin:10px 0}.pro-latest{display:flex;gap:9px;border-top:1px solid #303e55;padding-top:12px;margin-top:13px}.pro-latest img{width:86px;height:53px;object-fit:cover;border-radius:7px}.pro-latest>div{min-width:0;flex:1}.pro-latest b{display:block;line-height:1.25;max-height:2.5em;overflow:hidden;font-size:12px}.pro-latest small,.pro-latest span{display:block;color:#9aabc2;font-size:10px;margin-bottom:4px}.pro-radar-info{margin-bottom:14px;padding:16px}.pro-radar-info span{margin:0 9px}.pro-radar-info p{color:#9ba9bd;font-size:12px;margin:8px 0 0}.pro-stats4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:17px 0}.pro-stats4>div{background:#192438;padding:16px;border:1px solid #33435a;border-radius:11px}.pro-stats4 strong{display:block;font-size:25px}.pro-stats4 small{color:#a5b4cd}.pro-breakdown{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:17px;margin-top:14px}.pro-breakdown>section{padding:14px;background:#182438;border:1px solid #324159;border-radius:12px}.pro-breakdown h4{margin:0 0 10px}.pro-breakdown-row{display:flex;justify-content:space-between;padding:7px 0;font-size:12px;border-bottom:1px solid #2f3c51;gap:10px}.pro-breakdown-row span{color:#acbad0}.pro-breakdown-row b{white-space:nowrap}.pro-chart{padding:14px;border:1px solid #36445a;border-radius:12px}.pro-bars{height:160px;display:flex;align-items:end;gap:3px;padding-top:9px}.pro-bars>div{flex:1;background:linear-gradient(0deg,#7863db,#b59efa);border-radius:4px 4px 0 0;min-height:3px}.pro-upload-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(205px,1fr));gap:12px}.pro-video-card{text-align:left;border:1px solid #344158;padding:9px;color:#f7f7ff;background:#1e293d;border-radius:10px;cursor:pointer}.pro-video-image{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:7px}.pro-video-card strong{display:block;font-size:13px;line-height:1.3;margin-top:7px;max-height:2.6em;overflow:hidden}.pro-video-card span{font-size:12px;color:#a9b7c8;display:block;margin-top:6px}@media(max-width:640px){.pro-breakdown{grid-template-columns:1fr}.pro-stats4{grid-template-columns:repeat(2,1fr)}.pro-searchbox{padding:14px}}`;document.head.append(style);
})();