import QRCode from 'qrcode';
export const $=s=>document.querySelector(s);
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('on'),2600)}
export function sheet(title,html,mount){const s=$('#sheet');$('#sheet h2').textContent=title;const b=$('#sheet .body');b.innerHTML=html;b.onclick=null;s.classList.add('on');mount?.(b)}
export const closeSheet=()=>$('#sheet').classList.remove('on');
export const shrink=f=>new Promise((ok,no)=>{const r=new FileReader();r.onerror=no;r.onload=()=>{const i=new Image();i.onerror=no;i.onload=()=>{
 const k=Math.min(1,800/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=Math.round(i.width*k);c.height=Math.round(i.height*k);
 c.getContext('2d').drawImage(i,0,0,c.width,c.height);ok(c.toDataURL('image/jpeg',.8))};i.src=r.result};r.readAsDataURL(f)});
export async function shareSheet(h){
 const url=location.origin+location.pathname+'#/uy/'+h.id,qr=await QRCode.toDataURL(url,{margin:1,width:240,color:{dark:'#2a0a1f',light:'#ffffff'}});
 sheet('Uyni ulashish',`<img class="qr" src="${qr}" alt="QR kod"><input readonly value="${esc(url)}"><div class="row"><button id="cp" class="btn">Havolani nusxalash</button><a class="btn" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(h.name)}">Telegram</a></div>`,
 b=>b.querySelector('#cp').onclick=async()=>{try{await navigator.clipboard.writeText(url);toast('Nusxalandi')}catch{toast('Havolani qo‘lda nusxalang')}})}
