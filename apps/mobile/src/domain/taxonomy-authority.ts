import type { GeographyRef } from "./source";
import type { TaxonomyRef } from "./models";

export const AG01_CANONICAL_DESKS = {
  "global-health": { id: "desk-global-health", name: "Global Health", slug: "global-health" },
  africa: { id: "desk-africa", name: "Africa", slug: "africa" },
  research: { id: "desk-research", name: "Research", slug: "research" },
  policy: { id: "desk-policy", name: "Policy", slug: "policy" },
  investigations: { id: "desk-investigations", name: "Investigations", slug: "investigations" },
  "public-health": { id: "desk-public-health", name: "Public Health", slug: "public-health" },
  "health-systems": { id: "desk-health-systems", name: "Health Systems", slug: "health-systems" },
  "health-business": { id: "desk-health-business", name: "Health Business", slug: "health-business" }
} as const satisfies Record<string, TaxonomyRef>;

export const AG01_CANONICAL_GEOGRAPHY = {
  global: {
    id: "zone-global",
    name: "Global",
    slug: "global",
    code: null,
    parentId: null,
    level: "global",
    isoCountryCode: null
  },
  africa: {
    id: "zone-africa",
    name: "Africa",
    slug: "africa",
    code: null,
    parentId: null,
    level: "continent",
    isoCountryCode: null
  },
  "southern-africa": {
    id: "zone-southern-africa",
    name: "Southern Africa",
    slug: "southern-africa",
    code: null,
    parentId: "zone-africa",
    level: "region",
    isoCountryCode: null
  },
  "east-africa": {
    id: "zone-east-africa",
    name: "East Africa",
    slug: "east-africa",
    code: null,
    parentId: "zone-africa",
    level: "region",
    isoCountryCode: null
  },
  "west-africa": {
    id: "zone-west-africa",
    name: "West Africa",
    slug: "west-africa",
    code: null,
    parentId: "zone-africa",
    level: "region",
    isoCountryCode: null
  },
  "central-africa": {
    id: "zone-central-africa",
    name: "Central Africa",
    slug: "central-africa",
    code: null,
    parentId: "zone-africa",
    level: "region",
    isoCountryCode: null
  },
  "north-africa": {
    id: "zone-north-africa",
    name: "North Africa",
    slug: "north-africa",
    code: null,
    parentId: "zone-africa",
    level: "region",
    isoCountryCode: null
  },
  zimbabwe: {
    id: "zone-zimbabwe",
    name: "Zimbabwe",
    slug: "zimbabwe",
    code: "ZW",
    parentId: "zone-southern-africa",
    level: "country",
    isoCountryCode: "ZW"
  }
} as const satisfies Record<string, GeographyRef>;

const approvedLegacyDeskAliases: Record<string, keyof typeof AG01_CANONICAL_DESKS> = {
  "global health": "global-health",
  africa: "africa",
  research: "research",
  "reseach findings": "research",
  "research & findings": "research",
  "academic & research": "research",
  policy: "policy",
  investigations: "investigations",
  "public health": "public-health",
  "health news": "public-health",
  "hiv/aids": "public-health",
  epidemics: "public-health",
  "family health": "public-health",
  srhr: "public-health",
  "health systems": "health-systems",
  "health financing": "health-business",
  "health business": "health-business"
};

export function approvedCanonicalSectionForLegacy(names: string[]): TaxonomyRef | null {
  for (const name of names) {
    const deskSlug = approvedLegacyDeskAliases[name.trim().toLowerCase()];
    if (deskSlug) return AG01_CANONICAL_DESKS[deskSlug];
  }
  return null;
}

export function canonicalGeographyBySlug(slug: string): GeographyRef | null {
  return AG01_CANONICAL_GEOGRAPHY[slug as keyof typeof AG01_CANONICAL_GEOGRAPHY] ?? null;
}

export function projectCanonicalGeography(refs: GeographyRef[]): TaxonomyRef[] {
  return refs.map(({ id, name, slug }) => ({ id, name, slug }));
}

export function normalizeCanonicalGeography(refs: GeographyRef[]) {
  return {
    geography: projectCanonicalGeography(refs),
    geographyRefs: refs
  };
}
