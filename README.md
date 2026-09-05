# 🦊 Le Petit Renard — Impara il francese giocando

Web app per bambini (5-7 anni) per imparare il vocabolario francese di base, ispirata a Studycat Fun French e Khan Academy Kids.

## Come si usa

Apri `index.html` in un browser (Chrome/Safari, anche su tablet), o servi la cartella con un qualsiasi hosting statico. Nessuna dipendenza esterna a runtime.

L'audio francese usa le **clip registrate** in `audio/` quando ci sono, e ripiega
sulla **Web Speech API** del browser (voci di sistema fr-FR) per tutto ciò che
manca. Il primo suono parte dopo il primo tocco (requisito iOS).

## Contenuti

- **18 mondi tematici** lungo il viaggio: saluti, famiglia, casa, colori, fattoria, animali,
  meteo, numeri, camminare, cibo, trasporti, scuola, mare, montagna, vestiti, corpo, sport,
  festa — 158 parole in tutto, ciascuna con articolo, voce francese ed emoji/colore/numero.
- **7 mini-giochi per mondo** (i primi 4 + Répète in modalità solo ascolto, tutti in modalità lettura):
  - 🔍 **Découvre** — tocca le carte e ascolta le parole
  - 👂 **Trouve!** — ascolta la parola e tocca l'immagine giusta
  - 🫧 **Attrape!** — bolle che volano: scoppia quella giusta (il gioco "d'azione" alla Studycat)
  - 🃏 **Mémory** — trova le coppie (in modalità lettura: figura ↔ parola scritta)
  - 📖 **Lis** — abbina la parola scritta all'immagine (solo modalità lettura)
  - ✏️ **Écris** — componi la parola lettera per lettera (solo modalità lettura)
  - 🎤 **Répète!** — ascolta Foxy, registra la tua voce e riascoltala (stile
    VoicePlay di Studycat; solo gioco libero, mai nei capitoli; senza microfono
    il gioco sparisce dal menù, col permesso negato ripiega su "ripeti a voce alta")
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

- `data.js` — le 18 unità (mondi) e i 7 giochi
- `story.js` — le 5 regioni e i 18 capitoli del viaggio (cutscene incluse)
- `assets-map.js` — mappa emoji → asset Noto scaricati da `tools/fetch_assets.py`
- `progress.js` — logica pura di progressione (nessun DOM, testata da `tools/check.mjs`)
- `mascot.js` — Foxy e Pipelette in SVG inline, pose animate in CSS
- `cutscene.js` — motore delle scenette animate a inizio capitolo
- `map.js` — la mappa a nodi sequenziale
- `chapter.js` — il runner dei capitoli (cutscene → micro-round → sfida → ricompensa)
- `games.js` — i sette mini-giochi, sia in modalità libera sia come micro-round
- `audio.js` — voce (clip registrate + ripiego sulla voce di sistema), musica di
  sottofondo con ducking, effetti WebAudio
- `app.js` — stato, storage, profili, home, avvio dell'app
- `style.css` — tutto lo stile e le animazioni (CSS puro, nessuna libreria)
- `tools/check.mjs` — 43 asserzioni sugli invarianti di dati e progressione
- `tools/tts.mjs` — genera offline le clip vocali (`--check` per il self-test)
- `tools/fetch_assets.py` — scarica gli asset emoji Noto usati in `assets-map.js`

## 🇫🇷 Bilingue

L'app è francese con appoggio italiano, non italiana con qualche parola
francese. Due regole, applicate ovunque:

**Interfaccia** — francese in evidenza, italiano in piccolo sotto
(`Découvre` / *Scopri · tocca e ascolta*). Chi legge impara a riconoscere le
parole francesi; chi non legge ancora resta guidato da icone e voce. Il
markup è `<b>` francese + `<small>` italiano, lo stile è in fondo a
`style.css`.

**Racconto** — Foxy narra in italiano e chiude ogni capitolo con una
frase-chiave francese, mostrata su un cartellino che si accende quando viene
pronunciata (`fr` + `frIt` in `story.js`). È il modello dei cartoni bilingui:
la storia resta comprensibile anche al bambino di 5 anni che non legge, e il
francese entra senza spezzare il racconto.

Le due lingue stanno in **campi separati**, mai concatenate in una stringa
sola. Il motivo è la pronuncia: una frase mista letta da una voce sola
sbaglierebbe per forza una delle due lingue. Così la narrazione va alla voce
italiana e la frase francese a quella francese, incatenate da `opts.onEnd`
di `speak()`.

## 🔊 Voce registrata

Le voci di sistema suonano robotiche. `tools/tts.mjs` genera **una volta sola,
offline**, una clip per ogni frase dell'app e la salva in `audio/`; il browser
suona quelle. La sintesi gira **in locale sul Mac** (Qwen3-TTS su MLX, tramite
`tools/tts_local.py`): nessun servizio esterno, nessuna chiave, nessun
abbonamento. Serve `uv` e `ffmpeg`; al primo avvio scarica il modello
(~2.9 GB in `~/.cache/huggingface`).

    node tools/tts.mjs --count     # quante frasi e quanti caratteri
    node tools/tts.mjs --check     # self-check senza sintesi
    uv run tools/tts_local.py --check   # genera due clip di prova e le verifica
    node tools/tts.mjs             # genera le clip mancanti
    TTS_FILTER='^le chat$' node tools/tts.mjs --force   # rigenera solo alcune

Due voci, una per lingua, perché la pronuncia è il prodotto. Sono **cloni**
zero-shot da un campione di riferimento in `tools/voices/` (`fr.wav`+`fr.txt`,
`it.wav`+`it.txt`, ~8-14 s ricavati dalle clip storiche): la voce francese è
*Foxy FR* (giovane donna madrelingua, chiara, per bambini), quella italiana è
la voce narrante di Foxy. Per cambiare voce basta sostituire il wav e la sua
trascrizione esatta.

Le clip corte francesi (parole che il bambino imita) vengono campionate più
"fredde" e rigenerate se la durata sfora il budget: i modelli TTS sui testi
cortissimi tendono a improvvisare ("eeeeh… la porte").

Lo script è idempotente: salta le clip già su disco. Al termine riscrive
`audio/index.json`, che elenca solo le clip realmente presenti: quelle mancanti
tornano automaticamente alla voce di sistema, l'app non si rompe mai.

Stato attuale: 297 clip, ~6.500 caratteri. Aggiungendo frasi nuove in `app.js`
o `chapter.js`, vanno aggiunte anche alla lista `HARDCODED` in `tools/tts.mjs`.

> Storia: fino a settembre 2026 le clip venivano da ElevenLabs (voce *Foxy FR*
> creata con Voice Design, voce italiana *Andrea*). Le clip in `audio/` generate
> allora restano valide; il clone locale parte da quelle.

## Grafica

Emoji **Noto** di Google (animate dove disponibili, PNG statici altrove), scaricate in `assets/` da `tools/fetch_assets.py`. Licenza Noto Emoji: Apache 2.0 / OFL. Per rigenerare gli asset dopo aver aggiunto parole: `python3 tools/fetch_assets.py`.

Carattere **Fredoka** (SIL Open Font License 1.1), sottoinsieme latino
auto-ospitato in `fonts/`: niente CDN, funziona anche offline.

Lo stile è quello degli albi illustrati francesi anni '60 — carta con grana,
pigmenti a gouache, superfici che sembrano ritagli di carta spessa. Il colore
del testo sulle carte colorate lo sceglie `isLightBg()` in `app.js`: sui fondi
chiari il bianco scendeva a 1.6:1 di contrasto, illeggibile.

## 🎶 Musica

Due loop in `music/`, uno per il viaggio e uno per i giochi, con abbassamento
automatico quando qualcuno parla e spegnimento durante le chansons.

> *Carefree* e *Fluffing a Duck* di **Kevin MacLeod** (incompetech.com)
> Licenza [Creative Commons BY 4.0](https://creativecommons.org/licenses/by/4.0/)

La licenza CC BY obbliga a mantenere il credito visibile: sta nella schermata
dei profili, oltre che qui. Non rimuoverlo.

## Deploy

Qualsiasi hosting statico: GitHub Pages, Netlify (drag & drop di `index.html`), Vercel.

## Sviluppo

Check degli invarianti (dati, capitoli, logica di progressione):

    node tools/check.mjs

Va eseguito prima di ogni commit. Dopo aver aggiunto parole nuove:

    python3 tools/fetch_assets.py && node tools/check.mjs
