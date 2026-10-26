import {openLocal,migrate,asRole,rpc} from '../server/database.js';
import {importSeed,loadSeed} from '../server/import.js';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {root} from '../server/database.js';
import assert from 'node:assert/strict';
const db=await openLocal('memory://');
try{
 await migrate(db);const a=await importSeed(db),b=await importSeed(db);assert.equal(a.inserted,48);assert.equal(b.inserted,0);
 const seed=await loadSeed(),prototype=JSON.parse(await readFile(path.join(root,'data/prototype-snapshot.json'),'utf8'));
 for(const k of ['opportunities','pending_review','watchlist'])assert.deepEqual(prototype[k],seed[k],k+' differs from v0.4');
 const workbook=JSON.parse(await readFile(path.join(root,'data/workbook-snapshot.json'),'utf8'));
 const checks:Record<string,number>={};
 for(const [sheet,records,id] of [['Opportunities',seed.opportunities,'opportunity_id'],['Pending review',seed.pending_review,'candidate_id'],['Excluded',seed.unsuitable,'rejection_id'],['Watchlist',seed.watchlist,'source_id'],['Seed audit',seed.seed_audit,'seed_id']] as [string,any[],string][]){
  const rows=workbook[sheet] as any[][];const canon=(v:unknown)=>typeof v==='string'?v.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''):'';const headerIndex=rows.findIndex(r=>r.some(v=>canon(v)===id));assert.ok(headerIndex>=0,sheet+' missing key header');const header=rows[headerIndex].map(canon),col=header.indexOf(id),data=rows.slice(headerIndex+1).filter(r=>records.some(o=>o[id]===r[col]));assert.equal(data.length,records.length,sheet+' count mismatch');
  for(const record of records){const wr=data.find(r=>r[col]===record[id]);assert.ok(wr);for(const [k,v] of Object.entries(record)){const idx=header.indexOf(k);if(idx<0)continue;let expected:any=v;if(Array.isArray(v))expected=v.join(' | ');if(expected==='')expected=null;let actual:any=wr[idx]??null;if(typeof expected==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(expected)&&typeof actual==='string')actual=actual.slice(0,10);assert.deepEqual(actual,expected,`${sheet} ${record[id]} ${k}`);}}
  checks[sheet]=data.length;
 }
 assert.deepEqual(await asRole(db,'anon',null,tx=>rpc(tx,'list_public_opportunities',['{}'])),{records:[],total:0});
 console.log(JSON.stringify({status:'PASS',imported:a.inserted,second_import:b.inserted,workbook_reconciled:checks,prototype:'matches seed',public_feed:0},null,2));
}finally{await db.close();}
