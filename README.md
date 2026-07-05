# 🦊 Le Petit Renard — Impara il francese giocando

Web app per bambini (5-7 anni) per imparare il vocabolario francese di base, ispirata a Studycat Fun French e Khan Academy Kids.

## Come si usa

Apri `index.html` in un browser (Chrome/Safari, anche su tablet). Nessuna installazione, nessuna dipendenza, nessun server: è un singolo file HTML.

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
- **Ricompense**: stelle per ogni gioco, figurina 🏆 del mondo a 6 stelle, album figurine.
- Progressi salvati in `localStorage` (per dispositivo).

## Deploy

Qualsiasi hosting statico: GitHub Pages, Netlify (drag & drop di `index.html`), Vercel.
