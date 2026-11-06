import './style.css';
import {api,BADGES} from './store.js';
import {createWorld} from './scene.js';
import {$,esc,toast,sheet,closeSheet,shrink,shareSheet} from './ui.js';

let cur=null,ri=0;const seen=new Set();
const arun=async(f,then)=>{try{await f();then?.()}catch(e){toast(e.message)}};
const isAdmin=()=>api.me()?.role==='admin';
const canEdit=h=>{const u=api.me();return !!u&&!u.banned&&(u.role==='admin'||h.owner===u.id)};
const world=createWorld($('#app'),$('#joy'),i=>pick(i),r=>open(cur.id,r));
const bell=()=>{$('#bell').dataset.n=api.unread()||''};
const when=t=>new Date(t).toLocaleString('uz',{dateStyle:'short',timeStyle:'short'});

// ---- musiqa pleyeri (YouTube havolasi bo'lsa ichida, bo'lmasa havola)
const ytId=u=>{try{const x=new URL(u),id=x.hostname==='youtu.be'?x.pathname.slice(1):x.hostname.endsWith('youtube.com')?x.searchParams.get('v'):null;return id&&/^[\w-]{6,15}$/.test(id)?id:null}catch{return null}};
const stopPlayer=()=>{const p=$('#player');p.hidden=true;p.innerHTML=''};
function play(){const s=cur?.song,p=$('#player');if(!s)return;if(!p.hidden)return stopPlayer();const id=ytId(s.url);p.hidden=false;
 p.innerHTML='<button id="px" aria-label="Yopish">✕</button>'+(id?`<iframe src="https://www.youtube.com/embed/${id}?autoplay=1" allow="autoplay; encrypted-media" title="${esc(s.t)}"></iframe>`:`<a class="btn pri" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.t)}: tinglash</a>`);
 p.querySelector('#px').onclick=stopPlayer}

// ---- uy va xonalar
function hud(){const h=api.house(cur.id),u=api.me();cur=h;ri=Math.min(ri,h.rooms.length-1);$('#hname').textContent=h.name;
 $('#hlike').textContent=(u&&h.likes.includes(u.id)?'❤️':'🤍')+' '+h.likes.length;$('#hsong').hidden=!h.song;
 $('#rooms').innerHTML=h.rooms.map((r,i)=>`<button class="${i===ri?'on':''}" data-r="${i}">${esc(r.name)}</button>`).join('');bell()}
function open(id,r=0,keep=false){const h=api.house(id)||api.myHouse()||api.catalog()[0];if(!h){viewLogin();return}
 if(cur&&cur.id!==h.id)stopPlayer();cur=h;ri=Math.min(r,h.rooms.length-1);
 world.build(h,ri);if(!keep)world.reset();if(!seen.has(h.id)){seen.add(h.id);api.visit(h.id).catch(e=>toast(e.message))}hud();
 history.replaceState(null,'',`#/uy/${h.id}`);
 if(canEdit(h)&&!localStorage.getItem('x3d2:hint')){localStorage.setItem('x3d2:hint','1');toast('Stendni bosib rasm qo‘ying. Eshiklar orqangizda 🚪')}}

function pick(i){const s=cur.rooms[ri].stands[i];if(canEdit(cur))return editStand(i);
 if(!s.img&&!s.t)return toast('Bu stend hali bo‘sh');
 sheet(s.t||'Xotira',(s.img?`<img class="pic" src="${esc(s.img)}" alt="">`:'')+`<p>${esc(s.c)}</p>`)}
function editStand(i){const s=cur.rooms[ri].stands[i];let im=s.img;
 sheet(`${cur.rooms[ri].name}: stend ${i+1}`,`<input id="t" maxlength="40" placeholder="Sarlavha" value="${esc(s.t)}"><textarea id="c" maxlength="300" placeholder="Bu xotira haqida bir-ikki og‘iz so‘z">${esc(s.c)}</textarea>
 <label class="btn">Rasm tanlash<input id="f" type="file" accept="image/*" hidden></label><img id="pv" class="pic" alt="" ${im?`src="${esc(im)}"`:'hidden'}>
 <div class="row"><button id="ok" class="btn pri">Saqlash</button><button id="del" class="btn">Tozalash</button></div>`,b=>{
  b.querySelector('#f').onchange=async e=>{const f=e.target.files[0];if(!f||!f.type.startsWith('image/'))return toast('Faqat rasm tanlang');
   try{im=await shrink(f);const p=b.querySelector('#pv');p.src=im;p.hidden=false}catch{toast('Rasm o‘qilmadi')}};
  const save=s2=>arun(()=>api.saveStand(cur.id,ri,i,s2),()=>{closeSheet();open(cur.id,ri,true);toast('Saqlandi 💖')});
  b.querySelector('#ok').onclick=()=>save({t:b.querySelector('#t').value.trim(),c:b.querySelector('#c').value.trim(),img:im});
  b.querySelector('#del').onclick=()=>save({t:'',c:'',img:''})})}

function viewSet(h=api.myHouse()){if(cur.id!==h.id)open(h.id);const r=h.rooms[ri],s=api.songs(),all=[...s.trend,...s.romantic];
 sheet('Sozlamalar',`<h3>Uy</h3><input id="n" maxlength="30" value="${esc(h.name)}" aria-label="Uy nomi">
 <select id="s" aria-label="Musiqa"><option value="">Musiqasiz</option>${all.map((x,i)=>`<option value="${i}" ${h.song?.url===x.url?'selected':''}>${esc(x.t)}${x.a?': '+esc(x.a):''}</option>`).join('')}</select>
 <label class="chk"><input id="v" type="checkbox" ${h.hidden?'':'checked'}>Uylar katalogida ko‘rinsin</label>
 <h3>Joriy xona</h3><input id="rn" maxlength="24" value="${esc(r.name)}" aria-label="Xona nomi"><label>Rang<input id="c" type="range" min="0" max="360" value="${r.color}"></label>
 <select id="m" aria-label="Rejim"><option value="dark" ${r.mode!=='light'?'selected':''}>Tungi rejim</option><option value="light" ${r.mode==='light'?'selected':''}>Kunduzgi rejim</option></select>
 <button id="ok" class="btn pri">Saqlash</button>
 <h3>Xonalar: ${h.rooms.length}/6</h3><input id="nr" maxlength="24" placeholder="Yangi xona nomi"><div class="row"><button id="add" class="btn">Xona qo‘shish</button><button id="del" class="btn">Joriy xonani o‘chirish</button></div>`,b=>{
  const v=q=>b.querySelector(q).value,redo=n=>{closeSheet();open(h.id,n,true)};
  b.querySelector('#ok').onclick=()=>arun(async()=>{await api.saveHouse(h.id,{name:v('#n'),song:v('#s')===''?null:all[+v('#s')],hidden:!b.querySelector('#v').checked});
   await api.saveRoom(h.id,ri,{name:v('#rn'),color:+v('#c'),mode:v('#m')})},()=>{redo(ri);toast('Saqlandi 💖')});
  b.querySelector('#add').onclick=()=>arun(()=>api.addRoom(h.id,v('#nr')),n=>{redo(n);toast('Yangi xona tayyor')});
  b.querySelector('#del').onclick=()=>arun(()=>api.delRoom(h.id,ri),()=>{redo(0);toast('Xona o‘chirildi')})})}

function viewBook(){if(!cur)return viewLogin();const u=api.me(),g=api.guests(cur.id);
 sheet('Mehmonlar kitobi',`<textarea id="w" maxlength="160" placeholder="Bu uyga iliq so‘z qoldiring"></textarea><button id="ok" class="btn pri">Yozish</button>`+
 (g.length?g.map(x=>`<div class="card"><p>${esc(x.text)}</p><small>${esc(x.name)}</small><div class="row">${u&&(isAdmin()||cur.owner===u.id||x.uid===u.id)?`<button data-d="${x.id}">O‘chirish</button>`:''}${u&&x.uid!==u.id?`<button data-r="${x.id}">Shikoyat</button>`:''}</div></div>`).join(''):'<p class="mute">Hali yozuv yo‘q. Birinchi bo‘ling.</p>'),b=>{
  b.querySelector('#ok').onclick=()=>arun(()=>api.addGuest(cur.id,b.querySelector('#w').value),viewBook);
  b.onclick=e=>{const d=e.target.closest('[data-d]'),r=e.target.closest('[data-r]');
   if(d)arun(()=>api.delGuest(d.dataset.d),viewBook);if(r)arun(()=>api.report('guest',r.dataset.r),()=>toast('Shikoyat yuborildi'))}})}

// ---- katalog (qidiruv va tasodifiy uy), tilaklar, yangiliklar, qo'shiqlar
function viewHouses(){const all=api.catalog().slice().sort((a,b)=>b.likes.length-a.likes.length);
 sheet('Uylar katalogi',`<input id="q" placeholder="Uy nomini qidiring"><button id="rnd" class="btn">🎲 Tasodifiy uy</button><div id="hl" class="body"></div>`,b=>{
  const fill=q=>b.querySelector('#hl').innerHTML=all.filter(h=>h.name.toLowerCase().includes(q.toLowerCase())).map(h=>`<button class="btn item" data-go="${esc(h.id)}"><b>${esc(h.name)}</b><span>${h.rooms.length} xona · ❤ ${h.likes.length} · 👁 ${h.visits}</span></button>`).join('')||'<p class="mute">Hech narsa topilmadi</p>';
  fill('');b.querySelector('#q').oninput=e=>fill(e.target.value);
  b.querySelector('#rnd').onclick=()=>{const o=all.filter(h=>h.id!==cur?.id);if(!o.length)return toast('Boshqa uy yo‘q');closeSheet();open(o[Math.floor(Math.random()*o.length)].id)};
  b.onclick=e=>{const g=e.target.closest('[data-go]');if(g){closeSheet();open(g.dataset.go)}}})}

function viewWishes(){const u=api.me(),ws=api.wishes();
 sheet('Tilaklar doskasi',`<textarea id="w" maxlength="200" placeholder="Yaxshi tilak qoldiring"></textarea><button id="ok" class="btn pri">Tilak yuborish</button>`+
 ws.map(w=>`<div class="card"><p>${esc(w.text)}</p><small>${esc(w.name)}</small><div class="row"><button data-l="${w.id}">${u&&w.likes.includes(u.id)?'❤️':'🤍'} ${w.likes.length}</button>${u&&w.uid!==u.id?`<button data-r="${w.id}">Shikoyat</button>`:''}${isAdmin()?`<button data-d="${w.id}">O‘chirish</button>`:''}</div></div>`).join(''),b=>{
  b.querySelector('#ok').onclick=()=>arun(()=>api.addWish(b.querySelector('#w').value),viewWishes);
  b.onclick=e=>{const l=e.target.closest('[data-l]'),d=e.target.closest('[data-d]'),r=e.target.closest('[data-r]');
   if(l)arun(()=>api.likeWish(l.dataset.l),viewWishes);if(d)arun(()=>api.delWish(d.dataset.d),viewWishes);if(r)arun(()=>api.report('wish',r.dataset.r),()=>toast('Shikoyat yuborildi'))}})}

function viewNews(){const ad=isAdmin();let im='';
 sheet('Yangiliklar',(ad?`<input id="t" maxlength="60" placeholder="Sarlavha"><textarea id="b" maxlength="500" placeholder="Matn"></textarea><label class="btn">Rasm qo‘shish<input id="f" type="file" accept="image/*" hidden></label><button id="ok" class="btn pri">E‘lon qilish</button>`:'')+
 api.news().map(n=>`<div class="card"><b>${esc(n.t)}</b>${n.img?`<img class="pic" src="${esc(n.img)}" alt="">`:''}<p>${esc(n.b)}</p><small>${when(n.at)}</small>${ad?`<button data-d="${n.id}">O‘chirish</button>`:''}</div>`).join(''),b=>{
  const f=b.querySelector('#f');if(f)f.onchange=async e=>{const x=e.target.files[0];if(x?.type.startsWith('image/'))try{im=await shrink(x);toast('Rasm tanlandi')}catch{toast('Rasm o‘qilmadi')}};
  const ok=b.querySelector('#ok');if(ok)ok.onclick=()=>arun(()=>api.addNews(b.querySelector('#t').value,b.querySelector('#b').value,im),viewNews);
  b.onclick=e=>{const d=e.target.closest('[data-d]');if(d)arun(()=>api.delNews(d.dataset.d),viewNews)}})}

function viewSongs(){const ad=isAdmin(),s=api.songs(),T={trend:'2026 trend qo‘shiqlar',romantic:'Romantik qo‘shiqlar'};
 const list=k=>`<h3>${T[k]}</h3>`+(s[k].length?s[k].map((x,i)=>`<div class="card"><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.t)}</a><small>${esc(x.a)}</small>${ad?`<button data-d="${k}:${i}">O‘chirish</button>`:''}</div>`).join(''):'<p class="mute">Hozircha bo‘sh</p>');
 sheet('Qo‘shiqlar',list('trend')+list('romantic')+(ad?`<h3>Qo‘shiq qo‘shish</h3><select id="l"><option value="trend">Trend</option><option value="romantic">Romantik</option></select><input id="t" placeholder="Nomi"><input id="a" placeholder="Ijrochi"><input id="u" placeholder="https:// havola (YouTube bo‘lsa uyda ijro etiladi)"><button id="ok" class="btn pri">Qo‘shish</button>`:''),b=>{
  const ok=b.querySelector('#ok'),v=q=>b.querySelector(q).value;if(ok)ok.onclick=()=>arun(()=>api.addSong(v('#l'),v('#t'),v('#a'),v('#u').trim()),viewSongs);
  b.onclick=e=>{const d=e.target.closest('[data-d]');if(d){const[k,i]=d.dataset.d.split(':');arun(()=>api.delSong(k,+i),viewSongs)}}})}

// ---- bildirishnoma, kirish, profil, admin
function viewBell(){if(!api.me())return viewMe();const ns=api.notifs();arun(()=>api.readAll(),bell);
 sheet('Bildirishnomalar',ns.length?ns.map(n=>`<div class="card"><p>${esc(n.text)}</p><small>${when(n.at)}</small></div>`).join(''):'<p class="mute">Hozircha yangilik yo‘q</p>')}

function viewLogin(){sheet('Kirish / ro‘yxatdan o‘tish',`<p>Email va parolingiz bilan kiring yoki yangi hisob yarating. Parol kamida 8 ta belgidan iborat bo‘lsin.</p>
 <input id="e" type="email" autocomplete="email" placeholder="Email manzil"><input id="k" type="password" autocomplete="current-password" minlength="8" placeholder="Parol (kamida 8 belgi)">
 <input id="n" maxlength="24" placeholder="Ismingiz (yangi hisob uchun)"><div class="row"><button id="login" class="btn pri">Kirish</button><button id="signup" class="btn">Hisob yaratish</button></div>`,
 b=>{const submit=signup=>arun(async()=>{await api.login({email:b.querySelector('#e').value,password:b.querySelector('#k').value,name:signup?b.querySelector('#n').value:''});
  closeSheet();toast('Xush kelibsiz 💖');open(api.myHouse()?.id)},()=>{if(!api.me())return;});
  b.querySelector('#login').onclick=()=>submit(false);b.querySelector('#signup').onclick=()=>submit(true)})}

function viewProfile(){const u=api.me();
 sheet('Profil',`<h3>Ism</h3><input id="n" maxlength="24" value="${esc(u.name)}"><button id="sn" class="btn">Ismni saqlash</button>
 <h3>Parolni almashtirish</h3><input id="k" type="password" minlength="8" placeholder="Yangi parol (kamida 8 belgi)"><button id="sp" class="btn">Parolni saqlash</button>`,b=>{
  b.querySelector('#sn').onclick=()=>arun(()=>api.setName(b.querySelector('#n').value),()=>toast('Saqlandi'));
  b.querySelector('#sp').onclick=()=>arun(()=>api.changePassword('',b.querySelector('#k').value),()=>{toast('Parol yangilandi');closeSheet()})})}

function viewMe(){const u=api.me();if(!u)return viewLogin();const bs=api.badges();
 sheet(u.name,`<button class="btn pri" data-a="mine">Mening uyim</button><button class="btn" data-a="set">Uy va xonalar sozlamalari</button><button class="btn" data-a="share">Ulashish va QR kod</button><button class="btn" data-a="prof">Profil va parol</button>${u.role==='admin'?'<button class="btn" data-a="admin">Admin panel</button>':''}
 <h3>Nishonlar: ${bs.length}/${Object.keys(BADGES).length}</h3><div class="grid2">${Object.entries(BADGES).map(([c,[n,d]])=>`<div class="card badge ${bs.includes(c)?'on':''}"><b>${esc(n)}</b><small>${esc(d)}</small></div>`).join('')}</div><button class="btn" data-a="out">Chiqish</button>`,
  b=>b.onclick=e=>{const a=e.target.dataset.a;if(a==='mine'){closeSheet();open(api.myHouse().id)}if(a==='set')viewSet();if(a==='share')shareSheet(api.myHouse());
   if(a==='prof')viewProfile();if(a==='admin')viewAdmin();if(a==='out')arun(()=>api.logout(),()=>{closeSheet();if(api.catalog()[0])open(api.catalog()[0].id);else toast('Hisobdan chiqildi')})})}

function viewAdmin(){try{const s=api.stats(),rp=api.reports(),us=api.users(),lg=api.audit(),
 N={Foydalanuvchi:s.users,'24 soatda faol':s.active,Uylar:s.houses,Tilaklar:s.wishes,Layklar:s.likes,Tashriflar:s.visits};
 sheet('Admin panel',`<div class="grid">${Object.entries(N).map(([k,v])=>`<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('')}</div>
 <button class="btn" data-a="main">Asosiy uy sozlamalari</button><p class="mute">Istalgan uyni «Uylar» ro‘yxatidan ochib, tahrirlay olasiz. Har bir harakat jurnalga yoziladi.</p>
 <h3>Shikoyatlar: ${rp.length}</h3>${rp.map(r=>`<div class="card"><small>${esc(r.kind)}, yuborgan: ${esc(r.byName)}</small><p>${esc(r.text||'(kontent topilmadi)')}</p><div class="row"><button data-x="${r.id}">Kontentni o‘chirish</button><button data-c="${r.id}">Yopish</button></div></div>`).join('')}
 <h3>Foydalanuvchilar</h3>${us.map(x=>`<div class="card"><b>${esc(x.name)}</b><small>${esc(x.role)}${x.banned?' · bloklangan':''}</small>${x.role!=='admin'?`<button data-b="${x.id}:${x.banned?0:1}">${x.banned?'Blokdan chiqarish':'Bloklash'}</button>`:''}</div>`).join('')}
 <h3>Harakatlar jurnali</h3>${lg.map(l=>`<small>${when(l.at)}: ${esc(l.by)}, ${esc(l.action)} (${esc(l.target)})</small>`).join('')||'<p class="mute">Hozircha bo‘sh</p>'}`,b=>b.onclick=e=>{
  const q=k=>e.target.closest(`[data-${k}]`)?.dataset[k];
  if(q('a')==='main'){const h=api.myHouse()||api.catalog()[0];if(h)return viewSet(h);toast('Sozlash uchun uy topilmadi')}
  if(q('x'))arun(()=>api.resolveReport(q('x'),true),viewAdmin);if(q('c'))arun(()=>api.resolveReport(q('c'),false),viewAdmin);
  if(q('b')){const[id,on]=q('b').split(':');arun(()=>api.ban(id,on==='1'),viewAdmin)}})}catch(e){toast(e.message)}}

const V={home:()=>{closeSheet();const h=api.myHouse()||api.catalog()[0];if(h)open(h.id);else viewLogin()},houses:viewHouses,wishes:viewWishes,news:viewNews,songs:viewSongs,bell:viewBell,me:viewMe};
$('#nav').onclick=e=>{const b=e.target.closest('[data-v]');if(b)V[b.dataset.v]()};
$('#rooms').onclick=e=>{const b=e.target.closest('[data-r]');if(b)open(cur.id,+b.dataset.r)};
$('#x').onclick=closeSheet;
$('#hlike').onclick=()=>cur&&arun(()=>api.like(cur.id),hud);
$('#hshare').onclick=()=>cur&&shareSheet(cur);
$('#hbook').onclick=viewBook;
$('#hsong').onclick=play;
$('#go').onclick=()=>{if(api.me()||api.catalog().length)$('#welcome').classList.add('off');else viewLogin()};
window.addEventListener('api:error',e=>toast(e.detail));
api.init().then(()=>{const shared=location.hash.startsWith('#/uy/')?location.hash.slice(5):null;
 const h=shared&&api.house(shared)?shared:(api.myHouse()?.id||api.catalog()[0]?.id);if(h)open(h);else viewLogin();
 if(api.me()||api.catalog().length)$('#welcome').classList.add('off');
 setInterval(bell,8000)}).catch(e=>toast(e.message));
