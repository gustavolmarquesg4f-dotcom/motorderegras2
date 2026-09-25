/** Audits court-party representation using only explicit case documents. No profiling or outcome guesses. */
import {normalizeKnowledge,REQUIRED_CREDITOR_FIELDS} from './knowledge.mjs';

export const ACTOR_ROLES=Object.freeze({magistrate:'Magistrado(a)',lawyer:'Advogado(a)',creditor:'Credor / parte',consumer_counsel:'Advocacia do consumidor',institution:'Instituição / órgão'});
export const ACTOR_STATUSES=Object.freeze({documented:'Documento identificado; vínculo sujeito à conferência',pending:'Vínculo a confirmar em ato ou procuração atualizado',superseded:'Informação histórica/substituída'});
const clean=(v,n=280)=>String(v??'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,n);
const validDate=(v)=>/^\d{4}-\d{2}-\d{2}$/.test(String(v))&&!Number.isNaN(Date.parse(v));
export function normalizeParticipants(input=[]){const raw=Array.isArray(input)?input:[];const ids=new Set();return raw.slice(0,40).map((p,i)=>({
 id:clean(p.id,70)||`actor-${i+1}`,name:clean(p.name,160),role:ACTOR_ROLES[p.role]?p.role:'lawyer',representedParty:clean(p.representedParty,170),
 professionalRegistration:clean(p.professionalRegistration,55),sourceId:clean(p.sourceId,160),sourcePage:clean(p.sourcePage,35),sourceUrl:clean(p.sourceUrl,500),
 sourceDate:validDate(p.sourceDate)?p.sourceDate:'',status:ACTOR_STATUSES[p.status]?p.status:'pending',scope:clean(p.scope,65),
 documentaryNote:clean(p.documentaryNote,450)
 })).filter(p=>p.id&&p.name&&p.sourceId&&!ids.has(p.id)&&ids.add(p.id));}
export function mergeParticipants(current=[],incoming=[]){const a=normalizeParticipants(current),b=normalizeParticipants(incoming);const keys=new Set(a.map(x=>[x.name.toLowerCase(),x.role,x.representedParty.toLowerCase()].join('|')));const ids=new Set(a.map(x=>x.id));return normalizeParticipants([...a,...b.filter(x=>{let k=[x.name.toLowerCase(),x.role,x.representedParty.toLowerCase()].join('|');if(keys.has(k)||ids.has(x.id))return false;keys.add(k);ids.add(x.id);return true;})]);}
export function participantAudit(input={}){const k=normalizeKnowledge(input),list=normalizeParticipants(k.participants);
 const active=list.filter(x=>x.status!=='superseded'),lawyers=active.filter(x=>x.role==='lawyer'),pending=active.filter(x=>x.status==='pending'||(x.role==='lawyer'&&!x.representedParty));
 const actionSources=new Set(k.items.filter(x=>x.status==='documented'&&['party_statement','court_order','procedural_event'].includes(x.type)).map(x=>x.sourceId));
 const gaps=[];
 if(!list.length)gaps.push('Identificar partes, procuradores e procurações na capa atualizada do PJe.');
 for(const p of pending){gaps.push(`Confirmar no PJe/procuração: ${p.name}${p.representedParty?' — vinculação indicada com '+p.representedParty:''}.`)}
 for(const p of lawyers){const linked=k.items.some(x=>x.type==='party_statement'&&x.status==='documented'&&x.actor.toLocaleLowerCase('pt-BR')===p.name.toLocaleLowerCase('pt-BR'));if(!linked)gaps.push(`Não há manifestação assinada indexada de ${p.name}; não atribuir tese, proposta ou conduta processual.`)}
 if(!active.some(x=>x.role==='consumer_counsel'))gaps.push('Representação jurídica do consumidor não identificada neste cadastro; confirmar se há patrono/Defensoria.');
 return {total:active.length,lawyers:lawyers.length,pending:pending.length,gaps:gaps.slice(0,22),participants:active.map(x=>({id:x.id,name:x.name,role:x.role,representedParty:x.representedParty,professionalRegistration:x.professionalRegistration,sourceId:x.sourceId,sourcePage:x.sourcePage,status:x.status,scope:x.scope,documentaryNote:x.documentaryNote})),documentedActionSources:actionSources.size};
}
export function auditCreditorDisclosure(input,creditors=[]){const source=normalizeKnowledge(input).items,results=[];
 for(const d of creditors){const id=String(d.id||'');const docs=source.filter(x=>x.creditorId===id&&x.status==='documented'&&['financial_evidence','bank_response'].includes(x.type));const combined=docs.map(x=>x.summary.toLowerCase()).join(' ');
 const isExplicit=REQUIRED_CREDITOR_FIELDS.filter(f=>combined.includes(f.label.toLowerCase())||combined.includes(f.id));
 results.push({id,creditor:d.creditor,documentsIndexed:docs.length,sevenFieldsToVerify:REQUIRED_CREDITOR_FIELDS.map(x=>x.label),note:`${isExplicit.length}/7 rótulos potencialmente citados em resumos; só os contratos e demonstrativos integrais permitem conferir os valores.`,complete:false});}
 return results;
}