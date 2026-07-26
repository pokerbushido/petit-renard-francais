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
  {
    id:"maison", emoji:"🏠", fr:"La maison", it:"La casa", color:"#C48B62",
    words:[
      {fr:"la maison", it:"la casa", e:"🏠"},
      {fr:"la porte", it:"la porta", e:"🚪"},
      {fr:"la fenêtre", it:"la finestra", e:"🪟"},
      {fr:"le lit", it:"il letto", e:"🛏️"},
      {fr:"la chaise", it:"la sedia", e:"🪑"},
      {fr:"la table", it:"il tavolo", e:"🪵"},
      {fr:"la clé", it:"la chiave", e:"🔑"},
      {fr:"la lampe", it:"la lampada", e:"💡"},
      {fr:"le jardin", it:"il giardino", e:"🌷"},
    ]
  },
  {
    id:"ferme", emoji:"🚜", fr:"La ferme", it:"La fattoria", color:"#8DBF4A",
    words:[
      {fr:"le coq", it:"il gallo", e:"🐓"},
      {fr:"la poule", it:"la gallina", e:"🐔"},
      {fr:"le cochon", it:"il maiale", e:"🐷"},
      {fr:"le mouton", it:"la pecora", e:"🐑"},
      {fr:"la chèvre", it:"la capra", e:"🐐"},
      {fr:"le tracteur", it:"il trattore", e:"🚜"},
      {fr:"le foin", it:"il fieno", e:"🌾"},
      {fr:"l'étable", it:"la stalla", e:"🏚️"},
      {fr:"la grange", it:"il fienile", e:"🏠"},
    ]
  },
  {
    id:"meteo", emoji:"🌦️", fr:"Le temps", it:"Il tempo che fa", color:"#7EC8E3",
    words:[
      {fr:"le soleil", it:"il sole", e:"☀️"},
      {fr:"la pluie", it:"la pioggia", e:"🌧️"},
      {fr:"le nuage", it:"la nuvola", e:"☁️"},
      {fr:"le vent", it:"il vento", e:"🌬️"},
      {fr:"la neige", it:"la neve", e:"❄️"},
      {fr:"l'orage", it:"il temporale", e:"⛈️"},
      {fr:"l'arc-en-ciel", it:"l'arcobaleno", e:"🌈"},
      {fr:"le parapluie", it:"l'ombrello", e:"☂️"},
    ]
  },
  {
    id:"marche", emoji:"🧺", fr:"Le marché", it:"Il mercato", color:"#E8734A",
    words:[
      {fr:"l'oignon", it:"la cipolla", e:"🧅"},
      {fr:"les champignons", it:"i funghi", e:"🍄"},
      {fr:"la tomate", it:"il pomodoro", e:"🍅"},
      {fr:"la carotte", it:"la carota", e:"🥕"},
      {fr:"le raisin", it:"l'uva", e:"🍇"},
      {fr:"le panier", it:"il cestino", e:"🧺"},
      {fr:"l'argent", it:"i soldi", e:"💶"},
      {fr:"la fleur", it:"il fiore", e:"🌻"},
      {fr:"le miel", it:"il miele", e:"🍯"},
    ]
  },
  {
    id:"transports", emoji:"🚂", fr:"Les transports", it:"I mezzi", color:"#5B8DEF",
    words:[
      {fr:"la voiture", it:"la macchina", e:"🚗"},
      {fr:"le train", it:"il treno", e:"🚂"},
      {fr:"le vélo", it:"la bicicletta", e:"🚲"},
      {fr:"le bateau", it:"la barca", e:"⛵"},
      {fr:"l'avion", it:"l'aereo", e:"✈️"},
      {fr:"le bus", it:"l'autobus", e:"🚌"},
      {fr:"la fusée", it:"il razzo", e:"🚀"},
      {fr:"le camion", it:"il camion", e:"🚚"},
    ]
  },
  {
    id:"ecole", emoji:"✏️", fr:"L'école", it:"La scuola", color:"#B07CC6",
    words:[
      {fr:"le crayon", it:"la matita", e:"✏️"},
      {fr:"le cahier", it:"il quaderno", e:"📓"},
      {fr:"le livre", it:"il libro", e:"📕"},
      {fr:"la gomme", it:"la gomma", e:"🧽"},
      {fr:"les ciseaux", it:"le forbici", e:"✂️"},
      {fr:"le sac", it:"lo zaino", e:"🎒"},
      {fr:"la règle", it:"il righello", e:"📏"},
      {fr:"la cloche", it:"la campanella", e:"🔔"},
    ]
  },
  {
    id:"mer", emoji:"🌊", fr:"La mer", it:"Il mare", color:"#2FB6C4",
    words:[
      {fr:"la plage", it:"la spiaggia", e:"🏖️"},
      {fr:"le sable", it:"la sabbia", e:"🪨"},
      {fr:"le coquillage", it:"la conchiglia", e:"🐚"},
      {fr:"le crabe", it:"il granchio", e:"🦀"},
      {fr:"la baleine", it:"la balena", e:"🐋"},
      {fr:"le phare", it:"il faro", e:"🗼"},
      {fr:"la vague", it:"l'onda", e:"🌊"},
      {fr:"le seau", it:"il secchiello", e:"🪣"},
    ]
  },
  {
    id:"montagne", emoji:"⛰️", fr:"La montagne", it:"La montagna", color:"#7D8FA0",
    words:[
      {fr:"la montagne", it:"la montagna", e:"⛰️"},
      {fr:"le sapin", it:"l'abete", e:"🌲"},
      {fr:"l'ours", it:"l'orso", e:"🐻"},
      {fr:"le renard", it:"la volpe", e:"🦊"},
      {fr:"le feu", it:"il fuoco", e:"🔥"},
      {fr:"la tente", it:"la tenda", e:"⛺"},
      {fr:"l'étoile", it:"la stella", e:"⭐"},
      {fr:"le rocher", it:"la roccia", e:"🪨"},
    ]
  },
  {
    id:"sport", emoji:"⚽", fr:"Le sport", it:"Lo sport", color:"#43A047",
    words:[
      {fr:"le ballon", it:"il pallone", e:"⚽"},
      {fr:"courir", it:"correre", e:"🏃"},
      {fr:"nager", it:"nuotare", e:"🏊"},
      {fr:"sauter", it:"saltare", e:"🤸"},
      {fr:"danser", it:"ballare", e:"💃"},
      {fr:"la médaille", it:"la medaglia", e:"🏅"},
      {fr:"le cyclisme", it:"il ciclismo", e:"🚴"},
      {fr:"le ski", it:"lo sci", e:"⛷️"},
    ]
  },
  {
    id:"fete", emoji:"🎉", fr:"La fête", it:"La festa", color:"#F272B0",
    words:[
      {fr:"les bonbons", it:"le caramelle", e:"🍬"},
      {fr:"le cadeau", it:"il regalo", e:"🎁"},
      {fr:"le ballon de baudruche", it:"il palloncino", e:"🎈"},
      {fr:"la bougie", it:"la candelina", e:"🕯️"},
      {fr:"la musique", it:"la musica", e:"🎶"},
      {fr:"l'ami", it:"l'amico", e:"🧑‍🤝‍🧑"},
      {fr:"la fête", it:"la festa", e:"🎉"},
      {fr:"le feu d'artifice", it:"i fuochi d'artificio", e:"🎆"},
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
