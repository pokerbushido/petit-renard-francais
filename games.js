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
      <div class="mascot has-svg">${foxSvg("montre", {size:88})}</div>
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
        <div class="hint">${showText ? `<span class="fr-word">${target.fr}</span>` : "<b>Écoute et touche !</b><small>Ascolta e tocca</small>"}</div>
      </div>
      <div class="card-grid g4" id="findGrid"></div>
      <div class="game-fox has-svg" id="gameFox">${foxSvg("idle", {size:56})}</div>`;
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
          sparkleAt(c);
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
      <div class="mascot has-svg">${foxSvg("curieux", {size:88})}</div>
      <div class="bubble"><b>Trouve les paires !</b><small>Trova le coppie${showText ? " · unisci figura e parola" : ""}</small></div>
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
          sparkleAt(b);
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
          sparkleAt(c);
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
            sparkleAt($("spellSlots"));
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

/* ---------- micro-round per il runner dei capitoli ----------
   Riusa la logica dei giochi su una sola parola e richiama
   onDone(errori) invece di finishGame. */
function playRound(gameId, unit, word, onDone){
  const p = activeProfile();
  if(gameId === "find")        return roundFind(unit, word, p, onDone);
  if(gameId === "catch")       return roundCatch(unit, word, p, onDone);
  if(gameId === "read")        return roundRead(unit, word, onDone);
  if(gameId === "spell")       return roundSpell(unit, word, onDone);
  if(gameId === "memory")      return roundMemory(unit, word, p, onDone);
  return roundExplore(unit, word, onDone); // "explore" e fallback
}

/* helper comune: intestazione con Foxy e la consegna.
   id="gameFox" dà a foxReact() (app.js) un bersaglio: senza, "jump"/"wobble"
   non trovano l'elemento e la reazione alla risposta sbagliata è invisibile. */
function roundHead(pose, testo){
  return `<div class="mascot-row">
    <div class="mascot has-svg" id="gameFox">${foxSvg(pose, {size:84})}</div>
    <div class="bubble">${testo}</div>
  </div>`;
}
/* helper comune: reazione all'errore. Mai un fallimento, solo un invito a riprovare. */
function roundMiss(unit, word){
  sfx.bad();
  foxReact("wobble");
  bumpMiss(unit, word, +1);
}

/* Scopri: una carta sola, si tocca e si ascolta. Non si può sbagliare.
   Il tocco si può ripetere (si vuole risentire la parola): solo il primo
   fa avanzare il round, altrimenti tre tocchi rapidi salterebbero i round
   successivi (onDone chiamato più volte). */
function roundExplore(unit, word, onDone){
  const p = activeProfile();
  const area = $("gameArea");
  let clicked = false;
  area.innerHTML = roundHead("montre", "<b>Écoute !</b><small>Tocca la carta e ascolta</small>") +
    `<div class="card-grid g1"><button class="card" id="rcard">
       ${wordVisual(word)}
       ${p.mode === "read" ? `<div class="cword">${escapeHtml(word.fr)}</div>` : ""}
     </button></div>`;
  $("rcard").onclick = ()=>{
    sfx.tap();
    speak(word.fr);
    if(clicked) return;
    clicked = true;
    $("rcard").classList.add("done");
    sparkleAt($("rcard"));
    bumpMiss(unit, word, -1);
    setTimeout(()=> onDone(0), 1200);
  };
  /* tracciato in roundTimer (chapter.js): abortChapter() lo cancella, così
     ⬅️ premuto appena dopo l'apertura del round non fa parlare Foxy a vuoto */
  roundTimer = setTimeout(()=> speak(word.fr), 400);
}

/* Trova!: ascolta la parola, tocca l'immagine giusta fra quattro. */
function roundFind(unit, word, p, onDone){
  const distrattori = shuffle(unit.words.filter(w => w !== word)).slice(0, 3);
  const scelte = shuffle([word, ...distrattori]);
  let errori = 0, locked = false;
  const area = $("gameArea");
  area.innerHTML = roundHead("parle", "<b>Écoute et touche !</b><small>Ascolta e tocca quella giusta</small>") +
    `<div class="card-grid g2" id="rgrid"></div>`;
  const grid = $("rgrid");
  scelte.forEach(w=>{
    const b = document.createElement("button");
    b.className = "card";
    b.innerHTML = wordVisual(w);
    b.onclick = ()=>{
      if(locked) return;
      if(w === word){
        locked = true;
        sfx.good(); sparkleAt(b); foxReact("jump"); speak(word.fr);
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
  /* v. commento in roundExplore: tracciato per poter essere cancellato da abortChapter() */
  roundTimer = setTimeout(()=> speak(word.fr), 500);
}

/* Leggi: la parola scritta, si tocca l'immagine giusta. Solo modalità lettura. */
function roundRead(unit, word, onDone){
  const distrattori = shuffle(unit.words.filter(w => w !== word)).slice(0, 3);
  const scelte = shuffle([word, ...distrattori]);
  let errori = 0, locked = false;
  const area = $("gameArea");
  area.innerHTML = roundHead("montre", "<b>C'est lequel ?</b><small>Quale di queste è…</small>") +
    `<div class="prompt-zone"><div class="prompt-word">${escapeHtml(word.fr)}</div></div>
     <div class="card-grid g2" id="rgrid"></div>`;
  const grid = $("rgrid");
  scelte.forEach(w=>{
    const b = document.createElement("button");
    b.className = "card";
    b.innerHTML = wordVisual(w);
    b.onclick = ()=>{
      if(locked) return;
      if(w === word){
        locked = true;
        sfx.good(); sparkleAt(b); foxReact("jump"); speak(word.fr);
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
   Le lettere sbagliate non fanno nulla di male: si può insistere.
   buildChapterRounds non filtra le parole "componibili" come fa startSpell
   in free-play: una frase con spazi/apostrofi (es. "au revoir") darebbe
   una tessera vuota o con l'apostrofo, illeggibile per un bambino. Si
   applica qui lo stesso filtro di startSpell e, se fallisce, si passa
   a Leggi (che quella parola la sa sempre gestire). */
function roundSpell(unit, word, onDone){
  const parola = bareWord(word);
  const spellable = /^[a-zàâçéèêëîïôùûüœ-]+$/i.test(parola) && parola.length <= 9;
  if(!spellable) return roundRead(unit, word, onDone);
  const lettere = parola.toLowerCase().split("");
  let pos = 0, errori = 0;
  const area = $("gameArea");
  area.innerHTML = roundHead("montre", "<b>Écris le mot !</b><small>Componi la parola</small>") +
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
          sfx.good(); sparkleAt(b); foxReact("jump"); speak(word.fr);
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
  /* v. commento in roundExplore: tracciato per poter essere cancellato da abortChapter() */
  roundTimer = setTimeout(()=> speak(word.fr), 400);
}

/* ============================================================
   ATTRAPE ! — bolle che salgono, si scoppia quella giusta.
   Il gioco "d'azione" alla Studycat: le carte volano invece di
   stare ferme. Le bolle sbagliate non si fermano mai: scoppiare
   quella giusta è l'unico modo di chiudere il round.
   ============================================================ */

/* Le bolle nascono sotto il bordo e salgono in loop (delay negativo =
   già in volo). Alla presa giusta la bolla viene congelata dov'è
   (l'animazione CSS va rimossa PRIMA di leggere la posizione, sennò
   il pop riparte dal fondo) e scoppia sul posto. */
function spawnBubbles(sky, options, onTap){
  options.forEach((w, i)=>{
    const b = document.createElement("button");
    b.className = "bubble-item";
    const lane = 4 + i * (86 / options.length) + Math.random() * 8;
    b.style.setProperty("--lane", lane + "%");
    b.style.setProperty("--dur", (6 + Math.random() * 3).toFixed(2) + "s");
    b.style.setProperty("--delay", (-Math.random() * 5).toFixed(2) + "s");
    b.innerHTML = `<span class="bubble-skin"></span>${wordVisual(w, "bemoji")}`;
    b.onclick = ()=> onTap(w, b);
    sky.appendChild(b);
  });
}
function popBubble(b, sky){
  const r = b.getBoundingClientRect(), s = sky.getBoundingClientRect();
  b.style.animation = "none";
  b.style.bottom = "auto";
  b.style.top  = (r.top - s.top) + "px";
  b.style.left = (r.left - s.left) + "px";
  b.classList.add("popped");
}

function startCatch(u, p){
  const ROUNDS = 6;
  const showText = p.mode === "read";
  const seq = pickRounds(u, p, ROUNDS);
  const results = [];
  let round = 0, errorsTotal = 0;

  function playRoundC(){
    if(round >= seq.length){
      const stars = errorsTotal === 0 ? 3 : errorsTotal <= 2 ? 2 : 1;
      finishGame("catch", stars, u);
      return;
    }
    const target = seq[round];
    const others = shuffle(u.words.filter(w=>w!==target)).slice(0,3);
    const options = shuffle([target, ...others]);
    let roundError = false, locked = false;

    setDots(ROUNDS, results);
    const area = $("gameArea");
    area.innerHTML = `
      <div class="prompt-zone catch-prompt">
        <button class="big-audio" id="bigAudio">🔊</button>
        <div class="hint">${showText ? `<span class="fr-word">${target.fr}</span>` : "<b>Attrape !</b><small>Scoppia la bolla giusta</small>"}</div>
      </div>
      <div class="catch-sky" id="catchSky"></div>
      <div class="game-fox has-svg" id="gameFox">${foxSvg("montre", {size:56})}</div>`;
    $("bigAudio").onclick = ()=>speak(target.fr);
    const sky = $("catchSky");
    spawnBubbles(sky, options, (w, b)=>{
      if(locked) return;
      if(w === target){
        locked = true;
        popBubble(b, sky);
        sfx.pop(); sfx.good();
        sparkleAt(b);
        foxReact("jump");
        speak(target.fr, {rate:0.85});
        results.push(roundError ? "bad" : "ok");
        if(roundError) errorsTotal++; else bumpMiss(u, target, -1);
        setDots(ROUNDS, results);
        round++;
        setTimeout(playRoundC, 1300);
      }else{
        if(!roundError) bumpMiss(u, target, +1);
        roundError = true;
        sfx.bad();
        foxReact("wobble");
        b.classList.remove("bubble-no"); void b.offsetWidth; b.classList.add("bubble-no");
        speak(target.fr);
      }
    });
    setTimeout(()=>speak(target.fr), 450);
  }
  playRoundC();
}

/* micro-round del runner: una parola, quattro bolle */
function roundCatch(unit, word, p, onDone){
  const distrattori = shuffle(unit.words.filter(w => w !== word)).slice(0, 3);
  const scelte = shuffle([word, ...distrattori]);
  let errori = 0, locked = false;
  const area = $("gameArea");
  area.innerHTML = roundHead("montre", "<b>Attrape !</b><small>Scoppia la bolla giusta</small>") +
    `<div class="catch-sky" id="rsky"></div>`;
  const sky = $("rsky");
  spawnBubbles(sky, scelte, (w, b)=>{
    if(locked) return;
    if(w === word){
      locked = true;
      popBubble(b, sky);
      sfx.pop(); sfx.good();
      sparkleAt(b);
      foxReact("jump");
      speak(word.fr);
      bumpMiss(unit, word, -1);
      setTimeout(()=> onDone(errori), 1100);
    }else{
      errori++;
      roundMiss(unit, word);
      b.classList.remove("bubble-no"); void b.offsetWidth; b.classList.add("bubble-no");
      speak(word.fr);
    }
  });
  /* v. commento in roundExplore: tracciato per poter essere cancellato da abortChapter() */
  roundTimer = setTimeout(()=> speak(word.fr), 500);
}

/* ============================================================
   RÉPÈTE ! — ascolta Foxy, registra la tua voce, riascoltala.
   È il VoicePlay di Studycat in versione onesta: nessun giudizio
   sulla pronuncia, la magia è sentire la PROPRIA voce dire la
   parola. Non si può sbagliare: 3 stelle a chi arriva in fondo.
   ============================================================ */
let micStream = null;
let micUrl = null;
let micRecorder = null;
/* Stesso schema-token del chapter runner: ogni uscita dal gioco lo
   invalida, e i callback asincroni ancora in volo (onstop del recorder,
   onended del playback, getUserMedia che risolve tardi) se ne accorgono
   e non toccano più né lo schermo né l'audio. Senza, uscire a metà
   registrazione faceva riprodurre la voce — con volpe che salta e
   #gameArea sovrascritto — sopra il gioco successivo. */
let repeteToken = 0;
/* chiamata da gameBack/startGame (app.js): spegne il microfono se il
   bambino esce a metà gioco — la lucina rossa non deve restare accesa */
function stopMicGame(){
  repeteToken++;
  if(micRecorder){
    micRecorder.onstop = micRecorder.ondataavailable = null;
    try{ if(micRecorder.state !== "inactive") micRecorder.stop(); }catch(e){}
    micRecorder = null;
  }
  if(micStream){ micStream.getTracks().forEach(t=>t.stop()); micStream = null; }
  if(micUrl){ URL.revokeObjectURL(micUrl); micUrl = null; }
}

function startRepete(u, p){
  const WORDS = 5;
  const showText = p.mode === "read";
  const pool = pickRounds(u, p, WORDS);
  const results = [];
  let i = 0, recTimer = null;
  /* startGame ha appena chiamato stopMicGame(), che ha incrementato il
     token: questo è il valore di QUESTA partita. */
  const myToken = repeteToken;

  function playWord(){
    if(myToken !== repeteToken) return;
    if(i >= pool.length){
      stopMicGame();
      finishGame("repete", 3, u);   // partecipare È vincere: mai giudizio sulla voce
      return;
    }
    const w = pool[i];
    setDots(WORDS, results);
    const area = $("gameArea");
    area.innerHTML = roundHead("parle", "<b>Répète après moi !</b><small>Ascolta, poi tieni premuto il microfono e ripeti</small>") +
      `<div class="card-grid g1"><div class="card repete-card">
         ${wordVisual(w)}
         ${showText ? `<div class="cword">${escapeHtml(w.fr)}</div>` : ""}
       </div></div>
       <div class="repete-controls">
         <button class="btn round sun" id="repHear" title="Riascolta">🔊</button>
         <button class="mic-btn" id="micBtn">🎤</button>
       </div>
       <p class="repete-hint" id="repHint">Tieni premuto e parla!</p>`;
    $("repHear").onclick = ()=>speak(w.fr, {rate:0.85});
    bindMic(w);
    /* differito: startGame chiama show() DOPO questa funzione, e show()
       azzera il parlato — uno speak sincrono qui verrebbe tagliato.
       Alla prima parola Foxy si presenta, poi si va dritti al punto. */
    setTimeout(()=>{
      if(i === 0) speak("Répète après moi !", {rate:0.9, noRepeat:true,
        onEnd: ()=>speak(w.fr, {rate:0.85})});
      else speak(w.fr, {rate:0.85});
    }, 400);
  }

  function bindMic(w){
    const btn = $("micBtn"), hint = $("repHint");
    let chunks = [];
    /* il permesso microfono può arrivare DOPO che il dito si è già
       alzato: senza questo flag la registrazione partirebbe orfana e
       andrebbe avanti da sola fino al tetto dei 5 secondi */
    let held = false;

    const startRec = async e=>{
      e.preventDefault();
      if(micRecorder) return;
      held = true;
      stopSpeech();
      try{
        if(!micStream) micStream = await navigator.mediaDevices.getUserMedia({audio:true});
      }catch(err){
        /* permesso negato: si ripiega sul "ripeti ad alta voce" senza
           registrazione — il gioco resta giocabile, mai un vicolo cieco */
        hint.textContent = "Niente microfono? Ripeti a voce alta e tocca ➡️";
        btn.textContent = "➡️";
        btn.onpointerdown = null;
        btn.onclick = ()=>{ sfx.good(); sparkleAt(btn); advance(); };
        return;
      }
      if(myToken !== repeteToken){
        /* uscito dal gioco mentre si aspettava il permesso: lo stream
           appena concesso va spento subito, nessuno lo userà più */
        if(micStream){ micStream.getTracks().forEach(t=>t.stop()); micStream = null; }
        return;
      }
      if(!held || micRecorder) return;   // dito già alzato durante l'attesa del permesso
      chunks = [];
      micRecorder = new MediaRecorder(micStream);
      micRecorder.ondataavailable = ev=>{ if(ev.data.size) chunks.push(ev.data); };
      micRecorder.onstop = ()=>{
        micRecorder = null;
        if(myToken !== repeteToken) return;
        btn.classList.remove("recording");
        if(!chunks.length){ hint.textContent = "Non ho sentito niente… riprova!"; return; }
        playBack(new Blob(chunks, {type: chunks[0].type || "audio/webm"}));
      };
      micRecorder.start();
      duckMusic(true);
      btn.classList.add("recording");
      hint.textContent = "Ti ascolto… parla!";
      /* tetto di 5s: un dito dimenticato sul bottone non registra un'ora */
      recTimer = setTimeout(stopRec, 5000);
    };
    const stopRec = ()=>{
      held = false;
      clearTimeout(recTimer);
      duckMusic(false);
      if(micRecorder && micRecorder.state === "recording") micRecorder.stop();
    };

    const playBack = blob=>{
      if(micUrl) URL.revokeObjectURL(micUrl);
      micUrl = URL.createObjectURL(blob);
      const el = new Audio(micUrl);
      hint.textContent = "Ecco la tua voce!";
      btn.classList.add("playing");
      duckMusic(true);
      el.onended = el.onerror = ()=>{
        duckMusic(false);
        if(myToken !== repeteToken) return;   // partita già abbandonata
        btn.classList.remove("playing");
        sfx.good(); sparkleAt(btn); foxReact("jump");
        setTimeout(advance, 500);
      };
      el.play().catch(()=>el.onended());
    };

    const advance = ()=>{
      if(myToken !== repeteToken) return;
      results.push("ok");
      i++;
      setDots(WORDS, results);
      setTimeout(playWord, 600);
    };

    btn.onpointerdown = startRec;
    btn.onpointerup = btn.onpointerleave = stopRec;
    btn.oncontextmenu = e=>e.preventDefault();
  }

  playWord();
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
  area.innerHTML = roundHead("curieux", "<b>Trouve les paires !</b><small>Trova le coppie</small>") +
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
          sparkleAt(b);
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
