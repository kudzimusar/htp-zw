import type {
  ArticleDetail,
  AuthorProfile,
  LegacyTaxonomyRef,
  PublicationProfile,
  TaxonomyRef,
  VideoItem
} from "../domain/models";
import {
  approvedCanonicalSectionForLegacy,
  canonicalGeographyBySlug,
  normalizeCanonicalGeography
} from "../domain/taxonomy-authority";

export const SOURCE_PARITY_VERIFIED_AT = "2026-09-21T00:00:00Z";
export const SOURCE_PARITY_PUBLIC_BASE_URL = "https://healthtimes.co.zw";

const authorIdentity: Record<string,{id:string;displayName:string;slug:string}> = {
  "Michael Gwarisa": { id: "source-author-michael-gwarisa", displayName: "Michael Gwarisa", slug: "michael-gwarisa" },
  "Kuda Pembere": { id: "source-author-kuda-pembere", displayName: "Kuda Pembere", slug: "kuda-pembere" },
  "Kudakwashe Pembere": { id: "source-author-kuda-pembere", displayName: "Kudakwashe Pembere", slug: "kuda-pembere" },
  "Staff Reporter": { id: "source-author-staff-reporter", displayName: "Staff Reporter", slug: "staff-reporter" }
};

function slugify(value:string){
  return value.toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

function legacyRefs(names:string[]):LegacyTaxonomyRef[]{
  return names.map((name)=>({
    id:"legacy-"+slugify(name),
    name,
    slug:slugify(name),
    authority:"observed-source",
    sourceSystem:"wordpress",
    sourceId:null,
    sourceKind:"category"
  }));
}

function sourceArticle(input:{
  title:string;
  slug:string;
  date:string;
  author:string;
  categories:string[];
  excerpt:string;
  imageAlt?:string;
  imageUrl?:string;
  geography:"zimbabwe"|"africa"|"global";
}):ArticleDetail {
  const accessPolicy=input.categories.includes("HealthTimes Premium") ? "premium" : "public";
  const canonicalUrl=SOURCE_PARITY_PUBLIC_BASE_URL+"/"+input.slug+"/";
  const author=authorIdentity[input.author] ?? {
    id:"source-author-"+slugify(input.author),
    displayName:input.author,
    slug:slugify(input.author)
  };
  const geographyRef=canonicalGeographyBySlug(input.geography);
  if(!geographyRef) throw new Error("Unknown certified Source Parity geography: "+input.geography);
  const canonicalGeography=normalizeCanonicalGeography([geographyRef]);
  const legacy=legacyRefs(input.categories);
  const primarySection=approvedCanonicalSectionForLegacy(input.categories);
  return {
    id:"source-"+input.slug,
    title:input.title,
    slug:input.slug,
    standfirst:input.excerpt,
    excerpt:input.excerpt,
    bodyHtml:null,
    canonicalUrl,
    accessPolicy,
    status:"published",
    publishedAt:input.date+"T00:00:00Z",
    modifiedAt:input.date+"T00:00:00Z",
    author:{
      ...author,
      sourceProvenance:{
        system:"wordpress",
        sourceId:null,
        stableKey:"wordpress-author:"+author.slug,
        sourceUrl:
          author.slug==="michael-gwarisa"
            ? SOURCE_PARITY_PUBLIC_BASE_URL+"/author/michael-gwarisa/"
            : author.slug==="kuda-pembere"
              ? SOURCE_PARITY_PUBLIC_BASE_URL+"/author/kuda-pembere/"
              : null,
        checksum:null,
        capturedAt:SOURCE_PARITY_VERIFIED_AT,
        exceptions:[]
      }
    },
    primarySection,
    ...canonicalGeography,
    geographyResolution:{
      canonicalApproved:[geographyRef],
      observedSource:[{
        candidate:geographyRef,
        authority:"observed-source",
        evidence:"certified-source-snapshot",
        sourceValue:input.geography
      }],
      inferredRequiresReview:[]
    },
    topics:[],
    legacyTaxonomy:legacy,
    taxonomyResolution:{
      observedWordPress:legacy,
      approvedCanonical:primarySection ? [primarySection] : [],
      inferredRequiresReview:[]
    },
    heroMedia:input.imageAlt ? {
      id:"source-media-"+input.slug,
      publicUrl:input.imageUrl ?? null,
      altText:input.imageAlt,
      caption:null,
      credit:"Current HealthTimes public source; runtime media URL supplied by the read-only source bridge.",
      sourceProvenance:{
        system:"wordpress",
        sourceId:null,
        stableKey:"wordpress-media:"+input.slug,
        sourceUrl:input.imageUrl ?? canonicalUrl,
        checksum:null,
        capturedAt:SOURCE_PARITY_VERIFIED_AT,
        exceptions:input.imageUrl ? [] : [{
          kind:"missing-media",
          classification:"requires-review",
          note:"Snapshot preserves the verified source relationship and alt text; public WordPress _embed refresh supplies the live media URL when available."
        }]
      }
    } : null,
    sourceProvenance:{
      system:"wordpress",
      sourceId:null,
      stableKey:"wordpress-url:"+canonicalUrl,
      sourceUrl:canonicalUrl,
      checksum:null,
      capturedAt:SOURCE_PARITY_VERIFIED_AT,
      wordpress:{legacyPath:"/"+input.slug+"/"},
      exceptions:[]
    },
    contentIntegrity:"requires-review",
    premiumSourceContext:{
      accessPolicy,
      legacyMembershipSignal:accessPolicy==="premium" ? "wordpress-premium" : "none",
      providerReferencePresent:false,
      reconciliation:"requires-review"
    }
  };
}

export const sourceParityArticles:ArticleDetail[]=[
  sourceArticle({
    title:"Zimbabwe Looks to Strengthen Social Contracting as HIV Donor Funding Shrinks",
    slug:"zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks",
    date:"2026-09-18",
    author:"Michael Gwarisa",
    categories:["Health News","HIV/AIDS"],
    excerpt:"Zimbabwe is examining how domestic social contracting can sustain community-led HIV services as international donor support declines.",
    imageAlt:"Stakeholders at a Zimbabwe social contracting and HIV financing dialogue in Harare",
    imageUrl:"https://healthtimes.co.zw/wp-content/uploads/2026/09/zimbabwe-social-contracting-hiv-financing-dialogue.jpg",
    geography:"zimbabwe"
  }),
  sourceArticle({
    title:"Zimbabwe urged to join Borrowers Forum amid US$23.7bn debt",
    slug:"ahf-urges-zimbabwe-to-join-borrowers-forum-amid-debt-crisis",
    date:"2026-09-18",
    author:"Kuda Pembere",
    categories:["Health News"],
    excerpt:"Health advocates are linking Zimbabwe’s debt burden to pressure on public services and calling for stronger collective bargaining by debtor countries.",
    imageAlt:"Ernest Chikwati, Country Director of AIDS Healthcare Foundation Zimbabwe",
    imageUrl:"https://healthtimes.co.zw/wp-content/uploads/2026/09/enerst-chikwati-ahf-zimbabwe-country-director.jpeg",
    geography:"zimbabwe"
  }),
  sourceArticle({
    title:"Africa CDC Warns Ebola Response Is Missing Most Expected Contacts as Community Deaths Rise",
    slug:"africa-cdc-ebola-contact-tracing-community-deaths-drc",
    date:"2026-09-18",
    author:"Michael Gwarisa",
    categories:["Africa","Epidemics"],
    excerpt:"Africa CDC says surveillance gaps and deaths outside treatment facilities are complicating the Ebola response in the Democratic Republic of the Congo.",
    imageAlt:"Dr Jean Kaseya, Director General of Africa CDC, speaking during a public health briefing",
    imageUrl:"https://healthtimes.co.zw/wp-content/uploads/2026/01/enhanced_1200x665.jpg",
    geography:"africa"
  }),
  sourceArticle({
    title:"US medical team brings specialist surgical expertise to Zimbabwe in 15-year partnership",
    slug:"us-doctor-plays-with-child-cleft-lip-zimbabwe-medical-mission",
    date:"2026-09-18",
    author:"Michael Gwarisa",
    categories:["Health News"],
    excerpt:"A multidisciplinary United States medical team is working with Celebration Health on specialist surgical outreach and long-term local capacity building.",
    imageAlt:"US doctor with a child during the LEAP Global Missions medical outreach in Zimbabwe",
    geography:"zimbabwe"
  }),
  sourceArticle({
    title:"Ugandan MPs explore ZNNP+ Kutabila, Zim’s HIV financing model",
    slug:"uganda-legislators-benchmark-zimbabwe-hiv-response-kutabila-platform",
    date:"2026-09-17",
    author:"Kudakwashe Pembere",
    categories:["Health News","HIV/AIDS"],
    excerpt:"Ugandan legislators are benchmarking Zimbabwe’s community-led HIV monitoring, AIDS financing and the ZNNP+ Kutabila virtual health platform.",
    geography:"zimbabwe"
  }),
  sourceArticle({
    title:"Meet Dr Neddy Makonza: Zimbabwe’s Fourth Female Orthopaedic Surgeon Wants to Open Doors for More Women",
    slug:"meet-dr-neddy-zimbabwes-fourth-female-orthopaedic-surgeon",
    date:"2026-09-17",
    author:"Michael Gwarisa",
    categories:["Features"],
    excerpt:"Dr Neddy Makonza reflects on specialist training, decentralising orthopaedic care and creating a clearer pathway for more women to enter surgery.",
    imageAlt:"Dr Neddy Makonza, Zimbabwean orthopaedic surgeon",
    imageUrl:"https://healthtimes.co.zw/wp-content/uploads/2026/09/dr-neddy-makonza-zimbabwe-fourth-female-orthopaedic-surgeon.png",
    geography:"zimbabwe"
  }),
  sourceArticle({
    title:"HIV decriminalisation tested as traditional court orders woman to pay cow over alleged transmission",
    slug:"chief-nyamaropa-orders-woman-to-pay-cow-over-alleged-hiv-transmission",
    date:"2026-09-16",
    author:"Michael Gwarisa",
    categories:["HIV/AIDS"],
    excerpt:"A traditional court ruling in Shamva has renewed questions about HIV stigma, medical evidence and punitive responses after statutory decriminalisation.",
    imageAlt:"Chief Nyamaropa during a traditional court proceeding in Shamva",
    imageUrl:"https://healthtimes.co.zw/wp-content/uploads/2026/09/Chief-Nyamaropa.jpeg",
    geography:"zimbabwe"
  }),
  sourceArticle({
    title:"Most Ebola deaths in DRC are happening outside treatment centres as care barriers deepen",
    slug:"most-ebola-deaths-in-drc-are-happening-outside-treatment-centres-as-care-barriers-deepen",
    date:"2026-09-16",
    author:"Michael Gwarisa",
    categories:["Africa","Epidemics"],
    excerpt:"WHO data indicate that many Ebola deaths in the DRC continue to occur in communities, highlighting delays and barriers on the path to treatment.",
    geography:"africa"
  }),
  sourceArticle({
    title:"Fiji’s HIV Epidemic Has Moved Beyond Its Initial Risk Group",
    slug:"fiji-hiv-emergency-epidemic-spreads-beyond-drug-users",
    date:"2026-09-16",
    author:"Michael Gwarisa",
    categories:["Global Health","HIV/AIDS"],
    excerpt:"Fiji’s national HIV emergency reflects transmission moving beyond the population at the centre of the country’s initial outbreak response.",
    imageAlt:"Protesters at AIDS 2026 raising concerns about HIV among Indigenous people",
    imageUrl:"https://healthtimes.co.zw/wp-content/uploads/2026/09/aids-2026-protest-hiv-indigenous-people-fiji-creative-commons-https-creativecommons-org-licenses-by-sa-4-0.jpg.png",
    geography:"global"
  }),
  sourceArticle({
    title:"‘Not In My Village’ Goes National as Zimbabwe Targets MPs in Fight Against Teenage Pregnancy",
    slug:"not-in-my-constituency-zimbabwe-teenage-pregnancy-tags",
    date:"2026-09-15",
    author:"Michael Gwarisa",
    categories:["Health News","Family Health","SRHR"],
    excerpt:"Zimbabwe’s community campaign against teenage pregnancy and child marriage is expanding toward Parliament and other local accountability structures.",
    imageAlt:"Zimbabwean parliamentarians at an engagement on teenage pregnancy and child marriage",
    imageUrl:"https://healthtimes.co.zw/wp-content/uploads/2026/09/zimbabwe-parliamentarians-not-in-my-constituency-teenage-pregnancy.jpg",
    geography:"zimbabwe"
  }),
  sourceArticle({
    title:"Zimbabwe Joins Africa-Led Trial Testing Long-Acting HIV Treatment to Protect Babies",
    slug:"zimbabwe-long-acting-hiv-treatment-mother-to-child-transmission",
    date:"2026-09-14",
    author:"Michael Gwarisa",
    categories:["Breaking News"],
    excerpt:"Zimbabwe will participate in an Africa-led Phase 3 study testing whether long-acting HIV treatment can help sustain maternal viral suppression and reduce transmission to babies during pregnancy and breastfeeding.",
    imageAlt:"African mother and baby representing a trial of long-acting HIV treatment to prevent mother-to-child transmission",
    geography:"zimbabwe"
  }),
  sourceArticle({
    title:"DatCitizen Launches Backpack Walk in Solidarity With Girls Facing Unwanted Pregnancies",
    slug:"datcitizen-backpack-walk-teenage-pregnancy-zimbabwe",
    date:"2026-09-14",
    author:"Michael Gwarisa",
    categories:["Gender Matrix","Health News"],
    excerpt:"Women and girls marched in Harare carrying weighted backpacks to highlight the education, health and social burden of unintended teenage pregnancy and sexual violence.",
    imageAlt:"Women and girls march during the DatCitizen Not Her Choice Backpack Walk in Harare, Zimbabwe",
    geography:"zimbabwe"
  }),
  sourceArticle({
    title:"Ken Sharpe appointed to lead Zimbabwe’s End Malaria Council",
    slug:"kenneth-sharpe-appointed-zimbabwe-end-malaria-council",
    date:"2026-09-11",
    author:"Kuda Pembere",
    categories:["Health News"],
    excerpt:"Kenneth Sharpe has been appointed chairperson of Zimbabwe’s End Malaria Council, which is expected to mobilise resources and partnerships for malaria elimination.",
    geography:"zimbabwe"
  }),
  sourceArticle({
    title:"‘I Bled Non-Stop For Seven Days’: Can Zimbabwe’s New Health Law Stop Girls Turning to Unsafe Abortion?",
    slug:"i-bled-non-stop-for-seven-days-can-zimbabwes-new-health-law-stop-girls-turning-to-unsafe-abortion",
    date:"2026-09-11",
    author:"Michael Gwarisa",
    categories:["Features"],
    excerpt:"A survivor’s account of unsafe abortion frames questions about how Zimbabwe’s evolving health law, children’s rights and abortion framework operate in practice for pregnant minors.",
    imageAlt:"Memory Pamella Kadau, a reproductive health advocate, discussing abortion rights in Zimbabwe",
    geography:"zimbabwe"
  }),
  sourceArticle({
    title:"Global Commission calls for end to punitive drug policies targeting children",
    slug:"global-commission-punitive-drug-policies-children",
    date:"2026-09-10",
    author:"Michael Gwarisa",
    categories:["Health News"],
    excerpt:"The Global Commission on Drug Policy is urging governments to replace punitive approaches affecting children and young people with policies centred on public health, rights and child welfare.",
    imageAlt:"Global Commission on Drug Policy logo",
    geography:"global"
  }),
  sourceArticle({
    title:"Zika-Carrying Mosquito Breeds in London, Raising Climate Change Concerns",
    slug:"zika-mosquito-breeds-london-climate-change",
    date:"2026-09-09",
    author:"Michael Gwarisa",
    categories:["Global Health","Health News"],
    excerpt:"The first recorded breeding of Aedes aegypti in residential areas of east London has renewed attention to how warming conditions may change the geography of mosquito-borne disease risk.",
    geography:"global"
  }),
  sourceArticle({
    title:"Harare STI Cases Fall Below 2,000 Per Quarter, NAC Says",
    slug:"harare-sti-cases-fall-below-2000-per-quarter-nac",
    date:"2026-09-07",
    author:"Kuda Pembere",
    categories:["Breaking News","Health News","HIV/AIDS"],
    excerpt:"National AIDS Council figures point to lower quarterly STI cases in Harare while adolescents and young women remain disproportionately affected.",
    imageAlt:"NAC Harare Province manager Adonijah Muzondiona discussing STI and HIV prevention",
    geography:"zimbabwe"
  }),
  sourceArticle({
    title:"Parliament Probes NatPharm Over Zimbabwe’s Medicine Supply Chain",
    slug:"parliament-probes-natpharm-zimbabwe-medicine-supply-chain",
    date:"2026-09-07",
    author:"Michael Gwarisa",
    categories:["Health News","Policy"],
    excerpt:"Parliament is examining financing, procurement, distribution and digital systems across Zimbabwe’s public medicines supply chain.",
    geography:"zimbabwe"
  }),
  sourceArticle({
    title:"US Embassy Challenges Zimbabwe’s Account of Rejected Health Assistance Deal",
    slug:"us-embassy-challenges-zimbabwe-rejected-health-mou",
    date:"2026-08-03",
    author:"Michael Gwarisa",
    categories:["Health News","HealthTimes Premium"],
    excerpt:"The US Embassy disputed Zimbabwe’s explanation of a rejected health assistance agreement, adding a new public account to the funding dispute.",
    geography:"zimbabwe"
  }),
  sourceArticle({
    title:"Zimbabwe Faces Funding Cliff as U.S. Ends Support for HIV, TB and Malaria Programmes",
    slug:"zimbabwe-us-hiv-tb-malaria-funding-ends-september-2026",
    date:"2026-07-24",
    author:"Kuda Pembere",
    categories:["Breaking News","Health Financing","HealthTimes Premium","HIV/AIDS"],
    excerpt:"Zimbabwe faces pressure to expand domestic health financing as United States support for major HIV, TB and malaria programmes winds down.",
    geography:"zimbabwe"
  }),
  sourceArticle({
    title:"Zimbabwe Drops National Health Insurance Name, Unveils Tax-Funded Healthcare Provision Programme",
    slug:"zimbabwe-national-healthcare-provision-programme-mombeshora",
    date:"2026-07-23",
    author:"Michael Gwarisa",
    categories:["Health Financing","HealthTimes Premium"],
    excerpt:"Government has reframed its proposed national health financing mechanism as a tax-funded healthcare provision programme rather than an insurance scheme.",
    imageAlt:"Health Minister Dr Douglas Mombeshora discussing the proposed healthcare provision programme",
    geography:"zimbabwe"
  })
];

export const SOURCE_PARITY_STATIC_ARTICLE_IDS=sourceParityArticles.map((article)=>article.id);

export const sourceParityLegacyNavigation:TaxonomyRef[]=[
  "Breaking News",
  "Features",
  "Epidemics",
  "Academic & Research",
  "Global Health",
  "Community Development",
  "Communicable Diseases",
  "Noncommunicable Diseases",
  "HIV/AIDS",
  "Policy",
  "Public Health",
  "Opinion & Analysis",
  "Research & Findings",
  "HealthTimes Premium"
].map((name)=>({id:"legacy-navigation-"+slugify(name),name,slug:slugify(name)}));

export const sourceParityVideos:VideoItem[]=[
  {id:"source-video-jaciara-cleft-surgery",title:"From Mozambique to Zimbabwe: Jaciara’s Life-Changing Cleft Lip Surgery at CURE Children's Hospital",durationSeconds:490,publishedAt:null,thumbnail:{id:"source-video-thumbnail-lezgDMK2lPg",publicUrl:"https://img.youtube.com/vi/lezgDMK2lPg/maxresdefault.jpg",altText:"HealthTimes video on Jaciara’s life-changing cleft lip surgery",caption:null,credit:"HealthTimes TV",sourceProvenance:{system:"wordpress",sourceId:null,stableKey:"source-video-thumbnail:lezgDMK2lPg",sourceUrl:"https://img.youtube.com/vi/lezgDMK2lPg/maxresdefault.jpg",checksum:null,capturedAt:SOURCE_PARITY_VERIFIED_AT,exceptions:[]}},sourceUrl:"https://www.youtube.com/watch?v=lezgDMK2lPg",provider:"youtube",providerAssetId:"lezgDMK2lPg",description:null,transcriptState:"unknown",relatedArticleId:null,accessPolicy:"public",presentation:"recorded",sourceProvenance:{system:"wordpress",sourceId:null,stableKey:"source-video:jaciara-cleft-surgery",sourceUrl:"https://www.youtube.com/watch?v=lezgDMK2lPg",checksum:null,capturedAt:SOURCE_PARITY_VERIFIED_AT,exceptions:[]}},
  {id:"source-video-silicosis-miners",title:"Silicosis is Killing Zimbabwe’s Artisanal Miners | 42 Deaths Recorded at Kwekwe General Hospital",durationSeconds:346,publishedAt:null,thumbnail:{id:"source-video-thumbnail-8rU5X2X6CNc",publicUrl:"https://img.youtube.com/vi/8rU5X2X6CNc/maxresdefault.jpg",altText:"HealthTimes video on silicosis among Zimbabwe’s artisanal miners",caption:null,credit:"HealthTimes TV",sourceProvenance:{system:"wordpress",sourceId:null,stableKey:"source-video-thumbnail:8rU5X2X6CNc",sourceUrl:"https://img.youtube.com/vi/8rU5X2X6CNc/maxresdefault.jpg",checksum:null,capturedAt:SOURCE_PARITY_VERIFIED_AT,exceptions:[]}},sourceUrl:"https://www.youtube.com/watch?v=8rU5X2X6CNc",provider:"youtube",providerAssetId:"8rU5X2X6CNc",description:null,transcriptState:"unknown",relatedArticleId:null,accessPolicy:"public",presentation:"recorded",sourceProvenance:{system:"wordpress",sourceId:null,stableKey:"source-video:silicosis-miners",sourceUrl:"https://www.youtube.com/watch?v=8rU5X2X6CNc",checksum:null,capturedAt:SOURCE_PARITY_VERIFIED_AT,exceptions:[]}},
  {id:"source-video-medical-aid-crisis",title:"Zimbabwe’s Medical Aid Crisis: AHFoZ CEO Warns Coverage Could Fall Below 8%",durationSeconds:272,publishedAt:null,thumbnail:{id:"source-video-thumbnail-v4Sjv8-kz3I",publicUrl:"https://img.youtube.com/vi/v4Sjv8-kz3I/maxresdefault.jpg",altText:"HealthTimes video on Zimbabwe’s medical aid crisis",caption:null,credit:"HealthTimes TV",sourceProvenance:{system:"wordpress",sourceId:null,stableKey:"source-video-thumbnail:v4Sjv8-kz3I",sourceUrl:"https://img.youtube.com/vi/v4Sjv8-kz3I/maxresdefault.jpg",checksum:null,capturedAt:SOURCE_PARITY_VERIFIED_AT,exceptions:[]}},sourceUrl:"https://www.youtube.com/watch?v=v4Sjv8-kz3I",provider:"youtube",providerAssetId:"v4Sjv8-kz3I",description:null,transcriptState:"unknown",relatedArticleId:null,accessPolicy:"public",presentation:"recorded",sourceProvenance:{system:"wordpress",sourceId:null,stableKey:"source-video:medical-aid-crisis",sourceUrl:"https://www.youtube.com/watch?v=v4Sjv8-kz3I",checksum:null,capturedAt:SOURCE_PARITY_VERIFIED_AT,exceptions:[]}},
  {id:"source-video-pabs-annex",title:"Global South Puts Pressure on WHO Over PABS Annex Ahead of Pandemic Treaty Vote",durationSeconds:145,publishedAt:null,thumbnail:{id:"source-video-thumbnail-zEDRwL6NYak",publicUrl:"https://img.youtube.com/vi/zEDRwL6NYak/maxresdefault.jpg",altText:"HealthTimes video on the WHO PABS Annex and Pandemic Treaty",caption:null,credit:"HealthTimes TV",sourceProvenance:{system:"wordpress",sourceId:null,stableKey:"source-video-thumbnail:zEDRwL6NYak",sourceUrl:"https://img.youtube.com/vi/zEDRwL6NYak/maxresdefault.jpg",checksum:null,capturedAt:SOURCE_PARITY_VERIFIED_AT,exceptions:[]}},sourceUrl:"https://www.youtube.com/watch?v=zEDRwL6NYak",provider:"youtube",providerAssetId:"zEDRwL6NYak",description:null,transcriptState:"unknown",relatedArticleId:null,accessPolicy:"public",presentation:"recorded",sourceProvenance:{system:"wordpress",sourceId:null,stableKey:"source-video:pabs-annex",sourceUrl:"https://www.youtube.com/watch?v=zEDRwL6NYak",checksum:null,capturedAt:SOURCE_PARITY_VERIFIED_AT,exceptions:[]}},
  {id:"source-video-sugar-coke",title:"How Many Teaspoons of Sugar Are in a Coke? This Will Shock You",durationSeconds:677,publishedAt:null,thumbnail:{id:"source-video-thumbnail-8K9nxwmj-1k",publicUrl:"https://img.youtube.com/vi/8K9nxwmj-1k/maxresdefault.jpg",altText:"HealthTimes video on sugar content in a Coke",caption:null,credit:"HealthTimes TV",sourceProvenance:{system:"wordpress",sourceId:null,stableKey:"source-video-thumbnail:8K9nxwmj-1k",sourceUrl:"https://img.youtube.com/vi/8K9nxwmj-1k/maxresdefault.jpg",checksum:null,capturedAt:SOURCE_PARITY_VERIFIED_AT,exceptions:[]}},sourceUrl:"https://www.youtube.com/watch?v=8K9nxwmj-1k",provider:"youtube",providerAssetId:"8K9nxwmj-1k",description:null,transcriptState:"unknown",relatedArticleId:null,accessPolicy:"public",presentation:"recorded",sourceProvenance:{system:"wordpress",sourceId:null,stableKey:"source-video:sugar-coke",sourceUrl:"https://www.youtube.com/watch?v=8K9nxwmj-1k",checksum:null,capturedAt:SOURCE_PARITY_VERIFIED_AT,exceptions:[]}}
];

export const sourceParityAuthors:AuthorProfile[]=[
  {id:"source-author-michael-gwarisa",displayName:"Michael Gwarisa",slug:"michael-gwarisa",role:"Editor-in-Chief",bio:null,sourceUrl:SOURCE_PARITY_PUBLIC_BASE_URL+"/author/michael-gwarisa/"},
  {id:"source-author-kuda-pembere",displayName:"Kudakwashe Pembere",slug:"kuda-pembere",role:"Assistant Editor",bio:null,sourceUrl:SOURCE_PARITY_PUBLIC_BASE_URL+"/author/kuda-pembere/"},
  {id:"source-author-ntokozo-gudu",displayName:"Ntokozo Gudu",slug:"ntokozo-gudu",role:"Reporter",bio:null,sourceUrl:null},
  {id:"source-author-patson-gumbo",displayName:"Patson Gumbo",slug:"patson-gumbo",role:"Reporter",bio:null,sourceUrl:null},
  {id:"source-author-rukudzo-gota",displayName:"Rukudzo Gota",slug:"rukudzo-gota",role:"Reporter",bio:null,sourceUrl:null},
  {id:"source-author-staff-reporter",displayName:"Staff Reporter",slug:"staff-reporter",role:"Staff Reporter",bio:null,sourceUrl:null}
];

export const sourceParityPublication:PublicationProfile={
  name:"HealthTimes",
  description:"An independent health news publication covering Zimbabwe, Africa and global health, with an emphasis on public health, research, policy and evidence-based reporting.",
  publisher:"MITAP Media Pvt Ltd",
  location:"Zimbabwe",
  editorialEmail:"editorial@healthtimes.co.zw",
  aboutUrl:SOURCE_PARITY_PUBLIC_BASE_URL+"/about-us/",
  contactUrl:SOURCE_PARITY_PUBLIC_BASE_URL+"/contact-us/",
  editorialPrinciples:[
    "Accuracy and evidence",
    "Clarity and accessibility in health communication",
    "Ethical reporting of sensitive health issues",
    "Respect for privacy and dignity",
    "Transparent sourcing and corrections"
  ],
  sourceLinks:[
    {key:"jobs",label:"Jobs",url:SOURCE_PARITY_PUBLIC_BASE_URL+"/jobs/",kind:"product"},
    {key:"fellowships-grants",label:"Fellowships & Grants",url:SOURCE_PARITY_PUBLIC_BASE_URL+"/fellowships-grants/",kind:"product"},
    {key:"training-courses",label:"Training & Courses",url:SOURCE_PARITY_PUBLIC_BASE_URL+"/training-courses/",kind:"product"},
    {key:"academic-research",label:"Academic & Research",url:SOURCE_PARITY_PUBLIC_BASE_URL+"/academic-research/",kind:"product"},
    {key:"baraza-e-paper",label:"BARAZA E-PAPER",url:SOURCE_PARITY_PUBLIC_BASE_URL+"/baraza-e-paper/",kind:"product"},
    {key:"whatsapp",label:"WhatsApp",url:"https://wa.me/263776280754",kind:"contact"},
    {key:"x",label:"X",url:"https://x.com/healthtimeszim",kind:"social"},
    {key:"facebook",label:"Facebook",url:"https://www.facebook.com/healthtimeszw",kind:"social"},
    {key:"linkedin",label:"LinkedIn",url:"https://www.linkedin.com/in/healthtimes-zim-060079198/",kind:"social"},
    {key:"instagram",label:"Instagram",url:"https://www.instagram.com/healthtimesnews/",kind:"social"},
    {key:"youtube",label:"YouTube",url:"https://www.youtube.com/@HealthTimesTV",kind:"social"}
  ],
  sourceVerifiedAt:SOURCE_PARITY_VERIFIED_AT
};

export const sourceParityAdvertisingReference={
  campaignName:"HOSPAZ September AGM",
  articleUrl:SOURCE_PARITY_PUBLIC_BASE_URL+"/hospaz-sets-september-agm-to-shape-zimbabwes-next-chapter-in-hospice-and-palliative-care/",
  creativeVerified:false,
  note:"The Source Parity Register documents HOSPAZ AGM as the initial real campaign. The exact approved creative and destination are not rendered until they are source-verified."
} as const;
