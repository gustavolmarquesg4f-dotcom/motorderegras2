import {PUBLIC_SUPABASE_URL,PUBLIC_SUPABASE_PUBLISHABLE_KEY} from '../shared/public-config.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const configured=!!((process.env.SUPABASE_URL||PUBLIC_SUPABASE_URL)&&(process.env.SUPABASE_PUBLISHABLE_KEY||PUBLIC_SUPABASE_PUBLISHABLE_KEY));
 const aiConfigured=!!(process.env.OPENAI_API_KEY||process.env.AI_GATEWAY_API_KEY||req.headers['x-vercel-oidc-token']||process.env.VERCEL_OIDC_TOKEN);
 res.status(200).json({name:'Plano Justo API',configured,aiConfigured,version:'6.0.0',aiProvider:process.env.OPENAI_API_KEY?'openai':aiConfigured?'vercel-ai-gateway':'not-configured'});
}