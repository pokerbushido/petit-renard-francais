"use strict";
/* ============================================================
   RUNNER DEI CAPITOLI — cutscene, micro-round, sfida finale,
   ricompensa. Non esiste un modo di "perdere" un capitolo:
   gli errori contano solo per la stella d'oro.

   Ogni partita ha un token. I timer in volo (pausa fra i round,
   pausa della sfida di Pipelette) e i callback onDone dei round
   verificano il token prima di toccare lo schermo o il profilo:
   se il capitolo è stato abbandonato (tasto ⬅️) o se nel frattempo
   ne è iniziato un altro, il timer scaduto non fa nulla invece di
   sovrascrivere lo schermo attivo o assegnare un completamento/oro
   mai giocati.
   ============================================================ */

let chapterRun = null;   // {chapter, unit, rounds, i, errors, token}
let chapterToken = 0;
let chapterTimer = null; // id del setTimeout di pacing posseduto dal runner

function chapterRunning(){ return chapterRun !== null; }

/* Interrompe la partita corrente (usata dal tasto ⬅️ in app.js): invalida
   il token così ogni timer/callback ancora in volo diventa un no-op, e
   ferma anche il timer di pacing posseduto direttamente dal runner. */
function abortChapter(){
  chapterToken++;
  chapterRun = null;
  if(chapterTimer){ clearTimeout(chapterTimer); chapterTimer = null; }
}

function openChapter(chapterId){
  const c = chapterById(chapterId);
  const p = activeProfile();
  const u = c && UNITS.find(x => x.id === c.unitId);
  if(!c || !p || !u) return renderMap();
  const seen = p.chapters && p.chapters[chapterId];

  const begin = ()=>{
    const token = ++chapterToken;
    chapterRun = {
      chapter: c, unit: u, errors: 0, i: 0, token,
      rounds: buildChapterRounds(u, p, availableGameIds(p))
    };
    show("screen-game");
    runNextRound(token);
  };

  /* la cutscene si vede alla prima visita; poi si va dritti al gioco */
  if(seen && seen.done) begin();
  else playCutscene(c, begin);
}

function runNextRound(token){
  if(!chapterRun || chapterRun.token !== token) return;
  const r = chapterRun;
  if(r.i >= r.rounds.length) return chapterChallenge(token);

  const {gameId, word} = r.rounds[r.i];
  setDots(r.rounds.length + 1, r.rounds.slice(0, r.i).map(()=> "ok"));
  playRound(gameId, r.unit, word, (errors)=>{
    if(!chapterRun || chapterRun.token !== token) return;
    r.errors += errors;
    r.i++;
    chapterTimer = setTimeout(()=> runNextRound(token), 900);
  });
}

/* Sfida finale: tutte le parole del capitolo, un giro veloce di "Trova!". */
function chapterChallenge(token){
  const r = chapterRun;
  if(!r || r.token !== token) return;
  /* i 6 round sono fatti: l'ultimo pallino resta da riempire con la sfida */
  setDots(r.rounds.length + 1, r.rounds.map(()=> "ok"));
  const area = $("gameArea");
  area.innerHTML = `
    <div class="mascot-row">
      <div class="mascot">${pieSvg("rit", {size:90})}</div>
      <div class="bubble">Cra cra ! Prendi le tue parole… se ci riesci !</div>
    </div>`;
  speak("Cra cra! Prendi le tue parole, se ci riesci!", {lang:"it-IT", rate:1, noRepeat:true});
  sfx.flip();
  chapterTimer = setTimeout(()=>{
    if(!chapterRun || chapterRun.token !== token) return;
    const word = r.unit.words[Math.floor(Math.random() * r.unit.words.length)];
    playRound("find", r.unit, word, (errors)=>{
      if(!chapterRun || chapterRun.token !== token) return;
      r.errors += errors;
      finishChapter(token);
    });
  }, 2200);
}

function finishChapter(token){
  const r = chapterRun;
  if(!r || r.token !== token) return;
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

  /* cambio di regione: un piccolo annuncio in più mentre si è ancora sulla
     schermata di ricompensa. Il segnale visivo vero (il cartello "now" che
     si anima) arriva dopo, quando il bambino preme "Continua" e la mappa
     si ridisegna su map.js. */
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

  $("chAgain").onclick = ()=>{ sfx.tap(); openChapter(r.chapter.id); };
  $("chNext").onclick  = ()=>{ sfx.tap(); renderMap(); };
}
