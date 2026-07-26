# Le Grand Voyage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trasformare Le Petit Renard in un percorso narrativo a 18 capitoli, con mascotte SVG ricorrenti (Foxy e Pipelette), cutscene animate e mappa a nodi sequenziale, senza perdere i progressi esistenti dei bambini.

**Architecture:** Si resta su vanilla JS servito da file statici, senza build step: `index.html` carica una sequenza di `<script>` in ordine di dipendenza e ogni file espone le sue funzioni su `window`, come già fa il codice attuale. `app.js` (oggi 820 righe) viene spezzato: i cinque giochi escono in `games.js`, e la novità entra in quattro file nuovi — `story.js` (dati narrativi), `progress.js` (logica pura di progressione, zero DOM), `mascot.js` (generatori SVG), `cutscene.js` (motore scene), `map.js` (schermata avventura). La logica pura in `progress.js` è testabile headless con Node.

**Tech Stack:** JavaScript ES2020 vanilla (no moduli ES, no bundler, no dipendenze runtime), CSS3 keyframes, SVG inline, Web Speech API, Web Audio API, `localStorage`. Test harness: Node 22 con `node:vm` + `node:assert`. Asset: emoji Noto via `tools/fetch_assets.py` (Python 3, solo stdlib).

## Global Constraints

Ogni task eredita implicitamente questi vincoli.

- **Nessuno stato di fallimento.** Il bambino non perde mai, non viene mai bloccato, non riceve mai punteggio negativo. Un errore produce incoraggiamento e ri-proposta della parola in un **gioco diverso**.
- **Foxy non è mai triste per colpa del bambino.** Nessuna posa triste/piangente legata a un errore. `curieux` è la posa di reazione all'errore. `salue` è l'unica posa di chiusura sessione.
- **Nessun build step.** Solo `<script src>` in `index.html`, in ordine di dipendenza. Niente `import`/`export` nei file dell'app, niente bundler, niente dipendenze npm a runtime.
- **Nessuna libreria runtime.** Niente Lottie, niente WASM, niente framework.
- **iPad Safari è il target primario.** Niente WebM, niente autoplay audio, niente `SVGSMIL` (usare CSS keyframes), tap target minimo 44×44 px.
- **Nessun progresso perso.** La chiave `petitrenard_v1` non viene mai cancellata né sovrascritta. La v2 scrive su `petitrenard_v2`.
- **Immutabilità.** Ogni aggiornamento di stato crea un nuovo oggetto (`{...old, patch}`), come già fa `updateProfile` in `app.js:26`.
- **Capitolo = 4-6 minuti** = 6 micro-round + 1 sfida finale.
- **Lingua:** interfaccia e narrazione in italiano, contenuto didattico in francese. Commenti nel codice in italiano (convenzione del repo). Messaggi di commit in inglese.
- **`console.log` vietato** nel codice di produzione (`*.js` alla root). Ammesso solo in `tools/`.

---

### Task 1: Test harness e validazione dei dati esistenti

Prima di toccare qualsiasi cosa serve una rete di sicurezza eseguibile. Il repo non ha framework di test e non ne introduce: un unico script Node che carica i file dati in un contesto `vm` e fa asserzioni.

**Files:**
- Create: `tools/check.mjs`
- Modify: `README.md` (sezione "Sviluppo")

**Interfaces:**
- Consumes: `data.js` (globali `UNITS`, `GAMES`, `AVATARS`, `STICKER_THRESHOLD`)
- Produces: comando `node tools/check.mjs` — esce 0 se tutto ok, 1 con messaggio se no. Ogni task successivo aggiunge asserzioni qui.

- [ ] **Step 1: Scrivi il check che fallisce**

Crea `tools/check.mjs`:

```js
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
const FILES = ["data.js"]; // i task successivi aggiungono story.js e progress.js

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

console.log(`✅ ${checks} check passati (${UNITS.length} unità, ${UNITS.reduce((n,u)=>n+u.words.length,0)} parole)`);
```

- [ ] **Step 2: Esegui il check**

Run: `node tools/check.mjs`
Expected: PASS con il riepilogo (8 unità, ~75 parole). Se fallisce su un asset mancante, quello è un bug reale preesistente: eseguire `python3 tools/fetch_assets.py` e rieseguire.

- [ ] **Step 3: Verifica che il check sappia fallire**

Aggiungi temporaneamente in `data.js`, dentro l'unità `animaux`, la parola `{fr:"le test", it:"il test"}` (senza visual).

Run: `node tools/check.mjs`
Expected: FAIL con `unità animaux: "le test" non ha né emoji (e), né colore (hex), né numero (n)` ed exit code 1.

Rimuovi poi la riga di prova e riesegui: PASS.

- [ ] **Step 4: Documenta il comando**

Aggiungi in fondo a `README.md`:

```markdown
## Sviluppo

Check degli invarianti (dati, capitoli, logica di progressione):

    node tools/check.mjs

Va eseguito prima di ogni commit. Dopo aver aggiunto parole nuove:

    python3 tools/fetch_assets.py && node tools/check.mjs
```

- [ ] **Step 5: Commit**

```bash
git add tools/check.mjs README.md
git commit -m "test: add runnable data invariant check"
```

---

### Task 2: Estrai i cinque giochi in `games.js`

Refactor puro e meccanico, a comportamento invariato: serve prima di aggiungere il capitolo runner, altrimenti `app.js` diventa ingestibile.

**Files:**
- Create: `games.js`
- Modify: `app.js:366-656` (rimozione delle cinque funzioni di gioco e degli helper esclusivi), `index.html:118` (nuovo tag script)

**Interfaces:**
- Consumes: da `app.js` — `$`, `em`, `show`, `shuffle`, `speak`, `sfx`, `confetti`, `setDots`, `wordVisual`, `activeProfile`, `pickRounds`, `bumpMiss`, `foxReact`, `starsStr`, `escapeHtml`, `finishGame` (restano tutti in `app.js`, sono globali)
- Produces: globali `startExplore(u)`, `startFind(u, p)`, `startMemory(u, p)`, `startRead(u)`, `startSpell(u)`, `bareWord(w)`, `promptVisual(w)` — stesse firme di oggi

- [ ] **Step 1: Sposta il codice**

Crea `games.js` che inizia con:

```js
"use strict";
/* ============================================================
   I CINQUE GIOCHI — estratti da app.js, comportamento invariato.
   Dipendono dai global helper definiti in app.js.
   ============================================================ */
```

Poi taglia da `app.js` e incolla qui, **senza modificarle**, le righe 366-656: `startExplore`, `startFind`, `startMemory`, `startRead`, `bareWord`, `promptVisual`, `startSpell` con i loro commenti di sezione.

`setDots` e `startGame` **restano** in `app.js` (sono il router dei giochi, non un gioco).

- [ ] **Step 2: Aggiungi lo script**

In `index.html`, la sequenza degli script diventa:

```html
<script src="data.js"></script>
<script src="assets-map.js"></script>
<script src="games.js"></script>
<script src="app.js"></script>
```

`games.js` va **prima** di `app.js`: definisce solo funzioni (hoisted), e `app.js` in coda esegue l'avvio.

- [ ] **Step 3: Verifica manuale nel browser**

Run: `python3 -m http.server 8000` dalla root, poi apri `http://localhost:8000`.
Expected: profilo esistente caricato, e **tutti e cinque i giochi** giocabili fino alla schermata vittoria. Console del browser senza errori (in particolare nessun `ReferenceError`).

- [ ] **Step 4: Verifica che nulla sia rimasto orfano**

Run: `node tools/check.mjs && grep -c "function start" app.js games.js`
Expected: check PASS; `app.js:1` e `games.js:5`. L'unico `start*` che resta in `app.js` è `startGame`, il router: è corretto che ci sia.

- [ ] **Step 5: Commit**

```bash
git add games.js app.js index.html
git commit -m "refactor: extract the five games into games.js"
```

---

### Task 3: Le mascotte SVG (`mascot.js`)

**Files:**
- Create: `mascot.js`
- Modify: `index.html` (script prima di `games.js`), `style.css` (in coda, sezione mascotte)

**Interfaces:**
- Consumes: niente (file autonomo, nessuna dipendenza)
- Produces:
  - `foxSvg(pose, opts)` → `string` di markup SVG. `pose` ∈ `"idle" | "parle" | "saute" | "montre" | "curieux" | "salue"`. `opts` = `{size: number = 120, flip: boolean = false}`. Pose sconosciuta → fallback su `"idle"` (mai eccezione: è UI per bambini).
  - `pieSvg(pose, opts)` → `string`. `pose` ∈ `"vole" | "rit" | "boude"`. Stesse opts, stesso fallback.
  - `FOX_POSES` e `PIE_POSES`: array degli id di posa validi.

- [ ] **Step 1: Scrivi il check che fallisce**

In `tools/check.mjs`, aggiungi `"mascot.js"` all'array `FILES` (dopo `data.js`) e in fondo, prima del `console.log` finale:

```js
const foxSvg = G("foxSvg"), pieSvg = G("pieSvg");
const FOX_POSES = G("FOX_POSES"), PIE_POSES = G("PIE_POSES");

check("le sei pose di Foxy esistono e producono SVG", () => {
  assert.deepEqual(FOX_POSES, ["idle","parle","saute","montre","curieux","salue"]);
  for (const pose of FOX_POSES) {
    const svg = foxSvg(pose);
    assert.ok(svg.startsWith("<svg"), `posa ${pose}: non è un SVG`);
    assert.ok(svg.includes(`fox-${pose}`), `posa ${pose}: manca la classe fox-${pose}`);
    assert.ok(svg.includes("viewBox"), `posa ${pose}: manca il viewBox`);
  }
});

check("le tre pose di Pipelette esistono", () => {
  assert.deepEqual(PIE_POSES, ["vole","rit","boude"]);
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
```

- [ ] **Step 2: Esegui, verifica il fallimento**

Run: `node tools/check.mjs`
Expected: FAIL con `ENOENT ... mascot.js`.

- [ ] **Step 3: Implementa `mascot.js`**

Volpe geometrica, stile flat: testa a triangoli, muso, occhi, coda. Le pose cambiano **rotazioni e attributi**, non ridisegnano il corpo: un solo corpo, sei varianti.

```js
"use strict";
/* ============================================================
   MASCOTTE — Foxy (la volpe guida) e Pipelette (la gazza).
   SVG inline generato: nessun asset, nessuna libreria.
   Le pose cambiano trasformazioni e tratti del viso, non il corpo.
   ============================================================ */

const FOX_POSES = ["idle","parle","saute","montre","curieux","salue"];
const PIE_POSES = ["vole","rit","boude"];

/* palette Foxy */
const FOX = { fur:"#FF8A3D", furDark:"#E86E20", belly:"#FFF3E4", ink:"#3D2B24" };

/* tratti del viso per posa: bocca (path) e occhi (rx/ry) */
const FOX_FACE = {
  idle:    { mouth:"M44 62 q6 5 12 0",        eyeRy:5,   brow:0  },
  parle:   { mouth:"M44 60 q6 10 12 0 q-6 4 -12 0", eyeRy:5, brow:0 },
  saute:   { mouth:"M42 58 q8 12 16 0",       eyeRy:2.5, brow:-3 },
  montre:  { mouth:"M44 62 q6 4 12 0",        eyeRy:5,   brow:-2 },
  curieux: { mouth:"M45 63 q5 2 10 0",        eyeRy:6,   brow:-5 },
  salue:   { mouth:"M43 59 q7 9 14 0",        eyeRy:3,   brow:-2 },
};

function foxSvg(pose, opts = {}) {
  const p = FOX_POSES.includes(pose) ? pose : "idle";
  const size = opts.size || 120;
  const face = FOX_FACE[p];
  const flip = opts.flip ? ' transform="scale(-1,1) translate(-100,0)"' : "";
  return `<svg class="mascot-svg fox-${p}" viewBox="0 0 100 110" width="${size}" height="${size * 1.1}" aria-hidden="true"><g${flip}>
  <g class="fox-tail"><path d="M18 84 q-16 -6 -14 -24 q10 12 20 14 z" fill="${FOX.fur}"/>
    <path d="M8 62 q-6 -8 -4 -14 q6 6 10 8 z" fill="${FOX.belly}"/></g>
  <g class="fox-body">
    <ellipse cx="50" cy="86" rx="24" ry="20" fill="${FOX.fur}"/>
    <ellipse cx="50" cy="90" rx="14" ry="13" fill="${FOX.belly}"/>
  </g>
  <g class="fox-arm"><ellipse cx="74" cy="82" rx="7" ry="12" fill="${FOX.furDark}"/></g>
  <g class="fox-head">
    <path d="M28 40 l-4 -22 l18 10 z" fill="${FOX.furDark}"/>
    <path d="M72 40 l4 -22 l-18 10 z" fill="${FOX.furDark}"/>
    <ellipse cx="50" cy="46" rx="26" ry="23" fill="${FOX.fur}"/>
    <path d="M50 52 q-14 2 -18 12 q18 8 36 0 q-4 -10 -18 -12 z" fill="${FOX.belly}"/>
    <g class="fox-eyes" transform="translate(0 ${face.brow})">
      <ellipse cx="41" cy="44" rx="4" ry="${face.eyeRy}" fill="${FOX.ink}"/>
      <ellipse cx="59" cy="44" rx="4" ry="${face.eyeRy}" fill="${FOX.ink}"/>
    </g>
    <ellipse cx="50" cy="56" rx="4.5" ry="3.5" fill="${FOX.ink}"/>
    <path d="${face.mouth}" stroke="${FOX.ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </g>
</g></svg>`;
}

/* palette Pipelette */
const PIE = { body:"#3A3A46", wing:"#5A5A68", belly:"#FDFDF6", beak:"#FFC53D", ink:"#1A1A20" };

const PIE_FACE = { vole:5, rit:2.5, boude:4 };

function pieSvg(pose, opts = {}) {
  const p = PIE_POSES.includes(pose) ? pose : "vole";
  const size = opts.size || 100;
  const eyeRy = PIE_FACE[p];
  const flip = opts.flip ? ' transform="scale(-1,1) translate(-100,0)"' : "";
  return `<svg class="mascot-svg pie-${p}" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><g${flip}>
  <path class="pie-tail" d="M18 62 l-16 14 l18 -2 z" fill="${PIE.body}"/>
  <ellipse cx="52" cy="58" rx="26" ry="20" fill="${PIE.body}"/>
  <ellipse cx="56" cy="62" rx="14" ry="12" fill="${PIE.belly}"/>
  <g class="pie-wing"><ellipse cx="48" cy="52" rx="16" ry="9" fill="${PIE.wing}" transform="rotate(-18 48 52)"/></g>
  <circle cx="70" cy="38" r="15" fill="${PIE.body}"/>
  <ellipse cx="74" cy="36" rx="3.5" ry="${eyeRy}" fill="${PIE.ink}"/>
  <path d="M84 38 l12 4 l-12 4 z" fill="${PIE.beak}"/>
</g></svg>`;
}
```

- [ ] **Step 4: Esegui il check**

Run: `node tools/check.mjs`
Expected: PASS, con i quattro nuovi check sulle mascotte.

- [ ] **Step 5: Anima le pose in CSS**

In coda a `style.css`:

```css
/* ============ MASCOTTE SVG ============ */
.mascot-svg{display:block;overflow:visible;filter:drop-shadow(0 4px 0 rgba(61,43,36,.18))}
.mascot-svg .fox-tail{transform-origin:20px 84px;animation:tailWag 2.4s ease-in-out infinite}
.mascot-svg .fox-head{transform-origin:50px 60px}
@keyframes tailWag{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(10deg)}}

.fox-idle{animation:foxBreathe 3s ease-in-out infinite;transform-origin:bottom center}
@keyframes foxBreathe{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.02)}}

.fox-parle .fox-head{animation:foxTalk .5s ease-in-out infinite}
@keyframes foxTalk{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg) translateY(-2px)}}

.fox-saute{animation:foxJump .7s cubic-bezier(.3,1.6,.4,1) infinite}
@keyframes foxJump{0%,100%{transform:translateY(0)}40%{transform:translateY(-22px) rotate(-6deg)}}

.fox-montre .fox-arm{transform-origin:74px 74px;animation:foxPoint 1.1s ease-in-out infinite}
@keyframes foxPoint{0%,100%{transform:rotate(0)}50%{transform:rotate(-32deg)}}

.fox-curieux .fox-head{animation:foxTilt 1.8s ease-in-out infinite}
@keyframes foxTilt{0%,100%{transform:rotate(0)}50%{transform:rotate(11deg)}}

.fox-salue .fox-arm{transform-origin:74px 74px;animation:foxWave .55s ease-in-out infinite}
@keyframes foxWave{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(-46deg)}}

.pie-vole .pie-wing{transform-origin:48px 52px;animation:pieFlap .28s ease-in-out infinite}
@keyframes pieFlap{0%,100%{transform:rotate(-18deg)}50%{transform:rotate(-46deg) translateY(-3px)}}
.pie-rit{animation:pieLaugh .4s ease-in-out infinite}
@keyframes pieLaugh{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(6deg) translateY(-4px)}}
.pie-boude .pie-tail{transform-origin:20px 62px;animation:tailWag 1.6s ease-in-out infinite}

@media (prefers-reduced-motion: reduce){
  .mascot-svg,.mascot-svg *{animation:none !important}
}
```

- [ ] **Step 6: Sostituisci l'emoji volpe con Foxy nelle schermate esistenti**

Tre punti in cui oggi c'è `em("🦊")`:
- `app.js:271` (home): `$("homeMascot").innerHTML = foxSvg("salue", {size:96});`
- `app.js:676` (schermata vittoria): `<div class="wmascot">${foxSvg("saute", {size:130})}</div>`
- `games.js`, dentro `startExplore`: `<div class="mascot">${foxSvg("montre", {size:88})}</div>`

In `index.html` inserisci `<script src="mascot.js"></script>` **prima** di `games.js`.

In `style.css` la regola `.mascot{font-size:3.4rem;...}` (riga 76) applica `idleBob` a un contenitore che ora ospita un SVG già animato: aggiungi subito dopo `.mascot:has(.mascot-svg){animation:none;font-size:0}` per evitare la doppia animazione.

- [ ] **Step 7: Verifica manuale**

Run: `python3 -m http.server 8000`, apri `http://localhost:8000` su Chrome **e** su Safari.
Expected: in home Foxy saluta agitando il braccio; a fine gioco salta; in "Scopri" indica. Nessun errore in console. Su Safari le animazioni CSS partono (nessun SVG statico).

- [ ] **Step 8: Commit**

```bash
git add mascot.js style.css index.html app.js games.js tools/check.mjs
git commit -m "feat: add Foxy and Pipelette as inline SVG mascots with six poses"
```

---

### Task 4: I dati narrativi (`story.js`) — regioni e primi 8 capitoli

Fase 1 costruisce la storia **sui mondi già esistenti**, così l'app è giocabile end-to-end prima di scrivere contenuto nuovo.

**Files:**
- Create: `story.js`
- Modify: `index.html` (script dopo `data.js`), `tools/check.mjs`, `tools/fetch_assets.py:46` (aggiungi `story.js` alle sorgenti da scansionare)

**Interfaces:**
- Consumes: `UNITS` da `data.js` (per `unitId`)
- Produces:
  - `REGIONS`: array di `{id, it, fr, color, sky, ground}` — `sky`/`ground` sono colori CSS per lo sfondo della mappa.
  - `CHAPTERS`: array **ordinato** di `{id, regionId, unitId, title, friend, cutscene}`.
    - `friend` = `{emoji, name, line}` — l'amico di tappa (emoji Noto, non SVG).
    - `cutscene` = array di 3-5 beat: `{fox, pie, text, speak, emoji}`. `fox` è una posa di `FOX_POSES` (o `null`), `pie` una di `PIE_POSES` (o `null`), `text` la battuta italiana mostrata nel fumetto, `speak` il testo da pronunciare (di norma uguale a `text`; se contiene francese, `{it:"...", fr:"..."}`), `emoji` un prop opzionale di scena.
  - `chapterById(id)` → oggetto capitolo o `undefined`.

- [ ] **Step 1: Scrivi i check che falliscono**

In `tools/check.mjs` aggiungi `"story.js"` a `FILES` (dopo `data.js`, prima di `mascot.js`) e in fondo:

```js
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
  for (const u of UNITS) {
    assert.ok(used.has(u.id), `unità ${u.id} non è referenziata da nessun capitolo`);
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
```

Sposta anche la riga `const FOX_POSES = ...` sopra questi check, se non lo è già.

- [ ] **Step 2: Esegui, verifica il fallimento**

Run: `node tools/check.mjs`
Expected: FAIL con `ENOENT ... story.js`.

- [ ] **Step 3: Implementa `story.js`**

```js
"use strict";
/* ============================================================
   STORIA — Le Grand Voyage.
   Pipelette la gazza ruba le parole francesi di ogni luogo:
   Foxy e il bambino viaggiano per la Francia e le recuperano.
   L'ordine dell'array CHAPTERS È il percorso.
   ============================================================ */

const REGIONS = [
  {id:"village",  it:"Il villaggio",  fr:"Le village",             color:"#FFC53D", sky:"#FFF3D6", ground:"#B8E6A0"},
  {id:"campagne", it:"La campagna",   fr:"La campagne",            color:"#5CB85C", sky:"#DFF5E1", ground:"#9BD97E"},
  {id:"ville",    it:"La città",      fr:"La ville",               color:"#4FA8E8", sky:"#DCEEFB", ground:"#C9C4BC"},
  {id:"cote",     it:"Mare e monti",  fr:"La côte et la montagne", color:"#2FB6C4", sky:"#D6F2F7", ground:"#F3E2B8"},
  {id:"fete",     it:"La festa",      fr:"La fête",                color:"#F272B0", sky:"#FBE4F0", ground:"#E4C9F0"},
];

const CHAPTERS = [
  {
    id:"ch-salutations", regionId:"village", unitId:"salutations",
    title:"Le prime parole",
    friend:{emoji:"👵", name:"Mamie Lulu", line:"Bonjour mes petits ! Chi mi ha rubato i saluti?"},
    cutscene:[
      {fox:"salue", text:"Salut ! Io sono Foxy. Andiamo in Francia insieme?", speak:"Salut! Io sono Foxy. Andiamo in Francia insieme?"},
      {pie:"vole",  emoji:"🎒", text:"Uh oh… quella è Pipelette la gazza! Sta rubando le parole!", speak:"Uh oh! Quella è Pipelette la gazza. Sta rubando le parole!"},
      {pie:"rit",   text:"«Cra cra! Le parole sono mie!» E vola via verso il villaggio.", speak:"Cra cra! Le parole sono mie!"},
      {fox:"montre", text:"Presto, riprendiamole! Cominciamo dai saluti.", speak:"Presto, riprendiamole! Cominciamo dai saluti."},
    ]
  },
  {
    id:"ch-famille", regionId:"village", unitId:"famille",
    title:"La famiglia del villaggio",
    friend:{emoji:"👶", name:"Le petit Léo", line:"Non so più come si chiama la mia maman!"},
    cutscene:[
      {fox:"idle", text:"Léo piange: Pipelette gli ha rubato i nomi della famiglia.", speak:"Léo piange: Pipelette gli ha rubato i nomi della famiglia."},
      {pie:"boude", text:"La gazza li ha nascosti nel suo nido, in cima al camino.", speak:"La gazza li ha nascosti nel suo nido, in cima al camino."},
      {fox:"montre", text:"Aiutiamo Léo a ritrovarli!", speak:"Aiutiamo Léo a ritrovarli!"},
    ]
  },
  {
    id:"ch-couleurs", regionId:"village", unitId:"couleurs",
    title:"Il villaggio senza colori",
    friend:{emoji:"🎨", name:"Pierre le peintre", line:"Il mio quadro è tutto grigio !"},
    cutscene:[
      {fox:"curieux", text:"Guarda: il villaggio è diventato tutto grigio…", speak:"Guarda: il villaggio è diventato tutto grigio."},
      {pie:"rit", emoji:"🎨", text:"Pipelette ha rubato i colori dalla tavolozza di Pierre!", speak:"Pipelette ha rubato i colori dalla tavolozza di Pierre!"},
      {fox:"saute", text:"Riprendiamoli uno per uno e ridipingiamo tutto!", speak:"Riprendiamoli uno per uno e ridipingiamo tutto!"},
    ]
  },
  {
    id:"ch-animaux", regionId:"campagne", unitId:"animaux",
    title:"Gli animali della campagna",
    friend:{emoji:"🐮", name:"Camille la vache", line:"Meuh ! Nessuno sa più chiamarmi per nome."},
    cutscene:[
      {fox:"idle", emoji:"🌻", text:"Usciamo dal villaggio: ecco la campagna!", speak:"Usciamo dal villaggio: ecco la campagna!"},
      {pie:"vole", text:"Pipelette vola sopra il prato con il sacco pieno di nomi di animali.", speak:"Pipelette vola sopra il prato con il sacco pieno di nomi di animali."},
      {fox:"montre", text:"Camille la mucca ci aiuterà. Andiamo!", speak:"Camille la mucca ci aiuterà. Andiamo!"},
    ]
  },
  {
    id:"ch-corps", regionId:"campagne", unitId:"corps",
    title:"Il gioco del corpo",
    friend:{emoji:"🤸", name:"Zoé la gymnaste", line:"Tocca la testa… ma come si dice in francese?"},
    cutscene:[
      {fox:"saute", text:"Zoé fa ginnastica nel prato e ci insegna un gioco.", speak:"Zoé fa ginnastica nel prato e ci insegna un gioco."},
      {pie:"boude", text:"Ma Pipelette le ha rubato i nomi delle parti del corpo!", speak:"Ma Pipelette le ha rubato i nomi delle parti del corpo!"},
      {fox:"montre", text:"Ripetiamoli tutti insieme e li riprendiamo.", speak:"Ripetiamoli tutti insieme e li riprendiamo."},
    ]
  },
  {
    id:"ch-nombres", regionId:"ville", unitId:"nombres",
    title:"I numeri della città",
    friend:{emoji:"🚌", name:"Marcel le chauffeur", line:"Che autobus è? Non so più contare!"},
    cutscene:[
      {fox:"curieux", emoji:"🏙️", text:"Ecco la città! Ma i numeri degli autobus sono spariti.", speak:"Ecco la città! Ma i numeri degli autobus sono spariti."},
      {pie:"rit", text:"«Cra cra! Da uno a dieci, tutti miei!»", speak:"Cra cra! Da uno a dieci, tutti miei!"},
      {fox:"montre", text:"Contiamo insieme in francese e riprendiamoceli.", speak:"Contiamo insieme in francese e riprendiamoceli."},
    ]
  },
  {
    id:"ch-nourriture", regionId:"ville", unitId:"nourriture",
    title:"Il pranzo in città",
    friend:{emoji:"👨‍🍳", name:"Momo le boulanger", line:"Il mio menu è vuoto !"},
    cutscene:[
      {fox:"idle", emoji:"🥖", text:"Che profumo! È la boulangerie di Momo.", speak:"Che profumo! È la panetteria di Momo."},
      {pie:"vole", text:"Pipelette si è portata via tutte le parole del cibo.", speak:"Pipelette si è portata via tutte le parole del cibo."},
      {fox:"saute", text:"Rimettiamo il menu a posto: ho una fame!", speak:"Rimettiamo il menu a posto: ho una fame!"},
    ]
  },
  {
    id:"ch-vetements", regionId:"cote", unitId:"vetements",
    title:"Il vento della costa",
    friend:{emoji:"🧣", name:"Anouk", line:"Fa freddo ! Dov'è la mia écharpe?"},
    cutscene:[
      {fox:"curieux", emoji:"🌊", text:"Siamo arrivati al mare, e tira un vento gelido.", speak:"Siamo arrivati al mare, e tira un vento gelido."},
      {pie:"rit", text:"Pipelette ha usato i vestiti di Anouk per fare il nido!", speak:"Pipelette ha usato i vestiti di Anouk per fare il nido!"},
      {fox:"montre", text:"Nominali tutti in francese e torneranno al loro posto.", speak:"Nominali tutti in francese e torneranno al loro posto."},
      {fox:"saute", text:"E poi… l'ultima parola ci porterà alla festa!", speak:"E poi, l'ultima parola ci porterà alla festa!"},
    ]
  },
];

function chapterById(id){ return CHAPTERS.find(c => c.id === id); }
```

- [ ] **Step 4: Esegui il check**

Run: `node tools/check.mjs`
Expected: PASS con i sette nuovi check dei capitoli.

- [ ] **Step 5: Includi story.js nella scansione emoji**

In `tools/fetch_assets.py`, riga 46, cambia:

```python
    for name in ("data.js", "app.js"):
```

in:

```python
    for name in ("data.js", "app.js", "story.js", "games.js"):
```

Run: `python3 tools/fetch_assets.py && node tools/check.mjs`
Expected: scarica gli emoji nuovi degli amici di tappa (👵 👶 🎨 🐮 🤸 🚌 👨‍🍳 🧣 🎒 🌻 🏙️ 🥖 🌊) e rigenera `assets-map.js`; check PASS.

- [ ] **Step 6: Aggiungi lo script**

In `index.html`, `<script src="story.js"></script>` subito dopo `data.js`.

- [ ] **Step 7: Commit**

```bash
git add story.js index.html tools/check.mjs tools/fetch_assets.py assets-map.js assets/
git commit -m "feat: add story data with regions and first eight chapters"
```

---

### Task 5: La logica di progressione (`progress.js`)

Cuore del sistema, e l'unica parte davvero rischiosa: se sbaglia, i bambini perdono i progressi. Zero DOM, tutto puro, tutto testato.

**Files:**
- Create: `progress.js`
- Modify: `index.html`, `tools/check.mjs`

**Interfaces:**
- Consumes: `UNITS`, `GAMES` da `data.js`; `CHAPTERS` da `story.js`
- Produces:
  - `STORAGE_KEY_V2` = `"petitrenard_v2"`
  - `chapterIndex(chapterId)` → `number` (−1 se non esiste)
  - `isChapterDone(profile, chapterId)` → `boolean`
  - `isChapterGold(profile, chapterId)` → `boolean`
  - `currentChapterIndex(profile)` → `number` — indice del primo capitolo non fatto; `CHAPTERS.length` se finiti tutti
  - `isChapterUnlocked(profile, chapterId)` → `boolean`
  - `completeChapterPatch(profile, chapterId, errors)` → `{chapters}` — patch **immutabile** da passare a `updateProfile`
  - `unlockedUnitIds(profile)` → `string[]` — unità visibili in "gioca libero"
  - `availableGameIds(profile)` → `string[]` — rispetta `mode: "listen"`
  - `nextGameFor(lastGameId, availableIds)` → `string` — un gioco **diverso** dall'ultimo
  - `buildChapterRounds(unit, profile, availableIds, n)` → `[{gameId, word}]`
  - `migrateV1(rawV1)` → `{profiles, activeId}` in formato v2

- [ ] **Step 1: Scrivi i check che falliscono**

In `tools/check.mjs` aggiungi `"progress.js"` a `FILES` (in coda) e in fondo:

```js
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
  const p = profile();
  assert.deepEqual(P.unlockedUnitIds(p), [CHAPTERS[0].unitId]);
  const p2 = {...p, ...P.completeChapterPatch(p, CHAPTERS[0].id, 0)};
  assert.deepEqual(P.unlockedUnitIds(p2), [CHAPTERS[0].unitId, CHAPTERS[1].unitId]);
});

check("la modalità ascolto esclude i giochi di lettura", () => {
  assert.deepEqual(P.availableGameIds(profile({mode:"listen"})), ["explore","find","memory"]);
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
  assert.ok(rounds.some(r => r.word === hard), "la parola sbagliata non è stata ri-proposta");
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
```

- [ ] **Step 2: Esegui, verifica il fallimento**

Run: `node tools/check.mjs`
Expected: FAIL con `ENOENT ... progress.js`.

- [ ] **Step 3: Implementa `progress.js`**

```js
"use strict";
/* ============================================================
   PROGRESSIONE — logica pura, nessun DOM, nessun localStorage.
   Testata headless da tools/check.mjs.
   Regola di design: non esiste stato di fallimento. Nessuna
   funzione qui dentro può togliere un progresso già ottenuto.
   ============================================================ */

const STORAGE_KEY_V2 = "petitrenard_v2";
const CHAPTER_ROUNDS = 6;   // micro-round per capitolo (~4-6 minuti)

function chapterIndex(chapterId){
  return CHAPTERS.findIndex(c => c.id === chapterId);
}
function chapterEntry(profile, chapterId){
  return (profile && profile.chapters && profile.chapters[chapterId]) || null;
}
function isChapterDone(profile, chapterId){
  const e = chapterEntry(profile, chapterId);
  return !!(e && e.done);
}
function isChapterGold(profile, chapterId){
  const e = chapterEntry(profile, chapterId);
  return !!(e && e.gold);
}
function currentChapterIndex(profile){
  const i = CHAPTERS.findIndex(c => !isChapterDone(profile, c.id));
  return i === -1 ? CHAPTERS.length : i;
}
function isChapterUnlocked(profile, chapterId){
  const i = chapterIndex(chapterId);
  if(i < 0) return false;
  return i <= currentChapterIndex(profile);
}

/* Ritorna solo la patch: chi chiama la passa a updateProfile.
   done e gold, una volta ottenuti, non si perdono mai. */
function completeChapterPatch(profile, chapterId, errors){
  const prev = chapterEntry(profile, chapterId) || {};
  return {
    chapters: {
      ...(profile.chapters || {}),
      [chapterId]: { done: true, gold: !!prev.gold || errors === 0 }
    }
  };
}

function unlockedUnitIds(profile){
  const upTo = Math.min(currentChapterIndex(profile), CHAPTERS.length - 1);
  return CHAPTERS.slice(0, upTo + 1).map(c => c.unitId);
}

function availableGameIds(profile){
  const mode = (profile && profile.mode) || "listen";
  return GAMES.filter(g => !g.readerOnly || mode === "read").map(g => g.id);
}

/* Ri-proposta in un gioco DIVERSO: è la regola anti-frustrazione
   (Khan Academy Kids: mai lo stesso esercizio fallito due volte di fila). */
function nextGameFor(lastGameId, availableIds){
  const others = availableIds.filter(id => id !== lastGameId);
  if(!others.length) return availableIds[0];
  return others[Math.floor(Math.random() * others.length)];
}

/* n round del capitolo: parole sbagliate in passato per prime,
   giochi alternati, mai due volte lo stesso gioco di fila. */
function buildChapterRounds(unit, profile, availableIds, n = CHAPTER_ROUNDS){
  const miss = (profile && profile.miss) || {};
  const weight = w => miss[unit.id + "|" + w.fr] > 0 ? 0 : 1;
  const ordered = [...unit.words]
    .map((w, i) => ({w, i, k: weight(w), r: Math.random()}))
    .sort((a, b) => a.k - b.k || a.r - b.r)
    .map(x => x.w);

  const rounds = [];
  let last = null;
  for(let i = 0; i < n; i++){
    const word = ordered[i % ordered.length];
    const gameId = nextGameFor(last, availableIds);
    rounds.push({gameId, word});
    last = gameId;
  }
  return rounds;
}

/* Migrazione v1 → v2. Non tocca mai la chiave v1: chi chiama la legge
   e basta. Su input corrotto ritorna uno stato vuoto valido. */
function migrateV1(rawV1){
  const empty = {profiles: [], activeId: null};
  if(!rawV1 || typeof rawV1 !== "object" || !Array.isArray(rawV1.profiles)) return empty;

  const profiles = rawV1.profiles.filter(p => p && typeof p === "object").map(p => {
    const scores = (p.scores && typeof p.scores === "object") ? p.scores : {};
    const played = unitId => Object.values(scores[unitId] || {}).some(v => v > 0);

    /* si sblocca fino al primo capitolo il cui mondo non è mai stato giocato */
    const chapters = {};
    for(const c of CHAPTERS){
      if(!played(c.unitId)) break;
      chapters[c.id] = {done: true, gold: false};
    }
    return {
      id: p.id || ("p" + Math.random().toString(36).slice(2, 9)),
      name: p.name || "Petit chef",
      avatar: p.avatar || "🦊",
      mode: p.mode === "read" ? "read" : "listen",
      scores,
      miss: (p.miss && typeof p.miss === "object") ? p.miss : {},
      chapters
    };
  });
  const activeId = profiles.some(p => p.id === rawV1.activeId) ? rawV1.activeId : null;
  return {profiles, activeId};
}
```

- [ ] **Step 4: Esegui i check**

Run: `node tools/check.mjs`
Expected: PASS, 17 check nuovi inclusi.

- [ ] **Step 5: Aggiungi lo script**

In `index.html`, `<script src="progress.js"></script>` dopo `story.js` e prima di `mascot.js`.

- [ ] **Step 6: Commit**

```bash
git add progress.js index.html tools/check.mjs
git commit -m "feat: add pure progression logic with v1 migration, fully tested"
```

---

### Task 6: Aggancia la migrazione allo stato dell'app

**Files:**
- Modify: `app.js:6-22` (`STORAGE_KEY`, `loadState`, `setState`)

**Interfaces:**
- Consumes: `migrateV1`, `STORAGE_KEY_V2` da `progress.js`
- Produces: `loadState()` ora ritorna sempre profili in formato v2 (con `chapters` e `miss`)

- [ ] **Step 1: Scrivi il caso di prova manuale**

Prima di toccare il codice, apri la console del browser sull'app attuale e salva lo stato reale dei bambini:

```js
copy(localStorage.getItem("petitrenard_v1"))
```

Incolla il risultato in `/tmp/petitrenard_v1_backup.json`. Serve per lo step 4 e come rete di sicurezza.

- [ ] **Step 2: Riscrivi `loadState`**

Sostituisci `app.js:6-22` con:

```js
const STORAGE_KEY = "petitrenard_v1"; // legacy: si legge, non si scrive né si cancella

function loadState(){
  /* 1) stato v2 già presente */
  try{
    const raw = localStorage.getItem(STORAGE_KEY_V2);
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed && Array.isArray(parsed.profiles)) return parsed;
    }
  }catch(e){ /* v2 illeggibile: si prova la migrazione qui sotto */ }

  /* 2) primo avvio dopo l'aggiornamento: migra dalla v1 senza toccarla */
  try{
    const legacy = localStorage.getItem(STORAGE_KEY);
    if(legacy) return migrateV1(JSON.parse(legacy));
  }catch(e){ /* v1 corrotta: si riparte puliti, la v1 resta sul disco */ }

  return {profiles:[], activeId:null};
}
let state = loadState();

function setState(next){
  state = next;
  try{ localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state)); }catch(e){}
}
```

`app.js` diventa dipendente da `progress.js`: verifica che in `index.html` `progress.js` sia caricato **prima** di `app.js`.

- [ ] **Step 3: Verifica che i profili nuovi nascano in formato v2**

In `app.js`, dentro `$("npCreate").onclick`, il profilo creato deve avere anche i campi nuovi:

```js
  const p = {
    id: "p" + Math.random().toString(36).slice(2,9),
    name, avatar: npAvatar, mode: npMode, scores: {}, miss: {}, chapters: {}
  };
```

- [ ] **Step 4: Verifica manuale della migrazione**

Run: `python3 -m http.server 8000`, apri l'app, poi in console:

```js
localStorage.removeItem("petitrenard_v2");   // simula il primo avvio dopo l'update
location.reload();
```

Expected dopo il reload:
- i profili esistenti ci sono ancora, con nome, avatar e conteggio stelle **identici** a prima;
- `JSON.parse(localStorage.getItem("petitrenard_v2")).profiles[0].chapters` contiene i capitoli dei mondi già giocati;
- `localStorage.getItem("petitrenard_v1")` è **ancora presente e invariato**.

Verifica anche il caso corrotto:

```js
localStorage.setItem("petitrenard_v2", "{{rotto");
location.reload();
```

Expected: l'app parte comunque (ricade sulla migrazione dalla v1), nessuna schermata bianca.

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: migrate saved profiles from v1 to v2 storage without data loss"
```

---

### Task 7: Il motore delle cutscene (`cutscene.js`)

**Files:**
- Create: `cutscene.js`
- Modify: `index.html` (nuova `<section id="screen-cutscene">` + script), `style.css` (sezione cutscene)

**Interfaces:**
- Consumes: `foxSvg`, `pieSvg` (mascot.js); `speak`, `sfx`, `show`, `$`, `em`, `escapeHtml` (app.js); `REGIONS` (story.js)
- Produces: `playCutscene(chapter, onDone)` — mostra `screen-cutscene`, riproduce i beat, poi chiama `onDone()`. Un tap sullo schermo avanza al beat successivo; il bottone "Salta" chiama subito `onDone()`. Chiamare `playCutscene` due volte di fila annulla la precedente senza doppie chiamate a `onDone`.

- [ ] **Step 1: Aggiungi la schermata**

In `index.html`, dopo `screen-game`:

```html
  <!-- ==================== CUTSCENE ==================== -->
  <section id="screen-cutscene" class="screen">
    <div class="cut-stage" id="cutStage">
      <div class="cut-sky" id="cutSky"></div>
      <div class="cut-ground" id="cutGround"></div>
      <div class="cut-prop" id="cutProp"></div>
      <div class="cut-actor fox" id="cutFox"></div>
      <div class="cut-actor pie" id="cutPie"></div>
    </div>
    <div class="cut-bubble" id="cutBubble"></div>
    <div class="cut-actions">
      <button class="btn small" id="cutSkip">Salta ⏭️</button>
      <button class="btn primary" id="cutNext">Avanti ➡️</button>
    </div>
  </section>
```

- [ ] **Step 2: Implementa `cutscene.js`**

```js
"use strict";
/* ============================================================
   CUTSCENE — scene animate in SVG/CSS con voce narrante.
   Nessun video, nessuna libreria: fondale CSS + mascotte SVG.
   Sempre saltabile: è la regola per non annoiare al secondo giro.
   ============================================================ */

let cutState = null;   // {chapter, beat, onDone, token}
let cutToken = 0;

function playCutscene(chapter, onDone){
  const token = ++cutToken;
  const region = REGIONS.find(r => r.id === chapter.regionId) || REGIONS[0];
  cutState = {chapter, beat: -1, onDone, token, region};
  $("cutSky").style.background = region.sky;
  $("cutGround").style.background = region.ground;
  show("screen-cutscene");
  nextBeat();
}

function endCutscene(){
  if(!cutState) return;
  const {onDone, token} = cutState;
  cutState = null;
  if("speechSynthesis" in window) speechSynthesis.cancel();
  if(token === cutToken && typeof onDone === "function") onDone();
}

function nextBeat(){
  if(!cutState) return;
  const {chapter} = cutState;
  cutState.beat++;
  if(cutState.beat >= chapter.cutscene.length){ endCutscene(); return; }

  const b = chapter.cutscene[cutState.beat];
  $("cutFox").innerHTML = b.fox ? foxSvg(b.fox, {size:130}) : "";
  $("cutPie").innerHTML = b.pie ? pieSvg(b.pie, {size:96}) : "";
  $("cutProp").innerHTML = b.emoji ? em(b.emoji) : "";

  const bubble = $("cutBubble");
  bubble.classList.remove("pop"); void bubble.offsetWidth; bubble.classList.add("pop");
  bubble.textContent = b.text;

  sfx.flip();
  const line = typeof b.speak === "object" ? b.speak.it : (b.speak || b.text);
  speak(line, {lang:"it-IT", rate:0.95, noRepeat:true});

  const isLast = cutState.beat === chapter.cutscene.length - 1;
  $("cutNext").textContent = isLast ? "Si gioca! ▶️" : "Avanti ➡️";
}

/* Questi tre binding girano al caricamento dello script, quando app.js non è
   ancora stato eseguito e `$` (const, non hoisted) non esiste: qui si usa
   document.getElementById direttamente. Dentro le funzioni sopra `$` va bene,
   perché vengono chiamate a pagina caricata. */
document.getElementById("cutNext").onclick = ()=>{ sfx.tap(); nextBeat(); };
document.getElementById("cutSkip").onclick = ()=>{ sfx.tap(); endCutscene(); };
document.getElementById("cutStage").onclick = ()=>{ nextBeat(); };
```

- [ ] **Step 3: Stile e animazioni**

In coda a `style.css`:

```css
/* ============ CUTSCENE ============ */
.cut-stage{position:relative;height:44vh;min-height:240px;border-radius:26px;overflow:hidden;
  border:4px solid var(--ink);box-shadow:0 8px 0 rgba(61,43,36,.18);cursor:pointer}
.cut-sky{position:absolute;inset:0}
.cut-ground{position:absolute;left:0;right:0;bottom:0;height:34%;
  border-top:4px solid rgba(61,43,36,.14);animation:groundPan 18s linear infinite}
@keyframes groundPan{from{background-position:0 0}to{background-position:200px 0}}
.cut-actor{position:absolute;bottom:12%}
.cut-actor.fox{left:12%;animation:foxWalkIn .6s cubic-bezier(.2,1.3,.4,1)}
.cut-actor.pie{right:10%;bottom:56%;animation:pieFlyIn .8s ease-out}
@keyframes foxWalkIn{from{transform:translateX(-60px);opacity:0}to{transform:none;opacity:1}}
@keyframes pieFlyIn{from{transform:translate(70px,-40px) rotate(12deg);opacity:0}to{transform:none;opacity:1}}
.cut-prop{position:absolute;right:22%;bottom:16%;font-size:2.6rem}
.cut-prop .aemoji{width:64px;height:64px}
.cut-bubble{background:#fff;border:4px solid var(--ink);border-radius:22px;padding:16px 20px;
  margin:16px auto 0;max-width:640px;font-weight:700;font-size:1.2rem;line-height:1.45;min-height:76px}
.cut-bubble.pop{animation:bubblePop .32s cubic-bezier(.2,1.5,.4,1)}
@keyframes bubblePop{from{transform:scale(.9);opacity:0}to{transform:none;opacity:1}}
.cut-actions{display:flex;gap:12px;justify-content:center;align-items:center;margin-top:14px}
@media (prefers-reduced-motion: reduce){
  .cut-ground,.cut-actor,.cut-bubble.pop{animation:none}
}
```

- [ ] **Step 4: Aggiungi lo script e prova a mano**

`<script src="cutscene.js"></script>` in `index.html` dopo `mascot.js`.

Run: `python3 -m http.server 8000`, apri l'app, poi in console:

```js
playCutscene(CHAPTERS[0], () => console.info("cutscene finita"));
```

Expected: la scena parte, Foxy entra da sinistra, ogni tap sul palco avanza di una battuta, la voce italiana legge il testo, l'ultimo bottone dice "Si gioca!", e "Salta" chiude subito. La callback viene stampata **una volta sola**, anche premendo Salta a metà.

- [ ] **Step 5: Commit**

```bash
git add cutscene.js index.html style.css
git commit -m "feat: add SVG/CSS cutscene engine with italian narration"
```

---

### Task 8: La mappa dell'avventura (`map.js`)

**Files:**
- Create: `map.js`
- Modify: `index.html` (`screen-map` + script), `style.css` (sezione mappa), `app.js` (avvio e navigazione)

**Interfaces:**
- Consumes: `CHAPTERS`, `REGIONS` (story.js); `isChapterDone`, `isChapterGold`, `isChapterUnlocked`, `currentChapterIndex` (progress.js); `foxSvg` (mascot.js); `activeProfile`, `show`, `$`, `em`, `sfx`, `escapeHtml`, `totalStars`, `goHome` (app.js)
- Produces: `renderMap()` — disegna e mostra `screen-map`; `openChapter(chapterId)` — punto di ingresso di un capitolo (implementato nel Task 9; qui è uno stub che apre la cutscene)

- [ ] **Step 1: Aggiungi la schermata**

In `index.html`, subito prima di `screen-home`:

```html
  <!-- ==================== MAPPA AVVENTURA ==================== -->
  <section id="screen-map" class="screen">
    <div class="topbar">
      <button class="chip" id="mapProfile">🦊 …</button>
      <span class="spacer"></span>
      <button class="chip" id="mapStars"><span class="star">⭐</span> 0</button>
      <button class="btn round sun" id="mapFree" title="Gioca libero">🎮</button>
      <button class="btn round sun" id="mapSongs" title="Canzoni">🎵</button>
      <button class="btn round sun" id="mapStickers" title="Grand Livre">🏆</button>
    </div>
    <div class="path" id="pathList"></div>
  </section>
```

- [ ] **Step 2: Implementa `map.js`**

```js
"use strict";
/* ============================================================
   MAPPA — sentiero verticale a nodi, strettamente sequenziale.
   Un nodo per capitolo. I nodi fatti restano sempre rigiocabili;
   i futuri non sono cliccabili (ma non mostrano lucchetti tristi).
   ============================================================ */

function renderMap(){
  const p = activeProfile();
  if(!p){ renderProfiles(); return; }

  $("mapProfile").innerHTML = `${em(p.avatar)} ${escapeHtml(p.name)}`;
  $("mapStars").innerHTML = `<span class="star">⭐</span> ${totalStars(p)}`;

  const cur = currentChapterIndex(p);
  const list = $("pathList");
  list.innerHTML = "";
  let lastRegion = null, block = list;

  CHAPTERS.forEach((c, i) => {
    if(c.regionId !== lastRegion){
      lastRegion = c.regionId;
      const r = REGIONS.find(x => x.id === c.regionId);
      /* ogni regione è un blocco con il suo cielo: lo sfondo cambia scendendo */
      block = document.createElement("div");
      block.className = "region-block";
      block.style.background = r.sky;
      const sign = document.createElement("div");
      sign.className = "region-sign";
      sign.style.background = r.color;
      sign.innerHTML = `<div class="rfr">${r.fr}</div><div class="rit">${r.it}</div>`;
      block.appendChild(sign);
      list.appendChild(block);
    }

    const done = isChapterDone(p, c.id);
    const gold = isChapterGold(p, c.id);
    const open = isChapterUnlocked(p, c.id);
    const isCurrent = i === cur;

    const node = document.createElement(open ? "button" : "div");
    node.className = "node" + (done ? " done" : "") + (gold ? " gold" : "") +
                     (isCurrent ? " current" : "") + (open ? "" : " future");
    node.style.setProperty("--d", i * 45 + "ms");
    node.style.setProperty("--x", (i % 2 ? 1 : -1) * 42 + "px");
    node.innerHTML = `
      ${isCurrent ? `<div class="node-fox">${foxSvg("idle", {size:74})}</div>` : ""}
      <div class="node-badge">${em(c.friend.emoji)}</div>
      <div class="node-title">${escapeHtml(c.title)}</div>
      <div class="node-star">${gold ? "🌟" : done ? "⭐" : ""}</div>`;
    if(open) node.onclick = ()=>{ sfx.tap(); openChapter(c.id); };
    block.appendChild(node);
  });

  show("screen-map");
  const currentNode = list.querySelector(".node.current");
  if(currentNode) currentNode.scrollIntoView({block:"center", behavior:"smooth"});
}

/* Binding al caricamento dello script: app.js non è ancora girato e `$`
   (const, non hoisted) non esiste ancora. Vedi la stessa nota in cutscene.js. */
document.getElementById("mapProfile").onclick = ()=>{ sfx.tap(); renderProfiles(); };
document.getElementById("mapFree").onclick = ()=>{ sfx.tap(); goHome(false); };
document.getElementById("mapSongs").onclick = ()=>{ sfx.tap(); renderSongs(); };
document.getElementById("mapStickers").onclick = ()=>{ sfx.tap(); renderStickers(); };
```

- [ ] **Step 3: Stile del sentiero**

In coda a `style.css`:

```css
/* ============ MAPPA ============ */
.path{max-width:520px;margin:0 auto;padding-bottom:40px;position:relative}
.region-block{position:relative;padding:4px 0 18px;border-radius:28px;margin-bottom:8px}
.region-block::before{content:"";position:absolute;left:50%;top:0;bottom:18px;width:14px;margin-left:-7px;
  background:repeating-linear-gradient(180deg,rgba(61,43,36,.14) 0 18px,transparent 18px 34px);border-radius:8px;z-index:0}
.region-sign{position:relative;z-index:1;margin:26px auto 18px;padding:10px 22px;border-radius:18px;
  border:4px solid var(--ink);color:#fff;text-align:center;max-width:320px;
  box-shadow:0 6px 0 rgba(61,43,36,.2);animation:screenIn .4s both;animation-delay:var(--d,0ms)}
.region-sign .rfr{font-weight:800;font-size:1.3rem;text-shadow:0 2px 0 rgba(0,0,0,.2)}
.region-sign .rit{font-size:.9rem;font-weight:600;opacity:.95}
.node{position:relative;z-index:1;display:block;width:170px;margin:0 auto 22px;
  transform:translateX(var(--x,0));background:var(--paper-deep);border:4px solid var(--ink);
  border-radius:24px;padding:12px 10px;text-align:center;cursor:pointer;
  box-shadow:0 6px 0 rgba(61,43,36,.2);animation:screenIn .4s both;animation-delay:var(--d,0ms)}
.node:active{transform:translateX(var(--x,0)) scale(.94)}
.node .node-badge .aemoji{width:56px;height:56px}
.node .node-title{font-weight:700;font-size:1rem;margin-top:4px}
.node .node-star{font-size:1.3rem;min-height:1.3em}
.node.done{background:#FFE9A8}
.node.gold{background:linear-gradient(160deg,#FFD75E,#FFB020);border-color:#8A5A00}
.node.future{opacity:.45;filter:grayscale(.7);cursor:default;box-shadow:none}
.node.current{animation:nodePulse 1.6s ease-in-out infinite}
@keyframes nodePulse{0%,100%{box-shadow:0 6px 0 rgba(61,43,36,.2)}
  50%{box-shadow:0 6px 0 rgba(61,43,36,.2),0 0 0 12px rgba(255,197,61,.35)}}
.node-fox{position:absolute;top:-58px;left:50%;transform:translateX(-50%)}
@media (prefers-reduced-motion: reduce){ .node.current{animation:none} }
```

- [ ] **Step 4: Stub di `openChapter` e cambio di avvio**

In fondo a `map.js`, in attesa del Task 9:

```js
/* stub: il runner completo arriva nel task successivo */
function openChapter(chapterId){
  const c = chapterById(chapterId);
  playCutscene(c, ()=> renderMap());
}
```

In `app.js`, sostituisci le due righe finali di avvio con:

```js
if(activeProfile()) renderMap();
else renderProfiles();
```

E in `renderProfiles` (`app.js:197`), il click su un profilo deve portare alla mappa:

```js
    card.onclick = ()=>{
      sfx.tap();
      setState({...state, activeId: p.id});
      renderMap();
    };
```

Stesso cambio in `$("npCreate").onclick` (`app.js:253`): `goHome(true)` → `renderMap()`.

I bottoni "indietro" delle schermate secondarie tornano alla mappa: in `app.js` cambia `$("stickBack")`, `$("songsBack")` e `$("unitBack")` da `goHome(false)` a `renderMap()`. La home a griglia resta raggiungibile solo dal bottone 🎮, e il suo `$("homeProfile")` deve tornare alla mappa: aggiungi in `app.js` un bottone indietro nella topbar di `screen-home` (`index.html`), `<button class="btn round" id="homeBack">⬅️</button>` come primo elemento, con `$("homeBack").onclick = ()=>{ sfx.tap(); renderMap(); };`.

In `goHome`, la griglia deve mostrare **solo** le unità sbloccate:

```js
  const unlocked = new Set(unlockedUnitIds(p));
  UNITS.filter(u => unlocked.has(u.id)).forEach((u,i)=>{
```

- [ ] **Step 5: Aggiungi lo script e verifica manuale**

`<script src="map.js"></script>` in `index.html` dopo `cutscene.js` e prima di `app.js`.

Run: `python3 -m http.server 8000`, apri l'app.
Expected:
- l'app si apre sulla mappa, con Foxy sul primo nodo non completato;
- i nodi futuri sono grigi e non cliccabili, quelli fatti sono gialli e cliccabili;
- i cartelli di regione separano i blocchi;
- il click su un nodo aperto lancia la cutscene e al termine torna alla mappa;
- 🎮 porta alla griglia dei mondi **sbloccati**, e da lì ⬅️ torna alla mappa;
- 🎵 e 🏆 funzionano e tornano alla mappa.

Verifica su iPad Safari che lo scroll del sentiero sia fluido e che i nodi siano toccabili senza zoom accidentale.

- [ ] **Step 6: Commit**

```bash
git add map.js index.html style.css app.js
git commit -m "feat: add sequential adventure map as the new home screen"
```

---

### Task 9: Il runner dei capitoli

Sostituisce lo stub del Task 8: cutscene → 6 micro-round → sfida di Pipelette → ricompensa.

**Files:**
- Create: `chapter.js`
- Modify: `map.js` (rimuovi lo stub `openChapter`), `index.html`, `style.css`, `games.js` (parametro `onRound` opzionale)

**Interfaces:**
- Consumes: `buildChapterRounds`, `availableGameIds`, `completeChapterPatch`, `nextGameFor` (progress.js); `playCutscene` (cutscene.js); `renderMap` (map.js); i cinque `start*` (games.js); `updateProfile`, `setStars`, `bumpMiss`, `setDots`, `confetti`, `sfx`, `speak`, `show`, `$` (app.js)
- Produces: `openChapter(chapterId)` — versione completa; `chapterRunning()` → `boolean` (usato dal tasto indietro)

- [ ] **Step 1: Rendi i giochi utilizzabili per un singolo round**

I cinque `start*` di `games.js` oggi gestiscono l'unità intera e chiamano `finishGame` alla fine. Per i micro-round serve una modalità "un giro solo". Aggiungi in `games.js`, in coda, un adattatore che **non** modifica le funzioni esistenti:

```js
/* ---------- micro-round per il runner dei capitoli ----------
   Riusa la logica dei giochi su una sola parola e richiama
   onDone(errori) invece di finishGame. */
function playRound(gameId, unit, word, onDone){
  const p = activeProfile();
  if(gameId === "find")        return roundFind(unit, word, p, onDone);
  if(gameId === "read")        return roundRead(unit, word, onDone);
  if(gameId === "spell")       return roundSpell(unit, word, onDone);
  if(gameId === "memory")      return roundMemory(unit, word, p, onDone);
  return roundExplore(unit, word, onDone); // "explore" e fallback
}
```

I cinque `round*` sono versioni a una parola dei rispettivi `start*`: stessa struttura HTML e stessi suoni, ma chiamano `onDone(errori)` invece di `finishGame(...)` e non toccano `setDots` (i puntini li gestisce il runner). Scrivili sotto l'adattatore:

```js
/* helper comune: intestazione con Foxy e la consegna */
function roundHead(pose, testo){
  return `<div class="mascot-row">
    <div class="mascot">${foxSvg(pose, {size:84})}</div>
    <div class="bubble">${testo}</div>
  </div>`;
}
/* helper comune: reazione all'errore. Mai un fallimento, solo un invito a riprovare. */
function roundMiss(unit, word){
  sfx.bad();
  foxReact("wobble");
  bumpMiss(unit, word, +1);
}

/* Scopri: una carta sola, si tocca e si ascolta. Non si può sbagliare. */
function roundExplore(unit, word, onDone){
  const p = activeProfile();
  const area = $("gameArea");
  area.innerHTML = roundHead("montre", "Tocca la carta e ascolta!") +
    `<div class="card-grid g1"><button class="card" id="rcard">
       ${wordVisual(word)}
       ${p.mode === "read" ? `<div class="cword">${escapeHtml(word.fr)}</div>` : ""}
     </button></div>`;
  $("rcard").onclick = ()=>{
    sfx.tap(); speak(word.fr); $("rcard").classList.add("done");
    bumpMiss(unit, word, -1);
    setTimeout(()=> onDone(0), 1200);
  };
  setTimeout(()=> speak(word.fr), 400);
}

/* Trova!: ascolta la parola, tocca l'immagine giusta fra quattro. */
function roundFind(unit, word, p, onDone){
  const distrattori = shuffle(unit.words.filter(w => w !== word)).slice(0, 3);
  const scelte = shuffle([word, ...distrattori]);
  let errori = 0;
  const area = $("gameArea");
  area.innerHTML = roundHead("parle", "Ascolta… e tocca quella giusta!") +
    `<div class="card-grid g2" id="rgrid"></div>`;
  const grid = $("rgrid");
  scelte.forEach(w=>{
    const b = document.createElement("button");
    b.className = "card";
    b.innerHTML = wordVisual(w);
    b.onclick = ()=>{
      if(w === word){
        sfx.good(); foxReact("jump"); speak(word.fr);
        b.classList.add("ok");
        bumpMiss(unit, word, -1);
        setTimeout(()=> onDone(errori), 1100);
      }else{
        errori++;
        roundMiss(unit, word);
        b.classList.add("nope");
        b.disabled = true;
        speak(word.fr);   /* si riascolta: si può sempre riprovare */
      }
    };
    grid.appendChild(b);
  });
  setTimeout(()=> speak(word.fr), 500);
}

/* Leggi: la parola scritta, si tocca l'immagine giusta. Solo modalità lettura. */
function roundRead(unit, word, onDone){
  const distrattori = shuffle(unit.words.filter(w => w !== word)).slice(0, 3);
  const scelte = shuffle([word, ...distrattori]);
  let errori = 0;
  const area = $("gameArea");
  area.innerHTML = roundHead("montre", "Quale di queste è…") +
    `<div class="prompt-zone"><div class="prompt-word">${escapeHtml(word.fr)}</div></div>
     <div class="card-grid g2" id="rgrid"></div>`;
  const grid = $("rgrid");
  scelte.forEach(w=>{
    const b = document.createElement("button");
    b.className = "card";
    b.innerHTML = wordVisual(w);
    b.onclick = ()=>{
      if(w === word){
        sfx.good(); foxReact("jump"); speak(word.fr);
        b.classList.add("ok");
        bumpMiss(unit, word, -1);
        setTimeout(()=> onDone(errori), 1100);
      }else{
        errori++; roundMiss(unit, word);
        b.classList.add("nope"); b.disabled = true;
      }
    };
    grid.appendChild(b);
  });
}

/* Scrivi: si compone la parola con le lettere in ordine. Solo modalità lettura.
   Le lettere sbagliate non fanno nulla di male: si può insistere. */
function roundSpell(unit, word, onDone){
  const lettere = bareWord(word).toLowerCase().split("");
  let pos = 0, errori = 0;
  const area = $("gameArea");
  area.innerHTML = roundHead("montre", "Componi la parola!") +
    `<div class="prompt-zone">
       ${promptVisual(word)}
       <div class="spell-slots" id="rslots">${lettere.map(()=>'<div class="spell-slot"></div>').join("")}</div>
     </div>
     <div class="spell-tiles" id="rtiles"></div>`;
  const slots = [...area.querySelectorAll(".spell-slot")];
  const tiles = $("rtiles");
  shuffle(lettere.map((ch,i)=>({ch,i}))).forEach(t=>{
    const b = document.createElement("button");
    b.className = "spell-tile";
    b.textContent = t.ch;
    b.onclick = ()=>{
      if(b.classList.contains("used")) return;
      if(t.ch === lettere[pos]){
        sfx.tap();
        slots[pos].textContent = t.ch;
        slots[pos].classList.add("filled");
        b.classList.add("used");
        pos++;
        if(pos === lettere.length){
          sfx.good(); foxReact("jump"); speak(word.fr);
          bumpMiss(unit, word, -1);
          setTimeout(()=> onDone(errori), 1300);
        }
      }else{
        errori++; roundMiss(unit, word);
        b.classList.remove("wrong"); void b.offsetWidth; b.classList.add("wrong");
      }
    };
    tiles.appendChild(b);
  });
  setTimeout(()=> speak(word.fr), 400);
}

/* Memory: tre coppie soltanto (la parola del round più due distrattori),
   così sta dentro il minuto. */
function roundMemory(unit, word, p, onDone){
  const trio = [word, ...shuffle(unit.words.filter(w => w !== word)).slice(0, 2)];
  const mostraTesto = p.mode === "read";
  const carte = shuffle(trio.flatMap((w,i) => [
    {w, i, face:"visual"},
    {w, i, face: mostraTesto ? "text" : "visual"}
  ]));
  let aperta = null, bloccato = false, trovate = 0, errori = 0;

  const area = $("gameArea");
  area.innerHTML = roundHead("curieux", "Trova le coppie!") +
    `<div class="card-grid g3" id="rgrid"></div>`;
  const grid = $("rgrid");

  carte.forEach((c, idx)=>{
    const b = document.createElement("button");
    b.className = "card mcard";
    b.dataset.idx = idx;
    b.innerHTML = `<div class="mback">?</div>`;
    b.onclick = ()=>{
      if(bloccato || b.classList.contains("open") || b.classList.contains("ok")) return;
      sfx.flip();
      b.classList.add("open");
      b.innerHTML = c.face === "text"
        ? `<div class="mword">${escapeHtml(c.w.fr)}</div>`
        : wordVisual(c.w, "memoji");
      speak(c.w.fr);

      if(!aperta){ aperta = {b, c}; return; }

      if(aperta.c.i === c.i && aperta.b !== b){
        sfx.good();
        aperta.b.classList.add("ok"); b.classList.add("ok");
        aperta = null; trovate++;
        if(trovate === trio.length){
          foxReact("jump");
          bumpMiss(unit, word, -1);
          setTimeout(()=> onDone(errori), 1000);
        }
      }else{
        errori++;
        roundMiss(unit, word);
        bloccato = true;
        const a = aperta; aperta = null;
        setTimeout(()=>{
          [a.b, b].forEach(x=>{ x.classList.remove("open"); x.innerHTML = `<div class="mback">?</div>`; });
          bloccato = false;
        }, 900);
      }
    };
    grid.appendChild(b);
  });
}
```

Se `.card-grid.g1` o `.g3` non esistono in `style.css`, aggiungile accanto a `.g2`/`.g4`:

```css
.card-grid.g1{grid-template-columns:minmax(0,240px);justify-content:center}
.card-grid.g3{grid-template-columns:repeat(3,minmax(0,1fr))}
.prompt-word{font-size:2.2rem;font-weight:800;text-align:center;color:var(--coral)}
```

Vincolo verificato a mano nello Step 5: su risposta sbagliata partono `sfx.bad()`, `foxReact("wobble")` e `bumpMiss(unit, word, +1)`, ma la risposta giusta resta sempre selezionabile — **il round non si chiude mai in fallimento**.

- [ ] **Step 2: Implementa `chapter.js`**

```js
"use strict";
/* ============================================================
   RUNNER DEI CAPITOLI — cutscene, micro-round, sfida finale,
   ricompensa. Non esiste un modo di "perdere" un capitolo:
   gli errori contano solo per la stella d'oro.
   ============================================================ */

let chapterRun = null;   // {chapter, unit, rounds, i, errors}

function chapterRunning(){ return chapterRun !== null; }

function openChapter(chapterId){
  const c = chapterById(chapterId);
  const p = activeProfile();
  if(!c || !p) return renderMap();
  const u = UNITS.find(x => x.id === c.unitId);
  const seen = p.chapters && p.chapters[chapterId];

  const begin = ()=>{
    chapterRun = {
      chapter: c, unit: u, errors: 0, i: 0,
      rounds: buildChapterRounds(u, p, availableGameIds(p))
    };
    show("screen-game");
    runNextRound();
  };

  /* la cutscene si vede alla prima visita; poi si va dritti al gioco */
  if(seen && seen.done) begin();
  else playCutscene(c, begin);
}

function runNextRound(){
  if(!chapterRun) return;
  const r = chapterRun;
  if(r.i >= r.rounds.length) return chapterChallenge();

  const {gameId, word} = r.rounds[r.i];
  setDots(r.rounds.length + 1, r.rounds.slice(0, r.i).map(()=> "ok"));
  playRound(gameId, r.unit, word, (errors)=>{
    r.errors += errors;
    r.i++;
    setTimeout(runNextRound, 900);
  });
}

/* Sfida finale: tutte le parole del capitolo, un giro veloce di "Trova!". */
function chapterChallenge(){
  const r = chapterRun;
  if(!r) return;
  const area = $("gameArea");
  area.innerHTML = `
    <div class="mascot-row">
      <div class="mascot">${pieSvg("rit", {size:90})}</div>
      <div class="bubble">Cra cra ! Prendi le tue parole… se ci riesci !</div>
    </div>`;
  speak("Cra cra! Prendi le tue parole, se ci riesci!", {lang:"it-IT", rate:1, noRepeat:true});
  sfx.flip();
  setTimeout(()=>{
    const word = r.unit.words[Math.floor(Math.random() * r.unit.words.length)];
    playRound("find", r.unit, word, (errors)=>{
      r.errors += errors;
      finishChapter();
    });
  }, 2200);
}

function finishChapter(){
  const r = chapterRun;
  if(!r) return;
  chapterRun = null;

  const p = activeProfile();
  const wasDone = isChapterDone(p, r.chapter.id);
  updateProfile(completeChapterPatch(p, r.chapter.id, r.errors));
  /* il capitolo alimenta anche le stelle del mondo, per l'album */
  setStars(r.unit.id, "chapter", 3);

  const gold = isChapterGold(activeProfile(), r.chapter.id);
  sfx.win();
  confetti(30, [r.chapter.friend.emoji, "⭐", "📖"]);

  setDots(0, []);
  $("gameArea").innerHTML = `
    <div class="win-zone">
      <div class="wmascot">${foxSvg("saute", {size:140})}</div>
      <h2>${wasDone ? "Ancora più bravo !" : "Chapitre terminé !"}</h2>
      <div class="chapter-prize">
        <div class="prize-emoji">${em(r.chapter.friend.emoji)}</div>
        <div>Le parole di <b>${escapeHtml(r.chapter.title)}</b> sono tornate nel Grand Livre!</div>
      </div>
      <div class="wstars">${gold ? "🌟" : "⭐"}</div>
      <div class="win-actions">
        <button class="btn sun" id="chAgain">🔁 Ancora!</button>
        <button class="btn primary" id="chNext">🗺️ Continua il viaggio</button>
      </div>
    </div>`;
  speak(r.errors === 0 ? "Parfait !" : "Bravo !", {rate:0.9});
  $("chAgain").onclick = ()=>{ sfx.tap(); openChapter(r.chapter.id); };
  $("chNext").onclick  = ()=>{ sfx.tap(); renderMap(); };
}
```

- [ ] **Step 3: Rimuovi lo stub e aggancia il tasto indietro**

In `map.js` elimina la funzione `openChapter` stub (l'ultima del file).

In `app.js`, `$("gameBack").onclick` oggi fa `openUnit(currentUnit.id)`: deve distinguere i due contesti.

```js
$("gameBack").onclick = ()=>{
  sfx.tap();
  speechSynthesis.cancel();
  if(chapterRunning()){ chapterRun = null; renderMap(); return; }
  openUnit(currentUnit.id);
};
```

In `index.html`, `<script src="chapter.js"></script>` dopo `map.js` e prima di `app.js`.

`finishChapter` aggiunge 3 stelle al mondo sotto la voce `"chapter"`, che non è uno dei `GAMES`: il contatore della griglia libera va allargato di conseguenza, altrimenti mostra `12/9`. In `app.js`, dentro `goHome`:

```js
    const maxStars = (availableGames(p).length + 1) * 3;  // +1 = la stella del capitolo
```

- [ ] **Step 4: Aggiungi lo stile del premio**

In coda a `style.css`:

```css
.chapter-prize{display:flex;align-items:center;gap:14px;justify-content:center;
  background:var(--paper-deep);border:4px solid var(--ink);border-radius:22px;
  padding:14px 18px;margin:14px auto;max-width:460px;font-weight:700;
  animation:bubblePop .4s cubic-bezier(.2,1.5,.4,1)}
.chapter-prize .prize-emoji .aemoji{width:64px;height:64px}
```

- [ ] **Step 5: Verifica manuale del capitolo intero**

Run: `python3 -m http.server 8000` e gioca **un capitolo completo dall'inizio alla fine**, con un profilo in modalità `read` e uno in modalità `listen`.
Expected:
- cutscene → 6 round di giochi **diversi e alternati** → sfida di Pipelette → schermata premio;
- sbagliando di proposito: nessun blocco, Foxy non diventa mai triste, il round si chiude comunque;
- in modalità `listen` non compaiono mai i giochi Leggi e Scrivi;
- alla fine il nodo diventa giallo e il successivo si sblocca;
- rigiocandolo senza errori il nodo diventa oro 🌟;
- il tasto ⬅️ durante un capitolo torna alla mappa senza rompere lo stato (riaprendo il capitolo riparte pulito).

Run: `node tools/check.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add chapter.js games.js map.js app.js index.html style.css
git commit -m "feat: add chapter runner with micro-rounds and Pipelette challenge"
```

---

### Task 10: Chiusura della Fase 1 — verifica su iPad e documentazione

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Verifica su iPad Safari**

Servi la cartella in rete locale: `python3 -m http.server 8000 --bind 0.0.0.0`, poi apri `http://<ip-del-mac>:8000` da iPad.

Checklist da spuntare tutta:
- [ ] il profilo esistente di ciascun bambino è intatto (nome, avatar, stelle)
- [ ] la mappa scorre fluida, i nodi sono toccabili al primo tap
- [ ] le mascotte SVG sono animate (non statiche)
- [ ] la voce francese parte dopo il primo tocco
- [ ] la voce italiana della cutscene si sente ed è comprensibile
- [ ] un capitolo intero si completa in 4-6 minuti reali (cronometrare)
- [ ] nessuna barra di scroll orizzontale, nessun zoom accidentale

- [ ] **Step 2: Test con i bambini**

Fai giocare un capitolo a ciascuno dei due bambini senza aiutarli. Annota: dove si bloccano, se capiscono che devono toccare per avanzare nella cutscene, se la sfida di Pipelette è chiara. Riporta le osservazioni nella sezione "Note" del README.

- [ ] **Step 3: Aggiorna il README**

Aggiungi dopo la sezione "Contenuti":

```markdown
## 🗺️ Le Grand Voyage

Pipelette la gazza ruba le parole francesi di ogni luogo: Foxy e il bambino
viaggiano per la Francia e le recuperano, un capitolo alla volta.

- **Mappa a nodi sequenziale**: un capitolo per nodo, il successivo si sblocca
  completando il precedente. I nodi già fatti restano sempre rigiocabili.
- **Ogni capitolo** = cutscene animata (saltabile) + 6 micro-round su giochi
  diversi + la sfida finale di Pipelette. Durata 4-6 minuti.
- **Nessuno stato di fallimento**: sbagliare non blocca e non toglie nulla.
  La parola sbagliata torna più tardi, in un gioco diverso.
- **Stella per capitolo completato**, stella d'oro 🌟 rigiocandolo senza errori.
- 🎮 **Gioca libero** apre la vecchia griglia con i mondi già sbloccati.

Le mascotte sono SVG inline generati da `mascot.js`: nessun asset, sei pose per
Foxy e tre per Pipelette, animate in CSS.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document the Grand Voyage adventure mode"
```

---

### Task 11: Fase 2 — i dieci mondi nuovi in `data.js`

**Files:**
- Modify: `data.js` (10 unità nuove), `assets-map.js` (rigenerato)

**Interfaces:**
- Produces: unità `maison`, `ferme`, `meteo`, `marche`, `transports`, `ecole`, `mer`, `montagne`, `sport`, `fete` — stessa forma delle esistenti: `{id, emoji, fr, it, color, words:[{fr, it, e}]}`

- [ ] **Step 1: Scrivi il check che fallisce**

In `tools/check.mjs`, dopo gli altri check sulle unità:

```js
check("tutte le 18 unità del viaggio esistono", () => {
  const attese = ["salutations","famille","maison","couleurs","ferme","animaux","meteo",
    "nombres","marche","nourriture","transports","ecole","mer","montagne","vetements",
    "corps","sport","fete"];
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
```

- [ ] **Step 2: Esegui, verifica il fallimento**

Run: `node tools/check.mjs`
Expected: FAIL con `manca l'unità "maison"`.

- [ ] **Step 3: Aggiungi le dieci unità**

In `data.js`, dentro `UNITS`, aggiungi (l'ordine nell'array non conta: il percorso è definito da `CHAPTERS`):

```js
  {
    id:"maison", emoji:"🏠", fr:"La maison", it:"La casa", color:"#C48B62",
    words:[
      {fr:"la maison", it:"la casa", e:"🏠"},
      {fr:"la porte", it:"la porta", e:"🚪"},
      {fr:"la fenêtre", it:"la finestra", e:"🪟"},
      {fr:"le lit", it:"il letto", e:"🛏️"},
      {fr:"la chaise", it:"la sedia", e:"🪑"},
      {fr:"la table", it:"il tavolo", e:"🪵"},
      {fr:"la clé", it:"la chiave", e:"🔑"},
      {fr:"la lampe", it:"la lampada", e:"💡"},
      {fr:"le jardin", it:"il giardino", e:"🌷"},
    ]
  },
  {
    id:"ferme", emoji:"🚜", fr:"La ferme", it:"La fattoria", color:"#8DBF4A",
    words:[
      {fr:"le coq", it:"il gallo", e:"🐓"},
      {fr:"la poule", it:"la gallina", e:"🐔"},
      {fr:"le cochon", it:"il maiale", e:"🐷"},
      {fr:"le mouton", it:"la pecora", e:"🐑"},
      {fr:"la chèvre", it:"la capra", e:"🐐"},
      {fr:"le tracteur", it:"il trattore", e:"🚜"},
      {fr:"le foin", it:"il fieno", e:"🌾"},
      {fr:"l'œuf", it:"l'uovo", e:"🥚"},
      {fr:"la grange", it:"il fienile", e:"🏚️"},
    ]
  },
  {
    id:"meteo", emoji:"🌦️", fr:"Le temps", it:"Il tempo che fa", color:"#7EC8E3",
    words:[
      {fr:"le soleil", it:"il sole", e:"☀️"},
      {fr:"la pluie", it:"la pioggia", e:"🌧️"},
      {fr:"le nuage", it:"la nuvola", e:"☁️"},
      {fr:"le vent", it:"il vento", e:"🌬️"},
      {fr:"la neige", it:"la neve", e:"❄️"},
      {fr:"l'orage", it:"il temporale", e:"⛈️"},
      {fr:"l'arc-en-ciel", it:"l'arcobaleno", e:"🌈"},
      {fr:"le parapluie", it:"l'ombrello", e:"☂️"},
    ]
  },
  {
    id:"marche", emoji:"🧺", fr:"Le marché", it:"Il mercato", color:"#E8734A",
    words:[
      {fr:"le pain", it:"il pane", e:"🥖"},
      {fr:"le fromage", it:"il formaggio", e:"🧀"},
      {fr:"la tomate", it:"il pomodoro", e:"🍅"},
      {fr:"la carotte", it:"la carota", e:"🥕"},
      {fr:"le raisin", it:"l'uva", e:"🍇"},
      {fr:"le panier", it:"il cestino", e:"🧺"},
      {fr:"l'argent", it:"i soldi", e:"💶"},
      {fr:"la fleur", it:"il fiore", e:"🌻"},
      {fr:"le miel", it:"il miele", e:"🍯"},
    ]
  },
  {
    id:"transports", emoji:"🚂", fr:"Les transports", it:"I mezzi", color:"#5B8DEF",
    words:[
      {fr:"la voiture", it:"la macchina", e:"🚗"},
      {fr:"le train", it:"il treno", e:"🚂"},
      {fr:"le vélo", it:"la bicicletta", e:"🚲"},
      {fr:"le bateau", it:"la barca", e:"⛵"},
      {fr:"l'avion", it:"l'aereo", e:"✈️"},
      {fr:"le bus", it:"l'autobus", e:"🚌"},
      {fr:"la fusée", it:"il razzo", e:"🚀"},
      {fr:"le camion", it:"il camion", e:"🚚"},
    ]
  },
  {
    id:"ecole", emoji:"✏️", fr:"L'école", it:"La scuola", color:"#B07CC6",
    words:[
      {fr:"le crayon", it:"la matita", e:"✏️"},
      {fr:"le cahier", it:"il quaderno", e:"📓"},
      {fr:"le livre", it:"il libro", e:"📕"},
      {fr:"la gomme", it:"la gomma", e:"🧽"},
      {fr:"les ciseaux", it:"le forbici", e:"✂️"},
      {fr:"le sac", it:"lo zaino", e:"🎒"},
      {fr:"la règle", it:"il righello", e:"📏"},
      {fr:"la cloche", it:"la campanella", e:"🔔"},
    ]
  },
  {
    id:"mer", emoji:"🌊", fr:"La mer", it:"Il mare", color:"#2FB6C4",
    words:[
      {fr:"la plage", it:"la spiaggia", e:"🏖️"},
      {fr:"le sable", it:"la sabbia", e:"⏳"},
      {fr:"le coquillage", it:"la conchiglia", e:"🐚"},
      {fr:"le crabe", it:"il granchio", e:"🦀"},
      {fr:"la baleine", it:"la balena", e:"🐋"},
      {fr:"le phare", it:"il faro", e:"🗼"},
      {fr:"la vague", it:"l'onda", e:"🌊"},
      {fr:"le seau", it:"il secchiello", e:"🪣"},
    ]
  },
  {
    id:"montagne", emoji:"⛰️", fr:"La montagne", it:"La montagna", color:"#7D8FA0",
    words:[
      {fr:"la montagne", it:"la montagna", e:"⛰️"},
      {fr:"le sapin", it:"l'abete", e:"🌲"},
      {fr:"l'ours", it:"l'orso", e:"🐻"},
      {fr:"le renard", it:"la volpe", e:"🦊"},
      {fr:"le feu", it:"il fuoco", e:"🔥"},
      {fr:"la tente", it:"la tenda", e:"⛺"},
      {fr:"l'étoile", it:"la stella", e:"⭐"},
      {fr:"le rocher", it:"la roccia", e:"🪨"},
    ]
  },
  {
    id:"sport", emoji:"⚽", fr:"Le sport", it:"Lo sport", color:"#43A047",
    words:[
      {fr:"le ballon", it:"il pallone", e:"⚽"},
      {fr:"courir", it:"correre", e:"🏃"},
      {fr:"nager", it:"nuotare", e:"🏊"},
      {fr:"sauter", it:"saltare", e:"🤸"},
      {fr:"danser", it:"ballare", e:"💃"},
      {fr:"la médaille", it:"la medaglia", e:"🏅"},
      {fr:"le vélo", it:"la bici", e:"🚴"},
      {fr:"le ski", it:"lo sci", e:"⛷️"},
    ]
  },
  {
    id:"fete", emoji:"🎉", fr:"La fête", it:"La festa", color:"#F272B0",
    words:[
      {fr:"le gâteau", it:"la torta", e:"🎂"},
      {fr:"le cadeau", it:"il regalo", e:"🎁"},
      {fr:"le ballon", it:"il palloncino", e:"🎈"},
      {fr:"la bougie", it:"la candelina", e:"🕯️"},
      {fr:"la musique", it:"la musica", e:"🎶"},
      {fr:"l'ami", it:"l'amico", e:"🧑‍🤝‍🧑"},
      {fr:"la fête", it:"la festa", e:"🎉"},
      {fr:"le feu d'artifice", it:"i fuochi d'artificio", e:"🎆"},
    ]
  },
```

Attenzione ai duplicati che il check intercetta: `le vélo` compare sia in `transports` sia in `sport`, e `le ballon` sia in `sport` sia in `fete`. Risolvi così: in `sport` usa `{fr:"le cyclisme", it:"il ciclismo", e:"🚴"}`, e in `fete` usa `{fr:"le ballon de baudruche", it:"il palloncino", e:"🎈"}`. `l'étoile` in `montagne` non collide con nulla.

- [ ] **Step 4: Scarica gli asset e verifica**

Run: `python3 tools/fetch_assets.py && node tools/check.mjs`
Expected: scarica gli emoji nuovi, rigenera `assets-map.js`, tutti i check passano incluso quello sugli asset mancanti. Se un emoji non ha né webp animato né png, sostituiscilo con uno che ce l'ha (il tool stampa i mancanti).

- [ ] **Step 5: Commit**

```bash
git add data.js assets-map.js assets/
git commit -m "feat: add ten new vocabulary worlds (18 total, ~175 words)"
```

---

### Task 12: Fase 2 — i dieci capitoli nuovi e l'ordine finale del viaggio

**Files:**
- Modify: `story.js`

- [ ] **Step 1: Scrivi il check che fallisce**

In `tools/check.mjs`, dopo gli altri check sui capitoli:

```js
check("il viaggio ha 18 capitoli nell'ordine narrativo previsto", () => {
  assert.equal(CHAPTERS.length, 18, `attesi 18 capitoli, trovati ${CHAPTERS.length}`);
  const atteso = ["salutations","famille","maison","couleurs","ferme","animaux","meteo",
    "nombres","marche","nourriture","transports","ecole","mer","montagne","vetements",
    "corps","sport","fete"];
  assert.deepEqual(CHAPTERS.map(c => c.unitId), atteso,
    "l'ordine dei capitoli non segue il viaggio villaggio → campagna → città → costa → festa");
});

check("le cinque regioni sono tutte usate", () => {
  const usate = new Set(CHAPTERS.map(c => c.regionId));
  for (const r of REGIONS) assert.ok(usate.has(r.id), `regione ${r.id} senza capitoli`);
});

check("l'ultimo capitolo è la festa finale", () => {
  const last = CHAPTERS[CHAPTERS.length - 1];
  assert.equal(last.regionId, "fete");
  assert.ok(last.finale === true, "l'ultimo capitolo deve avere finale:true");
});
```

- [ ] **Step 2: Esegui, verifica il fallimento**

Run: `node tools/check.mjs`
Expected: FAIL con `attesi 18 capitoli, trovati 8`.

- [ ] **Step 3: Riordina e completa `CHAPTERS`**

Riordina l'array esistente e inserisci i dieci capitoli nuovi, rispettando la sequenza del check. Ogni capitolo nuovo segue esattamente la forma di quelli del Task 4: `id` con prefisso `ch-`, `regionId`, `unitId`, `title`, `friend` (emoji + nome + battuta), `cutscene` di 3-5 beat.

Mappatura regione per capitolo:
- `village`: salutations, famille, **maison**, couleurs
- `campagne`: **ferme**, animaux, **meteo**
- `ville`: nombres, **marche**, nourriture, **transports**, **ecole**
- `cote`: **mer**, **montagne**, vetements, corps
- `fete`: **sport**, **fete**

Amici di tappa dei capitoli nuovi:

| Capitolo | friend.emoji | friend.name | friend.line |
|---|---|---|---|
| maison | 🐭 | Souricette | "Ho perso il nome della mia porta !" |
| ferme | 🐓 | Coco le coq | "Cocorico ! Chi ha rubato i miei amici?" |
| meteo | ☂️ | Madame Pluie | "Non so più dire che tempo fa !" |
| marche | 🧺 | Jean le marchand | "Il mio banco è senza nomi !" |
| transports | 🚂 | Gaston le train | "Tchou tchou ! Dove vado?" |
| ecole | 🐧 | Maîtresse Adèle | "La lezione è saltata !" |
| mer | 🦀 | Crabounet | "Clic clac ! Le parole sono in fondo al mare." |
| montagne | 🐻 | Grand Ours | "Grrr… la gazza mi ha svegliato." |
| sport | 🏅 | Coach Théo | "La gara non può iniziare senza parole !" |
| fete | 🎂 | tutti gli amici | "On fait la fête ! Grazie per averci aiutato!" |

L'ultimo capitolo porta `finale: true` e la sua cutscene chiude la storia: Pipelette restituisce il sacco, tutti gli amici incontrati sono alla festa, Foxy saluta.

```js
  {
    id:"ch-fete", regionId:"fete", unitId:"fete", finale:true,
    title:"La grande festa",
    friend:{emoji:"🎂", name:"Tous les amis", line:"On fait la fête ! Grazie per averci aiutato!"},
    cutscene:[
      {pie:"boude", emoji:"🎒", text:"Pipelette arriva col sacco vuoto: ha restituito tutte le parole.", speak:"Pipelette arriva col sacco vuoto: ha restituito tutte le parole."},
      {pie:"rit", text:"«Cra cra… volevo solo qualcuno con cui giocare!» dice la gazza.", speak:"Cra cra... volevo solo qualcuno con cui giocare! dice la gazza."},
      {fox:"saute", emoji:"🎉", text:"Allora vieni alla festa con noi! Ci sono tutti gli amici del viaggio.", speak:"Allora vieni alla festa con noi! Ci sono tutti gli amici del viaggio."},
      {fox:"salue", text:"Hai imparato il francese di tutta la Francia. Bravo ! À bientôt !", speak:"Hai imparato il francese di tutta la Francia. Bravissimo!"},
    ]
  },
```

- [ ] **Step 4: Esegui il check**

Run: `python3 tools/fetch_assets.py && node tools/check.mjs`
Expected: PASS su tutti i check, inclusi i 18 capitoli e gli emoji nuovi degli amici.

- [ ] **Step 5: Verifica manuale**

Run: `python3 -m http.server 8000`. In console, per saltare rapidamente al fondo del percorso su un profilo di prova:

```js
// solo per test: segna tutti i capitoli come fatti tranne l'ultimo
const p = activeProfile();
const ch = {}; CHAPTERS.slice(0,-1).forEach(c => ch[c.id] = {done:true, gold:false});
updateProfile({chapters: ch}); renderMap();
```

Expected: la mappa mostra 18 nodi in 5 blocchi di regione, Foxy è sull'ultimo nodo, il capitolo finale è giocabile e la sua cutscene chiude la storia.

Ricorda di ripulire il profilo di prova prima di consegnare l'app ai bambini.

- [ ] **Step 6: Commit**

```bash
git add story.js assets-map.js assets/
git commit -m "feat: complete the journey with all eighteen chapters and finale"
```

---

### Task 13: Fase 3 — Il Grand Livre (album ampliato)

**Files:**
- Modify: `app.js` (`renderStickers`), `index.html` (titolo dell'album), `style.css`

**Interfaces:**
- Consumes: `isChapterDone`, `isChapterGold`, `CHAPTERS` (progress.js, story.js)
- Produces: `renderStickers()` mostra i 18 capitoli, non più le sole unità

- [ ] **Step 1: Scrivi il check che fallisce**

In `tools/check.mjs`:

```js
check("la figurina si ottiene per capitolo o per stelle, senza doppioni", () => {
  const p = profile();
  const c = CHAPTERS[0];
  const viaCapitolo = {...p, ...P.completeChapterPatch(p, c.id, 0)};
  assert.equal(P.isChapterDone(viaCapitolo, c.id), true);
  const viaStelle = {...p, scores:{[c.unitId]:{explore:3, find:3}}};
  assert.equal(P.hasPrize(viaStelle, c.id), true, "6 stelle nel mondo devono valere la figurina");
  assert.equal(P.hasPrize(viaCapitolo, c.id), true, "il capitolo completato deve valere la figurina");
  assert.equal(P.hasPrize(profile(), c.id), false);
});
```

Aggiungi `hasPrize` all'oggetto `P` estratto con `G(...)`.

- [ ] **Step 2: Esegui, verifica il fallimento**

Run: `node tools/check.mjs`
Expected: FAIL con `P.hasPrize is not a function`.

- [ ] **Step 3: Implementa `hasPrize` in `progress.js`**

```js
/* Due strade per la stessa figurina: completare il capitolo,
   oppure accumulare STICKER_THRESHOLD stelle nel mondo giocando libero. */
function unitStarsOf(profile, unitId){
  return Object.values((profile.scores || {})[unitId] || {}).reduce((a,b) => a + b, 0);
}
function hasPrize(profile, chapterId){
  const c = CHAPTERS.find(x => x.id === chapterId);
  if(!c) return false;
  return isChapterDone(profile, chapterId) || unitStarsOf(profile, c.unitId) >= STICKER_THRESHOLD;
}
```

- [ ] **Step 4: Riscrivi `renderStickers`**

In `app.js`, sostituisci il corpo di `renderStickers` così che iteri su `CHAPTERS`:

```js
function renderStickers(){
  const p = activeProfile(); if(!p) return renderProfiles();
  const grid = $("stickerGrid");
  grid.innerHTML = "";
  CHAPTERS.forEach((c,i)=>{
    const u = UNITS.find(x => x.id === c.unitId);
    const won = hasPrize(p, c.id);
    const gold = isChapterGold(p, c.id);
    const slot = document.createElement(won ? "button" : "div");
    slot.className = "sticker-slot" + (won ? "" : " locked") + (gold ? " gold" : "");
    slot.style.setProperty("--d", i*40+"ms");
    slot.innerHTML = `
      <div class="semoji">${em(won ? c.friend.emoji : u.emoji)}</div>
      <div class="sname">${u.fr}</div>
      <div style="font-size:.85rem;font-weight:600;color:${won ? "var(--leaf)" : "var(--ink-soft)"}">
        ${gold ? "🌟 Perfetto!" : won ? "🏆 Vinta!" : "🔒 Da scoprire"}
      </div>`;
    if(won) slot.onclick = ()=>{ speak(u.fr); confetti(10, [c.friend.emoji,"⭐"]); };
    grid.appendChild(slot);
  });
  show("screen-stickers");
}
```

In `index.html` cambia il titolo dell'album da `🏆 Album delle figurine` a `📖 Le Grand Livre` e il sottotitolo in `Ogni capitolo che completi rimette le sue parole nel libro!`.

In `style.css` aggiungi `.sticker-slot.gold{background:linear-gradient(160deg,#FFD75E,#FFB020);border-color:#8A5A00}`.

- [ ] **Step 5: Verifica**

Run: `node tools/check.mjs` → PASS.
Run: `python3 -m http.server 8000`, apri 🏆 dalla mappa.
Expected: 18 caselle, quelle vinte mostrano l'amico di tappa, quelle da fare mostrano l'emoji del mondo in grigio, le perfette sono dorate.

- [ ] **Step 6: Commit**

```bash
git add progress.js app.js index.html style.css tools/check.mjs
git commit -m "feat: turn the sticker album into the Grand Livre with 18 chapter prizes"
```

---

### Task 14: Fase 3 — rifiniture e verifica finale

**Files:**
- Modify: `style.css`, `app.js`, `README.md`

- [ ] **Step 1: Transizione di regione sulla mappa**

Quando si completa l'ultimo capitolo di una regione, la mappa deve celebrarlo. In `chapter.js`, dentro `finishChapter`, prima del `renderMap` finale:

```js
  const idx = chapterIndex(r.chapter.id);
  const next = CHAPTERS[idx + 1];
  const changedRegion = next && next.regionId !== r.chapter.regionId;
  if(changedRegion){
    const reg = REGIONS.find(x => x.id === next.regionId);
    setTimeout(()=>{
      confetti(24, ["✨","🗺️"]);
      speak(`On va à ${reg.fr} !`, {rate:0.85});
    }, 1200);
  }
```

E in `map.js`, dentro `renderMap`, aggiungi alla `.region-sign` della regione corrente la classe `now`:

```js
      if(r.id === (CHAPTERS[Math.min(cur, CHAPTERS.length-1)] || {}).regionId) sign.classList.add("now");
```

con lo stile:

```css
.region-sign.now{animation:signIn .6s cubic-bezier(.2,1.5,.4,1) both}
@keyframes signIn{from{transform:scale(.7) rotate(-6deg);opacity:0}to{transform:none;opacity:1}}
```

- [ ] **Step 2: Passata audio**

Verifica che ogni cambio di schermata annulli il parlato pendente. In `app.js`, dentro `show()`, aggiungi come prima riga:

```js
  if("speechSynthesis" in window) speechSynthesis.cancel();
```

Attenzione: `playCutscene` chiama `show()` **prima** di `nextBeat()`, quindi la battuta non viene tagliata. Verificalo a mano nello step 4.

- [ ] **Step 3: Esegui il check completo**

Run: `node tools/check.mjs`
Expected: PASS su tutti i check (dovrebbero essere circa 40).

- [ ] **Step 4: Verifica manuale finale su iPad**

Checklist:
- [ ] cutscene: la voce non viene tagliata al cambio schermata
- [ ] percorso completo da capo su un profilo nuovo: capitolo 1 → 2 → 3 senza intoppi
- [ ] cambio di regione: coriandoli e annuncio vocale
- [ ] Grand Livre coerente con i capitoli fatti
- [ ] canzoni e gioco libero raggiungibili e funzionanti
- [ ] app riaperta dopo chiusura: riprende dal punto giusto

- [ ] **Step 5: Aggiorna il README e committa**

Aggiorna la sezione "Contenuti" del README con i numeri reali (18 mondi, ~175 parole, 18 capitoli) e la lista dei file sorgente.

```bash
git add style.css app.js chapter.js map.js README.md
git commit -m "feat: add region transitions and final polish pass"
```

---

## Note per chi esegue

- **Ordine dei `<script>` in `index.html`** al termine del piano, dipendenze dall'alto in basso:
  `data.js` → `story.js` → `assets-map.js` → `progress.js` → `mascot.js` → `cutscene.js` → `map.js` → `chapter.js` → `games.js` → `app.js`.
  `app.js` resta ultimo perché contiene le righe di avvio.
- **`node tools/check.mjs` prima di ogni commit.** Se un task aggiunge un file alla root, aggiungilo anche all'array `FILES` del check, **nello stesso ordine** degli script in `index.html`, altrimenti il contesto `vm` non risolve i riferimenti.
- **`progress.js` non può toccare il DOM**: se ci finisce dentro un `document.` o un `localStorage.`, il check esplode in Node. È voluto.
- **Backup prima del Task 6:** salva su file il contenuto di `localStorage.getItem("petitrenard_v1")` dei dispositivi reali dei bambini prima di distribuire la versione nuova.
