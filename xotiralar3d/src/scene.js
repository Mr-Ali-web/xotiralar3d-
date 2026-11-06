import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import nipplejs from 'nipplejs';

const tex=(w,h,draw,rep)=>{const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep)}return t};
const std=o=>new THREE.MeshStandardMaterial(o);

export function createWorld(host,joyEl,onPick,onDoor){
 const coarse=matchMedia('(pointer:coarse)').matches;
 const R=new THREE.WebGLRenderer({antialias:!coarse,powerPreference:'high-performance'});
 R.setPixelRatio(Math.min(devicePixelRatio,coarse?1.5:2));R.setSize(innerWidth,innerHeight);
 R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.15;host.appendChild(R.domElement);
 const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,60);cam.position.set(0,1.65,5);
 const comp=new EffectComposer(R);comp.addPass(new RenderPass(scene,cam));
 const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.5,.7,.9);comp.addPass(bloom);comp.addPass(new OutputPass());
 let home=new THREE.Group(),frames=[],doors=[],crystal=null,hearts=null;scene.add(home);

 function build(h,ri=0){
  const r=h.rooms[ri]||h.rooms[0];
  scene.remove(home);home.traverse(o=>{o.geometry?.dispose();const m=o.material;if(m){m.map?.dispose();m.dispose()}});
  home=new THREE.Group();scene.add(home);frames=[];doors=[];
  const H=r.color,D=r.mode!=='light',bg=new THREE.Color(D?`hsl(${H},45%,5%)`:`hsl(${H},70%,88%)`),add=m=>(home.add(m),m);
  bloom.strength=D?.5:.12;scene.background=bg;scene.fog=new THREE.Fog(bg,9,28);
  add(new THREE.HemisphereLight(0xffd6e8,0x201028,D?.9:1.6));
  [[0,3,-3,0xffb36b],[-4,3,3,0xff5c8a],[4,3,3,0xff5c8a]].forEach(([x,y,z,c])=>{const l=new THREE.PointLight(c,D?30:10,16,1.4);l.position.set(x,y,z);add(l)});
  const fl=add(new THREE.Mesh(new THREE.PlaneGeometry(14,14),std({roughness:.22,metalness:.2,map:tex(256,256,x=>{
   for(let i=0;i<4;i++)for(let j=0;j<4;j++){x.fillStyle=(i+j)%2?D?`hsl(${H} 35% 16%)`:`hsl(${H} 40% 74%)`:D?`hsl(${H} 30% 10%)`:`hsl(${H} 40% 64%)`;x.fillRect(i*64,j*64,64,64)}},4)})));fl.rotation.x=-Math.PI/2;
  const wm=std({color:new THREE.Color(D?`hsl(${H},35%,22%)`:`hsl(${H},45%,80%)`),roughness:.85});
  [[0,-7,14,.2],[0,7,14,.2],[-7,0,.2,14],[7,0,.2,14]].forEach(([x,z,w,d])=>{const m=add(new THREE.Mesh(new THREE.BoxGeometry(w,4,d),wm));m.position.set(x,2,z)});
  const ce=add(new THREE.Mesh(new THREE.PlaneGeometry(14,14),std({color:new THREE.Color(D?`hsl(${H},40%,8%)`:`hsl(${H},50%,93%)`)})));ce.rotation.x=Math.PI/2;ce.position.y=4;
  const gold=std({color:0xd9a441,metalness:.9,roughness:.3,emissive:0x3a2200});
  r.stands.forEach((s,i)=>{
   const g=add(new THREE.Group()),side=Math.floor(i/3),k=i%3;
   if(side===0)g.position.set(-4+4*k,1.9,-6.85);
   else if(side===1){g.position.set(-6.85,1.9,-3+3*k);g.rotation.y=Math.PI/2}
   else{g.position.set(6.85,1.9,-3+3*k);g.rotation.y=-Math.PI/2}
   g.add(new THREE.Mesh(new THREE.BoxGeometry(2.1,2.6,.1),gold));
   const pm=new THREE.MeshBasicMaterial({map:tex(512,640,(x,w,hh)=>{
    const gr=x.createLinearGradient(0,0,w,hh);gr.addColorStop(0,`hsl(${H},60%,30%)`);gr.addColorStop(1,`hsl(${(H+40)%360},60%,16%)`);
    x.fillStyle=gr;x.fillRect(0,0,w,hh);x.fillStyle='#ffffffcc';x.textAlign='center';x.font='bold 150px serif';x.fillText(s.t?'♥':'+',w/2,hh/2+30);
    x.font='34px sans-serif';x.fillText(s.t||`Stend ${i+1}`,w/2,hh-60)})});
   const pic=new THREE.Mesh(new THREE.PlaneGeometry(1.9,2.4),pm);pic.position.z=.06;pic.userData.i=i;g.add(pic);frames.push(pic);
   if(s.img)new THREE.TextureLoader().load(s.img,t=>{t.colorSpace=THREE.SRGBColorSpace;pm.map?.dispose();pm.map=t;pm.needsUpdate=true;
    const r=t.image.width/t.image.height,b=1.9/2.4;r>b?pic.scale.y=b/r:pic.scale.x=r/b});
  });
  const sg=add(new THREE.Mesh(new THREE.PlaneGeometry(6,1),new THREE.MeshBasicMaterial({transparent:true,map:tex(1024,170,(x,w,hh)=>{
   x.textAlign='center';x.fillStyle=D?'#ffd9e6':'#5a1840';x.shadowColor='#ff5c8a';x.shadowBlur=24;x.font='italic 84px Georgia,serif';x.fillText(r.name,w/2,hh*.82);x.shadowBlur=0;x.font='32px sans-serif';x.fillText(h.name,w/2,40)})})));sg.position.set(0,3.3,-6.85);
  const others=h.rooms.map((q,k)=>[q,k]).filter(([,k])=>k!==ri);
  others.forEach(([q,k],n)=>{const g=add(new THREE.Group());g.position.set((n-(others.length-1)/2)*3.2,0,6.85);g.rotation.y=Math.PI;
   const fr=new THREE.Mesh(new THREE.BoxGeometry(1.8,2.9,.1),gold);fr.position.y=1.45;g.add(fr);
   const dm=new THREE.Mesh(new THREE.PlaneGeometry(1.5,2.6),new THREE.MeshBasicMaterial({map:tex(256,448,(x,w,hh)=>{
    const gr=x.createLinearGradient(0,0,0,hh);gr.addColorStop(0,`hsl(${q.color} 80% 70%)`);gr.addColorStop(1,`hsl(${q.color} 70% 35%)`);x.fillStyle=gr;x.fillRect(0,0,w,hh);
    x.fillStyle='#fff';x.textAlign='center';x.font='bold 120px serif';x.fillText('→',w/2,hh*.4);x.font='bold 34px sans-serif';
    q.name.split(' ').forEach((wd,j)=>x.fillText(wd,w/2,hh*.62+j*40))})}));
   dm.position.set(0,1.45,.06);dm.userData.d=k;g.add(dm);doors.push(dm)});
  const pd=add(new THREE.Mesh(new THREE.CylinderGeometry(.5,.7,.6,24),std({color:0x2b1330,metalness:.6,roughness:.3})));pd.position.y=.3;
  crystal=add(new THREE.Mesh(new THREE.OctahedronGeometry(.4),std({color:0xff7aa8,emissive:0xff2d6f,emissiveIntensity:1.4,roughness:.15})));crystal.position.y=1.3;
  const n=96,sl=add(new THREE.InstancedMesh(new THREE.SphereGeometry(.05,8,8),new THREE.MeshBasicMaterial({color:new THREE.Color(0xffd9a0).multiplyScalar(2.5)}),n)),mx=new THREE.Matrix4();
  for(let i=0;i<n;i++){const t=i/n*4,s=Math.floor(t),u=(t-s)*14-7,y=3.75+Math.sin(i*1.7)*.12,p=[[u,-6.8],[6.8,u],[-u,6.8],[-6.8,-u]][s];mx.setPosition(p[0],y,p[1]);sl.setMatrixAt(i,mx)}
  const N=140,pos=new Float32Array(N*3);for(let i=0;i<N;i++){pos[i*3]=(Math.random()-.5)*13;pos[i*3+1]=Math.random()*4;pos[i*3+2]=(Math.random()-.5)*13}
  const hg=new THREE.BufferGeometry();hg.setAttribute('position',new THREE.BufferAttribute(pos,3));
  hearts=add(new THREE.Points(hg,new THREE.PointsMaterial({size:.14,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,map:tex(64,64,x=>{
   const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#fff');g.addColorStop(.4,'#ff7aa8cc');g.addColorStop(1,'#ff7aa800');x.fillStyle=g;x.fillRect(0,0,64,64)})})));
 }

 const st={yaw:0,pitch:0,x:0,y:0,k:{}};
 addEventListener('keydown',e=>{if(!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))st.k[e.key.toLowerCase()]=true});
 addEventListener('keyup',e=>st.k[e.key.toLowerCase()]=false);
 const el=R.domElement,ray=new THREE.Raycaster();let dn=null;el.style.touchAction='none';
 el.addEventListener('pointerdown',e=>{dn={x:e.clientX,y:e.clientY,t:performance.now(),m:0};el.setPointerCapture(e.pointerId)});
 el.addEventListener('pointermove',e=>{if(!dn)return;const dx=e.clientX-dn.x,dy=e.clientY-dn.y;dn.m+=Math.abs(dx)+Math.abs(dy);dn.x=e.clientX;dn.y=e.clientY;
  st.yaw-=dx*.005;st.pitch=Math.max(-1.1,Math.min(1.1,st.pitch-dy*.005))});
 el.addEventListener('pointerup',e=>{if(dn&&dn.m<8&&performance.now()-dn.t<400){
  ray.setFromCamera(new THREE.Vector2(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1),cam);
  const hit=ray.intersectObjects([...frames,...doors])[0];if(hit){const d=hit.object.userData;d.d!==undefined?onDoor(d.d):onPick(d.i)}}dn=null});
 if(coarse){const j=nipplejs.create({zone:joyEl,mode:'static',position:{left:'50%',top:'50%'},color:'#ff8fb3',size:110});
  j.on('move',(_,d)=>{const f=Math.min(d.force,2)/2;st.x=Math.cos(d.angle.radian)*f;st.y=Math.sin(d.angle.radian)*f});j.on('end',()=>{st.x=st.y=0})}
 else joyEl.hidden=true;

 const clk=new THREE.Clock(),cl=v=>Math.max(-1,Math.min(1,v)),lim=v=>Math.max(-6.3,Math.min(6.3,v));
 R.setAnimationLoop(()=>{const dt=Math.min(clk.getDelta(),.05),k=st.k;
  const fx=cl((k.d?1:0)-(k.a?1:0)+st.x),fy=cl((k.w?1:0)-(k.s?1:0)+st.y),sp=3.2*dt,sn=Math.sin(st.yaw),cs=Math.cos(st.yaw);
  cam.position.x=lim(cam.position.x+(fx*cs-fy*sn)*sp);cam.position.z=lim(cam.position.z+(-fx*sn-fy*cs)*sp);
  cam.rotation.set(st.pitch,st.yaw,0,'YXZ');
  if(crystal){crystal.rotation.y+=dt;crystal.position.y=1.3+Math.sin(clk.elapsedTime*2)*.08}
  if(hearts){const p=hearts.geometry.attributes.position;for(let i=0;i<p.count;i++){let y=p.getY(i)+dt*.25;if(y>4)y=0;p.setY(i,y)}p.needsUpdate=true}
  comp.render()});
 addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();R.setSize(innerWidth,innerHeight);comp.setSize(innerWidth,innerHeight)});
 return{build,reset(){cam.position.set(0,1.65,5.5);st.yaw=0;st.pitch=0}};
}
