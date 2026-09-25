import test from 'node:test';
import assert from 'node:assert/strict';
import {configuredProviders,validateOllamaConfig,completeStructured,groqRequestBody,AIServiceError} from '../shared/ai-provider.mjs';
const schema={type:'object',additionalProperties:false,properties:{ok:{type:'boolean'},message:{type:'string'}},required:['ok','message']};

test('Groq assume prioridade; o seletor groq restringe outros provedores',()=>{
 assert.deepEqual(configuredProviders({GROQ_API_KEY:'secret',OLLAMA_BASE_URL:'https://ai.example.com',OPENAI_API_KEY:'x',AI_GATEWAY_API_KEY:'z'}),['groq','ollama','openai','gateway']);
 assert.deepEqual(configuredProviders({AI_PROVIDER:'groq',GROQ_API_KEY:'secret',OPENAI_API_KEY:'x'}),['groq']);
 assert.deepEqual(configuredProviders({AI_PROVIDER:'groq',OPENAI_API_KEY:'x'}),[]);
});
test('bloqueia Ollama sem HTTPS, sem chave e localhost remoto',()=>{
 assert.throws(()=>validateOllamaConfig({OLLAMA_BASE_URL:'http://8.8.8.8:11434',NODE_ENV:'production'}),/HTTPS/);
 assert.throws(()=>validateOllamaConfig({OLLAMA_BASE_URL:'https://ai.example.com',NODE_ENV:'production'}),/OLLAMA_API_KEY/);
 assert.throws(()=>validateOllamaConfig({OLLAMA_BASE_URL:'http://localhost:11434',VERCEL:'1',NODE_ENV:'production'}),/HTTPS|nuvem/);
 assert.equal(validateOllamaConfig({OLLAMA_BASE_URL:'https://ai.example.com/',OLLAMA_API_KEY:'token',NODE_ENV:'production'}),'https://ai.example.com');
});
test('sem credencial não simula que IA está pronta',async()=>{
 await assert.rejects(completeStructured({instructions:'x',messages:[],schema,env:{AI_PROVIDER:'groq'}}),e=>e instanceof AIServiceError&&e.status===503&&/Nenhum modelo/.test(e.message));
});
test('OIDC sozinho não significa créditos no Gateway',()=>{
 assert.deepEqual(configuredProviders({}, {'x-vercel-oidc-token':'token'}),[]);
 assert.deepEqual(configuredProviders({AI_PROVIDER:'gateway'}, {'x-vercel-oidc-token':'token'}),['gateway']);
});
test('payload Groq utiliza JSON Schema estrito e reasoning high',()=>{
 const body=groqRequestBody({model:'openai/gpt-oss-120b',schema,messages:[{role:'user',content:'teste'}]});
 assert.equal(body.response_format.json_schema.strict,true);
 assert.deepEqual(body.response_format.json_schema.schema,schema);
 assert.equal(body.model,'openai/gpt-oss-120b');assert.equal(body.reasoning_effort,'high');
});
test('Groq retorna resposta real com modelo 120b e sem processar outro provedor',async()=>{
 const prior=globalThis.fetch;const calls=[];
 globalThis.fetch=async (url,opts)=>{calls.push({url,opts});return {ok:true,status:200,json:async()=>({choices:[{message:{content:'{"ok":true,"message":"Conexão validada"}'},finish_reason:'stop'}]})}};
 try{
  const got=await completeStructured({instructions:'teste',messages:[{role:'user',content:'sem dados privados'}],schema,env:{AI_PROVIDER:'groq',GROQ_API_KEY:'fake-test-key',GROQ_MODEL:'openai/gpt-oss-120b'}});
  assert.equal(got.provider,'groq');assert.equal(got.model,'openai/gpt-oss-120b');assert.equal(got.result.ok,true);
  assert.equal(calls.length,1);assert.equal(calls[0].url,'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(JSON.parse(calls[0].opts.body).model,'openai/gpt-oss-120b');
  assert.equal(calls[0].opts.headers.Authorization,'Bearer fake-test-key');
 }finally{globalThis.fetch=prior}
});
test('403 do modelo 120b tenta apenas 20b na mesma Groq',async()=>{
 const prior=globalThis.fetch;let calls=[];
 globalThis.fetch=async (_url,opts)=>{const model=JSON.parse(opts.body).model;calls.push(model);return model.endsWith('120b')?{ok:false,status:403,json:async()=>({error:{message:'model forbidden'}})}:{ok:true,status:200,json:async()=>({choices:[{message:{content:'{"ok":true,"message":"ok"}'}}]})}};
 try{
  const got=await completeStructured({instructions:'test',messages:[],schema,env:{GROQ_API_KEY:'fake',AI_PROVIDER:'groq'}});
  assert.equal(got.model,'openai/gpt-oss-20b');assert.deepEqual(calls,['openai/gpt-oss-120b','openai/gpt-oss-20b']);
 }finally{globalThis.fetch=prior}
});
test('401 da Groq não tenta segundo modelo ou outra empresa',async()=>{
 const prior=globalThis.fetch;let count=0;
 globalThis.fetch=async()=>{count++;return {ok:false,status:401,json:async()=>({})}};
 try{
  await assert.rejects(completeStructured({instructions:'test',messages:[],schema,env:{GROQ_API_KEY:'fake',OPENAI_API_KEY:'other',AI_PROVIDER:'auto'}}),e=>e.provider==='groq'&&e.upstreamStatus===401);
  assert.equal(count,1);
 }finally{globalThis.fetch=prior}
});