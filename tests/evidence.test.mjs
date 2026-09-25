import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeCase,evaluate} from '../shared/engine.mjs';
import {normalizeEvidence,loanSummary,ledgerSummary,creditorDossier} from '../shared/evidence.mjs';
import {makeReport,workbookSheets} from '../shared/report-data.mjs';
const ledger=[
 {date:'2026-07-08',kind:'opening_balance',amount:100,source:'teste'},
 {date:'2026-07-08',kind:'purchase',amount:25,source:'teste'},
 {date:'2026-07-08',kind:'interest',amount:10,source:'teste'},
 {date:'2026-07-08',kind:'payment',amount:20,source:'teste'},
 {date:'2026-07-08',kind:'transfer_pending',amount:50,source:'teste'},
 {date:'2026-07-08',kind:'closing_balance',amount:115,source:'teste'},
 {date:'2026-08-08',kind:'opening_balance',amount:115,source:'teste'},
 {date:'2026-08-08',kind:'purchase',amount:5,source:'teste'},
 {date:'2026-08-08',kind:'other_adjustment',amount:4,source:'ajuste indefinido'},
 {date:'2026-08-08',kind:'closing_balance',amount:124,source:'teste'}];
const raw={profile:{name:'Caso ilustrativo'},payroll:{actualCashAfterLoan:3000},budget:[{id:'a',name:'Moradia',gross:2000}],consignado:{remaining:10,installment:100,snapshotDate:'2026-07-01',settlementReference:820},debts:[{id:'c',creditor:'Cartão ilustrativo',type:'Cartão',claim:250,base:200,mode:'included',kind:'consumer'}],plan:{monthly:500,months:60,mode:'parallel'},evidence:{loan:{originalFinanced:1100,paidPrincipal:150,paidInterest:200,paidOther:4,paidTotal:354,settlementAmount:820,settlementAsOf:'2026-07-01'},ledgers:{c:ledger}}};
test('evidência preservada ao normalizar modelo, inclusive versão',()=>{const s=normalizeCase(raw);assert.equal(s.schema,6);assert.equal(s.evidence.loan.paidInterest,200);assert.equal(s.evidence.ledgers.c.length,10)});
test('quitação datada distinta de parcelas nominais',()=>{const s=loanSummary(raw);assert.equal(s.snapshot,820);assert.equal(s.futureNominal,1000);assert.equal(s.nominalExcess,180);assert.equal(s.pastInterestShare,56.5);assert.equal(loanSummary({...raw,consignado:{...raw.consignado,paidAfterSnapshot:1}}).nominalExcess,null)});
test('diferença não discriminada não vira juros e transferência não vira pagamento',()=>{const s=ledgerSummary(ledger);assert.equal(s.knownPayments,20);assert.equal(s.unreconciledTransfers,50);assert.equal(s.chargesKnown,10);assert.equal(s.chargesUndisclosed,4);assert.equal(s.cycles[0].difference,0);assert.equal(s.cycles[1].difference,0)});
test('dossiê por credor indica data-base e pedidos documentais',()=>{const d=creditorDossier(raw,evaluate(raw),'itau_cons');assert.ok(d.lines.some(x=>x.text.includes('2026-07-01')));assert.ok(d.requests.some(x=>x.includes('DDC')))});
test('relatório completo contém memória, fontes e rateio sem descontar transferências',()=>{const r=makeReport(raw);assert.equal(r.dossiers.length,2);assert.equal(r.dossiers[1].summary.knownPayments,20);const w=workbookSheets(raw);assert.ok(w.Lancamentos.length>1);assert.ok(w.Justificativas.length>4);assert.ok(w.Cronograma.length>60)});
test('validadores descartam saldo negativo, tipo desconhecido e data inválida',()=>{const e=normalizeEvidence({ledgers:{x:[{kind:'foo',date:'invalid',amount:-99,source:'x'}]}});assert.equal(e.ledgers.x[0].kind,'other_adjustment');assert.equal(e.ledgers.x[0].date,'');assert.equal(e.ledgers.x[0].amount,0)});