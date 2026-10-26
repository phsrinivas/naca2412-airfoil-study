'use strict';

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NS = 'http://www.w3.org/2000/svg';
const fmt = (v, d = 1) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function svgEl(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function newSvg(host, w, h, label) {
  host.innerHTML = '';
  return svgEl('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': label }, host);
}
function svgPoint(svg, evt) {
  const p = svg.createSVGPoint();
  p.x = evt.clientX; p.y = evt.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
}
function niceTicks(min, max, count = 4) {
  const span = max - min || 1;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const ticks = [];
  // always extend one step past max so the top tick covers every value
  for (let v = Math.floor(min / step) * step; ; v += step) {
    ticks.push(+v.toFixed(6));
    if (v >= max - step * 0.001) break;
  }
  return ticks;
}
// bar with 4px rounded data-end, square at the baseline
function barPath(x, w, yBase, yEnd, r = 4) {
  const up = yEnd < yBase;
  const h = Math.abs(yBase - yEnd);
  r = Math.min(r, w / 2, h);
  if (up) return `M${x},${yBase}V${yEnd + r}Q${x},${yEnd} ${x + r},${yEnd}H${x + w - r}Q${x + w},${yEnd} ${x + w},${yEnd + r}V${yBase}Z`;
  return `M${x},${yBase}V${yEnd - r}Q${x},${yEnd} ${x + r},${yEnd}H${x + w - r}Q${x + w},${yEnd} ${x + w},${yEnd - r}V${yBase}Z`;
}
function hbarPath(xBase, xEnd, y, h, r = 4) {
  const w = xEnd - xBase;
  r = Math.min(r, h / 2, Math.abs(w));
  return `M${xBase},${y}H${xEnd - r}Q${xEnd},${y} ${xEnd},${y + r}V${y + h - r}Q${xEnd},${y + h} ${xEnd - r},${y + h}H${xBase}Z`;
}
function setRangeFill(input) {
  const p = ((input.value - input.min) / (input.max - input.min)) * 100;
  input.style.setProperty('--p', p + '%');
}
function legend(host, items) {
  host.innerHTML = items.map((i) => `<span><i style="background:${i.color}"></i>${i.name}</span>`).join('');
}

/* ---------- tooltip ---------- */
const tip = $('#tip');
function showTip(html, evt) {
  tip.innerHTML = html;
  tip.hidden = false;
  const pad = 14;
  const r = tip.getBoundingClientRect();
  let x = evt.clientX + pad, y = evt.clientY + pad;
  if (x + r.width > innerWidth - 8) x = evt.clientX - r.width - pad;
  if (y + r.height > innerHeight - 8) y = evt.clientY - r.height - pad;
  tip.style.left = Math.max(8, x) + 'px';
  tip.style.top = Math.max(8, y) + 'px';
}
function hideTip() { tip.hidden = true; }
const tipRow = (color, name, val) => `<div class="row"><span><i style="background:${color}"></i>${name}</span><span>${val}</span></div>`;

/* ---------- theme ---------- */
$('#theme-toggle').addEventListener('click', () => {
  const root = document.documentElement;
  const isDark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = isDark ? 'light' : 'dark';
  try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
});

$('#ref-list').innerHTML = REFS.map((u) => `<li><a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\//, '')}</a></li>`).join('');

/* ---------- NACA 4-digit geometry ---------- */
function nacaGeometry(m, p, t, n = 90) {
  const up = [], lo = [], cam = [];
  for (let i = 0; i <= n; i++) {
    const x = (1 - Math.cos((Math.PI * i) / n)) / 2;
    const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    let yc = 0, dy = 0;
    if (m > 0) {
      if (x < p) { yc = (m / (p * p)) * (2 * p * x - x * x); dy = ((2 * m) / (p * p)) * (p - x); }
      else { yc = (m / (1 - p) ** 2) * (1 - 2 * p + 2 * p * x - x * x); dy = ((2 * m) / (1 - p) ** 2) * (p - x); }
    }
    const th = Math.atan(dy);
    up.push([x - yt * Math.sin(th), yc + yt * Math.cos(th)]);
    lo.push([x + yt * Math.sin(th), yc - yt * Math.cos(th)]);
    cam.push([x, yc]);
  }
  return { up, lo, cam };
}
// rotate about quarter chord (nose up for positive angle) and map to SVG space
function makeProjector(ox, oy, L, aoaDeg) {
  const a = (aoaDeg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return ([x, y]) => {
    const dx = x - 0.25;
    return [ox + (dx * c + y * s) * L, oy - (-dx * s + y * c) * L];
  };
}
const toPath = (pts, close) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('') + (close ? 'Z' : '');

/* ---------- hero airfoil ---------- */
(function hero() {
  const svg = $('#hero-foil');
  const g = nacaGeometry(0.02, 0.4, 0.12);
  const proj = makeProjector(250, 132, 330, 6);
  const shape = toPath([...g.up.map(proj), ...g.lo.slice().reverse().map(proj)], true);
  for (let k = -4; k <= 4; k++) {
    if (k === 0) continue;
    const y0 = 132 + k * 24;
    const pts = [];
    for (let x = 0; x <= 600; x += 10) {
      const u = (x - 250) / 330; // chord-relative position
      const bump = Math.exp(-(((u - 0.15) / 0.42) ** 2)) * (k < 0 ? -1 : 1) * (26 / Math.abs(k));
      const down = 24 / (1 + Math.exp(-(u - 0.6) * 7)) * (1 / (0.6 + Math.abs(k) * 0.25));
      pts.push([x, y0 + bump * 0.9 + down]);
    }
    svgEl('path', { d: toPath(pts), class: 'flow', style: `animation-delay:${(k * 0.17).toFixed(2)}s` }, svg);
  }
  svgEl('path', { d: shape, fill: 'var(--fg)', opacity: '.92' }, svg);
  svgEl('path', { d: toPath(g.cam.map(proj)), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2 }, svg);
})();

/* ---------- airfoil explorer ---------- */
(function explorer() {
  const svg = $('#foil');
  const inputs = { c: $('#ex-camber'), p: $('#ex-pos'), t: $('#ex-thick'), a: $('#ex-aoa') };

  function render() {
    const c = +inputs.c.value, p = +inputs.p.value, t = +inputs.t.value, a = +inputs.a.value;
    Object.values(inputs).forEach(setRangeFill);
    $('#ex-camber-v').textContent = c;
    $('#ex-pos-v').textContent = p * 10;
    $('#ex-thick-v').textContent = t;
    $('#ex-aoa-v').textContent = a;
    const code = `${c}${c === 0 ? 0 : p}${String(t).padStart(2, '0')}`;
    $('#code').textContent = code;
    $$('.preset').forEach((b) => b.classList.toggle('on', b.dataset.preset === code));

    svg.innerHTML = '';
    const g = nacaGeometry(c / 100, p / 10, t / 100);
    const proj = makeProjector(200, 150, 400, a);
    // relative wind
    for (let i = -2; i <= 2; i++) {
      const y = 150 + i * 46;
      svgEl('line', { x1: 8, x2: 74, y1: y, y2: y, stroke: 'var(--primary)', 'stroke-width': 2, 'stroke-dasharray': '2 5', 'stroke-linecap': 'round' }, svg);
      svgEl('path', { d: `M74,${y - 5}L84,${y}L74,${y + 5}`, fill: 'none', stroke: 'var(--primary)', 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
    }
    // chord line
    svgEl('line', { x1: proj([0, 0])[0], y1: proj([0, 0])[1], x2: proj([1, 0])[0], y2: proj([1, 0])[1], stroke: 'var(--muted-fg)', 'stroke-width': 1.5, 'stroke-dasharray': '5 5' }, svg);
    svgEl('path', { d: toPath([...g.up.map(proj), ...g.lo.slice().reverse().map(proj)], true), fill: 'var(--primary)', 'fill-opacity': '.16', stroke: 'var(--fg)', 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
    svgEl('path', { d: toPath(g.cam.map(proj)), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.5 }, svg);
    // angle-of-attack arc label
    if (a > 0) {
      const le = proj([0, 0]);
      const t2 = svgEl('text', { x: le[0] - 10, y: le[1] - 12, 'text-anchor': 'end', 'font-family': 'IBM Plex Mono', 'font-size': 13, fill: 'var(--muted-fg)', class: 'foil-note' }, svg);
      t2.textContent = `α = ${a}°`;
    }
    const lbl = svgEl('text', { x: 632, y: 292, 'text-anchor': 'end', 'font-family': 'IBM Plex Mono', 'font-size': 12, fill: 'var(--muted-fg)', class: 'foil-note' }, svg);
    lbl.textContent = `max thickness ${t}% · max camber ${c}%`;

    // what the study says about this shape
    const box = $('#tested');
    const ci = CAMBERS.indexOf(c), ti = THICKS.indexOf(t);
    const foil = FOILS.find((f) => f.id === code);
    if (ci >= 0 && ti >= 0 && (p === 4 || c === 0)) {
      const ld = R1[c][ti];
      let html = `<strong>Tested in Round 1.</strong> L/D at 0°, 135 mph: <strong class="mono">${fmt(ld, 2)}</strong>.`;
      if (foil) {
        const r2 = CONDS.map((k) => `${k.label} ${fmt(R2[k.id][foil.id], 2)}`).join(' · ');
        html += ` Round 2: <span class="mono">${r2}</span>.`;
      } else if (c === 0) html += ' A symmetric airfoil makes no lift at 0°.';
      box.innerHTML = html;
    } else if (p !== 4 && c > 0) {
      box.innerHTML = 'Camber position wasn\'t varied in the study because FoilSim doesn\'t offer it as an input. Every tested shape keeps max camber at 40% chord.';
    } else {
      box.innerHTML = 'Not one of the 16 tested shapes. The study used camber 0/2/5/9% × thickness 8/12/16/20%.';
    }
  }
  Object.values(inputs).forEach((i) => i.addEventListener('input', render));
  $$('.preset').forEach((b) => b.addEventListener('click', () => {
    const f = FOILS.find((x) => x.id === b.dataset.preset);
    inputs.c.value = f.c; inputs.p.value = 4; inputs.t.value = f.t;
    render();
  }));
  render();
})();

/* ---------- finalists strip ---------- */
$('#finalists').innerHTML = FOILS.slice().sort((a, b) => a.rank - b.rank).map((f) => `
  <div class="finalist">
    <div class="finalist-name"><span class="dot" style="background:${f.color}"></span>${f.name}</div>
    <div class="finalist-meta">${f.c}% camber · ${f.t}% thick${f.note ? ' · ' + f.note : ''}</div>
    <div class="finalist-val">${fmt(f.r1, 2)}</div>
    <div class="bar"><i style="width:${(f.r1 / 14.46) * 100}%;background:${f.color}"></i></div>
  </div>`).join('');

/* ---------- generic line chart ---------- */
function lineChart(host, o) {
  const W = Math.max(300, Math.round(host.clientWidth) || 640), H = o.height || 300, L = 46, R = o.endLabels ? 74 : 18, T = 16, B = 40;
  const svg = newSvg(host, W, H, o.label);
  const xMin = o.xs[0], xMax = o.xs[o.xs.length - 1];
  const all = o.series.flatMap((s) => s.values);
  const yTicks = niceTicks(o.yMin ?? 0, o.yMax ?? Math.max(...all), 4);
  const yMin = yTicks[0], yMax = yTicks[yTicks.length - 1];
  const xs = (v) => L + ((v - xMin) / (xMax - xMin)) * (W - L - R);
  const ys = (v) => H - B - ((v - yMin) / (yMax - yMin)) * (H - T - B);

  yTicks.forEach((t) => {
    svgEl('line', { x1: L, x2: W - R, y1: ys(t), y2: ys(t), class: t === yMin ? 'axis' : 'gridline' }, svg);
    svgEl('text', { x: L - 8, y: ys(t) + 4, 'text-anchor': 'end' }, svg).textContent = o.yFmt(t);
  });
  (o.xTicks || o.xs).forEach((v) => {
    svgEl('text', { x: xs(v), y: H - B + 18, 'text-anchor': 'middle' }, svg).textContent = o.xFmt(v);
  });
  svgEl('text', { x: L, y: H - 4 }, svg).textContent = o.xLabel;
  svgEl('text', { x: L, y: T - 4 }, svg).textContent = o.yLabel;

  o.series.forEach((s) => {
    const pts = o.xs.map((x, i) => [xs(x), ys(s.values[i])]);
    svgEl('path', { d: toPath(pts), fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    if (o.markers) pts.forEach((p) => svgEl('circle', { cx: p[0], cy: p[1], r: 4, fill: s.color, stroke: 'var(--card)', 'stroke-width': 2 }, svg));
  });
  // direct end labels, nudged apart to avoid collisions
  if (o.endLabels) {
    const ends = o.series.map((s) => ({ s, y: ys(s.values[s.values.length - 1]) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
    ends.forEach((e) => {
      svgEl('text', { x: W - R + 8, y: e.y + 4, class: 'lbl-strong' }, svg).textContent = e.s.short || e.s.name;
    });
  }
  if (o.current) {
    svgEl('line', { x1: xs(o.current.x), x2: xs(o.current.x), y1: T, y2: H - B, stroke: o.current.color, 'stroke-dasharray': '4 4', opacity: '.6' }, svg);
    o.current.ys.forEach((y, i) => svgEl('circle', { cx: xs(o.current.x), cy: ys(y), r: 6, fill: 'var(--card)', stroke: o.series[i].color, 'stroke-width': 3 }, svg));
  }

  // hover layer: crosshair + tooltip
  const cross = svgEl('line', { y1: T, y2: H - B, stroke: 'var(--muted-fg)', 'stroke-width': 1, visibility: 'hidden' }, svg);
  const dots = o.series.map((s) => svgEl('circle', { r: 5, fill: s.color, stroke: 'var(--card)', 'stroke-width': 2, visibility: 'hidden' }, svg));
  const hit = svgEl('rect', { x: L, y: T, width: W - L - R, height: H - T - B, class: 'hit' }, svg);
  const move = (evt) => {
    const p = svgPoint(svg, evt);
    let idx = 0, best = Infinity;
    o.xs.forEach((x, i) => { const d = Math.abs(xs(x) - p.x); if (d < best) { best = d; idx = i; } });
    const cx = xs(o.xs[idx]);
    cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('visibility', 'visible');
    dots.forEach((d, i) => { d.setAttribute('cx', cx); d.setAttribute('cy', ys(o.series[i].values[idx])); d.setAttribute('visibility', 'visible'); });
    const rows = o.series.map((s) => ({ s, v: s.values[idx] })).sort((a, b) => b.v - a.v);
    showTip(`<b>${o.tipTitle(o.xs[idx])}</b>` + rows.map((r) => tipRow(r.s.color, r.s.name, o.yFmtTip(r.v))).join(''), evt);
  };
  const leave = () => { cross.setAttribute('visibility', 'hidden'); dots.forEach((d) => d.setAttribute('visibility', 'hidden')); hideTip(); };
  hit.addEventListener('pointermove', move);
  hit.addEventListener('pointerdown', move);
  hit.addEventListener('pointerleave', leave);
}

/* ---------- Round 1 charts ---------- */
let r1Mode = 'thickness';
function renderR1() {
  const byThickness = r1Mode === 'thickness';
  const series = byThickness
    ? CAMBERS.map((c) => ({ name: `${c}% camber`, short: `${c}% cam.`, color: CAMBER_COLORS[c], values: R1[c] }))
    : THICKS.map((t, ti) => ({ name: `${t}% thick`, short: `${t}% thk.`, color: THICK_COLORS[t], values: CAMBERS.map((c) => R1[c][ti]) }));
  $('#r1-title').textContent = byThickness ? 'L/D vs thickness, by camber' : 'L/D vs camber, by thickness';
  $('.chart-sub', $('#r1-title').parentElement).textContent = byThickness ? 'Each line is one camber value' : 'Each line is one thickness value';
  $('#r1-cap').innerHTML = byThickness
    ? 'At 2% camber, the Cessna\'s own value, L/D nearly <strong>doubles</strong> from 7.62 at 20% thickness to 14.46 at 8%. At 9% camber, thickness barely matters: every value falls between 7.58 and 7.95.'
    : 'Every thickness group peaks <strong>between 2% and 5% camber</strong>, then falls at 9%. The camber curve isn\'t linear: more curvature helps up to a point, then hurts.';
  legend($('#r1-legend'), series);
  lineChart($('#r1-chart'), {
    label: $('#r1-title').textContent,
    xs: byThickness ? THICKS : CAMBERS,
    series, markers: true, endLabels: true, yMin: 0, yMax: 15,
    xFmt: (v) => v + '%', yFmt: (v) => fmt(v, 0), yFmtTip: (v) => fmt(v, 2),
    xLabel: byThickness ? 'MAX THICKNESS (% CHORD)' : 'MAX CAMBER (% CHORD)', yLabel: 'L / D',
    tipTitle: (x) => (byThickness ? `${x}% thickness` : `${x}% camber`),
  });
}
$$('[data-r1]').forEach((b) => b.addEventListener('click', () => {
  r1Mode = b.dataset.r1;
  $$('[data-r1]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
  renderR1();
}));
renderR1();

(function heatmap() {
  const W = 360, H = 330, L = 64, T = 22, B = 46, R = 8;
  const svg = newSvg($('#r1-heat'), W, H, 'Heatmap of L/D by camber and thickness');
  const cw = (W - L - R) / 4, ch = (H - T - B) / 4;
  const max = 14.46;
  const rows = CAMBERS.slice().reverse();
  rows.forEach((c, ri) => {
    svgEl('text', { x: L - 10, y: T + ri * ch + ch / 2 + 4, 'text-anchor': 'end' }, svg).textContent = `${c}%`;
    THICKS.forEach((t, ti) => {
      const v = R1[c][ti];
      const pct = Math.round((v / max) * 100);
      const x = L + ti * cw, y = T + ri * ch;
      const cell = svgEl('rect', { x: x + 1, y: y + 1, width: cw - 2, height: ch - 2, rx: 4, style: `fill:color-mix(in oklab, var(--heat-1) ${pct}%, var(--heat-0))` }, svg);
      const isBase = c === 2 && t === 12;
      if (isBase) svgEl('rect', { x: x + 3, y: y + 3, width: cw - 6, height: ch - 6, rx: 3, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.5 }, svg);
      const txt = svgEl('text', { x: x + cw / 2, y: y + ch / 2 + 4, 'text-anchor': 'middle', style: `fill:${pct > 55 ? 'var(--heat-ink-hi)' : 'var(--heat-ink-lo)'};font-weight:600` }, svg);
      txt.textContent = fmt(v, 2);
      const show = (evt) => showTip(`<b>NACA ${c}${c ? 4 : 0}${String(t).padStart(2, '0')}${isBase ? ' · baseline' : ''}</b>${c}% camber · ${t}% thick<br>L/D at 0°: ${fmt(v, 2)}`, evt);
      [cell, txt].forEach((n) => { n.addEventListener('pointermove', show); n.addEventListener('pointerdown', show); n.addEventListener('pointerleave', hideTip); });
    });
  });
  THICKS.forEach((t, ti) => { svgEl('text', { x: L + ti * cw + cw / 2, y: H - B + 18, 'text-anchor': 'middle' }, svg).textContent = `${t}%`; });
  svgEl('text', { x: L, y: H - 6 }, svg).textContent = 'THICKNESS →';
  svgEl('text', { x: 4, y: T - 8 }, svg).textContent = 'CAMBER';
  svgEl('text', { x: W - R, y: H - 6, 'text-anchor': 'end' }, svg).textContent = '□ = NACA 2412';
})();

$('#r1-table').innerHTML = `<thead><tr><th>Camber \\ Thickness</th>${THICKS.map((t) => `<th class="num">${t}%</th>`).join('')}</tr></thead><tbody>` +
  CAMBERS.map((c) => `<tr><td>${c}%</td>${R1[c].map((v) => `<td class="num">${fmt(v, 2)}</td>`).join('')}</tr>`).join('') + '</tbody>';

/* ---------- Round 2 charts ---------- */
let r2Mode = 'ld';
function renderR2() {
  const pct = r2Mode === 'pct';
  legend($('#r2-legend'), FOILS.map((f) => ({ name: f.name + (f.note ? ' (baseline)' : ''), color: f.color })));
  const W = Math.max(320, Math.round($('#r2-chart').clientWidth) || 760), H = 320, L = 48, R = 12, T = 22, B = 52;
  const svg = newSvg($('#r2-chart'), W, H, 'L/D by flight condition for four airfoils');
  const val = (cond, f) => (pct ? ((R2[cond][f.id] / R2[cond]['2412']) - 1) * 100 : R2[cond][f.id]);
  const all = CONDS.flatMap((c) => FOILS.map((f) => val(c.id, f)));
  const ticks = pct ? niceTicks(Math.min(...all), Math.max(...all), 5) : niceTicks(0, 13, 4);
  const yMin = ticks[0], yMax = ticks[ticks.length - 1];
  const ys = (v) => H - B - ((v - yMin) / (yMax - yMin)) * (H - T - B);
  ticks.forEach((t) => {
    svgEl('line', { x1: L, x2: W - R, y1: ys(t), y2: ys(t), class: t === 0 || (!pct && t === yMin) ? 'axis' : 'gridline' }, svg);
    svgEl('text', { x: L - 8, y: ys(t) + 4, 'text-anchor': 'end' }, svg).textContent = pct ? (t > 0 ? '+' : '') + fmt(t, 0) + '%' : fmt(t, 0);
  });
  svgEl('text', { x: L, y: T - 8 }, svg).textContent = pct ? 'L/D CHANGE VS NACA 2412' : 'L / D';
  const gw = (W - L - R) / 3, bw = Math.min(40, (gw - 40) / 4 - 2);
  CONDS.forEach((cond, gi) => {
    const gx = L + gi * gw + (gw - (bw * 4 + 2 * 3)) / 2;
    const vals = FOILS.map((f) => val(cond.id, f));
    const bestIdx = vals.indexOf(Math.max(...vals));
    FOILS.forEach((f, fi) => {
      const v = vals[fi];
      const x = gx + fi * (bw + 2);
      const base = ys(pct ? 0 : yMin);
      const isZero = pct && f.id === '2412';
      const bar = isZero
        ? svgEl('rect', { x, y: base - 1.5, width: bw, height: 3, fill: f.color, rx: 1.5 }, svg)
        : svgEl('path', { d: barPath(x, bw, base, ys(v)), fill: f.color }, svg);
      const hitRect = svgEl('rect', { x: x - 1, y: T, width: bw + 2, height: H - T - B, class: 'hit' }, svg);
      const raw = R2[cond.id][f.id];
      const d = ((raw / R2[cond.id]['2412']) - 1) * 100;
      const show = (evt) => {
        bar.setAttribute('opacity', '1');
        showTip(`<b>${f.name}</b>${cond.label} · ${cond.detail}<br>L/D ${fmt(raw, 2)}${f.id === '2412' ? ' (baseline)' : ` · ${d >= 0 ? '+' : ''}${fmt(d, 1)}% vs baseline`}`, evt);
      };
      hitRect.addEventListener('pointermove', show);
      hitRect.addEventListener('pointerdown', show);
      hitRect.addEventListener('pointerleave', hideTip);
      if (fi === bestIdx && !(pct && v <= 0)) {
        svgEl('text', { x: x + bw / 2, y: ys(v) - 7, 'text-anchor': 'middle', class: 'lbl-strong' }, svg).textContent = pct ? `+${fmt(v, 1)}%` : fmt(v, 2);
      }
    });
    svgEl('text', { x: L + gi * gw + gw / 2, y: H - B + 20, 'text-anchor': 'middle', class: 'lbl-strong' }, svg).textContent = cond.label;
    // on narrow screens, split the condition detail over two lines
    const parts = cond.detail.split(' · ');
    const lines = gw < 190 ? [parts[0], parts.slice(1).join(' · ')] : [cond.detail];
    lines.forEach((line, li) => {
      svgEl('text', { x: L + gi * gw + gw / 2, y: H - B + 36 + li * 14, 'text-anchor': 'middle' }, svg).textContent = line;
    });
  });
}
$$('[data-r2]').forEach((b) => b.addEventListener('click', () => {
  r2Mode = b.dataset.r2;
  $$('[data-r2]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
  renderR2();
}));
renderR2();

function renderForces() {
  const W = Math.max(300, Math.round($('#r2-forces').clientWidth) || 520), rowH = 54, T = 30, B = 34, L = 92, R = 56;
  const H = T + FOILS.length * rowH + B;
  const host = $('#r2-forces');
  const svg = newSvg(host, W, H, 'Lift and drag at climb for four airfoils');
  const max = 3000;
  const xs = (v) => L + (v / max) * (W - L - R);
  niceTicks(0, max, 3).forEach((t) => {
    svgEl('line', { x1: xs(t), x2: xs(t), y1: T - 6, y2: H - B, class: t === 0 ? 'axis' : 'gridline' }, svg);
    svgEl('text', { x: xs(t), y: H - B + 16, 'text-anchor': 'middle' }, svg).textContent = fmt(t, 0);
  });
  svgEl('text', { x: L, y: H - 4 }, svg).textContent = 'POUNDS OF FORCE';
  const lg = [['Lift', 'var(--primary)'], ['Drag', 'var(--accent)']];
  lg.forEach(([n, c], i) => {
    svgEl('rect', { x: L + i * 70, y: 6, width: 10, height: 10, rx: 3, fill: c }, svg);
    svgEl('text', { x: L + i * 70 + 16, y: 15 }, svg).textContent = n;
  });
  FOILS.forEach((f, i) => {
    const [lift, drag] = CLIMB_FORCES[f.id];
    const y = T + i * rowH + 6;
    svgEl('text', { x: L - 10, y: y + 20, 'text-anchor': 'end', class: 'lbl-strong' }, svg).textContent = f.name.replace('NACA ', '');
    svgEl('path', { d: hbarPath(xs(0), xs(lift), y, 16), fill: 'var(--primary)' }, svg);
    svgEl('path', { d: hbarPath(xs(0), xs(drag), y + 18, 16), fill: 'var(--accent)' }, svg);
    svgEl('text', { x: xs(lift) + 6, y: y + 12 }, svg).textContent = fmt(lift, 0);
    svgEl('text', { x: xs(drag) + 6, y: y + 30 }, svg).textContent = fmt(drag, 0);
    const hit = svgEl('rect', { x: 0, y: y - 4, width: W, height: rowH - 4, class: 'hit' }, svg);
    const show = (evt) => showTip(`<b>${f.name}</b>Climb · 85 mph · 10°<br>Lift ${fmt(lift, 0)} lb · Drag ${fmt(drag, 0)} lb<br>L/D ${fmt(lift / drag, 2)}`, evt);
    hit.addEventListener('pointermove', show);
    hit.addEventListener('pointerdown', show);
    hit.addEventListener('pointerleave', hideTip);
  });
}
renderForces();

$('#r2-table').innerHTML = `<thead><tr><th>Airfoil</th><th class="num">Round 1 (0°)</th>${CONDS.map((c) => `<th class="num">${c.label}</th>`).join('')}<th class="num">Climb lift (lb)</th><th class="num">Climb drag (lb)</th></tr></thead><tbody>` +
  FOILS.map((f) => `<tr><td>${f.name}${f.note ? ' (baseline)' : ''}</td><td class="num">${fmt(f.r1, 2)}</td>${CONDS.map((c) => `<td class="num">${fmt(R2[c.id][f.id], 2)}</td>`).join('')}<td class="num">${fmt(CLIMB_FORCES[f.id][0], 0)}</td><td class="num">${fmt(CLIMB_FORCES[f.id][1], 0)}</td></tr>`).join('') + '</tbody>';

/* ---------- redraw charts at the new width when the window resizes ---------- */
let renderSim = () => {};
let lastWidth = innerWidth;
let resizeTimer;
window.addEventListener('resize', () => {
  if (innerWidth === lastWidth) return; // ignore mobile address-bar height changes
  lastWidth = innerWidth;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { renderR1(); renderR2(); renderForces(); renderSim(); }, 150);
});

/* ---------- Cessna 172 simulator ---------- */
const AIRCRAFT = { wingArea: 16.2, aspectRatio: 7.32, oswald: 0.8, cd0: 0.027, clMax: 1.5, seaPressure: 101325, gasConstant: 287.05, gravity: 9.80665 };
const toM = (ft) => ft * 0.3048;
const toMps = (kt) => kt * 0.514444;
const toLb = (n) => n / 4.44822;
const toKts = (mps) => mps / 0.514444;

function calculateFlight(i) {
  const altitudeM = toM(i.altitude);
  const speedMps = toMps(i.airspeed);
  const weightN = i.weight * 4.44822;
  const h = clamp(altitudeM, 0, 11000);
  const pressure = AIRCRAFT.seaPressure * Math.pow(1 - (0.0065 * h) / 288.15, AIRCRAFT.gravity / (AIRCRAFT.gasConstant * 0.0065));
  const density = pressure / (AIRCRAFT.gasConstant * (i.temperature + 273.15));
  const q = 0.5 * density * speedMps * speedMps;
  const cl = clamp(weightN / Math.max(q * AIRCRAFT.wingArea, 0.0001), 0, 1.8);
  const lift = q * AIRCRAFT.wingArea * cl;
  const k = 1 / (Math.PI * AIRCRAFT.oswald * AIRCRAFT.aspectRatio);
  const parasiteDrag = q * AIRCRAFT.wingArea * AIRCRAFT.cd0;
  const inducedDrag = q * AIRCRAFT.wingArea * k * cl * cl;
  const drag = parasiteDrag + inducedDrag;
  const stallSpeed = Math.sqrt((2 * weightN) / Math.max(density * AIRCRAFT.wingArea * AIRCRAFT.clMax, 0.001));
  return { pressure, density, cl, lift, parasiteDrag, inducedDrag, drag, liftDrag: lift / Math.max(drag, 0.001), stallSpeedKt: toKts(stallSpeed) };
}

(function simulator() {
  const initial = { altitude: 3500, airspeed: 105, weight: 2350, temperature: 15 };
  const ctl = { altitude: $('#s-alt'), airspeed: $('#s-spd'), weight: $('#s-wt'), temperature: $('#s-tmp') };
  const out = { altitude: $('#s-alt-v'), airspeed: $('#s-spd-v'), weight: $('#s-wt-v'), temperature: $('#s-tmp-v') };
  let mode = 'ld';

  function render() {
    const inp = {};
    for (const k in ctl) { inp[k] = +ctl[k].value; setRangeFill(ctl[k]); out[k].textContent = fmt(inp[k], 0); }
    const d = calculateFlight(inp);
    const margin = inp.airspeed - d.stallSpeedKt;

    $('#sim-spd-h').textContent = `${inp.airspeed} kt`;
    $('#margin-val').innerHTML = `${margin >= 0 ? '+' : ''}${fmt(margin, 0)} <small>kt</small>`;
    $('#margin-box').className = 'margin-box ' + (margin > 10 ? 'ok' : 'warn');
    $('#speed-fill').style.width = clamp(((inp.airspeed - 45) / 100) * 100, 0, 100) + '%';
    $('#stall-mark').style.left = clamp(((d.stallSpeedKt - 45) / 100) * 100, 0, 100) + '%';

    $('#m-lift').innerHTML = `${fmt(toLb(d.lift), 0)}<small>lb</small>`;
    $('#m-lift-d').textContent = `C_L ${fmt(d.cl, 2)} · balances the aircraft`;
    $('#m-drag').innerHTML = `${fmt(toLb(d.drag), 0)}<small>lb</small>`;
    $('#m-drag-d').textContent = `${fmt(toLb(d.parasiteDrag), 0)} parasite + ${fmt(toLb(d.inducedDrag), 0)} induced`;
    $('#m-ld').innerHTML = `${fmt(d.liftDrag, 1)}<small>ratio</small>`;
    $('#m-stall').innerHTML = `${fmt(d.stallSpeedKt, 0)}<small>kt</small>`;
    $('#m-stall-d').textContent = `clean, at ${fmt(inp.weight, 0)} lb · ρ ${fmt(d.density, 3)} kg/m³`;

    const cue = margin < 0
      ? 'Your selected speed is below the clean stall speed. Increase airspeed or reduce weight before reading the glide numbers.'
      : margin < 10
        ? 'You\'re close to the clean stall speed. Notice how a small change in speed makes a large change in induced drag.'
        : 'You have a healthy stall margin. Move one slider and watch which number changes first.';
    $('#sim-cue').innerHTML = `<div class="eyebrow">Instructor's cue</div>${cue}`;

    const speeds = Array.from({ length: 21 }, (_, i) => 45 + i * 5);
    const pts = speeds.map((s) => calculateFlight({ ...inp, airspeed: s }));
    const forces = mode === 'forces';
    const series = forces
      ? [{ name: 'Lift', color: 'var(--primary)', values: pts.map((p) => toLb(p.lift)) }, { name: 'Drag', color: 'var(--accent)', values: pts.map((p) => toLb(p.drag)) }]
      : [{ name: 'L/D', color: 'var(--accent-ink)', values: pts.map((p) => p.liftDrag) }];
    $('#sim-chart-title').textContent = forces ? 'Lift and drag across airspeed' : 'L/D across airspeed';
    $('#sim-cap').textContent = forces
      ? 'Lift stays near weight. At higher speed, the same lift needs a lower C_L, so induced drag falls while parasite drag climbs.'
      : 'The peak marks the most aerodynamically efficient speed in this simplified model. That\'s not the same as the fastest speed.';
    if (forces) legend($('#sim-legend'), series); else $('#sim-legend').innerHTML = '';
    lineChart($('#sim-chart'), {
      label: $('#sim-chart-title').textContent,
      xs: speeds, xTicks: [45, 70, 95, 120, 145], series, height: 270, yMin: 0,
      endLabels: forces,
      xFmt: (v) => v, yFmt: (v) => fmt(v, 0), yFmtTip: (v) => (forces ? fmt(v, 0) + ' lb' : fmt(v, 1)),
      xLabel: 'TRUE AIRSPEED (KT)', yLabel: forces ? 'FORCE (LB)' : 'L / D',
      tipTitle: (x) => `${x} kt`,
      current: { x: inp.airspeed, color: 'var(--muted-fg)', ys: forces ? [toLb(d.lift), toLb(d.drag)] : [d.liftDrag] },
    });
  }
  Object.values(ctl).forEach((c) => c.addEventListener('input', render));
  $('#sim-reset').addEventListener('click', () => { for (const k in ctl) ctl[k].value = initial[k]; render(); });
  renderSim = render;
  $$('[data-sim]').forEach((b) => b.addEventListener('click', () => {
    mode = b.dataset.sim;
    $$('[data-sim]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
    render();
  }));
  render();
})();
