import { createHmac, timingSafeEqual } from 'node:crypto';

export function webhookSecret(token:string) {
 return createHmac('sha256',token).update('memroom-telegram-webhook-v1').digest('hex');
}
export default async (req:Request) => {
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const token=Netlify.env.get('BOT_TOKEN');
 if(!token)return Response.json({detail:'Bot sozlanmagan'},{status:503});
 const supplied=Buffer.from(req.headers.get('x-telegram-bot-api-secret-token')||''),expected=Buffer.from(webhookSecret(token));
 if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return new Response('Unauthorized',{status:401});
 let update:any;try{update=await req.json();}catch{return new Response('Invalid JSON',{status:400});}
 const message=update.message;
 if(message?.chat?.type!=='private'||!/^\/start(?:@\w+)?(?:\s|$)/.test(message?.text||''))return Response.json({ok:true});
 try {
  const res=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
   method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(10000),
   body:JSON.stringify({chat_id:message.chat.id,text:'Xush kelibsiz! 3D xonalarni ochish uchun tugmani bosing.',reply_markup:{inline_keyboard:[[{text:'3D Xonalarni ochish',web_app:{url:'https://memroom.netlify.app'}}]]}})
  });
  const result=await res.json();if(!res.ok||!result.ok)return new Response('Telegram unavailable',{status:502});
  return Response.json({ok:true});
 }catch{return new Response('Telegram unavailable',{status:502});}
};
export const config={path:'/api/telegram'};
