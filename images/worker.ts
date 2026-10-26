import {hash} from '../server/normalize.js';
import {extractMetadata,assessImage,type PageMetadata,type ExtractedImage} from './extract.js';
import {fetchRemote,robotsAllowed,validRemoteUrl,imageDimensions,type Transport} from './network.js';
export type ImageStore={call<T=any>(name:string,args:Record<string,unknown>):Promise<T>};
const DAY=86400000;
export type EnrichmentReport={opportunity_id:string;title:string;source_urls:string[];checked_at:string;status:'found'|'no_suitable'|'blocked'|'failed';images:any[];pages:any[];requests:number;cached:number;inserted?:number};
export class ImageRetriever{
 private memory=new Map<string,any>();private blockedHosts=new Set<string>();requests=0;cached=0;
 constructor(private store:ImageStore,private transport:Transport=fetchRemote){}
 private async cachedValue(kind:string,url:string,ttl:number,load:(old:any)=>Promise<any>){
  const key=kind+':'+hash(url);if(this.memory.has(key)){this.cached++;return this.memory.get(key);}
  const old=await this.store.call('image_cache_read',{p_key:key});
  if(old&&(kind!=='page'||old.payload?.parser_version===2||old.payload?.error)&&Date.now()-Date.parse(old.checked_at)<(old.payload?.error?Math.min(ttl,/restriction|disallow|prohibit|Host is not reviewed/.test(old.payload.error)?DAY:600000):ttl)){this.cached++;this.memory.set(key,old.payload);return old.payload;}
  const payload=await load(old?.payload);await this.store.call('image_cache_write',{p_key:key,p_kind:kind,p_url:url,p_payload:payload});this.memory.set(key,payload);return payload;
 }
 private async request(url:string,kind:'page'|'image',headers:Record<string,string>={}){
  const host=validRemoteUrl(url).hostname;if(this.blockedHosts.has(host))throw new Error('Host stopped for this run after an access/rate-limit block');
  this.requests++;const result=await this.transport(url,kind,headers);
  if([401,403,429].includes(result.status)){this.blockedHosts.add(host);throw new Error('Publisher access/rate-limit restriction: HTTP '+result.status);}
  return result;
 }
 async robots(url:string){
  const target=validRemoteUrl(url),robotsUrl=target.origin+'/robots.txt';
  const body=await this.cachedValue('robots',robotsUrl,DAY,async()=>{
   try{const r=await this.request(robotsUrl,'page');if(r.status===404)return {body:'',retrieved_at:new Date().toISOString()};if(r.status!==200)throw new Error('robots.txt HTTP '+r.status);return {body:Buffer.from(r.bytes).toString('utf8').slice(0,100000),retrieved_at:new Date().toISOString()};}
   catch(e:any){return {error:e.message,retrieved_at:new Date().toISOString()};}
  });
  if(body.error)throw new Error('Robots policy could not be cleared: '+body.error);
  if(!robotsAllowed(body.body,target))throw new Error('Publisher robots.txt disallows this path');
 }
 async page(url:string){
  await this.robots(url);
  return this.cachedValue('page',url,DAY,async(old)=>{
   try{const headers:Record<string,string>={};if(old?.parser_version===2&&old?.etag)headers['If-None-Match']=old.etag;if(old?.parser_version===2&&old?.last_modified)headers['If-Modified-Since']=old.last_modified;
    const r=await this.request(url,'page',headers);if(r.status===304&&old?.metadata)return {...old,revalidated_at:new Date().toISOString()};
    if(r.status!==200)throw new Error('Source page HTTP '+r.status);
    if(!/(?:text\/html|application\/xhtml\+xml)/i.test(r.headers['content-type']||''))throw new Error('Source response is not an HTML event page');
    await this.robots(r.url);
    const metadata=extractMetadata(Buffer.from(r.bytes).toString('utf8'),r.url);
    if(/noimageindex|max-image-preview\s*:\s*none/i.test(metadata.robots+','+(r.headers['x-robots-tag']||'')))throw new Error('Publisher metadata prohibits image previews/indexing');
    return {parser_version:2,metadata:{...metadata,truncated:r.truncated},source_page:r.url,retrieved_at:new Date().toISOString(),etag:r.headers.etag||null,last_modified:r.headers['last-modified']||null};
   }catch(e:any){return {error:String(e.message).slice(0,500),retrieved_at:new Date().toISOString()};}
  });
 }
 async probe(url:string){
  return this.cachedValue('image',url,7*DAY,async()=>{
   try{await this.robots(url);const r=await this.request(url,'image',{Range:'bytes=0-262143'});if(![200,206].includes(r.status))throw new Error('Image response HTTP '+r.status);if(/noimageindex|max-image-preview\s*:\s*none/i.test(r.headers['x-robots-tag']||''))throw new Error('Publisher metadata prohibits this image preview/indexing');
    const dimensions=imageDimensions(r.bytes);if(!dimensions)throw new Error('Raster image dimensions could not be verified from the bounded header');
    return {...dimensions,header_fingerprint:hash(r.bytes),etag:r.headers.etag||null,last_modified:r.headers['last-modified']||null,retrieved_at:new Date().toISOString(),bytes_read:r.bytes.length,image_url:r.url};
   }catch(e:any){return {error:String(e.message).slice(0,500),retrieved_at:new Date().toISOString()};}
  });
 }
}

export async function enrichOne(opportunity:any,retriever:ImageRetriever):Promise<EnrichmentReport>{
 const beginRequests=retriever.requests,beginCached=retriever.cached;
 const urls=[...new Set([opportunity.source_url,opportunity.booking_url,...(opportunity.additional_source_urls||[])].filter(Boolean))].slice(0,3) as string[];
 const report:EnrichmentReport={opportunity_id:opportunity.opportunity_id,title:opportunity.title,source_urls:urls,checked_at:new Date().toISOString(),status:'no_suitable',images:[],pages:[],requests:0,cached:0};
 const hints=(opportunity.raw_record?.image_hints||[]) as any[];
 const candidates:{item:ExtractedImage;page:string;retrieved_at:string;robots?:string}[]=[];
 for(const hint of hints.slice(0,2))try{
  const image=validRemoteUrl(hint.image_url).href,page=validRemoteUrl(opportunity.source_url).href;
  candidates.push({item:{image_url:image,extraction_method:'official_api',source_title:opportunity.title,alt_text:hint.alt_text||null,width:null,height:null,attribution:hint.attribution||null,license_url:null,image_expires_at:null,event_name:opportunity.title,event_date:opportunity.event_start_date||null},page,retrieved_at:hint.retrieved_at||new Date().toISOString()});
 }catch{/* Missing/unsafe API hints remain unknown. */}
 for(const source of (candidates.length?[]:urls)){
  try{const page=await retriever.page(source);report.pages.push({url:source,final_url:page.source_page||null,title:page.metadata?.title||null,error:page.error||null,retrieved_at:page.retrieved_at,metadata_truncated:page.metadata?.truncated||false});if(page.error)continue;
   for(const item of (page.metadata as PageMetadata).images)candidates.push({item,page:page.source_page,retrieved_at:page.retrieved_at});
  }catch(e:any){report.pages.push({url:source,error:String(e.message).slice(0,500)});}
 }
 const seen=new Set<string>();let probes=0;
 const rank=(candidate:any)=>{const a=assessImage(candidate.item,opportunity,candidate.page);return (a.quality_status!=='rejected'?100:0)+({'json_ld_event':20,'official_api':20,'inline_event_image':15,'open_graph':10,'twitter_card':8}[candidate.item.extraction_method as string]||0);};
 candidates.sort((a,b)=>rank(b)-rank(a));
 for(const candidate of candidates){
  const {item,page}=candidate;if(seen.has(item.image_url))continue;seen.add(item.image_url);
  const initial=assessImage(item,opportunity,page);let check:any=null;
  if(initial.quality_status!=='rejected'&&probes<3){probes++;check=await retriever.probe(item.image_url);if(!check.error){item.width=check.width;item.height=check.height;}}
  const assessment=assessImage(item,opportunity,page);
  if(check?.error){assessment.quality_flags.push('image_fetch_not_verified');assessment.quality_status='unknown';if(/disallows|prohibits|access\/rate-limit restriction/.test(check.error)){assessment.quality_flags.push('publisher_restriction');assessment.quality_status='rejected';}}
  if(!check&&assessment.quality_status==='suitable'){assessment.quality_status='unknown';assessment.quality_flags.push('image_fetch_not_verified');}
  const {source_description:internalDescription,...retained}=item;
  report.images.push({...retained,source_page:page,image_expires_at:item.image_expires_at&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(item.image_expires_at)&&Number.isFinite(Date.parse(item.image_expires_at))?new Date(item.image_expires_at).toISOString():null,alt_text:item.alt_text||opportunity.title,mime_type:check?.mime_type||null,retrieved_at:candidate.retrieved_at,...assessment,evidence:{page_title:item.source_title,event_name:item.event_name,matched_title_tokens:assessment.event_match_tokens,metadata_method:item.extraction_method,source_retrieved_at:candidate.retrieved_at,image_expiry_claim:item.image_expires_at,image_probe:check,rights:'Unknown: metadata and a public URL do not establish image reuse or hotlinking permission'}});
  if(report.images.length>=12)break;
 }
 report.status=report.images.some(i=>i.quality_status==='suitable')?'found':report.pages.length&&report.pages.every(p=>p.error)?(report.pages.some(p=>/robots|restriction|disallow|prohibit|Host is not reviewed/.test(p.error))?'blocked':'failed'):'no_suitable';
 report.checked_at=new Date().toISOString();report.requests=retriever.requests-beginRequests;report.cached=retriever.cached-beginCached;return report;
}

export async function enrichImages(store:ImageStore,{ids,limit=10,transport}:{ids?:string[];limit?:number;transport?:Transport}={}){
 const opportunities=await store.call<any[]>('image_worker_context',{p_ids:ids||null,p_limit:limit});const retriever=new ImageRetriever(store,transport);const reports:EnrichmentReport[]=[];
 for(const opportunity of opportunities){
  try{const report=await enrichOne(opportunity,retriever);const result=await store.call('record_image_enrichment',{p_id:opportunity.opportunity_id,p_report:report});reports.push({...report,inserted:result.inserted});}
  catch(e:any){const report:EnrichmentReport={opportunity_id:opportunity.opportunity_id,title:opportunity.title,source_urls:[],checked_at:new Date().toISOString(),status:'failed',images:[],pages:[{error:String(e.message).slice(0,500)}],requests:0,cached:0};await store.call('record_image_enrichment',{p_id:opportunity.opportunity_id,p_report:report});reports.push(report);}
 }
 const stats=await store.call('image_worker_stats',{p_ids:reports.map(report=>report.opportunity_id)});
 return {checked:reports.length,suitable_records:reports.filter(r=>r.status==='found').length,suitable_images:reports.flatMap(r=>r.images).filter(i=>i.quality_status==='suitable').length,approved:Number(stats?.approved)||0,requests:retriever.requests,cached:retriever.cached,reports};
}
