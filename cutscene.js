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
