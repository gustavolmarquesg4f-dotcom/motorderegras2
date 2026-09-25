/** Leitura exclusivamente local: o arquivo não é transmitido à API nem ao banco. */
export async function readWorkbook(file){
 if(!file)throw new Error('Selecione uma planilha.');
 if(!/\.(xlsx|xls|csv)$/i.test(file.name))throw new Error('Formato não suportado. Use XLSX, XLS ou CSV.');
 if(file.size>10*1024*1024)throw new Error('A planilha excede 10 MB; separe a competência ou exporte só a aba necessária.');
 if(file.size===0)throw new Error('Arquivo vazio.');
 const module=await import('xlsx');const XLSX=module.default||module;
 const bytes=await file.arrayBuffer();
 const workbook=XLSX.read(bytes,{type:'array',cellFormula:false,cellHTML:false,cellStyles:false,bookVBA:false,cellDates:false,sheetRows:2006});
 if(!workbook.SheetNames?.length)throw new Error('Não foram encontradas abas legíveis.');
 if(workbook.SheetNames.length>24)throw new Error('Planilha com muitas abas: limite de 24 abas por arquivo.');
 const sheets=[];
 for(const name of workbook.SheetNames){
  const raw=XLSX.utils.sheet_to_json(workbook.Sheets[name],{header:1,defval:'',raw:true,blankrows:false});
  if(raw.length>2005)throw new Error('Há mais de 2.000 linhas na aba '+name+'. Separe o arquivo por período.');
  if(raw.some(row=>row.length>45))throw new Error('A aba '+name+' ultrapassa o limite de 45 colunas.');
  sheets.push({name,rows:raw.map(row=>row.map(v=>(typeof v==='number'||typeof v==='string')?v:String(v??'')))});
 }
 return {name:file.name,sheets};
}