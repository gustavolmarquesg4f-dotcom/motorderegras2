/** Checagens complementares: sinalizar, nunca alterar os números automaticamente. */
import {normalizeCase} from './engine.mjs';
export function auditCase(input,{today=new Date()}={}){
 const c=normalizeCase(input),issues=[];const push=(severity,code,text)=>issues.push({severity,code,text});
 const noSource=c.budget.filter(e=>e.gross>0&&!e.source).length;
 if(noSource)push('info','EXPENSE_SOURCE',`${noSource} despesa(s) sem origem registrada. Informe ou importe uma planilha para facilitar a conferência.`);
 const overBenefit=c.budget.filter(e=>e.ticket>e.gross).length;
 if(overBenefit)push('warning','OVER_BENEFIT',`${overBenefit} despesa(s) têm cobertura de benefício maior que o gasto bruto.`);
 const duplicated=c.budget.filter((e,i,a)=>a.findIndex(x=>x.name.trim().toLowerCase()===e.name.trim().toLowerCase()&&x.category.trim().toLowerCase()===e.category.trim().toLowerCase())!==i).length;
 if(duplicated)push('warning','DUPLICATE_EXPENSE',`${duplicated} despesa(s) com nome e categoria repetidos. Verifique se existe contagem dupla.`);
 const pending=c.debts.filter(d=>d.mode==='pending').length,notVerified=c.debts.filter(d=>d.mode==='included'&&!d.verified).length;
 if(pending)push('warning','PENDING_DEBTS',`${pending} credor(es) ainda não foram classificados para inclusão no plano.`);
 if(notVerified)push('warning','UNVERIFIED',`${notVerified} saldo(s) incluído(s) ainda não foram conferidos em documentos bancários.`);
 if(c.payroll.actualCashAfterLoan===0)push('warning','MISSING_NET','Informe o líquido efetivamente recebido após o desconto do consignado.');
 const usedBenefit=c.budget.reduce((a,x)=>a+x.ticket,0);
 if(usedBenefit>c.payroll.foodBenefit+.01)push('warning','BENEFIT_LIMIT','A soma de despesas cobertas pelo benefício ultrapassa o valor mensal informado do benefício.');
 if(c.consignado.snapshotDate){const ms=Date.parse(c.consignado.snapshotDate+'T00:00:00Z');if(Number.isFinite(ms)&&(today-ms)>90*86400000)push('info','STALE_LOAN','O retrato de parcelas do consignado tem mais de 90 dias. Atualize quantas parcelas foram pagas depois da data-base.');}
 else push('info','MISSING_SNAPSHOT','Preencha a data-base do consignado para acompanhar as parcelas restantes.');
 return {issues,duplicates:duplicated,withoutSource:noSource,pending,notVerified,overBenefit};
}