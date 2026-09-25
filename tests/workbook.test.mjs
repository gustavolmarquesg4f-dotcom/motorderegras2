import test from 'node:test';import assert from 'node:assert/strict';
import {readWorkbook} from '../web/src/readWorkbook.js';
import {previewImport} from '../shared/importer.mjs';
import * as XLSXModule from 'xlsx';
const XLSX=XLSXModule.default||XLSXModule;
const asFile=(name,buf)=>({name,size:buf.byteLength,arrayBuffer:async()=>buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)});
test('XLSX import is local and reads tabular rows',async()=>{const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Despesa','Categoria','Valor bruto','Cobertura benefício'],['Mercado','Casa',200,120]]),'Orçamento');const b=Buffer.from(XLSX.write(wb,{type:'array',bookType:'xlsx'}));const result=await readWorkbook(asFile('orcamento.xlsx',b));assert.equal(result.sheets[0].name,'Orçamento');assert.equal(previewImport(result.sheets[0]).entries[0].data.gross,200);});
test('CSV import detects two rows without uploading',async()=>{const b=Buffer.from('Despesa;Valor mensal\nAluguel;2200\nMercado;500','utf8');const r=await readWorkbook(asFile('lista.csv',b));assert.equal(previewImport(r.sheets[0]).entries.length,2);});
test('File guards reject unexpected type, empty and oversize',async()=>{await assert.rejects(()=>readWorkbook(asFile('arquivo.pdf',Buffer.from('foo'))));await assert.rejects(()=>readWorkbook(asFile('vazio.csv',Buffer.alloc(0))));await assert.rejects(()=>readWorkbook({name:'big.xlsx',size:11*1024*1024,arrayBuffer:async()=>{throw Error('should not read')}}));});