import {PGlite} from '@electric-sql/pglite';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import path from 'node:path';
import {backupDirectory,type DB} from './database.js';
const running=new WeakSet<object>();
export async function backupStatus(db:DB){const folder=backupDirectory(db);if(!folder)return {available:false,reason:'Full database snapshots require a disk-backed local database. Use the private JSON export for a portable copy.'};try{return {available:true,...JSON.parse(await readFile(path.join(folder,'status.json'),'utf8'))};}catch(e:any){if(e.code!=='ENOENT')throw e;return {available:true,last_success_at:null};}}
export async function createBackup(db:DB,actor:{id:string;email?:string}|null=null){
 const folder=backupDirectory(db);if(!folder||!db.dumpDataDir)throw new Error('Full backup is unavailable for this database');
 if(running.has(db))throw new Error('A backup is already running. Refresh System shortly.');running.add(db);
 try{await mkdir(folder,{recursive:true,mode:0o700});const blob=await db.dumpDataDir('gzip'),bytes=Buffer.from(await blob.arrayBuffer());
 const restored=new PGlite('memory://',{loadDataDir:blob});await restored.waitReady;
 try{const tables=(await restored.query<any>("select schemaname,tablename from pg_tables where schemaname in ('public','private','auth','local_auth') order by 1,2")).rows;for(const t of tables)await restored.query(`select count(*) from "${t.schemaname}"."${t.tablename}"`);}finally{await restored.close();}
 const file='inside-access-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID()+'.tgz';await writeFile(path.join(folder,file),bytes,{mode:0o600});
 const result={last_success_at:new Date().toISOString(),file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),restore_checked:true,initiated_by:actor||'automatic daily backup',last_error:null};
 await writeFile(path.join(folder,file+'.metadata.json'),JSON.stringify(result),{mode:0o600});
 await writeFile(path.join(folder,'status.tmp'),JSON.stringify(result),{mode:0o600});await rename(path.join(folder,'status.tmp'),path.join(folder,'status.json'));return result;
 }catch(e:any){const old=await backupStatus(db);await mkdir(folder,{recursive:true,mode:0o700});await writeFile(path.join(folder,'status.json'),JSON.stringify({...old,last_error:String(e.message).slice(0,300)}),{mode:0o600});throw e;}finally{running.delete(db);}
}
export async function backupDownload(db:DB){const s=await backupStatus(db),folder=backupDirectory(db);if(!folder||!s.file||!/^inside-access-[a-zA-Z0-9-]+\.tgz$/.test(s.file))throw new Error('Create a verified backup first');return {file:s.file,bytes:await readFile(path.join(folder,s.file))};}
export function startBackups(db:DB){const tick=async()=>{try{const s=await backupStatus(db);if(s.available&&(!s.last_success_at||Date.now()-Date.parse(s.last_success_at)>86400000))await createBackup(db);}catch(e:any){console.error('Backup needs attention:',e.message);}};void tick();const timer=setInterval(tick,3600000);timer.unref();return()=>clearInterval(timer);}
