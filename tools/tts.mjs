#!/usr/bin/env node
"use strict";
/* ============================================================
   TTS OFFLINE — genera le clip vocali con ElevenLabs.

   Gira SUL MAC, mai nel browser: la chiave API non deve finire
   in una pagina pubblica. Nel repo ci vanno solo gli mp3.

     node tools/tts.mjs --count     # quante frasi / quanti caratteri
     node tools/tts.mjs --voices    # elenca le voci del tuo account
     node tools/tts.mjs             # genera i file mancanti
     node tools/tts.mjs --force     # rigenera tutto

   Chiave letta da $ELEVENLABS_API_KEY o da
   ~/.config/carlo-os/elevenlabs.env (riga ELEVENLABS_API_KEY=...).

   È idempotente: salta le clip già presenti in audio/. Se il free
   tier finisce a metà, si rilancia il mese dopo e riprende da lì.
   ============================================================ */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { createHash } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUDIO_DIR = join(ROOT, "audio");
const INDEX_FILE = join(AUDIO_DIR, "index.json");

/* ---------- voci ----------
   fr: voce creata su misura con Voice Design ("Foxy FR - maestra
       bambini"): giovane donna francese, calda e vivace, articolazione
       netta. È la voce che i bambini imitano, quindi è madrelingua.
   it: "Andrea - Young & Expressive", la voce narrante di Foxy.
   Sovrascrivibili al volo con TTS_VOICE_FR / TTS_VOICE_IT. */
const VOICE = {
  fr: process.env.TTS_VOICE_FR || "MIzJ6RArwnuvlFsl7dOz",
  it: process.env.TTS_VOICE_IT || "mxbgw5PwaQHOrln90mhH",
};
const MODEL = "eleven_multilingual_v2";
const FORMAT = "mp3_44100_64";          // voce parlata: 64kbps basta e avanza

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
   2 — CHIAVE API
   ============================================================ */
function apiKey(){
  if(process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  const envFile = join(homedir(), ".config/carlo-os/elevenlabs.env");
  if(existsSync(envFile)){
    const m = readFileSync(envFile, "utf8").match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+)$/m);
    if(m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error(
    "Chiave ElevenLabs non trovata.\n" +
    "  echo 'ELEVENLABS_API_KEY=sk_...' > ~/.config/carlo-os/elevenlabs.env"
  );
}

async function api(path, opts = {}){
  const res = await fetch(`https://api.elevenlabs.io${path}`, {
    ...opts,
    headers: { "xi-api-key": apiKey(), ...(opts.headers || {}) },
  });
  if(!res.ok){
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status} su ${path}: ${body.slice(0, 400)}`);
  }
  return res;
}

/* ============================================================
   3 — COMANDI
   ============================================================ */
async function cmdVoices(){
  const res = await api("/v1/voices");
  const { voices } = await res.json();
  console.log(`${voices.length} voci disponibili:\n`);
  for(const v of voices){
    const labels = Object.values(v.labels || {}).join(", ");
    console.log(`  ${v.voice_id}  ${v.name.padEnd(20)} ${labels}`);
  }
  console.log("\nScegline una e passala così:");
  console.log("  TTS_VOICE_FR=<id> TTS_VOICE_IT=<id> node tools/tts.mjs");
}

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
  console.log(`  (1 carattere = 1 credito ElevenLabs; il piano Starter ne dà 30.000 al mese)`);
  const missing = clips.filter(p => !existsSync(join(AUDIO_DIR, p.file)));
  console.log(`  già generate: ${clips.length - missing.length} · da generare: ${missing.length}`);
}

/* Una clip "corta" è una parola o frase-chiave che il bambino deve
   imitare: va detta pulita e senza esitazioni. Con stability bassa e
   style alto multilingual_v2 sui testi cortissimi IMPROVVISA — clip da
   9 secondi con "eeeeh…" davanti a "la porte". Qui la voce viene
   inchiodata: stability alta, niente style, un previous_text che dà
   il contesto di lettura scandita. */
function isShortFr(phrase){
  return phrase.lang === "fr" && phrase.text.length <= 48;
}
async function synth(phrase){
  const voiceId = VOICE[phrase.lang];
  if(!voiceId) throw new Error(`Nessuna voce configurata per "${phrase.lang}" (TTS_VOICE_${phrase.lang.toUpperCase()})`);
  const short = isShortFr(phrase);
  const res = await api(`/v1/text-to-speech/${voiceId}?output_format=${FORMAT}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: phrase.text,
      model_id: MODEL,
      ...(short ? { previous_text: "Écoute bien et répète :" } : {}),
      voice_settings: short
        ? {
            stability: 0.9,           // parola secca, zero improvvisazione
            similarity_boost: 0.8,
            style: 0,
            use_speaker_boost: true,
            speed: 0.9,               // chiara ma senza trascinare
          }
        : {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.25,              // calore da lettura ad alta voce
            use_speaker_boost: true,
            speed: 0.95,
          },
    }),
  });
  return Buffer.from(await res.arrayBuffer());
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
  for(const p of todo){
    try {
      // seriale, non in parallelo: il free tier consente pochissime
      // richieste concorrenti e risponde 429 al primo fan-out
      writeFileSync(join(AUDIO_DIR, p.file), await synth(p));
      done++;
      process.stdout.write(`\r  ${done}/${todo.length}  ${p.text.slice(0, 40)}`.padEnd(70));
    } catch (err) {
      failed++;
      console.error(`\n  ✗ "${p.text.slice(0, 40)}": ${err.message}`);
      if(/quota|401|403/i.test(err.message)){
        console.error("  Stop: quota esaurita o chiave non valida. I file già scritti restano buoni.");
        break;
      }
    }
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
if(arg === "--voices") await cmdVoices();
else if(arg === "--count") cmdCount();
else if(arg === "--check") selfCheck();
else if(arg === "--index") writeIndex(collectPhrases());
else await cmdGenerate({ force: arg === "--force", redoShortFr: arg === "--redo-short-fr" });
