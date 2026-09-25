/** Planilha local -> proposta revisável. Nenhuma linha é salva ou considerada prova automaticamente. */
import {normalizeCase} from './engine.mjs';
import {LEDGER_TYPES} from './evidence-core.mjs';

export const TYPES = Object.freeze({budget:'Orçamento/despesas',debts:'Credores/dívidas',payroll:'Renda/contracheque',ledger:'Histórico de faturas e pagamentos'});
export const FIELD_LABELS = Object.freeze({
 budget:{name:'Despesa / descrição',category:'Categoria (opcional)',gross:'Valor mensal bruto',ticket:'Pago pelo benefício (opcional)',cash:'Saída de dinheiro (alternativa)',source:'Fonte documental (opcional)'},
 debts:{creditor:'Credor',claim:'Saldo cobrado',base:'Base para proposta',source:'Fonte (opcional)'},
 payroll:{label:'Rubrica / descrição',value:'Valor em reais'},
 ledger:{date:'Data/competência (opcional)',description:'Descrição do lançamento',kind:'Natureza do lançamento (opcional)',amount:'Valor (R$)',source:'Fonte (opcional)',operationId:'Identificador do rotativo/parcelamento (opcional)'}
});
const ALIASES={
 name:['despesa','descricao','nome da despesa','item','gasto','nome','rubrica','descritivo'],
 category:['categoria','grupo','tipo de despesa','tipo','natureza'],
 gross:['valor mensal','valor bruto','valor da despesa','valor','valor r$','total mensal','valor gasto','gasto mensal','mensalidade','total da despesa'],
 ticket:['pago com beneficio','cobertura beneficio','vale alimentacao','ticket','beneficio','pago no vale','valor do ticket','beneficio alimentacao'],
 cash:['saida de dinheiro','dinheiro','valor em dinheiro','desembolso','valor em caixa','gasto em dinheiro'],
 creditor:['credor','instituicao','instituicao financeira','banco','financeira','nome do credor'],
 claim:['saldo cobrado','valor cobrado','saldo exigido','saldo atualizado','valor exigido','divida','divida atual'],
 base:['base do plano','base referencial','base','saldo base','valor de referencia','valor para proposta'],
 source:['fonte','documento','origem','comprovante'],
 label:['rubrica','descricao','campo','titulo','item'],
 value:['valor','valor r$','montante','valor informado'],
 date:['data','competencia','mes','dt lancamento','data da transacao'],description:['descricao','historico','lancamento','descricao do lancamento','detalhe'],kind:['natureza','tipo de lancamento','categoria','tipo','tipo do lancamento'],amount:['valor','valor r$','valor do lancamento','valor da transacao','montante'],operationId:['contrato','operacao','id operacao','identificador da operacao']
};
export function keyOf(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
export function amountOf(input){
 if(typeof input==='number')return Number.isFinite(input)?input:null;
 if(input==null||typeof input==='boolean')return null;
 let s=String(input).trim();if(!s)return null;
 const negative=/^\(.*\)$/.test(s);s=s.replace(/[R$\s\u00a0]/g,'').replace(/[()]/g,'');
 if(!/^-?[\d.,]+$/.test(s)||!/[0-9]/.test(s))return null;
 const lastComma=s.lastIndexOf(','),lastDot=s.lastIndexOf('.');
 if(lastComma>=0&&lastDot>=0){s=lastComma>lastDot?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');}
 else if(lastComma>=0){const parts=s.split(',');s=parts.length>2||parts.at(-1).length===3?s.replace(/,/g,''):s.replace(',','.');}
 else if(lastDot>=0){const parts=s.split('.');if(parts.length>2||parts.at(-1).length===3)s=s.replace(/\./g,'');}
 const n=Number(s);return Number.isFinite(n)?(negative?-Math.abs(n):n):null;
}
const LETTER=i=>{let s='',n=i+1;while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s};
export function columnsFor(sheet,headerRow){const row=sheet.rows[headerRow]||[];const length=Math.min(45,Math.max(sheet.rows.reduce((m,r)=>Math.max(m,r.length),0),row.length));return Array.from({length},(_,i)=>({index:i,label:`${LETTER(i)} — ${String(row[i]??'').trim()||'(sem título)'}`}));}
function aliasScore(value,alias){const k=keyOf(value);if(!k)return 0;return alias.includes(k)?3:alias.some(x=>k.startsWith(x+' '))?1:0;}
export function detectHeaderRow(sheet){
 let best={index:0,score:-1};for(let row=0;row<Math.min(20,sheet.rows.length);row++){
  const values=(sheet.rows[row]||[]).slice(0,45),used=new Set();let score=0;
  for(const value of values)for(const [field,aliases] of Object.entries(ALIASES)){if(!used.has(field)){const match=aliasScore(value,aliases);if(match){score+=match;used.add(field);break;}}}
  if(score>best.score)best={index:row,score};
 }return best.index;
}
export function suggestMapping(sheet,type,headerRow=detectHeaderRow(sheet)){
 const fields=FIELD_LABELS[type]||FIELD_LABELS.budget;
 const cells=(sheet.rows[headerRow]||[]).slice(0,45);
 const mapping={};for(const field of Object.keys(fields)){
  let best={i:-1,score:0};for(let i=0;i<cells.length;i++){const score=aliasScore(cells[i],ALIASES[field]||[]);if(score>best.score)best={i,score};}
  mapping[field]=best.i;
 }
 return mapping;
}
export function inferSheet(sheet){
 const header=detectHeaderRow(sheet),b=suggestMapping(sheet,'budget',header),d=suggestMapping(sheet,'debts',header),p=suggestMapping(sheet,'payroll',header),n=keyOf(sheet.name);
 if(/(fatura|lancamentos|extrato cartao|pagamentos|encargos|movimentacao)/.test(n)){const l=suggestMapping(sheet,'ledger',header);if(l.description>=0&&l.amount>=0)return 'ledger';}
 if(/(orcamento|despesas|gastos|budget|mercado)/.test(n)&&b.name>=0)return 'budget';
 if(/(credor|divida|debt)/.test(n)&&d.creditor>=0)return 'debts';
 if(/(folha|renda|salario|contracheque|payroll)/.test(n)&&p.label>=0)return 'payroll';
 if(d.creditor>=0&&(d.base>=0||d.claim>=0))return 'debts';
 if(p.label>=0&&p.value>=0&&payrollField(String(sheet.rows[header+1]?.[p.label]||'')))return 'payroll';
 if(b.name>=0&&(b.gross>=0||b.cash>=0))return 'budget';
 if(p.label>=0&&p.value>=0)return 'payroll';
 return 'budget';
}
const PAYROLL_LABELS={
 salaryGross:['salario bruto','remuneracao bruta','renda bruta'],
 wfh:['ajuda wfh','ajuda custo','ajuda de custo','verbas adicionais'],
 dependents:['dependentes para irrf','dependentes irrf','dependentes'],
 inssActual:['inss efetivo','inss no contracheque','inss no holerite','desconto inss','inss descontado'],
 irrfClosing:['irrf no fechamento','irrf informado no fechamento','irrf efetivo','irrf no holerite','irrf descontado','imposto de renda retido'],
 union:['contribuicao assistencial','contribuicao sindical'],
 actualCashAfterLoan:['liquido efetivo apos consignado','liquido efetivo utilizado','liquido em caixa','salario liquido apos consignado','salario liquido','renda efetiva apos consignado'],
 foodBenefit:['ticket alimentacao','vale alimentacao','beneficio alimentacao','valor ticket'],
 foodUsed:['ticket utilizado','ticket gasto','beneficio utilizado','vale utilizado']
};
export function payrollField(label){const k=keyOf(label);for(const [field,names] of Object.entries(PAYROLL_LABELS))if(names.includes(k))return field;return null;}
function cell(row,mapping,key){const i=mapping[key];return i>=0?row[i]:''}
export function parseLedgerDate(raw){if(typeof raw==='number'){if(raw>30000&&raw<100000){const epoch=new Date(Date.UTC(1899,11,30)+Math.floor(raw)*86400000);return epoch.toISOString().slice(0,10)}return '';}let v=String(raw??'').trim();if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;const br=v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(br)return `${br[3]}-${br[2]}-${br[1]}`;return '';}
export function classifyLedger(description,kindValue=''){let key=keyOf(kindValue||description);if(!key)return 'other_adjustment';const match=Object.keys(LEDGER_TYPES).find(k=>key===keyOf(k)||key===keyOf(LEDGER_TYPES[k]));if(match)return match; if(/(saldo anterior|saldo inicial)/.test(key))return 'opening_balance';if(/(total fatura|saldo final|total da fatura)/.test(key))return 'closing_balance';if(/(transferencia|pix a conciliar)/.test(key))return 'transfer_pending';if(/(pagamento|pgto|liquidacao de fatura)/.test(key))return 'payment';if(/(juros de mora|mora)/.test(key))return 'late_interest';if(/(juros|encargos remuneratorios)/.test(key))return 'interest';if(/(\biof\b)/.test(key))return 'iof';if(/(multa)/.test(key))return 'fine';if(/(tarifa|anuidade)/.test(key))return 'fee';if(/(parcela do rotativo|parcela de fatura)/.test(key))return 'financed_installment';if(/(compra|despesa|boleto|pix no cartao)/.test(key))return 'purchase';if(/(proposta|renegociacao)/.test(key))return 'offer';return 'other_adjustment';}
function isTotal(name){return /^(total|sub ?total|saldo|resultado|somatorio|soma|media|observac(?:ao|oes)|obs\b|mes|meses)(\b|$)/.test(keyOf(name));}
export function previewImport(sheet,{type=inferSheet(sheet),headerRow=detectHeaderRow(sheet),mapping=suggestMapping(sheet,type,headerRow),fileName='planilha'}={}){
 if(!TYPES[type])throw new Error('Tipo de planilha inválido.');
 const required=type==='budget'?['name']:type==='debts'?['creditor']:type==='ledger'?['description','amount']:['label','value'];
 if(required.some(k=>!Number.isInteger(mapping[k])||mapping[k]<0))return {entries:[],warnings:['Selecione as colunas obrigatórias.'],skipped:0,invalid:0,duplicates:0,type,headerRow,mapping,fileName,sheetName:sheet.name};
 if(type==='budget'&&!(mapping.gross>=0)&&!(mapping.cash>=0))return {entries:[],warnings:['Selecione a coluna de valor mensal ou de saída de dinheiro.'],skipped:0,invalid:0,duplicates:0,type,headerRow,mapping,fileName,sheetName:sheet.name};
 if(type==='debts'&&!(mapping.claim>=0)&&!(mapping.base>=0))return {entries:[],warnings:['Selecione o saldo cobrado ou a base do plano.'],skipped:0,invalid:0,duplicates:0,type,headerRow,mapping,fileName,sheetName:sheet.name};
 const entries=[],warnings=[],seen=new Set();let skipped=0,invalid=0,duplicates=0;
 for(let i=headerRow+1;i<Math.min(sheet.rows.length,2005);i++){
  const row=sheet.rows[i]||[],description=String(cell(row,mapping,type==='budget'?'name':type==='debts'?'creditor':type==='ledger'?'description':'label')??'').trim();
  if(!description||(type!=='ledger'&&isTotal(description))){skipped++;continue;}
  const source=`${fileName} · ${sheet.name} · linha ${i+1}`;
  const raw=type==='budget'?{
   name:description,category:String(cell(row,mapping,'category')??'').trim()||'Não classificada',
   gross:amountOf(cell(row,mapping,'gross')),ticket:amountOf(cell(row,mapping,'ticket')),cash:amountOf(cell(row,mapping,'cash')),source:String(cell(row,mapping,'source')??'').trim()||source
  }:type==='debts'?{
   creditor:description,claim:amountOf(cell(row,mapping,'claim')),base:amountOf(cell(row,mapping,'base')),
   source:String(cell(row,mapping,'source')??'').trim()||source
  }:type==='ledger'?{description,date:parseLedgerDate(cell(row,mapping,'date')),kind:classifyLedger(description,cell(row,mapping,'kind')),amount:amountOf(cell(row,mapping,'amount')),source:String(cell(row,mapping,'source')??'').trim()||source,operationId:String(cell(row,mapping,'operationId')??'').trim(),status:'unreconciled'}:{label:description,field:payrollField(description),value:amountOf(cell(row,mapping,'value')),source};
  if(type==='budget'){
   if(raw.gross==null&&raw.cash!=null)raw.gross=raw.cash+(raw.ticket??0);
   raw.ticket??=0;
   if(raw.gross==null||raw.gross<=0||raw.ticket<0||raw.ticket>raw.gross){invalid++;continue;}
  }else if(type==='debts'){
   raw.base??=raw.claim;raw.claim??=raw.base;
   if(raw.base==null||raw.claim==null||raw.base<=0||raw.claim<0){invalid++;continue;}
  }else if(type==='ledger'){if(raw.amount===null||raw.amount<=0){invalid++;continue;}}else if(!raw.field||raw.value==null||raw.value<0){skipped++;continue;}
  const unique=type==='budget'?`${keyOf(raw.name)}|${keyOf(raw.category)}`:type==='debts'?keyOf(raw.creditor):type==='ledger'?`${raw.date}|${keyOf(raw.description)}|${raw.kind}|${raw.amount}`:raw.field;
  if(seen.has(unique)){duplicates++;continue;}seen.add(unique);
  entries.push({id:`${sheet.name}-${i}`,rowNumber:i+1,selected:true,data:raw});
 }
 if(invalid)warnings.push(`${invalid} linha(s) com valores inválidos ou benefício maior que o gasto foram ignoradas.`);
 if(duplicates)warnings.push(`${duplicates} descrição(ões) repetida(s) na mesma aba foram ignoradas para evitar duplicação.`);
 if(sheet.rows.length>2005)warnings.push('Somente as primeiras 2.000 linhas úteis são analisadas; divida arquivos maiores por competência.');
 if(type==='debts')warnings.push('Saldos importados não são provas contratuais: a verificação permanece pendente.');
 if(type==='ledger')warnings.push('Classificações são sugestões. Confira cada linha; pagamentos sem comprovação de apropriação devem permanecer como transferências a conciliar.');
 if(type==='payroll')warnings.push('Somente rubricas reconhecidas são propostas; estimativas de INSS/IRRF e totais são ignorados.');
 return {entries,warnings,skipped,invalid,duplicates,type,headerRow,mapping,fileName,sheetName:sheet.name};
}
export function applyImportCase(model,preview,selectedIds,{replace=false,creditorId=''}={}){
 const next=normalizeCase(model),selected=new Set(selectedIds),rows=preview.entries.filter(x=>selected.has(x.id)).map(x=>x.data);
 const changes={added:0,updated:0,unchanged:0};
 if(!rows.length)throw new Error('Selecione pelo menos uma linha válida.');
 if(preview.type==='budget'){
  const dest=replace?[]:[...next.budget];
  for(const row of rows){let ix=dest.findIndex(x=>keyOf(x.name)===keyOf(row.name)&&keyOf(x.category)===keyOf(row.category));
   const data={name:row.name,category:row.category,gross:row.gross,ticket:row.ticket,kind:'essencial',source:row.source};
   if(ix>=0){const old=dest[ix];if(old.gross===data.gross&&old.ticket===data.ticket){changes.unchanged++;continue;}
    dest[ix]={...old,...data};changes.updated++;
   }else{dest.push({...data,id:`import-budget-${dest.length}-${keyOf(row.name).replace(/ /g,'-').slice(0,50)}`});changes.added++;}
  }next.budget=dest;
 }else if(preview.type==='debts'){
  const dest=replace?[]:[...next.debts];
  for(const row of rows){let ix=dest.findIndex(x=>keyOf(x.creditor)===keyOf(row.creditor));const data={creditor:row.creditor,claim:row.claim,base:row.base,source:row.source};
   if(ix>=0){const old=dest[ix];if(old.claim===data.claim&&old.base===data.base){changes.unchanged++;continue;}
    dest[ix]={...old,...data,verified:false};changes.updated++;
   }else{dest.push({...data,id:`import-debt-${dest.length}-${keyOf(row.creditor).replace(/ /g,'-').slice(0,50)}`,type:'Não informado',mode:'pending',kind:'consumer',verified:false});changes.added++;}
  }next.debts=dest;
 }else if(preview.type==='ledger'){
  if(!next.debts.some(d=>d.id===creditorId))throw new Error('Escolha o credor deste histórico de faturas.');
  const dest=replace?[]:[...(next.evidence.ledgers[creditorId]||[])];
  const fingerprint=x=>`${x.date}|${keyOf(x.description)}|${x.kind}|${x.amount}`;
  for(const row of rows){if(dest.some(x=>fingerprint(x)===fingerprint(row))){changes.unchanged++;continue;}dest.push({...row,id:`import-ledger-${dest.length}-${keyOf(row.description).replace(/ /g,'-').slice(0,28)}`});changes.added++;}
  next.evidence.ledgers[creditorId]=dest;
 }else{
  for(const row of rows){if(next.payroll[row.field]===row.value){changes.unchanged++;continue;}next.payroll[row.field]=row.value;changes.updated++;}
 }
 return {model:normalizeCase(next),changes,count:rows.length};
}