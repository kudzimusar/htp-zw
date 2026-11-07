# HT-NR-UI-02 First Owner Authentication & Activation Guide

**Programme:** HealthTimes Newsroom OS  
**Milestone:** HT-NR-UI-02 First Owner Authentication  
**Canonical Account:** `kudzimusar@gmail.com`  
**Invitation Token:** `3c277c48-5319-429f-a2c3-1bf2dbae4c2a`  
**Assigned Role:** `Publisher / Owner`  
**Activation Route:** `/studio/activate` (Web: `http://localhost:8099/studio/activate` or production hosting)

---

## 1. Security Architecture & Threat Model

Prior to HT-NR-UI-02, bootstrap implementations accepted arbitrary caller-supplied emails or parameters, presenting a risk of unauthorized privilege escalation.

HT-NR-UI-02 eliminates this vulnerability completely:
1. **Zero-Parameter Function Boundary:** `newsroom_bootstrap_owner()` accepts NO input parameters (`() RETURNS jsonb`).
2. **Hardcoded Identity Binding:** The RPC derives the caller's email strictly from `auth.jwt() ->> 'email'` and rejects any caller whose email does NOT match `kudzimusar@gmail.com`:
   ```sql
   IF v_caller_email IS NULL OR lower(v_caller_email) != 'kudzimusar@gmail.com' THEN
       RETURN jsonb_build_object(
           'success', false,
           'error', 'Unauthorized: Bootstrap is restricted exclusively to kudzimusar@gmail.com'
       );
   END IF;
   ```
3. **Invitation Consumption:** The bootstrap function validates and marks the pre-provisioned invitation `3c277c48-5319-429f-a2c3-1bf2dbae4c2a` as `accepted`, linking it directly to the authenticated Supabase user ID.
4. **Idempotency:** If the Publisher/Owner profile has already been provisioned, subsequent executions safely return `{ "success": true, "already_provisioned": true }` without duplicating records or corrupting RBAC assignments.
5. **Session Registration:** Following activation, `newsroom_register_session` authenticates the active device session and resolves the full Publisher/Owner capability snapshot (all 74 capabilities).

---

## 2. Activation Screen (`/studio/activate`)

The First Owner Activation Screen (`apps/mobile/app/studio/activate.tsx` and `apps/mobile/src/ui/StudioActivate.tsx`) provides an executive-grade onboarding interface:

- **Email Lockdown:** Displays `kudzimusar@gmail.com` as a non-editable, locked security field.
- **Invitation Token Lockdown:** Displays `3c277c48-5319-429f-a2c3-1bf2dbae4c2a` as a verified credential token.
- **Password Form:** Prompts Kudzi Musarurwa to set a strong password (minimum 8 characters) with confirmation validation.
- **Dual-Phase Authentication Flow:**
  1. Calls `supabase.auth.signUp({ email, password })`.
  2. If the user is already created in `auth.users`, gracefully falls back to `supabase.auth.signInWithPassword({ email, password })`.
  3. Calls `newsroom_bootstrap_owner()` to guarantee role assignment and invitation consumption.
  4. Automatically navigates to `/studio` upon success.

---

## 3. Step-by-Step Activation Ceremony

To execute the live Owner Activation on Staging:

1. **Launch Studio Activation:**
   Navigate to `/studio/activate` in your browser.
2. **Enter Desired Password:**
   Enter your secure password in both the "Set Secure Password" and "Confirm Password" fields.
3. **Submit Activation:**
   Click **Activate Owner Account →**.
4. **Operational Outcome:**
   - The green success banner confirms: `"Publisher / Owner account activated successfully. Redirecting to Newsroom OS..."`
   - You are redirected to `/studio`.
   - Your session is initialized with the `Publisher / Owner` role.
   - All 7 operating domains (Editorial Core, Production & Publishing, Audience & Distribution, Commercial & Subscriptions, Finance & Accounting, Editorial Intelligence, Executive & Administration) are fully unlocked.
