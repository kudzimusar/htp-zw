import type { AdDecision, AdPlacementKey } from "../domain/models";

export type Cp5HospazRaw = {
  advertiser?: string | null;
  placement_key?: string | null;
  current_source_attachment_id?: string | number | null;
  current_source_url?: string | null;
  current_storage_object?: string | null;
  checksum_sha256?: string | null;
  source_template_id?: string | number | null;
  destination_url_state?: string | null;
  destination_url?: string | null;
  schedule_state?: string | null;
  schedule?: string | null;
  placement_conditions_state?: string | null;
  placement_conditions?: string | null;
};

export type Cp5HospazCapability = {
  advertiser: string;
  placementKey: string | null;
  creativeUrl: string | null;
  provenance: {
    currentSourceAttachmentId: string | null;
    currentSourceUrl: string | null;
    currentStorageObject: string | null;
    checksumSha256: string | null;
    sourceTemplateId: string | null;
  };
  destination: { state: string; url: string | null };
  schedule: { state: string; value: string | null };
  placementConditions: { state: string; value: string | null };
  failClosed: {
    clickTargetInvented: false;
    scheduleInvented: false;
    placementConditionsInvented: false;
  };
};

function state(value: unknown) {
  const normalized=String(value ?? "UNKNOWN").trim().toUpperCase();
  return normalized || "UNKNOWN";
}

function provenValue(stateValue: unknown, value: unknown) {
  return state(stateValue)==="KNOWN" && value != null && String(value).trim()
    ? String(value)
    : null;
}

function migratedMediaUrl(supabaseUrl: string, objectName: string | null | undefined) {
  if(!supabaseUrl || !objectName) return null;
  const base=supabaseUrl.replace(/\/$/,"");
  const key=String(objectName).split("/").map(encodeURIComponent).join("/");
  return base+"/storage/v1/object/public/migrated-media/"+key;
}

/**
 * Portable Reader projection of the accepted CP5 buildHospazCapability contract.
 * Values come from ag05_hospaz_direct_ad_preview; this does not create campaign truth.
 * Phase 7 tests compare this shape against the CP5 builder for the same input.
 */
export function projectCp5HospazCapability(
  ad: Cp5HospazRaw | null,
  supabaseUrl: string
): Cp5HospazCapability | null {
  if(!ad) return null;
  const destinationState=state(ad.destination_url_state);
  const scheduleState=state(ad.schedule_state);
  const placementConditionsState=state(ad.placement_conditions_state);
  return {
    advertiser:String(ad.advertiser || "HOSPAZ"),
    placementKey:ad.placement_key ? String(ad.placement_key) : null,
    creativeUrl:ad.current_storage_object
      ? migratedMediaUrl(supabaseUrl,ad.current_storage_object)
      : (ad.current_source_url ? String(ad.current_source_url) : null),
    provenance:{
      currentSourceAttachmentId:ad.current_source_attachment_id == null
        ? null
        : String(ad.current_source_attachment_id),
      currentSourceUrl:ad.current_source_url ? String(ad.current_source_url) : null,
      currentStorageObject:ad.current_storage_object ? String(ad.current_storage_object) : null,
      checksumSha256:ad.checksum_sha256 ? String(ad.checksum_sha256) : null,
      sourceTemplateId:ad.source_template_id == null ? null : String(ad.source_template_id)
    },
    destination:{
      state:destinationState,
      url:provenValue(destinationState,ad.destination_url)
    },
    schedule:{
      state:scheduleState,
      value:provenValue(scheduleState,ad.schedule)
    },
    placementConditions:{
      state:placementConditionsState,
      value:provenValue(placementConditionsState,ad.placement_conditions)
    },
    failClosed:{
      clickTargetInvented:false,
      scheduleInvented:false,
      placementConditionsInvented:false
    }
  };
}

export function directDecisionFromHospazCapability(
  capability: Cp5HospazCapability | null,
  placementKey: AdPlacementKey
): AdDecision {
  if(!capability || capability.placementKey!==placementKey || !capability.creativeUrl){
    return {
      placementKey,
      source:"none",
      personalization:"none",
      disclosureLabel:"Advertisement",
      policyReason:"No verified direct-ad capability is available for this placement."
    };
  }

  const unresolved=[
    capability.destination.state!=="KNOWN" ? "destination" : null,
    capability.schedule.state!=="KNOWN" ? "schedule" : null,
    capability.placementConditions.state!=="KNOWN" ? "placement conditions" : null
  ].filter(Boolean);

  return {
    placementKey,
    source:"direct",
    personalization:"none",
    disclosureLabel:"Direct advertising · "+capability.advertiser,
    policyReason:unresolved.length
      ? "Provenance-backed direct placement. "+unresolved.join(", ")+" remain unverified and are not inferred."
      : "Provenance-backed direct placement with verified commercial fields.",
    creativeUrl:capability.creativeUrl,
    ...(capability.destination.url ? {destinationUrl:capability.destination.url} : {}),
    commercialSourceContext:{
      source:"direct",
      sourceReference:[
        capability.advertiser,
        capability.provenance.currentSourceAttachmentId
          ? "source attachment "+capability.provenance.currentSourceAttachmentId
          : null
      ].filter(Boolean).join(" | "),
      reconciliation:unresolved.length ? "requires-review" : "match"
    }
  };
}
