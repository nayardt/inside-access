import {useEffect,useState} from 'react';
import {api,mode} from './api';
import {ActionButton,SafeLink} from './components';
import type {Row} from './types';

const when=(value:unknown)=>value?new Date(String(value)).toLocaleString():'Never';
export function DiscoveryOperations({version,onComplete,onReview}:{version:number;onComplete:()=>void;onReview:()=>void}){
 const [status,setStatus]=useState<Row|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[statusError,setStatusError]=useState(''),[result,setResult]=useState<Row|null>(null),[acknowledged,setAcknowledged]=useState(false),[refresh,setRefresh]=useState(0);
 useEffect(()=>{let live=true;api.discoveryStatus().then(value=>{if(live){setStatus(value);setStatusError('');}}).catch(e=>{if(live)setStatusError(e.message);});return()=>{live=false;};},[version,refresh]);
 const paris=status?.sources?.find((source:Row)=>source.source_id==='W-001');
 const activate=paris&&(!paris.enabled||!paris.legal_reviewed_at||!paris.legal_review_note||paris.connector_key!=='paris-open-data');
 const disabled=busy?'Discovery is running.':!status?'Load discovery status before starting.':mode!=='local'?'Hosted checks run through the private GitHub workflow; use workflow_dispatch for an immediate run.':!status.ready_sources?'Enable the reviewed Paris source below before running discovery.':null;
 async function run(enable=false){
  if(busy)return;setBusy(true);setError('');setResult(null);
  try{
   if(enable){if(!acknowledged||!paris)throw new Error('Review and acknowledge the documented source before enabling it.');await api.change('save_source',paris.source_id,paris.revision,'',{enabled:true,connector_key:'paris-open-data',legal_reviewed_at:new Date().toISOString(),legal_review_note:'Administrator reviewed the linked Ville de Paris public API/ODbL terms for private candidate discovery. Original access verification and publication remain separate.'});}
   setResult(await api.runDiscovery());onComplete();
  }catch(e:any){setError(e.message||'Discovery failed. Check the source settings and retry.');}
  finally{setBusy(false);setRefresh(v=>v+1);}
 }
 const latest=status?.last_run,summary=result?.summary;
 return <section className="pane discovery-operations" aria-label="Discovery operations">
  <div className="secttop"><div><span className="eyebrow">Private source monitoring</span><h3>Run discovery</h3></div><ActionButton primary reason={disabled} onClick={()=>run()}>{busy?'Running discovery…':'Run discovery'}</ActionButton></div>
  <p className="sm">One working connector: Ville de Paris. The other 21 sources are watchlist entries. New records stay unverified and unpublished.</p>
  <dl className="discovery-metrics"><div><dt>Last successful source check</dt><dd>{when(status?.last_success_at)}</dd></div><div><dt>Enabled / ready sources</dt><dd>{status?`${status.enabled_sources} / ${status.ready_sources}`:'Loading…'}</dd></div><div><dt>Sources with errors</dt><dd>{status?.failed_sources??'—'}</dd></div><div><dt>Private candidates awaiting review</dt><dd>{status?.pending_candidates??'—'}</dd></div></dl>
  {activate&&<div className="discovery-activation"><p>Start with the documented municipal API. Review the <SafeLink url="https://opendata.paris.fr/explore/dataset/que-faire-a-paris-/information/">dataset and public API</SafeLink> and <SafeLink url="https://opendatacommons.org/licenses/odbl/1-0/">ODbL terms</SafeLink>. Attribution is retained with each candidate.</p><label className="check"><input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)}/>I reviewed this source for private candidate discovery.</label><ActionButton reason={busy?'Wait for the current check.':mode!=='local'?'Configure the source through the watchlist, then use the hosted workflow.':!acknowledged?'Review and acknowledge the linked source before enabling it.':null} onClick={()=>run(true)}>Enable Paris and run discovery</ActionButton></div>}
  {summary&&<p role="status" className="feedback">{summary.checked} sources checked · {summary.successful} succeeded · {summary.failed} failed · {summary.skipped} skipped · {summary.fetched} source records observed · {summary.created} new private candidates · {summary.changed} existing listings flagged for review. {result.maintenance.expired} expired · {result.maintenance.closed} closed.</p>}
  {result?.images&&<p className="sm">Image discovery: {result.images.error||`${result.images.checked} candidates checked · ${result.images.suitable_images} image candidates · private image review required.`}</p>}
  {result?.sources?.filter((source:Row)=>source.status!=='ok').map((source:Row)=><p key={source.source_id} className={source.status==='failed'?'error':'sm'}>{source.source_id}: {source.error||source.reason||source.status}</p>)}
  {latest&&<p className="sm">Latest source check: {latest.source_id} · {latest.status} · started {when(latest.started_at)} · completed {when(latest.completed_at)} · {latest.fetched_count} observed · {latest.new_count} new · {latest.changed_count} flagged. {latest.error}</p>}
  {status?.sources?.filter((source:Row)=>source.last_error).map((source:Row)=><p className="error" key={source.source_id}>{source.source_id}: {source.last_error}</p>)}
  {(error||statusError)&&<p className="error" role="alert">{error||statusError}</p>}
  <div className="row"><button className="btn small ghost" onClick={onReview}>Review discovered candidates ↗</button><ActionButton reason={busy?'Wait for discovery to finish before refreshing.':null} onClick={()=>setRefresh(v=>v+1)}>Refresh discovery status</ActionButton></div>
  <p className="quietnote">Local checks run once daily while this app and Mac are running. Each check samples the latest 40 Paris records and up to 20 tracked IDs; coverage is limited. Cloud scheduling requires a shared hosted database and private GitHub setup.</p>
 </section>;
}
