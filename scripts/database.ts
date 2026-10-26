import {importImageSnapshot} from '../server/image-import.js';
import {openLocal,openRemote,migrate,root} from '../server/database.js';
import {importSeed} from '../server/import.js';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const remote=process.argv.includes('--remote'),db=await (remote?openRemote():openLocal());
try{
 const cmd=process.argv[2]||'setup';
 if(['setup','import'].includes(cmd)){
  if(cmd==='setup')await migrate(db,!remote);console.log(await importSeed(db));console.log(await importImageSnapshot(db));
 }else if(cmd==='export'){
  const result:Record<string,unknown>={exported_at:new Date().toISOString()};
  for(const table of ['opportunities','sources','verification_checks','audit_history','discovery_runs','source_snapshots','discovery_changes','opportunity_images','image_enrichment_checks'])result[table]=(await db.query('select * from public.'+table)).rows;
  const dest=path.join(root,'.local/export.json');await mkdir(path.dirname(dest),{recursive:true,mode:0o700});await writeFile(dest,JSON.stringify(result,null,2),{mode:0o600});console.log('Private export written to .local/export.json');
 }else if(cmd==='backup'&&!remote&&db.dumpDataDir){
  const blob=await db.dumpDataDir('none');await writeFile(path.join(root,'.local/database-snapshot.tar'),Buffer.from(await blob.arrayBuffer()),{mode:0o600});console.log('Local PGlite snapshot written to .local/database-snapshot.tar');
 }else throw new Error('Use setup, import, export, or local backup');
}finally{await db.close();}
