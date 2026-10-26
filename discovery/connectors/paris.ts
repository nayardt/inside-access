import {z} from 'zod';
import {hash} from '../../server/normalize.js';
import type {Candidate,Connector,ObservationBatch} from './types.js';
export const PARIS_ENDPOINT='https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records';
const nullableText=z.string().nullish();
const item=z.object({id:z.union([z.string(),z.number()]),title:z.string().min(1),url:z.url(),date_start:nullableText,date_end:nullableText,date_description:nullableText,address_city:nullableText,address_name:nullableText,description:nullableText,lead_text:nullableText,price_type:nullableText,price_detail:nullableText,access_link:nullableText,access_type:nullableText,audience:nullableText,contact_organisation_name:nullableText,contact_organisation:nullableText,updated_at:nullableText,qfap_tags:nullableText}).passthrough();
const response=z.object({total_count:z.number().nonnegative(),results:z.array(item)});
const fold=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function text(v:unknown):string|null{if(typeof v!=='string'||!v.trim())return null;return v.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();}
function url(v:unknown){try{const u=new URL(String(v));return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function date(v:unknown){if(typeof v!=='string'||!v)return null;const d=new Date(v);return isNaN(d.getTime())?null:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris'}).format(d);}
function timestamp(v:unknown){if(typeof v!=='string'||isNaN(Date.parse(v)))return null;return new Date(v).toISOString();}
export function parseParis(data:unknown,now=new Date(),includeInactive=false):Candidate[]{
 return response.parse(data).results.flatMap(r=>{
  if(fold(r.address_city?.trim()||'')!=='paris')return [];
  const start=date(r.date_start),rawEnd=date(r.date_end),today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris'}).format(now),flags:string[]=[];
  let end=rawEnd;if(start&&end&&end<start){flags.push('conflicting_dates');end=null;}
  const source=url(r.url);if(!source)return [];
  const access=text(r.access_type),price=text(r.price_detail)||text(r.price_type),title=text(r.title)!;
  const statusText=fold([access,r.access_link_text,r.price_detail].filter(Boolean).join(' '));
  let lifecycle:Candidate['lifecycle_status']='active',statusEvidence:string|null=null;
  if(/^\s*(?:annule\b|\[annule\]|cancelled\b)/.test(fold(title))){lifecycle='cancelled';statusEvidence=title;}
  else if(/(?:inscriptions? (?:sont )?(?:closes|fermees)|reservations? (?:sont )?closes|applications? closed|booking closed)/.test(statusText)){lifecycle='closed';statusEvidence=[access,r.access_link_text,r.price_detail].join(' ');}
  else if(/\b(?:complet|sold out)\b/.test(statusText)){lifecycle='sold_out';statusEvidence=[access,r.access_link_text,r.price_detail].join(' ');}
  else if((end||start)&&String(end||start)<today){lifecycle='expired';statusEvidence='Published event window ended: '+(end||start);}
  if(!includeInactive&&lifecycle==='expired')return [];
  const summary=text(r.lead_text)||text(r.description),description=text(r.description);
  const scope=fold([title,r.lead_text,r.qfap_tags].join(' '));
  const relevant=/avant.premiere|projection|cinema|cine.club|rencontre.*(?:realis|cineaste|acteur)|tapis rouge|casting|tournage|defile|fashion|createur|pop.up|inauguration|coulisses|studio|nocturne|exceptionnel/.test(scope);
  const category=/casting|tournage/.test(scope)?'Film and TV extras':/defile|fashion|createur/.test(scope)?'Fashion and designer events':/projection|cinema|cine.club|avant.premiere/.test(scope)?'Celebrity and filmmaker appearances':relevant?'Special culture':null;
  const organizer=text(r.contact_organisation_name)||text(r.contact_organisation),eligibility=text(r.audience);
  // access_type='non' is not expanded into an invented admission promise; preserve its wording for review.
  const instructions=access&&access!=='non'?access:null,booking=url(r.access_link);
  if(!start)flags.push('missing_date');if(!organizer)flags.push('missing_organizer');if(!eligibility)flags.push('missing_eligibility');if(!instructions)flags.push('missing_access_instructions');if(!booking)flags.push('missing_booking_route');
  if(!category)flags.push('unclassified');if(!price)flags.push('unknown_price');
  const dateText=text(r.date_description);const statedTime=dateText?.match(/(?:de|a|à)\s*(\d{1,2})h(\d{2})?/i);
  if(statedTime&&timestamp(r.date_start)){const t=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'}).format(new Date(r.date_start!));if(t!==statedTime[1].padStart(2,'0')+':'+(statedTime[2]||'00'))flags.push('conflicting_time');}
  const normalized={external_id:String(r.id),title,city:'Paris',category,event_start_date:start,event_end_date:start?end:null,date_precision:start?(end&&end!==start?'range':'day'):'unknown',timezone:'Europe/Paris',venue:text(r.address_name),description:[...new Set([summary,description].filter(Boolean))].join('\n').slice(0,8000)||null,access_method:null,access_instructions:instructions,eligibility,cost_direction:fold(r.price_type||'')==='gratuit'?'Free':'Unknown',currency:null,price_notes:price,organizer,source_url:source,booking_url:booking,attribution:'Ville de Paris — Que Faire à Paris (participatory listings)',license_url:'https://opendatacommons.org/licenses/odbl/1-0/',lifecycle_status:lifecycle,quality_flags:flags.sort(),relevant};
  // Only normalized event facts influence the hash. Retrieval/update timestamps and HTML formatting do not.
  const cover=url(r.cover_url);
  return [{...normalized,image_hints:cover?[{image_url:cover,alt_text:text(r.cover_alt),attribution:text(r.cover_credit),retrieved_at:now.toISOString()}]:[],content_hash:hash(normalized),source_updated_at:timestamp(r.updated_at),source_published_at:null,evidence:{source_url:source,date_start:r.date_start||null,date_end:r.date_end||null,date_description:dateText,access_type:access,price_detail:price,audience:eligibility,status_evidence:statusEvidence,license:'ODbL 1.0',source_updated_at:timestamp(r.updated_at)}}];
 });
}
const SELECT='id,title,url,date_start,date_end,date_description,address_city,address_name,lead_text,description,price_type,price_detail,access_type,access_link,access_link_text,audience,contact_organisation_name,updated_at,qfap_tags,cover_url,cover_credit,cover_alt';
export async function requestParis(params:Record<string,string>):Promise<unknown>{
 const endpoint=new URL(PARIS_ENDPOINT);for(const [k,v] of Object.entries({select:SELECT,...params}))endpoint.searchParams.set(k,v);
 let last:unknown;
 for(let attempt=0;attempt<2;attempt++){
  try{const r=await fetch(endpoint,{headers:{Accept:'application/json','User-Agent':'InsideAccess/0.6 (bounded municipal API research)'},signal:AbortSignal.timeout(12000),redirect:'error'});
   if(!r.ok){const error=new Error('Paris API HTTP '+r.status);if((r.status===429||r.status>=500)&&!attempt){last=error;await new Promise(resolve=>setTimeout(resolve,1000));continue;}throw error;}
   const reader=r.body!.getReader();let bytes=0;const chunks:Uint8Array[]=[];while(true){const v=await reader.read();if(v.done)break;bytes+=v.value.length;if(bytes>2_000_000){await reader.cancel();throw new Error('Paris API response too large');}chunks.push(v.value);}
   return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }catch(e){last=e;if(attempt===0){await new Promise(resolve=>setTimeout(resolve,1000));continue;}}
 }throw last;
}
export async function checkParis(trackedIds:string[]=[]):Promise<ObservationBatch>{
 const recent=await requestParis({limit:'40',order_by:'updated_at desc',where:'address_city = "Paris"'});
 const items=parseParis(recent,new Date(),true);let missing:string[]=[],requests=1;
 const tracked=[...new Set(trackedIds)].slice(0,20);
 if(tracked.length){
  const where='id in ('+tracked.map(id=>JSON.stringify(id)).join(',')+')';
  const raw=await requestParis({limit:'20',where});requests++;
  const checked=response.parse(raw);const returned=new Set(checked.results.map(x=>String(x.id)));
  missing=tracked.filter(id=>!returned.has(id));items.push(...parseParis(raw,new Date(),true));
 }
 const dedup=[...new Map(items.map(i=>[i.external_id,i])).values()];
 return {items:dedup,missing_ids:missing,coverage:{endpoint:PARIS_ENDPOINT,note:'Latest 40 updated Paris records plus up to 20 rotating tracked-ID checks. Bounded sample; not a complete catalogue or a guaranteed publication-time feed.',requests,sample_limit:60,complete_catalog:false,returned:dedup.length,newly_relevant:dedup.filter(i=>i.relevant&&i.lifecycle_status==='active').length}};
}
export const parisConnector:Connector={key:'paris-open-data',check:checkParis,async fetch(ids){return (await checkParis(ids)).items;}};
