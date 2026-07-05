"use strict";

/* ============================================================
   STATO + STORAGE (immutabile: ogni update crea nuovo oggetto)
   ============================================================ */
const STORAGE_KEY = "petitrenard_v1";

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return {profiles:[], activeId:null};
    const parsed = JSON.parse(raw);
    if(!parsed || !Array.isArray(parsed.profiles)) return {profiles:[], activeId:null};
    return parsed;
  }catch(e){ return {profiles:[], activeId:null}; }
}
let state = loadState();

function setState(next){
  state = next;
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){}
}
function activeProfile(){
  return state.profiles.find(p => p.id === state.activeId) || null;
}
function updateProfile(patch){
  const next = {
    ...state,
    profiles: state.profiles.map(p => p.id === state.activeId ? {...p, ...patch} : p)
  };
  setState(next);
}
function setStars(unitId, gameId, stars){
  const p = activeProfile(); if(!p) return;
  const unitScores = {...(p.scores[unitId] || {})};
  unitScores[gameId] = Math.max(unitScores[gameId] || 0, stars);
  updateProfile({scores: {...p.scores, [unitId]: unitScores}});
}
/* adattività leggera: le parole sbagliate tornano più spesso */
function missKey(u, w){ return u.id + "|" + w.fr; }
function bumpMiss(u, w, delta){
  const p = activeProfile(); if(!p) return;
  const miss = {...(p.miss || {})};
  const k = missKey(u, w);
  const next = Math.max(0, (miss[k] || 0) + delta);
  if(next === 0) delete miss[k]; else miss[k] = next;
  updateProfile({miss});
}
function pickRounds(u, p, n){
  const miss = p.miss || {};
  const hard = shuffle(u.words.filter(w => miss[missKey(u,w)] > 0)).slice(0, 3);
  const rest = shuffle(u.words.filter(w => !hard.includes(w)));
  return shuffle([...hard, ...rest].slice(0, n));
}
function unitStars(p, unitId){
  const s = p.scores[unitId] || {};
  return Object.values(s).reduce((a,b)=>a+b,0);
}
function totalStars(p){
  return UNITS.reduce((sum,u)=>sum+unitStars(p,u.id),0);
}
function hasSticker(p, unitId){ return unitStars(p, unitId) >= STICKER_THRESHOLD; }

/* ============================================================
   AUDIO — Web Speech API (francese) + effetti WebAudio
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

let lastSpeakText = "";
function speak(text, opts = {}){
  if(!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = opts.lang || "fr-FR";
  if(u.lang.startsWith("fr") && frVoice) u.voice = frVoice;
  if(u.lang.startsWith("it") && itVoice) u.voice = itVoice;
  u.rate = opts.rate || 0.82;   // lento, per bambini
  u.pitch = opts.pitch || 1.05;
  if(!opts.noRepeat) lastSpeakText = u.lang.startsWith("fr") ? text : lastSpeakText;
  speechSynthesis.speak(u);
}

let audioCtx = null;
function ctx(){
  if(!audioCtx){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(AC) audioCtx = new AC();
  }
  if(audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function tone(freq, start, dur, type="sine", vol=0.18){
  const c = ctx(); if(!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  o.connect(g); g.connect(c.destination);
  o.start(c.currentTime + start); o.stop(c.currentTime + start + dur + 0.05);
}
const sfx = {
  tap:   () => tone(520, 0, .08, "triangle", .1),
  good:  () => { tone(660,0,.12,"triangle"); tone(880,.11,.2,"triangle"); },
  bad:   () => tone(160, 0, .25, "square", .08),
  flip:  () => tone(420, 0, .07, "sine", .1),
  win:   () => { [523,659,784,1047].forEach((f,i)=>tone(f, i*.13, .22, "triangle")); },
  star:  () => { tone(1200,0,.1,"sine",.12); tone(1600,.08,.15,"sine",.12); },
};

/* ============================================================
   CORIANDOLI
   ============================================================ */
const CONFETTI_COLORS = ["#FF6B57","#FFC53D","#5CB85C","#4FA8E8","#9B6BD4","#F272B0"];
function confetti(n = 36, emojis = null){
  for(let i=0;i<n;i++){
    const el = document.createElement("div");
    el.className = "confetto" + (emojis ? "" : " shape");
    if(emojis) el.textContent = emojis[Math.floor(Math.random()*emojis.length)];
    else el.style.background = CONFETTI_COLORS[Math.floor(Math.random()*CONFETTI_COLORS.length)];
    el.style.left = Math.random()*100 + "vw";
    el.style.animationDuration = (1.6 + Math.random()*1.6) + "s";
    el.style.animationDelay = (Math.random()*0.5) + "s";
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 4000);
  }
}

/* ============================================================
   HELPERS UI
   ============================================================ */
const $ = id => document.getElementById(id);
/* emoji → immagine Noto (animata dove esiste), fallback testo */
function em(emoji, cls = ""){
  const src = (typeof EMOJI_ASSET !== "undefined") && EMOJI_ASSET[emoji];
  if(src) return `<img class="aemoji ${cls}" src="${src}" alt="" loading="lazy" draggable="false">`;
  return `<span class="aemoji-txt ${cls}">${emoji}</span>`;
}
function foxReact(cls){
  const f = $("gameFox"); if(!f) return;
  f.classList.remove("jump","wobble"); void f.offsetWidth;
  f.classList.add(cls);
}
function show(screenId){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  const el = $(screenId);
  el.classList.remove("active");
  void el.offsetWidth; // riavvia animazione ingresso
  el.classList.add("active");
  window.scrollTo(0,0);
}
function shuffle(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}
function starsStr(n, max=3){
  return "⭐".repeat(n) + "☆".repeat(Math.max(0,max-n));
}
function wordVisual(w, cls="wemoji"){
  if(w.e) return `<div class="${cls}">${em(w.e)}</div>`;
  if(w.hex) return `<div class="${cls==="wemoji"?"wswatch":"mswatch"}" style="background:${w.hex}"></div>`;
  if(w.n) return `<div class="${cls==="wemoji"?"wdigit":"mword"}" style="font-size:${cls==="wemoji"?"":"1.6rem"}">${w.n}</div>`;
  return "";
}

/* ============================================================
   SCHERMATA PROFILI
   ============================================================ */
function renderProfiles(){
  const list = $("profileList");
  list.innerHTML = "";
  state.profiles.forEach((p,i)=>{
    const card = document.createElement("button");
    card.className = "profile-card";
    card.style.setProperty("--d", i*60+"ms");
    card.innerHTML = `<div class="face">${em(p.avatar)}</div><div class="pname">${escapeHtml(p.name)}</div><div class="pstars">⭐ ${totalStars(p)}</div>`;
    card.onclick = ()=>{
      sfx.tap();
      setState({...state, activeId: p.id});
      goHome(true);
    };
    list.appendChild(card);
  });
  if(state.profiles.length < 4){
    const add = document.createElement("button");
    add.className = "profile-card new";
    add.innerHTML = `<div class="face">➕</div><div class="pname">Nuovo</div><div class="pstars">&nbsp;</div>`;
    add.onclick = ()=>{ sfx.tap(); openNewProfile(); };
    list.appendChild(add);
  }
  show("screen-profiles");
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

/* ---------- nuovo profilo ---------- */
let npAvatar = AVATARS[0], npMode = "listen";
function openNewProfile(){
  npAvatar = AVATARS[Math.floor(Math.random()*AVATARS.length)];
  npMode = "listen";
  const pick = $("avatarPick");
  pick.innerHTML = "";
  AVATARS.forEach(a=>{
    const b = document.createElement("button");
    b.innerHTML = em(a);
    if(a===npAvatar) b.classList.add("sel");
    b.onclick = ()=>{
      sfx.tap();
      npAvatar = a;
      pick.querySelectorAll("button").forEach(x=>x.classList.toggle("sel", x===b));
    };
    pick.appendChild(b);
  });
  $("nameInput").value = "";
  $("modePick").querySelectorAll("button").forEach(b=>{
    b.classList.toggle("sel", b.dataset.mode===npMode);
  });
  show("screen-newprofile");
}
$("modePick").addEventListener("click", e=>{
  const b = e.target.closest("button[data-mode]"); if(!b) return;
  sfx.tap();
  npMode = b.dataset.mode;
  $("modePick").querySelectorAll("button").forEach(x=>x.classList.toggle("sel", x===b));
});
$("npBack").onclick = ()=>{ sfx.tap(); renderProfiles(); };
$("npCreate").onclick = ()=>{
  const name = $("nameInput").value.trim() || "Petit chef";
  const p = {
    id: "p" + Math.random().toString(36).slice(2,9),
    name, avatar: npAvatar, mode: npMode, scores: {}
  };
  setState({...state, profiles:[...state.profiles, p], activeId: p.id});
  sfx.win(); confetti(24);
  goHome(true);
};

/* ============================================================
   HOME
   ============================================================ */
const HOME_PHRASES = [
  "Salut! Scegli un mondo e giochiamo!",
  "Bonjour! Oggi che mondo esploriamo?",
  "Ogni gioco vinto = stelle! ⭐",
  "Vinci 6 stelle in un mondo per la figurina! 🏆",
];
function goHome(greet){
  const p = activeProfile();
  if(!p){ renderProfiles(); return; }
  $("homeProfile").innerHTML = `${em(p.avatar)} ${escapeHtml(p.name)}`;
  $("homeStars").innerHTML = `<span class="star">⭐</span> ${totalStars(p)}`;
  $("homeBubble").textContent = HOME_PHRASES[Math.floor(Math.random()*HOME_PHRASES.length)];
  $("homeMascot").innerHTML = em("🦊");
  const grid = $("unitGrid");
  grid.innerHTML = "";
  UNITS.forEach((u,i)=>{
    const stars = unitStars(p, u.id);
    const maxStars = availableGames(p).length * 3;
    const card = document.createElement("button");
    card.className = "unit-card";
    card.style.background = u.color;
    card.style.setProperty("--d", i*50+"ms");
    card.innerHTML = `
      ${hasSticker(p,u.id) ? '<div class="sticker-won">🏆</div>' : ''}
      <div class="uemoji">${em(u.emoji)}</div>
      <div class="ufr">${u.fr}</div>
      <div class="uit">${u.it}</div>
      <div class="ustars">⭐ ${stars}/${maxStars}</div>`;
    card.onclick = ()=>{ sfx.tap(); openUnit(u.id); };
    grid.appendChild(card);
  });
  show("screen-home");
  if(greet) speak("Salut !", {rate:0.9});
}
$("homeProfile").onclick = ()=>{ sfx.tap(); renderProfiles(); };
$("homeStickers").onclick = ()=>{ sfx.tap(); renderStickers(); };

/* ============================================================
   UNITÀ
   ============================================================ */
let currentUnit = null;
function availableGames(p){
  return GAMES.filter(g => !g.readerOnly || p.mode === "read");
}
function openUnit(unitId){
  const p = activeProfile(); if(!p) return renderProfiles();
  currentUnit = UNITS.find(u=>u.id===unitId);
  const u = currentUnit;
  $("unitHero").innerHTML = `
    <div class="uemoji">${em(u.emoji)}</div>
    <h2 style="color:${u.color}">${u.fr}</h2>
    <div class="uit">${u.it}</div>`;
  $("unitStarChip").innerHTML = `<span class="star">⭐</span> ${unitStars(p,u.id)}`;
  const list = $("gameList");
  list.innerHTML = "";
  availableGames(p).forEach((g,i)=>{
    const got = (p.scores[u.id]||{})[g.id] || 0;
    const card = document.createElement("button");
    card.className = "game-card";
    card.style.setProperty("--d", i*50+"ms");
    card.innerHTML = `
      <div class="gemoji">${em(g.emoji)}</div>
      <div class="gname">${g.name}</div>
      <div class="gsub">${g.sub}</div>
      <div class="gstars">${starsStr(got)}</div>`;
    card.onclick = ()=>{ sfx.tap(); startGame(g.id); };
    list.appendChild(card);
  });
  show("screen-unit");
  speak(u.fr, {rate:0.85});
}
$("unitBack").onclick = ()=>{ sfx.tap(); goHome(false); };

/* ============================================================
   MOTORE GIOCHI
   ============================================================ */
let game = null; // stato del gioco corrente

$("gameBack").onclick = ()=>{
  sfx.tap();
  speechSynthesis.cancel();
  openUnit(currentUnit.id);
};
$("gameRepeat").onclick = ()=>{
  if(lastSpeakText) speak(lastSpeakText);
};

function startGame(gameId){
  const p = activeProfile();
  const u = currentUnit;
  if(gameId === "explore") startExplore(u);
  else if(gameId === "find") startFind(u, p);
  else if(gameId === "memory") startMemory(u, p);
  else if(gameId === "read") startRead(u);
  else if(gameId === "spell") startSpell(u);
  show("screen-game");
}
function setDots(total, doneArr){
  const dots = $("gameDots");
  dots.innerHTML = "";
  for(let i=0;i<total;i++){
    const d = document.createElement("div");
    d.className = "pdot" + (doneArr[i]==="ok" ? " done" : doneArr[i]==="bad" ? " bad" : "");
    dots.appendChild(d);
  }
}

/* ---------- GIOCO 1: Scopri (tocca e ascolta) ---------- */
function startExplore(u){
  const heard = new Set();
  setDots(u.words.length, []);
  const area = $("gameArea");
  const p = activeProfile();
  const showText = p.mode === "read";
  area.innerHTML = `
    <div class="mascot-row">
      <div class="mascot">${em("🦊")}</div>
      <div class="bubble">Tocca ogni carta e ascolta! Tocca tutto per vincere la stella!</div>
    </div>
    <div class="card-grid g4" id="exploreGrid"></div>`;
  const grid = $("exploreGrid");
  u.words.forEach((w,i)=>{
    const c = document.createElement("button");
    c.className = "word-card";
    c.style.setProperty("--d", i*40+"ms");
    c.innerHTML = `${wordVisual(w)}<div class="wlabel">${showText ? w.fr : ""}</div>`;
    c.onclick = ()=>{
      speak(w.fr);
      c.classList.add("heard");
      c.classList.remove("correct"); void c.offsetWidth; c.classList.add("correct");
      setTimeout(()=>c.classList.remove("correct"), 650);
      if(!heard.has(i)){
        heard.add(i);
        setDots(u.words.length, [...Array(u.words.length)].map((_,k)=>heard.has(k)?"ok":""));
        if(heard.size === u.words.length){
          setTimeout(()=>finishGame("explore", 3, u), 900);
        }
      }
    };
    grid.appendChild(c);
  });
}

/* ---------- GIOCO 2: Trova! (ascolta e tocca) ---------- */
function startFind(u, p){
  const ROUNDS = 8;
  const showText = p.mode === "read";
  const seq = pickRounds(u, p, ROUNDS);
  const results = [];
  let round = 0, errorsTotal = 0;

  function playRound(){
    if(round >= seq.length){
      const stars = errorsTotal === 0 ? 3 : errorsTotal <= 2 ? 2 : 1;
      finishGame("find", stars, u);
      return;
    }
    const target = seq[round];
    const others = shuffle(u.words.filter(w=>w!==target)).slice(0,3);
    const options = shuffle([target, ...others]);
    let roundError = false, locked = false;

    setDots(ROUNDS, results);
    const area = $("gameArea");
    area.innerHTML = `
      <div class="prompt-zone">
        <button class="big-audio" id="bigAudio">🔊</button>
        <div class="hint">${showText ? `<span class="fr-word">${target.fr}</span>` : "Ascolta e tocca!"}</div>
      </div>
      <div class="card-grid g4" id="findGrid"></div>
      <div class="game-fox" id="gameFox">${em("🦊")}</div>`;
    $("bigAudio").onclick = ()=>speak(target.fr);
    const grid = $("findGrid");
    options.forEach((w,i)=>{
      const c = document.createElement("button");
      c.className = "word-card";
      c.style.setProperty("--d", i*45+"ms");
      c.innerHTML = `${wordVisual(w)}`;
      c.onclick = ()=>{
        if(locked) return;
        if(w === target){
          locked = true;
          c.classList.add("correct");
          c.innerHTML += `<div class="wlabel" style="color:#fff">${w.fr}</div>`;
          sfx.good();
          foxReact("jump");
          speak(target.fr, {rate:0.85});
          results.push(roundError ? "bad" : "ok");
          if(roundError) errorsTotal++; else bumpMiss(u, target, -1);
          setDots(ROUNDS, results);
          round++;
          setTimeout(playRound, 1300);
        }else{
          if(!roundError) bumpMiss(u, target, +1);
          roundError = true;
          c.classList.add("wrong");
          sfx.bad();
          foxReact("wobble");
          setTimeout(()=>{ c.classList.remove("wrong"); c.classList.add("dim"); }, 450);
        }
      };
      grid.appendChild(c);
    });
    setTimeout(()=>speak(target.fr), 450);
  }
  playRound();
}

/* ---------- GIOCO 3: Memory ---------- */
function startMemory(u, p){
  const PAIRS = 6;
  const showText = p.mode === "read";
  const chosen = shuffle(u.words).slice(0, PAIRS);
  // modalità lettura: coppia = visuale ↔ parola scritta; ascolto: due carte visuali uguali
  const cards = shuffle(chosen.flatMap(w => showText
    ? [{w, kind:"visual"}, {w, kind:"word"}]
    : [{w, kind:"visual"}, {w, kind:"visual"}]));
  let first = null, locked = false, matched = 0, misses = 0;

  setDots(PAIRS, []);
  const area = $("gameArea");
  area.innerHTML = `
    <div class="mascot-row">
      <div class="mascot">${em("🦊")}</div>
      <div class="bubble">Trova le coppie! ${showText ? "Unisci figura e parola." : ""}</div>
    </div>
    <div class="mem-grid" id="memGrid"></div>`;
  const grid = $("memGrid");
  const doneArr = [];

  cards.forEach(card=>{
    const el = document.createElement("button");
    el.className = "mem-card";
    const backContent = card.kind === "word"
      ? `<div class="mword">${card.w.fr}</div>`
      : `${wordVisual(card.w, "m")}${showText ? "" : ""}`;
    el.innerHTML = `<div class="mem-inner"><div class="mem-face mem-front"></div><div class="mem-face mem-back">${backContent}</div></div>`;
    el.onclick = ()=>{
      if(locked || el.classList.contains("flip")) return;
      sfx.flip();
      el.classList.add("flip");
      speak(card.w.fr, {rate:0.88});
      if(!first){ first = {el, card}; return; }
      locked = true;
      const isMatch = first.card.w === card.w && first.el !== el;
      if(isMatch){
        matched++;
        doneArr.push("ok");
        setDots(PAIRS, doneArr);
        const a = first.el, b = el;
        setTimeout(()=>{
          a.classList.add("matched"); b.classList.add("matched");
          sfx.good();
          first = null; locked = false;
          if(matched === PAIRS){
            const stars = misses <= 2 ? 3 : misses <= 5 ? 2 : 1;
            setTimeout(()=>finishGame("memory", stars, u), 800);
          }
        }, 350);
      }else{
        misses++;
        const a = first.el, b = el;
        setTimeout(()=>{
          a.classList.remove("flip"); b.classList.remove("flip");
          first = null; locked = false;
        }, 950);
      }
    };
    grid.appendChild(el);
  });
}

/* ---------- GIOCO 4: Leggi (solo modalità lettura) ---------- */
function startRead(u){
  const ROUNDS = 8;
  const pool = pickRounds(u, activeProfile(), ROUNDS);
  const results = [];
  let round = 0, errorsTotal = 0;

  function playRound(){
    if(round >= pool.length){
      const stars = errorsTotal === 0 ? 3 : errorsTotal <= 2 ? 2 : 1;
      finishGame("read", stars, u);
      return;
    }
    const target = pool[round];
    const others = shuffle(u.words.filter(w=>w!==target)).slice(0,2);
    const options = shuffle([target, ...others]);
    let roundError = false, locked = false;

    setDots(ROUNDS, results);
    const area = $("gameArea");
    area.innerHTML = `
      <div class="prompt-zone">
        ${promptVisual(target)}
        <div class="hint">Come si dice in francese?</div>
      </div>
      <div class="card-grid g3" id="readGrid"></div>`;
    const grid = $("readGrid");
    options.forEach(w=>{
      const c = document.createElement("button");
      c.className = "word-card";
      c.style.minHeight = "84px";
      c.innerHTML = `<div class="wlabel" style="font-size:1.35rem">${w.fr}</div>`;
      c.onclick = ()=>{
        if(locked) return;
        if(w === target){
          locked = true;
          c.classList.add("correct");
          sfx.good();
          speak(target.fr);
          results.push(roundError ? "bad" : "ok");
          if(roundError) errorsTotal++; else bumpMiss(u, target, -1);
          setDots(ROUNDS, results);
          round++;
          setTimeout(playRound, 1200);
        }else{
          if(!roundError) bumpMiss(u, target, +1);
          roundError = true;
          c.classList.add("wrong");
          sfx.bad();
          speak(w.fr, {noRepeat:true});
          setTimeout(()=>{ c.classList.remove("wrong"); c.classList.add("dim"); }, 450);
        }
      };
      grid.appendChild(c);
    });
  }
  playRound();
}

/* ---------- GIOCO 5: Scrivi (spelling, solo modalità lettura) ---------- */
function bareWord(w){ return w.fr.replace(/^(le |la |les |l')/, ""); }
function promptVisual(w){
  if(w.e) return `<div class="prompt-emoji">${em(w.e)}</div>`;
  if(w.hex) return `<div class="wswatch" style="background:${w.hex};width:84px;height:84px;margin:0 auto"></div>`;
  if(w.n) return `<div class="wdigit" style="font-size:4.5rem">${w.n}</div>`;
  return "";
}
function startSpell(u){
  const spellable = u.words.filter(w => /^[a-zàâçéèêëîïôùûüœ-]+$/i.test(bareWord(w)) && bareWord(w).length <= 9);
  const pool = shuffle(spellable).slice(0, 6);
  const results = [];
  let round = 0, errorsTotal = 0;

  function playRound(){
    if(round >= pool.length){
      const stars = errorsTotal === 0 ? 3 : errorsTotal <= 3 ? 2 : 1;
      finishGame("spell", stars, u);
      return;
    }
    const target = pool[round];
    const letters = bareWord(target).toLowerCase().split("");
    let pos = 0, roundError = false;

    setDots(pool.length, results);
    const area = $("gameArea");
    area.innerHTML = `
      <div class="prompt-zone">
        ${promptVisual(target)}
        <div class="spell-slots" id="spellSlots">${letters.map(()=>'<div class="spell-slot"></div>').join("")}</div>
      </div>
      <div class="spell-tiles" id="spellTiles"></div>`;
    const slots = [...area.querySelectorAll(".spell-slot")];
    const tilesBox = $("spellTiles");
    shuffle(letters.map((ch,i)=>({ch,i}))).forEach(t=>{
      const b = document.createElement("button");
      b.className = "spell-tile";
      b.textContent = t.ch;
      b.onclick = ()=>{
        if(b.classList.contains("used")) return;
        if(t.ch === letters[pos]){
          sfx.tap();
          slots[pos].textContent = t.ch;
          slots[pos].classList.add("filled");
          b.classList.add("used");
          pos++;
          if(pos === letters.length){
            sfx.good();
            speak(target.fr);
            results.push(roundError ? "bad" : "ok");
            if(roundError) errorsTotal++;
            setDots(pool.length, results);
            round++;
            setTimeout(playRound, 1400);
          }
        }else{
          roundError = true;
          sfx.bad();
          b.classList.remove("wrong"); void b.offsetWidth; b.classList.add("wrong");
        }
      };
      tilesBox.appendChild(b);
    });
    setTimeout(()=>speak(target.fr), 400);
  }
  playRound();
}

/* ---------- FINE GIOCO ---------- */
const PRAISE = ["Bravo !", "Super !", "Magnifique !", "Génial !", "Très bien !"];
function finishGame(gameId, stars, u){
  const p = activeProfile();
  const hadSticker = hasSticker(p, u.id);
  setStars(u.id, gameId, stars);
  const pNow = activeProfile();
  const newSticker = !hadSticker && hasSticker(pNow, u.id);

  sfx.win();
  confetti(stars * 14);
  if(newSticker) setTimeout(()=>confetti(30, [u.emoji,"🏆","⭐"]), 900);

  const praise = PRAISE[Math.floor(Math.random()*PRAISE.length)];
  const area = $("gameArea");
  setDots(0, []);
  area.innerHTML = `
    <div class="win-zone">
      <div class="wmascot">${em("🦊")}</div>
      <h2>${praise}</h2>
      <div class="wstars">${[0,1,2].map(i=>`<span data-i="${i}">${i<stars?"⭐":"☆"}</span>`).join("")}</div>
      ${newSticker ? `<div style="font-size:1.3rem;font-weight:700;margin:8px 0">🏆 Hai vinto la figurina <b>${u.fr}</b>!</div>` : ""}
      <div class="win-actions">
        <button class="btn sun" id="winAgain">🔁 Ancora!</button>
        <button class="btn primary" id="winNext">➡️ Continua</button>
      </div>
    </div>`;
  area.querySelectorAll(".wstars span").forEach((s,i)=>{
    setTimeout(()=>{ s.classList.add("on"); if(i<stars) sfx.star(); }, 350 + i*380);
  });
  speak(praise, {rate:0.9});
  $("winAgain").onclick = ()=>{ sfx.tap(); startGame(gameId); };
  $("winNext").onclick = ()=>{ sfx.tap(); openUnit(u.id); };
}

/* ============================================================
   ALBUM FIGURINE
   ============================================================ */
function renderStickers(){
  const p = activeProfile(); if(!p) return renderProfiles();
  const grid = $("stickerGrid");
  grid.innerHTML = "";
  UNITS.forEach((u,i)=>{
    const won = hasSticker(p, u.id);
    const slot = document.createElement(won ? "button" : "div");
    slot.className = "sticker-slot" + (won ? "" : " locked");
    slot.style.setProperty("--d", i*50+"ms");
    slot.innerHTML = `
      <div class="semoji">${em(u.emoji)}</div>
      <div class="sname">${u.fr}</div>
      <div style="font-size:.85rem;font-weight:600;color:${won ? "var(--leaf)" : "var(--ink-soft)"}">
        ${won ? "🏆 Vinta!" : `⭐ ${unitStars(p,u.id)}/${STICKER_THRESHOLD}`}
      </div>`;
    if(won) slot.onclick = ()=>{ speak(u.fr); confetti(10, [u.emoji,"⭐"]); };
    grid.appendChild(slot);
  });
  show("screen-stickers");
}
$("stickBack").onclick = ()=>{ sfx.tap(); goHome(false); };

/* ============================================================
   CHANSONS — karaoke di filastrocche (melodie WebAudio)
   ============================================================ */
let songTimers = [];
function stopSong(){
  songTimers.forEach(clearTimeout);
  songTimers = [];
  document.querySelectorAll(".song-line").forEach(l=>l.classList.remove("now"));
  const fox = $("songFox"); if(fox) fox.classList.remove("dance");
  const play = $("songPlay");
  if(play){ play.dataset.playing = ""; play.innerHTML = "▶️ Suona!"; }
}
function midiFreq(m){ return 440 * Math.pow(2, (m - 69) / 12); }
function playSong(song){
  stopSong();
  speechSynthesis.cancel();
  const c = ctx(); if(!c) return;
  const play = $("songPlay");
  play.dataset.playing = "1";
  play.innerHTML = "⏹️ Stop";
  $("songFox").classList.add("dance");
  const beat = 60 / song.tempo;
  const lines = [...document.querySelectorAll(".song-line")];
  let t = 0.2;
  song.lines.forEach((line, li)=>{
    songTimers.push(setTimeout(()=>{
      lines.forEach(l=>l.classList.remove("now"));
      if(lines[li]) lines[li].classList.add("now");
    }, t * 1000));
    line.notes.forEach(([midi, dur])=>{
      tone(midiFreq(midi), t, dur * beat * 0.9, "triangle", 0.16);
      t += dur * beat;
    });
    t += beat * 0.5; // respiro tra i versi
  });
  songTimers.push(setTimeout(()=>{
    stopSong();
    sfx.win();
    confetti(22, ["🎵","🎶","⭐"]);
  }, t * 1000 + 200));
}
function renderSongs(){
  stopSong();
  const list = $("songList");
  list.innerHTML = "";
  SONGS.forEach((s,i)=>{
    const card = document.createElement("button");
    card.className = "song-card";
    card.style.setProperty("--d", i*60+"ms");
    card.innerHTML = `<span class="semoji">${em(s.emoji)}</span> ${s.title}`;
    card.onclick = ()=>{ sfx.tap(); openSong(s.id); };
    list.appendChild(card);
  });
  show("screen-songs");
}
function openSong(songId){
  stopSong();
  const s = SONGS.find(x=>x.id===songId);
  $("songHead").innerHTML = `
    <div class="song-fox" id="songFox">${em("🦊")}</div>
    <h2>${em(s.emoji)} ${s.title}</h2>`;
  const box = $("songLines");
  box.innerHTML = "";
  s.lines.forEach(line=>{
    const l = document.createElement("button");
    l.className = "song-line";
    l.textContent = line.text;
    l.onclick = ()=>speak(line.text, {rate:0.8});
    box.appendChild(l);
  });
  const play = $("songPlay");
  play.dataset.playing = "";
  play.innerHTML = "▶️ Suona!";
  play.onclick = ()=>{
    if(play.dataset.playing) stopSong();
    else playSong(s);
  };
  show("screen-song");
}
$("homeSongs").onclick = ()=>{ sfx.tap(); renderSongs(); };
$("songsBack").onclick = ()=>{ sfx.tap(); stopSong(); goHome(false); };
$("songBack").onclick = ()=>{ sfx.tap(); stopSong(); speechSynthesis.cancel(); renderSongs(); };

/* ============================================================
   NUVOLE DECORATIVE
   ============================================================ */
(function makeClouds(){
  for(let i=0;i<3;i++){
    const cl = document.createElement("div");
    cl.className = "cloud";
    cl.innerHTML = '<i class="c1"></i><i class="c2"></i><i class="c3"></i>';
    cl.style.top = (4 + Math.random()*22) + "vh";
    cl.style.setProperty("--s", (0.6 + Math.random()*0.7).toFixed(2));
    cl.style.animationDuration = (55 + Math.random()*50) + "s";
    cl.style.animationDelay = (-Math.random()*60) + "s";
    document.body.appendChild(cl);
  }
})();

/* ============================================================
   AVVIO
   ============================================================ */
if(activeProfile()) goHome(false);
else renderProfiles();