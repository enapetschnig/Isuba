# Isuba Beraterapp

Web-App für [ISUBA](https://www.isuba.at/) — die unabhängige Milchviehfütterungs-Beratung von Ing. Jonas Schiffer. Die App digitalisiert die Beratungsarbeit für rund **200 Abokunden**: jeder Betrieb bekommt eine eigene Akte mit Kennzahlen, Rationen, Maßnahmen und Besuchsberichten — und ein eigenes **Kundenportal**, das den laufenden Mehrwert des Beratungsabos sichtbar macht.

Der Funktionsumfang orientiert sich an dem, was Isuba heute leistet (Vor-Ort-Besuche mit schriftlicher Zusammenfassung, BCS, Schüttelbox, Kotscreening, TS-Bestimmung, produktunabhängige Empfehlungen) und an dem, was führende Fütterungsberater zusätzlich anbieten: monatliches Fütterungscontrolling mit Futterkosten und IOFC, Silomanagement mit Analysen, Benchmarking über viele Betriebe und Rationsberechnung.

## Funktionen

### Für den Berater

1. **Übersicht (Dashboard)** — Auffälligkeiten aus der jeweils letzten Milchkontrolle aller Betriebe (Harnstoff außerhalb 15–30 mg, Fett-Eiweiß-Quotient über 1,5 = Ketoserisiko bzw. unter 1,1 = Azidoserisiko, Zellzahl über 200.000, überfällige Termine), anstehende Besuche, alle offenen Maßnahmen. Morgens auf einen Blick: Welcher der 200 Betriebe braucht Aufmerksamkeit?
2. **Kundenverwaltung** — neuen Betrieb in einer Minute anlegen (Stammdaten, Rasse, Fütterungssystem, Ziel-Milchleistung, Besuchstermin), bearbeiten, löschen. Milchkontrollen direkt in der Betriebsakte nachtragen.
3. **Betriebsakte je Kunde** — Kennzahlen-Verläufe als Charts mit Zielbändern, aktuelle Ration mit Nährstoffsummen und Futterkosten je kg Milch, Besuchshistorie, Maßnahmen-Verfolgung, Benchmark.
4. **Futtermittelvergleich (Preiswürdigkeit)** — das Herzstück der unabhängigen Beratung. Nach dem Austauschverfahren (Löhr) wird aus den Preisen zweier Referenzfutter (Gerste für Energie, Sojaschrot für Protein) ein Energie- und Proteinpreis errechnet; daraus ergibt sich für jedes Futtermittel ein *innerer Wert*. Liegt der Marktpreis darunter, ist der Zukauf preiswürdig. Preise direkt in der Tabelle editierbar.
5. **Rationscheck mit IOFC** — NEL-, nXP- und TM-Deckung in Prozent, ruminale N-Bilanz, Futterkosten je kg Milch und **Income over feed cost** (Milcherlös minus Futterkosten) — die zentrale Steuergröße im Fütterungscontrolling. Eine Ration lässt sich direkt als aktuelle Ration eines Betriebs speichern.
6. **Betriebseigene Futteranalysen** — Laborwerte der eigenen Silagen (TS, NEL, nXP, XP) je Betrieb hinterlegen; Rationsbewertung und Futterkosten rechnen dann mit den echten Werten statt mit Tabellenwerten.
7. **Besuchsbericht im Stall erfassen** — BCS, Schüttelbox, Kotscore, TS, Beobachtungen, Empfehlungen, nächster Termin. Die Empfehlung wird automatisch als offene Maßnahme angelegt.

### Für den Abokunden (Kundenportal)

Jede Betriebsakte hat eine **Kundenansicht** (in der Demo über „👁 Kundenansicht" erreichbar) — das, was der Abokunde nach dem Login sieht:

- **Nächster Besuchstermin** und direkter Draht zum Berater
- **Offene Maßnahmen** zum Abhaken — der Kunde sieht jederzeit, was vereinbart wurde, und der Berater sieht, was umgesetzt ist. Das schließt die Lücke zwischen zwei Besuchen.
- **Eigene Kennzahlen** als Verläufe mit Zielbändern — verständlich statt Zahlenfriedhof
- **Aktuelle Ration** mit Futterkosten je kg Milch
- **Benchmark**: der eigene Betrieb anonym im Vergleich zu allen Isuba-Betrieben — das kann kein einzelner Landwirt und kein Futtermittelverkäufer bieten, nur ein unabhängiger Berater mit 200 Betrieben
- **Besuchsberichte** und **Fütterungswissen** zum Nachlesen

**Warum das ein Abo trägt:** Der Kunde bekommt zwischen den 2–3 Besuchen pro Jahr laufend Gegenwert — Maßnahmen-Verfolgung, aktuelle Preiswürdigkeit beim Zukauf, Benchmark, verständliche Kennzahlen. Der Berater spart Zeit (Berichte einmal erfassen statt Mail-PDF, Kennzahlen automatisch überwacht) und skaliert seine Betreuungsqualität auf 200 Betriebe.

## Starten

Kein Build nötig — statische Web-App ohne Abhängigkeiten:

```bash
python3 -m http.server 8000   # dann http://localhost:8000 öffnen
```

Oder `index.html` direkt im Browser öffnen. Der Knopf **„Demo zurücksetzen"** unten in der Navigation verwirft alle lokalen Eingaben und lädt die Beispieldaten neu.

## Mobile-first & Installation am Handy

Die App ist primär für das Handy gebaut — dort, wo Beratung stattfindet: im Stall.

- **App-Bar** oben mit Isuba-Marke, **Tab-Bar** unten mit Daumen-erreichbarer Navigation, Touch-Ziele mindestens 44 px, Eingabefelder ohne iOS-Auto-Zoom
- Betriebsliste am Handy als **Karten** mit den wichtigsten Kennzahlen, am Desktop als vollständige Tabelle
- **Als App installierbar (PWA)**: Am Handy im Browser „Zum Startbildschirm hinzufügen" — die App startet dann im Vollbild mit eigenem Icon. Ein Service Worker hält die App-Shell **offline** verfügbar (im Stall gibt es nicht überall Empfang). Voraussetzung: Auslieferung über HTTPS.

## Branding

Die App folgt der **CI von isuba.at**: helles Grau als Grund, dunkelgraue Schrift, dunkles Textgrün (`#4E7B2F`) als Marke und das helle Kranzgrün (`#8DC63F`) als Akzent, runde Sans-Schrift (Nunito Sans), Du-Form im Kundenportal. Das runde Emblem (Ring, gebogener ISUBA-Schriftzug, Kuhkopf im Ährenkranz) ist als SVG nachgebaut — angelehnt an das Original. Für den Feinschliff kann die Original-Logodatei einfach eingesetzt werden:

- **Farben**: ein Token-Block am Anfang von `css/style.css` (`--brand`, `--accent`, `--bg` …) — einmal tauschen, die ganze App zieht mit
- **Logo**: SVG-Emblem in `index.html` (2 Stellen) und `assets/icon.svg` ersetzen

## Technik

- **Stack**: HTML + CSS + Vanilla-JavaScript, keine Frameworks, kein Build-Schritt. Läuft auf jedem Handy im Stall (responsiv, mobile Tab-Bar), helles und dunkles Farbschema.
- **Daten**: `js/data.js` enthält Futtermittel-Stammdaten (Nährwerte je kg TM, angelehnt an gängige Tabellenwerte wie die Gruber Tabelle), sechs Demo-Betriebe stellvertretend für die 200 Kunden sowie die Wissensbeiträge. Alle Eingaben (Betriebe, Milchkontrollen, Rationen, Berichte, Maßnahmen, Analysen, Preise) werden im `localStorage` gespeichert.
- **Rechenlogik** in `js/app.js`: Rationssummen, Bedarf nach Faustzahlen (650-kg-Kuh: 37,7 MJ NEL + 3,3 MJ je kg Milch; 445 g nXP + 86 g je kg Milch), Austauschverfahren über NEL + Rohprotein, IOFC, Benchmark, Kennzahlen-Ampeln.

## Ausbaustufen (Roadmap)

Der Prototyp zeigt den vollen Funktionsumfang lokal; für den Echtbetrieb mit 200 Kunden fehlen:

1. **Backend + Login**: je Kunde ein Zugang, der genau das Kundenportal seines Betriebs zeigt; der Berater sieht alles (z. B. Supabase/PostgreSQL — das Datenmodell ist in `data.js` bereits angelegt).
2. **LKV-Anbindung**: Milchkontrolldaten automatisch übernehmen (RDV-Schnittstelle) statt händisch nachzutragen — auch Einzeltierdaten für Laktationsgruppen-Auswertung.
3. **Benachrichtigungen**: Push/WhatsApp bei neuem Bericht, Terminerinnerung, Preisalarm („Rapsschrot wieder preiswürdig"), Kennzahlen-Alarm direkt an den Kunden.
4. **PDF-Export** der Besuchsberichte — ersetzt die heutige schriftliche Zusammenfassung per Mail.
5. **Offline-Synchronisierung**: Die App-Shell läuft bereits offline (Service Worker); im Echtbetrieb müssen zusätzlich Eingaben offline erfasst und später mit dem Backend synchronisiert werden.
6. **Foto-Dokumentation** am Besuchsbericht (Silo-Anschnitt, Kot, Futtertisch) und Ablage von Laborbefunden als Datei.
7. **Sammelbestellung/Preisbörse**: aktuelle Zukaufspreise der Region teilen — mit 200 Betrieben entsteht echte Markttransparenz.

## Hinweis

Alle Betriebe, Kennzahlen und Preise in der Demo sind **Beispieldaten**. Nährwert- und Bedarfszahlen sind Näherungen für Demonstrationszwecke und ersetzen keine fachliche Rationsberechnung.
