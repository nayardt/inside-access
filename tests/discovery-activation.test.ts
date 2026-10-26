import {beforeAll,afterAll,test,expect,vi} from 'vitest';
import request from 'supertest';
import {openLocal,migrate,asRole,rpc,type DB} from '../server/database.js';
import {createApp} from '../server/app.js';
import {createLocalAdmin} from '../server/auth.js';
import {importSeed} from '../server/import.js';
import {connectors} from '../discovery/index.js';
import {parseParis} from '../discovery/connectors/paris.js';
import {localStore,runDiscovery} from '../discovery/runner.js';
import type {ObservationBatch} from '../discovery/connectors/types.js';
let db:DB,app:ReturnType<typeof createApp>,agent:ReturnType<typeof request.agent>,admin:string;
let raw={id:'activation-synthetic',title:'Synthetic filmmaker studio conversation',url:'https://example.test/event',date_start:'2099-10-30T12:00:00+01:00',date_end:'2099-10-30T14:00:00+01:00',address_city:'Paris',access_type:'Reservation required',access_link:'https://example.test/book',audience:'Adults',contact_organisation_name:'Synthetic venue',price_detail:'Unknown'};
const batch=():ObservationBatch=>({items:parseParis({total_count:1,results:[raw]},new Date(),true),missing_ids:[],coverage:{note:'Synthetic test, never a live finding',requests:1,sample_limit:60,complete_catalog:false,returned:1,newly_relevant:1}});
let check:ReturnType<typeof vi.spyOn>;
const status=async()=>(await agent.get('/api/admin/discovery/status')).body;
const run=async()=>await agent.post('/api/admin/discovery/run').send({});
beforeAll(async()=>{db=await openLocal('memory://');await migrate(db);await importSeed(db);admin=await createLocalAdmin(db,'operations@example.test','Operations-only-test-password!');app=createApp(db);agent=request.agent(app);await agent.post('/api/auth/login').send({email:'operations@example.test',password:'Operations-only-test-password!'});check=vi.spyOn(connectors['paris-open-data'],'check').mockImplementation(async()=>batch());},120000);
afterAll(async()=>{vi.restoreAllMocks();await db.close();});
test('discovery status requires admin membership at HTTP and database layers',async()=>{
 expect((await request(app).get('/api/admin/discovery/status')).status).toBe(401);
 const viewer=await createLocalAdmin(db,'viewer@example.test','Viewer-only-test-password!');await db.query('delete from private.admins where user_id=$1',[viewer]);const other=request.agent(app);await other.post('/api/auth/login').send({email:'viewer@example.test',password:'Viewer-only-test-password!'});
 expect((await other.get('/api/admin/discovery/status')).status).toBe(403);expect((await other.post('/api/admin/discovery/run').send({})).status).toBe(403);
 await expect(asRole(db,'authenticated',viewer,tx=>rpc(tx,'admin_discovery_status'))).rejects.toThrow(/Administrator/);await expect(asRole(db,'anon',null,tx=>rpc(tx,'admin_discovery_status'))).rejects.toThrow(/permission/);
 expect(await status()).toMatchObject({enabled_sources:0,ready_sources:0,last_success_at:null,last_run:null,pending_candidates:0});
});
test('manual runs report zero checked while all sources are disabled',async()=>{const r=await run();expect(r.status).toBe(200);expect(r.body.summary).toMatchObject({checked:0,created:0,changed:0});expect(check).not.toHaveBeenCalled();});
test('reviewed activation and admin execution persist private candidates, evidence, status and repeat deduplication',async()=>{
 const source=(await agent.get('/api/admin/rows/sources')).body.records.find((s:any)=>s.source_id==='W-001');
 const enabled=await agent.post('/api/admin/rpc/save_source').send({id:'W-001',revision:source.revision,patch:{enabled:true,connector_key:'paris-open-data',legal_reviewed_at:new Date().toISOString(),legal_review_note:'Synthetic API-source review for pipeline integration tests'}});expect(enabled.status).toBe(200);
 expect((await run()).body.summary).toMatchObject({checked:1,successful:1,failed:0,fetched:1,created:1});
 const first=await status();expect(first).toMatchObject({enabled_sources:1,ready_sources:1,pending_candidates:1,failed_sources:0});expect(first.last_success_at).toBeTruthy();expect(first.last_run.coverage).toMatchObject({connector_key:'paris-open-data'});expect(first.last_run.coverage.retrieved_at).toBeTruthy();
 const queue=(await agent.get('/api/admin/rows/opportunities?group=discovered&approval=pending')).body;expect(queue.total).toBe(1);expect(queue.records[0]).toMatchObject({published:false,verification_status:'pending',approval_status:'pending',source_url:raw.url});expect(queue.records[0].discovered_at).toBeTruthy();
 expect((await run()).body.summary).toMatchObject({created:0,changed:0});expect((await status()).last_run.status).toBe('unchanged');expect((await request(app).get('/api/public/opportunities')).body.total).toBe(0);
});
test('meaningful changes are counted as review proposals and do not overwrite editorial fields',async()=>{
 raw={...raw,price_detail:'Synthetic new price: €20'};expect((await run()).body.summary.changed).toBe(1);
 const changes=(await agent.get('/api/admin/rows/discovery_changes?status=pending')).body;expect(changes.total).toBe(1);expect(changes.records[0].field_changes.price_notes.to).toBe(raw.price_detail);
 const row=(await agent.get('/api/admin/rows/opportunities?group=discovered')).body.records[0];expect(row.price_notes).toBe('Unknown');expect(row.published).toBe(false);
});
test('failed sources retain their error and prior last-success timestamp',async()=>{
 const before=(await status()).last_success_at;check.mockRejectedValueOnce(new Error('Synthetic retrieval error; not a real source failure'));
 const r=await run();expect(r.body.summary).toMatchObject({checked:1,successful:0,failed:1,created:0});const after=await status();expect(after.last_success_at).toBe(before);expect(after.failed_sources).toBe(1);expect(after.last_run.status).toBe('failed');expect(after.last_run.error).toContain('Synthetic retrieval error');
});
test('scheduled due checks skip a future retry and resume when due',async()=>{
 const calls=check.mock.calls.length;const waiting=await runDiscovery(localStore(db));expect(waiting.summary).toMatchObject({checked:0,skipped:1});expect(check.mock.calls.length).toBe(calls);
 await db.query("update public.sources set next_check_at=now()-interval '1 day' where source_id='W-001'");expect((await runDiscovery(localStore(db))).summary.successful).toBe(1);
});
test('overlapping admin run returns a conflict while the first run completes once',async()=>{
 let release!:(batch:ObservationBatch)=>void;check.mockImplementationOnce(()=>new Promise<ObservationBatch>(resolve=>{release=resolve;}));const first=run();const pending=first.then(r=>r);
 await vi.waitFor(()=>expect(release).toBeTypeOf('function'));expect((await run()).status).toBe(409);release(batch());expect((await pending).status).toBe(200);
});
test('unimplemented enabled connectors are reported as unavailable rather than silently omitted',async()=>{
 const store={call:async()=>({expired:0,closed:0}) as any,sources:async()=>[{source_id:'synthetic-unimplemented',connector_key:'not-implemented',enabled:true}]};const result=await runDiscovery(store);expect(result.summary).toMatchObject({checked:0,skipped:1});expect(result.sources[0]).toMatchObject({status:'unavailable',reason:'No implemented connector is configured for this source.'});
});
