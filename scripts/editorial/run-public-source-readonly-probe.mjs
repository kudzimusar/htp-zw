import { writeFileSync } from "node:fs";
import { probePublicPublisher } from "./public-source-readonly-probe.mjs";

const outputIndex=process.argv.indexOf("--output");
const output=outputIndex>=0 ? process.argv[outputIndex+1] : null;
const result=await probePublicPublisher();
const evidence=JSON.stringify({
  scope: "diagnostics-only-no-ingest-no-staging-writes",
  source: "https://healthtimes.co.zw",
  checkedAt: new Date().toISOString(),
  ...result
},null,2)+"\n";
if (output) writeFileSync(output,evidence,{flag:"w",mode:0o600});
console.log(evidence);
if (result.status!=="PROBE_SUCCEEDED_NOT_AUTHORIZED_AS_FEED" || result.latestWithin7Days!==true) {
  console.error("P0 freshness gate BLOCKED: recent publisher metadata was not independently verified.");
  process.exitCode=2;
}
