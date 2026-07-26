"use strict";
/* ============================================================
   STORIA — Le Grand Voyage.
   Pipelette la gazza ruba le parole francesi di ogni luogo:
   Foxy e il bambino viaggiano per la Francia e le recuperano.
   L'ordine dell'array CHAPTERS È il percorso.
   ============================================================ */

const REGIONS = [
  {id:"village",  it:"Il villaggio",  fr:"Le village",             color:"#FFC53D", sky:"#FFF3D6", ground:"#B8E6A0"},
  {id:"campagne", it:"La campagna",   fr:"La campagne",            color:"#5CB85C", sky:"#DFF5E1", ground:"#9BD97E"},
  {id:"ville",    it:"La città",      fr:"La ville",               color:"#4FA8E8", sky:"#DCEEFB", ground:"#C9C4BC"},
  {id:"cote",     it:"Mare e monti",  fr:"La côte et la montagne", color:"#2FB6C4", sky:"#D6F2F7", ground:"#F3E2B8"},
  {id:"fete",     it:"La festa",      fr:"La fête",                color:"#F272B0", sky:"#FBE4F0", ground:"#E4C9F0"},
];

const CHAPTERS = [
  {
    id:"ch-salutations", regionId:"village", unitId:"salutations",
    title:"Le prime parole",
    friend:{emoji:"👵", name:"Mamie Lulu", line:"Bonjour mes petits ! Chi mi ha rubato i saluti?"},
    cutscene:[
      {fox:"salue", text:"Salut ! Io sono Foxy. Andiamo in Francia insieme?", speak:"Salut! Io sono Foxy. Andiamo in Francia insieme?"},
      {pie:"vole",  emoji:"🎒", text:"Uh oh… quella è Pipelette la gazza! Sta rubando le parole!", speak:"Uh oh! Quella è Pipelette la gazza. Sta rubando le parole!"},
      {pie:"rit",   text:"«Cra cra! Le parole sono mie!» E vola via verso il villaggio.", speak:"Cra cra! Le parole sono mie!"},
      {fox:"montre", text:"Presto, riprendiamole! Cominciamo dai saluti.", speak:"Presto, riprendiamole! Cominciamo dai saluti."},
    ]
  },
  {
    id:"ch-famille", regionId:"village", unitId:"famille",
    title:"La famiglia del villaggio",
    friend:{emoji:"👶", name:"Le petit Léo", line:"Non so più come si chiama la mia maman!"},
    cutscene:[
      {fox:"idle", text:"Léo piange: Pipelette gli ha rubato i nomi della famiglia.", speak:"Léo piange: Pipelette gli ha rubato i nomi della famiglia."},
      {pie:"boude", text:"La gazza li ha nascosti nel suo nido, in cima al camino.", speak:"La gazza li ha nascosti nel suo nido, in cima al camino."},
      {fox:"montre", text:"Aiutiamo Léo a ritrovarli!", speak:"Aiutiamo Léo a ritrovarli!"},
    ]
  },
  {
    id:"ch-couleurs", regionId:"village", unitId:"couleurs",
    title:"Il villaggio senza colori",
    friend:{emoji:"🎨", name:"Pierre le peintre", line:"Il mio quadro è tutto grigio !"},
    cutscene:[
      {fox:"curieux", text:"Guarda: il villaggio è diventato tutto grigio…", speak:"Guarda: il villaggio è diventato tutto grigio."},
      {pie:"rit", emoji:"🎨", text:"Pipelette ha rubato i colori dalla tavolozza di Pierre!", speak:"Pipelette ha rubato i colori dalla tavolozza di Pierre!"},
      {fox:"saute", text:"Riprendiamoli uno per uno e ridipingiamo tutto!", speak:"Riprendiamoli uno per uno e ridipingiamo tutto!"},
    ]
  },
  {
    id:"ch-animaux", regionId:"campagne", unitId:"animaux",
    title:"Gli animali della campagna",
    friend:{emoji:"🐮", name:"Camille la vache", line:"Meuh ! Nessuno sa più chiamarmi per nome."},
    cutscene:[
      {fox:"idle", emoji:"🌻", text:"Usciamo dal villaggio: ecco la campagna!", speak:"Usciamo dal villaggio: ecco la campagna!"},
      {pie:"vole", text:"Pipelette vola sopra il prato con il sacco pieno di nomi di animali.", speak:"Pipelette vola sopra il prato con il sacco pieno di nomi di animali."},
      {fox:"montre", text:"Camille la mucca ci aiuterà. Andiamo!", speak:"Camille la mucca ci aiuterà. Andiamo!"},
    ]
  },
  {
    id:"ch-corps", regionId:"campagne", unitId:"corps",
    title:"Il gioco del corpo",
    friend:{emoji:"🤸", name:"Zoé la gymnaste", line:"Tocca la testa… ma come si dice in francese?"},
    cutscene:[
      {fox:"saute", text:"Zoé fa ginnastica nel prato e ci insegna un gioco.", speak:"Zoé fa ginnastica nel prato e ci insegna un gioco."},
      {pie:"boude", text:"Ma Pipelette le ha rubato i nomi delle parti del corpo!", speak:"Ma Pipelette le ha rubato i nomi delle parti del corpo!"},
      {fox:"montre", text:"Ripetiamoli tutti insieme e li riprendiamo.", speak:"Ripetiamoli tutti insieme e li riprendiamo."},
    ]
  },
  {
    id:"ch-nombres", regionId:"ville", unitId:"nombres",
    title:"I numeri della città",
    friend:{emoji:"🚌", name:"Marcel le chauffeur", line:"Che autobus è? Non so più contare!"},
    cutscene:[
      {fox:"curieux", emoji:"🏙️", text:"Ecco la città! Ma i numeri degli autobus sono spariti.", speak:"Ecco la città! Ma i numeri degli autobus sono spariti."},
      {pie:"rit", text:"«Cra cra! Da uno a dieci, tutti miei!»", speak:"Cra cra! Da uno a dieci, tutti miei!"},
      {fox:"montre", text:"Contiamo insieme in francese e riprendiamoceli.", speak:"Contiamo insieme in francese e riprendiamoceli."},
    ]
  },
  {
    id:"ch-nourriture", regionId:"ville", unitId:"nourriture",
    title:"Il pranzo in città",
    friend:{emoji:"👨‍🍳", name:"Momo le boulanger", line:"Il mio menu è vuoto !"},
    cutscene:[
      {fox:"idle", emoji:"🥖", text:"Che profumo! È la boulangerie di Momo.", speak:"Che profumo! È la panetteria di Momo."},
      {pie:"vole", text:"Pipelette si è portata via tutte le parole del cibo.", speak:"Pipelette si è portata via tutte le parole del cibo."},
      {fox:"saute", text:"Rimettiamo il menu a posto: ho una fame!", speak:"Rimettiamo il menu a posto: ho una fame!"},
    ]
  },
  {
    id:"ch-vetements", regionId:"cote", unitId:"vetements",
    title:"Il vento della costa",
    friend:{emoji:"🧣", name:"Anouk", line:"Fa freddo ! Dov'è la mia écharpe?"},
    cutscene:[
      {fox:"curieux", emoji:"🌊", text:"Siamo arrivati al mare, e tira un vento gelido.", speak:"Siamo arrivati al mare, e tira un vento gelido."},
      {pie:"rit", text:"Pipelette ha usato i vestiti di Anouk per fare il nido!", speak:"Pipelette ha usato i vestiti di Anouk per fare il nido!"},
      {fox:"montre", text:"Nominali tutti in francese e torneranno al loro posto.", speak:"Nominali tutti in francese e torneranno al loro posto."},
      {fox:"saute", text:"E poi… l'ultima parola ci porterà alla festa!", speak:"E poi, l'ultima parola ci porterà alla festa!"},
    ]
  },
];

function chapterById(id){ return CHAPTERS.find(c => c.id === id); }
