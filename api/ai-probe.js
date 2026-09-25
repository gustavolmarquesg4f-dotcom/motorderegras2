/** Verificação real, sob login, sem transmitir dados financeiros ao provedor. */
import {createClient} from '@supabase/supabase-js';
import {PUBLIC_SUPABASE_URL,PUBLIC_SUPABASE_PUBLISHABLE_KEY} from '../shared/public-config.mjs';
import {completeStructured,configuredProviders} from '../shared/ai-provider.mjs';

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
  if(result.ok!==true)return res.status(502).json({error:'A resposta não confirmou a conexão.'});
  return res.status(200).json({ok:true,provider,model,checkedAt:new Date().toISOString()});
 }catch(e){return res.status(e.status||502).json({error:e.message||'A IA não respondeu.',provider:e.provider||'unavailable'});}
}