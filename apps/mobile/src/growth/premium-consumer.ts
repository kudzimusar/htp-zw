import type { PremiumCommerceStatus } from "../domain/models";

export type PremiumPreviewConsumerState = {
  state:"available"|"warning"|"expired"|"unavailable";
  remainingSeconds:number;
  teaserAvailable:boolean;
  commerceAvailable:boolean;
  commerceStatus:PremiumCommerceStatus|"loading";
  promptRequested:boolean;
};

export function premiumPreviewConsumerState(input:{
  previewState:"preview"|"warning"|"locked";
  remainingSeconds:number;
  teaserAvailable:boolean;
  commerceStatus:PremiumCommerceStatus|"loading";
  promptRequested:boolean;
}):PremiumPreviewConsumerState{
  const remainingSeconds=Math.max(0,Math.floor(input.remainingSeconds));
  const state:PremiumPreviewConsumerState["state"]=
    !input.teaserAvailable
      ? "unavailable"
      : input.previewState==="locked"
        ? "expired"
        : input.previewState==="warning"
          ? "warning"
          : "available";

  return {
    state,
    remainingSeconds,
    teaserAvailable:input.teaserAvailable,
    commerceAvailable:input.commerceStatus==="available",
    commerceStatus:input.commerceStatus,
    promptRequested:input.promptRequested
  };
}
