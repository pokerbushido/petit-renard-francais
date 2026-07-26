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
