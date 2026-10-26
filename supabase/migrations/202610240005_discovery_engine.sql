alter table public.opportunities add column discovered_at timestamptz;
alter table public.opportunities add column source_updated_at timestamptz;
alter table public.opportunities add column source_published_at timestamptz;
alter table public.opportunities add column quality_flags jsonb not null default '[]'::jsonb check(jsonb_typeof(quality_flags)='array');
alter table public.opportunities add column discovery_reviewed_at timestamptz;
alter table public.sources add column check_interval_minutes integer not null default 1440 check(check_interval_minutes between 60 and 10080);
alter table public.sources add column next_check_at timestamptz;
alter table public.sources add column lease_until timestamptz;
alter table public.sources add column lease_run_id text;
alter table public.sources add column consecutive_failures integer not null default 0;
alter table public.sources add column coverage_note text;
alter table public.source_snapshots add column opportunity_id text references public.opportunities(opportunity_id);
alter table public.source_snapshots add column first_seen_at timestamptz;
alter table public.source_snapshots add column last_checked_at timestamptz;
alter table public.source_snapshots add column missing_count integer not null default 0;
alter table public.discovery_runs add column coverage jsonb not null default '{}'::jsonb;
create index source_snapshots_recheck on public.source_snapshots(source_id,last_checked_at nulls first);
create table public.discovery_changes(
 change_id text primary key,source_id text not null references public.sources(source_id),external_id text not null,
 opportunity_id text not null references public.opportunities(opportunity_id),run_id text not null references public.discovery_runs(run_id),
 change_type text not null check(change_type in ('content','status','source_missing')),content_hash text not null,
 proposed_record jsonb not null,field_changes jsonb not null,status text not null default 'pending' check(status in ('pending','applied','dismissed')),
 detected_at timestamptz not null default now(),resolved_at timestamptz,resolved_by uuid references auth.users(id),reason text,
 unique(source_id,external_id,content_hash)
);
alter table public.discovery_changes enable row level security;
revoke all on public.discovery_changes from anon,authenticated;
grant select on public.discovery_changes to authenticated;
create policy admin_read on public.discovery_changes for select to authenticated using((select public.is_admin()));
create trigger audit_discovery_changes after insert or update on public.discovery_changes for each row execute function private.audit_change();
-- Do not enable any source implicitly during upgrade.
update public.sources set connector_key='paris-open-data' where source_id='W-001' and connector_key is null;

create function public.discovery_context(p_source_id text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 return jsonb_build_object('source',(select to_jsonb(s) from public.sources s where source_id=p_source_id),
 'tracked',coalesce((select jsonb_agg(t) from (select external_id,content_hash,missing_count from public.source_snapshots where source_id=p_source_id and opportunity_id is not null order by last_checked_at nulls first,external_id limit 20)t),'[]'::jsonb));end $$;
revoke all on function public.discovery_context(text) from public,anon,authenticated;
grant execute on function public.discovery_context(text) to service_role;
create function public.claim_discovery_source(p_source_id text,p_run_id text,p_force boolean default false) returns boolean language plpgsql security definer set search_path='' as $$
declare s public.sources;begin
 select * into s from public.sources where source_id=p_source_id for update;
 if not found or not s.enabled or s.connector_key<>'paris-open-data' or s.legal_reviewed_at is null or nullif(trim(s.legal_review_note),'') is null then return false;end if;
 if s.lease_until>now() or (not p_force and s.next_check_at>now()) then return false;end if;
 update public.discovery_runs set status='failed',completed_at=now(),error='Previous worker lease expired' where source_id=p_source_id and status='running';
 perform set_config('inside_access.actor_kind','discovery',true);
 insert into public.discovery_runs(run_id,source_id,status) values(p_run_id,p_source_id,'running');
 update public.sources set lease_run_id=p_run_id,lease_until=now()+interval '5 minutes' where source_id=p_source_id;
 return true;end $$;
revoke all on function public.claim_discovery_source(text,text,boolean) from public,anon,authenticated;
grant execute on function public.claim_discovery_source(text,text,boolean) to service_role;

create function public.ingest_discovery_v06(p_source_id text,p_run_id text,p_items jsonb,p_report jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.sources;i jsonb;snap public.source_snapshots;o public.opportunities;existing_id text;new_id text;changes jsonb;
 n integer:=0;c integer:=0;seen integer:=0;duplicates integer:=0;missing_id text;newhash text;state text;begin
 select * into s from public.sources where source_id=p_source_id for update;
 if not found or not s.enabled or s.connector_key<>'paris-open-data' or s.lease_run_id is distinct from p_run_id or s.lease_until<now() then raise exception 'Enabled source and active worker lease required';end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>100 then raise exception 'Batch must contain at most 100 observations';end if;
 if exists(select 1 from public.discovery_runs where run_id=p_run_id and status<>'running') then raise exception 'Run already completed';end if;
 perform set_config('inside_access.actor_kind','discovery',true);perform set_config('inside_access.audit_action','source_observation',true);perform set_config('inside_access.audit_note','Automatic source observation; no verification or publication approval',true);
 for i in select value from jsonb_array_elements(p_items) loop
  if nullif(i->>'external_id','') is null or nullif(i->>'content_hash','') is null or nullif(trim(i->>'title'),'') is null then raise exception 'Observation identity missing';end if;
  seen:=seen+1;existing_id:=null;select * into snap from public.source_snapshots where source_id=p_source_id and external_id=i->>'external_id';
  if found then existing_id:=snap.opportunity_id;end if;
  if existing_id is null then select opportunity_id into existing_id from public.opportunities where source_id=p_source_id and source_record_id=i->>'external_id';end if;
  if snap.content_hash is not distinct from i->>'content_hash' and snap.missing_count=0 then
   update public.source_snapshots set last_seen_at=now(),last_checked_at=now() where source_id=p_source_id and external_id=i->>'external_id';continue;
  end if;
  state:=coalesce(i->>'lifecycle_status','active');if state not in ('active','expired','closed','cancelled','sold_out') then raise exception 'Invalid observed lifecycle';end if;
  if existing_id is null then
   -- Exact title/city/occurrence/product duplicates link to one opportunity, preserving distinct access products.
   select opportunity_id into existing_id from public.opportunities where lower(regexp_replace(trim(title),'[[:space:]]+',' ','g'))=lower(regexp_replace(trim(i->>'title'),'[[:space:]]+',' ','g'))
    and city=i->>'city' and event_start_date is not distinct from (i->>'event_start_date')::date
    and (coalesce(booking_url,'')=coalesce(i->>'booking_url','') or coalesce(access_method,'')=coalesce(i->>'access_method','')) order by opportunity_id limit 1;
   if existing_id is not null then duplicates:=duplicates+1;end if;
   if existing_id is null and coalesce((i->>'relevant')::boolean,true) and state='active' then
    new_id:='DS-'||p_source_id||'-'||md5(i->>'external_id');
    insert into public.opportunities(opportunity_id,origin_group,source_id,source_record_id,fingerprint,title,city,category,record_type,event_start_date,event_end_date,date_precision,timezone,venue,description,access_method,access_instructions,eligibility,cost_direction,currency,price_notes,organizer,source_url,booking_url,verification_status,verification_confidence,verification_limits,required_action,feed_eligible,raw_record,discovered_at,source_updated_at,source_published_at,quality_flags)
    values(new_id,'discovered',p_source_id,i->>'external_id','computed',i->>'title',i->>'city',i->>'category','Specific event',(i->>'event_start_date')::date,(i->>'event_end_date')::date,i->>'date_precision',i->>'timezone',i->>'venue',i->>'description',i->>'access_method',i->>'access_instructions',i->>'eligibility',i->>'cost_direction',i->>'currency',i->>'price_notes',i->>'organizer',i->>'source_url',i->>'booking_url','pending','Unknown','Municipal contributor listing; original access and eligibility require human verification','Review source evidence and flagged missing/conflicting details',false,i,now(),(i->>'source_updated_at')::timestamptz,null,coalesce(i->'quality_flags','[]')) returning * into o;
    existing_id:=new_id;n:=n+1;
    insert into public.verification_checks(check_id,opportunity_id,checked_at,recorded_at,source_url,status,evidence_note,raw_record) values('discovery:'||p_run_id||':'||existing_id,existing_id,now(),now(),i->>'source_url','pending','Automatic retrieval, not original-organizer verification',i->'evidence');
   end if;
  elsif snap.content_hash is distinct from i->>'content_hash' or snap.missing_count>0 then
   select * into o from public.opportunities where opportunity_id=existing_id for update;
   select coalesce(jsonb_object_agg(k,jsonb_build_object('from',snap.payload->k,'to',i->k)),'{}') into changes from jsonb_object_keys(i) k
    where i->k is distinct from snap.payload->k and k<>all(array['content_hash','source_updated_at','evidence','source_published_at']);
   insert into public.discovery_changes(change_id,source_id,external_id,opportunity_id,run_id,change_type,content_hash,proposed_record,field_changes)
    values(gen_random_uuid()::text,p_source_id,i->>'external_id',existing_id,p_run_id,case when state<>'active' then 'status' else 'content' end,i->>'content_hash',i,changes) on conflict(source_id,external_id,content_hash) do nothing;
   -- Preserve editorial copy. Stop exposing it until an administrator reviews the proposed changes.
   update public.opportunities set verification_status='pending',feed_eligible=false,quality_flags=coalesce(i->'quality_flags','[]'),discovery_reviewed_at=null,source_updated_at=(i->>'source_updated_at')::timestamptz,
    lifecycle_status=case when state<>'active' and lifecycle_status<>'rejected' then state else lifecycle_status end,
    required_action='Source changed. Review the proposed changes before verifying and approving again.' where opportunity_id=existing_id;
   c:=c+1;
  end if;
  insert into public.source_snapshots(source_id,external_id,content_hash,payload,opportunity_id,first_seen_at,last_checked_at)
   values(p_source_id,i->>'external_id',i->>'content_hash',i,existing_id,now(),now()) on conflict(source_id,external_id) do update set content_hash=excluded.content_hash,payload=excluded.payload,opportunity_id=coalesce(public.source_snapshots.opportunity_id,excluded.opportunity_id),last_seen_at=now(),last_checked_at=now(),missing_count=0;
 end loop;
 -- Absence is not proof of cancellation. Flag explicit ID-query misses and withhold after repeated misses.
 for missing_id in select jsonb_array_elements_text(coalesce(p_report->'missing_ids','[]')) loop
  update public.source_snapshots set missing_count=missing_count+1,last_checked_at=now() where source_id=p_source_id and external_id=missing_id returning * into snap;
  if snap.opportunity_id is not null and snap.missing_count>=2 then
   newhash:='missing:'||snap.content_hash;
   insert into public.discovery_changes(change_id,source_id,external_id,opportunity_id,run_id,change_type,content_hash,proposed_record,field_changes)
    values(gen_random_uuid()::text,p_source_id,missing_id,snap.opportunity_id,p_run_id,'source_missing',newhash,snap.payload,jsonb_build_object('source_presence',jsonb_build_object('from','observed','to','not returned by two successful ID checks'))) on conflict do nothing;
   update public.opportunities set verification_status='pending',feed_eligible=false,quality_flags=case when quality_flags ? 'source_missing' then quality_flags else quality_flags||'"source_missing"'::jsonb end,required_action='Source record not returned twice. Recheck; cancellation is not established.' where opportunity_id=snap.opportunity_id and not(quality_flags ? 'source_missing');
  end if;
 end loop;
 update public.discovery_runs set status=case when n+c=0 then 'unchanged' else 'ok' end,completed_at=now(),fetched_count=seen,new_count=n,changed_count=c,coverage=p_report||jsonb_build_object('duplicates',duplicates) where run_id=p_run_id;
 update public.sources set last_checked_at=now(),last_error=null,consecutive_failures=0,next_check_at=now()+make_interval(mins=>check_interval_minutes),lease_run_id=null,lease_until=null,coverage_note=p_report->>'note' where source_id=p_source_id;
 return jsonb_build_object('fetched',seen,'created',n,'changed',c,'duplicates',duplicates);end $$;
revoke all on function public.ingest_discovery_v06(text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.ingest_discovery_v06(text,text,jsonb,jsonb) to service_role;

create function public.fail_discovery_run(p_source_id text,p_run_id text,p_error text) returns void language plpgsql security definer set search_path='' as $$begin
 perform set_config('inside_access.actor_kind','discovery',true);
 update public.discovery_runs set status='failed',completed_at=now(),error=left(p_error,500) where run_id=p_run_id and source_id=p_source_id and status='running';
 update public.sources set last_error=left(p_error,500),consecutive_failures=consecutive_failures+1,next_check_at=now()+make_interval(mins=>least(1440,15*power(2,least(consecutive_failures,6))::integer)),lease_run_id=null,lease_until=null where source_id=p_source_id and lease_run_id=p_run_id;
end $$;
revoke all on function public.fail_discovery_run(text,text,text) from public,anon,authenticated;
grant execute on function public.fail_discovery_run(text,text,text) to service_role;
create function public.expire_opportunities() returns jsonb language plpgsql security definer set search_path='' as $$declare expired_n integer;closed_n integer;begin
 perform set_config('inside_access.actor_kind','discovery',true);perform set_config('inside_access.audit_action','lifecycle_expiry',true);perform set_config('inside_access.audit_note','Automatic expiry from the stored event window/application deadline',true);
 update public.opportunities o set lifecycle_status='expired' where lifecycle_status='active' and coalesce(event_end_date,event_start_date,(to_date(event_month||'-01','YYYY-MM-DD')+interval '1 month - 1 day')::date)<(now() at time zone coalesce(timezone,'Europe/Amsterdam'))::date;get diagnostics expired_n=row_count;
 update public.opportunities o set lifecycle_status='closed' where lifecycle_status='active' and application_deadline<(now() at time zone coalesce(timezone,'Europe/Amsterdam'))::date;get diagnostics closed_n=row_count;
 return jsonb_build_object('expired',expired_n,'closed',closed_n);end $$;
revoke all on function public.expire_opportunities() from public,anon,authenticated;
grant execute on function public.expire_opportunities() to service_role;

create function public.resolve_discovery_change(p_change_id text,p_revision integer,p_action text,p_reason text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare ch public.discovery_changes;o public.opportunities;n public.opportunities;begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 select * into ch from public.discovery_changes where change_id=p_change_id for update;if not found or ch.status<>'pending' then raise exception 'Change is no longer pending';end if;
 select * into o from public.opportunities where opportunity_id=ch.opportunity_id for update;if o.revision<>p_revision then raise exception 'Record changed; reload before saving' using errcode='40001';end if;
 perform set_config('inside_access.audit_action','resolve_source_change',true);perform set_config('inside_access.audit_note',coalesce(p_reason,''),true);
 if p_action='apply' and ch.change_type<>'source_missing' then
  select * into n from jsonb_populate_record(o,ch.proposed_record);
  update public.opportunities set title=n.title,city=n.city,category=n.category,event_start_date=n.event_start_date,event_end_date=n.event_end_date,date_precision=n.date_precision,timezone=n.timezone,venue=n.venue,description=n.description,access_method=n.access_method,access_instructions=n.access_instructions,eligibility=n.eligibility,cost_direction=n.cost_direction,currency=n.currency,price_amount=(ch.proposed_record->>'price_amount')::numeric,price_max=(ch.proposed_record->>'price_max')::numeric,compensation_amount=(ch.proposed_record->>'compensation_amount')::numeric,price_notes=n.price_notes,organizer=n.organizer,booking_url=n.booking_url,source_url=n.source_url,verification_status='pending',feed_eligible=false,quality_flags=n.quality_flags,raw_record=ch.proposed_record,required_action='Observed changes applied. Verify the original evidence before approval.' where opportunity_id=o.opportunity_id returning * into o;
 elsif p_action='dismiss' then
  if length(trim(coalesce(p_reason,'')))<10 then raise exception 'Explain why the source change is being dismissed (at least 10 characters)';end if;
 else raise exception 'Review the missing source manually, or choose apply/dismiss';end if;
 update public.discovery_changes set status=case when p_action='apply' then 'applied' else 'dismissed' end,resolved_at=now(),resolved_by=auth.uid(),reason=nullif(trim(p_reason),'') where change_id=p_change_id;
 return to_jsonb(o);end $$;
revoke all on function public.resolve_discovery_change(text,integer,text,text) from public,anon,service_role;
grant execute on function public.resolve_discovery_change(text,integer,text,text) to authenticated;
create or replace function public.ingest_discovery(p_source_id text,p_run_id text,p_items jsonb) returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if jsonb_array_length(p_items)>20 then raise exception 'Batch must contain at most 20 candidates';end if;
 if not public.claim_discovery_source(p_source_id,p_run_id,true) then raise exception 'Source is not enabled or has an active lease';end if;
 result:=public.ingest_discovery_v06(p_source_id,p_run_id,p_items,'{}');return result-'duplicates';end $$;

create or replace function private.review_blockers(o public.opportunities) returns jsonb language plpgsql stable set search_path='' as $$
declare b jsonb:='[]'; local_day date:=(now() at time zone coalesce(o.timezone,'Europe/Amsterdam'))::date;begin
 if o.verification_status<>'verified' then b:=b||'"Verify the original source before approval."'::jsonb;end if;
 if o.lifecycle_status<>'active' then b:=b||jsonb_build_array('Lifecycle is '||o.lifecycle_status||'; an inactive opportunity cannot be published.');end if;
 if not o.feed_eligible then b:=b||'"Confirm this record is eligible for the discovery feed."'::jsonb;end if;
 if not public.opportunity_is_current(o) then b:=b||'"Confirm an upcoming date/window and an open application deadline."'::jsonb;end if;
 if o.last_verified is null or o.last_verified<local_day-30 or o.last_verified>local_day then b:=b||'"Recheck the source: verification must be dated within the last 30 days, not in the future."'::jsonb;end if;
 if nullif(trim(o.access_instructions),'') is null then b:=b||'"Add the exact access instructions."'::jsonb;end if;
 if nullif(trim(o.eligibility),'') is null then b:=b||'"Confirm the eligibility requirements."'::jsonb;end if;
 if nullif(trim(o.organizer),'') is null then b:=b||'"Identify the organizer or authorized provider."'::jsonb;end if;
 if o.source_url is null then b:=b||'"Add an HTTPS evidence source."'::jsonb;end if;
 if o.booking_url is null then b:=b||'"Add an official booking, application or entry-information URL."'::jsonb;end if;
 if nullif(trim(o.category),'') is null then b:=b||'"Choose an experience category."'::jsonb;end if;
 if o.date_precision is null or o.date_precision='unknown' then b:=b||'"Confirm date precision; unknown dates cannot be published."'::jsonb;end if;
 if o.quality_flags ?| array['conflicting_dates','conflicting_time','source_missing'] and o.discovery_reviewed_at is null then b:=b||'"Resolve the flagged source conflict or missing source, then record original-source verification."'::jsonb;end if;
 return b;end $$;

create or replace function public.save_opportunity(p_id text,p_patch jsonb,p_revision integer,p_note text) returns public.opportunities language plpgsql security definer set search_path='' as $$
declare o public.opportunities; n public.opportunities;begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 if jsonb_typeof(p_patch)<>'object' or exists(select 1 from jsonb_object_keys(p_patch) k where not k=any(array['title','city','category','record_type','event_start_date','event_end_date','date_precision','event_month','event_time_local','timezone','date_notes','event_date_claim','venue','actual_location','geography_precision','description','why_special','access_method','participation_type','access_instructions','eligibility','minimum_age','cost_direction','currency','price_amount','price_max','price_notes','compensation_amount','compensation_notes','application_deadline','deadline_status','deadline_notes','availability_status','inventory_status','organizer','booking_url','source_url','additional_source_urls','source_type','evidence_note','verification_status','verification_confidence','last_verified','verification_limits','restrictions','risk_flag','parent_event_id','seed_id','next_check','feed_eligible','lifecycle_status','reason','required_action','classification'])) then raise exception 'Unknown or protected field';end if;
 select * into o from public.opportunities where opportunity_id=p_id for update;
 if not found then raise exception 'Record not found';end if;
 if o.revision<>p_revision then raise exception 'Record changed; reload before saving' using errcode='40001';end if;
 select * into n from jsonb_populate_record(o,p_patch);
 if p_patch->>'verification_status'='verified' and (nullif(trim(n.evidence_note),'') is null or n.source_url is null or n.last_verified is null) then raise exception 'Record the original source, verification date and evidence before marking verified';end if;
 perform set_config('inside_access.audit_note',coalesce(p_note,''),true);
 update public.opportunities set discovery_reviewed_at=case when p_patch->>'verification_status'='verified' then now() when p_patch ? 'source_url' then null else discovery_reviewed_at end,  title=n.title,
 city=n.city,
 category=n.category,
 record_type=n.record_type,
 event_start_date=n.event_start_date,
 event_end_date=n.event_end_date,
 date_precision=n.date_precision,
 event_month=n.event_month,
 event_time_local=n.event_time_local,
 timezone=n.timezone,
 date_notes=n.date_notes,
 event_date_claim=n.event_date_claim,
 venue=n.venue,
 actual_location=n.actual_location,
 geography_precision=n.geography_precision,
 description=n.description,
 why_special=n.why_special,
 access_method=n.access_method,
 participation_type=n.participation_type,
 access_instructions=n.access_instructions,
 eligibility=n.eligibility,
 minimum_age=n.minimum_age,
 cost_direction=n.cost_direction,
 currency=n.currency,
 price_amount=n.price_amount,
 price_max=n.price_max,
 price_notes=n.price_notes,
 compensation_amount=n.compensation_amount,
 compensation_notes=n.compensation_notes,
 application_deadline=n.application_deadline,
 deadline_status=n.deadline_status,
 deadline_notes=n.deadline_notes,
 availability_status=n.availability_status,
 inventory_status=n.inventory_status,
 organizer=n.organizer,
 booking_url=n.booking_url,
 source_url=n.source_url,
 additional_source_urls=n.additional_source_urls,
 source_type=n.source_type,
 evidence_note=n.evidence_note,
 verification_status=n.verification_status,
 verification_confidence=n.verification_confidence,
 last_verified=n.last_verified,
 verification_limits=n.verification_limits,
 restrictions=n.restrictions,
 risk_flag=n.risk_flag,
 parent_event_id=n.parent_event_id,
 seed_id=n.seed_id,
 next_check=n.next_check,
 feed_eligible=n.feed_eligible,
 lifecycle_status=n.lifecycle_status,
 reason=n.reason,
 required_action=n.required_action,
 classification=n.classification where opportunity_id=p_id returning * into o;
 if p_patch ?| array['verification_status','last_verified','source_url','evidence_note','verification_confidence','verification_limits'] then
 insert into public.verification_checks(check_id,opportunity_id,verified_date,recorded_at,checked_by,source_url,status,confidence,evidence_note,limits)
 values(gen_random_uuid()::text,p_id,o.last_verified,now(),auth.uid(),o.source_url,o.verification_status,o.verification_confidence,o.evidence_note,o.verification_limits);
 end if;
 return o;end $$;
revoke all on function public.save_opportunity(text,jsonb,integer,text) from public;
grant execute on function public.save_opportunity(text,jsonb,integer,text) to authenticated;

