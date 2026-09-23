const C=document.getElementById('gameCanvas'),X=C.getContext('2d');
let W,H;
function R(){W=C.width=innerWidth;H=C.height=innerHeight}
addEventListener('resize',R);R();

let coins=+localStorage.ds_coins||0;
let unlocked=JSON.parse(localStorage.ds_unlocked||'["warrior"]');
let upgrades=JSON.parse(localStorage.ds_upgrades||'{"warrior":{"hp":0,"str":0,"ls":0},"mage":{"hp":0,"str":0,"ls":0},"necromancer":{"hp":0,"str":0,"ls":0}}');
let selectedChar=null,isPaused=false,state='select',P=null,E=[],Pa=[],Pr=[],Po=[],A=[],Su=[],FR=null;
let score=0,kills=0,st=0,lt=0,spawnTimer=0,diff=1,wave=1;
let jA=false,jx=0,jy=0,jcx=0,jcy=0,shake=0,waveFlash=0;
const keys={};

function save(){localStorage.ds_coins=coins;localStorage.ds_unlocked=JSON.stringify(unlocked);localStorage.ds_upgrades=JSON.stringify(upgrades)}
function el(id){return document.getElementById(id)}
function upCoins(){el('coins').textContent='🪙 '+coins;el('selectCoins').textContent='🪙 Coins: '+coins}
function upLock(){
  const m=el('mBtn'),n=el('nBtn');
  const ml=el('mLock'),nl=el('nLock');
  const mu=unlocked.includes('mage'),nu=unlocked.includes('necromancer');
  m.classList.toggle('locked',!mu);n.classList.toggle('locked',!nu);
  ml.style.display=mu?'none':'block';nl.style.display=nu?'none':'block';
}
function getTotalLevel(t){const u=upgrades[t]||{hp:0,str:0,ls:0};return u.hp+u.str+u.ls}
function upgradeCost(l){return 40+l*25}
function doUpgrade(type,stat){
  const u=upgrades[type],total=getTotalLevel(type);
  if(total>=30)return;
  const cost=upgradeCost(total);
  if(coins<cost)return;
  coins-=cost;u[stat]++;save();upCoins();updateUpgradeInfo();
}
function updateUpgradeInfo(){
  if(!selectedChar){el('upgradeInfo').textContent='Select a character first';return}
  const u=upgrades[selectedChar]||{hp:0,str:0,ls:0},total=u.hp+u.str+u.ls;
  el('upgradeInfo').innerHTML=`<b>${selectedChar.toUpperCase()}</b> · HP ${u.hp} · STR ${u.str} · LS ${u.ls} · LEVEL ${total}/30 · NEXT ${total>=30?'MAX':upgradeCost(total)+' 🪙'}`;
}
function selectChar(t){
  if(t!=='warrior'&&!unlocked.includes(t))return;
  selectedChar=t;
  ['wBtn','mBtn','nBtn'].forEach(id=>el(id).classList.remove('selected'));
  el(t==='warrior'?'wBtn':t==='mage'?'mBtn':'nBtn').classList.add('selected');
  updateUpgradeInfo();
}
function tryU(t,cost){
  if(unlocked.includes(t))return true;
  if(coins<cost)return false;
  coins-=cost;unlocked.push(t);save();upCoins();upLock();return true;
}

const CH={
 warrior:{c:'#e74c3c',baseHp:150,baseDmg:25,sp:2.8,rng:55,acd:.45,s1:'SLASH',s1cd:4,s2:'SHIELD',s2cd:15,
  s1f(){
   for(const e of E){let dx=e.x-P.x,dy=e.y-P.y;if(dx*dx+dy*dy<14400){e.hp-=65+P.str*2;e.hit=.15;damageText(e.x,e.y,65+P.str*2,'#ff6670');part(e.x,e.y,'#ff6670',8)}}
   A.push({x:P.x,y:P.y,r:10,m:120,l:.35,t:'s'});part(P.x,P.y,'#ff6670',22);shake=7;
  },
  s2f(){P.sh={hp:80+P.str*3,m:80+P.str*3,d:8};part(P.x,P.y,'#f6c453',22);shake=3}
 },
 mage:{c:'#3498db',baseHp:90,baseDmg:18,sp:3.4,rng:140,acd:.55,s1:'FIREBALL',s1cd:3.5,s2:'FIRE RING',s2cd:12,
  s1f(){
   let a=Math.random()*6.28;if(E.length){let n=E[0],md=1e9;for(const e of E){let d=(e.x-P.x)**2+(e.y-P.y)**2;if(d<md){md=d;n=e}}a=Math.atan2(n.y-P.y,n.x-P.x)}
   for(let i=-1;i<=1;i++){let an=a+i*.22;Pr.push({x:P.x,y:P.y,vx:Math.cos(an)*9,vy:Math.sin(an)*9,l:1.1,d:42+P.str*2,c:'#ff8a3d',s:9,trail:[]})}
   part(P.x,P.y,'#ff8a3d',18)
  },
  s2f(){FR={r:90,dmg:7+P.str,t:10};part(P.x,P.y,'#ff6600',25);shake=4}
 },
 necromancer:{c:'#9b59b6',baseHp:110,baseDmg:20,sp:2.9,rng:65,acd:.5,s1:'SUMMON',s1cd:1.2,s2:'EXPLODE',s2cd:5,
  s1f(){
   if(P.souls<5){part(P.x,P.y,'#9b59b6',4);return}
   P.souls-=5;upSouls();
   for(let i=0;i<2;i++){let a=Math.random()*6.28,d=30+Math.random()*20;Su.push({x:P.x+Math.cos(a)*d,y:P.y+Math.sin(a)*d,hp:45+diff*5+P.str*2,mh:45+diff*5+P.str*2,dmg:9+diff*1.5+P.str,sp:1.5,r:12,c:'#6c3483',lt:15})}
   part(P.x,P.y,'#b86cff',22)
  },
  s2f(){
   for(let i=Su.length-1;i>=0;i--){let s=Su[i];for(const e of E){let dx=e.x-s.x,dy=e.y-s.y;if(dx*dx+dy*dy<10000){const d=45+diff*4+P.str*2;e.hp-=d;damageText(e.x,e.y,d,'#d19aff');part(e.x,e.y,'#b86cff',6)}}part(s.x,s.y,'#b86cff',22);Su.splice(i,1)}
   shake=8
  }
 }
};

function makeP(t){
 const c=CH[t],u=upgrades[t]||{hp:0,str:0,ls:0},hp=c.baseHp+u.hp*8;
 return {type:t,x:W/2,y:H/2,hp,mh:hp,sp:c.sp,dmg:c.baseDmg+u.str*2,rng:c.rng,acd:0,s1cd:0,s2cd:0,s1m:c.s1cd,s2m:c.s2cd,sh:null,souls:0,r:16,c:c.c,str:u.str,ls:u.ls*.015};
}
function upSouls(){const e=el('souls');if(P&&P.type==='necromancer'){e.style.display='block';e.textContent='👻 '+P.souls}else e.style.display='none'}
function part(x,y,c,n=8){
 for(let i=0;i<n;i++)Pa.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,l:.3+Math.random()*.45,c,s:2+Math.random()*3,gravity:.03});
}
function damageText(x,y,n,c='#fff'){Pa.push({x,y:y-18,vx:0,vy:-.5,l:.65,c,s:0,text:Math.round(n)})}
function spawn(){
 let side=Math.random()*4|0,x,y;
 if(side<1){x=-20;y=Math.random()*H}else if(side<2){x=W+20;y=Math.random()*H}else if(side<3){x=Math.random()*W;y=-20}else{x=Math.random()*W;y=H+20}
 let hp=24+diff*14;
 E.push({x,y,hp,mh:hp,dmg:5.5+diff*2,sp:1+diff*.09+Math.random()*.2,r:11+Math.random()*2.5,c:`hsl(${Math.random()*30},70%,45%)`,hit:0});
}
function startGame(t){
 if(t==='mage'&&!tryU('mage',150))return;
 if(t==='necromancer'&&!tryU('necromancer',210))return;
 P=makeP(t);E=[];Pa=[];Pr=[];Po=[];A=[];Su=[];FR=null;
 score=0;kills=0;diff=1;wave=1;st=performance.now();lt=st;spawnTimer=.2;isPaused=false;state='playing';
 el('select').style.display='none';el('pauseMenu').style.display='none';
 el('s1').querySelector('.skill-name').textContent=CH[t].s1;el('s2').querySelector('.skill-name').textContent=CH[t].s2;
 upSouls();upCoins();showWave();
}
function restartGame(){el('over').style.display='none';el('pauseMenu').style.display='none';el('select').style.display='flex';state='select';isPaused=false;upLock();upCoins();updateUpgradeInfo()}
function sk1(){if(state!=='playing'||isPaused||!P||P.s1cd>0)return;CH[P.type].s1f();P.s1cd=P.s1m}
function sk2(){if(state!=='playing'||isPaused||!P||P.s2cd>0)return;CH[P.type].s2f();P.s2cd=P.s2m}
function togglePause(){if(state!=='playing')return;isPaused=!isPaused;el('pauseMenu').style.display=isPaused?'flex':'none'}

const base=el('base'),knob=el('knob');let joystickRect=null;
function updateJoystickRect(){joystickRect=base.getBoundingClientRect();jcx=joystickRect.left+joystickRect.width/2;jcy=joystickRect.top+joystickRect.height/2}
el('joy').addEventListener('touchstart',e=>{if(isPaused||state!=='playing')return;e.preventDefault();jA=true;updateJoystickRect();mj(e.touches[0])},{passive:false});
el('joy').addEventListener('touchmove',e=>{if(isPaused||!jA)return;e.preventDefault();mj(e.touches[0])},{passive:false});
el('joy').addEventListener('touchend',e=>{e.preventDefault();jA=false;jx=jy=0;knob.style.left='31.5px';knob.style.top='31.5px'},{passive:false});
function mj(t){const dx=t.clientX-jcx,dy=t.clientY-jcy,d=Math.hypot(dx,dy),max=32;if(d>max){jx=dx/d;jy=dy/d;knob.style.left=(31.5+dx/d*max)+'px';knob.style.top=(31.5+dy/d*max)+'px'}else{jx=dx/max;jy=dy/max;knob.style.left=(31.5+dx)+'px';knob.style.top=(31.5+dy)+'px'}}

addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==='q')sk1();if(e.key.toLowerCase()==='e')sk2();if(e.key==='Escape')togglePause()});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
el('wBtn').onclick=()=>selectChar('warrior');el('mBtn').onclick=()=>selectChar('mage');el('nBtn').onclick=()=>selectChar('necromancer');
el('startBtn').onclick=()=>{if(selectedChar)startGame(selectedChar)};
el('playAgainBtn').onclick=restartGame;el('s1').onclick=sk1;el('s2').onclick=sk2;el('pauseBtn').onclick=togglePause;el('resumeBtn').onclick=togglePause;el('restartBtn').onclick=restartGame;
document.querySelectorAll('.upg-btn').forEach(b=>b.onclick=()=>{if(selectedChar){doUpgrade(selectedChar,b.dataset.stat);updateUpgradeInfo()}});

upCoins();upLock();updateUpgradeInfo();

function showWave(){
 el('waveBanner').textContent='WAVE '+wave;el('waveBanner').classList.remove('show');
 void el('waveBanner').offsetWidth;el('waveBanner').classList.add('show');
 setTimeout(()=>el('waveBanner').classList.remove('show'),1200);
 el('levelToast').textContent=wave>1?'DIFFICULTY INCREASED':'SURVIVE';
 el('levelToast').classList.add('show');setTimeout(()=>el('levelToast').classList.remove('show'),900);
}
function loop(ts){
 const dt=Math.min(.05,(ts-lt)/1000);lt=ts;
 if(state==='playing'&&!isPaused)upd(dt);
 drw();requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function upd(dt){
 const elap=(performance.now()-st)/1000,m=elap/60|0,s=elap%60|0;
 el('time').textContent=m+':'+(s<10?'0':'')+s;
 const nd=1+(elap/60|0);
 if(nd>diff){diff=nd;wave=diff;el('wave').textContent='WAVE '+wave;showWave();shake=6}
 let mx=jx,my=jy;
 if(keys.w||keys.arrowup)my-=1;if(keys.s||keys.arrowdown)my+=1;if(keys.a||keys.arrowleft)mx-=1;if(keys.d||keys.arrowright)mx+=1;
 const ml=Math.hypot(mx,my);if(ml>1){mx/=ml;my/=ml}
 P.x+=mx*P.sp*60*dt;P.y+=my*P.sp*60*dt;P.x=Math.max(P.r,Math.min(W-P.r,P.x));P.y=Math.max(P.r,Math.min(H-P.r,P.y));
 if(P.acd>0)P.acd-=dt;if(P.s1cd>0)P.s1cd-=dt;if(P.s2cd>0)P.s2cd-=dt;
 if(P.sh){P.sh.d-=dt;if(P.sh.d<=0||P.sh.hp<=0)P.sh=null}
 if(FR){FR.t-=dt;for(const e of E){const d=Math.hypot(e.x-P.x,e.y-P.y);if(d<FR.r+e.r){e.hp-=FR.dmg*dt*3.5;e.hit=.03}}if(FR.t<=0)FR=null}
 const c1=el('cd1'),c2=el('cd2');c1.style.height=P.s1cd<=0?'0%':P.s1cd/P.s1m*100+'%';c2.style.height=P.s2cd<=0?'0%':P.s2cd/P.s2m*100+'%';
 if(P.acd<=0&&E.length){
  let n=null,md=P.rng*P.rng;for(const e of E){const d=(e.x-P.x)**2+(e.y-P.y)**2;if(d<md){md=d;n=e}}
  if(n){n.hp-=P.dmg;n.hit=.1;P.acd=CH[P.type].acd;damageText(n.x,n.y,P.dmg,'#fff');part(n.x,n.y,P.c,4);if(P.ls>0)P.hp=Math.min(P.mh,P.hp+P.dmg*P.ls);
   if(P.type==='warrior'||P.type==='necromancer'){const a=Math.atan2(n.y-P.y,n.x-P.x);A.push({x:P.x,y:P.y,a,l:.18,t:'m'})}
   else{const a=Math.atan2(n.y-P.y,n.x-P.x);Pr.push({x:P.x,y:P.y,vx:Math.cos(a)*11,vy:Math.sin(a)*11,l:.25,d:0,c:'#5dade2',s:5,trail:[]})}
  }
 }
 spawnTimer-=dt;if(spawnTimer<=0){spawn();if(diff>2&&Math.random()<.25)spawn();spawnTimer=Math.max(.45,1.55-diff*.11)}
 for(let i=E.length-1;i>=0;i--){
  const e=E[i],dx=P.x-e.x,dy=P.y-e.y,d=Math.hypot(dx,dy);
  if(d>1){e.x+=dx/d*e.sp*60*dt;e.y+=dy/d*e.sp*60*dt}
  if(d<P.r+e.r){let dm=e.dmg*dt*2;if(P.sh){P.sh.hp-=dm;dm*=.5}P.hp-=dm;damageFlash();shake=Math.max(shake,2)}
  if(e.hit>0)e.hit-=dt;
  if(e.hp<=0){score+=10+diff*3;coins+=5;kills++;save();upCoins();part(e.x,e.y,e.c,12);damageText(e.x,e.y,'+10','#f6c453');
   if(P.type==='necromancer'){P.souls++;upSouls()}
   if(Math.random()<.17)Po.push({x:e.x,y:e.y,r:8,l:9,p:0});
   E.splice(i,1)
  }
 }
 for(let i=Su.length-1;i>=0;i--){
  const s=Su[i];s.lt-=dt;let n=null,md=1e9;
  for(const e of E){const d=(e.x-s.x)**2+(e.y-s.y)**2;if(d<md){md=d;n=e}}
  if(n){const dx=n.x-s.x,dy=n.y-s.y,d=Math.hypot(dx,dy);if(d>1){s.x+=dx/d*s.sp*60*dt;s.y+=dy/d*s.sp*60*dt}if(d<s.r+n.r){n.hp-=s.dmg*dt*2.3;s.hp-=n.dmg*dt*1.6}}
  if(s.hp<=0||s.lt<=0){part(s.x,s.y,'#9b59b6',7);Su.splice(i,1)}
 }
 for(let i=Po.length-1;i>=0;i--){const p=Po[i];p.l-=dt;p.p+=dt*5;const dx=P.x-p.x,dy=P.y-p.y;if(dx*dx+dy*dy<(P.r+p.r)**2){P.hp=Math.min(P.mh,P.hp+28);damageText(P.x,P.y,'+28','#54e88d');part(p.x,p.y,'#2ecc71',10);Po.splice(i,1)}else if(p.l<=0)Po.splice(i,1)}
 for(let i=Pr.length-1;i>=0;i--){const p=Pr[i];if(p.trail){p.trail.push({x:p.x,y:p.y,l:.22});if(p.trail.length>8)p.trail.shift();for(const t of p.trail)t.l-=dt}p.x+=p.vx*60*dt;p.y+=p.vy*60*dt;p.l-=dt;
  if(p.d>0)for(const e of E){const dx=e.x-p.x,dy=e.y-p.y;if(dx*dx+dy*dy<(e.r+p.s)**2){e.hp-=p.d;e.hit=.08;damageText(p.x,p.y,p.d,'#ffb05c');part(p.x,p.y,p.c,5);p.l=0;break}}
  if(p.l<=0)Pr.splice(i,1)
 }
 for(let i=A.length-1;i>=0;i--){const a=A[i];a.l-=dt;if(a.t==='s')a.r+=(a.m-a.r)*.18;if(a.l<=0)A.splice(i,1)}
 for(let i=Pa.length-1;i>=0;i--){const p=Pa[i];p.x+=p.vx;p.y+=p.vy;p.vy+=p.gravity;p.l-=dt;p.vx*=.92;p.vy*=.92;if(p.l<=0)Pa.splice(i,1)}
 el('hpFill').style.width=Math.max(0,P.hp/P.mh*100)+'%';el('hpText').textContent=Math.max(0,Math.ceil(P.hp))+' / '+P.mh;
 el('score').textContent='SCORE '+score;el('kills').textContent='☠ '+kills;
 if(P.hp<=0)die();
}
function damageFlash(){el('damageFlash').style.opacity='.8';setTimeout(()=>el('damageFlash').style.opacity='0',90)}
function die(){
 state='dead';el('fScore').textContent=score;el('fTime').textContent=el('time').textContent;el('fWave').textContent=wave;el('fKills').textContent=kills;el('over').style.display='flex';
}
function drw(){
 X.save();
 X.fillStyle='#080b15';X.fillRect(0,0,W,H);
 drawBackground();
 if(state!=='playing'&&state!=='dead'){X.restore();return}
 if(shake>0){X.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.88;if(shake<.15)shake=0}
 if(FR){X.beginPath();X.arc(P.x,P.y,FR.r,0,6.28);X.strokeStyle='rgba(255,100,0,.55)';X.lineWidth=4;X.stroke();X.beginPath();X.arc(P.x,P.y,FR.r-9,0,6.28);X.strokeStyle='rgba(255,180,50,.22)';X.lineWidth=9;X.stroke()}
 for(const p of Po){X.save();X.shadowBlur=18;X.shadowColor='#2ecc71';X.fillStyle='#2ecc71';X.beginPath();X.arc(p.x,p.y,p.r+Math.sin(p.p)*2,0,6.28);X.fill();X.restore()}
 for(const a of A){const al=Math.max(0,a.l/(a.t==='s'?.35:.18));X.strokeStyle=a.t==='s'?`rgba(255,80,90,${al*.8})`:`rgba(255,140,140,${al})`;X.lineWidth=a.t==='s'?6:5;X.beginPath();if(a.t==='s')X.arc(a.x,a.y,a.r,0,6.28);else X.arc(a.x,a.y,42,a.a-.8,a.a+.8);X.stroke()}
 for(const p of Pa){
  X.save();X.globalAlpha=Math.min(1,p.l*2);if(p.text!==undefined){X.font='bold 13px Arial';X.textAlign='center';X.fillStyle=p.c;X.shadowBlur=6;X.shadowColor=p.c;X.fillText(p.text,p.x,p.y)}else{X.fillStyle=p.c;X.beginPath();X.arc(p.x,p.y,p.s,0,6.28);X.fill()}X.restore()
 }
 for(const p of Pr){
  if(p.trail)for(const t of p.trail){if(t.l>0){X.globalAlpha=t.l/.22*.35;X.fillStyle=p.c;X.beginPath();X.arc(t.x,t.y,p.s*.65,0,6.28);X.fill()}}
  X.globalAlpha=1;X.save();X.shadowBlur=15;X.shadowColor=p.c;X.fillStyle=p.c;X.beginPath();X.arc(p.x,p.y,p.s,0,6.28);X.fill();X.restore()
 }
 for(const s of Su){
  X.save();X.shadowBlur=16;X.shadowColor='#b86cff';X.fillStyle=s.c;X.beginPath();X.arc(s.x,s.y,s.r,0,6.28);X.fill();X.restore();
  const bw=28;X.fillStyle='#222';X.fillRect(s.x-bw/2,s.y-s.r-8,bw,3);X.fillStyle='#b86cff';X.fillRect(s.x-bw/2,s.y-s.r-8,bw*Math.max(0,s.lt/15),3);
  X.fillStyle='#fff';X.beginPath();X.arc(s.x-4,s.y-3,2,0,6.28);X.arc(s.x+4,s.y-3,2,0,6.28);X.fill()
 }
 for(const e of E){
  X.save();X.shadowBlur=e.hit>0?20:7;X.shadowColor=e.hit>0?'#fff':e.c;X.fillStyle=e.hit>0?'#fff':e.c;X.beginPath();X.arc(e.x,e.y,e.r,0,6.28);X.fill();
  X.fillStyle='#1a0d0d';X.beginPath();X.arc(e.x-4,e.y-2,2,0,6.28);X.arc(e.x+4,e.y-2,2,0,6.28);X.fill();X.restore();
  if(e.hp<e.mh){const bw=30,bh=4,bx=e.x-bw/2,by=e.y-e.r-11;X.fillStyle='#222';X.fillRect(bx,by,bw,bh);X.fillStyle='#ff4d5a';X.fillRect(bx,by,bw*Math.max(0,e.hp/e.mh),bh)}
 }
 if(P){
  X.save();X.shadowBlur=20;X.shadowColor=P.c;X.fillStyle=P.c+'55';X.beginPath();X.arc(P.x,P.y,P.r+10,0,6.28);X.fill();X.shadowBlur=0;
  X.fillStyle=P.c;X.beginPath();X.arc(P.x,P.y,P.r,0,6.28);X.fill();
  X.fillStyle='#fff';X.beginPath();X.arc(P.x-5,P.y-3,3,0,6.28);X.arc(P.x+5,P.y-3,3,0,6.28);X.fill();
  X.fillStyle='#111';X.beginPath();X.arc(P.x-5,P.y-3,1.2,0,6.28);X.arc(P.x+5,P.y-3,1.2,0,6.28);X.fill();
  if(P.sh){X.strokeStyle='rgba(246,196,83,.9)';X.lineWidth=4;X.beginPath();X.arc(P.x,P.y,P.r+12,0,6.28);X.stroke()}
  X.restore()
 }
 X.restore()
}
function drawBackground(){
 const g=X.createRadialGradient(W/2,H/2,30,W/2,H/2,Math.max(W,H)*.7);g.addColorStop(0,'#171b32');g.addColorStop(1,'#070912');X.fillStyle=g;X.fillRect(0,0,W,H);
 const grid=48,ox=(performance.now()/40)%grid,oy=(performance.now()/55)%grid;
 X.strokeStyle='rgba(255,255,255,.035)';X.lineWidth=1;
 for(let x=-grid+ox;x<W+grid;x+=grid){X.beginPath();X.moveTo(x,0);X.lineTo(x,H);X.stroke()}
 for(let y=-grid+oy;y<H+grid;y+=grid){X.beginPath();X.moveTo(0,y);X.lineTo(W,y);X.stroke()}
 X.fillStyle='rgba(120,90,190,.06)';for(let i=0;i<18;i++){const x=(i*137)%W,y=(i*83)%H;X.beginPath();X.arc(x,y,2+Math.sin(i)*1.5,0,6.28);X.fill()}
}
