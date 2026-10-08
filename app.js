const PLAN_ID="plan-2";
const PLAN=[
 {id:"e1",name:"Assistierte Klimmzüge",weight:"32 kg Unterstützung",target:"8–10",setsSun:3,setsWed:3},
 {id:"e2",name:"Latzug schulterbreit",weight:"55 kg",target:"8–12",setsSun:3,setsWed:2},
 {id:"e3",name:"T-Bar-Rudern",weight:"25 kg",target:"8–12",setsSun:3,setsWed:2},
 {id:"e4",name:"Bankdrücken",weight:"20 kg",target:"8–12",setsSun:3,setsWed:3},
 {id:"e5",name:"Beinpresse",weight:"91 kg",target:"10–15",setsSun:3,setsWed:2},
 {id:"e6",name:"Schulterpresse",weight:"34 kg",target:"8–12",setsSun:3,setsWed:2},
 {id:"e7",name:"Beinheben",weight:"Körpergewicht",target:"8–12",setsSun:3,setsWed:2},
 {id:"e8",name:"Bird Dog",weight:"Körpergewicht",target:"8–10 je Seite",setsSun:2,setsWed:2}
];
const SEED=[
 {date:"07.10.2026",planId:"plan-2",items:[["Assistierte Klimmzüge","32 kg Unterstützung",["8","8","8"]],["Latzug schulterbreit","60 kg",["8","8"]],["T-Bar-Rudern","25 kg",["12","12"]],["Bankdrücken","20 kg",["12","12","9"]],["Beinpresse","91 kg",["15","15"]],["Schulterpresse","34 kg",["10","8"]],["Beinheben","Körpergewicht",["12","10"]],["Bird Dog","Körpergewicht",[]]]},
 {date:"04.10.2026",planId:"plan-2",items:[["Assistierte Klimmzüge","32 kg Unterstützung",["8","9","9"]],["Latzug schulterbreit","55 kg",["10","11","12"]],["T-Bar-Rudern","25 kg",["12","11","9"]],["Bankdrücken","20 kg",["12","11","9"]],["Beinpresse","91 kg",["15","15","15"]],["Schulterpresse","32 kg",["12","12"]],["Beinheben","Körpergewicht",["11","11","8"]],["Bird Dog","Körpergewicht",[]]]},
 {date:"30.09.2026",planId:"plan-2",items:[["Assistierte Klimmzüge","32 kg Unterstützung",["8","9","8"]],["Latzug schulterbreit","55 kg",["10","10","9"]],["T-Bar-Rudern","25 kg",["11","10","9"]],["Bankdrücken","20 kg",["12","11","9"]],["Beinpresse","87 kg",["15","12"]],["Schulterpresse","34 kg",[]],["Beinheben","Körpergewicht",[]],["Bird Dog","Körpergewicht",[]]]}
];
const DEFAULT_GOALS=[{id:"goal-1",name:"1 sauberer Klimmzug",status:"active",created:"2026-07-01",current:"32 kg Unterstützung",next:"25 kg Unterstützung",roadmap:["32 kg Unterstützung","25 kg Unterstützung","20 kg Unterstützung","15 kg Unterstützung","10 kg Unterstützung","1 sauberer Klimmzug"]}];
const DEFAULT_PLANS=[
 {id:"plan-1",name:"Plan 1 · Klimmzug-Fokus",from:"01.07.2026",to:"05.09.2026",active:false,exercises:[]},
 {id:"plan-2",name:"Plan 2 · Ganzkörper",from:"06.09.2026",to:null,active:true,exercises:PLAN}
];
const get=(k,d)=>{try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch{return d}};
const put=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
function migrate(){
 let workouts=get("fitness.workouts",null);
 if(!workouts) put("fitness.workouts",SEED);
 let goals=get("fitness.goals",null);
 if(!goals){const old=get("fitness.goal",null);put("fitness.goals",old?[old]:DEFAULT_GOALS)}
 if(!localStorage.getItem("fitness.activeGoal"))put("fitness.activeGoal","goal-1");
 if(!localStorage.getItem("fitness.plans"))put("fitness.plans",DEFAULT_PLANS);
}
migrate();
let workouts=get("fitness.workouts",SEED),goals=get("fitness.goals",DEFAULT_GOALS),plans=get("fitness.plans",DEFAULT_PLANS);
let draft=get("fitness.draft",null);
function dateVal(s){return new Date(s.split(".").reverse().join("-"))}
function today(){return new Date().toLocaleDateString("de-DE")}
function route(){return location.hash.slice(1)||"home"} function nav(r){location.hash=r}
function activeGoal(){return goals.find(g=>g.status==="active")||goals[0]}
function activePlan(){return plans.find(p=>p.active)||plans.at(-1)}
function setsFor(ex){return location.day==="wed"?ex.setsWed:ex.setsSun}
function render(){document.getElementById("app").innerHTML=view(route());document.querySelectorAll(".bottom-nav button").forEach(b=>{b.classList.toggle("active",b.dataset.route===route());b.onclick=()=>nav(b.dataset.route)});bindAutoSave()}
function view(r){if(r==="home")return home();if(r==="train")return train();if(r==="history")return historyView();if(r==="progress")return progress();return more()}
function home(){
 const g=activeGoal(),steps=g.roadmap.map((x,i)=>`<div class="step ${i===0?"active":""}"><div class="dot">${i===g.roadmap.length-1?"🏆":i+1}</div><div><b>${x}</b><small>${i===0?"Aktuell":i===1?"Nächster Meilenstein":i===g.roadmap.length-1?"Ziel":"Meilenstein"}</small></div></div>`).join("");
 return `<header><h1>🏋️ Fitness</h1><div class="sub">Dein aktueller Stand</div></header>
 <div class="card hero"><div class="eyebrow">AKTIVES ZIEL</div><div class="goal">${g.name}</div><div class="current"><div><span>Aktueller Stand</span><br><strong>${g.current}</strong></div><div style="text-align:right"><span>Nächster Meilenstein</span><br><b>${g.next}</b></div></div><div class="roadmap">${steps}</div></div>
 <div class="section-title">Aktueller Trainingsplan</div>${PLAN.map((x,i)=>`<div class="card"><div class="plan-row"><div class="num">${i+1}</div><div><div class="exercise">${x.name}</div><div class="weight">${x.weight}</div><div class="schedule">So ${x.setsSun} Sätze · Mi ${x.setsWed} Sätze</div></div><div class="target">${x.target}</div></div></div>`).join("")}
 <div class="actions"><button class="primary" onclick="startTraining()">▶ Neues Training starten</button></div>`;
}
function freshDraft(){
 return {id:Date.now().toString(),planId:PLAN_ID,date:today(),current:0,items:PLAN.map(x=>({exerciseId:x.id,weight:x.weight,reps:Array(x.setsSun).fill("")}))};
}
function startTraining(){draft=get("fitness.draft",null)||freshDraft();put("fitness.draft",draft);nav("train")}
function ensureDraft(){if(!draft)draft=get("fitness.draft",null)||freshDraft();return draft}
function train(){
 const d=ensureDraft(),i=Math.min(d.current,PLAN.length-1),x=PLAN[i],it=d.items[i],done=d.items.filter(a=>a.reps.some(Boolean)).length;
 return `<button class="back" onclick="nav('home')">← Zurück</button><header><h2>Training</h2><div class="sub">${done} von ${PLAN.length} Übungen begonnen · ${d.date}</div></header>
 <div class="card"><span class="badge">Übung ${i+1} / ${PLAN.length}</span><span class="note" style="float:right">💾 automatisch gespeichert</span></div>
 <div class="card"><div class="exercise">${x.name}</div><div class="meta">Ziel: ${x.target} · ${x.setsSun} Sätze</div>
 <label style="display:block;margin-top:14px">Gewicht / Unterstützung<input id="activeWeight" class="input autosave" inputmode="decimal" value="${escapeHtml(it.weight)}"></label>
 <div class="sets">${Array.from({length:x.setsSun},(_,s)=>`<label>Satz ${s+1}<input class="input activeRep autosave" data-s="${s}" type="number" inputmode="numeric" min="0" value="${it.reps[s]||""}"></label>`).join("")}</div></div>
 <div class="actions"><button class="primary" onclick="saveExercise(${i})">${i===PLAN.length-1?"Training abschließen":"Übung speichern →"}</button>${i>0?'<button class="secondary" onclick="previousExercise()">← Vorherige Übung</button>':""}</div>`;
}
function escapeHtml(v){return String(v??"").replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;")}
function bindAutoSave(){
 document.querySelectorAll(".autosave").forEach(el=>el.addEventListener("input",()=>saveCurrentInputs()));
}
function saveCurrentInputs(){
 if(route()!=="train")return;
 const d=ensureDraft(),i=d.current;
 const w=document.getElementById("activeWeight");if(w)d.items[i].weight=w.value.trim();
 d.items[i].reps=[...document.querySelectorAll(".activeRep")].map(e=>e.value.trim());
 put("fitness.draft",d);draft=d;
}
function saveExercise(i){
 saveCurrentInputs();const d=ensureDraft();d.current=Math.min(i+1,PLAN.length-1);put("fitness.draft",d);draft=d;
 if(i===PLAN.length-1)finishWorkout();else render();
}
function previousExercise(){saveCurrentInputs();const d=ensureDraft();d.current=Math.max(0,d.current-1);put("fitness.draft",d);draft=d;render()}
function finishWorkout(){
 saveCurrentInputs();const d=ensureDraft();if(!d.items.some(x=>x.reps.some(Boolean))){alert("Bitte mindestens einen Satz eintragen.");return}
 workouts.unshift({id:Date.now().toString(),date:d.date,planId:d.planId,items:d.items.map((it,i)=>[PLAN[i].name,it.weight,it.reps])});
 put("fitness.workouts",workouts);localStorage.removeItem("fitness.draft");draft=null;nav("history");
}
function historyView(){
 const list=[...get("fitness.workouts",SEED)].sort((a,b)=>dateVal(b.date)-dateVal(a.date));
 return `<button class="back" onclick="nav('home')">← Zurück</button><header><h2>Trainingshistorie</h2><div class="sub">Neueste Einheit zuerst · historische Planversion bleibt erhalten.</div></header>${list.map(w=>`<div class="card"><div class="exercise-head"><b>${w.date}</b><span class="badge">${w.planId}</span></div><table><tr><th>Übung</th><th>Gewicht</th><th>Wdh.</th></tr>${w.items.map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td><td>${x[2].filter(Boolean).join(" / ")||"–"}</td></tr>`).join("")}</table></div>`).join("")}`;
}
function progress(){
 const list=[...get("fitness.workouts",SEED)].sort((a,b)=>dateVal(a.date)-dateVal(b.date)),latest=list.at(-1);
 if(!latest)return '<header><h2>Fortschritt</h2></header><div class="empty">Noch keine Trainingsdaten.</div>';
 const total=list.reduce((s,w)=>s+w.items.reduce((a,x)=>a+x[2].filter(Boolean).length,0),0);
 const cards=PLAN.map((p,i)=>{
  const vals=list.map(w=>Math.max(0,...(w.items[i]?.[2]||[]).map(Number))).filter(v=>v>0),best=Math.max(0,...vals),target=parseInt(p.target.split("–")[1])||12,pct=Math.min(100,best/target*100);
  return `<div class="progress-card"><div class="pc-head"><div><div class="exercise">${p.name}</div><div class="meta">Ziel ${p.target}</div></div><div class="pc-best">${best||"–"}<small> Wdh.</small></div></div><div class="progressbar"><div style="width:${pct}%"></div></div><div class="pc-stats"><div><span>Aktuelles Gewicht</span><b>${latest.items[i]?.[1]||p.weight}</b></div><div><span>Bestes Satz-Ergebnis</span><b>${best||"–"} Wdh.</b></div></div></div>`;
 }).join("");
 const k=list.map(w=>Math.max(0,...(w.items[0]?.[2]||[]).map(Number))).filter(Boolean),mx=Math.max(...k,10);
 const bars=list.slice(-8).map(w=>{const v=Math.max(0,...(w.items[0]?.[2]||[]).map(Number));return `<div class="bar" style="height:${Math.max(6,v/mx*100)}%"><span>${v||"–"}</span></div>`}).join("");
 const labels=list.slice(-8).map(w=>`<span>${w.date.slice(0,5)}</span>`).join("");
 return `<header><h2>Fortschritt</h2><div class="sub">Entwicklung über alle Trainings</div></header><div class="statgrid"><div class="stat"><b>${list.length}</b><span>Trainings</span></div><div class="stat"><b>${total}</b><span>Sätze erfasst</span></div><div class="stat"><b>${latest.date}</b><span>Letztes Training</span></div></div><div class="card"><div class="eyebrow">KLIMMZUG-FORTSCHRITT</div><div class="exercise" style="margin-top:5px">Wiederholungen bei 32 kg Unterstützung</div><div class="chart">${bars}</div><div class="chart-labels">${labels}</div></div><div class="section-title">Entwicklung je Übung</div>${cards}`;
}
function more(){
 const g=activeGoal();
 return `<header><h2>Mehr</h2><div class="sub">Ziele, Planversionen und Daten</div></header>
 <div class="card"><div class="eyebrow">AKTIVES ZIEL</div><div class="list-item"><div><b>${g.name}</b><div class="meta">${g.current} · nächster Meilenstein ${g.next}</div></div><span class="badge active">AKTIV</span></div><div class="actions"><button class="secondary" onclick="editGoal()">Ziel bearbeiten</button></div></div>
 <div class="card"><div class="eyebrow">TRAININGSPLÄNE</div>${plans.map(p=>`<div class="list-item"><div><b>${p.name}</b><div class="meta">${p.from}${p.to?" – "+p.to:" · heute"}</div></div><span class="badge ${p.active?"active":""}">${p.active?"AKTIV":"ARCHIV"}</span></div>`).join("")}</div>
 <div class="card info"><b>Datenschutz & Daten</b><div class="note" style="margin-top:6px">Deine Trainingsdaten liegen lokal auf deinem Gerät. Es gibt keinen Login und keine externe Analyse.</div></div>`;
}
function editGoal(){
 const g=activeGoal();const current=prompt("Aktueller Stand",g.current);if(current===null)return;const next=prompt("Nächster Meilenstein",g.next);if(next===null)return;
 goals=goals.map(x=>x.id===g.id?{...x,current:current.trim(),next:next.trim()}:x);put("fitness.goals",goals);render();
}
window.addEventListener("hashchange",render);
if(!location.hash)location.hash="home";
render();
if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{});
