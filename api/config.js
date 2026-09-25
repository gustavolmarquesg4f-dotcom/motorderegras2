import {PUBLIC_SUPABASE_URL,PUBLIC_SUPABASE_PUBLISHABLE_KEY} from '../shared/public-config.mjs';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const url=process.env.SUPABASE_URL||PUBLIC_SUPABASE_URL;
  const publishableKey=process.env.SUPABASE_PUBLISHABLE_KEY||PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  res.status(200).json({url,publishableKey,configured:!!(url&&publishableKey)});
}