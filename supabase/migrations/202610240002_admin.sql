create function public.save_opportunity(p_id text,p_patch jsonb,p_revision integer,p_note text) returns public.opportunities language plpgsql security definer set search_path='' as $$
declare o public.opportunities; n public.opportunities;begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 if length(trim(coalesce(p_note,'')))<3 then raise exception 'A change note is required';end if;
 if jsonb_typeof(p_patch)<>'object' or exists(select 1 from jsonb_object_keys(p_patch) k where not k=any(array['title','city','category','record_type','event_start_date','event_end_date','date_precision','event_month','event_time_local','timezone','date_notes','event_date_claim','venue','actual_location','geography_precision','description','why_special','access_method','participation_type','access_instructions','eligibility','minimum_age','cost_direction','currency','price_amount','price_max','price_notes','compensation_amount','compensation_notes','application_deadline','deadline_status','deadline_notes','availability_status','inventory_status','organizer','booking_url','source_url','additional_source_urls','source_type','evidence_note','verification_status','verification_confidence','last_verified','verification_limits','restrictions','risk_flag','parent_event_id','seed_id','next_check','feed_eligible','lifecycle_status','reason','required_action','classification'])) then raise exception 'Unknown or protected field';end if;
 select * into o from public.opportunities where opportunity_id=p_id for update;
 if not found then raise exception 'Record not found';end if;
 if o.revision<>p_revision then raise exception 'Record changed; reload before saving' using errcode='40001';end if;
 select * into n from jsonb_populate_record(o,p_patch);
 perform set_config('inside_access.audit_note',p_note,true);
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

create function public.save_source(p_id text,p_patch jsonb,p_revision integer,p_note text) returns public.sources language plpgsql security definer set search_path='' as $$
declare o public.sources; n public.sources;begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 if length(trim(coalesce(p_note,'')))<3 then raise exception 'A change note is required';end if;
 if jsonb_typeof(p_patch)<>'object' or exists(select 1 from jsonb_object_keys(p_patch) k where not k=any(array['source_name','city_scope','categories','source_url','source_type','source_state','automation_method','suggested_frequency','priority','extraction_targets','promotion_rule','restrictions','last_verified','enabled','connector_key','legal_reviewed_at','legal_review_note'])) then raise exception 'Unknown or protected field';end if;
 select * into o from public.sources where source_id=p_id for update;
 if not found then raise exception 'Record not found';end if;
 if o.revision<>p_revision then raise exception 'Record changed; reload before saving' using errcode='40001';end if;
 select * into n from jsonb_populate_record(o,p_patch);
 perform set_config('inside_access.audit_note',p_note,true);
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

create function public.admin_overview() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 return jsonb_build_object(
 'total',(select count(*) from public.opportunities),
 'selected',(select count(*) from public.opportunities where origin_group='selected'),
 'pending',(select count(*) from public.opportunities where origin_group='pending'),
 'unsuitable',(select count(*) from public.opportunities where origin_group='unsuitable'),
 'discovered',(select count(*) from public.opportunities where origin_group='discovered'),
 'sources',(select count(*) from public.sources),
 'verified',(select count(*) from public.opportunities where verification_status='verified'),
 'published',(select count(*) from public.opportunities where published),
 'public_visible',(select count(*) from public.opportunities o where published and approval_status='approved' and public.opportunity_ready(o)),
 'awaiting_approval',(select count(*) from public.opportunities where approval_status='pending'),
 'expired',(select count(*) from public.opportunities o where lifecycle_status='expired' or coalesce(o.event_end_date,o.event_start_date,(to_date(o.event_month||'-01','YYYY-MM-DD')+interval '1 month - 1 day')::date) < (now() at time zone coalesce(o.timezone,'Europe/Amsterdam'))::date),
 'attention',(select count(*) from public.opportunities o where approval_status<>'rejected' and (approval_status='pending' or next_check<=(now() at time zone 'Europe/Amsterdam')::date or verification_status<>'verified' or not public.opportunity_is_current(o)))
 );end $$;
revoke all on function public.admin_overview() from public;
grant execute on function public.admin_overview() to authenticated;

-- Fingerprints are recalculated on every insert/edit, preserving stable external IDs.
create function private.set_fingerprint() returns trigger language plpgsql set search_path='' as $$begin
 new.fingerprint:=md5(lower(regexp_replace(trim(new.title),'[[:space:]]+',' ','g'))||'|'||coalesce(new.city,'')||'|'||coalesce(new.event_start_date::text,new.event_month,new.event_date_claim,'unknown')||'|'||coalesce(new.access_method,''));
 return new;end $$;
create trigger identity_opportunities before insert or update on public.opportunities for each row execute function private.set_fingerprint();
grant execute on function public.opportunity_is_current(public.opportunities) to authenticated;
