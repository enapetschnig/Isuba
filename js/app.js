/* ISUBA Beraterapp — Anwendungslogik
   Hash-Router, Ansichten, Rechenwerkzeuge. Keine Abhängigkeiten.
   Alle Änderungen (Betriebe, Preise, Berichte, Maßnahmen) liegen im localStorage. */

(function () {
  "use strict";

  const $ = (sel, el) => (el || document).querySelector(sel);
  const main = $("#main");

  /* ---------- Persistenz ---------- */

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem("isuba." + key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("isuba." + key, JSON.stringify(value)); } catch (e) {}
    },
    del(key) {
      try { localStorage.removeItem("isuba." + key); } catch (e) {}
    }
  };

  // Betriebe: gespeicherter Stand ersetzt die Demo-Daten vollständig
  const gespeicherteBetriebe = store.get("betriebe.v2", null);
  if (Array.isArray(gespeicherteBetriebe) && gespeicherteBetriebe.length) {
    BETRIEBE.length = 0;
    gespeicherteBetriebe.forEach(b => BETRIEBE.push(b));
  }
  BETRIEBE.forEach(b => {
    if (!b.massnahmen) b.massnahmen = [];
    if (!b.analysen) b.analysen = {};
    if (!b.milchkontrollen) b.milchkontrollen = [];
    if (!b.besuche) b.besuche = [];
    if (!b.ration) b.ration = [];
  });
  const speichern = () => store.set("betriebe.v2", BETRIEBE);

  // Preise: gespeicherte Werte überlagern die Stammdaten
  const preise = store.get("preise", {});
  FUTTERMITTEL.forEach(f => { if (preise[f.id] != null) f.preis = preise[f.id]; });

  /* ---------- Format-Helfer ---------- */

  const nf = (dez) => new Intl.NumberFormat("de-AT", { minimumFractionDigits: dez, maximumFractionDigits: dez });
  const fmt = (v, dez = 1) => (v == null || isNaN(v)) ? "–" : nf(dez).format(v);
  const euro = (v, dez = 2) => (v == null || isNaN(v)) ? "–" : nf(dez).format(v) + " €";
  const datum = (iso) => {
    if (!iso) return "–";
    const [j, m, t] = iso.split("-");
    return `${t}.${m}.${j}`;
  };
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const heute = () => new Date().toISOString().slice(0, 10);
  const MONATE = ["Jän", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const aktMonat = () => MONATE[new Date().getMonth()];
  const neueId = (prefix) => prefix + Date.now().toString(36);

  /* ---------- Fachliche Auswertung ---------- */

  const futter = (id) => FUTTERMITTEL.find(f => f.id === id);

  // Nährwerte eines Futtermittels — betriebseigene Analysenwerte überlagern die Tabelle
  function futterWerte(id, analysen) {
    const f = futter(id);
    if (!f) return null;
    if (analysen && analysen[id]) return Object.assign({}, f, analysen[id]);
    return f;
  }

  // Nährstoffsumme einer Ration (Liste aus {futterId, kgFM})
  function rationsSumme(ration, analysen) {
    let tm = 0, nel = 0, nxp = 0, rp = 0, rnb = 0, kosten = 0;
    (ration || []).forEach(r => {
      const f = futterWerte(r.futterId, analysen);
      if (!f || !r.kgFM) return;
      const kgTM = r.kgFM * f.tm / 100;
      tm += kgTM;
      nel += kgTM * f.nel;
      nxp += kgTM * f.nxp;
      rp += kgTM * f.rp;
      rnb += kgTM * f.rnb;
      kosten += r.kgFM * f.preis / 100; // Preis ist €/dt FM
    });
    return { tm, nel, nxp, rp, rnb, kosten };
  }

  const letzteMK = (b) => b.milchkontrollen.length ? b.milchkontrollen[b.milchkontrollen.length - 1] : null;
  const offeneMassnahmen = (b) => (b.massnahmen || []).filter(m => !m.erledigt);

  // Auffälligkeiten aus der letzten Milchkontrolle
  function alerts(betrieb) {
    const out = [];
    const m = letzteMK(betrieb);
    if (m) {
      const feq = m.fett / m.eiweiss;
      if (m.harnstoff > 30) out.push({ stufe: "warn", text: `Harnstoff ${fmt(m.harnstoff, 0)} mg — Eiweißüberhang oder Energiemangel prüfen` });
      if (m.harnstoff < 15) out.push({ stufe: "warn", text: `Harnstoff nur ${fmt(m.harnstoff, 0)} mg — Eiweißversorgung im Pansen zu knapp` });
      if (feq > 1.5) out.push({ stufe: "crit", text: `Fett-Eiweiß-Quotient ${fmt(feq, 2)} — Ketoserisiko / Energiedefizit` });
      if (feq < 1.1) out.push({ stufe: "crit", text: `Fett-Eiweiß-Quotient ${fmt(feq, 2)} — Strukturmangel, Azidoserisiko` });
      if (m.zellzahl > 200) out.push({ stufe: "warn", text: `Zellzahl ${fmt(m.zellzahl, 0)}.000 — Eutergesundheit ansprechen` });
    }
    if (betrieb.naechsterBesuch && betrieb.naechsterBesuch < heute()) {
      out.push({ stufe: "warn", text: `Besuchstermin ${datum(betrieb.naechsterBesuch)} überfällig` });
    }
    return out;
  }

  /* Austauschverfahren (Löhr): aus den Preisen der Referenzfutter
     Gerste (Energie) und Sojaschrot (Protein) werden ein Energiepreis
     (€/MJ NEL) und ein Proteinpreis (€/g Rohprotein) errechnet. */
  function referenzPreise(energieRefId, proteinRefId) {
    const g = futter(energieRefId), s = futter(proteinRefId);
    // Preis je kg TM
    const pg = g.preis / 100 / (g.tm / 100);
    const ps = s.preis / 100 / (s.tm / 100);
    // Gleichungssystem: a*nel + b*rp = preisJeKgTM
    const det = g.nel * s.rp - s.nel * g.rp;
    if (Math.abs(det) < 1e-9) return null;
    const a = (pg * s.rp - ps * g.rp) / det; // €/MJ NEL
    const b = (g.nel * ps - s.nel * pg) / det; // €/g XP
    if (a <= 0 || b <= 0) return null;
    return { a, b };
  }

  // Innerer Wert eines Futtermittels in €/dt FM
  function innererWert(f, ref) {
    const wertJeKgTM = ref.a * f.nel + ref.b * f.rp;
    return wertJeKgTM * (f.tm / 100) * 100;
  }

  /* Benchmark über alle Betriebe: Kennzahlen der jeweils letzten Milchkontrolle
     plus Futterkosten aus der hinterlegten Ration. */
  function benchmarkDaten() {
    return BETRIEBE.map(b => {
      const m = letzteMK(b);
      if (!m || !b.ration.length) return null;
      const s = rationsSumme(b.ration, b.analysen);
      return {
        id: b.id, name: b.name,
        milch: m.milch, harnstoff: m.harnstoff, zellzahl: m.zellzahl,
        feq: m.fett / m.eiweiss,
        kostenCt: s.kosten / m.milch * 100
      };
    }).filter(Boolean);
  }

  /* ---------- SVG-Liniendiagramm ---------- */

  function lineChart(werte, opts) {
    if (!werte.length) return `<p class="small">Noch keine Daten erfasst.</p>`;
    const o = Object.assign({ w: 320, h: 110, min: null, max: null, band: null, dez: 1 }, opts);
    const pad = { l: 34, r: 8, t: 8, b: 20 };
    const iw = o.w - pad.l - pad.r, ih = o.h - pad.t - pad.b;
    const ys = werte.map(v => v.y);
    let lo = o.min != null ? o.min : Math.min(...ys);
    let hi = o.max != null ? o.max : Math.max(...ys);
    if (o.band) { lo = Math.min(lo, o.band[0]); hi = Math.max(hi, o.band[1]); }
    const span = (hi - lo) || 1;
    lo -= span * 0.12; hi += span * 0.12;
    const X = i => pad.l + (werte.length === 1 ? iw / 2 : i * iw / (werte.length - 1));
    const Y = v => pad.t + ih - (v - lo) / (hi - lo) * ih;

    let s = `<svg class="chart-svg" viewBox="0 0 ${o.w} ${o.h}" role="img" aria-label="${esc(o.label || "")}">`;
    if (o.band) {
      s += `<rect x="${pad.l}" y="${Y(o.band[1])}" width="${iw}" height="${Y(o.band[0]) - Y(o.band[1])}" fill="var(--ok-soft)" />`;
    }
    // Gitterlinien + Y-Beschriftung
    for (let g = 0; g <= 2; g++) {
      const v = lo + (hi - lo) * g / 2;
      s += `<line x1="${pad.l}" x2="${o.w - pad.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1" />`;
      s += `<text x="${pad.l - 5}" y="${Y(v) + 3.5}" text-anchor="end" font-size="9" fill="var(--muted)">${fmt(v, o.dez)}</text>`;
    }
    const pts = werte.map((v, i) => `${X(i)},${Y(v.y)}`).join(" ");
    s += `<polyline points="${pts}" fill="none" stroke="var(--brand)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`;
    werte.forEach((v, i) => {
      const letzter = i === werte.length - 1;
      s += `<circle cx="${X(i)}" cy="${Y(v.y)}" r="${letzter ? 4 : 2.5}" fill="${letzter ? "var(--accent)" : "var(--brand)"}" />`;
      s += `<text x="${X(i)}" y="${o.h - 6}" text-anchor="middle" font-size="9" fill="var(--muted)">${esc(v.x)}</text>`;
    });
    s += "</svg>";
    return s;
  }

  /* ---------- Wiederverwendbare Blöcke ---------- */

  function chartsBlock(b) {
    const mk = b.milchkontrollen;
    if (!mk.length) return `<div class="card"><h3>Kennzahlen</h3><p class="small">Noch keine Milchkontrolle erfasst — unten nachtragen, dann erscheinen hier die Verläufe.</p></div>`;
    return `
    <div class="grid grid-2">
      <div class="card">
        <div class="chart-title"><h3>Milch kg / Kuh / Tag</h3><span class="small">Ziel ${fmt(b.zielMilch, 0)} kg</span></div>
        ${lineChart(mk.map(x => ({ x: x.monat, y: x.milch })), { label: "Milchleistung", dez: 0 })}
      </div>
      <div class="card">
        <div class="chart-title"><h3>Harnstoff mg/100 ml</h3><span class="small">Zielband 15–30</span></div>
        ${lineChart(mk.map(x => ({ x: x.monat, y: x.harnstoff })), { label: "Harnstoff", band: [15, 30], dez: 0 })}
      </div>
      <div class="card">
        <div class="chart-title"><h3>Fett-Eiweiß-Quotient</h3><span class="small">Zielband 1,1–1,5</span></div>
        ${lineChart(mk.map(x => ({ x: x.monat, y: x.fett / x.eiweiss })), { label: "Fett-Eiweiß-Quotient", band: [1.1, 1.5], dez: 2 })}
      </div>
      <div class="card">
        <div class="chart-title"><h3>Zellzahl (in 1.000)</h3><span class="small">Ziel unter 200</span></div>
        ${lineChart(mk.map(x => ({ x: x.monat, y: x.zellzahl })), { label: "Zellzahl", dez: 0 })}
      </div>
    </div>`;
  }

  function rationTabelle(b) {
    if (!b.ration.length) {
      return `<p class="small">Noch keine Ration hinterlegt.</p>
        <a class="btn btn-sm" href="#/ration?betrieb=${b.id}">Ration zusammenstellen</a>`;
    }
    const summe = rationsSumme(b.ration, b.analysen);
    const m = letzteMK(b);
    return `
    <div class="table-wrap"><table>
      <thead><tr><th>Komponente</th><th class="num">kg FM</th><th class="num">kg TM</th><th class="num">€/Tag</th></tr></thead>
      <tbody>
        ${b.ration.map(r => {
          const f = futterWerte(r.futterId, b.analysen);
          return `<tr><td>${esc(f.name)}${b.analysen[r.futterId] ? ` <span class="pill pill-brand" title="betriebseigene Analysenwerte">Analyse</span>` : ""}</td>
            <td class="num">${fmt(r.kgFM)}</td>
            <td class="num">${fmt(r.kgFM * f.tm / 100, 2)}</td>
            <td class="num">${fmt(r.kgFM * f.preis / 100, 2)}</td></tr>`;
        }).join("")}
      </tbody>
    </table></div>
    <div class="note" style="margin-top:12px">
      <strong>${fmt(summe.tm)} kg TM</strong> · ${fmt(summe.nel, 0)} MJ NEL · ${fmt(summe.nxp, 0)} g nXP ·
      RNB ${fmt(summe.rnb, 0)} g N<br>
      Futterkosten <strong>${euro(summe.kosten)}</strong>/Kuh/Tag${m ? ` = <strong>${fmt(summe.kosten / m.milch * 100, 1)} Cent</strong> je kg Milch` : ""}
    </div>`;
  }

  function massnahmenListe(b, editierbar) {
    const offen = offeneMassnahmen(b);
    const erledigt = (b.massnahmen || []).filter(m => m.erledigt).slice(-4);
    const zeile = (m) => `
      <div class="list-item" style="justify-content:flex-start">
        <input type="checkbox" data-massnahme="${m.id}" ${m.erledigt ? "checked" : ""} style="width:auto"
          aria-label="Maßnahme ${m.erledigt ? "wieder öffnen" : "erledigen"}">
        <div style="flex:1;${m.erledigt ? "text-decoration:line-through;color:var(--muted)" : ""}">
          ${esc(m.text)}<br><small>${esc(m.quelle)}${m.erledigt && m.erledigtAm ? " · erledigt " + datum(m.erledigtAm) : ""}</small>
        </div>
      </div>`;
    return `
      ${offen.length ? offen.map(zeile).join("") : `<p class="small">Keine offenen Maßnahmen — alles erledigt. 👍</p>`}
      ${erledigt.length ? `<details style="margin-top:8px"><summary class="small" style="cursor:pointer">Erledigte anzeigen (${erledigt.length})</summary>${erledigt.map(zeile).join("")}</details>` : ""}
      ${editierbar ? `
      <div class="field-row" style="margin-top:12px">
        <div class="field" style="grid-column:1/-1"><input type="text" id="neue-massnahme" placeholder="Neue Maßnahme, z. B. „Mineralfutter auf 120 g erhöhen“"></div>
      </div>
      <button class="btn-sm" type="button" id="massnahme-hinzu">Maßnahme hinzufügen</button>` : ""}`;
  }

  function bindMassnahmen(b, rerender) {
    main.querySelectorAll("input[data-massnahme]").forEach(cb => {
      cb.addEventListener("change", () => {
        const m = b.massnahmen.find(x => x.id === cb.dataset.massnahme);
        if (!m) return;
        m.erledigt = cb.checked;
        m.erledigtAm = cb.checked ? heute() : null;
        speichern();
        rerender();
      });
    });
    const knopf = $("#massnahme-hinzu");
    if (knopf) knopf.addEventListener("click", () => {
      const eingabe = $("#neue-massnahme");
      const text = eingabe.value.trim();
      if (!text) { eingabe.focus(); return; }
      b.massnahmen.unshift({ id: neueId("m"), text, quelle: "manuell erfasst", angelegt: heute(), erledigt: false });
      speichern();
      rerender();
    });
  }

  function benchmarkBlock(b, anonym) {
    const daten = benchmarkDaten();
    const eigene = daten.find(x => x.id === b.id);
    if (!eigene || daten.length < 2) return `<p class="small">Für den Benchmark braucht es Milchkontrolle und Ration — und mindestens zwei Betriebe mit Daten.</p>`;
    const andere = daten;
    const avg = (fn) => andere.reduce((s, x) => s + fn(x), 0) / andere.length;
    const kennzahlen = [
      { label: "Futterkosten ct/kg Milch", wert: eigene.kostenCt, mittel: avg(x => x.kostenCt), best: Math.min(...andere.map(x => x.kostenCt)), besserIst: "niedrig", dez: 1 },
      { label: "Milch kg/Kuh/Tag", wert: eigene.milch, mittel: avg(x => x.milch), best: Math.max(...andere.map(x => x.milch)), besserIst: "hoch", dez: 1 },
      { label: "Harnstoff mg/100 ml", wert: eigene.harnstoff, mittel: avg(x => x.harnstoff), best: null, besserIst: "band", dez: 0 },
      { label: "Zellzahl (Tsd.)", wert: eigene.zellzahl, mittel: avg(x => x.zellzahl), best: Math.min(...andere.map(x => x.zellzahl)), besserIst: "niedrig", dez: 0 }
    ];
    return `
    <div class="table-wrap"><table>
      <thead><tr><th>Kennzahl</th><th class="num">${anonym ? "Ihr Betrieb" : esc(b.name)}</th><th class="num">Ø alle Betriebe</th><th class="num">Bester Wert</th></tr></thead>
      <tbody>
        ${kennzahlen.map(k => {
          let pill = "";
          if (k.besserIst === "niedrig") pill = k.wert <= k.mittel ? "pill-ok" : "pill-warn";
          else if (k.besserIst === "hoch") pill = k.wert >= k.mittel ? "pill-ok" : "pill-warn";
          else pill = (k.wert >= 15 && k.wert <= 30) ? "pill-ok" : "pill-warn";
          return `<tr><td>${esc(k.label)}</td>
            <td class="num"><span class="pill ${pill}">${fmt(k.wert, k.dez)}</span></td>
            <td class="num">${fmt(k.mittel, k.dez)}</td>
            <td class="num">${k.best == null ? "15–30" : fmt(k.best, k.dez)}</td></tr>`;
        }).join("")}
      </tbody>
    </table></div>
    <p class="small" style="margin:8px 0 0">Vergleich über alle Isuba-Betriebe, anonymisiert — im Vollausbau rund 200 Betriebe.</p>`;
  }

  /* ---------- Ansicht: Übersicht ---------- */

  function viewDashboard() {
    const alleAlerts = BETRIEBE.flatMap(b => alerts(b).map(a => ({ betrieb: b, ...a })));
    const alleMassnahmen = BETRIEBE.flatMap(b => offeneMassnahmen(b).map(m => ({ betrieb: b, ...m })));
    const anstehend = [...BETRIEBE]
      .filter(b => b.naechsterBesuch)
      .sort((a, b) => a.naechsterBesuch.localeCompare(b.naechsterBesuch))
      .slice(0, 5);
    const kuehe = BETRIEBE.reduce((s, b) => s + (b.kuehe || 0), 0);

    return `
    <div class="page-head">
      <div>
        <h1>Guten Morgen!</h1>
        <p>Überblick über alle Beratungsbetriebe — Auffälligkeiten aus der letzten Milchkontrolle zuerst.</p>
      </div>
      <div class="tag-row">
        <a class="btn" href="#/betriebe/neu">+ Betrieb anlegen</a>
        <a class="btn btn-ghost" href="#/bericht">Bericht erfassen</a>
      </div>
    </div>

    <div class="grid grid-kpi" style="margin-bottom:16px">
      <div class="card kpi"><div class="kpi-label">Betriebe</div><div class="kpi-value">${BETRIEBE.length}</div><div class="kpi-sub">Vollausbau ca. 200</div></div>
      <div class="card kpi"><div class="kpi-label">Kühe betreut</div><div class="kpi-value">${nf(0).format(kuehe)}</div><div class="kpi-sub">über alle Betriebe</div></div>
      <div class="card kpi"><div class="kpi-label">Auffälligkeiten</div><div class="kpi-value">${alleAlerts.length}</div><div class="kpi-sub">aus aktueller Milchkontrolle</div></div>
      <div class="card kpi"><div class="kpi-label">Offene Maßnahmen</div><div class="kpi-value">${alleMassnahmen.length}</div><div class="kpi-sub">aus Besuchen &amp; Beratung</div></div>
      <div class="card kpi"><div class="kpi-label">Nächster Besuch</div><div class="kpi-value" style="font-size:1.15rem">${anstehend[0] ? esc(anstehend[0].name) : "–"}</div><div class="kpi-sub">${anstehend[0] ? datum(anstehend[0].naechsterBesuch) : ""}</div></div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h2>Auffälligkeiten</h2>
        ${alleAlerts.length ? alleAlerts.map(a => `
          <div class="alert-item alert-${a.stufe}">
            <div><strong><a href="#/betriebe/${a.betrieb.id}">${esc(a.betrieb.name)}</a></strong> — ${esc(a.text)}</div>
          </div>`).join("") : `<p class="small">Aktuell keine Auffälligkeiten. Gute Arbeit!</p>`}
      </div>
      <div class="card">
        <h2>Anstehende Besuche</h2>
        ${anstehend.map(b => `
          <div class="list-item">
            <div>
              <strong><a href="#/betriebe/${b.id}">${esc(b.name)}</a></strong><br>
              <small>${esc(b.ort)} · ${b.kuehe} Kühe · ${esc(b.system)}</small>
            </div>
            <span class="pill ${b.naechsterBesuch < heute() ? "pill-crit" : "pill-brand"}">${datum(b.naechsterBesuch)}</span>
          </div>`).join("") || `<p class="small">Keine Termine geplant.</p>`}
      </div>
      <div class="card" style="grid-column:1/-1">
        <h2>Offene Maßnahmen</h2>
        ${alleMassnahmen.length ? alleMassnahmen.slice(0, 8).map(m => `
          <div class="list-item">
            <div><strong><a href="#/betriebe/${m.betrieb.id}">${esc(m.betrieb.name)}</a></strong> — ${esc(m.text)}<br>
            <small>${esc(m.quelle)}</small></div>
          </div>`).join("") : `<p class="small">Keine offenen Maßnahmen.</p>`}
      </div>
    </div>`;
  }

  /* ---------- Ansicht: Betriebe (Liste) ---------- */

  function viewBetriebe() {
    return `
    <div class="page-head">
      <div>
        <h1>Betriebe</h1>
        <p>Alle Beratungsbetriebe mit Kennzahlen der letzten Milchkontrolle.</p>
      </div>
      <div class="tag-row">
        <input class="search-input" type="search" id="suche" placeholder="Betrieb oder Ort suchen …" aria-label="Betrieb suchen">
        <a class="btn" href="#/betriebe/neu">+ Betrieb anlegen</a>
      </div>
    </div>
    <div class="card table-wrap">
      <table id="betriebe-tabelle">
        <thead><tr>
          <th>Betrieb</th><th>Ort</th><th class="num">Kühe</th><th>System</th>
          <th class="num">Milch kg</th><th class="num">Fett %</th><th class="num">Eiweiß %</th>
          <th class="num">Harnstoff</th><th>Status</th>
        </tr></thead>
        <tbody>
          ${BETRIEBE.map(b => {
            const m = letzteMK(b);
            const a = alerts(b);
            const status = a.some(x => x.stufe === "crit") ? `<span class="pill pill-crit">kritisch</span>`
              : a.length ? `<span class="pill pill-warn">${a.length} Hinweis${a.length > 1 ? "e" : ""}</span>`
              : m ? `<span class="pill pill-ok">unauffällig</span>` : `<span class="pill pill-neutral">neu</span>`;
            return `<tr class="row-click" data-such="${esc((b.name + " " + b.ort + " " + b.leiter).toLowerCase())}" data-href="#/betriebe/${b.id}">
              <td><strong>${esc(b.name)}</strong><br><small>${esc(b.leiter)}</small></td>
              <td>${esc(b.ort)}</td><td class="num">${b.kuehe}</td><td>${esc(b.system)}</td>
              <td class="num">${m ? fmt(m.milch) : "–"}</td><td class="num">${m ? fmt(m.fett, 2) : "–"}</td>
              <td class="num">${m ? fmt(m.eiweiss, 2) : "–"}</td><td class="num">${m ? fmt(m.harnstoff, 0) : "–"}</td>
              <td>${status}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
  }

  function initBetriebe() {
    const eingabe = $("#suche");
    const zeilen = Array.from(main.querySelectorAll("tr[data-such]"));
    zeilen.forEach(tr => tr.addEventListener("click", () => { location.hash = tr.dataset.href; }));
    if (eingabe) eingabe.addEventListener("input", () => {
      const q = eingabe.value.trim().toLowerCase();
      zeilen.forEach(tr => { tr.style.display = tr.dataset.such.includes(q) ? "" : "none"; });
    });
  }

  /* ---------- Ansicht: Betrieb anlegen / bearbeiten ---------- */

  const RASSEN = ["Fleckvieh", "Holstein", "Braunvieh", "Pinzgauer", "Jersey", "Grauvieh", "gemischt"];
  const SYSTEME = ["TMR", "AGR", "AGR + Transponder", "Heumilch, AGR", "Vollweide", "Mutterkuh", "sonstiges"];

  function viewBetriebForm(id) {
    const b = id ? BETRIEBE.find(x => x.id === id) : null;
    if (id && !b) return `<p>Betrieb nicht gefunden. <a href="#/betriebe">Zur Übersicht</a></p>`;
    const wert = (feld, sonst) => b ? (b[feld] != null ? b[feld] : "") : (sonst != null ? sonst : "");
    const auswahl = (liste, aktiv) => liste.map(x =>
      `<option value="${esc(x)}" ${x === aktiv ? "selected" : ""}>${esc(x)}</option>`).join("");
    return `
    <div class="breadcrumb"><a href="${b ? "#/betriebe/" + b.id : "#/betriebe"}">← Zurück</a></div>
    <div class="page-head">
      <div>
        <h1>${b ? "Betrieb bearbeiten" : "Neuen Betrieb anlegen"}</h1>
        <p>${b ? "Stammdaten von " + esc(b.name) + " ändern." : "Ein neuer Kunde ist in einer Minute angelegt — Milchkontrolle, Ration und Berichte kommen danach in der Betriebsakte dazu."}</p>
      </div>
    </div>
    <form class="card" id="betrieb-form" style="max-width:720px">
      <div class="field-row">
        <div class="field"><label for="b-name">Hofname *</label>
          <input id="b-name" required value="${esc(wert("name"))}" placeholder="z. B. Bergerhof"></div>
        <div class="field"><label for="b-leiter">Betriebsführer:in</label>
          <input id="b-leiter" value="${esc(wert("leiter"))}" placeholder="z. B. Familie Berger"></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="b-ort">Ort</label>
          <input id="b-ort" value="${esc(wert("ort"))}" placeholder="z. B. Freistadt, OÖ"></div>
        <div class="field"><label for="b-telefon">Telefon</label>
          <input id="b-telefon" type="tel" value="${esc(wert("telefon"))}" placeholder="+43 …"></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="b-kuehe">Kühe *</label>
          <input id="b-kuehe" type="number" min="1" required value="${esc(wert("kuehe"))}"></div>
        <div class="field"><label for="b-rasse">Rasse</label>
          <select id="b-rasse">${auswahl(RASSEN, wert("rasse", "Fleckvieh") || "Fleckvieh")}</select></div>
        <div class="field"><label for="b-system">Fütterungssystem</label>
          <select id="b-system">${auswahl(SYSTEME, wert("system", "AGR") || "AGR")}</select></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="b-ziel">Ziel Milch kg/Kuh/Tag</label>
          <input id="b-ziel" type="number" min="5" max="60" value="${esc(wert("zielMilch", 28))}"></div>
        <div class="field"><label for="b-besuch">Nächster Besuch</label>
          <input id="b-besuch" type="date" value="${esc(wert("naechsterBesuch"))}"></div>
      </div>
      <div class="tag-row">
        <button type="submit">${b ? "Änderungen speichern" : "Betrieb anlegen"}</button>
        ${b ? `<button type="button" class="btn-ghost" id="betrieb-loeschen" style="border-color:var(--crit);color:var(--crit)">Betrieb löschen</button>` : ""}
      </div>
    </form>`;
  }

  function initBetriebForm(id) {
    const form = $("#betrieb-form");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const daten = {
        name: $("#b-name").value.trim(),
        leiter: $("#b-leiter").value.trim() || $("#b-name").value.trim(),
        ort: $("#b-ort").value.trim() || "–",
        telefon: $("#b-telefon").value.trim(),
        kuehe: parseInt($("#b-kuehe").value, 10) || 0,
        rasse: $("#b-rasse").value,
        system: $("#b-system").value,
        zielMilch: parseFloat($("#b-ziel").value) || 28,
        naechsterBesuch: $("#b-besuch").value || null
      };
      let b = id ? BETRIEBE.find(x => x.id === id) : null;
      if (b) {
        Object.assign(b, daten);
      } else {
        b = Object.assign({ id: neueId("k"), letzterBesuch: null,
          milchkontrollen: [], ration: [], besuche: [], massnahmen: [], analysen: {} }, daten);
        BETRIEBE.push(b);
      }
      speichern();
      location.hash = "#/betriebe/" + b.id;
    });
    const loeschen = $("#betrieb-loeschen");
    if (loeschen) loeschen.addEventListener("click", () => {
      const b = BETRIEBE.find(x => x.id === id);
      if (b && confirm(`Betrieb „${b.name}“ mit allen Berichten wirklich löschen?`)) {
        BETRIEBE.splice(BETRIEBE.indexOf(b), 1);
        speichern();
        location.hash = "#/betriebe";
      }
    });
  }

  /* ---------- Ansicht: Betriebsakte ---------- */

  function viewBetrieb(id) {
    const b = BETRIEBE.find(x => x.id === id);
    if (!b) return `<p>Betrieb nicht gefunden. <a href="#/betriebe">Zur Übersicht</a></p>`;
    const bAlerts = alerts(b);
    const grundfutterIds = [...new Set(b.ration.map(r => r.futterId))]
      .filter(fid => { const f = futter(fid); return f && (f.gruppe === "Grundfutter" || f.gruppe === "Nebenprodukte"); });

    return `
    <div class="breadcrumb"><a href="#/betriebe">← Alle Betriebe</a></div>
    <div class="page-head">
      <div>
        <h1>${esc(b.name)}</h1>
        <p>${esc(b.leiter)} · ${esc(b.ort)} · ${b.kuehe} ${esc(b.rasse)}-Kühe · ${esc(b.system)}
        ${b.telefon ? ` · <a href="tel:${esc(b.telefon.replace(/\s/g, ""))}">${esc(b.telefon)}</a>` : ""}</p>
      </div>
      <div class="tag-row">
        <span class="pill pill-neutral">letzter Besuch ${datum(b.letzterBesuch)}</span>
        <span class="pill pill-brand">nächster Besuch ${datum(b.naechsterBesuch)}</span>
      </div>
    </div>
    <div class="tag-row" style="margin-bottom:18px">
      <a class="btn btn-sm" href="#/bericht?betrieb=${b.id}">Bericht erfassen</a>
      <a class="btn btn-ghost btn-sm" href="#/ration?betrieb=${b.id}">Rationscheck</a>
      <a class="btn btn-ghost btn-sm" href="#/betriebe/${b.id}/bearbeiten">Bearbeiten</a>
      <a class="btn btn-ghost btn-sm" href="#/portal/${b.id}" title="So sieht dieser Betrieb die App">👁 Kundenansicht</a>
    </div>

    ${bAlerts.length ? `<div style="margin-bottom:16px">${bAlerts.map(a =>
      `<div class="alert-item alert-${a.stufe}"><div>${esc(a.text)}</div></div>`).join("")}</div>` : ""}

    <div class="grid grid-2" style="margin-bottom:16px">
      <div class="card">
        <h2>Offene Maßnahmen</h2>
        ${massnahmenListe(b, true)}
      </div>
      <div class="card">
        <h2>Benchmark <small>vs. alle Isuba-Betriebe</small></h2>
        ${benchmarkBlock(b, false)}
      </div>
    </div>

    <div style="margin-bottom:16px">${chartsBlock(b)}</div>

    <div class="card" style="margin-bottom:16px">
      <h3>Milchkontrolle nachtragen <small>Herdenschnitt aus dem LKV-Bericht</small></h3>
      <form id="mk-form">
        <div class="field-row">
          <div class="field"><label for="mk-monat">Monat</label><input id="mk-monat" value="${esc(aktMonat())}" required></div>
          <div class="field"><label for="mk-milch">Milch kg</label><input id="mk-milch" type="number" step="0.1" min="1" required></div>
          <div class="field"><label for="mk-fett">Fett %</label><input id="mk-fett" type="number" step="0.01" min="1" required></div>
          <div class="field"><label for="mk-eiweiss">Eiweiß %</label><input id="mk-eiweiss" type="number" step="0.01" min="1" required></div>
          <div class="field"><label for="mk-harnstoff">Harnstoff</label><input id="mk-harnstoff" type="number" step="1" min="1" required></div>
          <div class="field"><label for="mk-zellzahl">Zellzahl Tsd.</label><input id="mk-zellzahl" type="number" step="1" min="1" required></div>
        </div>
        <button type="submit" class="btn-sm">Milchkontrolle speichern</button>
      </form>
    </div>

    <div class="grid grid-2" style="margin-bottom:16px">
      <div class="card">
        <h2>Aktuelle Ration <small>je Kuh und Tag</small></h2>
        ${rationTabelle(b)}
        ${b.ration.length ? `<p style="margin:12px 0 0"><a class="btn btn-ghost btn-sm" href="#/ration?betrieb=${b.id}">Ration im Rationscheck bearbeiten</a></p>` : ""}
      </div>
      <div class="card">
        <h2>Besuchsberichte</h2>
        ${b.besuche.length ? b.besuche.map(v => `
          <div class="visit-report">
            <div class="tag-row" style="margin-bottom:6px">
              <span class="pill pill-brand">${datum(v.datum)}</span>
              ${v.bcs != null ? `<span class="pill pill-neutral">BCS ${fmt(v.bcs)}</span>` : ""}
              ${v.kotscore != null ? `<span class="pill pill-neutral">Kot ${fmt(v.kotscore)}</span>` : ""}
              ${v.schuettelbox ? `<span class="pill pill-neutral">Siebe ${fmt(v.schuettelbox.ober, 0)}/${fmt(v.schuettelbox.mittel, 0)}/${fmt(v.schuettelbox.unten, 0)} %</span>` : ""}
              ${v.tsSilage != null ? `<span class="pill pill-neutral">TS Silage ${fmt(v.tsSilage, 0)} %</span>` : ""}
            </div>
            <p style="margin:0 0 6px">${esc(v.notizen)}</p>
            <p style="margin:0"><strong>Empfehlung:</strong> ${esc(v.empfehlungen)}</p>
          </div>`).join("") : `<p class="small">Noch kein Besuch dokumentiert.</p>`}
        <a class="btn btn-sm" href="#/bericht?betrieb=${b.id}">Neuen Bericht erfassen</a>
      </div>
    </div>

    ${grundfutterIds.length ? `
    <div class="card">
      <h2>Betriebseigene Futteranalysen <small>Laborwerte statt Tabellenwerten</small></h2>
      <p class="small">Werte aus der Silage-/Futteranalyse eintragen — Rationsbewertung und Futterkosten rechnen dann mit den echten Werten dieses Betriebs.</p>
      <div class="table-wrap"><table>
        <thead><tr><th>Komponente</th><th class="num">TS %</th><th class="num">NEL MJ/kg TM</th><th class="num">nXP g/kg TM</th><th class="num">XP g/kg TM</th><th></th></tr></thead>
        <tbody>
          ${grundfutterIds.map(fid => {
            const f = futter(fid);
            const a = b.analysen[fid] || {};
            const zelle = (feld, schritt) => `<td class="num"><input type="number" step="${schritt}" min="0" style="width:80px"
              data-analyse="${fid}" data-feld="${feld}" value="${a[feld] != null ? a[feld] : f[feld]}"></td>`;
            return `<tr>
              <td>${esc(f.name)} ${b.analysen[fid] ? `<span class="pill pill-brand">Analyse aktiv</span>` : `<span class="pill pill-neutral">Tabellenwert</span>`}</td>
              ${zelle("tm", "1")}${zelle("nel", "0.1")}${zelle("nxp", "1")}${zelle("rp", "1")}
              <td>${b.analysen[fid] ? `<button type="button" class="btn-ghost btn-sm" data-analyse-reset="${fid}">Zurücksetzen</button>` : ""}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table></div>
    </div>` : ""}`;
  }

  function initBetrieb(id) {
    const b = BETRIEBE.find(x => x.id === id);
    if (!b) return;
    const neuLaden = () => navigiere();

    bindMassnahmen(b, neuLaden);

    const mkForm = $("#mk-form");
    if (mkForm) mkForm.addEventListener("submit", (e) => {
      e.preventDefault();
      b.milchkontrollen.push({
        monat: $("#mk-monat").value.trim() || aktMonat(),
        milch: parseFloat($("#mk-milch").value),
        fett: parseFloat($("#mk-fett").value),
        eiweiss: parseFloat($("#mk-eiweiss").value),
        harnstoff: parseFloat($("#mk-harnstoff").value),
        zellzahl: parseFloat($("#mk-zellzahl").value)
      });
      if (b.milchkontrollen.length > 13) b.milchkontrollen = b.milchkontrollen.slice(-13);
      speichern();
      neuLaden();
    });

    main.querySelectorAll("input[data-analyse]").forEach(inp => {
      inp.addEventListener("change", () => {
        const fid = inp.dataset.analyse, feld = inp.dataset.feld;
        const wert = parseFloat(inp.value);
        if (isNaN(wert) || wert <= 0) return;
        const f = futter(fid);
        if (!b.analysen[fid]) b.analysen[fid] = { tm: f.tm, nel: f.nel, nxp: f.nxp, rp: f.rp };
        b.analysen[fid][feld] = wert;
        speichern();
        neuLaden();
      });
    });
    main.querySelectorAll("button[data-analyse-reset]").forEach(btn => {
      btn.addEventListener("click", () => {
        delete b.analysen[btn.dataset.analyseReset];
        speichern();
        neuLaden();
      });
    });
  }

  /* ---------- Ansicht: Kundenportal ---------- */

  function viewPortal(id) {
    const b = BETRIEBE.find(x => x.id === id);
    if (!b) return `<p>Betrieb nicht gefunden. <a href="#/betriebe">Zur Übersicht</a></p>`;
    const letzter = b.besuche[0];
    return `
    <div class="breadcrumb"><a href="#/betriebe/${b.id}">← Zurück zur Beraterakte</a>
      <span class="pill pill-warn" style="margin-left:8px">Kundenansicht — so sieht es ${esc(b.leiter)}</span></div>
    <div class="page-head">
      <div>
        <h1>Grüß Gott, ${esc(b.leiter)}!</h1>
        <p>Ihr Betrieb ${esc(b.name)} bei ISUBA — alle Kennzahlen, Empfehlungen und Unterlagen an einem Ort.</p>
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:16px">
      <div class="card">
        <h2>Nächster Beratungsbesuch</h2>
        <p style="font-family:var(--font-display);font-size:1.4rem;font-weight:700;margin:0 0 6px">${datum(b.naechsterBesuch)}</p>
        <p class="small" style="margin:0 0 12px">Fragen vorab? Einfach melden — unabhängige Auskunft ohne Produktbindung.</p>
        <div class="tag-row">
          <a class="btn btn-sm" href="mailto:schiffer@isuba.at">E-Mail an Isuba</a>
          <span class="pill pill-neutral">Anruf &amp; WhatsApp: im Echtbetrieb hinterlegt</span>
        </div>
      </div>
      <div class="card">
        <h2>Ihre offenen Maßnahmen</h2>
        ${massnahmenListe(b, false)}
      </div>
    </div>

    <div style="margin-bottom:16px">${chartsBlock(b)}</div>

    <div class="grid grid-2" style="margin-bottom:16px">
      <div class="card">
        <h2>Ihre aktuelle Ration <small>je Kuh und Tag</small></h2>
        ${rationTabelle(b)}
      </div>
      <div class="card">
        <h2>Ihr Betrieb im Vergleich</h2>
        ${benchmarkBlock(b, true)}
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h2>Letzter Besuchsbericht</h2>
        ${letzter ? `
        <div class="visit-report">
          <div class="tag-row" style="margin-bottom:6px">
            <span class="pill pill-brand">${datum(letzter.datum)}</span>
            ${letzter.bcs != null ? `<span class="pill pill-neutral">BCS ${fmt(letzter.bcs)}</span>` : ""}
            ${letzter.tsSilage != null ? `<span class="pill pill-neutral">TS Silage ${fmt(letzter.tsSilage, 0)} %</span>` : ""}
          </div>
          <p style="margin:0 0 6px">${esc(letzter.notizen)}</p>
          <p style="margin:0"><strong>Empfehlung:</strong> ${esc(letzter.empfehlungen)}</p>
        </div>` : `<p class="small">Noch kein Besuch dokumentiert.</p>`}
      </div>
      <div class="card">
        <h2>Fütterungswissen</h2>
        ${WISSEN.slice(0, 4).map(a => `
          <div class="list-item">
            <div><a href="#/wissen?artikel=${a.id}"><strong>${esc(a.titel)}</strong></a><br>
            <small>${esc(a.teaser)}</small></div>
          </div>`).join("")}
      </div>
    </div>`;
  }

  function initPortal(id) {
    const b = BETRIEBE.find(x => x.id === id);
    if (b) bindMassnahmen(b, () => navigiere());
  }

  /* ---------- Ansicht: Futtermittelvergleich ---------- */

  function viewVergleich() {
    return `
    <div class="page-head">
      <div>
        <h1>Futtermittelvergleich</h1>
        <p>Preiswürdigkeit nach dem Austauschverfahren: Aus den Preisen von Gerste (Energie) und Sojaschrot (Protein)
        wird der innere Wert jedes Futtermittels errechnet. Grün = günstiger als die Referenz, der Zukauf lohnt sich.</p>
      </div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="field-row">
        <div class="field"><label for="ref-energie">Energie-Referenz</label>
          <select id="ref-energie">${FUTTERMITTEL.filter(f => f.gruppe === "Kraftfutter").map(f =>
            `<option value="${f.id}" ${f.id === "gerste" ? "selected" : ""}>${esc(f.name)}</option>`).join("")}</select></div>
        <div class="field"><label for="ref-protein">Protein-Referenz</label>
          <select id="ref-protein">${FUTTERMITTEL.filter(f => f.gruppe === "Eiweißfutter").map(f =>
            `<option value="${f.id}" ${f.id === "soja44" ? "selected" : ""}>${esc(f.name)}</option>`).join("")}</select></div>
        <div class="field" style="align-self:end"><div class="note" id="ref-info"></div></div>
      </div>
    </div>
    <div class="card table-wrap">
      <table>
        <thead><tr>
          <th>Futtermittel</th><th class="num">TM %</th><th class="num">NEL<br>MJ/kg TM</th>
          <th class="num">XP<br>g/kg TM</th><th class="num">Preis €/dt<br><small>editierbar</small></th>
          <th class="num">€ je 10 MJ NEL</th><th class="num">€ je kg XP</th>
          <th class="num">Innerer Wert €/dt</th><th>Preiswürdigkeit</th>
        </tr></thead>
        <tbody id="vergleich-body"></tbody>
      </table>
    </div>
    <p class="small" style="margin-top:10px">Nährwerte je kg Trockenmasse laut Tabellenwerten — bei eigener Futteranalyse durch Laborwerte ersetzen.
    Preise als Beispielwerte hinterlegt; Änderungen werden lokal gespeichert.</p>`;
  }

  function renderVergleichBody() {
    const refE = $("#ref-energie").value, refP = $("#ref-protein").value;
    const ref = referenzPreise(refE, refP);
    $("#ref-info").innerHTML = ref
      ? `Energiepreis <strong>${fmt(ref.a * 10 * 100, 1)} Cent je 10 MJ NEL</strong> · Proteinpreis <strong>${fmt(ref.b * 1000 * 100, 1)} Cent je kg Rohprotein</strong>`
      : "Referenzkombination ergibt keine plausiblen Nährstoffpreise — bitte andere Kombination wählen.";
    const body = $("#vergleich-body");
    body.innerHTML = FUTTERMITTEL.map(f => {
      const preisJeKgTM = f.preis / 100 / (f.tm / 100);
      const je10MJ = preisJeKgTM / f.nel * 10;
      const jeKgXp = preisJeKgTM / f.rp * 1000;
      let wertZelle = "–", pwZelle = "";
      if (ref) {
        const wert = innererWert(f, ref);
        const pw = wert / f.preis * 100;
        const klasse = pw >= 105 ? "pill-ok" : pw >= 95 ? "pill-warn" : "pill-crit";
        const wort = pw >= 105 ? "preiswürdig" : pw >= 95 ? "neutral" : "zu teuer";
        wertZelle = fmt(wert, 1);
        pwZelle = `<span class="pill ${klasse}">${fmt(pw, 0)} % · ${wort}</span>`;
      }
      const istRef = f.id === refE || f.id === refP;
      return `<tr>
        <td>${esc(f.name)} ${istRef ? `<span class="pill pill-brand">Referenz</span>` : ""}<br><small>${esc(f.gruppe)}</small></td>
        <td class="num">${fmt(f.tm, 0)}</td><td class="num">${fmt(f.nel)}</td><td class="num">${fmt(f.rp, 0)}</td>
        <td class="num"><input type="number" step="0.5" min="0" value="${f.preis}" data-preis="${f.id}" style="width:80px"></td>
        <td class="num">${fmt(je10MJ * 100, 1)} ct</td><td class="num">${fmt(jeKgXp * 100, 0)} ct</td>
        <td class="num">${wertZelle}</td><td>${pwZelle}</td>
      </tr>`;
    }).join("");
    body.querySelectorAll("input[data-preis]").forEach(inp => {
      inp.addEventListener("change", () => {
        const f = futter(inp.dataset.preis);
        const v = parseFloat(inp.value);
        if (f && v > 0) {
          f.preis = v;
          preise[f.id] = v;
          store.set("preise", preise);
          renderVergleichBody();
        }
      });
    });
  }

  function initVergleich() {
    $("#ref-energie").addEventListener("change", renderVergleichBody);
    $("#ref-protein").addEventListener("change", renderVergleichBody);
    renderVergleichBody();
  }

  /* ---------- Ansicht: Rationscheck ---------- */

  let rationEntwurf = [{ futterId: "grassilage1", kgFM: 25 }, { futterId: "maissilage", kgFM: 12 },
                       { futterId: "gerste", kgFM: 2.5 }, { futterId: "raps", kgFM: 1.5 }];
  let rationBetriebId = null;

  function viewRation(query) {
    const betriebId = query.get("betrieb");
    rationBetriebId = null;
    let vorgabeMilch = 28;
    if (betriebId) {
      const b = BETRIEBE.find(x => x.id === betriebId);
      if (b) {
        rationBetriebId = b.id;
        if (b.ration.length) rationEntwurf = b.ration.map(r => ({ ...r }));
        const m = letzteMK(b);
        vorgabeMilch = m ? Math.round(m.milch) : (b.zielMilch || 28);
      }
    }
    const b = rationBetriebId ? BETRIEBE.find(x => x.id === rationBetriebId) : null;
    return `
    <div class="page-head">
      <div>
        <h1>Rationscheck</h1>
        <p>Schnellkontrolle je Kuh und Tag: Deckt die Ration Energie- und Eiweißbedarf, und was bleibt von der Milch übrig?
        Bedarf nach Faustzahlen für eine 650-kg-Kuh.</p>
      </div>
      ${b ? `<span class="pill pill-brand">Ration von ${esc(b.name)}${Object.keys(b.analysen).length ? " · mit Analysenwerten" : ""}</span>` : ""}
    </div>
    <div class="grid grid-2">
      <div class="card">
        <h2>Ration</h2>
        <div id="rations-zeilen"></div>
        <div class="field-row" style="margin-top:10px">
          <div class="field"><label for="neu-futter">Komponente hinzufügen</label>
            <select id="neu-futter">${FUTTERMITTEL.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join("")}</select></div>
          <div class="field" style="align-self:end"><button id="neu-hinzu" class="btn-sm" type="button">Hinzufügen</button></div>
        </div>
        ${b ? `<div style="margin-top:14px;border-top:1px solid var(--line);padding-top:12px">
          <button type="button" id="ration-speichern">Als Ration von ${esc(b.name)} speichern</button>
          <span id="ration-ok" class="pill pill-ok" style="display:none;margin-left:8px">Gespeichert ✓</span>
        </div>` : ""}
      </div>
      <div class="stack">
        <div class="card">
          <h2>Tier &amp; Milchpreis</h2>
          <div class="field-row">
            <div class="field"><label for="milch-kg">Milch kg/Tag</label>
              <input id="milch-kg" type="number" value="${vorgabeMilch}" min="0" step="1"></div>
            <div class="field"><label for="milch-preis">Milchpreis ct/kg</label>
              <input id="milch-preis" type="number" value="${store.get("milchpreis", 52)}" min="0" step="0.5"></div>
          </div>
        </div>
        <div class="card" id="rations-ergebnis"></div>
      </div>
    </div>`;
  }

  function renderRation() {
    const b = rationBetriebId ? BETRIEBE.find(x => x.id === rationBetriebId) : null;
    const analysen = b ? b.analysen : null;
    const zeilen = $("#rations-zeilen");
    zeilen.innerHTML = rationEntwurf.length ? rationEntwurf.map((r, i) => {
      const f = futterWerte(r.futterId, analysen);
      return `<div class="list-item">
        <div style="flex:1"><strong>${esc(f.name)}</strong><br>
          <small>${fmt(f.nel)} MJ NEL · ${fmt(f.nxp, 0)} g nXP je kg TM · ${euro(f.preis)}/dt</small></div>
        <input type="number" value="${r.kgFM}" min="0" step="0.1" style="width:90px" data-kg="${i}" aria-label="kg Frischmasse ${esc(f.name)}">
        <span class="small">kg FM</span>
        <button class="btn-ghost btn-sm" type="button" data-weg="${i}" aria-label="${esc(f.name)} entfernen">✕</button>
      </div>`;
    }).join("") : `<p class="small">Noch keine Komponenten — unten hinzufügen.</p>`;
    zeilen.querySelectorAll("input[data-kg]").forEach(inp => inp.addEventListener("change", () => {
      rationEntwurf[+inp.dataset.kg].kgFM = parseFloat(inp.value) || 0;
      renderErgebnis();
    }));
    zeilen.querySelectorAll("button[data-weg]").forEach(btn => btn.addEventListener("click", () => {
      rationEntwurf.splice(+btn.dataset.weg, 1);
      renderRation();
    }));
    renderErgebnis();
  }

  function renderErgebnis() {
    const b = rationBetriebId ? BETRIEBE.find(x => x.id === rationBetriebId) : null;
    const milch = parseFloat($("#milch-kg").value) || 0;
    const milchpreis = parseFloat($("#milch-preis").value) || 0;
    store.set("milchpreis", milchpreis);
    const s = rationsSumme(rationEntwurf, b ? b.analysen : null);
    const bedarfNel = BEDARF.nelErhalt + BEDARF.nelJeKg * milch;
    const bedarfNxp = BEDARF.nxpErhalt + BEDARF.nxpJeKg * milch;
    const tmRichtwert = 16.25 + 0.1 * milch; // 0,025 × 650 kg + 0,1 × Milch
    const erloes = milch * milchpreis / 100;
    const iofc = erloes - s.kosten;
    const balken = (label, ist, soll, einheit, dez) => {
      const pct = soll ? ist / soll * 100 : 0;
      const klasse = pct < 92 ? "crit" : pct < 98 ? "warn" : pct <= 112 ? "" : "warn";
      return `<div class="bar-row">
        <div>${label}</div>
        <div class="bar-track"><div class="bar-fill ${klasse}" style="width:${Math.min(pct, 100)}%"></div></div>
        <div class="num">${fmt(pct, 0)} %</div>
      </div>
      <div class="small" style="margin:-4px 0 10px">${fmt(ist, dez)} von ${fmt(soll, dez)} ${einheit}</div>`;
    };
    $("#rations-ergebnis").innerHTML = `
      <h2>Bewertung</h2>
      ${balken("Energie (NEL)", s.nel, bedarfNel, "MJ", 0)}
      ${balken("Eiweiß (nXP)", s.nxp, bedarfNxp, "g", 0)}
      ${balken("TM-Aufnahme", s.tm, tmRichtwert, "kg", 1)}
      <div class="note">
        RNB: <strong>${fmt(s.rnb, 0)} g N</strong> ${s.rnb < -10 ? "— deutlich negativ, Pansen-N knapp" : s.rnb > 50 ? "— stark positiv, Eiweißüberhang" : "— im Rahmen"}<br>
        Futterkosten: <strong>${euro(s.kosten)}</strong>/Kuh/Tag
        ${milch ? `= <strong>${fmt(s.kosten / milch * 100, 1)} Cent</strong> je kg Milch` : ""}
      </div>
      ${milch && milchpreis ? `
      <div class="note" style="margin-top:8px;background:var(--brand-soft)">
        Milcherlös ${euro(erloes)} − Futter ${euro(s.kosten)} =
        <strong>IOFC ${euro(iofc)}</strong> je Kuh und Tag<br>
        <small>Income over feed cost — die wichtigste Steuergröße im Fütterungscontrolling.</small>
      </div>` : ""}
      <p class="small" style="margin-bottom:0">Faustzahlen: Erhaltung ${fmt(BEDARF.nelErhalt)} MJ NEL + ${fmt(BEDARF.nelJeKg)} MJ je kg Milch;
      ${fmt(BEDARF.nxpErhalt, 0)} g nXP + ${fmt(BEDARF.nxpJeKg, 0)} g je kg Milch. Ersetzt keine vollständige Rationsberechnung.</p>`;
  }

  function initRation() {
    renderRation();
    $("#milch-kg").addEventListener("input", renderErgebnis);
    $("#milch-preis").addEventListener("input", renderErgebnis);
    $("#neu-hinzu").addEventListener("click", () => {
      rationEntwurf.push({ futterId: $("#neu-futter").value, kgFM: 1 });
      renderRation();
    });
    const speichernKnopf = $("#ration-speichern");
    if (speichernKnopf) speichernKnopf.addEventListener("click", () => {
      const b = BETRIEBE.find(x => x.id === rationBetriebId);
      if (!b) return;
      b.ration = rationEntwurf.filter(r => r.kgFM > 0).map(r => ({ ...r }));
      speichern();
      $("#ration-ok").style.display = "inline-block";
      setTimeout(() => { $("#ration-ok") && ($("#ration-ok").style.display = "none"); }, 2000);
    });
  }

  /* ---------- Ansicht: Besuchsbericht ---------- */

  function viewBericht(query) {
    const vorId = query.get("betrieb") || "";
    return `
    <div class="page-head">
      <div>
        <h1>Besuchsbericht erfassen</h1>
        <p>Direkt im Stall ausfüllen — der Bericht erscheint sofort in der Betriebsakte und beim Kunden in der App.
        Die Empfehlung wird automatisch als offene Maßnahme angelegt.</p>
      </div>
    </div>
    <form class="card" id="bericht-form" style="max-width:720px">
      <div class="field-row">
        <div class="field"><label for="f-betrieb">Betrieb</label>
          <select id="f-betrieb" required>${BETRIEBE.map(b =>
            `<option value="${b.id}" ${b.id === vorId ? "selected" : ""}>${esc(b.name)} — ${esc(b.ort)}</option>`).join("")}</select></div>
        <div class="field"><label for="f-datum">Datum</label>
          <input id="f-datum" type="date" value="${heute()}" required></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="f-bcs">BCS Herdenschnitt (1–5)</label>
          <input id="f-bcs" type="number" min="1" max="5" step="0.1" placeholder="3,3"></div>
        <div class="field"><label for="f-kot">Kotscore (1–5)</label>
          <input id="f-kot" type="number" min="1" max="5" step="0.1" placeholder="3,0"></div>
        <div class="field"><label for="f-ts">TS Silage %</label>
          <input id="f-ts" type="number" min="10" max="90" step="1" placeholder="34"></div>
      </div>
      <label>Schüttelbox (% Ober- / Mittel- / Untersieb)</label>
      <div class="field-row">
        <div class="field"><input id="f-ober" type="number" min="0" max="100" placeholder="Obersieb" aria-label="Obersieb %"></div>
        <div class="field"><input id="f-mittel" type="number" min="0" max="100" placeholder="Mittelsieb" aria-label="Mittelsieb %"></div>
        <div class="field"><input id="f-unten" type="number" min="0" max="100" placeholder="Untersieb" aria-label="Untersieb %"></div>
      </div>
      <div class="field"><label for="f-notizen">Beobachtungen</label>
        <textarea id="f-notizen" rows="3" required placeholder="Was ist am Betrieb aufgefallen?"></textarea></div>
      <div class="field"><label for="f-empfehlung">Empfehlungen</label>
        <textarea id="f-empfehlung" rows="3" required placeholder="Konkrete nächste Schritte für den Betrieb"></textarea></div>
      <div class="field"><label for="f-naechster">Nächster Besuch</label>
        <input id="f-naechster" type="date"></div>
      <button type="submit">Bericht speichern</button>
      <span id="f-ok" class="pill pill-ok" style="display:none;margin-left:10px">Gespeichert ✓</span>
    </form>`;
  }

  function initBericht() {
    $("#bericht-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const num = (id) => { const v = parseFloat($(id).value); return isNaN(v) ? null : v; };
      const ober = num("#f-ober"), mittel = num("#f-mittel"), unten = num("#f-unten");
      const bericht = {
        datum: $("#f-datum").value,
        bcs: num("#f-bcs"),
        kotscore: num("#f-kot"),
        tsSilage: num("#f-ts"),
        schuettelbox: (ober != null && mittel != null && unten != null) ? { ober, mittel, unten } : null,
        notizen: $("#f-notizen").value.trim(),
        empfehlungen: $("#f-empfehlung").value.trim()
      };
      const betrieb = BETRIEBE.find(x => x.id === $("#f-betrieb").value);
      betrieb.besuche.unshift(bericht);
      betrieb.letzterBesuch = bericht.datum;
      const naechster = $("#f-naechster").value;
      if (naechster) betrieb.naechsterBesuch = naechster;
      betrieb.massnahmen.unshift({
        id: neueId("m"), text: bericht.empfehlungen,
        quelle: "Besuch " + datum(bericht.datum), angelegt: bericht.datum, erledigt: false
      });
      speichern();
      $("#f-ok").style.display = "inline-block";
      setTimeout(() => { location.hash = "#/betriebe/" + betrieb.id; }, 700);
    });
  }

  /* ---------- Ansicht: Wissen ---------- */

  function viewWissen(query) {
    const artikelId = query.get("artikel");
    if (artikelId) {
      const a = WISSEN.find(x => x.id === artikelId);
      if (a) return `
        <div class="breadcrumb"><a href="#/wissen">← Alle Beiträge</a></div>
        <div class="card article"><h1>${esc(a.titel)}</h1>${a.text}</div>`;
    }
    return `
    <div class="page-head">
      <div>
        <h1>Wissen</h1>
        <p>Kompakte Praxisthemen aus der Beratung — zum Nachlesen für Beraterin, Berater und Betrieb.</p>
      </div>
    </div>
    <div class="grid grid-2">
      ${WISSEN.map(a => `
        <a class="card" href="#/wissen?artikel=${a.id}" style="text-decoration:none;color:inherit">
          <h3 style="color:var(--brand)">${esc(a.titel)}</h3>
          <p class="small" style="margin:0">${esc(a.teaser)}</p>
        </a>`).join("")}
    </div>`;
  }

  /* ---------- Router ---------- */

  const routen = {
    dashboard: { render: viewDashboard },
    betriebe:  { render: viewBetriebe, init: initBetriebe },
    vergleich: { render: viewVergleich, init: initVergleich },
    ration:    { render: viewRation, init: initRation },
    bericht:   { render: viewBericht, init: initBericht },
    wissen:    { render: viewWissen }
  };

  function navigiere() {
    const hash = location.hash.replace(/^#\/?/, "");
    const [pfad, queryStr] = hash.split("?");
    const teile = pfad.split("/").filter(Boolean);
    const query = new URLSearchParams(queryStr || "");
    let routenName = teile[0] || "dashboard";
    let html, initFn = null;

    if (routenName === "betriebe" && teile[1] === "neu") {
      html = viewBetriebForm(null);
      initFn = () => initBetriebForm(null);
    } else if (routenName === "betriebe" && teile[1] && teile[2] === "bearbeiten") {
      html = viewBetriebForm(teile[1]);
      initFn = () => initBetriebForm(teile[1]);
    } else if (routenName === "betriebe" && teile[1]) {
      html = viewBetrieb(teile[1]);
      initFn = () => initBetrieb(teile[1]);
    } else if (routenName === "portal" && teile[1]) {
      html = viewPortal(teile[1]);
      initFn = () => initPortal(teile[1]);
      routenName = "betriebe";
    } else if (routen[routenName]) {
      html = routen[routenName].render(query);
      initFn = routen[routenName].init ? () => routen[routenName].init(query) : null;
    } else {
      routenName = "dashboard";
      html = viewDashboard();
    }

    main.innerHTML = html;
    if (initFn) initFn();

    document.querySelectorAll("#nav a").forEach(a => {
      a.classList.toggle("active", a.dataset.route === routenName);
    });
  }

  function navigiereMitScroll() {
    navigiere();
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  const resetKnopf = $("#demo-reset");
  if (resetKnopf) resetKnopf.addEventListener("click", () => {
    if (confirm("Alle lokalen Eingaben (Betriebe, Preise, Berichte) verwerfen und Demo-Daten neu laden?")) {
      ["betriebe.v2", "preise", "berichte", "milchpreis"].forEach(k => store.del(k));
      location.reload();
    }
  });

  window.addEventListener("hashchange", navigiereMitScroll);
  navigiere();
})();
