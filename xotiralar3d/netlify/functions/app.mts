import { getUser } from '@netlify/identity';
import { getStore } from '@netlify/blobs';
import { and, eq, or, desc, sql } from 'drizzle-orm';
import { database } from '../../db/index.js';
import * as s from '../../db/schema.js';

function reject(message:string,status=400):never { throw Object.assign(new Error(message),{status}); }
function text(value:unknown,min:number,max:number) { const v=String(value??'').trim(); if(v.length<min||v.length>max)reject(`Matn ${min}–${max} belgi bo‘lsin`);return v; }
function room(name:string,index:number) {return {id:crypto.randomUUID(),room_index:index,name,color:Math.floor(Math.random()*360),mode:'dark',stands:Array.from({length:9},()=>({t:'',c:'',img:''}))};}
async function image(value:unknown,scope:string) {
 if(!value)return '';
 const v=String(value);
 if(v.startsWith('/api/images/')&&v.split('/').at(-1)?.startsWith(scope+'-'))return v;
 const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(v);
 if(!match)reject('PNG, JPEG yoki WebP rasm tanlang');
 const bytes=Buffer.from(match[2],'base64');
 if(bytes.length>3*1024*1024)reject('Rasm 3 MB dan kichik bo‘lsin');
 const valid=match[1]==='jpeg'?bytes[0]===255&&bytes[1]===216:match[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 if(!valid)reject('Rasm fayli noto‘g‘ri');
 const key=`${scope}-${crypto.randomUUID()}.${match[1]}`;
 await getStore('memory-images').set(key,new Uint8Array(bytes).buffer);
 return '/api/images/'+key;
}

export default async (req:Request) => {
 try {
  const path=new URL(req.url).pathname;
  if(path==='/api/health')return Response.json({status:'ok',time:new Date().toISOString()});
  if(req.method!=='GET'&&req.method!=='POST')return new Response('Method not allowed',{status:405});
  if(req.method==='POST'&&req.headers.get('origin')!==new URL(req.url).origin)reject('Ruxsat yo‘q',403);
  const db=database(),identity=await getUser(),isAdmin=identity?.roles?.includes('admin')??false;
  let me:any=null;
  if(identity){
   await db.insert(s.profiles).values({id:identity.id,name:String(identity.name||'Foydalanuvchi').slice(0,24),lastSeen:Date.now()}).onConflictDoNothing();
   [me]=await db.select().from(s.profiles).where(eq(s.profiles.id,identity.id));
   me={...me,email:identity.email,role:isAdmin?'admin':'user'};
   if(!me.banned){
    await db.update(s.profiles).set({lastSeen:Date.now()}).where(eq(s.profiles.id,me.id));
    await db.insert(s.houses).values({id:crypto.randomUUID(),owner:me.id,name:me.name+' uyi',rooms:[room('Xotiralar',0),room('Sevimli lahzalar',1),room('Orzular',2)]}).onConflictDoNothing();
   }
  }
  const need=()=>{if(!me)reject('Avval hisobingizga kiring',401);if(me.banned)reject('Hisobingiz bloklangan',403);return me;};
  const admin=()=>{need();if(!isAdmin)reject('Admin huquqi kerak',403);};
  const visible=()=>isAdmin&&!me?.banned?undefined:me&&!me.banned?or(eq(s.houses.hidden,false),eq(s.houses.owner,me.id)):eq(s.houses.hidden,false);
  async function house(id:string,edit=false,tx:any=db){
   const [h]=await tx.select().from(s.houses).where(eq(s.houses.id,id));
   if(!h||(h.hidden&&!(me&&!me.banned&&(isAdmin||h.owner===me.id))))reject('Uy topilmadi',404);
   if(edit){need();if(!isAdmin&&h.owner!==me.id)reject('Ruxsat yo‘q',403);}
   return h;
  }
  if(path.startsWith('/api/images/')){
   const key=path.slice('/api/images/'.length);
   if(!/^(news|[a-f0-9-]{36})-[a-f0-9-]{36}\.(png|jpeg|webp)$/.test(key))reject('Rasm topilmadi',404);
   if(!key.startsWith('news-'))await house(key.slice(0,36));
   const data=await getStore('memory-images').get(key,{type:'arrayBuffer'});
   if(!data)reject('Rasm topilmadi',404);
   return new Response(data,{headers:{'Content-Type':`image/${key.split('.').at(-1)}`,'Cache-Control':'private, no-cache','X-Content-Type-Options':'nosniff'}});
  }
  let returnValue:any=null;
  if(req.method==='POST'){
   if(Number(req.headers.get('content-length'))>4500000)reject('Fayl juda katta',413);
   let payload:any;try{payload=await req.json();}catch{reject('So‘rov noto‘g‘ri');}
   const {action,args:a=[]}=payload;
   if(!Array.isArray(a))reject('So‘rov noto‘g‘ri');
   need();
   if(['saveStand','saveRoom','addRoom','delRoom'].includes(action)){
    // Lock the house to prevent simultaneous room/stand edits overwriting each other.
    await db.transaction(async tx=>{
     await tx.select().from(s.houses).where(eq(s.houses.id,String(a[0]))).for('update');
     const h=await house(String(a[0]),true,tx),rooms=structuredClone(h.rooms);
     const ri=Number(a[1]),r=rooms[ri];
     if(action==='addRoom'){
      if(rooms.length>=6)reject('Ko‘pi bilan 6 ta xona bo‘ladi');
      const index=Array.from({length:6},(_,i)=>i).find(i=>!rooms.some((r:any)=>r.room_index===i))!;
      rooms.push(room(text(a[1],2,24),index));returnValue=rooms.length-1;
     }else{
      if(!Number.isInteger(ri)||!r)reject('Xona topilmadi');
      if(action==='delRoom'){if(rooms.length<=2)reject('Kamida 2 ta xona qolishi kerak');rooms.splice(ri,1);}
      if(action==='saveRoom'){const v=a[2]||{};r.name=text(v.name,2,24);r.color=Math.max(0,Math.min(360,Math.round(Number(v.color)||0)));r.mode=v.mode==='light'?'light':'dark';}
      if(action==='saveStand'){const i=Number(a[2]),v=a[3]||{};if(!Number.isInteger(i)||i<0||i>8)reject('Stend topilmadi');r.stands[i]={t:text(v.t,0,40),c:text(v.c,0,300),img:await image(v.img,h.id)};}
     }
     await tx.update(s.houses).set({rooms}).where(eq(s.houses.id,h.id));
    });
   }else if(action==='setName'){await db.update(s.profiles).set({name:text(a[0],2,24)}).where(eq(s.profiles.id,me.id));}
   else if(action==='saveHouse'){
    const h=await house(a[0],true),v=a[1]||{},song=v.song?.id||null;
    if(song&&!(await db.select().from(s.songs).where(eq(s.songs.id,song))).length)reject('Qo‘shiq topilmadi');
    await db.update(s.houses).set({name:text(v.name,2,30),hidden:!!v.hidden,song}).where(eq(s.houses.id,h.id));
   }else if(action==='like'||action==='likeWish'){
    const kind=action==='like'?'house':'wish',target=String(a[0]);
    if(kind==='house'){const h=await house(target);if(h.owner===me.id)reject('O‘z uyingizga layk bosib bo‘lmaydi');}
    else if(!(await db.select().from(s.wishes).where(eq(s.wishes.id,target))).length)reject('Tilak topilmadi',404);
    const condition=and(eq(s.votes.kind,kind),eq(s.votes.target,target),eq(s.votes.uid,me.id));
    const deleted=await db.delete(s.votes).where(condition).returning();
    if(!deleted.length)await db.insert(s.votes).values({id:crypto.randomUUID(),kind,target,uid:me.id}).onConflictDoNothing();
   }else if(action==='visit'){
    const h=await house(a[0]);
    if(h.owner!==me.id)await db.transaction(async tx=>{
     const inserted=await tx.insert(s.visits).values({id:crypto.randomUUID(),h:h.id,uid:me.id}).onConflictDoNothing().returning();
     if(inserted.length)await tx.update(s.houses).set({visits:sql`${s.houses.visits}+1`}).where(eq(s.houses.id,h.id));
    });
   }else if(action==='addGuest'){
    const h=await house(a[0]);const message=text(a[1],2,160);
    await db.transaction(async tx=>{
     await tx.insert(s.guests).values({id:crypto.randomUUID(),h:h.id,uid:me.id,text:message,at:Date.now()});
     if(h.owner!==me.id)await tx.insert(s.notifications).values({id:crypto.randomUUID(),uid:h.owner,text:me.name+' uyingizga yozuv qoldirdi',at:Date.now()});
    });
   }else if(action==='delGuest'){
    const [g]=await db.select().from(s.guests).where(eq(s.guests.id,String(a[0])));if(!g)reject('Yozuv topilmadi',404);
    const h=await house(g.h);if(!isAdmin&&g.uid!==me.id&&h.owner!==me.id)reject('Ruxsat yo‘q',403);
    await db.delete(s.guests).where(eq(s.guests.id,g.id));
   }else if(action==='addWish'){await db.insert(s.wishes).values({id:crypto.randomUUID(),uid:me.id,text:text(a[0],3,200),at:Date.now()});}
   else if(action==='delWish'){admin();await db.delete(s.wishes).where(eq(s.wishes.id,String(a[0])));await db.delete(s.votes).where(and(eq(s.votes.kind,'wish'),eq(s.votes.target,String(a[0]))));}
   else if(action==='addNews'){admin();await db.insert(s.news).values({id:crypto.randomUUID(),t:text(a[0],1,60),b:text(a[1],0,500),img:await image(a[2],'news'),at:Date.now()});}
   else if(action==='delNews'){admin();await db.delete(s.news).where(eq(s.news.id,String(a[0])));}
   else if(action==='addSong'){
    admin();if(!['trend','romantic'].includes(a[0]))reject('Ro‘yxat noto‘g‘ri');
    let url:URL;try{url=new URL(a[3]);}catch{reject('Havola noto‘g‘ri');}if(url.protocol!=='https:')reject('HTTPS havola kerak');
    await db.insert(s.songs).values({id:crypto.randomUUID(),category:a[0],t:text(a[1],1,80),a:text(a[2],0,60),url:url.href});
   }else if(action==='delSong'){admin();await db.delete(s.songs).where(eq(s.songs.id,String(a[0])));}
   else if(action==='readAll'){await db.update(s.notifications).set({read:true}).where(eq(s.notifications.uid,me.id));}
   else if(action==='report'){
    if(!['wish','guest','house'].includes(a[0]))reject('Shikoyat turi noto‘g‘ri');
    if(a[0]==='house')await house(a[1]);
    else if(a[0]==='guest'){const [g]=await db.select().from(s.guests).where(eq(s.guests.id,String(a[1])));if(!g)reject('Yozuv topilmadi');await house(g.h);}
    else if(!(await db.select().from(s.wishes).where(eq(s.wishes.id,String(a[1])))).length)reject('Tilak topilmadi');
    await db.insert(s.reports).values({id:crypto.randomUUID(),kind:a[0],target:String(a[1]),uid:me.id,text:text(a[2],0,200)});
   }else if(action==='resolveReport'){
    admin();await db.transaction(async tx=>{
     const [r]=await tx.select().from(s.reports).where(eq(s.reports.id,String(a[0])));if(!r)reject('Shikoyat topilmadi');
     if(a[1]&&r.kind==='wish')await tx.delete(s.wishes).where(eq(s.wishes.id,r.target));
     if(a[1]&&r.kind==='guest')await tx.delete(s.guests).where(eq(s.guests.id,r.target));
     if(a[1]&&r.kind==='house')await tx.update(s.houses).set({hidden:true}).where(eq(s.houses.id,r.target));
     await tx.update(s.reports).set({resolved:true}).where(eq(s.reports.id,r.id));
    });
   }else if(action==='ban'){admin();if(a[0]===me.id)reject('O‘z hisobingizni bloklay olmaysiz');await db.update(s.profiles).set({banned:!!a[1]}).where(eq(s.profiles.id,String(a[0])));}
   else reject('Amal topilmadi',404);
   if(isAdmin)await db.insert(s.audit).values({id:crypto.randomUUID(),by:me.name,action,target:String(a[0]||'').slice(0,200),at:Date.now()});
  }
  const [hs,ps,ws,gs,vs,ss,ns,visitRows]=await Promise.all([db.select().from(s.houses).where(visible()),db.select().from(s.profiles),db.select().from(s.wishes),db.select().from(s.guests),db.select().from(s.votes),db.select().from(s.songs),db.select().from(s.news).orderBy(desc(s.news.at)),db.select().from(s.visits)]);
  const names=new Map(ps.map(p=>[p.id,p.name]));
  const houseIds=new Set(hs.map(h=>h.id));
  const badges:Record<string,string[]>={};
  for(const p of ps){const h=hs.find(h=>h.owner===p.id),owned=ws.filter(w=>w.uid===p.id);const b:string[]=[];
   if(h?.rooms.some(r=>r.stands.some((v:any)=>v.img)))b.push('first_photo');
   if(h?.rooms.some(r=>r.stands.every((v:any)=>v.img)))b.push('album');
   if(h&&vs.filter(v=>v.kind==='house'&&v.target===h.id).length>=10)b.push('loved');
   if(owned.length)b.push('wisher');if(owned.some(w=>vs.filter(v=>v.kind==='wish'&&v.target===w.id).length>=5))b.push('hit');
   if(visitRows.filter(v=>v.uid===p.id).length>=5)b.push('explorer');
   if(vs.filter(v=>v.kind==='house'&&v.uid===p.id).length>=5)b.push('kind');badges[p.id]=b;
  }
  const privileged=isAdmin&&!me?.banned;
  const rs=privileged?await db.select().from(s.reports).where(eq(s.reports.resolved,false)):[];
  if(me)me.name=names.get(me.id);
  const data={me,houses:hs.map(h=>({...h,song:ss.find(v=>v.id===h.song)||null,likes:vs.filter(v=>v.kind==='house'&&v.target===h.id).map(v=>v.uid)})),
   guests:gs.filter(g=>houseIds.has(g.h)).map(g=>({...g,name:names.get(g.uid)||'Mehmon'})),
   wishes:ws.map(w=>({...w,name:names.get(w.uid)||'Foydalanuvchi',likes:vs.filter(v=>v.kind==='wish'&&v.target===w.id).map(v=>v.uid),ever:[]})),
   songs:{trend:ss.filter(v=>v.category==='trend'),romantic:ss.filter(v=>v.category==='romantic')},news:ns,
   notifications:me?await db.select().from(s.notifications).where(eq(s.notifications.uid,me.id)).orderBy(desc(s.notifications.at)).limit(50):[],badges,
   reports:rs.map(r=>({...r,byName:names.get(r.uid)||'Foydalanuvchi'})),
   users:privileged?ps.map(p=>({...p,role:p.id===me?.id?'admin':'user',last_seen:new Date(p.lastSeen).toISOString(),badges:badges[p.id]?.length||0})):[],
   audit:privileged?await db.select().from(s.audit).orderBy(desc(s.audit.at)).limit(15):[],
   stats:privileged?{users:ps.length,active:ps.filter(p=>Date.now()-p.lastSeen<86400000).length,houses:hs.length,wishes:ws.length,likes:vs.filter(v=>v.kind==='house').length,visits:hs.reduce((n,h)=>n+h.visits,0),reports:rs.length}:{}
  };
  if(path==='/api/songs')return Response.json(ss);
  return Response.json({data,value:returnValue},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e:any){return Response.json({detail:e.status?e.message:'Server bilan ulanishda xatolik. Qayta urinib ko‘ring.'},{status:e.status||500});}
};
export const config={path:['/api/app','/api/health','/api/songs','/api/images/*']};
