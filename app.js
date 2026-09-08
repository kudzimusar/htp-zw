(() => {
  'use strict';

  const PREVIEW_MS = 30_000;
  const PREVIEW_KEY = 'htpPremiumPreviewStartedAt';
  const SUBSCRIBED_KEY = 'htpDemoSubscribed';
  const SAVED_KEY = 'htpSavedArticles';

  const articles = [
    {
      id: 'natpharm-supply-chain',
      title: 'Parliament Probes NatPharm Over Zimbabwe’s Medicine Supply Chain',
      category: 'Health News',
      tags: ['Public Health', 'Policy', 'Medicines'],
      date: 'September 7, 2026',
      author: 'Michael Gwarisa',
      readTime: '5 min read',
      image: 'https://healthtimes.co.zw/wp-content/uploads/2026/09/bajila.jpg',
      imageAlt: 'Parliamentary Portfolio Committee on Health and Child Care chair Descent Collins Bajila',
      standfirst: 'Parliament has resumed its inquiry into Zimbabwe’s medicines supply system, focusing on procurement, storage, distribution, accountability and whether public investment is translating into reliable supplies for patients.',
      excerpt: 'Lawmakers are examining where bottlenecks occur between funding medicines and getting them to patients, with NatPharm’s forecasting, distribution and digital systems under scrutiny.',
      sourceUrl: 'https://healthtimes.co.zw/parliament-probes-natpharm-zimbabwe-medicine-supply-chain/',
      body: [
        'Zimbabwe’s Parliamentary Portfolio Committee on Health and Child Care has resumed scrutiny of the national medicines supply chain, with NatPharm at the centre of questions about procurement, storage, distribution and accountability.',
        'The inquiry is looking beyond the amount of money allocated to medicines and asking what patients ultimately receive from that public investment. Lawmakers are also examining whether stock systems can anticipate demand rather than repeatedly reacting to shortages.',
        'NatPharm plays a central role in procuring, storing and distributing medicines to public health institutions. The committee has highlighted financing, inventory management, demand forecasting, rural access and institutional capacity as key areas requiring clearer evidence.',
        'Digital modernisation is another major theme. Better logistics visibility, forecasting and procurement systems could help the health sector understand where stock is available and respond earlier when demand changes.',
        'The next test will be whether the inquiry produces practical reforms that improve the reliability of medicines reaching health facilities — especially facilities serving rural and marginalised communities.'
      ]
    },
    {
      id: 'harare-sti-cases',
      title: 'Harare STI Cases Fall Below 2,000 Per Quarter, NAC Says',
      category: 'Breaking News',
      tags: ['HIV/AIDS', 'Public Health', 'Harare'],
      date: 'September 7, 2026',
      author: 'Kuda Pembere',
      readTime: '4 min read',
      image: 'https://healthtimes.co.zw/wp-content/uploads/2026/09/adonijah-muzondiona-nac-harare-sti-cases.jpeg',
      imageAlt: 'NAC Harare Province manager Adonijah Muzondiona discussing STI and HIV prevention',
      standfirst: 'NAC says quarterly STI cases in Harare have fallen below 2,000, although adolescents and young women aged 15 to 24 continue to carry a disproportionate share of new infections.',
      excerpt: 'Targeted community and youth programmes are being credited with the decline, but prevention efforts remain focused on the high burden among adolescents and young women.',
      sourceUrl: 'https://healthtimes.co.zw/harare-sti-cases-fall-below-2000-per-quarter-nac/',
      body: [
        'Sexually transmitted infection cases in Harare Province have fallen to fewer than 2,000 per quarter, according to the National AIDS Council, down from the 2,000 to 3,000 cases that had previously been recorded.',
        'NAC Harare Province manager Adonijah Muzondiona linked the improvement to programmes that take HIV and STI prevention services into communities and use peer-led networks to reach adolescents and young people.',
        'The improvement does not remove the underlying concern. Adolescents and young women aged 15 to 24 are still reported to account for a disproportionate share of new infections, keeping age-targeted prevention at the centre of the response.',
        'NAC is using initiatives including youth clubs and peer networks to increase self-awareness and prevention. The organisation has also highlighted the risks created by relationships between adolescent girls and substantially older men.',
        'The figures being discussed draw partly on 2025 annual reporting and 2026 quarterly data, so the direction of travel is encouraging but still requires careful tracking as new data becomes available.'
      ]
    },
    {
      id: 'healthathon-innovation',
      title: 'Healthathon 3.0: What Zimbabwe’s Health Innovation Challenge Is Telling Us',
      category: 'Opinion & Analysis',
      tags: ['Science & Innovation', 'Health Technology', 'Commentary'],
      date: 'September 7, 2026',
      author: 'Michael Gwarisa',
      readTime: '7 min read',
      image: 'https://healthtimes.co.zw/wp-content/uploads/2026/09/girls-that-code-healthathon-3-cimas-certificates.jpg.png',
      imageAlt: 'Girls participants holding certificates at Cimas Healthathon 3.0',
      standfirst: 'The third Cimas Healthathon points to a larger, more diverse health-innovation ecosystem — but the next challenge is turning promising competition entries into solutions that survive real clinical and public-health conditions.',
      excerpt: 'Submissions grew from six in the first edition to more than 300 this year, while prototypes, research-led ideas and participation by women and young innovators became more visible.',
      sourceUrl: 'https://healthtimes.co.zw/healthathon-3-zimbabwe-health-innovation/',
      body: [
        'Healthathon 3.0 offered a useful snapshot of how Zimbabwe’s health innovation ecosystem is changing. The competition has expanded dramatically, signalling that more students, health professionals and technologists see healthcare challenges as problems they can help solve.',
        'Growth alone is not enough. Strong entries still need originality, a clear understanding of the health problem and a reason why the proposed approach is appropriate for Zimbabwe’s realities.',
        'One encouraging shift is the move beyond software-only ideas. Physical prototypes and hardware concepts force teams to confront questions about usability, cost, manufacturing, clinical workflows and whether an invention can operate reliably in real health settings.',
        'Research remains a decisive differentiator. The strongest ideas start with the burden of disease, existing evidence, patient and health-worker needs, and gaps in current interventions — then choose technology that serves that understanding.',
        'The next phase is ecosystem building. Promising solutions need mentorship, clinical validation, regulatory guidance, funding and access to health facilities where products can be tested and improved instead of ending when the competition closes.'
      ]
    },
    {
      id: 'medical-services-directorate',
      title: 'Zimbabwe Creates New Medical Services Directorate to Strengthen Specialist and Emergency Care',
      category: 'Health News',
      tags: ['Policy', 'Emergency Care', 'Health Systems'],
      date: 'September 7, 2026',
      author: 'Michael Gwarisa',
      readTime: '5 min read',
      image: 'https://healthtimes.co.zw/wp-content/uploads/2026/07/perm-sec-maunganidze-at-health-sector-working-group-meeting.JPG.jpeg',
      imageAlt: 'Dr Aspect Maunganidze speaking at a health sector meeting',
      standfirst: 'The Ministry of Health and Child Care has approved a dedicated medical services directorate intended to improve coordination of specialist, emergency and surgical care.',
      excerpt: 'The new structure includes dedicated emergency-services and surgical-plan coordination posts, with government saying the organisational change must translate into measurable improvements for patients.',
      sourceUrl: 'https://healthtimes.co.zw/zimbabwe-creates-new-medical-services-directorate-to-strengthen-specialist-emergency-care/',
      body: [
        'Zimbabwe’s Ministry of Health and Child Care has established a Directorate of Medical Services within a broader organisational restructuring intended to strengthen specialist, emergency and surgical care.',
        'The structure creates dedicated responsibility for emergency services and coordination of the National Surgical, Obstetric and Anaesthesia Plan. The goal is clearer accountability and a stronger platform for bringing specialist expertise into health-system planning.',
        'Permanent Secretary Dr Aspect Maunganidze has stressed that new reporting lines will matter only if they produce better services on the ground — including stronger referrals, faster emergency response and wider access to specialist care outside major centres.',
        'The ministry is also linking the reforms to workforce planning across training institutions, the Health Services Commission and regulated professional bodies. Recruitment, deployment, retention and specialist output remain central constraints.',
        'The policy direction aligns with the National Health Strategy for 2026–2030 and its universal-health-coverage agenda. The practical measure will be whether patients experience shorter delays and more reliable access to appropriate specialist services.'
      ]
    },
    {
      id: 'hiph-ai-learning',
      title: 'HIPH Upgrades Computer Lab to Drive AI-Based Learning',
      category: 'Health News',
      tags: ['Health Technology', 'Education', 'AI'],
      date: 'August 28, 2026',
      author: 'Kuda Pembere',
      readTime: '4 min read',
      image: 'https://healthtimes.co.zw/wp-content/uploads/2026/08/IMG-20260828-WA0008-1.jpg',
      imageAlt: 'Students in the upgraded Harare Institute of Public Health computer laboratory',
      standfirst: 'The Harare Institute of Public Health has expanded its computer laboratory from 80 to 120 seats as it prepares students for AI-supported learning, research and innovation.',
      excerpt: 'HIPH says the upgraded lab will support AI-based learning and research while helping students build practical digital skills for an increasingly technology-driven health sector.',
      sourceUrl: 'https://healthtimes.co.zw/hiph-upgrades-computer-lab-to-drive-ai-based-learning/',
      body: [
        'The Harare Institute of Public Health has expanded its computer laboratory from 80 to 120 seats and says the upgraded facility will support AI-based learning and research.',
        'The institution expects the additional computing capacity to give more students reliable access to modern digital tools, helping them conduct research, work through difficult concepts and build technology skills relevant to contemporary public health practice.',
        'HIPH says its approach is to use AI as a learning aid rather than a substitute for the curriculum. The goal is to prepare students to work productively with emerging technology while continuing to develop research and practical problem-solving skills.',
        'The upgrade is also being positioned within Zimbabwe’s broader Education 5.0 and heritage-based education priorities, which emphasise research, innovation and solutions that can be applied in the local economy.'
      ]
    },
    {
      id: 'japan-incinerator',
      title: 'Zimbabwe Commissions Japan-Funded Incinerator at Parirenyatwa Hospital',
      category: 'Health News',
      tags: ['Public Health', 'Japan', 'Infrastructure'],
      date: 'August 26, 2026',
      author: 'Kuda Pembere',
      readTime: '5 min read',
      image: 'https://healthtimes.co.zw/wp-content/uploads/2026/08/Kwidini-and-Japanese-Ambassador.jpeg',
      imageAlt: 'Zimbabwe and Japanese representatives at the Parirenyatwa medical waste incinerator commissioning',
      standfirst: 'A new medical-waste incinerator at Parirenyatwa can process up to 187 kilograms per hour as part of a three-hospital project funded by Japan.',
      excerpt: 'The US$2.2 million programme has installed incinerators at Parirenyatwa, United Bulawayo Hospitals and Masvingo Provincial Hospital to strengthen infection prevention and safer waste disposal.',
      sourceUrl: 'https://healthtimes.co.zw/zimbabwe-commissions-japan-funded-incinerator-at-parirenyatwa-hospital/',
      body: [
        'Zimbabwe has commissioned a new medical-waste incinerator at Parirenyatwa Group of Hospitals as part of a programme intended to strengthen infection prevention and modernise healthcare waste management.',
        'The project is funded by the Government of Japan and implemented with UNOPS. Related installations have also been completed at United Bulawayo Hospitals and Masvingo Provincial Hospital.',
        'The Parirenyatwa unit is designed to process roughly 150 to 187 kilograms of medical waste per hour and can operate for extended periods each day. Officials say automated controls and lower-emission technology should improve safety and efficiency compared with older disposal methods.',
        'The wider public-health benefit is reduced exposure to hazardous healthcare waste for staff, patients and nearby communities. The investment also highlights the infrastructure required to keep infection-prevention systems functioning beyond clinical treatment itself.'
      ]
    },
    {
      id: 'healthcare-provision-programme',
      title: 'Zimbabwe Drops National Health Insurance Name, Unveils Tax-Funded Healthcare Provision Programme',
      category: 'Health Financing',
      tags: ['HealthTimes Premium', 'Policy', 'Universal Health Coverage'],
      date: 'July 23, 2026',
      author: 'Michael Gwarisa',
      readTime: '8 min read',
      image: 'https://healthtimes.co.zw/wp-content/uploads/2026/04/Mombeshora-nurses-strike-presser.jpg',
      imageAlt: 'Zimbabwe Health and Child Care Minister Dr Douglas Mombeshora',
      standfirst: 'Zimbabwe is shifting from the language of national health insurance to a tax-funded National Healthcare Provision Programme intended to make public care free at the point of service.',
      excerpt: 'The proposed model would pool public revenue rather than operate like conventional insurance, with legislation still required before the programme can take effect.',
      sourceUrl: 'https://healthtimes.co.zw/zimbabwe-national-healthcare-provision-programme-mombeshora/',
      premium: true,
      body: [
        'Zimbabwe has reframed its planned universal-health-coverage financing mechanism as a National Healthcare Provision Programme rather than a conventional insurance scheme.',
        'The distinction is important. Under the model described by health authorities, citizens would not build individual insurance balances through monthly premiums. Instead, public revenue streams would be pooled to finance an essential package of services at public institutions.',
        'The policy ambition is for patients to receive consultations, investigations, treatment and admission without paying at the point of care. Government would still need to finance those services sustainably through the broader tax and revenue system.',
        'Officials have discussed drawing on existing revenue sources and earmarked flows rather than treating the programme as a stand-alone private-insurance product. The legal framework still requires approval through the legislative process.',
        'For households, the central policy question is whether pooled public financing can reduce catastrophic out-of-pocket costs without creating new gaps in funding, administration or service quality.',
        'For providers, implementation will depend on predictable funding, procurement and reimbursement mechanisms. Universal entitlement on paper cannot deliver universal access if medicines, staff, diagnostics or beds remain unavailable.',
        'The programme therefore sits at the intersection of financing reform and health-system capacity. Its success will depend not only on how money is collected, but also on whether those resources consistently translate into usable services for patients.'
      ]
    },
    {
      id: 'funding-cliff',
      title: 'Zimbabwe Faces Funding Cliff as U.S. Ends Support for HIV, TB and Malaria Programmes',
      category: 'Health Financing',
      tags: ['HealthTimes Premium', 'HIV/AIDS', 'Global Health'],
      date: 'July 24, 2026',
      author: 'Kuda Pembere',
      readTime: '7 min read',
      image: '',
      imageAlt: 'Health financing analysis',
      standfirst: 'Zimbabwe faces renewed pressure to strengthen domestic health financing as external support for major HIV, TB, malaria and maternal-health programmes changes.',
      excerpt: 'The funding shift raises immediate sustainability questions around essential programmes and the pace at which domestic resource mobilisation can replace external support.',
      sourceUrl: 'https://healthtimes.co.zw/',
      premium: true,
      body: [
        'Changes in external health financing are increasing pressure on Zimbabwe to build more durable domestic funding for programmes that have historically relied on donor support.',
        'The concern is not simply the headline value of grants. Funding changes can affect staff, commodities, laboratories, community programmes and the systems that connect patients to treatment.',
        'Domestic resource mobilisation is therefore both a budget issue and a continuity-of-care issue. The transition has to protect services while government and partners decide which activities can be absorbed into national financing structures.',
        'Long-term resilience will depend on predictable public funding, stronger prioritisation and better visibility into which programmes create the greatest health impact for each dollar spent.'
      ]
    },
    {
      id: 'hiv-brain-research',
      title: 'Undetectable Isn’t the Whole Story: Study Finds Signs of HIV Immune Activity in the Brain',
      category: 'Research & Findings',
      tags: ['HealthTimes Premium', 'HIV/AIDS', 'Medical Research'],
      date: 'July 28, 2026',
      author: 'Michael Gwarisa',
      readTime: '8 min read',
      image: '',
      imageAlt: 'HIV research analysis',
      standfirst: 'Emerging research is examining what persistent immune activity in the brain may mean even when HIV is well controlled in the blood.',
      excerpt: 'The findings underline why an undetectable viral load remains essential while researchers continue to investigate longer-term effects beyond routine blood measurements.',
      sourceUrl: 'https://healthtimes.co.zw/',
      premium: true,
      body: [
        'Modern antiretroviral therapy can suppress HIV in the blood to undetectable levels, transforming life expectancy and reducing transmission risk. Researchers are still studying whether every part of the body reflects that same level of biological quiet.',
        'New work presented in 2026 has renewed attention on immune activity in the brain and what persistent signals could mean for long-term neurological health.',
        'The findings do not change the central importance of effective treatment or the public-health message around viral suppression. They instead add another layer to research on ageing with HIV and the need to understand reservoirs and inflammation over decades.'
      ]
    },
    {
      id: 'africa-cdc-ebola',
      title: 'Africa CDC Assures Delegates Ahead of CPHIA as DRC Ebola Outbreak Surges',
      category: 'Africa',
      tags: ['Global Health', 'Diseases & Conditions', 'Epidemics'],
      date: 'August 27, 2026',
      author: 'Michael Gwarisa',
      readTime: '5 min read',
      image: '',
      imageAlt: 'Africa public health coverage',
      standfirst: 'Africa CDC says preparations for the Conference on Public Health in Africa remain on track while health authorities monitor a worsening Ebola outbreak in the Democratic Republic of Congo.',
      excerpt: 'The situation is testing continental outbreak coordination while organisers work to reassure delegates about public-health readiness.',
      sourceUrl: 'https://healthtimes.co.zw/',
      body: [
        'Africa CDC has sought to reassure delegates about preparations for the Conference on Public Health in Africa while authorities continue to respond to an Ebola outbreak in the Democratic Republic of Congo.',
        'The parallel developments highlight a core challenge for continental public health: major convenings and long-term system building must continue even while emergency response capacity is stretched by outbreaks.',
        'Effective risk communication will be important as the situation evolves, particularly around what is confirmed, what remains uncertain and which precautions are appropriate for travellers and delegates.'
      ]
    }
  ];

  const topics = [
    { name: 'Public Health', code: 'PH', description: 'Systems, prevention, outbreaks and community health.', count: 18 },
    { name: 'HIV/AIDS', code: 'HIV', description: 'Prevention, treatment, research and lived experience.', count: 14 },
    { name: 'Health Financing', code: '$', description: 'Funding, insurance reform, budgets and access.', count: 9 },
    { name: 'Science & Innovation', code: 'R+', description: 'Research, digital health and new technologies.', count: 12 },
    { name: 'Global Health', code: 'GH', description: 'Regional and international health developments.', count: 16 },
    { name: 'Family Health', code: 'FH', description: 'Maternal, reproductive, child and adolescent health.', count: 11 },
    { name: 'Mental Health', code: 'MH', description: 'Policy, services, wellbeing and substance-use reporting.', count: 7 },
    { name: 'Research & Findings', code: 'Rx', description: 'Evidence, studies and what new data means.', count: 13 }
  ];

  const page = document.body.dataset.page || 'home';
  let currentArticle = null;
  let toastTimer = null;
  let premiumInterval = null;

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  })[char]);

  const articleUrl = (article) => `article.html?id=${encodeURIComponent(article.id)}`;

  function mediaMarkup(article, className = '') {
    if (!article.image) {
      return `<div class="story-image ${className}"><div class="media-fallback">${escapeHtml(article.category)}</div></div>`;
    }
    return `<div class="story-image ${className}"><img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.imageAlt)}" loading="lazy" decoding="async" onerror="this.style.display='none'" /></div>`;
  }

  function tagsMarkup(article, hero = false) {
    return `<span class="category-tag">${escapeHtml(article.category)}</span>${article.premium ? '<span class="premium-tag">Premium</span>' : ''}`;
  }

  function storyCard(article) {
    return `<article class="story-card">
      <a href="${articleUrl(article)}" aria-label="Read ${escapeHtml(article.title)}">
        ${mediaMarkup(article)}
        <div class="story-content">
          <div class="story-kicker-row"><div>${tagsMarkup(article)}</div></div>
          <h3>${escapeHtml(article.title)}</h3>
          <p>${escapeHtml(article.excerpt)}</p>
          <div class="story-meta"><span>${escapeHtml(article.date)}</span><span>${escapeHtml(article.author)}</span><span>${escapeHtml(article.readTime)}</span></div>
        </div>
      </a>
    </article>`;
  }

  function renderHome() {
    const heroGrid = qs('#hero-grid');
    if (!heroGrid) return;

    const lead = articles[0];
    const sideOne = articles[1];
    const sideTwo = articles[2];

    heroGrid.innerHTML = `
      <article class="hero-main">
        <a href="${articleUrl(lead)}" aria-label="Read ${escapeHtml(lead.title)}">
          ${mediaMarkup(lead)}
          <div class="hero-main-content">
            <div>${tagsMarkup(lead, true)}</div>
            <h1 id="hero-heading">${escapeHtml(lead.title)}</h1>
            <p>${escapeHtml(lead.excerpt)}</p>
            <div class="story-meta"><span>By ${escapeHtml(lead.author)}</span><span>${escapeHtml(lead.date)}</span><span>${escapeHtml(lead.readTime)}</span></div>
          </div>
        </a>
      </article>
      <div class="hero-side">
        ${[sideOne, sideTwo].map((article) => `<article class="hero-side-card"><a href="${articleUrl(article)}" style="display:contents">${mediaMarkup(article)}<div class="story-content"><div><div>${tagsMarkup(article)}</div><h2>${escapeHtml(article.title)}</h2><p>${escapeHtml(article.excerpt)}</p></div><div class="story-meta"><span>${escapeHtml(article.date)}</span><span>${escapeHtml(article.readTime)}</span></div></div></a></article>`).join('')}
      </div>`;

    const latest = [articles[3], articles[4], articles[5], articles[6], articles[8], articles[9]];
    const latestGrid = qs('#latest-grid');
    if (latestGrid) latestGrid.innerHTML = latest.map(storyCard).join('');

    const trending = qs('#trending-list');
    if (trending) trending.innerHTML = [articles[0], articles[1], articles[3], articles[6], articles[2]].map((article) => `<li><a href="${articleUrl(article)}">${escapeHtml(article.title)}</a></li>`).join('');

    const premiumPreview = qs('#premium-preview-card');
    if (premiumPreview) {
      const article = articles[6];
      premiumPreview.innerHTML = `<a href="premium.html">${mediaMarkup(article)}<div class="story-content"><div>${tagsMarkup(article)}</div><h3>${escapeHtml(article.title)}</h3><div class="story-meta"><span>${escapeHtml(article.date)}</span><span>${escapeHtml(article.readTime)}</span></div></div></a>`;
    }

    const topicCards = qs('#topic-cards');
    if (topicCards) {
      topicCards.innerHTML = topics.map((topic) => `<a class="topic-card" href="#latest" data-topic-filter="${escapeHtml(topic.name)}"><div class="topic-icon">${escapeHtml(topic.code)}</div><div><h3>${escapeHtml(topic.name)}</h3><p>${escapeHtml(topic.description)}</p><span>${topic.count} demo stories →</span></div></a>`).join('');
    }

    const analysisGrid = qs('#analysis-grid');
    if (analysisGrid) {
      const feature = articles[2];
      const mini = [articles[8], articles[7], articles[9]];
      analysisGrid.innerHTML = `<article class="analysis-feature"><a href="${articleUrl(feature)}">${mediaMarkup(feature)}<div class="story-content"><div>${tagsMarkup(feature)}</div><h3>${escapeHtml(feature.title)}</h3><div class="story-meta"><span>${escapeHtml(feature.author)}</span><span>${escapeHtml(feature.readTime)}</span></div></div></a></article><div class="analysis-list">${mini.map((article) => `<article class="mini-story"><a href="${articleUrl(article)}"><div>${tagsMarkup(article)}</div><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.excerpt)}</p></a></article>`).join('')}</div>`;
    }

    const breaking = qs('#breaking-copy');
    if (breaking) breaking.textContent = `${articles[0].title} · ${articles[1].title}`;
  }

  function renderPremium() {
    const featureEl = qs('#premium-feature');
    const premiumGrid = qs('#premium-grid');
    if (!featureEl || !premiumGrid) return;

    const feature = articles[6];
    featureEl.innerHTML = `${mediaMarkup(feature)}<div class="story-content"><div>${tagsMarkup(feature)}</div><h2>${escapeHtml(feature.title)}</h2><p>${escapeHtml(feature.standfirst)}</p><div class="story-meta"><span>By ${escapeHtml(feature.author)}</span><span>${escapeHtml(feature.date)}</span><span>${escapeHtml(feature.readTime)}</span></div><p><a class="text-link" href="${articleUrl(feature)}">Open Premium article →</a></p></div>`;
    premiumGrid.innerHTML = [articles[7], articles[8], articles[6]].map(storyCard).join('');
    initPremiumGate(qs('[data-premium-protected]'));
  }

  function renderArticle() {
    const params = new URLSearchParams(location.search);
    const requested = params.get('id');
    currentArticle = articles.find((article) => article.id === requested) || articles[0];

    document.title = `${currentArticle.title} — HealthTimes`;
    const meta = qs('meta[name="description"]');
    if (meta) meta.setAttribute('content', currentArticle.standfirst);

    const header = qs('[data-article-header]');
    const figure = qs('[data-article-image]');
    const body = qs('[data-article-body]');
    const related = qs('#related-grid');
    if (!header || !figure || !body) return;

    header.innerHTML = `<div class="article-kickers">${tagsMarkup(currentArticle)}</div><h1>${escapeHtml(currentArticle.title)}</h1><p class="standfirst">${escapeHtml(currentArticle.standfirst)}</p><div class="article-byline"><span>By <strong>${escapeHtml(currentArticle.author)}</strong></span><span>${escapeHtml(currentArticle.date)}</span><span>${escapeHtml(currentArticle.readTime)}</span>${currentArticle.premium ? '<span data-premium-timer><strong>00:30</strong> Premium preview</span>' : ''}</div>`;

    if (currentArticle.image) {
      figure.innerHTML = `<img src="${escapeHtml(currentArticle.image)}" alt="${escapeHtml(currentArticle.imageAlt)}" decoding="async" /><figcaption>${escapeHtml(currentArticle.imageAlt)} · HealthTimes source image</figcaption>`;
    } else {
      figure.innerHTML = `<div class="media-fallback" style="aspect-ratio:16/8.7">${escapeHtml(currentArticle.category)}</div>`;
    }

    const firstHalf = currentArticle.body.map((paragraph, index) => {
      if (index === 2 && currentArticle.id === 'natpharm-supply-chain') return `<blockquote>Public investment matters only when medicines and services reach the patient.</blockquote><p>${escapeHtml(paragraph)}</p>`;
      if (index === 2 && currentArticle.id === 'healthcare-provision-programme') return `<h2>What changes under the proposed model?</h2><p>${escapeHtml(paragraph)}</p>`;
      return `<p>${escapeHtml(paragraph)}</p>`;
    }).join('');

    body.innerHTML = `${firstHalf}<div class="article-note"><strong>Demo content note.</strong> This redesigned frontend uses a concise summary of the public HealthTimes story for the client demonstration. <a class="source-link" href="${escapeHtml(currentArticle.sourceUrl)}" target="_blank" rel="noopener">Read the original HealthTimes publication ↗</a></div>`;

    const relatedArticles = articles.filter((article) => article.id !== currentArticle.id && (article.category === currentArticle.category || article.tags.some((tag) => currentArticle.tags.includes(tag)))).slice(0, 3);
    if (related) related.innerHTML = (relatedArticles.length ? relatedArticles : articles.slice(0, 3)).map(storyCard).join('');

    if (currentArticle.premium) {
      const protectedArea = qs('[data-article-protected]');
      initPremiumGate(protectedArea);
    } else {
      const lock = qs('[data-premium-lock]');
      if (lock) lock.hidden = true;
    }

    initReadingProgress();
  }

  function isSubscribed() {
    return localStorage.getItem(SUBSCRIBED_KEY) === 'true';
  }

  function getPreviewStart() {
    const stored = Number(localStorage.getItem(PREVIEW_KEY));
    if (Number.isFinite(stored) && stored > 0) return stored;
    const now = Date.now();
    localStorage.setItem(PREVIEW_KEY, String(now));
    return now;
  }

  function initPremiumGate(protectedArea) {
    if (!protectedArea) return;
    clearInterval(premiumInterval);

    const lock = qs('[data-premium-lock]', protectedArea) || qs('[data-premium-lock]');
    const timer = qs('[data-premium-timer]');

    const unlock = () => {
      protectedArea.classList.remove('is-locked');
      if (lock) lock.hidden = true;
      if (timer) {
        timer.classList.remove('is-urgent');
        if (timer.tagName === 'SPAN') timer.innerHTML = '<strong>Member</strong> Premium access';
        else timer.innerHTML = '<span>Access</span><strong>Member</strong>';
      }
    };

    const lockContent = () => {
      protectedArea.classList.add('is-locked');
      if (lock) lock.hidden = false;
      if (timer) {
        timer.classList.add('is-urgent');
        if (timer.tagName === 'SPAN') timer.innerHTML = '<strong>00:00</strong> Preview ended';
        else timer.innerHTML = '<span>Preview ended</span><strong>00:00</strong>';
      }
    };

    protectedArea._premiumUnlock = unlock;

    if (isSubscribed()) {
      unlock();
      return;
    }

    const startedAt = getPreviewStart();
    const tick = () => {
      if (isSubscribed()) {
        clearInterval(premiumInterval);
        unlock();
        return;
      }
      const remaining = Math.max(0, PREVIEW_MS - (Date.now() - startedAt));
      const seconds = Math.ceil(remaining / 1000);
      const formatted = `00:${String(seconds).padStart(2, '0')}`;
      if (timer) {
        if (timer.tagName === 'SPAN') timer.innerHTML = `<strong>${formatted}</strong> Premium preview`;
        else timer.innerHTML = `<span>Preview remaining</span><strong>${formatted}</strong>`;
        timer.classList.toggle('is-urgent', seconds <= 8);
      }
      if (remaining <= 0) {
        clearInterval(premiumInterval);
        lockContent();
      }
    };

    tick();
    if (!protectedArea.classList.contains('is-locked')) premiumInterval = setInterval(tick, 250);
  }

  function unlockPremiumEverywhere() {
    qsa('[data-premium-protected], [data-article-protected]').forEach((area) => {
      area.classList.remove('is-locked');
      if (typeof area._premiumUnlock === 'function') area._premiumUnlock();
    });
    qsa('[data-premium-lock]').forEach((lock) => { lock.hidden = true; });
    const timer = qs('[data-premium-timer]');
    if (timer) {
      timer.classList.remove('is-urgent');
      timer.innerHTML = timer.tagName === 'SPAN' ? '<strong>Member</strong> Premium access' : '<span>Access</span><strong>Member</strong>';
    }
  }

  function ensureSubscribeModal() {
    if (qs('[data-subscribe-overlay]')) return;
    const overlay = document.createElement('div');
    overlay.className = 'subscribe-overlay';
    overlay.dataset.subscribeOverlay = '';
    overlay.hidden = true;
    overlay.innerHTML = `<section class="subscribe-card" role="dialog" aria-modal="true" aria-labelledby="subscribe-title"><div class="subscribe-card-top"><span class="premium-pill">HealthTimes Premium</span><h2 id="subscribe-title">One plan. Full Premium access.</h2><p>Deep health reporting, policy analysis and research context.</p></div><div class="subscribe-card-body"><div class="plan-row"><div><strong>Monthly membership</strong><br><span>Cancel-anytime concept for client demo</span></div><b>US$5</b></div><div class="subscribe-note"><strong>Client demonstration:</strong> no payment information is requested or processed. Activating below only stores a demo subscriber flag in this browser.</div><div class="subscribe-actions"><button class="button button-accent" type="button" data-activate-demo-subscription>Activate demo subscription</button><button type="button" data-close-subscribe>Not now</button></div></div></section>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeSubscribe();
    });
    qs('[data-close-subscribe]', overlay).addEventListener('click', closeSubscribe);
    qs('[data-activate-demo-subscription]', overlay).addEventListener('click', () => {
      localStorage.setItem(SUBSCRIBED_KEY, 'true');
      closeSubscribe();
      unlockPremiumEverywhere();
      showToast('Demo Premium access activated.');
    });
  }

  function openSubscribe() {
    ensureSubscribeModal();
    const overlay = qs('[data-subscribe-overlay]');
    overlay.hidden = false;
    document.body.classList.add('is-modal-open');
    setTimeout(() => qs('[data-activate-demo-subscription]', overlay)?.focus(), 0);
  }

  function closeSubscribe() {
    const overlay = qs('[data-subscribe-overlay]');
    if (overlay) overlay.hidden = true;
    if (!qs('[data-search-overlay]:not([hidden])')) document.body.classList.remove('is-modal-open');
  }

  function initSearch() {
    const overlay = qs('[data-search-overlay]');
    const input = qs('[data-search-input]');
    const results = qs('[data-search-results]');
    if (!overlay || !input || !results) return;

    const renderResults = (term = '') => {
      const needle = term.trim().toLowerCase();
      const matches = articles.filter((article) => {
        if (!needle) return true;
        return [article.title, article.category, article.author, article.excerpt, ...article.tags].join(' ').toLowerCase().includes(needle);
      }).slice(0, 8);
      results.innerHTML = matches.length ? matches.map((article) => `<a class="search-result" href="${articleUrl(article)}">${article.image ? `<img src="${escapeHtml(article.image)}" alt="" loading="lazy" />` : `<div class="media-fallback" style="min-height:58px">${escapeHtml(article.category)}</div>`}<div><small>${escapeHtml(article.category)} · ${escapeHtml(article.date)}</small><h3>${escapeHtml(article.title)}</h3><small>${article.premium ? 'Premium · ' : ''}${escapeHtml(article.author)}</small></div></a>`).join('') : '<div class="search-empty">No matching demo stories. Try a broader health topic.</div>';
    };

    const open = () => {
      overlay.hidden = false;
      document.body.classList.add('is-modal-open');
      renderResults('');
      setTimeout(() => input.focus(), 0);
    };
    const close = () => {
      overlay.hidden = true;
      input.value = '';
      document.body.classList.remove('is-modal-open');
    };

    qsa('[data-open-search]').forEach((button) => button.addEventListener('click', open));
    qsa('[data-close-search]').forEach((button) => button.addEventListener('click', close));
    qsa('[data-search-term]').forEach((button) => button.addEventListener('click', () => { input.value = button.dataset.searchTerm; renderResults(input.value); input.focus(); }));
    input.addEventListener('input', () => renderResults(input.value));
    overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !overlay.hidden) close(); });
  }

  function initMenu() {
    const toggle = qs('[data-menu-toggle]');
    const menu = qs('#mobile-menu');
    if (!toggle || !menu) return;
    toggle.addEventListener('click', () => {
      const opening = menu.hidden;
      menu.hidden = !opening;
      toggle.setAttribute('aria-expanded', String(opening));
    });
    qsa('a, button', menu).forEach((item) => item.addEventListener('click', () => {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }

  function showToast(message) {
    const toast = qs('[data-toast]');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
  }

  function initNewsletter() {
    qsa('[data-newsletter-form]').forEach((form) => form.addEventListener('submit', (event) => {
      event.preventDefault();
      const message = qs('[data-newsletter-message]', form.parentElement);
      if (message) message.textContent = 'Thanks — client demo only. Newsletter service is not connected yet.';
      form.reset();
      showToast('Newsletter demo captured locally only.');
    }));
  }

  function initArticleActions() {
    const share = qs('[data-share]');
    const save = qs('[data-save]');
    if (share) {
      share.addEventListener('click', async () => {
        const payload = { title: currentArticle?.title || document.title, text: currentArticle?.standfirst || '', url: location.href };
        try {
          if (navigator.share) await navigator.share(payload);
          else if (navigator.clipboard) { await navigator.clipboard.writeText(location.href); showToast('Article link copied.'); }
          else showToast('Copy the URL from your browser to share.');
        } catch (_) { /* user cancelled */ }
      });
    }
    if (save) {
      const saved = new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'));
      const updateLabel = () => save.setAttribute('aria-label', saved.has(currentArticle?.id) ? 'Remove saved article' : 'Save article');
      updateLabel();
      save.addEventListener('click', () => {
        if (!currentArticle) return;
        if (saved.has(currentArticle.id)) { saved.delete(currentArticle.id); showToast('Removed from saved stories.'); }
        else { saved.add(currentArticle.id); showToast('Saved on this device.'); }
        localStorage.setItem(SAVED_KEY, JSON.stringify([...saved]));
        updateLabel();
      });
    }
  }

  function initReadingProgress() {
    const bar = qs('[data-reading-progress]');
    const article = qs('[data-article-shell]');
    if (!bar || !article) return;
    const update = () => {
      const rect = article.getBoundingClientRect();
      const start = window.scrollY + rect.top;
      const end = start + article.offsetHeight - window.innerHeight;
      const progress = end <= start ? 1 : Math.min(1, Math.max(0, (window.scrollY - start) / (end - start)));
      bar.style.width = `${progress * 100}%`;
    };
    update();
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
  }

  function initAI() {
    const panel = qs('[data-ai-panel]');
    const messages = qs('[data-ai-messages]');
    const form = qs('[data-ai-form]');
    const input = qs('[data-ai-input]');
    if (!panel || !messages || !form || !input) return;

    const open = () => {
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      setTimeout(() => input.focus(), 0);
    };
    const close = () => {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
    };
    qsa('[data-open-ai]').forEach((button) => button.addEventListener('click', open));
    qsa('[data-close-ai]').forEach((button) => button.addEventListener('click', close));

    const addMessage = (role, text) => {
      const div = document.createElement('div');
      div.className = `ai-message ${role}`;
      div.textContent = text;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    };

    const answer = (raw) => {
      const prompt = raw.trim();
      const lower = prompt.toLowerCase();
      if (!prompt) return 'Ask me about HealthTimes reporting, Premium, HIV, health financing or innovation.';

      if (/(emergency|can.?t breathe|chest pain|suicid|overdose|bleeding heavily)/i.test(lower)) {
        return 'I’m only a demo newsroom assistant and cannot assess an emergency. Please contact local emergency services or a qualified clinician immediately. I can help you find relevant HealthTimes reporting, but not provide emergency care.';
      }
      if (/(diagnos|symptom|medicine|medication|dose|treatment for|should i take|am i sick|what do i have)/i.test(lower)) {
        return 'I can explain HealthTimes reporting, but I cannot diagnose symptoms or recommend medicines or doses. A qualified health professional can assess your situation. If you want, ask me to find HealthTimes coverage on the topic instead.';
      }
      if (lower.includes('premium') || lower.includes('subscribe') || lower.includes('$5')) {
        return 'HealthTimes Premium is presented in this client demo as one US$5/month plan for deeper policy, financing, research and accountability reporting. Non-subscribers get a 30-second frontend preview; production access must be enforced server-side.';
      }
      if ((lower.includes('summar') || lower.includes('this article')) && currentArticle) {
        return `${currentArticle.title}: ${currentArticle.excerpt} The full demo article also links to the original HealthTimes publication.`;
      }
      if (lower.includes('latest') || lower.includes('recent')) {
        return `The latest demo stories are: 1) ${articles[0].title}; 2) ${articles[1].title}; 3) ${articles[2].title}. Use Search to open any of them.`;
      }
      if (lower.includes('related') && currentArticle) {
        const related = articles.filter((article) => article.id !== currentArticle.id && article.tags.some((tag) => currentArticle.tags.includes(tag))).slice(0, 3);
        return related.length ? `Related HealthTimes reporting: ${related.map((article) => article.title).join('; ')}.` : 'Use Search to browse related HealthTimes coverage by topic.';
      }

      const topicMatches = articles.filter((article) => [article.title, article.category, article.author, article.excerpt, ...article.tags].join(' ').toLowerCase().includes(lower)).slice(0, 3);
      if (topicMatches.length) return `I found ${topicMatches.length} relevant demo ${topicMatches.length === 1 ? 'story' : 'stories'}: ${topicMatches.map((article) => article.title).join('; ')}.`;

      const keyword = ['hiv', 'financing', 'innovation', 'harare', 'research', 'public health', 'ai'].find((term) => lower.includes(term));
      if (keyword) {
        const matches = articles.filter((article) => [article.title, article.category, article.excerpt, ...article.tags].join(' ').toLowerCase().includes(keyword)).slice(0, 3);
        return matches.length ? `For ${keyword}, start with: ${matches.map((article) => article.title).join('; ')}.` : `I do not have a matching ${keyword} story in this small frontend dataset yet.`;
      }

      return 'This demo assistant is intentionally bounded to HealthTimes content. Try asking about the latest stories, Premium, HIV, health financing, research, public health or innovation.';
    };

    const submitPrompt = (text) => {
      const clean = text.trim();
      if (!clean) return;
      addMessage('user', clean);
      input.value = '';
      setTimeout(() => addMessage('assistant', answer(clean)), 220);
    };

    form.addEventListener('submit', (event) => { event.preventDefault(); submitPrompt(input.value); });
    qsa('[data-ai-prompt]').forEach((button) => button.addEventListener('click', () => { open(); submitPrompt(button.dataset.aiPrompt || button.textContent); }));
  }

  function initTopicFilters() {
    qsa('[data-topic-filter]').forEach((card) => card.addEventListener('click', (event) => {
      event.preventDefault();
      const term = card.dataset.topicFilter;
      const overlayButton = qs('[data-open-search]');
      overlayButton?.click();
      const input = qs('[data-search-input]');
      if (input) {
        input.value = term;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }));
  }

  function initGlobalEvents() {
    qsa('[data-subscribe]').forEach((button) => button.addEventListener('click', openSubscribe));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        const sub = qs('[data-subscribe-overlay]');
        if (sub && !sub.hidden) closeSubscribe();
      }
    });
  }

  ensureSubscribeModal();
  initMenu();
  initSearch();
  initAI();
  initNewsletter();

  if (page === 'home') {
    renderHome();
    initTopicFilters();
  } else if (page === 'premium') {
    renderPremium();
  } else if (page === 'article') {
    renderArticle();
    initArticleActions();
  }

  initGlobalEvents();
})();
