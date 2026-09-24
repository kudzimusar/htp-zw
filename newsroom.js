(() => {
  'use strict';

  const KEYS = {
    session: 'htpNewsroomSession', stories: 'htpNewsroomStories', assignments: 'htpNewsroomAssignmentsV3',
    staff: 'htpNewsroomStaffV3', audit: 'htpNewsroomAudit', media: 'htpNewsroomMediaV3',
    comments: 'htpNewsroomCommentsV3', campaigns: 'htpAdCampaigns', advertisers: 'htpAdvertisersV1', overrides: 'htpStoryOverrides',
    sessions: 'htpNewsroomSessionsV3', notifications: 'htpNewsroomNotificationsV3',
    inboxSummary: 'htpNewsroomInboxSummaryV1', desks: 'htpNewsroomDesksV1',
    deskMembers: 'htpNewsroomDeskMembersV1', threads: 'htpNewsroomThreadsV1',
    threadMembers: 'htpNewsroomThreadMembersV1', messages: 'htpNewsroomMessagesV1',
    announcements: 'htpNewsroomAnnouncementsV1', moderation: 'htpNewsroomModerationV1'
  };
  const HOSPAZ = 'https://healthtimes.co.zw/wp-content/uploads/2025/11/HOSPAZ-hospice-and-palliative-care-assosciation-of-zimbabwe-annual-general-meeting-25-september-2026.jpeg';
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  // Browser state is a presentation cache only. Server/RLS is authoritative.
  const memory = new Map();
  const read = (k, f) => memory.has(k) ? memory.get(k) : f;
  const write = (k,v) => memory.set(k,v);
  let serverUser = null;

  function csrfToken(){
    const row = String(document.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('htp_nr_csrf='));
    return row ? decodeURIComponent(row.slice('htp_nr_csrf='.length)) : '';
  }
  async function api(action,payload={},method='POST'){
    const options={method,credentials:'same-origin',headers:{'Accept':'application/json'}};
    if(method==='POST'){
      options.headers['Content-Type']='application/json';
      const csrf=csrfToken();
      if(csrf)options.headers['X-HTP-CSRF']=csrf;
      options.body=JSON.stringify({action,...payload});
    }
    const url=method==='GET'?`/api/newsroom?action=${encodeURIComponent(action)}`:'/api/newsroom';
    const response=await fetch(url,options);
    let data={};
    try{data=await response.json();}catch{}
    if(!response.ok||data.ok===false){
      const error=new Error(data.error||`Newsroom request failed (${response.status})`);
      error.status=response.status; error.data=data; throw error;
    }
    return data;
  }
  const localTime=v=>v?new Date(v).toISOString().slice(0,16):'';
  const displayTime=v=>v?new Date(v).toLocaleString():'Never';
  const esc = (v='') => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const iso = () => new Date().toISOString();
  const stamp = () => iso().slice(0,16).replace('T',' ');
  const initials = n => String(n||'').split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase() || 'HT';
  const slugify = v => String(v||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);

  const CAP = {
    STORY_CREATE:'story.create', STORY_EDIT_OWN:'story.edit_own', STORY_EDIT_ALL:'story.edit_all', STORY_SUBMIT:'story.submit',
    STORY_FACT:'story.fact_check', STORY_HEALTH:'story.health_review', STORY_COPY:'story.copy_edit', STORY_PUBLISH:'story.publish', STORY_CORRECT:'story.correct',
    ASSIGN_CREATE:'assignment.create', ASSIGN_MANAGE:'assignment.manage', PREMIUM_ASSIGN:'premium.assign', PREMIUM_MANAGE:'premium.manage',
    ADS_VIEW:'ads.view', ADS_CREATE:'ads.create', ADS_APPROVE:'ads.approve', SUB_VIEW:'subscriber.view', SUB_MANAGE:'subscriber.manage',
    STAFF_VIEW:'staff.view', STAFF_INVITE:'staff.invite', STAFF_ROLE:'staff.change_role', STAFF_REVOKE:'staff.revoke',
    ANALYTICS:'analytics.view', SETTINGS:'settings.manage', SECURITY:'security.manage', DISTRIBUTION:'distribution.manage', MEDIA:'media.manage',
    DESK_MANAGE:'communication.desk.manage', BREAKING_MANAGE:'communication.breaking.manage', ANNOUNCE:'communication.announce',
    COMMENT_CONFIGURE:'comment.configure', COMMENT_MODERATE:'comment.moderate', COMMENT_RESTRICT:'comment.restrict', COMMENT_AUDIT:'comment.audit'
  };

  const ROLE_CAPS = {
    'Publisher / Owner': Object.values(CAP),
    'Editor-in-Chief':[CAP.STORY_CREATE,CAP.STORY_EDIT_ALL,CAP.STORY_SUBMIT,CAP.STORY_FACT,CAP.STORY_HEALTH,CAP.STORY_COPY,CAP.STORY_PUBLISH,CAP.STORY_CORRECT,CAP.ASSIGN_CREATE,CAP.ASSIGN_MANAGE,CAP.PREMIUM_ASSIGN,CAP.PREMIUM_MANAGE,CAP.ADS_VIEW,CAP.ADS_APPROVE,CAP.SUB_VIEW,CAP.STAFF_VIEW,CAP.STAFF_INVITE,CAP.STAFF_ROLE,CAP.STAFF_REVOKE,CAP.ANALYTICS,CAP.DISTRIBUTION,CAP.MEDIA,CAP.SECURITY],
    'Managing Editor':[CAP.STORY_CREATE,CAP.STORY_EDIT_ALL,CAP.STORY_SUBMIT,CAP.STORY_FACT,CAP.STORY_HEALTH,CAP.STORY_COPY,CAP.STORY_PUBLISH,CAP.STORY_CORRECT,CAP.ASSIGN_CREATE,CAP.ASSIGN_MANAGE,CAP.PREMIUM_ASSIGN,CAP.STAFF_VIEW,CAP.ANALYTICS,CAP.DISTRIBUTION,CAP.MEDIA],
    'Section Editor':[CAP.STORY_CREATE,CAP.STORY_EDIT_ALL,CAP.STORY_SUBMIT,CAP.STORY_FACT,CAP.STORY_COPY,CAP.ASSIGN_CREATE,CAP.ASSIGN_MANAGE,CAP.PREMIUM_ASSIGN,CAP.ANALYTICS,CAP.DISTRIBUTION,CAP.MEDIA],
    'News Editor':[CAP.STORY_CREATE,CAP.STORY_EDIT_ALL,CAP.STORY_SUBMIT,CAP.STORY_FACT,CAP.STORY_COPY,CAP.ASSIGN_CREATE,CAP.ASSIGN_MANAGE,CAP.ANALYTICS,CAP.DISTRIBUTION,CAP.MEDIA],
    'Reporter / Journalist':[CAP.STORY_CREATE,CAP.STORY_EDIT_OWN,CAP.STORY_SUBMIT,CAP.MEDIA],
    'Health / Science Editor':[CAP.STORY_EDIT_ALL,CAP.STORY_HEALTH,CAP.STORY_SUBMIT,CAP.ANALYTICS],
    'Fact Checker':[CAP.STORY_EDIT_ALL,CAP.STORY_FACT,CAP.STORY_SUBMIT],
    'Copy Editor':[CAP.STORY_EDIT_ALL,CAP.STORY_COPY,CAP.STORY_SUBMIT],
    'Multimedia Editor':[CAP.MEDIA,CAP.STORY_EDIT_ALL],
    'Social Editor':[CAP.DISTRIBUTION,CAP.ANALYTICS],
    'Newsletter Editor':[CAP.DISTRIBUTION,CAP.ANALYTICS,CAP.SUB_VIEW],
    'Commercial Manager':[CAP.ADS_VIEW,CAP.ADS_CREATE,CAP.ADS_APPROVE,CAP.SUB_VIEW,CAP.SUB_MANAGE,CAP.ANALYTICS,CAP.PREMIUM_MANAGE],
    'Subscriber Manager':[CAP.SUB_VIEW,CAP.SUB_MANAGE,CAP.ANALYTICS],
    'Analyst':[CAP.ANALYTICS]
  };

  // Demo credential fixtures removed: real staging staff authenticate through Supabase Auth.
  const DESKS=['Global Health','Africa','Southern Africa','East Africa','West Africa','Central Africa','North Africa','Zimbabwe','Research','Policy','Investigations','Health Business','Audience','Commercial'];
  const REGIONS=['Global','Africa','Southern Africa','East Africa','West Africa','Central Africa','North Africa','Zimbabwe'];
  const WORKFLOW=['Pitch','Approved','Assigned','Reporting','Draft','Submitted','Fact check','Health / Science review','Copy edit','Editor review','Ready','Scheduled','Published','Updated / Corrected','Archived'];
  const titleToId={
    'Parliament Probes NatPharm Over Zimbabwe’s Medicine Supply Chain':'natpharm-supply-chain',
    'Harare STI Cases Fall Below 2,000 Per Quarter, NAC Says':'harare-sti-cases',
    'Healthathon 3.0: What Zimbabwe’s Health Innovation Challenge Is Telling Us':'healthathon-innovation',
    'Zimbabwe Drops National Health Insurance Name, Unveils Tax-Funded Healthcare Provision Programme':'healthcare-provision-programme'
  };

  const initialStories=[
    {id:'s1',title:'Parliament Probes NatPharm Over Zimbabwe’s Medicine Supply Chain',standfirst:'Parliament resumes scrutiny of medicines procurement and distribution.',body:'Parliament has resumed its inquiry into Zimbabwe’s medicines supply system, focusing on procurement, storage, distribution and whether public investment is translating into reliable supplies for patients.',sources:'Parliamentary Portfolio Committee on Health and Child Care',notes:'Primary documents verified.',section:'Health Policy',desk:'Policy',country:'Zimbabwe',region:'Zimbabwe',topic:'Medicines',premium:false,owner:'editor',author:'Michael Gwarisa',editor:'editor',factChecker:'',status:'Published',deadline:'',schedule:'',updated:'2026-09-07 08:30',seoTitle:'Parliament probes NatPharm medicine supply chain',metaDescription:'HealthTimes reporting on Parliament scrutiny of Zimbabwe medicine supply.',slug:'natpharm-supply-chain',adSetting:'Standard',distribution:{homepage:true,breaking:false,newsletter:true,whatsapp:true,push:false},versions:[]},
    {id:'s2',title:'Harare STI Cases Fall Below 2,000 Per Quarter, NAC Says',standfirst:'NAC reports a decline while warning of the continued burden among young women.',body:'Health authorities say the trend is encouraging but requires careful interpretation and continued prevention investment.',sources:'National AIDS Council briefing',notes:'Confirm age-disaggregated figures before next update.',section:'Public Health',desk:'Africa',country:'Zimbabwe',region:'Zimbabwe',topic:'HIV/AIDS',premium:false,owner:'reporter',author:'Kuda Pembere',editor:'editor',factChecker:'',status:'Published',deadline:'',schedule:'',updated:'2026-09-07 09:10',seoTitle:'Harare STI cases fall, NAC says',metaDescription:'NAC reports lower STI cases in Harare.',slug:'harare-sti-cases',adSetting:'Standard',distribution:{homepage:true,breaking:false,newsletter:true,whatsapp:true,push:false},versions:[]},
    {id:'s3',title:'Healthathon 3.0: What Zimbabwe’s Health Innovation Challenge Is Telling Us',standfirst:'Analysis of the expanding health-innovation ecosystem.',body:'Healthathon 3.0 is exposing a growing pipeline of locally grounded health innovation and a need for stronger pathways from prototype to health-system adoption.',sources:'Healthathon programme and participant interviews',notes:'Analysis piece.',section:'Opinion & Analysis',desk:'Research',country:'Zimbabwe',region:'Africa',topic:'Innovation',premium:false,owner:'editor',author:'Michael Gwarisa',editor:'editor',factChecker:'',status:'Published',deadline:'',schedule:'',updated:'2026-09-07 12:05',seoTitle:'Healthathon 3.0 health innovation analysis',metaDescription:'HealthTimes analysis of Zimbabwe health innovation.',slug:'healthathon-innovation',adSetting:'Standard',distribution:{homepage:true,breaking:false,newsletter:true,whatsapp:false,push:false},versions:[]},
    {id:'s4',title:'Medicine Supply Dashboard: What the NatPharm Inquiry Should Measure Next',standfirst:'A proposed accountability framework for tracking medicines from financing to facilities.',body:'This research note proposes a practical dashboard for following medicine availability, procurement lead times, stock-outs and financing through the public supply chain.',sources:'Parliamentary evidence; NatPharm public documents; procurement literature',notes:'Sources verified. Awaiting final approval.',section:'Health Policy',desk:'Policy',country:'Zimbabwe',region:'Africa',topic:'Medicines',premium:true,owner:'editor',author:'Michael Gwarisa',editor:'editor',factChecker:'factchecker',status:'Ready',deadline:'2026-09-09T16:00',schedule:'',updated:'2026-09-09 08:40',seoTitle:'Medicine supply dashboard for Zimbabwe',metaDescription:'A HealthTimes Premium accountability framework for medicines.',slug:'medicine-supply-dashboard',adSetting:'Reduced',distribution:{homepage:false,breaking:false,newsletter:true,whatsapp:false,push:false},versions:[]},
    {id:'s5',title:'Community Prevention Follow-up: What Harare’s STI Trend Does Not Yet Tell Us',standfirst:'A follow-up examining age, reporting periods and prevention evidence.',body:'The apparent decline is important, but aggregate counts do not answer questions about age, gender, geography or testing intensity.',sources:'NAC briefing; city health data request pending',notes:'Needs data-context check.',section:'Public Health',desk:'Africa',country:'Zimbabwe',region:'Zimbabwe',topic:'HIV/AIDS',premium:true,owner:'reporter',author:'Kuda Pembere',editor:'editor',factChecker:'factchecker',status:'Submitted',deadline:'2026-09-09T14:00',schedule:'',updated:'2026-09-09 09:05',seoTitle:'What Harare STI trends do not yet tell us',metaDescription:'HealthTimes analysis of STI trend interpretation.',slug:'harare-sti-trend-analysis',adSetting:'Reduced',distribution:{homepage:false,breaking:false,newsletter:false,whatsapp:false,push:false},versions:[]},
    {id:'s6',title:'Weekly Africa Outbreak Watch',standfirst:'A developing regional health surveillance briefing.',body:'This week’s watch follows outbreak updates across the continent and highlights signals that require further verification.',sources:'Africa CDC; WHO disease outbreak news',notes:'Add Africa CDC update.',section:'Africa',desk:'Africa',country:'Multiple',region:'Africa',topic:'Outbreaks',premium:false,owner:'reporter',author:'Kuda Pembere',editor:'editor',factChecker:'',status:'Draft',deadline:'2026-09-09T18:00',schedule:'',updated:'2026-09-09 09:30',seoTitle:'Weekly Africa outbreak watch',metaDescription:'HealthTimes weekly outbreak reporting across Africa.',slug:'africa-outbreak-watch',adSetting:'Standard',distribution:{homepage:false,breaking:false,newsletter:true,whatsapp:true,push:false},versions:[]},
    {id:'s7',title:'National Health Strategy: Implementation Tracker',standfirst:'A living tracker of implementation commitments under the national strategy.',body:'The tracker follows milestones, financing commitments and service-delivery indicators against stated policy goals.',sources:'Ministry strategy; budget documents',notes:'Fact checker to verify milestones.',section:'Health Policy',desk:'Policy',country:'Zimbabwe',region:'Zimbabwe',topic:'Health Systems',premium:true,owner:'editor',author:'Michael Gwarisa',editor:'editor',factChecker:'factchecker',status:'Fact check',deadline:'2026-09-10T12:00',schedule:'',updated:'2026-09-09 10:00',seoTitle:'National health strategy implementation tracker',metaDescription:'HealthTimes Premium policy implementation tracker.',slug:'national-health-strategy-tracker',adSetting:'Reduced',distribution:{homepage:false,breaking:false,newsletter:false,whatsapp:false,push:false},versions:[]},
    {id:'s8',title:'Friday HealthTimes Weekly',standfirst:'The week’s essential health reporting in one concise edition.',body:'Editorial briefing assembly.',sources:'Published HealthTimes stories',notes:'Scheduled after final story selection.',section:'Health News',desk:'Audience',country:'Global',region:'Global',topic:'Briefing',premium:false,owner:'audience',author:'Audience Desk',editor:'editor',factChecker:'',status:'Scheduled',deadline:'2026-09-11T10:00',schedule:'2026-09-11T12:00',updated:'2026-09-09 10:10',seoTitle:'HealthTimes Weekly',metaDescription:'Weekly HealthTimes briefing.',slug:'healthtimes-weekly',adSetting:'Standard',distribution:{homepage:false,breaking:false,newsletter:true,whatsapp:true,push:false},versions:[]}
  ];

  const initialAssignments=[
    {id:'a1',title:'Africa CDC outbreak surveillance update',reporter:'reporter',desk:'Africa',deadline:'2026-09-09T17:00',priority:'High',editor:'editor',status:'Reporting',notes:'Confirm cut-off time and compare with WHO notices.'},
    {id:'a2',title:'Malaria financing after donor transition',reporter:'reporter',desk:'Africa',deadline:'2026-09-10T14:00',priority:'Urgent',editor:'editor',status:'Assigned',notes:'Interview programme manager and financing specialist.'},
    {id:'a3',title:'HealthTimes global citations strategy explainer',reporter:'editor',desk:'Research',deadline:'2026-09-12T12:00',priority:'Normal',editor:'publisher',status:'Drafting',notes:'Frame HealthTimes research for international referencing.'},
    {id:'a4',title:'Friday HealthTimes Weekly assembly',reporter:'audience',desk:'Audience',deadline:'2026-09-11T10:00',priority:'High',editor:'editor',status:'Drafting',notes:'Select five essential stories and one Premium research note.'}
  ];

  const initialStaff=[
    {username:'publisher',name:'Publisher Office',email:'publisher@healthtimes.co.zw',role:'Publisher / Owner',desk:'Executive',beat:'Organisation',country:'Zimbabwe',region:'Global',status:'Active',editor:'',lastLogin:'Today 08:15',passwordChange:false,mfa:'Ready'},
    {username:'editor',name:'Michael Gwarisa',email:'editor@healthtimes.co.zw',role:'Editor-in-Chief',desk:'Global Health',beat:'Policy & Health Systems',country:'Zimbabwe',region:'Global',status:'Active',editor:'',lastLogin:'Today 09:02',passwordChange:false,mfa:'Ready'},
    {username:'reporter',name:'Kuda Pembere',email:'reporter@healthtimes.co.zw',role:'Reporter / Journalist',desk:'Africa',beat:'Public Health',country:'Zimbabwe',region:'Southern Africa',status:'Active',editor:'editor',lastLogin:'Today 08:47',passwordChange:false,mfa:'Pending'},
    {username:'factchecker',name:'Tariro Ncube',email:'factcheck@healthtimes.co.zw',role:'Fact Checker',desk:'Research',beat:'Evidence verification',country:'Zimbabwe',region:'Africa',status:'Active',editor:'editor',lastLogin:'Yesterday 16:42',passwordChange:false,mfa:'Ready'},
    {username:'science',name:'Dr Nyasha Moyo',email:'science@healthtimes.co.zw',role:'Health / Science Editor',desk:'Research',beat:'Medical evidence',country:'South Africa',region:'Africa',status:'Active',editor:'editor',lastLogin:'Yesterday 15:20',passwordChange:false,mfa:'Ready'},
    {username:'audience',name:'Audience Desk',email:'audience@healthtimes.co.zw',role:'Newsletter Editor',desk:'Audience',beat:'Distribution',country:'Zimbabwe',region:'Global',status:'Active',editor:'editor',lastLogin:'Today 09:10',passwordChange:false,mfa:'Ready'},
    {username:'commercial',name:'Commercial Desk',email:'commercial@healthtimes.co.zw',role:'Commercial Manager',desk:'Commercial',beat:'Advertising & Membership',country:'Zimbabwe',region:'Global',status:'Active',editor:'publisher',lastLogin:'Today 08:30',passwordChange:false,mfa:'Ready'}
  ];

  const initialCampaigns=[{id:'hospaz-agm-2026',advertiser:'HOSPAZ',name:'HOSPAZ Annual General Meeting',creative:HOSPAZ,destination:'https://healthtimes.co.zw/',placement:['masthead','home-infeed','article'],start:'2026-09-01',end:'2026-09-25',status:'Active',review:'Approved',label:'Advertisement',impressions:0,clicks:0}];

  const NAV=[
    ['My Newsroom',[['overview','Overview','⌂'],['inbox','Inbox','✉'],['my-assignments','My assignments','✓'],['my-stories','My stories','▤'],['saved','Saved','☆']]],
    ['Editorial',[['stories','Stories','▤','editorial'],['assignments','Assignments','✓'],['review','Review Queue','◫','review'],['calendar','Editorial Calendar','□','editorial'],['desks','Desks','◎'],['breaking','Breaking','!'],['corrections','Corrections','↺','editorial'],['moderation','Moderation','⚑',CAP.COMMENT_MODERATE]]],
    ['Content',[['media','Media Library','▧',CAP.MEDIA],['authors','Authors','◎','editorial'],['topics','Topics','⌗','editorial'],['regions','Countries & regions','◌','editorial'],['sources','Research / Sources','≡','editorial'],['archive','Archive','▱','editorial']]],
    ['Distribution',[['homepage','Homepage','⌂',CAP.DISTRIBUTION],['newsletter','Newsletters','✉',CAP.DISTRIBUTION],['whatsapp','WhatsApp','◉',CAP.DISTRIBUTION],['social','Social','↗',CAP.DISTRIBUTION],['push','Push alerts','●',CAP.DISTRIBUTION]]],
    ['Intelligence',[['analytics','Analytics','↗',CAP.ANALYTICS],['trending','Trending','↗',CAP.ANALYTICS],['seo','SEO','⌕','editorial'],['citations','Citations & Impact','§',CAP.ANALYTICS],['ai','AI Desk','✦','editorial']]],
    ['Commercial',[['premium','Premium','◆','premium'],['subscribers','Subscribers','♙',CAP.SUB_VIEW],['advertising','Advertising','▣',CAP.ADS_VIEW]]],
    ['Organisation',[['staff','Staff & Access','♟',CAP.STAFF_VIEW],['roles','Roles & Permissions','⚿',CAP.STAFF_VIEW],['audit','Audit Log','≣','admin']]],
    ['System',[['settings','Settings','⚙',CAP.SETTINGS],['integrations','Integrations','⌁','admin'],['security','Security','⌾','security']]]
  ];

  let active='overview', editingStoryId=null, autosaveTimer=null, pendingConfirm=null, recoveryMode=false;
  function ensureSeed(){}
  function getStories(){return read(KEYS.stories,[])} function setStories(v){write(KEYS.stories,v)}
  function getAssignments(){return read(KEYS.assignments,[])} function setAssignments(v){write(KEYS.assignments,v)}
  function getStaff(){return read(KEYS.staff,[])} function setStaff(v){write(KEYS.staff,v)}
  function getMedia(){return read(KEYS.media,[])}
  function mediaUsageLabel(v){return ({featured:'Featured image',inline:'Inline image',supporting_document:'Supporting document'})[v]||String(v||'Media').replace(/_/g,' ');}
  function mediaKind(m){const mime=String(m?.mimeType||'');return mime.startsWith('image/')?'Image':mime==='application/pdf'||mime.includes('wordprocessingml')||mime==='text/plain'?'Document':'Media';}
  function storyMediaFor(storyId){return getMedia().flatMap(m=>(m.usages||[]).filter(u=>u.storyId===storyId).map(u=>({...m,storyUsage:u})));}
  function caps(role){return new Set(ROLE_CAPS[role]||[])} // presentation reference only
  function has(cap){return new Set(currentUser()?.capabilities||[]).has(cap)}
  function staffRecord(username){return getStaff().find(x=>x.username===username||x.id===username)}
  function currentUser(){return serverUser}
  function isEditor(){return has(CAP.STORY_EDIT_ALL)||has(CAP.STORY_PUBLISH)||has(CAP.ASSIGN_MANAGE)}
  function canEditStory(s){const u=currentUser();const assigned=!!u&&getAssignments().some(a=>a.storyId===s.id&&a.reporter===u.username);return !!u && (has(CAP.STORY_EDIT_ALL)||(has(CAP.STORY_EDIT_OWN)&&(s.owner===u.username||assigned)));}
  function canModule(id,rule){if(!currentUser())return false;if(!rule)return true;if(rule==='editorial')return has(CAP.STORY_EDIT_ALL)||has(CAP.STORY_CREATE)||has(CAP.STORY_FACT)||has(CAP.STORY_HEALTH)||has(CAP.STORY_COPY);if(rule==='review')return has(CAP.STORY_FACT)||has(CAP.STORY_HEALTH)||has(CAP.STORY_COPY)||has(CAP.STORY_PUBLISH);if(rule==='premium')return has(CAP.PREMIUM_ASSIGN)||has(CAP.PREMIUM_MANAGE);if(rule==='admin')return has(CAP.STAFF_VIEW)||has(CAP.SETTINGS)||has(CAP.SECURITY);if(rule==='security')return has(CAP.SECURITY)||has('security.view_sessions')||!!currentUser();return has(rule);}
  function audit(){/* Durable audit is written by server-side RPCs. */}
  function toast(msg){const el=$('[data-newsroom-toast]');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2200);}
  function syncPremium(){/* Premium editorial policy is server-backed. */}

  function applyBootstrap(payload){
    const data=payload?.data||payload||{};
    const ctx=data.context||{};
    const roles=new Map((data.roles||[]).map(r=>[r.id,r.name]));
    const adminStaff=new Map((data.staff||[]).map(s=>[s.id,s]));
    const rawDirectory=(data.directory||[]).length?data.directory:(data.staff||[]).map(s=>({
      id:s.id,handle:s.handle,display_name:s.display_name,role:roles.get(s.role_id)||'Staff',
      desk:s.desk,beat:s.beat,country:s.country,region:s.region,status:s.status,assigned_editor_id:s.assigned_editor_id
    }));
    const directoryById=new Map(rawDirectory.map(s=>[s.id,s]));
    const handleFor=id=>{const s=directoryById.get(id)||adminStaff.get(id);return s?.handle||s?.id||'';};
    const staff=rawDirectory.map(s=>{
      const admin=adminStaff.get(s.id)||{};
      return {
        id:s.id,authUserId:admin.auth_user_id||'',username:s.handle||admin.handle||s.id,name:s.display_name||admin.display_name||'Staff',
        email:admin.email||'',role:s.role||roles.get(admin.role_id)||'Staff',desk:s.desk||admin.desk||'',beat:s.beat||admin.beat||'',
        country:s.country||admin.country||'',region:s.region||admin.region||'',
        status:String(s.status||admin.status||'active').replace(/^./,x=>x.toUpperCase()),
        editor:handleFor(s.assigned_editor_id||admin.assigned_editor_id),
        lastLogin:displayTime(admin.last_login_at),mfa:admin.mfa_enrolled_at?'Enrolled':(admin.mfa_required?'Required':'Available')
      };
    });
    setStaff(staff);
    const staffById=new Map(staff.map(s=>[s.id,s]));
    const revisionGroups={};
    for(const r of data.revisions||[]){
      (revisionGroups[r.story_id]||(revisionGroups[r.story_id]=[])).push({
        id:r.id,revisionNumber:r.revision_number,at:r.created_at,
        by:staffById.get(r.editor_id)?.name||'Newsroom',label:r.change_summary||`Revision ${r.revision_number}`
      });
    }
    const stories=(data.stories||[]).map(s=>({
      id:s.id,title:s.title||'',standfirst:s.standfirst||'',body:s.body_html||'',sources:s.source_notes||'',notes:s.internal_notes||'',
      section:'Health News',desk:s.desk||'',country:s.country||'',region:s.region||'Global',topic:s.topic||'',
      premium:String(s.access_policy||'public').toLowerCase()==='premium',
      owner:handleFor(s.owner_staff_id),author:staffById.get(s.owner_staff_id)?.name||'HealthTimes',
      editor:handleFor(s.assigned_editor_staff_id),factChecker:handleFor(s.fact_checker_staff_id),
      status:s.workflow_status||(String(s.status||'').toLowerCase()==='publish'?'Published':'Draft'),
      deadline:localTime(s.deadline_at),schedule:localTime(s.scheduled_at),updated:displayTime(s.updated_at||s.modified_at),
      seoTitle:s.seo_title||'',metaDescription:s.seo_description||'',slug:s.slug||'',adSetting:s.ad_setting||'Standard',
      distribution:s.distribution||{},versions:revisionGroups[s.id]||[],lockVersion:Number(s.lock_version||1),commentPolicy:s.comment_policy||'disabled'
    }));
    setStories(stories);
    const media=(data.media||[]).map(m=>({
      id:m.id,filename:m.filename||'',mimeType:m.mime_type||'',byteSize:Number(m.byte_size||0),sourceUrl:m.source_url||'',
      checksum:m.checksum||'',altText:m.alt_text||'',caption:m.caption||'',credit:m.credit||'',
      sourceProvenance:m.source_provenance||m.source_url||'',storageBucket:m.storage_bucket||'',
      storageKey:m.storage_key||'',publicUrl:m.public_url||'',status:m.status||'pending',
      uploadedByStaffId:m.uploaded_by_staff_id||null,createdAt:m.created_at,updatedAt:m.updated_at,
      usages:Array.isArray(m.usage)?m.usage.map(u=>({storyId:u.story_id,usageType:u.usage_type,sourceContext:u.source_context||{}})):[]
    }));
    write(KEYS.media,media);
    const assignments=(data.assignments||[]).map(a=>({
      id:a.id,storyId:a.story_id,title:a.title,reporter:handleFor(a.reporter_staff_id),
      desk:a.desk||'',deadline:a.deadline_at||'',priority:a.priority||'Normal',
      editor:handleFor(a.assigned_editor_staff_id),status:a.status||'Assigned',notes:a.notes||''
    }));
    setAssignments(assignments);
    const comments={};
    for(const row of data.comments||[]){
      const a=staffById.get(row.author_staff_id);
      (comments[row.story_id]||(comments[row.story_id]=[])).push({
        id:row.id,authorStaffId:row.author_staff_id,user:a?.name||'Newsroom',at:row.created_at,text:row.body,
        parentCommentId:row.parent_comment_id||null,editedAt:row.edited_at||null,resolved:!!row.resolved_at
      });
    }
    write(KEYS.comments,comments);
    write(KEYS.audit,(data.audit||[]).map(row=>({
      at:row.created_at,user:staffById.get(row.actor_staff_id)?.name||'System',
      role:staffById.get(row.actor_staff_id)?.role||'System',action:row.action,
      target:row.target_table,targetId:row.target_id,metadata:row.metadata||{}
    })));
    const sessionMap={};
    for(const row of data.sessions||[]){
      const person=staffById.get(row.staff_profile_id); if(!person)continue;
      (sessionMap[person.username]||(sessionMap[person.username]=[])).push({
        id:row.provider_session_id,dbId:row.id,device:row.user_agent||'Staff browser',
        location:'HealthTimes Staging',lastActive:displayTime(row.last_seen_at),
        current:row.provider_session_id===ctx.session_id,revoked:!!row.revoked_at
      });
    }
    write(KEYS.sessions,sessionMap);
    const advertiserRows=(data.advertisers||[]).map(a=>({id:a.id,name:a.name}));
    const advertisers=new Map(advertiserRows.map(a=>[a.id,a.name]));
    write(KEYS.advertisers,advertiserRows);
    write(KEYS.campaigns,(data.campaigns||[]).map(x=>({
      id:x.id,advertiser:advertisers.get(x.advertiser_id)||'Advertiser',name:x.name,status:x.status,
      start:x.start_at||'',end:x.end_at||'',review:x.review_status||'pending',placement:[],impressions:0,clicks:0
    })));
    write(KEYS.notifications,(data.notifications||[]).map(n=>({id:n.id,eventType:n.event_type,targetTable:n.target_table,targetId:n.target_id,payload:n.payload||{},actorStaffId:n.actor_staff_id||null,category:n.category||'general',priority:n.priority||'normal',readAt:n.read_at||null,requiresAck:!!n.requires_ack,acknowledgedAt:n.acknowledged_at||null,archivedAt:n.archived_at||null,expiresAt:n.expires_at||null,createdAt:n.created_at})));
    write(KEYS.inboxSummary,data.inboxSummary||{});
    write(KEYS.desks,data.desks||[]);write(KEYS.deskMembers,data.deskMembers||[]);write(KEYS.threads,data.threads||[]);write(KEYS.threadMembers,data.threadMembers||[]);write(KEYS.messages,data.messages||[]);write(KEYS.announcements,data.announcements||[]);
    const self=staff.find(s=>s.id===ctx.id)||{
      id:ctx.id,username:ctx.handle||ctx.id,name:ctx.display_name,email:ctx.email,role:ctx.role,
      desk:ctx.desk||'',beat:ctx.beat||'',country:ctx.country||'',region:ctx.region||'',status:'Active',
      editor:ctx.assigned_editor||'',lastLogin:displayTime(ctx.last_login_at),mfa:ctx.mfa_enrolled_at?'Enrolled':(ctx.mfa_required?'Required':'Available')
    };
    serverUser={...self,capabilities:Array.isArray(ctx.capabilities)?ctx.capabilities:[],sessionId:ctx.session_id,initials:initials(self.name)};
  }

  async function consumeProviderCallback(){
    if(!location.hash||!location.hash.includes('access_token='))return;
    const p=new URLSearchParams(location.hash.slice(1));
    const type=p.get('type')||'';
    const accessToken=p.get('access_token'),refreshToken=p.get('refresh_token');
    if(!accessToken||!refreshToken)return;
    const result=await api('adoptSession',{accessToken,refreshToken,expiresIn:Number(p.get('expires_in')||3600)});
    recoveryMode=type==='recovery';
    history.replaceState({},document.title,location.pathname+location.search);
    if(result.context){
      serverUser={...(result.context||{}),username:result.context?.handle||result.context?.id,name:result.context?.display_name,initials:initials(result.context?.display_name),capabilities:result.context?.capabilities||[]};
    }
  }

  async function refreshData(){
    const result=await api('bootstrap',{},'GET');
    applyBootstrap(result.data);
    return result.data;
  }

  async function login(email,password){
    const result=await api('login',{email:String(email||'').trim().toLowerCase(),password:String(password||'')});
    serverUser={...(result.context||{}),username:result.context?.handle||result.context?.id,name:result.context?.display_name,initials:initials(result.context?.display_name),capabilities:result.context?.capabilities||[]};
    await refreshData();
    return true;
  }
  async function logout(){
    try{await api('logout');}catch{}
    memory.clear();serverUser=null;location.reload();
  }

  async function init(){
    bindGlobal();
    try{await consumeProviderCallback();}catch(error){console.warn('Provider callback rejected safely:',error.message);}
    try{await refreshData();}catch(error){
      if(error.status!==401&&error.status!==403)console.warn('Newsroom bootstrap unavailable:',error.message);
      serverUser=null;
    }
    const u=currentUser();
    if(!u){$('[data-login-view]').hidden=false;$('[data-newsroom-app]').hidden=true;return;}
    $('[data-login-view]').hidden=true;$('[data-newsroom-app]').hidden=false;renderUser();renderNav();showModule('overview');
    if(recoveryMode)$('[data-password-reset-modal]').hidden=false;
  }

  function renderUser(){const u=currentUser();$('[data-user-mini]').innerHTML=`<div class="nr-user-mini-row"><span class="nr-avatar">${esc(u.initials)}</span><span><strong>${esc(u.name)}</strong><small>${esc(u.role)}</small></span><button type="button" data-sign-out aria-label="Sign out">↪</button></div>`;$('[data-user-menu]').textContent=u.initials;$('[data-topline]').textContent=`${u.name} · ${u.role}`;}
  function navCount(id){const u=currentUser(), stories=getStories(), assignments=getAssignments();if(id==='inbox')return Number(read(KEYS.inboxSummary,{}).unread_total||0);if(id==='my-assignments')return assignments.filter(a=>a.reporter===u.username&&!['Complete'].includes(a.status)).length;if(id==='my-stories')return stories.filter(s=>s.owner===u.username&&!['Archived'].includes(s.status)).length;if(id==='review')return stories.filter(s=>['Submitted','Fact check','Health / Science review','Copy edit','Editor review','Ready'].includes(s.status)).length;if(id==='corrections')return stories.filter(s=>s.status==='Updated / Corrected').length;if(id==='premium')return stories.filter(s=>s.premium).length;if(id==='moderation')return Number(read(KEYS.inboxSummary,{}).moderation||0);return 0;}
  function renderNav(){const nav=$('[data-newsroom-nav]');nav.innerHTML=NAV.map(([group,items])=>{const visible=items.filter(([id,, ,rule])=>canModule(id,rule));if(!visible.length)return'';return `<section class="nr-nav-group"><div class="nr-nav-label">${esc(group)}</div>${visible.map(([id,label,icon])=>`<button type="button" data-module="${id}" ${id==='advertising'?'data-v21-module="ads"':''} class="${active===id?'active':''}"><span class="nr-nav-icon">${icon}</span><span>${esc(label)}</span>${navCount(id)?`<span class="nr-nav-count">${navCount(id)}</span>`:''}</button>`).join('')}</section>`}).join('');}
  function setCrumb(label){$('[data-breadcrumb]').textContent=label;}
  function head(title,copy,actions=''){return `<div class="nr-workspace-head"><div><span class="nr-kicker">HealthTimes Newsroom</span><h1>${esc(title)}</h1><p>${esc(copy)}</p></div><div class="nr-workspace-actions">${actions}</div></div>`;}
  function stat(label,value,copy,accent='teal'){return `<article class="nr-stat nr-accent-${accent}"><span class="nr-stat-label">${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(copy)}</small></article>`;}
  function status(s){return `<span class="nr-status" data-status="${esc(s)}">${esc(s)}</span>`;}
  function button(label,attr='',cls='nr-secondary'){return `<button type="button" class="${cls}" ${attr}>${esc(label)}</button>`;}

  function showModule(id){const item=NAV.flatMap(g=>g[1]).find(x=>x[0]===id);if(!item||!canModule(id,item[3])){toast('This workspace is not available to your role.');return;}active=id;renderNav();setCrumb(item[1]);const renderers={overview:renderOverview,inbox:renderInbox,'my-assignments':renderMyAssignments,'my-stories':renderMyStories,saved:renderSaved,stories:renderStories,assignments:renderAssignments,review:renderReview,calendar:renderCalendar,desks:renderDesks,breaking:renderBreaking,corrections:renderCorrections,moderation:renderModeration,media:renderMedia,authors:renderAuthors,topics:renderTopics,regions:renderRegions,sources:renderSources,archive:renderArchive,homepage:renderHomepage,newsletter:renderNewsletter,whatsapp:renderWhatsApp,social:renderSocial,push:renderPush,analytics:renderAnalytics,trending:renderTrending,seo:renderSEO,citations:renderCitations,ai:renderAI,premium:renderPremium,subscribers:renderSubscribers,advertising:renderAdvertising,staff:renderStaff,roles:renderRoles,audit:renderAudit,settings:renderSettings,integrations:renderIntegrations,security:renderSecurity};$('[data-workspace]').innerHTML=(renderers[id]||renderOverview)();if(id==='moderation')setTimeout(()=>refreshModeration(),0);}

  function roleDashboard(){const role=currentUser().role;if(role==='Reporter / Journalist')return renderReporterDashboard();if(role==='Commercial Manager')return renderCommercialDashboard();if(role==='Newsletter Editor')return renderAudienceDashboard();if(role==='Publisher / Owner')return renderPublisherDashboard();return renderEditorDashboard();}
  function renderOverview(){return roleDashboard();}
  function renderReporterDashboard(){const u=currentUser(), stories=getStories().filter(s=>s.owner===u.username), assignments=getAssignments().filter(a=>a.reporter===u.username), due=assignments.filter(a=>new Date(a.deadline).toDateString()===new Date().toDateString()), drafts=stories.filter(s=>['Draft','Reporting','Assigned'].includes(s.status)), waiting=stories.filter(s=>['Submitted','Fact check','Editor review'].includes(s.status));return `${head('My Newsroom','Your assignments, drafts, deadlines and editorial feedback in one working view.',has(CAP.STORY_CREATE)?button('＋ New story','data-quick-create','nr-primary'):'')}
  <div class="nr-grid nr-grid-4">${stat('Active assignments',assignments.filter(a=>a.status!=='Complete').length,'Stories currently assigned to you','teal')}${stat('Due today',due.length,'Deadlines requiring attention','red')}${stat('Drafts',drafts.length,'Working copy not yet submitted','blue')}${stat('Waiting for editor',waiting.length,'Submitted or in review','amber')}</div>
  <div class="nr-dashboard-columns"><div class="nr-dashboard-stack"><section class="nr-panel"><div class="nr-panel-head"><div><h2>My assignments</h2><p>Priority work and deadlines</p></div><button data-module-jump="my-assignments">Open desk →</button></div><ul class="nr-list">${assignments.slice(0,5).map(a=>assignmentList(a)).join('')||emptyRow('No active assignments')}</ul></section><section class="nr-panel"><div class="nr-panel-head"><div><h2>My stories</h2><p>Drafting, review and publication state</p></div><button data-module-jump="my-stories">All stories →</button></div><ul class="nr-list">${stories.slice(0,6).map(s=>storyList(s)).join('')}</ul></section></div><div class="nr-dashboard-stack">${todayPanel()}${notificationPanel()}${personalPerformancePanel(stories)}</div></div>`;}
  function renderEditorDashboard(){const stories=getStories(), assignments=getAssignments(), review=stories.filter(s=>['Submitted','Fact check','Health / Science review','Copy edit','Editor review','Ready'].includes(s.status)), overdue=assignments.filter(a=>new Date(a.deadline)<new Date()&&a.status!=='Complete'), ready=stories.filter(s=>['Ready','Scheduled'].includes(s.status)), corrections=stories.filter(s=>s.status==='Updated / Corrected');return `${head('Newsroom today','Review priorities, deadlines, publishing readiness and desk activity.',button('＋ Assignment','data-open-assignment','nr-secondary')+button('＋ New story','data-quick-create','nr-primary'))}<div class="nr-grid nr-grid-4">${stat('Needs review',review.length,'Editorial or verification action','amber')}${stat('Ready to publish',ready.length,'Ready or scheduled work','green')}${stat('Overdue assignments',overdue.length,'Past deadline and incomplete','red')}${stat('Corrections waiting',corrections.length,'Updates requiring publication','blue')}</div><div class="nr-dashboard-columns"><div class="nr-dashboard-stack"><section class="nr-panel"><div class="nr-panel-head"><div><h2>Review queue</h2><p>Work requiring an editorial decision</p></div><button data-module-jump="review">Open queue →</button></div>${review.slice(0,6).map(reviewCard).join('')||empty('Review queue is clear')}</section><section class="nr-panel"><div class="nr-panel-head"><div><h2>Desk activity</h2><p>Current working inventory by desk</p></div></div>${deskActivity()}</section></div><div class="nr-dashboard-stack">${todayPanel()}${trendingPanel()}${publicationPulse()}</div></div>`;}
  function renderPublisherDashboard(){const stories=getStories(),staff=getStaff(), campaigns=read(KEYS.campaigns,[]),active=staff.filter(s=>s.status==='Active').length;return `${head('Publisher overview','Organisation-wide editorial, commercial, staff and security context.',button('View audit','data-module-jump="audit"','nr-secondary')+button('Invite staff','data-open-invite','nr-primary'))}<div class="nr-grid nr-grid-4">${stat('Editorial inventory',stories.length,'Stories across all workflow states','teal')}${stat('Active staff',active,'Newsroom accounts currently active','blue')}${stat('Premium research',stories.filter(s=>s.premium).length,'Stories under Premium governance','amber')}${stat('Active campaigns',campaigns.filter(c=>c.status==='Active').length,'Commercial inventory currently running','green')}</div><div class="nr-dashboard-columns"><div class="nr-dashboard-stack"><section class="nr-panel"><div class="nr-panel-head"><div><h2>Operating health</h2><p>Publication work that needs attention</p></div></div>${deskActivity()}</section><section class="nr-panel"><div class="nr-panel-head"><div><h2>Staff & access</h2><p>Current organisation profile</p></div><button data-module-jump="staff">Manage →</button></div><div class="nr-staff-card-grid">${staff.slice(0,6).map(personCard).join('')}</div></section></div><div class="nr-dashboard-stack">${publicationPulse()}${commercialPulse()}${securityPulse()}</div></div>`;}
  function renderCommercialDashboard(){const campaigns=read(KEYS.campaigns,[]), stories=getStories(), premium=stories.filter(s=>s.premium);return `${head('Commercial workspace','Advertising, Premium product and subscriber operations — separated from editorial copy.',button('Advertising','data-module-jump="advertising"','nr-primary'))}<div class="nr-grid nr-grid-4">${stat('Active campaigns',campaigns.filter(c=>c.status==='Active').length,'Paid inventory currently running','teal')}${stat('Scheduled campaigns',campaigns.filter(c=>c.status==='Scheduled').length,'Upcoming commercial inventory','blue')}${stat('Premium stories',premium.length,'Current Premium publishing inventory','amber')}${stat('Ad review pending',campaigns.filter(c=>c.review==='Pending').length,'Campaigns needing approval','red')}</div><div class="nr-dashboard-columns"><section class="nr-panel"><div class="nr-panel-head"><div><h2>Campaign inventory</h2><p>Commercial work without editorial permissions</p></div><button data-module-jump="advertising">Manage →</button></div>${campaignTable(campaigns)}</section><div class="nr-dashboard-stack">${commercialPulse()}${subscriberPulse()}</div></div>`;}
  function renderAudienceDashboard(){return `${head('Audience desk','Briefings, WhatsApp, social distribution and reader relationship work.',button('Build briefing','data-module-jump="newsletter"','nr-primary'))}<div class="nr-grid nr-grid-4">${stat('Scheduled editions','2','Weekly + Premium intelligence','teal')}${stat('Stories selected','7','Across active briefing drafts','blue')}${stat('WhatsApp queue','3','Items awaiting distribution','amber')}${stat('Reader channels','3','Email · WhatsApp · browser','green')}</div><div class="nr-dashboard-columns"><div class="nr-dashboard-stack">${distributionQueue()}${todayPanel()}</div><div class="nr-dashboard-stack">${audienceTopicPanel()}${notificationPanel()}</div></div>`;}

  function storyList(s){return `<li class="nr-list-item"><div><strong>${esc(s.title)}</strong><p>${esc(s.desk)} · ${esc(s.premium?'Premium':'Public')} · Updated ${esc(s.updated)}</p></div><div class="nr-list-actions">${status(s.status)}${canEditStory(s)?button('Open',`data-open-story="${esc(s.id)}"`):''}</div></li>`;}
  function assignmentList(a){const overdue=new Date(a.deadline)<new Date()&&a.status!=='Complete';return `<li class="nr-list-item"><div><strong>${esc(a.title)}</strong><p>${esc(a.desk)} · Due ${new Date(a.deadline).toLocaleString()} · ${esc(a.priority)}</p></div><div class="nr-list-actions">${status(overdue?'Overdue':a.status)}${a.reporter===currentUser().username?button('Update',`data-assignment-progress="${esc(a.id)}"`):''}</div></li>`;}
  function reviewCard(s){const owner=staffRecord(s.owner)?.name||s.author||s.owner||'Unassigned';const deadline=s.deadline?new Date(s.deadline):null;const overdue=deadline&&deadline<new Date()&&!['Published','Archived'].includes(s.status);const due=deadline?(' · '+(overdue?'OVERDUE · ':'Due ')+deadline.toLocaleString()):'';const returnAction=canRequestChanges(s)?button('Request changes',`data-request-changes-story="${esc(s.id)}"`,'nr-secondary nr-return-action'):'';return `<article class="nr-queue-card" data-review-card data-state="${esc(s.status)}" data-desk="${esc(s.desk)}" data-owner="${esc(s.owner)}"><div class="nr-queue-top"><div><h3>${esc(s.title)}</h3><p>${esc(owner)} · ${esc(s.desk)} · ${esc(s.premium?'Premium':'Public')}${esc(due)} · Updated ${esc(s.updated)}</p></div>${status(overdue?'Overdue':s.status)}</div><div class="nr-queue-meta">${button('Open review',`data-open-story="${esc(s.id)}"`,'nr-secondary')}${returnAction}${nextReviewButton(s)}</div></article>`;}
  function nextReviewButton(s){if(!isEditor())return'';const next={'Submitted':'Fact check','Fact check':'Health / Science review','Health / Science review':'Copy edit','Copy edit':'Editor review','Editor review':'Ready','Ready':'Published'}[s.status];return next?button(next==='Published'?'Publish':`Move to ${next}`,`data-transition-story="${esc(s.id)}" data-next="${esc(next)}"`,'nr-primary'):'';}
  function emptyRow(text){return `<li class="nr-empty"><strong>${esc(text)}</strong></li>`;} function empty(text){return `<div class="nr-empty"><strong>${esc(text)}</strong><p>There is nothing waiting here right now.</p></div>`;}

  function notificationTitle(n){
    const labels={mention:'Mention',assignment:'Assignment',review:'Review',urgent:'Urgent',announcement:'Announcement',newsletter:'Newsletter',moderation:'Moderation'};
    return labels[n.category]||String(n.eventType||'Newsroom update').replace(/[._]/g,' ');
  }
  function notificationItem(n,compact=false){
    const unread=!n.readAt;
    const detail=n.eventType==='story.changes_requested'?(String(n.payload?.title||'Story')+' — '+String(n.payload?.reason||'Changes requested')):(n.payload?.title||n.payload?.to_status||n.payload?.status||n.eventType||'Newsroom activity');
    const actions=[];
    if(!compact&&!n.readAt)actions.push(button('Mark read','data-notification-read="'+esc(n.id)+'"'));
    if(!compact&&n.requiresAck&&!n.acknowledgedAt)actions.push(button('Acknowledge','data-notification-ack="'+esc(n.id)+'"','nr-primary'));
    if(!compact)actions.push(button('Archive','data-notification-archive="'+esc(n.id)+'"'));
    return '<li class="nr-list-item '+(unread?'nr-unread':'')+'" data-inbox-row="'+esc(n.id)+'"><div><strong>'+esc(notificationTitle(n))+'</strong><p>'+esc(detail)+' · '+esc(displayTime(n.createdAt))+'</p></div><div class="nr-list-actions">'+(n.priority==='urgent'?'<span class="nr-tag">Urgent</span>':'')+actions.join('')+'</div></li>';
  }
  function renderInbox(){
    const rows=read(KEYS.notifications,[]).filter(n=>!n.archivedAt);
    const sum=read(KEYS.inboxSummary,{});
    return head('Inbox','Assignments, mentions, reviews, urgent work and announcements from the server-backed Newsroom.')
      +'<div class="nr-grid nr-grid-4">'
      +stat('Unread',sum.unread_total||0,'Items you have not read','blue')
      +stat('Mentions',sum.mentions||0,'Direct staff mentions','teal')
      +stat('Urgent',sum.urgent||0,'Priority coordination','red')
      +stat('Needs acknowledgement',sum.unacknowledged||0,'Required acknowledgements','amber')
      +'</div><section class="nr-panel nr-section-space"><div class="nr-filterbar">'
      +'<select data-inbox-filter><option value="all">All</option><option value="mentions">Mentions</option><option value="assignments">Assignments</option><option value="reviews">Reviews</option><option value="urgent">Urgent</option><option value="announcements">Announcements</option><option value="moderation">Moderation</option></select>'
      +'<button type="button" class="nr-secondary" data-inbox-refresh>Refresh</button></div><ul class="nr-list" data-inbox-list>'
      +(rows.map(n=>notificationItem(n)).join('')||emptyRow('Your Inbox is clear'))+'</ul></section>';
  }
  async function refreshInbox(filter='all'){
    try{
      const result=await api('listInbox',{filter,limit:50});
      write(KEYS.notifications,(result.rows||[]).map(n=>({id:n.id,eventType:n.event_type,targetTable:n.target_table,targetId:n.target_id,payload:n.payload||{},actorStaffId:n.actor_staff_id||null,category:n.category||'general',priority:n.priority||'normal',readAt:n.read_at||null,requiresAck:!!n.requires_ack,acknowledgedAt:n.acknowledged_at||null,archivedAt:n.archived_at||null,expiresAt:n.expires_at||null,createdAt:n.created_at})));
      write(KEYS.inboxSummary,result.summary||{});
      if(active==='inbox')showModule('inbox');else renderNav();
    }catch(error){toast(error.message);}
  }
  function threadMessages(threadId){return read(KEYS.messages,[]).filter(m=>m.thread_id===threadId);}
  function threadCard(t){
    const count=threadMessages(t.id).length;
    return '<article class="nr-queue-card"><div class="nr-queue-top"><div><h3>'+esc(t.title)+'</h3><p>'+esc(t.thread_type)+' · '+esc(t.priority)+' · '+count+' messages</p></div>'+status(t.status)+'</div><div class="nr-queue-meta">'+button('Open','data-thread-open="'+esc(t.id)+'"','nr-secondary')+'</div></article>';
  }
  function renderDesks(){
    const desks=read(KEYS.desks,[]).filter(d=>!d.archived_at);
    const threads=read(KEYS.threads,[]);
    const actions=has(CAP.DESK_MANAGE)?button('＋ Desk','data-create-desk','nr-primary'):'';
    return head('Desks','Private specialist coordination built on the AG-06 staff authority model.',actions)
      +'<div class="nr-grid nr-grid-2">'+(desks.map(d=>{
        const mine=threads.filter(t=>t.desk_id===d.id&&t.thread_type==='desk'&&t.status==='open');
        return '<section class="nr-panel"><div class="nr-panel-head"><div><h2>'+esc(d.name)+'</h2><p>'+esc(d.description||'Newsroom desk')+'</p></div>'+button('New thread','data-desk-thread-create="'+esc(d.id)+'"')+'</div>'+(mine.map(threadCard).join('')||empty('No active desk threads'))+'</section>';
      }).join('')||empty('No desks are available to this session'))+'</div>';
  }
  function renderThreadWorkspace(threadId){
    const t=read(KEYS.threads,[]).find(x=>x.id===threadId);
    if(!t)return empty('Thread is not available');
    const messages=threadMessages(threadId);
    return head(t.title,'Private '+t.thread_type+' coordination. Persisted messages remain server-authoritative.',button('Back',t.thread_type==='breaking'?'data-module-jump="breaking"':'data-module-jump="desks"'))
      +'<section class="nr-panel"><div class="nr-thread-messages">'+(messages.map(m=>{
        const person=getStaff().find(s=>s.id===m.author_staff_id);
        return '<article class="nr-comment"><strong>'+esc(person?.name||'Newsroom')+'</strong><time>'+esc(displayTime(m.created_at))+'</time><p>'+esc(m.body)+'</p></article>';
      }).join('')||empty('No messages yet'))+'</div>'
      +(t.status==='open'?'<form class="nr-comment-form" data-thread-message-form="'+esc(t.id)+'"><textarea name="message" rows="3" placeholder="Message this coordination room. Use @handle to mention authorised staff."></textarea><button class="nr-primary" type="submit">Send</button></form>':'')+'</section>';
  }
  function openThreadWorkspace(threadId){
    if(!read(KEYS.threads,[]).some(t=>t.id===threadId)){toast('Thread is not available to this session.');return;}
    $('[data-workspace]').innerHTML=renderThreadWorkspace(threadId);setCrumb('Discussion');
  }
  async function openAssignmentDiscussion(assignmentId){
    let thread=read(KEYS.threads,[]).find(t=>t.thread_type==='assignment'&&t.assignment_id===assignmentId&&t.status==='open');
    try{
      if(!thread){
        const assignment=getAssignments().find(a=>a.id===assignmentId);
        const result=await api('createThread',{threadType:'assignment',title:(assignment?.title||'Assignment')+' discussion',assignmentId});
        await refreshData();
        thread=read(KEYS.threads,[]).find(t=>t.id===result.id);
      }
      if(thread)openThreadWorkspace(thread.id);
    }catch(error){toast(error.message);}
  }
  async function createDeskFromUi(){
    const name=prompt('Desk name');if(!name)return;
    const key=prompt('Desk key (letters, numbers, dash or underscore)',slugify(name).replace(/-/g,'_'));if(!key)return;
    try{await api('createDesk',{key,name});await refreshData();showModule('desks');toast('Desk created');}catch(error){toast(error.message);}
  }
  async function createDeskThreadFromUi(deskId){
    const title=prompt('Desk thread title');if(!title)return;
    try{const result=await api('createThread',{threadType:'desk',title,deskId});await refreshData();openThreadWorkspace(result.id);}catch(error){toast(error.message);}
  }
  async function createBreakingFromUi(){
    const title=prompt('Breaking room title');if(!title)return;
    try{const result=await api('createThread',{threadType:'breaking',title,priority:'urgent'});await refreshData();openThreadWorkspace(result.id);}catch(error){toast(error.message);}
  }
  async function refreshModeration(){
    if(!has(CAP.COMMENT_MODERATE))return;
    try{
      const result=await api('listModerationQueue',{limit:50});
      write(KEYS.moderation,result.rows||[]);
      if(active==='moderation')$('[data-workspace]').innerHTML=renderModeration();
    }catch(error){toast(error.message);}
  }
  function renderModeration(){
    const rows=read(KEYS.moderation,[]);
    return head('Moderation','Verified-reader discussion review. Verification is not treated as trust.',button('Refresh','data-moderation-refresh','nr-secondary'))
      +'<section class="nr-panel">'+(rows.map(c=>{
        const actions=[];
        if(c.state==='PENDING'||c.state==='HELD'||c.state==='HIDDEN'||c.state==='REJECTED')actions.push(button('Publish','data-moderate-comment="'+esc(c.id)+'" data-moderation-action="publish"','nr-primary'));
        if(c.state==='PENDING')actions.push(button('Hold','data-moderate-comment="'+esc(c.id)+'" data-moderation-action="hold"'));
        if(c.state==='PENDING'||c.state==='HELD')actions.push(button('Reject','data-moderate-comment="'+esc(c.id)+'" data-moderation-action="reject"'));
        if(c.state==='PUBLISHED')actions.push(button('Hide','data-moderate-comment="'+esc(c.id)+'" data-moderation-action="hide"'));
        if(c.state!=='REMOVED')actions.push(button('Remove','data-moderate-comment="'+esc(c.id)+'" data-moderation-action="remove"','nr-danger'));
        if(has(CAP.COMMENT_RESTRICT))actions.push(button('Restrict reader','data-restrict-reader="'+esc(c.author_profile_id)+'"'));
        return '<article class="nr-queue-card"><div class="nr-queue-top"><div><h3>Reader comment</h3><p>'+esc(c.body)+'</p><small>Story '+esc(c.story_id)+' · '+esc(displayTime(c.created_at))+'</small></div>'+status(c.state)+'</div><div class="nr-queue-meta">'+actions.join('')+'</div></article>';
      }).join('')||empty('Moderation queue is clear'))+'</section>';
  }
  function newsroomAgenda({todayOnly=false,limit=30}={}){
    const start=new Date();start.setHours(0,0,0,0);
    const end=new Date(start);end.setDate(end.getDate()+(todayOnly?1:30));
    const items=[];
    for(const a of getAssignments()){
      if(!a.deadline||a.status==='Complete')continue;
      const at=new Date(a.deadline);if(!Number.isFinite(at.getTime())||at<start||at>=end)continue;
      items.push({at,title:a.title,kind:'Deadline',detail:`${a.desk||'Newsroom'} · ${staffRecord(a.reporter)?.name||a.reporter||'Unassigned'}`});
    }
    for(const s of getStories()){
      if(!s.schedule)continue;
      const at=new Date(s.schedule);if(!Number.isFinite(at.getTime())||at<start||at>=end)continue;
      items.push({at,title:s.title||'Untitled story',kind:'Publication',detail:`${s.desk||'Newsroom'} · ${s.status||'Scheduled'}`});
    }
    return items.sort((a,b)=>a.at-b.at).slice(0,limit);
  }
  function agendaMarkup(items,{showDate=false}={}){
    return items.map(item=>{
      const stamp=showDate
        ? item.at.toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})
        : item.at.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
      return `<div class="nr-calendar-time">${esc(stamp)}</div><div class="nr-calendar-event" data-kind="${esc(item.kind)}"><strong>${esc(item.title)}</strong><span>${esc(item.kind)} · ${esc(item.detail)}</span></div>`;
    }).join('');
  }
  function todayPanel(){
    const items=newsroomAgenda({todayOnly:true,limit:6});
    const body=items.length?`<div class="nr-calendar">${agendaMarkup(items)}</div>`:empty('No scheduled newsroom items today');
    return `<section class="nr-panel"><div class="nr-panel-head"><div><h2>Today</h2><p>Live assignment and publication deadlines</p></div><button data-module-jump="calendar">Calendar →</button></div>${body}</section>`;
  }
  function notificationPanel(){const rows=read(KEYS.notifications,[]).filter(n=>!n.archivedAt).slice(0,5);return '<section class="nr-panel"><div class="nr-panel-head"><div><h2>Notifications</h2><p>Durable activity requiring your attention</p></div><button data-module-jump="inbox">Open Inbox →</button></div><ul class="nr-list">'+(rows.map(n=>notificationItem(n,true)).join('')||emptyRow('Your Inbox is clear'))+'</ul></section>';}
  function personalPerformancePanel(stories){return `<section class="nr-panel"><div class="nr-panel-head"><div><h2>Your work</h2><p>Current publishing record</p></div></div><ul class="nr-list"><li class="nr-list-item"><div><strong>Stories in workspace</strong><p>Owned or assigned</p></div><span class="nr-tag">${stories.length}</span></li><li class="nr-list-item"><div><strong>Published</strong><p>Current local publication dataset</p></div><span class="nr-tag">${stories.filter(s=>s.status==='Published').length}</span></li><li class="nr-list-item"><div><strong>Premium research</strong><p>Research-led work</p></div><span class="nr-tag">${stories.filter(s=>s.premium).length}</span></li></ul></section>`;}
  function publicationPulse(){const s=getStories();return `<section class="nr-panel"><div class="nr-panel-head"><div><h2>Publication pulse</h2><p>Structural newsroom metrics</p></div></div><ul class="nr-list"><li class="nr-list-item"><div><strong>Published</strong><p>Current story dataset</p></div><span class="nr-tag">${s.filter(x=>x.status==='Published').length}</span></li><li class="nr-list-item"><div><strong>In production</strong><p>Not yet published or archived</p></div><span class="nr-tag">${s.filter(x=>!['Published','Archived'].includes(x.status)).length}</span></li><li class="nr-list-item"><div><strong>Desks represented</strong><p>Active editorial coverage</p></div><span class="nr-tag">${new Set(s.map(x=>x.desk)).size}</span></li></ul></section>`;}
  function commercialPulse(){return `<section class="nr-panel"><div class="nr-panel-head"><div><h2>Commercial operations</h2><p>Inventory and membership readiness</p></div></div><ul class="nr-list"><li class="nr-list-item"><div><strong>HOSPAZ campaign</strong><p>Masthead · homepage · article</p></div>${status('Active')}</li><li class="nr-list-item"><div><strong>Premium proposition</strong><p>US$5 / month · research access</p></div><span class="nr-tag">Live</span></li><li class="nr-list-item"><div><strong>Commercial/editorial wall</strong><p>Story editing withheld from commercial role</p></div><span class="nr-tag">Enforced</span></li></ul></section>`;}
  function securityPulse(){return `<section class="nr-panel"><div class="nr-panel-head"><div><h2>Security</h2><p>Account governance</p></div><button data-module-jump="security">Open →</button></div><ul class="nr-list"><li class="nr-list-item"><div><strong>Role-based permissions</strong><p>Capability model active</p></div><span class="nr-tag">Active</span></li><li class="nr-list-item"><div><strong>MFA readiness</strong><p>Production integration required</p></div><span class="nr-tag">Prepared</span></li></ul></section>`;}
  function subscriberPulse(){return `<section class="nr-panel"><div class="nr-panel-head"><div><h2>Membership operations</h2><p>Premium product readiness</p></div><button data-module-jump="subscribers">Open →</button></div><ul class="nr-list"><li class="nr-list-item"><div><strong>Monthly membership</strong><p>US$5 proposition</p></div><span class="nr-tag">Configured</span></li><li class="nr-list-item"><div><strong>Premium preview</strong><p>Per-reader, per-story 30-second contract</p></div><span class="nr-tag">Active</span></li></ul></section>`;}
  function distributionQueue(){return `<section class="nr-panel"><div class="nr-panel-head"><div><h2>Distribution queue</h2><p>Scheduled editorial editions</p></div></div><ul class="nr-list"><li class="nr-list-item"><div><strong>Friday HealthTimes Weekly</strong><p>Email + WhatsApp · Friday 12:00</p></div>${status('Scheduled')}</li><li class="nr-list-item"><div><strong>Premium Intelligence</strong><p>Email · Friday 16:00</p></div>${status('Draft')}</li><li class="nr-list-item"><div><strong>Breaking health alerts</strong><p>Browser + WhatsApp selection</p></div><span class="nr-tag">Continuous</span></li></ul></section>`;}
  function audienceTopicPanel(){return `<section class="nr-panel"><div class="nr-panel-head"><div><h2>Reader interests</h2><p>Preference taxonomy</p></div></div><div class="nr-trend-list">${[['Global Health','76'],['HIV/AIDS','68'],['Health Policy','61'],['Research','54'],['Mental Health','47']].map((x,i)=>`<div class="nr-trend-row"><span class="nr-rank">0${i+1}</span><div><strong>${x[0]}</strong><div class="nr-progress"><span style="width:${x[1]}%"></span></div></div><span>${x[1]} index</span></div>`).join('')}</div></section>`;}
  function trendingPanel(){return `<section class="nr-panel"><div class="nr-panel-head"><div><h2>Trending topics</h2><p>Editorial attention signals</p></div><button data-module-jump="trending">Details →</button></div><div class="nr-trend-list">${[['Mpox','41'],['Malaria vaccines','32'],['Health financing','18'],['HIV prevention','12']].map((x,i)=>`<div class="nr-trend-row"><span class="nr-rank">0${i+1}</span><strong>${x[0]}</strong><span>↑ ${x[1]}%</span></div>`).join('')}</div></section>`;}
  function deskActivity(){const s=getStories();return `<div class="nr-trend-list">${[...new Set(s.map(x=>x.desk))].map((d,i)=>{const n=s.filter(x=>x.desk===d).length;return `<div class="nr-trend-row"><span class="nr-rank">${String(i+1).padStart(2,'0')}</span><div><strong>${esc(d)}</strong><div class="nr-progress"><span style="width:${Math.min(100,n*22)}%"></span></div></div><span>${n} stories</span></div>`}).join('')}</div>`;}

  function storyTable(list){return `<div class="nr-table-wrap"><table class="nr-table"><thead><tr><th>Story</th><th>Desk</th><th>Owner</th><th>Status</th><th>Deadline</th><th>Access</th><th>Actions</th></tr></thead><tbody>${list.map(s=>`<tr><td class="nr-title-cell"><strong>${esc(s.title)}</strong><span>${esc(s.section)} · Updated ${esc(s.updated)}</span></td><td>${esc(s.desk)}</td><td>${esc(staffRecord(s.owner)?.name||s.author)}</td><td>${status(s.status)}</td><td>${s.deadline?esc(new Date(s.deadline).toLocaleString()):'—'}</td><td><span class="nr-tag">${s.premium?'Premium':'Public'}</span></td><td><div class="nr-table-actions">${canEditStory(s)?`<button data-open-story="${esc(s.id)}">Open</button>`:''}${has(CAP.STORY_PUBLISH)&&['Ready','Scheduled'].includes(s.status)?`<button data-transition-story="${esc(s.id)}" data-next="Published">Publish</button>`:''}</div></td></tr>`).join('')}</tbody></table></div>`;}
  function renderStories(){const list=getStories();return `${head('Stories','Search and manage the complete editorial workflow.',has(CAP.STORY_CREATE)?button('＋ New story','data-quick-create','nr-primary'):'')}<section class="nr-panel"><div class="nr-filterbar"><input data-story-search placeholder="Search stories…"><select data-story-status><option value="">All statuses</option>${WORKFLOW.map(x=>`<option>${esc(x)}</option>`).join('')}</select><select data-story-desk><option value="">All desks</option>${DESKS.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div><div data-story-table>${storyTable(list)}</div></section>`;}
  function renderMyStories(){const u=currentUser(),assignedIds=new Set(getAssignments().filter(a=>a.reporter===u.username).map(a=>a.storyId)),list=getStories().filter(s=>s.owner===u.username||assignedIds.has(s.id));return `${head('My stories','Everything you own or are actively reporting.',has(CAP.STORY_CREATE)?button('＋ New story','data-quick-create','nr-primary'):'')}<section class="nr-panel">${storyTable(list)}</section>`;}
  function renderSaved(){return `${head('Saved','Pinned working views and important newsroom references.')}${empty('No saved newsroom views yet')}`;}
  function renderMyAssignments(){const u=currentUser(),list=getAssignments().filter(a=>a.reporter===u.username);return `${head('My assignments','Accept, report and submit work assigned to you.')}<section class="nr-panel"><ul class="nr-list">${list.map(a=>assignmentList(a)).join('')||emptyRow('No assignments')}</ul></section>`;}
  function renderAssignments(){const list=getAssignments();return `${head('Assignments Desk','Create, monitor and rebalance reporting assignments.',has(CAP.ASSIGN_CREATE)?button('＋ Create assignment','data-open-assignment','nr-primary'):'')}<section class="nr-panel"><div class="nr-table-wrap"><table class="nr-table"><thead><tr><th>Assignment</th><th>Reporter</th><th>Desk</th><th>Deadline</th><th>Priority</th><th>Status</th><th>Action</th></tr></thead><tbody>${list.map(a=>{const overdue=new Date(a.deadline)<new Date()&&a.status!=='Complete';return `<tr><td class="nr-title-cell"><strong>${esc(a.title)}</strong><span>${esc(a.notes)}</span></td><td>${esc(staffRecord(a.reporter)?.name||a.reporter)}</td><td>${esc(a.desk)}</td><td>${esc(new Date(a.deadline).toLocaleString())}</td><td><span class="nr-tag">${esc(a.priority)}</span></td><td>${status(overdue?'Overdue':a.status)}</td><td>${a.reporter===currentUser().username?button('Advance',`data-assignment-progress="${esc(a.id)}"`):''}${button('Discuss',`data-assignment-discuss="${esc(a.id)}"`)}</td></tr>`}).join('')}</tbody></table></div></section>`;}
  function reviewQueueStories(){return getStories().filter(s=>['Submitted','Fact check','Health / Science review','Copy edit','Editor review','Ready'].includes(s.status));}
  function reviewQueueFiltered(){
    let list=reviewQueueStories();
    const state=$('[data-review-state]')?.value||'',desk=$('[data-review-desk]')?.value||'',owner=$('[data-review-owner]')?.value||'',deadline=$('[data-review-deadline]')?.value||'';
    if(state)list=list.filter(s=>s.status===state);
    if(desk)list=list.filter(s=>s.desk===desk);
    if(owner)list=list.filter(s=>s.owner===owner);
    if(deadline==='overdue')list=list.filter(s=>s.deadline&&new Date(s.deadline)<new Date());
    if(deadline==='due')list=list.filter(s=>s.deadline&&new Date(s.deadline)>=new Date());
    return list.sort((a,b)=>{
      const ad=a.deadline?new Date(a.deadline).getTime():Number.MAX_SAFE_INTEGER;
      const bd=b.deadline?new Date(b.deadline).getTime():Number.MAX_SAFE_INTEGER;
      return ad-bd;
    });
  }
  function refreshReviewQueue(){const mount=$('[data-review-list]');if(mount){const list=reviewQueueFiltered();mount.innerHTML=list.map(reviewCard).join('')||empty('No stories match these review filters');}}
  function renderReview(){const list=reviewQueueStories(),desks=[...new Set(list.map(s=>s.desk).filter(Boolean))].sort(),owners=[...new Set(list.map(s=>s.owner).filter(Boolean))];return `${head('Review Queue','Submitted work, evidence checks and publication decisions.')}<section class="nr-panel"><div class="nr-filterbar nr-review-filters"><select data-review-state><option value="">All workflow states</option>${['Submitted','Fact check','Health / Science review','Copy edit','Editor review','Ready'].map(x=>`<option>${esc(x)}</option>`).join('')}</select><select data-review-desk><option value="">All desks</option>${desks.map(x=>`<option>${esc(x)}</option>`).join('')}</select><select data-review-owner><option value="">All reporters</option>${owners.map(x=>`<option value="${esc(x)}">${esc(staffRecord(x)?.name||x)}</option>`).join('')}</select><select data-review-deadline><option value="">All deadlines</option><option value="overdue">Overdue first</option><option value="due">Upcoming deadlines</option></select></div><div data-review-list>${list.map(reviewCard).join('')||empty('Review queue is clear')}</div></section>`;}
  function renderCalendar(){const events=newsroomAgenda({limit:30});const body=events.length?`<div class="nr-calendar">${agendaMarkup(events,{showDate:true})}</div>`:empty('No assignment or publication deadlines are scheduled in the next 30 days');return `${head('Editorial Calendar','Server-backed assignment deadlines and scheduled publication work.',has(CAP.ASSIGN_CREATE)?button('＋ Assignment','data-open-assignment','nr-primary'):'')}<section class="nr-panel">${body}</section>`;}
  function renderBreaking(){const rows=read(KEYS.threads,[]).filter(t=>t.thread_type==='breaking'&&t.status==='open');const actions=has(CAP.BREAKING_MANAGE)?button('＋ Breaking room','data-create-breaking','nr-primary'):'';return head('Breaking','Temporary event coordination with bounded membership and optional Presence.',actions)+'<section class="nr-panel">'+(rows.map(threadCard).join('')||empty('No active breaking rooms'))+'</section>';}
  function renderCorrections(){return `${head('Corrections','Published changes, corrections and accountability record.')}<section class="nr-panel">${getStories().filter(s=>['Updated / Corrected'].includes(s.status)).map(storyList).join('')||empty('No corrections are waiting')}</section>`;}
  function mediaCard(m,{modal=false,storyId='',usageType='inline'}={}){
    const usages=m.usages||[],usageText=usages.length?(usages.length+' story '+(usages.length===1?'use':'uses')):'Unused';
    const custody=m.storageBucket==='newsroom-private'?'Private Newsroom':m.storageBucket==='migrated-media'?'Migrated/source custody':'Source media';
    const buttons=[button('Preview','data-media-preview="'+esc(m.id)+'"','nr-secondary')];
    const story=getStories().find(s=>s.id===storyId);
    const compatible=(usageType==='supporting_document')?mediaKind(m)==='Document':mediaKind(m)==='Image';
    const canAttach=modal&&story&&canEditStory(story)&&m.storageBucket==='newsroom-private'&&m.status==='private_ready'&&compatible;
    if(canAttach)buttons.push(button('Attach','data-media-attach="'+esc(m.id)+'"','nr-primary'));
    return '<article class="nr-media-card" data-media-id="'+esc(m.id)+'" data-media-kind="'+esc(mediaKind(m))+'" data-media-status="'+esc(m.status)+'"><div class="nr-media-card-top"><span class="nr-tag">'+esc(mediaKind(m))+'</span><span class="nr-tag">'+esc(custody)+'</span></div><strong>'+esc(m.filename)+'</strong><span>'+esc(m.caption||m.altText||'No caption')+'</span><span>'+(m.credit?('Credit: '+esc(m.credit)):'No credit supplied')+'</span><span>'+esc(usageText)+' · '+esc(m.status)+'</span><span class="nr-media-provenance">'+esc(m.sourceProvenance||'Provenance not recorded')+'</span><div class="nr-list-actions">'+buttons.join('')+'</div></article>';
  }
  function mediaLibraryFiltered(){
    const q=String($('[data-media-library-search]')?.value||'').trim().toLowerCase(),kind=$('[data-media-library-type]')?.value||'',state=$('[data-media-library-state]')?.value||'';
    return getMedia().filter(m=>(!q||[m.filename,m.caption,m.credit,m.sourceProvenance].some(v=>String(v||'').toLowerCase().includes(q)))&&(!kind||mediaKind(m)===kind)&&(!state||m.status===state));
  }
  function refreshMediaLibrary(){const mount=$('[data-media-library-grid]');if(mount){const rows=mediaLibraryFiltered();mount.innerHTML=rows.map(m=>mediaCard(m)).join('')||'<div class="nr-empty"><strong>No authorised media matches these filters</strong><p>Upload media from a story or change the current filters.</p></div>';}}
  function renderMedia(){const rows=getMedia();return `${head('Media Library','Server-backed editorial media. New draft uploads remain private until an authorised publication-media handoff exists.',has(CAP.MEDIA)?button('＋ Add media','data-open-media-library','nr-primary'):'')}<section class="nr-panel"><div class="nr-filterbar"><input data-media-library-search placeholder="Search filename, caption, credit or source…"><select data-media-library-type><option value="">All types</option><option>Image</option><option>Document</option></select><select data-media-library-state><option value="">All states</option><option value="upload_pending">Upload pending</option><option value="private_ready">Private draft</option><option value="published">Published</option></select></div><div class="nr-media-grid" data-media-library-grid>${rows.map(m=>mediaCard(m)).join('')||'<div class="nr-empty"><strong>No authorised media yet</strong><p>Choose Add media and select an editable story to upload the first private asset.</p></div>'}</div></section>`;}
  function personCard(s){return `<article class="nr-person-card"><span class="nr-avatar">${esc(initials(s.name))}</span><div><strong>${esc(s.name)}</strong><span>${esc(s.role)}</span><span>${esc(s.desk)} · ${esc(s.beat)}</span></div></article>`;}
  function renderAuthors(){return `${head('Authors','Staff identity, beats and public author authority.')}<section class="nr-panel"><div class="nr-staff-card-grid">${getStaff().filter(s=>!['Commercial Manager','Subscriber Manager'].includes(s.role)).map(personCard).join('')}</div></section>`;}
  function renderTopics(){const topics=['HIV/AIDS','Malaria','Outbreaks','Medicines','Health financing','Mental health','Maternal health','Research','Health systems','Innovation'];return `${head('Topics','Editorial subject taxonomy used for reporting, SEO and reader follows.')}<section class="nr-panel"><div class="nr-source-grid">${topics.map(t=>`<article class="nr-source-card"><strong>${esc(t)}</strong><span>${getStories().filter(s=>s.topic===t).length} mapped stories</span><span>Topic hub ready</span></article>`).join('')}</div></section>`;}
  function renderRegions(){return `${head('Countries & regions','Global health coverage with Africa as a primary editorial advantage.')}<section class="nr-panel"><div class="nr-source-grid">${REGIONS.map(r=>`<article class="nr-source-card"><strong>${esc(r)}</strong><span>${getStories().filter(s=>s.region===r).length} current stories</span><span>Desk taxonomy active</span></article>`).join('')}</div></section>`;}
  function renderSources(){return `${head('Research / Sources','Primary documents and evidence used across HealthTimes reporting.')}<section class="nr-panel"><div class="nr-source-grid">${[['Parliamentary Committee evidence','Institutional source','NatPharm investigation'],['National AIDS Council briefing','Institutional source','STI coverage'],['Africa CDC surveillance','Public-health source','Outbreak Watch'],['WHO outbreak notices','Global source','Africa outbreak coverage'],['National Health Strategy','Policy document','Implementation tracker'],['Peer-reviewed literature','Research source','Premium analysis']].map(x=>`<article class="nr-source-card"><strong>${x[0]}</strong><span>${x[1]}</span><span>Used in: ${x[2]}</span></article>`).join('')}</div></section>`;}
  function renderArchive(){return `${head('Archive','Published, corrected and archived editorial inventory.')}<section class="nr-panel">${storyTable(getStories().filter(s=>['Published','Updated / Corrected','Archived'].includes(s.status)))}</section>`;}

  function renderHomepage(){return `${head('Homepage','Editorial homepage curation and distribution readiness.')}<section class="nr-panel"><div class="nr-panel-head"><div><h2>Current homepage candidates</h2><p>Published stories selected for front-page treatment</p></div></div><ul class="nr-list">${getStories().filter(s=>s.distribution?.homepage).map(storyList).join('')}</ul></section>`;}
  function renderNewsletter(){return `${head('Newsletters','Build recurring editorial editions from approved HealthTimes reporting.')}<div class="nr-grid nr-grid-2"><section class="nr-panel"><div class="nr-panel-head"><div><h2>HealthTimes Weekly</h2><p>Friday · Email + WhatsApp</p></div>${status('Scheduled')}</div><ul class="nr-list"><li class="nr-list-item"><div><strong>Selected stories</strong><p>5 public + 1 Premium research item</p></div><span class="nr-tag">6</span></li><li class="nr-list-item"><div><strong>Editorial lock</strong><p>Friday 10:00</p></div><span class="nr-tag">Pending</span></li></ul></section><section class="nr-panel"><div class="nr-panel-head"><div><h2>Premium Intelligence</h2><p>Member research briefing</p></div>${status('Draft')}</div><ul class="nr-list"><li class="nr-list-item"><div><strong>Research notes</strong><p>Policy + financing + evidence</p></div><span class="nr-tag">3</span></li></ul></section></div>`;}
  function renderWhatsApp(){return `${head('WhatsApp Desk','Article distribution, reader comments and recurring briefing operations.')}<section class="nr-panel"><ul class="nr-list"><li class="nr-list-item"><div><strong>Weekly health briefing</strong><p>Friday 12:00 · publication channel</p></div>${status('Scheduled')}</li><li class="nr-list-item"><div><strong>Reader comments</strong><p>Route corrections, tips and feedback to the appropriate desk</p></div><span class="nr-tag">Open</span></li><li class="nr-list-item"><div><strong>Breaking alerts</strong><p>Requires editor-approved story selection</p></div><span class="nr-tag">Ready</span></li></ul></section>`;}
  function renderSocial(){return `${head('Social Desk','Coordinate HealthTimes reporting across social channels without changing editorial copy.')}<section class="nr-panel"><div class="nr-source-grid">${['WhatsApp','Facebook','X','LinkedIn','Instagram','YouTube'].map(x=>`<article class="nr-source-card"><strong>${x}</strong><span>Distribution channel</span><span>Editorial approval required for breaking alerts</span></article>`).join('')}</div></section>`;}
  function renderPush(){return `${head('Push alerts','High-priority browser/app notifications tied to approved reporting.')}<section class="nr-panel">${empty('No push alert is currently queued')}</section>`;}

  function renderAnalytics(){const s=getStories();return `${head('Analytics','Structural publication metrics plus the presentation layer for production audience analytics.')}<div class="nr-note">Story inventory and workflow counts are derived from the local editorial dataset. Reach and engagement panels illustrate the production analytics surface and require a real event pipeline before launch.</div><div class="nr-grid nr-grid-4">${stat('Stories',s.length,'Current editorial inventory','teal')}${stat('Published',s.filter(x=>x.status==='Published').length,'Current published records','green')}${stat('In review',s.filter(x=>['Submitted','Fact check','Health / Science review','Copy edit','Editor review'].includes(x.status)).length,'Review workflow','amber')}${stat('Desks',new Set(s.map(x=>x.desk)).size,'Coverage groups represented','blue')}</div><div class="nr-dashboard-columns"><section class="nr-panel"><div class="nr-panel-head"><div><h2>Desk mix</h2><p>Current editorial inventory</p></div></div>${deskActivity()}</section><section class="nr-panel"><div class="nr-panel-head"><div><h2>Production analytics integration</h2><p>Planned live metrics</p></div></div><ul class="nr-list"><li class="nr-list-item"><div><strong>Engaged reading time</strong><p>Requires event analytics</p></div><span class="nr-tag">Connect</span></li><li class="nr-list-item"><div><strong>Country & referral</strong><p>Global audience acquisition</p></div><span class="nr-tag">Connect</span></li><li class="nr-list-item"><div><strong>Premium conversion</strong><p>Requires billing + entitlement analytics</p></div><span class="nr-tag">Connect</span></li></ul></section></div>`;}
  function renderTrending(){return `${head('Trending','Topic and story signals for editorial prioritisation.')}${trendingPanel()}<section class="nr-panel nr-section-space"><div class="nr-panel-head"><div><h2>Story intelligence</h2><p>Presentation model for live production metrics</p></div></div><div class="nr-table-wrap"><table class="nr-table"><thead><tr><th>Story</th><th>Reads</th><th>Engaged time</th><th>Completion</th><th>Shares</th><th>Saves</th><th>Premium joins</th></tr></thead><tbody><tr><td class="nr-title-cell"><strong>Parliament Probes NatPharm...</strong></td><td>Live integration</td><td>Live integration</td><td>Live integration</td><td>Live integration</td><td>Live integration</td><td>Live integration</td></tr></tbody></table></div></section>`;}
  function renderSEO(){return `${head('SEO Desk','Search presentation, metadata completeness and topic authority.')}<section class="nr-panel"><div class="nr-table-wrap"><table class="nr-table"><thead><tr><th>Story</th><th>SEO title</th><th>Meta</th><th>Slug</th><th>Region</th></tr></thead><tbody>${getStories().map(s=>`<tr><td class="nr-title-cell"><strong>${esc(s.title)}</strong></td><td>${s.seoTitle?'Ready':'Missing'}</td><td>${s.metaDescription?'Ready':'Missing'}</td><td>${esc(s.slug||'—')}</td><td>${esc(s.region)}</td></tr>`).join('')}</tbody></table></div></section>`;}
  function renderCitations(){return `${head('Citations & Impact','Build HealthTimes into a globally citable health-research publication.')}<div class="nr-note">External citation counts require backlink, academic and institutional integrations. This workspace defines the operating model without presenting unverified live counts.</div><div class="nr-grid nr-grid-4">${stat('Citation-ready research',getStories().filter(s=>s.premium&&s.sources).length,'Premium stories with sources','teal')}${stat('Source-backed stories',getStories().filter(s=>s.sources).length,'Stories with evidence records','blue')}${stat('External citations','Connect','Backlink / scholarly integration','amber')}${stat('Institutional mentions','Connect','Government / NGO monitoring','green')}</div><section class="nr-panel nr-section-space"><div class="nr-panel-head"><div><h2>Research impact queue</h2><p>Stories positioned for citation tracking</p></div></div><ul class="nr-list">${getStories().filter(s=>s.premium).map(s=>`<li class="nr-list-item"><div><strong>${esc(s.title)}</strong><p>${esc(s.sources||'Sources pending')}</p></div><span class="nr-tag">Track citations</span></li>`).join('')}</ul></section>`;}
  function renderAI(){return `${head('AI Desk','Editorial assistance for evidence, source discovery and newsroom context — never automatic publishing.')}<div class="nr-grid nr-grid-3">${[['Evidence gaps','Check a draft for factual claims without attached sources.'],['Archive context','Find related HealthTimes reporting and internal links.'],['Source summary','Summarise a document for editorial review.'],['Interview questions','Generate questions from the reporting brief and known evidence.'],['SEO alternatives','Suggest precise headlines and descriptions without changing copy automatically.'],['Citation check','Flag missing references and evidence metadata.']].map(x=>`<section class="nr-panel"><div class="nr-panel-head"><div><h2>${x[0]}</h2><p>${x[1]}</p></div></div><div style="padding:14px">${button('Open tool','','nr-secondary')}</div></section>`).join('')}</div>`;}

  function renderPremium(){const list=getStories().filter(s=>s.premium||has(CAP.PREMIUM_ASSIGN));return `${head('Premium','Research access, publishing stage and membership value.',has(CAP.PREMIUM_MANAGE)?button('View membership operations','data-module-jump="subscribers"','nr-secondary'):'')}<section class="nr-panel" data-v21-premium-admin><div class="nr-panel-head"><div><h2>Premium publishing controls</h2><p>Authorised changes update the public story access override.</p></div></div><div class="nr-table-wrap"><table class="nr-table"><thead><tr><th>Story</th><th>Status</th><th>Sources</th><th>Access</th><th>Action</th></tr></thead><tbody>${list.map(s=>`<tr><td class="nr-title-cell"><strong>${esc(s.title)}</strong><span>${esc(s.desk)}</span></td><td>${status(s.status)}</td><td>${s.sources?'Recorded':'Needs sources'}</td><td><span class="nr-tag">${s.premium?'Premium':'Public'}</span></td><td>${has(CAP.PREMIUM_ASSIGN)?`<button class="nr-secondary" data-v21-premium-toggle="${esc(s.id)}">${s.premium?'Make public':'Make Premium'}</button>`:'—'}</td></tr>`).join('')}</tbody></table></div></section>`;}
  function renderSubscribers(){return `${head('Subscribers','Membership service, reader accounts and Premium support operations.')}<div class="nr-grid nr-grid-3">${stat('Membership price','US$5','Monthly Premium proposition','teal')}${stat('Preview contract','30 sec','Per-reader, per-story access','amber')}${stat('Billing','Connect','Production payment provider required','blue')}</div><section class="nr-panel nr-section-space"><div class="nr-panel-head"><div><h2>Subscriber operations</h2><p>Production identity and billing service integration points</p></div></div><ul class="nr-list"><li class="nr-list-item"><div><strong>Reader identity</strong><p>Account, saved stories and preferences</p></div><span class="nr-tag">Frontend ready</span></li><li class="nr-list-item"><div><strong>Entitlements</strong><p>Server-side membership required for production</p></div><span class="nr-tag">Integrate</span></li><li class="nr-list-item"><div><strong>Support status</strong><p>Subscriber manager workflow</p></div><span class="nr-tag">Prepared</span></li></ul></section>`;}
  function campaignTable(list){return `<div class="nr-table-wrap"><table class="nr-table"><thead><tr><th>Campaign</th><th>Advertiser</th><th>Placement</th><th>Dates</th><th>Status</th><th>Review</th></tr></thead><tbody>${list.map(c=>`<tr><td class="nr-title-cell"><strong>${esc(c.name)}</strong><span>${esc(c.label||'Advertisement')}</span></td><td>${esc(c.advertiser)}</td><td>${esc((c.placement||[]).join(' · '))}</td><td>${esc(c.start)} → ${esc(c.end)}</td><td>${status(c.status)}</td><td><span class="nr-tag">${esc(c.review)}</span></td></tr>`).join('')}</tbody></table></div>`;}
  function renderAdvertising(){return `${head('Advertising','Paid inventory, campaign governance and commercial review.',has(CAP.ADS_CREATE)?button('＋ New campaign','data-open-campaign','nr-primary'):'')}<div class="nr-note">Commercial staff can manage advertising and membership operations but cannot edit newsroom stories.</div><section class="nr-panel"><div class="nr-panel-head"><div><h2>Campaign inventory</h2><p>Masthead, in-feed, article and briefing placements</p></div></div>${campaignTable(read(KEYS.campaigns,[]))}</section><section class="nr-panel nr-section-space"><div class="nr-panel-head"><div><h2>HOSPAZ creative</h2><p>Current paid campaign retained from the source publication</p></div></div><div style="padding:14px"><img src="${HOSPAZ}" alt="HOSPAZ Annual General Meeting advertisement" style="display:block;width:100%;height:auto;object-fit:contain;border-radius:8px"></div></section>`;}

  function renderStaff(){const list=getStaff();return `${head('Staff & Access','Invite, assign, suspend and revoke Newsroom access.',has(CAP.STAFF_INVITE)?button('＋ Invite staff','data-open-invite','nr-primary'):'')}<section class="nr-panel"><div class="nr-table-wrap"><table class="nr-table"><thead><tr><th>Staff</th><th>Role</th><th>Desk</th><th>Status</th><th>Last login</th><th>Security</th><th>Actions</th></tr></thead><tbody>${list.map(s=>`<tr><td class="nr-title-cell"><strong>${esc(s.name)}</strong><span>${esc(s.email)} · ${esc(s.beat)}</span></td><td>${esc(s.role)}</td><td>${esc(s.desk)}</td><td>${status(s.status)}</td><td>${esc(s.lastLogin||'Never')}</td><td><span class="nr-tag">MFA ${esc(s.mfa||'Pending')}</span></td><td><div class="nr-table-actions">${has(CAP.STAFF_ROLE)&&s.username!==currentUser().username?`<button data-staff-role="${esc(s.username)}">Change role</button>`:''}${has(CAP.STAFF_REVOKE)&&s.username!==currentUser().username?`<button data-staff-sessions="${esc(s.username)}">Revoke sessions</button><button data-staff-revoke="${esc(s.username)}">Revoke access</button>`:''}</div></td></tr>`).join('')}</tbody></table></div></section>`;}
  function renderRoles(){return `${head('Roles & Permissions','Capabilities define authority; roles group capabilities for newsroom work.')}<section class="nr-panel"><div class="nr-capability-grid">${Object.entries(ROLE_CAPS).map(([role,cs])=>`<article class="nr-role-card"><h3>${esc(role)}</h3><p>${cs.length} configured capabilities</p><ul>${cs.slice(0,8).map(c=>`<li>${esc(c)}</li>`).join('')}${cs.length>8?`<li>+ ${cs.length-8} more</li>`:''}</ul></article>`).join('')}</div></section>`;}
  function renderAudit(){const list=read(KEYS.audit,[]);return `${head('Audit Log','Operational history for sign-in, publishing, Premium and access changes.')}<section class="nr-panel"><ul class="nr-audit-list">${list.map(x=>`<li><time>${esc(new Date(x.at).toLocaleString())}</time><span>${esc(x.user)} · ${esc(x.role)}</span><strong>${esc(x.action)}</strong></li>`).join('')||'<li><span>No audit entries yet.</span></li>'}</ul></section>`;}
  function renderSettings(){return `${head('Settings','Newsroom preferences and publication defaults.')}<div class="nr-grid nr-grid-2"><section class="nr-panel"><div class="nr-panel-head"><div><h2>My profile</h2><p>Current staff identity</p></div></div><ul class="nr-list"><li class="nr-list-item"><div><strong>${esc(currentUser().name)}</strong><p>${esc(currentUser().email)}</p></div><span class="nr-tag">${esc(currentUser().role)}</span></li><li class="nr-list-item"><div><strong>Primary desk</strong><p>${esc(currentUser().desk)}</p></div><span class="nr-tag">${esc(currentUser().beat)}</span></li></ul></section><section class="nr-panel"><div class="nr-panel-head"><div><h2>Editorial defaults</h2><p>Production settings require server-side persistence</p></div></div><ul class="nr-list"><li class="nr-list-item"><div><strong>Default timezone</strong><p>Africa/Harare</p></div><span class="nr-tag">UTC+2</span></li><li class="nr-list-item"><div><strong>Autosave</strong><p>Story drafts save while editing</p></div><span class="nr-tag">On</span></li></ul></section></div>`;}
  function renderIntegrations(){return `${head('Integrations','Production connections for publishing, identity, analytics and distribution.')}<section class="nr-panel"><div class="nr-source-grid">${[['CMS / Database','Replace local story persistence'],['Identity + MFA','Replace local staff credentials'],['Analytics','Reads, engagement, geography and referrals'],['Email','Newsletter delivery'],['WhatsApp Business','Briefings and reader messaging'],['Payments','Premium billing and entitlement'],['Citation monitoring','Backlinks and academic mentions'],['Ad events','Campaign impressions and clicks']].map(x=>`<article class="nr-source-card"><strong>${x[0]}</strong><span>${x[1]}</span><span>Production integration</span></article>`).join('')}</div></section>`;}
  function renderSecurity(){const u=currentUser(),all=read(KEYS.sessions,{}),sessions=all[u.username]||[{id:'current',device:'Current browser',location:'Current session',lastActive:'Now',current:true}];return `${head('Security','Sessions, access state and account security.',has(CAP.SECURITY)?button('View audit','data-module-jump="audit"','nr-secondary'):'')}<div class="nr-grid nr-grid-2"><section class="nr-panel"><div class="nr-panel-head"><div><h2>Sessions</h2><p>Signed-in devices for this staff account</p></div></div>${sessions.map(s=>`<div class="nr-security-session"><div><strong>${esc(s.device)}</strong><p>${esc(s.location)} · ${esc(s.lastActive)}</p></div>${s.current?'<span class="nr-tag">Current</span>':button('Revoke',`data-revoke-session="${esc(s.id)}"`)}</div>`).join('')}</section><section class="nr-panel"><div class="nr-panel-head"><div><h2>Account security</h2><p>Identity controls</p></div></div><ul class="nr-list"><li class="nr-list-item"><div><strong>MFA</strong><p>Production managed identity requirement</p></div><span class="nr-tag">${esc(u.mfa||'Pending')}</span></li><li class="nr-list-item"><div><strong>Password status</strong><p>${u.passwordChange?'Change required':'No forced change'}</p></div><span class="nr-tag">Protected</span></li><li class="nr-list-item"><div><strong>Role</strong><p>${esc(u.role)}</p></div><span class="nr-tag">RBAC</span></li></ul></section></div>`;}

  async function openStory(id=null){
    const u=currentUser();
    if(id){
      const s=getStories().find(x=>x.id===id);
      if(!s||!canEditStory(s)){toast('You do not have permission to edit this story.');return;}
      editingStoryId=id;
    }else{
      if(!has(CAP.STORY_CREATE)){toast('Your account cannot create stories.');return;}
      try{
        const result=await api('createStory',{story:{desk:u.desk||'Global Health',country:u.country||'',region:u.region||'Global'}});
        await refreshData();editingStoryId=result.id;
      }catch(error){toast(error.message);return;}
    }
    populateEditor();$('[data-story-modal]').hidden=false;document.body.style.overflow='hidden';
  }
  async function closeStory(){await flushAutosave();$('[data-story-modal]').hidden=true;document.body.style.overflow='';editingStoryId=null;}
  function staffOptions(selected='',roles=null){return getStaff().filter(s=>s.status==='Active'&&(!roles||roles.includes(s.role))).map(s=>`<option value="${esc(s.username)}" ${s.username===selected?'selected':''}>${esc(s.name)} · ${esc(s.role)}</option>`).join('');}
  function populateEditor(){const s=getStories().find(x=>x.id===editingStoryId);if(!s)return;const form=$('[data-story-form]'), shadow=$('[data-story-shadow]');form.elements.id.value=s.id;form.elements.title.value=s.title||'';form.elements.standfirst.value=s.standfirst||'';form.elements.body.value=s.body||'';form.elements.sources.value=s.sources||'';form.elements.notes.value=s.notes||'';const fields={status:s.status,deadline:s.deadline||'',owner:s.owner,editor:s.editor||'',factChecker:s.factChecker||'',desk:s.desk||'',section:s.section||'',country:s.country||'',region:s.region||'Global',premium:String(!!s.premium),seoTitle:s.seoTitle||'',metaDescription:s.metaDescription||'',slug:s.slug||'',adSetting:s.adSetting||'Standard',schedule:s.schedule||''};const owner=$('[name="owner"][form="story-shadow"]'), editor=$('[name="editor"][form="story-shadow"]'), checker=$('[name="factChecker"][form="story-shadow"]'), desk=$('[name="desk"][form="story-shadow"]'), region=$('[name="region"][form="story-shadow"]');owner.innerHTML=staffOptions(s.owner,['Reporter / Journalist','Editor-in-Chief','Managing Editor','Section Editor','News Editor']);editor.innerHTML=`<option value="">Unassigned</option>${staffOptions(s.editor,['Publisher / Owner','Editor-in-Chief','Managing Editor','Section Editor','News Editor'])}`;checker.innerHTML=`<option value="">Unassigned</option>${staffOptions(s.factChecker,['Fact Checker','Health / Science Editor','Editor-in-Chief'])}`;desk.innerHTML=DESKS.map(x=>`<option ${x===s.desk?'selected':''}>${x}</option>`).join('');region.innerHTML=REGIONS.map(x=>`<option ${x===s.region?'selected':''}>${x}</option>`).join('');Object.entries(fields).forEach(([k,v])=>{const el=$(`[name="${k}"][form="story-shadow"]`);if(el)el.value=v;});['Homepage','Breaking','Newsletter','WhatsApp','Push'].forEach(k=>{const el=$(`[name="dist${k}"][form="story-shadow"]`);if(el)el.checked=!!s.distribution?.[k.toLowerCase()];});$('[data-story-modal-title]').textContent=s.title||'Untitled story';$('[data-editor-state]').textContent=s.status;$('[data-save-state]').textContent='Saved';renderVersions(s);renderComments(s);renderStoryMedia(s);configureEditorAction(s);protectInspector(s);}
  function protectInspector(s){const reporterOnly=!has(CAP.STORY_EDIT_ALL);['status','owner','editor','factChecker'].forEach(n=>{const el=$(`[name="${n}"][form="story-shadow"]`);if(el)el.disabled=reporterOnly;});const premium=$('[name="premium"][form="story-shadow"]');if(premium)premium.disabled=!(has(CAP.PREMIUM_ASSIGN)||has(CAP.PREMIUM_MANAGE));const schedule=$('[name="schedule"][form="story-shadow"]');if(schedule)schedule.disabled=!has(CAP.STORY_PUBLISH);const adSetting=$('[name="adSetting"][form="story-shadow"]');if(adSetting)adSetting.disabled=!has(CAP.STORY_EDIT_ALL);const canDistribute=has(CAP.DISTRIBUTION)||has(CAP.STORY_EDIT_ALL);['distHomepage','distBreaking','distNewsletter','distWhatsApp','distPush'].forEach(n=>{const el=$(`[name="${n}"][form="story-shadow"]`);if(el)el.disabled=!canDistribute;});}
  function formStory(){const old=getStories().find(x=>x.id===editingStoryId);if(!old)return null;const f=$('[data-story-form]'), d=new FormData($('[data-story-shadow]'));const canPremium=has(CAP.PREMIUM_ASSIGN)||has(CAP.PREMIUM_MANAGE),canSchedule=has(CAP.STORY_PUBLISH),canAds=has(CAP.STORY_EDIT_ALL),canDistribute=has(CAP.DISTRIBUTION)||has(CAP.STORY_EDIT_ALL);return {...old,title:f.elements.title.value.trim(),standfirst:f.elements.standfirst.value.trim(),body:f.elements.body.value,sources:f.elements.sources.value,notes:f.elements.notes.value,status:String(d.get('status')||old.status),deadline:String(d.get('deadline')||''),owner:String(d.get('owner')||old.owner),editor:String(d.get('editor')||old.editor||''),factChecker:String(d.get('factChecker')||old.factChecker||''),desk:String(d.get('desk')||old.desk),section:String(d.get('section')||old.section),country:String(d.get('country')||old.country),region:String(d.get('region')||old.region),premium:canPremium?String(d.get('premium'))==='true':!!old.premium,seoTitle:String(d.get('seoTitle')||''),metaDescription:String(d.get('metaDescription')||''),slug:String(d.get('slug')||slugify(f.elements.title.value)),adSetting:canAds?String(d.get('adSetting')||old.adSetting||'Standard'):(old.adSetting||'Standard'),schedule:canSchedule?String(d.get('schedule')||''):(old.schedule||''),distribution:canDistribute?{homepage:!!d.get('distHomepage'),breaking:!!d.get('distBreaking'),newsletter:!!d.get('distNewsletter'),whatsapp:!!d.get('distWhatsApp'),push:!!d.get('distPush')}:(old.distribution||{})};}
  async function saveStory(manual=false){
    if(!editingStoryId)return;
    const story=formStory();if(!story)return;
    const owner=staffRecord(story.owner),editor=staffRecord(story.editor),checker=staffRecord(story.factChecker);
    const patch={title:story.title,standfirst:story.standfirst,body:story.body,sources:story.sources,notes:story.notes,desk:story.desk,topic:story.topic||'',country:story.country,region:story.region,deadline_at:story.deadline||'',seo_title:story.seoTitle,seo_description:story.metaDescription,slug:story.slug,scheduled_at:story.schedule||'',distribution:story.distribution,ad_setting:story.adSetting};
    if(owner)patch.owner_staff_id=owner.id;if(editor)patch.assigned_editor_staff_id=editor.id;if(checker)patch.fact_checker_staff_id=checker.id;
    patch.access_policy=story.premium?'premium':'public';
    try{
      const result=await api('saveStory',{storyId:story.id,expectedVersion:story.lockVersion,patch,reason:manual?'Manual save':'Autosave'});
      story.lockVersion=Number(result.version||story.lockVersion+1);story.updated=displayTime(new Date().toISOString());
      const list=getStories(),idx=list.findIndex(x=>x.id===story.id);if(idx>=0){list[idx]=story;setStories(list);}
      $('[data-save-state]').textContent='Saved';$('[data-story-modal-title]').textContent=story.title||'Untitled story';
      if(manual)toast('Story saved');
    }catch(error){
      $('[data-save-state]').textContent=error.status===409?'Conflict — reload':'Save failed';
      toast(error.status===409?'A newer server revision exists. Reload the story before saving again.':error.message);
      if(error.status===409){await refreshData();populateEditor();}
      throw error;
    }
  }
  function scheduleAutosave(){if(!editingStoryId)return;$('[data-save-state]').textContent='Saving…';clearTimeout(autosaveTimer);autosaveTimer=setTimeout(()=>{autosaveTimer=null;saveStory(false).catch(()=>{});},700);}
  async function flushAutosave(){if(autosaveTimer){clearTimeout(autosaveTimer);autosaveTimer=null;try{await saveStory(false);}catch{}}}
  function renderVersions(s){$('[data-version-list]').innerHTML=(s.versions||[]).slice(0,8).map(v=>`<div class="nr-version"><strong>${esc(v.label)}</strong><span>${esc(v.by)} · ${esc(new Date(v.at).toLocaleString())}</span></div>`).join('')||'<div class="nr-version"><span>No saved versions yet</span></div>';}
  function renderStoryMedia(s){
    const mount=$('[data-story-media]');if(!mount)return;
    const rows=storyMediaFor(s.id);
    mount.innerHTML=rows.length?'<div class="nr-story-media-list">'+rows.map(m=>{
      const publicState=m.publicUrl||m.storageBucket==='migrated-media'?'Published/source media':'Private draft';
      const meta=[mediaUsageLabel(m.storyUsage.usageType),m.caption||'',m.credit?('Credit: '+m.credit):'',publicState].filter(Boolean).join(' · ');
      const actions=button('Preview','data-media-preview="'+esc(m.id)+'"','nr-secondary')+(canEditStory(s)?button('Detach','data-media-detach="'+esc(m.id)+'" data-story-id="'+esc(s.id)+'" data-usage-type="'+esc(m.storyUsage.usageType)+'"','nr-secondary'):'');
      return '<article class="nr-media-attachment"><div><span class="nr-tag">'+esc(mediaKind(m))+'</span><strong>'+esc(m.filename)+'</strong><span>'+esc(meta)+'</span></div><div class="nr-list-actions">'+actions+'</div></article>';
    }).join('')+'</div>':'<div class="nr-empty"><strong>No media attached</strong><p>Add a featured image, inline image or supporting document. Draft media remains private.</p></div>';
  }
  function extractMentionStaffIds(text){
    const ids=[],seen=new Set();
    const re=/@([a-zA-Z0-9._-]+)/g;let match;
    while((match=re.exec(String(text||'')))){
      const person=getStaff().find(s=>String(s.username||'').toLowerCase()===match[1].toLowerCase());
      if(person?.id&&!seen.has(person.id)){seen.add(person.id);ids.push(person.id);}
    }
    return ids;
  }
  function renderCommentNode(c,items){
    const children=items.filter(x=>x.parentCommentId===c.id);
    const actions=[
      button('Reply','data-comment-reply="'+esc(c.id)+'"'),
      c.authorStaffId===currentUser()?.id?button('Edit','data-comment-edit="'+esc(c.id)+'"'):'',
      (!c.resolved&&(c.authorStaffId===currentUser()?.id||has(CAP.STORY_EDIT_ALL)||has(CAP.STORY_PUBLISH)))?button('Resolve','data-comment-resolve="'+esc(c.id)+'"'):'',
      (c.resolved&&(c.authorStaffId===currentUser()?.id||has(CAP.STORY_EDIT_ALL)||has(CAP.STORY_PUBLISH)))?button('Reopen','data-comment-reopen="'+esc(c.id)+'"'):''
    ].join('');
    return '<article class="nr-comment" data-comment-id="'+esc(c.id)+'"><strong>'+esc(c.user)+'</strong><time>'+esc(displayTime(c.at))+(c.editedAt?' · edited':'')+'</time><p>'+esc(c.text)+'</p><div class="nr-comment-actions">'+(c.resolved?'<span class="nr-tag">Resolved</span>':'')+actions+'</div>'+(children.length?'<div class="nr-comment-replies">'+children.map(child=>renderCommentNode(child,items)).join('')+'</div>':'')+'</article>';
  }
  function renderComments(s){
    const map=read(KEYS.comments,{}),items=map[s.id]||[],roots=items.filter(c=>!c.parentCommentId);
    const policy=has(CAP.COMMENT_CONFIGURE)?'<div class="nr-discussion-policy"><span class="nr-tag">Reader discussion: '+esc(s.commentPolicy||'disabled')+'</span>'+['disabled','read_only','open'].map(p=>button(p,'data-story-comment-policy="'+p+'" data-story-id="'+esc(s.id)+'"',p===(s.commentPolicy||'disabled')?'nr-primary':'nr-secondary')).join('')+'</div>':'';
    $('[data-editor-comments]').innerHTML=policy+(roots.map(c=>renderCommentNode(c,items)).join('')||'<div class="nr-empty"><p>No internal comments yet.</p></div>');
  }
  function canRequestChanges(s){return ['Submitted','Fact check','Health / Science review','Copy edit','Editor review','Ready'].includes(s.status)&&[CAP.STORY_EDIT_ALL,CAP.STORY_FACT,CAP.STORY_HEALTH,CAP.STORY_COPY,CAP.STORY_PUBLISH].some(has);}
  function configureEditorAction(s){const btn=$('[data-editor-primary]'),returnBtn=$('[data-editor-request-changes]');btn.disabled=false;if(returnBtn){returnBtn.hidden=!canRequestChanges(s);returnBtn.dataset.storyId=s.id;}if(has(CAP.STORY_PUBLISH)&&['Ready','Scheduled'].includes(s.status)){btn.textContent='Publish';btn.dataset.action='publish';return;}if(has(CAP.STORY_FACT)&&s.status==='Submitted'){btn.textContent='Send to fact check';btn.dataset.action='fact';return;}if(has(CAP.STORY_HEALTH)&&s.status==='Fact check'){btn.textContent='Health / science review';btn.dataset.action='health';return;}if(has(CAP.STORY_COPY)&&s.status==='Health / Science review'){btn.textContent='Copy edit';btn.dataset.action='copy';return;}if(has(CAP.STORY_EDIT_ALL)&&s.status==='Copy edit'){btn.textContent='Editor review';btn.dataset.action='editor';return;}if(has(CAP.STORY_EDIT_ALL)&&s.status==='Editor review'){btn.textContent='Mark ready';btn.dataset.action='ready';return;}btn.textContent='Submit for review';btn.dataset.action='submit';btn.disabled=!has(CAP.STORY_SUBMIT);}
  async function primaryEditorAction(){await flushAutosave();const s=getStories().find(x=>x.id===editingStoryId);if(!s)return;const action=$('[data-editor-primary]').dataset.action;const next={publish:'Published',fact:'Fact check',health:'Health / Science review',copy:'Copy edit',editor:'Editor review',ready:'Ready',submit:'Submitted'}[action]||'Submitted';await transitionStory(s.id,next);}
  async function transitionStory(id,next){
    try{await api('transitionStory',{storyId:id,nextStatus:next});await refreshData();if(editingStoryId===id)populateEditor();else showModule(active);toast(`Story moved to ${next}`);}
    catch(error){toast(error.message);}
  }
  async function assignmentProgress(id){try{await api('progressAssignment',{assignmentId:id});await refreshData();showModule(active);}catch(error){toast(error.message);}}
  function openAssignment(){if(!(has(CAP.ASSIGN_CREATE)||has(CAP.ASSIGN_MANAGE)))return;const f=$('[data-assignment-form]');f.reset();f.elements.reporter.innerHTML=staffOptions('', ['Reporter / Journalist']);f.elements.editor.innerHTML=staffOptions(currentUser().username,['Publisher / Owner','Editor-in-Chief','Managing Editor','Section Editor','News Editor']);f.elements.desk.innerHTML=DESKS.filter(x=>!['Commercial'].includes(x)).map(x=>`<option>${x}</option>`).join('');$('[data-assignment-modal]').hidden=false;}
  async function saveAssignment(form){const d=new FormData(form),reporter=staffRecord(String(d.get('reporter'))),editor=staffRecord(String(d.get('editor')));try{await api('createAssignment',{assignment:{title:String(d.get('title')),reporter_staff_id:reporter?.id,assigned_editor_staff_id:editor?.id||null,desk:String(d.get('desk')),deadline_at:String(d.get('deadline')),priority:String(d.get('priority')),notes:String(d.get('notes')||'')}});$('[data-assignment-modal]').hidden=true;await refreshData();showModule('assignments');toast('Assignment created');}catch(error){toast(error.message);}}
  function openCampaign(){
    if(!has(CAP.ADS_CREATE))return;
    const advertisers=read(KEYS.advertisers,[]);
    if(!advertisers.length){toast('No authorised advertiser exists yet. Create or verify the advertiser record before starting a campaign.');return;}
    const form=$('[data-campaign-form]');form.reset();
    form.elements.advertiser.innerHTML=advertisers.map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('');
    $('[data-campaign-modal]').hidden=false;
  }
  async function saveCampaign(form){
    const d=new FormData(form),start=String(d.get('start')||''),end=String(d.get('end')||'');
    if(start&&end&&new Date(end)<=new Date(start)){toast('Campaign end must be after the start.');return;}
    try{
      await api('createCampaign',{
        advertiserId:String(d.get('advertiser')),
        name:String(d.get('name')||'').trim(),
        startAt:start?new Date(start).toISOString():null,
        endAt:end?new Date(end).toISOString():null
      });
      $('[data-campaign-modal]').hidden=true;
      await refreshData();showModule('advertising');toast('Campaign draft created');
    }catch(error){toast(error.message);}
  }
  function openInvite(){if(!has(CAP.STAFF_INVITE))return;const f=$('[data-invite-form]');f.reset();f.elements.role.innerHTML=Object.keys(ROLE_CAPS).map(x=>`<option>${esc(x)}</option>`).join('');f.elements.desk.innerHTML=DESKS.map(x=>`<option>${esc(x)}</option>`).join('');f.elements.editor.innerHTML=`<option value="">None</option>${staffOptions('', ['Publisher / Owner','Editor-in-Chief','Managing Editor','Section Editor','News Editor'])}`;$('[data-invite-modal]').hidden=false;}
  async function saveInvite(form){const d=new FormData(form),editor=staffRecord(String(d.get('editor')));try{await api('invite',{displayName:String(d.get('name')),email:String(d.get('email')),role:String(d.get('role')),desk:String(d.get('desk')),country:String(d.get('country')||''),assignedEditorId:editor?.id||null});$('[data-invite-modal]').hidden=true;await refreshData();showModule('staff');toast('Staff invitation requested');}catch(error){toast(error.message);}}
  async function changeStaffRole(username){if(!has(CAP.STAFF_ROLE))return;const s=staffRecord(username);if(!s)return;const roles=Object.keys(ROLE_CAPS),i=roles.indexOf(s.role),next=roles[(i+1)%roles.length];try{await api('changeRole',{staffId:s.id,role:next});await refreshData();showModule('staff');toast('Role updated');}catch(error){toast(error.message);}}
  function confirm(title,copy,fn){pendingConfirm=fn;$('[data-confirm-title]').textContent=title;$('[data-confirm-copy]').textContent=copy;$('[data-confirm-modal]').hidden=false;}
  function revokeAccess(username){if(!has(CAP.STAFF_REVOKE))return;const s=staffRecord(username);if(!s)return;confirm('Revoke Newsroom access?',`${s.name} will no longer be able to use HealthTimes Newsroom.`,async()=>{try{await api('revokeStaff',{staffId:s.id,status:'revoked'});await refreshData();showModule('staff');toast('Access revoked');}catch(error){toast(error.message);}});}
  async function revokeStaffSessions(username){if(!(has(CAP.STAFF_REVOKE)||has('security.revoke_session')))return;const s=staffRecord(username);if(!s)return;try{await api('revokeSession',{staffId:s.id});await refreshData();showModule('staff');toast('Sessions revoked');}catch(error){toast(error.message);}}
  async function togglePremium(id){if(!(has(CAP.PREMIUM_ASSIGN)||has(CAP.PREMIUM_MANAGE)))return;const s=getStories().find(x=>x.id===id);if(!s)return;try{await api('setPremium',{storyId:id,accessPolicy:s.premium?'public':'premium'});await refreshData();showModule('premium');toast('Story access policy updated');}catch(error){toast(error.message);}}

  function mediaTargetStoryId(){return String($('[data-media-target-story]')?.value||'');}
  function renderMediaModalGrid(){
    const mount=$('[data-media-modal-grid]');if(!mount)return;
    const q=String($('[data-media-modal-search]')?.value||'').trim().toLowerCase(),storyId=mediaTargetStoryId(),usageType=$('[data-media-usage-role]')?.value||'inline';
    const rows=getMedia().filter(m=>!q||[m.filename,m.caption,m.credit,m.sourceProvenance].some(v=>String(v||'').toLowerCase().includes(q)));
    mount.innerHTML=rows.length?rows.map(m=>mediaCard(m,{modal:true,storyId,usageType})).join(''):'<div class="nr-empty"><strong>No authorised media found</strong><p>Upload a new private asset below.</p></div>';
  }
  function openMediaLibrary(storyId=null){
    if(!has(CAP.MEDIA)){toast('Your account cannot manage editorial media.');return;}
    const modal=$('[data-media-modal]'),target=$('[data-media-target-story]'),form=$('[data-media-upload-form]');
    const editable=getStories().filter(canEditStory);
    if(!editable.length){toast('No editable story is available for media upload or attachment.');return;}
    target.innerHTML=editable.map(s=>'<option value="'+esc(s.id)+'" '+(s.id===storyId?'selected':'')+'>'+esc(s.title||'Untitled story')+'</option>').join('');
    target.disabled=Boolean(storyId);
    target.dataset.lockedStory=storyId||'';
    $('[data-media-usage-role]').value='inline';
    $('[data-media-modal-search]').value='';
    form?.reset();
    modal.hidden=false;
    renderMediaModalGrid();
  }
  function closeMediaLibrary(){const modal=$('[data-media-modal]');if(modal)modal.hidden=true;}
  async function sha256File(file){if(!crypto?.subtle)return'';const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');}
  function resolvedMime(file){
    if(file.type)return file.type.toLowerCase();
    const ext=String(file.name||'').toLowerCase().split('.').pop();
    return ({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',pdf:'application/pdf',txt:'text/plain',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})[ext]||'';
  }
  async function uploadStoryMedia(form){
    const file=form.elements.file.files?.[0],storyId=mediaTargetStoryId(),usageType=$('[data-media-usage-role]')?.value||'inline';
    if(!file||!storyId){toast('Choose a story and file first.');return;}
    const mimeType=resolvedMime(file),altText=String(form.elements.altText.value||'').trim();
    if(mimeType.startsWith('image/')&&!altText){toast('Alt text is required for images.');return;}
    if(file.size>15728640){toast('Newsroom media is limited to 15 MB.');return;}
    const submit=form.querySelector('button[type="submit"]');if(submit)submit.disabled=true;
    try{
      const checksum=await sha256File(file);
      const prepared=await api('prepareStoryMedia',{
        storyId,filename:file.name,mimeType,byteSize:file.size,checksum:checksum||null,
        altText,caption:String(form.elements.caption.value||'').trim(),
        credit:String(form.elements.credit.value||'').trim(),
        sourceProvenance:String(form.elements.sourceProvenance.value||'').trim(),
        usageType
      });
      const uploadForm=new FormData();uploadForm.append('cacheControl','3600');uploadForm.append('',file,file.name);
      const upload=await fetch(prepared.uploadUrl,{method:'PUT',headers:{'x-upsert':'false'},body:uploadForm});
      if(!upload.ok)throw new Error('Private media upload failed ('+upload.status+').');
      await api('finalizeStoryMedia',{mediaId:prepared.prepared.media_id,storyId,usageType,checksum:checksum||null});
      await refreshData();form.reset();renderMediaModalGrid();
      if(editingStoryId===storyId)populateEditor();
      if(active==='media')showModule('media');
      toast('Media uploaded and attached privately');
    }catch(error){toast(error.message||'Media upload failed safely.');}
    finally{if(submit)submit.disabled=false;}
  }
  async function attachStoryMedia(mediaId){
    const storyId=mediaTargetStoryId(),usageType=$('[data-media-usage-role]')?.value||'inline';
    if(!storyId)return;
    try{await api('attachStoryMedia',{mediaId,storyId,usageType});await refreshData();renderMediaModalGrid();if(editingStoryId===storyId)populateEditor();toast('Media attached to story');}catch(error){toast(error.message);}
  }
  async function detachStoryMedia(mediaId,storyId,usageType){
    try{await api('detachStoryMedia',{mediaId,storyId,usageType});await refreshData();if(editingStoryId===storyId)populateEditor();if(active==='media')showModule('media');toast('Media detached from story');}catch(error){toast(error.message);}
  }
  async function previewMedia(mediaId){
    const asset=getMedia().find(m=>m.id===mediaId);
    if(asset?.storageBucket==='migrated-media'&&asset.sourceUrl){window.open(asset.sourceUrl,'_blank','noopener,noreferrer');return;}
    try{const result=await api('getMediaPreview',{mediaId});window.open(result.url,'_blank','noopener,noreferrer');}catch(error){toast(error.message);}
  }
  function openRequestChanges(storyId){
    const s=getStories().find(x=>x.id===storyId);if(!s||!canRequestChanges(s)){toast('This story is not eligible for Request changes.');return;}
    const form=$('[data-request-changes-form]');form.reset();form.dataset.storyId=storyId;
    $('[data-request-changes-story-title]').textContent='Return “'+(s.title||'this story')+'” to the Reporter with a required editorial note.';
    $('[data-request-changes-modal]').hidden=false;
  }
  async function saveRequestChanges(form){
    const storyId=form.dataset.storyId,reason=String(form.elements.reason.value||'').trim();
    if(reason.length<3){toast('Add a clear editorial reason before returning the story.');return;}
    try{
      await flushAutosave();
      await api('requestStoryChanges',{storyId,reason});
      $('[data-request-changes-modal]').hidden=true;form.reset();
      await refreshData();
      if(editingStoryId===storyId)populateEditor();
      if(active==='review')showModule('review');
      toast('Changes requested — Reporter notified');
    }catch(error){toast(error.message);}
  }

  function userPopover(){const el=$('[data-user-popover]'),u=currentUser();el.hidden=!el.hidden;if(!el.hidden)el.innerHTML=`<div class="nr-popover-id"><strong>${esc(u.name)}</strong><span>${esc(u.role)} · ${esc(u.desk)}</span></div><button data-popover-action="profile">My profile</button><button data-module-jump="my-assignments">My assignments</button><button data-module-jump="my-stories">My drafts & stories</button><button data-module-jump="security">Security</button><button data-sign-out>Sign out</button>`;}
  function openSearch(){const modal=$('[data-search-modal]');modal.hidden=false;const input=$('[data-newsroom-search-input]');input.value='';$('[data-newsroom-search-results]').innerHTML='';setTimeout(()=>input.focus(),20);}
  function searchNewsroom(q){q=q.trim().toLowerCase();if(!q){$('[data-newsroom-search-results]').innerHTML='';return;}const rs=[...getStories().filter(s=>`${s.title} ${s.desk} ${s.status}`.toLowerCase().includes(q)).slice(0,6).map(s=>({title:s.title,meta:`Story · ${s.status} · ${s.desk}`})),...getStaff().filter(s=>`${s.name} ${s.role} ${s.desk}`.toLowerCase().includes(q)).slice(0,4).map(s=>({title:s.name,meta:`Staff · ${s.role} · ${s.desk}`})),...getAssignments().filter(a=>`${a.title} ${a.desk}`.toLowerCase().includes(q)).slice(0,4).map(a=>({title:a.title,meta:`Assignment · ${a.status} · ${a.desk}`}))];$('[data-newsroom-search-results]').innerHTML=rs.map(r=>`<div class="nr-search-result"><strong>${esc(r.title)}</strong><span>${esc(r.meta)}</span></div>`).join('')||'<div class="nr-empty"><p>No matches found.</p></div>';}

  function filterStories(){const q=String($('[data-story-search]')?.value||'').toLowerCase(),st=$('[data-story-status]')?.value||'',desk=$('[data-story-desk]')?.value||'';const list=getStories().filter(s=>(!q||`${s.title} ${s.section} ${s.author}`.toLowerCase().includes(q))&&(!st||s.status===st)&&(!desk||s.desk===desk));$('[data-story-table]').innerHTML=storyTable(list);}

  function bindGlobal(){
    const loginForm=$('[data-login-form]');if(loginForm)loginForm.addEventListener('submit',async e=>{e.preventDefault();const d=new FormData(loginForm);$('[data-login-error]').textContent='';try{await login(d.get('email'),d.get('password'));location.reload();}catch(error){$('[data-login-error]').textContent=error.message||'We could not sign you in. Check your verified staff account and access status.';}});
    document.addEventListener('click',async e=>{
      const mod=e.target.closest('[data-module]');if(mod){showModule(mod.dataset.module);return;}
      const jump=e.target.closest('[data-module-jump]');if(jump){showModule(jump.dataset.moduleJump);$('[data-user-popover]')?.setAttribute('hidden','');return;}
      if(e.target.closest('[data-recover-account]')){const email=$('[data-login-form] input[name="email"]')?.value?.trim();if(!email){$('[data-login-error]').textContent='Enter your staff email first.';return;}try{const result=await api('recover',{email});$('[data-login-error]').textContent=result.message||'Recovery email requested.';}catch(error){$('[data-login-error]').textContent=error.message;}return;}
      if(e.target.closest('[data-sign-out]')){await logout();return;}
      if(e.target.closest('[data-user-menu]')){userPopover();return;}
      if(e.target.closest('[data-quick-create]')){await openStory();return;}
      const open=e.target.closest('[data-open-story]');if(open){await openStory(open.dataset.openStory);return;}
      if(e.target.closest('[data-story-modal-close]')){await closeStory();return;}
      if(e.target.closest('[data-manual-save]')){try{await saveStory(true);}catch{}return;}
      if(e.target.closest('[data-editor-primary]')){await primaryEditorAction();return;}
      const requestChanges=e.target.closest('[data-editor-request-changes],[data-request-changes-story]');if(requestChanges){openRequestChanges(requestChanges.dataset.storyId||requestChanges.dataset.requestChangesStory);return;}
      if(e.target.closest('[data-request-changes-close]')){$('[data-request-changes-modal]').hidden=true;return;}
      if(e.target.closest('[data-story-preview]')){await flushAutosave();toast('Draft saved. Public preview remains separate from unpublished Newsroom data.');return;}
      const trans=e.target.closest('[data-transition-story]');if(trans){await transitionStory(trans.dataset.transitionStory,trans.dataset.next);return;}
      const ap=e.target.closest('[data-assignment-progress]');if(ap){await assignmentProgress(ap.dataset.assignmentProgress);return;}
      if(e.target.closest('[data-open-assignment]')){openAssignment();return;}
      if(e.target.closest('[data-assignment-close]')){$('[data-assignment-modal]').hidden=true;return;}
      if(e.target.closest('[data-open-campaign]')){openCampaign();return;}
      if(e.target.closest('[data-open-story-media]')){openMediaLibrary(editingStoryId);return;}
      if(e.target.closest('[data-open-media-library]')){openMediaLibrary();return;}
      if(e.target.closest('[data-media-close]')){closeMediaLibrary();return;}
      const mp=e.target.closest('[data-media-preview]');if(mp){await previewMedia(mp.dataset.mediaPreview);return;}
      const ma=e.target.closest('[data-media-attach]');if(ma){await attachStoryMedia(ma.dataset.mediaAttach);return;}
      const md=e.target.closest('[data-media-detach]');if(md){await detachStoryMedia(md.dataset.mediaDetach,md.dataset.storyId,md.dataset.usageType);return;}
      if(e.target.closest('[data-campaign-close]')){$('[data-campaign-modal]').hidden=true;return;}
      if(e.target.closest('[data-open-invite]')){openInvite();return;}
      if(e.target.closest('[data-invite-close]')){$('[data-invite-modal]').hidden=true;return;}
      const sr=e.target.closest('[data-staff-role]');if(sr){await changeStaffRole(sr.dataset.staffRole);return;}
      const ss=e.target.closest('[data-staff-sessions]');if(ss){await revokeStaffSessions(ss.dataset.staffSessions);return;}
      const rv=e.target.closest('[data-staff-revoke]');if(rv){revokeAccess(rv.dataset.staffRevoke);return;}
      const pt=e.target.closest('[data-v21-premium-toggle]');if(pt){await togglePremium(pt.dataset.v21PremiumToggle);return;}
      if(e.target.closest('[data-confirm-cancel]')){$('[data-confirm-modal]').hidden=true;pendingConfirm=null;return;}
      if(e.target.closest('[data-confirm-accept]')){const fn=pendingConfirm;$('[data-confirm-modal]').hidden=true;pendingConfirm=null;if(fn)fn();return;}
      if(e.target.closest('[data-global-search]')){openSearch();return;}
      if(e.target.closest('[data-search-close]')){$('[data-search-modal]').hidden=true;return;}
      const nr=e.target.closest('[data-notification-read]');if(nr){try{await api('markNotificationRead',{notificationId:nr.dataset.notificationRead});await refreshInbox($('[data-inbox-filter]')?.value||'all');}catch(error){toast(error.message);}return;}
      const na=e.target.closest('[data-notification-ack]');if(na){try{await api('ackNotification',{notificationId:na.dataset.notificationAck});await refreshInbox($('[data-inbox-filter]')?.value||'all');}catch(error){toast(error.message);}return;}
      const nx=e.target.closest('[data-notification-archive]');if(nx){try{await api('archiveNotification',{notificationId:nx.dataset.notificationArchive});await refreshInbox($('[data-inbox-filter]')?.value||'all');}catch(error){toast(error.message);}return;}
      if(e.target.closest('[data-inbox-refresh]')){await refreshInbox($('[data-inbox-filter]')?.value||'all');return;}
      const ad=e.target.closest('[data-assignment-discuss]');if(ad){await openAssignmentDiscussion(ad.dataset.assignmentDiscuss);return;}
      const to=e.target.closest('[data-thread-open]');if(to){openThreadWorkspace(to.dataset.threadOpen);return;}
      if(e.target.closest('[data-create-desk]')){await createDeskFromUi();return;}
      const dt=e.target.closest('[data-desk-thread-create]');if(dt){await createDeskThreadFromUi(dt.dataset.deskThreadCreate);return;}
      if(e.target.closest('[data-create-breaking]')){await createBreakingFromUi();return;}
      if(e.target.closest('[data-moderation-refresh]')){await refreshModeration();return;}
      const mc=e.target.closest('[data-moderate-comment]');if(mc){try{await api('moderateComment',{commentId:mc.dataset.moderateComment,moderationAction:mc.dataset.moderationAction,reasonCode:'editorial_policy'});await refreshModeration();}catch(error){toast(error.message);}return;}
      const rr=e.target.closest('[data-restrict-reader]');if(rr){const kind=prompt('Restriction: pre_moderation, comment_block or link_block','pre_moderation');if(!kind)return;const reason=prompt('Reason code','moderation_history')||'moderation_history';try{await api('restrictReader',{readerProfileId:rr.dataset.restrictReader,kind,reasonCode:reason});await refreshModeration();toast('Reader restriction recorded');}catch(error){toast(error.message);}return;}
      const cp=e.target.closest('[data-story-comment-policy]');if(cp){try{await api('setStoryCommentPolicy',{storyId:cp.dataset.storyId,policy:cp.dataset.storyCommentPolicy});await refreshData();if(editingStoryId===cp.dataset.storyId)renderComments(getStories().find(x=>x.id===editingStoryId));toast('Reader discussion policy updated');}catch(error){toast(error.message);}return;}
      const cr=e.target.closest('[data-comment-reply]');if(cr){const form=$('[data-comment-form]');form.dataset.parentCommentId=cr.dataset.commentReply;form.elements.comment.placeholder='Reply to this internal comment…';form.elements.comment.focus();return;}
      const ce=e.target.closest('[data-comment-edit]');if(ce){const all=Object.values(read(KEYS.comments,{})).flat(),row=all.find(x=>x.id===ce.dataset.commentEdit);const next=prompt('Edit your internal comment',row?.text||'');if(next&&next.trim()){try{await api('editComment',{commentId:ce.dataset.commentEdit,comment:next.trim(),mentionStaffIds:extractMentionStaffIds(next)});await refreshData();renderComments(getStories().find(x=>x.id===editingStoryId));}catch(error){toast(error.message);}}return;}
      const cres=e.target.closest('[data-comment-resolve],[data-comment-reopen]');if(cres){const id=cres.dataset.commentResolve||cres.dataset.commentReopen;try{await api('resolveComment',{commentId:id,resolved:!!cres.dataset.commentResolve});await refreshData();renderComments(getStories().find(x=>x.id===editingStoryId));}catch(error){toast(error.message);}return;}
      if(e.target.closest('[data-notifications]')){showModule('inbox');return;}
      if(e.target.closest('[data-sidebar-open]')){$('[data-newsroom-sidebar]').classList.add('open');return;}
      if(e.target.closest('[data-sidebar-close]')){$('[data-newsroom-sidebar]').classList.remove('open');return;}
      const ins=e.target.closest('[data-insert]');if(ins){if(ins.dataset.insert==='media'){openMediaLibrary(editingStoryId);return;}toast(`${ins.dataset.insert} placeholder added to the reporting workflow.`);return;}
    });
    document.addEventListener('input',e=>{if(e.target.closest('[data-story-form]')||e.target.getAttribute('form')==='story-shadow')scheduleAutosave();if(e.target.matches('[data-story-search],[data-story-status],[data-story-desk]'))filterStories();if(e.target.matches('[data-newsroom-search-input]'))searchNewsroom(e.target.value);if(e.target.matches('[data-review-state],[data-review-desk],[data-review-owner],[data-review-deadline]'))refreshReviewQueue();if(e.target.matches('[data-media-library-search],[data-media-library-type],[data-media-library-state]'))refreshMediaLibrary();if(e.target.matches('[data-media-modal-search],[data-media-target-story],[data-media-usage-role]'))renderMediaModalGrid();});
    $('[data-assignment-form]')?.addEventListener('submit',async e=>{e.preventDefault();await saveAssignment(e.currentTarget);});
    $('[data-campaign-form]')?.addEventListener('submit',async e=>{e.preventDefault();await saveCampaign(e.currentTarget);});
    $('[data-media-upload-form]')?.addEventListener('submit',async e=>{e.preventDefault();await uploadStoryMedia(e.currentTarget);});
    $('[data-request-changes-form]')?.addEventListener('submit',async e=>{e.preventDefault();await saveRequestChanges(e.currentTarget);});
    $('[data-invite-form]')?.addEventListener('submit',async e=>{e.preventDefault();await saveInvite(e.currentTarget);});
    $('[data-password-reset-form]')?.addEventListener('submit',async e=>{e.preventDefault();const password=e.currentTarget.elements.password.value,confirmPassword=e.currentTarget.elements.confirmPassword.value,error=$('[data-password-reset-error]');error.textContent='';if(password!==confirmPassword){error.textContent='Passwords do not match.';return;}try{await api('setPassword',{password});$('[data-password-reset-modal]').hidden=true;recoveryMode=false;e.currentTarget.reset();toast('Password updated securely.');}catch(ex){error.textContent=ex.message;}});
    $('[data-comment-form]')?.addEventListener('submit',async e=>{e.preventDefault();if(!editingStoryId)return;const text=e.currentTarget.elements.comment.value.trim();if(!text)return;try{await api('addComment',{storyId:editingStoryId,comment:text,parentCommentId:e.currentTarget.dataset.parentCommentId||null,mentionStaffIds:extractMentionStaffIds(text)});e.currentTarget.reset();delete e.currentTarget.dataset.parentCommentId;e.currentTarget.elements.comment.placeholder='Add an internal note…';await refreshData();renderComments(getStories().find(x=>x.id===editingStoryId));}catch(error){toast(error.message);}});
    document.addEventListener('submit',async e=>{const form=e.target.closest('[data-thread-message-form]');if(!form)return;e.preventDefault();const text=form.elements.message.value.trim();if(!text)return;try{await api('postThreadMessage',{threadId:form.dataset.threadMessageForm,message:text,mentionStaffIds:extractMentionStaffIds(text)});form.reset();await refreshData();openThreadWorkspace(form.dataset.threadMessageForm);}catch(error){toast(error.message);}});
    window.addEventListener('beforeunload',()=>{if(autosaveTimer){clearTimeout(autosaveTimer);autosaveTimer=null;}});

  }

  init().catch(error=>console.warn('Newsroom initialization failed safely:',error.message));
})();
