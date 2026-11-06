import {createClient} from '@supabase/supabase-js';

const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase=url&&key?createClient(url,key):null;
let profile=null;
let cache={houses:[],guests:[],wishes:[],news:[],songs:{trend:[],romantic:[]},notifications:[],badges:{},reports:[],users:[],audit:[],stats:{}};
const fail=message=>{throw new Error(message)};
const result=({data,error})=>{if(error)throw new Error(error.message);return data};
const id=()=>crypto.randomUUID();
const dateValue=v=>new Date(v||Date.now()).getTime();
const iso=v=>new Date(v).toISOString();
const emptyStats=()=>({users:0,active:0,houses:0,wishes:0,likes:0,visits:0,reports:0});
const checked=()=>{if(!supabase)fail('Supabase sozlanmagan. .env fayliga VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY kiriting.');return supabase};
const current=()=>profile;
const need=()=>{if(!profile)fail('Avval hisobingizga kiring');if(profile.banned)fail('Hisobingiz bloklangan');return profile};
const admin=()=>{const u=need();if(u.role!=='admin')fail('Bu amal uchun admin huquqi kerak');return u};
const mapProfile=p=>p?{id:p.id,name:p.username||'Foydalanuvchi',email:p.email||'',role:p.role||'user',banned:!!p.banned}:null;

async function load(){
 const sb=checked(),user=(await sb.auth.getUser()).data.user;
 const [pr,profileRows,houseRows,roomRows,standRows,houseVotes,guestRows,wishRows,wishVotes,songRows,newsRows,notificationRows,badgeRows]=await Promise.all([
  user?sb.from('profiles').select('id,username,role,banned,last_seen').eq('id',user.id).single():Promise.resolve({data:null,error:null}),
  sb.from('profiles').select('id,username,role,banned,last_seen'),
  sb.from('houses').select('*').order('created_at',{ascending:true}),
  sb.from('house_rooms').select('*').order('room_index'),
  sb.from('stands').select('*'),
  sb.from('house_votes').select('house_id,user_id'),
  sb.from('guestbook').select('id,house_id,author_id,author_name,message,created_at'),
  sb.from('wishes').select('id,user_id,body,rating,created_at'),
  sb.from('wish_votes').select('wish_id,user_id'),
  sb.from('songs').select('*').order('sort_order'),
  sb.from('news').select('*').order('created_at',{ascending:false}),
  user?sb.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50):Promise.resolve({data:[],error:null}),
  user?sb.from('user_badges').select('code').eq('user_id',user.id):Promise.resolve({data:[],error:null})
 ]);
 const p=result(pr);
 if(p&&(!p.last_seen||Date.now()-dateValue(p.last_seen)>300000))result(await sb.from('profiles').update({last_seen:iso(Date.now())}).eq('id',user.id));
 profile=p?{...mapProfile(p),email:user.email||''}:null;
 const profiles=new Map(result(profileRows).map(x=>[x.id,x.username]));
 const roomsByHouse=new Map();
 result(roomRows).forEach(r=>{const a=roomsByHouse.get(r.house_id)||[];a.push({...r,stands:Array.from({length:9},()=>({t:'',c:'',img:''}))});roomsByHouse.set(r.house_id,a)});
 result(standRows).forEach(s=>{const room=(roomsByHouse.get(s.house_id)||[]).find(r=>r.id===s.room_id),stand=room?.stands[s.stand_index];if(stand)Object.assign(stand,{t:s.title||'',c:s.caption||'',img:s.image_url||''})});
 const votes=result(houseVotes),wishVotesResult=result(wishVotes),songs=result(songRows);
 const songsById=new Map(songs.map(s=>[s.id,{id:s.id,t:s.title,a:s.artist||'',url:s.url,category:s.category}]));
 cache.houses=result(houseRows).map(h=>({id:h.id,owner:h.owner_id,name:h.name,hidden:!h.is_public,song:h.music_id?songsById.get(h.music_id)||null:null,
  rooms:(roomsByHouse.get(h.id)||[]).map(r=>({id:r.id,room_index:r.room_index,name:r.name,color:r.color,mode:r.mode,stands:r.stands})),
  likes:votes.filter(v=>v.house_id===h.id).map(v=>v.user_id),visits:h.visits||0}));
 cache.guests=result(guestRows).map(g=>({id:g.id,h:g.house_id,uid:g.author_id,name:g.author_name||profiles.get(g.author_id)||'Mehmon',text:g.message,at:dateValue(g.created_at)}));
 cache.wishes=result(wishRows).map(w=>({id:w.id,uid:w.user_id,name:profiles.get(w.user_id)||'Foydalanuvchi',text:w.body,likes:wishVotesResult.filter(v=>v.wish_id===w.id).map(v=>v.user_id),ever:[],at:dateValue(w.created_at)}));
 cache.songs={trend:songs.filter(s=>s.category==='trend').map(s=>songsById.get(s.id)),romantic:songs.filter(s=>s.category==='romantic').map(s=>songsById.get(s.id))};
 cache.news=result(newsRows).map(n=>({id:n.id,t:n.title,b:n.body||'',img:n.image_url||'',at:dateValue(n.created_at)}));
 cache.notifications=result(notificationRows).map(n=>({id:n.id,text:n.body,read:n.is_read,at:dateValue(n.created_at)}));
 cache.badges=profile?{[profile.id]:result(badgeRows).map(b=>b.code)}:{};
 if(profile?.role==='admin'){
  const [complaintRows,profileRows,auditRows]=await Promise.all([
   sb.from('complaints').select('*').eq('resolved',false).order('created_at',{ascending:false}),
   sb.from('profiles').select('id,username,role,banned,last_seen'),
   sb.from('audit_log').select('*').order('created_at',{ascending:false}).limit(15)
  ]);
  cache.reports=result(complaintRows).map(r=>({id:r.id,kind:r.target_type,target:r.target_id,byName:profiles.get(r.reporter_id)||'Foydalanuvchi',text:r.reason||''}));
  cache.users=result(profileRows).map(u=>({id:u.id,name:u.username,role:u.role,banned:!!u.banned,last_seen:u.last_seen,badges:0}));
  cache.audit=result(auditRows).map(a=>({by:a.actor_id===profile.id?profile.name:'Foydalanuvchi',action:a.action,target:a.details?.target||'',at:dateValue(a.created_at)}));
  cache.stats={users:cache.users.length,active:cache.users.filter(u=>u.last_seen&&Date.now()-dateValue(u.last_seen)<86400000).length,houses:cache.houses.length,wishes:cache.wishes.length,likes:votes.length,visits:cache.houses.reduce((n,h)=>n+h.visits,0),reports:cache.reports.length};
 }else{cache.reports=[];cache.users=[];cache.audit=[];cache.stats=emptyStats()}
}

async function audit(action,target=''){
 if(profile?.role!=='admin')return;
 const sb=checked();result(await sb.from('audit_log').insert({actor_id:profile.id,action,details:{target:String(target).slice(0,200)}}));
}
async function uploadImage(data,path){
 if(!data)return '';
 if(!data.startsWith('data:image/'))return data;
 const blob=await (await fetch(data)).blob(),sb=checked();
 const uploaded=result(await sb.storage.from('house-images').upload(path,blob,{upsert:true,contentType:blob.type}));
 return sb.storage.from('house-images').getPublicUrl(uploaded.path).data.publicUrl;
}
const validText=(s,min,max,label)=>{const v=String(s??'').trim();if(v.length<min||v.length>max)fail(label);return v};
const houseFor=id=>{const h=cache.houses.find(x=>x.id===id);if(!h)fail('Uy topilmadi');return h};
const ownHouse=id=>{const h=houseFor(id),u=need();if(u.role!=='admin'&&h.owner!==u.id)fail('Bu uyni tahrirlashga ruxsat yo‘q');return h};
export const BADGES={
 first_photo:['📷 Birinchi xotira','Stendga birinchi rasmni qo‘ying'],
 album:['🖼️ To‘liq uy','Bitta xonadagi 9 ta stendni ham to‘ldiring'],
 loved:['💖 Sevilgan uy','Uyingiz 10 ta layk olsin'],
 wisher:['💌 Tilak egasi','Tilaklar doskasiga tilak yozing'],
 hit:['🔥 Mashhur tilak','Tilagingiz 5 ta layk olsin'],
 explorer:['🧭 Sayyoh','5 ta boshqa uyga kiring'],
 kind:['🤝 Saxovatli','5 ta uyga layk bosing']
};

export const api={demo:false,configured:!!supabase,me:current,
 async init(){await load();checked().auth.onAuthStateChange((_event)=>{queueMicrotask(()=>load().catch(e=>window.dispatchEvent(new CustomEvent('api:error',{detail:e.message}))))})},
 async refresh(){await load()},
 async login({email,password,name}){const sb=checked(),e=validText(email,3,254,'Email manzilini kiriting'),pw=String(password||'');if(pw.length<8)fail('Parol kamida 8 ta belgidan iborat bo‘lsin');
  if(name){const {data,error}=await sb.auth.signUp({email:e,password:pw,options:{data:{username:validText(name,2,24,'Ism 2–24 belgi bo‘lsin')}}});if(error)throw error;
   if(!data.session)fail('Ro‘yxatdan o‘tish havolasi emailga yuborildi. Tasdiqlagach, qayta kiring')}
  else{const {error}=await sb.auth.signInWithPassword({email:e,password:pw});if(error)throw error}
  await load();return profile},
 async setName(name){const v=validText(name,2,24,'Ism 2–24 belgi bo‘lsin');result(await checked().rpc('update_my_username',{new_username:v}));await load()},
 async changePassword(_oldPassword,newPassword){if(String(newPassword).length<8)fail('Yangi parol kamida 8 ta belgidan iborat bo‘lsin');const {error}=await checked().auth.updateUser({password:newPassword});if(error)throw error},
 async logout(){const {error}=await checked().auth.signOut();if(error)throw error;profile=null;cache={...cache,houses:[],guests:[],wishes:[],notifications:[]}},
 houses:()=>cache.houses,
 catalog:()=>cache.houses.filter(h=>!h.hidden),
 house:id=>cache.houses.find(h=>h.id===id),
 myHouse:()=>cache.houses.find(h=>h.owner===profile?.id),
 async saveStand(hid,ri,i,s){const h=ownHouse(hid),r=h.rooms[ri];if(!r||i<0||i>=9)fail('Stend topilmadi');
  const image=await uploadImage(s.img,`${profile.id}/${hid}/${r.id}-${i}.jpg`),payload={house_id:hid,room_id:r.id,stand_index:i,title:String(s.t||'').slice(0,40),caption:String(s.c||'').slice(0,300),image_url:image,updated_at:iso(Date.now())};
  result(await checked().from('stands').upsert(payload,{onConflict:'room_id,stand_index'}));await audit('stend tahrirlandi',h.name);await load()},
 async saveHouse(hid,s){const h=ownHouse(hid),name=validText(s.name,2,30,'Uy nomi 2–30 belgi bo‘lsin'),song=s.song;
  const musicId=song?.id||null;result(await checked().from('houses').update({name,is_public:!s.hidden,music_id:musicId}).eq('id',hid));await audit('uy sozlamasi',name);await load()},
 async saveRoom(hid,ri,s){const h=ownHouse(hid),r=h.rooms[ri];if(!r)fail('Xona topilmadi');
  result(await checked().from('house_rooms').update({name:validText(s.name,2,24,'Xona nomi 2–24 belgi bo‘lsin'),color:Math.max(0,Math.min(360,Math.round(+s.color||0))),mode:s.mode==='light'?'light':'dark'}).eq('id',r.id));await audit('xona sozlamasi',r.name);await load()},
 async addRoom(hid,name){const h=ownHouse(hid);if(h.rooms.length>=6)fail('Ko‘pi bilan 6 ta xona bo‘ladi');
  const indexes=new Set(h.rooms.map(r=>r.room_index)),roomIndex=Array.from({length:6},(_,i)=>i).find(i=>!indexes.has(i));
  const row=result(await checked().from('house_rooms').insert({house_id:hid,room_index:roomIndex,name:validText(name,2,24,'Xona nomi 2–24 belgi bo‘lsin'),color:Math.floor(Math.random()*360),mode:'dark'}).select().single());
  await load();return cache.houses.find(x=>x.id===hid).rooms.findIndex(x=>x.id===row.id)},
 async delRoom(hid,ri){const h=ownHouse(hid);if(h.rooms.length<=2)fail('Kamida 2 ta xona qolishi kerak');const r=h.rooms[ri];if(!r)fail('Xona topilmadi');
  result(await checked().from('house_rooms').delete().eq('id',r.id));await load()},
 async like(hid){const h=houseFor(hid),u=need(),sb=checked();if(h.owner===u.id)fail('O‘z uyingizga layk bosib bo‘lmaydi');
  const existing=h.likes.includes(u.id);if(existing)result(await sb.from('house_votes').delete().eq('house_id',hid).eq('user_id',u.id));
  else result(await sb.from('house_votes').insert({house_id:hid,user_id:u.id,value:5}));await load()},
 async visit(hid){if(!cache.houses.some(x=>x.id===hid))return;result(await checked().rpc('record_house_visit',{p_house:hid}));await load()},
 guests:hid=>cache.guests.filter(g=>g.h===hid).sort((a,b)=>b.at-a.at),
 async addGuest(hid,text){const u=need();if(text.trim().length<2||text.trim().length>160)fail('Yozuv 2–160 belgi bo‘lsin');
  result(await checked().from('guestbook').insert({house_id:hid,author_id:u.id,author_name:u.name,message:text.trim()}));await load()},
 async delGuest(gid){const g=cache.guests.find(x=>x.id===gid);if(!g)return;const u=need(),h=houseFor(g.h);if(u.role!=='admin'&&h.owner!==u.id&&g.uid!==u.id)fail('Ruxsat yo‘q');
  result(await checked().from('guestbook').delete().eq('id',gid));await load()},
 wishes:()=>cache.wishes.slice().sort((a,b)=>b.likes.length-a.likes.length||b.at-a.at),
 async addWish(text){const u=need();result(await checked().from('wishes').insert({user_id:u.id,body:validText(text,3,200,'Tilak 3–200 belgi bo‘lsin')}));await load()},
 async likeWish(wid){const w=cache.wishes.find(x=>x.id===wid),u=need();if(!w)return;const sb=checked();
  if(w.likes.includes(u.id))result(await sb.from('wish_votes').delete().eq('wish_id',wid).eq('user_id',u.id));
  else result(await sb.from('wish_votes').insert({wish_id:wid,user_id:u.id,value:5}));await load()},
 async delWish(wid){admin();result(await checked().from('wishes').delete().eq('id',wid));await load()},
 news:()=>cache.news,
 async addNews(title,body,image){admin();const img=await uploadImage(image,`${profile.id}/news/${id()}.jpg`);
  result(await checked().from('news').insert({title:validText(title,1,60,'Sarlavha kerak'),body:String(body||'').slice(0,500),image_url:img}));await load()},
 async delNews(nid){admin();result(await checked().from('news').delete().eq('id',nid));await load()},
 songs:()=>cache.songs,
 async addSong(category,title,artist,songUrl){admin();if(!['trend','romantic'].includes(category))fail('Ro‘yxat noto‘g‘ri');if(!/^https:\/\//.test(songUrl))fail('Havola https:// bilan boshlansin');
  result(await checked().from('songs').insert({category,title:validText(title,1,80,'Nomi kerak'),artist:String(artist||'').slice(0,60),url:songUrl,sort_order:Date.now()}));await load()},
 async delSong(category,index){admin();const row=cache.songs[category]?.[index];if(!row)fail('Qo‘shiq topilmadi');result(await checked().from('songs').delete().eq('id',row.id));await load()},
 notifs:()=>cache.notifications,
 unread:()=>cache.notifications.filter(n=>!n.read).length,
 async readAll(){const u=need();result(await checked().from('notifications').update({is_read:true}).eq('user_id',u.id).eq('is_read',false));await load()},
 badges:id=>cache.badges[id||profile?.id]||[],
 async report(kind,target,reason=''){const u=need();result(await checked().from('complaints').insert({reporter_id:u.id,target_type:kind,target_id:target,reason:String(reason||'').slice(0,200)}));await load()},
 reports(){admin();return cache.reports},
 async resolveReport(rid,remove){admin();const r=cache.reports.find(x=>x.id===rid);if(!r)return;
  if(remove&&r.kind==='wish')result(await checked().from('wishes').delete().eq('id',r.target));
  if(remove&&r.kind==='guest')result(await checked().from('guestbook').delete().eq('id',r.target));
  result(await checked().from('complaints').update({resolved:true}).eq('id',rid));await load()},
 users(){admin();return cache.users},
 async ban(uid,on){admin();if(uid===profile.id)fail('O‘z hisobingizni bloklay olmaysiz');result(await checked().from('profiles').update({banned:!!on}).eq('id',uid));await load()},
 audit(){admin();return cache.audit},
 stats(){admin();return cache.stats}
};
