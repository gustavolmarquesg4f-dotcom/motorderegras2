import React,{useId,useState} from 'react';
import {GLOSSARY} from '../../shared/glossary.mjs';

export function Help({term}){
 const [open,setOpen]=useState(false),id=useId(),meaning=GLOSSARY[term];
 if(!meaning)return null;
 return <span className="help-wrap" onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}>
  <button type="button" className="help-trigger" aria-label={`O que significa ${term}?`} aria-describedby={open?id:undefined} aria-expanded={open} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)} onClick={()=>setOpen(true)}>?</button>
  {open&&<span id={id} role="tooltip" className="help-popover"><b>{term}</b><span>{meaning}</span></span>}
 </span>;
}
export function Glossary(){
 const [search,setSearch]=useState('');const list=Object.entries(GLOSSARY).filter(([term,definition])=>(term+' '+definition).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(search.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()));
 return <section className="panel"><div className="section-head"><div><h3>Glossário do Plano Justo</h3><p>As explicações também aparecem ao passar o mouse ou selecionar os ícones de interrogação.</p></div></div>
  <label className="search-label">Pesquisar sigla ou expressão <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ex.: IRRF, consignado, saldo residual..."/></label>
  <div className="glossary-grid">{list.map(([term,text])=><article key={term} className="glossary-entry"><b>{term}</b><p>{text}</p></article>)}{!list.length&&<p className="muted">Nenhum termo encontrado.</p>}</div>
 </section>;
}