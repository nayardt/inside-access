import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');let env='';try{env=await readFile(path.join(root,'.env'),'utf8');}catch{}
const port=Number(env.match(/^PORT=(\d+)/m)?.[1]||5173),url=`http://localhost:${port}/admin`;
const open=()=>{if(process.platform==='darwin')spawn('open',[url],{stdio:'ignore'});console.log('Open '+url+' in your browser. Keep this window open while using the local app.');};
try{const r=await fetch(`http://127.0.0.1:${port}/api/auth/session`,{signal:AbortSignal.timeout(1000)});const s=await r.json();if('admin'in s&&'user'in s){open();process.exit(0);}}catch{}
const app=spawn(process.execPath,['--env-file-if-exists=.env','--import','tsx','server/dev.ts','--production'],{cwd:root,stdio:'inherit'});
let opened=false;const timer=setInterval(async()=>{if(opened)return;try{const r=await fetch(`http://127.0.0.1:${port}/api/auth/session`,{signal:AbortSignal.timeout(1000)});const s=await r.json();if('admin'in s&&'user'in s){opened=true;clearInterval(timer);open();}}catch{}},1000);timer.unref();app.on('exit',code=>{clearInterval(timer);process.exit(code||0);});for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.kill(signal));
