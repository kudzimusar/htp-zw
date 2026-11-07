# HealthTimes 2.0 — Gate 2 Owner External Custody & Offline Ed25519 Key Ceremony Specification (`HT-MVP-PUBLIC-LAUNCH-01-G2-LR01-R6`)

- **Programme Authority:** https://github.com/kudzimusar/htp-zw/issues/147 (`HT-MVP-PUBLIC-LAUNCH-01`)
- **Controlling Gate 2 Issue:** https://github.com/kudzimusar/htp-zw/issues/152
- **Stacked G2 Remediation PR:** https://github.com/kudzimusar/htp-zw/pull/153 (`fix/ht-g2-rbac-session-boundary` -> `release/ht-mvp-2.0-final`)
- **Frozen Accepted Gate 1 Base SHA:** `1f6a8ca4b41cb646beb6f12ecf11aee96c5973b5`
- **Reference Outer Trusted Bootstrap (`scripts/release/owner-trusted-uat-bootstrap.mjs`) SHA-256:** `30b66388ed4a672c928e27c0127a1f4504af2e2bba71d17ab9dab8cf00068b11`
- **Pinned Inner Candidate Verifier (`scripts/release/run-protected-staging-uat.mjs`) SHA-256:** `f2fbbb8ef4ac349aa8cfb0af55b3f3c156888cd9c75ea95e069cd01b59257f13`
- **Blocklisted Historical Placeholder Public Key Fingerprint:** `SHA256:j0jsyP9NEhN5XtSDIloQV757NXqoM1hzIdyGvA9wvm4` (`8f48ecc8ff4d1213795ed483225a1057be7b357aa833587321dc86bc0f70be6e`)

---

## 1. Key Interoperability & Custody Architecture

In R6, the historical candidate-embedded placeholder public key (`SHA256:j0jsyP9NEhN5XtSDIloQV757NXqoM1hzIdyGvA9wvm4`) has been **completely removed** from `scripts/release/run-protected-staging-uat.mjs` and `docs/delivery/ht-g2-approved-uat-source-allowlist.json` and is **permanently blocklisted** (`UNVERIFIED_CANDIDATE_PLACEHOLDER_KEY_FORBIDDEN`) in both the outer bootstrap and the inner candidate verifier.

Instead, **both** the outer trusted bootstrap (`owner-trusted-uat-bootstrap.mjs`) and the inner candidate verifier (`run-protected-staging-uat.mjs`) verify warrants against the **same external Owner-controlled trust-root file (`--trust-root` / `--owner-trust-root`) residing outside the repository working tree**:

1. **Outer Bootstrap Custody Boundary (`IN_REPO_BOOTSTRAP_EXECUTION_FORBIDDEN`):**
   - Although the reference implementation is committed at `scripts/release/owner-trusted-uat-bootstrap.mjs` (`SHA-256: 30b66388ed4a672c928e27c0127a1f4504af2e2bba71d17ab9dab8cf00068b11`) so the Independent Security Reviewer and GitHub Actions CI can inspect and test it on the exact commit SHA, it **refuses to execute from inside `REPO_ROOT`**.
   - For operational execution, the Owner installs a verified copy into an external Owner-controlled custody directory outside the repository checkout (e.g., `/opt/healthtimes-owner-custody/bin/owner-trusted-uat-bootstrap.mjs`, mode `0500`, owned by the Owner/operator account) and verifies its SHA-256 (`30b66388ed4a672c928e27c0127a1f4504af2e2bba71d17ab9dab8cf00068b11`) before running.
2. **Pre-Secret Outer Verification Gate:**
   - Strips all ambient privileged environment variables on startup.
   - Verifies the external `owner-trust-root.json` public-key SPKI DER SHA-256 fingerprint (`expectedPublicKeyFingerprintSha256Hex` and `expectedPublicKeyFingerprintSha256B64`).
   - Verifies clean candidate git working tree, exact candidate `HEAD` SHA, frozen G1 ancestry (`1f6a8ca4b41cb646beb6f12ecf11aee96c5973b5`), and exact SHA-256 of the inner candidate verifier (`f2fbbb8ef4ac349aa8cfb0af55b3f3c156888cd9c75ea95e069cd01b59257f13`) + all 7 SQL/manifest/test artifacts **before** invoking the inner candidate verifier or reading credentials.
   - Verifies the detached Ed25519 signature on the external `warrant.json`, enforces single-use `warrantId` via the external `replay-ledger.json`, verifies the independent GitHub Security review (`SECURITY_ACCEPT_G2_SOURCE_ONLY` for exact `HEAD` SHA under a real non-author GitHub account), and enforces `keyClassification === "OWNER_OFFLINE_PRODUCTION_AUTHORITY"` and `credentialClassification === "PRODUCTION_OWNER_STAGING_VAULT"` for `--mode live`.
3. **Inner Candidate Verifier Interoperability:**
   - Receives `--owner-trust-root <external-path>`, `--policy-warrant <external-path>`, and `--credentials-file <external-path>` from the outer bootstrap and independently re-verifies the Ed25519 signature, SPKI SHA-256 fingerprint, commit SHA, branch, G1 ancestry, 7 artifact digests, security review binding, actor roles, and credential classification.

---

## 2. Step-by-Step Owner-Only Offline Ed25519 Key Ceremony

> **CRITICAL SECURITY RULE:** The Owner must execute these steps offline on an Owner-controlled machine outside the repository, CI runners, and agent environments. **Never** commit, paste, or transmit `owner-g2-authority-private.pem`.

### Step 1 — Create External Owner Custody Directory Outside the Repository
```bash
sudo mkdir -p /opt/healthtimes-owner-custody/{bin,keys,trust,warrants,ledgers,secrets}
sudo chown -R "$(whoami)" /opt/healthtimes-owner-custody
chmod 0700 /opt/healthtimes-owner-custody /opt/healthtimes-owner-custody/{bin,keys,trust,warrants,ledgers,secrets}
```

### Step 2 — Install & Verify the Audited Outer Bootstrap Executable
```bash
cp "<REPO_ROOT>/scripts/release/owner-trusted-uat-bootstrap.mjs" \
  /opt/healthtimes-owner-custody/bin/owner-trusted-uat-bootstrap.mjs
chmod 0500 /opt/healthtimes-owner-custody/bin/owner-trusted-uat-bootstrap.mjs

# Verify exact SHA-256 matches 30b66388ed4a672c928e27c0127a1f4504af2e2bba71d17ab9dab8cf00068b11:
shasum -a 256 /opt/healthtimes-owner-custody/bin/owner-trusted-uat-bootstrap.mjs
```

### Step 3 — Generate the Offline Owner Ed25519 Keypair & Compute SPKI Fingerprints
```bash
openssl genpkey -algorithm Ed25519 \
  -out /opt/healthtimes-owner-custody/keys/owner-g2-authority-private.pem
chmod 0400 /opt/healthtimes-owner-custody/keys/owner-g2-authority-private.pem

openssl pkey \
  -in /opt/healthtimes-owner-custody/keys/owner-g2-authority-private.pem \
  -pubout -out /opt/healthtimes-owner-custody/trust/owner-g2-authority-public.pem

# Compute both Hex and Base64 SPKI DER SHA-256 fingerprints:
node -e '
const crypto = require("node:crypto");
const fs = require("node:fs");
const pem = fs.readFileSync("/opt/healthtimes-owner-custody/trust/owner-g2-authority-public.pem", "utf8");
const der = crypto.createPublicKey(pem).export({ type: "spki", format: "der" });
console.log("expectedPublicKeyFingerprintSha256Hex:", crypto.createHash("sha256").update(der).digest("hex"));
console.log("expectedPublicKeyFingerprintSha256B64:", "SHA256:" + crypto.createHash("sha256").update(der).digest("base64").replace(/=+$/, ""));
'
```

### Step 4 — Register the Public Key in `/opt/healthtimes-owner-custody/trust/owner-trust-root.json`
Record only the public key PEM and its computed SPKI SHA-256 fingerprints in `/opt/healthtimes-owner-custody/trust/owner-trust-root.json` (with `keyClassification: "OWNER_OFFLINE_PRODUCTION_AUTHORITY"`, `provenanceCeremonyId`, `outOfBandVerificationRef`, `approvedHeadSha`, and `pinnedCandidateVerifierSha256: "f2fbbb8ef4ac349aa8cfb0af55b3f3c156888cd9c75ea95e069cd01b59257f13"`).
