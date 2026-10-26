import {useEffect,useState} from 'react';
import {api} from './api';
import {OpportunityCard,Empty,Detail,ActionButton} from './components';
import {bucket,costType,ended,download} from './format';
import type {Row,Filters} from './types';
const readStored=<T,>(key:string,fallback:T):T=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
export function Discovery({preview=false}:{preview?:boolean}){
 const [tab,setTab]=useState('discover'),[filters,setFilters]=useState<Filters>({}),[page,setPage]=useState(0),[rows,setRows]=useState<Row[]>([]),[total,setTotal]=useState(0),[busy,setBusy]=useState(true),[error,setError]=useState(''),[detail,setDetail]=useState<Row|null>(null),[archive,setArchive]=useState(false);
 const [saved,setSaved]=useState<string[]>(()=>readStored('inside_access_v04_saved',[]));
 const [prefs,setPrefs]=useState<string[]>(()=>readStored('inside_access_v05_interests',['Amsterdam','London','Paris']));
 const [feedback,setFeedback]=useState('');
 useEffect(()=>{try{localStorage.setItem('inside_access_v04_saved',JSON.stringify(saved));}catch{}},[saved]);
 useEffect(()=>{let active=true;setBusy(true);setError('');
 (async()=>{
  if(preview){const all=await api.allRows('opportunities',{group:'selected'});let result=all.filter(x=>archive||!ended(x));
   if(tab==='saved')result=result.filter(x=>saved.includes(x.opportunity_id));
   if(filters.city)result=result.filter(x=>x.city===filters.city);
   if(filters.query)result=result.filter(x=>(x.title+' '+x.description+' '+x.organizer).toLowerCase().includes(String(filters.query).toLowerCase()));
   if(filters.experience)result=result.filter(x=>bucket(x)===({part:'Be Part of It',film:'Film & red carpets',fashion:'Fashion & brands',culture:'Culture & special'} as Row)[String(filters.experience)]);
   if(filters.cost)result=result.filter(x=>costType(x)===filters.cost);
   if(filters.participation)result=result.filter(x=>x.participation_type===filters.participation);
   if(filters.when==='unknown')result=result.filter(x=>x.date_precision==='month only');
   if(['week','month'].includes(String(filters.when))){const edge=new Date();edge.setDate(edge.getDate()+(filters.when==='week'?7:30));result=result.filter(x=>x.event_start_date&&x.event_start_date<=edge.toISOString().slice(0,10));}
   if(active){setTotal(result.length);setRows(result.slice(page*30,(page+1)*30));}
  }else{
   const p=tab==='saved'&&!saved.length?{records:[],total:0}:await api.publicPage({...filters,...(tab==='saved'?{ids:saved.join(',')}:{}),offset:page*30,limit:30});
   if(active){setRows(p.records);setTotal(p.total);}
  }
 })().catch(e=>{if(active){setError(e.message);setRows([]);}}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};
 },[preview,filters,page,tab,saved,archive]);
 const change=(key:string,value:string)=>{setPage(0);setFilters(v=>({...v,[key]:value}));};
 const toggle=(id:string)=>setSaved(v=>v.includes(id)?v.filter(i=>i!==id):[...v,id]);
 return <>
 {!preview&&<section className="hero"><div className="container herogrid"><div><div className="eyebrow">Beyond the guest list · Verified discovery</div><h1>Get closer to the <em>extraordinary.</em></h1><p className="herotext">Discover red carpets, extraordinary screenings, fashion experiences, studio audiences and paid film-extra opportunities. Find out <strong>exactly how</strong> to attend, apply or participate.</p><div className="heroacts"><a className="btn primary" href="#opportunities">Explore opportunities ↗</a><button className="btn ghost" onClick={()=>setTab('alerts')}>Your access interests ♧</button></div></div><div className="symbol" aria-hidden="true">✦</div></div><div className="container"><p className="disclaimer"><strong>Private beta · v0.6.4.</strong> Only explicitly approved and published records appear here. Verification describes source evidence; ticket stock, invitations and application outcomes require a fresh check with the provider.</p></div></section>}
 <main className={preview?'':'container main'} id="opportunities">
 {preview&&<div className="stripe"><strong>Administrator preview</strong> · Private selected records, including unpublished imports. The public feed uses its own database publication gate.</div>}
 <div className="chips">{[['discover','Discover'],['saved',`Saved (${saved.length})`],['alerts','My access interests']].map(([k,label])=><button key={k} className={'chip '+(tab===k?'active':'')} onClick={()=>{setTab(k);setPage(0);setFilters({});}}>{label}</button>)}</div>
 {tab==='alerts'?<section className="pane"><h2>Your access interests</h2><p className="subtitle">Keep your preferred cities on this device. Email alerts are a future integration; no messages are sent and no email address is collected.</p><div className="checks">{['Amsterdam','London','Paris'].map(city=><label className="check" key={city}><input type="checkbox" checked={prefs.includes(city)} onChange={()=>setPrefs(v=>v.includes(city)?v.filter(x=>x!==city):[...v,city])}/>{city}</label>)}</div><button className="btn primary spaced" onClick={()=>{try{localStorage.setItem('inside_access_v05_interests',JSON.stringify(prefs));setFeedback('Preferences saved on this device.');}catch{setFeedback('Browser storage is unavailable.');}}}>Save preferences</button><p role="status" className="sm">{feedback}</p></section>:<>
 <div className="secttop"><h2>{tab==='saved'?'Your shortlist':filters.experience==='part'?'Be Part of It':'Discover your way in'}</h2><span className="sm">{preview?'Private database preview':'Approved opportunities'}</span></div>
 <p className="subtitle">{tab==='saved'?'Your shortlist stays in this browser. Listings that are withdrawn or no longer eligible disappear from this view.':'Public tickets, audience applications, casting and fan pens have different conditions. Each listing explains the actual route.'}</p>
 <div className="filters"><label className="field"><span>Search</span><input type="search" placeholder="Premiere, designer, casting…" value={String(filters.query||'')} onChange={e=>change('query',e.target.value)}/></label><label className="field"><span>City</span><select value={String(filters.city||'')} onChange={e=>change('city',e.target.value)}><option value="">All cities</option>{['Amsterdam','London','Paris'].map(v=><option key={v}>{v}</option>)}</select></label><label className="field"><span>Experience</span><select value={String(filters.experience||'')} onChange={e=>change('experience',e.target.value)}><option value="">All experiences</option><option value="part">Be Part of It</option><option value="film">Film & red carpets</option><option value="fashion">Fashion & brands</option><option value="culture">Culture & special</option></select></label><label className="field"><span>Access / price</span><select value={String(filters.cost||'')} onChange={e=>change('cost',e.target.value)}><option value="">Any access route</option><option value="free">Free</option><option value="ticket">Public tickets</option><option value="paid">Paid participation</option></select></label><label className="field"><span>Dates</span><select value={String(filters.when||'')} onChange={e=>change('when',e.target.value)}><option value="">Any upcoming date</option><option value="week">Next 7 days</option><option value="month">Next 30 days</option><option value="unknown">Month-only dates</option></select></label></div>
 <div className="chips"><button className={'chip '+(!filters.participation?'active':'')} onClick={()=>change('participation','')}>All access types</button>{[['audience','Studio audiences'],['casting','Casting'],['stand_in','Stand-ins'],['seat_filler','Seat fillers'],['fan_pen','Fan pens']].map(([k,label])=><button key={k} className={'chip '+(filters.participation===k?'active':'')} onClick={()=>{setFilters(v=>({...v,experience:k==='fan_pen'?'film':'part',participation:k}));setPage(0);}}>{label}</button>)}</div>
 <div className="toolbarbase"><p aria-live="polite">{busy?'Loading opportunities…':`${total} ${preview?'private':'published'} opportunities`}</p>{preview&&<label className="switchlabel"><input type="checkbox" checked={archive} onChange={e=>setArchive(e.target.checked)}/>Include ended research records</label>}{tab==='saved'&&<button className="btn small" onClick={()=>download({ids:saved},'inside-access-shortlist.json')}>Export saved IDs ↓</button>}</div>
 {error&&<p className="error" role="alert">{error}</p>}
 {!busy&&!error&&<div className="cards">{rows.map(row=><OpportunityCard key={row.opportunity_id} row={row} onOpen={setDetail} saved={saved.includes(row.opportunity_id)} onSave={()=>toggle(row.opportunity_id)} privatePreview={preview}/>)}{!rows.length&&<Empty>{preview?'No records match these filters.':total===0&&!Object.values(filters).some(Boolean)&&tab!=='saved'?'The first experiences are being reviewed. Approved listings will appear here once an administrator publishes them.':'No published opportunities match these filters yet.'}</Empty>}</div>}
 <div className="pagination"><ActionButton reason={busy?'Loading opportunities…':page===0?'Already on the first page.':null} onClick={()=>setPage(p=>p-1)}>← Previous</ActionButton><span className="sm">Page {page+1} of {Math.max(1,Math.ceil(total/30))}</span><ActionButton reason={busy?'Loading opportunities…':(page+1)*30>=total?'No further results.':null} onClick={()=>setPage(p=>p+1)}>Next →</ActionButton></div>
 </>}
 </main>{detail&&<Detail row={detail} onClose={()=>setDetail(null)}/>}
 </>;
}
