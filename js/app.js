/* ISUBA Beraterapp — Anwendungslogik
   Hash-Router, Ansichten, Rechenwerkzeuge. Keine Abhängigkeiten.
   Eigene Eingaben (Preise, Besuchsberichte) liegen im localStorage. */

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
    }
  };

  // Preise: gespeicherte Werte überlagern die Stammdaten
  const preise = store.get("preise", {});
  FUTTERMITTEL.forEach(f => { if (preise[f.id] != null) f.preis = preise[f.id]; });

  // Eigene Besuchsberichte in die Betriebe einhängen
  const eigeneBerichte = store.get("berichte", []);
  eigeneBerichte.forEach(b => {
    const betrieb = BETRIEBE.find(x => x.id === b.betriebId);
    if (betrieb && !betrieb.besuche.some(v => v.datum === b.datum && v.notizen === b.notizen)) {
      betrieb.besuche.unshift(b);
    }
  });

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

  /* ---------- Fachliche Auswertung ---------- */

  const futter = (id) => FUTTERMITTEL.find(f => f.id === id);

  // Nährstoffsumme einer Ration (Liste aus {futterId, kgFM})
  function rationsSumme(ration) {
    let tm = 0, nel = 0, nxp = 0, rp = 0, rnb = 0, kosten = 0;
    ration.forEach(r => {
      const f = futter(r.futterId);
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

  // Auffälligkeiten aus der letzten Milchkontrolle
  function alerts(betrieb) {
    const out = [];
    const mk = betrieb.milchkontrollen;
    if (!mk || !mk.length) return out;
    const m = mk[mk.length - 1];
    const feq = m.fett / m.eiweiss;
    if (m.harnstoff > 30) out.push({ stufe: "warn", text: `Harnstoff ${fmt(m.harnstoff, 0)} mg — Eiweißüberhang oder Energiemangel prüfen` });
    if (m.harnstoff < 15) out.push({ stufe: "warn", text: `Harnstoff nur ${fmt(m.harnstoff, 0)} mg — Eiweißversorgung im Pansen zu knapp` });
    if (feq > 1.5) out.push({ stufe: "crit", text: `Fett-Eiweiß-Quotient ${fmt(feq, 2)} — Ketoserisiko / Energiedefizit` });
    if (feq < 1.1) out.push({ stufe: "crit", text: `Fett-Eiweiß-Quotient ${fmt(feq, 2)} — Strukturmangel, Azidoserisiko` });
    if (m.zellzahl > 200) out.push({ stufe: "warn", text: `Zellzahl ${fmt(m.zellzahl, 0)}.000 — Eutergesundheit ansprechen` });
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

  /* ---------- SVG-Liniendiagramm ---------- */

  function lineChart(werte, opts) {
    const o = Object.assign({ w: 320, h: 110, min: null, max: null, band: null, einheit: "", dez: 1 }, opts);
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

  /* ---------- Ansichten ---------- */

  function viewDashboard() {
    const alleAlerts = BETRIEBE.flatMap(b => alerts(b).map(a => ({ betrieb: b, ...a })));
    const anstehend = [...BETRIEBE]
      .filter(b => b.naechsterBesuch)
      .sort((a, b) => a.naechsterBesuch.localeCompare(b.naechsterBesuch))
      .slice(0, 5);
    const kuehe = BETRIEBE.reduce((s, b) => s + b.kuehe, 0);

    return `
    <div class="page-head">
      <div>
        <h1>Guten Morgen!</h1>
        <p>Überblick über alle Beratungsbetriebe — Auffälligkeiten aus der letzten Milchkontrolle zuerst.</p>
      </div>
      <span class="pill pill-neutral">Stand ${datum(heute())}</span>
    </div>

    <div class="grid grid-kpi" style="margin-bottom:16px">
      <div class="card kpi"><div class="kpi-label">Betriebe</div><div class="kpi-value">${BETRIEBE.length}</div><div class="kpi-sub">in der Demo · Vollausbau ca. 200</div></div>
      <div class="card kpi"><div class="kpi-label">Kühe betreut</div><div class="kpi-value">${nf(0).format(kuehe)}</div><div class="kpi-sub">über alle Betriebe</div></div>
      <div class="card kpi"><div class="kpi-label">Auffälligkeiten</div><div class="kpi-value">${alleAlerts.length}</div><div class="kpi-sub">aus aktueller Milchkontrolle</div></div>
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
          </div>`).join("")}
      </div>
    </div>`;
  }

  function viewBetriebe() {
    return `
    <div class="page-head">
      <div>
        <h1>Betriebe</h1>
        <p>Alle Beratungsbetriebe mit Kennzahlen der letzten Milchkontrolle. In der Demo sechs Beispielbetriebe.</p>
      </div>
      <input class="search-input" type="search" id="suche" placeholder="Betrieb oder Ort suchen …" aria-label="Betrieb suchen">
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
            const m = b.milchkontrollen[b.milchkontrollen.length - 1];
            const a = alerts(b);
            const status = a.some(x => x.stufe === "crit") ? `<span class="pill pill-crit">kritisch</span>`
              : a.length ? `<span class="pill pill-warn">${a.length} Hinweis${a.length > 1 ? "e" : ""}</span>`
              : `<span class="pill pill-ok">unauffällig</span>`;
            return `<tr class="row-click" data-such="${esc((b.name + " " + b.ort + " " + b.leiter).toLowerCase())}" data-href="#/betriebe/${b.id}">
              <td><strong>${esc(b.name)}</strong><br><small>${esc(b.leiter)}</small></td>
              <td>${esc(b.ort)}</td><td class="num">${b.kuehe}</td><td>${esc(b.system)}</td>
              <td class="num">${fmt(m.milch)}</td><td class="num">${fmt(m.fett, 2)}</td>
              <td class="num">${fmt(m.eiweiss, 2)}</td><td class="num">${fmt(m.harnstoff, 0)}</td>
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

  function viewBetrieb(id) {
    const b = BETRIEBE.find(x => x.id === id);
    if (!b) return `<p>Betrieb nicht gefunden. <a href="#/betriebe">Zur Übersicht</a></p>`;
    const summe = rationsSumme(b.ration);
    const mk = b.milchkontrollen;
    const m = mk[mk.length - 1];
    const bAlerts = alerts(b);
    const kostenJeKgMilch = summe.kosten / m.milch;

    return `
    <div class="breadcrumb"><a href="#/betriebe">← Alle Betriebe</a></div>
    <div class="page-head">
      <div>
        <h1>${esc(b.name)}</h1>
        <p>${esc(b.leiter)} · ${esc(b.ort)} · ${b.kuehe} ${esc(b.rasse)}-Kühe · ${esc(b.system)}</p>
      </div>
      <div class="tag-row">
        <span class="pill pill-neutral">letzter Besuch ${datum(b.letzterBesuch)}</span>
        <span class="pill pill-brand">nächster Besuch ${datum(b.naechsterBesuch)}</span>
      </div>
    </div>

    ${bAlerts.length ? `<div style="margin-bottom:16px">${bAlerts.map(a =>
      `<div class="alert-item alert-${a.stufe}"><div>${esc(a.text)}</div></div>`).join("")}</div>` : ""}

    <div class="grid grid-2" style="margin-bottom:16px">
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
    </div>

    <div class="grid grid-2" style="margin-bottom:16px">
      <div class="card">
        <h2>Aktuelle Ration <small>je Kuh und Tag</small></h2>
        <div class="table-wrap"><table>
          <thead><tr><th>Komponente</th><th class="num">kg FM</th><th class="num">kg TM</th><th class="num">€/Tag</th></tr></thead>
          <tbody>
            ${b.ration.map(r => {
              const f = futter(r.futterId);
              return `<tr><td>${esc(f.name)}</td><td class="num">${fmt(r.kgFM)}</td>
                <td class="num">${fmt(r.kgFM * f.tm / 100, 2)}</td>
                <td class="num">${fmt(r.kgFM * f.preis / 100, 2)}</td></tr>`;
            }).join("")}
          </tbody>
        </table></div>
        <div class="note" style="margin-top:12px">
          <strong>${fmt(summe.tm)} kg TM</strong> · ${fmt(summe.nel, 0)} MJ NEL · ${fmt(summe.nxp, 0)} g nXP ·
          RNB ${fmt(summe.rnb, 0)} g N<br>
          Futterkosten <strong>${euro(summe.kosten)}</strong>/Kuh/Tag = <strong>${fmt(kostenJeKgMilch * 100, 1)} Cent</strong> je kg Milch
        </div>
        <p style="margin:12px 0 0"><a class="btn btn-ghost btn-sm" href="#/ration?betrieb=${b.id}">Ration im Rationscheck öffnen</a></p>
      </div>

      <div class="card">
        <h2>Besuchsberichte</h2>
        ${b.besuche.map(v => `
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
          </div>`).join("")}
        <a class="btn btn-sm" href="#/bericht?betrieb=${b.id}">Neuen Bericht erfassen</a>
      </div>
    </div>`;
  }

  /* ---------- Futtermittelvergleich ---------- */

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

  /* ---------- Rationscheck ---------- */

  let rationEntwurf = [{ futterId: "grassilage1", kgFM: 25 }, { futterId: "maissilage", kgFM: 12 },
                       { futterId: "gerste", kgFM: 2.5 }, { futterId: "raps", kgFM: 1.5 }];

  function viewRation(query) {
    const betriebId = query.get("betrieb");
    if (betriebId) {
      const b = BETRIEBE.find(x => x.id === betriebId);
      if (b) rationEntwurf = b.ration.map(r => ({ ...r }));
    }
    return `
    <div class="page-head">
      <div>
        <h1>Rationscheck</h1>
        <p>Schnellkontrolle je Kuh und Tag: Deckt die Ration Energie- und Eiweißbedarf, und was kostet sie?
        Bedarf nach Faustzahlen für eine 650-kg-Kuh.</p>
      </div>
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
      </div>
      <div class="stack">
        <div class="card">
          <h2>Tier</h2>
          <div class="field-row">
            <div class="field"><label for="milch-kg">Milch kg/Tag</label>
              <input id="milch-kg" type="number" value="28" min="0" step="1"></div>
          </div>
        </div>
        <div class="card" id="rations-ergebnis"></div>
      </div>
    </div>`;
  }

  function renderRation() {
    const zeilen = $("#rations-zeilen");
    zeilen.innerHTML = rationEntwurf.map((r, i) => {
      const f = futter(r.futterId);
      return `<div class="list-item">
        <div style="flex:1"><strong>${esc(f.name)}</strong><br>
          <small>${fmt(f.nel)} MJ NEL · ${fmt(f.nxp, 0)} g nXP je kg TM · ${euro(f.preis)}/dt</small></div>
        <input type="number" value="${r.kgFM}" min="0" step="0.1" style="width:90px" data-kg="${i}" aria-label="kg Frischmasse ${esc(f.name)}">
        <span class="small">kg FM</span>
        <button class="btn-ghost btn-sm" type="button" data-weg="${i}" aria-label="${esc(f.name)} entfernen">✕</button>
      </div>`;
    }).join("");
    zeilen.querySelectorAll("input[data-kg]").forEach(inp => inp.addEventListener("change", () => {
      rationEntwurf[+inp.dataset.kg].kgFM = parseFloat(inp.value) || 0;
      renderErgebnis();
    }));
    zeilen.querySelectorAll("button[data-weg]").forEach(btn => btn.addEventListener("click", () => {
      rationEntwurf.splice(+btn.dataset.weg, 1);
      renderRation(); renderErgebnis();
    }));
    renderErgebnis();
  }

  function renderErgebnis() {
    const milch = parseFloat($("#milch-kg").value) || 0;
    const s = rationsSumme(rationEntwurf);
    const bedarfNel = BEDARF.nelErhalt + BEDARF.nelJeKg * milch;
    const bedarfNxp = BEDARF.nxpErhalt + BEDARF.nxpJeKg * milch;
    const tmRichtwert = 16.25 + 0.1 * milch; // 0,025 × 650 kg + 0,1 × Milch
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
      <p class="small" style="margin-bottom:0">Faustzahlen: Erhaltung ${fmt(BEDARF.nelErhalt)} MJ NEL + ${fmt(BEDARF.nelJeKg)} MJ je kg Milch;
      ${fmt(BEDARF.nxpErhalt, 0)} g nXP + ${fmt(BEDARF.nxpJeKg, 0)} g je kg Milch. Ersetzt keine vollständige Rationsberechnung.</p>`;
  }

  function initRation() {
    renderRation();
    $("#milch-kg").addEventListener("input", renderErgebnis);
    $("#neu-hinzu").addEventListener("click", () => {
      rationEntwurf.push({ futterId: $("#neu-futter").value, kgFM: 1 });
      renderRation();
    });
  }

  /* ---------- Besuchsbericht ---------- */

  function viewBericht(query) {
    const vorId = query.get("betrieb") || "";
    return `
    <div class="page-head">
      <div>
        <h1>Besuchsbericht erfassen</h1>
        <p>Direkt im Stall ausfüllen — der Bericht erscheint sofort in der Betriebsakte und beim Kunden in der App.</p>
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
        betriebId: $("#f-betrieb").value,
        datum: $("#f-datum").value,
        bcs: num("#f-bcs"),
        kotscore: num("#f-kot"),
        tsSilage: num("#f-ts"),
        schuettelbox: (ober != null && mittel != null && unten != null) ? { ober, mittel, unten } : null,
        notizen: $("#f-notizen").value.trim(),
        empfehlungen: $("#f-empfehlung").value.trim()
      };
      eigeneBerichte.unshift(bericht);
      store.set("berichte", eigeneBerichte);
      const betrieb = BETRIEBE.find(x => x.id === bericht.betriebId);
      betrieb.besuche.unshift(bericht);
      betrieb.letzterBesuch = bericht.datum;
      $("#f-ok").style.display = "inline-block";
      setTimeout(() => { location.hash = "#/betriebe/" + bericht.betriebId; }, 700);
    });
  }

  /* ---------- Wissen ---------- */

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
    let html;

    if (routenName === "betriebe" && teile[1]) {
      html = viewBetrieb(teile[1]);
    } else if (routen[routenName]) {
      html = routen[routenName].render(query);
    } else {
      routenName = "dashboard";
      html = viewDashboard();
    }

    main.innerHTML = html;
    if (!teile[1] && routen[routenName] && routen[routenName].init) routen[routenName].init(query);

    document.querySelectorAll("#nav a").forEach(a => {
      a.classList.toggle("active", a.dataset.route === routenName);
    });
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", navigiere);
  navigiere();
})();
