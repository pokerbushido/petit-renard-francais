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
      ...((profile && profile.chapters) || {}),
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
