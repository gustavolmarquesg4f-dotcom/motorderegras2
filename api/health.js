import {PUBLIC_SUPABASE_URL,PUBLIC_SUPABASE_PUBLISHABLE_KEY} from '../shared/public-config.mjs';
import {configuredProviders} from '../shared/ai-provider.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const configured=!!((process.env.SUPABASE_URL||PUBLIC_SUPABASE_URL)&&(process.env.SUPABASE_PUBLISHABLE_KEY||PUBLIC_SUPABASE_PUBLISHABLE_KEY));
 const aiProviders=configuredProviders(process.env,req.headers);const aiConfigured=aiProviders.length>0;
 res.status(200).json({name:'Plano Justo API',configured,aiConfigured,version:'13.0.0',aiProvider:aiProviders[0]||'not-configured',providersConfigured:aiProviders,aiVerified:false,aiModel:aiProviders[0]==='groq'?(process.env.GROQ_MODEL||'openai/gpt-oss-120b'):null,aiStatus:aiConfigured?'Provedor configurado; clique em Testar conexão para validar resposta real.':'Nenhum modelo conectado. Configure GROQ_API_KEY na Vercel e clique em Testar conexão.'});
}