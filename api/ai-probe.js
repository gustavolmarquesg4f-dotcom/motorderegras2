/** Verificação real, sob login, sem transmitir dados financeiros ao provedor. */
import {createClient} from '@supabase/supabase-js';
import {PUBLIC_SUPABASE_URL,PUBLIC_SUPABASE_PUBLISHABLE_KEY} from '../shared/public-config.mjs';
import {completeStructured,configuredProviders} from '../shared/ai-provider.mjs';
import {CHAT_REPLY_SCHEMA} from '../shared/chat-schema.mjs';

const probeSchema={type:'object',additionalProperties:false,properties:{ok:{type:'boolean'},message:{type:'string'}},required:['ok','message']};
const stamp=new Map();
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido.'});
 const token=String(req.headers.authorization||'').match(/^Bearer (.+)$/)?.[1];
 if(!token)return res.status(401).json({error:'Entre na sua conta para testar a IA.'});
 const url=process.env.SUPABASE_URL||PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY||PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await client.auth.getUser(token);
 if(error||!user)return res.status(401).json({error:'Sessão inválida.'});
 const configured=configuredProviders(process.env,req.headers);
 if(!configured.length)return res.status(503).json({error:'Nenhum modelo configurado. Adicione GROQ_API_KEY e AI_PROVIDER=groq no projeto Plano Justo da Vercel.'});
 const now=Date.now(),last=stamp.get(user.id)||0;
 if(now-last<60000)return res.status(429).json({error:'Aguarde um minuto para realizar outro teste.'});
 if(stamp.size>1000)stamp.clear();stamp.set(user.id,now);
 try{
  const {result,provider,model}=await completeStructured({instructions:'Teste de conectividade. Responda exclusivamente JSON com ok=true e message="Conexão validada". Não há dados financeiros nesta solicitação.',messages:[{role:'user',content:'Confirme a conexão com a resposta JSON indicada.'}],schema:probeSchema,headers:req.headers});
  if(result.ok!==true)return res.status(502).json({error:'A resposta básica não confirmou a conexão.',stage:'basic'});
  // O teste básico antes deixava passar o erro real: o chat usa OUTRO schema e prompt.
  // Testar esse contrato com caso inteiramente fictício, jamais com os dados privados do titular.
  const synthetic={scenario:'fictício para teste técnico, nenhum dado pessoal',household:{people:3,monthlyNet:5400,monthlyEssentials:4300},creditors:[{name:'Banco fictício A',referenceBalance:8700},{name:'Banco fictício B',referenceBalance:3500}],plan:{monthly:300,months:60},warnings:['Saldo e documentação precisam de atualização']};
  let chat;
  try{
    chat=await completeStructured({instructions:'Você é o assistente financeiro. Dados sintéticos para verificar o formato real de conversa. Responda em português e exclusivamente com o JSON do esquema.',messages:[{role:'user',content:'Resuma em uma frase o cenário TESTE FICTÍCIO: '+JSON.stringify(synthetic)}],schema:CHAT_REPLY_SCHEMA,headers:req.headers});
  }catch(e){
    console.error('PlanoJusto AI conversation probe:',JSON.stringify({provider:e.provider||'unknown',status:e.upstreamStatus||null,code:e.upstreamCode||null,type:e.upstreamType||null,model:e.model||null}));
    return res.status(e.status||502).json({ok:false,stage:'conversation',basic:{ok:true,provider,model},error:'Conexão básica OK, mas o formato real de conversa foi recusado: '+(e.message||'Falha no provedor.'),upstreamCode:e.upstreamCode||null,upstreamType:e.upstreamType||null,model:e.model||null});
  }
  if(!String(chat.result.answer||'').trim())return res.status(502).json({ok:false,stage:'conversation',error:'O modelo respondeu, mas não trouxe o campo answer no teste de conversa.'});
  return res.status(200).json({ok:true,provider:chat.provider,model:chat.model,checkedAt:new Date().toISOString(),stage:'full',basicModel:model});
 }catch(e){
    console.error('PlanoJusto AI basic probe:',JSON.stringify({provider:e.provider||'unknown',status:e.upstreamStatus||null,code:e.upstreamCode||null,type:e.upstreamType||null,model:e.model||null}));
    return res.status(e.status||502).json({ok:false,stage:'basic',error:e.message||'A IA não respondeu.',provider:e.provider||'unavailable',upstreamCode:e.upstreamCode||null,upstreamType:e.upstreamType||null,model:e.model||null});
 }
}