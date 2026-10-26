-- Read-only operational status. Enabling sources remains an explicit, audited admin action.
create function public.admin_discovery_status() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 return jsonb_build_object(
  'enabled_sources',(select count(*) from public.sources where enabled),
  'ready_sources',(select count(*) from public.sources where enabled and connector_key='paris-open-data' and legal_reviewed_at is not null and nullif(trim(legal_review_note),'') is not null),
  'last_success_at',(select max(completed_at) from public.discovery_runs where status in ('ok','unchanged')),
  'last_run',(select to_jsonb(r) from public.discovery_runs r order by started_at desc,run_id desc limit 1),
  'failed_sources',(select count(*) from public.sources where enabled and last_error is not null),
  'pending_candidates',(select count(*) from public.opportunities where origin_group='discovered' and approval_status='pending'),
  'sources',coalesce((select jsonb_agg(jsonb_build_object('source_id',s.source_id,'source_name',s.source_name,'source_url',s.source_url,'enabled',s.enabled,'connector_key',s.connector_key,'legal_reviewed_at',s.legal_reviewed_at,'legal_review_note',s.legal_review_note,'revision',s.revision,'last_checked_at',s.last_checked_at,'next_check_at',s.next_check_at,'last_error',s.last_error,'coverage_note',s.coverage_note,'last_success_at',(select max(r.completed_at) from public.discovery_runs r where r.source_id=s.source_id and r.status in ('ok','unchanged'))) order by s.source_id) from public.sources s),'[]'::jsonb));
end $$;
revoke all on function public.admin_discovery_status() from public,anon,service_role;
grant execute on function public.admin_discovery_status() to authenticated;
