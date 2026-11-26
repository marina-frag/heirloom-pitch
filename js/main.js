{
// ---- Edit these two values ---------------------------------------------
// Paste a Tally / Google Forms link for interview sign-ups, and a contact email.
const CONFIG = {
  signupUrl: '',          // e.g. 'https://tally.so/r/xxxx'
  contactEmail: ''        // e.g. 'team@example.com'
};
// ------------------------------------------------------------------------

const NS = 'http://www.w3.org/2000/svg';
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function svgEl(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function svgText(parent, x, y, str, cls, anchor) {
  const t = svgEl('text', { x, y, class: cls || '', 'text-anchor': anchor || 'start' }, parent);
  t.textContent = str;
  return t;
}

// ---------- Decision mock-up ----------
const SCENARIOS = {
  wheat: {
    note: 'Wheat after wheat loses yield to soil-borne disease. Chickpea breaks the cycle and leaves nitrogen for next season, so it ranks first on profit and soil health.',
    rows: [
      { name: 'Chickpea', tag: 'Rotation pick', net: 95, work: 3.5, water: 0, risk: 'Low' },
      { name: 'Cotton', net: 120, work: 6.0, water: 450, risk: 'High · water' },
      { name: 'Durum wheat', net: 45, work: 3.0, water: 0, risk: 'Medium · disease' },
      { name: 'Lease to local farmer', net: 25, work: 0, water: 0, risk: 'None' }
    ]
  },
  chickpea: {
    note: 'After chickpea the soil holds extra nitrogen: durum wheat needs less fertilizer and yields more. Chickpea again would invite disease.',
    rows: [
      { name: 'Durum wheat', tag: 'Rotation pick', net: 110, work: 3.0, water: 0, risk: 'Low' },
      { name: 'Cotton', net: 130, work: 6.0, water: 450, risk: 'High · water' },
      { name: 'Lease to local farmer', net: 25, work: 0, water: 0, risk: 'None' },
      { name: 'Chickpea', net: 35, work: 3.5, water: 0, risk: 'Medium · disease' }
    ]
  }
};

function renderRank(key) {
  const sc = SCENARIOS[key];
  const max = Math.max(...sc.rows.map(r => r.net));
  document.getElementById('rank-body').innerHTML = sc.rows.map((r, i) => `
    <tr class="${i === 0 ? 'top' : ''}">
      <td>${esc(r.name)}${r.tag ? `<span class="badge">${esc(r.tag)}</span>` : ''}</td>
      <td class="num">€${r.net}</td>
      <td><div class="bar ${r.net < max * 0.4 ? 'low' : ''}" style="width:${Math.round(r.net / max * 100)}%"></div></td>
      <td class="num">${r.work.toFixed(1)}</td>
      <td class="num">${r.water}</td>
      <td class="risk">${esc(r.risk)}</td>
    </tr>`).join('');
  document.getElementById('rank-note').textContent = sc.note;
  document.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.prev === key)));
}
document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => renderRank(b.dataset.prev)));
renderRank('wheat');

// ---------- Architecture diagram ----------
const arch = document.getElementById('arch');
const archState = { links: [], svg: null };

function boxLines(g, x, y, w, lines, startY) {
  lines.forEach((ln, i) => svgText(g, x + w / 2, startY + i * 19, ln, i === 0 ? 'lbl' : 'sub', 'middle'));
}
function curve(x1, y1, x2, y2, vertical) {
  if (vertical) { const d = (y2 - y1) / 2; return `M${x1},${y1} C${x1},${y1 + d} ${x2},${y2 - d} ${x2},${y2}`; }
  const d = (x2 - x1) / 2; return `M${x1},${y1} C${x1 + d},${y1} ${x2 - d},${y2} ${x2},${y2}`;
}

function drawArch() {
  const W = arch.clientWidth, H = arch.clientHeight;
  if (!W) return;
  arch.innerHTML = '';
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' }, arch);
  const gl = svgEl('g', {}, svg), gb = svgEl('g', {}, svg), gp = svgEl('g', {}, svg);
  const vertical = W < 720;
  const pad = 16;
  const sensors = [];
  let gw, gh, gx, gy, sw, sh, sx, sy, aw, ah, ax, ay;

  if (!vertical) {
    const gap = Math.max(28, W * 0.05), colW = (W - 2 * pad - 3 * gap) / 4;
    const col = i => pad + i * (colW + gap);
    const fh = 84, fg = 14, y0 = Math.max(16, (H - (3 * (fh + fg) + 72)) / 2);
    ['A', 'B', 'C'].forEach((n, i) => {
      const x = col(0), y = y0 + i * (fh + fg);
      svgEl('rect', { x, y, width: colW, height: fh, rx: 10, class: 'box field' }, gb);
      svgText(gb, x + 12, y + 24, 'Field ' + n, 'lbl');
      svgText(gb, x + 12, y + 43, '2 soil nodes', 'sub');
      sensors.push([x + colW * 0.6, y + fh - 18, 0], [x + colW * 0.84, y + fh - 18, 0]);
    });
    const wy = y0 + 3 * (fh + fg);
    svgEl('rect', { x: col(0), y: wy, width: colW, height: 72, rx: 10, class: 'box wx' }, gb);
    svgText(gb, col(0) + 12, wy + 24, 'Weather node', 'lbl');
    svgText(gb, col(0) + 12, wy + 43, 'shared', 'sub');
    sensors.push([col(0) + colW - 20, wy + 52, 1]);

    gw = Math.min(colW, 190); gh = 112; gx = col(1) + (colW - gw) / 2; gy = H / 2 - gh / 2;
    sw = Math.min(colW, 230); sh = 262; sx = col(2) + (colW - sw) / 2; sy = H / 2 - sh / 2;
    aw = Math.min(colW, 190); ah = 120; ax = col(3) + (colW - aw) / 2; ay = H / 2 - ah / 2;
  } else {
    const fw = (W - 2 * pad - 20) / 3;
    ['A', 'B', 'C'].forEach((n, i) => {
      const x = pad + i * (fw + 10), y = 16;
      svgEl('rect', { x, y, width: fw, height: 86, rx: 10, class: 'box field' }, gb);
      svgText(gb, x + 10, y + 24, 'Field ' + n, 'lbl');
      svgText(gb, x + 10, y + 42, '2 nodes', 'sub');
      sensors.push([x + fw * 0.32, y + 66, 0], [x + fw * 0.7, y + 66, 0]);
    });
    svgEl('rect', { x: pad, y: 114, width: W - 2 * pad, height: 50, rx: 10, class: 'box wx' }, gb);
    svgText(gb, pad + 12, 144, 'Weather node · shared', 'lbl');
    sensors.push([W - pad - 22, 139, 1]);
    gw = Math.min(260, W - 2 * pad); gh = 104; gx = (W - gw) / 2; gy = 236;
    sw = Math.min(320, W - 2 * pad); sh = 262; sx = (W - sw) / 2; sy = 384;
    aw = Math.min(260, W - 2 * pad); ah = 112; ax = (W - aw) / 2; ay = H - ah - 12;
  }

  // gateway
  svgEl('rect', { x: gx, y: gy, width: gw, height: gh, rx: 12, class: 'box' }, gb);
  boxLines(gb, gx, gy, gw, ['Gateway', 'Raspberry Pi', '+ SX1302 concentrator', '+ 4G modem'], gy + 28);
  // server
  svgEl('rect', { x: sx, y: sy, width: sw, height: sh, rx: 12, class: 'box' }, gb);
  svgText(gb, sx + sw / 2, sy + 28, 'Server · Docker on Proxmox', 'lbl', 'middle');
  [['ChirpStack', 'LoRaWAN network server'], ['InfluxDB', 'sensor history'], ['Grafana', 'dashboards'], ['DSSAT · AquaCrop', 'crop simulation']]
    .forEach((r, i) => {
      const ry = sy + 44 + i * 52;
      svgEl('rect', { x: sx + 10, y: ry, width: sw - 20, height: 44, rx: 8, class: 'row' }, gb);
      svgText(gb, sx + 22, ry + 19, r[0], 'lbl');
      svgText(gb, sx + 22, ry + 36, r[1], 'sub');
    });
  // app
  svgEl('rect', { x: ax, y: ay, width: aw, height: ah, rx: 12, class: 'box' }, gb);
  boxLines(gb, ax, ay, aw, ['App', 'Crop ranking', 'Irrigation timing', 'Disease alerts'], ay + 28);

  // links
  const links = [];
  const gIn = vertical ? [gx + gw / 2, gy] : [gx, gy + gh / 2];
  sensors.forEach(s => {
    const d = curve(s[0], s[1], gIn[0], gIn[1], vertical);
    links.push({ p: svgEl('path', { d, class: 'lnk radio' }, gl), kind: 'radio' });
  });
  const seg = vertical
    ? [[gx + gw / 2, gy + gh, sx + sw / 2, sy], [sx + sw / 2, sy + sh, ax + aw / 2, ay]]
    : [[gx + gw, gy + gh / 2, sx, sy + sh / 2], [sx + sw, sy + sh / 2, ax, ay + ah / 2]];
  seg.forEach(s => links.push({ p: svgEl('path', { d: curve(s[0], s[1], s[2], s[3], vertical), class: 'lnk net' }, gl), kind: 'net' }));

  // sensor dots on top of links
  sensors.forEach(s => svgEl('circle', { cx: s[0], cy: s[1], r: 7, class: 'node' + (s[2] ? ' w' : '') }, gb));

  links.forEach((l, i) => {
    l.len = l.p.getTotalLength();
    l.off = (i * 0.37) % 1;
    l.dot = svgEl('circle', { r: l.kind === 'radio' ? 4 : 5, class: 'pkt' + (l.kind === 'net' ? ' n' : ''), cx: -20, cy: -20 }, gp);
  });
  archState.links = links;
  if (reduce) links.forEach(l => { const pt = l.p.getPointAtLength(l.len * 0.5); l.dot.setAttribute('cx', pt.x); l.dot.setAttribute('cy', pt.y); });
}

let archVisible = false, last = 0;
function tickArch(now) {
  if (archVisible && !reduce) {
    const t = now / 1000;
    for (const l of archState.links) {
      const period = l.kind === 'radio' ? 3.4 : 1.7;
      const ph = ((t / period) + l.off) % 1.5;
      if (ph > 1) { l.dot.setAttribute('cx', -20); continue; }
      const pt = l.p.getPointAtLength(l.len * ph);
      l.dot.setAttribute('cx', pt.x); l.dot.setAttribute('cy', pt.y);
    }
  }
  requestAnimationFrame(tickArch);
}
const archRO = new ResizeObserver(drawArch); archRO.observe(arch);
const archIO = new IntersectionObserver(e => { archVisible = e[0].isIntersecting; }); archIO.observe(arch);
requestAnimationFrame(tickArch);

// ---------- Positioning chart ----------
const pos = document.getElementById('pos');
const POINTS = [
  { n: 'Precision-ag platforms', x: 0.2, y: 0.8 },
  { n: 'Farm-management apps', x: 0.28, y: 0.32 },
  { n: 'Private agronomist', x: 0.5, y: 0.52 },
  { n: 'Asking neighbours', x: 0.74, y: 0.14 },
  { n: 'Heirloom', x: 0.84, y: 0.86, us: true }
];
function drawPos() {
  const W = pos.clientWidth, H = pos.clientHeight;
  if (!W) return;
  pos.innerHTML = '';
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' }, pos);
  const m = { l: 20, r: 20, t: 40, b: 40 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const X = v => m.l + v * pw, Y = v => m.t + (1 - v) * ph;
  const css = getComputedStyle(document.documentElement);
  const line = css.getPropertyValue('--line').trim() || '#ccc';
  svgEl('line', { x1: X(0.5), y1: m.t, x2: X(0.5), y2: H - m.b, stroke: line, 'stroke-width': 1.5 }, svg);
  svgEl('line', { x1: m.l, y1: Y(0.5), x2: W - m.r, y2: Y(0.5), stroke: line, 'stroke-width': 1.5 }, svg);
  svgEl('rect', { x: X(0.5), y: m.t, width: pw / 2, height: ph / 2, fill: 'var(--green)', opacity: 0.07 }, svg);
  const small = W < 420;
  svgText(svg, X(0.5), 24, small ? 'Field-specific data' : 'Field-specific, live data', 'sub', 'middle');
  svgText(svg, X(0.5), H - 14, 'Generic advice', 'sub', 'middle');
  svgText(svg, m.l, Y(0.5) - 8, small ? 'For farmers' : 'For experienced farmers', 'sub', 'start');
  svgText(svg, W - m.r, Y(0.5) - 8, small ? 'For non-farmers' : 'For non-farmers', 'sub', 'end');
  POINTS.forEach(p => {
    const cx = X(p.x), cy = Y(p.y);
    svgEl('circle', { cx, cy, r: p.us ? 9 : 6, fill: p.us ? 'var(--green)' : 'var(--muted)' }, svg);
    const right = p.x < 0.6;
    const t = svgText(svg, cx + (right ? 14 : -14), cy + 5, p.n, p.us ? 'lbl' : 'sub', right ? 'start' : 'end');
    if (p.us) t.setAttribute('style', 'font-size:16px;font-weight:700');
  });
  svg.querySelectorAll('text.sub').forEach(t => t.setAttribute('style', 'font-size:13px;fill:var(--muted)'));
  svg.querySelectorAll('text.lbl:not([style])').forEach(t => t.setAttribute('style', 'font-size:14px;font-weight:600'));
}
const posRO = new ResizeObserver(drawPos); posRO.observe(pos);

// ---------- Contact ----------
const cta = document.getElementById('cta');
const parts = [];
if (CONFIG.signupUrl) parts.push(`<a class="btn" href="${esc(CONFIG.signupUrl)}">Book a 20-minute interview</a>`);
if (CONFIG.contactEmail) parts.push(`<a class="btn ghost" href="mailto:${esc(CONFIG.contactEmail)}">${esc(CONFIG.contactEmail)}</a>`);
if (!parts.length) parts.push('<span class="btn ghost" aria-disabled="true">Interview sign-up opens soon</span>');
cta.innerHTML = parts.join('');
}
