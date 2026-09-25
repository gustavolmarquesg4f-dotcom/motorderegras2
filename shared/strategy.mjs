/** Deterministic dossier triage: an evidence queue, not an outcome prediction. */
import {evaluate,normalizeCase,brl} from './engine.mjs';
import {normalizeEvidence,loanSummary,ledgerSummary} from './evidence.mjs';
export const OFFICIAL_RESEARCH_SOURCES=Object.freeze([
 {id:'F1',name:'CDC compilado – crédito responsável e repactuação',url:'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm',terms:['Art. 54-D','Art. 104-A','Art. 104-B']},
 {id:'F2',name:'Banco Central – teto de encargos no rotativo e parcelamento',url:'https://www.bcb.gov.br/meubc/faqs/p/limitacao-dos-juros-e-encargos-financeiros-no-saldo-devedor-da-fatura-do-cartao',terms:['3 de janeiro de 2024','valor original da dívida']},
 {id:'F3',name:'TJDFT – serviço de prevenção e tratamento',url:'https://www.tjdft.jus.br/carta-de-servicos/servicos/conciliacao-e-mediacao/prevencao-tratamento-superendividamento',terms:['plano de pagamento','Superendividamento']},
 {id:'F4',name:'SENACON – informações sobre superendividamento',url:'https://www.gov.br/mj/pt-br/assuntos/seus-direitos/consumidor/defesadoconsumidor/Superendividamento',terms:['superendividamento','Registrato']},
 {id:'F5',name:'Banco Central – DDC de empréstimos',url:'https://www.bcb.gov.br/meubc/faqs/p/documento-descritivo-do-credito-ddc',terms:['demonstrativo da evolução','saldo devedor atualizado']},
 {id:'F6',name:'Banco Central – DDC de cartão',url:'https://www.bcb.gov.br/meubc/faqs/p/documento-descritivo-do-credito-ddc-para-as-operacoes-com-cartao-de-credito',terms:['valor original da dívida','encargos financeiros aplicáveis']},
 {id:'F7',name:'TJDFT – jurisprudência de audiência de conciliação',url:'https://www.tjdft.jus.br/consultas/jurisprudencia/jurisprudencia-em-temas/cdc-na-visao-do-tjdft-1/superendividamento/audiencia-de-conciliacao',terms:['audiência de conciliação','REsp']}
]);
export function strategicFindings(input,now=new Date()){
 const model=normalizeCase(input),report=evaluate(model),e=normalizeEvidence(model.evidence),issues=[];
 const add=(code,severity,creditor,title,evidenceNeeded,why)=>issues.push({code,severity,creditor,title,evidenceNeeded,why});
 const loan=loanSummary(model);
 if(report.totalEnding>.01)add('RESIDUAL','critical','Plano global','O plano não liquida as bases simuladas em até 60 meses','Memória atualizada do principal corrigido e proposta alternativa consensual','O saldo residual é negociação/revisão pendente; não é remissão automática.');
 if(report.finance.currentGap<0)add('CASH_DEFICIT','critical','Família','Orçamento atual apresenta déficit','Contracheque recente, gastos recorrentes e cobertura pelo benefício alimentação',`Renda em dinheiro menos gastos em dinheiro: ${brl(report.finance.currentGap)}.`);
 if(model.plan.mode==='substitution'&&!model.consignado.confirmedStop)add('PAYROLL_CONDITIONAL','critical','Itaú consignado','Viabilidade depende de alteração efetiva do desconto em folha','Ato formal, comunicação ao empregador e primeiro holerite com implementação','O plano global não pode ser somado ao desconto integral sem novo teste de capacidade.');
 if(loan.settlementAmount===null||!loan.settlementAsOf||Number.isFinite(Date.parse(loan.settlementAsOf))&&now-Date.parse(loan.settlementAsOf)>30*86400000)add('LOAN_QUOTE','warning','Itaú consignado','Cotação de quitação atual não comprovada','Documento Descritivo do Crédito e cotação atual com data e amortizações posteriores','Soma nominal de parcelas futuras e cotação histórica não equivalem ao saldo de hoje.');
 if((loan.paidInterest||0)>0)add('PAID_INTEREST','info','Itaú consignado','Juros já pagos devem integrar a análise documental','Memória completa de principal, juros, competência e contratos refinanciados','Servem para reconstruir o custo e discutir encargos, sem abatimento automático em duplicidade.');
 for(const d of model.debts){if(d.mode!=='included')continue;
  if(!d.verified)add('UNVERIFIED_CREDITOR','warning',d.creditor,'Saldo não verificado documentalmente','Contrato, fatura integral, DDC e saldo atualizado','Não transformar base de negociação em principal demonstrado.');
  if(['Cartão','Crédito/Cartão'].some(x=>String(d.type).toLowerCase().includes(x.toLowerCase()))){const ledger=ledgerSummary(e.ledgers[d.id]||[]);
   if(ledger.chargesUndisclosed>0)add('UNDISCLOSED_CHARGES','warning',d.creditor,'Ajustes sem discriminação na fatura','Fatura integral com memória dos ajustes, IOF, juros, mora e multas','Não presumir que toda a diferença não detalhada seja juro comprovado.');
   if(ledger.unreconciledTransfers>0)add('UNRECONCILED_TRANSFERS','warning',d.creditor,'Transferências sem prova de apropriação','Comprovante, extrato do destino e baixa na fatura','Não abater transferências até relacioná-las com a operação.');
   add('CARD_OPERATION_CAP','info',d.creditor,'Verificar o teto legal por operação de crédito','Origem de cada rotativo/parcelamento, valor original, data e encargos acumulados','A regra de 100% não se aplica indistintamente ao total de compras da fatura.');
  }
 }
 for(const d of model.debts.filter(x=>x.mode==='pending'))add('PENDING_SCOPE','warning',d.creditor,'Enquadramento ainda não definido','Contrato e natureza da garantia, se houver','O enquadramento deve ser conferido para não somar dívida excluída à base do plano.');
 return {asOf:now.toISOString().slice(0,10),issues,summary:{requestedStart:report.requestedStart,months:model.plan.months,monthly:model.plan.monthly,totalEnding:report.totalEnding,currentGap:report.finance.currentGap,afterProposalConditional:report.finance.afterProposal,confirmedPayrollStop:!!model.consignado.confirmedStop},sources:OFFICIAL_RESEARCH_SOURCES.map(({id,name,url})=>({id,name,url}))};
}