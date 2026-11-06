import { webhookSecret } from './telegram.mjs';
// A scheduled function runs only on the published site, never on deploy previews.
export default async () => {
 const token=Netlify.env.get('BOT_TOKEN');
 if(!token)return;
 const res=await fetch(`https://api.telegram.org/bot${token}/setWebhook`,{
  method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(10000),
  body:JSON.stringify({url:'https://memroom.netlify.app/api/telegram',secret_token:webhookSecret(token),allowed_updates:['message']})
 });
 const result=await res.json();
 if(!res.ok||!result.ok)throw new Error('Telegram webhook setup failed');
};
export const config={schedule:'*/5 * * * *'};
