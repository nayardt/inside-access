import { z } from 'zod';
import { createHash } from 'node:crypto';
export type RecordData=Record<string,any>;
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(x=>!isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x);
const url=z.url().refine(v=>v.startsWith('https://')&&!/[\s]/.test(v));
const rowSchema=z.object({opportunity_id:z.string().min(1),title:z.string().trim().min(1).max(500),origin_group:z.enum(['selected','pending','unsuitable','discovered']),event_start_date:date.nullable().optional(),event_end_date:date.nullable().optional(),application_deadline:date.nullable().optional(),last_verified:date.nullable().optional(),price_amount:z.number().nonnegative().nullable().optional(),price_max:z.number().nonnegative().nullable().optional(),compensation_amount:z.number().nonnegative().nullable().optional(),source_url:url.nullable().optional(),booking_url:url.nullable().optional(),additional_source_urls:z.array(url).optional(),published:z.literal(false),approval_status:z.enum(['pending','rejected'])}).passthrough();
export function normalize(raw:RecordData,origin_group:'selected'|'pending'|'unsuitable'):RecordData{
 const id=raw.opportunity_id||raw.candidate_id||raw.rejection_id;
 const p:RecordData={...raw,opportunity_id:id,origin_group,verification_status:origin_group==='selected'?'verified':origin_group==='pending'?'pending':'unverified',approval_status:origin_group==='unsuitable'?'rejected':'pending',published:false,published_at:null,approved_at:null,approved_by:null,feed_eligible:origin_group==='selected',lifecycle_status:origin_group==='unsuitable'?'rejected':'active',raw_record:raw,fingerprint:'computed-by-database',event_date_claim:raw.event_date||null};
 if(raw.category==='TV studio audiences')p.participation_type='audience';
 else if(raw.category==='Film and TV extras')p.participation_type='casting';
 else if(raw.category==='Red carpets')p.participation_type='fan_pen';
 else if(origin_group==='selected')p.participation_type='other';
 delete p.candidate_id;delete p.rejection_id;delete p.event_date;
 // Missing claimed dates in pending records stay text; never parse them as verified dates.
 return rowSchema.parse(p);
}
export const hash=(x:unknown)=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
