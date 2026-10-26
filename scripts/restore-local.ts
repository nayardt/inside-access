import {PGlite} from '@electric-sql/pglite';
import {access,readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {dbPath,root} from '../server/database.js';
try{await access(dbPath);throw new Error('Database directory already exists. Restore requires a new LOCAL_DB_PATH; nothing was overwritten.');}catch(e:any){if(e.code!=='ENOENT')throw e;}
const source=process.argv[2]||path.join(root,'database/inside-access-initial.tgz');
await mkdir(path.dirname(dbPath),{recursive:true,mode:0o700});
const bytes=new Uint8Array(await readFile(source));
const db=new PGlite(dbPath,{loadDataDir:new Blob([bytes]),parsers:{1082:(v:string)=>v}});
await db.waitReady;const counts=await db.query('select origin_group,count(*)::int as n from public.opportunities group by origin_group order by origin_group');console.log('Restored real PostgreSQL snapshot:',counts.rows);await db.close();
