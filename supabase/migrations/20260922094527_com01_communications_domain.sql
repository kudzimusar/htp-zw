-- COM-01 canonical communications domain.
-- Parent runtime: 0112c8802d220d23e20288783536f22e85ea346d
-- Forward-only staging implementation. No production DNS/mail mutation.

begin;

create table public.communication_channels (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  display_name text not null,
  queue_scope text not null check (queue_scope in ('editorial','commercial','support','privacy','general')),
  channel_type text not null default 'email' check (channel_type in ('email','internal','social')),
  inbound_identity text,
  outbound_identity text,
  provider text,
  environment text not null default 'staging' check (environment in ('staging','production')),
  status text not null default 'unconfigured' check (status in ('unconfigured','ready','degraded','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.communication_channels(key,display_name,queue_scope,channel_type,status) values
  ('newsroom','Newsroom','editorial','email','unconfigured'),
  ('tips','Tips','editorial','email','unconfigured'),
  ('corrections','Corrections','editorial','email','unconfigured'),
  ('advertising','Advertising','commercial','email','unconfigured'),
  ('subscriptions','Subscriptions','support','email','unconfigured'),
  ('support','Support','support','email','unconfigured'),
  ('privacy','Privacy','privacy','email','unconfigured'),
  ('press','Press','editorial','email','unconfigured')
on conflict (key) do update set
  display_name=excluded.display_name,
  queue_scope=excluded.queue_scope,
  channel_type=excluded.channel_type;

create table public.communication_accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('cloudflare','resend','brevo','social')),
  account_key text not null,
  purpose text not null,
  environment text not null default 'staging' check (environment in ('staging','production')),
  sender_identity text,
  inbound_identity text,
  status text not null default 'unconfigured' check (status in ('unconfigured','ready','degraded','disabled')),
  config_metadata jsonb not null default '{}'::jsonb,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider,account_key,environment)
);

create table public.contact_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text,
  phone text,
  locale text,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index idx_contact_profiles_email_unique on public.contact_profiles(lower(email));

create table public.contact_consents (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contact_profiles(id) on delete cascade,
  purpose text not null check (purpose in ('NEWSLETTER','BREAKING_NEWS','MARKETING','RESEARCH_UPDATES','EVENTS','PARTNER_CONTENT','SMS','WHATSAPP','PUSH')),
  channel text not null check (channel in ('email','sms','whatsapp','push')),
  status text not null check (status in ('granted','withdrawn')),
  source text not null,
  policy_version text not null,
  granted_at timestamptz,
  withdrawn_at timestamptz,
  provider_sync_state text not null default 'pending' check (provider_sync_state in ('pending','synced','failed','not_applicable')),
  provider_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(contact_id,purpose,channel)
);

create table public.communication_suppressions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contact_profiles(id) on delete cascade,
  email text not null,
  channel text not null default 'email' check (channel in ('email','sms','whatsapp','push')),
  scope text not null check (scope in ('marketing','email_delivery','all')),
  reason text not null check (reason in ('unsubscribe','bounce','complaint','manual','policy','invalid_recipient')),
  provider text,
  source_event_id text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  lifted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);
create unique index idx_communication_suppressions_active
  on public.communication_suppressions(lower(email),channel,scope,reason)
  where active;

create table public.communication_threads (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.communication_channels(id),
  queue_key text not null references public.communication_channels(key),
  contact_id uuid references public.contact_profiles(id) on delete set null,
  opaque_reply_token uuid not null default gen_random_uuid() unique,
  subject text not null,
  status text not null default 'open' check (status in ('open','pending','closed','archived')),
  priority text not null default 'normal' check (priority in ('normal','high','urgent')),
  assigned_staff_id uuid references public.staff_profiles(id) on delete set null,
  linked_story_id uuid references public.stories(id) on delete set null,
  created_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  last_message_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_communication_threads_queue on public.communication_threads(queue_key,status,last_message_at desc);
create index idx_communication_threads_assignee on public.communication_threads(assigned_staff_id,status,last_message_at desc);

create table public.communication_participants (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.communication_threads(id) on delete cascade,
  participant_type text not null check (participant_type in ('contact','staff','external')),
  contact_id uuid references public.contact_profiles(id) on delete cascade,
  staff_profile_id uuid references public.staff_profiles(id) on delete cascade,
  external_email text,
  display_name text,
  role text not null default 'participant',
  created_at timestamptz not null default now(),
  constraint communication_participant_identity check (
    num_nonnulls(contact_id,staff_profile_id,external_email)=1
  )
);
create unique index idx_communication_participant_contact on public.communication_participants(thread_id,contact_id) where contact_id is not null;
create unique index idx_communication_participant_staff on public.communication_participants(thread_id,staff_profile_id) where staff_profile_id is not null;
create unique index idx_communication_participant_external on public.communication_participants(thread_id,lower(external_email)) where external_email is not null;

create table public.communication_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.communication_threads(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound','internal')),
  message_kind text not null default 'conversation' check (message_kind in ('conversation','transactional','security','service','marketing','internal_note')),
  provider text,
  provider_message_id text,
  idempotency_key text,
  sender_email text,
  recipient_emails jsonb not null default '[]'::jsonb,
  reply_to text,
  subject text,
  body_text text,
  body_html text,
  status text not null default 'accepted' check (status in ('accepted','queued','sent','delivered','failed','bounced','complained','suppressed')),
  created_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  provider_created_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index idx_communication_messages_provider_id
  on public.communication_messages(provider,provider_message_id)
  where provider is not null and provider_message_id is not null;
create unique index idx_communication_messages_idempotency
  on public.communication_messages(idempotency_key)
  where idempotency_key is not null;
create index idx_communication_messages_thread on public.communication_messages(thread_id,created_at);

create table public.communication_assignments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.communication_threads(id) on delete cascade,
  staff_profile_id uuid not null references public.staff_profiles(id) on delete cascade,
  assigned_by uuid not null references public.staff_profiles(id),
  status text not null default 'active' check (status in ('active','released','completed')),
  assigned_at timestamptz not null default now(),
  released_at timestamptz
);
create unique index idx_communication_assignment_active on public.communication_assignments(thread_id) where status='active';

create table public.communication_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  purpose text not null check (purpose in ('transactional','security','service','conversation','marketing')),
  subject_template text,
  body_text_template text,
  body_html_template text,
  active boolean not null default true,
  created_by uuid references public.staff_profiles(id) on delete set null,
  updated_by uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.provider_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('cloudflare','resend','brevo','social')),
  provider_event_id text not null,
  event_type text not null,
  signature_valid boolean not null,
  payload_hash text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received','processed','ignored','failed')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  unique(provider,provider_event_id)
);

create table public.communication_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  message_id uuid references public.communication_messages(id) on delete set null,
  contact_id uuid references public.contact_profiles(id) on delete set null,
  provider_event_id text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index idx_communication_events_provider_event
  on public.communication_events(provider,provider_event_id)
  where provider_event_id is not null;

create table public.communication_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  key text not null,
  resource_type text,
  resource_id uuid,
  created_at timestamptz not null default now(),
  unique(scope,key)
);

create table public.contact_segments (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  provider text,
  provider_segment_id text,
  sync_state text not null default 'pending' check (sync_state in ('pending','synced','failed','not_configured')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contact_segment_members (
  segment_id uuid not null references public.contact_segments(id) on delete cascade,
  contact_id uuid not null references public.contact_profiles(id) on delete cascade,
  source text not null default 'healthtimes',
  created_at timestamptz not null default now(),
  primary key(segment_id,contact_id)
);

create table public.audience_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  purpose text not null check (purpose in ('NEWSLETTER','BREAKING_NEWS','MARKETING','RESEARCH_UPDATES','EVENTS','PARTNER_CONTENT')),
  channel text not null default 'email' check (channel='email'),
  segment_id uuid references public.contact_segments(id) on delete set null,
  provider text not null default 'brevo' check (provider='brevo'),
  provider_campaign_id text,
  status text not null default 'draft' check (status in ('draft','approved','scheduled','sending','sent','failed','cancelled')),
  created_by uuid not null references public.staff_profiles(id),
  approved_by uuid references public.staff_profiles(id) on delete set null,
  approved_at timestamptz,
  scheduled_at timestamptz,
  sent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaign_recipients (
  campaign_id uuid not null references public.audience_campaigns(id) on delete cascade,
  contact_id uuid not null references public.contact_profiles(id) on delete cascade,
  eligibility_status text not null check (eligibility_status in ('eligible','no_consent','suppressed','invalid','sent','failed')),
  provider_recipient_id text,
  last_event_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  primary key(campaign_id,contact_id)
);

create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  account_label text not null,
  provider_account_id text,
  environment text not null default 'staging' check (environment in ('staging','production')),
  status text not null default 'unconfigured' check (status in ('unconfigured','ready','disabled','error')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider,account_label,environment)
);

create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  social_account_id uuid references public.social_accounts(id) on delete set null,
  provider text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft','approved','published','failed','cancelled')),
  created_by uuid not null references public.staff_profiles(id),
  approved_by uuid references public.staff_profiles(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  provider_post_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.social_publication_attempts (
  id uuid primary key default gen_random_uuid(),
  social_post_id uuid not null references public.social_posts(id) on delete cascade,
  attempted_by uuid not null references public.staff_profiles(id),
  provider text not null,
  status text not null check (status in ('pending','succeeded','failed','unconfigured')),
  provider_post_id text,
  provider_response jsonb not null default '{}'::jsonb,
  attempted_at timestamptz not null default now(),
  completed_at timestamptz
);

insert into public.newsroom_capabilities(key,description) values
  ('communications.view','View permitted organizational communications'),
  ('communications.reply','Reply to permitted organizational communications'),
  ('communications.assign','Assign permitted communications'),
  ('communications.close','Close permitted communications'),
  ('communications.send','Send transactional/service communications'),
  ('communications.manage_templates','Manage communication templates'),
  ('communications.manage_contacts','Manage canonical communication contacts'),
  ('communications.manage_consent','Manage consent and suppression state'),
  ('communications.manage_channels','Manage communications provider/channel configuration metadata'),
  ('communications.queue.editorial','Access editorial communications queues'),
  ('communications.queue.commercial','Access commercial communications queues'),
  ('communications.queue.support','Access subscription/support communications queues'),
  ('communications.queue.privacy','Access privacy communications queue'),
  ('marketing.create','Create marketing/newsletter campaigns'),
  ('marketing.approve','Approve marketing/newsletter campaigns'),
  ('marketing.send','Send approved marketing/newsletter campaigns'),
  ('marketing.analytics','View marketing delivery analytics'),
  ('social.compose','Compose social distribution drafts'),
  ('social.approve','Approve social distribution drafts'),
  ('social.publish','Publish approved social distribution drafts'),
  ('social.manage_accounts','Manage social provider account metadata')
on conflict (key) do update set description=excluded.description;

with role_caps(role_name,cap) as (
 values
 ('Publisher / Owner','communications.view'),('Publisher / Owner','communications.reply'),('Publisher / Owner','communications.assign'),
 ('Publisher / Owner','communications.close'),('Publisher / Owner','communications.send'),('Publisher / Owner','communications.manage_templates'),
 ('Publisher / Owner','communications.manage_contacts'),('Publisher / Owner','communications.manage_consent'),('Publisher / Owner','communications.manage_channels'),
 ('Publisher / Owner','communications.queue.editorial'),('Publisher / Owner','communications.queue.commercial'),
 ('Publisher / Owner','communications.queue.support'),('Publisher / Owner','communications.queue.privacy'),
 ('Publisher / Owner','marketing.create'),('Publisher / Owner','marketing.approve'),('Publisher / Owner','marketing.send'),
 ('Publisher / Owner','marketing.analytics'),('Publisher / Owner','social.compose'),('Publisher / Owner','social.approve'),
 ('Publisher / Owner','social.publish'),('Publisher / Owner','social.manage_accounts'),
 ('Editor-in-Chief','communications.view'),('Editor-in-Chief','communications.reply'),('Editor-in-Chief','communications.assign'),
 ('Editor-in-Chief','communications.close'),('Editor-in-Chief','communications.send'),('Editor-in-Chief','communications.manage_templates'),
 ('Editor-in-Chief','communications.queue.editorial'),('Editor-in-Chief','communications.queue.support'),
 ('Managing Editor','communications.view'),('Managing Editor','communications.reply'),('Managing Editor','communications.assign'),
 ('Managing Editor','communications.close'),('Managing Editor','communications.queue.editorial'),
 ('Section Editor','communications.view'),('Section Editor','communications.reply'),('Section Editor','communications.assign'),
 ('Section Editor','communications.close'),('Section Editor','communications.queue.editorial'),
 ('News Editor','communications.view'),('News Editor','communications.reply'),('News Editor','communications.assign'),
 ('News Editor','communications.close'),('News Editor','communications.queue.editorial'),
 ('Reporter / Journalist','communications.view'),('Reporter / Journalist','communications.reply'),
 ('Reporter / Journalist','communications.queue.editorial'),
 ('Commercial Manager','communications.view'),('Commercial Manager','communications.reply'),('Commercial Manager','communications.assign'),
 ('Commercial Manager','communications.close'),('Commercial Manager','communications.send'),
 ('Commercial Manager','communications.manage_contacts'),('Commercial Manager','communications.manage_consent'),
 ('Commercial Manager','communications.queue.commercial'),('Commercial Manager','communications.queue.support'),
 ('Commercial Manager','marketing.create'),('Commercial Manager','marketing.analytics'),
 ('Subscriber Manager','communications.view'),('Subscriber Manager','communications.reply'),('Subscriber Manager','communications.assign'),
 ('Subscriber Manager','communications.close'),('Subscriber Manager','communications.manage_contacts'),
 ('Subscriber Manager','communications.manage_consent'),('Subscriber Manager','communications.queue.support'),
 ('Newsletter Editor','communications.view'),('Newsletter Editor','communications.reply'),('Newsletter Editor','communications.send'),
 ('Newsletter Editor','communications.manage_contacts'),('Newsletter Editor','communications.manage_consent'),
 ('Newsletter Editor','communications.queue.support'),('Newsletter Editor','marketing.create'),
 ('Newsletter Editor','marketing.approve'),('Newsletter Editor','marketing.send'),('Newsletter Editor','marketing.analytics'),
 ('Social Editor','social.compose'),('Social Editor','social.approve'),('Social Editor','social.publish'),
 ('Social Editor','social.manage_accounts'),('Social Editor','marketing.analytics')
)
insert into public.newsroom_role_capabilities(role_id,capability_key)
select r.id,rc.cap
from role_caps rc
join public.newsroom_roles r on r.name=rc.role_name
on conflict do nothing;

create or replace function public.communications_queue_allowed(p_queue_key text)
returns boolean language sql stable security definer set search_path=public,auth as $$
  select public.newsroom_session_authorized()
    and public.newsroom_has_capability('communications.view')
    and exists (
      select 1 from public.communication_channels c
      where c.key=p_queue_key and (
        (c.queue_scope='editorial' and public.newsroom_has_capability('communications.queue.editorial'))
        or (c.queue_scope='commercial' and public.newsroom_has_capability('communications.queue.commercial'))
        or (c.queue_scope='support' and public.newsroom_has_capability('communications.queue.support'))
        or (c.queue_scope='privacy' and public.newsroom_has_capability('communications.queue.privacy'))
        or c.queue_scope='general'
      )
    );
$$;

create or replace function public.communications_can_access_thread(p_thread_id uuid)
returns boolean language sql stable security definer set search_path=public,auth as $$
  select exists (
    select 1 from public.communication_threads t
    where t.id=p_thread_id and public.communications_queue_allowed(t.queue_key)
  );
$$;

create or replace function public.communications_contact_for_email(p_email text,p_source text default 'communications')
returns uuid language plpgsql security definer set search_path=public as $$
declare v_email text:=lower(trim(coalesce(p_email,''))); v_id uuid;
begin
  if v_email='' or position('@' in v_email)<2 then raise exception using errcode='22023',message='Valid email required'; end if;
  insert into public.contact_profiles(email,source)
  values(v_email,coalesce(nullif(p_source,''),'communications'))
  on conflict ((lower(email))) do update set updated_at=now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.communications_ingest_inbound(
  p_provider text,p_event_id text,p_queue_key text,p_from_email text,p_to_email text,p_subject text,
  p_body_text text,p_body_html text,p_reply_token uuid default null,p_provider_message_id text default null,
  p_payload_hash text default null,p_payload jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_existing_resource uuid; v_claim uuid; v_contact uuid; v_channel uuid; v_thread uuid; v_message uuid;
  v_created_thread boolean:=false;
begin
  if p_provider not in ('cloudflare','resend') then raise exception using errcode='22023',message='Unsupported inbound provider'; end if;
  if coalesce(trim(p_event_id),'')='' then raise exception using errcode='22023',message='Provider event id required'; end if;
  if coalesce(trim(p_queue_key),'')='' then raise exception using errcode='22023',message='Queue key required'; end if;

  insert into public.communication_idempotency_keys(scope,key)
  values('inbound:'||p_provider,p_event_id)
  on conflict do nothing returning id into v_claim;

  if v_claim is null then
    select resource_id into v_existing_resource from public.communication_idempotency_keys
    where scope='inbound:'||p_provider and key=p_event_id;
    return jsonb_build_object('duplicate',true,'message_id',v_existing_resource,
      'thread_id',(select thread_id from public.communication_messages where id=v_existing_resource));
  end if;

  select id into v_channel from public.communication_channels where key=p_queue_key;
  if v_channel is null then raise exception using errcode='22023',message='Unknown communications queue'; end if;
  v_contact:=public.communications_contact_for_email(p_from_email,'inbound:'||p_provider);

  if p_reply_token is not null then
    select id into v_thread from public.communication_threads where opaque_reply_token=p_reply_token for update;
  end if;
  if v_thread is null then
    insert into public.communication_threads(channel_id,queue_key,contact_id,subject,last_message_at)
    values(v_channel,p_queue_key,v_contact,left(coalesce(nullif(trim(p_subject),''),'(no subject)'),500),now())
    returning id into v_thread;
    v_created_thread:=true;
  end if;

  insert into public.communication_participants(thread_id,participant_type,contact_id,role)
  values(v_thread,'contact',v_contact,'external_sender') on conflict do nothing;

  insert into public.communication_messages(
    thread_id,direction,message_kind,provider,provider_message_id,idempotency_key,sender_email,recipient_emails,
    subject,body_text,body_html,status,provider_created_at
  ) values(
    v_thread,'inbound','conversation',p_provider,nullif(p_provider_message_id,''),
    'inbound:'||p_provider||':'||p_event_id,lower(trim(p_from_email)),jsonb_build_array(lower(trim(p_to_email))),
    left(p_subject,500),left(p_body_text,200000),left(p_body_html,400000),'delivered',now()
  ) returning id into v_message;

  update public.communication_threads
  set contact_id=coalesce(contact_id,v_contact),last_message_at=now(),updated_at=now(),
      status=case when status in ('closed','archived') then 'open' else status end
  where id=v_thread;

  update public.communication_idempotency_keys set resource_type='communication_message',resource_id=v_message where id=v_claim;

  insert into public.provider_webhook_events(provider,provider_event_id,event_type,signature_valid,payload_hash,payload,status,processed_at)
  values(p_provider,p_event_id,'inbound.received',true,coalesce(nullif(p_payload_hash,''),'not-provided'),coalesce(p_payload,'{}'::jsonb),'processed',now())
  on conflict(provider,provider_event_id) do nothing;

  insert into public.communication_events(provider,event_type,message_id,contact_id,provider_event_id,metadata)
  values(p_provider,'inbound.received',v_message,v_contact,p_event_id,jsonb_build_object('queue',p_queue_key,'created_thread',v_created_thread))
  on conflict(provider,provider_event_id) where provider_event_id is not null do nothing;

  return jsonb_build_object('duplicate',false,'thread_id',v_thread,'message_id',v_message,'created_thread',v_created_thread);
end;
$$;

create or replace function public.communications_prepare_reply(p_thread_id uuid,p_body_text text,p_subject text default null)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic(); v_thread public.communication_threads%rowtype;
  v_contact public.contact_profiles%rowtype; v_message uuid;
begin
  if not public.newsroom_has_capability('communications.reply') then raise exception using errcode='42501',message='communications.reply capability required'; end if;
  if not public.communications_can_access_thread(p_thread_id) then raise exception using errcode='42501',message='Communications queue access denied'; end if;
  if length(trim(coalesce(p_body_text,'')))<1 then raise exception using errcode='22023',message='Reply body required'; end if;

  select * into v_thread from public.communication_threads where id=p_thread_id for update;
  select * into v_contact from public.contact_profiles where id=v_thread.contact_id;
  if v_contact.id is null then raise exception using errcode='22023',message='Thread contact is unavailable'; end if;

  insert into public.communication_messages(thread_id,direction,message_kind,provider,sender_email,recipient_emails,subject,body_text,status,created_by_staff_id)
  values(p_thread_id,'outbound','conversation','resend',null,jsonb_build_array(lower(v_contact.email)),
    coalesce(nullif(trim(p_subject),''),v_thread.subject),left(p_body_text,200000),'queued',v_actor)
  returning id into v_message;

  update public.communication_threads set last_message_at=now(),updated_at=now() where id=p_thread_id;
  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'communications.reply.prepared','communication_messages',v_message,jsonb_build_object('thread_id',p_thread_id));

  return jsonb_build_object('message_id',v_message,'thread_id',p_thread_id,'to_email',lower(v_contact.email),
    'subject',coalesce(nullif(trim(p_subject),''),v_thread.subject),'reply_token',v_thread.opaque_reply_token);
end;
$$;

create or replace function public.communications_record_send_result(p_message_id uuid,p_provider_message_id text,p_status text,p_error text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if p_status not in ('sent','failed','suppressed') then raise exception using errcode='22023',message='Invalid provider send result'; end if;
  update public.communication_messages
  set provider='resend',provider_message_id=coalesce(nullif(p_provider_message_id,''),provider_message_id),
      status=p_status,sent_at=case when p_status='sent' then now() else sent_at end
  where id=p_message_id;
  if not found then raise exception using errcode='P0002',message='Communication message not found'; end if;
  insert into public.communication_events(provider,event_type,message_id,metadata)
  values('resend','email.'||p_status,p_message_id,jsonb_build_object('error',p_error));
end;
$$;

create or replace function public.communications_assign_thread(p_thread_id uuid,p_staff_profile_id uuid)
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare v_actor uuid:=public.newsroom_current_staff_id_basic(); v_assignment uuid;
begin
  if not public.newsroom_has_capability('communications.assign') then raise exception using errcode='42501',message='communications.assign capability required'; end if;
  if not public.communications_can_access_thread(p_thread_id) then raise exception using errcode='42501',message='Communications queue access denied'; end if;
  if not exists(select 1 from public.staff_profiles where id=p_staff_profile_id and lower(status)='active') then
    raise exception using errcode='22023',message='Active assignee required';
  end if;
  update public.communication_assignments set status='released',released_at=now() where thread_id=p_thread_id and status='active';
  insert into public.communication_assignments(thread_id,staff_profile_id,assigned_by)
  values(p_thread_id,p_staff_profile_id,v_actor) returning id into v_assignment;
  update public.communication_threads set assigned_staff_id=p_staff_profile_id,updated_at=now() where id=p_thread_id;
  perform public.newsroom_emit_notification(
    p_staff_profile_id,'communications.assigned','communication_threads',p_thread_id,
    jsonb_build_object('assignment_id',v_assignment),v_actor,'general','normal',
    'communications:assigned:'||p_thread_id::text||':'||p_staff_profile_id::text,false,null
  );
  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'communications.thread.assigned','communication_threads',p_thread_id,
    jsonb_build_object('assignee',p_staff_profile_id,'assignment_id',v_assignment));
  return v_assignment;
end;
$$;

create or replace function public.communications_close_thread(p_thread_id uuid)
returns void language plpgsql security definer set search_path=public,auth as $$
declare v_actor uuid:=public.newsroom_current_staff_id_basic();
begin
  if not public.newsroom_has_capability('communications.close') then raise exception using errcode='42501',message='communications.close capability required'; end if;
  if not public.communications_can_access_thread(p_thread_id) then raise exception using errcode='42501',message='Communications queue access denied'; end if;
  update public.communication_threads set status='closed',closed_at=now(),updated_at=now() where id=p_thread_id;
  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'communications.thread.closed','communication_threads',p_thread_id,'{}'::jsonb);
end;
$$;

create or replace function public.communications_record_consent(
  p_email text,p_purpose text,p_channel text,p_granted boolean,p_source text,p_policy_version text
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_contact uuid; v_id uuid; v_status text:=case when p_granted then 'granted' else 'withdrawn' end;
begin
  if p_purpose not in ('NEWSLETTER','BREAKING_NEWS','MARKETING','RESEARCH_UPDATES','EVENTS','PARTNER_CONTENT','SMS','WHATSAPP','PUSH') then
    raise exception using errcode='22023',message='Invalid consent purpose';
  end if;
  if p_channel not in ('email','sms','whatsapp','push') then raise exception using errcode='22023',message='Invalid consent channel'; end if;
  if coalesce(trim(p_source),'')='' or coalesce(trim(p_policy_version),'')='' then
    raise exception using errcode='22023',message='Consent source and policy version required';
  end if;

  v_contact:=public.communications_contact_for_email(p_email,'consent:'||p_source);
  insert into public.contact_consents(contact_id,purpose,channel,status,source,policy_version,granted_at,withdrawn_at,provider_sync_state)
  values(v_contact,p_purpose,p_channel,v_status,p_source,p_policy_version,
    case when p_granted then now() else null end,case when p_granted then null else now() end,
    case when p_channel='email' and p_purpose in ('NEWSLETTER','BREAKING_NEWS','MARKETING','RESEARCH_UPDATES','EVENTS','PARTNER_CONTENT')
      then 'pending' else 'not_applicable' end)
  on conflict(contact_id,purpose,channel) do update set
    status=excluded.status,source=excluded.source,policy_version=excluded.policy_version,
    granted_at=case when excluded.status='granted' then now() else public.contact_consents.granted_at end,
    withdrawn_at=case when excluded.status='withdrawn' then now() else null end,
    provider_sync_state=excluded.provider_sync_state,provider_sync_error=null,updated_at=now()
  returning id into v_id;

  if not p_granted and p_channel='email' then
    insert into public.communication_suppressions(contact_id,email,channel,scope,reason,provider,source_event_id)
    select v_contact,lower(email),'email','marketing','unsubscribe','healthtimes',v_id::text
    from public.contact_profiles where id=v_contact on conflict do nothing;
  end if;
  return jsonb_build_object('contact_id',v_contact,'consent_id',v_id,'status',v_status);
end;
$$;

create or replace function public.communications_marketing_eligible(p_contact_id uuid,p_purpose text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.contact_consents c
    where c.contact_id=p_contact_id and c.purpose=p_purpose and c.channel='email' and c.status='granted')
  and not exists(select 1 from public.communication_suppressions s
    join public.contact_profiles cp on cp.id=p_contact_id
    where s.active and lower(s.email)=lower(cp.email) and s.channel='email' and s.scope in ('marketing','all'));
$$;

create or replace function public.communications_transactional_eligible(p_contact_id uuid,p_kind text)
returns boolean language sql stable security definer set search_path=public as $$
  select p_kind in ('transactional','security','service','conversation')
    and not exists(select 1 from public.communication_suppressions s
      join public.contact_profiles cp on cp.id=p_contact_id
      where s.active and lower(s.email)=lower(cp.email) and s.channel='email' and s.scope in ('email_delivery','all'));
$$;

create or replace function public.communications_mark_consent_sync(p_contact_id uuid,p_purpose text,p_state text,p_error text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if p_state not in ('pending','synced','failed','not_applicable') then raise exception using errcode='22023',message='Invalid provider sync state'; end if;
  update public.contact_consents set provider_sync_state=p_state,provider_sync_error=left(p_error,1000),updated_at=now()
  where contact_id=p_contact_id and purpose=p_purpose and channel='email';
end;
$$;

create or replace function public.communications_ingest_provider_event(
  p_provider text,p_event_id text,p_event_type text,p_provider_message_id text,p_recipient_email text,p_payload_hash text,p_payload jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_webhook uuid; v_message uuid; v_contact uuid; v_status text; v_scope text; v_reason text;
begin
  if p_provider not in ('resend','brevo') then raise exception using errcode='22023',message='Unsupported provider event'; end if;
  insert into public.provider_webhook_events(provider,provider_event_id,event_type,signature_valid,payload_hash,payload)
  values(p_provider,p_event_id,p_event_type,true,coalesce(nullif(p_payload_hash,''),'not-provided'),coalesce(p_payload,'{}'::jsonb))
  on conflict(provider,provider_event_id) do nothing returning id into v_webhook;
  if v_webhook is null then return jsonb_build_object('duplicate',true); end if;

  select id into v_message from public.communication_messages
  where provider=p_provider and provider_message_id=p_provider_message_id limit 1;

  if p_provider='resend' then
    v_status:=case
      when p_event_type in ('email.delivered','delivered') then 'delivered'
      when p_event_type in ('email.failed','failed') then 'failed'
      when p_event_type in ('email.bounced','bounced') then 'bounced'
      when p_event_type in ('email.complained','complained') then 'complained'
      when p_event_type in ('email.suppressed','suppressed') then 'suppressed'
      else null end;
    if v_status is not null and v_message is not null then update public.communication_messages set status=v_status where id=v_message; end if;
  end if;

  if coalesce(trim(p_recipient_email),'')<>'' then v_contact:=public.communications_contact_for_email(p_recipient_email,'provider-event:'||p_provider); end if;
  if p_event_type in ('unsubscribe','unsubscribed','email.unsubscribed') then
    v_scope:='marketing'; v_reason:='unsubscribe';
  elsif p_event_type in ('email.bounced','bounced','hard_bounce') then
    v_scope:='email_delivery'; v_reason:='bounce';
  elsif p_event_type in ('email.complained','complained','spam') then
    v_scope:='email_delivery'; v_reason:='complaint';
  end if;

  if v_scope is not null and v_contact is not null then
    insert into public.communication_suppressions(contact_id,email,channel,scope,reason,provider,source_event_id,metadata)
    select v_contact,lower(email),'email',v_scope,v_reason,p_provider,p_event_id,jsonb_build_object('event_type',p_event_type)
    from public.contact_profiles where id=v_contact on conflict do nothing;
    if v_reason='unsubscribe' then
      update public.contact_consents set status='withdrawn',withdrawn_at=now(),provider_sync_state='synced',updated_at=now()
      where contact_id=v_contact and channel='email'
        and purpose in ('NEWSLETTER','BREAKING_NEWS','MARKETING','RESEARCH_UPDATES','EVENTS','PARTNER_CONTENT');
    end if;
  end if;

  insert into public.communication_events(provider,event_type,message_id,contact_id,provider_event_id,metadata)
  values(p_provider,p_event_type,v_message,v_contact,p_event_id,jsonb_build_object('provider_message_id',p_provider_message_id))
  on conflict(provider,provider_event_id) where provider_event_id is not null do nothing;
  update public.provider_webhook_events set status='processed',processed_at=now() where id=v_webhook;
  return jsonb_build_object('duplicate',false,'message_id',v_message,'contact_id',v_contact);
end;
$$;

create or replace function public.communications_create_social_draft(p_story_id uuid,p_provider text,p_body text,p_social_account_id uuid default null)
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare v_actor uuid:=public.newsroom_current_staff_id_basic(); v_id uuid;
begin
  if not public.newsroom_has_capability('social.compose') then raise exception using errcode='42501',message='social.compose capability required'; end if;
  if not exists(select 1 from public.stories where id=p_story_id) then raise exception using errcode='P0002',message='Story not found'; end if;
  if length(trim(coalesce(p_body,'')))<1 then raise exception using errcode='22023',message='Social body required'; end if;
  insert into public.social_posts(story_id,social_account_id,provider,body,created_by)
  values(p_story_id,p_social_account_id,p_provider,left(p_body,10000),v_actor) returning id into v_id;
  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'social.draft.created','social_posts',v_id,jsonb_build_object('provider',p_provider,'story_id',p_story_id));
  return v_id;
end;
$$;

create or replace function public.communications_approve_social_post(p_social_post_id uuid)
returns void language plpgsql security definer set search_path=public,auth as $$
declare v_actor uuid:=public.newsroom_current_staff_id_basic();
begin
  if not public.newsroom_has_capability('social.approve') then raise exception using errcode='42501',message='social.approve capability required'; end if;
  update public.social_posts set status='approved',approved_by=v_actor,approved_at=now(),updated_at=now()
  where id=p_social_post_id and status='draft';
  if not found then raise exception using errcode='22023',message='Only draft social posts may be approved'; end if;
  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'social.post.approved','social_posts',p_social_post_id,'{}'::jsonb);
end;
$$;

create or replace function public.communications_prepare_social_publish(p_social_post_id uuid)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic(); v_post public.social_posts%rowtype;
  v_account public.social_accounts%rowtype; v_attempt uuid;
begin
  if not public.newsroom_has_capability('social.publish') then raise exception using errcode='42501',message='social.publish capability required'; end if;
  select * into v_post from public.social_posts where id=p_social_post_id for update;
  if v_post.id is null then raise exception using errcode='P0002',message='Social post not found'; end if;
  if v_post.status<>'approved' or v_post.approved_by is null or v_post.approved_at is null then
    raise exception using errcode='42501',message='Human approval required before social publication';
  end if;
  if v_post.social_account_id is not null then select * into v_account from public.social_accounts where id=v_post.social_account_id; end if;

  insert into public.social_publication_attempts(social_post_id,attempted_by,provider,status,provider_response)
  values(p_social_post_id,v_actor,v_post.provider,
    case when v_account.id is not null and v_account.status='ready' then 'pending' else 'unconfigured' end,
    case when v_account.id is not null and v_account.status='ready' then '{}'::jsonb else jsonb_build_object('reason','provider_not_configured') end)
  returning id into v_attempt;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'social.publish.attempted','social_posts',p_social_post_id,jsonb_build_object('attempt_id',v_attempt,'provider',v_post.provider));

  return jsonb_build_object('attempt_id',v_attempt,'provider',v_post.provider,'body',v_post.body,
    'provider_ready',coalesce(v_account.status='ready',false));
end;
$$;

create or replace function public.communications_record_social_result(
  p_attempt_id uuid,p_succeeded boolean,p_provider_post_id text default null,p_provider_response jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path=public as $$
declare v_post uuid;
begin
  update public.social_publication_attempts
  set status=case when p_succeeded then 'succeeded' else 'failed' end,
      provider_post_id=nullif(p_provider_post_id,''),provider_response=coalesce(p_provider_response,'{}'::jsonb),completed_at=now()
  where id=p_attempt_id returning social_post_id into v_post;
  if v_post is null then raise exception using errcode='P0002',message='Social attempt not found'; end if;
  if p_succeeded then
    update public.social_posts set status='published',published_at=now(),provider_post_id=nullif(p_provider_post_id,''),updated_at=now() where id=v_post;
  else
    update public.social_posts set status='failed',updated_at=now() where id=v_post;
  end if;
end;
$$;

alter table public.communication_channels enable row level security;
alter table public.communication_accounts enable row level security;
alter table public.contact_profiles enable row level security;
alter table public.contact_consents enable row level security;
alter table public.communication_suppressions enable row level security;
alter table public.communication_threads enable row level security;
alter table public.communication_participants enable row level security;
alter table public.communication_messages enable row level security;
alter table public.communication_assignments enable row level security;
alter table public.communication_templates enable row level security;
alter table public.provider_webhook_events enable row level security;
alter table public.communication_events enable row level security;
alter table public.communication_idempotency_keys enable row level security;
alter table public.contact_segments enable row level security;
alter table public.contact_segment_members enable row level security;
alter table public.audience_campaigns enable row level security;
alter table public.campaign_recipients enable row level security;
alter table public.social_accounts enable row level security;
alter table public.social_posts enable row level security;
alter table public.social_publication_attempts enable row level security;

revoke all on table public.communication_channels,public.communication_accounts,public.contact_profiles,public.contact_consents,
  public.communication_suppressions,public.communication_threads,public.communication_participants,public.communication_messages,
  public.communication_assignments,public.communication_templates,public.provider_webhook_events,public.communication_events,
  public.communication_idempotency_keys,public.contact_segments,public.contact_segment_members,public.audience_campaigns,
  public.campaign_recipients,public.social_accounts,public.social_posts,public.social_publication_attempts
from public,anon,authenticated;

grant select on public.communication_channels to authenticated;
grant select on public.communication_threads,public.communication_participants,public.communication_messages,public.communication_assignments to authenticated;
grant select on public.communication_templates to authenticated;
grant select on public.contact_profiles,public.contact_consents,public.communication_suppressions,public.contact_segments,public.contact_segment_members to authenticated;
grant select on public.audience_campaigns,public.campaign_recipients to authenticated;
grant select on public.communication_events to authenticated;
grant select on public.social_accounts,public.social_posts,public.social_publication_attempts to authenticated;

create policy com01_channels_read on public.communication_channels for select to authenticated using (public.newsroom_session_authorized());
create policy com01_threads_read on public.communication_threads for select to authenticated using (public.communications_queue_allowed(queue_key));
create policy com01_participants_read on public.communication_participants for select to authenticated using (public.communications_can_access_thread(thread_id));
create policy com01_messages_read on public.communication_messages for select to authenticated using (public.communications_can_access_thread(thread_id));
create policy com01_assignments_read on public.communication_assignments for select to authenticated using (public.communications_can_access_thread(thread_id));
create policy com01_templates_read on public.communication_templates for select to authenticated
using (public.newsroom_has_capability('communications.manage_templates') or public.newsroom_has_capability('communications.reply'));
create policy com01_contacts_read on public.contact_profiles for select to authenticated
using (public.newsroom_has_capability('communications.manage_contacts') or public.newsroom_has_capability('communications.manage_consent'));
create policy com01_consents_read on public.contact_consents for select to authenticated using (public.newsroom_has_capability('communications.manage_consent'));
create policy com01_suppressions_read on public.communication_suppressions for select to authenticated using (public.newsroom_has_capability('communications.manage_consent'));
create policy com01_segments_read on public.contact_segments for select to authenticated
using (public.newsroom_has_capability('marketing.create') or public.newsroom_has_capability('marketing.analytics'));
create policy com01_segment_members_read on public.contact_segment_members for select to authenticated
using (public.newsroom_has_capability('marketing.create') or public.newsroom_has_capability('marketing.analytics'));
create policy com01_campaigns_read on public.audience_campaigns for select to authenticated
using (public.newsroom_has_capability('marketing.create') or public.newsroom_has_capability('marketing.approve') or public.newsroom_has_capability('marketing.analytics'));
create policy com01_campaign_recipients_read on public.campaign_recipients for select to authenticated using (public.newsroom_has_capability('marketing.analytics'));
create policy com01_events_read on public.communication_events for select to authenticated
using (public.newsroom_has_capability('marketing.analytics') or public.newsroom_has_capability('communications.manage_channels') or public.newsroom_has_capability('security.view_audit'));
create policy com01_social_accounts_read on public.social_accounts for select to authenticated
using (public.newsroom_has_capability('social.manage_accounts') or public.newsroom_has_capability('social.compose') or public.newsroom_has_capability('social.publish'));
create policy com01_social_posts_read on public.social_posts for select to authenticated
using (public.newsroom_has_capability('social.compose') or public.newsroom_has_capability('social.approve') or public.newsroom_has_capability('social.publish'));
create policy com01_social_attempts_read on public.social_publication_attempts for select to authenticated
using (public.newsroom_has_capability('social.publish') or public.newsroom_has_capability('marketing.analytics'));

revoke execute on function public.communications_queue_allowed(text) from public,anon;
revoke execute on function public.communications_can_access_thread(uuid) from public,anon;
grant execute on function public.communications_queue_allowed(text) to authenticated;
grant execute on function public.communications_can_access_thread(uuid) to authenticated;

revoke execute on function public.communications_contact_for_email(text,text) from public,anon,authenticated;
revoke execute on function public.communications_ingest_inbound(text,text,text,text,text,text,text,text,uuid,text,text,jsonb) from public,anon,authenticated;
revoke execute on function public.communications_record_send_result(uuid,text,text,text) from public,anon,authenticated;
revoke execute on function public.communications_record_consent(text,text,text,boolean,text,text) from public,anon,authenticated;
revoke execute on function public.communications_marketing_eligible(uuid,text) from public,anon,authenticated;
revoke execute on function public.communications_transactional_eligible(uuid,text) from public,anon,authenticated;
revoke execute on function public.communications_mark_consent_sync(uuid,text,text,text) from public,anon,authenticated;
revoke execute on function public.communications_ingest_provider_event(text,text,text,text,text,text,jsonb) from public,anon,authenticated;
revoke execute on function public.communications_record_social_result(uuid,boolean,text,jsonb) from public,anon,authenticated;

grant execute on function public.communications_contact_for_email(text,text) to service_role;
grant execute on function public.communications_ingest_inbound(text,text,text,text,text,text,text,text,uuid,text,text,jsonb) to service_role;
grant execute on function public.communications_record_send_result(uuid,text,text,text) to service_role;
grant execute on function public.communications_record_consent(text,text,text,boolean,text,text) to service_role;
grant execute on function public.communications_marketing_eligible(uuid,text) to service_role;
grant execute on function public.communications_transactional_eligible(uuid,text) to service_role;
grant execute on function public.communications_mark_consent_sync(uuid,text,text,text) to service_role;
grant execute on function public.communications_ingest_provider_event(text,text,text,text,text,text,jsonb) to service_role;
grant execute on function public.communications_record_social_result(uuid,boolean,text,jsonb) to service_role;

revoke execute on function public.communications_prepare_reply(uuid,text,text) from public,anon;
revoke execute on function public.communications_assign_thread(uuid,uuid) from public,anon;
revoke execute on function public.communications_close_thread(uuid) from public,anon;
revoke execute on function public.communications_create_social_draft(uuid,text,text,uuid) from public,anon;
revoke execute on function public.communications_approve_social_post(uuid) from public,anon;
revoke execute on function public.communications_prepare_social_publish(uuid) from public,anon;

grant execute on function public.communications_prepare_reply(uuid,text,text) to authenticated;
grant execute on function public.communications_assign_thread(uuid,uuid) to authenticated;
grant execute on function public.communications_close_thread(uuid) to authenticated;
grant execute on function public.communications_create_social_draft(uuid,text,text,uuid) to authenticated;
grant execute on function public.communications_approve_social_post(uuid) to authenticated;
grant execute on function public.communications_prepare_social_publish(uuid) to authenticated;

commit;
