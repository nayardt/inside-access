import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import type {Filters,Page,Row,Session} from './types';
export const mode=import.meta.env.VITE_DATA_MODE||'local';
let supabase:SupabaseClient|null=null;
if(mode==='supabase'){
 const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_ANON_KEY;
 if(url&&key)supabase=createClient(url,key);
}
function cloud(){if(!supabase)throw new Error('Supabase configuration is missing. Set the public URL and publishable key before building.');return supabase;}
async function request<T>(url:string,body?:unknown):Promise<T>{
 const r=await fetch(url,{credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},method:body?'POST':'GET',body:body?JSON.stringify(body):undefined});
 let value;try{value=await r.json();}catch{throw new Error('The local database API is unavailable. Start with npm run dev, or configure Supabase for hosting.');}
 if(!r.ok)throw new Error(value.error||'Request failed');return value;
}
const qs=(f:Filters={})=>new URLSearchParams(Object.entries(f).filter(([,v])=>v!==undefined&&v!=='').map(([k,v])=>[k,String(v)])).toString();
async function cloudRpc<T>(name:string,params:Row={}):Promise<T>{const {data,error}=await cloud().rpc(name,params);if(error)throw new Error(error.message);return (['save_opportunity','save_source','review_opportunity'].includes(name)&&Array.isArray(data)?data[0]:data) as T;}
export const api={
 async backupStatus():Promise<Row>{return mode==='local'?request('/api/admin/system/backup'):{available:false,reason:'Hosted backup status is not connected. The private backup workflow must be configured and restore-tested before moving your database.'};},
 async createBackup():Promise<Row>{return request('/api/admin/system/backup',{});},
 async session():Promise<Session>{
  if(mode==='local')return request('/api/auth/session');
  const {data,error}=await cloud().auth.getUser();if(error||!data.user)return {user:null,admin:false};
  return {user:{id:data.user.id,email:data.user.email},admin:await cloudRpc<boolean>('is_admin')};
 },
 async login(email:string,password:string){if(mode==='local'){await request('/api/auth/login',{email,password});}else{const {error}=await cloud().auth.signInWithPassword({email,password});if(error)throw error;}return api.session();},
 async logout(){if(mode==='local')await request('/api/auth/logout',{});else{const {error}=await cloud().auth.signOut();if(error)throw error;}},
 async publicPage(filters:Filters={}):Promise<Page>{return mode==='local'?request('/api/public/opportunities?'+qs(filters)):cloudRpc('list_public_opportunities',{p_filters:filters});},
 async reviewState(id:string):Promise<Row>{return mode==='local'?request('/api/admin/review-state/'+encodeURIComponent(id)):cloudRpc('get_review_state',{p_id:id});},
 async discoveryStatus():Promise<Row>{return mode==='local'?request('/api/admin/discovery/status'):cloudRpc('admin_discovery_status');},
 async runDiscovery():Promise<Row>{if(mode!=='local')throw new Error('Hosted source checks run through the configured private scheduled workflow.');return request('/api/admin/discovery/run',{});},
 async resolveChange(id:string,revision:number,action:string,reason=''):Promise<Row>{return mode==='local'?request('/api/admin/rpc/resolve_discovery_change',{id,revision,action,note:reason}):cloudRpc('resolve_discovery_change',{p_change_id:id,p_revision:revision,p_action:action,p_reason:reason||null});},
 async images(id:string):Promise<Row>{return mode==='local'?request('/api/admin/images/'+encodeURIComponent(id)):cloudRpc('admin_images',{p_id:id});},
 async enrichImages(id:string):Promise<Row>{if(mode!=='local')throw new Error('Hosted image enrichment runs in the private discovery worker.');return request('/api/admin/images/enrich',{id});},
 async saveImage(id:string,revision:number,patch:Row):Promise<Row>{return mode==='local'?request('/api/admin/images/rpc/save_image',{id,revision,patch}):cloudRpc('save_image',{p_id:id,p_patch:patch,p_revision:revision});},
 async reviewImage(id:string,revision:number,action:string,reason=''):Promise<Row>{return mode==='local'?request('/api/admin/images/rpc/review_image',{id,revision,action,reason}):cloudRpc('review_image',{p_id:id,p_revision:revision,p_action:action,p_reason:reason||null});},
 async addImage(id:string,record:Row):Promise<Row>{return mode==='local'?request('/api/admin/images/rpc/add_manual_image',{id,record}):cloudRpc('add_manual_image',{p_opportunity_id:id,p_record:record});},
 async overview():Promise<Row>{return mode==='local'?request('/api/admin/overview'):cloudRpc('admin_overview');},
 async rows(table:string,filters:Filters={}):Promise<Page>{
  if(mode==='local')return request('/api/admin/rows/'+table+'?'+qs(filters));
  if(!['opportunities','sources','audit_history','verification_checks','discovery_runs','discovery_changes','source_snapshots','opportunity_images','image_enrichment_checks'].includes(table))throw new Error('Invalid table');
  const id=table==='opportunities'?'opportunity_id':table==='sources'?'source_id':table==='source_snapshots'?'source_id':table==='audit_history'?'audit_id':table==='verification_checks'?'recorded_at':table==='discovery_changes'?'detected_at':table==='opportunity_images'?'image_id':table==='image_enrichment_checks'?'checked_at':'started_at';
  let query=cloud().from(table).select('*',{count:'exact'}).order(id,{ascending:!['audit_history','verification_checks','discovery_runs','discovery_changes','source_snapshots','opportunity_images','image_enrichment_checks'].includes(table)});
  if(table==='source_snapshots')query=query.order('external_id',{ascending:true});
  if(table==='discovery_changes'&&filters.status)query=query.eq('status',filters.status);
  for(const [key,col] of Object.entries({city:'city',group:'origin_group',verification:'verification_status',lifecycle:'lifecycle_status',approval:'approval_status'}))if(filters[key])query=query.eq(col,filters[key]);
  if(filters.query){const q=String(filters.query).replace(/[(),.%_"\\]/g,' ');query=query.or(`title.ilike.%${q}%,opportunity_id.ilike.%${q}%,organizer.ilike.%${q}%`);}
  if(filters.attention){const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam'}).format(new Date());query=query.neq('approval_status','rejected').or(`approval_status.eq.pending,verification_status.neq.verified,next_check.lte.${today},event_end_date.lt.${today},event_month.lt.${today.slice(0,7)}`);}
  const offset=Number(filters.offset)||0,limit=Math.min(Number(filters.limit)||100,200);const {data,error,count}=await query.range(offset,offset+limit-1);if(error)throw error;let records:Row[]=data||[];if(table==='opportunities'&&records.length){const images=await cloudRpc<Row>('list_display_images',{p_ids:records.map(row=>row.opportunity_id)});records=records.map(row=>({...row,display_image:images[row.opportunity_id]||null}));}return {records,total:count||0};
 },
 async change(name:'save_opportunity'|'save_source'|'review_opportunity',id:string,revision:number,note:string,patchOrAction:Row|string,override=false):Promise<Row>{
  const fn=name==='review_opportunity'?'review_opportunity_v06':name;
  if(mode==='local')return request('/api/admin/rpc/'+fn,{id,revision,note,override,...(typeof patchOrAction==='string'?{action:patchOrAction}:{patch:patchOrAction})});
  return cloudRpc(fn,{p_id:id,p_revision:revision,p_note:note||null,...(fn==='review_opportunity_v06'?{p_override:override}:{}),...(typeof patchOrAction==='string'?{p_action:patchOrAction}:{p_patch:patchOrAction})});
 },
 async allRows(table:string,filters:Filters={}):Promise<Row[]>{let offset=0,total=1;const all:Row[]=[];while(offset<total){const p=await api.rows(table,{...filters,offset,limit:200});all.push(...p.records);offset+=p.records.length;total=p.total;if(!p.records.length)break;}return all;}
};
