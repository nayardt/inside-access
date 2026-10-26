// Real official-page retrieval through the same authenticated HTTP action as Find images.
// Uses a separate disposable disk-backed database, never the owner's working database.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import request from 'supertest';
import {openLocal,migrate,root} from '../server/database.js';
import {importSeed} from '../server/import.js';
import {createLocalAdmin} from '../server/auth.js';
import {createApp} from '../server/app.js';
const started=new Date().toISOString(),folder=path.join(root,'.local','image-validation-'+started.replace(/[:.]/g,'-'));
await mkdir(folder,{recursive:true,mode:0o700});
const db=await openLocal(path.join(folder,'pgdata'));
try{
 await migrate(db);await importSeed(db);
 const email='image-validation@example.test',password=randomBytes(32).toString('hex');await createLocalAdmin(db,email,password);
 const app=createApp(db),agent=request.agent(app),id='IA-AMS-006';
 const opportunities=(await db.query('select * from public.opportunities order by opportunity_id')).rows;
 assert.equal((await request(app).post('/api/admin/images/enrich').send({id})).status,401);
 assert.equal((await agent.post('/api/auth/login').send({email,password})).status,200);
 const check=async()=>{const response=await agent.post('/api/admin/images/enrich').send({id});assert.equal(response.status,200);assert.equal(response.body.checked,1);return response.body;};
 const first=await check();
 const rows=(await db.query('select * from public.opportunity_images order by image_id')).rows;
 const second=await check();
 assert.equal(second.reports.reduce((n:number,r:any)=>n+(r.inserted||0),0),0);
 assert.deepEqual((await db.query('select * from public.opportunity_images order by image_id')).rows,rows);
 const review=await agent.get('/api/admin/images/'+id);assert.equal(review.status,200);
 assert.ok(review.body.images.every((i:any)=>i.approval_status==='pending'&&i.verification_status==='pending'&&i.rights_status==='unknown'&&i.delivery_permission==='unknown'));
 const feed=await request(app).get('/api/public/opportunities');assert.equal(feed.body.total,0);
 assert.deepEqual((await db.query('select * from public.opportunities order by opportunity_id')).rows,opportunities);
 const report={version:'0.6.3',started_at:started,completed_at:new Date().toISOString(),execution:'Real official-page image retrieval through authenticated Find images HTTP endpoint; separate disk-backed PostgreSQL proof database',opportunity_id:id,first_live_check:first,second_cached_check:second,review_image_rows:review.body.images.length,review_check:review.body.check,identical_image_rows_on_repeat:true,opportunity_rows_unchanged:true,unauthenticated_status:401,public_visible:feed.body.total,existing_database_writes:0,rights_cleared:false};
 await writeFile(path.join(folder,'execution.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
 await writeFile(path.join(root,'docs/image-admin-live-v063.json'),JSON.stringify(report,null,2)+'\n');
 const summary=(r:any)=>JSON.stringify({checked:r.checked,suitable_records:r.suitable_records,suitable_images:r.suitable_images,approved:r.approved,requests:r.requests,cached:r.cached,rows_stored_or_refreshed:r.reports.reduce((n:number,p:any)=>n+(p.inserted||0),0)});
 const log=[`Inside Access authenticated Find images validation — ${started}`,`Opportunity: ${id}`,`First actual source retrieval: ${summary(first)}`,`Second cached HTTP check: ${summary(second)}`,`Private review images: ${review.body.images.length}; repeat image rows identical; opportunity fields unchanged; public records: ${feed.body.total}`,...first.reports.flatMap((r:any)=>r.images.filter((i:any)=>i.quality_status==='suitable').map((i:any)=>`${i.source_page}\n  ${i.image_url}\n  ${i.width}x${i.height}; retrieved ${i.retrieved_at}; rights unknown / approval pending`)),'Owner database writes: 0; no paid feature or public deployment activated.'].join('\n')+'\n';
 await writeFile(path.join(root,'docs/image-admin-live-v063.log'),log);console.log(log);
}finally{await db.close();}
