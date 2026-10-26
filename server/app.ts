import {backupStatus,createBackup,backupDownload} from './backups.js';
import express from 'express';
import {enrichImages} from '../images/worker.js';
import {runDiscovery,localStore} from '../discovery/runner.js';
import { asRole,rpc,type DB } from './database.js';
import { signIn,sessionUser,tokenHash } from './auth.js';
const tables=['opportunities','sources','audit_history','verification_checks','discovery_runs','discovery_changes','opportunity_images','image_enrichment_checks'] as const;
export function createApp(db:DB){
 const app=express();app.disable('x-powered-by');
 // Vite is a development server: explicitly deny private source/data paths before its middleware.
 app.use((req,res,next)=>{let pathname=req.path;try{pathname=decodeURIComponent(pathname);}catch{return void res.status(400).end();}
 if(/^\/(?:@fs(?:\/|$)|(?:data|enrichment|images|database|reference|server|scripts|supabase|tests|docs)(?:\/|$)|\.)/i.test(pathname))return void res.status(404).json({error:'Not found'});next();
 });
 app.use(express.json({limit:'200kb'}));
 app.use((req,res,next)=>{res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':process.env.VITE_VISUAL_QA==='true'&&req.path==='/qa.html'?'SAMEORIGIN':'DENY'});next();});
 // Browser writes must originate on this same origin. Never trust supplied identity/role.
 app.use('/api',(req,res,next)=>{
  const origin=req.get('origin');
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&origin){try{if(new URL(origin).host!==req.get('host'))return void res.status(403).json({error:'Cross-origin write rejected'});}catch{return void res.status(403).json({error:'Invalid origin'});}}
  next();
 });
 const attempts=new Map<string,{n:number;until:number}>();
 app.post('/api/auth/login',async(req,res)=>{
  const ip=req.ip||'unknown',a=attempts.get(ip);if(a&&a.until>Date.now()&&a.n>=10)return void res.status(429).json({error:'Too many attempts. Try again in 15 minutes.'});
  const {email,password}=req.body||{};if(typeof email!=='string'||typeof password!=='string'||password.length>256)return void res.status(400).json({error:'Email and password required'});
  const s=await signIn(db,email,password);
  if(!s){attempts.set(ip,{n:(a&&a.until>Date.now()?a.n:0)+1,until:Date.now()+900000});return void res.status(401).json({error:'Invalid credentials'});}
  attempts.delete(ip);res.cookie('ia_session',s.token,{httpOnly:true,sameSite:'strict',secure:req.secure||req.get('x-forwarded-proto')==='https',maxAge:8*3600000,path:'/'});res.json({ok:true});
 });
 app.get('/api/auth/session',async(req,res)=>{
  const user=await sessionUser(db,req.get('cookie'));if(!user)return void res.json({user:null,admin:false});
  const admin=await asRole(db,'authenticated',user.id,tx=>rpc<boolean>(tx,'is_admin'));res.json({user,admin});
 });
 app.post('/api/auth/logout',async(req,res)=>{
  const t=(req.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ia_session='))?.slice(11);
  if(t)await db.query('delete from local_auth.sessions where token_hash=$1',[tokenHash(t)]);res.clearCookie('ia_session',{path:'/'});res.json({ok:true});
 });
 app.get('/api/public/opportunities',async(req,res)=>{
  const filters={query:req.query.query||'',city:req.query.city||'',category:req.query.category||'',experience:req.query.experience||'',cost:req.query.cost||'',when:req.query.when||'',participation:req.query.participation||'',ids:req.query.ids||'',offset:Number(req.query.offset)||0,limit:Number(req.query.limit)||60};
  res.json(await asRole(db,'anon',null,tx=>rpc(tx,'list_public_opportunities',[JSON.stringify(filters)])));
 });
 app.use('/api/admin',async(req,res,next)=>{
  const user=await sessionUser(db,req.get('cookie'));if(!user)return void res.status(401).json({error:'Sign in as an administrator'});
  if(!await asRole(db,'authenticated',user.id,tx=>rpc<boolean>(tx,'is_admin')))return void res.status(403).json({error:'Administrator access required'});
  res.locals.user=user;next();
 });
 app.get('/api/admin/overview',async(_req,res)=>{res.json(await asRole(db,'authenticated',res.locals.user.id,tx=>rpc(tx,'admin_overview')));});
 app.get('/api/admin/rows/:table',async(req,res)=>{
  const table=req.params.table as typeof tables[number];if(!tables.includes(table))return void res.status(404).json({error:'Not found'});
  const limit=Math.min(Math.max(Number(req.query.limit)||100,1),200),offset=Math.max(Number(req.query.offset)||0,0);
  const conditions:string[]=[],params:unknown[]=[];
  function eq(column:string,key:string){if(req.query[key]){params.push(req.query[key]);conditions.push(`${column}=$${params.length}`);}}
  if(table==='opportunities'){
   eq('city','city');eq('origin_group','group');eq('verification_status','verification');eq('lifecycle_status','lifecycle');eq('approval_status','approval');
   if(req.query.query){params.push('%'+String(req.query.query)+'%');conditions.push(`(title ilike $${params.length} or opportunity_id ilike $${params.length} or organizer ilike $${params.length})`);}
   if(req.query.attention==='true')conditions.push("(approval_status<>'rejected' and (approval_status='pending' or next_check<=(now() at time zone 'Europe/Amsterdam')::date or verification_status<>'verified' or not public.opportunity_is_current(opportunities)))");
  }
  if(table==='discovery_changes')eq('status','status');
  // Helpers called by RLS-protected admin queries need execution rights; these grants are in migration 002.
  const where=conditions.length?' where '+conditions.join(' and '):'';
  const order=table==='opportunities'?'opportunity_id':table==='sources'?'source_id':table==='audit_history'?'audit_id desc':table==='verification_checks'?'recorded_at desc':table==='discovery_changes'?'detected_at desc':table==='opportunity_images'?'image_id':table==='image_enrichment_checks'?'checked_at desc':'started_at desc';
  const result=await asRole(db,'authenticated',res.locals.user.id,async tx=>{
   const total=await tx.query<{n:number}>(`select count(*)::int n from public.${table}${where}`,params);
   const rows=await tx.query(`select ${table==='opportunities'?'*,public.display_image(opportunity_id) as display_image':'*'} from public.${table}${where} order by ${order} limit $${params.length+1} offset $${params.length+2}`,[...params,limit,offset]);return {records:rows.rows,total:total.rows[0].n};
  });res.json(result);
 });
 app.get('/api/admin/system/backup',async(_req,res)=>{res.json(await backupStatus(db));});
 app.post('/api/admin/system/backup',async(_req,res)=>{res.json(await createBackup(db,res.locals.user));});
 app.get('/api/admin/system/backup/download',async(_req,res)=>{const b=await backupDownload(db);res.set({'Content-Type':'application/gzip','Content-Disposition':'attachment; filename="'+b.file+'"'});res.send(b.bytes);});
 app.get('/api/admin/images/:id',async(req,res)=>{res.json(await asRole(db,'authenticated',res.locals.user.id,tx=>rpc(tx,'admin_images',[req.params.id])));});
 let imageBusy=false;
 app.post('/api/admin/images/enrich',async(req,res)=>{if(typeof req.body?.id!=='string')return void res.status(400).json({error:'An opportunity ID is required'});if(imageBusy)return void res.status(409).json({error:'An image enrichment check is already running'});imageBusy=true;try{res.json(await enrichImages(localStore(db),{ids:[req.body.id],limit:1}));}finally{imageBusy=false;}});
 app.post('/api/admin/images/rpc/:name',async(req,res)=>{
  const name=req.params.name;if(!['save_image','review_image','add_manual_image'].includes(name))return void res.status(404).json({error:'Unknown image action'});
  const {id,revision,patch,action,reason='',record}=req.body||{};if(typeof id!=='string'||(name!=='add_manual_image'&&!Number.isInteger(revision))||typeof reason!=='string')return void res.status(400).json({error:'Invalid image action'});
  const args=name==='save_image'?[id,JSON.stringify(patch),revision]:name==='review_image'?[id,revision,action,reason]:[id,JSON.stringify(record)];
  res.json(await asRole(db,'authenticated',res.locals.user.id,tx=>rpc(tx,name,args)));
 });
 app.get('/api/admin/review-state/:id',async(req,res)=>{res.json(await asRole(db,'authenticated',res.locals.user.id,tx=>rpc(tx,'get_review_state',[req.params.id])));});
 app.get('/api/admin/discovery/status',async(_req,res)=>{res.json(await asRole(db,'authenticated',res.locals.user.id,tx=>rpc(tx,'admin_discovery_status')));});
 let discoveryBusy=false;
 app.post('/api/admin/discovery/run',async(_req,res)=>{if(discoveryBusy)return void res.status(409).json({error:'A source check is already running'});discoveryBusy=true;try{res.json(await runDiscovery(localStore(db),{force:true}));}finally{discoveryBusy=false;}});
 app.post('/api/admin/rpc/:name',async(req,res)=>{
  const name=String(req.params.name);if(!['save_opportunity','save_source','review_opportunity','review_opportunity_v06','resolve_discovery_change'].includes(name))return void res.status(404).json({error:'Not found'});
  const {id,patch,revision,note='',action,override=false}=req.body||{};if(typeof id!=='string'||!Number.isInteger(revision)||typeof note!=='string'||typeof override!=='boolean')return void res.status(400).json({error:'Invalid change request'});
  const args=name==='review_opportunity_v06'?[id,action,revision,note,override]:name==='review_opportunity'?[id,action,revision,note]:name==='resolve_discovery_change'?[id,revision,action,note]:[id,JSON.stringify(patch),revision,note];
  res.json(await asRole(db,'authenticated',res.locals.user.id,tx=>rpc(tx,name,args)));
 });
 app.use('/api',(_req,res)=>res.status(404).json({error:'Unknown endpoint'}));
 app.use((err:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  const status=err.code==='42501'?403:err.code==='40001'?409:400;
  res.status(status).json({error:err.message?.slice(0,400)||'Request failed'});
 });
 return app;
}
