#!/usr/bin/env node
"use strict";
/* ============================================================
   TTS OFFLINE — genera le clip vocali in locale (Qwen3-TTS su MLX).

   Gira SUL MAC: questo script raccoglie le frasi, decide i nomi
   file e scrive l'indice; la sintesi la fa tools/tts_local.py
   (avviato qui come worker, un processo per tutta la corsa) con
   le voci clonate da tools/voices/{fr,it}.wav. Nessun servizio
   esterno, nessuna chiave. Serve `uv` e `ffmpeg`.

     node tools/tts.mjs --count     # quante frasi / quanti caratteri
     node tools/tts.mjs --check     # self-check senza sintesi
     node tools/tts.mjs             # genera i file mancanti
     node tools/tts.mjs --force     # rigenera tutto
     TTS_FILTER='^le chat$' node tools/tts.mjs --force   # solo alcune
     TTS_AUDIO_DIR=/tmp/prova node tools/tts.mjs         # prova a vuoto

   È idempotente: salta le clip già presenti in audio/.
   ============================================================ */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { createHash } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUDIO_DIR = process.env.TTS_AUDIO_DIR || join(ROOT, "audio");
const INDEX_FILE = join(AUDIO_DIR, "index.json");
const WORKER = join(ROOT, "tools", "tts_local.py");

/* ============================================================
   1 — RACCOLTA FRASI
   I dati vivono in file pensati per il browser (const globali,
   niente export): li leggo come sorgente e li valuto in una
   funzione, invece di duplicare i dati qui e vederli divergere.
   ============================================================ */
function loadGameData(){
  const src = ["data.js", "story.js"].map(f => readFileSync(join(ROOT, f), "utf8")).join("\n");
  const fn = new Function(`${src}\nreturn {UNITS, SONGS, CHAPTERS, REGIONS};`);
  return fn();
}

/* Frasi scritte a mano nel codice dei giochi: raccolte qui perché
   speak() le riceve come stringhe letterali sparse. Se ne aggiungi
   una in app.js/chapter.js, aggiungila anche qui. */
const HARDCODED = [
  ["fr", "Salut !"],
  ["fr", "Bravo !"], ["fr", "Super !"], ["fr", "Magnifique !"],
  ["fr", "Génial !"], ["fr", "Très bien !"], ["fr", "Parfait !"],
  ["fr", "Répète après moi !"],       // gioco Répète! (games.js)
  ["it", "Cra cra! Prendi le tue parole, se ci riesci!"],
];

function collectPhrases(){
  const { UNITS, SONGS, CHAPTERS, REGIONS } = loadGameData();
  const seen = new Map();                      // testo -> lang (dedup)
  const add = (lang, text) => {
    const t = String(text || "").trim();
    if(t && !seen.has(t)) seen.set(t, lang);
  };

  for(const [lang, text] of HARDCODED) add(lang, text);
  for(const u of UNITS){
    add("fr", u.fr);
    for(const w of u.words) add("fr", w.fr);
  }
  for(const s of SONGS) for(const l of s.lines) add("fr", l.text);
  for(const r of REGIONS) add("fr", `On va à ${r.fr} !`);
  for(const c of CHAPTERS){
    add("it", c.friend.line);
    for(const step of c.cutscene){
      add("it", step.speak || step.text);
      /* la frase-chiave del capitolo va alla voce francese, non a
         quella italiana: è l'unica pronuncia che i bambini imitano */
      if(step.fr) add("fr", step.fr);
    }
  }
  return [...seen].map(([text, lang]) => ({ text, lang, file: slugFile(lang, text) }));
}

/* Nome file leggibile e stabile. Due testi che differiscono solo per
   maiuscole o punteggiatura ("La famille" dell'unità e "la famille"
   della parola) finiscono di proposito sullo STESSO file: la clip
   suonerebbe identica, e generarla due volte brucerebbe crediti.
   Sulle frasi lunghe invece il troncamento a 48 caratteri potrebbe
   far collidere due incipit uguali ma seguiti da testo diverso — lì
   l'hash del testo intero rimette i due file separati. */
function slugFile(lang, text){
  const full = text.toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "clip";
  const short = full.slice(0, 48);
  const suffix = short === full ? "" : "-" + createHash("sha1").update(full).digest("hex").slice(0, 6);
  return `${lang}/${short}${suffix}.mp3`;
}

/* ============================================================
   2 — WORKER DI SINTESI
   Un solo processo Python per tutta la corsa (il modello ci mette
   ~10 s a caricarsi). Protocollo: una riga JSON per clip in
   ingresso, una riga JSON di risposta in uscita, nello stesso ordine.
   ============================================================ */
function startWorker(){
  const proc = spawn("uv", ["run", WORKER], { stdio: ["pipe", "pipe", "inherit"] });
  const lines = createInterface({ input: proc.stdout });
  const waiting = [];
  lines.on("line", line => {
    if(!line.startsWith("{")) return;              // rumore delle librerie, non una risposta
    const w = waiting.shift(); if(w) w(JSON.parse(line));
  });
  proc.on("exit", code => { while(waiting.length) waiting.shift()({ ok: false, error: `worker uscito con codice ${code}` }); });
  return {
    synth: job => new Promise(resolve => { waiting.push(resolve); proc.stdin.write(JSON.stringify(job) + "\n"); }),
    close: () => proc.stdin.end(),
  };
}

/* ============================================================
   3 — COMANDI
   ============================================================ */
function cmdCount(){
  const clips = [...new Map(collectPhrases().map(p => [p.file, p])).values()];
  const byLang = {};
  for(const p of clips){
    const s = byLang[p.lang] || (byLang[p.lang] = { n: 0, chars: 0 });
    s.n++; s.chars += p.text.length;
  }
  let total = 0;
  for(const [lang, s] of Object.entries(byLang)){
    console.log(`  ${lang}: ${s.n} clip, ${s.chars} caratteri`);
    total += s.chars;
  }
  console.log(`  ---\n  totale: ${clips.length} clip, ${total} caratteri`);
  const missing = clips.filter(p => !existsSync(join(AUDIO_DIR, p.file)));
  console.log(`  già generate: ${clips.length - missing.length} · da generare: ${missing.length}`);
}

/* Una clip "corta" è una parola o frase-chiave che il bambino deve
   imitare: va detta pulita e senza esitazioni. Il worker la campiona
   più "freddo" e rigenera se la durata sfora il budget (i modelli
   TTS sui testi cortissimi tendono a improvvisare: "eeeeh… la porte"). */
function isShortFr(phrase){
  return phrase.lang === "fr" && phrase.text.length <= 48;
}

async function cmdGenerate({ force, redoShortFr }){
  const phrases = collectPhrases();
  let clips = [...new Map(phrases.map(p => [p.file, p])).values()];   // un file = una sola richiesta
  /* TTS_FILTER: regex sul testo, per rigenerare clip mirate senza
     bruciare crediti su tutto (es. TTS_FILTER='^le chat$' --force) */
  if(process.env.TTS_FILTER){
    const re = new RegExp(process.env.TTS_FILTER, "i");
    clips = clips.filter(p => re.test(p.text));
  }
  const todo = clips.filter(p =>
    force ||
    (redoShortFr && isShortFr(p)) ||          // sovrascrive in place: mai buchi
    !existsSync(join(AUDIO_DIR, p.file)));
  console.log(`${todo.length}/${clips.length} clip da generare.`);

  for(const lang of new Set(phrases.map(p => p.lang))) mkdirSync(join(AUDIO_DIR, lang), { recursive: true });

  let done = 0, failed = 0;
  if(todo.length){
    const worker = startWorker();
    for(const p of todo){
      // seriale: una GPU, un modello; il worker scrive l'mp3 da sé
      const r = await worker.synth({ text: p.text, lang: p.lang, out: join(AUDIO_DIR, p.file), short: isShortFr(p) });
      if(r.ok){
        done++;
        process.stdout.write(`\r  ${done}/${todo.length}  ${r.seconds.toFixed(1)}s  ${p.text.slice(0, 40)}`.padEnd(70));
      } else {
        failed++;
        console.error(`\n  ✗ "${p.text.slice(0, 40)}": ${r.error}`);
        if(/worker uscito/.test(r.error)) break;
      }
    }
    worker.close();
  }
  console.log(`\nFatte ${done}, fallite ${failed}.`);
  writeIndex(phrases);
}

/* L'indice mappa il testo esatto passato a speak() sul file da suonare.
   Contiene SOLO le clip realmente presenti su disco: se una generazione
   si ferma a metà, il client fa fallback su Web Speech per il resto. */
function writeIndex(phrases){
  const index = {};
  for(const p of phrases){
    if(existsSync(join(AUDIO_DIR, p.file))) index[p.text] = p.file;
  }
  mkdirSync(AUDIO_DIR, { recursive: true });
  writeFileSync(INDEX_FILE, JSON.stringify(index, null, 1));
  console.log(`audio/index.json: ${Object.keys(index).length} clip indicizzate.`);
}

/* ---------- self-check: gira senza chiave e senza rete ---------- */
function selfCheck(){
  const eq = (a, b, msg) => { if(a !== b) throw new Error(`${msg}: ${a} != ${b}`); };
  eq(slugFile("fr", "l'éléphant"), "fr/l-elephant.mp3", "accenti e apostrofi");
  eq(slugFile("fr", "Très bien !"), "fr/tres-bien.mp3", "punteggiatura finale");
  eq(slugFile("it", "  "), "it/clip.mp3", "testo vuoto");
  eq(slugFile("fr", "La famille"), slugFile("fr", "la famille"), "solo-maiuscole condivide la clip");

  // due frasi lunghe con lo stesso incipit non devono finire sullo stesso file
  const a = "Pipelette vola sopra il prato con il sacco pieno di nomi di animali.";
  const b = "Pipelette vola sopra il prato con il sacco pieno di parole rubate.";
  if(slugFile("it", a) === slugFile("it", b)) throw new Error("frasi lunghe diverse collidono sul nome file");

  const phrases = collectPhrases();
  if(phrases.length < 200) throw new Error(`raccolte solo ${phrases.length} frasi, mi aspettavo 200+`);
  const perFile = new Map();
  for(const p of phrases) (perFile.get(p.file) || perFile.set(p.file, []).get(p.file)).push(p.text);
  for(const [file, texts] of perFile){
    const distinct = new Set(texts.map(t => t.toLowerCase().replace(/[^a-z0-9]+/gi, "")));
    if(distinct.size > 1) throw new Error(`${file} conteso da testi diversi: ${texts.join(" | ")}`);
  }
  console.log(`self-check ok — ${phrases.length} frasi → ${perFile.size} clip, nessuna collisione.`);
}

const arg = process.argv[2];
if(arg === "--count") cmdCount();
else if(arg === "--check") selfCheck();
else if(arg === "--index") writeIndex(collectPhrases());
else await cmdGenerate({ force: arg === "--force", redoShortFr: arg === "--redo-short-fr" });
