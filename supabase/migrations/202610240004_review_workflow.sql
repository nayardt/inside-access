-- Additive upgrade. Existing identities, credentials, edits and publication decisions are retained.
alter table public.audit_history add column actor_email text;
alter table public.audit_history add column verification_status text;
alter table public.audit_history add column evidence_sources jsonb not null default '[]'::jsonb;
alter table public.audit_history add column changed_fields jsonb not null default '{}'::jsonb;
alter table public.audit_history add column context jsonb not null default '{}'::jsonb;
alter table public.opportunities add column warning_override_reason text;
alter table public.opportunities add column warning_override_by uuid references auth.users(id);
alter table public.opportunities add column warning_override_at timestamptz;

create or replace function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare a jsonb:=to_jsonb(new);b jsonb;d jsonb;email text;begin
 if tg_op='UPDATE' then b:=to_jsonb(old);end if;
 select jsonb_object_agg(k,jsonb_build_object('from',b->k,'to',a->k)) into d from jsonb_object_keys(a) k
 where (b is null or a->k is distinct from b->k) and k<>all(array['revision','created_at','updated_at']);
 select u.email into email from auth.users u where u.id=auth.uid();
 insert into public.audit_history(entity_type,entity_id,action,actor_id,actor_kind,before_record,after_record,note,actor_email,verification_status,evidence_sources,changed_fields,context)
 values(tg_table_name,coalesce(a->>'opportunity_id',a->>'source_id'),tg_op,auth.uid(),
 coalesce(nullif(current_setting('inside_access.actor_kind',true),''),case when auth.uid() is null then 'system' else 'admin' end),b,a,
 nullif(trim(current_setting('inside_access.audit_note',true)),''),email,a->>'verification_status',
 jsonb_strip_nulls(jsonb_build_array(a->>'source_url'))||coalesce(a->'additional_source_urls','[]'::jsonb),coalesce(d,'{}'::jsonb),
 jsonb_build_object('operation',coalesce(nullif(current_setting('inside_access.audit_action',true),''),'save'),'source_record_id',a->>'source_record_id'));
 return new;end $$;

create function private.review_blockers(o public.opportunities) returns jsonb language plpgsql stable set search_path='' as $$
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
 return b;end $$;
create function private.review_warnings(o public.opportunities) returns jsonb language sql stable set search_path='' as $$
 select case when coalesce(o.verification_confidence,'Unknown')<>'High' then jsonb_build_array('Verification confidence is '||coalesce(o.verification_confidence,'Unknown')||'. Explain why the evidence is sufficient before overriding this warning.') else '[]'::jsonb end
$$;
create or replace function public.opportunity_ready(o public.opportunities) returns boolean language sql stable set search_path='' as $$
 select jsonb_array_length(private.review_blockers(o))=0
$$;
create function public.get_review_state(p_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare o public.opportunities;begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 select * into o from public.opportunities where opportunity_id=p_id;if not found then raise exception 'Record not found';end if;
 return jsonb_build_object('revision',o.revision,'blockers',private.review_blockers(o),'warnings',private.review_warnings(o),'approved',o.approval_status='approved','published',o.published,'override_recorded',o.warning_override_by is not null and length(trim(coalesce(o.warning_override_reason,'')))>=10);
end $$;
revoke all on function public.get_review_state(text) from public;
grant execute on function public.get_review_state(text) to authenticated;

create function public.review_opportunity_v06(p_id text,p_action text,p_revision integer,p_note text default null,p_override boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.opportunities;b jsonb;w jsonb;previous_flag text;begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 select * into o from public.opportunities where opportunity_id=p_id for update;if not found then raise exception 'Record not found';end if;
 if o.revision<>p_revision then raise exception 'Record changed; reload before saving' using errcode='40001';end if;
 b:=private.review_blockers(o);w:=private.review_warnings(o);
 if p_action='reject' and length(trim(coalesce(p_note,'')))<10 then raise exception 'A rejection reason of at least 10 characters is required';end if;
 if p_action in ('approve','publish') then
  if jsonb_array_length(b)>0 then raise exception '%',b->>0;end if;
  if p_action='publish' and o.approval_status<>'approved' then raise exception 'Approve this verified opportunity before publishing';end if;
  if jsonb_array_length(w)>0 and not(p_action='publish' and o.warning_override_by is not null and length(trim(coalesce(o.warning_override_reason,'')))>=10) then
   if not p_override or length(trim(coalesce(p_note,'')))<10 then raise exception 'Acknowledge the verification warning and provide a reason of at least 10 characters';end if;
  end if;
 end if;
 previous_flag:=current_setting('inside_access.review_action',true);
 perform set_config('inside_access.review_action','allowed',true);perform set_config('inside_access.audit_note',coalesce(p_note,''),true);perform set_config('inside_access.audit_action',p_action,true);
 if p_action='approve' then
  update public.opportunities set approval_status='approved',approved_by=auth.uid(),approved_at=now(),review_note=nullif(trim(p_note),''),
   warning_override_reason=case when jsonb_array_length(w)>0 then trim(p_note) else null end,
   warning_override_by=case when jsonb_array_length(w)>0 then auth.uid() else null end,
   warning_override_at=case when jsonb_array_length(w)>0 then now() else null end
   where opportunity_id=p_id returning * into o;
 elsif p_action='publish' then
  update public.opportunities set published=true,published_at=now(),review_note=coalesce(nullif(trim(p_note),''),review_note),warning_override_reason=coalesce(warning_override_reason,case when jsonb_array_length(w)>0 then trim(p_note) end),warning_override_by=coalesce(warning_override_by,case when jsonb_array_length(w)>0 then auth.uid() end),warning_override_at=coalesce(warning_override_at,case when jsonb_array_length(w)>0 then now() end) where opportunity_id=p_id returning * into o;
 elsif p_action='unpublish' then
  update public.opportunities set published=false,published_at=null,review_note=nullif(trim(p_note),'') where opportunity_id=p_id returning * into o;
 elsif p_action='reject' then
  update public.opportunities set approval_status='rejected',lifecycle_status='rejected',published=false,published_at=null,approved_at=null,approved_by=null,review_note=trim(p_note),warning_override_reason=null,warning_override_by=null,warning_override_at=null where opportunity_id=p_id returning * into o;
 elsif p_action='reopen' then
  update public.opportunities set approval_status='pending',lifecycle_status='active',published=false,published_at=null,approved_at=null,approved_by=null,review_note=nullif(trim(p_note),''),warning_override_reason=null,warning_override_by=null,warning_override_at=null where opportunity_id=p_id returning * into o;
 else raise exception 'Unknown review action';end if;
 perform set_config('inside_access.review_action',coalesce(previous_flag,''),true);
 return to_jsonb(o);end $$;
revoke all on function public.review_opportunity_v06(text,text,integer,text,boolean) from public,anon,service_role;
grant execute on function public.review_opportunity_v06(text,text,integer,text,boolean) to authenticated;
-- Existing integrations retain the four-argument entry point, with no warning bypass.
create or replace function public.review_opportunity(p_id text,p_action text,p_revision integer,p_note text) returns public.opportunities language plpgsql security definer set search_path='' as $$
declare result public.opportunities;begin
 select * into result from jsonb_populate_record(null::public.opportunities,public.review_opportunity_v06(p_id,p_action,p_revision,p_note,false));return result;end $$;

create or replace function public.save_opportunity(p_id text,p_patch jsonb,p_revision integer,p_note text) returns public.opportunities language plpgsql security definer set search_path='' as $$
declare o public.opportunities; n public.opportunities;begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 if jsonb_typeof(p_patch)<>'object' or exists(select 1 from jsonb_object_keys(p_patch) k where not k=any(array['title','city','category','record_type','event_start_date','event_end_date','date_precision','event_month','event_time_local','timezone','date_notes','event_date_claim','venue','actual_location','geography_precision','description','why_special','access_method','participation_type','access_instructions','eligibility','minimum_age','cost_direction','currency','price_amount','price_max','price_notes','compensation_amount','compensation_notes','application_deadline','deadline_status','deadline_notes','availability_status','inventory_status','organizer','booking_url','source_url','additional_source_urls','source_type','evidence_note','verification_status','verification_confidence','last_verified','verification_limits','restrictions','risk_flag','parent_event_id','seed_id','next_check','feed_eligible','lifecycle_status','reason','required_action','classification'])) then raise exception 'Unknown or protected field';end if;
 select * into o from public.opportunities where opportunity_id=p_id for update;
 if not found then raise exception 'Record not found';end if;
 if o.revision<>p_revision then raise exception 'Record changed; reload before saving' using errcode='40001';end if;
 select * into n from jsonb_populate_record(o,p_patch);
 perform set_config('inside_access.audit_note',coalesce(p_note,''),true);
 update public.opportunities set  title=n.title,
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

create or replace function public.save_source(p_id text,p_patch jsonb,p_revision integer,p_note text) returns public.sources language plpgsql security definer set search_path='' as $$
declare o public.sources; n public.sources;begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 if jsonb_typeof(p_patch)<>'object' or exists(select 1 from jsonb_object_keys(p_patch) k where not k=any(array['source_name','city_scope','categories','source_url','source_type','source_state','automation_method','suggested_frequency','priority','extraction_targets','promotion_rule','restrictions','last_verified','enabled','connector_key','legal_reviewed_at','legal_review_note'])) then raise exception 'Unknown or protected field';end if;
 select * into o from public.sources where source_id=p_id for update;
 if not found then raise exception 'Record not found';end if;
 if o.revision<>p_revision then raise exception 'Record changed; reload before saving' using errcode='40001';end if;
 select * into n from jsonb_populate_record(o,p_patch);
 perform set_config('inside_access.audit_note',coalesce(p_note,''),true);
 update public.sources set  source_name=n.source_name,
 city_scope=n.city_scope,
 categories=n.categories,
 source_url=n.source_url,
 source_type=n.source_type,
 source_state=n.source_state,
 automation_method=n.automation_method,
 suggested_frequency=n.suggested_frequency,
 priority=n.priority,
 extraction_targets=n.extraction_targets,
 promotion_rule=n.promotion_rule,
 restrictions=n.restrictions,
 last_verified=n.last_verified,
 enabled=n.enabled,
 connector_key=n.connector_key,
 legal_reviewed_at=n.legal_reviewed_at,
 legal_review_note=n.legal_review_note where source_id=p_id returning * into o;
 return o;end $$;
revoke all on function public.save_source(text,jsonb,integer,text) from public;
grant execute on function public.save_source(text,jsonb,integer,text) to authenticated;


create or replace function private.opportunity_guard() returns trigger language plpgsql set search_path='' as $$
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
   new.warning_override_reason:=null;new.warning_override_by:=null;new.warning_override_at:=null;new.published:=false; new.published_at:=null; new.approval_status:='pending';new.approved_at:=null;new.approved_by:=null;
   if new.lifecycle_status='rejected' then new.approval_status:='rejected'; end if;
  end if;
 end if;
 return new;
end $$;
