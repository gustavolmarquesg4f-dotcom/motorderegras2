/** Plano Justo: deterministic rules. No AI writes to this engine. */
import {normalizeEvidence} from './evidence-core.mjs';
import {normalizeKnowledge} from './knowledge.mjs';
export const MAX_MONTHS = 60;
export const FIRST_REQUESTED_MONTH = '2027-03';
export const INSS_2026 = [[1621,.075],[2902.84,.09],[4354.27,.12],[8475.55,.14]];
export const REFERENCE = Object.freeze({
  cdc:'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm',
  decree:'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/decreto/d11567.htm',
  ir:'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026',
  inss:'https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal'
});
const v=x=>Number.isFinite(Number(x))?Number(x):0;
const rounded=x=>Math.round((x+Number.EPSILON)*100)/100;
const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
export const brl=x=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v(x));
export const monthAdd=(ym,delta)=>{const [year,month]=String(ym).split('-').map(Number); if(!year||month<1||month>12)return null; const d=new Date(Date.UTC(year,month-1+delta,1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`};
export function inss2026(gross){let left=clamp(v(gross),0,8475.55),prev=0,sum=0;for(const [cap,rate] of INSS_2026){sum+=(Math.max(0,Math.min(left,cap)-prev))*rate;prev=cap;if(left<=cap)break;}return rounded(sum)}
export function irrf2026(gross,inss,dependents=0){const deduction=Math.max(607.2,v(inss)+Math.max(0,Math.floor(v(dependents)))*189.59),base=Math.max(0,v(gross)-deduction);let tax=base<=2428.8?0:base<=2826.65?base*.075-182.16:base<=3751.05?base*.15-394.16:base<=4664.68?base*.225-675.49:base*.275-908.73;tax=Math.max(0,tax);const reduction=v(gross)<=5000?Math.min(tax,312.89):v(gross)<=7350?Math.min(tax,Math.max(0,978.62-.133145*v(gross))):0;return {base:rounded(base),deduction:rounded(deduction),beforeReduction:rounded(tax),reduction:rounded(reduction),tax:rounded(Math.max(0,tax-reduction))}}
export function normalizeCase(src={}){
  const s=structuredClone(src||{});
  const payroll=s.payroll||{},plan=s.plan||{},cons=s.consignado||{};
  return {schema:8,knowledge:normalizeKnowledge(s.knowledge),evidence:normalizeEvidence(s.evidence),profile:{name:s.profile?.name||'',case:s.profile?.case||'',court:s.profile?.court||'TJDFT / CEJUSC-SUPER-PRE',family:v(s.profile?.family)||1},
    payroll:{salaryGross:v(payroll.salaryGross),wfh:v(payroll.wfh),dependents:v(payroll.dependents),inssActual:v(payroll.inssActual),irrfActual:v(payroll.irrfActual??payroll.irrfClosing),irrfClosing:v(payroll.irrfClosing),union:v(payroll.union),other:v(payroll.other),advance:v(payroll.advance),closingPay:v(payroll.closingPay),actualCashAfterLoan:v(payroll.actualCashAfterLoan),foodBenefit:v(payroll.foodBenefit),foodUsed:v(payroll.foodUsed)},
    budget:Array.isArray(s.budget)?s.budget.map((x,i)=>({id:String(x.id||`e-${i}`),name:String(x.name||''),category:String(x.category||''),gross:v(x.gross),ticket:v(x.ticket),kind:String(x.kind||'essencial'),source:String(x.source||'')})):[],
    consignado:{total:v(cons.total),paid:v(cons.paid),remaining:v(cons.remaining),installment:v(cons.installment),snapshotDate:cons.snapshotDate||'',paidAfterSnapshot:Math.max(0,v(cons.paidAfterSnapshot)),confirmedStop:cons.confirmedStop===true,settlementReference:v(cons.settlementReference),source:cons.source||''},
    debts:(Array.isArray(s.debts)?s.debts:[]).map((d,i)=>({id:String(d.id||`d-${i}`),creditor:String(d.creditor||''),type:String(d.type||''),base:Math.max(0,v(d.base??d.updatedBalance)),claim:Math.max(0,v(d.claim??d.updatedBalance)),reference:v(d.reference),source:String(d.source||''),verified:d.verified===true,mode:['included','excluded','pending'].includes(d.mode)?d.mode:'pending',kind:d.kind||'consumer',contractedAmount:d.contractedAmount??null,agreedInstallment:d.agreedInstallment??null,effectiveRate:d.effectiveRate??null,installmentsPaid:d.installmentsPaid??null,installmentsToPay:d.installmentsToPay??null,updatedBalance:d.updatedBalance??null,interest:Math.max(0,v(d.interest))})),
    plan:{startMonth:String(plan.startMonth||FIRST_REQUESTED_MONTH),monthly:Math.max(0,v(plan.monthly)||1000),months:clamp(Math.floor(v(plan.months)||60),1,MAX_MONTHS),mode:['substitution','parallel'].includes(plan.mode)?plan.mode:'substitution',reserve:Math.max(0,v(plan.reserve)||300),allocation:['proportional','equal'].includes(plan.allocation)?plan.allocation:'proportional',negotiatedInterest:Math.max(0,v(plan.negotiatedInterest)),homologation:String(plan.homologation||''),signed:plan.signed===true,notes:String(plan.notes||'')},docs:Array.isArray(s.docs)?s.docs:[]};
}
export function amountForConsignado(c){const remaining=Math.max(0,Math.floor(v(c.remaining))-Math.floor(v(c.paidAfterSnapshot)));return {remaining,nominal:rounded(remaining*v(c.installment)),settlementReference:v(c.settlementReference)}}
export function annuity(balance,ratePercent,months){const b=Math.max(0,v(balance)),r=Math.max(0,v(ratePercent))/100,n=clamp(Math.floor(v(months)),1,MAX_MONTHS);return r===0?rounded(b/n):rounded(b*r/(1-Math.pow(1+r,-n)))}
export function evaluate(input){const s=normalizeCase(input),p=s.plan,cons=amountForConsignado(s.consignado),gross=s.payroll.salaryGross,actualInss=s.payroll.inssActual||inss2026(gross),ir=irrf2026(gross,actualInss,s.payroll.dependents);
 const rowGross=s.budget.reduce((a,x)=>a+x.gross,0),ticket=Math.min(s.payroll.foodBenefit,s.payroll.foodUsed,s.budget.reduce((a,x)=>a+x.ticket,0)),cashBudget=rounded(rowGross-ticket),actualNet=s.payroll.actualCashAfterLoan,loan=s.consignado.installment;
 const beforeLoan=rounded(actualNet+loan),available=p.mode==='substitution'&&s.consignado.confirmedStop?beforeLoan:actualNet;
 // Hypothetical substitution scenario is shown separately; never assume confirmedStop from request or AI.
 const conditionalAvailable=p.mode==='substitution'?beforeLoan:actualNet;
 const afterProposal=rounded(conditionalAvailable-cashBudget-p.monthly),currentGap=rounded(actualNet-cashBudget);
 const reserveHeadroom=rounded(conditionalAvailable-cashBudget-p.monthly-p.reserve);
 const eligible=s.debts.filter(d=>d.mode==='included'&&d.kind==='consumer');const bases=[{id:'itau_cons',creditor:'Itaú consignado (fluxo nominal)',base:cons.nominal,verified:false,source:s.consignado.source,rate:p.negotiatedInterest},...eligible.map(d=>({id:d.id,creditor:d.creditor,base:d.base,verified:d.verified,source:d.source,rate:d.interest||p.negotiatedInterest}))];
 const baseTotal=rounded(bases.reduce((a,x)=>a+x.base,0));const n=bases.length;
 const schedule=[],allocations=[],warnings=[];
 for(const b of bases){let rem=b.base;const share=p.allocation==='equal'?1/n:(baseTotal>0?b.base/baseTotal:0),target=p.monthly*share;let totalPaid=0,interestTotal=0;for(let i=0;i<p.months;i++){const opening=rem,interest=rounded(opening*b.rate/100),payment=rounded(Math.min(opening+interest,target)),ending=rounded(Math.max(0,opening+interest-payment));schedule.push({month:monthAdd(p.startMonth,i),index:i+1,creditor:b.creditor,opening,interest,payment,ending});rem=ending;totalPaid+=payment;interestTotal+=interest;}allocations.push({...b,share,monthly:rounded(target),required:annuity(b.base,b.rate,p.months),paid:rounded(totalPaid),interest:rounded(interestTotal),ending:rounded(rem),adjustment:rounded(Math.max(0,rem))});}
 const totalEnding=rounded(allocations.reduce((a,x)=>a+x.ending,0)),totalPaid=rounded(allocations.reduce((a,x)=>a+x.paid,0));
 if(p.months>=MAX_MONTHS)warnings.push({severity:'info',code:'MAX_60',text:'Prazo máximo de 60 meses respeitado.'});
 if(!s.consignado.confirmedStop&&p.mode==='substitution')warnings.push({severity:'critical',code:'LOAN_NOT_STOPPED',text:'O desconto do consignado NÃO está suspenso. A viabilidade com liberação da folha é condicional à formalização e implementação do acordo.'});
 if(currentGap<0)warnings.push({severity:'critical',code:'CURRENT_DEFICIT',text:`Déficit atual de ${brl(-currentGap)} antes das demais dívidas.`});
 if(afterProposal<0)warnings.push({severity:'critical',code:'UNSUSTAINABLE',text:'A parcela simulada deixa orçamento negativo mesmo após substituição do consignado.'});
 if(reserveHeadroom<0)warnings.push({severity:'warning',code:'RESERVE',text:'A parcela consome a reserva de segurança configurada.'});
 if(totalEnding>.01)warnings.push({severity:'warning',code:'RENEGOTIATION_NEEDED',text:`Saldo residual ilustrativo de ${brl(totalEnding)} após o prazo; é necessidade de negociação, não desconto deferido.`});
 if(s.debts.some(d=>d.mode==='pending'))warnings.push({severity:'warning',code:'PENDING_CREDITORS',text:'Há obrigações pendentes de enquadramento ou documentação.'});
 if(s.debts.some(d=>d.mode==='included'&&!d.verified))warnings.push({severity:'warning',code:'UNVERIFIED_BALANCES',text:'Existem saldos de credores não verificados pelo demonstrativo exigido na decisão judicial.'});
 if(p.startMonth!==FIRST_REQUESTED_MONTH)warnings.push({severity:'info',code:'START_CHANGED',text:`Início solicitado ajustado para ${p.startMonth}; confirmar legalmente a data e a homologação.`});
 if(p.homologation){const hm=p.homologation.slice(0,7);if(p.startMonth<hm)warnings.push({severity:'critical',code:'BEFORE_HOMOLOGATION',text:'A primeira parcela não pode anteceder a homologação informada.'});}
 const finish=monthAdd(p.startMonth,p.months-1);const formalMinimum=600;
 const missingData=s.debts.filter(d=>d.mode==='included').flatMap(d=>['contractedAmount','agreedInstallment','effectiveRate','installmentsPaid','installmentsToPay','updatedBalance'].filter(k=>d[k]===null).map(k=>({creditor:d.creditor,field:k})));
 return {case:s,finance:{gross,grossPlusAllowance:rounded(gross+s.payroll.wfh),inssEstimated:inss2026(gross),inssActual:actualInss,irrfEstimated:ir.tax,irrfActual:s.payroll.irrfActual,cashReceived:actualNet,loan,beforeLoan,expenseGross:rounded(rowGross),benefitOffset:rounded(ticket),cashBudget,currentGap,conditionalAvailable,afterProposal,reserveHeadroom,formalMinimum},consignado:cons,baseTotal,allocations,schedule,totalEnding,totalPaid,warnings,missingData,finish,requestedStart:p.startMonth,legal:{termMonths:MAX_MONTHS,firstDueDaysForJudicialPlan:180,sources:REFERENCE}};
}
export function applySuggestion(model,s){const permitted={'plan.monthly':[0,100000],'plan.months':[1,60],'plan.startMonth':'month','plan.reserve':[0,50000],'plan.negotiatedInterest':[0,50],'consignado.paidAfterSnapshot':[0,48],'payroll.actualCashAfterLoan':[0,500000]};if(!(s.path in permitted))throw new Error('Campo não autorizado');const c=normalizeCase(model),[group,key]=s.path.split('.');if(permitted[s.path]==='month'){if(!/^20\d\d-(0[1-9]|1[0-2])$/.test(s.value))throw new Error('Mês inválido');c[group][key]=s.value}else{const [min,max]=permitted[s.path],value=Number(s.value);if(!Number.isFinite(value)||value<min||value>max)throw new Error('Valor fora dos limites');c[group][key]=s.path.endsWith('months')||s.path.endsWith('paidAfterSnapshot')?Math.floor(value):value}return c;}