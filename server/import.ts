import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root, type DB } from './database.js';
import { normalize, hash, type RecordData } from './normalize.js';
export async function loadSeed(){return JSON.parse(await readFile(path.join(root,'data/original/Inside_Access_Database_2026-10-24.json'),'utf8'));}
async function insertRow(db:DB,table:string,row:RecordData){
 const columns=Object.keys(row);for(const c of columns)if(!/^[a-z_]+$/.test(c))throw new Error('Invalid column');
 return db.query(`insert into public.${table}(${columns.join(',')}) values(${columns.map((_,i)=>'$'+(i+1)).join(',')}) on conflict do nothing returning *`,columns.map(c=>(typeof row[c]==='object'&&row[c]!==null)?JSON.stringify(row[c]):row[c]));
}
export async function importSeed(db:DB){
 const seed=await loadSeed();
 if(seed.opportunities.length!==30||seed.pending_review.length!==6||seed.unsuitable.length!==12||seed.watchlist.length!==22)throw new Error('Unexpected seed counts');
 const all=[...seed.opportunities.map((r:RecordData)=>normalize(r,'selected')),...seed.pending_review.map((r:RecordData)=>normalize(r,'pending')),...seed.unsuitable.map((r:RecordData)=>normalize(r,'unsuitable'))];
 if(new Set(all.map(r=>r.opportunity_id)).size!==48)throw new Error('Duplicate IDs in source');
 return db.transaction(async tx=>{
  await tx.query("select set_config('inside_access.actor_kind','import',true)");
  let inserted=0;
  for(const r of seed.watchlist){await insertRow(tx,'sources',{...r,priority:r.priority?Number(r.priority):null,raw_record:r});}
  for(const r of all){
   const result=await insertRow(tx,'opportunities',r);inserted+=result.rows.length;
   // A primary-key match is an idempotent skip; a different-ID fingerprint collision is an error.
   if(!(await tx.query('select opportunity_id from public.opportunities where opportunity_id=$1',[r.opportunity_id])).rows.length)throw new Error('Identity collision for '+r.opportunity_id);
   await insertRow(tx,'verification_checks',{check_id:`seed-2026-10-24:${r.opportunity_id}`,opportunity_id:r.opportunity_id,verified_date:r.last_verified||null,checked_at:null,source_url:r.source_url,status:r.verification_status,confidence:r.verification_confidence||null,evidence_note:r.evidence_note||r.reason||null,limits:r.verification_limits||r.required_action||null,raw_record:r.raw_record});
  }
  await tx.query('insert into private.import_batches(batch_id,metadata,seed_audit) values($1,$2,$3) on conflict do nothing',[hash(seed),JSON.stringify(seed.metadata),JSON.stringify(seed.seed_audit)]);
  return {inserted,counts:{selected:30,pending:6,unsuitable:12,sources:22}};
 });
}
