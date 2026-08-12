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
  /* due nuvole alla deriva: il cielo della scena respira invece di
     restare un rettangolo di colore piatto */
  $("cutSky").innerHTML =
    '<div class="cut-cloud" style="--ct:12%;--cd:34s"></div>' +
    '<div class="cut-cloud" style="--ct:34%;--cd:48s;--cs:.6;animation-delay:-20s"></div>';
  $("cutGround").style.background = region.ground;
  show("screen-cutscene");
  nextBeat();
}

function endCutscene(){
  if(!cutState) return;
  const {onDone, token} = cutState;
  cutState = null;
  stopSpeech();
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

  /* La frase francese compare subito insieme al racconto, ma si accende
     solo quando tocca a lei: prima si sente la storia in italiano, poi
     la frase in francese con la sua voce madrelingua. */
  const frBox = $("cutFr");
  frBox.classList.remove("now");
  if(b.fr){
    frBox.hidden = false;
    frBox.innerHTML = `<span class="cut-fr-txt">${escapeHtml(b.fr)}</span>` +
                      `<span class="cut-fr-it">${escapeHtml(b.frIt || "")}</span>`;
  }else{
    frBox.hidden = true;
    frBox.innerHTML = "";
  }

  sfx.flip();
  const line = typeof b.speak === "object" ? b.speak.it : (b.speak || b.text);
  const beatToken = cutToken, beatIndex = cutState.beat;
  speak(line, {lang:"it-IT", rate:0.95, noRepeat:true, onEnd: ()=>{
    /* la battuta può essere già cambiata (tap su "Avanti" mentre parla):
       in quel caso la frase francese di PRIMA non deve più partire */
    if(!b.fr || !cutState || cutToken !== beatToken || cutState.beat !== beatIndex) return;
    frBox.classList.add("now");
    speak(b.fr, {rate:0.85, noRepeat:true});
  }});

  const isLast = cutState.beat === chapter.cutscene.length - 1;
  $("cutNext").textContent = isLast ? "On joue ! ▶️" : "Suite ➡️";
}

/* Questi tre binding girano al caricamento dello script, quando app.js non è
   ancora stato eseguito e `$` (const, non hoisted) non esiste: qui si usa
   document.getElementById direttamente. Dentro le funzioni sopra `$` va bene,
   perché vengono chiamate a pagina caricata. */
document.getElementById("cutNext").onclick = ()=>{ sfx.tap(); nextBeat(); };
document.getElementById("cutSkip").onclick = ()=>{ sfx.tap(); endCutscene(); };
document.getElementById("cutStage").onclick = ()=>{ nextBeat(); };
