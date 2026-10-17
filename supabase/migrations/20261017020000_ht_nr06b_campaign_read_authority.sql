-- HT-NR-06B: Reconcile canonical campaign and segment read authority for Newsletter Desk.
-- Permits marketing.create, marketing.approve, marketing.send, and marketing.analytics
-- to read public.audience_campaigns and public.contact_segments under RLS.
-- Preserves zero direct authenticated write privileges (writes remain RPC-owned).

begin;

drop policy if exists com01_campaigns_read on public.audience_campaigns;
create policy com01_campaigns_read
on public.audience_campaigns
for select
to authenticated
using (
  public.newsroom_has_capability('marketing.create')
  or public.newsroom_has_capability('marketing.approve')
  or public.newsroom_has_capability('marketing.send')
  or public.newsroom_has_capability('marketing.analytics')
);

drop policy if exists com01_segments_read on public.contact_segments;
create policy com01_segments_read
on public.contact_segments
for select
to authenticated
using (
  public.newsroom_has_capability('marketing.create')
  or public.newsroom_has_capability('marketing.approve')
  or public.newsroom_has_capability('marketing.send')
  or public.newsroom_has_capability('marketing.analytics')
);

revoke insert, update, delete, truncate
on table
  public.audience_campaigns,
  public.contact_segments,
  public.contact_consents,
  public.campaign_recipients
from public, anon, authenticated;

commit;
