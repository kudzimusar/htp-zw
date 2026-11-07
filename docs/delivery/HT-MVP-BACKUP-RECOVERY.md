# HealthTimes 2.0 — Backup, Disaster Recovery & Data Platform Register
## Persistence Architecture, Point-in-Time Recovery (PITR) & Restore Protocols

- **Document ID:** `HT-MVP-BACKUP-RECOVERY`
- **Release Candidate:** `release/ht-mvp-rc02-final-unified-candidate`
- **Controlling Base SHA:** `d5af42d6b7018dfd3451ac9d621482e0edf9664f`
- **Governing Standard:** 11-11 Tech UDPCS 1.0 Sections 28 & 29
- **Target Delivery Date:** 24 October 2026

---

## 1. Data Platform & Asset Inventory

Under UDPCS 1.0 Section 28, all persistent platform data assets are formally classified, located, and assigned retention policies:

| Asset Class | Underlying Engine | Schemas / Buckets | Description & Sensitivity | Retention Policy |
| :--- | :--- | :--- | :--- | :--- |
| **Relational Database** | PostgreSQL 17.6 (Supabase) | `public`, `auth`, `supabase_migrations` | Articles, revisions, staff accounts, general ledger, ad campaigns, audit logs. *(HIGH)* | Indefinite for published articles and GL; 7-year statutory for finance. |
| **Media & Audio Storage**| Object Storage (AWS S3 via Supabase) | Buckets: `article-media`, `ad-creatives`, `newsroom-assets` | Article hero images, author avatars, ad creative banners, audio podcast MP3s. *(MEDIUM)* | Indefinite while referenced in published articles; 90 days for expired ad creatives. |
| **Authentication Identity**| Supabase Auth Engine | `auth.users`, `auth.identities` | Staff and reader email identities, hashed credentials, confirmation timestamps. *(CRITICAL)* | Active during user lifecycle; hard deleted upon verified GDPR/right-to-be-forgotten request. |
| **Client Local Cache** | SQLite / AsyncStorage | Device Local Storage | Cached articles, bookmarks, reader theme settings, JWT tokens. *(LOW)* | Cleared on user app data reset or manual logout. |

---

## 2. Backup Architecture & Recovery Objectives

### 2.1 Recovery Objectives
- **Target Recovery Point Objective (RPO):** **< 15 Minutes** (Maximum allowable data loss in catastrophic disaster).
- **Target Recovery Time Objective (RTO):** **< 60 Minutes** (Time to restore full platform service).

### 2.2 Backup Mechanisms
1. **Automated Point-in-Time Recovery (PITR):**
   - Enabled via Supabase Pro enterprise database tier.
   - Continuous Write-Ahead Log (WAL) archiving to durable off-site cloud storage.
   - Allows granular restoration to any millisecond within the rolling 7-day retention window.
2. **Daily Logical Database Snapshots:**
   - Full automated database snapshot executed daily at 02:00 CAT.
   - Retained for 30 rolling days in geographically redundant multi-region cloud storage.
3. **Storage Bucket Object Versioning:**
   - Supabase media buckets utilize object versioning to protect against accidental image deletion or overwrite.

---

## 3. Logical Backup Export Procedure (Manual / Pre-Release)

Prior to any major production release or database structural maintenance, the engineering lead must execute a standalone logical dump using PostgreSQL utilities:

```bash
# 1. Export schema DDL only
pg_dump --clean --if-exists --schema-only \
  -h db.gcdohgbmqhqwydgaxrcr.supabase.co \
  -U postgres \
  -d postgres > backups/ht_schema_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Export application data (excluding auth secrets)
pg_dump --data-only --schema=public \
  -h db.gcdohgbmqhqwydgaxrcr.supabase.co \
  -U postgres \
  -d postgres > backups/ht_public_data_backup_$(date +%Y%m%d_%H%M%S).sql
```

*Security Note:* Backup files containing application data must be encrypted with AES-256 (`gpg --symmetric`) prior to transfer or offsite archiving.

---

## 4. Disaster Recovery & Restoration Protocol

In the event of a catastrophic regional database failure or corrupting administrative error:

### Step 1: Declare Recovery Event & Freeze Ingress
- Incident Commander announces emergency maintenance.
- Temporarily route web readers to static CDN fallback page.

### Step 2: Initiate Point-in-Time Restore (PITR)
1. Open Supabase Management Console → Database → Backups.
2. Select 'Point in Time Recovery'.
3. Specify target recovery timestamp (e.g. 5 minutes prior to the corrupting event).
4. Initiate restore to new target instance or restore in place.
5. Restore typically completes within 15–30 minutes depending on database volume.

### Step 3: Migration State Verification
Once database services resume:
```sql
-- Verify migration count matches controlling tip (96)
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;

-- Verify financial general ledger integrity
SELECT count(*) FROM public.gl_journal_entries;
```

### Step 4: Resume Traffic & Notify Stakeholders
- Switch DNS/CDN back to restored instance.
- Verify reader feeds and staff login via preflight script.
- Publish incident completion notice.

---

## 5. Annual Disaster Recovery Drill Schedule

To ensure operational preparedness, HealthTimes schedules bi-annual disaster recovery simulations:
- **H1 Drill (May):** Staging database logical restore rehearsal and data validation test.
- **H2 Drill (November):** Failover simulation and media storage bucket integrity check.
