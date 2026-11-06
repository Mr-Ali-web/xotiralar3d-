import { login, signup, logout, updateUser, handleAuthCallback } from '@netlify/identity';
let cache={me:null,houses:[],guests:[],wishes:[],news:[],songs:{trend:[],romantic:[]},notifications:[],badges:{},reports:[],users:[],audit:[],stats:{}};
async function request(action,args=[]){
 const res=await fetch('/api/app',{method:action?'POST':'GET',credentials:'same-origin',headers:action?{'Content-Type':'application/json'}:{},body:action?JSON.stringify({action,args}):undefined});
 const result=await res.json().catch(()=>({detail:'Server javobi noto‘g‘ri'}));
 if(!res.ok)throw new Error(result.detail||'Server bilan ulanishda xatolik');
 cache=result.data;return result.value;
}
export const BADGES={
 first_photo:['📷 Birinchi xotira','Stendga birinchi rasmni qo‘ying'],
 album:['🖼️ To‘liq uy','Bitta xonadagi 9 ta stendni ham to‘ldiring'],
 loved:['💖 Sevilgan uy','Uyingiz 10 ta layk olsin'],
 wisher:['💌 Tilak egasi','Tilaklar doskasiga tilak yozing'],
 hit:['🔥 Mashhur tilak','Tilagingiz 5 ta layk olsin'],
 explorer:['🧭 Sayyoh','5 ta boshqa uyga kiring'],
 kind:['🤝 Saxovatli','5 ta uyga layk bosing']
};

export const api={demo:false,configured:true,
 me:()=>cache.me,
 async init(){await handleAuthCallback();await request()},
 refresh:()=>request(),
 async login({email,password,name}){
  if(String(password||'').length<8)throw new Error('Parol kamida 8 ta belgidan iborat bo‘lsin');
  if(name){if(name.trim().length<2||name.trim().length>24)throw new Error('Ism 2–24 belgi bo‘lsin');const user=await signup(email,password,{full_name:name.trim()});if(!user.emailVerified)throw new Error('Tasdiqlash havolasi emailga yuborildi. Emailingizni tasdiqlang va qayta kiring');}
  else await login(email,password);
  await request();return cache.me;
 },
 async changePassword(_old,password){if(String(password).length<8)throw new Error('Parol kamida 8 ta belgidan iborat bo‘lsin');await updateUser({password})},
 async logout(){await logout();await request()},
 houses:()=>cache.houses,catalog:()=>cache.houses.filter(h=>!h.hidden),house:id=>cache.houses.find(h=>h.id===id),myHouse:()=>cache.houses.find(h=>h.owner===cache.me?.id),
 guests:hid=>cache.guests.filter(g=>g.h===hid).sort((a,b)=>b.at-a.at),
 wishes:()=>cache.wishes.slice().sort((a,b)=>b.likes.length-a.likes.length||b.at-a.at),
 news:()=>cache.news,songs:()=>cache.songs,notifs:()=>cache.notifications,unread:()=>cache.notifications.filter(n=>!n.read).length,
 badges:id=>cache.badges[id||cache.me?.id]||[],reports:()=>cache.reports,users:()=>cache.users,audit:()=>cache.audit,stats:()=>cache.stats,
 async delSong(category,index){const song=cache.songs[category]?.[index];if(song)await request('delSong',[song.id])},
 async visit(hid){if(cache.me)await request('visit',[hid])}
};
for(const action of ['setName','saveStand','saveHouse','saveRoom','addRoom','delRoom','like','addGuest','delGuest','addWish','likeWish','delWish','addNews','delNews','addSong','readAll','report','resolveReport','ban'])api[action]=(...args)=>request(action,args);
