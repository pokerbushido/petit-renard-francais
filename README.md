# 🦊 Le Petit Renard — Impara il francese giocando

Web app per bambini (5-7 anni) per imparare il vocabolario francese di base, ispirata a Studycat Fun French e Khan Academy Kids.

## Come si usa

Apri `index.html` in un browser (Chrome/Safari, anche su tablet), o servi la cartella con un qualsiasi hosting statico. Nessuna dipendenza esterna a runtime.

L'audio francese usa la **Web Speech API** del browser (voci di sistema fr-FR): su Mac/iPad le voci sono di ottima qualità. Il primo suono parte dopo il primo tocco (requisito iOS).

## Contenuti

- **18 mondi tematici** lungo il viaggio: saluti, famiglia, casa, colori, fattoria, animali,
  meteo, numeri, camminare, cibo, trasporti, scuola, mare, montagna, vestiti, corpo, sport,
  festa — 158 parole in tutto, ciascuna con articolo, voce francese ed emoji/colore/numero.
- **5 mini-giochi per mondo** (i primi 3 in modalità solo ascolto, tutti e 5 in modalità lettura):
  - 🔍 **Scopri** — tocca le carte e ascolta le parole
  - 👂 **Trova!** — ascolta la parola e tocca l'immagine giusta
  - 🃏 **Memory** — trova le coppie (in modalità lettura: figura ↔ parola scritta)
  - 📖 **Leggi** — abbina la parola scritta all'immagine (solo modalità lettura)
  - ✏️ **Scrivi** — componi la parola lettera per lettera (solo modalità lettura)
- **Profili multipli** (fino a 4): ogni bimbo sceglie avatar e modalità:
  - 👂 *Solo ascolto* — per chi non legge ancora (5 anni)
  - 📖 *Ascolto + lettura* — per chi legge (7 anni)
- **🎵 Chansons**: karaoke di filastrocche francesi di pubblico dominio (Frère Jacques, Au clair de la lune, Ah ! vous dirai-je maman) — melodia WebAudio, versi evidenziati, tap sul verso per sentirlo letto.
- **Ricompense**: stella per capitolo completato, stella d'oro 🌟 rigiocandolo senza errori.
- **Adattività leggera**: le parole sbagliate ricompaiono più spesso.
- Progressi salvati in `localStorage` (per dispositivo).

## 🗺️ Le Grand Voyage

Pipelette la gazza ruba le parole francesi di ogni luogo: Foxy e il bambino
viaggiano per la Francia e le recuperano, un capitolo alla volta.

- **18 capitoli in 5 regioni** (villaggio → campagna → città → costa → festa
  finale), ognuno con il suo cielo e il suo amico di tappa.
- **Mappa a nodi sequenziale**: un capitolo per nodo, il successivo si sblocca
  completando il precedente. I nodi già fatti restano sempre rigiocabili.
  Al passaggio in una nuova regione, il cartello della mappa si anima e
  Foxy annuncia la meta con coriandoli.
- **Ogni capitolo** = cutscene animata (saltabile) + 6 micro-round su giochi
  diversi + la sfida finale di Pipelette. Durata 4-6 minuti.
- **Nessuno stato di fallimento**: sbagliare non blocca e non toglie nulla.
  La parola sbagliata torna più tardi, in un gioco diverso.
- **Stella per capitolo completato**, stella d'oro 🌟 rigiocandolo senza errori.
- 📖 **Il Grand Livre** (album figurine) raccoglie l'amico di ogni capitolo
  completato, figurina d'oro per chi lo rigioca senza errori.
- 🎮 **Gioca libero** apre la griglia con i mondi già sbloccati dal viaggio.

Le mascotte sono SVG inline generati da `mascot.js`: nessun asset, sei pose per
Foxy e tre per Pipelette, animate in CSS.

## File sorgente

Nessun build step: tutto `<script>` classici, caricati in ordine di dipendenza
(così in `index.html`):

- `data.js` — le 18 unità (mondi) e i 5 giochi
- `story.js` — le 5 regioni e i 18 capitoli del viaggio (cutscene incluse)
- `assets-map.js` — mappa emoji → asset Noto scaricati da `tools/fetch_assets.py`
- `progress.js` — logica pura di progressione (nessun DOM, testata da `tools/check.mjs`)
- `mascot.js` — Foxy e Pipelette in SVG inline, pose animate in CSS
- `cutscene.js` — motore delle scenette animate a inizio capitolo
- `map.js` — la mappa a nodi sequenziale
- `chapter.js` — il runner dei capitoli (cutscene → micro-round → sfida → ricompensa)
- `games.js` — i cinque mini-giochi, sia in modalità libera sia come micro-round
- `app.js` — stato, storage, audio, profili, home, avvio dell'app
- `style.css` — tutto lo stile e le animazioni (CSS puro, nessuna libreria)
- `tools/check.mjs` — 42 asserzioni sugli invarianti di dati e progressione
- `tools/fetch_assets.py` — scarica gli asset emoji Noto usati in `assets-map.js`

## Grafica

Emoji **Noto** di Google (animate dove disponibili, PNG statici altrove), scaricate in `assets/` da `tools/fetch_assets.py`. Licenza Noto Emoji: Apache 2.0 / OFL. Per rigenerare gli asset dopo aver aggiunto parole: `python3 tools/fetch_assets.py`.

## Deploy

Qualsiasi hosting statico: GitHub Pages, Netlify (drag & drop di `index.html`), Vercel.

## Sviluppo

Check degli invarianti (dati, capitoli, logica di progressione):

    node tools/check.mjs

Va eseguito prima di ogni commit. Dopo aver aggiunto parole nuove:

    python3 tools/fetch_assets.py && node tools/check.mjs
