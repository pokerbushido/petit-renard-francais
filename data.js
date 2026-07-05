"use strict";
/* ============================================================
   DATI — unità, parole, canzoni. Emoji scelti dove possibile
   nella variante con animazione Noto (vedi tools/fetch_assets.py)
   ============================================================ */
const UNITS = [
  {
    id:"animaux", emoji:"🦁", fr:"Les animaux", it:"Gli animali", color:"#FF8A3D",
    words:[
      {fr:"le chien", it:"il cane", e:"🐕"},
      {fr:"le chat", it:"il gatto", e:"🐱"},
      {fr:"le lion", it:"il leone", e:"🦁"},
      {fr:"l'éléphant", it:"l'elefante", e:"🐘"},
      {fr:"le singe", it:"la scimmia", e:"🐒"},
      {fr:"l'oiseau", it:"l'uccello", e:"🐦"},
      {fr:"le poisson", it:"il pesce", e:"🐟"},
      {fr:"le lapin", it:"il coniglio", e:"🐇"},
      {fr:"la vache", it:"la mucca", e:"🐮"},
      {fr:"le cheval", it:"il cavallo", e:"🐎"},
    ]
  },
  {
    id:"couleurs", emoji:"🎨", fr:"Les couleurs", it:"I colori", color:"#F272B0",
    words:[
      {fr:"rouge", it:"rosso", hex:"#E53935"},
      {fr:"bleu", it:"blu", hex:"#1E6FD9"},
      {fr:"jaune", it:"giallo", hex:"#FFD226"},
      {fr:"vert", it:"verde", hex:"#43A047"},
      {fr:"orange", it:"arancione", hex:"#FB8C00"},
      {fr:"violet", it:"viola", hex:"#8E4EC6"},
      {fr:"rose", it:"rosa", hex:"#F48FB1"},
      {fr:"noir", it:"nero", hex:"#26211F"},
      {fr:"blanc", it:"bianco", hex:"#FDFDF6"},
      {fr:"marron", it:"marrone", hex:"#795548"},
    ]
  },
  {
    id:"nombres", emoji:"🔢", fr:"Les nombres", it:"I numeri", color:"#4FA8E8",
    words:[
      {fr:"un", it:"uno", n:1},{fr:"deux", it:"due", n:2},{fr:"trois", it:"tre", n:3},
      {fr:"quatre", it:"quattro", n:4},{fr:"cinq", it:"cinque", n:5},{fr:"six", it:"sei", n:6},
      {fr:"sept", it:"sette", n:7},{fr:"huit", it:"otto", n:8},{fr:"neuf", it:"nove", n:9},
      {fr:"dix", it:"dieci", n:10},
    ]
  },
  {
    id:"nourriture", emoji:"🍎", fr:"La nourriture", it:"Il cibo", color:"#E5484D",
    words:[
      {fr:"la pomme", it:"la mela", e:"🍎"},
      {fr:"la banane", it:"la banana", e:"🍌"},
      {fr:"le pain", it:"il pane", e:"🥖"},
      {fr:"le fromage", it:"il formaggio", e:"🧀"},
      {fr:"le lait", it:"il latte", e:"🥛"},
      {fr:"le gâteau", it:"la torta", e:"🎂"},
      {fr:"l'œuf", it:"l'uovo", e:"🍳"},
      {fr:"la fraise", it:"la fragola", e:"🍓"},
      {fr:"la glace", it:"il gelato", e:"🍦"},
      {fr:"le poulet", it:"il pollo", e:"🍗"},
    ]
  },
  {
    id:"corps", emoji:"👀", fr:"Le corps", it:"Il corpo", color:"#9B6BD4",
    words:[
      {fr:"les yeux", it:"gli occhi", e:"👀"},
      {fr:"le nez", it:"il naso", e:"👃"},
      {fr:"la bouche", it:"la bocca", e:"👄"},
      {fr:"l'oreille", it:"l'orecchio", e:"👂"},
      {fr:"la main", it:"la mano", e:"✋"},
      {fr:"le pied", it:"il piede", e:"🦶"},
      {fr:"le bras", it:"il braccio", e:"💪"},
      {fr:"la jambe", it:"la gamba", e:"🦵"},
      {fr:"la dent", it:"il dente", e:"🦷"},
      {fr:"la langue", it:"la lingua", e:"👅"},
    ]
  },
  {
    id:"famille", emoji:"👨‍👩‍👧‍👦", fr:"La famille", it:"La famiglia", color:"#5CB85C",
    words:[
      {fr:"le papa", it:"il papà", e:"👨"},
      {fr:"la maman", it:"la mamma", e:"👩"},
      {fr:"le frère", it:"il fratello", e:"👦"},
      {fr:"la sœur", it:"la sorella", e:"👧"},
      {fr:"le bébé", it:"il bebè", e:"👶"},
      {fr:"le grand-père", it:"il nonno", e:"👴"},
      {fr:"la grand-mère", it:"la nonna", e:"👵"},
      {fr:"la famille", it:"la famiglia", e:"👨‍👩‍👧‍👦"},
    ]
  },
  {
    id:"vetements", emoji:"👕", fr:"Les vêtements", it:"I vestiti", color:"#00A2A7",
    words:[
      {fr:"le t-shirt", it:"la maglietta", e:"👕"},
      {fr:"le pantalon", it:"i pantaloni", e:"👖"},
      {fr:"la robe", it:"il vestito", e:"👗"},
      {fr:"le chapeau", it:"il cappello", e:"🎩"},
      {fr:"les chaussures", it:"le scarpe", e:"👟"},
      {fr:"les chaussettes", it:"i calzini", e:"🧦"},
      {fr:"le manteau", it:"il cappotto", e:"🧥"},
      {fr:"l'écharpe", it:"la sciarpa", e:"🧣"},
      {fr:"les gants", it:"i guanti", e:"🧤"},
    ]
  },
  {
    id:"salutations", emoji:"👋", fr:"Les mots magiques", it:"Le parole magiche", color:"#FFC53D",
    words:[
      {fr:"bonjour", it:"buongiorno", e:"🌞"},
      {fr:"au revoir", it:"arrivederci", e:"👋"},
      {fr:"merci", it:"grazie", e:"🙏"},
      {fr:"s'il te plaît", it:"per favore", e:"🥺"},
      {fr:"oui", it:"sì", e:"👍"},
      {fr:"non", it:"no", e:"👎"},
      {fr:"bonne nuit", it:"buonanotte", e:"🌛"},
      {fr:"je t'aime", it:"ti voglio bene", e:"❤️"},
    ]
  },
];

const AVATARS = ["🦊","🐸","🐼","🦄","🐯","🐙"];
const GAMES = [
  {id:"explore", emoji:"🔍", name:"Scopri", sub:"Tocca e ascolta le parole"},
  {id:"find",    emoji:"👂", name:"Trova!", sub:"Ascolta e tocca quella giusta"},
  {id:"memory",  emoji:"🃏", name:"Memory", sub:"Trova le coppie"},
  {id:"read",    emoji:"📖", name:"Leggi", sub:"Abbina la parola scritta", readerOnly:true},
  {id:"spell",   emoji:"✏️", name:"Scrivi", sub:"Componi la parola", readerOnly:true},
];
const STICKER_THRESHOLD = 6; // stelle nell'unità per vincere la figurina

/* ============================================================
   CHANSONS — filastrocche francesi di pubblico dominio.
   notes = [midi, durata in battiti]; tempo = bpm della semiminima
   ============================================================ */
const SONGS = [
  {
    id:"frere-jacques", emoji:"🔔", title:"Frère Jacques", tempo:104,
    lines:[
      {text:"Frère Jacques, Frère Jacques,",
       notes:[[60,1],[62,1],[64,1],[60,1],[60,1],[62,1],[64,1],[60,1]]},
      {text:"Dormez-vous ? Dormez-vous ?",
       notes:[[64,1],[65,1],[67,2],[64,1],[65,1],[67,2]]},
      {text:"Sonnez les matines ! Sonnez les matines !",
       notes:[[67,.5],[69,.5],[67,.5],[65,.5],[64,1],[60,1],[67,.5],[69,.5],[67,.5],[65,.5],[64,1],[60,1]]},
      {text:"Ding, daing, dong ! Ding, daing, dong !",
       notes:[[60,1],[55,1],[60,2],[60,1],[55,1],[60,2]]},
    ]
  },
  {
    id:"au-clair", emoji:"🌛", title:"Au clair de la lune", tempo:96,
    lines:[
      {text:"Au clair de la lune,",
       notes:[[60,1],[60,1],[60,1],[62,1],[64,2],[62,2]]},
      {text:"Mon ami Pierrot,",
       notes:[[60,1],[64,1],[62,1],[62,1],[60,4]]},
      {text:"Prête-moi ta plume",
       notes:[[62,1],[62,1],[62,1],[62,1],[57,2],[57,2]]},
      {text:"Pour écrire un mot.",
       notes:[[62,1],[60,1],[59,1],[57,1],[55,4]]},
    ]
  },
  {
    id:"vous-dirai-je", emoji:"⭐", title:"Ah ! vous dirai-je maman", tempo:108,
    lines:[
      {text:"Ah ! vous dirai-je maman,",
       notes:[[60,1],[60,1],[67,1],[67,1],[69,1],[69,1],[67,2]]},
      {text:"Ce qui cause mon tourment !",
       notes:[[65,1],[65,1],[64,1],[64,1],[62,1],[62,1],[60,2]]},
      {text:"Papa veut que je raisonne",
       notes:[[67,1],[67,1],[65,1],[65,1],[64,1],[64,1],[62,2]]},
      {text:"Comme une grande personne.",
       notes:[[67,1],[67,1],[65,1],[65,1],[64,1],[64,1],[62,2]]},
      {text:"Ah ! vous dirai-je maman,",
       notes:[[60,1],[60,1],[67,1],[67,1],[69,1],[69,1],[67,2]]},
      {text:"Ce qui cause mon tourment !",
       notes:[[65,1],[65,1],[64,1],[64,1],[62,1],[62,1],[60,2]]},
    ]
  },
];
