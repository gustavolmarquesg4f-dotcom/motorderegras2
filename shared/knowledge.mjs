/** Case knowledge: source-indexed, owner-private facts; not a prediction or legal holding. */
const clean=(v,max=1100)=>String(v??'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max);
const isDate=(v)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v)))return false;const d=new Date(v+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v};
export const KNOWLEDGE_TYPES=Object.freeze({court_order:'Decisão/despacho no processo',procedural_event:'Movimentação processual',party_statement:'Manifestação de parte ou advogado',bank_response:'Resposta formal de credor',financial_evidence:'Documento financeiro',court_precedent:'Jurisprudência pública',professional_note:'Nota do profissional',user_statement:'Declaração do titular'});
export const KNOWLEDGE_STATUSES=Object.freeze({documented:'Documento identificado',declared:'Declaração a comprovar',pending:'Pendente de conferência'});
export const REQUIRED_CREDITOR_FIELDS=Object.freeze([
 {id:'contract',label:'Número do contrato'}, {id:'amount',label:'Valor contratado'}, {id:'installment',label:'Parcela pactuada'}, {id:'rate',label:'Taxa efetiva mensal'}, {id:'paid',label:'Parcelas pagas'}, {id:'remaining',label:'Parcelas a pagar'}, {id:'balance',label:'Saldo devedor atualizado'}
]);
export const LEGAL_LIBRARY=Object.freeze([
 {id:'L1',topic:'Superendividamento e boa-fé',name:'CDC, art. 54-A',url:'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm',note:'Definição e preservação do mínimo existencial; verificar exclusões por espécie de dívida.'},
 {id:'L2',topic:'Informação e crédito responsável',name:'CDC, arts. 54-B e 54-D',url:'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm',note:'Informação prévia, avaliação responsável, consequências sujeitas à prova e decisão.'},
 {id:'L3',topic:'Audiência global e negociação',name:'CDC, art. 104-A',url:'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm',note:'Conciliação, plano até cinco anos e exclusões do §1º; sanções do §2º dependem dos requisitos legais.'},
 {id:'L4',topic:'Plano judicial compulsório',name:'CDC, art. 104-B',url:'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm',note:'Fase subsidiária; §4º exige ao menos o principal corrigido e liquidação integral no prazo legal.'},
 {id:'L5',topic:'Limite por operação de cartão',name:'Lei 14.690/2023 e FAQ BC',url:'https://www.bcb.gov.br/meubc/faqs/p/limitacao-dos-juros-e-encargos-financeiros-no-saldo-devedor-da-fatura-do-cartao',note:'Operações de rotativo/parcelamento originadas a partir de 03/01/2024, não toda a fatura.'},
 {id:'L6',topic:'DDC do cartão de crédito',name:'BC – Documento Descritivo do Crédito',url:'https://www.bcb.gov.br/meubc/faqs/p/documento-descritivo-do-credito-ddc-para-as-operacoes-com-cartao-de-credito',note:'Valor original, evolução, juros e encargos já cobrados e ainda passíveis de cobrança por operação.'},
 {id:'L7',topic:'DDC de empréstimos',name:'BC – Documento Descritivo do Crédito',url:'https://www.bcb.gov.br/meubc/faqs/p/documento-descritivo-do-credito-ddc',note:'Saldo atualizado, evolução, taxas, parcelas, principal e encargos.'},
 {id:'L8',topic:'Fluxo procedimental local',name:'TJDFT – Nota Técnica 12/2024',url:'https://www.tjdft.jus.br/consultas/notas-tecnicas/nota-tecnica-12-superendividamento-publicada-18_6_24.pdf/@@download/file/NT%2012-2024.pdf',note:'Exige leitura contextualizada; não substitui despacho do processo.'},
 {id:'L9',topic:'Audiência e sanções',name:'TJDFT – jurisprudência em temas (atualizada em 2026)',url:'https://www.tjdft.jus.br/consultas/jurisprudencia/jurisprudencia-em-temas/cdc-na-visao-do-tjdft-1/superendividamento/audiencia-de-conciliacao',note:'Conferir ementas e acórdãos completos. Divergência entre ausência, falta de proposta e falta de dados.'},
 {id:'L10',topic:'Consulta dos autos',name:'TJDFT – PJe consulta pública',url:'https://pje-consultapublica.tjdft.jus.br/consultapublica/ConsultaPublica/listView.seam',note:'Consultar os autos e confirmar audiência, representação e manifestações; o aplicativo não acompanha o PJe automaticamente.'}
]);
export const BANK_REQUESTS=Object.freeze({
 itau_cons:['DDC com quitação na data-base atual e taxa efetiva','Memória de cada parcela: principal, juros, IOF e descontos efetivos','CCBs dos refinanciamentos anteriores e baixa dos dois saldos','Estudo de margem e renda residual na contratação','Esclarecimento sobre garantia FGTS e sua constituição'],
 santander:['Faturas integrais desde o último pagamento integral','DDC de cada saldo rotativo/parcelamento, origens e encargos acumulados','Conciliação das transferências com a baixa efetiva na fatura','Discriminação dos ajustes de agosto e tratamento de parcelas futuras','Composição e validade da proposta de renegociação'],
 itau_card:['Faturas atuais e comprovante de pagamento integral anterior','DDC e origem de eventual novo rotativo','Discriminação das compras e parcelas vincendas'],
 brb:['Faturas integrais e DDC de cada saldo rotativo/parcelamento','Histórico de pagamentos, juros, CET e operações futuras'],
 picpay:['Contrato e DDC atualizado','Histórico de pagamentos, parcelas e encargos']
});
export function normalizeKnowledge(src={}){
 const items=(Array.isArray(src?.items)?src.items:[]).slice(0,90).map((v,i)=>({
  id:clean(v.id,70)||`fact-${i+1}`,date:isDate(v.date)?v.date:'',
  type:KNOWLEDGE_TYPES[v.type]?v.type:'user_statement',title:clean(v.title,170),actor:clean(v.actor,140),
  creditorId:clean(v.creditorId,65),summary:clean(v.summary,1350),sourceId:clean(v.sourceId,160),
  sourcePage:clean(v.sourcePage,35),sourceUrl:clean(v.sourceUrl,500),
  status:KNOWLEDGE_STATUSES[v.status]?v.status:'pending'}));
 const known=new Set();return {items:items.filter(x=>x.title&&x.summary&&x.sourceId&&(!known.has(x.id)&&known.add(x.id)))};
}
export function mergeKnowledge(existing,incoming){const a=normalizeKnowledge(existing).items,b=normalizeKnowledge(incoming).items;const keys=new Set(a.map(x=>x.sourceId+'|'+x.date+'|'+x.title.toLowerCase()));return normalizeKnowledge({items:[...a,...b.filter(x=>!keys.has(x.sourceId+'|'+x.date+'|'+x.title.toLowerCase()))]});}
export function knowledgeCoverage(input){const items=normalizeKnowledge(input).items;const orders=items.filter(x=>x.type==='court_order'&&x.status==='documented');const bank=items.filter(x=>x.type==='bank_response'&&x.status==='documented');return {total:items.length,orders:orders.length,bankResponses:bank.length,lastDocumented:items.filter(x=>x.date&&x.status==='documented').map(x=>x.date).sort().at(-1)||'',missingHearing:!items.some(x=>x.title.toLowerCase().includes('audiência marcada')&&x.status==='documented'),unverified:items.filter(x=>x.status!=='documented').length};}
export function contextForAI(input,{focus='global',question='',maxChars=22500}={}){
 const items=normalizeKnowledge(input).items;
 const score=x=>{const doc=x.status==='documented'?4:0,order=x.type==='court_order'?4:0,scope=x.creditorId===focus?8:0,questionTerms=String(question).toLowerCase().split(/\W+/).filter(x=>x.length>4);const hits=questionTerms.filter(t=>(x.title+' '+x.summary).toLowerCase().includes(t)).length;return doc+order+scope+Math.min(8,hits*2)};
 const sorted=items.map((x,i)=>({x,i,score:score(x)})).sort((a,b)=>b.score-a.score||b.x.date.localeCompare(a.x.date));
 const output=[];let total=0;for(const {x} of sorted){const short={id:x.id,date:x.date,type:x.type,title:x.title,actor:x.actor,creditorId:x.creditorId,summary:x.summary,sourceId:x.sourceId,sourcePage:x.sourcePage,status:x.status};const len=JSON.stringify(short).length;if(total+len>maxChars)break;output.push(short);total+=len;}
 return output;
}
export function citationCheck(ids,knownIds){const allow=new Set(knownIds);return (Array.isArray(ids)?ids:[]).filter(x=>typeof x==='string'&&allow.has(x)).slice(0,8)};