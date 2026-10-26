import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {root,rpc,type DB} from './database.js';
export async function importImageSnapshot(db:DB,provided?:any){
 let data:any=provided;try{if(!data)data=JSON.parse(await readFile(path.join(root,'enrichment/selected-images-v063.json'),'utf8'));}catch(e:any){if(e.code==='ENOENT')return {inserted:0,skipped:0};throw e;}
 let inserted=0,skipped=0;
 for(const report of data.reports||[]){
  if((await db.query('select opportunity_id from public.image_enrichment_checks where opportunity_id=$1',[report.opportunity_id])).rows.length){skipped++;continue;}
  const current=(await db.query<any>('select title,source_url,booking_url,additional_source_urls from public.opportunities where opportunity_id=$1',[report.opportunity_id])).rows[0];
  const links=current?[current.source_url,current.booking_url,...current.additional_source_urls]:[];
  if(!current||current.title!==report.title||!report.source_urls.some((url:string)=>links.includes(url))){skipped++;continue;}
  // Retain live-enrichment dates and unknown rights. Upsert never overwrites an image decision.
  const result=await rpc<any>(db,'record_image_enrichment',[report.opportunity_id,JSON.stringify(report)]);inserted+=result.inserted;
 }
 return {inserted,skipped};
}
