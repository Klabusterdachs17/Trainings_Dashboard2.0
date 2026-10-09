"use strict";
const BASE_PLAN = [
 {id:"e1",name:"Assistierte Klimmzüge",weight:"32 kg Unterstützung",target:"8–10",setsSun:3,setsWed:3,kind:"assistance",increaseStep:2.5,decreaseStep:2.5,failuresBeforeDecrease:2},
 {id:"e2",name:"Latzug schulterbreit",weight:"55 kg",target:"8–12",setsSun:3,setsWed:2,kind:"load",increaseStep:5,decreaseStep:5,failuresBeforeDecrease:2},
 {id:"e3",name:"T-Bar-Rudern",weight:"25 kg",target:"8–12",setsSun:3,setsWed:2,kind:"load",increaseStep:2.5,decreaseStep:2.5,failuresBeforeDecrease:2},
 {id:"e4",name:"Bankdrücken",weight:"20 kg",target:"8–12",setsSun:3,setsWed:3,kind:"load",increaseStep:2.5,decreaseStep:2.5,failuresBeforeDecrease:2},
 {id:"e5",name:"Beinpresse",weight:"91 kg",target:"10–15",setsSun:3,setsWed:2,kind:"load",increaseStep:5,decreaseStep:5,failuresBeforeDecrease:2},
 {id:"e6",name:"Schulterpresse",weight:"34 kg",target:"8–12",setsSun:3,setsWed:2,kind:"load",increaseStep:2.5,decreaseStep:2.5,failuresBeforeDecrease:2},
 {id:"e7",name:"Beinheben",weight:"Körpergewicht",target:"8–12",setsSun:3,setsWed:2,kind:"bodyweight",increaseStep:0,decreaseStep:0,failuresBeforeDecrease:2},
 {id:"e8",name:"Bird Dog",weight:"Körpergewicht",target:"8–10",setsSun:2,setsWed:2,kind:"bodyweight",increaseStep:0,decreaseStep:0,failuresBeforeDecrease:2}
];
const SEED = [
 {date:"07.10.2026",planId:"plan-2",items:[["Assistierte Klimmzüge","32 kg Unterstützung",["8","8","8"]],["Latzug schulterbreit","60 kg",["8","8"]],["T-Bar-Rudern","25 kg",["12","12"]],["Bankdrücken","20 kg",["12","12","9"]],["Beinpresse","91 kg",["15","15"]],["Schulterpresse","34 kg",["10","8"]],["Beinheben","Körpergewicht",["12","10"]],["Bird Dog","Körpergewicht",[]]]},
 {date:"04.10.2026",planId:"plan-2",items:[["Assistierte Klimmzüge","32 kg Unterstützung",["8","9","9"]],["Latzug schulterbreit","55 kg",["10","11","12"]],["T-Bar-Rudern","25 kg",["12","11","9"]],["Bankdrücken","20 kg",["12","11","9"]],["Beinpresse","91 kg",["15","15","15"]],["Schulterpresse","32 kg",["12","12"]],["Beinheben","Körpergewicht",["11","11","8"]],["Bird Dog","Körpergewicht",[]]]},
 {date:"30.09.2026",planId:"plan-2",items:[["Assistierte Klimmzüge","32 kg Unterstützung",["8","9","8"]],["Latzug schulterbreit","55 kg",["10","10","9"]],["T-Bar-Rudern","25 kg",["11","10","9"]],["Bankdrücken","20 kg",["12","11","9"]],["Beinpresse","87 kg",["15","12"]],["Schulterpresse","34 kg",[]],["Beinheben","Körpergewicht",[]],["Bird Dog","Körpergewicht",[]]]}
];
const DEFAULT_GOALS = [{id:"goal-1",name:"1 sauberer Klimmzug",status:"active",created:"2026-07-01",current:"32 kg Unterstützung",next:"25 kg Unterstützung",roadmap:["32 kg Unterstützung","25 kg Unterstützung","20 kg Unterstützung","15 kg Unterstützung","10 kg Unterstützung","1 sauberer Klimmzug"]}];
const DEFAULT_PLANS = [
 {id:"plan-1",name:"Plan 1 · Klimmzug-Fokus",from:"01.07.2026",to:"05.09.2026",active:false,archived:false,exercises:[]},
 {id:"plan-2",name:"Plan 2 · Ganzkörper",from:"06.09.2026",to:null,active:true,archived:false,exercises:BASE_PLAN}
];
const get = (key,fallback)=>{try{const value=localStorage.getItem(key);return value===null?fallback:JSON.parse(value)}catch(error){console.warn("Lokale Daten konnten nicht gelesen werden:",key,error);return fallback}};
const put = (key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch(error){console.error("Lokale Daten konnten nicht gespeichert werden:",key,error);alert("Die Daten konnten nicht gespeichert werden. Prüfe bitte den verfügbaren Speicherplatz.");return false}};
const esc = value=>String(value===null||value===undefined?"":value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
const uid = prefix=>prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7);
const deepCopy = value=>JSON.parse(JSON.stringify(value));
const today = ()=>new Date().toLocaleDateString("de-DE");
const toTimestamp = value=>{const m=String(value||"").match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);if(m)return new Date(Number(m[3]),Number(m[2])-1,Number(m[1])).getTime();const d=new Date(value);return Number.isNaN(d.getTime())?0:d.getTime()};
const parseRange = text=>{const m=String(text||"8–12").match(/(\d+)\s*[–-]\s*(\d+)/);return {min:m?Number(m[1]):8,max:m?Number(m[2]):12}};
const parseWeight = value=>{const m=String(value||"").replace(",",".").match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null};
const formatNumber = value=>Number(value.toFixed(2)).toLocaleString("de-DE",{maximumFractionDigits:2});
const getWeightLabel = (value,kind)=>kind==="assistance"?formatNumber(value)+" kg Unterstützung":formatNumber(value)+" kg";
function normalizeExercise(raw,index) {
 const s=raw||{},range=parseRange(s.target||(s.minReps||8)+"–"+(s.maxReps||12)),weight=String(s.weight===undefined?"":s.weight);
 let kind=s.kind||s.loadKind||"";if(!kind)kind=/unterstützung/i.test(weight)?"assistance":(/körpergewicht/i.test(weight)?"bodyweight":"load");
 const min=Number(s.minReps||range.min||8),max=Number(s.maxReps||range.max||12),n=parseWeight(weight),step=n!==null&&n>=40?5:2.5;
 return {id:String(s.id||("exercise-"+index+"-"+Math.random().toString(36).slice(2,6))),name:String(s.name||"Neue Übung"),weight:weight||(kind==="bodyweight"?"Körpergewicht":""),kind:kind,minReps:min,maxReps:Math.max(min,max),target:min+"–"+Math.max(min,max),setsSun:Number(s.setsSun||s.sets||3),setsWed:Number(s.setsWed||s.sets||3),increaseStep:Number(s.increaseStep===undefined?(kind==="bodyweight"?0:step):s.increaseStep),decreaseStep:Number(s.decreaseStep===undefined?(kind==="bodyweight"?0:step):s.decreaseStep),failuresBeforeDecrease:Math.max(1,Number(s.failuresBeforeDecrease||s.failureSessions||2))};
}
function normalizePlan(raw) {const p=raw||{};return {id:String(p.id||uid("plan")),name:String(p.name||"Trainingsplan"),from:p.from||today(),to:p.to||null,active:!!p.active,archived:!!p.archived,exercises:Array.isArray(p.exercises)?p.exercises.map(normalizeExercise):[]}}
function normalizeGoal(raw) {const g=raw||{};return {id:String(g.id||uid("goal")),name:String(g.name||"Neues Ziel"),status:g.status||"inactive",created:g.created||today(),current:String(g.current||""),next:String(g.next||""),roadmap:Array.isArray(g.roadmap)?g.roadmap.map(String):[]}}
function normalizeWorkoutItem(raw,index,planSnapshot) {
 if(Array.isArray(raw)){const name=String(raw[0]||"Übung"),pe=(planSnapshot&&planSnapshot.exercises||[]).find(x=>x.name===name);return {exerciseId:pe?pe.id:"legacy-"+name.toLowerCase().replace(/[^a-z0-9]+/g,"-"),name,weight:String(raw[1]||""),reps:Array.isArray(raw[2])?raw[2].map(x=>String(x)):[],skipped:false,done:Array.isArray(raw[2])&&raw[2].some(x=>String(x).trim()!==""),kind:pe?pe.kind:(/unterstützung/i.test(String(raw[1]||""))?"assistance":"load"),minReps:pe?pe.minReps:8,maxReps:pe?pe.maxReps:12,increaseStep:pe?pe.increaseStep:2.5,decreaseStep:pe?pe.decreaseStep:2.5,failuresBeforeDecrease:pe?pe.failuresBeforeDecrease:2};}
 const x=raw||{};return {exerciseId:String(x.exerciseId||"legacy-"+String(x.name||"").toLowerCase().replace(/[^a-z0-9]+/g,"-")),name:String(x.name||"Übung"),weight:String(x.weight||""),reps:Array.isArray(x.reps)?x.reps.map(v=>v===null||v===undefined?"":String(v)):[],skipped:!!x.skipped,done:!!x.done,kind:x.kind||(/unterstützung/i.test(String(x.weight||""))?"assistance":"load"),minReps:Number(x.minReps||8),maxReps:Number(x.maxReps||12),increaseStep:Number(x.increaseStep===undefined?2.5:x.increaseStep),decreaseStep:Number(x.decreaseStep===undefined?2.5:x.decreaseStep),failuresBeforeDecrease:Number(x.failuresBeforeDecrease||2),suggestionText:String(x.suggestionText||""),suggestionWeight:String(x.suggestionWeight||"")};
}
function normalizeWorkout(raw) {const w=raw||{},p=plans.find(x=>x.id===w.planId),snap=w.planSnapshot||(p?{id:p.id,name:p.name,exercises:p.exercises}:null);return {id:String(w.id||uid("workout")),date:String(w.date||today()),planId:String(w.planId||"unknown"),planName:String(w.planName||(snap&&snap.name)||(p&&p.name)||"Trainingsplan (historisch)"),planSnapshot:snap,items:Array.isArray(w.items)?w.items.map((x,i)=>normalizeWorkoutItem(x,i,snap)):[]}}
function normalizeDraftRecord(raw) {
 if(!raw||!Array.isArray(raw.items))return null;
 const p=plans.find(x=>x.id===raw.planId),snap=raw.planSnapshot||(p?deepCopy(p):null);
 const sourceExercises=(snap&&snap.exercises)||((p&&p.exercises)||[]);
 const items=raw.items.map((item,i)=>{
  const source=normalizeWorkoutItem(item,i,snap);
  const ex=sourceExercises.find(e=>e.id===source.exerciseId)||sourceExercises.find(e=>e.name===source.name);
  if(ex){source.kind=ex.kind;source.minReps=ex.minReps;source.maxReps=ex.maxReps;source.increaseStep=ex.increaseStep;source.decreaseStep=ex.decreaseStep;source.failuresBeforeDecrease=ex.failuresBeforeDecrease;source.name=(!item.name||item.name==="Übung")?ex.name:source.name;}
  if(!source.reps.length)source.reps=Array(todaySetCount(ex||{setsSun:3,setsWed:3})).fill("");
  if(!source.weight&&ex)source.weight=ex.weight||"";
  if(!source.done&&!source.skipped)source.done=source.reps.some(v=>String(v).trim()!=="");
  return source;
 });
 return {id:String(raw.id||uid("draft")),planId:String(raw.planId||(p&&p.id)||"unknown"),planName:String(raw.planName||(snap&&snap.name)||(p&&p.name)||"Trainingsplan"),date:String(raw.date||today()),current:Number(raw.current||0),items:items,planSnapshot:snap};
}
function migrate() {
 if(!localStorage.getItem("fitness.workouts"))put("fitness.workouts",SEED);
 let savedWorkouts=get("fitness.workouts",SEED);
 if(Array.isArray(savedWorkouts)){let changed=false;savedWorkouts=savedWorkouts.map((w,i)=>{if(w&&w.id)return w;changed=true;const date=String((w&&w.date)||"unknown").replace(/\\D/g,"");return Object.assign({},w,{id:"legacy-"+date+"-"+i});});if(changed)put("fitness.workouts",savedWorkouts);}
 let gs=get("fitness.goals",null);if(!gs){const old=get("fitness.goal",null);gs=old?[old]:DEFAULT_GOALS;}
 gs=Array.isArray(gs)?gs.map(normalizeGoal):deepCopy(DEFAULT_GOALS);if(!gs.length)gs=deepCopy(DEFAULT_GOALS);
 if(!gs.some(g=>g.status==="active")){const id=localStorage.getItem("fitness.activeGoal"),candidate=gs.find(g=>g.id===id)||gs.find(g=>g.status!=="completed")||gs[0];if(candidate)candidate.status="active";}
 put("fitness.goals",gs);if(!localStorage.getItem("fitness.activeGoal")){const g=gs.find(x=>x.status==="active");if(g)put("fitness.activeGoal",g.id);}
 let ps=get("fitness.plans",null);if(!ps)ps=deepCopy(DEFAULT_PLANS);ps=Array.isArray(ps)?ps.map(normalizePlan):deepCopy(DEFAULT_PLANS);if(!ps.length)ps=deepCopy(DEFAULT_PLANS);
 if(!ps.some(p=>p.active&&!p.archived)){const p=ps.find(x=>!x.archived)||ps[0];p.active=true;p.archived=false;}
 let found=false;ps=ps.map(p=>{if(p.active&&!p.archived&&!found){found=true;return p}return Object.assign({},p,{active:false})});put("fitness.plans",ps);
}
migrate();
let workouts=get("fitness.workouts",SEED);
let goals=get("fitness.goals",DEFAULT_GOALS).map(normalizeGoal);
let plans=get("fitness.plans",DEFAULT_PLANS).map(normalizePlan);
let draft=normalizeDraftRecord(get("fitness.draft",null));
if(draft)put("fitness.draft",draft);
let planDraft=null,goalDraft=null,editingWorkoutId=null;
function activePlan(){return plans.find(p=>p.active&&!p.archived)||plans.find(p=>!p.archived)||plans[0]||null}
function activeGoal(){const id=localStorage.getItem("fitness.activeGoal");return goals.find(g=>g.id===id&&g.status==="active")||goals.find(g=>g.status==="active")||null}
function todaySetCount(ex){return new Date().getDay()===3?Number(ex.setsWed||3):Number(ex.setsSun||3)}
function route(){return location.hash.slice(1)||"home"}
function nav(to){location.hash=to}
function setPlans(){put("fitness.plans",plans)}
function setGoals(){put("fitness.goals",goals)}
function sortedWorkouts(){return workouts.map(normalizeWorkout).sort((a,b)=>toTimestamp(b.date)-toTimestamp(a.date))}
function exerciseHistory(exercise) {
 return sortedWorkouts().map(w=>{const item=w.items.find(x=>x.exerciseId===exercise.id)||w.items.find(x=>x.name.toLowerCase()===exercise.name.toLowerCase());if(!item||item.skipped)return null;const nums=item.reps.map(v=>String(v).trim()===""?null:Number(v)).filter(v=>v!==null&&Number.isFinite(v));const fullyLogged=item.reps.length>0&&nums.length===item.reps.length;return {workout:w,item:item,reps:nums,fullyLogged:fullyLogged,weight:item.weight}}).filter(Boolean);
}
function getSuggestion(exercise) {
 if(exercise.kind==="bodyweight")return null;
 const history=exerciseHistory(exercise).filter(x=>x.fullyLogged&&x.item.done);if(!history.length)return null;
 const latest=history[0],weight=parseWeight(latest.weight);if(weight===null)return null;
 const allAtTop=latest.reps.length>0&&latest.reps.every(v=>v>=exercise.maxReps);
 const failed=e=>e.reps.length>0&&e.reps.some(v=>v<exercise.minReps);
 if(allAtTop&&exercise.increaseStep>0){const n=weight+(exercise.kind==="assistance"?-exercise.increaseStep:exercise.increaseStep);if(n>=0)return {kind:"increase",weight:getWeightLabel(n,exercise.kind),message:exercise.kind==="assistance"?"Weniger Unterstützung vorgeschlagen":"Gewichtserhöhung vorgeschlagen"};}
 let failures=0;for(const entry of history){if(failed(entry))failures++;else break;}
 if(failures>=exercise.failuresBeforeDecrease&&exercise.decreaseStep>0){const n=weight+(exercise.kind==="assistance"?exercise.decreaseStep:-exercise.decreaseStep);if(n>0)return {kind:"decrease",weight:getWeightLabel(n,exercise.kind),message:exercise.kind==="assistance"?"Etwas mehr Unterstützung vorgeschlagen":"Gewichtsreduzierung vorgeschlagen"};}
 return null;
}
function render(){const app=document.getElementById("app");app.innerHTML=view(route());document.querySelectorAll(".bottom-nav button").forEach(b=>{b.classList.toggle("active",b.dataset.route===route());b.onclick=()=>nav(b.dataset.route)});}
function view(r){if(r==="home")return home();if(r==="train")return train();if(r==="history")return historyView();if(r==="history-edit")return historyEditView();if(r==="progress")return progress();if(r==="more")return more();if(r==="plan-edit")return planEditView();if(r==="goal-edit")return goalEditView();return home()}
function home(){
 const g=activeGoal(),p=activePlan();let out='<div class="app home-page"><header><h1>🏋️ Fitness</h1><div class="sub">Dein Training. Dein Fortschritt.</div></header><button class="primary start-top" data-action="start-training">▶ Neues Training starten</button>';
 if(g){const road=g.roadmap.length?g.roadmap:[g.current,g.next,g.name].filter(Boolean);let idx=road.findIndex(x=>x.toLowerCase()===String(g.current).toLowerCase());if(idx<0)idx=0;const pct=road.length>1?Math.round((idx+0.25)/(road.length-1)*100):0;
 out+='<section class="goal-graphic card"><div class="goal-head"><div><div class="eyebrow">DEIN AKTIVES ZIEL</div><h2>'+esc(g.name)+'</h2></div><button class="icon-button" data-action="edit-active-goal" aria-label="Ziel bearbeiten">✎</button></div><div class="goal-highlight"><div><span class="muted-label">Aktueller Stand</span><strong>'+esc(g.current||"Noch nicht festgelegt")+'</strong></div><div><span class="muted-label">Als Nächstes</span><b>'+esc(g.next||"Meilenstein festlegen")+'</b></div></div><div class="goal-progress-track"><div class="goal-progress-fill" style="width:'+pct+'%"></div></div><div class="goal-milestones">';
 road.forEach((s,i)=>{const state=i<idx?"done":i===idx?"current":i===idx+1?"next":"future";out+='<div class="goal-milestone '+state+'"><span class="milestone-dot">'+(i<idx?"✓":i+1)+'</span><span>'+esc(s)+'</span></div>';});
 out+='</div><div class="goal-bottom"><span>'+road.length+' Meilensteine</span><button class="text-button" data-action="go-goals">Ziele verwalten →</button></div></section>';
 }else out+='<section class="card empty-goal"><h2>Dein nächstes Ziel</h2><p>Lege ein Ziel fest, das dich motiviert.</p><button class="secondary" data-action="new-goal">+ Ziel anlegen</button></section>';
 out+='<div class="section-title compact-title"><div><span class="eyebrow">AKTUELLER PLAN</span><h2>'+esc(p?p.name:"Noch kein Trainingsplan")+'</h2></div><button class="text-button" data-action="go-plans">Verwalten →</button></div>';
 if(p&&p.exercises.length){out+='<div class="card compact-plan">';p.exercises.slice(0,4).forEach((e,i)=>{out+='<div class="compact-exercise"><span class="compact-number">'+(i+1)+'</span><div class="compact-ex-name"><b>'+esc(e.name)+'</b><small>'+esc(e.weight||"Gewicht eintragen")+' · '+e.minReps+'–'+e.maxReps+' Wdh.</small></div><span class="compact-sets">'+e.setsSun+' S.</span></div>';});if(p.exercises.length>4)out+='<div class="note">+ '+(p.exercises.length-4)+' weitere Übungen</div>';out+='<button class="secondary full-width" data-action="go-plans">Vollständigen Plan ansehen</button></div>'}
 else out+='<div class="card"><p>Dein aktiver Trainingsplan hat noch keine Übungen.</p><button class="secondary" data-action="new-plan">Plan erstellen</button></div>';
 out+='<div class="safety-note">Deine Trainingsdaten bleiben lokal auf diesem Gerät, bis du sie selbst exportierst.</div></div>';return out;
}
function freshDraft() {
 const p=activePlan();if(!p||!p.exercises.length){alert("Bitte lege unter Mehr zuerst einen Trainingsplan mit mindestens einer Übung an.");return null;}
 const items=p.exercises.map(ex=>{const s=getSuggestion(ex);return {exerciseId:ex.id,name:ex.name,weight:s?s.weight:(ex.weight||""),kind:ex.kind,minReps:ex.minReps,maxReps:ex.maxReps,increaseStep:ex.increaseStep,decreaseStep:ex.decreaseStep,failuresBeforeDecrease:ex.failuresBeforeDecrease,reps:Array(todaySetCount(ex)).fill(""),done:false,skipped:false,suggestionText:s?s.message+" · "+s.weight:"",suggestionWeight:s?s.weight:""}});
 return {id:uid("draft"),planId:p.id,planName:p.name,date:today(),current:0,items:items,planSnapshot:deepCopy(p)};
}
function startTraining(){draft=normalizeDraftRecord(get("fitness.draft",null));if(!draft)draft=freshDraft();if(!draft)return;if(!draft.planSnapshot){const p=plans.find(x=>x.id===draft.planId)||activePlan();draft.planSnapshot=p?deepCopy(p):null;}put("fitness.draft",draft);nav("train")}
function train(){
 if(!draft)draft=normalizeDraftRecord(get("fitness.draft",null));
 if(!draft||!Array.isArray(draft.items))return '<div class="app"><header><h2>Training</h2><div class="sub">Deine gesamte Einheit auf einen Blick.</div></header><div class="card"><p>Du hast noch keine laufende Trainingseinheit.</p><button class="primary" data-action="start-training">▶ Training starten</button></div></div>';
 const total=draft.items.filter(x=>!x.skipped).length,done=draft.items.filter(x=>x.done&&!x.skipped).length;
 let out='<div class="app training-page"><header><button class="back" data-action="back-home">← Zur Startseite</button><h2>Dein Training</h2><div class="sub">'+esc(draft.planName||"Trainingsplan")+' · '+esc(draft.date)+'</div></header><div class="training-summary"><div><strong>'+done+' / '+total+'</strong><span>Übungen erledigt</span></div><div class="training-progress-track"><div style="width:'+(total?Math.round(done/total*100):0)+'%"></div></div><button class="text-button" data-action="discard-draft">Einheit verwerfen</button></div><div class="training-tip">Gewicht und Wiederholungen werden automatisch zwischengespeichert. Du kannst die Reihenfolge ändern oder Übungen überspringen.</div>';
 draft.items.forEach((it,i)=>{const status=it.skipped?"skipped":(it.done?"done":"");out+='<section class="exercise-card card '+status+'"><div class="exercise-card-head"><span class="exercise-order">'+(i+1)+'</span><div class="exercise-title"><h3>'+esc(it.name)+'</h3><div class="meta">'+it.minReps+'–'+it.maxReps+' Wiederholungen · '+it.reps.length+' Sätze</div></div><div class="exercise-order-actions"><button class="mini-icon" data-action="move-exercise-up" data-index="'+i+'" '+(i===0?"disabled":"")+' aria-label="Übung nach oben">↑</button><button class="mini-icon" data-action="move-exercise-down" data-index="'+i+'" '+(i===draft.items.length-1?"disabled":"")+' aria-label="Übung nach unten">↓</button></div></div>';
 if(it.suggestionText)out+='<div class="suggestion-chip">↗ '+esc(it.suggestionText)+'</div>';if(it.skipped)out+='<div class="skipped-notice">Diese Übung wird für diese Einheit übersprungen.</div>';
 out+='<label class="field-label">Tatsächliches Gewicht / Unterstützung<input class="input workout-input" data-index="'+i+'" data-field="weight" value="'+esc(it.weight)+'" '+(it.skipped?"disabled":"")+' placeholder="z. B. 22,5 kg"></label><div class="sets-grid">';
 it.reps.forEach((rep,s)=>{out+='<label class="field-label">Satz '+(s+1)+'<input class="input workout-input rep-input" data-index="'+i+'" data-rep-index="'+s+'" data-field="rep" type="number" min="0" inputmode="numeric" value="'+esc(rep)+'" '+(it.skipped?"disabled":"")+' placeholder="Wdh."></label>';});
 out+='</div><div class="exercise-card-actions"><button class="mini-button '+(it.done?"mini-done":"")+'" data-action="toggle-done" data-index="'+i+'" '+(it.skipped?"disabled":"")+'>'+(it.done?"✓ Erledigt":"✓ Fertig")+'</button><button class="mini-button '+(it.skipped?"mini-skipped":"")+'" data-action="toggle-skipped" data-index="'+i+'">'+(it.skipped?"Überspringen rückgängig":"Übung überspringen")+'</button>';
 out+='<button class="mini-button" data-action="save-weight-default" data-index="'+i+'">Als Planstandard speichern</button>';if(it.suggestionWeight)out+='<button class="mini-button" data-action="accept-suggestion" data-index="'+i+'">Vorschlag übernehmen</button>';
 out+='</div></section>';});
 out+='<div class="actions finish-actions"><button class="primary full-width" data-action="finish-workout">Training abschließen</button><div class="note">Nicht markierte Übungen können als teilweise absolvierte Einheit gespeichert werden. Übersprungene Übungen werden nicht als Fehler gewertet.</div></div></div>';return out;
}
function syncDraftFromDom(){if(!draft||route()!=="train")return;document.querySelectorAll(".workout-input").forEach(el=>{const i=Number(el.dataset.index);if(!draft.items[i])return;if(el.dataset.field==="weight")draft.items[i].weight=el.value;if(el.dataset.field==="rep")draft.items[i].reps[Number(el.dataset.repIndex)]=el.value;});put("fitness.draft",draft)}
function finishWorkout(){syncDraftFromDom();if(!draft||!draft.items.length){alert("Es gibt keine Trainingseinheit zum Speichern.");return;}const open=draft.items.filter(x=>!x.done&&!x.skipped);if(open.length&&!confirm(open.length+" Übung(en) sind noch nicht als erledigt markiert. Möchtest du die Einheit trotzdem als teilweise absolviert speichern?"))return;const w={id:uid("workout"),date:draft.date,planId:draft.planId,planName:draft.planName,planSnapshot:deepCopy(draft.planSnapshot),items:draft.items.map(x=>deepCopy(x))};workouts=get("fitness.workouts",SEED);workouts.unshift(w);if(!put("fitness.workouts",workouts))return;localStorage.removeItem("fitness.draft");draft=null;nav("history")}
function saveWeightAsDefault(index){syncDraftFromDom();const item=draft&&draft.items[index];if(!item||item.skipped)return;const p=plans.find(x=>x.id===draft.planId);if(!p)return;const ex=p.exercises.find(x=>x.id===item.exerciseId)||p.exercises.find(x=>x.name===item.name);if(!ex){alert("Die Übung wurde im Trainingsplan nicht gefunden.");return;}if(!item.weight.trim()){alert("Bitte trage zuerst ein Gewicht ein.");return;}if(!confirm("Das Gewicht „"+item.weight+"“ als Planstandard für „"+item.name+"“ übernehmen?"))return;ex.weight=item.weight.trim();if(draft.planSnapshot){const snap=draft.planSnapshot.exercises.find(x=>x.id===ex.id)||draft.planSnapshot.exercises.find(x=>x.name===ex.name);if(snap)snap.weight=ex.weight;}setPlans();put("fitness.draft",draft);alert("Standardgewicht im Trainingsplan aktualisiert.");render()}
function discardDraft(){if(!confirm("Die laufende Trainingseinheit wirklich verwerfen? Die bereits eingegebenen Werte gehen verloren."))return;localStorage.removeItem("fitness.draft");draft=null;nav("home")}
function historyView(){
 const list=sortedWorkouts();let out='<div class="app"><header><h2>Trainingshistorie</h2><div class="sub">Deine absolvierten Einheiten – Fehler lassen sich nachträglich korrigieren.</div></header>';
 if(!list.length)out+='<div class="empty">Noch keine Trainingseinheiten gespeichert.</div>';
 list.forEach(w=>{const n=w.items.filter(x=>x.done&&!x.skipped).length;out+='<section class="card history-card"><div class="history-head"><div><h3>'+esc(w.date)+'</h3><div class="meta">'+esc(w.planName)+' · '+w.items.length+' Übungen</div></div><span class="badge">'+n+' erledigt</span></div><div class="history-exercises">';
 w.items.forEach(it=>{const reps=it.skipped?"übersprungen":(it.reps.filter(x=>String(x).trim()!=="").join(" / ")||"keine Wiederholungen eingetragen");out+='<div class="history-exercise"><span>'+esc(it.name)+'</span><span>'+esc(it.weight||"–")+'</span><b>'+esc(reps)+'</b></div>';});
 out+='</div><div class="history-actions"><button class="secondary" data-action="edit-workout" data-id="'+esc(w.id)+'">Bearbeiten</button><button class="danger" data-action="delete-workout" data-id="'+esc(w.id)+'">Löschen</button></div></section>';});
 return out+'</div>';
}
function historyEditView(){
 const w=sortedWorkouts().find(x=>x.id===editingWorkoutId);if(!w)return '<div class="app"><header><h2>Training bearbeiten</h2></header><div class="card">Diese Einheit wurde nicht gefunden.<button class="secondary" data-action="go-history">Zurück zur Historie</button></div></div>';
 let out='<div class="app"><header><button class="back" data-action="go-history">← Zurück zur Historie</button><h2>Training bearbeiten</h2><div class="sub">'+esc(w.planName)+'</div></header><div class="card"><label class="field-label">Trainingsdatum<input class="input history-date-input" data-hist-field="date" value="'+esc(w.date)+'" placeholder="TT.MM.JJJJ"></label></div>';
 w.items.forEach((it,i)=>{out+='<div class="card history-edit-card"><h3>'+esc(it.name)+'</h3><label class="field-label">Gewicht / Unterstützung<input class="input hist-item-input" data-index="'+i+'" data-field="weight" value="'+esc(it.weight)+'"></label><div class="sets-grid">';
 it.reps.forEach((r,s)=>{out+='<label class="field-label">Satz '+(s+1)+'<input class="input hist-item-input" data-index="'+i+'" data-rep-index="'+s+'" data-field="rep" type="number" min="0" value="'+esc(r)+'" inputmode="numeric"></label>';});
 out+='</div><label class="skip-check"><input class="hist-item-input" data-index="'+i+'" data-field="skipped" type="checkbox" '+(it.skipped?"checked":"")+'> Übung war übersprungen</label></div>';});
 out+='<div class="actions"><button class="primary full-width" data-action="save-history-edit" data-id="'+esc(w.id)+'">Änderungen speichern</button><button class="secondary full-width" data-action="go-history">Abbrechen</button></div></div>';return out;
}
function saveHistoryEdit(id){
 const w=sortedWorkouts().find(x=>x.id===id);if(!w)return;const dateEl=document.querySelector(".history-date-input");
 if(dateEl){const v=dateEl.value.trim();if(!/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(v)){alert("Bitte das Datum im Format TT.MM.JJJJ eingeben.");return;}w.date=v;}
 document.querySelectorAll(".hist-item-input").forEach(el=>{const i=Number(el.dataset.index),it=w.items[i];if(!it)return;if(el.dataset.field==="weight")it.weight=el.value.trim();if(el.dataset.field==="rep")it.reps[Number(el.dataset.repIndex)]=el.value;if(el.dataset.field==="skipped"){it.skipped=el.checked;if(el.checked)it.done=false;}});
 workouts=get("fitness.workouts",SEED).map(raw=>String(raw.id)===String(id)?w:normalizeWorkout(raw));if(put("fitness.workouts",workouts))nav("history");
}
function deleteWorkout(id){const w=sortedWorkouts().find(x=>x.id===id);if(!w)return;if(!confirm("Training vom "+w.date+" wirklich löschen? Das kann nicht rückgängig gemacht werden."))return;workouts=get("fitness.workouts",SEED).filter(x=>String(x.id)!==String(id));if(put("fitness.workouts",workouts))render()}
function progress(){
 const p=activePlan();if(!p)return '<div class="app"><header><h2>Fortschritt</h2></header><div class="card">Lege zuerst einen Trainingsplan an.</div></div>';
 const list=sortedWorkouts(),sets=list.reduce((sum,w)=>sum+w.items.reduce((n,it)=>n+it.reps.filter(x=>String(x).trim()!=="").length,0),0);
 let out='<div class="app"><header><h2>Fortschritt</h2><div class="sub">Dein Weg zum Ziel und klare Hinweise für die nächste Belastung.</div></header><div class="statgrid"><div class="stat"><b>'+list.length+'</b><span>Trainingseinheiten</span></div><div class="stat"><b>'+sets+'</b><span>Sätze eingetragen</span></div><div class="stat"><b>'+esc(list[0]?list[0].date:"–")+'</b><span>Letztes Training</span></div></div>';
 const g=activeGoal();if(g){const road=g.roadmap.length?g.roadmap:[g.current,g.next,g.name].filter(Boolean);let idx=road.findIndex(x=>x.toLowerCase()===String(g.current).toLowerCase());if(idx<0)idx=0;out+='<section class="card progress-goal"><div class="eyebrow">DEIN ZIEL</div><h2>'+esc(g.name)+'</h2><p class="meta">Aktuell: '+esc(g.current||"noch kein aktueller Stand")+' · Als Nächstes: '+esc(g.next||"Meilenstein festlegen")+'</p><div class="goal-progress-track"><div class="goal-progress-fill" style="width:'+(road.length>1?Math.round((idx+.25)/(road.length-1)*100):0)+'%"></div></div><div class="goal-milestones mini-road">';
 road.forEach((s,i)=>{out+='<div class="goal-milestone '+(i<idx?"done":(i===idx?"current":(i===idx+1?"next":"future")))+'"><span class="milestone-dot">'+(i<idx?"✓":i+1)+'</span><span>'+esc(s)+'</span></div>';});out+='</div><button class="text-button" data-action="edit-active-goal">Ziel bearbeiten →</button></section>';}
 out+='<div class="section-title"><div><span class="eyebrow">GEWICHTSENTWICKLUNG</span><h2>Der nächste sinnvolle Schritt</h2></div></div><p class="section-intro">Steigerung nach allen Sätzen an der Obergrenze; Reduzierung erst nach zwei aufeinanderfolgenden Einheiten unter der Mindestwiederholungszahl. Übersprungene Übungen zählen nicht.</p>';
 p.exercises.forEach(ex=>{const hist=exerciseHistory(ex),latest=hist.find(h=>h.fullyLogged),s=getSuggestion(ex),reps=latest?latest.reps.join(" / "):"Noch keine vollständigen Daten";out+='<section class="card progress-exercise"><div class="progress-ex-head"><div><h3>'+esc(ex.name)+'</h3><div class="meta">Ziel '+ex.minReps+'–'+ex.maxReps+' Wdh. · '+ex.setsSun+' Sätze</div></div><span class="badge">'+(ex.kind==="assistance"?"Unterstützung":(ex.kind==="bodyweight"?"Körpergewicht":"Gewicht"))+'</span></div><div class="progress-current"><div><span class="muted-label">Letzte Leistung</span><b>'+esc(latest?latest.weight:ex.weight||"–")+'</b><small>'+esc(reps)+'</small></div>';
 if(s)out+='<div class="suggestion-box '+s.kind+'"><span>'+esc(s.message)+'</span><b>'+esc(s.weight)+'</b></div>';else out+='<div class="suggestion-box neutral"><span>Nächster Schritt</span><b>'+(ex.kind==="bodyweight"?"Wiederholungsziel weiterentwickeln":"Noch kein Vorschlag")+'</b></div>';
 out+='</div><div class="progress-history-bars">';const bars=hist.filter(h=>h.fullyLogged).slice(0,5).reverse();if(!bars.length)out+='<span class="note">Trage deine nächste Einheit ein, um hier den Verlauf zu sehen.</span>';else{const peak=Math.max(ex.maxReps,...bars.flatMap(h=>h.reps));bars.forEach(h=>{const n=Math.max(...h.reps);out+='<div class="progress-bar-group"><div class="progress-bar-column" style="height:'+Math.max(8,Math.round(n/peak*52))+'px"><span>'+n+'</span></div><small>'+esc(h.workout.date.slice(0,5))+'</small></div>';});}out+='</div></section>';});
 return out+'</div>';
}
function more(){
 let out='<div class="app"><header><h2>Mehr</h2><div class="sub">Trainingspläne, Ziele und deine Daten verwalten.</div></header><section class="card management-card"><div class="section-head"><div><div class="eyebrow">TRAININGSPLÄNE</div><h3>Deine Pläne</h3></div><button class="primary small-primary" data-action="new-plan">+ Neuer Plan</button></div>';
 plans.forEach(p=>{const linked=workouts.some(w=>String(w.planId)===String(p.id));out+='<div class="manage-row"><div class="manage-main"><b>'+esc(p.name)+'</b><span class="meta">'+p.exercises.length+' Übungen'+(p.active?" · Aktiver Plan":(p.archived?" · Archiviert":" · Inaktiv"))+'</span></div><div class="manage-actions">';
 if(!p.active)out+='<button class="mini-button" data-action="activate-plan" data-id="'+esc(p.id)+'">'+(p.archived?"Reaktivieren":"Aktivieren")+'</button>';out+='<button class="mini-button" data-action="edit-plan" data-id="'+esc(p.id)+'">Bearbeiten</button>';
 if(!p.active&&!p.archived)out+='<button class="mini-button" data-action="archive-plan" data-id="'+esc(p.id)+'">Archivieren</button>';
 if(p.archived&&!linked)out+='<button class="mini-button danger-text" data-action="delete-plan" data-id="'+esc(p.id)+'">Löschen</button>';
 if(!p.active&&!linked&&!p.archived)out+='<button class="mini-button danger-text" data-action="delete-plan" data-id="'+esc(p.id)+'">Löschen</button>';
 out+='</div></div>';});out+='</section><section class="card management-card"><div class="section-head"><div><div class="eyebrow">ZIELE</div><h3>Deine Ziele</h3></div><button class="primary small-primary" data-action="new-goal">+ Neues Ziel</button></div>';
 goals.forEach(g=>{out+='<div class="manage-row"><div class="manage-main"><b>'+esc(g.name)+'</b><span class="meta">'+esc(g.current||"Stand offen")+(g.next?" · als Nächstes "+esc(g.next):"")+'</span></div><div class="manage-actions"><span class="badge '+(g.status==="active"?"active":"")+'">'+(g.status==="active"?"AKTIV":(g.status==="completed"?"ERREICHT":"INAKTIV"))+'</span><button class="mini-button" data-action="edit-goal" data-id="'+esc(g.id)+'">Bearbeiten</button>';
 if(g.status!=="active"&&g.status!=="completed")out+='<button class="mini-button" data-action="activate-goal" data-id="'+esc(g.id)+'">Aktivieren</button>';if(g.status==="active")out+='<button class="mini-button" data-action="complete-goal" data-id="'+esc(g.id)+'">Erreicht ✓</button>';out+='</div></div>';});
 out+='</section><section class="card export-card"><div class="eyebrow">DATEN & CHATGPT</div><h3>Trainingsdaten exportieren</h3><p class="meta">Lädt eine JSON-Datei mit Trainingshistorie, Planständen, Zielen und Steigerungsregeln auf dein Gerät herunter. Du kannst die Datei danach hier im Chat hochladen.</p><button class="secondary full-width" data-action="export-json">↓ Trainingsdaten als JSON exportieren</button><div class="note">Der Export sendet keine Daten automatisch an einen Server.</div></section><section class="card info"><b>Datenschutz</b><div class="note" style="margin-top:6px">Die App speichert deine Trainingsdaten lokal im Browser-Speicher dieses Geräts. Die Exportdatei enthält persönliche Trainingsinformationen – teile sie nur dort, wo du möchtest.</div></section></div>';return out;
}
function makeBlankExercise(){return normalizeExercise({id:uid("exercise"),name:"Neue Übung",weight:"",kind:"load",minReps:8,maxReps:12,setsSun:3,setsWed:3,increaseStep:2.5,decreaseStep:2.5,failuresBeforeDecrease:2})}
function newPlan(){planDraft={id:uid("plan"),name:"Neuer Trainingsplan",from:today(),to:null,active:false,archived:false,exercises:[makeBlankExercise()]};nav("plan-edit")}
function editPlan(id){const p=plans.find(x=>x.id===id);if(!p)return;planDraft=deepCopy(p);nav("plan-edit")}
function capturePlanForm(){
 if(!planDraft)return;const name=document.querySelector("[data-plan-name]");if(name)planDraft.name=name.value.trim();
 document.querySelectorAll(".exercise-row").forEach(row=>{const i=Number(row.dataset.exerciseIndex),ex=planDraft.exercises[i];if(!ex)return;row.querySelectorAll("[data-ex-field]").forEach(el=>{const f=el.dataset.exField;if(["minReps","maxReps","setsSun","setsWed","increaseStep","decreaseStep","failuresBeforeDecrease"].includes(f))ex[f]=el.value===""?0:Number(el.value);else ex[f]=el.value;});});
 planDraft.exercises=planDraft.exercises.map(normalizeExercise);
}
function planEditView(){
 if(!planDraft)return '<div class="app"><div class="card">Kein Plan ausgewählt.<button class="secondary" data-action="go-more">Zurück</button></div></div>';
 let out='<div class="app plan-editor"><header><button class="back" data-action="go-more">← Zurück zu Mehr</button><h2>'+(plans.some(p=>p.id===planDraft.id)?"Trainingsplan bearbeiten":"Trainingsplan anlegen")+'</h2><div class="sub">Lege für jede Übung Wiederholungsbereiche und Steigerungsregeln fest.</div></header><section class="card"><label class="field-label">Name des Trainingsplans<input class="input" data-plan-name value="'+esc(planDraft.name)+'" placeholder="z. B. Ganzkörper A"></label><div class="note" style="margin-top:8px">Aktivieren kannst du den Plan nach dem Speichern in der Übersicht.</div></section><div class="section-head editor-exercises-head"><h3>Übungen ('+planDraft.exercises.length+')</h3><button class="secondary" data-action="add-plan-exercise">+ Übung</button></div>';
 planDraft.exercises.forEach((ex,i)=>{out+='<section class="card exercise-row" data-exercise-index="'+i+'"><div class="editor-row-head"><h3>Übung '+(i+1)+'</h3><div class="exercise-order-actions"><button class="mini-icon" data-action="plan-ex-up" data-index="'+i+'" '+(i===0?"disabled":"")+'>↑</button><button class="mini-icon" data-action="plan-ex-down" data-index="'+i+'" '+(i===planDraft.exercises.length-1?"disabled":"")+'>↓</button><button class="mini-icon danger-text" data-action="remove-plan-exercise" data-index="'+i+'">×</button></div></div><label class="field-label">Übungsname<input class="input" data-ex-field="name" value="'+esc(ex.name)+'" placeholder="z. B. Bankdrücken"></label><div class="form-grid two"><label class="field-label">Standardgewicht / Unterstützung<input class="input" data-ex-field="weight" value="'+esc(ex.weight)+'" placeholder="z. B. 20 kg"></label><label class="field-label">Art der Belastung<select class="input" data-ex-field="kind"><option value="load" '+(ex.kind==="load"?"selected":"")+'>Gewicht</option><option value="assistance" '+(ex.kind==="assistance"?"selected":"")+'>Unterstützung (weniger = schwerer)</option><option value="bodyweight" '+(ex.kind==="bodyweight"?"selected":"")+'>Körpergewicht</option></select></label></div><div class="form-grid four"><label class="field-label">Min. Wdh.<input class="input" data-ex-field="minReps" type="number" min="1" max="100" value="'+ex.minReps+'"></label><label class="field-label">Max. Wdh.<input class="input" data-ex-field="maxReps" type="number" min="1" max="100" value="'+ex.maxReps+'"></label><label class="field-label">Sätze Mittwoch<input class="input" data-ex-field="setsWed" type="number" min="1" max="12" value="'+ex.setsWed+'"></label><label class="field-label">Sätze Sonntag<input class="input" data-ex-field="setsSun" type="number" min="1" max="12" value="'+ex.setsSun+'"></label></div><div class="rule-panel"><div class="eyebrow">STEUERUNG DER BELASTUNG</div><div class="form-grid three"><label class="field-label">Steigerungsschritt (kg)<input class="input" data-ex-field="increaseStep" type="number" min="0" step="0.5" value="'+ex.increaseStep+'"></label><label class="field-label">Senkungsschritt (kg)<input class="input" data-ex-field="decreaseStep" type="number" min="0" step="0.5" value="'+ex.decreaseStep+'"></label><label class="field-label">Fehlschläge vor Senkung<input class="input" data-ex-field="failuresBeforeDecrease" type="number" min="1" max="5" value="'+ex.failuresBeforeDecrease+'"></label></div><p class="note">Steigerung: alle Sätze am oberen Wiederholungsziel. Senkung: '+ex.failuresBeforeDecrease+' aufeinanderfolgende absolvierte Einheiten mit mindestens einer Serie unter der Mindestzahl.</p></div></section>';});
 out+='<div class="actions"><button class="primary full-width" data-action="save-plan">Plan speichern</button><button class="secondary full-width" data-action="go-more">Abbrechen</button></div></div>';return out;
}
function savePlan(){
 capturePlanForm();if(!planDraft.name){alert("Bitte gib dem Trainingsplan einen Namen.");return;}if(!planDraft.exercises.length){alert("Ein Trainingsplan braucht mindestens eine Übung.");return;}
 for(const ex of planDraft.exercises){if(!ex.name.trim()){alert("Bitte gib allen Übungen einen Namen.");return;}if(ex.minReps<1||ex.maxReps<ex.minReps){alert("Bitte prüfe den Wiederholungsbereich bei "+ex.name+".");return;}if(ex.setsSun<1||ex.setsWed<1){alert("Bitte gib mindestens einen Satz pro Trainingstag an: "+ex.name+".");return;}if(ex.increaseStep<0||ex.decreaseStep<0){alert("Steigerungs- und Senkungsschritte dürfen nicht negativ sein.");return;}}
 const old=plans.find(p=>p.id===planDraft.id),saved=normalizePlan(Object.assign({},planDraft,{active:old?old.active:false,archived:false,exercises:planDraft.exercises}));
 if(old)plans=plans.map(p=>p.id===saved.id?saved:p);else plans.push(saved);setPlans();planDraft=null;nav("more");
}
function addPlanExercise(){capturePlanForm();planDraft.exercises.push(makeBlankExercise());render()}
function removePlanExercise(i){capturePlanForm();if(planDraft.exercises.length<=1){alert("Ein Plan muss mindestens eine Übung enthalten. Du kannst die Übung stattdessen ersetzen.");return;}planDraft.exercises.splice(i,1);render()}
function movePlanExercise(i,delta){capturePlanForm();const n=i+delta;if(n<0||n>=planDraft.exercises.length)return;[planDraft.exercises[i],planDraft.exercises[n]]=[planDraft.exercises[n],planDraft.exercises[i]];render()}
function activatePlan(id){const target=plans.find(p=>p.id===id);if(!target)return;plans=plans.map(p=>Object.assign({},p,{active:p.id===id,archived:p.id===id?false:p.archived}));setPlans();render()}
function archivePlan(id){const p=plans.find(x=>x.id===id);if(!p||p.active){alert("Der aktive Plan kann nicht archiviert werden. Aktiviere zuerst einen anderen Plan.");return;}if(!confirm("Plan „"+p.name+"“ archivieren? Historische Trainingseinheiten bleiben erhalten."))return;plans=plans.map(x=>x.id===id?Object.assign({},x,{archived:true,active:false}):x);setPlans();render()}
function deletePlan(id){const p=plans.find(x=>x.id===id);if(!p||p.active)return;if(workouts.some(w=>String(w.planId)===String(id))){alert("Dieser Plan wird in der Historie verwendet. Archiviere ihn stattdessen, damit die Trainingshistorie nachvollziehbar bleibt.");return;}if(!confirm("Plan „"+p.name+"“ endgültig löschen?"))return;plans=plans.filter(x=>x.id!==id);setPlans();render()}
function newGoal(){goalDraft={id:uid("goal"),name:"Neues Ziel",status:"active",created:today(),current:"",next:"",roadmap:[]};nav("goal-edit")}
function editGoal(id){const g=goals.find(x=>x.id===id);if(!g)return;goalDraft=deepCopy(g);nav("goal-edit")}
function goalEditView(){
 if(!goalDraft)return '<div class="app"><div class="card">Kein Ziel ausgewählt.<button class="secondary" data-action="go-more">Zurück</button></div></div>';
 const existed=goals.some(g=>g.id===goalDraft.id);
 return '<div class="app"><header><button class="back" data-action="go-more">← Zurück zu Mehr</button><h2>'+(existed?"Ziel bearbeiten":"Ziel anlegen")+'</h2><div class="sub">Deine Meilensteine bestimmen die Fortschrittsgrafik.</div></header><section class="card"><label class="field-label">Name des Ziels<input class="input" data-goal-field="name" value="'+esc(goalDraft.name)+'" placeholder="z. B. 5 saubere Klimmzüge"></label><label class="field-label">Aktueller Stand<input class="input" data-goal-field="current" value="'+esc(goalDraft.current)+'" placeholder="z. B. 32 kg Unterstützung"></label><label class="field-label">Nächster Meilenstein<input class="input" data-goal-field="next" value="'+esc(goalDraft.next)+'" placeholder="z. B. 25 kg Unterstützung"></label><label class="field-label">Meilensteine – einen pro Zeile<textarea class="input milestones-input" data-goal-field="roadmap" rows="6" placeholder="32 kg Unterstützung&#10;25 kg Unterstützung&#10;20 kg Unterstützung&#10;1 sauberer Klimmzug">'+esc(goalDraft.roadmap.join("\n"))+'</textarea></label><div class="note">Die Reihenfolge der Zeilen bestimmt die Reihenfolge in der Grafik. Trage den aktuellen Stand möglichst genauso ein wie in der Meilensteinliste.</div></section><div class="actions"><button class="primary full-width" data-action="save-goal">Ziel speichern</button><button class="secondary full-width" data-action="go-more">Abbrechen</button></div></div>';
}
function saveGoal(){
 if(!goalDraft)return;const name=document.querySelector('[data-goal-field="name"]'),current=document.querySelector('[data-goal-field="current"]'),next=document.querySelector('[data-goal-field="next"]'),road=document.querySelector('[data-goal-field="roadmap"]');
 if(name)goalDraft.name=name.value.trim();if(current)goalDraft.current=current.value.trim();if(next)goalDraft.next=next.value.trim();if(road)goalDraft.roadmap=road.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(!goalDraft.name){alert("Bitte gib dem Ziel einen Namen.");return;}
 const existed=goals.some(g=>g.id===goalDraft.id);
 if(!existed||goalDraft.status==="active"){goals=goals.map(g=>Object.assign({},g,{status:g.id===goalDraft.id?"active":(g.status==="active"?"inactive":g.status)}));goalDraft.status="active";put("fitness.activeGoal",goalDraft.id);}
 const normalized=normalizeGoal(goalDraft);if(existed)goals=goals.map(g=>g.id===normalized.id?normalized:g);else goals.push(normalized);setGoals();goalDraft=null;nav("more");
}
function activateGoal(id){const g=goals.find(x=>x.id===id);if(!g||g.status==="completed")return;goals=goals.map(x=>Object.assign({},x,{status:x.id===id?"active":(x.status==="active"?"inactive":x.status)}));put("fitness.activeGoal",id);setGoals();render()}
function completeGoal(id){const g=goals.find(x=>x.id===id);if(!g)return;if(!confirm("Ziel „"+g.name+"“ als erreicht markieren?"))return;goals=goals.map(x=>x.id===id?Object.assign({},x,{status:"completed"}):(x.status==="active"?Object.assign({},x,{status:"inactive"}):x));localStorage.removeItem("fitness.activeGoal");setGoals();render()}
function exportJSON(){
 const payload={schemaVersion:1,exportedAt:new Date().toISOString(),application:"Fitness Trainingstagebuch",activePlanId:(activePlan()||{}).id||null,activeGoalId:(activeGoal()||{}).id||null,plans:plans.map(normalizePlan),goals:goals.map(normalizeGoal),workouts:sortedWorkouts()};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="fitness-trainingsdaten-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function handleAction(b){
 const a=b.dataset.action,id=b.dataset.id,i=Number(b.dataset.index);
 if(a==="start-training")startTraining();else if(a==="back-home")nav("home");else if(a==="finish-workout")finishWorkout();else if(a==="discard-draft")discardDraft();
 else if(a==="toggle-done"){syncDraftFromDom();const x=draft&&draft.items[i];if(x){x.done=!x.done;if(x.done)x.skipped=false;put("fitness.draft",draft);render();}}
 else if(a==="toggle-skipped"){syncDraftFromDom();const x=draft&&draft.items[i];if(x){x.skipped=!x.skipped;if(x.skipped)x.done=false;put("fitness.draft",draft);render();}}
 else if(a==="move-exercise-up"||a==="move-exercise-down"){syncDraftFromDom();const n=i+(a==="move-exercise-up"?-1:1);if(draft&&n>=0&&n<draft.items.length){[draft.items[i],draft.items[n]]=[draft.items[n],draft.items[i]];put("fitness.draft",draft);render();}}
 else if(a==="accept-suggestion"){syncDraftFromDom();if(draft&&draft.items[i]&&draft.items[i].suggestionWeight){draft.items[i].weight=draft.items[i].suggestionWeight;put("fitness.draft",draft);render();}}
 else if(a==="save-weight-default")saveWeightAsDefault(i)
 else if(a==="edit-workout"){editingWorkoutId=id;nav("history-edit");}else if(a==="delete-workout")deleteWorkout(id);else if(a==="save-history-edit")saveHistoryEdit(id);else if(a==="go-history")nav("history");
 else if(a==="new-plan")newPlan();else if(a==="edit-plan")editPlan(id);else if(a==="activate-plan")activatePlan(id);else if(a==="archive-plan")archivePlan(id);else if(a==="delete-plan")deletePlan(id);else if(a==="add-plan-exercise")addPlanExercise();else if(a==="remove-plan-exercise")removePlanExercise(i);else if(a==="plan-ex-up")movePlanExercise(i,-1);else if(a==="plan-ex-down")movePlanExercise(i,1);else if(a==="save-plan")savePlan();
 else if(a==="go-more"){planDraft=null;goalDraft=null;nav("more");}else if(a==="new-goal")newGoal();else if(a==="edit-goal")editGoal(id);else if(a==="edit-active-goal"){const g=activeGoal();if(g)editGoal(g.id);else newGoal();}else if(a==="save-goal")saveGoal();else if(a==="activate-goal")activateGoal(id);else if(a==="complete-goal")completeGoal(id);else if(a==="go-goals"||a==="go-plans")nav("more");else if(a==="export-json")exportJSON();
}
document.getElementById("app").addEventListener("click",event=>{const b=event.target.closest("[data-action]");if(b&&!b.disabled)handleAction(b)});
document.getElementById("app").addEventListener("input",event=>{
 const el=event.target;if(el.classList.contains("workout-input")&&route()==="train"){const i=Number(el.dataset.index);if(!draft||!draft.items[i])return;if(el.dataset.field==="weight")draft.items[i].weight=el.value;if(el.dataset.field==="rep")draft.items[i].reps[Number(el.dataset.repIndex)]=el.value;put("fitness.draft",draft);}
});
window.addEventListener("hashchange",render);
if(!location.hash)location.hash="home";
render();
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js?v=9",{scope:"./"}).catch(error=>console.warn("Service Worker konnte nicht registriert werden.",error));
