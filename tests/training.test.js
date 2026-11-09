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
      get hash() { return this._hash; },
      set hash(value) { this._hash = value.startsWith("#") ? value : "#" + value; }
    },
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
    startTraining, chooseTraining, finishWorkout, normalizeWorkout, historyView, progressCombinedChart,
    exportJSON, shareJSON, more, getDraft: () => draft, getWorkouts: () => workouts, getScreen: () => document.getElementById("app").innerHTML,
    renderChoice: () => trainingChoice()
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
