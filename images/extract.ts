import {parse} from 'parse5';
import {validRemoteUrl} from './network.js';
export type ExtractedImage={image_url:string;extraction_method:string;source_title:string|null;source_description?:string|null;alt_text:string|null;width:number|null;height:number|null;attribution:string|null;license_url:string|null;image_expires_at:string|null;event_name:string|null;event_date:string|null};
export type PageMetadata={title:string|null;robots:string;images:ExtractedImage[];truncated?:boolean};
const string=(value:unknown)=>typeof value==='string'?value.trim().slice(0,4000):null;
const number=(value:unknown)=>{const n=Number(typeof value==='object'&&value?((value as any).value):value);return Number.isInteger(n)&&n>0&&n<=50000?n:null;};
function url(value:unknown,base:string){if(typeof value!=='string'||!value.trim()||/^(?:\[object Object\]|undefined|null|false)$/i.test(value.trim()))return null;try{return validRemoteUrl(new URL(String(value),base).href).href;}catch{return null;}}
export function extractMetadata(html:string,source:string):PageMetadata{
 const tree:any=parse(html),metas:{key:string;value:string}[]=[],scripts:string[]=[],titles:string[]=[],inline:any[]=[];
 const walk=(node:any,inContent=false,depth=0)=>{if(depth>500)return;const attrs=Object.fromEntries((node.attrs||[]).map((a:any)=>[a.name.toLowerCase(),a.value]));
  const content=(inContent||['body','article','main'].includes(node.tagName)||attrs.itemprop==='image')&&!['nav','footer','header'].includes(node.tagName);
  if(node.tagName==='meta')metas.push({key:(attrs.property||attrs.name||'').toLowerCase(),value:attrs.content||''});
  if(node.tagName==='script'&&String(attrs.type).toLowerCase()==='application/ld+json')scripts.push((node.childNodes||[]).map((n:any)=>n.value||'').join(''));
  if(node.tagName==='title')titles.push((node.childNodes||[]).map((n:any)=>n.value||'').join(''));
  if(node.tagName==='img'&&content){const variants=[...String(attrs.srcset||attrs['data-srcset']||'').matchAll(/(?:^|,\s*)(\S+)\s+(\d+)w/g)].map(match=>({url:match[1],width:Number(match[2])})).filter(v=>v.width<=3000).sort((a,b)=>b.width-a.width);inline.push({url:variants[0]?.url||attrs['data-src']||attrs.src,alt:attrs.alt||null});}
  for(const child of node.childNodes||[])walk(child,content,depth+1);
 };walk(tree);
 const get=(key:string)=>metas.find(m=>m.key===key)?.value||null;
 const title=string(get('og:title')||get('twitter:title')||titles[0]);const images:ExtractedImage[]=[];
 const add=(value:unknown,method:string,extra:Partial<ExtractedImage>={})=>{const image=url(value,source);if(!image)return;images.push({image_url:image,extraction_method:method,source_title:title,source_description:string(get('og:description')||get('description')),alt_text:null,width:null,height:null,attribution:null,license_url:null,image_expires_at:null,event_name:null,event_date:null,...extra});};
 let og:ExtractedImage|undefined;
 for(const meta of metas){if(['og:image','og:image:url','og:image:secure_url'].includes(meta.key)){add(meta.value,'open_graph');og=images.at(-1);}else if(og&&meta.key.startsWith('og:image:')){const prop=meta.key.slice(9);if(prop==='width'||prop==='height')og[prop]=number(meta.value);if(prop==='alt')og.alt_text=string(meta.value);}}
 for(const meta of metas)if(['twitter:image','twitter:image:src'].includes(meta.key))add(meta.value,'twitter_card',{alt_text:string(get('twitter:image:alt'))});
 const visit=(value:any,depth=0)=>{if(!value||depth>12||typeof value!=='object')return;if(Array.isArray(value)){for(const x of value.slice(0,100))visit(x,depth+1);return;}
  const types=[value['@type']].flat().filter(Boolean),event=types.some((t:any)=>/(?:^|\/)\w*Event$/.test(String(t)));
  if(event){for(const img of [value.image].flat().filter(Boolean)){
   const obj=typeof img==='object'?img:{};add(typeof img==='string'?img:obj.contentUrl||obj.url,'json_ld_event',{event_name:string(value.name),event_date:string(value.startDate),width:number(obj.width),height:number(obj.height),alt_text:string(obj.caption||obj.description),attribution:string(obj.creditText||obj.copyrightNotice||(typeof obj.creator==='string'?obj.creator:obj.creator?.name)),license_url:url(obj.license,source),image_expires_at:string(obj.expires)});
  }}
  if(value['@graph'])visit(value['@graph'],depth+1);if(value.mainEntity)visit(value.mainEntity,depth+1);if(value.itemListElement)visit(value.itemListElement,depth+1);if(value.item)visit(value.item,depth+1);
 };
 for(const script of scripts.slice(0,20)){if(script.length>200000)continue;try{visit(JSON.parse(script));}catch{/* A malformed JSON-LD block is not a reason to invent metadata. */}}
 for(const item of inline.slice(0,40))add(item.url,'inline_event_image',{alt_text:string(item.alt)});
 // Prefer Event-specific metadata over generic social cards for an identical URL.
 const dedup=new Map<string,ExtractedImage>();for(const image of images.sort((a,b)=>Number(b.extraction_method==='json_ld_event')-Number(a.extraction_method==='json_ld_event')))if(!dedup.has(image.image_url))dedup.set(image.image_url,image);
 return {title,robots:metas.filter(m=>['robots','insideaccessimagebot','googlebot'].includes(m.key)).map(m=>m.value).join(','),images:[...dedup.values()].slice(0,36)};
}
const decode=(value:string)=>{try{return decodeURIComponent(value);}catch{return value;}};
const fold=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const stop=new Set('the and with for from public cinema hit talk studio audience club exhibition casting students regular admission screenings screening preview premiere conversation live final optional access paid film team festival event events special exclusive imax bfi london amsterdam paris show tickets guest passer roles background inaugural general de het een en van voor les des une du le la au aux avec et in to on at tv uk q a'.split(' '));
export function assessImage(image:ExtractedImage,opportunity:{title:string;event_start_date?:string|null},source:string,now=new Date()){
 const flags:string[]=[];const bits=fold(decode(image.image_url).replace(/[?].*$/,''));const identity=bits+' '+fold(image.alt_text||'');
 if(/(?:^|[\/_ .-])(?:logo|wordmark|brandmark|favicon|sprite|pixel|tracking|tracker|advert|banner-ad|fallback|placeholder|spacer)(?:[\/_ .-]|$)/.test(identity)||/doubleclick|googlesyndication|facebook.*tr/.test(bits))flags.push('generic_logo_tracking_or_ad');
 if(/\.svg(?:[?&#]|$)/i.test(decode(image.image_url)))flags.push('vector_icon_not_a_verified_raster');
 if(/\[object(?:%20| )object\]/i.test(image.image_url))flags.push('malformed_image_metadata');
 const words=fold(opportunity.title).match(/[a-z0-9]+/g)?.filter(w=>w.length>=3&&!/^20\d{2}$/.test(w)&&!stop.has(w))||[];
 const context=fold([image.event_name,image.source_title,image.source_description,image.alt_text].filter(Boolean).join(' '));
 const imagePath=decode(new URL(image.image_url).pathname);const imageContext=fold([image.alt_text,imagePath].filter(Boolean).join(' '));const hits=[...new Set(words)].filter(word=>new RegExp('(?:^|[^a-z0-9])'+word+'(?:$|[^a-z0-9])').test(image.extraction_method==='inline_event_image'?imageContext:context));
 if(/\/assets\/images\/hero\//.test(bits)&&!words.some(word=>bits.includes(word)))flags.push('generic_site_hero');
 if(!hits.length)flags.push('event_match_not_established');
 if(image.event_date&&opportunity.event_start_date&&image.event_date.slice(0,10)!==opportunity.event_start_date)flags.push('conflicting_event_date');
 const eventYear=opportunity.event_start_date?.slice(0,4),campaign=bits.match(/(?:campaign|edition)[\/_-]?(20\d{2})/);if(campaign&&eventYear&&campaign[1]!==eventYear)flags.push('different_campaign_year');
 if(image.image_expires_at&&Number.isFinite(Date.parse(image.image_expires_at))&&Date.parse(image.image_expires_at)<now.getTime())flags.push('image_expired');
 if(image.width!==null&&image.height!==null){if(image.width<640||image.height<360||image.width*image.height<230400)flags.push('low_resolution');if(image.width/image.height>4||image.height/image.width>4)flags.push('unsuitable_aspect_ratio');}else flags.push('dimensions_unknown');
 const reject=flags.some(flag=>flag!=='dimensions_unknown');
 return {quality_status:reject?'rejected':flags.length?'unknown':'suitable',quality_flags:flags,event_match_tokens:hits};
}
