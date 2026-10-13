/* Trend Studio Guided Compilation Studio — YouTube first-party signals + locally provided originals. */
(function(){
"use strict";
const source=()=>window.TrendBridge;
const h=x=>html(String(x??""));
const validId=x=>/^[A-Za-z0-9_-]{11}$/.test(String(x||""));
const short=x=>Number(x||0).toLocaleString("en-US");
const ago=x=>Math.max(1,(Date.now()-new Date(x||Date.now()).getTime())/86400000);
const pct=(ratio)=>Math.round(Number(ratio||0)*100);
const W={step:1,theme:"",results:[],selected:new Set(),curves:new Map(),errors:new Map(),searching:false,analyzing:false,found:false,reviewed:false};
function chosen(){return (source()?.ownVideos()||[]).filter(v=>W.selected.has(v.id));}
function stats(v){const views=Number(v.statistics?.viewCount)||0;return{views,pace:views/ago(v.snippet?.publishedAt)};}
function duration(v){return parseDuration(v.contentDetails?.duration);}
function fileFor(id){return comp.sources.find(x=>x.youtubeId===id&&x.theme===comp.theme);}
function peaksFor(v){
 const s=fileFor(v.id),r=W.curves.get(v.id)||[];
 return compPeaks({id:v.id,duration:s?.duration||duration(v)||1,rows:r});
}
function makeVideoCard(v,i){
 const st=stats(v),selected=W.selected.has(v.id);
 return '<label class="studio-video-card '+(selected?"selected":"")+'"><input type="checkbox" data-studio-pick="'+h(v.id)+'" '+(selected?"checked":"")+'><div class="studio-video-body">'+
 '<img src="https://i.ytimg.com/vi/'+h(v.id)+'/mqdefault.jpg" loading="lazy" alt="'+h(v.snippet?.title)+'"><div><strong>'+h(v.snippet?.title)+'</strong>'+
 '<small>'+short(st.views)+' views · '+short(Math.round(st.pace))+' avg. views/day</small>'+
 '<small>'+h(new Date(v.snippet?.publishedAt).toLocaleDateString())+' · '+compSec(duration(v))+'</small>'+
 '</div></div></label>';
}
function findTheme(){
 const input=document.getElementById("studio-theme"),theme=String(input?.value||"").trim().slice(0,90);
 if(theme.length<2)return toast("Type a theme, such as mystery box or hide and seek.");
 if(!source()?.connected())return toast("Connect your YouTube channel first.");
 const own=source().ownVideos();
 if(!own.length)return toast("No channel uploads found yet. Reconnect YouTube to refresh your videos.");
 W.theme=theme;comp.theme=theme;W.found=true;W.selected.clear();W.curves.clear();W.errors.clear();W.reviewed=false;
 const words=theme.toLowerCase().split(/\s+/).filter(x=>x.length>1);
 const results=own.map(v=>{
  const sn=v.snippet||{},title=String(sn.title||"").toLowerCase(),description=String(sn.description||"").toLowerCase();
  const tags=(sn.tags||[]).join(" ").toLowerCase();const match=words.reduce((a,w)=>a+(title.includes(w)?4:0)+(tags.includes(w)?2:0)+(description.includes(w)?1:0),0);
  return {v,match};
 }).filter(x=>x.match>0).sort((a,b)=>b.match-a.match||stats(b.v).pace-stats(a.v).pace);
 W.results=results.map(x=>x.v);
 if(!W.results.length)toast("No matching uploads in your 250 most recent videos. Try another theme.");
 render();
}
async function analyze(){
 const videos=chosen();
 if(!videos.length)return toast("Choose at least one video.");
 if(videos.length>8)return toast("Choose up to 8 videos for one compilation.");
 comp.theme=W.theme;W.step=2;W.analyzing=true;W.curves.clear();W.errors.clear();render();
 for(const v of videos){
  try{
   const points=await source().ownRetention(v.id);
   if(points.length<3)throw Error("Retention data is not available for this video.");
   W.curves.set(v.id,points);
  }catch(e){W.errors.set(v.id,String(e.message||e));}
  render();
 }
 W.analyzing=false;render();
}
function pointsChart(v){
 const rows=W.curves.get(v.id)||[];
 if(!rows.length)return '<p class="studio-note">No private retention points available. You can still include this video, but its cuts need manual review.</p>';
 const max=Math.max(1,...rows.map(x=>x.ratio));
 const bars=rows.filter((_,i)=>i%Math.max(1,Math.ceil(rows.length/45))===0).slice(0,46);
 const peaks=compPeaks({id:v.id,rows,duration:Math.max(1,duration(v))}).slice(0,14);
 return '<div class="studio-peaks"><div class="studio-retention-chart" aria-label="Actual audience retention by video position">'+bars.map(p=>'<span title="'+pct(p.ratio)+'% watch ratio at '+Math.round(p.pos*100)+'% of video" style="height:'+Math.max(3,p.ratio/max*100)+'%"></span>').join("")+'</div>'+
 '<div class="studio-note">Watch-ratio curve from YouTube Analytics. Peaks are local retention highs, not proof of rewatches.</div>'+
 '<div class="studio-peak-list">'+(peaks.length?peaks.map(p=>'<a target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/watch?v='+v.id+'&t='+Math.floor(p.start)+'s">▶ '+compSec(p.start)+'–'+compSec(p.end)+' · '+pct(p.value)+'% watch ratio ↗</a>').join(""):'No clear peaks; review manually.')+'</div></div>';
}
function candidateRow(v){
 const st=stats(v),local=fileFor(v.id),err=W.errors.get(v.id);
 return '<article class="panel studio-upload-card"><div class="studio-upload-head"><img src="https://i.ytimg.com/vi/'+v.id+'/mqdefault.jpg" alt="'+h(v.snippet?.title)+'" loading="lazy"><div><strong>'+h(v.snippet?.title)+'</strong>'+
 '<small>'+short(st.views)+' views · '+short(Math.round(st.pace))+' views/day lifetime average</small><small>'+compSec(duration(v))+' · '+(W.curves.get(v.id)?.length||0)+' actual retention points</small></div></div>'+
 (err?'<p class="studio-warning">Retention unavailable: '+h(err)+'</p>':"")+
 pointsChart(v)+
 '<div class="studio-source-file"><label class="comp-file-btn">'+(local?'✓ Replace original file':'↑ Attach matching original video file')+'<input type="file" accept="video/*,.mp4,.mov,.webm,.m4v" data-studio-upload="'+v.id+'"></label>'+
 (local?'<span class="tag green">✓ '+h(local.name)+' · '+compSec(local.duration)+'</span>':'<span class="studio-note">Required for cutting and exporting. YouTube streams cannot be downloaded by the app.</span>')+'</div>'+
 (local?'<div class="studio-manual"><label>Manual start (s)<input class="field" type="number" min="0" max="'+local.duration+'" step="0.5" data-studio-manual-start="'+v.id+'" value="'+Number(local.manualStart||0)+'"></label>'+
 '<label>Manual end (s)<input class="field" type="number" min="0" max="'+local.duration+'" step="0.5" data-studio-manual-end="'+v.id+'" value="'+Number(local.manualEnd||12)+'"></label></div>':"")+'</article>';
}
async function attachFile(id,file){
 const video=chosen().find(x=>x.id===id);
 if(!video||!file)return;
 try{
  const meta=await compLoadVideo(file);
  if(!(meta.duration>0))throw Error("Could not read the video's duration.");
  const previous=fileFor(id);
  const entry={id:previous?.id||compId(),youtubeId:id,theme:comp.theme,name:file.name,file:file,duration:meta.duration,width:meta.width,height:meta.height,
   rows:(W.curves.get(id)||[]),signal:W.curves.has(id)?"First-party retention imported":"No retention available",
   manualStart:previous?.manualStart||0,manualEnd:Math.min(previous?.manualEnd||12,meta.duration)};
  if(previous){if(previous.previewURL)URL.revokeObjectURL(previous.previewURL);comp.sources=comp.sources.filter(x=>x.id!==previous.id);}
  comp.sources.push(entry);
  toast("Attached "+file.name+" to "+video.snippet?.title);
  render();
 }catch(e){toast("Source file error: "+e.message);}
}
function buildTimeline(){
 const vids=chosen(),attached=vids.filter(x=>fileFor(x.id));
 if(!attached.length)return toast("Attach at least one matching original video file.");
 comp.clips=[];compResultClear();
 const all=[];
 for(const v of attached){
  const s=fileFor(v.id),ret=W.curves.get(v.id)||[];
  s.rows=ret;
  const peaks=compPeaks(s).slice(0,6),st=stats(v);
  if(peaks.length){
   for(const p of peaks)all.push({...p,performance:st.pace,videoTitle:v.snippet?.title});
  }else{
   const start=Math.max(0,Math.min(Number(s.manualStart)||0,s.duration-1));
   const end=Math.max(start+0.5,Math.min(Number(s.manualEnd)||start+12,s.duration));
   all.push({src:s.id,start,end,score:0,performance:st.pace,reason:"Manually selected — retention unavailable",videoTitle:v.snippet?.title});
  }
 }
 all.sort((a,b)=>b.score-a.score||b.performance-a.performance);
 const perSource=new Map(),result=[];let total=0;
 while(total<comp.target&&all.length&&result.length<80){
  all.sort((a,b)=>{
   const aPenalty=(result.at(-1)?.src===a.src?100:0)+((perSource.get(a.src)||0)*3);
   const bPenalty=(result.at(-1)?.src===b.src?100:0)+((perSource.get(b.src)||0)*3);
   return (b.score-a.score+aPenalty-bPenalty)||(b.performance-a.performance);
  });
  const p=all.shift(),clip={...p,id:compId()};
  if(total+clip.end-clip.start>comp.target+2)clip.end=Math.min(clip.end,clip.start+Math.max(1,comp.target-total));
  if(clip.end-clip.start<0.5)break;
  result.push(clip);total+=clip.end-clip.start;perSource.set(clip.src,(perSource.get(clip.src)||0)+1);
 }
 // Ensure every chosen source gets at least one segment.
 for(const v of attached){
  const s=fileFor(v.id);
  if(result.some(c=>c.src===s.id))continue;
  const first=compPeaks(s)[0],fallback=first||{src:s.id,start:Math.max(0,s.manualStart||0),end:Math.min(s.duration,s.manualEnd||12),score:0,reason:"Manual selection"};
  if(fallback.end>fallback.start+.5)result.push({...fallback,id:compId()});
 }
 if(!result.length)return toast("No usable clips. Check file duration and set manual ranges.");
 comp.clips=result;W.reviewed=false;W.step=3;render();
}
function clipRow(c,i){
 const s=compSource(c.src);if(!s)return "";
 return '<article class="studio-timeline-row"><div class="studio-clip-number">'+(i+1)+'</div><div class="studio-clip-detail"><b>'+h(s.name)+'</b><small>'+h(c.reason)+' · '+compSec(c.start)+'–'+compSec(c.end)+'</small></div>'+
 '<label>Start<input type="number" class="field" data-studio-clip-start="'+h(c.id)+'" min="0" step="0.1" max="'+s.duration+'" value="'+c.start.toFixed(1)+'"></label>'+
 '<label>End<input type="number" class="field" data-studio-clip-end="'+h(c.id)+'" min="0" step="0.1" max="'+s.duration+'" value="'+c.end.toFixed(1)+'"></label>'+
 '<button class="btn comp-small" data-comp-move="'+c.id+'" data-step="-1" '+(i===0?"disabled":"")+'>↑</button>'+
 '<button class="btn comp-small" data-comp-move="'+c.id+'" data-step="1" '+(i===comp.clips.length-1?"disabled":"")+'>↓</button>'+
 '<button class="btn comp-small" data-comp-remove-clip="'+c.id+'">×</button></article>';
}
function wizardView(){
 const connected=Boolean(source()?.connected()),my=source()?.ownChannel();
 const stepper='<div class="studio-progress">'+[
 ["1","Find a theme"],["2","Analyze & attach footage"],["3","Review & export"]
 ].map((x,i)=>'<div class="'+(W.step===i+1?"active":W.step>i+1?"done":"")+'"><b>'+x[0]+'</b><span>'+x[1]+'</span></div>').join("")+'</div>';
 const head=header('Compilation <span class="title-accent">Studio.</span>','Find winning videos from your own channel, use real audience-retention peaks to select moments, and render your originals locally.','GUIDED VIDEO EDITOR')+stepper;
 if(!connected||!my)return head+'<div class="panel studio-panel"><h3>First connect your YouTube channel</h3><p>This workflow needs owner-authorized analytics to find your own videos and their retention peaks.</p><button class="btn btn-primary" data-go="youtube">▶ Connect channel</button></div>';
 if(W.step===1)return head+'<div class="panel studio-panel"><div class="pro-row-between"><h3>Step 1 · What theme should this compilation have?</h3><span class="tag green">'+h(my.title)+'</span></div>'+
 '<p>Search the titles, descriptions and tags of up to 250 recent uploads. Results rank by theme relevance, then lifetime average views/day.</p>'+
 '<div class="studio-search"><input id="studio-theme" class="field wide" maxlength="90" placeholder="e.g. hide and seek, mystery box, color challenge" value="'+h(W.theme)+'"><button class="btn btn-primary" data-studio-find>⌕ Find my videos</button></div>'+
 (W.found?'<div class="pro-row-between"><h3>'+W.results.length+' videos matching "'+h(W.theme)+'"</h3><span>'+W.selected.size+' / 8 selected</span></div>'+
 '<div class="studio-results">'+W.results.slice(0,60).map(makeVideoCard).join("")+'</div>'+
 '<div class="studio-actions"><button class="btn btn-outline" data-studio-back="0">Reset</button><button class="btn btn-primary" data-studio-analyze '+(!W.selected.size?"disabled":"")+'>Next: analyze selected ('+W.selected.size+') →</button></div>':'<div class="studio-empty">Enter a theme and click Find to browse your channel\'s actual uploads.</div>')+
 '<p class="studio-note">Only your channel videos appear. Search is a relevance filter of indexed uploads, not a YouTube-wide recommendation.</p></div>';
 if(W.step===2)return head+'<div class="studio-actions"><button class="btn btn-outline" data-studio-back="1">← Change selected videos</button><span class="studio-note">'+chosen().length+' selected</span></div>'+
 '<div class="panel studio-panel"><h3>Step 2 · The strongest moments</h3><p>We fetch the audience watch-ratio curve for each selected upload. YouTube may delay or omit retention for some videos. Attach the original file for each video you want to cut.</p>'+
 (W.analyzing?'<p class="studio-note">Analyzing YouTube retention… '+(W.curves.size+W.errors.size)+' / '+chosen().length+'</p>':"")+'</div>'+
 '<div class="studio-sourcegrid">'+chosen().map(candidateRow).join("")+'</div>'+
 '<div class="panel studio-panel"><p class="studio-warning">Attach the exact original export that matches the published upload. If durations or edits differ, YouTube retention timestamps cannot identify the same moments accurately.</p>'+
 '<label class="studio-duration-label">Target compilation length <select id="studio-target" class="field">'+[60,180,480,900].map(x=>'<option value="'+x+'" '+(comp.target===x?"selected":"")+'>'+compSec(x)+'</option>').join("")+'</select></label>'+
 '<div class="studio-actions"><button class="btn btn-primary" data-studio-timeline '+(W.analyzing?"disabled":"")+'>Next: auto-select highlights →</button></div></div>';
 return head+'<div class="studio-actions"><button class="btn btn-outline" data-studio-back="2">← Adjust source videos</button><button class="btn btn-outline" data-studio-remake>↻ Regenerate cuts</button></div>'+
 '<div class="panel studio-panel"><h3>Step 3 · Review the highlight timeline</h3>'+
 '<p>'+comp.clips.length+' clips · '+compSec(compClipDuration())+' total · target '+compSec(comp.target)+'. Local retention peaks are ranked, sources are alternated, and clips remain fully editable.</p>'+
 '<div class="studio-timeline">'+comp.clips.map(clipRow).join("")+'</div>'+
 '<p class="studio-note">The renderer joins clips at the selected timestamps. It does not detect dialogue, music beats, scene boundaries or semantic continuity. Adjust start/end points for natural transitions before exporting.</p>'+
 '<label class="studio-review"><input type="checkbox" id="studio-reviewed" '+(W.reviewed?"checked":"")+'> I reviewed the suggested cuts and checked timing and content.</label>'+
 '<label class="studio-review"><input type="checkbox" id="studio-rights" '+(comp.rights?"checked":"")+'> I own or have all necessary rights to the original video and audio.</label>'+
 '<div class="studio-actions"><button class="btn btn-primary" data-studio-render '+(!W.reviewed||!comp.rights||comp.rendering?"disabled":"")+'>✂ '+(comp.rendering?"Rendering…":"Render downloadable compilation")+'</button></div>'+
 (comp.rendering?'<div class="studio-rendering"><b id="comp-progress-text">'+h(comp.renderStatus)+' · '+Math.round(comp.renderPercent)+'%</b><div class="comp-progress"><span id="comp-progress-fill" style="width:'+comp.renderPercent+'%"></span></div><canvas id="comp-preview-canvas" width="640" height="360"></canvas></div>':"")+
 (comp.resultURL?'<div class="studio-complete"><h3>✓ Export finished</h3><video src="'+comp.resultURL+'" controls preload="metadata"></video><a href="'+comp.resultURL+'" download="Trend-Studio-'+compSafeName(W.theme)+'-Highlights.webm" class="btn btn-primary">↓ Download WebM video ('+compFileSize(comp.result?.size||0)+')</a><p>Video is processed locally in your browser; nothing was automatically uploaded to YouTube.</p></div>':"")+
 '<p class="studio-note">WebM export, 720p, keeps source audio. Browser encoding can be slow; leave this tab open. Large jobs may require desktop editing software.</p></div>';
}
const oldStage=compStage;
compStage=function(){return wizardView();};
function resizeClip(id,key,val){
 const clip=comp.clips.find(x=>x.id===id);if(!clip)return;
 const file=compSource(clip.src),n=Number(val);if(!file||!Number.isFinite(n))return;
 if(key==="start"){if(n<0||n>clip.end-.5)return toast("Start must be before the end.");clip.start=n;}
 else {if(n>file.duration||n<clip.start+.5)return toast("End must be within the file, after start.");clip.end=n;}
 compResultClear();W.reviewed=false;render();
}
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.compMove!==undefined||b.dataset.compRemoveClip!==undefined)W.reviewed=false;
},true);
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.studioFind!==undefined){findTheme();return;}
 if(b.dataset.studioAnalyze!==undefined){analyze();return;}
 if(b.dataset.studioTimeline!==undefined){buildTimeline();return;}
 if(b.dataset.studioBack!==undefined){const to=Number(b.dataset.studioBack);if(to===0){W.found=false;W.selected.clear();W.step=1;}else W.step=to;render();return;}
 if(b.dataset.studioRemake!==undefined){buildTimeline();return;}
 if(b.dataset.studioRender!==undefined){
  if(!W.reviewed||!comp.rights)return toast("Review clips and confirm source rights.");
  if(!comp.clips.length)return toast("Add clips first.");
  compRenderVideo();return;
 }
});
document.addEventListener("change",e=>{
 const t=e.target;
 if(t.dataset.studioPick!==undefined){
  if(t.checked&&W.selected.size>=8){t.checked=false;toast("Maximum 8 videos per compilation.");return;}
  if(t.checked)W.selected.add(t.dataset.studioPick);else W.selected.delete(t.dataset.studioPick);
  W.reviewed=false;render();return;
 }
 if(t.dataset.studioUpload!==undefined){attachFile(t.dataset.studioUpload,t.files?.[0]);return;}
 if(t.dataset.studioManualStart!==undefined){const s=fileFor(t.dataset.studioManualStart);if(s)s.manualStart=Number(t.value);return;}
 if(t.dataset.studioManualEnd!==undefined){const s=fileFor(t.dataset.studioManualEnd);if(s)s.manualEnd=Number(t.value);return;}
 if(t.dataset.studioClipStart!==undefined){resizeClip(t.dataset.studioClipStart,"start",t.value);return;}
 if(t.dataset.studioClipEnd!==undefined){resizeClip(t.dataset.studioClipEnd,"end",t.value);return;}
 if(t.id==="studio-target"){comp.target=Number(t.value);return;}
 if(t.id==="studio-reviewed"){W.reviewed=t.checked;render();return;}
 if(t.id==="studio-rights"){comp.rights=t.checked;render();return;}
});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target?.id==="studio-theme"){e.preventDefault();findTheme();}});
const sheet=document.createElement("style");sheet.textContent=String.raw`.studio-progress{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0 22px}.studio-progress>div{display:flex;gap:9px;align-items:center;background:#1b2438;border:1px solid #354159;border-radius:12px;padding:15px;color:#9daabf}.studio-progress b{background:#313f5a;border-radius:50%;height:28px;width:28px;display:grid;place-items:center}.studio-progress>.active{border-color:#9274ee;color:#f0eaff;background:#292740}.studio-progress>.done{border-color:#568c7b;color:#b6ecd3}.studio-panel{padding:22px;margin-bottom:18px}.studio-panel p{font-size:13px;color:#aebbd0;line-height:1.5}.studio-search{display:flex;gap:8px;margin:16px 0 22px}.studio-search input{flex:1}.studio-results{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;margin:14px 0;max-height:740px;overflow:auto}.studio-video-card{display:block;background:#1a273b;border:1px solid #35465e;border-radius:11px;padding:9px;cursor:pointer}.studio-video-card.selected{border-color:#947ce5;background:#29283e}.studio-video-card>input{accent-color:#a990ff;margin:0 0 8px}.studio-video-body,.studio-upload-head{display:flex;gap:12px}.studio-video-body img,.studio-upload-head img{width:118px;aspect-ratio:16/9;object-fit:cover;border-radius:8px;align-self:start}.studio-video-body strong,.studio-upload-head strong{display:block;font-size:13px;line-height:1.3}.studio-video-body small,.studio-upload-head small{display:block;color:#afbdd3;font-size:11px;margin-top:5px}.studio-actions{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:10px;margin:17px 0}.studio-empty{padding:25px;border-radius:10px;background:#19253a;color:#9aabc0;text-align:center}.studio-note{font-size:12px;color:#a9b8ce;line-height:1.4}.studio-warning{font-size:12px;background:#362c33;border:1px solid #705462;color:#ffe0d8!important;border-radius:9px;padding:11px}.studio-sourcegrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(370px,1fr));gap:13px;margin:16px 0}.studio-upload-card{padding:17px;min-width:0}.studio-retention-chart{height:110px;display:flex;align-items:end;gap:2px;margin-top:12px;padding:10px 2px 0;background:#17243a;border-radius:8px}.studio-retention-chart span{background:linear-gradient(0deg,#7967e2,#c09efa);flex:1;border-radius:3px 3px 0 0;min-height:3px}.studio-peaks{margin:12px 0}.studio-peak-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.studio-peak-list a{font-size:11px;color:#c8b6ff;border:1px solid #4b476e;border-radius:8px;padding:7px;text-decoration:none}.studio-source-file{margin-top:12px;display:flex;flex-wrap:wrap;align-items:center;gap:9px}.studio-manual{display:flex;gap:12px;margin-top:11px}.studio-manual label{max-width:150px;font-size:11px;color:#b9c8db}.studio-manual input{width:100%;margin-top:5px}.studio-duration-label{display:flex;align-items:center;gap:14px}.studio-timeline-row{display:flex;align-items:center;gap:8px;padding:12px 0;border-bottom:1px solid #354056}.studio-clip-number{width:26px;height:26px;border-radius:50%;background:#464379;display:grid;place-items:center;flex-shrink:0}.studio-clip-detail{flex:1;min-width:120px}.studio-clip-detail b,.studio-clip-detail small{display:block}.studio-clip-detail b{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.studio-clip-detail small{color:#aebbd0;font-size:11px}.studio-timeline-row label{font-size:10px;color:#abb8cd}.studio-timeline-row input{max-width:86px;width:86px}.studio-review{display:flex;gap:10px;align-items:center;margin-top:15px;font-size:13px;color:#c6d2e2}.studio-review input{width:17px;height:17px;accent-color:#a890ec}.studio-rendering canvas{max-width:530px;width:100%;aspect-ratio:16/9;margin-top:10px}.studio-complete{padding:15px;background:#213b39;border-radius:12px;border:1px solid #427669;margin-top:15px}.studio-complete video{display:block;max-width:570px;width:100%;margin:10px 0;border-radius:9px}.studio-complete a{display:inline-flex;margin-top:9px}@media(max-width:760px){.studio-progress>div{padding:9px;font-size:11px}.studio-search{flex-direction:column}.studio-sourcegrid{grid-template-columns:1fr}.studio-timeline-row{flex-wrap:wrap}.studio-timeline-row .studio-clip-detail{flex-basis:70%}}`;document.head.append(sheet);
})();