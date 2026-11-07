-- COM-01 campaign authority and notification-escalation effects.
-- Reconstructed in AG-04 Phase 5 from authoritative HealthTimes Staging schema/function
-- definitions for historical live migration 20260922100851.
-- This file is for deterministic clean-environment replay; it is NOT replayed on staging.

begin;

alter table public.audience_campaigns
  add column if not exists subject text,
  add column if not exists html_content text,
  add column if not exists text_content text;

insert into public.communication_channels(
  key,display_name,queue_scope,channel_type,status
) values(
  'staff-notifications','Staff notification escalation','general','internal','unconfigured'
)
on conflict(key) do update set
  display_name=excluded.display_name,
  queue_scope=excluded.queue_scope,
  channel_type=excluded.channel_type;

create table if not exists public.communication_notification_escalations (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null unique references public.newsroom_notifications(id) on delete restrict,
  message_id uuid not null unique references public.communication_messages(id) on delete restrict,
  escalated_by uuid not null references public.staff_profiles(id) on delete restrict,
  status text not null default 'prepared'
    check (status in ('prepared','sent','delivered','failed','suppressed')),
  provider text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_communication_notification_escalations_status
  on public.communication_notification_escalations(status,created_at);

alter table public.communication_notification_escalations enable row level security;
revoke all on public.communication_notification_escalations from public,anon,authenticated;
grant select on public.communication_notification_escalations to authenticated;
grant all on public.communication_notification_escalations to service_role;

drop policy if exists com01_notification_escalations_read
  on public.communication_notification_escalations;
create policy com01_notification_escalations_read
on public.communication_notification_escalations
for select to authenticated
using (
  public.newsroom_session_authorized()
  and (
    escalated_by=public.newsroom_current_staff_id_basic()
    or public.newsroom_has_capability('communications.manage_channels')
  )
);

create or replace function public.communications_create_campaign(
  p_name text,
  p_purpose text,
  p_subject text,
  p_html_content text,
  p_text_content text,
  p_segment_id uuid
)
returns uuid
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_id uuid;
begin
  if not public.newsroom_has_capability('marketing.create') then
    raise exception using errcode='42501',message='marketing.create capability required';
  end if;
  if p_purpose not in ('NEWSLETTER','BREAKING_NEWS','MARKETING','RESEARCH_UPDATES','EVENTS','PARTNER_CONTENT') then
    raise exception using errcode='22023',message='Invalid campaign purpose';
  end if;
  if length(trim(coalesce(p_name,'')))<1 or length(trim(coalesce(p_subject,'')))<1 then
    raise exception using errcode='22023',message='Campaign name and subject are required';
  end if;
  if length(coalesce(p_html_content,''))<11 and length(trim(coalesce(p_text_content,'')))<1 then
    raise exception using errcode='22023',message='Campaign content is required';
  end if;
  if p_segment_id is null or not exists(select 1 from public.contact_segments where id=p_segment_id) then
    raise exception using errcode='22023',message='Canonical contact segment is required';
  end if;

  insert into public.audience_campaigns(
    name,purpose,segment_id,subject,html_content,text_content,created_by,status
  ) values(
    left(trim(p_name),200),p_purpose,p_segment_id,left(trim(p_subject),300),
    nullif(p_html_content,''),nullif(p_text_content,''),v_actor,'draft'
  )
  returning id into v_id;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'marketing.campaign.created','audience_campaigns',v_id,
    jsonb_build_object('purpose',p_purpose,'segment_id',p_segment_id));

  return v_id;
end;
$$;

create or replace function public.communications_approve_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
begin
  if not public.newsroom_has_capability('marketing.approve') then
    raise exception using errcode='42501',message='marketing.approve capability required';
  end if;

  update public.audience_campaigns
  set status='approved',approved_by=v_actor,approved_at=now(),updated_at=now()
  where id=p_campaign_id and status='draft';

  if not found then
    raise exception using errcode='22023',message='Only draft campaigns may be approved';
  end if;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'marketing.campaign.approved','audience_campaigns',p_campaign_id,'{}'::jsonb);
end;
$$;

create or replace function public.communications_prepare_campaign_send(p_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_campaign public.audience_campaigns%rowtype;
  v_list_id text;
  v_eligible integer:=0;
  v_no_consent integer:=0;
  v_suppressed integer:=0;
begin
  if not public.newsroom_has_capability('marketing.send') then
    raise exception using errcode='42501',message='marketing.send capability required';
  end if;

  select * into v_campaign
  from public.audience_campaigns
  where id=p_campaign_id
  for update;

  if v_campaign.id is null then
    raise exception using errcode='P0002',message='Campaign not found';
  end if;
  if v_campaign.status<>'approved' or v_campaign.approved_by is null or v_campaign.approved_at is null then
    raise exception using errcode='42501',message='Human campaign approval required before marketing send';
  end if;
  if v_campaign.segment_id is null then
    raise exception using errcode='22023',message='Campaign segment is missing';
  end if;

  select provider_segment_id into v_list_id
  from public.contact_segments
  where id=v_campaign.segment_id
    and provider='brevo'
    and sync_state='synced';

  delete from public.campaign_recipients where campaign_id=p_campaign_id;

  insert into public.campaign_recipients(campaign_id,contact_id,eligibility_status,metadata)
  select
    p_campaign_id,
    sm.contact_id,
    case
      when public.communications_marketing_eligible(sm.contact_id,v_campaign.purpose) then 'eligible'
      when exists(
        select 1
        from public.communication_suppressions s
        join public.contact_profiles cp on cp.id=sm.contact_id
        where s.active and lower(s.email)=lower(cp.email)
          and s.channel='email' and s.scope in ('marketing','all')
      ) then 'suppressed'
      else 'no_consent'
    end,
    jsonb_build_object('evaluated_at',now())
  from public.contact_segment_members sm
  where sm.segment_id=v_campaign.segment_id;

  select
    count(*) filter(where eligibility_status='eligible'),
    count(*) filter(where eligibility_status='no_consent'),
    count(*) filter(where eligibility_status='suppressed')
  into v_eligible,v_no_consent,v_suppressed
  from public.campaign_recipients
  where campaign_id=p_campaign_id;

  if v_eligible=0 then
    raise exception using errcode='42501',message='Marketing send denied: no consented, unsuppressed recipients';
  end if;
  if v_list_id is null or trim(v_list_id)='' then
    raise exception using errcode='55000',message='Brevo segment synchronization is not ready';
  end if;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'marketing.campaign.send.prepared','audience_campaigns',p_campaign_id,
    jsonb_build_object('eligible',v_eligible,'no_consent',v_no_consent,'suppressed',v_suppressed,
      'segment_id',v_campaign.segment_id));

  return jsonb_build_object(
    'campaign_id',v_campaign.id,
    'name',v_campaign.name,
    'purpose',v_campaign.purpose,
    'subject',v_campaign.subject,
    'html_content',v_campaign.html_content,
    'text_content',v_campaign.text_content,
    'brevo_list_id',v_list_id,
    'eligible_count',v_eligible,
    'no_consent_count',v_no_consent,
    'suppressed_count',v_suppressed
  );
end;
$$;

create or replace function public.communications_record_campaign_result(
  p_campaign_id uuid,
  p_provider_campaign_id text,
  p_status text,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_status not in ('sending','sent','failed') then
    raise exception using errcode='22023',message='Invalid campaign provider result';
  end if;

  update public.audience_campaigns
  set provider='brevo',
      provider_campaign_id=coalesce(nullif(p_provider_campaign_id,''),provider_campaign_id),
      status=p_status,
      sent_at=case when p_status='sent' then now() else sent_at end,
      metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
        'provider_error',p_error,
        'provider_result_at',now()
      ),
      updated_at=now()
  where id=p_campaign_id;

  if not found then raise exception using errcode='P0002',message='Campaign not found'; end if;
end;
$$;

create or replace function public.communications_prepare_notification_escalation(
  p_notification_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_notification public.newsroom_notifications%rowtype;
  v_target public.staff_profiles%rowtype;
  v_contact uuid;
  v_channel uuid;
  v_thread uuid;
  v_message uuid;
  v_escalation uuid;
  v_subject text;
  v_body text;
begin
  if not public.newsroom_has_capability('communications.send') then
    raise exception using errcode='42501',message='communications.send capability required';
  end if;

  select * into v_notification
  from public.newsroom_notifications
  where id=p_notification_id;

  if v_notification.id is null then
    raise exception using errcode='P0002',message='Newsroom notification not found';
  end if;

  select * into v_target
  from public.staff_profiles
  where id=v_notification.staff_profile_id
    and lower(status)='active';

  if v_target.id is null or coalesce(trim(v_target.email),'')='' then
    raise exception using errcode='22023',message='Notification recipient has no active staff email identity';
  end if;

  if exists(
    select 1 from public.communication_notification_escalations
    where notification_id=p_notification_id
  ) then
    raise exception using errcode='23505',message='Notification has already been escalated to email';
  end if;

  v_contact:=public.communications_contact_for_email(v_target.email,'staff-notification');
  if not public.communications_transactional_eligible(v_contact,'security') then
    raise exception using errcode='42501',message='Staff email delivery is suppressed for delivery-safety reasons';
  end if;

  select id into v_channel from public.communication_channels where key='staff-notifications';
  v_subject:='HealthTimes Newsroom notification: '||left(coalesce(v_notification.event_type,'Update'),180);
  v_body:='A HealthTimes Newsroom notification requires your attention. Sign in to Newsroom to review the authoritative notification and context.';

  insert into public.communication_threads(
    channel_id,queue_key,contact_id,subject,status,priority,created_by_staff_id
  ) values(
    v_channel,'staff-notifications',v_contact,v_subject,'closed',
    case when v_notification.priority in ('high','urgent') then v_notification.priority else 'normal' end,
    v_actor
  ) returning id into v_thread;

  insert into public.communication_messages(
    thread_id,direction,message_kind,provider,recipient_emails,subject,body_text,status,created_by_staff_id
  ) values(
    v_thread,'outbound','transactional','resend',jsonb_build_array(lower(v_target.email)),
    v_subject,v_body,'queued',v_actor
  ) returning id into v_message;

  insert into public.communication_notification_escalations(
    notification_id,message_id,escalated_by,status
  ) values(
    p_notification_id,v_message,v_actor,'prepared'
  ) returning id into v_escalation;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'communications.notification.email_escalation.prepared',
    'newsroom_notifications',p_notification_id,
    jsonb_build_object('escalation_id',v_escalation,'message_id',v_message,'recipient_staff_id',v_target.id));

  return jsonb_build_object(
    'escalation_id',v_escalation,
    'notification_id',p_notification_id,
    'message_id',v_message,
    'thread_id',v_thread,
    'to_email',lower(v_target.email),
    'subject',v_subject,
    'body_text',v_body
  );
end;
$$;

create or replace function public.communications_record_notification_escalation_result(
  p_escalation_id uuid,
  p_provider_message_id text,
  p_status text,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_message uuid;
begin
  if p_status not in ('sent','delivered','failed','suppressed') then
    raise exception using errcode='22023',message='Invalid escalation result';
  end if;

  update public.communication_notification_escalations
  set status=p_status,
      provider='resend',
      provider_message_id=coalesce(nullif(p_provider_message_id,''),provider_message_id),
      updated_at=now()
  where id=p_escalation_id
  returning message_id into v_message;

  if v_message is null then raise exception using errcode='P0002',message='Escalation not found'; end if;

  update public.communication_messages
  set provider='resend',
      provider_message_id=coalesce(nullif(p_provider_message_id,''),provider_message_id),
      status=p_status,
      sent_at=case when p_status='sent' then now() else sent_at end
  where id=v_message;

  insert into public.communication_events(provider,event_type,message_id,metadata)
  values('resend','notification_escalation.'||p_status,v_message,
    jsonb_build_object('escalation_id',p_escalation_id,'error',p_error));
end;
$$;

revoke execute on function public.communications_create_campaign(text,text,text,text,text,uuid)
  from public,anon;
revoke execute on function public.communications_approve_campaign(uuid)
  from public,anon;
revoke execute on function public.communications_prepare_campaign_send(uuid)
  from public,anon;
revoke execute on function public.communications_prepare_notification_escalation(uuid)
  from public,anon;

grant execute on function public.communications_create_campaign(text,text,text,text,text,uuid)
  to authenticated,service_role;
grant execute on function public.communications_approve_campaign(uuid)
  to authenticated,service_role;
grant execute on function public.communications_prepare_campaign_send(uuid)
  to authenticated,service_role;
grant execute on function public.communications_prepare_notification_escalation(uuid)
  to authenticated,service_role;

revoke execute on function public.communications_record_campaign_result(uuid,text,text,text)
  from public,anon,authenticated;
revoke execute on function public.communications_record_notification_escalation_result(uuid,text,text,text)
  from public,anon,authenticated;
grant execute on function public.communications_record_campaign_result(uuid,text,text,text)
  to service_role;
grant execute on function public.communications_record_notification_escalation_result(uuid,text,text,text)
  to service_role;

commit;
