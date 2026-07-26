# Le Petit Renard v3 — *Le Grand Voyage*

**Data:** 2026-07-26
**Stato:** approvato, pronto per il piano di implementazione

## Obiettivo

Trasformare Le Petit Renard da raccolta di mini-giochi a percorso narrativo a livelli, con mascotte ricorrenti e cutscene animate. Utenti: due bambini di 5 e 7 anni, su iPad e Mac.

## Vincoli non negoziabili

- **Nessuno stato di fallimento.** Il bambino non perde mai, non viene mai bloccato, non riceve mai un punteggio negativo. Un errore produce incoraggiamento e una ri-proposta della parola in un *gioco diverso*.
- **La mascotte non è mai triste per colpa del bambino.** Nessun guilt-tripping (il pattern per cui Duolingo è pubblicamente criticato). Pose tristi/assonnate solo come stato neutro di fine sessione.
- **Nessun build step.** Resta vanilla JS servito da file statici, `<script>` in ordine. Deploy = copia della cartella.
- **iPad Safari è il target primario.** Niente WebM, niente WASM pesante, niente autoplay con audio.
- **Nessun progresso perso.** I profili esistenti mantengono stelle e figurine.
- **Sessione target 4-6 minuti per capitolo** (5-8 esercizi), con una fine visibile.

## Ricerca di riferimento

- Duolingo ha eliminato l'albero a rami (nov 2022) perché la scelta multipla causava paralisi decisionale; sostituito da percorso strettamente lineare, un nodo alla volta, nodi completati sempre rigiocabili.
- Khan Academy Kids: feedback formativo a basso rischio, ri-presentazione dell'item fallito **in un'altra modalità**, nessun punteggio.
- Attenzione 4-6 anni: 8-10 minuti. Lezioni Khan da 3-5 min → +50% completion rate.
- Bambini 4-8 anni: motivati da accumulo e collezione, non da XP astratto.
- Mascotte: 6 pose sono il minimo realistico e sufficiente (Kodi di Khan lavora con un vocabolario di pose piccolo).
- Misure tecniche (rilevate): `lottie_light` 47 KB gzip + 12-78 KB per animazione Noto; dotLottie richiede 677 KB gzip di WASM (escluso). SVG+CSS scritto a mano è 5-10× più leggero di Lottie per animazioni semplici e non richiede libreria.

## Il cast

### Foxy 🦊 — guida
SVG inline generato da `mascot.js`. Sei pose: `idle` (respiro), `parle`, `saute` (festeggia), `montre` (indica), `curieux` (dopo un errore), `salue` (fine sessione). Espressioni componibili via attributi: occhi, bocca, sopracciglia, coda. Animazione in CSS keyframes, nessuna libreria.

### Pipelette la Gazza 🐦‍⬛ — antagonista
Ruba il sacco delle parole di ogni luogo. Buffa, mai minacciosa: a fine capitolo restituisce il maltolto e ride. Anche lei SVG inline, tre pose: `vole`, `rit`, `boude`.

### Amici di tappa
Un personaggio per capitolo (Camille la mucca alla fattoria, Momo il fornaio al mercato, ...). **Semplificazione deliberata:** non sono SVG custom, sono emoji Noto animate già presenti in `assets/` accompagnate da nome e fumetto. Solo Foxy e Pipelette sono disegnati a mano. Upgrade a SVG dedicati solo se all'uso risultano poveri.

## Struttura narrativa

Pipelette ruba le parole francesi di ogni luogo. Foxy e il bambino viaggiano per la Francia, le recuperano e le rimettono nel **Grand Livre**.

18 capitoli in 5 regioni (atti):

| Atto | Regione | Capitoli |
|---|---|---|
| I | Le village | saluti · famiglia · **la casa** · i colori |
| II | La campagne | **la fattoria** · gli animali · **il tempo che fa** |
| III | La ville | i numeri · **il mercato** · il cibo · **i trasporti** · **la scuola** |
| IV | La côte et la montagne | **il mare** · **la montagna** · i vestiti · il corpo |
| V | La fête | **lo sport** · **la festa** → finale |

In grassetto i 10 mondi nuovi (~100 parole nuove, ~175 totali). Gli 8 mondi esistenti sono riusati senza modifiche ai dati, solo riordinati nella sequenza narrativa.

## Anatomia di un capitolo

1. **Cutscene di apertura** — 15-25 s, solo alla prima visita, poi rivedibile da un bottone. Fondale che scorre, Foxy che cammina, Pipelette che scappa col sacco, fumetti di testo con voce italiana via Web Speech (`speak()` esistente). Un tap la salta in qualsiasi momento.
2. **5-8 micro-round** — mix dei cinque giochi esistenti (Scopri, Trova, Memory, Leggi, Scrivi) sulle parole del capitolo. Non un gioco intero alla volta: round brevi alternati.
3. **La sfida di Pipelette** — round finale rapido su tutte le parole del capitolo.
4. **Ricompensa** — la parola-figurina vola nel Grand Livre, confetti, il nodo diventa oro.

I giochi disponibili restano filtrati per modalità del profilo (`listen` esclude Leggi e Scrivi), come già avviene oggi.

## La mappa

Sentiero verticale scrollabile, un nodo per capitolo, strettamente sequenziale.

- Nodo corrente: pulsa, Foxy ci sta sopra fisicamente.
- Nodi completati: oro, sempre cliccabili per rigiocare.
- Nodi futuri: grigi, non cliccabili.
- Lo sfondo cambia colore/decorazione per regione, con un cartello di ingresso a ogni nuovo atto.
- Topbar: chip profilo, stelle, `🎮 gioca libero` (vecchia griglia, solo mondi sbloccati), `🎵` canzoni, `🏆` album.

La mappa diventa la schermata principale dopo la scelta del profilo. La griglia a mondi liberi resta raggiungibile e non sparisce.

## Ricompense

- Capitolo completato = 1 stella, sempre, indipendentemente dagli errori.
- Capitolo rigiocato senza errori = stella d'oro sul nodo (obiettivo opzionale, mai richiesto per avanzare).
- Ogni capitolo completato sblocca la figurina del suo mondo nel **Grand Livre**, che è l'album figurine esistente rinominato nella finzione narrativa (stessa schermata, stessi dati).
- La vecchia soglia "6 stelle su un mondo → figurina" resta attiva come via alternativa per chi gioca in modalità libera. Le due strade sbloccano la stessa figurina; chi arriva secondo non ottiene un doppione.

## Adattività

`bumpMiss` esiste già e aumenta la frequenza delle parole sbagliate. Va esteso perché la ri-proposta avvenga in un **gioco diverso** da quello in cui l'errore è avvenuto, non nello stesso.

## Architettura file

`app.js` è a 820 righe: aggiungere il nuovo sistema al suo interno lo renderebbe ingestibile. Split, mantenendo l'assenza di build step (solo `<script>` in ordine di dipendenza in `index.html`):

| File | Ruolo | Stato |
|---|---|---|
| `data.js` | unità e parole (~350 righe dopo i nuovi mondi) | esistente, cresce |
| `story.js` | capitoli, regioni, testi delle cutscene | nuovo |
| `mascot.js` | generatore SVG di Foxy e Pipelette, pose ed espressioni | nuovo |
| `cutscene.js` | motore delle scene (timeline, fumetti, voce, skip) | nuovo |
| `map.js` | schermata avventura, nodi, sblocchi | nuovo |
| `progress.js` | logica pura di progressione e migrazione, zero DOM | nuovo |
| `chapter.js` | runner di un capitolo: cutscene → round → sfida → premio | nuovo |
| `games.js` | i cinque giochi, estratti da `app.js` | nuovo (estrazione) |
| `app.js` | stato, profili, routing, audio, canzoni, album | esistente, ridotto a ~300 righe |
| `assets-map.js` | mappa emoji → file | esistente, rigenerato |

Ogni file espone le sue funzioni su `window` come fa già il codice attuale; nessun modulo ES, nessun bundler.

## Persistenza e migrazione

Chiave `petitrenard_v1` → `petitrenard_v2`. Alla prima apertura, per ogni profilo esistente:

- stelle e figurine per unità: copiate invariate;
- capitolo sbloccato: si sblocca fino al primo capitolo il cui mondo non ha ancora stelle, così un bambino che ha già fatto animali e colori non li rifà da capo;
- se la migrazione fallisce per qualsiasi ragione, si conserva `petitrenard_v1` intatto e si riparte da un profilo nuovo, senza mai cancellare il dato vecchio.

## Fasi di consegna

**Fase 1 — l'ossatura giocabile.** Mascotte SVG, motore cutscene, mappa e capitoli costruiti sugli **8 mondi già esistenti**. Al termine l'app è giocabile end-to-end e testabile dai bambini, senza contenuti nuovi.

**Fase 2 — i contenuti.** I 10 mondi nuovi in `data.js`, i relativi asset scaricati con `tools/fetch_assets.py`, tutti i testi della storia e le cutscene dei nuovi capitoli.

**Fase 3 — le rifiniture.** Transizioni fra regioni, cutscene finale, album ampliato, passata sull'audio.

## Verifica

Il repo non ha framework di test e non ne introduce. Un solo check eseguibile, `node tools/check.mjs`: carica i file dati in un contesto `node:vm` (non sono moduli ES, sono script con globali) e verifica gli invarianti con `node:assert`.

Copre due cose. **Dati:** una parola senza asset in `assets-map.js`, un capitolo che referenzia un `unitId` inesistente, un'unità fuori dal percorso, un capitolo con troppe o troppo poche parole, una parola francese duplicata fra mondi. **Logica di progressione:** sblocchi, stella d'oro, immutabilità delle patch, ri-proposta in un gioco diverso, e soprattutto la migrazione v1 → v2 anche su input corrotto.

Scelto Node invece di Python (che la spec inizialmente prevedeva come `tools/check_data.py`) perché la logica da testare è JavaScript: un solo strumento copre dati e logica, invece di due.

Verifica manuale su iPad Safari a fine di ogni fase: percorso completo di un capitolo, cutscene, skip, rigiocata di un nodo completato, e caricamento di un profilo migrato dalla v1.

## Fuori scope

- Video veri (mp4/WebM): richiedono produzione esterna e non funzionano bene su iOS.
- Lottie e qualsiasi libreria runtime.
- Sincronizzazione dei progressi fra dispositivi.
- Registrazione di voci umane: si continua con Web Speech API.
- Riscrittura dei cinque giochi esistenti: vengono spostati di file, non riprogettati.
