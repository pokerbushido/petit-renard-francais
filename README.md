# 🦊 Le Petit Renard — Impara il francese giocando

Web app per bambini (5-7 anni) per imparare il vocabolario francese di base, ispirata a Studycat Fun French e Khan Academy Kids.

## Come si usa

Apri `index.html` in un browser (Chrome/Safari, anche su tablet), o servi la cartella con un qualsiasi hosting statico. Nessuna dipendenza esterna a runtime.

L'audio francese usa la **Web Speech API** del browser (voci di sistema fr-FR): su Mac/iPad le voci sono di ottima qualità. Il primo suono parte dopo il primo tocco (requisito iOS).

## Contenuti

- **8 mondi tematici**: animali, colori, numeri, cibo, corpo, famiglia, vestiti, parole magiche (~75 parole con articolo).
- **4 mini-giochi per mondo**:
  - 🔍 **Scopri** — tocca le carte e ascolta le parole
  - 👂 **Trova!** — ascolta la parola e tocca l'immagine giusta
  - 🃏 **Memory** — trova le coppie (in modalità lettura: figura ↔ parola scritta)
  - 📖 **Leggi** — abbina la parola scritta all'immagine (solo modalità lettura)
- **Profili multipli** (fino a 4): ogni bimbo sceglie avatar e modalità:
  - 👂 *Solo ascolto* — per chi non legge ancora (5 anni)
  - 📖 *Ascolto + lettura* — per chi legge (7 anni)
- **🎵 Chansons**: karaoke di filastrocche francesi di pubblico dominio (Frère Jacques, Au clair de la lune, Ah ! vous dirai-je maman) — melodia WebAudio, versi evidenziati, tap sul verso per sentirlo letto.
- **Ricompense**: stelle per ogni gioco, figurina 🏆 del mondo a 6 stelle, album figurine.
- **Adattività leggera**: le parole sbagliate ricompaiono più spesso.
- Progressi salvati in `localStorage` (per dispositivo).

## Grafica

Emoji **Noto** di Google (animate dove disponibili, PNG statici altrove), scaricate in `assets/` da `tools/fetch_assets.py`. Licenza Noto Emoji: Apache 2.0 / OFL. Per rigenerare gli asset dopo aver aggiunto parole: `python3 tools/fetch_assets.py`.

## Deploy

Qualsiasi hosting statico: GitHub Pages, Netlify (drag & drop di `index.html`), Vercel.
