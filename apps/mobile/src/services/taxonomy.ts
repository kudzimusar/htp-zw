import type { TaxonomyService } from "../domain/contracts";
import type { TaxonomySnapshot } from "../domain/source";

const snapshot: TaxonomySnapshot = {
  editorialDesks: [
    { id: "desk-global-health", name: "Global Health", slug: "global-health", active: true },
    { id: "desk-africa", name: "Africa", slug: "africa", active: true },
    { id: "desk-research", name: "Research", slug: "research", active: true },
    { id: "desk-policy", name: "Policy", slug: "policy", active: true },
    { id: "desk-investigations", name: "Investigations", slug: "investigations", active: true },
    { id: "desk-public-health", name: "Public Health", slug: "public-health", active: true },
    { id: "desk-health-systems", name: "Health Systems", slug: "health-systems", active: true },
    { id: "desk-health-business", name: "Health Business", slug: "health-business", active: true }
  ],
  geographicZones: [
    { id: "zone-global", name: "Global", slug: "global", code: null, parentId: null, level: "global", isoCountryCode: null },
    { id: "zone-africa", name: "Africa", slug: "africa", code: null, parentId: null, level: "continent", isoCountryCode: null },
    { id: "zone-southern-africa", name: "Southern Africa", slug: "southern-africa", code: null, parentId: "zone-africa", level: "region", isoCountryCode: null },
    { id: "zone-east-africa", name: "East Africa", slug: "east-africa", code: null, parentId: "zone-africa", level: "region", isoCountryCode: null },
    { id: "zone-west-africa", name: "West Africa", slug: "west-africa", code: null, parentId: "zone-africa", level: "region", isoCountryCode: null },
    { id: "zone-central-africa", name: "Central Africa", slug: "central-africa", code: null, parentId: "zone-africa", level: "region", isoCountryCode: null },
    { id: "zone-north-africa", name: "North Africa", slug: "north-africa", code: null, parentId: "zone-africa", level: "region", isoCountryCode: null },
    { id: "zone-zimbabwe", name: "Zimbabwe", slug: "zimbabwe", code: "ZW", parentId: "zone-southern-africa", level: "country", isoCountryCode: "ZW" }
  ],
  sections: [],
  topics: []
};

export const certifiedTaxonomyFixtureService: TaxonomyService = {
  async getSnapshot() {
    return snapshot;
  }
};
