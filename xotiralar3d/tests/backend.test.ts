import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import telegram, { webhookSecret } from '../netlify/functions/telegram.mts';
import app from '../netlify/functions/app.mts';
import setup from '../netlify/functions/telegram-setup.mts';

const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;delete (globalThis as any).Netlify;});
function environment(value?:string){(globalThis as any).Netlify={env:{get:()=>value}};}
function update(secret:string,body:any){return new Request('https://memroom.netlify.app/api/telegram',{method:'POST',headers:{'Content-Type':'application/json','x-telegram-bot-api-secret-token':secret},body:JSON.stringify(body)});}

test('health responds without database or login',async()=>{
 const res=await app(new Request('https://memroom.netlify.app/api/health'));
 assert.equal(res.status,200);assert.equal((await res.json()).status,'ok');
});
test('cross-origin writes are rejected before any database access',async()=>{
 const res=await app(new Request('https://memroom.netlify.app/api/app',{method:'POST',headers:{origin:'https://unrelated.example'},body:'{}'}));
 assert.equal(res.status,403);
});
test('webhook refuses requests without a configured bot',async()=>{
 environment();assert.equal((await telegram(update('',{}))).status,503);
});
test('webhook rejects forged Telegram updates without calling Telegram',async()=>{
 environment('test-placeholder');globalThis.fetch=async()=>{throw new Error('Unexpected network request')};
 assert.equal((await telegram(update('forged',{message:{text:'/start'}}))).status,401);
});
test('webhook ignores group chats',async()=>{
 environment('test-placeholder');globalThis.fetch=async()=>{throw new Error('Unexpected network request')};
 const res=await telegram(update(webhookSecret('test-placeholder'),{message:{chat:{id:42,type:'group'},text:'/start'}}));
 assert.equal(res.status,200);
});
test('private start sends the HTTPS Mini App button',async()=>{
 environment('test-placeholder');let calls=0;
 globalThis.fetch=async(_url,options)=>{calls++;const b=JSON.parse(String(options?.body));assert.equal(b.chat_id,42);assert.equal(b.reply_markup.inline_keyboard[0][0].web_app.url,'https://memroom.netlify.app');return Response.json({ok:true});};
 const res=await telegram(update(webhookSecret('test-placeholder'),{message:{chat:{id:42,type:'private'},text:'/start payload'}}));
 assert.equal(res.status,200);assert.equal(calls,1);
});
test('Telegram failure remains retryable',async()=>{
 environment('test-placeholder');globalThis.fetch=async()=>Response.json({ok:false},{status:500});
 assert.equal((await telegram(update(webhookSecret('test-placeholder'),{message:{chat:{id:42,type:'private'},text:'/start'}}))).status,502);
});
test('webhook setup registers a secret and only message updates',async()=>{
 environment('test-placeholder');globalThis.fetch=async(_url,options)=>{const body=JSON.parse(String(options?.body));assert.equal(body.url,'https://memroom.netlify.app/api/telegram');assert.equal(body.secret_token,webhookSecret('test-placeholder'));assert.deepEqual(body.allowed_updates,['message']);return Response.json({ok:true});};
 await setup();
});
