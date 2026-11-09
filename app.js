const TABS={build:{n:"Builds",ph:"Reliques, ornement, cône de lumière, stats à viser, équipe conseillée…"},fiche:{n:"Fiches persos",ph:"Rôle, points forts, conseils, kit à connaître…"},question:{n:"Questions",ph:"Pose ta question (build, équipe, farm…)"},draft:{n:"Draft",ph:"Règles, notes, format… (optionnel)"},video:{n:"Vidéos",ph:"Décris ta run : équipe, cycles, score, astuces…"},tier:{n:"Tier List",ph:""},roulette:{n:"Roulette",ph:""},lore:{n:"Lore",ph:"Partage du lore, une théorie, un résumé d’histoire… (pense à prévenir en cas de spoil !)"}};
let tab="build",posts=[],db=null,assets=null,user=null,me="",owner=false,admin=false,ro=false,roleLabel="";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
$("#f-char").innerHTML='<option value="">＋ Ajouter un personnage</option>'+CH.map(c=>`<option>${esc(c)}</option>`).join("")+'<option value="__autre">Autre (pas dans la liste)…</option>';
const chosen=[];
function chips(){$("#chips").innerHTML=chosen.map((c,i)=>`<span class="tag" data-i="${i}" style="cursor:pointer;margin-bottom:6px">${esc(c)} ✕</span>`).join("");$("#chips").querySelectorAll(".tag").forEach(t=>t.onclick=()=>{chosen.splice(+t.dataset.i,1);chips()})}
$("#f-char").onchange=e=>{const v=e.target.value;$("#f-char2").style.display=$("#addc").style.display=v=="__autre"?"":"none";if(v&&v!="__autre"){if(!chosen.includes(v))chosen.push(v);e.target.value="";chips()}};
$("#addc").onclick=()=>{const v=$("#f-char2").value.trim();if(v&&!chosen.includes(v)){chosen.push(v);chips()}$("#f-char2").value=""};
try{$("#pseudo").value=localStorage.getItem("pseudo")||""}catch(e){}
$("#pseudo").onchange=()=>{try{localStorage.setItem("pseudo",$("#pseudo").value)}catch(e){}};
const SEQ="A:ban,B:ban,A:ban,B:ban,A:pick,B:pick,B:pick,A:pick,A:pick,B:pick,B:pick,A:pick".split(",");
function draftHtml(p){const st=p.steps||[],used=new Set(st.map(s=>s.c)),n=st.length;
 const col=(w,a)=>st.filter((s,i)=>SEQ[i].startsWith(w)&&SEQ[i].endsWith(a)).map(s=>s.c);
 const nm={A:p.p1||"Joueur 1",B:p.p2||"Joueur 2"};
 const box=w=>`<div class="card" style="flex:1;margin:0"><b>${esc(nm[w])}</b><div class="mu">Picks</div>${col(w,"pick").map(c=>`<span class="tag">${esc(c)}</span>`).join("")||"—"}<div class="mu">Bans</div>${col(w,"ban").map(c=>`<span class="tag" style="background:#e5484d">${esc(c)}</span>`).join("")||"—"}</div>`;
 let h=`<div class="row" style="margin:8px 0">${box("A")}${box("B")}</div>`;
 if(n<SEQ.length){const[w,a]=SEQ[n].split(":");h+=`<div><b>Étape ${n+1}/${SEQ.length}</b> : ${esc(nm[w])} doit <b>${a=="ban"?"bannir":"choisir"}</b> <select class="dsel" style="max-width:240px;display:inline-block;margin:0 6px"><option value="">— perso —</option>${CH.filter(c=>!used.has(c)).map(c=>`<option>${esc(c)}</option>`).join("")}</select><button class="btn p dok">Valider</button></div>`}else h+='<p class="mu">Draft terminé ✓</p>';
 if(n)h+='<button class="dela dundo">↩ Annuler la dernière étape</button>';
 return h}
function nav(){$("#cur").textContent=TABS[tab].n;$("#vidBox").style.display=tab=="video"?"":"none";$("#draftBox").style.display="none";const dr=tab=="draft",rl=tab=="roulette",tl=tab=="tier";$("#roul").style.display=rl?"block":"none";$("#tl").style.display=tl?"block":"none";if(rl)wheelDraw();if(tl)tlView();$("#room").style.display=dr?"block":"none";$("#list").style.display=(dr||rl||tl)?"none":"";$("#formBox").style.display=(dr||rl||tl||ro)?"none":"";$("#q").parentElement.style.display=(dr||rl||tl)?"none":"";document.querySelector("header").style.display=dr?"none":"";$("#cur").style.display=dr?"none":"";document.body.style.overflow=dr?"hidden":"";if(dr)roomView();$("#nav").innerHTML='<div class="mu" style="margin-bottom:4px">'+roleLabel+'</div><button data-k="__home" style="border-color:var(--gold)">⌂ Changer de jeu</button>'+authBtns()+Object.entries(TABS).map(([k,v])=>`<button data-k="${k}" class="${k==tab?"on":""}">${v.n}</button>`).join("");
 $("#nav").querySelectorAll("button").forEach(b=>b.onclick=()=>{const kk=b.dataset.k;if(kk=="__login"){sbAuth.signIn();return}if(kk=="__logout"){sbAuth.signOut();return}if(kk=="__copyid"){sbAuth.copyId();closeM();return}if(b.dataset.k=="__home"){closeM();$("#home").style.display="block";return}tab=b.dataset.k;nav();closeM();$("#f-text").placeholder=TABS[tab].ph;$("#charBox").style.display=tab=="question"||tab=="draft"?"none":"";render()});$("#f-text").placeholder=TABS[tab].ph;}
function render(){
 const t=$("#q").value.toLowerCase();
 const l=posts.filter(p=>p.type==tab&&(!t||(p.char+" "+p.title+" "+p.text).toLowerCase().includes(t))).sort((a,b)=>(b.ts||0)-(a.ts||0));
 if(!db){$("#list").innerHTML='<p class="mu">Impossible de joindre la base : vérifie la clé publique dans config.js.</p>';return}
 $("#list").innerHTML=l.length?l.map(p=>{
  const can=owner||admin||(me&&p.uid===me);
  const ans=(p.answers||[]).map((a,i)=>`<div class="ans"><b>${esc(a.name||"Anonyme")}</b> <span class="mu">· ${new Date(a.ts).toLocaleDateString("fr-FR")}</span><div class="txt">${esc(a.text)}</div>${(owner||admin||(me&&a.uid===me))?`<button class="dela" data-i="${i}">Supprimer</button>`:""}</div>`).join("");
  return `<div class="card" data-id="${p.id}">${can?'<button class="del" title="Supprimer">🗑 Supprimer</button>':""}
  ${(p.char?p.char.split("|"):[]).map(c=>`<span class="tag">${esc(c)}</span>`).join("")}${p.mode?`<span class="tag" style="background:var(--gold)">${esc((MODES[p.mode]||{}).s||p.mode)}</span>`:""}<span class="mu">par ${esc(p.name||"Anonyme")} · ${new Date(p.ts||0).toLocaleDateString("fr-FR")}</span>
  <h3>${esc(p.title)}</h3><div class="txt">${esc(p.text)}</div>${p.img?`<img src="${esc(p.img)}" alt="">`:""}${p.vid?`<video src="${esc(p.vid)}" controls preload="metadata" style="max-width:100%;border-radius:10px;margin:8px 0"></video>`:""}${/^https:\/\//i.test(p.link||"")?`<p><a href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">▶ Voir la vidéo</a></p>`:""}
  ${p.type=="draft"?draftCard(p):""}${p.type=="question"?`${ans}<div class="row"><input class="ra" placeholder="Répondre…"><button class="btn rb" style="flex:0">Envoyer</button></div>`:""}</div>`}).join(""):'<p class="mu">Rien ici pour l’instant. Sois le premier ! ✦</p>';
 document.querySelectorAll(".card[data-id]").forEach(c=>{const id=c.dataset.id,p=posts.find(x=>x.id==id);
  const d=c.querySelector(".del");if(d)d.onclick=async()=>{if(!d.dataset.s){d.dataset.s=1;d.textContent="Confirmer ?";setTimeout(()=>{d.dataset.s="";d.textContent="🗑 Supprimer"},4000);return}try{await db.doc("posts/"+id).delete()}catch(e){d.textContent="Échec : "+(e.message||"refusé")}};
  c.querySelectorAll(".dela").forEach(x=>x.onclick=async()=>{if(!x.dataset.s){x.dataset.s=1;x.textContent="Confirmer ?";setTimeout(()=>{x.dataset.s="";x.textContent="Supprimer"},4000);return}try{await db.doc("posts/"+id).update({answers:(p.answers||[]).filter((_,j)=>j!=x.dataset.i)})}catch(e){x.textContent="Échec"}});
  if(ro)c.querySelectorAll(".ra").forEach(i=>i.parentElement.remove());
  const dop=c.querySelector(".dopen");if(dop)dop.onclick=()=>{room=id;$("#room").classList.add("open");roomView()};
  const dok=c.querySelector(".dok");if(dok)dok.onclick=async()=>{const v=c.querySelector(".dsel").value;if(!v)return;try{await db.doc("posts/"+id).update({steps:[...(p.steps||[]),{c:v,by:me,ts:Date.now()}]})}catch(e){dok.textContent="Échec"}};
  const du=c.querySelector(".dundo");if(du)du.onclick=async()=>{if(!du.dataset.s){du.dataset.s=1;du.textContent="Confirmer ?";setTimeout(()=>{du.dataset.s="";du.textContent="↩ Annuler la dernière étape"},4000);return}try{await db.doc("posts/"+id).update({steps:(p.steps||[]).slice(0,-1)})}catch(e){du.textContent="Échec"}};
  const b=c.querySelector(".rb");if(b)b.onclick=async()=>{const v=c.querySelector(".ra").value.trim();if(!v)return;
   try{await db.doc("posts/"+id).update({answers:[...(p.answers||[]),{uid:me,name:$("#pseudo").value||"Anonyme",text:v,ts:Date.now()}]})}catch(e){alert("Réponse impossible.")}}});
}
$("#q").oninput=render;
$("#send").onclick=async()=>{
 const title=$("#f-title").value.trim(),text=$("#f-text").value.trim();
 if(!db)return $("#msg").textContent="Pas d’accès en écriture.";
 const pend=$("#f-char2").value.trim(),list=(tab=="question"||tab=="draft")?[]:chosen.concat($("#f-char").value=="__autre"&&pend&&!chosen.includes(pend)?[pend]:[]),char=list.join("|");
 if(tab=="draft"&&(!$("#f-p1").value.trim()||!$("#f-p2").value.trim()||($("#f-dmode").value=="trio"&&!$("#f-p3").value.trim())))return $("#msg").textContent="Indique les deux joueurs.";
 if((tab=="build"||tab=="fiche")&&!char)return $("#msg").textContent="Choisis un personnage.";
 if(!title&&!text)return $("#msg").textContent="Ajoute au moins un titre ou un texte.";
 $("#msg").textContent="Envoi…";
 try{let img="",vid="";const f=$("#f-img").files[0];const link=$("#f-link").value.trim();if(link&&!/^https:\/\//i.test(link))throw new Error("badlink");if(f&&f.size>20e6)throw new Error("big");
  if(f){if(!assets)throw new Error("noimg");const r=await assets.upload(f);if(f.type.startsWith("video/"))vid=r.url;else img=r.url}
  await db.collection("posts").add({type:tab,char,title,text,img,vid,link:tab=="video"?link:"",mode:tab=="video"?$("#f-mode").value:tab=="draft"?$("#f-dmode").value:"",players:tab=="draft"?[$("#f-p1").value.trim(),$("#f-p2").value.trim()].concat($("#f-dmode").value=="trio"?[$("#f-p3").value.trim()]:[]):[],steps:[],name:$("#pseudo").value||"Anonyme",uid:me,ts:Date.now(),answers:[]});
  ["#f-char","#f-char2","#f-title","#f-text","#f-img","#f-link","#f-mode","#f-p1","#f-p2","#f-p3"].forEach(s=>$(s).value="");$("#f-char2").style.display="none";$("#addc").style.display="none";chosen.length=0;chips();$("#msg").textContent="Publié ✓";$("#formBox").open=false;
 }catch(e){$("#msg").textContent=e.message=="noimg"?"Upload non autorisé pour toi.":e.message=="badlink"?"Le lien doit commencer par https://":e.message=="big"?"Fichier trop lourd (20 Mo max), colle plutôt un lien.":"Échec de l’envoi."}
};
const PC=["#3b82f6","#ef4444","#22c55e","#f59e0b"];
const H=[[0,"ban"],[1,"ban"],[0,"pick"],[1,"pick"],[1,"pick"],[0,"pick"],[1,"ban"],[0,"ban"]];
const T=n=>Array.from({length:n},(_,i)=>[[1,0,0,1][i%4],"pick"]);
const SN=[0,1,2,2,1,0];
const MODES={std:{s:"Standard",pl:2,seq:H.concat(T(12))},stellar:{s:"Stellaire",pl:2,seq:H.concat(T(20))},trio:{s:"3 joueurs",pl:3,seq:[0,1,2].map(i=>[i,"ban"]).concat([0,1,2,2,1,0].map(i=>[i,"pick"]),[2,1,0].map(i=>[i,"ban"]),Array.from({length:18},(_,i)=>[[2,1,0,0,1,2][i%6],"pick"]))},quad:{s:"4 joueurs",pl:4,seq:[0,1,2,3].map(i=>[i,"ban"]).concat([0,1,2,3,3,2,1,0].map(i=>[i,"pick"]),[3,2,1,0].map(i=>[i,"ban"]),Array.from({length:24},(_,i)=>[[3,2,1,0,0,1,2,3][i%8],"pick"]))}};
let room=null;
const LIVE="draft-live";const rp=()=>posts.find(x=>x.id==LIVE)||{id:LIVE,type:"draft",mode:"std",players:[],steps:[]};
const upd=d=>{if(ro)return Promise.reject(new Error("ro"));const{id,...r}=rp();return db.doc("posts/"+LIVE).set({title:"Draft en direct",text:"",char:"",img:"",answers:[],ts:r.ts||Date.now(),uid:me,name:"",...r,...d})};
function draftCard(p){const md=MODES[p.mode]||MODES.std,pl=(p.players||[p.p1,p.p2]).slice(0,md.pl),n=(p.steps||[]).length,tot=md.seq.length;
 return `<p class="mu">${pl.map((x,i)=>`<b style="color:${PC[i]}">${esc(x)}</b>`).join(" vs ")} · ${md.s} · étape ${Math.min(n,tot)}/${tot}${n>=tot?" ✓ terminé":""}</p><button class="btn p dopen">Ouvrir la salle de draft</button>`}
function slot(s,i,x,n){return `<div class="slot ${s[1]=="ban"?"ban":""} ${i==n?"cur":""} ${x?"f":""}">${s[1]=="ban"?'<span class="bn">BAN</span>':""}${x?`${(CARD[x.c]||IMG[x.c])?`<img src="${esc(CARD[x.c]||IMG[x.c])}" alt="">`:""}<span class="lb">${esc(x.c)}</span>`:"#"+(i+1)}</div>`}
function roomView(){const p=rp();if(!p){$("#room").classList.remove("open");return}
 const md=MODES[p.mode]||MODES.std,pl=Array.from({length:md.pl},(_,i)=>(p.players||[])[i]||"Joueur "+(i+1)),st=p.steps||[],n=st.length,tot=md.seq.length;
 $("#rmode").value=MODES[p.mode]?p.mode:"std";$("#rmode").disabled=$("#rdice").disabled=$("#rnew").disabled=$("#rundo").disabled=ro;$("#rinfo").textContent=md.s+" · "+Math.min(n,tot)+"/"+tot+(n>=tot?" ✓ terminé":"")+(ro?" · 👁 lecture seule":"");
 $("#rrows").innerHTML=pl.map((name,pi)=>{const turn=n<tot&&md.seq[n][0]==pi;
  return `<div class="prow" style="--pc:${PC[pi]}"><div class="pname"><span class="dot" style="background:${PC[pi]}"></span><input class="pn" data-i="${pi}" value="${esc(name)}" ${ro?"disabled":""} style="width:150px;margin:0;padding:3px 8px">${turn?` <span style="color:#ffd66b;font-size:13px">· à lui de ${md.seq[n][1]=="ban"?"bannir":"choisir"}</span>`:""}</div><div class="slots">${md.seq.map((s,i)=>s[0]==pi?slot(s,i,st[i],n):"").join("")}</div></div>`}).join("");
 $("#rrows").querySelectorAll(".pn").forEach(i=>i.onchange=()=>{const a=pl.slice();a[+i.dataset.i]=i.value.trim()||"Joueur "+(+i.dataset.i+1);upd({players:a}).catch(()=>{})});
 const used=new Set(st.map(s=>s.c)),t=$("#rsearch").value.toLowerCase();
 $("#rgrid").innerHTML=CH.filter(c=>c.toLowerCase().includes(t)).map(c=>`<button class="ch ${used.has(c)?"used":""}" data-c="${esc(c)}">${(CARD[c]||IMG[c])?`<img src="${esc(CARD[c]||IMG[c])}" alt="">`:esc(c.slice(0,2))}<span class="lb">${esc(c)}</span></button>`).join("");
 $("#rgrid").querySelectorAll(".ch").forEach(b=>b.onclick=()=>pickC(b.dataset.c))}
async function pickC(c){const p=rp();if(!p)return;if(ro){$("#rinfo").textContent="Invité : lecture seule";return}const md=MODES[p.mode]||MODES.std,st=p.steps||[];if(st.length>=md.seq.length||st.some(s=>s.c==c))return;
 try{await upd({steps:[...st,{c,by:me,ts:Date.now()}]})}catch(e){$("#rinfo").textContent="Échec de l’enregistrement"}}
$("#rsearch").oninput=roomView;
$("#rclose").onclick=()=>{room=null;$("#room").classList.remove("open")};
$("#rundo").onclick=async()=>{const p=rp();if(!p||!(p.steps||[]).length)return;try{await upd({steps:p.steps.slice(0,-1)})}catch(e){}};
$("#rdice").onclick=async()=>{const p=rp();if(!p)return;if((p.steps||[]).length){$("#rinfo").textContent="Impossible : le draft a commencé";return}
 const md=MODES[p.mode]||MODES.std,a=Array.from({length:md.pl},(_,i)=>(p.players||[])[i]||"Joueur "+(i+1));for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
 try{await upd({players:a})}catch(e){}};
$("#rmode").onchange=()=>{const p=rp();if((p.steps||[]).length){roomView();$("#rinfo").textContent="Fais « Nouveau draft » pour changer de format";return}upd({mode:$("#rmode").value}).catch(()=>{})};
$("#rnew").onclick=()=>{const b=$("#rnew");if(!b.dataset.s){b.dataset.s=1;b.textContent="Confirmer ?";setTimeout(()=>{b.dataset.s="";b.textContent="↺ Nouveau draft"},4000);return}b.dataset.s="";b.textContent="↺ Nouveau draft";upd({steps:[]}).catch(()=>{})};
$("#f-dmode").onchange=()=>{$("#f-p3").style.display=$("#f-dmode").value=="trio"?"":"none"};
const wheel={rot:0,spinning:false,drawn:[]};
function wPool(){return CH.filter(c=>!($("#nodup").checked&&wheel.drawn.includes(c)))}
function wIdx(n){const a=2*Math.PI/n;let t=(-Math.PI/2-wheel.rot)%(2*Math.PI);if(t<0)t+=2*Math.PI;return Math.min(n-1,Math.floor(t/a))}
function wheelDraw(){const x=$("#wheel").getContext("2d"),P=wPool(),n=P.length,R=260;x.clearRect(0,0,520,520);
 if(!n){x.fillStyle="#9a93bd";x.font="22px sans-serif";x.textAlign="center";x.fillText("Plus de perso dans la roue",R,R);return}
 const a=2*Math.PI/n;
 for(let i=0;i<n;i++){x.beginPath();x.moveTo(R,R);x.arc(R,R,R-4,wheel.rot+i*a,wheel.rot+(i+1)*a);x.closePath();x.fillStyle=`hsl(${(i*37)%360},60%,${i%2?40:52}%)`;x.fill()}
 x.beginPath();x.arc(R,R,R-4,0,7);x.lineWidth=6;x.strokeStyle="#e6b655";x.stroke();
 x.beginPath();x.arc(R,R,36,0,7);x.fillStyle="#0b0818";x.fill();x.lineWidth=4;x.stroke()}
function wShow(c){const im=$("#pimg");if(CARD[c]){im.src=CARD[c];im.style.display="block"}else im.style.display="none";$("#pname").textContent=c;$("#pop").style.display="flex"}
function wHist(){const h=wheel.drawn;$("#rcount").textContent=h.length?"("+h.length+")":"";$("#rhist").innerHTML=h.length?h.map((c,i)=>`<div style="display:inline-block;width:64px;margin:4px;text-align:center;vertical-align:top"><div style="position:relative;aspect-ratio:3/4;border-radius:8px;overflow:hidden;border:1px solid var(--bd);background:linear-gradient(160deg,#3a2a70,#14102b)">${CARD[c]?`<img src="${esc(CARD[c])}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center top">`:""}</div><div class="mu" style="font-size:11px;line-height:1.1;margin-top:2px">${i+1}. ${esc(c)}</div></div>`).reverse().join(""):"Aucun tirage pour l’instant."}
$("#spin").onclick=()=>{if(wheel.spinning)return;const P=wPool(),n=P.length;if(!n)return;wheel.spinning=true;
 const k=Math.floor(Math.random()*n),a=2*Math.PI/n,target=-Math.PI/2-(k+.2+Math.random()*.6)*a;
 const start=wheel.rot%(2*Math.PI);let delta=(target-start)%(2*Math.PI);if(delta<0)delta+=2*Math.PI;delta+=2*Math.PI*(5+Math.floor(Math.random()*3));
 const dur=5500,t0=performance.now();$("#rname").textContent="";
 const step=t=>{const p=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-p,4);wheel.rot=start+delta*e;wheelDraw();$("#rname").textContent="→ "+P[wIdx(n)];
  if(p<1)requestAnimationFrame(step);else{wheel.spinning=false;wheel.rot=wheel.rot%(2*Math.PI);const w=P[k];$("#rname").textContent="";wheel.drawn.push(w);wHist();wShow(w);wheelDraw()}};
 requestAnimationFrame(step)};
$("#rreset").onclick=()=>{if(wheel.spinning)return;wheel.drawn=[];wHist();wheelDraw()};
$("#nodup").onchange=()=>{if(!wheel.spinning)wheelDraw()};
$("#pclose").onclick=()=>{$("#pop").style.display="none"};
$("#pop").onclick=e=>{if(e.target.id=="pop")$("#pop").style.display="none"};
const GAMES=[{id:"hsr",n:"Honkai: Star Rail",img:GAME_IMG.hsr,on:true}];
$("#games").innerHTML=GAMES.map(g=>`<div class="gt ${g.on?"":"off"}" data-id="${g.id}">${g.img?`<img src="${esc(g.img)}" alt="">`:""}<span class="gn">${esc(g.n)}</span>${g.on?"":'<span class="soon">Bientôt</span>'}</div>`).join("");
$("#games").querySelectorAll(".gt:not(.off)").forEach(t=>t.onclick=()=>{$("#home").style.display="none";window.scrollTo(0,0)});
const TIERS=[["S","#ff7f7f"],["A","#ffbf7f"],["B","#ffdf7f"],["C","#bfff7f"],["D","#7fbfff"]];
let tlId=null,tlSel=null;
const tlLists=()=>posts.filter(p=>p.type=="tier").sort((a,b)=>(a.ts||0)-(b.ts||0));
const tlCur=()=>{const l=tlLists();return l.find(p=>p.id==tlId)||l[0]||null};
const tlTile=c=>`<div class="tt${c==tlSel?" sel":""}" data-c="${esc(c)}" title="${esc(c)}">${CARD[c]?`<img src="${esc(CARD[c])}" alt="">`:esc(c.slice(0,2))}<span>${esc(c)}</span></div>`;
const tlDefs=c=>c.defs||TIERS.map(([k,col])=>({k,n:k,c:col}));
const tlPal=["#ff7f7f","#ffbf7f","#ffdf7f","#bfff7f","#7fbfff","#bf7fff","#ff7fdf","#7fffd4"];
let tlEdit=false;
function tlSave(cur,defs,T){cur.defs=defs;cur.tiers=T;tlView();db.doc("posts/"+cur.id).update({defs,tiers:T}).catch(()=>{$("#tl-msg").textContent="Échec de l’enregistrement"})}
function tlPlace(k){if(!tlSel)return;const cur=tlCur();if(!cur)return;if(ro){$("#tl-msg").textContent="Invité : lecture seule";return}
 const defs=tlDefs(cur),T={};defs.forEach(d=>T[d.k]=((cur.tiers||{})[d.k]||[]).filter(c=>c!=tlSel));if(k&&T[k])T[k].push(tlSel);tlSel=null;tlSave(cur,defs,T)}
function tlView(){const l=tlLists(),cur=tlCur();
 $("#tl-sel").innerHTML=l.length?l.map(p=>`<option value="${p.id}" ${cur&&p.id==cur.id?"selected":""}>${esc(p.title)}</option>`).join(""):"<option>Aucune tier list</option>";
 $("#tl-new").style.display=ro?"none":"";$("#tl-del").style.display=(ro||!cur)?"none":"";
 $("#tl-edit").style.display=(ro||!cur)?"none":"";$("#tl-addt").style.display=(tlEdit&&!ro&&cur)?"":"none";
 $("#tl-edit").textContent=tlEdit?"✔ Terminer":"✏️ Modifier les tiers";
 if(!cur){$("#tl-board").innerHTML='<p class="mu">Aucune tier list pour l’instant. Crée la première avec « ＋ Nouvelle tier list ».</p>';$("#tl-msg").textContent="";return}
 tlId=cur.id;const defs=tlDefs(cur),T=cur.tiers||{},placed=new Set(defs.flatMap(d=>T[d.k]||[])),q=$("#tl-q").value.toLowerCase();
 const free=CH.filter(c=>!placed.has(c)),pool=free.filter(c=>c.toLowerCase().includes(q)),ed=tlEdit&&!ro;
 $("#tl-msg").textContent=tlSel?tlSel+" sélectionné · touche un tier pour le placer, ou « Non classés » pour le retirer":(ed?"Mode édition : renomme un tier, change sa couleur, déplace-le (▲▼) ou supprime-le (✕).":(ro?"Invité : lecture seule":"Touche un perso, puis le tier où le placer."));
 const row=(d,i)=>ed
  ?`<div class="tr"><div class="tedit" data-i="${i}"><div class="trow"><input type="color" class="tcol" value="${esc(d.c)}"><input class="tname" value="${esc(d.n)}" maxlength="20"></div><div class="trow"><button class="tup">▲</button><button class="tdn">▼</button><button class="tdel">✕</button></div></div><div class="tc" data-k="${esc(d.k)}">${(T[d.k]||[]).map(tlTile).join("")}</div></div>`
  :`<div class="tr"><div class="tlab" data-k="${esc(d.k)}" style="background:${esc(d.c)};font-size:${d.n.length>3?13:24}px">${esc(d.n)}</div><div class="tc" data-k="${esc(d.k)}">${(T[d.k]||[]).map(tlTile).join("")}</div></div>`;
 $("#tl-board").innerHTML=defs.map(row).join("")+`<div class="mu" style="margin:10px 0 4px">Non classés (${free.length})</div><div class="tc pool" data-k="">${pool.map(tlTile).join("")}</div>`;
 $("#tl-board").querySelectorAll(".tt").forEach(t=>t.onclick=e=>{e.stopPropagation();tlSel=tlSel==t.dataset.c?null:t.dataset.c;tlView()});
 $("#tl-board").querySelectorAll(".tlab,.tc").forEach(z=>z.onclick=()=>tlPlace(z.dataset.k));
 if(ed)$("#tl-board").querySelectorAll(".tedit").forEach(e=>{const i=+e.dataset.i,cp=()=>defs.map(d=>({...d})),sv=n=>tlSave(cur,n,cur.tiers||{});
  e.querySelector(".tcol").onchange=ev=>{const n=cp();n[i].c=ev.target.value;sv(n)};
  e.querySelector(".tname").onchange=ev=>{const n=cp();n[i].n=ev.target.value.trim()||n[i].n;sv(n)};
  e.querySelector(".tup").onclick=()=>{if(i<1)return;const n=cp();[n[i-1],n[i]]=[n[i],n[i-1]];sv(n)};
  e.querySelector(".tdn").onclick=()=>{if(i>=defs.length-1)return;const n=cp();[n[i+1],n[i]]=[n[i],n[i+1]];sv(n)};
  const b=e.querySelector(".tdel");b.onclick=()=>{if(!b.dataset.s){b.dataset.s=1;b.textContent="Sûr ?";setTimeout(()=>{b.dataset.s="";b.textContent="✕"},3000);return}
   const T2={...(cur.tiers||{})};delete T2[defs[i].k];tlSave(cur,defs.filter((_,j)=>j!=i),T2)}})}
$("#tl-edit").onclick=()=>{tlEdit=!tlEdit;tlView()};
$("#tl-addt").onclick=()=>{const cur=tlCur();if(!cur||ro)return;const defs=tlDefs(cur).map(d=>({...d}));defs.push({k:"t"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),n:"Nouveau",c:tlPal[defs.length%tlPal.length]});tlSave(cur,defs,cur.tiers||{})};
$("#tl-new").onclick=()=>{$("#tl-nbox").style.display=$("#tl-nbox").style.display=="none"?"":"none"};
$("#tl-create").onclick=async()=>{const t=$("#tl-name").value.trim();if(!t||ro||!db)return;
 try{const r=await db.collection("posts").add({type:"tier",title:t,tiers:{S:[],A:[],B:[],C:[],D:[]},text:"",char:"",img:"",answers:[],name:$("#pseudo").value.trim()||"Anonyme",uid:me,ts:Date.now()});tlId=r.id;$("#tl-name").value="";$("#tl-nbox").style.display="none"}catch(e){$("#tl-msg").textContent="Échec de la création."}};
$("#tl-sel").onchange=()=>{tlId=$("#tl-sel").value;tlSel=null;tlView()};
$("#tl-del").onclick=async()=>{const c=tlCur(),b=$("#tl-del");if(!c)return;
 if(!(owner||admin||c.uid==me)){b.textContent="Non autorisé";setTimeout(()=>b.textContent="🗑 Supprimer",2500);return}
 if(!b.dataset.s){b.dataset.s=1;b.textContent="Confirmer ?";setTimeout(()=>{b.dataset.s="";b.textContent="🗑 Supprimer"},4000);return}
 b.dataset.s="";b.textContent="🗑 Supprimer";try{await db.doc("posts/"+c.id).delete();tlId=null}catch(e){$("#tl-msg").textContent="Suppression impossible."}};
$("#tl-q").oninput=tlView;
function authBtns(){if(!window.sbAuth)return"";return sbAuth.logged?'<div class="mu" style="margin:4px 0">Connecté : '+esc(sbAuth.name||"compte Discord")+'</div><button data-k="__copyid">📋 Copier mon identifiant</button><button data-k="__logout">🚪 Déconnexion</button>':'<button data-k="__login" style="border-color:#5865f2">🔐 Connexion Discord</button>'}
function renderAuth(){const h=$("#hauth");if(!h||!window.sbAuth)return;
 h.innerHTML=sbAuth.logged?`<p class="mu">Connecté : <b>${esc(sbAuth.name||"compte Discord")}</b> · ${esc(roleLabel)}</p>${ro?'<p class="mu">Tu es invité tant que l’admin ne t’a pas ajouté : ouvre le menu ☰, touche « 📋 Copier mon identifiant » et envoie-le-lui.</p>':""}<button class="btn" id="hlogout">🚪 Déconnexion</button>`:'<button class="btn p" id="hlogin" style="background:#5865f2;border-color:#5865f2">🔐 Se connecter avec Discord</button><p class="mu">Sans connexion, tu peux tout consulter (mode invité).</p>';
 const a=$("#hlogin"),b=$("#hlogout");if(a)a.onclick=()=>sbAuth.signIn();if(b)b.onclick=()=>sbAuth.signOut()}
const closeM=()=>{$("#nav").classList.remove("open");$("#ov").classList.remove("open")};$("#burger").onclick=()=>{$("#nav").classList.toggle("open");$("#ov").classList.toggle("open")};$("#ov").onclick=closeM;
nav();render();
(async()=>{
 try{user=await claude.use("user");if(user){me=await user.id();owner=await user.isOwner();admin=!!(await user.canEdit());ro=(await user.can("data.write"))===false;roleLabel=owner?"👑 Propriétaire":ro?"👁 Invité · lecture seule":"✏️ Membre"}
  assets=await claude.use("assets");db=await claude.use("db");if(!$("#pseudo").value&&window.sbAuth&&sbAuth.name)$("#pseudo").value=sbAuth.name;renderAuth();
  if(!assets)$("#f-img").style.display="none";nav();
  if(!db){render();return}
  db.collection("posts").onSnapshot(s=>{posts=s.docs.map(d=>({id:d.id,...d.data()}));render();if(tab=="draft")roomView();if(tab=="tier")tlView()},()=>{$("#list").innerHTML='<p class="mu">Impossible de charger les données.</p>'});
 }catch(e){render()}
})();
