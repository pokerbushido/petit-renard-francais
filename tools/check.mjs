#!/usr/bin/env node
/* Check eseguibile del progetto: carica i file dati in un contesto vm
   (non sono moduli ES, sono script con globali) e verifica gli invarianti.
   Uso: node tools/check.mjs */
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["data.js", "mascot.js"]; // i task successivi aggiungono story.js e progress.js

const ctx = createContext({ window: {}, console });
for (const name of FILES) {
  runInContext(readFileSync(join(ROOT, name), "utf8"), ctx, { filename: name });
}
const G = (expr) => runInContext(expr, ctx);

const UNITS = G("UNITS");
const GAMES = G("GAMES");

let checks = 0;
const check = (name, fn) => { fn(); checks++; };

check("ogni unità ha id univoco", () => {
  const ids = UNITS.map(u => u.id);
  assert.equal(new Set(ids).size, ids.length, "id di unità duplicati: " + ids.join(","));
});

check("ogni unità ha almeno 5 parole", () => {
  for (const u of UNITS) {
    assert.ok(u.words.length >= 5, `unità ${u.id}: solo ${u.words.length} parole`);
  }
});

check("ogni parola ha fr, it e un visual", () => {
  for (const u of UNITS) {
    for (const w of u.words) {
      assert.ok(w.fr && w.it, `unità ${u.id}: parola senza fr/it: ${JSON.stringify(w)}`);
      assert.ok(w.e || w.hex || w.n !== undefined,
        `unità ${u.id}: "${w.fr}" non ha né emoji (e), né colore (hex), né numero (n)`);
    }
  }
});

check("ogni emoji di parola ha un asset scaricato", () => {
  const mapSrc = readFileSync(join(ROOT, "assets-map.js"), "utf8");
  for (const u of UNITS) {
    for (const w of u.words) {
      if (!w.e) continue;
      assert.ok(mapSrc.includes(`"${w.e}"`),
        `unità ${u.id}: emoji ${w.e} ("${w.fr}") manca in assets-map.js — esegui python3 tools/fetch_assets.py`);
    }
  }
});

check("ogni gioco ha id univoco", () => {
  const ids = GAMES.map(g => g.id);
  assert.equal(new Set(ids).size, ids.length, "id di gioco duplicati");
});

const foxSvg = G("foxSvg"), pieSvg = G("pieSvg");
const FOX_POSES = G("FOX_POSES"), PIE_POSES = G("PIE_POSES");

check("le sei pose di Foxy esistono e producono SVG", () => {
  // Array.from: FOX_POSES arriva dal contesto vm, deepEqual tra realm diversi
  // fallisce con "same structure but not reference-equal" pur essendo identico.
  assert.deepEqual(Array.from(FOX_POSES), ["idle","parle","saute","montre","curieux","salue"]);
  for (const pose of FOX_POSES) {
    const svg = foxSvg(pose);
    assert.ok(svg.startsWith("<svg"), `posa ${pose}: non è un SVG`);
    assert.ok(svg.includes(`fox-${pose}`), `posa ${pose}: manca la classe fox-${pose}`);
    assert.ok(svg.includes("viewBox"), `posa ${pose}: manca il viewBox`);
  }
});

check("le tre pose di Pipelette esistono", () => {
  assert.deepEqual(Array.from(PIE_POSES), ["vole","rit","boude"]);
  for (const pose of PIE_POSES) assert.ok(pieSvg(pose).startsWith("<svg"));
});

check("posa sconosciuta non lancia, ricade su idle", () => {
  assert.equal(foxSvg("inesistente"), foxSvg("idle"));
  assert.equal(pieSvg(""), pieSvg("vole"));
});

check("nessuna posa triste di Foxy legata all'errore", () => {
  assert.ok(!FOX_POSES.some(p => /triste|sad|pleure|cry/i.test(p)),
    "vincolo di design: Foxy non è mai triste per colpa del bambino");
});

console.log(`✅ ${checks} check passati (${UNITS.length} unità, ${UNITS.reduce((n,u)=>n+u.words.length,0)} parole)`);
