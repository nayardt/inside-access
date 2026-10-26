import {cp,mkdir,readFile,readdir,lstat,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createInterface} from 'node:readline/promises';
import {homedir} from 'node:os';
const excluded=new Set(['.local','.env','.git','node_modules','database','data','reference','MANIFEST.sha256']);
export async function applyUpgrade(source,target,{checkRunning=true}={}){
 source=await (await import('node:fs/promises')).realpath(source);target=await (await import('node:fs/promises')).realpath(target);
 if(source===target||source.startsWith(target+path.sep)||target.startsWith(source+path.sep))throw new Error('Extract the updated package separately from the existing project; source and destination must not overlap.');
 const pkg=JSON.parse(await readFile(path.join(target,'package.json'),'utf8'));if(pkg.name!=='inside-access')throw new Error('The destination is not an Inside Access project.');
 await access(path.join(target,'server/dev.ts'));
 let env='';try{env=await readFile(path.join(target,'.env'),'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
 if(checkRunning){const port=Number(env.match(/^PORT=(\d+)/m)?.[1]||5173);try{const r=await fetch(`http://127.0.0.1:${port}/api/auth/session`,{signal:AbortSignal.timeout(800)});const d=await r.json();if('admin' in d&&'user' in d)throw new Error('Stop the running Inside Access app with Ctrl+C before upgrading.');}catch(e){if(e.message.startsWith('Stop the running'))throw e;}}
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');const backup=target+'-backup-'+stamp;
 await mkdir(backup,{mode:0o700});
 for(const entry of await readdir(target)){if(['node_modules','.git'].includes(entry))continue;await cp(path.join(target,entry),path.join(backup,entry),{recursive:true,dereference:false});}
 for(const entry of await readdir(source)){if(excluded.has(entry)||entry.startsWith('.env.'))continue;const from=path.join(source,entry);if((await lstat(from)).isSymbolicLink())throw new Error('Unexpected symbolic link in upgrade package');await cp(from,path.join(target,entry),{recursive:true,dereference:false});}
 return {target,backup,hosted:/^VITE_DATA_MODE=supabase\s*$/m.test(env)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  let target=process.argv[2];if(!target){if(!process.stdin.isTTY)throw new Error('Usage: node scripts/upgrade.mjs "/absolute/path/to/existing/inside-access". Stop the old app first.');const rl=createInterface({input:process.stdin,output:process.stdout});target=(await rl.question('Stop the old app first. Path to your existing Inside Access folder: ')).trim();rl.close();}target=target.replace(/^['"]|['"]$/g,'').replace(/\\(.)/g,'$1');if(target.startsWith('~/'))target=path.join(homedir(),target.slice(2));if(!target)throw new Error('An existing project folder is required.');
  const source=path.resolve(import.meta.dirname,'..');const result=await applyUpgrade(source,target);
  console.log('Existing project backed up to: '+result.backup);console.log('Your .local database, .env, account and Git configuration were retained.');
  for(const args of [['ci'],...(!result.hosted?[['run','db:setup']]:[]),['run','build']]){const r=spawnSync(process.platform==='win32'?'npm.cmd':'npm',args,{cwd:result.target,stdio:'inherit'});if(r.status!==0)throw new Error('Upgrade files installed, but npm '+args.join(' ')+' failed. Backup is retained; resolve the error before restarting.');}
  const quotedTarget="'"+result.target.replaceAll("'", "'\\''")+"'";
  console.log(result.hosted?'Hosted mode retained. Apply pending migrations to your Supabase project before using the updated version.':'Upgrade complete. Start your existing app with:\ncd '+quotedTarget+' && npm run dev\nThen open http://localhost:5173/admin and use your existing login.');
 }catch(e){console.error('Upgrade stopped: '+e.message);process.exitCode=1;}
}
