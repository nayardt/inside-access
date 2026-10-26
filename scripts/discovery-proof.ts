import {writeFile,mkdir} from 'node:fs/promises';
import {openLocal,migrate} from '../server/database.js';
import {importSeed} from '../server/import.js';
import {checkParis} from '../discovery/connectors/paris.js';
import {runDiscovery,localStore} from '../discovery/runner.js';
const batch=await checkParis();const db=await openLocal('memory://');
try{
 await migrate(db);await importSeed(db);
 await db.query("update public.sources set enabled=true,connector_key='paris-open-data',legal_reviewed_at=now(),legal_review_note='Isolated live proof: documented municipal API and ODbL attribution reviewed' where source_id='W-001'");
 const first=await runDiscovery(localStore(db),{force:true,connectorCheck:async()=>batch});
 const repeated=await runDiscovery(localStore(db),{force:true,connectorCheck:async()=>batch});
 const tracked=(await db.query<{external_id:string}>("select external_id from public.source_snapshots where opportunity_id is not null limit 20")).rows.map(x=>x.external_id);
 const recheck=await checkParis(tracked);
 const rechecked=await runDiscovery(localStore(db),{force:true,connectorCheck:async()=>recheck});
 const publicRows=(await db.query<any>("select public.list_public_opportunities('{}') as result")).rows[0].result;
 const report={version:'0.6.0',tested_at:new Date().toISOString(),endpoint:'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records',source:'W-001 — Ville de Paris / Que Faire à Paris',license:'ODbL 1.0',first,repeated,tracked_ids_rechecked:tracked.length,tracked_ids_missing:recheck.missing_ids,rechecked,public_visible:publicRows.total,main_database_writes:0,scheduled_monitoring_activated:false,source_publication_timestamp:'Not supplied by this API; first discovery and source update times are recorded separately.',limits:batch.coverage};
 await mkdir('.local',{recursive:true});await writeFile('docs/discovery-proof-v06.json',JSON.stringify(report,null,2));await writeFile('.local/discovery-observed-v06.json',JSON.stringify({batch,recheck},null,2),{mode:0o600});console.log(JSON.stringify(report,null,2));
}finally{await db.close();}
