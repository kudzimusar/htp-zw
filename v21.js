(() => {
  'use strict';

  const PREVIEW_MS = 30_000;
  const EARLY_NOTICE_MS = 8_000;
  const WARNING_MS = 20_000;
  const READER_ACCOUNTS_KEY = 'htpReaderAccountsV21';
  const ACTIVE_READER_KEY = 'htpActiveReaderV21';
  const GUEST_KEY = 'htpGuestIdV21';
  const THEME_KEY = 'htpThemeV21';
  const STORY_OVERRIDES_KEY = 'htpStoryOverrides';
  const ADS_KEY = 'htpAdCampaigns';
  const AD_METRICS_KEY = 'htpAdMetrics';
  const PENDING_ACTION_KEY = 'htpPendingReaderAction';
  const LEGACY_SUB_KEY = 'htpDemoSubscribed';
  const LEGACY_PREVIEW_KEY = 'htpPremiumPreviewStartedAt';
  const HOSPAZ_CREATIVE = 'https://healthtimes.co.zw/wp-content/uploads/2025/11/HOSPAZ-hospice-and-palliative-care-assosciation-of-zimbabwe-annual-general-meeting-25-september-2026.jpeg';

  const storyIndex = {
    'natpharm-supply-chain':'Parliament Probes NatPharm Over Zimbabwe’s Medicine Supply Chain',
    'harare-sti-cases':'Harare STI Cases Fall Below 2,000 Per Quarter, NAC Says',
    'healthathon-innovation':'Healthathon 3.0: What Zimbabwe’s Health Innovation Challenge Is Telling Us',
    'medical-services-directorate':'Zimbabwe Creates New Medical Services Directorate to Strengthen Specialist and Emergency Care',
    'hiph-graduates':'HIPH Graduates Challenged to Turn Qualifications Into Health Solutions',
    'ebola-drc':'Ebola Cases Plateau in DRC, But Africa CDC Warns Outbreak Remains Far From Under Control',
    'avenues-critical-care':'The Avenues Clinic Invests US$500,000 to Modernise Critical Care Unit',
    'lenacapavir-inclusion':'ZCLDN Challenges Lenacapavir Rollout Over Exclusion of People Who Inject Drugs',
    'healthcare-provision-programme':'Zimbabwe Drops National Health Insurance Name, Unveils Tax-Funded Healthcare Provision Programme',
    'funding-cliff':'Zimbabwe Faces Funding Cliff as U.S. Ends Support for HIV, TB and Malaria Programmes'
  };

  const SOURCE_SECTIONS = [
    'Breaking News','Feature','Epidemics','Abortion Compendium','Academic & Research','Global Health','Community Development','Communicable Diseases','Noncommunicable Diseases','HIV/AIDS','Policy','Public Health','Jobs','Opinion & Analysis','Fellowships & Grants','Research & Findings','BARAZA E-PAPER','HealthTimes Premium'
  ];

  const SOURCE_STORIES = [
    {title:'Vapes Double Smokers’ Chance Of Quitting, Major New Study Finds',date:'September 4, 2026',category:'Health News',image:'https://healthtimes.co.zw/wp-content/uploads/2026/09/Cover-Image-5-300x200.jpg',url:'https://healthtimes.co.zw/'},
    {title:'PHIZ Trains UZ Students to Bridge Research-Policy Gap',date:'September 3, 2026',category:'Health News',image:'https://healthtimes.co.zw/wp-content/uploads/2026/09/IMG-20260903-WA0021-300x200.jpg',url:'https://healthtimes.co.zw/'},
    {title:'New UK Visa Rules Allow Exploited Care Workers to Leave Abusive Employers Without Losing Status',date:'September 3, 2026',category:'Global Health',image:'https://healthtimes.co.zw/wp-content/uploads/2026/09/care-sector-article-image-1-300x204.jpg',url:'https://healthtimes.co.zw/'},
    {title:'HOSPAZ Sets September AGM to Shape Zimbabwe’s Next Chapter in Hospice and Palliative Care',date:'September 3, 2026',category:'Health News',image:'https://healthtimes.co.zw/wp-content/uploads/2026/09/ANNUAL-300x166.png',url:'https://healthtimes.co.zw/'},
    {title:'Health Minister Warns of Cartels, Corruption in Health Sector',date:'September 2, 2026',category:'Health News',image:'https://healthtimes.co.zw/wp-content/uploads/2026/04/Mombeshora-nurses-strike-presser-300x201.jpg',url:'https://healthtimes.co.zw/'},
    {title:'Drug Harm Reduction Expert Raises Red Flag Over Zimbabwe’s Militarised Rehabilitation Centres',date:'September 2, 2026',category:'Mental Health',image:'https://healthtimes.co.zw/wp-content/uploads/2026/09/MATRIX-zimbabwe-drug-rehabilitation-harm-reduction.jpg-300x166.jpg',url:'https://healthtimes.co.zw/'},
    {title:'Journalists Urged to Verify Disaster Information Before Publication',date:'September 1, 2026',category:'Health News',image:'https://healthtimes.co.zw/wp-content/uploads/2026/09/hokonya--300x200.jpg',url:'https://healthtimes.co.zw/'},
    {title:'“It Can Only Be God,” Says CUT Graduate As SilicaGuard Wins Cimas Healthathon',date:'August 31, 2026',category:'Health News',image:'https://healthtimes.co.zw/wp-content/uploads/2026/08/silicaguard-cut-graduates-cimas-healthathon-winners-300x200.jpeg',url:'https://healthtimes.co.zw/'},
    {title:'HIPH Upgrades Computer Lab to Drive AI-Based Learning',date:'August 28, 2026',category:'Health News',image:'https://healthtimes.co.zw/wp-content/uploads/2026/08/IMG-20260828-WA0008-1-300x200.jpg',url:'https://healthtimes.co.zw/'},
    {title:'Pregnancy After Rape in Zimbabwe: What We Get Wrong About the Law and Survivors',date:'August 28, 2026',category:'Opinion & Analysis',image:'https://healthtimes.co.zw/wp-content/uploads/2026/08/pregnancy-after-rape-zimbabwe-myths-law-300x169.png',url:'https://healthtimes.co.zw/'},
    {title:'Africa CDC Assures Delegates Ahead of CPHIA as DRC Ebola Outbreak Surges',date:'August 27, 2026',category:'Africa',image:'https://healthtimes.co.zw/wp-content/uploads/2026/08/Website-Banner-1024x576-1-300x169.jpg',url:'https://healthtimes.co.zw/'},
    {title:'Battle Lines Drawn as 10 Teams Vie for Cimas Healthathon 3.0 Crown in Next 24 Hours',date:'August 27, 2026',category:'Science & Innovation',image:'https://healthtimes.co.zw/wp-content/uploads/2026/08/Cimas-Health-Group-Chief-Information-Officer-Mr-Foster-Akaketwa.jpg-300x244.jpeg',url:'https://healthtimes.co.zw/'},
    {title:'Zimbabwe Commissions Japan-Funded Incinerator at Parirenyatwa Hospital',date:'August 26, 2026',category:'Health News',image:'https://healthtimes.co.zw/wp-content/uploads/2026/08/Kwidini-and-Japanese-Ambassador-300x200.jpeg',url:'https://healthtimes.co.zw/'},
    {title:'FDA Approves Drug to Treat HIV Infection in Newborns',date:'August 26, 2026',category:'HIV/AIDS',image:'https://healthtimes.co.zw/wp-content/uploads/2026/08/dolutegravir-hiv-treatment-pill.jpg-300x203.png',url:'https://healthtimes.co.zw/'},
    {title:'For Some Zimbabwean Children, a School Meal Can Mean More Than Food',date:'August 26, 2026',category:'Features',image:'https://healthtimes.co.zw/wp-content/uploads/2026/08/tadiwanashe-mashonganyika-zimbabwe-school-feeding-dialogue-300x168.jpg',url:'https://healthtimes.co.zw/'}
  ];

  const $ = (s,r=document) => r.querySelector(s);
  const $$ = (s,r=document) => [...r.querySelectorAll(s)];
  const read = (key,fallback) => { try { const raw=localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } };
  const write = (key,value) => { try { localStorage.setItem(key,JSON.stringify(value)); } catch {} };
  const text = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function icon(name){
    const common='class="v21-icon" viewBox="0 0 24 24" aria-hidden="true"';
    const map={
      user:`<svg ${common} fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4.8 21a7.2 7.2 0 0 1 14.4 0"/></svg>`,
      sun:`<svg ${common} fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
      search:`<svg ${common} fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>`,
      whatsapp:`<svg ${common} viewBox="0 0 32 32"><path fill="currentColor" d="M16 3a12.7 12.7 0 0 0-10.9 19.2L3.4 28.5l6.5-1.7A12.8 12.8 0 1 0 16 3Zm0 23.2a10.5 10.5 0 0 1-5.4-1.5l-.4-.2-3.8 1 1-3.7-.2-.4A10.6 10.6 0 1 1 16 26.2Zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.6 8.6 0 0 1-2.6-1.6 9.8 9.8 0 0 1-1.8-2.3c-.2-.3 0-.5.1-.7l.5-.6.3-.6c.1-.2 0-.5 0-.6l-1-2.4c-.3-.6-.6-.5-.8-.5h-.7c-.2 0-.6.1-.9.4s-1.2 1.2-1.2 2.9 1.2 3.3 1.4 3.5c.2.2 2.4 3.7 5.9 5.2 2.2.9 3.1 1 4.2.8.7-.1 1.9-.8 2.2-1.5.3-.7.3-1.3.2-1.5-.1-.2-.4-.3-.7-.4Z"/></svg>`,
      facebook:`<svg ${common} viewBox="0 0 24 24"><path fill="currentColor" d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V4a23 23 0 0 0-2.5-.1c-2.4 0-4.1 1.5-4.1 4.2V10H7.5v3h2.7v8h3.3Z"/></svg>`,
      x:`<svg ${common} viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h4.3l4.5 6.1L18.1 4H20l-6.3 7.4L20.5 20h-4.3l-4.9-6.6L5.7 20H3.8l6.6-7.9L4 4Zm3.4 1.5 9.6 13h1.9l-9.6-13H7.4Z"/></svg>`,
      linkedin:`<svg ${common} viewBox="0 0 24 24"><path fill="currentColor" d="M5.3 8.4H2.1V21h3.2V8.4ZM3.7 3A1.9 1.9 0 1 0 3.7 6.8 1.9 1.9 0 0 0 3.7 3ZM21.9 13.8c0-3.8-2-5.6-4.7-5.6-2.2 0-3.1 1.2-3.7 2v-1.8h-3.2V21h3.2v-6.2c0-1.6.3-3.2 2.4-3.2 2.1 0 2.1 2 2.1 3.3V21h3.2l.7-7.2Z"/></svg>`,
      instagram:`<svg ${common} fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>`,
      youtube:`<svg ${common} viewBox="0 0 24 24"><path fill="currentColor" d="M22 12s0-3.2-.4-4.7a2.8 2.8 0 0 0-2-2C18 5 12 5 12 5s-6 0-7.6.4a2.8 2.8 0 0 0-2 2C2 8.8 2 12 2 12s0 3.2.4 4.7a2.8 2.8 0 0 0 2 2C6 19 12 19 12 19s6 0 7.6-.4a2.8 2.8 0 0 0 2-2C22 15.2 22 12 22 12Zm-12 4V8l6 4-6 4Z"/></svg>`,
      mail:`<svg ${common} fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>`,
      bookmark:`<svg ${common} fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 4h12v17l-6-4-6 4Z"/></svg>`,
      share:`<svg ${common} fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/></svg>`
    };
    return map[name] || '';
  }

  function seedReaders(){
    const accounts=read(READER_ACCOUNTS_KEY,null);
    if(accounts) return;
    write(READER_ACCOUNTS_KEY,[{id:'reader-001',name:'HealthTimes Reader',email:'reader@healthtimes.co.zw',password:'HealthTimes#Reader26',premium:true,createdAt:new Date().toISOString()}]);
  }
  function currentReader(){
    const id=read(ACTIVE_READER_KEY,null);if(!id)return null;
    return read(READER_ACCOUNTS_KEY,[]).find(a=>a.id===id)||null;
  }
  function setCurrentReader(id){write(ACTIVE_READER_KEY,id);syncLegacySubscription();renderReaderControls();}
  function guestId(){let id=read(GUEST_KEY,null);if(!id){id=`guest-${Math.random().toString(36).slice(2,10)}`;write(GUEST_KEY,id)}return id;}
  function readerIdentity(){return currentReader()?.id||guestId();}
  function isPremiumReader(){return !!currentReader()?.premium;}
  function syncLegacySubscription(){try{if(isPremiumReader())localStorage.setItem(LEGACY_SUB_KEY,'true');else localStorage.removeItem(LEGACY_SUB_KEY)}catch{}}
  function signOutReader(){write(ACTIVE_READER_KEY,null);syncLegacySubscription();location.reload();}

  function themePreference(){return read(THEME_KEY,'system')||'system';}
  function resolvedTheme(pref=themePreference()){return pref==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):pref;}
  function applyTheme(){document.documentElement.dataset.theme=resolvedTheme();document.documentElement.dataset.themePreference=themePreference();$$('[data-v21-theme-option]').forEach(b=>b.classList.toggle('active',b.dataset.v21ThemeOption===themePreference()));}
  function setTheme(pref){write(THEME_KEY,pref);applyTheme();}
  function cycleTheme(){const p=themePreference();setTheme(p==='system'?'light':p==='light'?'dark':'system');showV21Toast(`Theme: ${themePreference()}`);}

  let activeSheet=null;
  let sheetTimer=null;
  function backdrop(){return $('[data-sheet-backdrop]');}
  function closeSheet(immediate=false){
    clearTimeout(sheetTimer);const current=activeSheet;if(!current)return;
    current.classList.remove('open');backdrop()?.classList.remove('visible');document.body.classList.remove('sheet-open');
    const finish=()=>{if(current!==activeSheet)return;current.hidden=true;if(backdrop())backdrop().hidden=true;activeSheet=null;};
    if(immediate)finish();else sheetTimer=setTimeout(finish,180);
  }
  function openSheet(name){
    clearTimeout(sheetTimer);
    if(activeSheet){activeSheet.classList.remove('open');activeSheet.hidden=true;}
    const target=$(`[data-sheet="${CSS.escape(name)}"]`),bg=backdrop();if(!target||!bg)return;
    activeSheet=target;target.hidden=false;bg.hidden=false;document.body.classList.add('sheet-open');
    if(name==='saved')renderSavedV21();
    if(name==='account')renderAccountSheet();
    requestAnimationFrame(()=>{target.classList.add('open');bg.classList.add('visible')});
    if(name==='search')setTimeout(()=>$('[data-search-input]')?.focus(),100);
  }

  function showV21Toast(message){const t=$('[data-toast]');if(!t)return;t.textContent=message;t.classList.add('show');clearTimeout(showV21Toast.timer);showV21Toast.timer=setTimeout(()=>t.classList.remove('show'),2400);}

  function ensureAccountSheet(){
    if($('[data-sheet="account"]'))return;
    const bg=backdrop();if(!bg)return;
    bg.insertAdjacentHTML('afterend',`<section class="sheet sheet-bottom" data-sheet="account" hidden aria-label="Reader account"><div class="sheet-head"><h2>My HealthTimes</h2><button class="sheet-close" type="button" data-sheet-close aria-label="Close">×</button></div><div class="sheet-body" data-v21-account-body></div></section>`);
  }
  function renderAccountSheet(mode=''){const mount=$('[data-v21-account-body]');if(!mount)return;const reader=currentReader();if(reader){mount.innerHTML=profileHtml(reader);applyTheme();return;}const selected=mode||mount.dataset.mode||'signin';mount.dataset.mode=selected;mount.innerHTML=`<div class="v21-auth-tabs"><button type="button" data-v21-auth-tab="signin" class="${selected==='signin'?'active':''}">Sign in</button><button type="button" data-v21-auth-tab="signup" class="${selected==='signup'?'active':''}">Create account</button></div>${selected==='signin'?signinHtml():signupHtml()}<div class="v21-auth-note">Your reader account keeps Premium access, saved stories, topic preferences, reading history and theme choice together.</div>`;}
  function signinHtml(){return `<form class="v21-auth-form" data-v21-signin><label>Email<input type="email" name="email" required autocomplete="email" /></label><label>Password<input type="password" name="password" required autocomplete="current-password" /></label><button class="button button-primary" type="submit">Sign in</button><div data-v21-auth-message></div></form>`;}
  function signupHtml(){return `<form class="v21-auth-form" data-v21-signup><label>Name<input name="name" required autocomplete="name" /></label><label>Email<input type="email" name="email" required autocomplete="email" /></label><label>Password<input type="password" name="password" minlength="8" required autocomplete="new-password" /></label><button class="button button-primary" type="submit">Create account</button><div data-v21-auth-message></div></form>`;}
  function profileHtml(r){const saved=read('htpSavedArticles',[]).length,history=read('htpReadingHistory',[]).length;return `<div class="v21-profile-card"><div class="v21-profile-identity"><div class="v21-avatar">${text(r.name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase())}</div><div class="v21-profile-meta"><strong>${text(r.name)}</strong><span>${text(r.email)}</span></div></div><div class="v21-profile-grid"><div class="v21-profile-stat"><span>Membership</span><strong>${r.premium?'HealthTimes Premium':'Free reader'}</strong></div><div class="v21-profile-stat"><span>Saved stories</span><strong>${saved}</strong></div><div class="v21-profile-stat"><span>Reading history</span><strong>${history}</strong></div><div class="v21-profile-stat"><span>Briefings</span><strong><a href="preferences.html">Preferences</a></strong></div></div><div><strong style="display:block;margin-bottom:8px">Appearance</strong><div class="v21-theme-choice"><button type="button" data-v21-theme-option="system">System</button><button type="button" data-v21-theme-option="light">Light</button><button type="button" data-v21-theme-option="dark">Dark</button></div></div>${!r.premium?'<button class="button button-primary" type="button" data-v21-subscribe>Upgrade to Premium · US$5/month</button>':''}<button class="button button-ghost" type="button" data-v21-signout>Sign out</button></div>`;}

  function renderReaderControls(){
    const reader=currentReader();
    const actions=$('.header-actions');
    if(actions&&!$('[data-v21-account]',actions)){
      actions.insertAdjacentHTML('beforeend',`<button class="v21-theme-button" type="button" data-v21-theme-cycle aria-label="Change theme">${icon('sun')}<span>Theme</span></button><button class="v21-account-button" type="button" data-v21-account>${icon('user')}<span>${reader?text(reader.name.split(' ')[0]):'Sign in'}</span></button>`);
    } else if(actions){const span=$('[data-v21-account] span',actions);if(span)span.textContent=reader?reader.name.split(' ')[0]:'Sign in';}
    const mobile=$('.mobile-topbar');
    if(mobile&&!$('.v21-mobile-actions',mobile)){
      const existing=mobile.querySelector(':scope > button:last-child');
      const wrap=document.createElement('div');wrap.className='v21-mobile-actions';wrap.innerHTML=`<button type="button" data-sheet-open="search" aria-label="Search">${icon('search')}</button><button type="button" data-v21-account aria-label="${reader?'Profile':'Sign in'}">${icon('user')}</button>`;
      existing?.replaceWith(wrap);
    }
    const more=$('[data-sheet="more"] .menu-links');
    if(more&&!$('[data-v21-account-link]',more))more.insertAdjacentHTML('afterbegin',`<button type="button" data-v21-account-link>${reader?'My profile':'Sign in / Create account'}</button><button type="button" data-v21-theme-cycle>Appearance · ${text(themePreference())}</button><a href="archive.html">All sections & archive</a>`);
  }

  function renderSavedV21(){const mount=$('[data-saved-list]');if(!mount)return;const ids=read('htpSavedArticles',[]);mount.innerHTML=ids.length?ids.map(id=>`<article class="saved-item"><span class="eyebrow">Saved</span><h3><a href="article.html?id=${encodeURIComponent(id)}">${text(storyIndex[id]||id.replace(/-/g,' '))}</a></h3><button class="text-link" type="button" data-save="${text(id)}">Remove</button></article>`).join(''):'<p>You have no saved stories yet. Save any article to build your reading list.</p>';}

  function storyOverrides(){return read(STORY_OVERRIDES_KEY,{});}
  function articleId(){return new URLSearchParams(location.search).get('id')||'';}
  function baseArticlePremium(){return !!$('#article-mount .article-head .premium-pill')||!!$('[data-premium-preview]');}
  function effectivePremium(id=articleId()){const o=storyOverrides()[id];return typeof o?.premium==='boolean'?o.premium:baseArticlePremium();}
  function previewKey(id){return `htpPremiumPreviewV21:${readerIdentity()}:${id}`;}
  function previewStart(id){let start=Number(read(previewKey(id),0));if(!start){start=Date.now();write(previewKey(id),start)}return start;}
  function clearLegacyPreview(){try{localStorage.setItem(LEGACY_PREVIEW_KEY,String(Date.now()))}catch{}}

  let premiumTimer=null;
  let premiumPrompted=false;
  function setupPremiumArticle(){
    if(document.body.dataset.page!=='article')return;
    const id=articleId();if(!id||!effectivePremium(id))return;
    clearLegacyPreview();
    const body=$('.article-body');if(!body)return;
    $('#article-mount .article-head')?.insertAdjacentHTML('afterbegin','<span class="v21-premium-chip">Premium research</span>');
    const oldBanner=$('[data-premium-preview]');if(oldBanner)oldBanner.hidden=true;
    const oldLock=$('.premium-lock-inline');if(oldLock)oldLock.hidden=true;
    let status=$('.v21-premium-status');if(!status){const layout=$('.article-layout');layout?.insertAdjacentHTML('beforebegin','<div class="v21-premium-status" hidden data-v21-premium-status><span data-v21-premium-copy>Premium research</span><strong data-v21-premium-countdown>00:30</strong></div>');status=$('.v21-premium-status');}
    if(!$('.v21-citation-tools',body))body.insertAdjacentHTML('beforeend',`<div class="v21-citation-tools"><strong>Research tools</strong><button type="button" data-v21-cite>Cite this research</button><button type="button" data-open-ai data-ai-context="${text(id)}" data-ai-prompt="Summarise this research">Ask HealthTimes</button></div>`);
    if(!$('.gated-blur',body)){
      const paras=$$(':scope > p',body);paras.slice(2).forEach(p=>p.classList.add('v21-gated-paragraph'));
    }
    if(!$('.v21-premium-paywall',body))body.insertAdjacentHTML('beforeend','<div class="v21-premium-paywall" data-v21-paywall hidden><span class="v21-premium-chip">Premium</span><h3>Continue with HealthTimes Premium</h3><p>This research is available to members for US$5/month, including citation tools, briefings and deeper HealthTimes Intelligence.</p><button class="button button-primary" type="button" data-sheet-open="subscribe">Subscribe for US$5/month</button></div>');
    applyPremiumAccess(id);
  }
  function applyPremiumAccess(id=articleId()){
    clearInterval(premiumTimer);const body=$('.article-body'),status=$('[data-v21-premium-status]'),paywall=$('[data-v21-paywall]');if(!body)return;
    if(isPremiumReader()){
      body.classList.remove('v21-premium-locked');if(status)status.hidden=true;if(paywall)paywall.hidden=true;$('.gated-blur')?.classList.remove('is-locked');return;
    }
    const start=previewStart(id);
    const tick=()=>{
      const elapsed=Date.now()-start,remaining=Math.max(0,PREVIEW_MS-elapsed),seconds=Math.ceil(remaining/1000);
      if(status){status.hidden=elapsed<EARLY_NOTICE_MS;const count=$('[data-v21-premium-countdown]',status),copy=$('[data-v21-premium-copy]',status);if(count)count.textContent=`00:${String(seconds).padStart(2,'0')}`;if(copy)copy.textContent=elapsed>=WARNING_MS?'Premium preview ending soon · Subscribe to keep reading':'You’re reading HealthTimes Premium research';status.classList.toggle('is-warning',elapsed>=WARNING_MS);}
      if(remaining<=0){clearInterval(premiumTimer);lockPremium(id);}
    };
    tick();premiumTimer=setInterval(tick,250);
  }
  function lockPremium(id){const body=$('.article-body'),status=$('[data-v21-premium-status]'),paywall=$('[data-v21-paywall]');if(!body)return;body.classList.add('v21-premium-locked');$('.gated-blur')?.classList.add('is-locked');if(status){status.hidden=false;$('[data-v21-premium-copy]',status).textContent='Premium preview complete';$('[data-v21-premium-countdown]',status).textContent='00:00';status.classList.add('is-warning')}if(paywall)paywall.hidden=false;if(!premiumPrompted){premiumPrompted=true;setTimeout(()=>openSheet('subscribe'),120)}}

  function citationText(){const h=$('.article-head h1')?.textContent.trim()||document.title;const author=$('.byline-person strong')?.textContent.replace(/^By\s+/,'').trim()||'HealthTimes';const date=$('.story-meta span:nth-child(2)')?.textContent.trim()||'2026';return `${author} (${date}). “${h}.” HealthTimes Zimbabwe. ${location.href}`;}
  async function copyCitation(){if(!isPremiumReader()){write(PENDING_ACTION_KEY,'subscribe');openSheet('subscribe');showV21Toast('Premium membership is required for citation tools.');return;}try{await navigator.clipboard.writeText(citationText());showV21Toast('Citation copied.')}catch{prompt('Copy citation',citationText());}}

  function defaultCampaigns(){return [{id:'hospaz-agm-2026',advertiser:'HOSPAZ',name:'HOSPAZ Annual General Meeting',creative:HOSPAZ_CREATIVE,mobileCreative:HOSPAZ_CREATIVE,destination:'https://healthtimes.co.zw/',placement:['masthead','home-infeed','article'],start:'2026-09-01',end:'2026-09-25',status:'Active',review:'Approved',label:'Advertisement'}];}
  function campaigns(){let list=read(ADS_KEY,null);if(!list){list=defaultCampaigns();write(ADS_KEY,list)}return list;}
  function activeCampaign(placement){const today='2026-09-09';return campaigns().find(c=>c.status==='Active'&&c.placement?.includes(placement)&&(!c.start||c.start<=today)&&(!c.end||c.end>=today));}
  function adHtml(c,compact=false){if(!c)return'';return `<div class="v21-ad-label">${text(c.label||'Advertisement')} · ${text(c.advertiser)}</div><a class="v21-ad-frame" href="${text(c.destination)}" target="_blank" rel="sponsored noopener" data-v21-ad-click="${text(c.id)}"><img src="${text(compact?(c.mobileCreative||c.creative):c.creative)}" alt="${text(c.name)}" /></a><div class="v21-ad-sponsored">Paid placement · Advertising does not influence HealthTimes editorial coverage.</div>`;}
  function incrementAd(id,type){const metrics=read(AD_METRICS_KEY,{});const m=metrics[id]||{impressions:0,clicks:0};m[type]=(m[type]||0)+1;metrics[id]=m;write(AD_METRICS_KEY,metrics);}
  function renderAds(){
    if(['newsroom','manual'].includes(document.body.dataset.page))return;
    const mast=activeCampaign('masthead');
    if(mast&&!$('.v21-ad-masthead')){const header=$('#app-header');header?.insertAdjacentHTML('beforebegin',`<aside class="v21-ad-slot v21-ad-masthead">${adHtml(mast)}</aside><aside class="v21-ad-slot v21-ad-compact">${adHtml(mast,true)}</aside>`);incrementAd(mast.id,'impressions');}
    if(document.body.dataset.page==='home'){const c=activeCampaign('home-infeed');if(c&&!$('.v21-home-ad')){$('#latest')?.insertAdjacentHTML('afterend',`<aside class="v21-ad-slot v21-home-ad">${adHtml(c)}</aside>`);incrementAd(c.id,'impressions');}}
    if(document.body.dataset.page==='article'&&!isPremiumReader()){const c=activeCampaign('article');if(c&&!$('.v21-article-ad')){const p=$$('.article-body > p')[1];p?.insertAdjacentHTML('afterend',`<aside class="v21-article-ad">${adHtml(c,true)}</aside>`);incrementAd(c.id,'impressions');}}
  }

  function buildMobileHome(){
    if(document.body.dataset.page!=='home'||$('.v21-mobile-home'))return;
    const main=$('main');const lead=$('.hero-lead');if(!main||!lead)return;
    const leadLink=$('h1 a',lead),leadImg=$('.hero-media img',lead),leadCat=$('.eyebrow,.premium-pill',lead),leadP=$('p',lead),leadMeta=$('.story-meta',lead);
    const cards=$$('.story-card').slice(0,8);
    const sourceExtras=SOURCE_STORIES.slice(0,5);
    const html=`<section class="v21-mobile-home"><div class="v21-mobile-lead"><a class="v21-mobile-lead-media" href="${text(leadLink?.getAttribute('href')||'index.html')}">${leadImg?`<img src="${text(leadImg.src)}" alt="" />`:''}</a>${leadCat?.outerHTML||''}<h1><a href="${text(leadLink?.getAttribute('href')||'#')}">${text(leadLink?.textContent||'HealthTimes')}</a></h1>${leadP?`<p>${text(leadP.textContent)}</p>`:''}${leadMeta?.outerHTML||''}</div><div class="v21-mobile-topics">${SOURCE_SECTIONS.map(s=>`<a href="archive.html?section=${encodeURIComponent(s)}">${text(s)}</a>`).join('')}</div><div class="v21-mobile-section-title"><h2>Latest</h2><a href="archive.html">All stories</a></div><div class="v21-mobile-feed">${cards.map(card=>mobileCardFromDom(card)).join('')}</div><div class="v21-mobile-premium"><span class="v21-premium-chip">HealthTimes Premium</span><h2>Research worth returning to.</h2><p>Deep health policy, financing and evidence reporting with member citation tools and HealthTimes Intelligence.</p><a class="button button-light" href="premium.html">Explore Premium · US$5/month</a></div><div class="v21-mobile-section-title"><h2>More from HealthTimes</h2><a href="archive.html">Archive</a></div><div class="v21-mobile-feed">${sourceExtras.map(s=>`<article class="v21-mobile-story"><div><span class="eyebrow">${text(s.category)}</span><h3><a href="${text(s.url)}" target="_blank" rel="noopener">${text(s.title)}</a></h3><div class="story-meta"><span>${text(s.date)}</span></div></div><a href="${text(s.url)}" target="_blank" rel="noopener"><img src="${text(s.image)}" alt="" loading="lazy" /></a></article>`).join('')}</div><div class="v21-mobile-brief"><h2>Your health briefing</h2><p>Follow topics and choose email, WhatsApp or browser alerts.</p><a href="preferences.html">Set My HealthTimes preferences →</a></div></section>`;
    main.insertAdjacentHTML('afterbegin',html);
  }
  function mobileCardFromDom(card){const a=$('h3 a',card),img=$('.story-card-media img',card),cat=$('.eyebrow,.premium-pill',card),meta=$('.story-meta',card);return `<article class="v21-mobile-story"><div>${cat?.outerHTML||''}<h3><a href="${text(a?.getAttribute('href')||'#')}">${text(a?.textContent||'Story')}</a></h3>${meta?.outerHTML||''}</div><a href="${text(a?.getAttribute('href')||'#')}">${img?`<img src="${text(img.src)}" alt="" loading="lazy" />`:'<div class="story-placeholder" style="height:84px;border-radius:9px"><span>HealthTimes</span></div>'}</a></article>`;}

  function replaceWhatsAppRail(){const b=$('.rail-action[title="Discuss on WhatsApp"]');if(b){b.innerHTML=icon('whatsapp');b.setAttribute('aria-label','Discuss on WhatsApp');}const share=$('.rail-action[title="Share"]');if(share)share.innerHTML=icon('share');const save=$('.rail-action[title="Save"]');if(save)save.innerHTML=icon('bookmark');}
  function addArticleSocialIcons(){const body=$('.article-body');if(!body||$('.v21-social-icons',body))return;const id=articleId();body.insertAdjacentHTML('beforeend',`<div class="v21-social-icons" aria-label="Share this story"><button type="button" data-social="whatsapp" data-article-id="${text(id)}" aria-label="Share on WhatsApp">${icon('whatsapp')}</button><button type="button" data-social="facebook" data-article-id="${text(id)}" aria-label="Share on Facebook">${icon('facebook')}</button><button type="button" data-social="x" data-article-id="${text(id)}" aria-label="Share on X">${icon('x')}</button><button type="button" data-social="linkedin" data-article-id="${text(id)}" aria-label="Share on LinkedIn">${icon('linkedin')}</button></div>`);}

  function activateReaderPremium(){const reader=currentReader();if(!reader){write(PENDING_ACTION_KEY,'subscribe');ensureAccountSheet();renderAccountSheet('signup');openSheet('account');return;}const accounts=read(READER_ACCOUNTS_KEY,[]);const target=accounts.find(a=>a.id===reader.id);if(target)target.premium=true;write(READER_ACCOUNTS_KEY,accounts);write(PENDING_ACTION_KEY,null);syncLegacySubscription();closeSheet(true);showV21Toast('HealthTimes Premium is active.');applyPremiumAccess();renderReaderControls();}

  function bindV21(){
    document.addEventListener('click',e=>{
      const open=e.target.closest('[data-sheet-open]');if(open){e.preventDefault();e.stopImmediatePropagation();openSheet(open.dataset.sheetOpen);return;}
      if(e.target.closest('[data-sheet-close]')||e.target.matches('[data-sheet-backdrop]')){e.preventDefault();e.stopImmediatePropagation();closeSheet();return;}
      if(e.target.closest('[data-v21-account], [data-v21-account-link]')){e.preventDefault();e.stopImmediatePropagation();ensureAccountSheet();renderAccountSheet();openSheet('account');return;}
      const tab=e.target.closest('[data-v21-auth-tab]');if(tab){e.preventDefault();renderAccountSheet(tab.dataset.v21AuthTab);return;}
      const theme=e.target.closest('[data-v21-theme-option]');if(theme){e.preventDefault();setTheme(theme.dataset.v21ThemeOption);return;}
      if(e.target.closest('[data-v21-theme-cycle]')){e.preventDefault();cycleTheme();return;}
      if(e.target.closest('[data-v21-signout]')){e.preventDefault();signOutReader();return;}
      if(e.target.closest('[data-v21-subscribe]')){e.preventDefault();activateReaderPremium();return;}
      if(e.target.closest('[data-subscribe-activate]')){e.preventDefault();e.stopImmediatePropagation();activateReaderPremium();return;}
      if(e.target.closest('[data-v21-cite]')){e.preventDefault();copyCitation();return;}
      const ad=e.target.closest('[data-v21-ad-click]');if(ad)incrementAd(ad.dataset.v21AdClick,'clicks');
    },true);
    document.addEventListener('submit',e=>{
      const signIn=e.target.closest('[data-v21-signin]');if(signIn){e.preventDefault();const data=new FormData(signIn),email=String(data.get('email')||'').trim().toLowerCase(),password=String(data.get('password')||'');const account=read(READER_ACCOUNTS_KEY,[]).find(a=>a.email.toLowerCase()===email&&a.password===password);const msg=$('[data-v21-auth-message]',signIn);if(!account){if(msg)msg.textContent='Email or password is incorrect.';return;}setCurrentReader(account.id);if(read(PENDING_ACTION_KEY,null)==='subscribe'&&!account.premium){activateReaderPremium();return;}closeSheet(true);location.reload();return;}
      const signUp=e.target.closest('[data-v21-signup]');if(signUp){e.preventDefault();const data=new FormData(signUp),name=String(data.get('name')||'').trim(),email=String(data.get('email')||'').trim().toLowerCase(),password=String(data.get('password')||'');const accounts=read(READER_ACCOUNTS_KEY,[]),msg=$('[data-v21-auth-message]',signUp);if(accounts.some(a=>a.email.toLowerCase()===email)){if(msg)msg.textContent='An account with this email already exists.';return;}const account={id:`reader-${Date.now().toString(36)}`,name,email,password,premium:false,createdAt:new Date().toISOString()};accounts.push(account);write(READER_ACCOUNTS_KEY,accounts);setCurrentReader(account.id);if(read(PENDING_ACTION_KEY,null)==='subscribe'){activateReaderPremium();return;}closeSheet(true);location.reload();}
    },true);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activeSheet){e.stopImmediatePropagation();closeSheet();}},true);
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(themePreference()==='system')applyTheme()});
  }

  function upgradeSubscribeSheet(){const sheet=$('[data-sheet="subscribe"]');if(!sheet)return;const card=$('.subscribe-card',sheet);if(card)card.innerHTML=`<span class="v21-premium-chip">HealthTimes Premium</span><h2>Keep reading the research.</h2><p>Premium reporting is available for less than 30 seconds before membership is required. Members receive full research access, citation tools, saved reading, briefings and deeper HealthTimes Intelligence.</p><div class="subscribe-benefits"><span>Full Premium research</span><span>Copy-ready citations</span><span>Weekly intelligence briefing</span><span>Fewer advertising interruptions</span></div><div class="subscribe-price">US$5 <small>/ month</small></div><button class="button button-primary" type="button" data-subscribe-activate>${currentReader()?'Activate Premium':'Sign in or create account'}</button><button class="not-now" type="button" data-sheet-close>Not now</button>`;}

  function registerPwa(){if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});}

  function init(){
    seedReaders();syncLegacySubscription();applyTheme();ensureAccountSheet();renderReaderControls();upgradeSubscribeSheet();bindV21();renderAds();buildMobileHome();replaceWhatsAppRail();addArticleSocialIcons();setupPremiumArticle();registerPwa();
    document.documentElement.classList.add('v21-ready');
  }

  init();
})();
