(() => {
  'use strict';

  const PREVIEW_MS = 30_000;
  const PREVIEW_KEY = 'htpPremiumPreviewStartedAt';
  const SUBSCRIBED_KEY = 'htpDemoSubscribed';
  const SAVED_KEY = 'htpSavedArticles';
  const HISTORY_KEY = 'htpReadingHistory';
  const PREFS_KEY = 'htpReaderPreferences';
  const FEEDBACK_KEY = 'htpStoryFeedback';
  const WHATSAPP_DESK = '263776280754';

  const articles = [
    {
      id:'natpharm-supply-chain',
      title:'Parliament Probes NatPharm Over Zimbabwe’s Medicine Supply Chain',
      category:'Health Policy',beat:'Medicines & Policy',date:'September 7, 2026',updated:'September 7, 2026',author:'Michael Gwarisa',readTime:'5 min read',
      image:'https://healthtimes.co.zw/wp-content/uploads/2026/09/bajila.jpg',
      standfirst:'Parliament has resumed its inquiry into Zimbabwe’s medicines supply system, focusing on procurement, storage, distribution and whether public investment is translating into reliable supplies for patients.',
      excerpt:'Lawmakers are examining where bottlenecks occur between funding medicines and getting them to patients, with NatPharm’s forecasting, distribution and digital systems under scrutiny.',
      significance:'The inquiry connects public spending to medicine availability and could shape reforms in procurement, forecasting and distribution across Zimbabwe’s public health system.',
      tags:['Zimbabwe','Public Health','Medicines','Policy'],source:'Parliamentary Portfolio Committee on Health and Child Care',reviewer:'News Desk',
      sourceUrl:'https://healthtimes.co.zw/parliament-probes-natpharm-zimbabwe-medicine-supply-chain/',
      body:[
        'Zimbabwe’s Parliamentary Portfolio Committee on Health and Child Care has resumed scrutiny of the national medicines supply chain, with NatPharm at the centre of questions about procurement, storage, distribution and accountability.',
        'The inquiry is looking beyond the amount of money allocated to medicines and asking what patients ultimately receive from that public investment. Lawmakers are examining whether stock systems can anticipate demand rather than repeatedly reacting to shortages.',
        'NatPharm plays a central role in procuring, storing and distributing medicines to public health institutions. Financing, inventory management, demand forecasting, rural access and institutional capacity are among the areas requiring clearer evidence.',
        'Digital modernisation is another major theme. Better logistics visibility, forecasting and procurement systems could help the health sector understand where stock is available and respond earlier when demand changes.',
        'The practical test will be whether the inquiry produces reforms that improve the reliability of medicines reaching health facilities, especially facilities serving rural and marginalised communities.'
      ]
    },
    {
      id:'harare-sti-cases',
      title:'Harare STI Cases Fall Below 2,000 Per Quarter, NAC Says',
      category:'Public Health',beat:'HIV & Sexual Health',date:'September 7, 2026',updated:'September 7, 2026',author:'Kuda Pembere',readTime:'4 min read',
      image:'https://healthtimes.co.zw/wp-content/uploads/2026/09/adonijah-muzondiona-nac-harare-sti-cases.jpeg',
      standfirst:'NAC says quarterly STI cases in Harare have fallen below 2,000, although adolescents and young women aged 15 to 24 continue to carry a disproportionate share of new infections.',
      excerpt:'Targeted community and youth programmes are being credited with the decline, while prevention efforts remain focused on adolescents and young women.',
      significance:'The trend is encouraging, but the age distribution shows why prevention still needs to be targeted and tracked carefully over time.',
      tags:['Zimbabwe','HIV/AIDS','Harare','Public Health'],source:'National AIDS Council',reviewer:'News Desk',
      sourceUrl:'https://healthtimes.co.zw/harare-sti-cases-fall-below-2000-per-quarter-nac/',
      body:[
        'Sexually transmitted infection cases in Harare Province have fallen to fewer than 2,000 per quarter, according to the National AIDS Council, down from the 2,000 to 3,000 cases that had previously been recorded.',
        'NAC Harare Province manager Adonijah Muzondiona linked the improvement to programmes that take HIV and STI prevention services into communities and use peer-led networks to reach adolescents and young people.',
        'The improvement does not remove the underlying concern. Adolescents and young women aged 15 to 24 are still reported to account for a disproportionate share of new infections, keeping age-targeted prevention at the centre of the response.',
        'NAC is using initiatives including youth clubs and peer networks to increase prevention awareness. The figures draw partly on annual and quarterly reporting and need continued tracking as new data becomes available.'
      ]
    },
    {
      id:'healthathon-innovation',
      title:'Healthathon 3.0: What Zimbabwe’s Health Innovation Challenge Is Telling Us',
      category:'Opinion & Analysis',beat:'Science & Innovation',date:'September 7, 2026',updated:'September 7, 2026',author:'Michael Gwarisa',readTime:'7 min read',
      image:'https://healthtimes.co.zw/wp-content/uploads/2026/09/girls-that-code-healthathon-3-cimas-certificates.jpg.png',
      standfirst:'The third Cimas Healthathon points to a larger, more diverse health-innovation ecosystem — and a new challenge: turning competition entries into solutions that survive real clinical and public-health conditions.',
      excerpt:'Submissions grew from six in the first edition to more than 300 this year, while prototypes, research-led ideas and participation by young innovators became more visible.',
      significance:'Innovation competitions are useful only when promising ideas can move into validation, regulation, funding and real-world health settings.',
      tags:['Zimbabwe','Innovation','Health Technology','Opinion'],source:'Cimas Healthathon 3.0',reviewer:'Opinion Desk',
      sourceUrl:'https://healthtimes.co.zw/healthathon-3-zimbabwe-health-innovation/',
      body:[
        'Healthathon 3.0 offered a useful snapshot of how Zimbabwe’s health innovation ecosystem is changing. The competition has expanded dramatically, signalling that more students, health professionals and technologists see healthcare challenges as problems they can help solve.',
        'Growth alone is not enough. Strong entries still need originality, a clear understanding of the health problem and a reason why the proposed approach is appropriate for Zimbabwe’s realities.',
        'One encouraging shift is the move beyond software-only ideas. Physical prototypes and hardware concepts force teams to confront usability, cost, manufacturing, clinical workflows and reliability.',
        'Research remains a decisive differentiator. The strongest ideas start with disease burden, evidence, patient and health-worker needs, and gaps in current interventions — then choose technology that serves that understanding.',
        'The next phase is ecosystem building. Promising solutions need mentorship, clinical validation, regulatory guidance, funding and access to health facilities where products can be tested and improved.'
      ]
    },
    {
      id:'medical-services-directorate',
      title:'Zimbabwe Creates New Medical Services Directorate to Strengthen Specialist and Emergency Care',
      category:'Health Policy',beat:'Health Systems',date:'September 7, 2026',updated:'September 7, 2026',author:'Michael Gwarisa',readTime:'5 min read',
      image:'https://healthtimes.co.zw/wp-content/uploads/2026/07/perm-sec-maunganidze-at-health-sector-working-group-meeting.JPG.jpeg',
      standfirst:'The Ministry of Health and Child Care has approved a dedicated medical services directorate intended to improve coordination of specialist, emergency and surgical care.',
      excerpt:'The new structure includes dedicated emergency-services and surgical-plan coordination posts, with government saying organisational change must translate into measurable improvements for patients.',
      significance:'Governance changes matter only if they improve referrals, emergency response and access to specialist care outside major centres.',
      tags:['Zimbabwe','Policy','Emergency Care','Health Systems'],source:'Ministry of Health and Child Care',reviewer:'News Desk',
      sourceUrl:'https://healthtimes.co.zw/zimbabwe-creates-new-medical-services-directorate-to-strengthen-specialist-emergency-care/',
      body:[
        'Zimbabwe’s Ministry of Health and Child Care has established a Directorate of Medical Services within a broader organisational restructuring intended to strengthen specialist, emergency and surgical care.',
        'The structure creates dedicated responsibility for emergency services and coordination of the National Surgical, Obstetric and Anaesthesia Plan. The stated goal is clearer accountability and a stronger platform for bringing specialist expertise into health-system planning.',
        'Health authorities have stressed that new reporting lines will matter only if they produce better services on the ground, including stronger referrals, faster emergency response and wider access to specialist care outside major centres.',
        'The policy direction aligns with the National Health Strategy for 2026–2030. The practical measure will be whether patients experience shorter delays and more reliable access to appropriate specialist services.'
      ]
    },
    {
      id:'hiph-graduates',
      title:'HIPH Graduates Challenged to Turn Qualifications Into Health Solutions',
      category:'Health News',beat:'Health Workforce',date:'September 4, 2026',updated:'September 4, 2026',author:'Kuda Pembere',readTime:'4 min read',
      image:'',
      standfirst:'More than 700 Harare Institute of Public Health students graduated across public health, nursing, pharmacy and health technology programmes, with speakers calling for practical solutions and strong academic standards.',
      excerpt:'The institution says its graduate numbers and programme portfolio have expanded as demand grows for specialised health training.',
      significance:'Health workforce capacity depends not only on the number of graduates, but also on quality, deployment and the ability to translate training into stronger services.',
      tags:['Zimbabwe','Education','Health Workforce'],source:'Harare Institute of Public Health',reviewer:'News Desk',
      sourceUrl:'https://healthtimes.co.zw/hiph-graduates-challenged-to-turn-qualifications-into-health-solutions/',
      body:[
        'Harare Institute of Public Health graduates have been challenged to turn their qualifications into practical solutions that improve community health and strengthen Zimbabwe’s healthcare system.',
        'More than 700 students graduated across public health, nursing, pharmacy, health technology and other health-related programmes. Speakers also stressed that growth must be accompanied by quality, accountability and sound governance.',
        'The institute says a large share of its graduates are now working across hospitals, clinics, pharmacies, laboratories, non-governmental organisations, community health programmes and healthcare administration.',
        'The wider question for the health system is how training output connects to workforce planning, deployment, retention and the service needs of communities.'
      ]
    },
    {
      id:'ebola-drc',
      title:'Ebola Cases Plateau in DRC, But Africa CDC Warns Outbreak Remains Far From Under Control',
      category:'Africa',beat:'Outbreaks',date:'September 4, 2026',updated:'September 4, 2026',author:'Michael Gwarisa',readTime:'5 min read',
      image:'',
      standfirst:'Africa CDC says the outbreak is showing early signs of slowing, but warns that a plateau is not the same as control and sustained surveillance remains essential.',
      excerpt:'The outbreak is showing early signs of slowing, but health authorities caution against reading too much into short-term declines.',
      significance:'Outbreak trajectories can reverse quickly; surveillance, contact tracing and community trust remain critical even when case growth slows.',
      tags:['Africa','Ebola','Outbreaks','DRC'],source:'Africa CDC',reviewer:'Africa Desk',
      sourceUrl:'https://healthtimes.co.zw/',
      body:[
        'The Ebola outbreak in the Democratic Republic of Congo is showing early signs of slowing, but Africa CDC has warned that the outbreak remains far from being brought under control.',
        'Short-term changes in case counts can be encouraging, but outbreak response teams still need reliable surveillance, contact tracing, laboratory capacity and community cooperation.',
        'Health authorities continue to emphasise that a plateau does not automatically mean transmission has been interrupted.',
        'Regional preparedness also matters because cross-border movement can turn a localised outbreak into a wider public-health concern if detection and response are delayed.'
      ]
    },
    {
      id:'avenues-critical-care',
      title:'The Avenues Clinic Invests US$500,000 to Modernise Critical Care Unit',
      category:'Health Business',beat:'Hospitals & Investment',date:'September 1, 2026',updated:'September 1, 2026',author:'Michael Gwarisa',readTime:'5 min read',
      image:'https://healthtimes.co.zw/wp-content/uploads/2026/09/avenues-clinic-critical-care.jpg',
      standfirst:'The Harare hospital has upgraded its ICU, HDU and coronary care infrastructure as part of a wider modernisation programme.',
      excerpt:'The investment adds monitoring, dialysis capacity and upgraded bed-head infrastructure intended to improve safety and clinical operations.',
      significance:'Capital investment in critical care affects both patient outcomes and the resilience of the private health sector.',
      tags:['Zimbabwe','Health Business','Hospitals','Investment'],source:'The Avenues Clinic',reviewer:'Business Desk',
      sourceUrl:'https://healthtimes.co.zw/the-avenues-clinic-invests-us500000-to-modernise-critical-care-unit/',
      body:[
        'The Avenues Clinic has invested approximately US$500,000 in upgrading its Intensive Care Unit, High Dependency Unit and Coronary Care Unit in a move aimed at improving patient safety, clinical outcomes and the working environment for healthcare staff.',
        'The upgrade has introduced additional dialysis points, modern patient monitoring systems and improved bed-head units that centralise access to medical gases, power and monitoring equipment.',
        'Hospital leadership has positioned the project within a wider refurbishment programme and says further theatre upgrades are planned.',
        'For patients, the relevant measure is whether infrastructure spending translates into safer care, reliable equipment and better access when critical-care services are needed.'
      ]
    },
    {
      id:'lenacapavir-inclusion',
      title:'ZCLDN Challenges Lenacapavir Rollout Over Exclusion of People Who Inject Drugs',
      category:'HIV/AIDS',beat:'HIV Prevention',date:'September 1, 2026',updated:'September 1, 2026',author:'Michael Gwarisa',readTime:'6 min read',
      image:'',
      standfirst:'Advocates are questioning whether Zimbabwe’s rollout of long-acting HIV prevention is sufficiently inclusive of people who use and inject drugs.',
      excerpt:'The debate links access to new prevention technology with domestic financing, community delivery and human-rights-based reporting.',
      significance:'Scientific progress does not guarantee equitable access; eligibility, financing and delivery design determine who benefits.',
      tags:['Zimbabwe','HIV/AIDS','Lenacapavir','Equity'],source:'Zimbabwe Civil Liberties and Drug Network',reviewer:'Health & Science Desk',
      sourceUrl:'https://healthtimes.co.zw/zcldn-challenges-lenacapavir-rollout-over-exclusion-of-people-who-inject-drugs/',
      body:[
        'Zimbabwe Civil Liberties and Drug Network has challenged the country’s rollout of lenacapavir, raising concern that people who use and inject drugs are being left out while other key populations are identified among priority groups.',
        'The discussion has placed equitable access, domestic financing and people-centred delivery at the centre of the rollout debate.',
        'Advocates argue that prevention services should be accessible through community and outreach models as well as public and private healthcare platforms, while remaining stigma-free.',
        'The central policy test is whether a major scientific advance can be translated into access for populations that face the greatest barriers to prevention services.'
      ]
    },
    {
      id:'healthcare-provision-programme',
      title:'Zimbabwe Drops National Health Insurance Name, Unveils Tax-Funded Healthcare Provision Programme',
      category:'Premium',beat:'Health Financing',date:'July 23, 2026',updated:'July 23, 2026',author:'Michael Gwarisa',readTime:'8 min read',premium:true,
      image:'https://healthtimes.co.zw/wp-content/uploads/2026/04/Mombeshora-nurses-strike-presser.jpg',
      standfirst:'Zimbabwe is shifting from the language of national health insurance to a tax-funded National Healthcare Provision Programme intended to make public care free at the point of service.',
      excerpt:'The proposed model would pool public revenue rather than operate like conventional insurance, with legislation still required before the programme can take effect.',
      significance:'The proposal could reshape how healthcare is financed, but its impact will depend on sustainable revenue and whether public facilities can actually deliver the promised services.',
      tags:['Premium','Zimbabwe','Health Financing','UHC'],source:'Ministry of Health and Child Care',reviewer:'Policy & Analysis Desk',
      sourceUrl:'https://healthtimes.co.zw/zimbabwe-national-healthcare-provision-programme-mombeshora/',
      body:[
        'Zimbabwe has reframed its planned universal-health-coverage financing mechanism as a National Healthcare Provision Programme rather than a conventional insurance scheme.',
        'Under the model described by health authorities, citizens would not build individual insurance balances through monthly premiums. Public revenue streams would instead be pooled to finance an essential package of services at public institutions.',
        'The policy ambition is for patients to receive consultations, investigations, treatment and admission without paying at the point of care. Government would still need to finance those services sustainably through the broader tax and revenue system.',
        'For households, the central policy question is whether pooled public financing can reduce catastrophic out-of-pocket costs without creating new gaps in funding, administration or service quality.',
        'For providers, implementation will depend on predictable funding, procurement and reimbursement mechanisms. Universal entitlement on paper cannot deliver universal access if medicines, staff, diagnostics or beds remain unavailable.',
        'The programme therefore sits at the intersection of financing reform and health-system capacity. Its success will depend not only on how money is collected, but also on whether those resources consistently translate into usable services for patients.'
      ]
    },
    {
      id:'funding-cliff',
      title:'Zimbabwe Faces Funding Cliff as External Support for Major Health Programmes Changes',
      category:'Premium',beat:'Health Financing',date:'July 24, 2026',updated:'July 24, 2026',author:'Kuda Pembere',readTime:'7 min read',premium:true,
      image:'',
      standfirst:'Changes in external health financing are increasing pressure on Zimbabwe to build more durable domestic funding for HIV, TB, malaria and other essential programmes.',
      excerpt:'The funding shift raises immediate sustainability questions around essential programmes and the pace at which domestic resources can replace external support.',
      significance:'Financing transitions can affect staff, commodities, laboratories and community services long before they show up in headline programme statistics.',
      tags:['Premium','Health Financing','HIV/AIDS','Global Health'],source:'Health financing analysis',reviewer:'Policy & Analysis Desk',
      sourceUrl:'https://healthtimes.co.zw/',
      body:[
        'Changes in external health financing are increasing pressure on Zimbabwe to build more durable domestic funding for programmes that have historically relied on donor support.',
        'The concern is not simply the headline value of grants. Funding changes can affect staff, commodities, laboratories, community programmes and the systems that connect patients to treatment.',
        'Domestic resource mobilisation is therefore both a budget issue and a continuity-of-care issue. The transition has to protect services while government and partners decide which activities can be absorbed into national financing structures.',
        'Long-term resilience will depend on predictable public funding, stronger prioritisation and better visibility into which programmes create the greatest health impact for each dollar spent.',
        'A credible transition plan also needs transparent milestones so communities can see whether financing commitments are being converted into uninterrupted services.'
      ]
    }
  ];

  const topics = [
    ['Public Health','Prevention, outbreaks and community health'],['HIV/AIDS','Prevention, treatment and policy'],['Health Policy','Government, regulation and systems'],['Health Financing','Funding, insurance and universal coverage'],['Research','Evidence, studies and clinical science'],['Mental Health','Care, wellbeing and substance use'],['Health Business','Hospitals, investment and industry'],['Africa','Regional health developments']
  ];

  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
  const page = document.body.dataset.page || 'home';
  const currentParams = new URLSearchParams(location.search);

  function safeParse(value, fallback){ try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } }
  function getStored(key, fallback){ try { return safeParse(localStorage.getItem(key), fallback); } catch { return fallback; } }
  function setStored(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  function escapeHtml(value=''){ return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
  function isSubscribed(){ try { return localStorage.getItem(SUBSCRIBED_KEY) === 'true'; } catch { return false; } }
  function findArticle(id){ return articles.find(a => a.id === id) || articles[0]; }
  function articleUrl(article){ return `article.html?id=${encodeURIComponent(article.id)}`; }
  function absoluteArticleUrl(article){ return new URL(articleUrl(article), location.href).href; }
  function imageHtml(article, className=''){
    if(!article.image) return `<div class="story-placeholder ${className}" aria-hidden="true"><span>HealthTimes</span></div>`;
    return `<img class="${className}" src="${escapeHtml(article.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`;
  }
  function metaHtml(article){ return `<div class="story-meta"><span><strong>${escapeHtml(article.author)}</strong></span><span>${escapeHtml(article.date)}</span><span>${escapeHtml(article.readTime)}</span></div>`; }
  function premiumBadge(article){ return article.premium ? '<span class="premium-pill">Premium</span>' : `<span class="eyebrow">${escapeHtml(article.category)}</span>`; }

  function injectChrome(){
    const header = $('#app-header');
    if(header){
      header.innerHTML = `
        <div class="breaking-bar"><div class="shell breaking-inner"><span class="breaking-label">HealthTimes</span><div class="breaking-copy">Independent health journalism from Zimbabwe, Africa and the world.</div><a class="breaking-link" href="preferences.html">Get the weekly brief</a></div></div>
        <header class="site-header"><div class="shell header-main">
          <a class="brand" href="index.html" aria-label="HealthTimes home"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 56 56"><path d="M28 4c10 0 18 8 18 18 0 14-18 30-18 30S10 36 10 22C10 12 18 4 28 4Z"/><path class="pulse" d="M15 27h7l4-9 5 17 4-8h7"/></svg></span><span class="brand-copy"><strong>HealthTimes</strong><small>Zimbabwe health & science newsroom</small></span></a>
          <nav class="desktop-nav" aria-label="Primary navigation"><a href="index.html" ${page==='home'?'class="active"':''}>Home</a><a href="index.html#latest">Latest</a><a href="index.html?topic=Zimbabwe#latest">Zimbabwe</a><a href="index.html?topic=Africa#latest">Africa</a><a href="index.html?topic=Research#latest">Research</a><a href="index.html?topic=Health%20Policy#latest">Policy</a><a href="premium.html" ${page==='premium'?'class="premium-nav active"':'class="premium-nav"'}>Premium</a></nav>
          <div class="header-actions"><button class="icon-button" type="button" data-sheet-open="search" aria-label="Search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg></button><a class="reader-link" href="preferences.html">My HealthTimes</a><a class="reader-link" href="newsroom.html">Newsroom</a></div>
        </div><div class="topic-strip-wrap"><div class="shell topic-strip">${topics.map(t=>`<a href="index.html?topic=${encodeURIComponent(t[0])}#latest">${escapeHtml(t[0])}</a>`).join('')}<button class="text-link" type="button" data-open-ai>Ask HealthTimes</button></div></div></header>
        <div class="mobile-topbar"><button type="button" data-sheet-open="more" aria-label="Open menu"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><a class="mobile-brand" href="index.html">HealthTimes<small>Zimbabwe</small></a><button type="button" data-sheet-open="search" aria-label="Search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg></button></div>`;
    }

    const footer = $('#app-footer');
    if(footer){
      footer.innerHTML = `
        <footer class="site-footer"><div class="shell footer-grid"><div><a class="brand brand-footer" href="index.html"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 56 56"><path d="M28 4c10 0 18 8 18 18 0 14-18 30-18 30S10 36 10 22C10 12 18 4 28 4Z"/><path class="pulse" d="M15 27h7l4-9 5 17 4-8h7"/></svg></span><span class="brand-copy"><strong>HealthTimes</strong><small>Zimbabwe health & science newsroom</small></span></a><p>Independent health journalism covering Zimbabwe, Africa and global health developments with a focus on accuracy, clarity and evidence.</p></div>
          <div><h3>Coverage</h3><a href="index.html#latest">Latest</a><a href="index.html?topic=Public%20Health#latest">Public Health</a><a href="index.html?topic=HIV%2FAIDS#latest">HIV/AIDS</a><a href="index.html?topic=Health%20Policy#latest">Policy</a><a href="index.html?topic=Africa#latest">Africa</a></div>
          <div><h3>HealthTimes</h3><a href="premium.html">Premium</a><a href="about.html#standards">Editorial standards</a><a href="about.html#team">Editorial team</a><a href="about.html#corrections">Corrections</a><a href="newsroom.html">Newsroom</a></div>
          <div><h3>For readers</h3><button type="button" data-open-ai>Ask HealthTimes</button><a href="preferences.html">Email & WhatsApp briefings</a><button type="button" data-sheet-open="saved">Saved stories</button><a href="manual.html">Product manual</a><a href="https://wa.me/${WHATSAPP_DESK}" target="_blank" rel="noopener">WhatsApp HealthTimes</a></div></div>
          <div class="shell footer-bottom"><span>© 2026 HealthTimes Zimbabwe · MITAP Media Pvt Ltd</span><span>Health information is for general information and does not replace professional medical advice.</span></div></footer>
        <nav class="mobile-bottom-nav" aria-label="Mobile navigation"><a href="index.html" class="${page==='home'?'active':''}"><svg viewBox="0 0 24 24"><path d="m3 11 9-8 9 8v9h-6v-6H9v6H3Z"/></svg><span>Home</span></a><a href="index.html#latest"><svg viewBox="0 0 24 24"><path d="M5 5h14M5 10h14M5 15h9M5 20h7"/></svg><span>Latest</span></a><button class="ai-tab" type="button" data-open-ai><svg viewBox="0 0 24 24"><path d="M12 3a7 7 0 0 0-7 7v3a4 4 0 0 0 4 4h1l2 3 2-3h1a4 4 0 0 0 4-4v-3a7 7 0 0 0-7-7Z"/><path d="M9 11h.01M15 11h.01"/></svg><span>Ask AI</span></button><button type="button" data-sheet-open="saved"><svg viewBox="0 0 24 24"><path d="M6 4h12v17l-6-4-6 4Z"/></svg><span>Saved</span></button><button type="button" data-sheet-open="more"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg><span>More</span></button></nav>`;
    }

    document.body.insertAdjacentHTML('beforeend', `
      <div class="sheet-backdrop" data-sheet-backdrop hidden></div>
      <section class="sheet sheet-side" data-sheet="search" hidden aria-label="Search HealthTimes"><div class="sheet-head"><h2>Search HealthTimes</h2><button class="sheet-close" type="button" data-sheet-close aria-label="Close">×</button></div><div class="sheet-body"><label class="search-field"><span aria-hidden="true">⌕</span><input type="search" data-search-input placeholder="Topic, person or keyword…" autocomplete="off" /></label><div class="ai-prompt-grid" style="margin-bottom:14px"><button type="button" data-search-term="HIV">HIV</button><button type="button" data-search-term="financing">Health financing</button><button type="button" data-search-term="innovation">Innovation</button><button type="button" data-search-term="Zimbabwe">Zimbabwe</button></div><div class="search-results" data-search-results></div></div></section>
      <section class="sheet sheet-bottom" data-sheet="more" hidden aria-label="HealthTimes menu"><div class="sheet-head"><h2>HealthTimes</h2><button class="sheet-close" type="button" data-sheet-close aria-label="Close">×</button></div><div class="sheet-body"><div class="menu-links"><a href="index.html">Home</a><a href="index.html#latest">Latest reporting</a><a href="premium.html">HealthTimes Premium</a><button type="button" data-open-ai>Ask HealthTimes</button><a href="preferences.html">My HealthTimes</a><a href="about.html">About & editorial standards</a><a href="newsroom.html">Newsroom</a><a href="manual.html">Product manual</a></div></div></section>
      <section class="sheet sheet-bottom" data-sheet="saved" hidden aria-label="Saved stories"><div class="sheet-head"><h2>Saved stories</h2><button class="sheet-close" type="button" data-sheet-close aria-label="Close">×</button></div><div class="sheet-body"><div class="saved-list" data-saved-list></div></div></section>
      <section class="sheet sheet-bottom" data-sheet="subscribe" hidden aria-label="HealthTimes Premium"><div class="sheet-head"><h2>HealthTimes Premium</h2><button class="sheet-close" type="button" data-sheet-close aria-label="Close">×</button></div><div class="sheet-body subscribe-card"><span class="premium-pill">Premium membership</span><h2>Reporting that stays useful after the alert.</h2><p>Deep analysis, HealthTimes Intelligence, member briefings, saved reading and the full Premium archive.</p><div class="subscribe-benefits"><span>Unlimited Premium reporting</span><span>Weekly intelligence briefing</span><span>Deeper Ask HealthTimes context</span><span>Saved stories & topic alerts</span></div><div class="subscribe-price">US$5 <small>/ month</small></div><button class="button button-primary" type="button" data-subscribe-activate>Activate subscription</button><button class="not-now" type="button" data-sheet-close>Not now</button></div></section>
      <aside class="ai-panel" data-ai-panel aria-hidden="true"><div class="ai-header"><div class="ai-title"><span class="ai-dot"></span><div><strong>Ask HealthTimes</strong><small>HealthTimes Intelligence</small></div></div><button type="button" data-close-ai aria-label="Close">×</button></div><div class="ai-disclaimer">For information and journalism discovery only. HealthTimes Intelligence does not diagnose, prescribe or replace a qualified health professional.</div><div class="ai-messages" data-ai-messages><div class="ai-message assistant">Ask about a HealthTimes story, policy development, HIV coverage, health financing, research or recent reporting.</div></div><div class="ai-quick"><button type="button" data-ai-prompt="What are the latest stories?">Latest</button><button type="button" data-ai-prompt="Explain the biggest policy story">Policy</button><button type="button" data-ai-prompt="Show me HIV coverage">HIV</button><button type="button" data-ai-prompt="What is in Premium?">Premium</button></div><form class="ai-form" data-ai-form><input data-ai-input aria-label="Ask HealthTimes" placeholder="Ask HealthTimes…" /><button type="submit">Send</button></form></aside>
      <div class="toast" data-toast role="status" aria-live="polite"></div>`);
  }

  function storyCard(article){
    const saved = getStored(SAVED_KEY, []).includes(article.id);
    return `<article class="story-card"><a class="story-card-media" href="${articleUrl(article)}">${imageHtml(article)}</a><div>${premiumBadge(article)}<h3><a href="${articleUrl(article)}">${escapeHtml(article.title)}</a></h3><p>${escapeHtml(article.excerpt)}</p>${metaHtml(article)}</div><button class="save-mini ${saved?'saved':''}" type="button" data-save="${article.id}" aria-label="${saved?'Remove from':'Save to'} reading list">${saved?'✓':'＋'}</button></article>`;
  }

  function renderHome(){
    const hero = $('#hero-grid');
    if(!hero) return;
    const lead = articles[0], side = articles.slice(1,3), brief = articles.slice(3,7);
    hero.innerHTML = `<article class="hero-lead"><a class="hero-media" href="${articleUrl(lead)}">${imageHtml(lead)}</a>${premiumBadge(lead)}<h1><a href="${articleUrl(lead)}">${escapeHtml(lead.title)}</a></h1><p>${escapeHtml(lead.standfirst)}</p>${metaHtml(lead)}</article><div class="hero-stack">${side.map(a=>`<article class="hero-side-story"><a href="${articleUrl(a)}">${imageHtml(a)}</a><div>${premiumBadge(a)}<h2><a href="${articleUrl(a)}">${escapeHtml(a.title)}</a></h2>${metaHtml(a)}</div></article>`).join('')}</div><aside class="hero-brief"><div><span class="eyebrow">News brief</span><h2>What to know now</h2></div><ol class="brief-list">${brief.map(a=>`<li><span>${escapeHtml(a.category)} · ${escapeHtml(a.date)}</span><a href="${articleUrl(a)}">${escapeHtml(a.title)}</a></li>`).join('')}</ol></aside>`;

    const topicFilter = currentParams.get('topic');
    let list = articles.filter(a=>!a.premium);
    if(topicFilter){
      const needle = topicFilter.toLowerCase();
      list = articles.filter(a => `${a.category} ${a.beat} ${a.tags.join(' ')} ${a.title}`.toLowerCase().includes(needle));
      const label = $('[data-latest-title]'); if(label) label.textContent = `${topicFilter} reporting`;
    }
    const latest = $('#latest-grid'); if(latest) latest.innerHTML = (list.length?list:articles).slice(0,8).map(storyCard).join('');
    const trending = $('#trending-list'); if(trending) trending.innerHTML = articles.slice(0,5).map(a=>`<li><a href="${articleUrl(a)}">${escapeHtml(a.title)}</a></li>`).join('');
    const topicCards = $('#topic-cards'); if(topicCards) topicCards.innerHTML = topics.map(([name,desc])=>`<a class="topic-card" href="index.html?topic=${encodeURIComponent(name)}#latest"><span>${escapeHtml(desc)}</span><strong>${escapeHtml(name)}</strong><span>Explore reporting →</span></a>`).join('');
    const analysis = $('#analysis-grid'); if(analysis) analysis.innerHTML = [articles[2],articles[8],articles[9]].map(a=>`<article class="analysis-card">${premiumBadge(a)}<h3><a href="${articleUrl(a)}">${escapeHtml(a.title)}</a></h3><p>${escapeHtml(a.significance)}</p><a class="text-link" href="${articleUrl(a)}">Read analysis →</a></article>`).join('');
    const premiumCard = $('#premium-preview-card'); if(premiumCard){ const a = articles.find(x=>x.premium); premiumCard.innerHTML = `<span class="premium-pill">Member analysis</span><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.excerpt)}</p><a class="text-link" href="${articleUrl(a)}">Read with Premium →</a>`; }
  }

  function renderArticle(){
    const mount = $('#article-mount'); if(!mount) return;
    const article = findArticle(currentParams.get('id'));
    addReadingHistory(article.id);
    document.title = `${article.title} — HealthTimes`;
    const locked = article.premium && !isSubscribed() && premiumExpired();
    const visibleBody = article.premium && !isSubscribed() ? article.body.slice(0,2) : article.body;
    const gatedBody = article.premium && !isSubscribed() ? article.body.slice(2) : [];
    mount.innerHTML = `
      <div class="reading-progress" data-reading-progress></div>
      <article class="article-shell"><header class="article-head">${premiumBadge(article)}<h1>${escapeHtml(article.title)}</h1><p class="article-standfirst">${escapeHtml(article.standfirst)}</p><div class="article-byline"><div class="byline-person"><strong>By ${escapeHtml(article.author)}</strong><span>${escapeHtml(article.beat)} · HealthTimes</span></div>${metaHtml(article)}</div></header>
      <figure class="article-hero-image">${imageHtml(article)}</figure>
      ${article.premium&&!isSubscribed()?`<div class="preview-banner" data-premium-preview><span><strong>Premium preview</strong> · Read for 30 seconds before membership is required.</span><strong data-premium-timer>00:30</strong></div>`:''}
      <div class="article-layout"><aside class="article-rail" aria-label="Article actions"><button class="rail-action" type="button" data-save="${article.id}" title="Save">♡</button><button class="rail-action" type="button" data-share="${article.id}" title="Share">↗</button><button class="rail-action" type="button" data-open-ai data-ai-context="${article.id}" title="Ask HealthTimes">✦</button><button class="rail-action" type="button" data-discuss-whatsapp="${article.id}" title="Discuss on WhatsApp">W</button></aside>
      <div class="article-body" data-article-body>${visibleBody.map((p,i)=>`${i===1?`<div class="source-note"><strong>Why this matters:</strong> ${escapeHtml(article.significance)}</div>`:''}<p>${escapeHtml(p)}</p>`).join('')}
        ${article.premium&&!isSubscribed()?`<div class="gated-blur ${locked?'is-locked':''}" data-premium-gated>${gatedBody.map(p=>`<p>${escapeHtml(p)}</p>`).join('')}</div><div class="premium-lock-inline" data-premium-lock ${locked?'':'hidden'}><span class="premium-pill">Premium</span><h3>Continue with HealthTimes Premium</h3><p>Unlock the rest of this analysis, member briefings and HealthTimes Intelligence for US$5/month.</p><button class="button button-primary" type="button" data-sheet-open="subscribe">Continue for US$5/month</button></div>`:''}
        <div class="article-ai-box"><span class="eyebrow" style="color:#86e5dc">HealthTimes Intelligence</span><h3>Ask about this story</h3><p>Get a concise explanation grounded in this article and related HealthTimes reporting.</p><div class="ai-prompt-grid"><button type="button" data-open-ai data-ai-context="${article.id}" data-ai-prompt="Summarise this story">Summarise</button><button type="button" data-open-ai data-ai-context="${article.id}" data-ai-prompt="Why does this story matter?">Why it matters</button><button type="button" data-open-ai data-ai-context="${article.id}" data-ai-prompt="Show related coverage">Related coverage</button><button type="button" data-open-ai data-ai-context="${article.id}" data-ai-prompt="Explain this in plain language">Plain language</button></div></div>
        <div class="feedback-card"><div><strong>Help improve HealthTimes</strong><div style="font-size:.76rem;color:var(--muted)">Was this reporting useful?</div></div><div class="feedback-actions"><button type="button" data-feedback="useful" data-feedback-article="${article.id}">👍 Useful</button><button type="button" data-feedback="not-useful" data-feedback-article="${article.id}">👎 Not really</button><a href="mailto:editorial@healthtimes.co.zw?subject=${encodeURIComponent('Correction request: '+article.title)}">Request correction</a><button type="button" data-discuss-whatsapp="${article.id}">Comment on WhatsApp</button></div></div>
      </div><aside class="article-context"><div class="context-card"><span class="eyebrow">Story file</span><h3>Reporting context</h3><ul><li>Beat: ${escapeHtml(article.beat)}</li><li>Primary source: ${escapeHtml(article.source)}</li><li>Editorial review: ${escapeHtml(article.reviewer)}</li><li>Updated: ${escapeHtml(article.updated)}</li></ul></div><div class="context-card"><h3>Source article</h3><p>Read the original HealthTimes publication and supporting context.</p><a class="text-link" href="${escapeHtml(article.sourceUrl)}" target="_blank" rel="noopener">Open source →</a></div></aside></div></article>`;

    const related = $('#related-grid'); if(related){ const rel = relatedArticles(article,3); related.innerHTML = rel.map(a=>`<article class="related-card">${premiumBadge(a)}<h3><a href="${articleUrl(a)}">${escapeHtml(a.title)}</a></h3>${metaHtml(a)}</article>`).join(''); }
    if(article.premium && !isSubscribed()) startPremiumTimer();
    setupReadingProgress();
  }

  function renderPremium(){
    const feature = $('#premium-feature'); if(!feature) return;
    const premium = articles.filter(a=>a.premium);
    const lead = premium[0];
    feature.innerHTML = `<div class="premium-feature-media">${imageHtml(lead)}</div><div class="premium-feature-copy"><span class="premium-pill">Featured analysis</span><h2>${escapeHtml(lead.title)}</h2><p>${escapeHtml(lead.standfirst)}</p>${metaHtml(lead)}<a class="button button-primary" style="margin-top:18px" href="${articleUrl(lead)}">Read the analysis</a></div>`;
    const grid = $('#premium-grid'); if(grid) grid.innerHTML = premium.map(storyCard).join('');
    const state = $('[data-membership-state]'); if(state) state.textContent = isSubscribed() ? 'Premium active' : 'US$5/month';
    if(!isSubscribed()) startPremiumTimer(); else unlockPremiumUi();
  }

  function renderPreferences(){
    const form = $('[data-preferences-form]'); if(!form) return;
    const prefs = getStored(PREFS_KEY,{topics:['Breaking Health News','Health Policy'],frequency:'weekly',channels:['email'],email:'',phone:''});
    $$('[name="topics"]',form).forEach(el=>{el.checked=prefs.topics.includes(el.value)});
    $$('[name="channels"]',form).forEach(el=>{el.checked=prefs.channels.includes(el.value)});
    if(form.frequency) form.frequency.value=prefs.frequency;
    if(form.email) form.email.value=prefs.email||'';
    if(form.phone) form.phone.value=prefs.phone||'';
    updateBriefingPreview(prefs);
    form.addEventListener('change',()=>updateBriefingPreview(readPrefsForm(form)));
    form.addEventListener('submit',e=>{e.preventDefault();const next=readPrefsForm(form);setStored(PREFS_KEY,next);updateBriefingPreview(next);const msg=$('[data-preferences-message]');if(msg){msg.textContent='Preferences saved.';setTimeout(()=>msg.textContent='',2500)}showToast('Your HealthTimes preferences are saved.');});
  }

  function readPrefsForm(form){ return {topics:$$('[name="topics"]',form).filter(x=>x.checked).map(x=>x.value),channels:$$('[name="channels"]',form).filter(x=>x.checked).map(x=>x.value),frequency:form.frequency?.value||'weekly',email:form.email?.value.trim()||'',phone:form.phone?.value.trim()||''}; }
  function updateBriefingPreview(prefs){
    const mount=$('[data-briefing-preview]');if(!mount)return;
    const matches=articles.filter(a=>prefs.topics.some(t=>`${a.category} ${a.beat} ${a.tags.join(' ')}`.toLowerCase().includes(t.replace('Breaking Health News','Health News').toLowerCase().split(' ')[0]))).slice(0,4);
    mount.innerHTML=`<span class="eyebrow" style="color:#83e4da">Your ${escapeHtml(prefs.frequency)} briefing</span><h3>This week in health</h3><p>Built from HealthTimes reporting in the topics you follow.</p><ol>${(matches.length?matches:articles.slice(0,4)).map(a=>`<li>${escapeHtml(a.title)}</li>`).join('')}</ol><p><strong>Channels:</strong> ${prefs.channels.length?prefs.channels.map(x=>escapeHtml(x)).join(' · '):'None selected'}</p>`;
  }

  function relatedArticles(article,count=4){ return articles.filter(a=>a.id!==article.id).map(a=>({a,score:a.tags.filter(t=>article.tags.includes(t)).length+(a.category===article.category?2:0)})).sort((x,y)=>y.score-x.score).slice(0,count).map(x=>x.a); }
  function addReadingHistory(id){ const history=getStored(HISTORY_KEY,[]).filter(x=>x!==id);history.unshift(id);setStored(HISTORY_KEY,history.slice(0,20)); }
  function toggleSave(id){ const saved=getStored(SAVED_KEY,[]);const next=saved.includes(id)?saved.filter(x=>x!==id):[id,...saved];setStored(SAVED_KEY,next);$$(`[data-save="${CSS.escape(id)}"]`).forEach(btn=>{btn.classList.toggle('saved',next.includes(id));if(btn.classList.contains('save-mini'))btn.textContent=next.includes(id)?'✓':'＋';});showToast(next.includes(id)?'Saved to your reading list.':'Removed from saved stories.');renderSavedList(); }
  function renderSavedList(){ const mount=$('[data-saved-list]');if(!mount)return;const saved=getStored(SAVED_KEY,[]).map(findArticle);mount.innerHTML=saved.length?saved.map(a=>`<article class="saved-item">${premiumBadge(a)}<h3><a href="${articleUrl(a)}">${escapeHtml(a.title)}</a></h3>${metaHtml(a)}<button class="text-link" type="button" data-save="${a.id}">Remove</button></article>`).join(''):'<p>You have no saved stories yet. Tap the save control on any article to build your reading list.</p>'; }

  function premiumExpired(){
    if(isSubscribed()) return false;
    let start=0;try{start=Number(localStorage.getItem(PREVIEW_KEY)||0)}catch{}
    return start>0 && Date.now()-start>=PREVIEW_MS;
  }
  function ensurePreviewStart(){ if(isSubscribed())return Date.now();let start=0;try{start=Number(localStorage.getItem(PREVIEW_KEY)||0);if(!start){start=Date.now();localStorage.setItem(PREVIEW_KEY,String(start));}}catch{start=Date.now()}return start; }
  let premiumTimerHandle=null;
  function startPremiumTimer(){
    if(isSubscribed())return;
    const start=ensurePreviewStart();
    clearInterval(premiumTimerHandle);
    const tick=()=>{const remaining=Math.max(0,PREVIEW_MS-(Date.now()-start));const text=`00:${String(Math.ceil(remaining/1000)).padStart(2,'0')}`;$$('[data-premium-timer]').forEach(el=>el.textContent=text);if(remaining<=0){clearInterval(premiumTimerHandle);lockPremiumUi();}};
    tick();premiumTimerHandle=setInterval(tick,250);
  }
  function lockPremiumUi(){ $$('[data-premium-lock]').forEach(el=>el.hidden=false);$$('[data-premium-gated]').forEach(el=>el.classList.add('is-locked'));const pageGate=$('[data-premium-page-gate]');if(pageGate)pageGate.hidden=false; }
  function unlockPremiumUi(){ $$('[data-premium-lock]').forEach(el=>el.hidden=true);$$('[data-premium-gated]').forEach(el=>el.classList.remove('is-locked'));const pageGate=$('[data-premium-page-gate]');if(pageGate)pageGate.hidden=true;$$('[data-premium-preview]').forEach(el=>el.hidden=true); }
  function activateSubscription(){ try{localStorage.setItem(SUBSCRIBED_KEY,'true')}catch{} clearInterval(premiumTimerHandle);unlockPremiumUi();closeSheets();showToast('HealthTimes Premium is active.');if(page==='premium')renderPremium();if(page==='article')renderArticle(); }

  function openSheet(name){
    closeSheets(false);const sheet=$(`[data-sheet="${CSS.escape(name)}"]`);const backdrop=$('[data-sheet-backdrop]');if(!sheet||!backdrop)return;sheet.hidden=false;backdrop.hidden=false;document.body.classList.add('sheet-open');requestAnimationFrame(()=>{sheet.classList.add('open');backdrop.classList.add('visible')});if(name==='saved')renderSavedList();if(name==='search')setTimeout(()=>$('[data-search-input]')?.focus(),120);
  }
  function closeSheets(restoreBody=true){ $$('[data-sheet]').forEach(s=>s.classList.remove('open'));const b=$('[data-sheet-backdrop]');if(b)b.classList.remove('visible');setTimeout(()=>{$$('[data-sheet]').forEach(s=>s.hidden=true);if(b)b.hidden=true;if(restoreBody)document.body.classList.remove('sheet-open')},210); }
  function openAi(contextId='',prompt=''){
    closeSheets();const panel=$('[data-ai-panel]');if(!panel)return;panel.dataset.context=contextId||panel.dataset.context||'';panel.classList.add('open');panel.setAttribute('aria-hidden','false');if(prompt){setTimeout(()=>askAi(prompt),50)}setTimeout(()=>$('[data-ai-input]')?.focus(),160);
  }
  function closeAi(){const panel=$('[data-ai-panel]');if(!panel)return;panel.classList.remove('open');panel.setAttribute('aria-hidden','true');}

  function searchArticles(term){ const q=term.toLowerCase().trim();if(!q)return articles.slice(0,6);return articles.filter(a=>`${a.title} ${a.category} ${a.beat} ${a.author} ${a.tags.join(' ')} ${a.excerpt}`.toLowerCase().includes(q)).slice(0,10); }
  function renderSearch(term=''){const mount=$('[data-search-results]');if(!mount)return;const results=searchArticles(term);mount.innerHTML=results.length?results.map(a=>`<article class="search-result">${premiumBadge(a)}<h3><a href="${articleUrl(a)}">${escapeHtml(a.title)}</a></h3>${metaHtml(a)}</article>`).join(''):'<p>No matching HealthTimes stories were found in this edition.</p>';}

  function askAi(question){
    const input=$('[data-ai-input]');if(input)input.value='';const messages=$('[data-ai-messages]');if(!messages)return;messages.insertAdjacentHTML('beforeend',`<div class="ai-message user">${escapeHtml(question)}</div>`);const panel=$('[data-ai-panel]');const context=panel?.dataset.context?findArticle(panel.dataset.context):null;const answer=aiAnswer(question,context);setTimeout(()=>{messages.insertAdjacentHTML('beforeend',`<div class="ai-message assistant">${answer.html}<span class="ai-source">${answer.source}</span></div>`);messages.scrollTop=messages.scrollHeight},180);
  }
  function aiAnswer(question,context){
    const q=question.toLowerCase();
    const medical=/diagnos|dose|dosage|should i take|medicine should|treat my|my symptoms|chest pain|can.t breathe|suicid|overdose|emergency/.test(q);
    if(medical) return {html:'I can help explain HealthTimes reporting and general context, but I cannot diagnose a condition, recommend medication or provide dosing. If this may be an emergency, contact local emergency services or a qualified health professional now.',source:'HealthTimes medical-information safety standard'};
    if(context && /(summar|plain language|what does)/.test(q)) return {html:`<strong>${escapeHtml(context.title)}</strong><br>${escapeHtml(context.standfirst)} In plain terms: ${escapeHtml(context.significance)}`,source:`HealthTimes reporting · ${escapeHtml(context.date)}`};
    if(context && /(why|matter|important)/.test(q)) return {html:escapeHtml(context.significance),source:`Grounded in “${escapeHtml(context.title)}”`};
    if(context && /related/.test(q)){const rel=relatedArticles(context,3);return {html:`Related HealthTimes coverage:<br>${rel.map(a=>`• <a href="${articleUrl(a)}"><strong>${escapeHtml(a.title)}</strong></a>`).join('<br>')}`,source:'HealthTimes archive in this edition'};}
    if(/premium/.test(q)) return {html:'HealthTimes Premium is the deeper reporting layer: long-form policy and financing analysis, member briefings, expanded HealthTimes Intelligence, saved reading and topic alerts. Membership is US$5/month.',source:'HealthTimes Premium proposition'};
    if(/latest|recent|today/.test(q)) return {html:`The latest stories in this edition are:<br>${articles.slice(0,4).map(a=>`• <a href="${articleUrl(a)}"><strong>${escapeHtml(a.title)}</strong></a>`).join('<br>')}`,source:'HealthTimes latest reporting'};
    const terms=q.split(/\W+/).filter(w=>w.length>3 && !['what','show','about','healthtimes','story','stories'].includes(w));
    const ranked=articles.map(a=>({a,score:terms.reduce((s,t)=>s+(`${a.title} ${a.category} ${a.beat} ${a.tags.join(' ')} ${a.excerpt}`.toLowerCase().includes(t)?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,4).map(x=>x.a);
    if(ranked.length) return {html:`I found ${ranked.length} relevant HealthTimes ${ranked.length===1?'story':'stories'}:<br>${ranked.map(a=>`• <a href="${articleUrl(a)}"><strong>${escapeHtml(a.title)}</strong></a> — ${escapeHtml(a.excerpt)}`).join('<br><br>')}`,source:'Matched against HealthTimes reporting in this edition'};
    return {html:'I can help with recent HealthTimes reporting, HIV/AIDS, health policy, financing, public health, research, innovation, Premium coverage and the story you are currently reading. Try asking “Why does the NatPharm inquiry matter?” or “Show me HIV coverage.”',source:'HealthTimes Intelligence'};
  }

  async function shareArticle(id){const a=findArticle(id);const url=absoluteArticleUrl(a);if(navigator.share){try{await navigator.share({title:a.title,text:a.excerpt,url});return}catch{}}try{await navigator.clipboard.writeText(url);showToast('Article link copied.')}catch{location.href=url}}
  function openSocial(network,id){const a=findArticle(id);const url=encodeURIComponent(absoluteArticleUrl(a));const title=encodeURIComponent(a.title);const map={whatsapp:`https://wa.me/?text=${title}%20${url}`,facebook:`https://www.facebook.com/sharer/sharer.php?u=${url}`,x:`https://twitter.com/intent/tweet?text=${title}&url=${url}`,linkedin:`https://www.linkedin.com/sharing/share-offsite/?url=${url}`};if(map[network])window.open(map[network],'_blank','noopener,noreferrer');}
  function discussWhatsApp(id){const a=findArticle(id);const text=encodeURIComponent(`Hello HealthTimes. I am commenting on: ${a.title}\n${absoluteArticleUrl(a)}\n\nMy comment: `);window.open(`https://wa.me/${WHATSAPP_DESK}?text=${text}`,'_blank','noopener,noreferrer');}
  function recordFeedback(id,value){const all=getStored(FEEDBACK_KEY,{});all[id]={value,at:new Date().toISOString()};setStored(FEEDBACK_KEY,all);showToast('Thank you. Your feedback has been recorded.');}
  function showToast(message){const toast=$('[data-toast]');if(!toast)return;toast.textContent=message;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),2400);}
  function setupReadingProgress(){const bar=$('[data-reading-progress]');if(!bar)return;const update=()=>{const max=document.documentElement.scrollHeight-innerHeight;bar.style.width=`${max>0?Math.min(100,(scrollY/max)*100):0}%`};addEventListener('scroll',update,{passive:true});update();}

  function bindGlobalEvents(){
    document.addEventListener('click',e=>{
      const open=e.target.closest('[data-sheet-open]');if(open){e.preventDefault();openSheet(open.dataset.sheetOpen);return}
      if(e.target.closest('[data-sheet-close]')||e.target.matches('[data-sheet-backdrop]')){e.preventDefault();closeSheets();return}
      const ai=e.target.closest('[data-open-ai]');if(ai){e.preventDefault();openAi(ai.dataset.aiContext||'',ai.dataset.aiPrompt||'');return}
      if(e.target.closest('[data-close-ai]')){closeAi();return}
      const save=e.target.closest('[data-save]');if(save){e.preventDefault();toggleSave(save.dataset.save);return}
      const share=e.target.closest('[data-share]');if(share){e.preventDefault();shareArticle(share.dataset.share);return}
      const social=e.target.closest('[data-social]');if(social){e.preventDefault();openSocial(social.dataset.social,social.dataset.articleId);return}
      const discuss=e.target.closest('[data-discuss-whatsapp]');if(discuss){e.preventDefault();discussWhatsApp(discuss.dataset.discussWhatsapp);return}
      if(e.target.closest('[data-subscribe-activate]')){activateSubscription();return}
      const fb=e.target.closest('[data-feedback]');if(fb){recordFeedback(fb.dataset.feedbackArticle,fb.dataset.feedback);return}
      const prompt=e.target.closest('[data-ai-prompt]');if(prompt&&!prompt.closest('[data-open-ai]')){e.preventDefault();openAi('',prompt.dataset.aiPrompt);return}
      const term=e.target.closest('[data-search-term]');if(term){const input=$('[data-search-input]');if(input)input.value=term.dataset.searchTerm;renderSearch(term.dataset.searchTerm);return}
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeAi();closeSheets();}});
    document.addEventListener('input',e=>{if(e.target.matches('[data-search-input]'))renderSearch(e.target.value)});
    document.addEventListener('submit',e=>{if(e.target.matches('[data-ai-form]')){e.preventDefault();const input=$('[data-ai-input]');const q=input?.value.trim();if(q)askAi(q);}});
  }

  function addSocialBar(){const mount=$('[data-social-bar]');if(!mount)return;const a=findArticle(currentParams.get('id'));mount.innerHTML=`<span>Share</span><button type="button" data-social="whatsapp" data-article-id="${a.id}">WhatsApp</button><button type="button" data-social="facebook" data-article-id="${a.id}">Facebook</button><button type="button" data-social="x" data-article-id="${a.id}">X</button><button type="button" data-social="linkedin" data-article-id="${a.id}">LinkedIn</button><button type="button" data-share="${a.id}">Copy / Share</button>`;}

  function handleImageErrors(){document.addEventListener('error',e=>{if(e.target.tagName==='IMG'){const p=e.target.parentElement;e.target.remove();if(p&&!p.querySelector('.story-placeholder'))p.insertAdjacentHTML('afterbegin','<div class="story-placeholder" aria-hidden="true"><span>HealthTimes</span></div>')}},true);}

  injectChrome();
  bindGlobalEvents();
  handleImageErrors();
  renderSearch();
  renderHome();
  renderArticle();
  renderPremium();
  renderPreferences();
  addSocialBar();
})();
