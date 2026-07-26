"use strict";
/* ============================================================
   I CINQUE GIOCHI — estratti da app.js, comportamento invariato.
   Dipendono dai global helper definiti in app.js.
   ============================================================ */

/* ---------- GIOCO 1: Scopri (tocca e ascolta) ---------- */
function startExplore(u){
  const heard = new Set();
  setDots(u.words.length, []);
  const area = $("gameArea");
  const p = activeProfile();
  const showText = p.mode === "read";
  area.innerHTML = `
    <div class="mascot-row">
      <div class="mascot">${foxSvg("montre", {size:88})}</div>
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
