import test from 'node:test';import assert from 'node:assert/strict';
import {configuredProviders,validateOllamaConfig,completeStructured,AIServiceError} from '../shared/ai-provider.mjs';
test('Ollama privado preferencial e Gateway como última alternativa',()=>assert.deepEqual(configuredProviders({OLLAMA_BASE_URL:'https://ai.example.com',OPENAI_API_KEY:'x',AI_GATEWAY_API_KEY:'z'}),['ollama','openai','gateway']));
test('bloqueia porta Ollama aberta sem HTTPS, sem chave e localhost remoto',()=>{
 assert.throws(()=>validateOllamaConfig({OLLAMA_BASE_URL:'http://8.8.8.8:11434',NODE_ENV:'production'}),/HTTPS/);
 assert.throws(()=>validateOllamaConfig({OLLAMA_BASE_URL:'https://ai.example.com',NODE_ENV:'production'}),/OLLAMA_API_KEY/);
 assert.throws(()=>validateOllamaConfig({OLLAMA_BASE_URL:'http://localhost:11434',VERCEL:'1'}),/HTTPS|nuvem/);
 assert.equal(validateOllamaConfig({OLLAMA_BASE_URL:'https://ai.example.com/',OLLAMA_API_KEY:'token',NODE_ENV:'production'}),'https://ai.example.com');
});
test('sem modelo falha com descrição verificável, não diz que IA está pronta',async()=>{await assert.rejects(completeStructured({instructions:'x',messages:[],schema:{type:'object'},env:{}}),e=>e instanceof AIServiceError&&e.status===503&&/Nenhum modelo/.test(e.message));});
test('falha de credencial Ollama não chama Gateway inexistente',async()=>{await assert.rejects(completeStructured({instructions:'x',messages:[],schema:{type:'object'},env:{OLLAMA_BASE_URL:'https://ai.example.com'}}),/OLLAMA_API_KEY/);});

test('Grok selecionado por API própria sem depender de credencial Vercel',()=>{
 assert.deepEqual(configuredProviders({XAI_API_KEY:'test',AI_PROVIDER:'xai',AI_GATEWAY_API_KEY:'old'}),['xai']);
 assert.deepEqual(configuredProviders({XAI_API_KEY:'test',OPENAI_API_KEY:'other'}),['xai','openai']);
 assert.deepEqual(configuredProviders({AI_PROVIDER:'xai',AI_GATEWAY_API_KEY:'old'}),[]);
});
test('xAI usa rota oficial, esquema JSON e não faz fallback silencioso',async()=>{
 const previous=globalThis.fetch;let called=0;
 globalThis.fetch=async (url,opts)=>{called++;assert.equal(url,'https://api.x.ai/v1/chat/completions');assert.match(opts.headers.Authorization,/Bearer dummy-xai/);const body=JSON.parse(opts.body);assert.equal(body.model,'grok-4.7');assert.equal(body.response_format.type,'json_schema');return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({ok:true})}}]})};};
 try{const out=await completeStructured({instructions:'validar',messages:[{role:'user',content:'teste'}],schema:{type:'object',additionalProperties:false,properties:{ok:{type:'boolean'}},required:['ok']},env:{XAI_API_KEY:'dummy-xai',AI_GATEWAY_API_KEY:'old',AI_PROVIDER:'xai'}});assert.equal(out.provider,'xai');assert.equal(out.result.ok,true);assert.equal(called,1)}finally{globalThis.fetch=previous}
});

test('OIDC automático não é confundido com crédito habilitado no Gateway',()=>{assert.deepEqual(configuredProviders({}, {'x-vercel-oidc-token':'token'}),[]);assert.deepEqual(configuredProviders({AI_PROVIDER:'gateway'}, {'x-vercel-oidc-token':'token'}),['gateway'])});