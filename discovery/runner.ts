import {enrichImages} from '../images/worker.js';
import {randomUUID} from 'node:crypto';
import {connectors} from './index.js';
import {rpc,type DB} from '../server/database.js';
import type {ObservationBatch} from './connectors/types.js';
export interface Store {call<T=any>(name:string,args:Record<string,unknown>):Promise<T>;sources():Promise<any[]>;}
export const localStore=(db:DB):Store=>({call:async(name,args)=>rpc<any>(db,name,Object.values(args).map(v=>typeof v==='object'&&v!==null?JSON.stringify(v):v)),sources:async()=>(await db.query('select source_id,enabled,connector_key,next_check_at from public.sources where enabled order by source_id')).rows});
export async function runDiscovery(store:Store,{force=false,onlySource,connectorCheck}:{force?:boolean;onlySource?:string;connectorCheck?:(ids:string[])=>Promise<ObservationBatch>}={}){
 const started_at=new Date().toISOString();
 const maintenance=await store.call('expire_opportunities',{});const results:any[]=[];
 for(const source of await store.sources()){
  if(onlySource&&source.source_id!==onlySource)continue;
  const connector=connectors[source.connector_key];if(!connector?.check){results.push({source_id:source.source_id,status:'unavailable',reason:'No implemented connector is configured for this source.'});continue;}
  const runId=randomUUID();
  let claimed=false;
  try{
   claimed=await store.call('claim_discovery_source',{p_source_id:source.source_id,p_run_id:runId,p_force:force});
   if(!claimed){results.push({source_id:source.source_id,status:'not_due_or_busy',reason:'Source is not due, has an active check, or is missing its required source review.'});continue;}
   const context=await store.call('discovery_context',{p_source_id:source.source_id});
   const batch=await (connectorCheck||connector.check)(context.tracked.map((x:any)=>x.external_id));
   const counts=await store.call('ingest_discovery_v06',{p_source_id:source.source_id,p_run_id:runId,p_items:batch.items,p_report:{...batch.coverage,connector_key:source.connector_key,retrieved_at:new Date().toISOString(),missing_ids:batch.missing_ids}});
   results.push({source_id:source.source_id,run_id:runId,status:'ok',...counts,coverage:batch.coverage});
  }catch(e:any){const message=String(e.message||e).slice(0,500);let log_error:string|undefined;if(claimed)try{await store.call('fail_discovery_run',{p_source_id:source.source_id,p_run_id:runId,p_error:message});}catch(log:any){log_error=String(log.message||log).slice(0,500);}results.push({source_id:source.source_id,run_id:claimed?runId:null,status:'failed',error:message,...(log_error?{log_error}:{})});}
 }
 const successful=results.filter(result=>result.status==='ok'),failed=results.filter(result=>result.status==='failed');
 let images:any=null;if(successful.length)try{images=await enrichImages(store,{limit:3});}catch(e:any){images={error:String(e.message).slice(0,500)};}
 return {images,started_at,completed_at:new Date().toISOString(),maintenance,sources:results,summary:{checked:successful.length+failed.length,successful:successful.length,failed:failed.length,skipped:results.length-successful.length-failed.length,fetched:successful.reduce((n,r)=>n+r.fetched,0),created:successful.reduce((n,r)=>n+r.created,0),changed:successful.reduce((n,r)=>n+r.changed,0)}};
}
export function startScheduler(db:DB){let busy=false;const tick=async()=>{if(busy)return;busy=true;try{await runDiscovery(localStore(db));}catch(e:any){console.error('Discovery scheduler:',String(e.message).slice(0,200));}finally{busy=false;}};
 const timer=setInterval(tick,60_000);timer.unref();void tick();return()=>clearInterval(timer);
}
