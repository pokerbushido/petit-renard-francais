"use strict";
/* ============================================================
   STORIA — Le Grand Voyage.
   Pipelette la gazza ruba le parole francesi di ogni luogo:
   Foxy e il bambino viaggiano per la Francia e le recuperano.
   L'ordine dell'array CHAPTERS È il percorso.

   BILINGUE — ogni battuta può portare una frase francese:
     text  → la narrazione, in italiano (voce italiana)
     speak → cosa viene pronunciato, se diverso da text
     fr    → la frase-chiave in francese (voce francese)
     frIt  → cosa vuol dire, in italiano

   Le due lingue restano in campi separati, non mescolate in una
   stringa sola, per una ragione pratica: una frase mista letta da
   una voce sola sbaglierebbe per forza la pronuncia di una delle
   due lingue — e la pronuncia francese giusta è il motivo per cui
   l'app esiste. Così ogni pezzo va alla sua voce madrelingua.

   Una frase francese per capitolo, sull'ultima battuta: è quella
   che resta in testa mentre parte il gioco.
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
    friend:{emoji:"🧶", name:"Mamie Lulu", line:"Bonjour mes petits ! Chi mi ha rubato i saluti?"},
    cutscene:[
      {fox:"salue", text:"Salut ! Io sono Foxy. Andiamo in Francia insieme?", speak:"Salut! Io sono Foxy. Andiamo in Francia insieme?"},
      {pie:"vole",  emoji:"🎒", text:"Uh oh… quella è Pipelette la gazza! Sta rubando le parole!", speak:"Uh oh! Quella è Pipelette la gazza. Sta rubando le parole!"},
      {pie:"rit",   text:"«Cra cra! Le parole sono mie!» E vola via verso il villaggio.", speak:"Cra cra! Le parole sono mie!"},
      {fox:"montre", text:"Presto, riprendiamole! Cominciamo dai saluti.", speak:"Presto, riprendiamole! Cominciamo dai saluti.",
       fr:"Bonjour ! Ça va ?", frIt:"Buongiorno! Come va?"},
    ]
  },
  {
    id:"ch-famille", regionId:"village", unitId:"famille",
    title:"La famiglia del villaggio",
    friend:{emoji:"👶", name:"Le petit Léo", line:"Non so più come si chiama la mia maman!"},
    cutscene:[
      {fox:"idle", text:"Léo piange: Pipelette gli ha rubato i nomi della famiglia.", speak:"Léo piange: Pipelette gli ha rubato i nomi della famiglia."},
      {pie:"boude", text:"La gazza li ha nascosti nel suo nido, in cima al camino.", speak:"La gazza li ha nascosti nel suo nido, in cima al camino."},
      {fox:"montre", text:"Aiutiamo Léo a ritrovarli!", speak:"Aiutiamo Léo a ritrovarli!",
       fr:"Voici ma famille !", frIt:"Ecco la mia famiglia!"},
    ]
  },
  {
    id:"ch-maison", regionId:"village", unitId:"maison",
    title:"La casa senza nomi",
    friend:{emoji:"🐭", name:"Souricette", line:"Ho perso il nome della mia porta !"},
    cutscene:[
      {fox:"idle", emoji:"🏠", text:"Entriamo nella casa di legno: Souricette non trova più il nome della sua porta.", speak:"Entriamo nella casa di legno: Souricette non trova più il nome della sua porta."},
      {pie:"vole", text:"Pipelette è passata di stanza in stanza, rubando ogni nome!", speak:"Pipelette è passata di stanza in stanza, rubando ogni nome!"},
      {fox:"montre", text:"Guardiamo bene ogni angolo: letto, sedia, finestra… tutto ha un nome!", speak:"Guardiamo bene ogni angolo: letto, sedia, finestra, tutto ha un nome!",
       fr:"C'est ma maison !", frIt:"Questa è la mia casa!"},
    ]
  },
  {
    id:"ch-couleurs", regionId:"village", unitId:"couleurs",
    title:"Il villaggio senza colori",
    friend:{emoji:"🎨", name:"Pierre le peintre", line:"Il mio quadro è tutto grigio !"},
    cutscene:[
      {fox:"curieux", text:"Guarda: il villaggio è diventato tutto grigio…", speak:"Guarda: il villaggio è diventato tutto grigio."},
      {pie:"rit", emoji:"🎨", text:"Pipelette ha rubato i colori dalla tavolozza di Pierre!", speak:"Pipelette ha rubato i colori dalla tavolozza di Pierre!"},
      {fox:"saute", text:"Riprendiamoli uno per uno e ridipingiamo tutto!", speak:"Riprendiamoli uno per uno e ridipingiamo tutto!",
       fr:"Regarde les couleurs !", frIt:"Guarda i colori!"},
    ]
  },
  {
    id:"ch-ferme", regionId:"campagne", unitId:"ferme",
    title:"La fattoria in allarme",
    friend:{emoji:"🐓", name:"Coco le coq", line:"Cocorico ! Chi ha rubato i miei amici?"},
    cutscene:[
      {fox:"saute", emoji:"🚜", text:"Si parte per la fattoria di Coco il gallo!", speak:"Si parte per la fattoria di Coco il gallo!"},
      {pie:"boude", text:"Pipelette si è nascosta nel fienile con tutti i nomi degli animali.", speak:"Pipelette si è nascosta nel fienile con tutti i nomi degli animali."},
      {fox:"idle", text:"Coco fa cocoricò ma non sa più come chiamare i suoi amici.", speak:"Coco fa cocoricò ma non sa più come chiamare i suoi amici."},
      {fox:"montre", text:"Aiutiamo Coco a ritrovare gallina, maiale, capra e tutti gli altri.", speak:"Aiutiamo Coco a ritrovare gallina, maiale, capra e tutti gli altri.",
       fr:"À la ferme !", frIt:"Alla fattoria!"},
    ]
  },
  {
    id:"ch-animaux", regionId:"campagne", unitId:"animaux",
    title:"Gli animali della campagna",
    friend:{emoji:"🐮", name:"Camille la vache", line:"Meuh ! Nessuno sa più chiamarmi per nome."},
    cutscene:[
      {fox:"idle", emoji:"🌻", text:"Usciamo dal villaggio: ecco la campagna!", speak:"Usciamo dal villaggio: ecco la campagna!"},
      {pie:"vole", text:"Pipelette vola sopra il prato con il sacco pieno di nomi di animali.", speak:"Pipelette vola sopra il prato con il sacco pieno di nomi di animali."},
      {fox:"montre", text:"Camille la mucca ci aiuterà. Andiamo!", speak:"Camille la mucca ci aiuterà. Andiamo!",
       fr:"Regarde les animaux !", frIt:"Guarda gli animali!"},
    ]
  },
  {
    id:"ch-meteo", regionId:"campagne", unitId:"meteo",
    title:"Il cielo capriccioso",
    friend:{emoji:"☂️", name:"Madame Pluie", line:"Non so più dire che tempo fa !"},
    cutscene:[
      {fox:"curieux", emoji:"🌦️", text:"Il cielo sopra la campagna cambia in continuazione: sole, poi nuvole…", speak:"Il cielo sopra la campagna cambia in continuazione: sole, poi nuvole."},
      {pie:"rit", text:"Pipelette si diverte a portare via le parole del tempo, una per una.", speak:"Pipelette si diverte a portare via le parole del tempo, una per una."},
      {fox:"idle", text:"Madame Pluie non sa più dire se piove o se c'è il sole!", speak:"Madame Pluie non sa più dire se piove o se c'è il sole!"},
      {fox:"montre", text:"Nominiamo pioggia, vento e arcobaleno: il cielo tornerà chiaro.", speak:"Nominiamo pioggia, vento e arcobaleno: il cielo tornerà chiaro.",
       fr:"Quel temps fait-il ?", frIt:"Che tempo fa?"},
    ]
  },
  {
    id:"ch-nombres", regionId:"ville", unitId:"nombres",
    title:"I numeri della città",
    friend:{emoji:"🎫", name:"Marcel le chauffeur", line:"Che autobus è? Non so più contare!"},
    cutscene:[
      {fox:"curieux", emoji:"🏙️", text:"Ecco la città! Ma i numeri degli autobus sono spariti.", speak:"Ecco la città! Ma i numeri degli autobus sono spariti."},
      {pie:"rit", text:"«Cra cra! Da uno a dieci, tutti miei!»", speak:"Cra cra! Da uno a dieci, tutti miei!"},
      {fox:"montre", text:"Contiamo insieme in francese e riprendiamoceli.", speak:"Contiamo insieme in francese e riprendiamoceli.",
       fr:"On compte ensemble !", frIt:"Contiamo insieme!"},
    ]
  },
  {
    id:"ch-marche", regionId:"ville", unitId:"marche",
    title:"Il mercato senza nomi",
    friend:{emoji:"🧺", name:"Jean le marchand", line:"Il mio banco è senza nomi !"},
    cutscene:[
      {fox:"saute", emoji:"🧺", text:"Il mercato della città è pieno di colori e profumi!", speak:"Il mercato della città è pieno di colori e profumi!"},
      {pie:"vole", text:"Ma Pipelette è volata via col sacco pieno di cipolle, carote e fiori!", speak:"Ma Pipelette è volata via col sacco pieno di cipolle, carote e fiori!"},
      {fox:"curieux", text:"Jean il mercante non sa più come chiamare quello che vende.", speak:"Jean il mercante non sa più come chiamare quello che vende."},
      {fox:"montre", text:"Rimettiamo ogni nome sul banco, così i clienti potranno comprare.", speak:"Rimettiamo ogni nome sul banco, così i clienti potranno comprare.",
       fr:"Au marché !", frIt:"Al mercato!"},
    ]
  },
  {
    id:"ch-nourriture", regionId:"ville", unitId:"nourriture",
    title:"Il pranzo in città",
    friend:{emoji:"👨‍🍳", name:"Momo le boulanger", line:"Il mio menu è vuoto !"},
    cutscene:[
      {fox:"idle", emoji:"🥖", text:"Che profumo! È la boulangerie di Momo.", speak:"Che profumo! È la panetteria di Momo."},
      {pie:"vole", text:"Pipelette si è portata via tutte le parole del cibo.", speak:"Pipelette si è portata via tutte le parole del cibo."},
      {fox:"saute", text:"Rimettiamo il menu a posto: ho una fame!", speak:"Rimettiamo il menu a posto: ho una fame!",
       fr:"J'ai faim !", frIt:"Ho fame!"},
    ]
  },
  {
    id:"ch-transports", regionId:"ville", unitId:"transports",
    title:"La stazione in confusione",
    friend:{emoji:"🚂", name:"Gaston le train", line:"Tchou tchou ! Dove vado?"},
    cutscene:[
      {fox:"idle", emoji:"🚂", text:"Alla stazione, Gaston il treno non sa più su quale binario andare.", speak:"Alla stazione, Gaston il treno non sa più su quale binario andare."},
      {pie:"boude", text:"Pipelette ha nascosto i nomi di tutti i mezzi di trasporto nei vagoni.", speak:"Pipelette ha nascosto i nomi di tutti i mezzi di trasporto nei vagoni."},
      {fox:"saute", text:"Ritroviamo macchina, bicicletta, barca e aereo: si riparte!", speak:"Ritroviamo macchina, bicicletta, barca e aereo: si riparte!",
       fr:"En voiture !", frIt:"Si parte!"},
    ]
  },
  {
    id:"ch-ecole", regionId:"ville", unitId:"ecole",
    title:"La lezione saltata",
    friend:{emoji:"🐧", name:"Maîtresse Adèle", line:"La lezione è saltata !"},
    cutscene:[
      {fox:"idle", emoji:"🐧", text:"Entriamo in classe: Maîtresse Adèle sta per iniziare la lezione.", speak:"Entriamo in classe: Maîtresse Adèle sta per iniziare la lezione."},
      {pie:"rit", text:"Pipelette ha svuotato lo zaino e l'astuccio di ogni parola!", speak:"Pipelette ha svuotato lo zaino e l'astuccio di ogni parola!"},
      {fox:"parle", text:"Senza matita, quaderno o libro, la lezione non può cominciare.", speak:"Senza matita, quaderno o libro, la lezione non può cominciare."},
      {fox:"montre", text:"Rimettiamo tutto nello zaino: la campanella sta per suonare!", speak:"Rimettiamo tutto nello zaino: la campanella sta per suonare!",
       fr:"À l'école !", frIt:"A scuola!"},
    ]
  },
  {
    id:"ch-mer", regionId:"cote", unitId:"mer",
    title:"Il tesoro sott'acqua",
    friend:{emoji:"🦀", name:"Crabounet", line:"Clic clac ! Le parole sono in fondo al mare."},
    cutscene:[
      {fox:"curieux", emoji:"🌊", text:"Il mare! Le onde brillano e Crabounet cammina sulla sabbia.", speak:"Il mare! Le onde brillano e Crabounet cammina sulla sabbia."},
      {pie:"vole", text:"Pipelette lascia cadere il sacco tra le onde, poi si ferma su un faro a guardarci.", speak:"Pipelette lascia cadere il sacco tra le onde, poi si ferma su un faro a guardarci."},
      {fox:"saute", text:"Clic clac, dice Crabounet: peschiamo le parole prima dell'alta marea!", speak:"Clic clac, dice Crabounet: peschiamo le parole prima dell'alta marea!",
       fr:"À la mer !", frIt:"Al mare!"},
    ]
  },
  {
    id:"ch-montagne", regionId:"cote", unitId:"montagne",
    title:"Il risveglio dell'orso",
    friend:{emoji:"🐻", name:"Grand Ours", line:"Grrr… la gazza mi ha svegliato."},
    cutscene:[
      {fox:"idle", emoji:"⛰️", text:"Saliamo in montagna, tra abeti e roccia, verso la tenda di Grand Ours.", speak:"Saliamo in montagna, tra abeti e roccia, verso la tenda di Grand Ours."},
      {pie:"rit", text:"Pipelette ha svegliato l'orso portandogli via le parole della montagna!", speak:"Pipelette ha svegliato l'orso portandogli via le parole della montagna!"},
      {fox:"curieux", text:"Grand Ours brontola: senza parole non sa più raccontare le stelle.", speak:"Grand Ours brontola: senza parole non sa più raccontare le stelle."},
      {fox:"montre", text:"Accendiamo un falò e ritroviamo insieme abete, stella e fuoco.", speak:"Accendiamo un falò e ritroviamo insieme abete, stella e fuoco.",
       fr:"À la montagne !", frIt:"In montagna!"},
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
      {fox:"saute", text:"E poi… l'ultima parola ci porterà alla festa!", speak:"E poi, l'ultima parola ci porterà alla festa!",
       fr:"J'ai froid !", frIt:"Ho freddo!"},
    ]
  },
  {
    id:"ch-corps", regionId:"cote", unitId:"corps",
    title:"Il gioco del corpo",
    friend:{emoji:"🧘", name:"Zoé la gymnaste", line:"Tocca la testa… ma come si dice in francese?"},
    cutscene:[
      {fox:"saute", text:"Zoé fa ginnastica nel prato e ci insegna un gioco.", speak:"Zoé fa ginnastica nel prato e ci insegna un gioco."},
      {pie:"boude", text:"Ma Pipelette le ha rubato i nomi delle parti del corpo!", speak:"Ma Pipelette le ha rubato i nomi delle parti del corpo!"},
      {fox:"montre", text:"Ripetiamoli tutti insieme e li riprendiamo.", speak:"Ripetiamoli tutti insieme e li riprendiamo.",
       fr:"Touche ta tête !", frIt:"Tocca la testa!"},
    ]
  },
  {
    id:"ch-sport", regionId:"fete", unitId:"sport",
    title:"La grande gara",
    friend:{emoji:"🏅", name:"Coach Théo", line:"La gara non può iniziare senza parole !"},
    cutscene:[
      {fox:"saute", emoji:"⚽", text:"Il grande stadio della festa: tutti si preparano per la gara.", speak:"Il grande stadio della festa: tutti si preparano per la gara."},
      {pie:"boude", text:"Pipelette ha rubato palla, corsa e nuoto: nessuno sa più cosa fare!", speak:"Pipelette ha rubato palla, corsa e nuoto: nessuno sa più cosa fare!"},
      {fox:"curieux", text:"Coach Théo aspetta, fischietto in mano, ma la gara non può iniziare.", speak:"Coach Théo aspetta, fischietto in mano, ma la gara non può iniziare."},
      {fox:"montre", text:"Ritroviamo tutte le parole dello sport: si parte, pronti, via!", speak:"Ritroviamo tutte le parole dello sport: si parte, pronti, via!",
       fr:"Prêts ? Partez !", frIt:"Pronti? Via!"},
    ]
  },
  {
    id:"ch-fete", regionId:"fete", unitId:"fete", finale:true,
    title:"La grande festa",
    friend:{emoji:"🎊", name:"Tous les amis", line:"On fait la fête ! Grazie per averci aiutato!"},
    cutscene:[
      {pie:"boude", emoji:"🎒", text:"Pipelette arriva col sacco vuoto: ha restituito tutte le parole.", speak:"Pipelette arriva col sacco vuoto: ha restituito tutte le parole."},
      {pie:"rit", text:"«Cra cra… volevo solo qualcuno con cui giocare!» dice la gazza.", speak:"Cra cra, volevo solo qualcuno con cui giocare!"},
      {fox:"saute", emoji:"🎉", text:"Allora vieni alla festa con noi! Ci sono tutti gli amici del viaggio.", speak:"Allora vieni alla festa con noi! Ci sono tutti gli amici del viaggio."},
      {fox:"salue", text:"Hai imparato il francese di tutta la Francia. Bravo!", speak:"Hai imparato il francese di tutta la Francia. Bravissimo!",
       fr:"On fait la fête ! À bientôt !", frIt:"Facciamo festa! A presto!"},
    ]
  },
];

function chapterById(id){ return CHAPTERS.find(c => c.id === id); }
