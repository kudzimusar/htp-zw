'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  INITIATE_TRANSACTION_URL, generatePaynowHash, verifyPaynowHash,
  parsePaynowForm, serializePaynowForm, buildPaynowInitiation,
  parsePaynowInitiationResponse, parsePaynowStatusUpdate
} = require('../lib/paynow-protocol');
const key = 'test-fixture-integration-key-not-a-real-secret';
const ref = 'HT-PREM-01K9T2JVYV6FC01XPBXZAA7BC4';
const pollUrl = 'https://www.paynow.co.zw/interface/checkpayment/?guid=fixture';
const base = {integrationId:'1201',reference:ref,amount:'5.00',additionalInfo:'HealthTimes Premium',returnUrl:'https://preview.example.test/payments/return',resultUrl:'https://preview.example.test/api/paynow/result'};
function response(pairs){return serializePaynowForm([...pairs,['hash',generatePaynowHash(pairs,key)]]);}

test('Paynow official SHA-512 outbound reference vector (field order + raw decoded values)', () => {
  const v = [
    ['id','1201'],['reference','TEST REF'],['amount','99.99'],
    ['additionalinfo','A test ticket transaction'],
    ['returnurl','http://www.google.com/search?q=returnurl'],
    ['resulturl','http://www.google.com/search?q=resulturl'],['status','Message']
  ];
  const expected='2A033FC38798D913D42ECB786B9B19645ADEDBDE788862032F1BD82CF3B92DEF84F316385D5B40DBB35F1A4FD7D5BFE73835174136463CDD48C9366B0749C689';
  assert.equal(generatePaynowHash(v,'3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977'),expected);
});

test('builder emits signed, url-encoded request; no key, PII, tokenization, or payment-state mutation', () => {
  const request=buildPaynowInitiation(base,key);
  assert.equal(request.url,INITIATE_TRANSACTION_URL);
  assert.equal(request.contentType,'application/x-www-form-urlencoded');
  const decoded=parsePaynowForm(request.body);
  assert.equal(Object.fromEntries(decoded).amount,'5.00');
  assert.equal(Object.fromEntries(decoded).status,'Message');
  assert.equal(verifyPaynowHash(decoded,key),true);
  assert.ok(!request.body.includes(key));
  assert.ok(!request.body.includes('tokenize'));
  assert.ok(!request.body.includes('authemail'));
  assert.equal(request.body.includes('entitlementGranted'),false);
});

test('tamper, wrong key, field reorder, duplicate hash and missing hash all fail',()=>{
  const request=buildPaynowInitiation(base,key);
  const f=parsePaynowForm(request.body);
  assert.equal(verifyPaynowHash(f,'different-key'),false);
  assert.equal(verifyPaynowHash(f.map(([k,v])=>[k,k==='amount'?'500.00':v]),key),false);
  assert.equal(verifyPaynowHash([...f].reverse(),key),false);
  assert.equal(verifyPaynowHash([...f,['HASH','duplicate']],key),false);
  assert.equal(verifyPaynowHash(f.filter(([k])=>k!=='hash'),key),false);
  assert.throws(()=>parsePaynowForm('status=Paid&STATUS=Paid&hash=not-a-hash'),/Duplicate/);
});

test('strict payment-input validation (ID, reference, amount, HTTPS only)',()=>{
  for (const value of ['5','5.0','0.00','-5.00','5.999','NaN',5]) {
    assert.throws(()=>buildPaynowInitiation({...base,amount:value},key));
  }
  assert.throws(()=>buildPaynowInitiation({...base,reference:'HT-PREM-user@example.com'},key));
  assert.throws(()=>buildPaynowInitiation({...base,integrationId:'123 OR 1=1'},key));
  assert.throws(()=>buildPaynowInitiation({...base,resultUrl:'http://localhost:3000/callback'},key));
  assert.throws(()=>buildPaynowInitiation({...base,returnUrl:'https://user:pass@example.test/return'},key));
  assert.throws(()=>buildPaynowInitiation(base,''),/unavailable/);
});

test('signed initiation accepts only HTTPS Paynow destinations; signed error cannot redirect',()=>{
  const ok=response([['Status','Ok'],['BrowserUrl','https://www.paynow.co.zw/Payment/ConfirmPayment/1169'],['PollUrl',pollUrl]]);
  const decision=parsePaynowInitiationResponse(ok,key);
  assert.equal(decision.verified,true);
  assert.equal(decision.entitlementGranted,false);
  assert.equal(decision.pollUrl,pollUrl);
  const evil=response([['status','Ok'],['browserurl','https://evil.test/steal'],['pollurl',pollUrl]]);
  assert.throws(()=>parsePaynowInitiationResponse(evil,key),/Untrusted/);
  const invalidPoll=response([['status','Ok'],['browserurl','https://www.paynow.co.zw/payment/123'],['pollurl','https://www.paynow.co.zw/interface/trace']]);
  assert.throws(()=>parsePaynowInitiationResponse(invalidPoll,key),/polling/);
  const err=response([['status','Error'],['error','Not available']]);
  assert.throws(()=>parsePaynowInitiationResponse(err,key),/did not succeed/);
});

test('verified Paid claim does not grant entitlement or mutate Finance; independent poll still required',()=>{
  const raw=response([['reference',ref],['paynowreference','12345'],['amount','5.00'],['status','Paid'],['pollurl',pollUrl]]);
  const decision=parsePaynowStatusUpdate(raw,key);
  assert.equal(decision.verifiedHash,true);
  assert.equal(decision.status,'Paid');
  assert.equal(decision.entitlementGranted,false);
  assert.equal(decision.businessAuthorityMutated,false);
  assert.equal(decision.requiresProviderPollConfirmation,true);
  const tampered=raw.replace('amount=5.00','amount=0.01');
  assert.throws(()=>parsePaynowStatusUpdate(tampered,key),/Unverified/);
});

test('parse rejects oversized/duplicate response; correctly decodes plus, % escapes',()=>{
  assert.throws(()=>parsePaynowForm('x='.repeat(9000)),/size/);
  assert.deepEqual(parsePaynowForm('reference=HELLO+WORLD&status=Awaiting%20Delivery'),[['reference','HELLO WORLD'],['status','Awaiting Delivery']]);
});
