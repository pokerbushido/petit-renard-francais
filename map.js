"use strict";
/* ============================================================
   MAPPA — sentiero verticale a nodi, strettamente sequenziale.
   Un nodo per capitolo. I nodi fatti restano sempre rigiocabili;
   i futuri non sono cliccabili (ma non mostrano lucchetti tristi).
   ============================================================ */

function renderMap(){
  const p = activeProfile();
  if(!p){ renderProfiles(); return; }

  $("mapProfile").innerHTML = `${em(p.avatar)} ${escapeHtml(p.name)}`;
  $("mapStars").innerHTML = `<span class="star">⭐</span> ${totalStars(p)}`;
  /* stesso avviso discreto di renderProfiles: la mappa è la schermata su
     cui i bambini restano per un'ora intera, ben oltre la schermata dei
     profili che non rivedono più finché non cambiano giocatore. Senza
     ripeterlo qui, un fallimento di scrittura a metà sessione passerebbe
     inosservato fino al prossimo riavvio. */
  const mapNotice = $("mapStorageNotice");
  if(mapNotice) mapNotice.hidden = !storageFailed;

  const cur = currentChapterIndex(p);
  /* a viaggio finito currentChapterIndex torna CHAPTERS.length: nessun i
     lo eguaglia mai, quindi senza questa clamp Foxy sparirebbe dalla mappa
     proprio nel momento del trionfo. La si parcheggia sull'ultimo nodo. */
  const curNode = Math.min(cur, CHAPTERS.length - 1);
  const list = $("pathList");
  list.innerHTML = "";
  let lastRegion = null, block = list;

  CHAPTERS.forEach((c, i) => {
    if(c.regionId !== lastRegion){
      lastRegion = c.regionId;
      const r = REGIONS.find(x => x.id === c.regionId);
      /* ogni regione è un blocco con il suo cielo: lo sfondo cambia scendendo */
      block = document.createElement("div");
      block.className = "region-block";
      block.style.background = r.sky;
      const sign = document.createElement("div");
      sign.className = "region-sign" + (isLightBg(r.color) ? " on-light" : "");
      sign.style.background = r.color;
      sign.innerHTML = `<div class="rfr">${r.fr}</div><div class="rit">${r.it}</div>`;
      if(r.id === (CHAPTERS[curNode] || {}).regionId) sign.classList.add("now");
      block.appendChild(sign);
      list.appendChild(block);
    }

    const done = isChapterDone(p, c.id);
    const gold = isChapterGold(p, c.id);
    const open = isChapterUnlocked(p, c.id);
    const isCurrent = i === curNode;

    const node = document.createElement(open ? "button" : "div");
    node.className = "node" + (done ? " done" : "") + (gold ? " gold" : "") +
                     (isCurrent ? " current" : "") + (open ? "" : " future");
    node.style.setProperty("--d", i * 45 + "ms");
    node.style.setProperty("--x", (i % 2 ? 1 : -1) * 42 + "px");
    node.innerHTML = `
      ${isCurrent ? `<div class="node-fox">${foxSvg("idle", {size:74})}</div>` : ""}
      <div class="node-badge">${em(c.friend.emoji)}</div>
      <div class="node-title">${escapeHtml(c.title)}</div>
      <div class="node-star">${gold ? "🌟" : done ? "⭐" : ""}</div>`;
    if(open) node.onclick = ()=>{ sfx.tap(); openChapter(c.id); };
    block.appendChild(node);
  });

  /* la luce della pagina segue il viaggio: il cielo della regione in cui ci
     si trova tinge lo sfondo di tutta l'app (v. --amb in style.css), così
     arrivare al mare o alla festa si vede prima ancora di leggere il cartello */
  const curRegion = REGIONS.find(r => r.id === (CHAPTERS[curNode] || {}).regionId);
  if(curRegion) document.body.style.setProperty("--amb", curRegion.sky);

  show("screen-map");
  const currentNode = list.querySelector(".node.current");
  if(currentNode) currentNode.scrollIntoView({block:"center", behavior:"smooth"});
}

/* Binding al caricamento dello script: app.js non è ancora girato e `$`
   (const, non hoisted) non esiste ancora. Vedi la stessa nota in cutscene.js. */
document.getElementById("mapProfile").onclick = ()=>{ sfx.tap(); renderProfiles(); };
document.getElementById("mapFree").onclick = ()=>{ sfx.tap(); goHome(false); };
document.getElementById("mapSongs").onclick = ()=>{ sfx.tap(); renderSongs(); };
document.getElementById("mapStickers").onclick = ()=>{ sfx.tap(); renderStickers(); };
