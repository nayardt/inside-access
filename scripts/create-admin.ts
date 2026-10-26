import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {openLocal,migrate} from '../server/database.js';
import {createLocalAdmin} from '../server/auth.js';
import {importSeed} from '../server/import.js';
// Run while npm run dev is stopped: the local database is single-process.
const rl=createInterface({input:stdin,output:stdout});
try{
 const email=await rl.question('Administrator email (local only): ');
 stdout.write('Choose password (at least 14 characters; input hidden): ');
 rl.close();if(!stdin.isTTY)throw new Error('Use an interactive terminal to create your administrator');
 const password=await new Promise<string>((resolve,reject)=>{let value='';stdin.setRawMode(true);stdin.resume();const listener=(b:Buffer)=>{for(const c of b.toString()){if(c==='\u0003'){stdin.off('data',listener);stdin.setRawMode(false);reject(new Error('Cancelled'));return;}if(c==='\r'||c==='\n'){stdin.off('data',listener);stdin.setRawMode(false);stdin.pause();stdout.write('\n');resolve(value);return;}if(c==='\u007f')value=value.slice(0,-1);else if(c>=' ')value+=c;}};stdin.on('data',listener);});
 const db=await openLocal();try{await migrate(db);await importSeed(db);await createLocalAdmin(db,email.trim(),password);console.log('Administrator created. Start with npm run dev and open /admin.');}finally{await db.close();}
}finally{rl.close();}
