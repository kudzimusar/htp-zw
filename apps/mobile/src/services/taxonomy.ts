import type { TaxonomyService } from "../domain/contracts";
import type { TaxonomySnapshot } from "../domain/source";
import { AG01_CANONICAL_DESKS, AG01_CANONICAL_GEOGRAPHY } from "../domain/taxonomy-authority";

const snapshot: TaxonomySnapshot = {
  editorialDesks: Object.values(AG01_CANONICAL_DESKS).map((desk) => ({ ...desk, active: true })),
  geographicZones: Object.values(AG01_CANONICAL_GEOGRAPHY),
  sections: [],
  topics: []
};

export const certifiedTaxonomyFixtureService: TaxonomyService = {
  async getSnapshot() {
    return snapshot;
  }
};
