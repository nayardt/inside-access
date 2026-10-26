import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { readFile, mkdir, readdir, writeFile, open, rm } from 'node:fs/promises';
import path from 'node:path';
export interface QueryResult<T = Record<string, unknown>> { rows: T[] }
export interface DB {
 query<T=Record<string,unknown>>(sql:string, params?:unknown[]):Promise<QueryResult<T>>;
 exec(sql:string):Promise<unknown>;
 transaction<T>(fn:(tx:DB)=>Promise<T>):Promise<T>;
 close():Promise<void>;
 dumpDataDir?(compression?:'none'|'gzip'|'auto'):Promise<Blob>;
}
export const root=path.resolve(import.meta.dirname,'..');
export const dbPath=process.env.LOCAL_DB_PATH || path.join(root,'.local/pgdata');
const localLocations=new WeakMap<object,string>();
export function backupDirectory(db:DB){const location=localLocations.get(db);return location&&location!=='memory://'?path.join(path.dirname(location),'operator-backups'):null;}
const activeLocalLocations=new Set<string>();
export async function openLocal(location=dbPath):Promise<DB> {
 let lockPath:string|undefined;
 if(location!=='memory://'){
  location=path.resolve(location);await mkdir(path.dirname(location),{recursive:true,mode:0o700});lockPath=location+'.lock';
  try{const old=JSON.parse(await readFile(lockPath,'utf8'));let alive=old.pid===process.pid?activeLocalLocations.has(location):true;try{if(old.pid!==process.pid)process.kill(old.pid,0);}catch(e:any){if(e.code==='ESRCH')alive=false;}if(alive)throw new Error('Database is already open. Stop npm run dev before running database commands.');await rm(lockPath);}catch(e:any){if(e.code!=='ENOENT')throw e;}
  const lock=await open(lockPath,'wx',0o600);await lock.writeFile(JSON.stringify({pid:process.pid}));await lock.close();activeLocalLocations.add(location);
 }
 try{const db=new PGlite(location,{parsers:{1082:(v:string)=>v}});await db.waitReady;const close=db.close.bind(db);let closed=false;db.close=async()=>{if(closed)return;closed=true;try{await close();}finally{if(lockPath){activeLocalLocations.delete(location);await rm(lockPath,{force:true});}}};localLocations.set(db,location);return db as unknown as DB;}catch(e){if(lockPath){activeLocalLocations.delete(location);await rm(lockPath,{force:true});}throw e;}
}

export async function openRemote():Promise<DB>{
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required for --remote');
 pg.types.setTypeParser(1082,(v:string)=>v);
 const client=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:15000});await client.connect();
 const db:DB={query:async (sql,params)=>client.query(sql,params) as Promise<QueryResult<any>>,exec:sql=>client.query(sql),close:()=>client.end(),transaction:async fn=>{await client.query('begin');try{const v=await fn(db);await client.query('commit');return v;}catch(e){await client.query('rollback');throw e;}}};return db;
}
export async function migrate(db:DB,local=true){
 if(local){const r=await db.query<{exists:boolean}>("select exists(select 1 from pg_namespace where nspname='auth')");if(!r.rows[0].exists)await db.exec(await readFile(path.join(root,'server/local-bootstrap.sql'),'utf8'));}
 await db.exec('create schema if not exists private;create table if not exists private.app_migrations(name text primary key, applied_at timestamptz not null default now());');
 const names=(await readdir(path.join(root,'supabase/migrations'))).filter(x=>/^\d+.*\.sql$/.test(x)).sort();
 const applied=(await db.query<{name:string}>('select name from private.app_migrations')).rows.map(r=>r.name);
 const pending=names.filter(n=>!applied.includes(n));const location=localLocations.get(db);
 if(local&&location&&location!=='memory://'&&applied.length&&pending.length&&db.dumpDataDir){
  const folder=path.join(path.dirname(location),'backups');await mkdir(folder,{recursive:true,mode:0o700});const backup=await db.dumpDataDir('gzip');
  await writeFile(path.join(folder,'before-v06-'+new Date().toISOString().replace(/[:.]/g,'-')+'.tgz'),Buffer.from(await backup.arrayBuffer()),{mode:0o600});
  console.log('Existing database backed up before applying the upgrade.');
 }
 for(const name of names){
  if((await db.query('select name from private.app_migrations where name=$1',[name])).rows.length)continue;
  const sql=await readFile(path.join(root,'supabase/migrations',name),'utf8');
  await db.transaction(async tx=>{await tx.exec(sql);await tx.query('insert into private.app_migrations(name) values($1)',[name]);});
 }
}
export async function asRole<T>(db:DB,role:'anon'|'authenticated'|'service_role',userId:string|null,fn:(tx:DB)=>Promise<T>):Promise<T>{
 return db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[userId||'']);return fn(tx);});
}
export async function rpc<T=unknown>(db:DB,name:string,args:unknown[]=[]):Promise<T>{
 const allowed=['image_worker_stats','image_worker_context','image_cache_read','image_cache_write','record_image_enrichment','admin_images','save_image','add_manual_image','review_image','display_image','list_display_images','is_admin','admin_discovery_status','admin_overview','list_public_opportunities','save_opportunity','save_source','review_opportunity','review_opportunity_v06','get_review_state','ingest_discovery','ingest_discovery_v06','expire_opportunities','discovery_context','claim_discovery_source','fail_discovery_run','resolve_discovery_change'];
 if(!allowed.includes(name))throw new Error('Unsupported RPC');
 const r=await db.query<{result:T}>(`select to_jsonb(public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')})) as result`,args);return r.rows[0].result;
}
