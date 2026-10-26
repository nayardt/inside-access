import {startBackups} from './backups.js';
import {importImageSnapshot} from './image-import.js';
import {openLocal,migrate,root} from './database.js';
import {importSeed} from './import.js';
import {createApp} from './app.js';
import {createServer} from 'vite';
import express from 'express';
import {startScheduler} from '../discovery/runner.js';
import path from 'node:path';
const cliPortIndex=process.argv.indexOf('--port');
const port=Number(cliPortIndex>=0?process.argv[cliPortIndex+1]:process.env.PORT)||5173;
if(process.env.VITE_DATA_MODE==='supabase'){
 // Hosted frontend development talks directly to Supabase, with no local auth API.
 const vite=await createServer({server:{port:port,host:'0.0.0.0'}});await vite.listen();vite.printUrls();
}else{
 const db=await openLocal();await migrate(db);await importSeed(db);await importImageSnapshot(db);const app=createApp(db);const stopScheduler=startScheduler(db);const stopBackups=startBackups(db);let vite:Awaited<ReturnType<typeof createServer>>|undefined;
 if(process.argv.includes('--production')){app.use(express.static(path.join(root,'dist')));app.get('/{*path}',(_req,res)=>res.sendFile(path.join(root,'dist/index.html')));}
 else {vite=await createServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}
 const server=app.listen(port,'0.0.0.0',()=>console.log('Inside Access local database + application ready on port '+port));
 let stopping=false;for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,async()=>{if(stopping)return;stopping=true;stopScheduler();stopBackups();await vite?.close();server.closeAllConnections();server.close(async()=>{await db.close();process.exit(0);});});
}
