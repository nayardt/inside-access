import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Admin} from './Admin';
import {Discovery} from './Discovery';
import {api} from './api';
import type {Session} from './types';
import './v04.css';
import './styles.css';
function App(){const [route,setRoute]=useState(location.pathname),[session,setSession]=useState<Session>({user:null,admin:false});
 useEffect(()=>{api.session().then(setSession).catch(()=>{});const handler=()=>setRoute(location.pathname);window.addEventListener('popstate',handler);return()=>window.removeEventListener('popstate',handler);},[]);
 const navigate=(path:string)=>{history.pushState({},'',path);setRoute(path);window.scrollTo(0,0);};
 return <><a className="skip-link" href="#main-content">Skip to content</a><header className="appbar"><div className="container topbar"><a className="brand" href="/" onClick={e=>{e.preventDefault();navigate('/');}}>INSIDE <span>ACCESS</span></a><nav className="navlinks" aria-label="Primary navigation"><button className={route!=='/admin'?'active':''} onClick={()=>navigate('/')}>Discover</button><button className={route==='/admin'?'active':''} onClick={()=>navigate('/admin')}>{session.admin?'Admin workspace':'Admin sign in'}</button></nav><span className="private">PRIVATE BETA · v0.6.4</span></div></header><div id="main-content">{route==='/admin'?<Admin session={session} onSession={setSession}/>:<Discovery/>}</div><footer className="footbar"><div className="container"><strong>INSIDE ACCESS</strong> · Extraordinary experiences. Real access.<br/>Private beta v0.6.4 · Source evidence and publication approval are checked separately. No alerts or applications are sent.</div></footer></>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
