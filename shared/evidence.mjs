/** Modelo de documentação da dívida. Nenhuma cifra vira prova apenas por estar no cadastro. */
import {brl,normalizeCase} from './engine.mjs';

import {LEDGER_TYPES,normalizeEvidence} from './evidence-core.mjs';
export {LEDGER_TYPES,normalizeEvidence} from './evidence-core.mjs';
const sum=(entries,type)=>Math.round(entries.filter(x=>x.kind===type).reduce((a,x)=>a+x.amount,0)*100)/100;
const money=x=>x==null?'Pendente de comprovação':brl(x);
const empty='Não há memória documental suficiente para apurar o principal/encargos desta operação.';
export function ledgerSummary(entries=[]){
 const rows=Array.isArray(entries)?entries:[];const totals={};for(const k of Object.keys(LEDGER_TYPES))totals[k]=sum(rows,k);
 const cycles=[];const groups=new Map();for(const r of rows){const month=r.date?.slice(0,7);if(!month)continue;if(!groups.has(month))groups.set(month,[]);groups.get(month).push(r)}
 for(const [month,items] of groups){const opening=items.find(x=>x.kind==='opening_balance')?.amount??null,statement=items.find(x=>x.kind==='closing_balance')?.amount??null;
  const charged=items.filter(x=>['purchase','interest','iof','late_interest','fine','fee','other_adjustment'].includes(x.kind)).reduce((a,x)=>a+x.amount,0),paid=items.filter(x=>x.kind==='payment').reduce((a,x)=>a+x.amount,0);
  const expected=opening===null?null:Math.round((opening+charged-paid)*100)/100;
  cycles.push({month,opening,charged:Math.round(charged*100)/100,paid:Math.round(paid*100)/100,statement,expected,difference:expected===null||statement===null?null:Math.round((statement-expected)*100)/100,hasUnexplained:items.some(x=>x.kind==='other_adjustment')});
 }
 cycles.sort((a,b)=>a.month.localeCompare(b.month));return {totals,cycles,chargesKnown:totals.interest+totals.iof+totals.late_interest+totals.fine+totals.fee,
  chargesUndisclosed:totals.other_adjustment,knownPayments:totals.payment,unreconciledTransfers:totals.transfer_pending};
}
export function loanSummary(model){const s=normalizeCase(model),l=normalizeEvidence(s.evidence).loan,c=s.consignado;
 const pastTotal=l.paidTotal??(l.paidPrincipal!==null&&l.paidInterest!==null?Math.round((l.paidPrincipal+l.paidInterest+(l.paidOther??0))*100)/100:null);
 const pastInterestShare=pastTotal>0&&l.paidInterest!==null?Math.round(l.paidInterest/pastTotal*10000)/100:null;
 const futureNominal=Math.round(Math.max(0,c.remaining-c.paidAfterSnapshot)*c.installment*100)/100;
 const snapshot=l.settlementAmount??(c.settlementReference||null);const asOf=l.settlementAsOf||c.snapshotDate;
 return {...l,pastTotal,pastInterestShare,futureNominal,snapshot,asOf,nominalExcess:snapshot!==null&&asOf===c.snapshotDate&&!c.paidAfterSnapshot?Math.round((futureNominal-snapshot)*100)/100:null};
}
const SOURCES={
 cdc:'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm',
 super:'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14181.htm',
 ddc:'https://www.bcb.gov.br/meubc/faqs/p/informacoes-e-documentos-exigidos-do-banco-para-quitar-ou-transferir-divida',
 card:'https://www.bcb.gov.br/meubc/faqs/p/documento-descritivo-do-credito-ddc-para-as-operacoes-com-cartao-de-credito',
 cap:'https://www.bcb.gov.br/meubc/faqs/p/limitacao-dos-juros-e-encargos-financeiros-no-saldo-devedor-da-fatura-do-cartao'
};
export const EVIDENCE_SOURCES=Object.freeze(SOURCES);
function allocationFor(report,id){return report.allocations.find(x=>x.id===id)||null;}
export function creditorDossier(input,report,id){const s=normalizeCase(input),ev=normalizeEvidence(s.evidence),loan=id==='itau_cons',debt=s.debts.find(x=>x.id===id),alloc=allocationFor(report,id);
 if(!loan&&!debt)throw new Error('Credor não encontrado');const name=loan?'Itaú - consignado':debt.creditor,lines=[],requests=[],warnings=[];
 const add=(title,text)=>lines.push({title,text});
 if(loan){const l=loanSummary(s);add('Origem do contrato',`Contrato: ${l.contractNumber||'pendente'}. Valor financiado: ${money(l.originalFinanced)}; liberado em conta: ${money(l.cashReleased)}; refinanciamento anterior: ${money(l.priorSettled)}; tributo financiado: ${money(l.financedTax)}. Total contratual nominal: ${money(l.nominalOriginal)}.`);
  add('Histórico de parcelas',`Principal amortizado até a data do demonstrativo: ${money(l.paidPrincipal)}; juros registrados nas parcelas pagas: ${money(l.paidInterest)}; outros encargos: ${money(l.paidOther)}; total pago registrado: ${money(l.pastTotal)}${l.pastInterestShare!==null?`; participação dos juros nos pagamentos: ${l.pastInterestShare.toLocaleString('pt-BR')}%`:''}. Os juros pagos compõem o histórico, não um crédito automático a abater duas vezes.`);
  add('Saldo e quitação',`No documento datado de ${l.asOf||'data não indicada'}, a referência de liquidação é ${money(l.snapshot)}. O total nominal das prestações abertas, no cadastro atual, é ${brl(l.futureNominal)}${l.nominalExcess!==null?`; diferença nominal versus aquela referência: ${brl(l.nominalExcess)}`:''}. Esse contraste não determina o saldo para quitação HOJE. Solicitar DDC e demonstrativo de quitação vigente, com amortizações posteriores.`);
  add('Justificativa do valor ofertado',`A parcela atribuída no plano é ${money(alloc?.monthly)} por ${s.plan.months} meses, sujeita ao ajuste por saldo principal conferido e concordância/homologação. A intenção é coordenar o consignado com as demais dívidas, evitando acrescentar prestações em paralelo ao desconto atual de ${brl(s.consignado.installment)}. A capacidade familiar é condicional à efetiva implementação da medida sobre a folha, não presumida.`);
  if(l.contractNote)add('Observação documental',l.contractNote);
  requests.push('DDC atualizado com saldo para liquidação na data do pedido, memória de evolução, juros/encargos por parcela, CET, taxa contratual e amortizações posteriores.','Contratos anteriores liquidados no refinanciamento, demonstrativo de cálculo e destinação dos recursos.','Histórico de descontos em folha, com competência, valores pagos, eventuais cobranças duplicadas e confirmação sobre liberação efetiva da margem.');
  warnings.push('A CCB, a garantia vinculada e o eventual pedido de revisão/coordenação exigem análise jurídica específica.');
 }else{const entries=ev.ledgers[id]||[],m=ledgerSummary(entries),last=m.cycles.filter(x=>x.statement!==null).at(-1),hasLedger=entries.length>0;
  add('Comparação dos valores',`Saldo cobrado no cadastro: ${brl(debt.claim)}; base referencial de negociação: ${brl(debt.base)}; parcela atribuída: ${money(alloc?.monthly)}. A base é proposta, não principal validado nem valor legalmente deferido.`);
  if(hasLedger){add('Histórico classificado',`Compras/novos lançamentos registrados: ${brl(m.totals.purchase)}; juros remuneratórios discriminados: ${brl(m.totals.interest)}; IOF: ${brl(m.totals.iof)}; mora: ${brl(m.totals.late_interest)}; multa: ${brl(m.totals.fine)}; outras tarifas identificadas: ${brl(m.totals.fee)}; diferenças NÃO discriminadas: ${brl(m.chargesUndisclosed)}. São somas dos registros disponíveis, não de todo o relacionamento.`);
   add('Pagamentos e conciliação',`Pagamentos identificados como apropriados ao cartão: ${brl(m.knownPayments)}. Transferências em apuração: ${brl(m.unreconciledTransfers)}, que NÃO são abatidas enquanto não houver comprovação de apropriação a este contrato. ${last?`Última fatura histórica registrada: ${last.month}, ${brl(last.statement)}.`:'Ainda não há fatura final registrada.'}`);
   for(const cycle of m.cycles.filter(x=>x.opening!==null&&x.statement!==null)){add(`Conciliação ${cycle.month}`,`Saldo anterior ${brl(cycle.opening)} + lançamentos/encargos/ajustes ${brl(cycle.charged)} - pagamentos apropriados no ciclo ${brl(cycle.paid)} = ${brl(cycle.expected)}; fatura ${brl(cycle.statement)}; diferença de conciliação ${brl(cycle.difference)}. ${cycle.hasUnexplained?'Existem ajustes sem detalhamento; não tratá-los como juros comprovados.':''}`)}
  }else add('Histórico',empty);
  add('Justificativa da repactuação',`O valor ofertado não é declaração de que encargos já pagos devam ser devolvidos automaticamente. Pede-se discriminação por operação, abatimento dos pagamentos comprovados, segregação de compras/juros/tributos e análise de redução negocial de encargos e juros futuros, dentro de prestação global suportável.`);
  if(/cart[aã]o|crédito\/cart[aã]o/i.test(debt.type)){add('Teto de encargos do rotativo',`Para cada operação originada desde 03/01/2024, a soma de juros e encargos financeiros do rotativo ou parcelamento de fatura deve ser conferida em relação ao valor ORIGINAL dessa operação; não se aplica automaticamente o teto de 100% à fatura total ou às compras parceladas com juros. Exigir segregação por operação inclusive quando migrada para parcelamento.`);
   requests.push('DDC do cartão por operação: valor original, data de origem, taxas, total de juros e encargos já cobrados/pagos, margem restante do teto legal e saldo atualizado.');}
  requests.push('Faturas integrais e conciliação de todos os pagamentos, compras, parcelas vincendas, IOF, mora, multa e demais ajustes.','Explicação entre saldo de fatura, saldo em cobrança e eventual proposta de renegociação (não somar as três posições como dívidas distintas).');
  if(!debt.verified)warnings.push('Saldo cadastrado não está marcado como documentalmente verificado.');
  if(m.chargesUndisclosed>0)warnings.push('Ajustes não discriminados exigem fatura integral: não é possível afirmar que todo o valor seja juros indevidos.');
 }
 if(alloc){add('Teste de exequibilidade',`Se mantida a base do motor e os encargos simulados, o total projetado destinado a este credor em ${s.plan.months} meses é ${brl(alloc.paid)}, com saldo ilustrativo de ${brl(alloc.ending)}. O saldo residual demanda negociação/revisão: não corresponde a remissão automática. `);}
 add('Condição jurídica geral',`A proposta conciliatória global é apresentada sob o art. 104-A do CDC, respeitado o mínimo existencial. No plano judicial compulsório, o art. 104-B, §4º, prevê no mínimo o principal devido atualizado por índices oficiais. A composição e o enquadramento de cada operação dependem de documentos e análise jurídica.`);
 return {id,name,loan,lines,requests,warnings,entries:loan?[]:(ev.ledgers[id]||[]),summary:loan?loanSummary(s):ledgerSummary(ev.ledgers[id]||[]),source:loan?s.consignado.source:debt.source,allocation:alloc};
}
export function allDossiers(input,report){const s=normalizeCase(input);return [creditorDossier(s,report,'itau_cons'),...s.debts.map(d=>creditorDossier(s,report,d.id))]}