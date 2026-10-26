// Real API + authenticated admin HTTP proof, persisted in a fresh private PostgreSQL directory.
// No synthetic opportunities, existing user database changes or publication actions.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import request from 'supertest';
import {openLocal,migrate,root} from '../server/database.js';
import {importSeed} from '../server/import.js';
import {createLocalAdmin} from '../server/auth.js';
import {createApp} from '../server/app.js';
import {localStore,runDiscovery} from '../discovery/runner.js';
import type {Candidate} from '../discovery/connectors/types.js';

const imageMode=process.argv.includes('--images');
const started=new Date().toISOString(),stamp=started.replace(/[:.]/g,'-');
const folder=path.join(root,'.local','discovery-validation-'+stamp);await mkdir(folder,{recursive:true,mode:0o700});
const db=await openLocal(path.join(folder,'pgdata'));
try{
 await migrate(db);await importSeed(db);
 const password=randomBytes(32).toString('hex'),email='discovery-validation@example.test';await createLocalAdmin(db,email,password);
 const app=createApp(db),agent=request.agent(app);
 assert.equal((await request(app).post('/api/admin/discovery/run').send({})).status,401);
 assert.equal((await agent.post('/api/auth/login').send({email,password})).status,200);
 const source=(await agent.get('/api/admin/rows/sources')).body.records.find((s:any)=>s.source_id==='W-001');
 const enabled=await agent.post('/api/admin/rpc/save_source').send({id:source.source_id,revision:source.revision,patch:{enabled:true,connector_key:'paris-open-data',legal_reviewed_at:started,legal_review_note:'Activation QA: documented Ville de Paris public API and ODbL source reviewed for private discovery; no original-organizer verification or publication.'}});assert.equal(enabled.status,200);
 const run=async()=>{const response=await agent.post('/api/admin/discovery/run').send({});assert.equal(response.status,200);return response.body;};
 const first=await run();assert.equal(first.summary.failed,0,'Live source failed; inspect execution log');assert.equal(first.summary.successful,1);
 const snapshots=(await db.query<{payload:Candidate}>('select payload from public.source_snapshots where source_id=$1',['W-001'])).rows.map(s=>s.payload);
 // Replay of captured LIVE records demonstrates exact idempotence separately from a fresh API read.
 const replay=await runDiscovery(localStore(db),{force:true,connectorCheck:async()=>({items:snapshots,missing_ids:[],coverage:{note:'Exact replay of captured live observations; no synthetic records or additional HTTP retrieval',requests:0,sample_limit:60,complete_catalog:false,returned:snapshots.length,newly_relevant:snapshots.filter(s=>s.relevant&&s.lifecycle_status==='active').length}})});
 assert.equal(replay.summary.created,0);assert.equal(replay.summary.changed,0);
 const secondLive=await run();assert.equal(secondLive.summary.failed,0);
 const queue=await agent.get('/api/admin/rows/opportunities?group=discovered&approval=pending&limit=200');assert.equal(queue.status,200);
 const candidates=queue.body.records.map((row:any)=>({opportunity_id:row.opportunity_id,title:row.title,source_record_id:row.source_record_id,source_url:row.source_url,booking_url:row.booking_url,event_start_date:row.event_start_date,event_end_date:row.event_end_date,discovered_at:row.discovered_at,source_updated_at:row.source_updated_at,source_published_at:row.source_published_at,verification_status:row.verification_status,approval_status:row.approval_status,published:row.published,quality_flags:row.quality_flags,evidence:row.raw_record?.evidence}));
 assert.ok(candidates.every((row:any)=>row.verification_status==='pending'&&row.approval_status==='pending'&&!row.published));
 const duplicates=(await db.query('select source_id,source_record_id,count(*) from public.opportunities where source_id is not null group by source_id,source_record_id having count(*)>1')).rows;assert.equal(duplicates.length,0);
 const feed=await request(app).get('/api/public/opportunities');assert.equal(feed.body.total,0);
 const status=(await agent.get('/api/admin/discovery/status')).body;
 const runs=(await agent.get('/api/admin/rows/discovery_runs')).body.records;
 const report={version:imageMode?'0.6.3':'0.6.2',started_at:started,completed_at:new Date().toISOString(),execution:'Authenticated admin HTTP route with real public API retrieval; fresh disk-backed PostgreSQL, separate from the existing user database',source:{source_id:'W-001',name:'Ville de Paris / Que Faire à Paris',endpoint:'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records',license:'ODbL 1.0',license_url:'https://opendatacommons.org/licenses/odbl/1-0/'},first_live_run:first,captured_live_replay:replay,second_live_run:secondLive,private_queue_total:queue.body.total,candidates,duplicate_id_groups:duplicates,public_visible:feed.body.total,status,runs,existing_database_writes:0,paid_services_activated:false,cloud_schedule_activated:false};
 await writeFile(path.join(folder,'execution.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
 await writeFile(path.join(root,imageMode?'docs/discovery-image-integration-v063.json':'docs/discovery-activation-v062.json'),JSON.stringify(report,null,2)+'\n');
 const log=[`Inside Access real discovery validation — ${started}`,'Source: W-001 / official Ville de Paris API / ODbL 1.0',`First live HTTP run: ${JSON.stringify(first.summary)}`,`Captured live replay: ${JSON.stringify(replay.summary)}`,`Second live HTTP run: ${JSON.stringify(secondLive.summary)}`,...(imageMode?[`Automatic image processing: ${JSON.stringify(Object.fromEntries(Object.entries(first.images||{}).filter(([k])=>k!=='reports')))}`]:[]),`Private candidates: ${queue.body.total}; duplicate ID groups: ${duplicates.length}; public records: ${feed.body.total}`,...candidates.map((row:any)=>`${row.opportunity_id} | ${row.title}\n  ${row.source_url}\n  Discovered: ${row.discovered_at}; verification: ${row.verification_status}; approval: ${row.approval_status}; published: ${row.published}`),'Existing user database writes: 0; no cloud schedule/paid feature/public deployment activated.'].join('\n');
 await writeFile(path.join(root,imageMode?'docs/discovery-image-integration-v063.log':'docs/discovery-execution-v062.log'),log+'\n');console.log(log);
}finally{await db.close();}
