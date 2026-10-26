import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
export const IMAGE_BOT='InsideAccessImageBot';
// Explicitly reviewed organizer/ticketing hosts from the original research + Paris connector.
export const pageHosts=new Set(['festival.idfa.nl','www.pan.nl','www.eventpartners9.nl','amsterdamlightfestival.com','bluecirclecasting.nl','eva.avrotros.nl','www.dehallen-amsterdam.nl','www.imaginefilmfestival.nl','whatson.bfi.org.uk','www.bfi.org.uk','www.somersethouse.org.uk','my.somersethouse.org.uk','fashionawards.com','www.fashionawards.com','www.ticketmaster.co.uk','www.sroaudiences.com','www.castingcollective.co.uk','www.applausestore.com','www.miumiu.com','www.paris.fr','www.billetweb.fr','www.parisphoto.com','my.weezevent.com','www.4u-foryou.org','www.nona-source.com','www.eventbrite.fr','www.salon-du-chocolat.com','widget.weezevent.com','www.legrandrex.com','legrandrex.cotecine.fr','www.bluecirclecasting.nl','www.amsterdamlightfestival.com','pan.nl','bfi.org.uk','somersethouse.org.uk','sroaudiences.com','miumiu.com','paris.fr','applausestore.com','castingcollective.co.uk','imaginefilmfestival.nl','nona-source.com','www.avrotros.nl']);
const imageDomains=[...pageHosts,'cdn.paris.fr','cdn.sanity.io','images.ctfassets.net','images.prismic.io','images.squarespace-cdn.com','static.wixstatic.com','image.jimcdn.com','res.cloudinary.com','cdn.shopify.com','images.unsplash.com','static.ticketmaster.co.uk','s1.ticketm.net','media.ticketmaster.co.uk','images.bfi.org.uk','media.bfi.org.uk','optimise2.assets-servd.host','my.idfa.nl','admin.somersethouse.org.uk','www.cmsfiles.com','static.weezevent.com','img.evbuc.com','cdn.prod.website-files.com'];
export function validRemoteUrl(value:unknown):URL{
 const url=new URL(String(value));
 if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')||isIP(url.hostname.replace(/^\[|\]$/g,''))||!url.hostname.includes('.')||/\.(?:localhost|local|internal|lan|home)$/i.test(url.hostname))throw new Error('Only public HTTPS hostnames without credentials or custom ports are allowed');
 return url;
}
export function publicAddress(address:string){
 if(isIP(address)===4){const [a,b]=address.split('.').map(Number);return !(a===0||a===10||a===127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a===192&&b===0||a===198&&(b===18||b===19)||a>=224);}
 if(isIP(address)===6){const a=address.toLowerCase();return a.startsWith('2')||a.startsWith('3');}return false;
}
export function permittedHost(url:URL,kind:'page'|'image'){
 return kind==='page'?(pageHosts.has(url.hostname)||(url.pathname==='/robots.txt'&&imageDomains.some(host=>url.hostname===host))):imageDomains.some(host=>url.hostname===host);
}
export type HttpResult={url:string;status:number;headers:Record<string,string>;bytes:Uint8Array;truncated:boolean};
export type Transport=(url:string,kind:'page'|'image',headers?:Record<string,string>)=>Promise<HttpResult>;
// Fixed reviewed hosts, public DNS checks and revalidated redirects keep this a bounded connector,
// not an arbitrary URL proxy. No authentication, cookies, browser automation or block bypass.
export const fetchRemote:Transport=async(value,kind,headers={})=>{
 let url=validRemoteUrl(value);
 for(let redirects=0;redirects<=3;redirects++){
  if(!permittedHost(url,kind))throw new Error('Host is not reviewed for '+kind+' retrieval: '+url.hostname);
  // An operator-configured outbound proxy resolves hostnames upstream. In direct mode,
  // check local DNS too; the exact hostname allowlist, HTTPS and redirect checks always apply.
  if(!process.env.HTTPS_PROXY&&!process.env.HTTP_PROXY&&!process.env.https_proxy&&!process.env.http_proxy){const resolved=await lookup(url.hostname,{all:true});if(!resolved.length||resolved.some(r=>!publicAddress(r.address)))throw new Error('Source hostname does not resolve exclusively to public addresses');}
  const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'User-Agent':IMAGE_BOT+'/0.6.3 (bounded official-source image metadata review)',Accept:kind==='page'?'text/html,text/plain;q=0.8':'image/avif,image/webp,image/*;q=0.8',...headers}});
  if([301,302,303,307,308].includes(response.status)){
   const target=response.headers.get('location');await response.body?.cancel();if(!target)throw new Error('Redirect lacks a location');url=validRemoteUrl(new URL(target,url).href);continue;
  }
  const limit=kind==='image'?262144:1000000;const reader=response.body?.getReader();const chunks:Uint8Array[]=[];let size=0,truncated=false;
  if(reader)while(true){const next=await reader.read();if(next.done)break;const room=limit-size;chunks.push(next.value.subarray(0,room));size+=Math.min(room,next.value.length);if(size>=limit){truncated=true;await reader.cancel();break;}}
  const bytes=Buffer.concat(chunks);
  return {url:url.href,status:response.status,headers:Object.fromEntries(response.headers),bytes,truncated};
 }throw new Error('Too many source redirects');
};

export function robotsAllowed(body:string,url:URL,agent=IMAGE_BOT){
 const groups:{agents:string[];rules:{allow:boolean;path:string}[]}[]=[];let group={agents:[] as string[],rules:[] as {allow:boolean;path:string}[]};
 for(const raw of body.split(/\r?\n/)){const line=raw.replace(/#.*/,'').trim();const split=line.indexOf(':');if(split<0)continue;const field=line.slice(0,split).trim().toLowerCase(),value=line.slice(split+1).trim();
  if(field==='user-agent'){if(group.rules.length){groups.push(group);group={agents:[],rules:[]};}group.agents.push(value.toLowerCase());}
  else if(['allow','disallow'].includes(field)&&group.agents.length&&value)group.rules.push({allow:field==='allow',path:value});
 }groups.push(group);
 const explicit=groups.filter(g=>g.agents.some(a=>a!=='*'&&agent.toLowerCase().includes(a))),selected=explicit.length?explicit:groups.filter(g=>g.agents.includes('*'));
 const path=url.pathname+url.search;const matches=selected.flatMap(g=>g.rules).filter(rule=>{const regex='^'+rule.path.split('*').map(v=>v.replace(/[.+?^${}()|[\]\\]/g,'\\$&')).join('.*').replace(/\\\$$/,'$');return new RegExp(regex).test(path);}).sort((a,b)=>b.path.length-a.path.length||Number(b.allow)-Number(a.allow));
 return !matches.length||matches[0].allow;
}

export function imageDimensions(bytes:Uint8Array):{width:number;height:number;mime_type:string}|null{
 const b=Buffer.from(bytes);
 if(b.length>=24&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {width:b.readUInt32BE(16),height:b.readUInt32BE(20),mime_type:'image/png'};
 if(b.length>=10&&/^GIF8[79]a$/.test(b.toString('ascii',0,6)))return {width:b.readUInt16LE(6),height:b.readUInt16LE(8),mime_type:'image/gif'};
 if(b.length>=30&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'){
  const type=b.toString('ascii',12,16);if(type==='VP8X')return {width:1+b.readUIntLE(24,3),height:1+b.readUIntLE(27,3),mime_type:'image/webp'};
  if(type==='VP8 '&&b[23]===157&&b[24]===1&&b[25]===42)return {width:b.readUInt16LE(26)&16383,height:b.readUInt16LE(28)&16383,mime_type:'image/webp'};
  if(type==='VP8L'&&b[20]===47){const v=b.readUInt32LE(21);return {width:(v&16383)+1,height:((v>>>14)&16383)+1,mime_type:'image/webp'};}
 }
 if(b[0]===255&&b[1]===216){let at=2;while(at+8<b.length){if(b[at]!==255){at++;continue;}const marker=b[at+1];if(marker===216||marker===217||marker===0){at+=2;continue;}const size=b.readUInt16BE(at+2);if(size<2)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return {width:b.readUInt16BE(at+7),height:b.readUInt16BE(at+5),mime_type:'image/jpeg'};at+=2+size;}}
 return null;
}
