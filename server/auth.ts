import { randomBytes, scryptSync, timingSafeEqual, randomUUID, createHash } from 'node:crypto';
import type { DB } from './database.js';
export const tokenHash=(t:string)=>createHash('sha256').update(t).digest('hex');
export async function createLocalAdmin(db:DB,email:string,password:string){
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<14)throw new Error('Valid email and password of at least 14 characters required');
 const salt=randomBytes(16).toString('hex'),hash=scryptSync(password,salt,64).toString('hex');
 return db.transaction(async tx=>{
  const existing=await tx.query<{id:string}>('select id from auth.users where email=$1',[email.toLowerCase()]);const id=existing.rows[0]?.id||randomUUID();
  await tx.query('insert into auth.users(id,email) values($1,$2) on conflict(email) do nothing',[id,email.toLowerCase()]);
  await tx.query('insert into local_auth.credentials(user_id,salt,password_hash) values($1,$2,$3) on conflict(user_id) do update set salt=excluded.salt,password_hash=excluded.password_hash',[id,salt,hash]);
  await tx.query('insert into private.admins(user_id) values($1) on conflict do nothing',[id]);
  await tx.query('delete from local_auth.sessions where user_id=$1',[id]);
  return id;
 });
}
export async function signIn(db:DB,email:string,password:string){
 const r=await db.query<{id:string;salt:string;password_hash:string}>('select u.id,c.salt,c.password_hash from auth.users u join local_auth.credentials c on c.user_id=u.id where u.email=$1',[email.toLowerCase()]);
 const u=r.rows[0];const computed=scryptSync(password,u?.salt||'dummy-salt-for-consistent-check',64);
 if(!u||!timingSafeEqual(computed,Buffer.from(u.password_hash,'hex')))return null;
 const token=randomBytes(32).toString('base64url');
 await db.query("delete from local_auth.sessions where expires_at<now()");
 await db.query("insert into local_auth.sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '8 hours')",[tokenHash(token),u.id]);return {token,userId:u.id};
}
export async function sessionUser(db:DB,cookie:string|undefined){
 const token=(cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ia_session='))?.slice(11);if(!token)return null;
 const r=await db.query<{id:string;email:string}>('select u.id,u.email from local_auth.sessions s join auth.users u on u.id=s.user_id where s.token_hash=$1 and s.expires_at>now()',[tokenHash(token)]);return r.rows[0]||null;
}
