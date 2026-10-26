import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {openLocal,migrate,root} from '../server/database.js';
import {localStore} from '../discovery/runner.js';
import {enrichImages} from '../images/worker.js';
const db=await openLocal();
try{
 const before=(await db.query('select * from public.opportunities order by opportunity_id')).rows;
 await migrate(db);
 const index=process.argv.indexOf('--id'),ids=index>=0?[process.argv[index+1]]:(await db.query<{opportunity_id:string}>("select opportunity_id from public.opportunities where origin_group='selected' order by opportunity_id")).rows.map(row=>row.opportunity_id);
 if(ids.length!==30&&index<0)throw new Error('Expected all 30 selected records');
 const result=await enrichImages(localStore(db),{ids,limit:30});
 const after=(await db.query('select * from public.opportunities order by opportunity_id')).rows;
 if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Image enrichment unexpectedly changed opportunity fields');
 const report={version:'0.6.3',completed_at:new Date().toISOString(),opportunities_unchanged:true,...result};
 await mkdir(path.join(root,'enrichment'),{recursive:true});await mkdir(path.join(root,'docs'),{recursive:true});
 const file=index>=0?path.join(root,'.local/image-enrichment-one.json'):path.join(root,'enrichment/selected-images-v063.json');
 await writeFile(file,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({checked:result.checked,suitable_records:result.suitable_records,suitable_images:result.suitable_images,approved:result.approved,requests:result.requests,cached:result.cached,inserted:result.reports.reduce((n,r)=>n+(r.inserted||0),0),opportunities_unchanged:true},null,2));
 for(const row of result.reports)console.log(row.opportunity_id,row.status,'suitable='+row.images.filter(i=>i.quality_status==='suitable').length,row.pages.filter(p=>p.error).map(p=>p.error).join('; '));
}finally{await db.close();}
