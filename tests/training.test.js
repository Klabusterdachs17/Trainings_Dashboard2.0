"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadApp() {
  const store = new Map();
  const root = { innerHTML: "", addEventListener() {} };
  const document = {
    body: { appendChild() {} },
    getElementById() { return root; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    createElement() { return { click() {}, remove() {} }; }
  };
  const context = {
    document,
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); },
      removeItem(key) { store.delete(key); }
    },
    location: {
      _hash: "",
      search: "",
      pathname: "/",
      get hash() { return this._hash; },
      set hash(value) { this._hash = value.startsWith("#") ? value : "#" + value; }
    },
    URLSearchParams,
    window: { addEventListener() {} },
    navigator: {
      serviceWorker: { register() { return Promise.resolve(); } },
      canShare() { return true; },
      async share(data) { context.sharedData = data; }
    },
    alert() {},
    confirm() { return true; },
    console: { warn() {}, error() {} },
    Blob: class { constructor(parts) { context.exportedText = parts.join(""); } },
    File: class { constructor(parts, name, options) { this.content = parts.join(""); this.name = name; this.type = options.type; } },
    setTimeout(callback) { callback(); },
    URL: { createObjectURL() { return "blob:test"; }, revokeObjectURL() {} }
  };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  vm.runInContext(source + `\nglobalThis.testApi = {
    recommendedTrainingVariant, todaySetCount, activePlan, freshDraft, trainingChoice,
    startTraining, chooseTraining, finishWorkout, normalizeWorkout, historyView, setHistoryFilter, progressCombinedChart, progress, setProgressMode, setProgressRange,
    exportJSON, shareJSON, more, getDraft: () => draft, getWorkouts: () => workouts, getScreen: () => document.getElementById("app").innerHTML,
    renderChoice: () => trainingChoice(),
    getHistoryFilter: () => historyFilter,
    getProgressMode: () => progressMode, getProgressRange: () => progressRange
  };`, context);
  return { api: context.testApi, store, context };
}

test("weekday recommendation short, weekend recommendation full; user can override", () => {
  const { api } = loadApp();
  assert.equal(api.recommendedTrainingVariant(new Date(2026, 10, 9)), "short"); // Monday
  assert.equal(api.recommendedTrainingVariant(new Date(2026, 10, 14)), "full"); // Saturday
  assert.equal(api.recommendedTrainingVariant(new Date(2026, 10, 15)), "full"); // Sunday
  const choice = api.renderChoice();
  assert.match(choice, /Vollständiges Training/);
  assert.match(choice, /Verkürztes Training/);
  assert.match(choice, /Empfohlen/);
  api.startTraining();
  assert.match(api.getScreen(), /data-variant="full"/);
  assert.match(api.getScreen(), /data-variant="short"/);
  api.chooseTraining("full"); // selecting full remains possible on a weekday
  assert.equal(api.getDraft().trainingVariant, "full");
  const short = api.freshDraft("short");
  const full = api.freshDraft("full");
  assert.equal(short.trainingVariant, "short");
  assert.equal(full.trainingVariant, "full");
  assert.deepEqual(Array.from(short.items, x => x.exerciseId), Array.from(full.items, x => x.exerciseId));
  assert.deepEqual(Array.from(short.items, x => x.weight), Array.from(full.items, x => x.weight));
  assert.ok(short.items.some((item, i) => item.reps.length < full.items[i].reps.length));
});

test("selected variant survives workout completion, history normalization, and JSON export", () => {
  const { api, store, context } = loadApp();
  api.chooseTraining("short");
  const draft = api.getDraft();
  assert.equal(draft.trainingVariant, "short");
  draft.items.forEach(item => { item.done = true; item.reps = item.reps.map(() => "8"); });
  api.finishWorkout();
  const saved = JSON.parse(store.get("fitness.workouts"))[0];
  assert.equal(saved.trainingVariant, "short");
  assert.equal(api.normalizeWorkout(saved).trainingVariant, "short");
  assert.match(api.historyView(), /Verkürzt/);
  assert.equal(api.normalizeWorkout({ date: "01.01.2020", items: [] }).trainingVariant, null);
  api.exportJSON();
  assert.equal(JSON.parse(context.exportedText).workouts[0].trainingVariant, "short");
});

test("combined chart renders aligned weights, set bars, shared dates, and SVG overlay", () => {
  const { api } = loadApp();
  const html = api.progressCombinedChart([
    { weight: "20 kg", reps: [8, 9], workout: { date: "01.11.2026" } },
    { weight: "22,5 kg", reps: [10, 8, 7], workout: { date: "08.11.2026" } }
  ], "load");
  assert.match(html, /class="combined-weight-line"/);
  assert.match(html, /<polyline points="30,54 96,16"/);
  assert.match(html, /viewBox="0 0 126 66"/);
  assert.equal((html.match(/class="combined-session"/g) || []).length, 2);
  assert.equal((html.match(/class="combined-date"/g) || []).length, 2);
  assert.match(html, /01\.11/);
  assert.match(html, /08\.11/);
  assert.equal((html.match(/class="combined-rep-bar"/g) || []).length, 5);
  assert.match(html, /20 kg/);
  assert.match(html, /22,5 kg/);
});

test("ChatGPT share button offers the JSON file and preserves download fallback", async () => {
  const { api, context } = loadApp();
  assert.match(api.more(), /data-action="share-json"/);
  assert.match(api.more(), /data-action="export-json"/);
  await api.shareJSON();
  assert.equal(context.sharedData.files[0].type, "application/json");
  assert.match(context.sharedData.files[0].name, /^fitness-trainingsdaten-.*\.json$/);
  assert.match(context.sharedData.text, /ChatGPT/);
  assert.equal(JSON.parse(context.sharedData.files[0].content).schemaVersion, 1);

  context.navigator.canShare = () => false;
  await api.shareJSON();
  assert.equal(JSON.parse(context.exportedText).schemaVersion, 1);
});

test("history filters show app sessions, imported workouts, and linked health data", () => {
  const { api } = loadApp();
  const initial = api.getWorkouts().length;
  const linkedWorkout = api.getWorkouts()[0];
  const healthData = { provider: "google-health", displayName: "Workout", elapsedSeconds: 3600,
    activeDurationSeconds: 3300, activeZoneMinutes: 24, minutesByZone: {},
    weightedMinutesByZone: {}, telemetryAvailable: false };
  linkedWorkout.googleHealth = healthData;
  const linkedBefore = api.getWorkouts().filter(workout => workout.googleHealth).length;
  api.getWorkouts().push({
    id: "google-only", source: "google-health", date: "15.11.2026",
    planName: "Google Health · Workout", planId: "google-health", items: [],
    googleHealth: healthData
  });
  let html=api.historyView();
  assert.match(html,new RegExp("Alle <span>"+(initial+1)+"<\\/span>"));
  assert.match(html,new RegExp("App-Trainings <span>"+initial+"<\\/span>"));
  assert.match(html,new RegExp("Google Health <span>"+(linkedBefore+1)+"<\\/span>"));
  assert.match(html,/Google Health importiert/);
  assert.match(html,/Gesamtdauer/);
  assert.match(html,/Zonenminuten/);
  api.setHistoryFilter("app");
  assert.equal(api.getHistoryFilter(),"app");
  html=api.historyView();
  assert.equal((html.match(/class="card history-card"/g)||[]).length,initial);
  assert.doesNotMatch(html,/Google Health importiert/);
  assert.match(html,/App \+ Google Health/);
  api.setHistoryFilter("google");
  html=api.historyView();
  assert.equal((html.match(/class="card history-card"/g)||[]).length,linkedBefore+1);
  assert.match(html,/App \+ Google Health/);
  assert.match(html,/Google Health importiert/);
});

test("progress page preserves strength view and summarizes Google Health load by range", () => {
  const { api } = loadApp();
  const existing = api.getWorkouts()[0];
  const today = new Date().toLocaleDateString("de-DE");
  existing.date = today;
  const health = { provider: "google-health", displayName: "Workout", exerciseType: "WORKOUT",
    elapsedSeconds: 3600, activeDurationSeconds: 3300, activeZoneMinutes: 24,
    minutesByZone: { fatBurn: 18, cardio: 3, peak: 0 },
    weightedMinutesByZone: { fatBurn: 18, cardio: 6, peak: 0 }, telemetryAvailable: true };
  existing.googleHealth = health;
  api.getWorkouts().push({ id: "google-progress-only", source: "google-health", date: today,
    planId: "google-health", planName: "Google Health · Workout", items: [],
    googleHealth: { ...health, displayName: "Workout ohne Zonendetails", telemetryAvailable: false,
      activeZoneMinutes: 12, elapsedSeconds: 1800, activeDurationSeconds: 1600,
      weightedMinutesByZone: { fatBurn: 0, cardio: 0, peak: 0 } } });
  api.setProgressMode("load");
  api.setProgressRange("all");
  const html = api.progress();
  assert.match(html, /Kraft/);
  assert.match(html, /Belastung/);
  assert.match(html, /4 Wochen/);
  assert.match(html, /12 Wochen/);
  assert.match(html, /Gesamtdauer/);
  assert.match(html, /Aktive Zeit/);
  assert.match(html, /36 ZM/);
  assert.match(html, /Zonenminuten pro Training/);
  assert.match(html, /Trainingsdauer/);
  assert.match(html, /Nicht aufgeschlüsselt/);
  assert.match(html, /Workout ohne Zonendetails/);
  assert.equal((html.match(/class="load-bar-item"/g)||[]).length, 4);
  api.setProgressRange("4");
  assert.equal(api.getProgressRange(), "4");
  assert.match(api.progress(), /4 Wochen/);
  assert.equal((api.progress().match(/class="load-bar-item"/g)||[]).length, 4);
  api.setProgressMode("strength");
  assert.match(api.progress(), /KRAFTENTWICKLUNG/);
  assert.match(api.progress(), /combined-weight-line/);
});
