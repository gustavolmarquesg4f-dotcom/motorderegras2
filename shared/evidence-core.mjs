/** Safe normalization of financial evidence. */
export const LEDGER_TYPES=Object.freeze({
 opening_balance:'Saldo anterior (referência)',purchase:'Novos gastos/compras',interest:'Juros remuneratórios',
 iof:'IOF',late_interest:'Juros de mora',fine:'Multa',fee:'Tarifa/encargo discriminado',financed_installment:'Parcela mista de rotativo/parcelamento (separar principal e encargos)',
 other_adjustment:'Diferença não discriminada (NÃO classificar como juros)',
 payment:'Pagamento apropriado ao cartão',transfer_pending:'Transferência a conciliar (NÃO abater ainda)',
 closing_balance:'Total da fatura (referência)',offer:'Oferta/renegociação (NÃO é pagamento)'
});
const amount=x=>(x===null||x===undefined||x==='')?null:(Number.isFinite(Number(x))&&Number(x)>=0?Math.round(Number(x)*100)/100:null);
const safeText=(x,max=400)=>String(x??'').slice(0,max);
const date=x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x||''))?String(x):'';
const kind=x=>Object.prototype.hasOwnProperty.call(LEDGER_TYPES,x)?x:'other_adjustment';
const statuses=new Set(['bank_document','memorial','declaration','unreconciled']);
export function normalizeEvidence(raw={}){
 const e=raw&&typeof raw==='object'?raw:{};const l=e.loan||{};
 const loan={contractNumber:safeText(l.contractNumber,90),originalFinanced:amount(l.originalFinanced),cashReleased:amount(l.cashReleased),priorSettled:amount(l.priorSettled),financedTax:amount(l.financedTax),
 nominalOriginal:amount(l.nominalOriginal),rateMonthly:amount(l.rateMonthly),cetMonthly:amount(l.cetMonthly),
 paidPrincipal:amount(l.paidPrincipal),paidInterest:amount(l.paidInterest),paidOther:amount(l.paidOther),paidTotal:amount(l.paidTotal),
 firstInterest:amount(l.firstInterest),settlementAmount:amount(l.settlementAmount),settlementAsOf:date(l.settlementAsOf),settlementSource:safeText(l.settlementSource),
 amortizationSource:safeText(l.amortizationSource),contractNote:safeText(l.contractNote,1000),negotiationReference:amount(l.negotiationReference),negotiationNote:safeText(l.negotiationNote,500)};
 const ledgers={};for(const [id,rows] of Object.entries(e.ledgers||{}).slice(0,32)){
  if(!Array.isArray(rows))continue;ledgers[safeText(id,80)]=rows.slice(0,360).map((r,i)=>({id:safeText(r.id||`${id}-${i}`,100),date:date(r.date),kind:kind(r.kind),amount:amount(r.amount)||0,
   description:safeText(r.description,400),source:safeText(r.source,350),status:statuses.has(r.status)?r.status:'unreconciled',operationId:safeText(r.operationId,90)}));
 }
 const actions=(Array.isArray(e.actions)?e.actions:[]).slice(0,100).map((a,i)=>({id:safeText(a.id||`action-${i}`,100),date:date(a.date),creditorId:safeText(a.creditorId,80),action:safeText(a.action,500),source:safeText(a.source,350),outcome:safeText(a.outcome,500),status:['realizado','solicitado','pendente','confirmado'].includes(a.status)?a.status:'pendente'}));
 return {loan,ledgers,actions};
}