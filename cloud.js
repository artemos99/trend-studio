/* Trend Studio Online: email accounts, private cloud workspace, user-authorized YouTube.
   No YouTube upload permissions are requested; Google access tokens remain in browser memory only. */
(()=>{
'use strict';
const cfg=window.TREND_CONFIG||{};
const configured=Boolean(cfg.supabaseUrl && cfg.supabasePublishableKey);
const googleConfigured=Boolean(cfg.googleClientId);
const captchaEnabled=Boolean(cfg.turnstileSiteKey);
// Store this browser's session persistently only when opted in. Supabase still
// validates the JWT and database RLS requires assurance level aal2.
const REMEMBER_KEY='trend-studio:remember-device:v1';
let rememberDevice=false;
try{rememberDevice=window.localStorage.getItem(REMEMBER_KEY)==='1';}catch{}
const authStorageKeys=new Set();
const authStorage={
 getItem(key){authStorageKeys.add(key);
  try{return (rememberDevice?window.localStorage:window.sessionStorage).getItem(key);}catch{return null;}
 },
 setItem(key,value){authStorageKeys.add(key);
  const dest=rememberDevice?window.localStorage:window.sessionStorage;
  const other=rememberDevice?window.sessionStorage:window.localStorage;
  dest.setItem(key,value);try{other.removeItem(key);}catch{}
 },
 removeItem(key){authStorageKeys.add(key);
  for(const store of [window.sessionStorage,window.localStorage]){try{store.removeItem(key);}catch{}}
 }
};
function changeRememberDevice(enabled){
 const next=Boolean(enabled);
 if(rememberDevice!==next){
  const source=rememberDevice?window.localStorage:window.sessionStorage;
  const dest=next?window.localStorage:window.sessionStorage;
  try{
   for(const key of authStorageKeys){
    const value=source.getItem(key);
    if(value!==null){dest.setItem(key,value);source.removeItem(key);}
   }
   window.localStorage.setItem(REMEMBER_KEY,next?'1':'0');
   rememberDevice=next;
  }catch(e){toast('Device preference could not be saved; check browser storage settings.');return;}
 }
 document.querySelectorAll('[data-remember-device]').forEach(box=>{box.checked=rememberDevice;});
}
function rememberChoice(){
 return '<label class="checkline" style="margin:16px 0 5px;cursor:pointer"><input type="checkbox" data-remember-device '+(rememberDevice?'checked':'')+'> <span>Remember this device</span></label>'+
 '<p class="cloud-note" style="margin:5px 0 10px">Keep this browser signed in after verification. Use only on your private device. Signing out, revoking the session or clearing site data requires 2FA again.</p>';
}
const cloud={sb:null,user:null,loading:false,busy:false,lastSaved:'',timer:null,inFlight:false,setupError:'',syncInfo:'Guest — local only',authMode:'register',recovery:false,canWrite:false,mfaReady:false,mfaFactor:null,mfaEnrollment:null,mfaChecking:false,captchaToken:null,captchaWidget:null};
const yt={token:null,readExpires:0,channel:null,ownVideos:[],scanning:false,loadingRetention:false,channelStats:{},detailBusy:false};
const READ_SCOPES='https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly';
const guestData=(()=>{try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch{return {}}})();
const oldBanner=banner,oldRadar=radar,oldComp=compStage;
const me=document.getElementById('nav');
me.insertAdjacentHTML('beforeend',`<div class="nav-section">CONNECTED SERVICES</div>
 <button class="nav-link" data-page="youtube"><span>▶</span> YouTube connection <em>NEW</em></button>
 <button class="nav-link" data-page="account"><span>☻</span> My account <em>NEW</em></button>`);
document.querySelector('.workspace-switch small').textContent='Kids & family · Cloud-ready';
document.getElementById('refresh-btn').disabled=false;
document.getElementById('refresh-btn').textContent='Connect YouTube';
document.querySelector('.top-actions').insertAdjacentHTML('beforeend',`<button class="btn btn-outline" id="cloud-account-top" data-cloud="open-auth">Guest account</button>`);

const NICHE_PRESETS={
 kids:{label:'Kids & family',topics:['Color challenge','Hide and seek','Mystery box','Escape room','School stories','24 hour challenge','Food challenge'],competitors:[['@LikeNastyaofficial','Like Nastya'],['@VladandNiki','Vlad and Niki'],['@KidsDianaShow','Kids Diana Show'],['@aforadley','A for Adley'],['@NinjaKidzTV','Ninja Kidz TV']]},
 gaming:{label:'Gaming & Roblox',topics:['Roblox','Minecraft','Game update','Funny gaming moments','Gaming competition','Speedrun'],competitors:[['@Flamingo','Flamingo'],['@KreekCraft','KreekCraft'],['@MrBeastGaming','MrBeast Gaming'],['@ItsFunneh','ItsFunneh']]},
 challenges:{label:'Challenges & entertainment',topics:['Last to leave','24 hour challenge','Mystery challenge','Escape room','Team competitions','Social experiment'],competitors:[['@MrBeast','MrBeast'],['@StokesTwins','Stokes Twins'],['@BenAzelart','Ben Azelart'],['@Airrack','Airrack']]},
 lifestyle:{label:'Vlogs & lifestyle',topics:['Day in my life','Travel vlog','Life transformation','Budget challenge','Morning routine','Family vlog'],competitors:[['@EmmaChamberlain','Emma Chamberlain'],['@RyanTrahan','Ryan Trahan'],['@CaseyNeistat','Casey Neistat']]},
 tech:{label:'Tech & reviews',topics:['Phone review','New gadgets','AI tools','Tech comparison','Budget tech','Unboxing'],competitors:[['@mkbhd','MKBHD'],['@LinusTechTips','Linus Tech Tips'],['@Mrwhosetheboss','Mrwhosetheboss']]},
 education:{label:'Education & tutorials',topics:['How to tutorial','Science experiments','Explained simply','Learning tips','Myth busting'],competitors:[['@veritasium','Veritasium'],['@MarkRober','Mark Rober'],['@kurzgesagt','Kurzgesagt']]},
 food:{label:'Food & cooking',topics:['Easy recipe','Food challenge','Taste test','Budget cooking','Restaurant food'],competitors:[['@NickDiGiovanni','Nick DiGiovanni'],['@JoshuaWeissman','Joshua Weissman'],['@GordonRamsay','Gordon Ramsay']]},
 custom:{label:'Other / custom',topics:['Trending videos','Viral challenge','How to tutorial','Product review','YouTube Shorts'],competitors:[]}
};
let creatorProfile=null;
function nichePreset(id){return NICHE_PRESETS[id]||NICHE_PRESETS.kids;}
function cleanProfile(raw){
 if(!raw||raw.completed!==true)return null;
 const niche=Object.prototype.hasOwnProperty.call(NICHE_PRESETS,raw.niche)?raw.niche:'kids';
 const preset=nichePreset(niche);
 let topics=Array.isArray(raw.topics)?raw.topics.filter(t=>preset.topics.includes(t)).slice(0,8):[];
 if(!topics.length)topics=preset.topics.slice(0,3);
 return {completed:true,niche:niche,topics:topics,
 language:String(raw.language||'English').slice(0,50),goal:String(raw.goal||'Find trends').slice(0,60),
 channelId:/^UC[\w-]{22}$/.test(String(raw.channelId||''))?raw.channelId:'',
 channelTitle:String(raw.channelTitle||'').slice(0,130)};
}
function applyCreatorTopics(){
 if(!creatorProfile)return;
 const topics=creatorProfile.topics.map(function(name){
  return {name:name,query:name+' '+nichePreset(creatorProfile.niche).label+' youtube',
   icon:'✦',desc:'Personalized topic: '+name,words:[name.toLowerCase(),...name.toLowerCase().split(' ').filter(w=>w.length>3)]};
 });
 TOPICS.splice(0,TOPICS.length,...topics);
 if(state.videos.length)state.videos=normalizeVideos(state.videos);
}
function setupTopics(niche,selected){
 return nichePreset(niche).topics.map(function(topic){
  return '<label class="creator-topic"><input type="checkbox" name="topics" value="'+html(topic)+'" '+(selected.includes(topic)?'checked':'')+'><span>'+html(topic)+'</span></label>';
 }).join('');
}
function optionList(values,current){
 return values.map(function(v){return '<option value="'+html(v)+'" '+(v===current?'selected':'')+'>'+html(v)+'</option>';}).join('');
}
function showCreatorSetup(){
 if(!cloud.user||!cloud.mfaReady)return toast('Verify your account before personalizing.');
 const prof=creatorProfile||{niche:'kids',language:'English',goal:'Find trends',topics:nichePreset('kids').topics.slice(0,3)};
 const niches=Object.keys(NICHE_PRESETS).map(function(id){
  return '<option value="'+id+'" '+(prof.niche===id?'selected':'')+'>'+html(nichePreset(id).label)+'</option>';
 }).join('');
 const htmlForm='<div class="auth-dialog creator-setup"><button class="modal-x" type="button" data-cloud="close-modal" aria-label="Close">×</button>'+
 '<div class="eyebrow">YOUR CREATOR PROFILE</div><h2>Make Trend Studio yours.</h2><p>Customize trends, recommendations and competitors. You can change this anytime.</p>'+
 '<form id="creator-profile-form"><label>Content niche</label><select class="field wide" id="creator-niche" name="niche">'+niches+'</select>'+
 '<label>Channel language</label><select class="field wide" name="language">'+optionList(['English','Español','Русский','Português','Français','Deutsch','Other'],prof.language)+'</select>'+
 '<label>Main goal</label><select class="field wide" name="goal">'+optionList(['Find trends','Research competitors','Grow channel','Plan content','Make compilations'],prof.goal)+'</select>'+
 '<label>Choose topics</label><div class="creator-topic-grid" id="creator-topic-grid">'+setupTopics(prof.niche,prof.topics)+'</div>'+
 '<label class="creator-tick"><input type="checkbox" name="suggestCompetitors" checked> Add recommended competitor channels for this niche</label>'+
 '<button type="submit" class="btn btn-primary wide">Save personalized workspace →</button></form>'+
 '<p class="cloud-note">Saved privately to your account. YouTube connection is optional and always needs your permission.</p></div>';
 openModal(htmlForm);
}
function saveCreatorProfile(form){
 const data=new FormData(form),niche=String(data.get('niche')||'kids'),preset=nichePreset(niche);
 const topics=data.getAll('topics').map(String).filter(t=>preset.topics.includes(t));
 if(!topics.length)return toast('Select at least one topic.');
 const old=creatorProfile;
 creatorProfile=cleanProfile({completed:true,niche:niche,topics:topics,language:data.get('language'),goal:data.get('goal'),
  channelId:old?.channelId||'',channelTitle:old?.channelTitle||''});
 if(data.has('suggestCompetitors'))state.channels=preset.competitors.map(function(c){return {handle:c[0],name:c[1],role:'competitor'};});
 applyCreatorTopics();
 state.keywords=creatorProfile.topics.map(t=>t+' '+preset.label);
 if(state.mode!=='live')state.videos=[];
 cloud.lastSaved='';persist();saveCloud();closeModal();setPage('youtube');
 toast('Preferences saved. Connect YouTube to see real videos and thumbnails.');
}
function creatorSummary(){
 if(!creatorProfile)return '<p class="cloud-note">Not set up yet. Add your interests to personalize trends and competitors.</p>';
 return '<p><b>'+html(nichePreset(creatorProfile.niche).label)+'</b> · '+html(creatorProfile.language)+' · '+html(creatorProfile.goal)+'</p>'+
 '<p>'+creatorProfile.topics.map(x=>'<span class="tag">'+html(x)+'</span>').join(' ')+'</p>'+
 '<p class="cloud-note">Saved channel: '+html(creatorProfile.channelTitle||'Not connected yet')+'. Your YouTube access is reauthorized separately.</p>';
}

function payload(){return {channels:state.channels,ideas:state.ideas,keywords:state.keywords,days:state.days,profile:creatorProfile};}
function applyPayload(data){const d=data||{};creatorProfile=cleanProfile(d.profile);
 state.channels=Array.isArray(d.channels)?d.channels.slice(0,10).filter(c=>c&&typeof c==='object'&&typeof c.handle==='string'&&typeof c.name==='string'&&['my','competitor'].includes(c.role)).map(c=>({handle:String(c.handle).slice(0,128),name:String(c.name).slice(0,128),role:c.role})):DEFAULT_CHANNELS.map(x=>({...x}));
 state.ideas=Array.isArray(d.ideas)?d.ideas.slice(0,1000).filter(i=>i&&typeof i==='object').map(i=>({id:String(i.id||'').slice(0,100),title:String(i.title||'').slice(0,300),description:String(i.description||'').slice(0,6000),topic:String(i.topic||'').slice(0,120),status:['Idea','Scripting','Ready to film','Published'].includes(i.status)?i.status:'Idea',updated:Number(i.updated)||Date.now(),sourceId:String(i.sourceId||'').slice(0,120)})):[];
 state.keywords=Array.isArray(d.keywords)?d.keywords.slice(0,15).filter(k=>typeof k==='string').map(k=>k.slice(0,160)):TOPICS.map(t=>t.query);
 state.days=[7,14,30,60,90].includes(Number(d.days))?Number(d.days):30;
 if(creatorProfile)applyCreatorTopics();
}
function badge(){const x=document.getElementById('cloud-account-top');if(x)x.textContent=cloud.user?`☻ ${cloud.user.email?.split('@')[0]||'Account'}`:'☻ Sign in';
 const y=document.getElementById('sidebar-mode');if(!y)return;
 if(state.mode==='live')y.innerHTML='<span class="status-dot live"></span><span>Real YouTube stats</span>';
 else if(cloud.user)y.innerHTML='<span class="status-dot live"></span><span>Cloud workspace</span>';
 else y.innerHTML='<span class="status-dot"></span><span>Guest · sample videos</span>';
}
function queueCloudSave(){if(!cloud.user||cloud.loading||!cloud.sb||!cloud.canWrite||!cloud.mfaReady)return;
 const current=JSON.stringify(payload());if(current===cloud.lastSaved)return;
 clearTimeout(cloud.timer);cloud.timer=setTimeout(saveCloud,950);
}
async function saveCloud(){if(!cloud.user||cloud.loading||!cloud.sb||cloud.inFlight||!cloud.canWrite||!cloud.mfaReady)return;
 const userId=cloud.user.id,content=JSON.stringify(payload());if(content===cloud.lastSaved)return;
 cloud.inFlight=true;cloud.syncInfo='Saving workspace…';
 try{const {error}=await cloud.sb.from('trend_studio_workspaces').upsert({user_id:userId,workspace:JSON.parse(content),updated_at:new Date().toISOString()},{onConflict:'user_id'});
 if(error)throw error;if(cloud.user?.id===userId){cloud.lastSaved=content;cloud.syncInfo='✓ Saved to cloud';}}
 catch(e){cloud.syncInfo='Sync error: '+e.message;toast(cloud.syncInfo)}
 finally{cloud.inFlight=false;if(cloud.user?.id===userId&&JSON.stringify(payload())!==cloud.lastSaved&&cloud.syncInfo==='✓ Saved to cloud')queueCloudSave();}
}
persist=function(){if(!cloud.user){try{localStorage.setItem(STORAGE,JSON.stringify(payload()))}catch{}}
 else queueCloudSave();document.getElementById('vault-count').textContent=state.ideas.length;badge();};
function accountPage(){const msg=cloud.syncInfo;
 return header('Your <span class="title-accent">creator account.</span>','Sign in on any device to sync your Idea Vault, competitor watchlist, searches and production planner.','ACCOUNT & CLOUD')+
 `<div class="settings-grid"><div class="panel settings-block">
 ${cloud.user?`<h3>${cloud.mfaReady?'✓ Signed in securely':'🔐 Two-factor verification needed'}</h3><p><span class="tag green">${html(cloud.user.email||'Account')}</span></p><p>${html(msg)}</p><div class="settings-note">Changes to your ideas, keywords and competitor watchlist sync automatically between devices. Your actual video files stay on your computer.</div>
 ${!cloud.mfaReady?`<p class="cloud-note">Finish the authenticator-app verification before your synced projects become available.</p><button class="btn btn-primary" data-cloud="resume-mfa">Complete 2FA</button>`:''} ${cloud.recovery?`<form id="cloud-recovery-form"><label class="cloud-label">Choose a new password</label><input class="field wide" name="password" type="password" minlength="12" autocomplete="new-password" required><button class="btn btn-primary" type="submit">Set new password</button></form>`:''}
 ${rememberChoice()}<div class="cloud-actions"><button class="btn btn-outline" data-cloud="sync">↻ Sync now</button><button class="btn btn-outline" data-cloud="import-guest">↑ Import this device’s guest workspace</button><button class="btn" data-cloud="logout">Sign out</button></div>`:
 `<h3>${cloud.authMode==='register'?'Create your account':'Welcome back'}</h3><button class="btn btn-primary" data-cloud="open-auth">Open quick registration / login →</button>
 ${configured&&!captchaEnabled?`<p>Use your email address and password. Email confirmation may be required on registration.</p>
 <form id="cloud-auth-form"><label class="cloud-label">Email address</label><input class="field wide" name="email" type="email" autocomplete="email" required placeholder="you@example.com">
 <label class="cloud-label">Password</label><input class="field wide" name="password" type="password" autocomplete="${cloud.authMode==='register'?'new-password':'current-password'}" minlength="12" required placeholder="At least 12 characters">
 <button class="btn btn-primary" type="submit" ${cloud.busy?'disabled':''}>${cloud.authMode==='register'?'Register account':'Log in'}</button></form>
 <div class="cloud-actions" style="margin-top:18px"><button class="btn btn-outline" data-cloud="google-login" ${cloud.busy?'disabled':''}>Continue with Google</button></div>
 <p class="cloud-note">Google login requires the Google provider to be enabled in Supabase. Your YouTube connection uses a separate permission request.</p>
 <p><button class="panel-link" data-cloud="mode">${cloud.authMode==='register'?'Already registered? Log in':'Need an account? Register'}</button> <button class="panel-link" data-cloud="reset">Forgot password?</button></p>`:
 configured?`<p>Click the quick registration button above to sign in securely with the anti-bot challenge.</p>`:
 `<div class="settings-note">Cloud account setup isn't connected yet. Add your Supabase project URL and publishable key to <code>config.js</code>, then publish the site. The editor still works as a guest.</div><p><a class="link-accent" href="https://supabase.com/dashboard/projects" target="_blank" rel="noopener">Create a free Supabase project ↗</a></p>`}
 <p class="cloud-status" aria-live="polite">${html(msg)}</p>`}</div>
 <div class="panel settings-block"><h3>What syncs?</h3><p>✓ Ideas and production stages</p><p>✓ Competitor channel watchlist</p><p>✓ Trend search keywords and date window</p><p>✓ Private account per email address</p><p class="cloud-note">Not synced: source MP4 files, rendered compilations, retention CSVs, Google access tokens or Google passwords. These stay on your device. YouTube needs to be reauthorized per browser session. Unremembered sessions normally end when you close the browser tab.</p>
 <button class="btn btn-outline" data-action="export">↓ Download workspace backup</button>
 <label class="comp-file-btn" style="margin-top:10px">↑ Import exported workspace JSON<input type="file" accept=".json,application/json" id="import-cloud-workspace"></label>
 <p class="cloud-note">Import accepts the JSON backup exported from the earlier offline Trend Studio too. If you are signed in, the imported workspace will replace the one synced to your account.</p></div></div>`;}
async function loadCloud(){if(!cloud.user||!cloud.sb||!cloud.mfaReady)return;const uid=cloud.user.id;cloud.loading=true;cloud.canWrite=false;cloud.syncInfo='Loading workspace…';badge();
 try{const {data,error}=await cloud.sb.from('trend_studio_workspaces').select('workspace').eq('user_id',uid).maybeSingle();if(error)throw error;
 if(cloud.user?.id!==uid)return;
 if(data?.workspace){applyPayload(data.workspace);cloud.lastSaved=JSON.stringify(payload());cloud.syncInfo='✓ Workspace loaded — synced across devices';}
 else {applyPayload(null);cloud.lastSaved='';cloud.syncInfo='New account ready — your cloud workspace is empty';}cloud.canWrite=true;
 }catch(e){cloud.syncInfo='Workspace loading failed: '+e.message;toast(cloud.syncInfo)}
 finally{cloud.loading=false;render();if(cloud.user?.id===uid&&cloud.mfaReady&&cloud.canWrite&&!creatorProfile)showCreatorSetup();}
}
async function initCloud(){if(!configured){cloud.syncInfo='Guest mode · Configure Supabase to enable accounts';badge();return;}
 if(!/^https:\/\/[^/]+\.supabase\.co\/?$/.test(cfg.supabaseUrl)){cloud.syncInfo='Invalid Supabase URL in config.js';return;}
 if(!window.supabase?.createClient){cloud.syncInfo='Supabase library failed to load. Check your network.';render();return;}
 try{cloud.sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,storage:authStorage,autoRefreshToken:true,detectSessionInUrl:true}});
 cloud.sb.auth.onAuthStateChange((event,session)=>{if(event==='TOKEN_REFRESHED'&&session?.user&&!cloud.mfaReady)queueMicrotask(()=>checkMFA());if(event==='PASSWORD_RECOVERY'){cloud.recovery=true;queueMicrotask(()=>{state.page='account';render();});}const prior=cloud.user?.id||null,next=session?.user||null;
 if((next?.id||null)!==prior){cloud.user=next;cloud.canWrite=false;clearTimeout(cloud.timer);
 if(next)queueMicrotask(()=>checkMFA());else{cloud.mfaReady=false;cloud.mfaFactor=null;cloud.mfaEnrollment=null;cloud.lastSaved='';applyPayload(guestData);cloud.syncInfo='Guest — work is saved on this device only';render();}}
 });
 const {data,error}=await cloud.sb.auth.getSession();if(error)throw error;
 if(data.session?.user&&!cloud.user){cloud.user=data.session.user;await checkMFA();}
 else{cloud.syncInfo='Guest mode — register or log in for cross-device sync';render();}
 }catch(e){cloud.syncInfo='Account setup error: '+e.message;toast(cloud.syncInfo);render();}
}
async function authSubmit(form){if(!cloud.sb)return toast('Configure Supabase first.');const data=new FormData(form),email=String(data.get('email')||'').trim(),password=String(data.get('password')||'');
 if(!email||password.length<12)return toast('Enter your email and a password of at least 12 characters.');
 if(captchaEnabled&&!cloud.captchaToken)return toast('Complete the bot verification in the registration pop-up.');cloud.busy=true;
 try{const args={email,password};const captchaOpts=captchaEnabled?{captchaToken:cloud.captchaToken}:{};
 const result=cloud.authMode==='register'?await cloud.sb.auth.signUp({...args,options:{emailRedirectTo:location.origin+location.pathname,...captchaOpts}}):await cloud.sb.auth.signInWithPassword({...args,options:captchaOpts});
 if(result.error)throw result.error;
 if(cloud.authMode==='register'&&!result.data.session){cloud.syncInfo='Account created. Confirm your email, then sign in to set up the authenticator app.';cloud.authMode='login';showAuthModal();}
 else{cloud.syncInfo='First sign-in successful. Complete 2FA to unlock your workspace.';if(result.data.session)await checkMFA();}
 }catch(e){cloud.syncInfo='Sign-in error: '+e.message;}finally{cloud.busy=false;cloud.captchaToken=null;render();if(!cloud.user)showAuthModal();}
}
async function accountAction(action){if(action==='regenerate-mfa'){
  if(!cloud.sb||!cloud.user||!cloud.mfaFactor||!cloud.mfaEnrollment)return toast('No unfinished setup to regenerate.');
  if(cloud.busy)return;
  cloud.busy=true;
  try{
   const {error}=await cloud.sb.auth.mfa.unenroll({factorId:cloud.mfaFactor});
   if(error)throw error;
   cloud.mfaFactor=null;cloud.mfaEnrollment=null;
   await enrollMFA();
   toast('New authenticator setup key generated. Keep it private.');
  }catch(e){toast('Could not reset authenticator setup: '+e.message)}
  finally{cloud.busy=false;}
  return;
 }
 if(action==='open-auth'){cloud.authMode=cloud.user?'login':'register';if(cloud.user){setPage('account');if(!cloud.mfaReady)checkMFA();}else showAuthModal();return;}
 if(action==='resume-mfa'){await checkMFA();return;}
 if(action==='mode'){cloud.authMode=cloud.authMode==='login'?'register':'login';showAuthModal();return;}
 if(action==='google-login'){if(!cloud.sb)return toast('Configure Supabase first.');
  cloud.syncInfo='Opening Google sign-in…';render();
  try{const {error}=await cloud.sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}});
   if(error)throw error;
  }catch(e){cloud.syncInfo='Google sign-in failed: '+e.message;toast(cloud.syncInfo);render();}
  return;
 }
 if(action==='logout'){if(!cloud.sb)return;await cloud.sb.auth.signOut();cloud.mfaReady=false;cloud.mfaEnrollment=null;yt.token=null;yt.channel=null;yt.ownVideos=[];yt.channelStats={};state.videos=makeDemo();setMode('demo');cloud.user=null;cloud.syncInfo='Signed out; guest work remains local';applyPayload(guestData);render();return;}
 if(action==='reset'){if(!cloud.sb)return toast('Configure Supabase first');if(captchaEnabled&&!cloud.captchaToken)return toast('Complete the bot verification in the sign-in pop-up before requesting a password reset.');const email=prompt('Email address for your password reset:');if(!email)return;
 const {error}=await cloud.sb.auth.resetPasswordForEmail(email.trim(),{redirectTo:location.origin+location.pathname,...(captchaEnabled?{captchaToken:cloud.captchaToken}:{})});
 if(captchaEnabled)showAuthModal();toast(error?'Error: '+error.message:'If this email has an account, check it for reset instructions.');return;}
 if(!cloud.user)return toast('Sign in first.');
 if(action==='sync'){await saveCloud();await loadCloud();toast(cloud.syncInfo);return;}
 if(action==='import-guest'){if(!confirm('Replace your cloud workspace with the guest workspace saved on THIS device?'))return;applyPayload(guestData);cloud.lastSaved='';await saveCloud();render();toast(cloud.syncInfo);return;}
}

// Account modal: first factor is handled by Supabase; no password is stored in this app.
function showAuthModal(){
 if(cloud.captchaWidget!==null&&window.turnstile){try{window.turnstile.remove(cloud.captchaWidget);}catch{}}
 cloud.captchaWidget=null;cloud.captchaToken=null;
 if(cloud.user){if(!cloud.mfaReady)checkMFA();else setPage('account');return;}
 const heading=cloud.authMode==='register'?'Create your Trend Studio account':'Welcome back';
 openModal(`<div class="auth-dialog"><div class="auth-icon">✦</div><button class="modal-x" type="button" data-cloud="close-modal" aria-label="Close">×</button>
 <h2>${heading}</h2><p>Email, password, then a secure authenticator-app code. Your account works on any device.</p>
 ${configured?`<form id="cloud-auth-form"><label>Email address</label><input class="field wide" type="email" name="email" autocomplete="email" required placeholder="you@example.com" maxlength="254">
 <label>Password</label><input class="field wide" type="password" name="password" autocomplete="${cloud.authMode==='register'?'new-password':'current-password'}" required minlength="12" placeholder="At least 12 characters">
 ${cloud.authMode==='register'?`<label>Confirm password</label><input class="field wide" type="password" name="confirm" autocomplete="new-password" required minlength="12"></input>`:''}
 ${captchaEnabled?`<label>Spam protection</label><div id="cloud-turnstile" aria-label="Bot verification"></div>`:''}
 <button class="btn btn-primary wide" type="submit" ${cloud.busy?'disabled':''}>${cloud.authMode==='register'?'Create account':'Log in'} →</button></form>
 ${rememberChoice()}<div class="modal-center"><span>or</span></div><button class="btn btn-outline wide" data-cloud="google-login" ${cloud.busy?'disabled':''}>Continue with Google</button>
 <p class="cloud-note">${html(cloud.syncInfo)}</p><button class="panel-link" data-cloud="mode">${cloud.authMode==='register'?'Already registered? Sign in':'New here? Register'}</button>
 <button class="panel-link" data-cloud="reset">Forgot password?</button>`:
 `<p class="settings-note">Account registration is not live yet. An administrator must add a Supabase project URL and publishable key to config.js and configure authentication.</p>`}
 </div>`);
 if(captchaEnabled){
  const loadChallenge=()=>{const target=document.getElementById('cloud-turnstile');if(!target||!window.turnstile||cloud.captchaWidget!==null)return;
   cloud.captchaWidget=window.turnstile.render(target,{sitekey:cfg.turnstileSiteKey,callback:(token)=>{cloud.captchaToken=token;},'expired-callback':()=>{cloud.captchaToken=null;},'error-callback':()=>{cloud.captchaToken=null;}});};
  loadChallenge();if(!window.turnstile){const script=document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');script?.addEventListener('load',loadChallenge,{once:true});}
 }
}
async function checkMFA(){
 if(!cloud.sb||!cloud.user||cloud.mfaChecking)return;
 cloud.mfaChecking=true;cloud.canWrite=false;
 try{
 const {data,error}=await cloud.sb.auth.mfa.getAuthenticatorAssuranceLevel();if(error)throw error;
 if(!cloud.user)return;
 if(data.currentLevel==='aal2'){
   const firstUnlock=!cloud.mfaReady;cloud.mfaReady=true;cloud.mfaEnrollment=null;cloud.mfaFactor=null;
   if(firstUnlock){closeModal();await loadCloud();toast('2FA verified — workspace unlocked');}
   return;
 }
 cloud.mfaReady=false;
 if(data.nextLevel==='aal2'){
   const factors=await cloud.sb.auth.mfa.listFactors();if(factors.error)throw factors.error;
   const f=factors.data.totp?.find(x=>x.status==='verified')||factors.data.totp?.[0];
   if(!f)throw Error('Your 2FA factor is missing. Contact your workspace administrator.');
   cloud.mfaFactor=f.id;showMfaChallenge();
 }else {await enrollMFA();}
 }catch(e){cloud.syncInfo='Two-factor authentication: '+e.message;render();toast(cloud.syncInfo)}
 finally{cloud.mfaChecking=false;}
}
async function enrollMFA(){
 if(!cloud.sb||!cloud.user)return;
 if(!cloud.mfaEnrollment){
   // Interrupted enrollment can leave an unverified factor in Supabase.
   // A repeated fixed friendly name then causes a duplicate-factor error.
   const {data:factorData,error:factorError}=await cloud.sb.auth.mfa.listFactors();
   if(factorError)throw factorError;
   const all=Array.isArray(factorData?.all)?factorData.all:[];
   const verified=(factorData?.totp||[]).find(f=>f.status==='verified')
     ||all.find(f=>f.factor_type==='totp'&&f.status==='verified');
   if(verified){cloud.mfaFactor=verified.id;showMfaChallenge();return;}
   // Never unenroll a verified factor. Only discard unverified Trend Studio
   // setup attempts; they cannot provide second-factor authentication.
   for(const f of all){
     if(f.factor_type==='totp'&&f.status==='unverified'
        &&String(f.friendly_name||'').startsWith('Trend Studio authenticator')){
       const {error}=await cloud.sb.auth.mfa.unenroll({factorId:f.id});
       if(error)throw Error('Could not replace the unfinished setup: '+error.message);
     }
   }
   const {data,error}=await cloud.sb.auth.mfa.enroll({
     factorType:'totp',friendlyName:'Trend Studio authenticator '+Date.now().toString(36)
   });
   if(error)throw error;
   cloud.mfaFactor=data.id;cloud.mfaEnrollment=data.totp;
 }
 const t=cloud.mfaEnrollment;const qr=String(t?.qr_code||'');
 // Only permit a data SVG generated by Supabase, never untrusted remote URLs.
 const qrSafe=/^data:image\/svg\+xml(?:;charset=[\w-]+)?;base64,[A-Za-z0-9+/=]+$/.test(qr)?qr:'';
 openModal(`<div class="auth-dialog"><div class="auth-icon">🔐</div><h2>Protect your account</h2><p>Scan this QR code in Google Authenticator, Microsoft Authenticator, or 1Password.</p>
 ${qrSafe?`<img class="mfa-qr" src="${html(qrSafe)}" alt="Authenticator setup QR code">`:'<p class="settings-note">Use the setup key below in your authenticator app.</p>'}
 <details style="margin-top:12px"><summary style="cursor:pointer;color:#baaaff;font-weight:bold">Show manual setup key (keep private)</summary><code class="mfa-secret">${html(t?.secret||'')}</code></details>
 <button class="btn btn-outline wide" type="button" data-cloud="regenerate-mfa" style="margin-top:12px">↻ Regenerate setup key</button>
 <form id="mfa-verify-form"><label>Six-digit authenticator code</label><input class="field wide" name="code" required pattern="[0-9]{6}" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000">
 ${rememberChoice()}<button class="btn btn-primary wide" type="submit">Verify and secure account →</button></form>
 <p class="cloud-note">Your cloud workspace is locked until 2FA succeeds. If you lose your authenticator, account recovery requires administrator help; Supabase does not provide backup codes.</p>
 <button class="panel-link" data-cloud="logout">Use another account</button></div>`);
}
function showMfaChallenge(){openModal(`<div class="auth-dialog"><div class="auth-icon">🔑</div><h2>Two-factor verification</h2><p>Enter the six-digit code from your authenticator app to unlock your projects.</p>
 <form id="mfa-verify-form"><label>Authenticator code</label><input class="field wide" name="code" required pattern="[0-9]{6}" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000" autofocus>
 ${rememberChoice()}<button class="btn btn-primary wide" type="submit">Verify and sign in →</button></form><button class="panel-link" data-cloud="logout">Sign in with another account</button></div>`);}
async function verifyMFA(form){const code=String(new FormData(form).get('code')||'').trim();if(!/^\d{6}$/.test(code))return toast('Enter the six-digit code.');
 if(!cloud.sb||!cloud.mfaFactor)return toast('Start 2FA setup again.');
 const submit=form.querySelector('button[type="submit"]');submit.disabled=true;
 try{const {error}=await cloud.sb.auth.mfa.challengeAndVerify({factorId:cloud.mfaFactor,code});if(error)throw error;
 cloud.mfaEnrollment=null;await checkMFA();}
 catch(e){toast('Authenticator code not accepted: '+e.message);submit.disabled=false;}
}

// Google Identity Services (the access token lives only in memory).
function askGoogle(scope,callback){if(!googleConfigured)return toast('Add your Google OAuth WEB client ID to config.js.');
 if(!window.google?.accounts?.oauth2)return toast('Google authorization has not loaded; check internet and retry.');
 const client=google.accounts.oauth2.initTokenClient({client_id:cfg.googleClientId,scope,include_granted_scopes:false,
 callback:r=>{if(r.error||!r.access_token){toast('Google authorization failed: '+(r.error||'No token'));return;}callback(r);}});
 client.requestAccessToken({prompt:'consent'});
}
function connectYouTube(){askGoogle(READ_SCOPES,async r=>{
 yt.token=r.access_token;yt.readExpires=Date.now()+Math.max(100,(Number(r.expires_in)||3600)-90)*1000;
 try{const result=await ytRequest('/youtube/v3/channels',{part:'snippet,contentDetails,statistics',mine:'true'});
 const mine=result.items?.[0];if(!mine)throw Error('No YouTube channel was found for that Google account. Try the Google account that owns the channel.');
 yt.channel={id:mine.id,title:mine.snippet.title,uploads:mine.contentDetails?.relatedPlaylists?.uploads};yt.channelStats[mine.id]=mine;await loadOwnVideos();
 toast(`Connected to ${yt.channel.title}`);setPage('youtube');
 }catch(e){toast('YouTube connection: '+e.message);render();}
 });}
function canRead(){return Boolean(yt.token&&Date.now()<yt.readExpires);}
async function googleFetch(url,opt={},token=yt.token){if(!token)throw Error('YouTube session expired. Reconnect the channel.');
 const r=await fetch(url,{...opt,headers:{...(opt.headers||{}),Authorization:'Bearer '+token}});
 const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{data={message:raw}};
 if(!r.ok)throw Error(data.error?.message||data.message||`Google returned ${r.status}`);return data;}
async function ytRequest(path,params={}){if(!canRead())throw Error('YouTube access expired; reconnect your Google account.');
 const q=new URLSearchParams(params);return googleFetch('https://www.googleapis.com'+path+'?'+q.toString());}
async function loadOwnVideos(){if(!yt.channel?.uploads)return;
 const items=(await ytRequest('/youtube/v3/playlistItems',{part:'contentDetails',playlistId:yt.channel.uploads,maxResults:50})).items||[];
 if(!items.length){yt.ownVideos=[];return;}
 yt.ownVideos=(await ytRequest('/youtube/v3/videos',{part:'snippet,contentDetails,statistics',id:items.map(x=>x.contentDetails.videoId).join(','),maxResults:50})).items||[];
}
function parseDuration(iso){const m=String(iso||'').match(/P(?:([\d.]+)D)?T?(?:([\d.]+)H)?(?:([\d.]+)M)?(?:([\d.]+)S)?/);return m?Number(m[1]||0)*86400+Number(m[2]||0)*3600+Number(m[3]||0)*60+Number(m[4]||0):0;}
function toRadarVideo(v,channel,handle){return {id:v.id,title:v.snippet?.title||'Untitled',channel,channelHandle:handle,views:Number(v.statistics?.viewCount)||0,likes:Number(v.statistics?.likeCount)||0,duration:parseDuration(v.contentDetails?.duration),channelId:v.snippet?.channelId||'',thumbnailUrl:v.snippet?.thumbnails?.medium?.url||'',comments:Number(v.statistics?.commentCount)||0,publishedAt:v.snippet?.publishedAt||new Date().toISOString(),emoji:'🎬',source:'youtube'};}
async function scanLive(){if(yt.scanning)return;if(!canRead()){toast('Connect YouTube first to load real public metrics.');setPage('youtube');return;}
 yt.scanning=true;const status=document.getElementById('yt-activity');if(status)status.textContent='Scanning…';let all=[],errs=[];
 try{if(!yt.ownVideos.length)await loadOwnVideos();if(yt.channel)all.push(...yt.ownVideos.map(x=>toRadarVideo(x,yt.channel.title,'@'+yt.channel.id)));
 const list=state.channels.filter(c=>c.role==='competitor').slice(0,8);
 for(let n=0;n<list.length;n++){const c=list[n];if(!canRead())throw Error('Google access expired. Reconnect YouTube.');
 const handle=c.handle;try{
 const info=await ytRequest('/youtube/v3/channels',{part:'snippet,contentDetails,statistics',...(handle.startsWith('UC')?{id:handle}:{forHandle:handle})});
 const item=info.items?.[0],pid=item?.contentDetails?.relatedPlaylists?.uploads;if(item)yt.channelStats[item.id]=item;if(!pid){errs.push(handle+' not found');continue;}
 const pubs=(await ytRequest('/youtube/v3/playlistItems',{part:'contentDetails',playlistId:pid,maxResults:20})).items||[];
 if(!pubs.length)continue;
 const videos=(await ytRequest('/youtube/v3/videos',{part:'snippet,statistics,contentDetails',id:pubs.map(x=>x.contentDetails.videoId).join(',')})).items||[];
 all.push(...videos.map(x=>toRadarVideo(x,item.snippet.title,handle)));
 }catch(e){errs.push(handle+': '+e.message);}
 const progress=document.getElementById('yt-activity');if(progress)progress.textContent=`Scanned ${n+1}/${list.length} competitors`;
 }
 if(all.length){state.videos=normalizeVideos(all);state.scannedAt=todayString();setMode('live');}
 yt.scanReport=`${all.length} real videos indexed. ${errs.length?'Some channels failed: '+errs.join('; '):'Scan complete.'}`;
 toast(yt.scanReport);setPage('radar');
 }catch(e){toast('YouTube scan: '+e.message)}finally{yt.scanning=false;render();}
}
function youtubePage(){return header('Connect your <span class="title-accent">YouTube channel.</span>','Read your own uploads and retention charts. Compare public competitor metrics. This version has no channel write or upload permissions.','GOOGLE & YOUTUBE')+
 `<div class="settings-grid"><div class="panel settings-block"><h3>${yt.channel?'✓ '+html(yt.channel.title):'Connect Google / YouTube'}</h3><p>${yt.channel?`Channel ID: <code>${html(yt.channel.id)}</code>`:'Choose the Google account that manages Nastya Artem Mia. You will approve read-only YouTube and Analytics permissions in Google’s secure window.'}</p>
 <div class="cloud-actions"><button class="btn btn-primary" data-youtube="connect">${yt.channel?'↻ Reauthorize':'▶ Connect YouTube'}</button><button class="btn" data-youtube="scan" ${!yt.channel||yt.scanning?'disabled':''}>${yt.scanning?'Scanning…':'↻ Scan my channel + competitors'}</button><button class="btn btn-outline" data-youtube="disconnect" ${!yt.channel?'disabled':''}>Disconnect</button></div>
 <p id="yt-activity" class="cloud-status">${html(yt.scanReport|| (yt.channel?'Ready for a real-data scan':'Disconnected'))}</p>
 ${!googleConfigured?`<div class="settings-note">To activate: add a Google Cloud OAuth WEB client ID to <code>config.js</code> and allow your hosted GitHub Pages URL as an authorized JavaScript origin.</div>`:''}
 </div><div class="panel settings-block"><h3>Read-only channel connection</h3><p>✓ Index recent videos on your channel and up to 8 public competitor channels.</p><p>✓ Retrieve your own retention curves for videos that have Analytics data.</p><p>✓ Generate a private-upload metadata kit for manual review in YouTube Studio. This deployment does not request YouTube write permission.</p><p class="cloud-note">Not available via public API: competitor retention, reliable live views/hour, downloading video originals, or creating YouTube Studio's internal unfinished draft. No edit, delete, or upload permissions are requested. YouTube permissions must be reauthorized when the access token expires.</p></div></div>
 ${yt.ownVideos.length?`<div class="panel settings-block"><h3>Your latest uploads · ${yt.ownVideos.length}</h3><p>Click the thumbnail to watch and see analytics.</p><div class="video-list">${yt.ownVideos.slice(0,18).map(v=>videoRow(normalizeVideos([toRadarVideo(v,yt.channel.title,'@'+yt.channel.id)])[0])).join('')}</div></div>`:''}`;}
async function fetchRetention(srcId,videoId){if(!canRead())return toast('Reconnect YouTube before importing Analytics.');
 const s=compSource(srcId);if(!s||!yt.ownVideos.some(v=>v.id===videoId))return toast('Choose one of your own channel videos.');
 yt.loadingRetention=true;try{
 const end=new Date(Date.now()-2*86400000).toISOString().slice(0,10);
 const q={ids:'channel==MINE',startDate:'2010-01-01',endDate:end,metrics:'audienceWatchRatio,relativeRetentionPerformance',dimensions:'elapsedVideoTimeRatio',filters:'video=='+videoId,sort:'elapsedVideoTimeRatio'};
 const resp=await googleFetch('https://youtubeanalytics.googleapis.com/v2/reports?'+new URLSearchParams(q));const rows=(resp.rows||[]).map(r=>({pos:Number(r[0]),ratio:Number(r[1])})).filter(x=>Number.isFinite(x.pos)&&Number.isFinite(x.ratio));
 if(rows.length<3)throw Error('No usable retention data. The video may have too little data or be outside the report window.');
 s.rows=rows;s.youtubeId=videoId;s.signal=`${rows.length} real YouTube retention points`;compRefresh();toast(`Imported ${rows.length} retention measurements`);
 }catch(e){toast('Analytics: '+e.message)}finally{yt.loadingRetention=false;}
}
function extraCompilationTools(){const choices=yt.ownVideos.map(x=>`<option value="${html(x.id)}">${html(x.snippet?.title||x.id).slice(0,100)}</option>`).join('');
 return `<section class="panel comp-box" style="margin-top:20px"><div class="comp-heading"><div><h3>5. Read-only YouTube integration</h3><small>Fetch first-party retention for your original footage. All publishing stays in YouTube Studio.</small></div></div>
 <p class="comp-footer">${yt.channel?`Connected to ${html(yt.channel.title)}. Choose a matching uploaded video for each of your local source files.`:'First connect the YouTube channel you manage.'}</p>
 <div class="cloud-actions"><button class="btn btn-outline" data-go="youtube">▶ ${yt.channel?'Manage YouTube':'Connect YouTube'}</button></div>
 ${yt.channel&&comp.sources.length?`<div class="comp-sources">${comp.sources.map(s=>`<div class="comp-source"><b>${html(s.name)}</b><div class="cloud-actions" style="margin-top:9px"><select aria-label="YouTube video matching ${html(s.name)}" class="field" data-yt-vid="${html(s.id)}"><option value="">Select matching OWN channel video</option>${yt.ownVideos.map(v=>`<option value="${html(v.id)}" ${s.youtubeId===v.id?'selected':''}>${html(v.snippet?.title||v.id).slice(0,90)}</option>`).join('')}</select><button class="btn comp-small" data-youtube="retention" data-source-id="${html(s.id)}" ${yt.loadingRetention?'disabled':''}>↘ Fetch retention</button></div></div>`).join('')}</div>`:''}
 ${comp.result?`<div class="comp-warning"><strong>Manual upload only.</strong> Export your video and metadata, review rights and Made for Kids settings, then upload it yourself in YouTube Studio. Trend Studio does not have write access to your channel.</div><a class="btn btn-primary" href="https://studio.youtube.com/" target="_blank" rel="noopener noreferrer">Open YouTube Studio ↗</a>`:'<p class="comp-quiet">Render a compilation above, then download it and upload manually.</p>'}
 </section>`;}
compStage=function(){return oldComp()+extraCompilationTools();};
function languageCode(){return {'English':'en','Español':'es','Русский':'ru'}[comp.language]||'en';}
// Adapt existing sample-mode notices for an internet-connected edition.
banner=function(){if(state.mode==='live')return `<div class="sample-banner" style="border-color:#355b53;background:#162a30;color:#a9e6d7"><div><strong>● YouTube public metrics</strong> · Fetched ${html(state.scannedAt||'recently')}. The pace index uses lifetime averages, not measured real-time views/hour. Competitor audience retention is unavailable.</div><button data-go="youtube">Connection ↗</button></div>`;
 return `<div class="sample-banner"><div><strong>✦ Sample mode</strong> · Video examples and metrics here are fictional until you connect YouTube and perform a scan.</div><button data-go="youtube">Connect channel ↗</button></div>`;};
radar=function(){return oldRadar().replace('Sample data only</button>','Scan real channels ↗</button>').replace('disabled title="Live YouTube metrics require the full server version"','data-go="youtube"');};
settings=function(){return header('Workspace <span class="title-accent">settings.</span>','Manage your trend queries, back up the project and connect services.','DATA & SETTINGS')+
 `<div class="settings-grid"><div class="panel settings-block"><h3>Connected services</h3><p><span class="tag ${cloud.user?'green':'gold'}">${cloud.user?'✓ Cloud account':'Guest'}</span> · ${html(cloud.user?.email||'Not signed in')}</p><p><span class="tag ${yt.channel?'green':'gold'}">${yt.channel?'✓ YouTube':'YouTube disconnected'}</span> · ${html(yt.channel?.title||'Live data not available')}</p><div class="cloud-actions"><button class="btn btn-outline" data-go="account">Manage account</button><button class="btn btn-outline" data-go="youtube">YouTube connection</button></div><p class="cloud-note">${html(cloud.syncInfo)}</p></div><div class="panel settings-block"><h3>Trend research keywords</h3><p>Keywords are saved with your workspace. Only the channel and competitor scan returns live API data.</p><select class="field wide" id="keyword-select">${state.keywords.map((k,i)=>`<option value="${i}">${html(k)}</option>`).join('')}</select><div class="input-row" style="margin-top:12px"><input class="field" placeholder="e.g. family obstacle course" id="keyword-input"><button class="btn btn-subtle" data-action="add-keyword">Add</button></div></div><div class="panel settings-block"><h3>Backups</h3><p>Always keep an export before switching accounts or devices.</p><button class="btn" data-action="export">↓ Export workspace JSON</button><button class="btn" data-action="export-videos">↓ Export video statistics</button></div></div>`;};

// Real YouTube video thumbnails and detail panels. Public metrics do not imply
// access to private competitor retention, impressions, CTR, or watch time.
function validVideoId(id){return /^[A-Za-z0-9_-]{11}$/.test(String(id||''));}
function metric(n){return Number.isFinite(Number(n))?num(Number(n)):'Not public';}
function actualThumb(v){if(!validVideoId(v.id))return thumb(v);
 return `<div class="thumb"><img class="thumbnail" src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt="Thumbnail for ${html(v.title)}" loading="lazy"><span class="duration">${Math.floor((v.duration||0)/60)}:${String(Math.floor((v.duration||0)%60)).padStart(2,'0')}</span></div>`;}
videoRow=function(v){const demo=!validVideoId(v.id);return `<div class="video-row">${demo?thumb(v):`<button class="video-thumb-btn" type="button" data-video-detail="${v.id}" aria-label="Watch and analyze ${html(v.title)}">${actualThumb(v)}</button>`}
 <div class="video-info"><div class="video-title">${html(v.title)}</div><div class="video-meta">${html(v.channel)} · ${timeAgo(v.age)} · ${html(v.topic)}</div>
 ${!demo?`<button class="panel-link" data-video-detail="${v.id}">▶ Watch · analytics ↗</button>`:'<span class="small-hint">Illustrative sample, not a real video</span>'}</div>
 <div class="video-stats"><b>${money(v.views)}</b><small>views</small><div style="margin-top:8px"><span class="boost">${v.outlier.toFixed(1)}× pace</span></div></div>
 <button class="save ${savedVideo(v)?'active':''}" data-save-video="${html(v.id)}" aria-label="Save video as idea">${savedVideo(v)?'✓':'＋'}</button></div>`;};
videoLink=function(v){return validVideoId(v.id)?`<button class="panel-link" data-video-detail="${v.id}">▶ Watch · analytics</button>`:'<span class="small-hint">Sample only</span>';};
const baselineCompetitors=competitors;
competitors=function(){
 // Keep watchlist editing and remove controls from the original competitor view.
 let view=baselineCompetitors();
 // Add public channel metrics and direct video explorer buttons per channel.
 for(const c of state.channels){
 const video=state.videos.find(v=>v.channel===c.name||v.channelHandle===c.handle);
 if(!video||!video.channelId||!/^UC[\w-]{22}$/.test(video.channelId))continue;
 const data=yt.channelStats[video.channelId],stats=data?.statistics,logo=data?.snippet?.thumbnails?.default?.url;
 const bit=`<div class="comp-footer" style="gap:8px;flex-wrap:wrap"><button class="btn btn-outline" data-channel-detail="${html(video.channelId)}">Channel analytics ↗</button><button class="btn btn-outline" data-video-detail="${html(video.id)}">▶ Top video</button></div>`;
 // Insert into one corresponding competitor-card by matching displayed name.
 const name=html(c.name),idx=view.indexOf(`<strong>${name}</strong>`);
 if(idx<0)continue;
 const end=view.indexOf('</div></div>',idx); // only append near matching card title, not inside unknown element
 if(end>=0){const at=view.indexOf('<div class="comp-kpis">',idx);if(at>=0){view=view.slice(0,at)+`${logo&&/^https:\/\/[^ ]+$/.test(logo)?`<img class="channel-thumb" src="${html(logo)}" loading="lazy" alt="${name} avatar">`:''}<p class="mini-analytics">${stats?'Subscribers: '+(stats.hiddenSubscriberCount?'Hidden':metric(stats.subscriberCount))+' · Channel views: '+metric(stats.viewCount):'Public metrics available after YouTube scan'}</p>${bit}`+view.slice(at);}} 
 }
 return view;
};
async function channelDetail(id){if(!/^UC[\w-]{22}$/.test(id))return;
 let info=yt.channelStats[id];
 if(!info&&canRead())try{const r=await ytRequest('/youtube/v3/channels',{part:'snippet,statistics',id});info=r.items?.[0];if(info)yt.channelStats[id]=info;}catch(e){toast(e.message)}
 const videos=state.videos.filter(x=>x.channelId===id);
 openModal(`<div class="video-detail"><button class="modal-x" type="button" data-cloud="close-modal" aria-label="Close">×</button><h2>${html(info?.snippet?.title||videos[0]?.channel||'Creator overview')}</h2>
 <p class="cloud-note">Public YouTube channel statistics · not private creator analytics</p><div class="metric-grid"><div><b>${info?.statistics?.hiddenSubscriberCount?'Hidden':metric(info?.statistics?.subscriberCount)}</b><small>Subscribers</small></div><div><b>${metric(info?.statistics?.viewCount)}</b><small>Channel views</small></div><div><b>${metric(info?.statistics?.videoCount)}</b><small>Total public videos</small></div></div>
 <h3>Videos in this scan</h3>${videos.slice(0,8).map(v=>`<div class="video-row"><button class="video-thumb-btn" data-video-detail="${html(v.id)}">${actualThumb(v)}</button><div><b>${html(v.title)}</b><p class="mini-analytics">${money(v.views)} views · ${money(v.pace)} lifetime average views/day</p></div></div>`).join('')||'<p>Run a scan to see recent videos.</p>'}
 <p class="detail-note">This is a snapshot from YouTube's public Data API, not YouTube Studio's private analytics.</p></div>`);
}
function showVideoDetail(id){if(!validVideoId(id)){toast('Select a real YouTube video after scanning.');return;}
 const v=state.videos.find(x=>x.id===id)||yt.ownVideos.map(x=>toRadarVideo(x,yt.channel?.title||'Your channel','')).find(x=>x.id===id);
 if(!v)return;
 const own=Boolean(yt.channel&&v.channelId===yt.channel.id);
 const ageDays=Math.max(1,v.age||videoAge(v));
 openModal(`<div class="video-detail"><button class="modal-x" type="button" data-cloud="close-modal" aria-label="Close">×</button>
 <h2>${html(v.title)}</h2><p>${html(v.channel)} · Published ${html((v.publishedAt||'').slice(0,10))}</p>
 <iframe class="video-player" title="YouTube video preview" loading="lazy" allow="encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" src="https://www.youtube-nocookie.com/embed/${v.id}?rel=0"></iframe>
 <div class="metric-grid"><div><b>${metric(v.views)}</b><small>Public views</small></div><div><b>${metric(v.likes)}</b><small>Public likes</small></div><div><b>${Math.round(Number(v.views||0)/ageDays).toLocaleString()}</b><small>Average views/day (lifetime)</small></div></div>
 <div class="video-actions"><button class="btn btn-outline" data-channel-detail="${html(v.channelId||'')}">View creator analytics</button><a class="btn" href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a>
 ${own?`<button class="btn btn-primary" data-my-video-analytics="${v.id}">Load my private analytics</button>`:''}</div>
 <div id="private-video-report" class="detail-note" style="margin-top:12px">${own?'Your own account: load 28-day private report with your authorized YouTube Analytics access.':'Competitor: only public views, likes and channel statistics are available. CTR, retention and rewatching data are private.'}</div></div>`);
}
async function fetchMyVideoAnalytics(id){if(!validVideoId(id)||!yt.ownVideos.some(v=>v.id===id)||!canRead())return toast('Connect the owning YouTube channel first.');
 const box=document.getElementById('private-video-report');if(!box)return;box.textContent='Loading last 28 days of private analytics…';
 const end=new Date(Date.now()-3*86400000),start=new Date(end.getTime()-27*86400000);const date=d=>d.toISOString().slice(0,10);
 try{
 const q={ids:'channel==MINE',startDate:date(start),endDate:date(end),metrics:'views,estimatedMinutesWatched,averageViewDuration',filters:'video=='+id};
 const [r,ret]=await Promise.allSettled([
  googleFetch('https://youtubeanalytics.googleapis.com/v2/reports?'+new URLSearchParams(q)),
  googleFetch('https://youtubeanalytics.googleapis.com/v2/reports?'+new URLSearchParams({ids:'channel==MINE',startDate:'2010-01-01',endDate:date(end),metrics:'audienceWatchRatio',dimensions:'elapsedVideoTimeRatio',filters:'video=='+id,sort:'elapsedVideoTimeRatio'}))]);
 if(r.status!=='fulfilled')throw r.reason;
 const row=r.value.rows?.[0]||[];const retention=ret.status==='fulfilled'?(ret.value.rows||[]):[];
 if(!document.getElementById('private-video-report'))return;
 box.innerHTML=`<b>Your private analytics · ${date(start)} to ${date(end)}</b><div class="metric-grid"><div><b>${row.length?metric(row[0]):'—'}</b><small>Views in period</small></div><div><b>${row.length?metric(Math.round(row[1])):'—'}</b><small>Minutes watched</small></div><div><b>${row.length?metric(Math.round(row[2]))+' sec':'—'}</b><small>Average view duration</small></div></div>
 ${retention.length>2?`<b>Audience retention (available percent-of-video points)</b><div style="display:flex;height:70px;align-items:end;gap:2px;padding-top:15px">${retention.slice(0,100).map(z=>`<span title="${html(String(Math.round(Number(z[0])*100)))}% of video: ${html(String(Math.round(Number(z[1])*100)))}% watch ratio" style="flex:1;height:${Math.max(2,Math.min(100,Math.round(Number(z[1])*100)))}%;background:#a58bff;border-radius:3px 3px 0 0"></span>`).join('')}</div>`:`<p>Retention chart unavailable for this video${ret.status==='rejected'?' or not supported by this report':''}.</p>`}
 <p class="cloud-note">These metrics only work for a channel you manage and explicitly authorize; data can be delayed.</p>`;
 }catch(e){box.textContent='Could not load private analytics: '+e.message;}
}
// Enhanced video list: thumbnail is the action. Tabs preserve the existing search and filters.
const baseRadar=radar;
radar=function(){const output=baseRadar();return output.replace('VIDEO</th>','VIDEO / THUMBNAIL</th>');};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.videoDetail){showVideoDetail(b.dataset.videoDetail);return;}
 if(b.dataset.channelDetail){channelDetail(b.dataset.channelDetail);return;}
 if(b.dataset.myVideoAnalytics){fetchMyVideoAnalytics(b.dataset.myVideoAnalytics);return;}
});

const originalRender=render;
render=function(){persist();const pages={overview,radar,competitors,topics,ideas,planner,settings,compilation:compStage,account:accountPage,youtube:youtubePage};const view=pages[state.page]||overview;document.getElementById('page-root').innerHTML=view();badge();};
setPage=function(page){const names={overview:'Overview',radar:'Video radar',competitors:'Competitors',topics:'Topic signals',ideas:'Idea vault',planner:'Content planner',settings:'Data & settings',compilation:'Compilation Studio',account:'My account',youtube:'YouTube connection'};
 if(!names[page])return;state.page=page;document.querySelectorAll('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.page===page));document.getElementById('page-crumb').textContent=names[page];render();window.scrollTo(0,0);};
setMode=function(mode){state.mode=mode;badge();};
scan=scanLive;
document.addEventListener('change',e=>{
 if(!e.target?.matches?.('[data-remember-device]'))return;
 changeRememberDevice(e.target.checked);
});
document.addEventListener('change',async e=>{if(e.target?.id!=='import-cloud-workspace')return;
 const file=e.target.files?.[0];if(!file)return;
 try{if(file.size>2*1024*1024)throw Error('Workspace backup must be smaller than 2 MB.');
 const data=JSON.parse(await file.text());
 if(!data||typeof data!=='object'||!Array.isArray(data.ideas)||!Array.isArray(data.channels))throw Error('Not a Trend Studio workspace export.');
 if(!confirm('Replace the current workspace with this backup? This changes the current cloud workspace if you are signed in.'))return;
 applyPayload(data);if(cloud.user)cloud.lastSaved='';render();toast('Workspace imported. It will sync to your account if you are signed in.');
 }catch(err){toast('Import failed: '+err.message)}
});
document.addEventListener('submit',e=>{if(e.target?.id==='cloud-auth-form'){e.preventDefault();const f=new FormData(e.target);if(cloud.authMode==='register'&&f.get('password')!==f.get('confirm'))return toast('Passwords do not match.');authSubmit(e.target);}if(e.target?.id==='mfa-verify-form'){e.preventDefault();verifyMFA(e.target);}if(e.target?.id==='cloud-recovery-form'){e.preventDefault();const pass=String(new FormData(e.target).get('password')||'');if(pass.length<12)return toast('Password must be at least 12 characters');cloud.sb.auth.updateUser({password:pass}).then(({error})=>{if(error)toast(error.message);else{cloud.recovery=false;cloud.syncInfo='Password updated. You can use it on other devices.';render();toast('Password updated');}});}},true);
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.cloud){if(b.dataset.cloud==='close-modal'){closeModal();return;}accountAction(b.dataset.cloud);return;}
 const type=b.dataset.youtube;if(!type)return;
 if(type==='connect')connectYouTube();
 if(type==='scan')scanLive();
 if(type==='disconnect'){const tok=yt.token;yt.token=null;yt.readExpires=0;yt.channel=null;yt.ownVideos=[];yt.channelStats={};state.videos=makeDemo();setMode('demo');yt.scanReport='Disconnected';render();if(tok&&window.google?.accounts?.oauth2?.revoke)google.accounts.oauth2.revoke(tok,()=>{});toast('YouTube disconnected; Google permission revocation requested.');}
 if(type==='retention'){const src=b.dataset.sourceId;const id=document.querySelector(`[data-yt-vid="${CSS.escape(src)}"]`)?.value;if(!id)return toast('Select a matching YouTube video first.');fetchRetention(src,id);}
});
const refresh=document.getElementById('refresh-btn');refresh.addEventListener('click',()=>{if(!yt.channel)setPage('youtube');},true);
initCloud();render();
})();
