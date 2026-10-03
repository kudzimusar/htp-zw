import { Platform } from "react-native";
import type { PremiumCommerceService } from "../domain/contracts";
import type {
  PremiumCheckoutResult,
  PremiumCommerceAuthority,
  PremiumCommerceStatus
} from "../domain/models";

type ServerCommerceAuthority = {
  status?: string | null;
  paymentGatewayMigrationComplete?: boolean | null;
  currentProvider?: string | null;
  currentPrice?: string | number | null;
  currentCurrency?: string | null;
  membershipPlanIdentity?: string | null;
  productPlanIds?: unknown;
};

type ServerCheckoutDecision = {
  status?: string | null;
  checkoutUrl?: string | null;
  provider?: string | null;
  productPlanId?: string | null;
  price?: string | number | null;
  entitlementGranted?: boolean | null;
};

function configuredServerUrl(){
  if(Platform.OS!=="web") return null;
  const value=process.env.EXPO_PUBLIC_HEALTHTIMES_COMMERCE_AUTHORITY_URL?.trim();
  if(!value) return null;
  try{
    const url=new URL(value);
    const localhost=url.hostname==="localhost" || url.hostname==="127.0.0.1";
    if(url.protocol!=="https:" && !(localhost && url.protocol==="http:")) return null;
    url.hash="";
    return url.toString();
  }catch{
    return null;
  }
}

function unavailableAuthority(
  channel:"web-server"|"native-store",
  status:PremiumCommerceStatus="configuration-required",
  message?:string
):PremiumCommerceAuthority{
  return {
    channel,
    status,
    provider:null,
    price:null,
    currency:null,
    billingInterval:null,
    productPlanId:null,
    checkoutUrl:null,
    entitlementGranted:false,
    message:message ?? (
      channel==="native-store"
        ? "Native Premium purchases remain under App Store or Google Play authority and are not configured."
        : "Web Premium checkout is unavailable until a HealthTimes server commerce authority is configured."
    )
  };
}

function safeCheckoutUrl(value:string|null|undefined){
  if(!value) return null;
  try{
    const url=new URL(value);
    return url.protocol==="https:" ? url.toString() : null;
  }catch{
    return null;
  }
}

async function readJson(response:Response){
  try{
    return await response.json() as unknown;
  }catch{
    return null;
  }
}

export function createPremiumCommerceService():PremiumCommerceService{
  return {
    async getAuthority(){
      if(Platform.OS!=="web") return unavailableAuthority("native-store");

      const endpoint=configuredServerUrl();
      if(!endpoint) return unavailableAuthority("web-server");

      try{
        const response=await fetch(endpoint,{
          method:"GET",
          headers:{Accept:"application/json"},
          credentials:"omit"
        });
        const raw=await readJson(response) as ServerCommerceAuthority|null;
        if(!response.ok || !raw){
          return unavailableAuthority("web-server","unavailable","Web Premium commerce authority is unavailable.");
        }

        const provider=typeof raw.currentProvider==="string" && raw.currentProvider.trim() ? raw.currentProvider.trim() : null;
        const price=raw.currentPrice===null || raw.currentPrice===undefined ? null : String(raw.currentPrice);
        const currency=typeof raw.currentCurrency==="string" && raw.currentCurrency.trim() ? raw.currentCurrency.trim() : null;
        const productIds=Array.isArray(raw.productPlanIds)
          ? raw.productPlanIds.filter((item):item is string=>typeof item==="string" && Boolean(item.trim()))
          : [];
        const available=
          raw.paymentGatewayMigrationComplete===true &&
          provider!==null &&
          price!==null &&
          currency!==null &&
          productIds.length>0;

        if(!available){
          return {
            ...unavailableAuthority("web-server"),
            provider,
            price,
            currency,
            productPlanId:productIds[0] ?? null
          };
        }

        return {
          channel:"web-server",
          status:"available",
          provider,
          price,
          currency,
          billingInterval:null,
          productPlanId:productIds[0] ?? null,
          checkoutUrl:null,
          entitlementGranted:false,
          message:"Web Premium checkout authority is available. Entitlement still requires authoritative payment verification."
        };
      }catch{
        return unavailableAuthority("web-server","error","Web Premium commerce authority could not be reached.");
      }
    },

    async startCheckout(input={}){
      if(Platform.OS!=="web"){
        return {
          status:"configuration-required",
          checkoutUrl:null,
          entitlementGranted:false,
          message:"Native Premium purchases must use the platform storefront service."
        };
      }

      const endpoint=configuredServerUrl();
      if(!endpoint){
        return {
          status:"configuration-required",
          checkoutUrl:null,
          entitlementGranted:false,
          message:"Web Premium checkout is not configured."
        };
      }

      try{
        const url=new URL(endpoint);
        url.searchParams.set("action","checkout");
        const response=await fetch(url.toString(),{
          method:"POST",
          headers:{
            Accept:"application/json",
            "Content-Type":"application/json"
          },
          credentials:"omit",
          body:JSON.stringify({
            productPlanId:input.productPlanId ?? null
          })
        });
        const raw=await readJson(response) as ServerCheckoutDecision|null;
        const checkoutUrl=safeCheckoutUrl(raw?.checkoutUrl);

        if(!response.ok || !raw || !checkoutUrl){
          return {
            status:raw?.status==="configuration-required" ? "configuration-required" : "unavailable",
            checkoutUrl:null,
            entitlementGranted:false,
            message:"Premium checkout is unavailable. No membership access has been granted."
          };
        }

        return {
          status:"redirect-required",
          checkoutUrl,
          entitlementGranted:false,
          message:"Checkout can continue with the configured provider. Premium access remains locked until authoritative entitlement is verified."
        };
      }catch{
        return {
          status:"error",
          checkoutUrl:null,
          entitlementGranted:false,
          message:"Premium checkout could not be started. No membership access has been granted."
        };
      }
    }
  };
}

export const premiumCommerceService=createPremiumCommerceService();
