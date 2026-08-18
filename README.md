# Isuba Beraterapp

Web-App für [ISUBA](https://www.isuba.at/) — die unabhängige Milchviehfütterungs-Beratung von Ing. Jonas Schiffer. Die App digitalisiert die Beratungsarbeit für rund **200 Kundenbetriebe**: jeder Betrieb bekommt eine eigene Akte mit Kennzahlen, Rationen und Besuchsberichten, dazu Rechenwerkzeuge, die den Kern der unabhängigen Beratung abbilden.

## Warum diese App?

Isubas Alleinstellung ist die **Unabhängigkeit**: keine Produktbindung, Empfehlungen rein nach Nutzen für den Betrieb. Genau das bilden die Werkzeuge ab:

1. **Futtermittelvergleich (Preiswürdigkeit)** — das Herzstück. Nach dem Austauschverfahren (Löhr) wird aus den Preisen zweier Referenzfutter (Gerste für Energie, Sojaschrot für Protein) ein Energie- und Proteinpreis errechnet. Daraus ergibt sich für jedes Futtermittel ein *innerer Wert* — liegt der Marktpreis darunter, ist der Zukauf preiswürdig. Preise sind direkt in der Tabelle editierbar und werden lokal gespeichert. Das ist das stärkste Argument eines unabhängigen Beraters gegenüber dem Werksvertreter.
2. **Betriebsakte je Kunde** — Stammdaten, Milchkontroll-Verläufe (Milch, Harnstoff, Fett-Eiweiß-Quotient, Zellzahl) als Charts mit Zielbändern, aktuelle Ration mit Nährstoffsummen und Futterkosten je kg Milch, komplette Besuchshistorie.
3. **Automatische Auffälligkeiten** — die App wertet die letzte Milchkontrolle jedes Betriebs aus und warnt: Harnstoff außerhalb 15–30 mg, Fett-Eiweiß-Quotient über 1,5 (Ketoserisiko) oder unter 1,1 (Azidoserisiko), Zellzahl über 200.000, überfällige Besuchstermine. Der Berater sieht morgens auf einen Blick, welcher der 200 Betriebe Aufmerksamkeit braucht.
4. **Rationscheck** — schnelle Plausibilitätskontrolle je Kuh und Tag: NEL-, nXP- und TM-Deckung in Prozent, ruminale N-Bilanz, Futterkosten je kg Milch. Bewusst als Schnellcheck ausgelegt, nicht als Ersatz für die vollständige Rationsberechnung.
5. **Besuchsbericht-Formular** — direkt im Stall erfassen, was Isuba heute händisch dokumentiert: BCS, Schüttelbox (3 Siebe), Kotscore, TS-Bestimmung, Beobachtungen und Empfehlungen. Der Bericht landet sofort in der Betriebsakte.
6. **Wissensbereich** — kompakte Praxistexte (Harnstoff lesen, Fett-Eiweiß-Quotient, Schüttelbox, TS-Bestimmung, BCS, Preiswürdigkeit) im Stil des Buchs „1×1 der Milchviehfütterung".

## Starten

Kein Build nötig — statische Web-App ohne Abhängigkeiten:

```bash
# Beliebiger statischer Server, z. B.:
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

Oder `index.html` direkt im Browser öffnen.

## Technik

- **Stack**: HTML + CSS + Vanilla-JavaScript, keine Frameworks, kein Build-Schritt. Läuft auf jedem Handy im Stall (responsiv, mobile Tab-Bar), helles und dunkles Farbschema.
- **Daten**: `js/data.js` enthält Futtermittel-Stammdaten (Nährwerte je kg TM, angelehnt an gängige Tabellenwerte wie die Gruber Tabelle), sechs Demo-Betriebe stellvertretend für die 200 Kunden sowie die Wissensbeiträge. Eigene Eingaben (Preise, Besuchsberichte) liegen im `localStorage`.
- **Rechenlogik** in `js/app.js`: Rationssummen, Bedarf nach Faustzahlen (650-kg-Kuh: 37,7 MJ NEL + 3,3 MJ je kg Milch; 445 g nXP + 86 g je kg Milch), Austauschverfahren, Kennzahlen-Ampeln.

## Ausbaustufen (Roadmap)

Der Prototyp zeigt den Funktionsumfang; für den Echtbetrieb mit 200 Kunden fehlen:

1. **Backend + Login**: je Kunde ein Zugang, der nur den eigenen Betrieb zeigt; der Berater sieht alle. (z. B. Supabase/PostgreSQL — Datenmodell ist in `data.js` bereits angelegt.)
2. **LKV-Anbindung**: Milchkontrolldaten automatisch statt händisch übernehmen (RDV-Schnittstelle).
3. **Futteranalysen**: Laborbefunde (LUFA/Futtermittellabor) je Betrieb hochladen; eigene Silage-Analysewerte ersetzen die Tabellenwerte im Rationscheck.
4. **Benachrichtigungen**: Push/WhatsApp bei neuen Berichten, Terminerinnerungen, Preisalarm („Rapsschrot wieder preiswürdig").
5. **PDF-Export** der Besuchsberichte — ersetzt die heutige schriftliche Zusammenfassung per Mail.
6. **Offline-Fähigkeit** (PWA): im Stall gibt es nicht überall Empfang; Berichte offline erfassen, später synchronisieren.

## Hinweis

Alle Betriebe, Kennzahlen und Preise in der Demo sind **Beispieldaten**. Nährwert- und Bedarfszahlen sind Näherungen für Demonstrationszwecke und ersetzen keine fachliche Rationsberechnung.
