
/* Trend Studio: zero-dependency frontend. Sample metrics are synthetic and clearly marked. */
const STORAGE='nam-trend-studio-v1';
const DEFAULT_CHANNELS=[
 {handle:'@nastyaartemmiaen',name:'Nastya Artem Mia EN',role:'my'},
 {handle:'@nastyaartemmiaesp',name:'Nastya Artem Mia ESP',role:'my'},
 {handle:'@LikeNastyaofficial',name:'Like Nastya',role:'competitor'},
 {handle:'@VladandNiki',name:'Vlad and Niki',role:'competitor'},
 {handle:'@KidsDianaShow',name:'Kids Diana Show',role:'competitor'},
 {handle:'@aforadley',name:'A for Adley',role:'competitor'},
 {handle:'@NinjaKidzTV',name:'Ninja Kidz TV',role:'competitor'}
];
const TOPICS=[
 {name:'Color vs Color',icon:'🎨',query:'pink vs black challenge kids',desc:'Visual team competitions and contrasting worlds',words:['color','pink','black','purple','blue','red','rainbow','color battle','colors']},
 {name:'Mystery Box',icon:'🎁',query:'mystery box challenge family',desc:'Surprise reveals, choices and escalating stakes',words:['mystery','box','surprise','secret','blind']},
 {name:'Escape & Obstacle',icon:'🔐',query:'escape room obstacle challenge kids',desc:'Timed escapes, puzzle rooms and obstacle courses',words:['escape','obstacle','maze','prison','trap']},
 {name:'24-Hour Challenges',icon:'⏰',query:'24 hours challenge family',desc:'Time-based family adventures and endurance',words:['24 hour','overnight','last to leave','100 hours']},
 {name:'Rich vs Poor',icon:'💎',query:'rich vs poor challenge kids',desc:'Contrasting budgets, lifestyles and transformations',words:['rich','poor','cheap','expensive','billionaire']},
 {name:'School & Life Stories',icon:'🎒',query:'school stories kids challenge',desc:'Relatable situations with a clear story payoff',words:['school','teacher','classroom','student','baby sitter','babysitter']},
 {name:'Hide & Seek',icon:'🙈',query:'hide and seek family challenge',desc:'Hidden spaces, funny twists and teamwork',words:['hide','seek','hidden','find me']},
 {name:'Food & Candy',icon:'🍭',query:'giant food candy challenge kids',desc:'Colorful food games, taste tests and size battles',words:['candy','food','eating','chocolate','giant','tiny']}
];
const DEMO_VIDEOS=[
 ['We Built a PINK vs BLACK House for 24 Hours!','Like Nastya',7,3820000,192000,19,'🎀','Color vs Color'],
 ['LAST TO LEAVE the GIANT Mystery Box Wins!','Vlad and Niki',11,5100000,267000,15,'🎁','Mystery Box'],
 ['ESCAPE the 5 Color Rooms Before Time Runs Out!','Ninja Kidz TV',4,2800000,89000,14,'🔐','Escape & Obstacle'],
 ['We Swapped RICH vs POOR Families for a Day','A for Adley',16,2900000,144000,21,'💎','Rich vs Poor'],
 ['Nastya and Friends Try the Rainbow Challenge','Kids Diana Show',9,4020000,172000,12,'🌈','Color vs Color'],
 ['HIDE AND SEEK in a House With 100 Secret Doors','Ninja Kidz TV',2,1050000,36000,13,'🚪','Hide & Seek'],
 ['GIANT vs TINY School Supplies Challenge!','Like Nastya',25,5700000,99000,16,'🎒','School & Life Stories'],
 ['Who Can Survive 24 HOURS in a Color Castle?','Vlad and Niki',19,3750000,102000,20,'🏰','24-Hour Challenges'],
 ['The Mystery Vending Machine Chooses Our Food','A for Adley',6,760000,21000,14,'🍭','Food & Candy'],
 ['We Got Trapped in an ESCAPE ROOM for Kids','Kids Diana Show',14,1450000,49000,18,'🧩','Escape & Obstacle'],
 ['BLACK vs PINK vs BLUE — Which Team Wins?','Like Nastya',3,1910000,79000,11,'🎨','Color vs Color'],
 ['Types of Students on the FIRST DAY of School','Kids Diana Show',22,1700000,39000,23,'🏫','School & Life Stories'],
 ['Mystery Wheel Decides Our Whole Day','Vlad and Niki',29,2580000,72000,13,'🎡','Mystery Box'],
 ['100 LAYERS of Candy vs Real Food!','Ninja Kidz TV',8,1350000,43000,14,'🍬','Food & Candy'],
 ['The Last Person to Leave This Maze Wins','A for Adley',18,1230000,28000,17,'🌀','Escape & Obstacle'],
 ['Nastya and Artem Play Purple vs Green!','Nastya Artem Mia EN',33,510000,9600,12,'💜','Color vs Color'],
 ['Artem and Mia Learn School Safety Rules','Nastya Artem Mia EN',42,420000,7900,17,'📚','School & Life Stories'],
 ['Nastya, Artem y Mia: Reto Rosa vs Negro','Nastya Artem Mia ESP',12,870000,14700,18,'💗','Color vs Color']
];
const html=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const money=n=>Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(Number(n)||0);
const num=n=>Intl.NumberFormat('en').format(Number(n)||0);
const median=arr=>{const a=arr.filter(x=>Number.isFinite(x)).sort((a,b)=>a-b);return a.length?(a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2:0};
const timeAgo=days=>days<1?'today':Math.floor(days)+'d ago';
const agoDate=d=>new Date(Date.now()-d*86400000).toISOString();
const todayString=()=>new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const palette=['#9270db','#d46c92','#699ce7','#85bba7','#d2a15e','#c16d84','#9a83bd','#9cab68'];
function matchTopic(title){const s=title.toLowerCase();return TOPICS.find(t=>t.words.some(w=>s.includes(w)))?.name||'Other';}
function videoAge(v){return Math.max(.2,(Date.now()-new Date(v.publishedAt).getTime())/86400000)}
function normalizeVideos(videos){const vv=videos.map(v=>({...v,topic:matchTopic(v.title),age:videoAge(v),pace:(v.views||0)/videoAge(v)}));const byChannel={};for(const v of vv)(byChannel[v.channel]??=[]).push(v.pace);for(const v of vv){const base=median(byChannel[v.channel]);v.outlier=base>0?Math.max(.1,Math.min(99,v.pace/base)):1;}return vv}
function makeDemo(){return normalizeVideos(DEMO_VIDEOS.map(([title,channel,age,views,likes,duration,emoji,topic],i)=>({id:'demo-'+i,title,channel,age,views,likes,duration:duration*60,emoji,topic,publishedAt:agoDate(age),subscribers:0,source:'demo'})))}
let saved={};try{saved=JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch{}
const state={page:'overview',mode:'demo',videos:makeDemo(),channels:saved.channels||DEFAULT_CHANNELS,ideas:saved.ideas||[],keywords:saved.keywords||TOPICS.map(t=>t.query),days:Number(saved.days)||30,sort:'momentum',query:'',topic:'All',category:'All videos',warnings:[],scannedAt:null,loading:false,apiConfigured:false};
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify({channels:state.channels,ideas:state.ideas,keywords:state.keywords,days:state.days}))}catch{}document.getElementById('vault-count').textContent=state.ideas.length}
function toast(s){const x=document.getElementById('toast');x.textContent=s;x.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>x.classList.remove('show'),3400)}
function setPage(page){state.page=page;document.querySelectorAll('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.page===page));document.getElementById('page-crumb').textContent=({overview:'Overview',radar:'Video radar',competitors:'Competitors',topics:'Topic signals',ideas:'Idea vault',planner:'Content planner',settings:'Data & settings',compilation:'Compilation Studio'})[page];render();window.scrollTo(0,0)}
function setMode(mode){state.mode=mode;document.getElementById('sidebar-mode').innerHTML=mode==='live'?'<span class="status-dot live"></span><span>Live YouTube data</span>':'<span class="status-dot"></span><span>Sample data mode</span>'}
function header(title,subtitle,eyebrow='YOUR CREATIVE COMMAND CENTER',action=''){return `<div class="page-header"><div><div class="eyebrow">${eyebrow}</div><h1 class="page-title">${title}</h1><p class="page-subtitle">${subtitle}</p></div>${action}</div>`}
function banner(){return state.mode==='demo'?`<div class="sample-banner"><div><strong>✦ Preview mode</strong> · Numbers and video examples below are synthetic sample data, not real competitor results. Offline edition — live statistics are not included.</div><button data-go="settings">About offline mode ↗</button></div>`:`<div class="sample-banner" style="border-color:#355b53;background:#162a30;color:#99dfcd"><div><strong style="color:#9af0d9">● Live YouTube API</strong> · Public view counts and uploads from ${html(state.scannedAt||'this scan')}. Views/day and outliers are estimates, not actual 24h view velocity.</div><button data-action="scan">Refresh ↗</button></div>`}
function topicRows(){const pool=state.videos.filter(v=>state.mode==='demo'||v.age<=state.days);return TOPICS.map(t=>{const a=pool.filter(v=>v.topic===t.name),m=median(a.map(v=>v.pace));return {...t,count:a.length,pace:m,score:a.length?Math.min(100,Math.round(17+Math.log10(m+1)*8+a.length*4)):0}}).sort((a,b)=>b.score-a.score)}
function kpis(){const a=state.videos, competitor=state.channels.filter(c=>c.role==='competitor').length, breakout=a.filter(v=>v.outlier>=1.5).length, top=topicRows()[0];return `<div class="kpi-grid"><div class="panel kpi"><div class="kpi-label">Videos indexed</div><div class="kpi-value">${num(a.length)}</div><div class="kpi-detail">${state.mode==='demo'?'Illustrative video library':'From this API scan'}</div><div class="kpi-icon">◉</div></div><div class="panel kpi"><div class="kpi-label">Competitors tracked</div><div class="kpi-value">${competitor}</div><div class="kpi-detail">Across your watchlist</div><div class="kpi-icon pink">♟</div></div><div class="panel kpi"><div class="kpi-label">Pace outliers · 1.5×+</div><div class="kpi-value">${breakout}</div><div class="kpi-detail">Estimated versus channel peers</div><div class="kpi-icon green">↗</div></div><div class="panel kpi"><div class="kpi-label">Leading signal</div><div class="kpi-value" style="font-size:20px;margin-top:17px">${html(top?.name||'No data')}</div><div class="kpi-detail">${state.mode==='demo'?'Sample':'Indexed-video'} topic ranking</div><div class="kpi-icon gold">✦</div></div></div>`}
function thumb(v){return `<div class="thumb" style="background:linear-gradient(135deg,${palette[Math.abs((v.title.length+v.channel.length)%palette.length)]},#e38c9e)">${v.id?.startsWith('demo')?html(v.emoji||'🎬'):`<img class="thumbnail" src="https://i.ytimg.com/vi/${encodeURIComponent(v.id)}/mqdefault.jpg" alt="" loading="lazy">`}<span class="duration">${Math.floor((v.duration||0)/60)}:${String(Math.floor((v.duration||0)%60)).padStart(2,'0')}</span></div>`}
function savedVideo(v){return state.ideas.some(i=>i.sourceId===v.id)}
function videoRow(v){return `<div class="video-row">${thumb(v)}<div class="video-info"><div class="video-title">${html(v.title)}</div><div class="video-meta"><span>${html(v.channel)}</span><span>·</span><span>${timeAgo(v.age)}</span><span>·</span><span>${html(v.topic)}</span></div></div><div class="video-stats"><b>${money(v.views)}</b><small>views</small><div style="margin-top:8px"><span class="boost">${v.outlier.toFixed(1)}× pace</span></div></div><button class="save ${savedVideo(v)?'active':''}" data-save-video="${html(v.id)}" title="Save as content inspiration">${savedVideo(v)?'✓':'＋'}</button></div>`}
function sortedVideos(list){const s=[...list];if(state.sort==='views')s.sort((a,b)=>b.views-a.views);else if(state.sort==='newest')s.sort((a,b)=>a.age-b.age);else if(state.sort==='pace')s.sort((a,b)=>b.pace-a.pace);else s.sort((a,b)=>b.outlier-a.outlier);return s}
function videoLink(v){if(!v.id||v.id.startsWith('demo'))return '<span class="small-hint">Sample illustration</span>';return `<a href="https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}" target="_blank" rel="noopener" class="panel-link">Open ↗</a>`}
function topicBlock(limit=5){return `<div class="panel"><div class="panel-heading"><div><h3>What's catching attention</h3><small>Patterns in the videos currently indexed</small></div><button class="panel-link" data-go="topics">Explore all ↗</button></div><div class="trends-list">${topicRows().slice(0,limit).map((t,i)=>`<div class="trend-row"><span class="trend-number">0${i+1}</span><div class="trend-icon">${t.icon}</div><div class="trend-main"><div class="trend-name">${html(t.name)}</div><div class="trend-desc">${t.count} matching videos · ${money(t.pace)} median views/day</div><div class="meter"><span style="width:${t.score}%"></span></div></div><div class="trend-score">${t.score}<small>signal index*</small></div></div>`).join('')}</div><div class="small-hint" style="padding:0 22px 18px">*Heuristic based on indexed examples; not a YouTube-wide trend or growth-rate measure.</div></div>`}
function overview(){const top=sortedVideos(state.videos).slice(0,5);return header('Spot the trend. <span class="title-accent">Make the hit.</span>','Your home base for competitor intelligence, emerging concepts, and your next great Nastya Artem Mia shoot.')+banner()+kpis()+`<div class="layout-main"><div class="stack"><div class="panel"><div class="panel-heading"><div><h3>Breakout video radar</h3><small>Sorted by pace versus recent videos from the same channel</small></div><button class="panel-link" data-go="radar">View radar ↗</button></div><div class="video-list">${top.map(videoRow).join('')||empty('No videos yet')}</div></div>${topicBlock(5)}</div><div class="stack"><div class="insight-card"><div class="insight-icon">✦</div><div class="eyebrow" style="margin-top:12px">CREATIVE OPPORTUNITY</div><h3 class="insight-title">Make winning formats your own.</h3><p>Compare how a format performs across creators, then give it a unique Nastya, Artem & Mia twist. Build a recognizable series instead of copying individual videos.</p><button class="btn btn-primary" data-action="generate">✧ Generate video concepts</button></div><div class="panel"><div class="panel-heading"><div><h3>Your next moves</h3><small>Creative workflow at a glance</small></div></div><div class="idea-mini"><span>🔭</span><div><b>Track 5–8 closest competitors</b><small>Prioritize recent uploads, not all-time viral hits.</small></div></div><div class="idea-mini"><span>🎯</span><div><b>Measure topic-level outliers</b><small>Compare performance relative to each creator's own baseline.</small></div></div><div class="idea-mini"><span>🎬</span><div><b>Validate 3 concepts, then shoot 1</b><small>Use the Idea Vault to manage thumbnails, scripts and status.</small></div></div></div><div class="panel" style="padding:20px"><div class="eyebrow">IDEA PIPELINE</div><div class="kpi-value">${state.ideas.length}<span style="font-size:14px;color:#95a1b7;font-weight:500"> saved concepts</span></div><div class="sparkline">${[22,39,31,50,42,69,54,78,63,92,73,98].map(i=>`<span style="height:${i}%"></span>`).join('')}</div><button class="panel-link" data-go="planner">Open your content planner ↗</button></div></div></div>`}
function filteredVideos(){
  const search=state.query.trim().toLowerCase();
  return sortedVideos(state.videos.filter(v=>{
    if(state.topic!=='All'&&v.topic!==state.topic)return false;
    if(search&&![v.title,v.channel,v.topic].join(' ').toLowerCase().includes(search))return false;
    if(state.category==='All videos')return true;
    const owned=state.channels.some(c=>c.role==='my'&&(c.name.toLowerCase()===v.channel.toLowerCase()||c.handle.toLowerCase()===String(v.channelHandle||'').toLowerCase()));
    return state.category==='My channels'?owned:!owned;
  }));
}
function radar(){const rows=filteredVideos();return header('Video <span class="title-accent">radar</span>','Find breakout videos, compare public metrics, and bookmark formats worth testing.','VIDEO DISCOVERY',`<button class="btn btn-outline" disabled title="Live YouTube metrics require the full server version">Sample data only</button>`)+banner()+`<div class="panel"><div class="controls"><input class="field search-field" id="video-search" placeholder="⌕ Search titles, channels, concepts..." value="${html(state.query)}"><select class="field" id="category-select">${['All videos','Competitors','My channels'].map(x=>`<option ${x===state.category?'selected':''}>${x}</option>`).join('')}</select><select class="field" id="sort-select"><option value="momentum" ${state.sort==='momentum'?'selected':''}>Highest pace outlier</option><option value="pace" ${state.sort==='pace'?'selected':''}>Views / day (average)</option><option value="views" ${state.sort==='views'?'selected':''}>Total views</option><option value="newest" ${state.sort==='newest'?'selected':''}>Newest uploads</option></select><select class="field" id="days-select">${[7,14,30,60,90].map(n=>`<option value="${n}" ${n===state.days?'selected':''}>${n}-day scan</option>`).join('')}</select></div><div class="pill-row">${['All',...TOPICS.map(t=>t.name)].map(t=>`<button class="pill ${state.topic===t?'active':''}" data-topic="${html(t)}">${html(t)}</button>`).join('')}</div><div style="padding:0 22px 13px" class="result-count">${rows.length} videos · Public views; outlier uses lifetime average views/day versus indexed channel peers</div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>VIDEO</th><th>TOPIC</th><th>VIEWS</th><th>AVG / DAY</th><th>PEER PACE</th><th>ACTION</th></tr></thead><tbody>${rows.map(v=>`<tr><td><div class="table-video">${thumb(v)}<div><b>${html(v.title)}</b><small>${html(v.channel)} · ${timeAgo(v.age)}</small></div></div></td><td>${html(v.topic)}</td><td><b>${money(v.views)}</b></td><td>${money(v.pace)}</td><td><span class="boost">${v.outlier.toFixed(1)}×</span></td><td><div class="idea-actions"><button class="save ${savedVideo(v)?'active':''}" data-save-video="${html(v.id)}">${savedVideo(v)?'✓':'＋'}</button>${videoLink(v)}</div></td></tr>`).join('')||`<tr><td colspan="6">${empty('No videos matched. Try broader filters or a new scan.')}</td></tr>`}</tbody></table></div></div>`}
function competitors(){const counts={};for(const v of state.videos){(counts[v.channel]??=[]).push(v)}return header('Know who you <span class="title-accent">compete with.</span>','Add the creators who consistently reach the same kids and families as your channel.','COMPETITIVE LANDSCAPE')+banner()+`<div class="panel" style="padding:20px;margin-bottom:20px"><div class="split-toolbar"><div><b>Add a channel to monitor</b><div class="small-hint" style="margin-top:5px">YouTube @handle or channel URL; no passwords needed.</div></div><select class="field" id="new-role"><option value="competitor">Competitor</option><option value="my">My channel</option></select></div><div class="input-row"><input class="field" id="new-channel" placeholder="@ChannelHandle or youtube.com/@ChannelHandle"><button class="btn btn-primary" data-action="add-channel">＋ Add channel</button></div></div><div class="grid3">${state.channels.map((c,i)=>{const a=counts[c.name]||[],views=a.reduce((s,v)=>s+v.views,0),peak=Math.max(0,...a.map(v=>v.outlier));return `<div class="panel competitor-card"><div class="comp-head"><div class="comp-avatar" style="background:${i%3===0?'linear-gradient(135deg,#ae8ded,#ed97b2)':i%3===1?'linear-gradient(135deg,#729ed5,#76c5b4)':'linear-gradient(135deg,#ce8f9d,#c5a778)'}">${html(c.name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase())}</div><div><strong>${html(c.name)}</strong><small>${html(c.handle)} · ${c.role==='my'?'My network':'Competitor'}</small></div></div><div class="comp-kpis"><div><b>${num(a.length)}</b><span>videos in scan</span></div><div><b>${a.length?peak.toFixed(1)+'×':'—'}</b><span>top pace outlier</span></div></div><div class="comp-footer"><span class="tag ${c.role==='my'?'green':''}">${c.role==='my'?'OWNED CHANNEL':'WATCHLIST'}</span><button class="comp-remove" data-remove-channel="${i}">Remove ×</button></div></div>`}).join('')}</div>${state.warnings.length?`<div class="settings-note">Scan notes: ${html(state.warnings.join(' · '))}</div>`:''}`}
function topics(){return header('Your <span class="title-accent">trend signals.</span>','Explore patterns in the indexed sample. High signal means promising within this dataset, not necessarily viral across YouTube.','FORMAT INTELLIGENCE')+banner()+`<div class="grid3">${topicRows().map(t=>`<div class="panel topic-card"><div class="title-line"><div class="trend-icon">${t.icon}</div><span class="tag ${t.count>2?'green':''}">${t.count} indexed</span></div><h3>${html(t.name)}</h3><p>${html(t.desc)}</p><div class="stat-line"><span>Signal index</span><b>${t.score}/100</b></div><div class="meter"><span style="width:${t.score}%"></span></div><div class="comp-footer"><span class="small-hint">${money(t.pace)} median avg views/day</span><button class="panel-link" data-view-topic="${html(t.name)}">View videos ↗</button></div></div>`).join('')}</div><div class="settings-note">These indices rank patterns only inside the returned videos. YouTube does not provide a universal "trending score" or competitor CTR via its public Data API.</div>`}
function ideas(){return header('Turn inspiration <span class="title-accent">into episodes.</span>','Save video formats, draft original twists, and keep the strongest ideas in one place.','IDEA DEVELOPMENT',`<button class="btn btn-primary" data-action="generate">✧ Generate 3 ideas</button>`)+`<div class="split-toolbar"><div class="stat-text">${state.ideas.length} ideas saved · Stored locally in your browser</div><button class="btn btn-ghost" data-action="new-idea">＋ Create an idea</button></div><div class="idea-grid">${state.ideas.map((a,i)=>`<div class="panel idea-card"><span class="tag ${a.status==='Ready to film'?'green':''}">${html(a.status)}</span><h3>${html(a.title)}</h3><p>${html(a.description||'Write a high-concept hook and a unique twist that fits your cast.')}</p><div class="small-hint">${a.sourceId?'Inspired by a video · ':''}${html(a.topic||'Custom concept')}</div><div class="idea-card-footer"><span class="idea-status">${a.updated?new Date(a.updated).toLocaleDateString():''}</span><div class="idea-actions"><button class="icon-btn" data-edit-idea="${i}" title="Edit idea">✎</button><button class="icon-btn" data-delete-idea="${i}" title="Delete idea">×</button></div></div></div>`).join('')||`<div class="panel empty-panel" style="grid-column:1/-1">${empty('Your idea vault is empty. Save a video from the radar or generate three original concepts.')}<div style="text-align:center"><button class="btn btn-primary" data-action="generate">Generate first ideas</button></div></div>`}</div>`}
function planner(){const cols=['Idea','Scripting','Ready to film','Published'];return header('A cleaner <span class="title-accent">content pipeline.</span>','Move each project from a spark to a published video. Changes save automatically.','CONTENT OPERATIONS',`<button class="btn btn-primary" data-action="new-idea">＋ Add video</button>`)+`<div class="kanban">${cols.map(c=>{const group=state.ideas.map((x,i)=>({...x,i})).filter(x=>x.status===c);return `<div class="kanban-col"><div class="kanban-head">${c}<small>${group.length}</small></div>${group.map(a=>`<div class="kanban-card"><b>${html(a.title)}</b><p>${html(a.topic||'Custom concept')}</p><select aria-label="Update ${html(a.title)} status" data-status="${a.i}">${cols.map(s=>`<option ${a.status===s?'selected':''}>${s}</option>`).join('')}</select><button class="panel-link" data-edit-idea="${a.i}">Edit notes ↗</button></div>`).join('')||'<div class="empty-state" style="padding:27px 6px">No videos in this stage</div>'}</div>`}).join('')}</div>`}
function settings(){return header('Your <span class="title-accent">offline workspace.</span>','This browser-only edition is a safe, self-contained interactive demo. Local preview works without accounts; online connections require setup.','DATA & SETTINGS')+`<div class="settings-grid"><div><div class="panel settings-block"><h3>Offline data only</h3><p><span class="tag gold">SAMPLE DATA</span></p><p>The example videos and metrics here are fictional. This file does not contact YouTube or use any API keys.</p><p>Working locally: add competitors, customize discovery keywords, organize and generate video ideas, move ideas through the content planner, and export your work.</p><div class="settings-note">Your work is saved in your browser's local storage for this file. Browser privacy settings or clearing site data may remove it. Export backups regularly.</div></div></div><div><div class="panel settings-block"><h3>Customize your topics</h3><p>Add queries you'd like to research when a live-data edition is available.</p><select class="field wide" id="keyword-select">${state.keywords.map((k,i)=>`<option value="${i}">${html(k)}</option>`).join('')}</select><div class="input-row" style="margin-top:12px"><input class="field" placeholder="e.g. family obstacle course" id="keyword-input"><button class="btn btn-subtle" data-action="add-keyword">Add</button></div></div><div class="panel settings-block"><h3>Workspace export</h3><p>Download a backup containing your channels, keywords, and ideas.</p><button class="btn btn-ghost" data-action="export">↓ Export JSON</button><button class="btn btn-ghost" style="margin-left:7px" data-action="export-videos">↓ Export sample CSV</button></div></div></div>`}

function empty(t){return `<div class="empty-state"><span class="empty-icon">✳</span>${html(t)}</div>`}
function render(){persist();document.getElementById('page-root').innerHTML=({overview,radar,competitors,topics,ideas,planner,settings,compilation:compStage})[state.page]();}
function download(filename,content,mime){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:mime}));a.download=filename;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
function exportData(){download('nastya-trend-studio-workspace.json',JSON.stringify({exportedAt:new Date().toISOString(),channels:state.channels,keywords:state.keywords,ideas:state.ideas},null,2),'application/json');toast('Workspace downloaded')}
function exportVideos(){const head=['Title','Channel','Topic','Publish date','Views','Avg lifetime views per day','Peer pace multiple','YouTube URL'];const rows=state.videos.map(v=>[v.title,v.channel,v.topic,v.publishedAt,v.views,Math.round(v.pace),v.outlier.toFixed(2),v.id.startsWith('demo')?'SAMPLE':'https://www.youtube.com/watch?v='+v.id]);const csv=[head,...rows].map(r=>r.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');download('nastya-trend-studio-videos.csv',csv,'text/csv');toast('Video data exported')}
function openModal(body){document.getElementById('modal-root').innerHTML=`<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true">${body}</div></div>`}
function closeModal(){document.getElementById('modal-root').innerHTML=''}
function addIdeaFromVideo(id){const v=state.videos.find(v=>v.id===id);if(!v)return;const existing=state.ideas.find(i=>i.sourceId===id);if(existing){state.ideas=state.ideas.filter(i=>i.sourceId!==id);toast('Removed from idea vault')}else{state.ideas.unshift({id:(typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():String(Date.now()),sourceId:id,title:'Our version: '+v.title,description:'What is our unique Nastya, Artem & Mia twist? How will the thumbnail tell this story?',topic:v.topic,status:'Idea',updated:Date.now()});toast('Saved to Idea Vault')}render()}
function ideaModal(index=-1){const a=state.ideas[index]||{};openModal(`<h2>${index<0?'Create an idea':'Edit your idea'}</h2><p>Write the hook, make it yours, then move it into production.</p><form id="idea-form"><label>VIDEO TITLE / WORKING HOOK</label><input name="title" required maxlength="180" value="${html(a.title||'')}" placeholder="e.g. Pink vs Black — Our House Split in Two"><label>CONCEPT / THUMBNAIL ANGLE</label><textarea name="description" placeholder="Characters, challenge rules, thumbnail visual, payoff...">${html(a.description||'')}</textarea><label>FORMAT</label><select name="topic">${['Custom concept',...TOPICS.map(t=>t.name)].map(t=>`<option ${t===(a.topic||'Custom concept')?'selected':''}>${html(t)}</option>`).join('')}</select><label>PRODUCTION STATUS</label><select name="status">${['Idea','Scripting','Ready to film','Published'].map(t=>`<option ${t===(a.status||'Idea')?'selected':''}>${t}</option>`).join('')}</select><div class="modal-buttons"><button type="button" class="btn btn-outline" id="close-modal">Cancel</button><button type="submit" class="btn btn-primary">Save idea</button></div></form>`);document.getElementById('idea-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);const idea={...a,id:a.id||String(Date.now()+Math.random()),title:f.get('title').trim(),description:f.get('description').trim(),topic:f.get('topic'),status:f.get('status'),updated:Date.now()};if(!idea.title)return;if(index<0)state.ideas.unshift(idea);else state.ideas[index]=idea;closeModal();render();toast('Idea saved')};document.getElementById('close-modal').onclick=closeModal}
function generateIdeas(){const ranked=topicRows().filter(t=>t.count),selected=(ranked.length?ranked:TOPICS).slice(0,3),make=(topic,i)=>{
const options={
 'Color vs Color':['PINK vs BLACK vs RAINBOW: We Each Build a Secret Room!','Nastya, Artem & Mia Swap Colors for 24 Hours'],
 'Mystery Box':['3 MYSTERY DOORS — Only One Has the Ultimate Prize!','We Let a Mystery Wheel Choose Every Challenge'],
 'Escape & Obstacle':['ESCAPE the 7 Color Rooms Before the Clock Hits Zero!','Our House Becomes a Giant Family Escape Game'],
 '24-Hour Challenges':['LAST TO LEAVE the Rainbow Castle Wins!','24 HOURS in Opposite Color Bedrooms'],
 'Rich vs Poor':['$10 vs $1,000 Secret Room Makeover Challenge','Rich vs Poor Family Switch With a Surprise Ending'],
 'School & Life Stories':['GOOD Student vs BAD Student: Mystery School Challenge','The Classroom Has 5 Secret Missions'],
 'Hide & Seek':['Hide and Seek in 100 Mystery Boxes','We Built 10 Secret Hiding Spots at Home'],
 'Food & Candy':['Giant vs Tiny Food Challenge With a Mystery Judge','Only Eating One Color of Food for a Day']};return {id:String(Date.now())+'-'+i,title:(options[topic.name]||['Ultimate Family Challenge With a Twist'])[i%2],description:`Original ${topic.name.toLowerCase()} format featuring Nastya, Artem & Mia. Three clear rounds, one surprise twist, bold readable thumbnail, and a satisfying final reveal. Adapt for language-neutral action and dubbing.`,topic:topic.name,status:'Idea',updated:Date.now()}};
state.ideas.unshift(...selected.map(make));render();toast('Added 3 format-inspired concepts to your Idea Vault');setPage('ideas')}
function normalizeHandle(raw){let s=raw.trim();try{if(s.startsWith('http')){const u=new URL(s);if(!/(^|\.)youtube\.com$/.test(u.hostname))return null;const parts=u.pathname.split('/').filter(Boolean);s=parts[0]==='channel'?parts[1]:(parts[0]||'')}}catch{return null}if(/^UC[\w-]{22}$/.test(s))return s;if(!s.startsWith('@'))s='@'+s;if(!/^@[\w.-]{3,100}$/.test(s))return null;return s}
function addChannel(){const inp=document.getElementById('new-channel'),handle=normalizeHandle(inp.value);if(!handle){toast('Enter a valid YouTube @handle or channel URL');return}if(state.channels.some(c=>c.handle.toLowerCase()===handle.toLowerCase())){toast('Already in your watchlist');return}if(state.channels.length>=10){toast('Keep your watchlist to 10 channels or fewer');return}state.channels.push({handle,name:handle.replace(/^@/,''),role:document.getElementById('new-role').value});render();toast('Channel added — scan for latest uploads')}
function scan(){toast('This offline edition uses fictional sample videos. Live YouTube scanning is not available here.')}
function addKeyword(){const val=document.getElementById('keyword-input')?.value.trim();if(!val||val.length<4)return toast('Enter a search phrase');if(state.keywords.includes(val))return toast('Keyword already saved');if(state.keywords.length>=15)return toast('Maximum 15 search phrases');state.keywords.push(val);render();document.getElementById('keyword-select').value=String(state.keywords.length-1);toast('Niche query added')}
function init(){document.getElementById('today').textContent=todayString();persist();render()}
document.addEventListener('click',e=>{const x=e.target.closest('button');if(!x)return;if(x.dataset.page){setPage(x.dataset.page);return}if(x.dataset.go){setPage(x.dataset.go);return}if(x.dataset.topic){state.topic=x.dataset.topic;render();return}if(x.dataset.viewTopic){state.topic=x.dataset.viewTopic;setPage('radar');return}if(x.dataset.saveVideo){addIdeaFromVideo(x.dataset.saveVideo);return}if(x.dataset.editIdea!==undefined){ideaModal(Number(x.dataset.editIdea));return}if(x.dataset.deleteIdea!==undefined){const n=Number(x.dataset.deleteIdea);if(confirm('Delete this idea?')){state.ideas.splice(n,1);render()};return}if(x.dataset.removeChannel!==undefined){state.channels.splice(Number(x.dataset.removeChannel),1);render();toast('Removed from watchlist');return}switch(x.dataset.action){case'generate':generateIdeas();break;case'new-idea':ideaModal();break;case'scan':scan();break;case'add-channel':addChannel();break;case'add-keyword':addKeyword();break;case'export':exportData();break;case'export-videos':exportVideos();break;case'demo':state.videos=makeDemo();setMode('demo');render();break}if(x.id==='refresh-btn')scan();if(x.id==='new-idea-top')ideaModal();if(x.id==='export-all')exportData()});
document.addEventListener('change',e=>{if(e.target.id==='sort-select'){state.sort=e.target.value;render()}if(e.target.id==='category-select'){state.category=e.target.value;render()}if(e.target.id==='days-select'){state.days=Number(e.target.value);render()}if(e.target.dataset.status!==undefined){const idea=state.ideas[Number(e.target.dataset.status)];if(idea){idea.status=e.target.value;idea.updated=Date.now();render();toast('Pipeline updated')}}});
document.addEventListener('input', e => {
  if (e.target.id !== 'video-search') return;
  state.query = e.target.value;
  const rows = filteredVideos();
  const table = document.querySelector('.data-table tbody');
  if (!table) return;
  table.innerHTML = rows.map(v => `<tr>
    <td><div class="table-video">${thumb(v)}<div><b>${html(v.title)}</b><small>${html(v.channel)} · ${timeAgo(v.age)}</small></div></div></td>
    <td>${html(v.topic)}</td><td><b>${money(v.views)}</b></td><td>${money(v.pace)}</td>
    <td><span class="boost">${v.outlier.toFixed(1)}×</span></td>
    <td><div class="idea-actions"><button class="save ${savedVideo(v)?'active':''}" data-save-video="${html(v.id)}">${savedVideo(v)?'✓':'＋'}</button>${videoLink(v)}</div></td>
  </tr>`).join('') || `<tr><td colspan="6">${empty('No matches')}</td></tr>`;
  const counter=document.querySelector('.result-count');
  if(counter)counter.textContent=rows.length+' videos · Public data; estimated average pace';
});
document.addEventListener('click',e=>{if(e.target.classList.contains('modal-backdrop'))closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
/* Compilation Studio v2: local footage + user-supplied first-party retention CSVs. No network access. */
const COMP_THEMES=TOPICS.map(x=>x.name);
const comp={theme:'Color vs Color',language:'English',target:180,sources:[],clips:[],rendering:false,renderPercent:0,renderStatus:'',previewId:null,result:null,resultURL:null,videoBusy:false,settings:{title:'',description:'',tags:'',audience:''},rights:false,metadataTouched:false};
let compCounter=0;
const compId=()=>String(++compCounter);
const compFileSize=bytes=>bytes<1048576?`${Math.max(1,Math.round(bytes/1024))} KB`:`${(bytes/1048576).toFixed(bytes>10*1048576?0:1)} MB`;
const compSec=t=>{t=Math.max(0,Number(t)||0);return `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`};
const compSafeName=str=>String(str||'compilation').normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'compilation';
const compOptions=(arr,v)=>arr.map(x=>`<option value="${html(x)}" ${x===v?'selected':''}>${html(x)}</option>`).join('');
function compAutoMetadata(){
 const name=comp.theme;
 const tags=[`Nastya Artem Mia`,'Nastya Artem and Mia','Nastya','Artem','Mia','kids compilation','family challenge','funny kids videos',...name.toLowerCase().split(/\s+&\s+|\s+/).filter(x=>x.length>2).map(x=>`${x} challenge`),name,`best ${name.toLowerCase()} moments`];
 const clean=[...new Set(tags.map(x=>x.trim()).filter(Boolean))];
 const title={English:`Nastya, Artem & Mia: BEST ${name} Moments! 🌈 | Family Compilation`,Español:`¡Los MEJORES Momentos de ${name} con Nastya, Artem y Mia!`,Русский:`Лучшие моменты: ${name} с Настей, Артёмом и Мией!`}[comp.language]||'Nastya Artem Mia Compilation';
 const intro={English:`The funniest ${name.toLowerCase()} moments with Nastya, Artem and Mia in one family compilation! Join us for challenges, surprises and laughs.`,Español:`¡Los mejores momentos de ${name} con Nastya, Artem y Mia en una recopilación familiar!`,Русский:`Лучшие моменты по теме «${name}» с Настей, Артёмом и Мией в одной подборке!`}[comp.language];
 comp.settings.title=title.slice(0,100);
 comp.settings.description=`${intro}\n\n✨ Featuring original Nastya Artem Mia footage.\n▶ Subscribe for more family fun!\n\n#NastyaArtemMia #FamilyChallenge #KidsCompilation`;
 comp.settings.tags=clean.join(', ');
 comp.metadataTouched=false;
}
compAutoMetadata();
function compSource(id){return comp.sources.find(s=>s.id===id)}
function compThemeSources(){return comp.sources.filter(s=>s.theme===comp.theme)}
function compClipDuration(){return comp.clips.reduce((n,c)=>n+(c.end-c.start),0)}
function compSelected(){return comp.clips.filter(c=>!!compSource(c.src))}
function compLoadVideo(file){return new Promise((resolve,reject)=>{const v=document.createElement('video');v.preload='metadata';v.muted=true;v.playsInline=true;v.src=URL.createObjectURL(file);const timer=setTimeout(()=>{URL.revokeObjectURL(v.src);reject(Error('Could not read video metadata'))},20000);v.addEventListener('loadedmetadata',()=>{clearTimeout(timer);const duration=Number(v.duration);const info={duration:Number.isFinite(duration)?duration:0,width:v.videoWidth,height:v.videoHeight};URL.revokeObjectURL(v.src);resolve(info)}, {once:true});v.addEventListener('error',()=>{clearTimeout(timer);URL.revokeObjectURL(v.src);reject(Error('Unsupported video format or corrupt file'))},{once:true})})}
async function compAddSources(list){if(comp.rendering)return;const files=[...list].filter(f=>f.type.startsWith('video/')||/\.(mp4|mov|m4v|webm|mkv)$/i.test(f.name));if(!files.length)return toast('Select video files (MP4, MOV or WebM).');let accepted=0;for(const f of files){try{const meta=await compLoadVideo(f);if(!meta.duration)continue;const matched=matchTopic(f.name);comp.sources.push({id:compId(),file:f,name:f.name,theme:COMP_THEMES.includes(matched)?matched:comp.theme,duration:meta.duration,width:meta.width,height:meta.height,rows:[],signal:'No retention data',manualStart:0,manualEnd:Math.min(12,meta.duration)});accepted++}catch(e){toast(f.name+': '+e.message)}}compRefresh();toast(accepted+' video file(s) added. Files stay on your device.');}
function compParseNumber(s){const n=Number(String(s??'').trim().replace(/%/g,'').replace(/\s/g,'').replace(/^"|"$/g,''));return Number.isFinite(n)?n:null}
function compParseCSV(text,duration){
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(lines.length<4)throw Error('CSV needs a header and at least three observations.');
 const d=(lines[0].match(/\t/g)||[]).length>(lines[0].match(/,/g)||[]).length?'\t':(lines[0].includes(';')&&!lines[0].includes(',')?';':',');
 const fields=lines[0].split(d).map(x=>x.replace(/^"|"$/g,'').trim().toLowerCase());
 let ti=fields.findIndex(h=>/elapsedvideotimeratio|video.position|elapsed.video|percent.of.video|position|timestamp|time_ratio|relative.position|seconds/.test(h));
 let ri=fields.findIndex(h=>/audiencewatchratio|absolute.audience.retention|retention|watch.ratio|watch.rate|replay.score/.test(h)&&!/relative/.test(h));
 if(ti<0||ri<0||ti===ri)throw Error('Need position and retention columns (elapsedVideoTimeRatio, audienceWatchRatio).');
 const isTime=/(timestamp|seconds)/.test(fields[ti]);
 const data=lines.slice(1).map(line=>{const f=line.split(d).map(x=>x.trim());let p=compParseNumber(f[ti]),r=compParseNumber(f[ri]);if(p===null||r===null)return null;if(isTime){const tv=(f[ti]||'').replace(/"/g,'');const parts=tv.split(':').map(Number);if(parts.length>1&&parts.every(Number.isFinite))p=parts.reduce((a,b)=>a*60+b,0);p/=duration}else if(p>1&&p<=100)p/=100; if(r>5&&r<=1000)r/=100;return{pos:p,ratio:r}}).filter(x=>x&&x.pos>=0&&x.pos<=1&&x.ratio>=0&&x.ratio<10).sort((a,b)=>a.pos-b.pos);
 if(data.length<3)throw Error('Not enough valid numerical rows. Check CSV column names and values.');
 return data;
}
async function compImportCSV(id,file){const source=compSource(id);if(!source||!file)return;try{const rows=compParseCSV(await file.text(),source.duration);source.rows=rows;source.signal=`${rows.length} retention points imported`;compRefresh();toast('Retention chart imported for '+source.name)}catch(e){toast('CSV error: '+e.message)}}
function compPeaks(source){
 const a=source.rows;if(a.length<3)return[];
 const findMedian=(index,window)=>{const vals=a.filter((v,j)=>Math.abs(j-index)<=window&&j!==index).map(v=>v.ratio);return median(vals)};
 const peaks=[];
 const spacing=Math.max(1,Math.round(a.length/20));
 for(let i=1;i<a.length-1;i++){
  const p=a[i];if(p.pos<.035||p.pos>.975)continue;
  const local=Math.max(a[i-1].ratio,a[i+1].ratio);
  if(p.ratio<local)continue;
  const broad=findMedian(i,Math.max(3,spacing));
  const lift=p.ratio-broad;
  const score=Math.max(0,lift)*240 + (p.ratio>1?Math.min(.5,p.ratio-1)*25:0) + Math.max(0,p.ratio)*2;
  const clipLen=Math.min(16,Math.max(7,Math.min(source.duration/12,12)));
  let start=Math.max(0,p.pos*source.duration-clipLen*.42);
  start=Math.min(start,Math.max(0,source.duration-clipLen));
  peaks.push({src:source.id,start:+start.toFixed(2),end:+(start+clipLen).toFixed(2),score:+score.toFixed(2),reason:p.ratio>1?'Rewatch likely (watch ratio > 1)':'Retention peak (rewatch not confirmed)',value:p.ratio});
 }
 return peaks.sort((x,y)=>y.score-x.score).filter((v,idx,arr)=>arr.slice(0,idx).every(o=>Math.abs(o.start-v.start)>Math.max(7,(v.end-v.start)*.75))).slice(0,14);
}
function compSuggest(){
 if(comp.rendering)return;
 const files=compThemeSources();if(!files.length)return toast('Add source videos for this theme first.');
 const withRetention=files.filter(x=>x.rows.length>=3);
 if(!withRetention.length)return toast('Import retention CSV for at least one matching video, or use Add manual clip.');
 const all=withRetention.flatMap(compPeaks);
 if(!all.length)return toast('No peaks found. Try adding manual clips.');
 const buckets=new Map(withRetention.map(s=>[s.id,all.filter(c=>c.src===s.id)]));
 const clips=[];let total=0;
 while(total<comp.target&&clips.length<100){
  let candidates=[...buckets.keys()].map(id=>({id,c:buckets.get(id)?.[0]})).filter(v=>v.c);
  if(!candidates.length)break;
  candidates.sort((a,b)=>(a.id===clips.at(-1)?.src?1:0)-(b.id===clips.at(-1)?.src?1:0)||b.c.score-a.c.score);
  const next=candidates[0];buckets.get(next.id).shift();
  const c={...next.c,id:compId()};if(total+c.end-c.start>comp.target+4)c.end=c.start+Math.max(1,comp.target-total);
  clips.push(c);total+=c.end-c.start;
 }
 comp.clips=clips;compResultClear();compRefresh();toast(`Selected ${clips.length} retention peaks from ${withRetention.length} source(s).`);
}
function compResultClear(){if(comp.resultURL){URL.revokeObjectURL(comp.resultURL);comp.resultURL=null}comp.result=null;}
function compAddManual(id){const s=compSource(id);if(!s||comp.rendering)return;const start=Number(s.manualStart),end=Number(s.manualEnd);if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end> s.duration+.1||end-start<.5)return toast('Choose a valid clip range of at least 0.5 seconds.');comp.clips.push({id:compId(),src:s.id,start,end,score:null,reason:'Manually selected'});compResultClear();compRefresh();toast('Clip added to timeline')}
function compDeleteSource(id){const s=compSource(id);if(!s||comp.rendering)return;if(s.previewURL)URL.revokeObjectURL(s.previewURL);if(comp.previewId===id)comp.previewId=null;comp.sources=comp.sources.filter(x=>x.id!==id);comp.clips=comp.clips.filter(x=>x.src!==id);compResultClear();compRefresh();}
function compMoveClip(id,step){if(comp.rendering)return;const i=comp.clips.findIndex(c=>c.id===id),j=i+step;if(i<0||j<0||j>=comp.clips.length)return;[comp.clips[i],comp.clips[j]]=[comp.clips[j],comp.clips[i]];compResultClear();compRefresh()}
function compDeleteClip(id){if(comp.rendering)return;comp.clips=comp.clips.filter(c=>c.id!==id);compResultClear();compRefresh()}
function compStage(){
 const src=compThemeSources();const retention=src.filter(s=>s.rows.length>0).length;
 const signal=`${src.length} matching sources · ${retention} with first-party retention data · ${comp.clips.length} timeline clips`;
 return `<section class="page-header"><div><div class="eyebrow">CREATOR TOOLS / NEW</div><h1 class="page-title">✂ Compilation Studio</h1><p class="page-subtitle">Build themed compilations from <strong>your own video files</strong>, rank highlights using your retention CSVs, export a real video, and prepare YouTube metadata.</p></div><span class="tag green">LOCAL-FIRST EDITOR</span></section>
 <div class="comp-steps"><div class="comp-step"><b><span class="num">01</span>Pick a theme + upload footage</b><p>Your original video files stay on this computer.</p></div><div class="comp-step"><b><span class="num">02</span>Find retention peaks + assemble</b><p>Import your own retention data, then edit the suggested timeline.</p></div><div class="comp-step"><b><span class="num">03</span>Export + prepare upload</b><p>Render a WebM and generate titles, tags and a description for Studio.</p></div></div>
 <div class="comp-grid"><div class="comp-stack">
 <section class="panel comp-box"><div class="comp-heading"><div><h3>1. Compilation setup</h3><small>Choose a concept and target length.</small></div><span class="comp-badge">Theme-based</span></div>
 <div class="comp-formgrid"><label><span class="comp-label">Theme</span><select class="field comp-control" id="comp-theme">${compOptions(COMP_THEMES,comp.theme)}</select></label><label><span class="comp-label">Target duration</span><select class="field comp-control" id="comp-target"><option value="60" ${comp.target===60?'selected':''}>1 minute (Short-style)</option><option value="180" ${comp.target===180?'selected':''}>3 minutes</option><option value="480" ${comp.target===480?'selected':''}>8 minutes</option><option value="900" ${comp.target===900?'selected':''}>15 minutes</option></select></label></div>
 <div class="comp-btnrow"><label class="comp-file-btn">＋ Add your videos <input id="comp-file" type="file" accept="video/*,.mov,.mp4,.webm" multiple></label><span class="comp-quiet">MP4, MOV, WebM · Supported codecs depend on browser</span></div>
 <div class="comp-warning">Only import footage you own or have the rights to reuse. Competitor videos are research references, not downloadable source material.</div></section>
 <section class="panel comp-box"><div class="comp-heading"><div><h3>2. Source library</h3><small>${html(signal)}</small></div><span class="comp-badge">${src.length} for theme</span></div>
 ${comp.sources.length?`<div class="comp-sources">${comp.sources.map(s=>`<div class="comp-source"><div class="comp-source-top"><div class="comp-source-name"><strong>${html(s.name)}</strong><small>${compSec(s.duration)} · ${s.width}×${s.height} · ${compFileSize(s.file.size)}</small></div><span class="comp-chip ${s.rows.length?'ok':''}">${s.rows.length?'✓ Retention imported':'No retention CSV'}</span><button class="btn comp-small" data-comp-preview="${s.id}">${comp.previewId===s.id?'Hide preview':'▶ Preview'}</button><button class="btn comp-small" data-comp-remove-source="${s.id}" title="Remove source">✕</button></div>
 ${comp.previewId===s.id?`<video controls class="comp-video" preload="metadata" src="${s.previewURL}"></video><div class="comp-caption">Use playback timestamps to choose manual clip ranges below.</div>`:''}<div class="comp-source-actions"><label><span class="comp-label">Theme</span><select class="field comp-control comp-small" data-comp-source-theme="${s.id}">${compOptions(COMP_THEMES,s.theme)}</select></label><label><span class="comp-label">Owned video retention CSV</span><span class="comp-file-btn" style="padding:8px 10px;background:#2e354e;color:#dfd6ff;border-color:#3b4a65">↑ Import CSV<input type="file" accept=".csv,.tsv,text/csv" data-comp-csv="${s.id}"></span></label></div>
 <div class="comp-source-actions"><label><span class="comp-label">Clip start (seconds)</span><input class="field comp-small comp-control" type="number" min="0" step="0.1" max="${s.duration.toFixed(1)}" data-comp-start="${s.id}" value="${s.manualStart}"></label><label><span class="comp-label">Clip end (seconds)</span><input class="field comp-small comp-control" type="number" min="0.5" step="0.1" max="${s.duration.toFixed(1)}" data-comp-end="${s.id}" value="${s.manualEnd}"></label><button class="btn comp-small" data-comp-add-manual="${s.id}">＋ Add manual clip</button></div></div>`).join('')}</div>`:`<div class="comp-empty">No video files yet. Choose a few originals from your Nastya Artem Mia library to get started.</div>`}</section>
 <section class="panel comp-box"><div class="comp-heading"><div><h3>3. Highlight timeline</h3><small>Reorder, remove or add clips before rendering.</small></div><button class="btn btn-primary" data-comp-suggest ${!retention||comp.rendering?'disabled':''}>✦ Suggest clips from retention</button></div>
 <div class="comp-stats"><span><strong>${comp.clips.length}</strong> clips</span><span><strong>${compSec(compClipDuration())}</strong> selected duration</span><span><strong>${compSec(comp.target)}</strong> target</span></div>
 ${comp.clips.length?`<div class="comp-timeline">${comp.clips.map((c,i)=>{const s=compSource(c.src);return `<div class="comp-clip"><div class="comp-clip-index">${i+1}</div><div class="comp-clip-info"><b>${html(s?.name||'Missing file')}</b><small>${compSec(c.start)}–${compSec(c.end)} (${(c.end-c.start).toFixed(1)}s) · ${html(c.reason)}</small></div><button class="btn comp-small" data-comp-move="${c.id}" data-step="-1" ${i===0?'disabled':''}>↑</button><button class="btn comp-small" data-comp-move="${c.id}" data-step="1" ${i===comp.clips.length-1?'disabled':''}>↓</button><button class="btn comp-small" data-comp-remove-clip="${c.id}">✕</button></div>`}).join('')}</div>`:`<div class="comp-empty">Timeline is empty. Import retention CSVs and click <strong>Suggest clips</strong>, or manually add ranges from your footage.</div>`}
 <div class="comp-insight"><div>✓ Peak detection favors local retention increases instead of just the beginning of every video.</div><div>ⓘ A retention peak is <strong>not proof of rewatching</strong>. Ratios above 1 can indicate repeat views or rewinds.</div></div>
 <div class="comp-btnrow"><button class="btn" data-comp-clear-clips ${!comp.clips.length||comp.rendering?'disabled':''}>Clear timeline</button><button class="btn btn-primary" data-comp-render ${!comp.clips.length||comp.rendering?'disabled':''}>▶ Render compilation (.webm)</button></div>
 <div id="comp-export-result">${compExportPanel()}</div></section>
 </div>
 <div class="comp-stack"><section class="panel comp-box"><div class="comp-heading"><div><h3>4. YouTube upload kit</h3><small>Editable, theme-based suggestions. Not live-verified trend recommendations.</small></div><button class="btn comp-small" data-comp-regenerate>↻ Regenerate</button></div>
 <label class="comp-label" for="comp-language">Language</label><select class="field comp-control" id="comp-language">${compOptions(['English','Español','Русский'],comp.language)}</select>
 <label class="comp-label" for="comp-title" style="margin-top:12px">Suggested title (${comp.settings.title.length}/100)</label><input class="field comp-control" id="comp-title" maxlength="100" value="${html(comp.settings.title)}">
 <label class="comp-label" for="comp-description" style="margin-top:12px">Description</label><textarea class="field comp-control comp-textarea" id="comp-description">${html(comp.settings.description)}</textarea>
 <label class="comp-label" for="comp-tags" style="margin-top:12px">Tags (comma-separated)</label><textarea class="field comp-control comp-textarea" style="min-height:75px" id="comp-tags">${html(comp.settings.tags)}</textarea>
 <label class="comp-label" for="comp-audience" style="margin-top:12px">Audience designation — choose based on actual content</label><select id="comp-audience" class="field comp-control"><option value="" ${!comp.settings.audience?'selected':''}>Select before uploading</option><option value="yes" ${comp.settings.audience==='yes'?'selected':''}>Yes, made for kids</option><option value="no" ${comp.settings.audience==='no'?'selected':''}>No, not made for kids</option></select>
 <label class="comp-check"><input id="comp-rights" type="checkbox" ${comp.rights?'checked':''}><span>I confirm I own or have the rights to all footage, audio and other materials used.</span></label>
 <div class="comp-btnrow"><button class="btn" data-comp-copy>Copy metadata</button><button class="btn btn-primary" data-comp-metadata>↓ Download upload kit</button></div>
 <div class="comp-warning">Online edition: connect YouTube below for optional private uploads, or use YouTube Studio to review and upload manually. Upload requires Google authorization and may be limited by browser and API policies.</div>
 <div class="comp-btnrow"><button class="btn btn-outline" data-comp-studio>↗ Open YouTube Studio</button></div></section>
 <section class="panel comp-box"><div class="comp-heading"><div><h3>How to bring in rewatch data</h3><small>First-party analytics only</small></div></div><p class="comp-footer">For footage on channels you manage, fetch YouTube Analytics video-retention data via an authorized connection (dimension <code>elapsedVideoTimeRatio</code>, metric <code>audienceWatchRatio</code>), or prepare a CSV with those columns. Import one chart per source video.</p>
 <div class="comp-btnrow"><button class="btn" data-comp-csvsample>↓ Download example CSV</button></div><div class="comp-subtle" style="margin-top:13px">CSV template:<pre style="margin:8px 0 0;white-space:pre-wrap;color:#e2d9ff">elapsedVideoTimeRatio,audienceWatchRatio<br>0.00,0.95<br>0.25,0.66<br>0.35,1.08<br>0.50,0.48</pre><div class="comp-caption">Illustrative values — not an actual video's analytics.</div></div>
 <p class="comp-footer">Source video files and rendered compilations remain local unless you decide to upload them. Browser encoding requires keeping this tab open. Large exports may need a dedicated video editor.</p></section></div></div>`;
}
function compExportPanel(){return comp.rendering?`<div class="comp-result" style="color:#dbd2ff;background:#22233c;border-color:#595385"><strong>Rendering — keep this tab active</strong><div class="comp-progress"><span id="comp-progress-fill" style="width:${comp.renderPercent}%"></span></div><div id="comp-progress-text">${html(comp.renderStatus)} · ${Math.round(comp.renderPercent)}%</div><canvas id="comp-preview-canvas" width="640" height="360" style="width:100%;max-width:450px;aspect-ratio:16/9;border-radius:9px;background:#030712;margin-top:10px"></canvas></div>`:comp.resultURL?`<div class="comp-result"><strong>✓ Compilation rendered successfully</strong><div class="comp-btnrow"><a class="btn btn-primary" href="${comp.resultURL}" download="Nastya-Artem-Mia-${compSafeName(comp.theme)}-Compilation.webm">↓ Download video (${compFileSize(comp.result.size)})</a></div><div class="comp-preview-card"><video controls preload="metadata" src="${comp.resultURL}"></video><div class="comp-caption">WebM video with source audio, 720p; simple hard cuts (no automatic transitions).</div></div></div>`:`<p class="comp-quiet" style="margin-top:14px">Render creates a downloadable WebM with stitched clips and their original audio. You can review it before any YouTube upload.</p>`;}
function compRefresh(){if(state.page==='compilation')render()}
function compUpdateData(){const v=document.getElementById('comp-export-result');if(v)v.innerHTML=compExportPanel()}
async function compRenderVideo(){
 if(comp.rendering)return;
 const clips=compSelected();if(!clips.length)return toast('Choose clips first.');
 if(!comp.rights)return toast('Confirm you have rights to the source footage first.');
 if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)return toast('This browser cannot render video. Try current Chrome or Edge.');
 const opts=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));if(!opts)return toast('WebM encoding is unavailable in this browser.');
 compResultClear();comp.rendering=true;comp.renderPercent=0;comp.renderStatus='Preparing editor';compRefresh();
 let ctx=null,element=null,stream=null,recorder=null,objectURL=null,audio=null;const canvas=document.getElementById('comp-preview-canvas');
 const board=canvas.getContext('2d',{alpha:false});canvas.width=1280;canvas.height=720;
 const total=clips.reduce((a,c)=>a+c.end-c.start,0);let done=0;
 try{
  audio=new (window.AudioContext||window.webkitAudioContext)();
  const destination=audio.createMediaStreamDestination();
  element=document.createElement('video');element.preload='auto';element.playsInline=true;element.muted=false;element.volume=1;
  element.style.cssText='position:fixed;width:1px;height:1px;opacity:0;left:-100px;top:-100px;pointer-events:none';document.body.append(element);
  const node=audio.createMediaElementSource(element),fadeGain=audio.createGain();node.connect(fadeGain);fadeGain.connect(destination);await audio.resume();
  const videoStream=canvas.captureStream(30);
  stream=new MediaStream([...videoStream.getVideoTracks(),...destination.stream.getAudioTracks()]);
  const chunks=[];recorder=new MediaRecorder(stream,{mimeType:opts,videoBitsPerSecond:4000000,audioBitsPerSecond:128000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  const recorded=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=e=>reject(new Error('MediaRecorder error'))});
  const seek=t=>new Promise((resolve,reject)=>{if(Math.abs(element.currentTime-t)<.04)return resolve();const timer=setTimeout(()=>reject(Error('Could not seek source video')),15000);element.addEventListener('seeked',()=>{clearTimeout(timer);resolve()},{once:true});element.currentTime=t});
  for(let i=0;i<clips.length;i++){
   const clip=clips[i],source=compSource(clip.src);if(!source)continue;
   if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null}
   objectURL=URL.createObjectURL(source.file);element.src=objectURL;element.load();
   await new Promise((resolve,reject)=>{if(element.readyState>=1)return resolve();const timer=setTimeout(()=>reject(Error('Source video did not load')),20000);element.addEventListener('loadedmetadata',()=>{clearTimeout(timer);resolve()},{once:true});element.addEventListener('error',()=>{clearTimeout(timer);reject(Error('Video codec not supported'))},{once:true})});
   await seek(clip.start);
   const w=element.videoWidth||1280,h=element.videoHeight||720,scale=Math.max(1280/w,720/h),dw=w*scale,dh=h*scale;
   board.fillStyle='#090f1c';board.fillRect(0,0,1280,720);board.drawImage(element,(1280-dw)/2,(720-dh)/2,dw,dh);
   if(recorder.state==='inactive')recorder.start(1000);
   comp.renderStatus=`Clip ${i+1}/${clips.length}: ${source.name}`;
   await element.play();
   await new Promise((resolve,reject)=>{
    let terminated=false;const timeout=window.setTimeout(()=>{if(terminated)return;terminated=true;reject(Error('Playback stalled or browser was backgrounded'))},Math.max(25000,(clip.end-clip.start)*4500));
    const tick=()=>{
     if(terminated)return;
     try{
      board.fillStyle='#09111b';board.fillRect(0,0,1280,720);if(element.readyState>=2)board.drawImage(element,(1280-dw)/2,(720-dh)/2,dw,dh);
      const pos=element.currentTime-clip.start;
      // Fast fades prevent harsh audio cuts and add a subtle visual dip.
      const cutFade=Math.max(0,Math.min(1,pos/.18,(clip.end-element.currentTime)/.18));
      fadeGain.gain.setTargetAtTime(cutFade,audio.currentTime,.016);
      if(cutFade<1){board.fillStyle='rgba(3,8,18,'+(1-cutFade)+')';board.fillRect(0,0,1280,720);}
      comp.renderPercent=Math.max(0,Math.min(99,((done+Math.max(0,pos))/total)*100));
      const fill=document.getElementById('comp-progress-fill');if(fill)fill.style.width=comp.renderPercent+'%';const txt=document.getElementById('comp-progress-text');if(txt)txt.textContent=comp.renderStatus+' · '+Math.round(comp.renderPercent)+'%';
      if(element.currentTime>=Math.min(clip.end,element.duration-.02)||element.ended){terminated=true;clearTimeout(timeout);element.pause();resolve();return}
      requestAnimationFrame(tick);
     }catch(e){terminated=true;clearTimeout(timeout);reject(e)}
    };requestAnimationFrame(tick);
   });
   done+=clip.end-clip.start;
  }
  element.pause();recorder.stop();await recorded;
  if(!chunks.length)throw Error('Browser produced an empty video.');
  comp.result=new Blob(chunks,{type:'video/webm'});comp.resultURL=URL.createObjectURL(comp.result);comp.renderPercent=100;toast('Your compilation is ready to download!');
 }catch(e){toast('Render failed: '+(e.message||String(e)));comp.renderStatus='Render failed: '+(e.message||String(e))}
 finally{if(element){element.pause();element.remove();element.removeAttribute('src');element.load()}if(objectURL)URL.revokeObjectURL(objectURL);if(recorder&&recorder.state!=='inactive')try{recorder.stop()}catch{}if(stream)stream.getTracks().forEach(t=>t.stop());if(audio)await audio.close().catch(()=>{});comp.rendering=false;compRefresh()}
}
function compMetadata(){return{title:comp.settings.title.slice(0,100),description:comp.settings.description.slice(0,5000),tags:comp.settings.tags.split(',').map(x=>x.trim()).filter(Boolean),language:comp.language,categoryId:'24',privacyStatus:'private',madeForKids:comp.settings.audience===''?null:comp.settings.audience==='yes',sourceRightsConfirmed:comp.rights,videoLengthSeconds:+compClipDuration().toFixed(2),clips:comp.clips.map(c=>({file:compSource(c.src)?.name,start:c.start,end:c.end,signal:c.reason})),generatedBy:'Trend Studio — Offline Compilation Studio',note:'Template-based keywords and title; no live YouTube trend signal is connected. User must verify audience category, rights and metadata before upload.'}}
function compDownloadKit(){if(!comp.settings.audience)return toast('Select whether the compilation is made for kids.');if(!comp.rights)return toast('Confirm you have rights to the footage.');const data=compMetadata(),slug=compSafeName(comp.theme);download(`Nastya-Artem-Mia-${slug}-upload-kit.json`,JSON.stringify(data,null,2),'application/json');const textv=`TITLE\n${data.title}\n\nDESCRIPTION\n${data.description}\n\nTAGS\n${data.tags.join(', ')}\n\nLANGUAGE\n${data.language}\n\nAUDIENCE\n${data.madeForKids?'Made for kids':'Not made for kids'}\n\nVISIBILITY\nPrivate — review in YouTube Studio before publishing.\n\nThis package does not upload to YouTube automatically.`;download(`Nastya-Artem-Mia-${slug}-upload-kit.txt`,textv,'text/plain');toast('Upload kit created. Your video is not uploaded.')}
function compCopyMetadata(){const d=compMetadata();const textv=`Title: ${d.title}\n\nDescription:\n${d.description}\n\nTags: ${d.tags.join(', ')}\nAudience: ${d.madeForKids===null?'Not selected':d.madeForKids?'Made for kids':'Not made for kids'}\nVisibility: Private`;if(navigator.clipboard?.writeText)navigator.clipboard.writeText(textv).then(()=>toast('Metadata copied')).catch(()=>{download('upload-metadata.txt',textv,'text/plain');toast('Clipboard unavailable; downloaded instead')});else{download('upload-metadata.txt',textv,'text/plain');toast('Metadata downloaded as TXT')}}
function compDownloadSample(){let data='elapsedVideoTimeRatio,audienceWatchRatio\n';for(let i=0;i<=40;i++){const pos=i/40;const val=.88-.6*pos+.26*Math.exp(-Math.pow((pos-.36)/.04,2))+.20*Math.exp(-Math.pow((pos-.74)/.05,2));data+=`${pos.toFixed(3)},${val.toFixed(3)}\n`;}download('EXAMPLE-not-real-retention.csv',data,'text/csv');toast('Example CSV downloaded (synthetic data).')}
// Isolated event handlers: existing dashboard navigation continues to work unchanged.
document.addEventListener('click',e=>{
 const btn=e.target.closest('button');if(!btn||!btn.dataset)return;
 if(btn.dataset.compPreview!==undefined){const id=btn.dataset.compPreview;const src=compSource(id);if(!src)return;if(comp.previewId===id)comp.previewId=null;else{if(!src.previewURL)src.previewURL=URL.createObjectURL(src.file);comp.previewId=id}compRefresh();return}
 if(btn.dataset.compRemoveSource!==undefined){compDeleteSource(btn.dataset.compRemoveSource);return}
 if(btn.dataset.compAddManual!==undefined){compAddManual(btn.dataset.compAddManual);return}
 if(btn.dataset.compMove!==undefined){compMoveClip(btn.dataset.compMove,Number(btn.dataset.step)||0);return}
 if(btn.dataset.compRemoveClip!==undefined){compDeleteClip(btn.dataset.compRemoveClip);return}
 if(btn.dataset.compSuggest!==undefined){compSuggest();return}
 if(btn.dataset.compClearClips!==undefined){comp.clips=[];compResultClear();compRefresh();return}
 if(btn.dataset.compRender!==undefined){compRenderVideo();return}
 if(btn.dataset.compRegenerate!==undefined){compAutoMetadata();compRefresh();toast('Title, description and tags refreshed');return}
 if(btn.dataset.compMetadata!==undefined){compDownloadKit();return}
 if(btn.dataset.compCopy!==undefined){compCopyMetadata();return}
 if(btn.dataset.compCsvsample!==undefined){compDownloadSample();return}
 if(btn.dataset.compStudio!==undefined){window.open('https://studio.youtube.com/','_blank','noopener,noreferrer');return}
});
document.addEventListener('change',e=>{
 const el=e.target;if(el.id==='comp-file'){compAddSources(el.files);return}
 if(el.dataset.compCsv!==undefined){compImportCSV(el.dataset.compCsv,el.files?.[0]);return}
 if(el.dataset.compSourceTheme!==undefined){const s=compSource(el.dataset.compSourceTheme);if(s){s.theme=el.value;compRefresh()}return}
 if(el.id==='comp-theme'){comp.theme=el.value;comp.clips=[];compResultClear();compAutoMetadata();compRefresh();return}
 if(el.id==='comp-target'){comp.target=Number(el.value);compRefresh();return}
 if(el.id==='comp-language'){comp.language=el.value;compAutoMetadata();compRefresh();return}
 if(el.id==='comp-audience'){comp.settings.audience=el.value;return}
 if(el.id==='comp-rights'){comp.rights=el.checked;return}
});
document.addEventListener('input',e=>{
 const el=e.target;
 if(el.dataset.compStart!==undefined){const s=compSource(el.dataset.compStart);if(s)s.manualStart=Number(el.value);return}
 if(el.dataset.compEnd!==undefined){const s=compSource(el.dataset.compEnd);if(s)s.manualEnd=Number(el.value);return}
 if(el.id==='comp-title'){comp.settings.title=el.value;return}
 if(el.id==='comp-description'){comp.settings.description=el.value;return}
 if(el.id==='comp-tags'){comp.settings.tags=el.value;return}
});

init();

