import {useEffect,useState} from 'react';
import {safeUrl} from './format';
import type {Row} from './types';
export function EventImage({image,className=''}:{image:Row|null|undefined;className?:string}){
 const [failed,setFailed]=useState(false),url=safeUrl(image?.image_url);
 useEffect(()=>setFailed(false),[url]);
 if(!url||failed)return <span className={'image-fallback '+className} aria-label={failed?'Event image unavailable':'Decorative event artwork'}><span aria-hidden="true">✦</span></span>;
 return <img className={'event-image '+className} src={url} alt={image?.alt_text||'Event artwork'} width={image?.width||undefined} height={image?.height||undefined} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>;
}
