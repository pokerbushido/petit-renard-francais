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
const FILES = ["data.js", "story.js", "mascot.js", "progress.js"];

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

check("tutte le 18 unità del viaggio esistono", () => {
  const attese = ["animaux","couleurs","nombres","nourriture","corps","famille","vetements",
    "salutations","maison","ferme","meteo","marche","transports","ecole","mer","montagne","sport","fete"];
  const presenti = UNITS.map(u => u.id);
  for (const id of attese) assert.ok(presenti.includes(id), `manca l'unità "${id}"`);
  assert.equal(UNITS.length, 18, `attese 18 unità, trovate ${UNITS.length}`);
});

check("ogni unità ha 8-12 parole", () => {
  for (const u of UNITS) {
    assert.ok(u.words.length >= 8 && u.words.length <= 12,
      `unità ${u.id}: ${u.words.length} parole (attese 8-12)`);
  }
});

check("nessuna parola francese è duplicata fra unità diverse", () => {
  const visto = new Map();
  for (const u of UNITS) for (const w of u.words) {
    if (visto.has(w.fr)) assert.fail(`"${w.fr}" è sia in ${visto.get(w.fr)} sia in ${u.id}`);
    visto.set(w.fr, u.id);
  }
});

check("nessun emoji rappresenta due parole diverse", () => {
  const visto = new Map();
  for (const u of UNITS) for (const w of u.words) {
    if (!w.e) continue;
    if (visto.has(w.e) && visto.get(w.e).fr !== w.fr) {
      const p = visto.get(w.e);
      assert.fail(`l'emoji ${w.e} è sia "${p.fr}" (${p.unit}) sia "${w.fr}" (${u.id}): per chi non sa leggere la figura È la parola`);
    }
    visto.set(w.e, {fr: w.fr, unit: u.id});
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

const REGIONS = G("REGIONS"), CHAPTERS = G("CHAPTERS");

check("ogni capitolo ha id univoco", () => {
  const ids = CHAPTERS.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length, "id di capitolo duplicati");
});

check("ogni capitolo punta a un'unità esistente", () => {
  const unitIds = new Set(UNITS.map(u => u.id));
  for (const c of CHAPTERS) {
    assert.ok(unitIds.has(c.unitId), `capitolo ${c.id}: unitId "${c.unitId}" non esiste in data.js`);
  }
});

check("ogni capitolo punta a una regione esistente", () => {
  const regionIds = new Set(REGIONS.map(r => r.id));
  for (const c of CHAPTERS) {
    assert.ok(regionIds.has(c.regionId), `capitolo ${c.id}: regionId "${c.regionId}" non esiste`);
  }
});

check("nessuna unità resta fuori dal percorso", () => {
  const used = new Set(CHAPTERS.map(c => c.unitId));
  // Fase 2: i capitoli arrivano nel Task 12. Questa eccezione deve sparire lì:
  // il secondo ciclo la fa fallire non appena un capitolo referenzia queste unità.
  const senzaCapitolo = ["maison","ferme","meteo","marche","transports","ecole","mer","montagne","sport","fete"];
  for (const u of UNITS) {
    if (senzaCapitolo.includes(u.id)) continue;
    assert.ok(used.has(u.id), `unità ${u.id} non è referenziata da nessun capitolo`);
  }
  for (const id of senzaCapitolo) {
    assert.ok(!used.has(id), `l'unità ${id} ha ora un capitolo: togli "${id}" dall'eccezione di fase 2`);
  }
});

check("un'unità non è usata da due capitoli", () => {
  const used = CHAPTERS.map(c => c.unitId);
  assert.equal(new Set(used).size, used.length, "due capitoli condividono la stessa unità");
});

check("ogni capitolo ha una cutscene da 3-5 beat validi", () => {
  for (const c of CHAPTERS) {
    assert.ok(c.cutscene.length >= 3 && c.cutscene.length <= 5,
      `capitolo ${c.id}: ${c.cutscene.length} beat (attesi 3-5)`);
    for (const b of c.cutscene) {
      assert.ok(b.text && b.text.length <= 120, `capitolo ${c.id}: battuta assente o troppo lunga`);
      if (b.fox) assert.ok(FOX_POSES.includes(b.fox), `capitolo ${c.id}: posa fox "${b.fox}" inesistente`);
      if (b.pie) assert.ok(PIE_POSES.includes(b.pie), `capitolo ${c.id}: posa pie "${b.pie}" inesistente`);
    }
  }
});

check("ogni capitolo ha un amico di tappa", () => {
  for (const c of CHAPTERS) {
    assert.ok(c.friend && c.friend.emoji && c.friend.name && c.friend.line,
      `capitolo ${c.id}: friend incompleto`);
  }
});

check("i capitoli sono raggruppati per regione senza salti", () => {
  const seen = [];
  for (const c of CHAPTERS) if (seen[seen.length-1] !== c.regionId) seen.push(c.regionId);
  assert.equal(new Set(seen).size, seen.length,
    "una regione compare in due blocchi non contigui: l'ordine dei capitoli è sbagliato");
});

check("ogni emoji di capitolo ha un asset scaricato", () => {
  const mapSrc = readFileSync(join(ROOT, "assets-map.js"), "utf8");
  for (const c of CHAPTERS) {
    // Check friend emoji
    if (c.friend && c.friend.emoji) {
      assert.ok(mapSrc.includes(`"${c.friend.emoji}"`),
        `capitolo ${c.id}: friend emoji ${c.friend.emoji} ("${c.friend.name}") manca in assets-map.js — esegui python3 tools/fetch_assets.py`);
    }
    // Check cutscene emoji
    for (const b of c.cutscene) {
      if (b.emoji) {
        assert.ok(mapSrc.includes(`"${b.emoji}"`),
          `capitolo ${c.id}: emoji di scena ${b.emoji} manca in assets-map.js — esegui python3 tools/fetch_assets.py`);
      }
    }
  }
});

const P = G(`({chapterIndex, isChapterDone, isChapterGold, currentChapterIndex,
  isChapterUnlocked, completeChapterPatch, unlockedUnitIds, availableGameIds,
  nextGameFor, buildChapterRounds, migrateV1, STORAGE_KEY_V2})`);

const profile = (over = {}) => ({
  id:"p1", name:"Test", avatar:"🦊", mode:"read", scores:{}, chapters:{}, ...over
});

check("il primo capitolo è sempre sbloccato, il secondo no", () => {
  const p = profile();
  assert.equal(P.isChapterUnlocked(p, CHAPTERS[0].id), true);
  assert.equal(P.isChapterUnlocked(p, CHAPTERS[1].id), false);
});

check("completare un capitolo sblocca il successivo", () => {
  const p = profile();
  const p2 = {...p, ...P.completeChapterPatch(p, CHAPTERS[0].id, 2)};
  assert.equal(P.isChapterDone(p2, CHAPTERS[0].id), true);
  assert.equal(P.isChapterUnlocked(p2, CHAPTERS[1].id), true);
});

check("un capitolo completato con errori dà la stella ma non l'oro", () => {
  const p = profile();
  const p2 = {...p, ...P.completeChapterPatch(p, CHAPTERS[0].id, 3)};
  assert.equal(P.isChapterDone(p2, CHAPTERS[0].id), true);
  assert.equal(P.isChapterGold(p2, CHAPTERS[0].id), false);
});

check("rigiocarlo senza errori dà l'oro e non toglie mai il done", () => {
  const p = profile();
  const p2 = {...p, ...P.completeChapterPatch(p, CHAPTERS[0].id, 3)};
  const p3 = {...p2, ...P.completeChapterPatch(p2, CHAPTERS[0].id, 0)};
  assert.equal(P.isChapterGold(p3, CHAPTERS[0].id), true);
  const p4 = {...p3, ...P.completeChapterPatch(p3, CHAPTERS[0].id, 5)};
  assert.equal(P.isChapterDone(p4, CHAPTERS[0].id), true, "il done non si perde mai");
  assert.equal(P.isChapterGold(p4, CHAPTERS[0].id), true, "l'oro non si perde mai");
});

check("completeChapterPatch non muta il profilo di partenza", () => {
  const p = profile();
  const before = JSON.stringify(p);
  P.completeChapterPatch(p, CHAPTERS[0].id, 0);
  assert.equal(JSON.stringify(p), before, "mutazione del profilo originale");
});

check("un capitolo completato resta rigiocabile", () => {
  const p = profile();
  const p2 = {...p, ...P.completeChapterPatch(p, CHAPTERS[0].id, 0)};
  assert.equal(P.isChapterUnlocked(p2, CHAPTERS[0].id), true);
});

check("gioca libero mostra solo le unità dei capitoli sbloccati", () => {
  // Array.from: unlockedUnitIds nasce da .map() su CHAPTERS del realm vm,
  // deepEqual fallirebbe per identità di realm pur essendo lo stesso contenuto.
  const p = profile();
  assert.deepEqual(Array.from(P.unlockedUnitIds(p)), [CHAPTERS[0].unitId]);
  const p2 = {...p, ...P.completeChapterPatch(p, CHAPTERS[0].id, 0)};
  assert.deepEqual(Array.from(P.unlockedUnitIds(p2)), [CHAPTERS[0].unitId, CHAPTERS[1].unitId]);
});

check("la modalità ascolto esclude i giochi di lettura", () => {
  assert.deepEqual(Array.from(P.availableGameIds(profile({mode:"listen"}))), ["explore","find","memory"]);
  assert.equal(P.availableGameIds(profile({mode:"read"})).length, 5);
});

check("la ri-proposta avviene sempre in un gioco diverso", () => {
  const avail = ["explore","find","memory","read","spell"];
  for (const last of avail) {
    for (let i = 0; i < 20; i++) {
      assert.notEqual(P.nextGameFor(last, avail), last, `nextGameFor ha ripetuto ${last}`);
    }
  }
});

check("con un solo gioco disponibile nextGameFor non va in loop", () => {
  assert.equal(P.nextGameFor("explore", ["explore"]), "explore");
});

check("un capitolo produce n round giocabili e mai due volte lo stesso gioco di fila", () => {
  const u = UNITS.find(x => x.id === CHAPTERS[0].unitId);
  const rounds = P.buildChapterRounds(u, profile(), P.availableGameIds(profile()), 6);
  assert.equal(rounds.length, 6);
  for (const r of rounds) {
    assert.ok(r.word && r.gameId, "round malformato");
    assert.ok(u.words.includes(r.word), "parola fuori dall'unità del capitolo");
  }
  for (let i = 1; i < rounds.length; i++) {
    assert.notEqual(rounds[i].gameId, rounds[i-1].gameId, "due round consecutivi con lo stesso gioco");
  }
});

check("le parole sbagliate in passato compaiono per prime", () => {
  const u = UNITS.find(x => x.id === CHAPTERS[0].unitId);
  const hard = u.words[u.words.length - 1];
  const p = profile({miss: {[`${u.id}|${hard.fr}`]: 3}});
  const rounds = P.buildChapterRounds(u, p, P.availableGameIds(p), 6);
  assert.equal(rounds[0].word, hard, "la parola sbagliata non è stata messa per prima");
});

check("la migrazione conserva stelle, nome e avatar", () => {
  const v1 = {profiles:[{id:"a", name:"Bimbo", avatar:"🐼", mode:"listen",
    scores:{[CHAPTERS[0].unitId]:{explore:3, find:2}}, miss:{x:1}}], activeId:"a"};
  const v2 = P.migrateV1(v1);
  assert.equal(v2.profiles[0].name, "Bimbo");
  assert.equal(v2.profiles[0].avatar, "🐼");
  assert.deepEqual(v2.profiles[0].scores, v1.profiles[0].scores);
  assert.deepEqual(v2.profiles[0].miss, v1.profiles[0].miss);
  assert.equal(v2.activeId, "a");
});

check("la migrazione segna come fatti i capitoli dei mondi già giocati", () => {
  const v1 = {profiles:[{id:"a", name:"B", avatar:"🦊", mode:"read",
    scores:{[CHAPTERS[0].unitId]:{explore:3}, [CHAPTERS[1].unitId]:{find:1}}}], activeId:"a"};
  const p = P.migrateV1(v1).profiles[0];
  assert.equal(P.isChapterDone(p, CHAPTERS[0].id), true);
  assert.equal(P.isChapterDone(p, CHAPTERS[1].id), true);
  assert.equal(P.isChapterDone(p, CHAPTERS[2].id), false);
  assert.equal(P.isChapterUnlocked(p, CHAPTERS[2].id), true, "deve poter continuare da lì");
});

check("la migrazione si ferma al primo buco, non salta avanti", () => {
  const v1 = {profiles:[{id:"a", name:"B", avatar:"🦊", mode:"read",
    scores:{[CHAPTERS[0].unitId]:{explore:3}, [CHAPTERS[3].unitId]:{find:3}}}], activeId:"a"};
  const p = P.migrateV1(v1).profiles[0];
  assert.equal(P.isChapterDone(p, CHAPTERS[0].id), true);
  assert.equal(P.isChapterDone(p, CHAPTERS[1].id), false);
  assert.equal(P.isChapterDone(p, CHAPTERS[3].id), false,
    "un mondo giocato fuori sequenza non deve sbloccare mezzo percorso");
});

check("la migrazione regge input corrotti senza lanciare", () => {
  for (const bad of [null, {}, {profiles:null}, {profiles:[{}]}, "spazzatura", {profiles:[{id:"x"}]}]) {
    const out = P.migrateV1(bad);
    assert.ok(Array.isArray(out.profiles), `migrateV1(${JSON.stringify(bad)}) non ha prodotto profiles`);
  }
});

check("la chiave v2 è diversa dalla v1", () => {
  assert.equal(P.STORAGE_KEY_V2, "petitrenard_v2");
});

console.log(`✅ ${checks} check passati (${UNITS.length} unità, ${UNITS.reduce((n,u)=>n+u.words.length,0)} parole, ${CHAPTERS.length} capitoli)`);
