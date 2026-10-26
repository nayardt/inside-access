-- Image discovery and approval are independent from opportunity publication.
create function private.safe_image_url(v text) returns boolean language sql immutable set search_path='' as $$
 select coalesce(v ~ '^https://([A-Za-z0-9-]+\.)+[A-Za-z]{2,63}(:443)?(/|$)' and v !~ '[[:space:]]' and v !~* '^https://[^/]+\.(localhost|local|internal|lan|home)(:443)?(/|$)' and lower(v) !~ '^https://(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[01])\.|0\.)',false)
$$;
create table public.opportunity_images(
 image_id text primary key,opportunity_id text not null references public.opportunities(opportunity_id),
 image_url text not null check(private.safe_image_url(image_url)),source_page text not null check(private.safe_image_url(source_page)),
 extraction_method text not null,source_title text,alt_text text,attribution text,attribution_required boolean,
 width integer check(width between 1 and 50000),height integer check(height between 1 and 50000),mime_type text,
 retrieved_at timestamptz not null,license_url text,rights_status text not null default 'unknown' check(rights_status in ('unknown','licensed','permission_granted','owned','not_allowed')),
 rights_evidence_url text check(rights_evidence_url is null or private.safe_image_url(rights_evidence_url)),rights_note text,
 delivery_permission text not null default 'unknown' check(delivery_permission in ('unknown','allowed','prohibited')),
 rights_expires_at date,image_expires_at timestamptz,
 quality_status text not null check(quality_status in ('suitable','unknown','rejected')),quality_flags jsonb not null default '[]' check(jsonb_typeof(quality_flags)='array'),
 verification_status text not null default 'pending' check(verification_status in ('pending','verified','rejected')),verification_note text,
 approval_status text not null default 'pending' check(approval_status in ('pending','approved','rejected')),
 approved_at timestamptz,approved_by uuid references auth.users(id),rejection_reason text,evidence jsonb not null default '{}',
 revision integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(opportunity_id,image_url),
 check(approval_status<>'approved' or (verification_status='verified' and quality_status='suitable' and rights_status in ('licensed','permission_granted','owned') and delivery_permission='allowed' and approved_by is not null and approved_at is not null))
);
create unique index one_approved_image on public.opportunity_images(opportunity_id) where approval_status='approved';
create index image_review_queue on public.opportunity_images(opportunity_id,approval_status);
create table public.image_enrichment_checks(
 opportunity_id text primary key references public.opportunities(opportunity_id),checked_at timestamptz not null,
 status text not null check(status in ('found','no_suitable','blocked','failed')),report jsonb not null
);
create table public.image_fetch_cache(
 cache_key text primary key,kind text not null check(kind in ('page','robots','image')),url text not null,
 checked_at timestamptz not null default now(),payload jsonb not null
);
alter table public.opportunity_images enable row level security;
alter table public.image_enrichment_checks enable row level security;
alter table public.image_fetch_cache enable row level security;
revoke all on public.opportunity_images,public.image_enrichment_checks,public.image_fetch_cache from anon,authenticated;
grant select on public.opportunity_images,public.image_enrichment_checks to authenticated;
create policy admin_read on public.opportunity_images for select to authenticated using((select public.is_admin()));
create policy admin_read on public.image_enrichment_checks for select to authenticated using((select public.is_admin()));

create function private.image_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
  if new.approval_status='approved' then raise exception 'New images must enter private review';end if;
 else
  new.revision:=old.revision+1;new.updated_at:=now();
  if current_setting('inside_access.image_action',true) is distinct from 'review' then
   new.approval_status:='pending';new.approved_by:=null;new.approved_at:=null;
  end if;
 end if;return new;
end $$;
create trigger guard_images before insert or update on public.opportunity_images for each row execute function private.image_guard();
create function private.audit_image() returns trigger language plpgsql security definer set search_path='' as $$
declare a jsonb:=to_jsonb(new);b jsonb;d jsonb;email text;begin
 if tg_op='UPDATE' then b:=to_jsonb(old);end if;
 select jsonb_object_agg(k,jsonb_build_object('from',b->k,'to',a->k)) into d from jsonb_object_keys(a) k where (b is null or a->k is distinct from b->k) and k<>all(array['revision','created_at','updated_at']);
 select u.email into email from auth.users u where u.id=auth.uid();
 insert into public.audit_history(entity_type,entity_id,action,actor_id,actor_kind,before_record,after_record,note,actor_email,verification_status,evidence_sources,changed_fields,context)
 values('opportunity_images',new.image_id,tg_op,auth.uid(),case when auth.uid() is null then 'image_discovery' else 'admin' end,b,a,nullif(current_setting('inside_access.audit_note',true),''),email,new.verification_status,jsonb_build_array(new.source_page,new.image_url),coalesce(d,'{}'),jsonb_build_object('operation',coalesce(nullif(current_setting('inside_access.audit_action',true),''),'image_discovery'),'opportunity_id',new.opportunity_id,'rights_status',new.rights_status));return new;
end $$;
create trigger audit_images after insert or update on public.opportunity_images for each row execute function private.audit_image();

create function public.image_worker_context(p_ids jsonb default null,p_limit integer default 10) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(q)),'[]') from (
  select o.opportunity_id,o.title,o.city,o.event_start_date,o.event_end_date,o.source_url,o.booking_url,o.additional_source_urls,o.raw_record,o.origin_group
  from public.opportunities o left join public.image_enrichment_checks c using(opportunity_id)
  where (p_ids is not null and o.opportunity_id in(select jsonb_array_elements_text(p_ids))) or (p_ids is null and o.origin_group='discovered' and c.opportunity_id is null)
  order by o.opportunity_id limit least(greatest(p_limit,1),30)
 )q
$$;
create function public.image_cache_read(p_key text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('checked_at',checked_at,'payload',payload) from public.image_fetch_cache where cache_key=p_key
$$;
create function public.image_cache_write(p_key text,p_kind text,p_url text,p_payload jsonb) returns void language plpgsql security definer set search_path='' as $$begin
 if octet_length(p_payload::text)>150000 then raise exception 'Image metadata cache too large';end if;
 insert into public.image_fetch_cache(cache_key,kind,url,payload) values(p_key,p_kind,p_url,p_payload) on conflict(cache_key) do update set checked_at=now(),payload=excluded.payload;
end $$;
create function public.record_image_enrichment(p_id text,p_report jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare i jsonb;n integer:=0;begin
 if jsonb_typeof(p_report->'images')<>'array' or jsonb_array_length(p_report->'images')>12 then raise exception 'Image batch must contain at most 12 records';end if;
 perform set_config('inside_access.image_action','edit',true);perform set_config('inside_access.audit_action','image_discovery',true);
 for i in select value from jsonb_array_elements(p_report->'images') loop
  insert into public.opportunity_images(image_id,opportunity_id,image_url,source_page,extraction_method,source_title,alt_text,attribution,width,height,mime_type,retrieved_at,license_url,image_expires_at,quality_status,quality_flags,evidence)
  values('IM-'||md5(p_id||':'||(i->>'image_url')),p_id,i->>'image_url',i->>'source_page',i->>'extraction_method',i->>'source_title',i->>'alt_text',i->>'attribution',(i->>'width')::integer,(i->>'height')::integer,i->>'mime_type',(i->>'retrieved_at')::timestamptz,i->>'license_url',(i->>'image_expires_at')::timestamptz,i->>'quality_status',coalesce(i->'quality_flags','[]'),coalesce(i->'evidence','{}')) on conflict(opportunity_id,image_url) do update set
   width=excluded.width,height=excluded.height,mime_type=excluded.mime_type,image_expires_at=coalesce(excluded.image_expires_at,public.opportunity_images.image_expires_at),retrieved_at=excluded.retrieved_at,evidence=excluded.evidence,quality_status=excluded.quality_status,quality_flags=excluded.quality_flags,
   verification_status='pending',rights_status='unknown',delivery_permission='unknown'
  where public.opportunity_images.approval_status<>'rejected'
   and ((public.opportunity_images.evidence#>>'{image_probe,header_fingerprint}' is not null and excluded.evidence#>>'{image_probe,header_fingerprint}' is not null
   and public.opportunity_images.evidence#>>'{image_probe,header_fingerprint}' is distinct from excluded.evidence#>>'{image_probe,header_fingerprint}')
   or (excluded.image_expires_at is not null and public.opportunity_images.image_expires_at is distinct from excluded.image_expires_at)
   or (excluded.quality_status='rejected' and public.opportunity_images.quality_status<>'rejected')
   or (public.opportunity_images.approval_status='pending' and public.opportunity_images.verification_status='pending' and public.opportunity_images.rights_status='unknown'
   and (public.opportunity_images.quality_status,public.opportunity_images.quality_flags) is distinct from (excluded.quality_status,excluded.quality_flags)));
  if found then n:=n+1;end if;
 end loop;
 insert into public.image_enrichment_checks(opportunity_id,checked_at,status,report) values(p_id,(p_report->>'checked_at')::timestamptz,p_report->>'status',p_report-'images') on conflict(opportunity_id) do update set checked_at=excluded.checked_at,status=excluded.status,report=excluded.report;
 return jsonb_build_object('inserted',n);
end $$;
revoke all on function public.image_worker_context(jsonb,integer),public.image_cache_read(text),public.image_cache_write(text,text,text,jsonb),public.record_image_enrichment(text,jsonb) from public,anon,authenticated;
grant execute on function public.image_worker_context(jsonb,integer),public.image_cache_read(text),public.image_cache_write(text,text,text,jsonb),public.record_image_enrichment(text,jsonb) to service_role;
create function public.image_worker_stats(p_ids jsonb) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('images',count(*),'approved',count(*) filter(where approval_status='approved' and verification_status='verified' and rights_status in ('licensed','permission_granted','owned') and delivery_permission='allowed' and (rights_expires_at is null or rights_expires_at>=current_date) and (image_expires_at is null or image_expires_at>=now())))
 from public.opportunity_images where opportunity_id in(select jsonb_array_elements_text(p_ids))
$$;
revoke all on function public.image_worker_stats(jsonb) from public,anon,authenticated;
grant execute on function public.image_worker_stats(jsonb) to service_role;

create function public.admin_images(p_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 return jsonb_build_object('images',coalesce((select jsonb_agg(to_jsonb(i) order by case i.approval_status when 'approved' then 0 when 'pending' then 1 else 2 end,case i.quality_status when 'suitable' then 0 when 'unknown' then 1 else 2 end,case i.extraction_method when 'json_ld_event' then 0 when 'official_api' then 1 when 'open_graph' then 2 else 3 end,i.created_at desc) from public.opportunity_images i where opportunity_id=p_id),'[]'),'check',(select to_jsonb(c) from public.image_enrichment_checks c where opportunity_id=p_id));
end $$;
create function public.save_image(p_id text,p_patch jsonb,p_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.opportunity_images;n public.opportunity_images;k text;begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 select * into o from public.opportunity_images where image_id=p_id for update;if not found then raise exception 'Image not found';end if;
 if o.revision<>p_revision then raise exception 'Image changed; reload before saving' using errcode='40001';end if;
 for k in select jsonb_object_keys(p_patch) loop
  if not k=any(array['alt_text','attribution','attribution_required','width','height','license_url','rights_status','rights_evidence_url','rights_note','delivery_permission','rights_expires_at','verification_status','verification_note']) then raise exception 'Protected image field: %',k;end if;
 end loop;
 select * into n from jsonb_populate_record(o,p_patch);
 if n.verification_status='verified' and o.quality_flags ? 'event_match_not_established' and length(trim(coalesce(n.verification_note,'')))<10 then raise exception 'Explain the manual event-image match review (at least 10 characters)';end if;
 perform set_config('inside_access.image_action','edit',true);perform set_config('inside_access.audit_action','image_metadata',true);
 update public.opportunity_images set alt_text=n.alt_text,attribution=n.attribution,attribution_required=n.attribution_required,width=n.width,height=n.height,license_url=n.license_url,rights_status=n.rights_status,rights_evidence_url=n.rights_evidence_url,rights_note=n.rights_note,delivery_permission=n.delivery_permission,rights_expires_at=n.rights_expires_at,verification_status=n.verification_status,verification_note=n.verification_note,
 quality_status=case when (o.quality_status='unknown' or (o.quality_flags ? 'event_match_not_established' and o.quality_flags <@ '["event_match_not_established","dimensions_unknown","image_fetch_not_verified"]'::jsonb)) and n.verification_status='verified' and n.width>=640 and n.height>=360 and coalesce(n.width,0)*coalesce(n.height,0)>=230400 then 'suitable' else o.quality_status end
 where image_id=p_id returning * into o;return to_jsonb(o);
end $$;
create function public.add_manual_image(p_opportunity_id text,p_record jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.opportunity_images;begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 perform set_config('inside_access.audit_action','manual_image',true);
 insert into public.opportunity_images(image_id,opportunity_id,image_url,source_page,extraction_method,alt_text,width,height,retrieved_at,quality_status,evidence)
 values('IM-'||md5(p_opportunity_id||':'||(p_record->>'image_url')),p_opportunity_id,p_record->>'image_url',p_record->>'source_page','manual',p_record->>'alt_text',(p_record->>'width')::integer,(p_record->>'height')::integer,now(),'unknown',jsonb_build_object('method','Administrator supplied URL; not automatically source/rights verified')) on conflict(opportunity_id,image_url) do nothing;
 select * into o from public.opportunity_images where opportunity_id=p_opportunity_id and image_url=p_record->>'image_url';return to_jsonb(o);
end $$;
create function public.review_image(p_id text,p_revision integer,p_action text,p_reason text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.opportunity_images;begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 select * into o from public.opportunity_images where image_id=p_id;if not found then raise exception 'Image not found';end if;
 -- Always lock the opportunity before its images, matching the listing-edit trigger.
 perform 1 from public.opportunities where opportunity_id=o.opportunity_id for update;
 select * into o from public.opportunity_images where image_id=p_id for update;
 if o.revision<>p_revision then raise exception 'Image changed; reload before saving' using errcode='40001';end if;
 if p_action='approve' then
  if o.verification_status<>'verified' then raise exception 'Verify that the image matches this specific event';end if;
  if o.quality_status<>'suitable' or o.width is null or o.height is null or o.width<640 or o.height<360 then raise exception 'A suitable image with confirmed dimensions of at least 640 × 360 is required';end if;
  if o.rights_status not in ('licensed','permission_granted','owned') or nullif(trim(o.rights_evidence_url),'') is null or length(trim(coalesce(o.rights_note,'')))<10 then raise exception 'Clear reuse rights with an evidence URL and explanation';end if;
  if o.delivery_permission<>'allowed' then raise exception 'Confirm permission for the chosen image delivery / hotlinking method';end if;
  if o.attribution_required is null or (o.attribution_required and nullif(trim(o.attribution),'') is null) then raise exception 'Confirm attribution requirements and supply the required credit';end if;
  if length(trim(coalesce(o.alt_text,'')))<3 then raise exception 'Add meaningful image alt text';end if;
  if o.rights_expires_at<current_date or o.image_expires_at<now() then raise exception 'Image or reuse permission has expired';end if;
 elsif p_action='reject' then
  if length(trim(coalesce(p_reason,'')))<10 then raise exception 'An image rejection reason of at least 10 characters is required';end if;
 elsif p_action<>'withdraw' then raise exception 'Unsupported image review action';end if;
 perform set_config('inside_access.image_action','review',true);perform set_config('inside_access.audit_action','image_'||p_action,true);perform set_config('inside_access.audit_note',coalesce(p_reason,''),true);
 if p_action='approve' then
  update public.opportunity_images set approval_status='pending',approved_at=null,approved_by=null where opportunity_id=o.opportunity_id and approval_status='approved' and image_id<>p_id;
 end if;
 update public.opportunity_images set approval_status=case p_action when 'approve' then 'approved' when 'reject' then 'rejected' else 'pending' end,
 verification_status=case when p_action='reject' then 'rejected' else verification_status end,rejection_reason=case when p_action='reject' then trim(p_reason) else null end,
 approved_at=case when p_action='approve' then now() else null end,approved_by=case when p_action='approve' then auth.uid() else null end
 where image_id=p_id returning * into o;return to_jsonb(o);
end $$;
revoke all on function public.admin_images(text),public.save_image(text,jsonb,integer),public.add_manual_image(text,jsonb),public.review_image(text,integer,text,text) from public,anon,service_role;
grant execute on function public.admin_images(text),public.save_image(text,jsonb,integer),public.add_manual_image(text,jsonb),public.review_image(text,integer,text,text) to authenticated;

create function public.display_image(p_id text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('image_url',i.image_url,'alt_text',i.alt_text,'width',i.width,'height',i.height,'attribution',case when i.attribution_required then i.attribution else null end,'source_page',i.source_page,'license_url',i.license_url)
 from public.opportunity_images i join public.opportunities o using(opportunity_id)
 where i.opportunity_id=p_id and i.approval_status='approved' and i.verification_status='verified' and i.quality_status='suitable' and i.rights_status in ('licensed','permission_granted','owned') and i.delivery_permission='allowed'
 and (i.rights_expires_at is null or i.rights_expires_at>=current_date) and (i.image_expires_at is null or i.image_expires_at>=now())
 and (public.is_admin() or (o.published and o.approval_status='approved' and public.opportunity_ready(o)))
$$;
create function public.list_display_images(p_ids jsonb) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_object_agg(id,public.display_image(id)),'{}') from (select jsonb_array_elements_text(p_ids) id limit 200)q
$$;
revoke all on function public.display_image(text),public.list_display_images(jsonb) from public;
grant execute on function public.display_image(text),public.list_display_images(jsonb) to anon,authenticated;
alter function public.list_public_opportunities(jsonb) rename to list_public_opportunities_before_images;
revoke all on function public.list_public_opportunities_before_images(jsonb) from public,anon,authenticated;
create function public.list_public_opportunities(p_filters jsonb default '{}') returns jsonb language sql stable security definer set search_path='' as $$
 with base as (select public.list_public_opportunities_before_images(p_filters) b)
 select jsonb_build_object('records',coalesce((select jsonb_agg(r||jsonb_build_object('display_image',public.display_image(r->>'opportunity_id'))) from jsonb_array_elements(b->'records')r),'[]'),'total',b->'total') from base
$$;
revoke all on function public.list_public_opportunities(jsonb) from public;
grant execute on function public.list_public_opportunities(jsonb) to anon,authenticated;

create function private.recheck_images_after_listing_edit() returns trigger language plpgsql security definer set search_path='' as $$begin
 if (new.title,new.source_url,new.booking_url,new.event_start_date,new.event_end_date) is distinct from (old.title,old.source_url,old.booking_url,old.event_start_date,old.event_end_date) then
  perform set_config('inside_access.audit_action','image_context_changed',true);
  update public.opportunity_images set verification_status='pending',approval_status='pending',approved_at=null,approved_by=null where opportunity_id=new.opportunity_id and approval_status='approved';
 end if;return new;end $$;
create trigger recheck_image_context after update on public.opportunities for each row execute function private.recheck_images_after_listing_edit();
