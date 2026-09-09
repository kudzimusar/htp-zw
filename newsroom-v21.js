(() => {
  'use strict';

  const SESSION_KEY='htpNewsroomSession';
  const STORIES_KEY='htpNewsroomStories';
  const STORY_OVERRIDES_KEY='htpStoryOverrides';
  const ADS_KEY='htpAdCampaigns';
  const AD_METRICS_KEY='htpAdMetrics';
  const THEME_KEY='htpThemeV21';
  const HOSPAZ_CREATIVE='https://healthtimes.co.zw/wp-content/uploads/2025/11/HOSPAZ-hospice-and-palliative-care-assosciation-of-zimbabwe-annual-general-meeting-25-september-2026.jpeg';

  const roles={publisher:'Publisher / Owner',editor:'Editor-in-Chief',reporter:'Reporter / Journalist',audience:'Newsletter Editor',commercial:'Commercial Manager'};
  const titleToId={
    'Parliament Probes NatPharm Over Zimbabwe’s Medicine Supply Chain':'natpharm-supply-chain',
    'Harare STI Cases Fall Below 2,000 Per Quarter, NAC Says':'harare-sti-cases',
    'Healthathon 3.0: What Zimbabwe’s Health Innovation Challenge Is Telling Us':'healthathon-innovation',
    'Zimbabwe Creates New Medical Services Directorate to Strengthen Specialist and Emergency Care':'medical-services-directorate',
    'HIPH Graduates Challenged to Turn Qualifications Into Health Solutions':'hiph-graduates',
    'Ebola Cases Plateau in DRC, But Africa CDC Warns Outbreak Remains Far From Under Control':'ebola-drc',
    'The Avenues Clinic Invests US$500,000 to Modernise Critical Care Unit':'avenues-critical-care',
    'ZCLDN Challenges Lenacapavir Rollout Over Exclusion of People Who Inject Drugs':'lenacapavir-inclusion',
    'Zimbabwe Drops National Health Insurance Name, Unveils Tax-Funded Healthcare Provision Programme':'healthcare-provision-programme',
    'Zimbabwe Faces Funding Cliff as U.S. Ends Support for HIV, TB and Malaria Programmes':'funding-cliff'
  };

  const $=(s,r=document)=>r.querySelector(s);const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const read=(k,f)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch{return f}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function currentUsername(){return read(SESSION_KEY,null)?.username||'';}
  function currentRole(){return roles[currentUsername()]||'';}
  function canAds(){return ['Publisher / Owner','Editor-in-Chief','Commercial Manager'].includes(currentRole());}
  function canPremium(){return ['Publisher / Owner','Editor-in-Chief'].includes(currentRole());}
  function canMigration(){return ['Publisher / Owner','Editor-in-Chief'].includes(currentRole());}

  function themePreference(){return read(THEME_KEY,'system')||'system';}
  function resolvedTheme(pref=themePreference()){return pref==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):pref;}
  function applyTheme(){document.documentElement.dataset.theme=resolvedTheme();document.documentElement.dataset.themePreference=themePreference();}
  function cycleTheme(){const p=themePreference();write(THEME_KEY,p==='system'?'light':p==='light'?'dark':'system');applyTheme();}

  function defaultCampaigns(){return [{id:'hospaz-agm-2026',advertiser:'HOSPAZ',name:'HOSPAZ Annual General Meeting',creative:HOSPAZ_CREATIVE,mobileCreative:HOSPAZ_CREATIVE,destination:'https://healthtimes.co.zw/',placement:['masthead','home-infeed','article'],start:'2026-09-01',end:'2026-09-25',status:'Active',review:'Approved',label:'Advertisement'}];}
  function campaigns(){let c=read(ADS_KEY,null);if(!c){c=defaultCampaigns();write(ADS_KEY,c)}return c;}
  function metrics(){return read(AD_METRICS_KEY,{});}

  function injectThemeControl(){const actions=$('.newsroom-top-actions');if(!actions||$('[data-v21-newsroom-theme]',actions))return;actions.insertAdjacentHTML('afterbegin',`<button type="button" data-v21-newsroom-theme>Appearance · ${esc(themePreference())}</button>`);}

  function addCustomNav(){
    const nav=$('[data-newsroom-nav]');if(!nav)return;
    if(canAds()&&!$('[data-v21-module="ads"]',nav))nav.insertAdjacentHTML('beforeend',`<div class="nav-group-label" data-v21-commercial-label>Commercial</div><button type="button" data-v21-module="ads"><span>▣</span><span>Advertising</span></button>`);
    if(canMigration()&&!$('[data-v21-module="migration"]',nav))nav.insertAdjacentHTML('beforeend',`<button type="button" data-v21-module="migration"><span>↔</span><span>Migration Parity</span></button>`);
  }

  function syncPremiumOverrides(){
    const stories=read(STORIES_KEY,[]),overrides=read(STORY_OVERRIDES_KEY,{});
    stories.forEach(s=>{const id=titleToId[s.title];if(id)overrides[id]={...(overrides[id]||{}),premium:!!s.premium,updatedAt:new Date().toISOString(),source:'newsroom'};});
    write(STORY_OVERRIDES_KEY,overrides);
  }

  function renderAdsManager(){
    const mount=$('[data-workspace]');if(!mount)return;
    const list=campaigns(),m=metrics();
    mount.innerHTML=`<div class="workspace-heading"><div><span class="eyebrow">Commercial operations</span><h1>Advertising Manager</h1><p>Manage paid inventory without giving commercial staff control of editorial copy.</p></div><div class="workspace-actions"><button class="primary" type="button" data-v21-new-ad>＋ New campaign</button></div></div><div class="permission-note"><strong>${esc(currentRole())}</strong> access is active. Paid placements remain labelled and separate from editorial decisions.</div><div class="v21-ad-admin-grid"><section class="newsroom-panel"><div class="panel-head"><div><h2>Campaign inventory</h2><p>Masthead, in-feed, article and briefing placements.</p></div></div><div class="v21-ad-admin-list">${list.map(c=>campaignCard(c,m[c.id]||{})).join('')}</div></section><section class="newsroom-panel"><div class="panel-head"><div><h2>Placement map</h2><p>Desktop and mobile are managed separately.</p></div></div><div class="v21-placement-list"><div><strong>Desktop masthead</strong><span>Wide paid creative above the HealthTimes masthead</span></div><div><strong>Mobile campaign</strong><span>Compact banner that scrolls away before the native masthead</span></div><div><strong>Homepage in-feed</strong><span>Commercial inventory between editorial groups</span></div><div><strong>Article</strong><span>Sidebar/mid-story placement for free readers</span></div><div><strong>Premium</strong><span>Reduced advertising for members</span></div><div><strong>Briefings</strong><span>Optional newsletter/WhatsApp sponsorship</span></div></div></section></div>`;
    setBreadcrumb('Advertising');
  }
  function campaignCard(c,m){return `<article class="v21-ad-admin-card"><img src="${esc(c.creative)}" alt="${esc(c.name)}"><div><span class="eyebrow">${esc(c.advertiser)}</span><h3>${esc(c.name)}</h3><p>${esc(c.label||'Advertisement')} · ${esc(c.review||'Pending review')}</p><div class="v21-ad-admin-meta"><span>${esc(c.status)}</span><span>${esc((c.placement||[]).join(' · '))}</span><span>${Number(m.impressions||0)} local impressions</span><span>${Number(m.clicks||0)} local clicks</span></div><div class="table-actions"><button type="button" data-v21-ad-toggle="${esc(c.id)}">${c.status==='Active'?'Pause':'Activate'}</button><button type="button" data-v21-ad-edit="${esc(c.id)}">Edit</button></div></div></article>`;}

  function openAdEditor(id=''){
    let c=campaigns().find(x=>x.id===id)||{id:`campaign-${Date.now().toString(36)}`,advertiser:'',name:'',creative:'',mobileCreative:'',destination:'https://',placement:['masthead'],start:'2026-09-09',end:'2026-10-09',status:'Active',review:'Pending',label:'Advertisement'};
    if(!$('[data-v21-ad-modal]'))document.body.insertAdjacentHTML('beforeend','<section class="newsroom-modal" data-v21-ad-modal hidden aria-label="Advertising campaign"><div class="newsroom-modal-card"><div class="newsroom-modal-head"><div><span class="eyebrow">Advertising</span><h2>Campaign editor</h2></div><button type="button" data-v21-ad-close aria-label="Close">×</button></div><form data-v21-ad-form></form></div></section>');
    const modal=$('[data-v21-ad-modal]'),form=$('[data-v21-ad-form]');
    form.innerHTML=`<input type="hidden" name="id" value="${esc(c.id)}"><div class="newsroom-form-grid"><label>Advertiser<input name="advertiser" value="${esc(c.advertiser)}" required></label><label>Campaign name<input name="name" value="${esc(c.name)}" required></label><label class="wide">Desktop creative URL<input name="creative" value="${esc(c.creative)}" required></label><label class="wide">Mobile creative URL<input name="mobileCreative" value="${esc(c.mobileCreative||c.creative)}"></label><label class="wide">Click destination<input name="destination" type="url" value="${esc(c.destination)}" required></label><label>Placement<select name="placement"><option value="masthead">Masthead</option><option value="home-infeed">Homepage in-feed</option><option value="article">Article</option><option value="briefing">Briefing</option></select></label><label>Status<select name="status"><option ${c.status==='Active'?'selected':''}>Active</option><option ${c.status==='Paused'?'selected':''}>Paused</option><option ${c.status==='Scheduled'?'selected':''}>Scheduled</option></select></label><label>Review<select name="review"><option ${c.review==='Approved'?'selected':''}>Approved</option><option ${c.review==='Pending'?'selected':''}>Pending</option><option ${c.review==='Rejected'?'selected':''}>Rejected</option></select></label><label>Disclosure<input name="label" value="${esc(c.label||'Advertisement')}"></label><label>Start<input name="start" type="date" value="${esc(c.start||'')}"></label><label>End<input name="end" type="date" value="${esc(c.end||'')}"></label></div><div class="newsroom-modal-actions"><button class="button button-ghost" type="button" data-v21-ad-close>Cancel</button><button class="button button-primary" type="submit">Save campaign</button></div>`;
    modal.hidden=false;
  }

  function renderMigration(){const mount=$('[data-workspace]');if(!mount)return;mount.innerHTML=`<div class="workspace-heading"><div><span class="eyebrow">Migration readiness</span><h1>Source parity</h1><p>The original publication taxonomy and commercial products are tracked as migration requirements.</p></div><div class="workspace-actions"><a href="archive.html" target="_blank" rel="noopener">View public archive ↗</a></div></div><div class="metric-grid"><article class="metric-card"><span>Core source sections</span><strong>18+</strong><small>Navigation and specialist products retained</small></article><article class="metric-card"><span>Current stories</span><strong>20+</strong><small>Client-review source catalogue represented</small></article><article class="metric-card"><span>Advertising</span><strong>Mapped</strong><small>HOSPAZ masthead campaign restored</small></article><article class="metric-card"><span>Mobile + desktop</span><strong>2 UIs</strong><small>Shared content, separate presentation systems</small></article></div><section class="newsroom-panel"><div class="panel-head"><div><h2>Required source products</h2><p>Nothing should silently disappear during migration.</p></div></div><div class="v21-parity-tags">${['Breaking News','Feature','Epidemics','Abortion Compendium','Academic & Research','Global Health','Community Development','Communicable Diseases','Noncommunicable Diseases','HIV/AIDS','Policy','Public Health','Jobs','Opinion & Analysis','Fellowships & Grants','Research & Findings','BARAZA E-PAPER','HealthTimes Premium','Videos','About','Contact'].map(x=>`<span>${esc(x)}</span>`).join('')}</div><p style="margin-top:18px"><a class="text-link" href="docs/HEALTHTIMES_SOURCE_PARITY_REGISTER.md" target="_blank">Open migration parity register →</a></p></section>`;setBreadcrumb('Migration Parity');}

  function augmentPremium(){
    if(!canPremium())return;
    const mount=$('[data-workspace]');if(!mount||$('[data-v21-premium-admin]',mount))return;
    const stories=read(STORIES_KEY,[]).filter(s=>['Published','Ready','Review','Fact check','Draft','Scheduled'].includes(s.status));
    mount.insertAdjacentHTML('afterbegin',`<section class="newsroom-panel" data-v21-premium-admin><div class="panel-head"><div><h2>Premium publishing controls</h2><p>Marking a mapped public story Premium changes its reader access state in the shared browser data layer.</p></div></div><div class="v21-premium-admin-list">${stories.map(s=>`<div><span><strong>${esc(s.title)}</strong><small>${esc(s.section)} · ${esc(s.status)}</small></span><button type="button" class="${s.premium?'primary':''}" data-v21-premium-toggle="${esc(s.id)}">${s.premium?'Premium':'Public'}</button></div>`).join('')}</div></section>`);
  }

  function setBreadcrumb(label){const b=$('[data-breadcrumb]');if(b)b.textContent=label;}
  function togglePremium(storyId){if(!canPremium())return;const stories=read(STORIES_KEY,[]),s=stories.find(x=>x.id===storyId);if(!s)return;s.premium=!s.premium;s.updated=new Date().toISOString().slice(0,16).replace('T',' ');write(STORIES_KEY,stories);syncPremiumOverrides();augmentPremiumRefresh();}
  function augmentPremiumRefresh(){const panel=$('[data-v21-premium-admin]');panel?.remove();augmentPremium();}

  function saveAdForm(form){const d=new FormData(form),id=String(d.get('id')),list=campaigns(),existing=list.find(x=>x.id===id);const placement=String(d.get('placement')||'masthead');const obj={id,advertiser:String(d.get('advertiser')||''),name:String(d.get('name')||''),creative:String(d.get('creative')||''),mobileCreative:String(d.get('mobileCreative')||''),destination:String(d.get('destination')||''),placement:existing?.placement?.includes(placement)?existing.placement:[placement],status:String(d.get('status')||'Active'),review:String(d.get('review')||'Pending'),label:String(d.get('label')||'Advertisement'),start:String(d.get('start')||''),end:String(d.get('end')||'')};if(existing)Object.assign(existing,obj);else list.push(obj);write(ADS_KEY,list);$('[data-v21-ad-modal]').hidden=true;renderAdsManager();}

  function bind(){
    document.addEventListener('click',e=>{
      if(e.target.closest('[data-v21-newsroom-theme]')){e.preventDefault();cycleTheme();e.target.closest('[data-v21-newsroom-theme]').textContent=`Appearance · ${themePreference()}`;return;}
      const custom=e.target.closest('[data-v21-module]');if(custom){e.preventDefault();e.stopImmediatePropagation();const id=custom.dataset.v21Module;if(id==='ads'&&canAds())renderAdsManager();if(id==='migration'&&canMigration())renderMigration();return;}
      if(e.target.closest('[data-v21-new-ad]')){e.preventDefault();openAdEditor();return;}
      const edit=e.target.closest('[data-v21-ad-edit]');if(edit){e.preventDefault();openAdEditor(edit.dataset.v21AdEdit);return;}
      const toggle=e.target.closest('[data-v21-ad-toggle]');if(toggle){const list=campaigns(),c=list.find(x=>x.id===toggle.dataset.v21AdToggle);if(c)c.status=c.status==='Active'?'Paused':'Active';write(ADS_KEY,list);renderAdsManager();return;}
      if(e.target.closest('[data-v21-ad-close]')){$('[data-v21-ad-modal]').hidden=true;return;}
      const premium=e.target.closest('[data-v21-premium-toggle]');if(premium){e.preventDefault();togglePremium(premium.dataset.v21PremiumToggle);return;}
      const normalModule=e.target.closest('[data-module="premium"]');if(normalModule)setTimeout(()=>augmentPremium(),0);
    },true);
    document.addEventListener('submit',e=>{if(e.target.matches('[data-v21-ad-form]')){e.preventDefault();saveAdForm(e.target);return;}if(e.target.matches('[data-story-form]'))setTimeout(syncPremiumOverrides,30);},false);
  }

  function observeNav(){const nav=$('[data-newsroom-nav]');if(!nav)return;new MutationObserver(()=>addCustomNav()).observe(nav,{childList:true,subtree:false});addCustomNav();}

  function init(){applyTheme();bind();syncPremiumOverrides();const wait=()=>{if(!$('[data-newsroom-app]')||$('[data-newsroom-app]').hidden){setTimeout(wait,120);return;}injectThemeControl();observeNav();addCustomNav();};wait();}
  init();
})();
