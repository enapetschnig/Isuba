/* ISUBA Beraterapp — Demo-Daten
   Nährwerte je kg Trockenmasse (TM), angelehnt an gängige Tabellenwerte
   (z. B. Gruber Tabelle). Preise sind Beispielwerte in €/dt Frischmasse
   und in der App editierbar. */

const FUTTERMITTEL = [
  // Kraftfutter – Energie
  { id: "gerste",      name: "Gerste",                     gruppe: "Kraftfutter", tm: 88, nel: 8.1, nxp: 165, rp: 124, rnb: -6.6, preis: 23.5 },
  { id: "weizen",      name: "Weizen",                     gruppe: "Kraftfutter", tm: 88, nel: 8.5, nxp: 172, rp: 138, rnb: -5.4, preis: 24.5 },
  { id: "koernermais", name: "Körnermais",                 gruppe: "Kraftfutter", tm: 88, nel: 8.4, nxp: 164, rp: 106, rnb: -9.3, preis: 25.0 },
  { id: "hafer",       name: "Hafer",                      gruppe: "Kraftfutter", tm: 88, nel: 6.9, nxp: 143, rp: 121, rnb: -3.5, preis: 22.0 },
  { id: "triticale",   name: "Triticale",                  gruppe: "Kraftfutter", tm: 88, nel: 8.4, nxp: 168, rp: 128, rnb: -6.4, preis: 23.0 },
  { id: "trockenschnitzel", name: "Trockenschnitzel",      gruppe: "Kraftfutter", tm: 90, nel: 7.3, nxp: 160, rp: 108, rnb: -8.3, preis: 28.0 },

  // Kraftfutter – Eiweiß
  { id: "soja44",      name: "Sojaextraktionsschrot 44",   gruppe: "Eiweißfutter", tm: 88, nel: 8.5, nxp: 267, rp: 501, rnb: 37.4, preis: 43.0 },
  { id: "raps",        name: "Rapsextraktionsschrot",      gruppe: "Eiweißfutter", tm: 89, nel: 7.3, nxp: 228, rp: 399, rnb: 27.4, preis: 32.0 },
  { id: "rapskuchen",  name: "Rapskuchen (10 % Fett)",     gruppe: "Eiweißfutter", tm: 90, nel: 8.0, nxp: 225, rp: 340, rnb: 18.4, preis: 36.0 },
  { id: "sonnenblume", name: "Sonnenblumenschrot (teilent.)", gruppe: "Eiweißfutter", tm: 90, nel: 6.2, nxp: 190, rp: 379, rnb: 30.2, preis: 28.5 },
  { id: "erbsen",      name: "Futtererbsen",               gruppe: "Eiweißfutter", tm: 88, nel: 8.5, nxp: 187, rp: 251, rnb: 10.2, preis: 30.0 },
  { id: "ackerbohnen", name: "Ackerbohnen",                gruppe: "Eiweißfutter", tm: 88, nel: 8.4, nxp: 195, rp: 298, rnb: 16.5, preis: 32.0 },

  // Mischfutter (Beispiele)
  { id: "mlf18",       name: "Milchleistungsfutter 18/4",  gruppe: "Mischfutter", tm: 88, nel: 7.9, nxp: 195, rp: 205, rnb: 1.6, preis: 34.0 },
  { id: "mlf22",       name: "Milchleistungsfutter 22/4",  gruppe: "Mischfutter", tm: 88, nel: 7.9, nxp: 210, rp: 250, rnb: 6.4, preis: 37.5 },
  { id: "eiweisskonz", name: "Eiweißkonzentrat 40",        gruppe: "Mischfutter", tm: 89, nel: 7.6, nxp: 250, rp: 455, rnb: 32.8, preis: 45.0 },

  // Nebenprodukte
  { id: "biertreber",  name: "Biertreber (siliert)",       gruppe: "Nebenprodukte", tm: 24, nel: 6.6, nxp: 188, rp: 249, rnb: 9.8, preis: 9.0 },
  { id: "pressschnitzel", name: "Pressschnitzel (siliert)", gruppe: "Nebenprodukte", tm: 26, nel: 7.4, nxp: 164, rp: 110, rnb: -8.6, preis: 10.5 },

  // Grundfutter
  { id: "grassilage1", name: "Grassilage 1. Schnitt",      gruppe: "Grundfutter", tm: 35, nel: 6.2, nxp: 135, rp: 162, rnb: 4.3, preis: 4.5 },
  { id: "grassilage2", name: "Grassilage Folgeschnitt",    gruppe: "Grundfutter", tm: 38, nel: 5.9, nxp: 130, rp: 170, rnb: 6.4, preis: 4.5 },
  { id: "maissilage",  name: "Maissilage",                 gruppe: "Grundfutter", tm: 33, nel: 6.6, nxp: 132, rp: 80,  rnb: -8.3, preis: 5.0 },
  { id: "heu",         name: "Heu (gute Qualität)",        gruppe: "Grundfutter", tm: 86, nel: 5.4, nxp: 122, rp: 115, rnb: -1.1, preis: 15.0 },
  { id: "stroh",       name: "Gerstenstroh",               gruppe: "Grundfutter", tm: 86, nel: 3.5, nxp: 65,  rp: 40,  rnb: -4.0, preis: 8.0 }
];

/* Bedarfswerte Milchkuh (Näherung, 650 kg Lebendmasse):
   Erhaltung: 37,7 MJ NEL und 445 g nXP je Tag.
   Je kg Milch (4 % Fett): 3,3 MJ NEL und 86 g nXP. */
const BEDARF = { nelErhalt: 37.7, nxpErhalt: 445, nelJeKg: 3.3, nxpJeKg: 86 };

/* Beispielbetriebe — stehen stellvertretend für die rund 200 Kundenbetriebe.
   Milchkontrolldaten: Herdenschnitt aus der LKV-Tageskontrolle. */
const BETRIEBE = [
  {
    id: "b01", name: "Bergerhof", leiter: "Familie Berger", ort: "Freistadt, OÖ",
    kuehe: 42, rasse: "Fleckvieh", system: "AGR + Transponder", zielMilch: 28,
    melksystem: "Fischgräten-Melkstand", telefon: "+43 664 1111111",
    letzterBesuch: "2026-07-28", naechsterBesuch: "2026-10-12",
    analysen: {},
    massnahmen: [
      { id: "m01", text: "Rapsschrot von 1,8 auf 1,2 kg reduzieren, 0,5 kg Körnermais ergänzen", quelle: "Besuch 28.07.2026", angelegt: "2026-07-28", erledigt: false },
      { id: "m02", text: "Harnstoffwert bei nächster Milchkontrolle prüfen", quelle: "Besuch 28.07.2026", angelegt: "2026-07-28", erledigt: false }
    ],
    milchkontrollen: [
      { monat: "Mär", milch: 26.8, fett: 4.21, eiweiss: 3.48, harnstoff: 24, zellzahl: 148 },
      { monat: "Apr", milch: 27.4, fett: 4.15, eiweiss: 3.45, harnstoff: 26, zellzahl: 132 },
      { monat: "Mai", milch: 28.1, fett: 4.02, eiweiss: 3.41, harnstoff: 29, zellzahl: 156 },
      { monat: "Jun", milch: 27.6, fett: 3.98, eiweiss: 3.39, harnstoff: 32, zellzahl: 171 },
      { monat: "Jul", milch: 27.1, fett: 3.95, eiweiss: 3.37, harnstoff: 33, zellzahl: 164 }
    ],
    ration: [
      { futterId: "grassilage1", kgFM: 24 }, { futterId: "maissilage", kgFM: 14 },
      { futterId: "heu", kgFM: 1.5 }, { futterId: "gerste", kgFM: 2.5 }, { futterId: "raps", kgFM: 1.8 }
    ],
    besuche: [
      { datum: "2026-07-28", bcs: 3.4, schuettelbox: { ober: 12, mittel: 41, unten: 47 }, kotscore: 3.0, tsSilage: 34,
        notizen: "Harnstoff steigt seit Mai — Eiweißüberhang aus jungem Folgeschnitt. Grassilage 2. Schnitt sehr eiweißreich.",
        empfehlungen: "Rapsschrot von 1,8 auf 1,2 kg reduzieren, dafür 0,5 kg Körnermais ergänzen. Kontrolle bei der nächsten Milchprüfung." },
      { datum: "2026-04-15", bcs: 3.3, schuettelbox: { ober: 10, mittel: 44, unten: 46 }, kotscore: 3.2, tsSilage: 35,
        notizen: "Herde stabil, Grundfutterqualität 1. Schnitt sehr gut.",
        empfehlungen: "Ration unverändert weiterfahren." }
    ]
  },
  {
    id: "b02", name: "Lindmoser", leiter: "Anna und Georg Lindmoser", ort: "Zwettl, NÖ",
    kuehe: 65, rasse: "Fleckvieh", system: "TMR", zielMilch: 32,
    melksystem: "AMS Lely", telefon: "+43 664 2222222",
    letzterBesuch: "2026-08-05", naechsterBesuch: "2026-11-02",
    analysen: { grassilage1: { tm: 36, nel: 6.4, nxp: 138, rp: 168 } },
    massnahmen: [
      { id: "m03", text: "Sojaanteil testweise um 0,3 kg senken (Preiswürdigkeit Raps)", quelle: "Besuch 05.08.2026", angelegt: "2026-08-05", erledigt: true, erledigtAm: "2026-08-12" }
    ],
    milchkontrollen: [
      { monat: "Mär", milch: 31.2, fett: 4.05, eiweiss: 3.52, harnstoff: 22, zellzahl: 118 },
      { monat: "Apr", milch: 31.8, fett: 4.01, eiweiss: 3.50, harnstoff: 23, zellzahl: 109 },
      { monat: "Mai", milch: 32.5, fett: 3.96, eiweiss: 3.49, harnstoff: 24, zellzahl: 121 },
      { monat: "Jun", milch: 32.2, fett: 3.92, eiweiss: 3.47, harnstoff: 23, zellzahl: 115 },
      { monat: "Jul", milch: 32.6, fett: 3.94, eiweiss: 3.48, harnstoff: 24, zellzahl: 112 }
    ],
    ration: [
      { futterId: "grassilage1", kgFM: 22 }, { futterId: "maissilage", kgFM: 18 },
      { futterId: "stroh", kgFM: 0.5 }, { futterId: "koernermais", kgFM: 2.8 },
      { futterId: "soja44", kgFM: 1.2 }, { futterId: "raps", kgFM: 1.0 }
    ],
    besuche: [
      { datum: "2026-08-05", bcs: 3.2, schuettelbox: { ober: 8, mittel: 45, unten: 47 }, kotscore: 3.1, tsSilage: 33,
        notizen: "TMR sehr homogen, kaum Selektion am Futtertisch. Herde in bester Verfassung.",
        empfehlungen: "Sojaanteil testweise um 0,3 kg senken — Preiswürdigkeit spricht aktuell für Raps.",
        technik: "AMS Lely: Kraftfutter-Startmenge Frischlaktierende von 3,0 auf 2,6 kg gesenkt, Steigerung 0,2 kg/Tag — Restfutter am Roboter war zu hoch." }
    ]
  },
  {
    id: "b03", name: "Hoarachhof", leiter: "Familie Wieser", ort: "Tamsweg, Sbg",
    kuehe: 24, rasse: "Pinzgauer", system: "Heumilch, AGR", zielMilch: 22,
    melksystem: "Rohrmelkanlage", telefon: "+43 664 3333333",
    letzterBesuch: "2026-06-18", naechsterBesuch: "2026-09-08",
    analysen: {},
    massnahmen: [
      { id: "m04", text: "Ackerbohnen auf 1,5 kg erhöhen oder 0,5 kg Rapskuchen ergänzen", quelle: "Besuch 18.06.2026", angelegt: "2026-06-18", erledigt: false },
      { id: "m05", text: "Zellzahl beobachten — Einzeltiere über 400.000 schalmen", quelle: "Besuch 18.06.2026", angelegt: "2026-06-18", erledigt: false }
    ],
    milchkontrollen: [
      { monat: "Mär", milch: 20.4, fett: 4.02, eiweiss: 3.31, harnstoff: 18, zellzahl: 187 },
      { monat: "Apr", milch: 21.0, fett: 3.98, eiweiss: 3.30, harnstoff: 17, zellzahl: 195 },
      { monat: "Mai", milch: 21.8, fett: 3.91, eiweiss: 3.28, harnstoff: 15, zellzahl: 210 },
      { monat: "Jun", milch: 21.2, fett: 3.89, eiweiss: 3.24, harnstoff: 14, zellzahl: 231 },
      { monat: "Jul", milch: 20.8, fett: 3.92, eiweiss: 3.22, harnstoff: 13, zellzahl: 226 }
    ],
    ration: [
      { futterId: "heu", kgFM: 14 }, { futterId: "gerste", kgFM: 2.0 },
      { futterId: "hafer", kgFM: 1.0 }, { futterId: "ackerbohnen", kgFM: 1.0 }
    ],
    besuche: [
      { datum: "2026-06-18", bcs: 3.0, schuettelbox: null, kotscore: 3.4, tsSilage: null,
        notizen: "Harnstoff deutlich zu niedrig — Eiweißversorgung im Pansen knapp, Eiweiß im Milchbefund fällt. Zellzahl im Auge behalten.",
        empfehlungen: "Ackerbohnen auf 1,5 kg erhöhen oder 0,5 kg Rapskuchen ergänzen (Heumilch-konform). Nachkontrolle im September." }
    ]
  },
  {
    id: "b04", name: "Steinbauer", leiter: "Markus Steinbauer", ort: "Hartberg, Stmk",
    kuehe: 78, rasse: "Holstein", system: "TMR", zielMilch: 36,
    melksystem: "AMS GEA", telefon: "+43 664 4444444",
    letzterBesuch: "2026-08-11", naechsterBesuch: "2026-09-22",
    analysen: { maissilage: { tm: 32, nel: 6.7, nxp: 133, rp: 78 } },
    massnahmen: [
      { id: "m06", text: "Strohanteil auf 0,8 kg erhöhen, Häcksellänge kontrollieren", quelle: "Besuch 11.08.2026", angelegt: "2026-08-11", erledigt: false },
      { id: "m07", text: "Körnermais um 0,5 kg zurücknehmen", quelle: "Besuch 11.08.2026", angelegt: "2026-08-11", erledigt: false },
      { id: "m08", text: "Telefonat zur Kontrolle in KW 35", quelle: "Besuch 11.08.2026", angelegt: "2026-08-11", erledigt: false }
    ],
    milchkontrollen: [
      { monat: "Mär", milch: 34.8, fett: 3.82, eiweiss: 3.32, harnstoff: 25, zellzahl: 142 },
      { monat: "Apr", milch: 35.4, fett: 3.74, eiweiss: 3.30, harnstoff: 26, zellzahl: 138 },
      { monat: "Mai", milch: 36.1, fett: 3.61, eiweiss: 3.28, harnstoff: 27, zellzahl: 146 },
      { monat: "Jun", milch: 36.4, fett: 3.48, eiweiss: 3.27, harnstoff: 26, zellzahl: 151 },
      { monat: "Jul", milch: 36.0, fett: 3.41, eiweiss: 3.26, harnstoff: 27, zellzahl: 149 }
    ],
    ration: [
      { futterId: "maissilage", kgFM: 26 }, { futterId: "grassilage1", kgFM: 14 },
      { futterId: "stroh", kgFM: 0.4 }, { futterId: "koernermais", kgFM: 3.5 },
      { futterId: "soja44", kgFM: 2.2 }, { futterId: "mlf18", kgFM: 1.5 }
    ],
    besuche: [
      { datum: "2026-08-11", bcs: 2.9, schuettelbox: { ober: 5, mittel: 38, unten: 57 }, kotscore: 2.4, tsSilage: 32,
        notizen: "Fett-Eiweiß-Quotient unter 1,1 und dünner Kot — Verdacht auf subakute Pansenübersäuerung. Obersieb nur 5 %, Struktur fehlt.",
        empfehlungen: "Strohanteil auf 0,8 kg erhöhen, Häcksellänge prüfen. Körnermais um 0,5 kg zurücknehmen. Telefonat in 2 Wochen." }
    ]
  },
  {
    id: "b05", name: "Grubergut", leiter: "Familie Gruber", ort: "Rohrbach, OÖ",
    kuehe: 35, rasse: "Fleckvieh", system: "AGR", zielMilch: 26,
    melksystem: "Fischgräten-Melkstand", telefon: "+43 664 5555555",
    letzterBesuch: "2026-05-20", naechsterBesuch: "2026-08-25",
    analysen: {},
    massnahmen: [
      { id: "m09", text: "Angebot für Einzelkomponenten (Gerste + Raps) statt MLF einholen", quelle: "Besuch 20.05.2026", angelegt: "2026-05-20", erledigt: false }
    ],
    milchkontrollen: [
      { monat: "Mär", milch: 24.6, fett: 4.35, eiweiss: 3.42, harnstoff: 21, zellzahl: 165 },
      { monat: "Apr", milch: 25.1, fett: 4.31, eiweiss: 3.44, harnstoff: 22, zellzahl: 158 },
      { monat: "Mai", milch: 25.8, fett: 4.28, eiweiss: 3.45, harnstoff: 23, zellzahl: 149 },
      { monat: "Jun", milch: 25.4, fett: 4.24, eiweiss: 3.43, harnstoff: 22, zellzahl: 153 },
      { monat: "Jul", milch: 25.0, fett: 4.26, eiweiss: 3.44, harnstoff: 22, zellzahl: 160 }
    ],
    ration: [
      { futterId: "grassilage1", kgFM: 28 }, { futterId: "maissilage", kgFM: 8 },
      { futterId: "heu", kgFM: 2 }, { futterId: "mlf18", kgFM: 3.0 }
    ],
    besuche: [
      { datum: "2026-05-20", bcs: 3.5, schuettelbox: { ober: 14, mittel: 42, unten: 44 }, kotscore: 3.3, tsSilage: 36,
        notizen: "Solide Herde. Milchleistungsfutter-Zukauf teuer im Verhältnis zum Nährstoffgehalt.",
        empfehlungen: "Angebot für Einzelkomponenten (Gerste + Raps) einholen — rechnerisch rund 4 €/dt günstiger bei gleicher Nährstofflieferung." }
    ]
  },
  {
    id: "b06", name: "Talerhof", leiter: "Familie Mairhofer", ort: "Kufstein, T",
    kuehe: 29, rasse: "Braunvieh", system: "AGR", zielMilch: 25,
    melksystem: "Melkkarussell", telefon: "+43 664 6666666",
    letzterBesuch: "2026-07-02", naechsterBesuch: "2026-08-19",
    analysen: {},
    massnahmen: [
      { id: "m10", text: "Frischlaktierende auf 3 kg Gerste über Transponder", quelle: "Besuch 02.07.2026", angelegt: "2026-07-02", erledigt: true, erledigtAm: "2026-07-06" },
      { id: "m11", text: "Biertreber auf Nacherwärmung prüfen (Sommer!)", quelle: "Besuch 02.07.2026", angelegt: "2026-07-02", erledigt: false }
    ],
    milchkontrollen: [
      { monat: "Mär", milch: 23.9, fett: 4.12, eiweiss: 3.55, harnstoff: 26, zellzahl: 122 },
      { monat: "Apr", milch: 24.3, fett: 4.10, eiweiss: 3.54, harnstoff: 27, zellzahl: 119 },
      { monat: "Mai", milch: 24.8, fett: 4.05, eiweiss: 3.52, harnstoff: 28, zellzahl: 125 },
      { monat: "Jun", milch: 24.1, fett: 4.31, eiweiss: 3.38, harnstoff: 29, zellzahl: 134 },
      { monat: "Jul", milch: 23.2, fett: 4.48, eiweiss: 3.29, harnstoff: 30, zellzahl: 141 }
    ],
    ration: [
      { futterId: "grassilage2", kgFM: 26 }, { futterId: "heu", kgFM: 3 },
      { futterId: "gerste", kgFM: 2.2 }, { futterId: "biertreber", kgFM: 6 }
    ],
    besuche: [
      { datum: "2026-07-02", bcs: 2.8, schuettelbox: { ober: 16, mittel: 40, unten: 44 }, kotscore: 3.2, tsSilage: 37,
        notizen: "Fett-Eiweiß-Quotient steigt Richtung 1,4, Milch fällt — Energieversorgung der Frischlaktierenden zu knapp, Verdacht auf Energiedefizit.",
        empfehlungen: "Frischlaktierende auf 3 kg Gerste über Transponder, Biertreber-Qualität prüfen (Nacherwärmung im Sommer!). Kurzfristige Nachkontrolle." }
    ]
  }
];

/* Wissensbeiträge — kompakte Praxisthemen aus der Beratung */
const WISSEN = [
  {
    id: "harnstoff", titel: "Milchharnstoff richtig lesen",
    teaser: "Der Harnstoffwert zeigt, ob Energie und Eiweiß im Pansen zusammenpassen.",
    text: `<p>Der Zielbereich liegt bei <strong>15–30 mg/100 ml</strong>. Werte darüber deuten auf einen Eiweißüberhang oder Energiemangel im Pansen hin — das kostet Energie, belastet die Leber und geht oft mit schlechterer Fruchtbarkeit einher. Werte darunter zeigen eine Eiweißunterversorgung: Die Pansenmikroben hungern, Grundfutterverdauung und Milcheiweiß fallen ab.</p>
    <p>Wichtig ist immer der Blick auf <em>Harnstoff und Milcheiweiß gemeinsam</em>: Hoher Harnstoff bei niedrigem Eiweiß bedeutet Energiemangel, niedriger Harnstoff bei niedrigem Eiweiß bedeutet Eiweißmangel in der Ration.</p>`
  },
  {
    id: "feq", titel: "Fett-Eiweiß-Quotient als Frühwarnsystem",
    teaser: "Ein einfacher Rechenwert aus der Milchkontrolle verrät Ketose- und Azidoserisiko.",
    text: `<p>Der Quotient aus Milchfett und Milcheiweiß liegt idealerweise zwischen <strong>1,1 und 1,5</strong>. Werte <strong>über 1,5</strong> in der Frühlaktation deuten auf ein Energiedefizit und Ketoserisiko hin — die Kuh schmilzt Körperfett ein, das Milchfett steigt. Werte <strong>unter 1,1</strong> sprechen für Strukturmangel und subakute Pansenübersäuerung (SARA): Das Milchfett fällt, weil im Pansen zu wenig Essigsäure gebildet wird.</p>
    <p>Am aussagekräftigsten ist die Auswertung nach Laktationsgruppen — Einzeltiere in den ersten 100 Laktationstagen zuerst anschauen.</p>`
  },
  {
    id: "schuettelbox", titel: "Schüttelbox: Struktur der Ration prüfen",
    teaser: "Drei Siebe zeigen in fünf Minuten, ob die Mischration wiederkäuergerecht ist.",
    text: `<p>Richtwerte für eine TMR: <strong>Obersieb 6–10 %</strong> (Strukturfutter länger 19 mm), <strong>Mittelsieb 30–50 %</strong>, <strong>Untersieb maximal 50 %</strong>. Zu wenig am Obersieb bedeutet Strukturmangel und Azidoserisiko, zu viel begünstigt Selektion am Futtertisch.</p>
    <p>Praxis-Tipp: Zusätzlich die Futterreste am Abend schütteln — weicht das Ergebnis stark von der frischen Mischung ab, selektieren die Kühe. Dann Häcksellänge, Mischzeit und TS der Mischung kontrollieren.</p>`
  },
  {
    id: "ts", titel: "Trockenmasse der Silage selbst bestimmen",
    teaser: "Mit Mikrowelle oder Heißluftfritteuse in 30 Minuten zum genauen TS-Wert.",
    text: `<p>Die TS der Silage schwankt vom Silo-Anschnitt bis zur Witterung — und jede Abweichung verschiebt die ganze Ration. 300 g Probe abwiegen, in der Mikrowelle portionsweise trocknen (Glas Wasser dazu stellen!), bis das Gewicht konstant bleibt. TS % = Trockengewicht ÷ Einwaage × 100.</p>
    <p>Faustregel: Ändert sich die TS der Maissilage um 3 Prozentpunkte, verschiebt sich die Frischmasse-Einwaage im Mischwagen um rund 10 %. Deshalb: bei jedem Anschnittwechsel und nach Regenperioden neu messen.</p>`
  },
  {
    id: "bcs", titel: "Body Condition Score gezielt einsetzen",
    teaser: "Die Körperkondition an vier Zeitpunkten erfassen — mehr braucht es nicht.",
    text: `<p>Entscheidend sind vier Zeitpunkte: <strong>Trockenstellen (BCS 3,25–3,5)</strong>, <strong>Abkalbung (3,25–3,5)</strong>, <strong>Laktationsspitze (nicht unter 2,5)</strong> und <strong>150. Laktationstag</strong>. Kühe, die zwischen Abkalbung und Spitze mehr als 0,75 Punkte verlieren, haben ein deutlich erhöhtes Ketose- und Fruchtbarkeitsrisiko.</p>
    <p>Verfettete Trockensteher (BCS über 4) sind der teuerste Fehler in der Fütterung — sie fressen nach der Kalbung schlechter und rutschen tiefer ins Energieloch.</p>`
  },
  {
    id: "ams", titel: "Kraftfutter am Melkroboter richtig einstellen",
    teaser: "Die Kraftfutterkurve am AMS entscheidet über Besuchsfrequenz, Pansen und Kosten.",
    text: `<p>Am automatischen Melksystem (Lely, GEA, DeLaval, Boumatic) wird Kraftfutter tierindividuell zugeteilt — die Einstellungen werden aber oft jahrelang nicht angerührt. Drei Stellschrauben lohnen sich: <strong>Startmenge und Steigerung</strong> nach der Kalbung (zu schnell steigern belastet den Pansen), <strong>Maximalmenge je Besuch</strong> (mehr als 2–2,5 kg je Melkung kann die Kuh nicht sinnvoll aufnehmen — Restfutter ist verschenktes Geld) und die <strong>leistungsbezogene Kurve</strong>, die zur Grundration passen muss.</p>
    <p>Faustregel: Erst die Mischration am Futtertisch sauber rechnen, dann das AMS-Kraftfutter nur für die Leistung darüber einsetzen. Bei jedem Rationswechsel gehören die Robotereinstellungen mitgeprüft — deshalb sind sie fixer Bestandteil des Besuchsberichts.</p>`
  },
  {
    id: "preiswuerdigkeit", titel: "Futterzukauf: Preiswürdigkeit statt Preis je Tonne",
    teaser: "Nicht der Preis je Dezitonne entscheidet, sondern der Preis je Nährstoff.",
    text: `<p>Ein Futtermittel ist sein Geld wert, wenn Energie (NEL) und Rohprotein günstiger geliefert werden als über die Referenz aus Getreide und Sojaschrot. Das Austauschverfahren rechnet aus beiden Referenzpreisen einen Energie- und einen Proteinpreis aus — daraus ergibt sich für jedes Futtermittel ein <strong>innerer Wert</strong>.</p>
    <p>Liegt der Marktpreis unter dem inneren Wert, ist der Zukauf preiswürdig. Genau diese Rechnung macht der Futtermittelvergleich in dieser App — mit tagesaktuellen, selbst erfassten Preisen.</p>`
  }
];
