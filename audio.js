"use strict";
/* ============================================================
   AUDIO — voce, musica, effetti.

   VOCE: se esiste una clip registrata (audio/index.json, generata
   offline da tools/tts.mjs) si suona quella; altrimenti si ripiega
   sulla voce di sistema. L'app deve restare giocabile anche a clip
   mancanti, su rete lenta o con index.json assente.

   MUSICA: due loop, uno per il viaggio e uno per i giochi. Si
   abbassa da sola quando qualcuno parla ("ducking"), altrimenti
   copre la parola francese — che è il motivo per cui esiste l'app.
   ============================================================ */

const AUDIO_PREF_KEY = "petitrenard_audio";

function loadAudioPref(){
  try{
    const raw = localStorage.getItem(AUDIO_PREF_KEY);
    if(raw){
      const p = JSON.parse(raw);
      if(p && typeof p === "object") return {music: p.music !== false};
    }
  }catch(e){ /* storage bloccato: si gioca comunque, con i default */ }
  return {music: true};
}
function saveAudioPref(pref){
  try{ localStorage.setItem(AUDIO_PREF_KEY, JSON.stringify(pref)); }catch(e){}
}
let audioPref = loadAudioPref();

/* ============================================================
   VOCE REGISTRATA
   ============================================================ */
let voiceIndex = null;         // {testo: "fr/le-chien.mp3"} — null finché non arriva
let currentClip = null;

/* no-cache sul solo indice (pochi KB): è la mappa di cosa esiste, e una
   copia vecchia in cache farebbe ripiegare l'app sulla voce di sistema
   anche dopo aver pubblicato clip nuove. Gli mp3 restano cacheabili. */
fetch("audio/index.json", {cache: "no-cache"})
  .then(r => r.ok ? r.json() : null)
  .then(j => { if(j && typeof j === "object") voiceIndex = j; })
  .catch(() => { /* nessuna clip: si va di voce di sistema */ });

/* ============================================================
   VOCE DI SISTEMA (fallback)
   ============================================================ */
let frVoice = null, itVoice = null;
function pickVoices(){
  const vs = speechSynthesis.getVoices();
  if(!vs.length) return;
  const frAll = vs.filter(v=>v.lang && v.lang.toLowerCase().startsWith("fr"));
  // preferenza: fr-FR, voci "premium/enhanced" prima
  const score = v => (v.lang.toLowerCase()==="fr-fr"?10:0) + (/thomas|am[eé]lie|audrey|aurelie|premium|enhanced|natural/i.test(v.name)?5:0) + (v.localService?1:0);
  frVoice = frAll.sort((a,b)=>score(b)-score(a))[0] || null;
  itVoice = vs.find(v=>v.lang && v.lang.toLowerCase().startsWith("it")) || null;
}
if("speechSynthesis" in window){
  pickVoices();
  speechSynthesis.onvoiceschanged = pickVoices;
}

/* ============================================================
   speak / stopSpeech
   ============================================================ */
let lastSpeakText = "";

/* Ogni speak() prende un numero; stopSpeech() lo invalida. Serve per
   opts.onEnd: speechSynthesis.cancel() fa scattare comunque l'evento
   "end", quindi senza questo controllo cambiare schermata a metà
   battuta farebbe partire la frase successiva della catena sopra la
   schermata nuova. */
let speakToken = 0;

/* Unico punto che zittisce tutto: da quando la voce può arrivare da
   un <audio>, speechSynthesis.cancel() da solo non basta più. */
function stopSpeech(){
  speakToken++;
  if("speechSynthesis" in window) speechSynthesis.cancel();
  if(currentClip){
    currentClip.onended = currentClip.onerror = null;
    currentClip.pause();
    currentClip = null;
  }
  duckMusic(false);
}

/* opts.onEnd — chiamata a fine battuta, e solo se nel frattempo non è
   partito nient'altro. È ciò che permette di incatenare la narrazione
   italiana alla frase francese senza che si accavallino. */
function speak(text, opts = {}){
  stopSpeech();
  const mine = speakToken;
  const lang = opts.lang || "fr-FR";
  if(!opts.noRepeat && lang.startsWith("fr")) lastSpeakText = text;

  const chained = {
    ...opts,
    onEnd: () => { if(mine === speakToken && opts.onEnd) opts.onEnd(); },
  };
  const file = voiceIndex && voiceIndex[text];
  if(file){ playClip(file, text, chained); return; }
  speakSynth(text, lang, chained);
}

function playClip(file, text, opts){
  const el = new Audio("audio/" + file);
  el.volume = 1;
  currentClip = el;
  duckMusic(true);
  const done = () => {
    if(currentClip === el) currentClip = null;
    duckMusic(false);
  };
  el.onended = () => { done(); if(opts.onEnd) opts.onEnd(); };
  /* clip mancante o rete caduta a metà: la parola va comunque
     pronunciata, altrimenti il gioco chiede di riconoscere un suono
     che non è mai uscito. Il ripiego si porta dietro onEnd, così la
     catena italiano → francese non si spezza sulle clip mancanti. */
  const fallback = () => { done(); speakSynth(text, opts.lang || "fr-FR", opts); };
  el.onerror = fallback;
  el.play().catch(fallback);
}

function speakSynth(text, lang, opts = {}){
  if(!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  if(u.lang.startsWith("fr") && frVoice) u.voice = frVoice;
  if(u.lang.startsWith("it") && itVoice) u.voice = itVoice;
  u.rate = opts.rate || 0.82;   // lento, per bambini
  u.pitch = opts.pitch || 1.05;
  duckMusic(true);
  u.onend = u.onerror = () => { duckMusic(false); if(opts.onEnd) opts.onEnd(); };
  speechSynthesis.speak(u);
}

/* ============================================================
   MUSICA DI SOTTOFONDO
   Kevin MacLeod (incompetech.com), CC BY 4.0 — v. README.
   ============================================================ */
const MUSIC_TRACKS = {
  aventure: "music/aventure.mp3",   // mappa, menu, racconto
  jeu:      "music/jeu.mp3",        // dentro i giochi
};
const MUSIC_VOL = 0.20;   // sottofondo: deve restare sotto la voce
const DUCK_VOL  = 0.05;   // mentre qualcuno parla
const FADE_MS   = 400;

let musicEl = null, musicTrack = null, musicDucked = false, musicBlocked = false, musicSuspended = false;

function playMusic(trackId){
  if(!MUSIC_TRACKS[trackId] || musicTrack === trackId) return;
  musicTrack = trackId;
  if(!audioPref.music || musicSuspended) return;

  const next = new Audio(MUSIC_TRACKS[trackId]);
  next.loop = true;
  next.volume = 0;
  const prev = musicEl;
  musicEl = next;

  next.play().then(() => {
    musicBlocked = false;
    rampVolume(next, musicDucked ? DUCK_VOL : MUSIC_VOL, FADE_MS);
    if(prev) rampVolume(prev, 0, FADE_MS, () => prev.pause());
  }).catch(() => {
    /* i browser bloccano l'audio finché il bambino non tocca lo schermo:
       non è un errore, si riprova al primo tap (v. unblockMusic) */
    musicBlocked = true;
    if(prev) prev.pause();
  });
}

function duckMusic(on){
  musicDucked = on;
  if(musicEl && !musicEl.paused) rampVolume(musicEl, on ? DUCK_VOL : MUSIC_VOL, on ? 180 : 600);
}

/* Quando l'app suona una canzone (Frère Jacques & co.) il sottofondo va
   spento, non abbassato: due melodie in tonalità diverse insieme sono
   solo rumore. Coppia simmetrica, chiamata da playSong/stopSong. */
function suspendMusic(){
  musicSuspended = true;
  const el = musicEl;
  if(el) rampVolume(el, 0, 300, () => el.pause());
}
function resumeMusic(){
  if(!musicSuspended) return;
  musicSuspended = false;
  if(!audioPref.music) return;
  if(musicEl){
    musicEl.play().catch(() => { musicBlocked = true; });
    rampVolume(musicEl, musicDucked ? DUCK_VOL : MUSIC_VOL, 600);
  }else{
    const t = musicTrack; musicTrack = null; playMusic(t || "aventure");
  }
}

function musicEnabled(){ return audioPref.music; }

function setMusicEnabled(on){
  audioPref = {...audioPref, music: on};
  saveAudioPref(audioPref);
  if(on){
    const t = musicTrack; musicTrack = null; playMusic(t || "aventure");
  }else if(musicEl){
    const el = musicEl; musicEl = null;
    rampVolume(el, 0, FADE_MS, () => el.pause());
  }
  return on;
}

/* Rampa lineare: il salto secco di volume si sente più della musica stessa.

   Con requestAnimationFrame la rampa si CONGELAVA a metà appena la scheda
   passava in secondo piano — schermo bloccato mentre Foxy parla e la musica
   restava abbassata al ritorno, senza più nessuno a rialzarla. setInterval
   viene rallentato in background ma continua a girare, quindi il volume
   finale si raggiunge sempre.

   clearInterval iniziale: due rampe sullo stesso elemento (un ducking che
   parte durante un crossfade) si sovrascriverebbero a vicenda, lasciando
   il volume dove capita. */
function rampVolume(el, target, ms, onDone){
  clearInterval(el._ramp);
  const from = el.volume, t0 = performance.now();
  const apply = () => {
    const k = ms <= 0 ? 1 : Math.min(1, (performance.now() - t0) / ms);
    el.volume = Math.max(0, Math.min(1, from + (target - from) * k));
    if(k >= 1){
      clearInterval(el._ramp);
      el._ramp = null;
      if(onDone) onDone();
    }
  };
  el._ramp = setInterval(apply, 25);
  apply();
}

/* primo tocco: sblocca sia la musica sia il contesto degli effetti */
function unblockMusic(){
  if(musicBlocked && audioPref.music){
    const t = musicTrack; musicTrack = null; playMusic(t || "aventure");
  }
}
window.addEventListener("pointerdown", unblockMusic);

/* ============================================================
   EFFETTI — WebAudio, nessun file
   ============================================================ */
let audioCtx = null;
function ctx(){
  if(!audioCtx){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(AC) audioCtx = new AC();
  }
  if(audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
/* Ritorna l'oscillatore: una canzone schedula tutte le sue note in anticipo
   sul contesto WebAudio, quindi per fermarla davvero non basta cancellare i
   timer dell'evidenziazione — bisogna avere in mano i nodi e spegnerli. */
function tone(freq, start, dur, type="sine", vol=0.18){
  const c = ctx(); if(!c) return null;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  o.connect(g); g.connect(c.destination);
  o.start(c.currentTime + start); o.stop(c.currentTime + start + dur + 0.05);
  return o;
}
const sfx = {
  tap:   () => tone(520, 0, .08, "triangle", .1),
  pop:   () => { tone(640, 0, .06, "sine", .14); tone(220, .05, .1, "sine", .1); },
  good:  () => { tone(660,0,.12,"triangle"); tone(880,.11,.2,"triangle"); },
  bad:   () => tone(160, 0, .25, "square", .08),
  flip:  () => tone(420, 0, .07, "sine", .1),
  win:   () => { [523,659,784,1047].forEach((f,i)=>tone(f, i*.13, .22, "triangle")); },
  star:  () => { tone(1200,0,.1,"sine",.12); tone(1600,.08,.15,"sine",.12); },
};
