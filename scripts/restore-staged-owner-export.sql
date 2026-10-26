-- Operator-only restoration of the owner-approved 2026-10-26 export.
-- Not an application migration or a client RPC. Requires private staging chunks,
-- the original actor already created through Auth Admin API, and an empty target.
-- Missing source_snapshots were explicitly waived by the owner. Never seed them.
begin;
lock table public.sources, public.opportunities, public.verification_checks,
 public.audit_history, public.discovery_runs, public.discovery_changes,
 public.opportunity_images, public.image_enrichment_checks in access exclusive mode;
do $restore$
declare
 payload_text text; payload jsonb; tab text; different boolean; existing boolean;
 tables text[] := array['sources','opportunities','verification_checks','audit_history',
  'discovery_runs','discovery_changes','opportunity_images','image_enrichment_checks'];
 batch text := 'owner-export-a8857913112977a4e9fa87bb33c4c4a079cc105dd849e67e1c5f54a56a161cc6';
begin
 select string_agg(content,'' order by part) into payload_text from private.owner_import_chunks;
 if (select count(*) from private.owner_import_chunks) <> 22
  or encode(sha256(convert_to(payload_text,'UTF8')),'hex') is distinct from
  '8ffed86727c4c39bf8d9656f804fd13b5ea15f60bdcd36ee09ee7e2ffa258dfa'
 then raise exception 'Incomplete or changed staging payload'; end if;
 payload := payload_text::jsonb;
 select exists(select 1 from private.import_batches where batch_id=batch) into existing;
 if not existing then
  foreach tab in array tables loop
   execute format('select exists(select 1 from public.%I)',tab) into different;
   if different then raise exception 'Target table % is not empty; refusing overwrite',tab; end if;
   if jsonb_typeof(payload->tab) is distinct from 'array' then
    raise exception 'Required table % absent from export',tab; end if;
  end loop;
  if exists(select 1 from public.source_snapshots) then raise exception 'Unexpected target snapshots';end if;
  foreach tab in array tables loop
   execute format('alter table public.%I disable trigger user',tab);
  end loop;
  foreach tab in array tables loop
   execute format('insert into public.%I overriding system value select * from jsonb_populate_recordset(null::public.%I,$1)',tab,tab)
    using payload->tab;
  end loop;
  foreach tab in array tables loop
   execute format('alter table public.%I enable trigger user',tab);
  end loop;
 end if;
 -- Compare every stored field, including nulls, actor IDs, approvals and evidence.
 -- SQL record conversion normalizes decimal JSON strings and timestamp formatting.
 foreach tab in array tables loop
  execute format('select exists(
   (select to_jsonb(t) from public.%1$I t except all
    select to_jsonb(e) from jsonb_populate_recordset(null::public.%1$I,$1) e)
   union all
   (select to_jsonb(e) from jsonb_populate_recordset(null::public.%1$I,$1) e except all
    select to_jsonb(t) from public.%1$I t))',tab)
   into different using payload->tab;
  if different then raise exception 'Restored table % differs from export',tab; end if;
 end loop;
 if not existing then
  perform setval(pg_get_serial_sequence('public.audit_history','audit_id'),
   (select max(audit_id) from public.audit_history),true);
  insert into private.import_batches(batch_id,metadata,seed_audit) values(batch,
   jsonb_build_object('original_sha256','a8857913112977a4e9fa87bb33c4c4a079cc105dd849e67e1c5f54a56a161cc6',
    'exported_at',payload->>'exported_at','missing_tables',jsonb_build_array('source_snapshots'),
    'missing_history_waived_by_owner',true,'owner_instruction','no need to preserve history proceed',
    'supplied_history_preserved',true,'method','atomic checked restoration; no new approvals'),
   '{}'::jsonb);
 end if;
end $restore$;
commit;
