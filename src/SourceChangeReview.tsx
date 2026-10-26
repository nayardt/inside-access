import {useState} from 'react';
import {api} from './api';
import {ActionButton} from './components';
import type {Row} from './types';

export function SourceChangeReview({change,loading,onOpen,onChanged}:{change:Row;loading:boolean;onOpen:(row:Row)=>void;onChanged:()=>void}){
 const [reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const waiting=busy||loading?'Wait for the current operation.':null;
 const resolved=change.status!=='pending'?'Change already resolved.':null;
 async function act(action:'open'|'apply'|'dismiss'){
  if(busy||loading)return;
  setBusy(true);setError('');
  try{
   const rows=await api.allRows('opportunities',{query:change.opportunity_id});
   const current=rows.find(row=>row.opportunity_id===change.opportunity_id);
   if(!current)throw new Error('Listing not found. Reload the source changes queue.');
   if(action==='open')onOpen(current);
   else {await api.resolveChange(change.change_id,current.revision,action,reason.trim());setReason('');onChanged();}
  }catch(e:any){setError(e.message||'The change could not be saved. Reload and try again.');}
  finally{setBusy(false);}
 }
 return <div className="source-change-review">
  <ActionButton reason={waiting} onClick={()=>act('open')}>Open listing</ActionButton>
  {change.status==='pending'?<>
   <ActionButton reason={waiting||resolved||(change.change_type==='source_missing'?'Recheck the missing source through Open listing.':null)} onClick={()=>act('apply')}>Apply as unverified draft</ActionButton>
   <details><summary>Dismiss this change</summary>
    <label className="field"><span>Dismissal reason</span><textarea rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explain why this source change should not be applied."/></label>
    <ActionButton reason={waiting||resolved||(reason.trim().length<10?'Enter a dismissal reason (at least 10 characters).':null)} onClick={()=>act('dismiss')}>Dismiss change</ActionButton>
   </details>
   <p className="sm">Applying or dismissing a change never approves, verifies or publishes the listing.</p>
  </>:<p className="sm">{change.status==='dismissed'?'Dismissed':'Applied'} {change.resolved_at&&new Date(change.resolved_at).toLocaleString()}{change.reason&&<> · {change.reason}</>}</p>}
  {error&&<p className="error" role="alert">{error}</p>}
 </div>;
}
