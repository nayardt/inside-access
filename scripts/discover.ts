import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {openLocal,migrate,root,type DB} from '../server/database.js';
import {parseParis,checkParis} from '../discovery/connectors/paris.js';
import {runDiscovery,localStore,type Store} from '../discovery/runner.js';
const fixture=process.argv.includes('--fixture'),dry=process.argv.includes('--dry-run'),remote=process.argv.includes('--remote'),force=process.argv.includes('--force');
if(fixture&&!dry)throw new Error('Synthetic fixtures may only be used with --dry-run.');
let db:DB|undefined;
try{
 if(dry){
  const batch=fixture?{items:parseParis(JSON.parse(await readFile(path.join(root,'tests/fixtures/paris.json'),'utf8')),new Date('2026-10-24T12:00:00Z'),true),missing_ids:[],coverage:{note:'Synthetic test only'}}:await checkParis();
  const report={mode:fixture?'synthetic fixture':'live API read',run_at:new Date().toISOString(),count:batch.items.length,candidates:batch.items,coverage:batch.coverage};
  await mkdir(path.join(root,'.local'),{recursive:true,mode:0o700});await writeFile(path.join(root,'.local/discovery-dry-run.json'),JSON.stringify(report,null,2),{mode:0o600});console.log({mode:report.mode,observed:report.count,relevant:report.candidates.filter(c=>c.relevant&&c.lifecycle_status==='active').length,writes:0,coverage:report.coverage});
 }else{
  if(remote&&process.env.DISCOVERY_ENABLED!=='true'){console.log('Hosted discovery disabled. Set DISCOVERY_ENABLED=true only after source/account setup.');process.exit(0);}
  let store:Store;
  if(remote){
   if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Server-only Supabase URL and secret key required');
   const cloud=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
   store={call:async(name,args)=>{const {data,error}=await cloud.rpc(name,args);if(error)throw error;return data;},sources:async()=>{const {data,error}=await cloud.from('sources').select('source_id,enabled,connector_key').eq('enabled',true);if(error)throw error;return data||[];}};
  }else{db=await openLocal();await migrate(db);store=localStore(db);}
  const result=await runDiscovery(store,{force});console.log(JSON.stringify(result,null,2));if(result.sources.some(x=>x.status==='failed'))process.exitCode=1;
 }
}catch(e:any){console.error('Discovery failed: '+String(e.message).slice(0,500));process.exitCode=1;}finally{await db?.close();}
