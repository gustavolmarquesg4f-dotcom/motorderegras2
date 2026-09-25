/** Server-only provider routing. No finance data is sent unless caller authenticated/consented. */
import {DEFAULT_GATEWAY_MODEL} from './public-config.mjs';

export class AIServiceError extends Error {
  constructor(message,{status=503,provider='unavailable',upstreamStatus=null}={}){super(message);this.name='AIServiceError';this.status=status;this.provider=provider;this.upstreamStatus=upstreamStatus}
}
const err=(message,provider,upstreamStatus)=>new AIServiceError(message,{provider,upstreamStatus});
const clean=raw=>{const x=String(raw||'').trim();if(x.startsWith('```'))return x.replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();return x};
export function configuredProviders(env=process.env,requestHeaders={}) {
  const providers=[];
  if(env.XAI_API_KEY)providers.push('xai');
  if(env.OLLAMA_BASE_URL)providers.push('ollama');
  if(env.OPENAI_API_KEY)providers.push('openai');
  // Vercel OIDC only means a token exists, not that the project has AI credits.
  // Do not silently choose its known-403 Gateway; require explicit opt-in.
  if(env.AI_GATEWAY_API_KEY||String(env.AI_PROVIDER||'').toLowerCase()==='gateway'&&(requestHeaders['x-vercel-oidc-token']||env.VERCEL_OIDC_TOKEN))providers.push('gateway');
  const selected=String(env.AI_PROVIDER||'auto').trim().toLowerCase();
  if(selected==='auto')return providers;
  if(!['xai','ollama','openai','gateway'].includes(selected))return [];
  return providers.filter(provider=>provider===selected);
}
export function validateOllamaConfig(env=process.env){
  const raw=String(env.OLLAMA_BASE_URL||'').trim();if(!raw)return null;
  let url;try{url=new URL(raw)}catch{throw err('Endereço do servidor Ollama inválido.','ollama')}
  const host=url.hostname.toLowerCase();
  if(url.username||url.password||url.search||url.hash||url.pathname!=='/'&&url.pathname!=='')throw err('Configure somente a URL-base HTTPS do Ollama, sem senha na URL.','ollama');
  const isLoopback=['localhost','127.0.0.1','[::1]'].includes(host);
  if(url.protocol!=='https:'&&!(env.NODE_ENV!=='production'&&isLoopback&&url.protocol==='http:'))throw err('Ollama remoto exige HTTPS. Não exponha a porta 11434 sem TLS e autenticação.','ollama');
  if(env.VERCEL==='1'&&(isLoopback||host.endsWith('.local')||host.startsWith('10.')||host.startsWith('192.168.')||/^172\.(1[6-9]|2\d|3[01])\./.test(host)))throw err('Ollama em localhost/rede privada não é acessível à função em nuvem. Use endpoint HTTPS autenticado.','ollama');
  if(!isLoopback&&!env.OLLAMA_API_KEY)throw err('Configure OLLAMA_API_KEY somente no servidor para autenticar a conexão com o Ollama remoto.','ollama');
  return url.origin;
}
async function jsonResponse(url,opts,provider,timeoutMs=48000){
  let response;try{response=await fetch(url,{...opts,redirect:'error',signal:AbortSignal.timeout(timeoutMs)})}
  catch(e){throw err(e?.name==='TimeoutError'?'O modelo excedeu o tempo de resposta.':'Não foi possível alcançar o provedor configurado.',provider)}
  let body;try{body=await response.json()}catch{throw err('Resposta inválida do provedor de IA.',provider,response.status)}
  if(!response.ok){
    const message=response.status===403&&provider==='gateway'?'Gateway Vercel recusou acesso (403): créditos ou permissões. Configure outro provedor de IA no servidor.':response.status===403&&provider==='xai'?'xAI recusou acesso (403): confira permissão da chave, modelo e equipe na xAI Console.':response.status===401?'Credencial do provedor inválida.':response.status===429?'Limite ou crédito de uso do provedor atingido.':`Provedor ${provider} indisponível (HTTP ${response.status}).`;
    throw err(message,provider,response.status);
  }
  return body;
}
const toText=x=>String(x??'');
export async function completeStructured({instructions,messages,schema,env=process.env,headers={}}){
 const providers=configuredProviders(env,headers);if(!providers.length)throw err('Nenhum modelo está conectado. Configure um endpoint Ollama HTTPS autenticado ou chave de API própria.','unavailable');
 const content=[{role:'system',content:instructions},...messages.map(m=>({role:m.role,content:toText(m.content)}))];
 // Dados financeiros não migram silenciosamente entre fornecedores quando ocorre erro.
 const failures=[];
 const attempts=env.AI_ALLOW_FALLBACK==='true'?providers:providers.slice(0,1);
 for(const provider of attempts){
  try{
   let raw;
   if(provider==='xai'){
    const model=env.XAI_MODEL||'grok-4.7';
    const body=await jsonResponse('https://api.x.ai/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${env.XAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model,messages:content,stream:false,response_format:{type:'json_schema',json_schema:{name:'plano_justo',strict:true,schema}},max_completion_tokens:6500})},'xai',48000);
    raw=body.choices?.[0]?.message?.content;
   }else if(provider==='ollama'){
    const base=validateOllamaConfig(env);
    const body=await jsonResponse(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.OLLAMA_API_KEY||''}`},body:JSON.stringify({model:env.OLLAMA_MODEL||'gpt-oss:20b',messages:content,stream:false,format:schema,think:env.OLLAMA_REASONING||'high',options:{temperature:0.2,num_ctx:32768}})},'ollama',48000);
    raw=body.message?.content;
   }else if(provider==='openai'){
    const model=env.OPENAI_MODEL||'gpt-5.4';const body=await jsonResponse('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model,messages:content,stream:false,response_format:{type:'json_schema',json_schema:{name:'plano_justo',strict:true,schema}},max_completion_tokens:6500})},'openai',48000);raw=body.choices?.[0]?.message?.content;
   }else{
    const token=env.AI_GATEWAY_API_KEY||headers['x-vercel-oidc-token']||env.VERCEL_OIDC_TOKEN;const body=await jsonResponse('https://ai-gateway.vercel.sh/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({model:env.AI_GATEWAY_MODEL||DEFAULT_GATEWAY_MODEL,messages:content,stream:false,response_format:{type:'json_schema',json_schema:{name:'plano_justo',strict:true,schema}},max_tokens:6500})},'gateway',48000);raw=body.choices?.[0]?.message?.content;
   }
   if(!raw)throw err('O modelo não retornou conteúdo estruturado.',provider);
   let result;try{result=JSON.parse(clean(raw))}catch{throw err('O modelo não retornou JSON válido. Os dados do caso não foram alterados.',provider)}
   if(!result||typeof result!=='object'||Array.isArray(result))throw err('Formato da resposta da IA inválido.',provider);
   return {result,provider};
  }catch(e){const safe=e instanceof AIServiceError?e:err('Falha interna do provedor.',provider);failures.push(safe);}
 }
 throw failures.at(-1)||err('IA indisponível.','unavailable');
}