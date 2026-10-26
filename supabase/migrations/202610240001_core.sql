-- Inside Access v0.5. Run as database owner. No applicant data is collected.
create schema if not exists private;
revoke all on schema private from public;
create table private.admins(user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.admins where user_id=(select auth.uid()))
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table public.sources(
 source_id text primary key, source_name text not null check(length(trim(source_name))>0), city_scope text,
 categories text, source_url text not null check(source_url ~ '^https://[^[:space:]]+$'), source_type text, source_state text,
 automation_method text, suggested_frequency text, priority integer check(priority between 1 and 5),
 extraction_targets text, promotion_rule text, restrictions text, last_verified date,
 enabled boolean not null default false, connector_key text check(connector_key is null or connector_key='paris-open-data'),
 legal_reviewed_at timestamptz, legal_review_note text, last_checked_at timestamptz, last_error text, etag text, last_modified text,
 raw_record jsonb not null default '{}'::jsonb, revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(not enabled or (connector_key is not null and legal_reviewed_at is not null and length(trim(legal_review_note))>0))
);
create function private.valid_urls(urls jsonb) returns boolean language sql immutable set search_path='' as $$
 select jsonb_typeof(urls)='array' and not exists(select 1 from jsonb_array_elements(urls) u where jsonb_typeof(u)<>'string' or not (u#>>'{}') ~ '^https://[^[:space:]]+$')
$$;
create table public.opportunities(
 opportunity_id text primary key,
 origin_group text not null check(origin_group in ('selected','pending','unsuitable','discovered')),
 source_id text references public.sources(source_id), source_record_id text, fingerprint text not null unique,
 title text not null check(length(trim(title)) between 1 and 500), city text, category text, record_type text,
 event_start_date date, event_end_date date, date_precision text check(date_precision in ('day','range','month only','recurring series','selected dates','unknown')),
 event_month text check(event_month ~ '^\d{4}-(0[1-9]|1[0-2])$'), event_time_local text,
 timezone text check(timezone in ('Europe/Amsterdam','Europe/London','Europe/Paris','UTC')), date_notes text, event_date_claim text,
 venue text, actual_location text, geography_precision text, description text, why_special text,
 access_method text, participation_type text check(participation_type in ('audience','casting','stand_in','seat_filler','fan_pen','other')),
 access_instructions text, eligibility text, minimum_age integer check(minimum_age between 0 and 120),
 cost_direction text check(cost_direction in ('Pay to attend','Free','Paid participation','Unknown')), currency text check(currency ~ '^[A-Z]{3}$'),
 price_amount numeric(12,2) check(price_amount>=0), price_max numeric(12,2) check(price_max>=0), price_notes text,
 compensation_amount numeric(12,2) check(compensation_amount>=0), compensation_notes text,
 application_deadline date, deadline_status text, deadline_notes text, availability_status text, inventory_status text,
 organizer text, booking_url text check(booking_url ~ '^https://[^[:space:]]+$'), source_url text check(source_url ~ '^https://[^[:space:]]+$'),
 additional_source_urls jsonb not null default '[]'::jsonb check(private.valid_urls(additional_source_urls)), source_type text, evidence_note text,
 verification_status text not null default 'pending' check(verification_status in ('verified','pending','unverified')),
 verification_confidence text check(verification_confidence in ('High','Medium','Low','Unknown')),
 last_verified date, verification_limits text, restrictions text, risk_flag text,
 parent_event_id text, seed_id text, next_check date, feed_eligible boolean not null default false,
 lifecycle_status text not null default 'active' check(lifecycle_status in ('active','expired','sold_out','rejected','closed','cancelled')),
 approval_status text not null default 'pending' check(approval_status in ('pending','approved','rejected')),
 approved_at timestamptz, approved_by uuid references auth.users(id), published boolean not null default false, published_at timestamptz,
 review_note text, reason text, required_action text, classification text,
 raw_record jsonb not null default '{}'::jsonb,
 revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(source_id,source_record_id),
 check(event_end_date is null or (event_start_date is not null and event_end_date>=event_start_date)),
 check(date_precision is distinct from 'month only' or (event_month is not null and event_start_date is null and event_end_date is null)),
 check(date_precision is distinct from 'day' or (event_start_date is not null and (event_end_date is null or event_end_date=event_start_date))),
 check(price_max is null or price_amount is null or price_max>=price_amount),
 check((price_amount is null and compensation_amount is null) or currency is not null),
 check(cost_direction is distinct from 'Free' or (coalesce(price_amount,0)=0 and coalesce(price_max,0)=0)),
 check(not published or (approval_status='approved' and verification_status='verified' and lifecycle_status='active' and feed_eligible and approved_by is not null and approved_at is not null and published_at is not null))
);
create index opportunities_city_category on public.opportunities(city,category);
create index opportunities_attention on public.opportunities(approval_status,verification_status,next_check);
create index opportunities_event on public.opportunities(event_end_date,event_start_date);
create index opportunities_search on public.opportunities using gin(to_tsvector('simple',coalesce(title,'')||' '||coalesce(description,'')||' '||coalesce(organizer,'')));
create index opportunities_public on public.opportunities(city,event_start_date) where published;
create table public.verification_checks(
 check_id text primary key, opportunity_id text not null references public.opportunities(opportunity_id), verified_date date, checked_at timestamptz, recorded_at timestamptz not null default now(),
 checked_by uuid references auth.users(id), source_url text, status text not null, confidence text, evidence_note text, limits text, raw_record jsonb
);
create table public.audit_history(
 audit_id bigint generated always as identity primary key, entity_type text not null, entity_id text not null, action text not null,
 actor_id uuid, actor_kind text not null, changed_at timestamptz not null default now(), before_record jsonb, after_record jsonb, note text
);
create table public.discovery_runs(
 run_id text primary key, source_id text not null references public.sources(source_id), started_at timestamptz not null default now(),
 completed_at timestamptz, status text not null check(status in ('running','ok','unchanged','failed')), fetched_count integer not null default 0,
 new_count integer not null default 0, changed_count integer not null default 0, error text
);
create table public.source_snapshots(
 source_id text not null references public.sources(source_id), external_id text not null, content_hash text not null,
 payload jsonb not null, last_seen_at timestamptz not null default now(), primary key(source_id,external_id)
);
create table private.import_batches(batch_id text primary key, imported_at timestamptz not null default now(), metadata jsonb not null, seed_audit jsonb not null);

-- All base tables are private, including rows that have been approved.
-- Public access uses the narrowly projected, independently gated RPC below.
alter table public.sources enable row level security;
alter table public.opportunities enable row level security;
alter table public.verification_checks enable row level security;
alter table public.audit_history enable row level security;
alter table public.discovery_runs enable row level security;
alter table public.source_snapshots enable row level security;
revoke all on public.sources,public.opportunities,public.verification_checks,public.audit_history,public.discovery_runs,public.source_snapshots from anon,authenticated;
grant select on public.sources,public.opportunities,public.verification_checks,public.audit_history,public.discovery_runs,public.source_snapshots to authenticated;
create policy admin_read on public.sources for select to authenticated using((select public.is_admin()));
create policy admin_read on public.opportunities for select to authenticated using((select public.is_admin()));
create policy admin_read on public.verification_checks for select to authenticated using((select public.is_admin()));
create policy admin_read on public.audit_history for select to authenticated using((select public.is_admin()));
create policy admin_read on public.discovery_runs for select to authenticated using((select public.is_admin()));
create policy admin_read on public.source_snapshots for select to authenticated using((select public.is_admin()));

create function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_history(entity_type,entity_id,action,actor_id,actor_kind,before_record,after_record,note)
 values(tg_table_name,coalesce(to_jsonb(new)->>'opportunity_id',to_jsonb(new)->>'source_id'),tg_op,auth.uid(),
 coalesce(nullif(current_setting('inside_access.actor_kind',true),''),case when auth.uid() is null then 'system' else 'admin' end),case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new),nullif(current_setting('inside_access.audit_note',true),''));
 return new;
end $$;
create trigger audit_opportunities after insert or update on public.opportunities for each row execute function private.audit_change();
create trigger audit_sources after insert or update on public.sources for each row execute function private.audit_change();

create function private.opportunity_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
  if new.published or new.approval_status='approved' then raise exception 'New records must enter unpublished and unapproved'; end if;
 else
  new.updated_at:=now(); new.revision:=old.revision+1;
  if current_setting('inside_access.review_action',true) is distinct from 'allowed' then
   if (new.published,new.approval_status,new.approved_by,new.approved_at,new.published_at) is distinct from (old.published,old.approval_status,old.approved_by,old.approved_at,old.published_at) then
    raise exception 'Use the authorized review action';
   end if;
   -- Any edit invalidates previous publication approval.
   new.published:=false; new.published_at:=null; new.approval_status:='pending';new.approved_at:=null;new.approved_by:=null;
   if new.lifecycle_status='rejected' then new.approval_status:='rejected'; end if;
  end if;
 end if;
 return new;
end $$;
create trigger guard_opportunities before insert or update on public.opportunities for each row execute function private.opportunity_guard();
create function private.touch_source() returns trigger language plpgsql set search_path='' as $$ begin new.revision:=old.revision+1;new.updated_at:=now();return new;end $$;
create trigger touch_sources before update on public.sources for each row execute function private.touch_source();

create function public.opportunity_is_current(o public.opportunities) returns boolean language sql stable set search_path='' as $$
 select coalesce(
  coalesce(o.event_end_date,o.event_start_date,(to_date(o.event_month||'-01','YYYY-MM-DD')+interval '1 month - 1 day')::date) >= (now() at time zone coalesce(o.timezone,'Europe/Amsterdam'))::date
  and (o.application_deadline is null or o.application_deadline >= (now() at time zone coalesce(o.timezone,'Europe/Amsterdam'))::date),false)
$$;
create function public.opportunity_ready(o public.opportunities) returns boolean language sql stable set search_path='' as $$
 select coalesce(o.verification_status='verified' and o.lifecycle_status='active' and o.feed_eligible
  and public.opportunity_is_current(o) and o.last_verified is not null
  and o.last_verified >= (now() at time zone coalesce(o.timezone,'Europe/Amsterdam'))::date-30
  and nullif(trim(o.access_instructions),'') is not null and nullif(trim(o.eligibility),'') is not null
  and nullif(trim(o.organizer),'') is not null and o.source_url is not null and o.booking_url is not null
  and o.category is not null and o.date_precision is not null and o.date_precision<>'unknown',false)
$$;
revoke all on function public.opportunity_is_current(public.opportunities),public.opportunity_ready(public.opportunities) from public;

create function public.list_public_opportunities(p_filters jsonb default '{}'::jsonb) returns jsonb language sql stable security definer set search_path='' as $$
 with eligible as (
  select o.* from public.opportunities o where o.published and o.approval_status='approved' and public.opportunity_ready(o)
   and (coalesce(p_filters->>'city','')='' or o.city=p_filters->>'city')
   and (coalesce(p_filters->>'category','')='' or o.category=p_filters->>'category')
   and (coalesce(p_filters->>'query','')='' or to_tsvector('simple',coalesce(o.title,'')||' '||coalesce(o.description,'')||' '||coalesce(o.organizer,'')) @@ plainto_tsquery('simple',p_filters->>'query'))

   and (coalesce(p_filters->>'experience','')='' or case p_filters->>'experience'
    when 'part' then o.participation_type in ('audience','casting','seat_filler','stand_in')
    when 'film' then o.category in ('Film festivals','Film premieres','Celebrity and filmmaker appearances','Red carpets')
    when 'fashion' then o.category in ('Fashion and designer events','Brand activations')
    when 'culture' then o.category in ('Special culture','Special entertainment') else true end)
   and (coalesce(p_filters->>'cost','')='' or case p_filters->>'cost' when 'free' then o.cost_direction='Free' when 'paid' then o.cost_direction='Paid participation' when 'ticket' then o.cost_direction='Pay to attend' else true end)
   and (coalesce(p_filters->>'participation','')='' or o.participation_type=p_filters->>'participation')
   and (coalesce(p_filters->>'when','')='' or case p_filters->>'when'
    when 'unknown' then o.date_precision='month only'
    when 'week' then o.event_start_date <= (now() at time zone coalesce(o.timezone,'Europe/Amsterdam'))::date+7
    when 'month' then o.event_start_date <= (now() at time zone coalesce(o.timezone,'Europe/Amsterdam'))::date+30 else true end)
   and (coalesce(p_filters->>'ids','')='' or o.opportunity_id=any(string_to_array(p_filters->>'ids',',')))
 ), page as (
 select opportunity_id,title,city,category,record_type,event_start_date,event_end_date,date_precision,event_month,event_time_local,timezone,date_notes,
 venue,actual_location,geography_precision,description,why_special,access_method,participation_type,access_instructions,eligibility,minimum_age,cost_direction,currency,
 price_amount,price_max,price_notes,compensation_amount,compensation_notes,application_deadline,deadline_status,deadline_notes,availability_status,inventory_status,
 organizer,booking_url,source_url,additional_source_urls,verification_status,verification_confidence,last_verified,verification_limits,restrictions,risk_flag
 from eligible order by event_start_date nulls last,opportunity_id
 limit least(greatest(coalesce((p_filters->>'limit')::integer,60),1),100)
 offset greatest(coalesce((p_filters->>'offset')::integer,0),0)
 ) select jsonb_build_object('records',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from eligible))
$$;
revoke all on function public.list_public_opportunities(jsonb) from public;
grant execute on function public.list_public_opportunities(jsonb) to anon,authenticated;

create function public.review_opportunity(p_id text,p_action text,p_revision integer,p_note text) returns public.opportunities language plpgsql security definer set search_path='' as $$
declare o public.opportunities; begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 if length(trim(coalesce(p_note,'')))<3 then raise exception 'A review note is required';end if;
 select * into o from public.opportunities where opportunity_id=p_id for update;
 if not found then raise exception 'Record not found';end if;
 if o.revision<>p_revision then raise exception 'Record changed; reload before saving' using errcode='40001';end if;
 perform set_config('inside_access.review_action','allowed',true);
 perform set_config('inside_access.audit_note',p_note,true);
 if p_action='approve' then
  if not public.opportunity_ready(o) then raise exception 'Verification, access, eligibility, dates, freshness or lifecycle needs attention';end if;
  update public.opportunities set approval_status='approved',approved_by=auth.uid(),approved_at=now(),review_note=p_note where opportunity_id=p_id returning * into o;
 elsif p_action='publish' then
  if o.approval_status<>'approved' or not public.opportunity_ready(o) then raise exception 'Approve a current verified record before publishing';end if;
  update public.opportunities set published=true,published_at=now(),review_note=p_note where opportunity_id=p_id returning * into o;
 elsif p_action='unpublish' then
  update public.opportunities set published=false,published_at=null,review_note=p_note where opportunity_id=p_id returning * into o;
 elsif p_action='reject' then
  update public.opportunities set approval_status='rejected',lifecycle_status='rejected',published=false,published_at=null,approved_at=null,approved_by=null,review_note=p_note where opportunity_id=p_id returning * into o;
 elsif p_action='reopen' then
  update public.opportunities set approval_status='pending',lifecycle_status='active',published=false,published_at=null,approved_at=null,approved_by=null,review_note=p_note where opportunity_id=p_id returning * into o;
 else raise exception 'Unknown review action';end if;
 return o;
end $$;
revoke all on function public.review_opportunity(text,text,integer,text) from public;
grant execute on function public.review_opportunity(text,text,integer,text) to authenticated;
