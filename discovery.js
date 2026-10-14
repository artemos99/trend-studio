/* Trend Studio Global Radar — real worldwide YouTube discovery and visual thumbnail matches. */
(function(){
"use strict";
const bridge=()=>window.TrendBridge;
const esc=v=>html(String(v??""));
const validVideo=v=>/^[A-Za-z0-9_-]{11}$/.test(String(v||""));
const labelNumber=v=>Number.isFinite(Number(v))?Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(Number(v)):'—';
const exactNumber=v=>Number(v||0).toLocaleString('en-US');
const minutes=n=>{n=Math.max(0,Number(n)||0);return Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');};
const agoDays=v=>Math.max(.125,(Date.now()-Date.parse(v.publishedAt||0))/86400000||99999);
const pace=v=>(Number(v.views)||0)/agoDays(v);
const ytThumb=v=>validVideo(v.id)?'https://i.ytimg.com/vi/'+v.id+'/mqdefault.jpg':'';
const clean=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9а-яё]+/gi,' ').replace(/\s+/g,' ').trim();
const terms=s=>clean(s).split(' ').filter(Boolean);
const wordsIgnore=new Set(['a','the','we','i','and','or','in','on','of','to','with','for','my','our','you','is','at','vs','from','by','this','that','an','are','be','how','as','24','hours','hour','new','video','kids','family','funny','challenge','best','last']);
const colors=new Set(['color','colors','colour','colours','pink','red','blue','black','white','yellow','green','purple','rainbow','orange','brown','gold','silver']);
const gameWords=new Set(['challenge','challenges','vs','versus','battle','compete','competition','contest','team','teams','race','only','choose','chooses','pick','picks','swap','swaps','switch','switching','last','wins','win','build','building','24','survive','hide','seek']);
const similarTerms={colors:'color',colours:'color',colour:'color',challenges:'challenge',competing:'competition',competitions:'competition',vs:'versus',challenges:'challenge',hiding:'hide',hidden:'hide',seeking:'seek',boxes:'box',mysteries:'mystery'};
const canonical=t=>similarTerms[t]||t;
const D={query:'',searched:'',results:[],loading:false,error:'',next:null,pages:0,fetchedAt:0,sort:'relevance',minViews:0,minSubs:0,days:0,region:'US',language:'',strict:true,searchOrder:'relevance',selected:null,related:[],relatedLoading:false,relatedError:'',visualAttempted:false,visualCount:0,request:0,cache:new Map(),detailRequest:0};
const fingerprintCache=new Map();
const defaultTheme=()=>bridge()?.creatorProfile()?.topics?.[0]||'color challenge';

function relevance(v,theme){
 const q=clean(theme),input=terms(theme),want=[...new Set(input.map(canonical))];
 const title=clean(v.title),desc=clean((v.description||'').slice(0,2800)),
  tags=clean((v.tags||[]).join(' ').slice(0,1800));
 const t=terms(title).map(canonical),d=terms(desc).map(canonical),g=terms(tags).map(canonical);
 const ts=new Set(t),ds=new Set(d),gs=new Set(g),all=new Set([...t,...d,...g]);
 const colorTheme=(input.includes('color')||input.includes('colour')||input.includes('colors')||input.includes('colours'))&&input.some(x=>x==='challenge'||x==='challenges'||x==='battle'||x==='competition');
 let valid=true;
 if(colorTheme){
  const main=[...ts,...gs],color=main.some(w=>colors.has(w));
  const competing=main.some(w=>gameWords.has(w));
  const exact=/(color|colour)s?\s+(challenge|battle|competition)/.test(title+' '+tags);
  valid=color&&(competing||exact);
 }else{
  const matched=want.filter(w=>all.has(w)).length;
  valid=matched>=Math.max(1,Math.ceil(want.length*.7))&&(want.length===1||want.some(w=>ts.has(w)||gs.has(w)));
 }
 let score=0;
 for(const word of want){if(ts.has(word))score+=14;if(gs.has(word))score+=7;if(ds.has(word))score+=2;}
 if(title.includes(q))score+=24;
 if(tags.includes(q))score+=12;
 if(desc.includes(q))score+=4;
 // Video search may return a metadata-heavy description that mentions everything.
 // Require a meaningful topic cue in the title or tags to avoid false positives.
 const titleOrTag=want.some(w=>ts.has(w)||gs.has(w));
 if(!titleOrTag)valid=false;
 if(valid&&colorTheme&&title.includes('challenge'))score+=8;
 return {valid,score,matched:want.filter(w=>all.has(w)),why:title.includes(q)?'Title matches exact theme':tags.includes(q)?'Matching video tags':want.filter(w=>ts.has(w)).length?'Relevant title keywords':'Relevant description and tags'};
}
function enriched(v){return {...v,_rel:relevance(v,D.searched||D.query),_pace:pace(v)};}
function visibleVideos(){
 let rows=D.results.map(enriched).filter(v=>(!D.strict||v._rel.valid)&&Number(v.views)>=D.minViews&& (D.minSubs===0||Number(v.subscriberCount)>=D.minSubs));
 if(D.days)rows=rows.filter(x=>agoDays(x)<=D.days+1);
 if(D.sort==='views')rows.sort((a,b)=>b.views-a.views);
 else if(D.sort==='subscribers')rows.sort((a,b)=>(b.subscriberCount??-1)-(a.subscriberCount??-1));
 else if(D.sort==='pace')rows.sort((a,b)=>b._pace-a._pace);
 else if(D.sort==='newest')rows.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
 else if(D.sort==='engagement')rows.sort((a,b)=>(b.likes/Math.max(1,b.views))-(a.likes/Math.max(1,a.views)));
 else rows.sort((a,b)=>b._rel.score-a._rel.score||b.views-a.views);
 return rows;
}
function opts(){
 return {days:D.days,region:D.region,language:D.language,order:D.searchOrder};
}
async function globalSearch(more=false){
 if(!bridge()?.connected())return toast('Connect YouTube to search the public YouTube catalog.');
 if(D.loading)return;
 const term=String(D.query||document.getElementById('world-query')?.value||'').trim().slice(0,140);
 if(term.length<2)return toast('Enter a theme of at least two characters.');
 if(more&&!D.next)return;
 const reset=!more,token=++D.request;
 D.query=term;
 if(reset){D.results=[];D.next=null;D.pages=0;D.searched=term;D.error='';}
 D.loading=true;render();
 try{
  const key=JSON.stringify({term,options:opts(),page:more?D.next:''});
  let result=D.cache.get(key);
  if(!result||Date.now()-result.savedAt>8*60000){
   result={...(await bridge().searchGlobalVideos(term,{...opts(),...(more?{pageToken:D.next}:{})})),savedAt:Date.now()};
   D.cache.set(key,result);
  }
  if(token!==D.request)return;
  const map=new Map([...D.results,...(result.videos||[])].map(v=>[v.id,v]));
  D.results=[...map.values()];
  D.next=result.nextPageToken||null;
  D.pages++;
  D.fetchedAt=Date.now();
  if(!more&&D.strict&&!D.results.some(x=>relevance(x,term).valid))D.error='No strong theme matches in this sample. Try broader keywords, change the search region, or turn off strict relevance.';
 }catch(e){if(token===D.request)D.error=e.message||String(e);}
 finally{if(token===D.request){D.loading=false;render();}}
}
function formatDate(value){const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'Unknown';}
function pills(v){
 const list=(v.tags||[]).filter(x=>x.length<35).slice(0,4);
 return list.length?'<div class="world-tags">'+list.map(t=>'<span>'+esc(t)+'</span>').join('')+'</div>':'';
}
function videoCard(v){
 const theme=String(D.searched||D.query),r=relevance(v,theme);
 return '<article class="world-video">'+
 '<button type="button" class="world-cover" data-world-video="'+esc(v.id)+'" aria-label="Open analysis of '+esc(v.title)+'">'+
 '<img src="'+ytThumb(v)+'" loading="lazy" alt="YouTube thumbnail: '+esc(v.title)+'"><span class="world-duration">'+minutes(v.duration)+'</span></button>'+
 '<div class="world-content"><div class="world-creator">'+(v.channelAvatar?'<img src="'+esc(v.channelAvatar)+'" alt="" loading="lazy">':'<span class="world-creator-avatar">▶</span>')+
 '<b>'+esc(v.channel)+'</b><span>'+ (v.subscriberCount===null?'Hidden subscribers':labelNumber(v.subscriberCount)+' subscribers')+'</span></div>'+
 '<button type="button" class="world-title" data-world-video="'+esc(v.id)+'">'+esc(v.title)+'</button>'+
 '<p class="world-excerpt">'+esc((v.description||'').replace(/\s+/g,' ').slice(0,140)||'Description not provided by creator')+'</p>'+
 '<div class="world-stats"><b>'+labelNumber(v.views)+' <small>views</small></b><b>'+labelNumber(v._pace)+' <small>avg views/day</small></b><b>'+labelNumber(v.likes)+' <small>likes</small></b></div>'+
 '<div class="world-signals"><span class="'+(r.valid?'world-good':'')+'">'+(r.valid?'✓ Strong theme match':'◷ Broad YouTube match')+'</span><span>'+esc(formatDate(v.publishedAt))+'</span></div>'+
 pills(v)+'<div class="world-actions"><button type="button" class="btn btn-primary" data-world-video="'+esc(v.id)+'">Analyze + similar thumbnails ↗</button>'+
 '<a href="https://www.youtube.com/watch?v='+v.id+'" target="_blank" rel="noopener noreferrer" class="btn btn-outline">YouTube ↗</a></div></div></article>';
}
function option(values,current){return values.map(([v,label])=>'<option value="'+esc(v)+'" '+(String(v)===String(current)?'selected':'')+'>'+esc(label)+'</option>').join('');}
function radarView(){
 const rows=visibleVideos(),connected=Boolean(bridge()?.connected()),hasResults=Boolean(D.pages);
 const top=header('YouTube <span class="title-accent">Global Radar.</span>','Search public videos across YouTube—not just channels on your watchlist. Inspect titles, descriptions, tags, subscribers and thumbnails.','WORLDWIDE VIDEO DISCOVERY',
 '<button type="button" class="btn btn-outline" data-world-help>How rankings work ↗</button>');
 const quick=['color challenge','hide and seek','mystery box challenge','Roblox challenge','last to leave','24 hour challenge'];
 return top+
 '<div class="panel world-search"><div class="world-topline"><div><strong>Discover videos by theme</strong><p>Real public YouTube results · Search requests use the YouTube Data API.</p></div>'+
 '<span class="tag '+(connected?'green':'')+'">'+(connected?'● YouTube connected':'○ Connect YouTube')+'</span></div>'+
 '<form id="world-search-form" class="world-search-form"><input id="world-query" class="field" maxlength="140" placeholder="e.g. color challenge, pink vs black, Roblox obby…" value="'+esc(D.query||defaultTheme())+'" aria-label="Worldwide YouTube search query">'+
 '<button type="submit" class="btn btn-primary" '+(!connected||D.loading?'disabled':'')+'>'+(D.loading?'Searching…':'⌕ Search all YouTube')+'</button></form>'+
 '<div class="world-quick">'+quick.map(q=>'<button class="pill" data-world-chip="'+esc(q)+'" type="button">'+esc(q)+'</button>').join('')+'</div>'+
 (!connected?'<p class="world-warning">Connect your YouTube account to search YouTube-wide. You do not need to add channels to your watchlist. <button class="panel-link" data-go="youtube">Connect now ↗</button></p>':'')+
 '<div class="world-controls"><label>Sort by<select class="field" data-world-filter="sort">'+option([['relevance','Best theme match'],['views','Most views'],['subscribers','Most channel subscribers'],['pace','Fast-growing estimate · avg views/day'],['newest','Newest'],['engagement','Highest likes per view']],D.sort)+'</select></label>'+
 '<label>Published<select class="field" data-world-filter="days">'+option([['0','Any time'],['7','Last 7 days'],['30','Last 30 days'],['90','Last 90 days'],['365','Last 12 months']],D.days)+'</select></label>'+
 '<label>Minimum views<select class="field" data-world-filter="minViews">'+option([['0','Any'],['10000','10K+'],['100000','100K+'],['1000000','1M+'],['10000000','10M+']],D.minViews)+'</select></label>'+
 '<label>Channel subscribers<select class="field" data-world-filter="minSubs">'+option([['0','Any'],['10000','10K+'],['100000','100K+'],['1000000','1M+'],['10000000','10M+']],D.minSubs)+'</select></label>'+
 '<label>Search region<select class="field" data-world-filter="region">'+option([['US','United States'],['GB','United Kingdom'],['CA','Canada'],['IN','India'],['BR','Brazil'],['MX','Mexico'],['DE','Germany'],['AU','Australia']],D.region)+'</select></label>'+
 '<label>Video language<select class="field" data-world-filter="language">'+option([['','Any'],['en','English'],['es','Spanish'],['ru','Russian'],['pt','Portuguese'],['de','German'],['fr','French'],['hi','Hindi']],D.language)+'</select></label>'+
 '<label>Search order<select class="field" data-world-filter="searchOrder">'+option([['relevance','YouTube relevance'],['viewCount','YouTube most viewed'],['date','Latest uploaded']],D.searchOrder)+'</select></label>'+
 '<label class="world-toggle"><input type="checkbox" id="world-strict" '+(D.strict?'checked':'')+'> Strict theme matching</label></div>'+
 '<p class="world-hint">Topic matching checks titles, descriptions and available tags. “Fast-growing” is estimated from lifetime views ÷ video age—not actual hourly growth. Search is sampled and paginated, not an exhaustive list of all YouTube videos.</p></div>'+
 (D.error?'<div class="world-error">'+esc(D.error)+'</div>':'')+
 '<div class="world-result-head"><div><h3>'+(hasResults?rows.length+' strong results from '+D.results.length+' indexed videos':'Explore a worldwide topic')+'</h3>'+
 '<p>'+(D.loading?'Fetching YouTube metadata and channel statistics…':hasResults?'Results from '+esc(D.searched)+' · Updated '+new Date(D.fetchedAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):'Select a suggested theme above, or enter your own search.')+'</p></div>'+
 (hasResults?'<span class="tag">'+D.pages+' API page'+(D.pages===1?'':'s')+'</span>':'')+'</div>'+
 (D.loading&&!hasResults?'<div class="world-placeholder">Searching YouTube worldwide and analyzing topic relevance…</div>':
 rows.length?'<div class="world-grid">'+rows.map(videoCard).join('')+'</div>':
 '<div class="world-placeholder">'+(hasResults?'No videos pass these filters. Disable strict matching, adjust filters, or load another page.':'Search to display real YouTube videos with thumbnails and performance metrics.')+'</div>')+
 (D.next&&D.pages<4?'<div class="world-load"><button class="btn btn-outline" data-world-more '+(D.loading?'disabled':'')+'>'+(D.loading?'Loading…':'↓ Load more YouTube results')+'</button><small>Each new page uses search quota. Up to 200 videos per search session.</small></div>':'')+
 (D.pages>=4?'<p class="world-hint">Reached 200 indexed videos. Refine the topic to search a different segment of YouTube.</p>':'');
}
function helpPanel(){
 openModal('<div class="video-detail world-detail"><button type="button" class="modal-x" data-cloud="close-modal" aria-label="Close">×</button><h2>How Global Radar ranks videos</h2>'+
 '<p>Search results come from YouTube Data API v3. For each video, the app requests title, description, published date, public views/likes, any available creator tags, and channel subscriber counts.</p>'+
 '<p><strong>Strict topic relevance</strong> requires matching theme terms in the title or tags. For color challenges, it also checks color concepts plus competition or challenge words, excluding unrelated videos that merely mention a color.</p>'+
 '<p><strong>Fast-growing estimate</strong> is lifetime public views divided by time since publication. This is not the real YouTube Studio hourly velocity and does not prove that views are accelerating.</p>'+
 '<p><strong>Visual thumbnail matching</strong> compares downsampled image patterns and color composition for a small sample of topic-matched candidates. It is an approximate perceptual ranking, not the same AI embedding or image search technology that YouTube might use internally.</p>'+
 '<p>Public APIs do not reveal CTR, watch-time retention, impression counts, or exact live subscriber increments for other creators. YouTube search is quota-limited, so results are sampled.</p></div>');
}
function detailMarkup(v){
 return '<div class="video-detail world-detail"><button type="button" class="modal-x" data-cloud="close-modal" aria-label="Close">×</button>'+
 '<div class="eyebrow">GLOBAL RADAR · VIDEO ANALYSIS</div><h2>'+esc(v.title)+'</h2><p>'+esc(v.channel)+' · '+esc(formatDate(v.publishedAt))+'</p>'+
 '<div class="world-detail-top"><img src="'+ytThumb(v)+'" alt="Thumbnail of '+esc(v.title)+'" loading="lazy">'+
 '<div class="world-detail-insights"><div><strong>'+exactNumber(v.views)+'</strong><small>views</small></div>'+
 '<div><strong>'+labelNumber(v.subscriberCount)+'</strong><small>channel subscribers</small></div>'+
 '<div><strong>'+labelNumber(pace(v))+'</strong><small>lifetime avg views/day</small></div>'+
 '<div><strong>'+labelNumber(v.likes)+'</strong><small>likes</small></div></div></div>'+
 '<div class="world-detail-actions"><a class="btn btn-outline" href="https://www.youtube.com/watch?v='+v.id+'" target="_blank" rel="noopener noreferrer">▶ Watch on YouTube ↗</a>'+
 '<button type="button" class="btn btn-primary" data-world-save="'+v.id+'">＋ Save as idea</button></div>'+
 '<details class="world-metadata"><summary>Analyze title, description and tags</summary>'+
 '<div><b>Title analysis</b><p>'+esc(relevance(v,D.searched||D.query).why)+'</p><b>Full description</b><p>'+esc((v.description||'No description provided').slice(0,5000))+'</p>'+
 '<b>Video tags</b>'+pills(v)+(v.tags?.length?'':'<p>No public tags were returned by YouTube for this video.</p>')+'</div></details>'+
 '<div class="world-similar-head"><h3>Videos with similar topics & thumbnails</h3><small>Public videos from across YouTube—not limited to the watchlist.</small></div>'+
 '<div id="world-related" class="world-related"><p>Searching for visually and thematically related videos…</p></div>'+
 '<p class="world-hint">Thumbnail resemblance uses color/layout pattern comparison; topic relevance comes from actual video metadata. Both are approximate.</p>'+
 '</div>';
}
function showDetail(id){
 const video=D.results.find(x=>x.id===id)||D.related.find(x=>x.id===id);
 if(!video)return toast('This video is not in the loaded results.');
 if(!validVideo(id))return;
 D.selected=video;D.related=[];D.relatedLoading=true;D.relatedError='';D.visualAttempted=false;D.visualCount=0;
 openModal(detailMarkup(video));void loadRelated(video);
}
function candidateTerm(v){
 const q=terms(D.searched||D.query).map(canonical);
 const fromTitle=terms(v.title).map(canonical).filter(t=>t.length>=4&&!wordsIgnore.has(t)&&!q.includes(t));
 return [...new Set([...q,...fromTitle.slice(0,2)])].join(' ').slice(0,140);
}
function dot(a,b){
 let same=0;for(let i=0;i<64;i++)if(a.bits[i]===b.bits[i])same++;
 const dh=same/64;
 let e=0;for(let i=0;i<a.colors.length;i++)e+=Math.abs(a.colors[i]-b.colors[i]);
 const similarity=Math.max(0,1-e/(a.colors.length*200));
 return dh*.6+similarity*.4;
}
async function fingerprint(id){
 if(!validVideo(id))throw Error('Invalid video thumbnail');
 if(fingerprintCache.has(id))return fingerprintCache.get(id);
 const promise=(async()=>{
  const res=await fetch('https://dbzssfoirntxqeugpvbl.supabase.co/functions/v1/trend-thumb-pixels?id='+encodeURIComponent(id),{mode:'cors',credentials:'omit'});
  if(!res.ok)throw Error('Could not analyze thumbnail pixels');
  const blob=await res.blob();
  const img=await createImageBitmap(blob);
  try{
   const canvas=document.createElement('canvas');canvas.width=9;canvas.height=8;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Canvas unavailable');
   ctx.drawImage(img,0,0,9,8);
   const data=ctx.getImageData(0,0,9,8).data,bits=[];
   const lum=(x,y)=>{const at=(y*9+x)*4;return data[at]*.299+data[at+1]*.587+data[at+2]*.114;};
   for(let y=0;y<8;y++)for(let x=0;x<8;x++)bits.push(lum(x,y)<lum(x+1,y));
   canvas.width=4;canvas.height=4;
   ctx.drawImage(img,0,0,4,4);
   const colorData=ctx.getImageData(0,0,4,4).data,colors=[];
   for(let i=0;i<colorData.length;i+=4)colors.push(colorData[i],colorData[i+1],colorData[i+2]);
   return{bits,colors};
  }finally{img.close();}
 })();
 fingerprintCache.set(id,promise);
 try{return await promise;}catch(e){fingerprintCache.delete(id);throw e;}
}
async function thumbnailRanking(reference,videos,limit=20){
 let source;try{source=await fingerprint(reference.id);}catch{return{list:videos.map(v=>({...v,_imageScore:null})),used:0};}
 let used=0,completed=0;
 const jobs=videos.slice(0,limit).map(async(candidate,index)=>{
  // Limited batches to avoid hitting image proxy with dozens of concurrent requests.
  await new Promise(resolve=>setTimeout(resolve,Math.floor(index/5)*180));
  try{
   const pixels=await fingerprint(candidate.id);completed++;used++;
   return{id:candidate.id,score:dot(source,pixels)};
  }catch{return{id:candidate.id,score:null};}
 });
 const scores=new Map((await Promise.all(jobs)).map(x=>[x.id,x.score]));
 return{list:videos.map(v=>({...v,_imageScore:scores.get(v.id)??null})),used};
}
async function loadRelated(ref){
 const marker=++D.detailRequest,here=D.searched||D.query||'color challenge';
 const q=candidateTerm(ref),all=new Map(D.results.filter(v=>v.id!==ref.id).map(v=>[v.id,v]));
 try{
  if(bridge()?.connected()){
   const result=await bridge().searchGlobalVideos(q,{region:D.region,language:D.language,order:'relevance',days:0});
   for(const v of result.videos||[])if(v.id!==ref.id)all.set(v.id,v);
  }
  const candidates=[...all.values()].filter(v=>relevance(v,here).valid)
   .sort((a,b)=>relevance(b,here).score-relevance(a,here).score||b.views-a.views).slice(0,30);
  const matches=await thumbnailRanking(ref,candidates,20);
  if(marker!==D.detailRequest)return;
  D.visualAttempted=true;D.visualCount=matches.used;
  D.related=matches.list.sort((a,b)=>{
   const sa=(a._imageScore??.0)*80+Math.min(65,relevance(a,here).score)*.4;
   const sb=(b._imageScore??.0)*80+Math.min(65,relevance(b,here).score)*.4;
   return sb-sa;
  });
 }catch(e){
  if(marker!==D.detailRequest)return;
  D.relatedError=e.message||String(e);
  D.related=[...all.values()].filter(x=>relevance(x,here).valid).slice(0,12);
 }
 finally{
  if(marker===D.detailRequest){
   D.relatedLoading=false;
   const el=document.getElementById('world-related');
   if(el&&D.selected?.id===ref.id)el.innerHTML=relatedMarkup();
  }
 }
}
function relatedMarkup(){
 return (D.relatedError?'<p class="world-warning">'+esc(D.relatedError)+'</p>':'')+
 (D.visualCount?'<p class="world-visual-status">✓ Compared actual thumbnail colors and visual patterns on '+D.visualCount+' candidates.</p>':
 '<p class="world-hint">Visual analysis is unavailable for these thumbnails; showing metadata-based topic matches instead.</p>')+
 (D.related.length?'<div class="world-related-grid">'+D.related.slice(0,12).map(v=>
 '<button class="world-related-video" data-world-video="'+esc(v.id)+'">'+
 '<img src="'+ytThumb(v)+'" alt="Video thumbnail" loading="lazy"><b>'+esc(v.title)+'</b>'+
 '<span>'+esc(v.channel)+' · '+labelNumber(v.views)+' views</span>'+
 (v._imageScore!==null&&v._imageScore!==undefined?'<span class="world-image-match">'+Math.round(v._imageScore*100)+'% thumbnail pattern resemblance</span>':'<span class="world-image-match">Topic match</span>')+'</button>').join('')+'</div>':
 '<p>No sufficiently similar public videos were found in the sampled search results. Try a broader theme.</p>');
}
function saveWorldIdea(id){
 const v=D.results.find(x=>x.id===id)||D.related.find(x=>x.id===id);if(!v)return;
 if(state.ideas.some(x=>x.sourceId===id))return toast('This video is already saved as an idea.');
 state.ideas.unshift({id:crypto.randomUUID?.()||String(Date.now()),sourceId:id,title:'Inspired by: '+v.title,
  description:'Reference: https://www.youtube.com/watch?v='+id+'\nWhy it relates: '+relevance(v,D.searched||D.query).why+
   '\nDevelop an original concept with distinct structure, storytelling, and visual identity.',
  topic:D.searched||D.query||'YouTube inspiration',status:'Idea',updated:Date.now()});
 persist();toast('Saved as an Idea Vault reference.');
}
const originalSetPage=setPage;
setPage=function(page){
 const out=originalSetPage(page);
 if(page==='radar'&&bridge()?.connected()&&!D.pages&&!D.loading){
  D.query=defaultTheme();void globalSearch();
 }
 return out;
};
radar=function(){return radarView();};
compStage=function(){
 return header('Compilation Studio <span class="title-accent">— Under Construction.</span>',
 'We’re rebuilding the automatic compilation workflow for reliable, professional results. The editor is temporarily disabled.',
 'COMING SOON')+
 '<div class="panel world-under-construction"><div class="world-construction-symbol">✂</div><h2>A better Compilation Studio is on the way.</h2>'+
 '<p>Automatic highlight detection, timeline assembly, preview, and export are currently unavailable while we redesign the experience.</p>'+
 '<p>Your YouTube account, watchlist and Radar still work normally. No editing or video processing takes place on this page.</p>'+
 '<button class="btn btn-primary" data-go="radar">Explore Global Radar ↗</button></div>';
};
const eventsTarget=e=>e?.target?.closest?.('button');
document.addEventListener('submit',event=>{
 if(event.target?.id==='world-search-form'){
  event.preventDefault();D.query=document.getElementById('world-query')?.value||D.query;void globalSearch(false);
 }
});
document.addEventListener('change',event=>{
 const e=event.target,k=e.dataset?.worldFilter;
 if(k){
  const numeric=new Set(['minViews','minSubs','days']);
  D[k]=numeric.has(k)?Number(e.value):e.value;
  if(['days','region','language','searchOrder'].includes(k)){D.pages=0;D.results=[];D.next=null;D.error='';render();if(bridge()?.connected())void globalSearch();}
  else render();
 }
 if(e.id==='world-strict'){D.strict=e.checked;render();}
});
document.addEventListener('click',event=>{
 const b=eventsTarget(event);if(!b)return;
 if(b.dataset.worldChip!==undefined){
  D.query=b.dataset.worldChip;D.searched=D.query;D.strict=true;D.pages=0;D.results=[];render();
  if(bridge()?.connected())void globalSearch();
 }
 if(b.dataset.worldMore!==undefined)void globalSearch(true);
 if(b.dataset.worldHelp!==undefined)helpPanel();
 if(b.dataset.worldVideo!==undefined)showDetail(b.dataset.worldVideo);
 if(b.dataset.worldSave!==undefined)saveWorldIdea(b.dataset.worldSave);
});
const style=document.createElement('style');style.textContent=String.raw`.world-search{padding:23px;margin:6px 0 22px}.world-topline,.world-result-head{display:flex;justify-content:space-between;gap:15px;align-items:start;flex-wrap:wrap}.world-topline strong{font-size:17px}.world-topline p,.world-result-head p{margin:5px 0;color:#a8b6cc;font-size:12px}.world-search-form{display:flex;gap:9px;margin:18px 0 10px}.world-search-form input{flex:1;min-width:0}.world-search-form button{min-width:175px}.world-quick{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 22px}.world-quick button{font-size:12px;padding:8px 11px}.world-controls{border-top:1px solid #344057;padding-top:15px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px}.world-controls label{font-size:11px;color:#aab8cc;display:flex;flex-direction:column;gap:6px}.world-controls .field{width:100%;min-width:0;font-size:12px}.world-controls .world-toggle{flex-direction:row;align-items:center;gap:8px;padding:15px 0 0;color:#e3daff}.world-toggle input{accent-color:#aa8cff;width:17px;height:17px}.world-hint{margin:14px 0 0;font-size:11px;color:#9aabc0;line-height:1.5}.world-warning,.world-error{padding:12px 15px;border-radius:10px;margin:12px 0;background:#382c36;border:1px solid #6b495b;color:#ffdad6;font-size:12px}.world-result-head{margin:18px 0 13px}.world-result-head h3{font-size:19px;margin:0}.world-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(286px,1fr));gap:14px}.world-video{background:#141f32;border:1px solid #303c54;border-radius:14px;overflow:hidden;transition:border-color .15s,transform .15s;display:flex;flex-direction:column}.world-video:hover{border-color:#7f75aa;transform:translateY(-2px)}.world-cover{display:block;border:0;background:#0b1121;padding:0;cursor:pointer;position:relative;width:100%;aspect-ratio:16/9}.world-cover img{width:100%;height:100%;object-fit:cover}.world-duration{position:absolute;right:9px;bottom:8px;padding:3px 5px;background:#080e17d9;border-radius:5px;color:#fff;font-size:11px}.world-content{padding:13px 15px 16px;display:flex;flex-direction:column;gap:10px;flex:1}.world-creator{display:flex;align-items:center;gap:7px;color:#b7c6dd;font-size:11px;flex-wrap:wrap}.world-creator img,.world-creator-avatar{height:25px;width:25px;border-radius:50%;object-fit:cover;background:#52426e;display:grid;place-items:center;flex-shrink:0}.world-creator b{font-size:12px;color:#e8ecfb}.world-creator>span:not(.world-creator-avatar){margin-left:auto}.world-title{border:0;background:transparent;color:#f5f4ff;font-size:15px;line-height:1.3;font-weight:700;text-align:left;padding:0;cursor:pointer}.world-title:hover{color:#c2b0ff}.world-excerpt{font-size:11px;color:#a5b4ca;margin:0;max-height:2.8em;overflow:hidden;line-height:1.4}.world-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;background:#1e2a40;border-radius:9px;padding:11px 8px}.world-stats b{font-size:15px;white-space:nowrap}.world-stats small{display:block;color:#a6b9d1;font-size:10px;font-weight:400;margin-top:4px}.world-signals{display:flex;justify-content:space-between;align-items:center;gap:8px;color:#a8b9cb;font-size:10px}.world-good{color:#9ce7d0}.world-tags{display:flex;flex-wrap:wrap;gap:5px}.world-tags span{padding:4px 7px;border-radius:6px;background:#29334d;color:#b7bfe1;font-size:10px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.world-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:auto}.world-actions .btn{font-size:11px;padding:9px 10px}.world-placeholder{text-align:center;padding:54px 18px;border:1px dashed #41506c;border-radius:14px;color:#aabbd0;background:#111c2d}.world-load{text-align:center;padding:24px}.world-load small{display:block;color:#95a8c2;margin-top:8px}.world-detail{max-width:940px}.world-detail>h2{line-height:1.25}.world-detail-top{display:grid;grid-template-columns:minmax(210px,1.2fr) 1fr;gap:15px;margin:16px 0}.world-detail-top>img{width:100%;aspect-ratio:16/9;border-radius:11px;object-fit:cover}.world-detail-insights{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.world-detail-insights>div{background:#1b2840;border:1px solid #3b465e;border-radius:9px;padding:12px}.world-detail-insights strong{display:block;font-size:19px}.world-detail-insights small{font-size:11px;color:#b0bed4}.world-detail-actions{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}.world-metadata{border-top:1px solid #3d4862;padding:13px 0;margin:15px 0}.world-metadata summary{cursor:pointer;font-weight:600}.world-metadata p{white-space:pre-line;overflow-wrap:anywhere;color:#b0bed3;font-size:12px}.world-similar-head{border-top:1px solid #3d4862;padding-top:16px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.world-similar-head h3{margin:0}.world-similar-head small{color:#9dabc1}.world-related-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:11px;margin:12px 0}.world-related-video{border:1px solid #384762;border-radius:9px;background:#1b2840;color:#eaf0ff;padding:8px;text-align:left;cursor:pointer}.world-related-video:hover{border-color:#9a83ed}.world-related-video>img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:7px}.world-related-video b{display:block;font-size:11px;line-height:1.3;max-height:3.9em;overflow:hidden;margin:6px 0}.world-related-video>span{display:block;font-size:10px;color:#abbad2;margin-top:3px}.world-related-video .world-image-match{color:#8adcc8;margin-top:7px}.world-visual-status{font-size:11px;color:#9ce6d1}.world-under-construction{padding:46px 24px;text-align:center;max-width:780px;margin:25px auto}.world-construction-symbol{font-size:72px;color:#b6a0e6;margin-bottom:15px}.world-under-construction h2{font-size:24px}.world-under-construction p{color:#acbbd2;max-width:580px;margin:15px auto;line-height:1.6}@media(max-width:900px){.world-controls{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:640px){.world-controls{grid-template-columns:repeat(2,minmax(0,1fr))}.world-search{padding:15px}.world-search-form{flex-direction:column}.world-search-form button{width:100%}.world-detail-top{grid-template-columns:1fr}.world-video{max-width:none}.world-creator>span:not(.world-creator-avatar){margin-left:0}}`;document.head.append(style);
})();
