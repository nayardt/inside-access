-- Append-only upgrade: retain existing records and audit rows; enrich future source-change decisions.
create or replace function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare a jsonb:=to_jsonb(new);b jsonb;d jsonb;email text;verified text;evidence_url text;begin
 if tg_op='UPDATE' then b:=to_jsonb(old);end if;
 select jsonb_object_agg(k,jsonb_build_object('from',b->k,'to',a->k)) into d from jsonb_object_keys(a) k
 where (b is null or a->k is distinct from b->k) and k<>all(array['revision','created_at','updated_at']);
 select u.email into email from auth.users u where u.id=auth.uid();
 verified:=a->>'verification_status';
 if tg_table_name='discovery_changes' then
  select o.verification_status into verified from public.opportunities o where o.opportunity_id=a->>'opportunity_id';
 end if;
 evidence_url:=coalesce(a->>'source_url',a#>>'{proposed_record,source_url}');
 insert into public.audit_history(entity_type,entity_id,action,actor_id,actor_kind,before_record,after_record,note,actor_email,verification_status,evidence_sources,changed_fields,context)
 values(tg_table_name,case when tg_table_name='discovery_changes' then a->>'change_id' else coalesce(a->>'opportunity_id',a->>'source_id') end,tg_op,auth.uid(),
 coalesce(nullif(current_setting('inside_access.actor_kind',true),''),case when auth.uid() is null then 'system' else 'admin' end),b,a,
 nullif(trim(current_setting('inside_access.audit_note',true)),''),email,verified,
 (case when nullif(trim(evidence_url),'') is null then '[]'::jsonb else jsonb_build_array(evidence_url) end)||coalesce(a->'additional_source_urls','[]'::jsonb),coalesce(d,'{}'::jsonb),
 jsonb_build_object('operation',coalesce(nullif(current_setting('inside_access.audit_action',true),''),'save'),'source_record_id',a->>'source_record_id','opportunity_id',a->>'opportunity_id','source_id',a->>'source_id','change_id',a->>'change_id','run_id',a->>'run_id'));
 return new;end $$;

