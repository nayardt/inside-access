-- Service-only ingestion. The worker can create/reopen candidates, never approve or publish.
create function public.ingest_discovery(p_source_id text,p_run_id text,p_items jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.sources; item jsonb; old_hash text; identity_id text; existing_id text; new_n integer:=0; changed_n integer:=0; total_n integer:=0;
begin
 select * into s from public.sources where source_id=p_source_id for update;
 if not found or not s.enabled or s.connector_key<>'paris-open-data' then raise exception 'Source is not enabled and legally reviewed';end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>20 then raise exception 'Batch must contain at most 20 candidates';end if;
 if exists(select 1 from public.discovery_runs where run_id=p_run_id) then raise exception 'Run ID already used';end if;
 perform set_config('inside_access.actor_kind','discovery',true);
 perform set_config('inside_access.audit_note','Automated municipal-feed observation; primary access review required',true);
 insert into public.discovery_runs(run_id,source_id,status) values(p_run_id,p_source_id,'running');
 for item in select value from jsonb_array_elements(p_items) loop
  if nullif(item->>'external_id','') is null or nullif(item->>'content_hash','') is null or nullif(item->>'title','') is null then raise exception 'Candidate identity is missing';end if;
  total_n:=total_n+1;
  select content_hash into old_hash from public.source_snapshots where source_id=p_source_id and external_id=item->>'external_id';
  if old_hash is not distinct from item->>'content_hash' then
   update public.source_snapshots set last_seen_at=now() where source_id=p_source_id and external_id=item->>'external_id';
   continue;
  end if;
  identity_id:='DS-'||p_source_id||'-'||md5(item->>'external_id');
  select opportunity_id into existing_id from public.opportunities where source_id=p_source_id and source_record_id=item->>'external_id';
  if existing_id is null then
   -- Same title/city/occurrence may be an existing product: retain a snapshot, do not duplicate.
   select opportunity_id into existing_id from public.opportunities
    where lower(trim(title))=lower(trim(item->>'title')) and city=item->>'city'
    and event_start_date is not distinct from (item->>'event_start_date')::date limit 1;
   if existing_id is null then
    insert into public.opportunities(opportunity_id,origin_group,source_id,source_record_id,fingerprint,title,city,category,record_type,event_start_date,event_end_date,date_precision,timezone,description,access_instructions,eligibility,cost_direction,currency,price_notes,organizer,source_url,booking_url,verification_status,verification_confidence,verification_limits,required_action,feed_eligible,raw_record)
    values(identity_id,'discovered',p_source_id,item->>'external_id','computed-by-database',item->>'title',item->>'city',item->>'category','Specific event',(item->>'event_start_date')::date,(item->>'event_end_date')::date,item->>'date_precision',item->>'timezone',item->>'description',item->>'access_instructions',item->>'eligibility',item->>'cost_direction',item->>'currency',item->>'price_notes',item->>'organizer',item->>'source_url',item->>'booking_url','pending','Unknown','Municipal contributor data; not primary-organizer verified','Verify relevance, organizer, exact public access, dates and eligibility before approval',false,item);
    new_n:=new_n+1;
   end if;
  else
   -- Any observed change invalidates verification and unpublishes an existing candidate.
   update public.opportunities set title=item->>'title',event_start_date=(item->>'event_start_date')::date,event_end_date=(item->>'event_end_date')::date,date_precision=item->>'date_precision',description=item->>'description',price_notes=item->>'price_notes',source_url=item->>'source_url',booking_url=item->>'booking_url',verification_status='pending',last_verified=null,feed_eligible=false,raw_record=item,required_action='Source changed. Recheck material conditions and repeat publication review.' where opportunity_id=existing_id;
   changed_n:=changed_n+1;
  end if;
  insert into public.source_snapshots(source_id,external_id,content_hash,payload) values(p_source_id,item->>'external_id',item->>'content_hash',item)
   on conflict(source_id,external_id) do update set content_hash=excluded.content_hash,payload=excluded.payload,last_seen_at=now();
 end loop;
 update public.discovery_runs set status=case when new_n+changed_n=0 then 'unchanged' else 'ok' end,completed_at=now(),fetched_count=total_n,new_count=new_n,changed_count=changed_n where run_id=p_run_id;
 update public.sources set last_checked_at=now(),last_error=null where source_id=p_source_id;
 return jsonb_build_object('fetched',total_n,'created',new_n,'changed',changed_n);
end $$;
revoke all on function public.ingest_discovery(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.ingest_discovery(text,text,jsonb) to service_role;

grant select on public.sources,public.discovery_runs to service_role;
grant insert on public.discovery_runs to service_role;
grant update(last_error,last_checked_at) on public.sources to service_role;
