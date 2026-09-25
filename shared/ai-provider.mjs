/** Rotas de IA exclusivamente no servidor. Jamais incluir chaves no frontend ou no Git. */
import {DEFAULT_GATEWAY_MODEL} from './public-config.mjs';

export class AIServiceError extends Error {
  constructor(message,{status=503,provider='unavailable',upstreamStatus=null,upstreamCode=null,upstreamType=null,model=null}={}){
    super(message);this.name='AIServiceError';this.status=status;this.provider=provider;this.upstreamStatus=upstreamStatus;this.upstreamCode=upstreamCode;this.upstreamType=upstreamType;this.model=model;
  }
}
const err=(message,provider,upstreamStatus)=>new AIServiceError(message,{provider,upstreamStatus});
const clean=raw=>{const x=String(raw||'').trim();if(x.startsWith('```'))return x.replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();return x};

export function configuredProviders(env=process.env,requestHeaders={}) {
  const providers=[];
  // Primeira opção: mesma API/modelos que EnglishOS, mas com chave própria do projeto.
  if(env.GROQ_API_KEY)providers.push('groq');
  if(env.OLLAMA_BASE_URL)providers.push('ollama');
  if(env.OPENAI_API_KEY)providers.push('openai');
  // OIDC não comprova crédito. Gateway só com autorização explícita.
  if(env.AI_GATEWAY_API_KEY||String(env.AI_PROVIDER||'').toLowerCase()==='gateway'&&(requestHeaders['x-vercel-oidc-token']||env.VERCEL_OIDC_TOKEN))providers.push('gateway');
  const selected=String(env.AI_PROVIDER||'auto').trim().toLowerCase();
  if(selected==='auto')return providers;
  if(!['groq','ollama','openai','gateway'].includes(selected))return [];
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
    // A resposta upstream pode conter dados do prompt: NUNCA devolva error.message ou body ao cliente.
    // Apenas código/tipo limitados a identificadores ASCII sem informações do titular.
    const identifier=value=>/^[a-z][a-z0-9_]{0,71}$/.test(String(value||''))?String(value):null;
    const upstreamCode=identifier(body?.error?.code),upstreamType=identifier(body?.error?.type);
    const blockedModel=['model_permission_blocked_org','model_permission_blocked_project'].includes(upstreamCode);
    const message=response.status===403&&provider==='groq'
      ? blockedModel?`A Groq informou uma restrição do modelo (${upstreamCode}). Verifique as permissões do projeto/organização na Groq.`
       :`A Groq recusou esta requisição (403), apesar de o teste simples poder funcionar. O código de diagnóstico será exibido sem revelar dados do caso.`
      :response.status===403&&provider==='gateway'?'Gateway Vercel recusou acesso (403): créditos ou permissões.'
       :response.status===401?'Credencial do provedor inválida.'
       :response.status===429?'Limite de uso do provedor atingido. Verifique os limites e tente mais tarde.'
       :`Provedor ${provider} indisponível (HTTP ${response.status}).`;
    throw new AIServiceError(message,{provider,upstreamStatus:response.status,upstreamCode,upstreamType,status:response.status===429?429:502});
  }
  return body;
}
const toText=x=>String(x??'');
export function groqRequestBody({model,messages,schema,env={}}){
  const effort=['low','medium','high'].includes(String(env.GROQ_REASONING_EFFORT||''))?env.GROQ_REASONING_EFFORT:'high';
  const complex=Boolean(schema?.properties?.summary && schema?.properties?.creditorStrategy);
  const limit=complex?12000:4000;
  return {
    model,messages,stream:false,
    response_format:{type:'json_schema',json_schema:{name:'plano_justo',strict:true,schema}},
    reasoning_effort:effort,temperature:0.2,max_completion_tokens:limit
  };
}
async function completeGroq({content,schema,env}){
  const primary=String(env.GROQ_MODEL||'openai/gpt-oss-120b');
  const fallback=String(env.GROQ_FALLBACK_MODEL||'openai/gpt-oss-20b');
  if(!/^openai\/gpt-oss-(?:20b|120b)$/.test(primary)||!/^openai\/gpt-oss-(?:20b|120b)$/.test(fallback))throw err('Configure um modelo gpt-oss aceito pela Groq.','groq');
  // Alternativa dentro da MESMA conta Groq; não troca o processador dos dados.
  const models=env.GROQ_MODEL_FALLBACK==='false'||primary===fallback?[primary]:[primary,fallback];
  for(let i=0;i<models.length;i++){
    const model=models[i];
    try{
      const body=await jsonResponse('https://api.groq.com/openai/v1/chat/completions',{
        method:'POST',headers:{Authorization:`Bearer ${env.GROQ_API_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify(groqRequestBody({model,messages:content,schema,env}))
      },'groq',48000);
      const choice=body.choices?.[0];const raw=choice?.message?.content;
      if(choice?.finish_reason==='length')throw err('A resposta do modelo atingiu o limite de tokens. Reduza o escopo da análise.','groq');
      if(!raw)throw err('A Groq não retornou conteúdo estruturado.','groq');
      return {raw,model};
    }catch(e){
      if(e instanceof AIServiceError)e.model=model;
      // Não mascare um 403 de conteúdo/política/conta tentando o 20b: teste simples do 120b pode funcionar.
      // Fallback somente para erro EXPLICITAMENTE restrito a modelo ou modelo inexistente.
      const modelBlock=e instanceof AIServiceError&&[
        'model_permission_blocked_org','model_permission_blocked_project','model_not_found'
      ].includes(e.upstreamCode);
      if(i<models.length-1 && (modelBlock||e instanceof AIServiceError&&e.upstreamStatus===404))continue;
      throw e;
    }
  }
}
export async function completeStructured({instructions,messages,schema,env=process.env,headers={}}){
 const providers=configuredProviders(env,headers);
 if(!providers.length)throw err('Nenhum modelo conectado. Configure GROQ_API_KEY (Groq), Ollama HTTPS autenticado ou uma chave de API própria.','unavailable');
 const content=[{role:'system',content:instructions},...messages.map(m=>({role:m.role,content:toText(m.content)}))];
 // Dados financeiros NÃO migram silenciosamente entre empresas ao ocorrer erro.
 const failures=[];
 const attempts=env.AI_ALLOW_FALLBACK==='true'?providers:providers.slice(0,1);
 for(const provider of attempts){
  try{
   let raw,model;
   if(provider==='groq'){
     const response=await completeGroq({content,schema,env});raw=response.raw;model=response.model;
   }else if(provider==='ollama'){
    const base=validateOllamaConfig(env);model=env.OLLAMA_MODEL||'gpt-oss:20b';
    const body=await jsonResponse(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.OLLAMA_API_KEY||''}`},body:JSON.stringify({model,messages:content,stream:false,format:schema,think:env.OLLAMA_REASONING||'high',options:{temperature:0.2,num_ctx:32768}})},'ollama',48000);
    raw=body.message?.content;
   }else if(provider==='openai'){
    model=env.OPENAI_MODEL||'gpt-5.4';const body=await jsonResponse('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model,messages:content,stream:false,response_format:{type:'json_schema',json_schema:{name:'plano_justo',strict:true,schema}},max_completion_tokens:6500})},'openai',48000);raw=body.choices?.[0]?.message?.content;
   }else{
    model=env.AI_GATEWAY_MODEL||DEFAULT_GATEWAY_MODEL;const token=env.AI_GATEWAY_API_KEY||headers['x-vercel-oidc-token']||env.VERCEL_OIDC_TOKEN;const body=await jsonResponse('https://ai-gateway.vercel.sh/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({model,messages:content,stream:false,response_format:{type:'json_schema',json_schema:{name:'plano_justo',strict:true,schema}},max_tokens:6500})},'gateway',48000);raw=body.choices?.[0]?.message?.content;
   }
   if(!raw)throw err('O modelo não retornou conteúdo estruturado.',provider);
   let result;try{result=JSON.parse(clean(raw))}catch{throw err('O modelo não retornou JSON válido. Os dados do caso não foram alterados.',provider)}
   if(!result||typeof result!=='object'||Array.isArray(result))throw err('Formato da resposta da IA inválido.',provider);
   return {result,provider,model};
  }catch(e){const safe=e instanceof AIServiceError?e:err('Falha interna do provedor.',provider);failures.push(safe);}
 }
 throw failures.at(-1)||err('IA indisponível.','unavailable');
}