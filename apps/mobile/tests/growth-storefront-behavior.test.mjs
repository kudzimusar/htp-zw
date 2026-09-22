import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./ts-module-loader.mjs";

const storefront=loadTs("src/growth/premium-store.ts");

const offers=[
  {productKey:"monthly",storeProductId:"store.monthly",displayPrice:"Localized Monthly",periodLabel:"per month"},
  {productKey:"yearly",storeProductId:"store.yearly",displayPrice:"Localized Yearly",periodLabel:"per year"}
];

test("Premium storefront fails closed when platform products are unconfigured",async()=>{
  const service=storefront.createPremiumStoreService();
  const state=await service.getState();
  assert.equal(state.status,"configuration-required");
  assert.deepEqual(state.offers,[]);
  const purchase=await service.startPurchase("unknown");
  assert.equal(purchase.status,"configuration-required");
  assert.equal(purchase.providerTransactionReference,null);
});

test("Premium storefront preserves provider loading unavailable and error states",async()=>{
  for(const status of ["loading","unavailable","error"]){
    const service=storefront.createPremiumStoreService({
      getState:async()=>({status,offers:[],message:status}),
      startPurchase:async()=>({status:"unavailable"}),
      restorePurchases:async()=>({status:"unavailable"})
    });
    const state=await service.getState();
    assert.equal(state.status,status);
    assert.deepEqual(state.offers,[]);
  }
});

test("available offers come only from the provider response",async()=>{
  const service=storefront.createPremiumStoreService({
    getState:async()=>({status:"available",offers,message:"provider offers"}),
    startPurchase:async()=>({status:"cancelled"}),
    restorePurchases:async()=>({status:"nothing-to-restore"})
  });
  assert.deepEqual((await service.getState()).offers,offers);
});

test("successful client purchase remains pending server entitlement",async()=>{
  const service=storefront.createPremiumStoreService({
    getState:async()=>({status:"available",offers,message:"ready"}),
    startPurchase:async(id)=>({status:"purchased",transactionReference:"provider-tx-1",message:id}),
    restorePurchases:async()=>({status:"nothing-to-restore"})
  });
  const result=await service.startPurchase("store.monthly");
  assert.equal(result.status,"pending-server-entitlement");
  assert.equal(result.providerTransactionReference,"provider-tx-1");
  assert.match(result.message,/NM-06 \/ AG-06/);
});

test("unknown products cannot be purchased outside current storefront discovery",async()=>{
  let purchaseCalls=0;
  const service=storefront.createPremiumStoreService({
    getState:async()=>({status:"available",offers,message:"ready"}),
    startPurchase:async()=>{purchaseCalls++;return {status:"purchased"};},
    restorePurchases:async()=>({status:"nothing-to-restore"})
  });
  const result=await service.startPurchase("invented.product");
  assert.equal(result.status,"error");
  assert.equal(purchaseCalls,0);
});

test("restore result never grants local Premium entitlement",async()=>{
  const service=storefront.createPremiumStoreService({
    getState:async()=>({status:"available",offers,message:"ready"}),
    startPurchase:async()=>({status:"cancelled"}),
    restorePurchases:async()=>({status:"restored",transactionReferences:["tx-a"]})
  });
  const result=await service.restorePurchases();
  assert.equal(result.restored,true);
  assert.equal(result.reason,"restored-pending-server-entitlement");
  assert.deepEqual(result.providerTransactionReferences,["tx-a"]);
});

test("invalid provider offers fail safely instead of inventing price or identity",async()=>{
  const service=storefront.createPremiumStoreService({
    getState:async()=>({status:"available",offers:[{...offers[0],displayPrice:""}],message:"bad"}),
    startPurchase:async()=>({status:"purchased"}),
    restorePurchases:async()=>({status:"nothing-to-restore"})
  });
  const state=await service.getState();
  assert.equal(state.status,"error");
  assert.deepEqual(state.offers,[]);
});
