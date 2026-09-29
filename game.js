// Auden's Practice Day — a Waterloo Tigers baseball game.
// Auden Milligan, #22, 11U Tier 2, practising at Auburn Park, Waterloo, Ontario.

'use strict';

// ---------------------------------------------------------------- setup
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 960, H = 540;
const DPR = Math.min(2, window.devicePixelRatio || 1);
canvas.width = W * DPR;
canvas.height = H * DPR;

const TAU = Math.PI * 2;
const GOLD = '#f5b800', GOLD_D = '#c99400', INK = '#141414', CREAM = '#fff8e6';
const SKIN = '#f1c79a', HAIR = '#6b4423';
const DISPLAY = 'Bungee, Impact, sans-serif';
const BODY = 'Nunito, system-ui, sans-serif';

const logo = new Image();
logo.src = 'assets/tigers-logo.png';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
let T = 0; // global clock

// ---------------------------------------------------------------- input
const input = {
  keys: new Set(), pressed: new Set(),
  mx: W / 2, my: H / 2, clicked: false, lastDevice: 'key',
};
addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
  if (!e.repeat) input.pressed.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  input.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  input.lastDevice = 'key';
  audio.unlock();
});
addEventListener('keyup', e => input.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
addEventListener('blur', () => input.keys.clear());
function toCanvas(e) {
  const r = canvas.getBoundingClientRect();
  input.mx = (e.clientX - r.left) * W / r.width;
  input.my = (e.clientY - r.top) * H / r.height;
}
canvas.addEventListener('pointerdown', e => {
  toCanvas(e); input.clicked = true; input.lastDevice = 'pointer'; audio.unlock();
});
canvas.addEventListener('pointermove', e => { toCanvas(e); input.lastDevice = 'pointer'; });

const action = () => input.clicked || input.pressed.has(' ') || input.pressed.has('Enter');
const held = (...ks) => ks.some(k => input.keys.has(k));

// ---------------------------------------------------------------- audio
let muted = false;
const audio = {
  ctx: null,
  unlock() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* no audio */ }
    } else if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(f, d = 0.1, type = 'square', v = 0.06, slide = 0, delay = 0) {
    const c = this.ctx; if (!c || muted) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + d);
    g.gain.setValueAtTime(v, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g).connect(c.destination);
    o.start(t0); o.stop(t0 + d + 0.02);
  },
  noise(d = 0.08, v = 0.25, freq = 1500) {
    const c = this.ctx; if (!c || muted) return;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * d), c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = v;
    src.connect(f).connect(g).connect(c.destination); src.start();
  },
};
const sfx = {
  pop: () => { audio.noise(0.05, 0.5, 700); audio.tone(160, 0.08, 'triangle', 0.2, -60); },
  crack: () => { audio.noise(0.09, 0.7, 2600); audio.tone(900, 0.05, 'square', 0.05, -500); },
  whoosh: () => audio.noise(0.18, 0.18, 500),
  thud: () => audio.tone(90, 0.15, 'sine', 0.25, -40),
  ptoo: () => { audio.tone(500, 0.12, 'sawtooth', 0.05, 700); audio.noise(0.06, 0.2, 3000); },
  tick: () => audio.tone(880, 0.03, 'square', 0.03),
  good: () => [523, 659, 784].forEach((f, i) => audio.tone(f, 0.12, 'square', 0.05, 0, i * 0.08)),
  great: () => [523, 659, 784, 1046].forEach((f, i) => audio.tone(f, 0.16, 'square', 0.06, 0, i * 0.09)),
  bad: () => [300, 220].forEach((f, i) => audio.tone(f, 0.18, 'sawtooth', 0.05, 0, i * 0.12)),
};

// ---------------------------------------------------------------- save data
const SAVE_KEY = 'auden22.practice.v1';
const best = { catching: 0, batting: 0, fielding: 0, seeds: 0 };
try { Object.assign(best, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch (e) { /* ignore */ }
function saveBest() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(best)); } catch (e) { /* ignore */ } }

const DRILLS = [
  { id: 'catching', skill: 'Catching', name: 'Pop Fly Patrol', icon: '🧤', unit: 'pts', stars: [12, 22, 32],
    how: ['Watch the shadow — that\'s where the ball lands.', 'Get under it before it drops! Gold balls are worth 3.', '← → keys, or move the mouse / your finger.'] },
  { id: 'batting', skill: 'Batting', name: 'Cage Crusher', icon: '⚾', unit: 'pts', stars: [8, 16, 24],
    how: ['Swing with Space, a click, or a tap.', 'Timing is everything: perfect = HOME RUN.', 'Lay off the high ones — a good eye earns a point.'] },
  { id: 'fielding', skill: 'Fielding', name: 'Grounder Gauntlet', icon: '🏃', unit: 'outs', stars: [3, 5, 7],
    how: ['Auden\'s at shortstop. Get in front of the grounder!', 'Arrow keys / WASD, or point where you want to go.', 'Throw to first when the needle is in the GREEN.'] },
  { id: 'seeds', skill: 'Seed Spitting', name: 'Sunflower Showdown', icon: '🌻', unit: 'm', stars: [4, 6, 7.5],
    how: ['A dugout tradition. Five spits, best one counts.', 'Tap once to lock the angle, again to lock the power.', 'Watch the wind flag!'] },
];
const drill = id => DRILLS.find(d => d.id === id);
const starsFor = (d, score) => d.stars.filter(s => score >= s).length;
const fmt = (d, v) => d.unit === 'm' ? `${v.toFixed(2)} m` : `${v} ${d.unit}`;

// ---------------------------------------------------------------- drawing helpers
function text(str, x, y, o = {}) {
  const { size = 24, color = INK, align = 'center', font = DISPLAY, weight = '', stroke = null, lw = 6, base = 'middle', alpha = 1 } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align; ctx.textBaseline = base;
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
  ctx.fillStyle = color; ctx.fillText(str, x, y);
  ctx.restore();
}
function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function circle(x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
function ellipse(x, y, rx, ry, fill) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
function seg(x1, y1, x2, y2, w, color) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.lineWidth = w; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.stroke();
}
function drawLogo(x, y, size) {
  if (logo.complete && logo.naturalWidth) {
    const h = size * logo.naturalHeight / logo.naturalWidth;
    ctx.drawImage(logo, x - size / 2, y - h / 2, size, h);
  } else {
    circle(x, y, size / 2, INK); text('W', x, y, { size: size * 0.5, color: GOLD });
  }
}
function drawBaseball(x, y, r, gold = false) {
  circle(x, y, r, gold ? GOLD : '#fff');
  if (r > 3) {
    ctx.strokeStyle = gold ? '#8a6400' : '#d33'; ctx.lineWidth = Math.max(1, r / 5);
    ctx.beginPath(); ctx.arc(x - r * 1.3, y, r * 0.9, -0.6, 0.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + r * 1.3, y, r * 0.9, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
  }
}
function stars(x, y, n, size = 26, max = 3) {
  for (let i = 0; i < max; i++) {
    const on = i < n;
    text('★', x + (i - (max - 1) / 2) * size * 1.1, y, { size, font: BODY, weight: 900, color: on ? GOLD : 'rgba(0,0,0,.25)', stroke: on ? INK : null, lw: 3 });
  }
}
function button(label, x, y, w, h, primary = true) {
  const hover = input.lastDevice === 'pointer' && input.mx > x && input.mx < x + w && input.my > y && input.my < y + h;
  rrect(x, y + 4, w, h, 12); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
  rrect(x, y + (hover ? 2 : 0), w, h, 12); ctx.fillStyle = primary ? GOLD : CREAM; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  text(label, x + w / 2, y + h / 2 + (hover ? 2 : 0), { size: 20, color: INK });
  return input.clicked && input.mx > x && input.mx < x + w && input.my > y && input.my < y + h;
}

// A ballplayer. Defaults are Auden: black & gold Tigers, #22.
function drawKid(x, y, s, o = {}) {
  const face = o.face || 1;
  const jersey = o.jersey || INK, trim = o.trim || GOLD, pants = o.pants || '#efefef';
  ctx.save();
  ctx.translate(x, y); ctx.scale(s * face, s);
  const leg = o.running ? Math.sin(T * 16) * 9 : (o.stance || 0);
  ellipse(0, 0, 24, 6, 'rgba(0,0,0,.2)');
  // legs + socks + cleats
  seg(-7, -44, -8 + leg, -7, 10, pants); seg(7, -44, 8 - leg, -7, 10, pants);
  seg(-8 + leg * 0.8, -17, -8 + leg, -7, 10, jersey); seg(8 - leg * 0.8, -17, 8 - leg, -7, 10, jersey);
  ellipse(-5 + leg, -4, 8, 4.5, INK); ellipse(11 - leg, -4, 8, 4.5, INK);
  // arms: h1 = glove hand, h2 = throwing hand
  const h1 = o.bat != null ? { x: 6, y: -70 } : (o.h1 || { x: -21, y: -52 });
  const h2 = o.bat != null ? { x: 10, y: -68 } : (o.h2 || { x: 21, y: -52 });
  seg(-14, -78, h1.x, h1.y, 8, SKIN);
  // torso
  rrect(-19, -86, 38, 46, 10); ctx.fillStyle = jersey; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = trim; ctx.stroke();
  ctx.fillStyle = INK; ctx.fillRect(-18, -47, 36, 5);
  ctx.save(); ctx.scale(face, 1);
  if (o.back) {
    text(o.name || 'MILLIGAN', 0, -77, { size: 7, color: trim, font: BODY, weight: 900 });
    text(o.number || '22', 0, -60, { size: 21, color: trim, stroke: '#fff', lw: 2 });
  } else {
    text(o.script || 'Tigers', 0, -66, { size: 11, color: trim, font: 'Pacifico, cursive' });
  }
  ctx.restore();
  seg(-17, -80, -16, -74, 9, jersey); seg(17, -80, 16, -74, 9, jersey); // sleeves
  seg(14, -78, h2.x, h2.y, 8, SKIN);
  // bat
  if (o.bat != null) {
    const bx = 8 + Math.cos(o.bat) * 60, by = -69 + Math.sin(o.bat) * 60;
    seg(8, -69, bx, by, 5, '#c98d45'); seg(8 + Math.cos(o.bat) * 25, -69 + Math.sin(o.bat) * 25, bx, by, 8, '#dba862');
  }
  // glove
  if (o.glove !== false && o.bat == null) { circle(h1.x, h1.y, 10, '#8b4a1c'); circle(h1.x + 2, h1.y - 1, 5, '#6a3512'); }
  if (o.ball) drawBaseball(h2.x, h2.y, 4);
  // head
  if (o.back) { ellipse(0, -93, 11, 6, HAIR); }
  circle(0, -100, 14, SKIN);
  if (!o.back) {
    circle(2, -101, 2, INK); circle(9, -101, 2, INK);
    if (o.mouth === 'o') circle(8, -93, 3.2, '#7a2a2a');
    else if (o.mouth === 'puff') { circle(10, -94, 5, '#f4b48a'); }
    else { ctx.beginPath(); ctx.arc(6, -95, 4, 0.2, Math.PI - 0.2); ctx.lineWidth = 1.8; ctx.strokeStyle = INK; ctx.stroke(); }
    ellipse(-10, -100, 3, 5, HAIR);
  }
  // cap
  ctx.beginPath(); ctx.arc(0, -104, 15, Math.PI, 0); ctx.fillStyle = o.cap || jersey; ctx.fill();
  if (!o.back) { ellipse(14, -104, 11, 3.5, o.cap || jersey); }
  if (!o.back) {
    ctx.save(); ctx.scale(face, 1);
    text(o.capLetter || 'W', 3 * face, -110, { size: 10, color: trim, font: 'Pacifico, cursive' });
    ctx.restore();
  }
  ctx.restore();
}

// Auburn Park, Waterloo — backdrop pieces
const clouds = Array.from({ length: 6 }, (_, i) => ({ x: i * 190 + rand(0, 80), y: rand(30, 120), s: rand(0.7, 1.3) }));
function drawSky(h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#5fb6ef'); g.addColorStop(1, '#d4efff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, h);
  for (const c of clouds) {
    const x = ((c.x + T * 8 * c.s) % (W + 200)) - 100;
    ctx.globalAlpha = 0.9;
    ellipse(x, c.y, 40 * c.s, 14 * c.s, '#fff'); ellipse(x + 25 * c.s, c.y - 8 * c.s, 26 * c.s, 14 * c.s, '#fff');
    ctx.globalAlpha = 1;
  }
}
function drawTrees(y) {
  for (let i = 0; i < 26; i++) {
    const x = i * 40 + (i % 3) * 7;
    circle(x, y - 12 - (i % 4) * 6, 26 + (i % 3) * 5, i % 2 ? '#2e7d3c' : '#276b33');
  }
}
function drawFence(y, signs = true) {
  ctx.fillStyle = '#1f5a36'; ctx.fillRect(0, y - 40, W, 40);
  ctx.fillStyle = GOLD; ctx.fillRect(0, y - 44, W, 6);
  if (!signs) return;
  const boards = [['AUBURN PARK', GOLD, INK], ['GO TIGERS!', INK, GOLD], ['#22', GOLD, INK], ['WATERLOO, ON', CREAM, INK]];
  boards.forEach(([label, bg, fg], i) => {
    const x = 40 + i * 235;
    ctx.fillStyle = bg; ctx.fillRect(x, y - 34, 170, 28);
    text(label, x + 85, y - 20, { size: 15, color: fg });
  });
}
function drawGrass(y0, y1) {
  for (let i = 0; y0 + i * 30 < y1; i++) {
    ctx.fillStyle = i % 2 ? '#4fa651' : '#58b35a';
    ctx.fillRect(0, y0 + i * 30, W, 30);
  }
}

function hud(title, left, right) {
  ctx.fillStyle = 'rgba(20,20,20,.85)'; ctx.fillRect(0, 0, W, 44);
  ctx.fillStyle = GOLD; ctx.fillRect(0, 44, W, 3);
  drawLogo(28, 22, 36);
  text(title, 54, 23, { size: 18, color: GOLD, align: 'left' });
  text(left, 560, 23, { size: 18, color: '#fff' });
  text(right, W - 20, 23, { size: 18, color: '#fff', align: 'right' });
}

// ---------------------------------------------------------------- effects
const floaters = [];
function say(str, x, y, color = GOLD, size = 30) { floaters.push({ str, x, y, color, size, life: 1.3 }); }
const confetti = [];
function burst(x, y, n = 60) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), v = rand(120, 420);
    confetti.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, life: rand(1, 2), c: [GOLD, INK, '#fff', GOLD_D][i % 4], r: rand(0, TAU) });
  }
}
function updateFx(dt) {
  for (const f of floaters) { f.life -= dt; f.y -= 40 * dt; }
  for (const c of confetti) { c.life -= dt; c.vy += 600 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.r += dt * 8; }
  for (const list of [floaters, confetti]) for (let i = list.length - 1; i >= 0; i--) if (list[i].life <= 0) list.splice(i, 1);
}
function drawFx() {
  for (const c of confetti) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); ctx.fillStyle = c.c; ctx.fillRect(-4, -2, 8, 4); ctx.restore();
  }
  for (const f of floaters) text(f.str, f.x, f.y, { size: f.size, color: f.color, stroke: INK, lw: 6, alpha: Math.min(1, f.life * 2) });
}

// ---------------------------------------------------------------- scenes
let scene;
function go(s, ...args) { floaters.length = 0; scene = s; s.enter && s.enter(...args); }
function finish(id, score, detail) { go(Results, id, score, detail); }

// Every drill starts with a "how to play" card.
function readyGate(s) {
  if (!s.ready) return false;
  if (action()) { s.ready = false; sfx.tick(); }
  return true;
}
function drawReadyCard(d) {
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H);
  rrect(210, 110, 540, 320, 20); ctx.fillStyle = CREAM; ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
  rrect(210, 110, 540, 70, [20, 20, 0, 0]); ctx.fillStyle = INK; ctx.fill();
  text(`${d.icon}  ${d.name}`, W / 2, 146, { size: 28, color: GOLD });
  d.how.forEach((line, i) => text(line, W / 2, 222 + i * 40, { size: 20, font: BODY, weight: 800 }));
  const target = d.stars.map(v => fmt(d, v)).join('  ·  ');
  text(`★ ${target}`, W / 2, 350, { size: 16, font: BODY, weight: 800, color: '#8a6400' });
  text(Math.sin(T * 5) > -0.3 ? 'Press Space or tap to start' : '', W / 2, 398, { size: 18, color: INK });
}

// ---- Title
const Title = {
  update() { if (action()) { sfx.good(); go(Menu); } },
  draw() {
    drawSky(330); drawTrees(330); drawFence(360); drawGrass(360, H);
    // infield dirt
    ctx.beginPath(); ctx.ellipse(W / 2, 560, 520, 150, 0, 0, TAU); ctx.fillStyle = '#c8905a'; ctx.fill();
    drawLogo(W / 2, 128, 170);
    text('AUDEN\'S PRACTICE DAY', W / 2, 250, { size: 48, color: GOLD, stroke: INK, lw: 10 });
    text('Auden Milligan  ·  #22  ·  11U Tier 2 Waterloo Tigers', W / 2, 296, { size: 20, font: BODY, weight: 900, color: '#fff', stroke: INK, lw: 5 });
    drawKid(150, 500, 1.6, { h1: { x: -22, y: -118 + Math.sin(T * 6) * 6 }, h2: { x: 21, y: -52 } });
    drawKid(810, 500, 1.6, { back: true, h1: { x: -21, y: -52 }, h2: { x: 21, y: -52 } });
    if (Math.sin(T * 5) > -0.3) text('Press Space or tap to play ball!', W / 2, 440, { size: 24, color: INK, stroke: GOLD, lw: 6 });
  },
};

// ---- Menu (the practice card)
const Menu = {
  enter() { this.sel = 0; this.lastSel = 0; },
  update() {
    DRILLS.forEach((d, i) => { if (input.pressed.has(String(i + 1))) this.start(i); });
    if (input.pressed.has('ArrowRight')) this.sel = (this.sel + 1) % 4;
    if (input.pressed.has('ArrowLeft')) this.sel = (this.sel + 3) % 4;
    if (input.lastDevice === 'pointer') {
      const i = this.cardAt(input.mx, input.my);
      if (i >= 0) this.sel = i;
      if (input.clicked && i >= 0) this.start(i);
    } else if (action()) this.start(this.sel);
    if (this.sel !== this.lastSel) { sfx.tick(); this.lastSel = this.sel; }
  },
  start(i) { sfx.good(); go(SCENES[DRILLS[i].id]); },
  cardAt(x, y) {
    for (let i = 0; i < 4; i++) { const cx = 40 + i * 225; if (x > cx && x < cx + 205 && y > 180 && y < 420) return i; }
    return -1;
  },
  draw() {
    drawSky(140); drawTrees(140); drawFence(160, false); drawGrass(160, H);
    drawLogo(70, 74, 100);
    text('PRACTICE CARD', 140, 60, { size: 38, color: GOLD, stroke: INK, lw: 8, align: 'left' });
    text('Auden Milligan #22  ·  Auburn Park, Waterloo', 142, 102, { size: 18, font: BODY, weight: 900, color: '#fff', stroke: INK, lw: 4, align: 'left' });
    let total = 0, allOne = true;
    DRILLS.forEach((d, i) => {
      const x = 40 + i * 225, y = 180, sel = i === this.sel;
      const n = starsFor(d, best[d.id]); total += n; if (!n) allOne = false;
      rrect(x, y + 6, 205, 240, 16); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fill();
      rrect(x, y - (sel ? 6 : 0), 205, 240, 16); ctx.fillStyle = CREAM; ctx.fill();
      ctx.lineWidth = sel ? 5 : 3; ctx.strokeStyle = sel ? GOLD : INK; ctx.stroke();
      const oy = sel ? -6 : 0;
      rrect(x, y + oy, 205, 44, [16, 16, 0, 0]); ctx.fillStyle = INK; ctx.fill();
      text(`${i + 1}. ${d.skill.toUpperCase()}`, x + 102, y + 23 + oy, { size: 16, color: GOLD });
      text(d.icon, x + 102, y + 95 + oy, { size: 56, font: 'serif' });
      text(d.name, x + 102, y + 150 + oy, { size: 19, font: BODY, weight: 900 });
      stars(x + 102, y + 185 + oy, n, 26);
      text(best[d.id] ? `Best: ${fmt(d, best[d.id])}` : 'Not tried yet', x + 102, y + 218 + oy, { size: 15, font: BODY, weight: 800, color: '#555' });
    });
    const coach = total >= 12 ? 'ALL-STAR! Coach says you\'re the Tigers MVP!'
      : allOne ? 'Coach: You\'re in the lineup vs. the Guelph Royals!'
      : total >= 3 ? 'Coach: Looking sharp, #22. Keep it up!'
      : 'Coach: Let\'s get some reps in before the game, Auden!';
    rrect(40, 450, 880, 64, 14); ctx.fillStyle = 'rgba(20,20,20,.85)'; ctx.fill();
    text(`★ ${total}/12`, 70, 482, { size: 24, color: GOLD, align: 'left' });
    text(coach, 540, 482, { size: 19, font: BODY, weight: 900, color: '#fff' });
  },
};

// ---- Catching: Pop Fly Patrol
const Catching = {
  LEN: 45, GROUND: 492, CATCH_Y: 342, HORIZON: 208,
  enter() {
    Object.assign(this, { ready: true, t: this.LEN, score: 0, combo: 0, caught: 0, dropped: 0, balls: [], spawn: 0.6, px: W / 2, moving: false });
  },
  update(dt) {
    if (readyGate(this)) return;
    this.t = Math.max(0, this.t - dt);
    if (this.t <= 0 && !this.balls.length) return finish('catching', this.score, `${this.caught} catches · ${this.dropped} dropped`);
    const dir = (held('ArrowRight', 'd') ? 1 : 0) - (held('ArrowLeft', 'a') ? 1 : 0), sp = 440;
    const before = this.px;
    if (dir) this.px += dir * sp * dt;
    else if (input.lastDevice === 'pointer') { const d = input.mx - this.px; this.px += Math.sign(d) * Math.min(Math.abs(d), sp * dt); }
    this.px = clamp(this.px, 40, W - 40);
    this.moving = Math.abs(this.px - before) > 0.5;
    if (this.t > 0 && (this.spawn -= dt) <= 0) {
      const p = 1 - this.t / this.LEN;
      this.spawn = 1.5 - p * 0.8 + rand(0, 0.4);
      this.balls.push({ sx: W / 2 + rand(-120, 120), tx: rand(60, W - 60), age: 0, flight: 2.6 - p * 0.9 + rand(0, 0.5), gold: Math.random() < 0.12 });
    }
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.age += dt;
      if (b.age < b.flight) continue;
      this.balls.splice(i, 1);
      if (Math.abs(b.tx - this.px) < 44) {
        this.caught++; this.combo++;
        let pts = b.gold ? 3 : 1;
        if (this.combo % 5 === 0) { pts += 2; say(`${this.combo} in a row! +2`, this.px, 250, '#fff', 26); sfx.great(); }
        this.score += pts; sfx.pop();
        say(b.gold ? 'GOLDEN! +3' : 'Got it!', this.px, 300);
      } else {
        this.dropped++; this.combo = 0; sfx.thud();
        say('Dropped!', b.tx, 420, '#ff6b5a', 26);
      }
    }
  },
  draw() {
    const hz = this.HORIZON;
    drawSky(hz);
    drawTrees(hz - 30);
    // distant infield at Auburn Park: backstop, dirt, bases
    ctx.fillStyle = '#9aa0a6'; ctx.fillRect(W / 2 - 150, hz - 70, 300, 50);
    ctx.strokeStyle = '#6b7075'; ctx.lineWidth = 1;
    for (let x = W / 2 - 150; x <= W / 2 + 150; x += 8) { ctx.beginPath(); ctx.moveTo(x, hz - 70); ctx.lineTo(x, hz - 20); ctx.stroke(); }
    drawGrass(hz - 20, H);
    ctx.beginPath(); ctx.ellipse(W / 2, hz, 260, 34, 0, 0, TAU); ctx.fillStyle = '#c8905a'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(W / 2 - 4, hz + 20, 8, 5);
    for (const [bx, by] of [[W / 2 - 150, hz], [W / 2 + 150, hz], [W / 2, hz - 20]]) ctx.fillRect(bx - 5, by - 2, 10, 5);
    drawKid(W / 2, hz + 22, 0.35, { bat: -2.2, face: 1, script: '' });
    // shadows + balls
    for (const b of this.balls) {
      const t = b.age / b.flight;
      ctx.globalAlpha = 0.1 + t * 0.35;
      ellipse(b.tx, this.GROUND, 6 + 22 * t, 3 + 7 * t, b.gold ? GOLD_D : INK);
      ctx.globalAlpha = 1;
    }
    const near = this.balls.some(b => b.age / b.flight > 0.6 && Math.abs(b.tx - this.px) < 90);
    drawKid(this.px, this.GROUND, 1.3, {
      back: true, running: this.moving,
      h1: near ? { x: -12, y: -118 } : { x: -21, y: -52 }, h2: near ? { x: 12, y: -114 } : { x: 21, y: -52 },
    });
    for (const b of this.balls) {
      const t = b.age / b.flight;
      const x = lerp(b.sx, b.tx, t), y = lerp(hz + 10, this.CATCH_Y, t) - Math.sin(Math.PI * t) * 360;
      if (y < 50) { // off the top: show a little arrow
        text('▲', x, 62, { size: 16, color: b.gold ? GOLD : '#fff', stroke: INK, lw: 3 });
      } else drawBaseball(x, y, 3 + 7 * t, b.gold);
    }
    hud('POP FLY PATROL', `Catches ${this.caught}${this.combo > 1 ? `  ·  🔥${this.combo}` : ''}`, `${this.score} pts  ·  ⏱ ${Math.ceil(this.t)}`);
    if (this.ready) drawReadyCard(drill('catching'));
  },
};

// ---- Batting: Cage Crusher
const Batting = {
  PITCHES: 12, GROUND: 450, PLATE_X: 250, SWEET_X: 284, CONTACT: 0.115, MACHINE: { x: 760, y: 338 },
  PITCH_TYPES: [
    { name: 'Fastball', kmh: 72, travel: 0.72 },
    { name: 'Heater', kmh: 64, travel: 0.84 },
    { name: 'Changeup', kmh: 52, travel: 1.12 },
  ],
  GRADES: [
    { max: 0.025, label: 'HOME RUN!', pts: 4, vx: 950, vy: -640, color: GOLD },
    { max: 0.045, label: 'TRIPLE!', pts: 3, vx: 820, vy: -420, color: GOLD },
    { max: 0.07, label: 'DOUBLE!', pts: 2, vx: 720, vy: -280, color: '#fff' },
    { max: 0.10, label: 'Single', pts: 1, vx: 560, vy: -130, color: '#fff' },
    { max: 0.15, label: 'Foul ball', pts: 0, vx: -260, vy: -720, color: '#ddd' },
  ],
  enter() {
    Object.assign(this, { ready: true, n: 0, score: 0, hits: 0, homers: 0, state: 'wait', wait: 1, ball: null, swingT: -1, pending: null, pitch: null });
  },
  newPitch() {
    this.n++;
    const type = this.PITCH_TYPES[Math.floor(Math.random() * 3)];
    const high = Math.random() < 0.25;
    this.pitch = { ...type, high, travel: type.travel + rand(-0.04, 0.04) };
    this.ball = { x: this.MACHINE.x, y: this.MACHINE.y, age: 0, ty: high ? 262 : 372, state: 'pitch' };
    this.state = 'pitch'; this.swingT = -1; this.pending = null;
    audio.tone(120, 0.12, 'square', 0.08, 60);
  },
  resolve(label, pts, color = '#fff') {
    this.score += pts; this.state = 'after'; this.wait = 1.4;
    say(pts ? `${label} +${pts}` : label, 520, 170, color, label.startsWith('HOME') ? 44 : 32);
  },
  update(dt) {
    if (readyGate(this)) return;
    if (this.swingT >= 0) this.swingT += dt;
    if (this.state === 'wait' || this.state === 'after') {
      if (this.ball && this.ball.state === 'hit') this.moveHit(dt);
      if ((this.wait -= dt) <= 0) {
        if (this.n >= this.PITCHES) return finish('batting', this.score, `${this.hits} hits · ${this.homers} homers`);
        this.state = 'windup'; this.wait = rand(0.5, 1.1);
      }
      return;
    }
    if (this.state === 'windup') { if ((this.wait -= dt) <= 0) this.newPitch(); return; }
    // state === 'pitch'
    const b = this.ball, p = this.pitch;
    if (b.state === 'pitch') {
      b.age += dt;
      const u = b.age / p.travel;
      b.x = lerp(this.MACHINE.x, this.SWEET_X, u);
      b.y = lerp(this.MACHINE.y, b.ty, u) - Math.sin(Math.PI * Math.min(u, 1)) * 18;
      if (action() && this.swingT < 0) {
        this.swingT = 0; sfx.whoosh();
        const err = (p.travel - b.age) - this.CONTACT;
        const g = this.GRADES.find(g => Math.abs(err) < g.max);
        this.pending = { at: b.age + this.CONTACT, grade: g, early: err > 0 };
      }
      if (this.pending && b.age >= this.pending.at) {
        const g = this.pending.grade; this.pending = null;
        if (!g) { /* swing and a miss: ball keeps going */ }
        else if (p.high) {
          b.state = 'hit'; b.vx = -200; b.vy = -800; sfx.crack();
          return this.resolve('Chased a high one — pop-up', 0, '#ddd');
        } else {
          b.state = 'hit'; b.vx = g.vx; b.vy = g.vy; sfx.crack();
          if (g.pts) { this.hits++; if (g.pts === 4) { this.homers++; sfx.great(); burst(520, 200); } else if (g.pts > 1) sfx.good(); }
          return this.resolve(g.label, g.pts, g.color);
        }
      }
      if (b.x < 120) {
        b.state = 'past';
        if (this.swingT >= 0) { sfx.thud(); this.resolve(p.high ? 'Strike — that was high!' : 'Swing and a miss!', 0, '#ff6b5a'); }
        else if (p.high) { sfx.good(); this.resolve('Ball! Good eye', 1, '#9fe3a3'); }
        else { sfx.thud(); this.resolve('Strike looking', 0, '#ff6b5a'); }
      }
    }
  },
  moveHit(dt) {
    const b = this.ball;
    b.vy += 700 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y > this.GROUND - 4 && b.vy > 0) { b.y = this.GROUND - 4; b.vy *= -0.45; b.vx *= 0.7; }
  },
  draw() {
    drawSky(300); drawTrees(270); drawFence(300); drawGrass(300, H);
    // dirt around plate + mound
    ctx.beginPath(); ctx.ellipse(this.PLATE_X, this.GROUND + 8, 170, 38, 0, 0, TAU); ctx.fillStyle = '#c8905a'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(this.MACHINE.x, this.GROUND + 8, 150, 30, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(this.PLATE_X - 22, this.GROUND + 2, 44, 6);
    // backstop net
    ctx.fillStyle = 'rgba(40,40,40,.25)'; ctx.fillRect(40, 200, 70, this.GROUND - 200);
    ctx.strokeStyle = 'rgba(30,30,30,.5)'; ctx.lineWidth = 1;
    for (let y = 200; y < this.GROUND; y += 12) { ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(110, y); ctx.stroke(); }
    for (let x = 40; x <= 110; x += 12) { ctx.beginPath(); ctx.moveTo(x, 200); ctx.lineTo(x, this.GROUND); ctx.stroke(); }
    // pitching machine
    const m = this.MACHINE;
    seg(m.x + 10, m.y + 20, m.x - 20, this.GROUND, 6, '#555'); seg(m.x + 10, m.y + 20, m.x + 40, this.GROUND, 6, '#555');
    seg(m.x + 10, m.y + 20, m.x + 10, this.GROUND, 6, '#444');
    circle(m.x + 18, m.y, 26, '#2f5d9e'); circle(m.x + 18, m.y, 10, '#222');
    ctx.save(); ctx.translate(m.x + 18, m.y); ctx.rotate(T * (this.state === 'windup' ? 20 : 4));
    ctx.fillStyle = '#89a8d6'; ctx.fillRect(-2, -24, 4, 48); ctx.restore();
    seg(m.x - 6, m.y, m.x - 34, m.y + 2, 10, '#666');
    rrect(m.x + 50, m.y - 70, 110, 44, 8); ctx.fillStyle = INK; ctx.fill();
    text(this.state === 'pitch' || this.state === 'after' ? `${this.pitch.kmh} km/h` : '— km/h', m.x + 105, m.y - 48, { size: 18, color: '#ff5a3c', font: 'monospace', weight: 700 });
    text('IRON MIKE', m.x + 18, m.y + 44, { size: 11, color: '#fff', stroke: INK, lw: 3 });
    if (this.state === 'windup') circle(m.x + 18, m.y - 36, 6, Math.sin(T * 20) > 0 ? '#ff4136' : '#661a16');
    // Auden
    const SW = 0.17;
    let bat = -2.3;
    if (this.swingT >= 0) bat = -2.3 + clamp(this.swingT / SW, 0, 1) * 3.3;
    drawKid(this.PLATE_X - 40, this.GROUND, 1.25, { bat, stance: 6, mouth: this.swingT >= 0 && this.swingT < 0.4 ? 'o' : null });
    // ball
    if (this.ball && this.ball.state !== 'past') {
      if (this.ball.state === 'pitch') ellipse(this.ball.x, this.GROUND + 4, 6, 2, 'rgba(0,0,0,.25)');
      drawBaseball(this.ball.x, this.ball.y, 7);
    }
    hud('CAGE CRUSHER', `Pitch ${Math.min(this.n, this.PITCHES)}/${this.PITCHES}  ·  Hits ${this.hits}`, `${this.score} pts`);
    if (this.ready) drawReadyCard(drill('batting'));
  },
};

// ---- Fielding: Grounder Gauntlet (Auden plays short)
const HOME = { x: 480, y: 505 }, FIRST = { x: 668, y: 330 }, SECOND = { x: 480, y: 160 }, THIRD = { x: 292, y: 330 };
const SS = { x: 385, y: 230 };
const Fielding = {
  REPS: 8,
  enter() {
    Object.assign(this, { ready: true, n: 0, outs: 0, state: 'wait', wait: 1, ball: null, runner: null, aud: { ...SS }, moving: false });
  },
  newGrounder() {
    this.n++;
    const tx = SS.x + rand(-120, 120), ty = SS.y + rand(-50, 30);
    const dx = tx - HOME.x, dy = ty - HOME.y, d = Math.hypot(dx, dy), sp = rand(300, 420) + this.n * 8;
    this.ball = { x: HOME.x, y: HOME.y - 20, vx: dx / d * sp, vy: dy / d * sp, h: 0 };
    const fast = Math.random() < 0.25;
    this.runner = { p: 0, time: fast ? 2.75 : rand(3.1, 3.6), fast };
    this.aud = { ...SS }; this.clock = 0; this.state = 'rolling';
    sfx.crack();
    if (fast) say('Speedy runner!', HOME.x + 120, HOME.y - 40, '#9fd0ff', 22);
  },
  result(label, out, color) {
    if (out) { this.outs++; sfx.good(); } else sfx.bad();
    say(label, 480, 110, color, 34);
    this.state = 'result'; this.wait = 1.5;
  },
  update(dt) {
    if (readyGate(this)) return;
    if (this.state === 'wait' || this.state === 'result') {
      if (this.runner) this.runner.p = clamp(this.runner.p + dt / this.runner.time, 0, 1);
      if ((this.wait -= dt) <= 0) {
        if (this.n >= this.REPS) return finish('fielding', this.outs, `${this.outs} of ${this.REPS} runners thrown out`);
        this.newGrounder();
      }
      return;
    }
    this.clock += dt;
    this.runner.p = clamp((this.clock - 0.25) / this.runner.time, 0, 1);
    const b = this.ball, a = this.aud;
    this.moving = false;
    if (this.state === 'rolling') {
      // move Auden
      let dx = (held('ArrowRight', 'd') ? 1 : 0) - (held('ArrowLeft', 'a') ? 1 : 0);
      let dy = (held('ArrowDown', 's') ? 1 : 0) - (held('ArrowUp', 'w') ? 1 : 0);
      const sp = 270;
      if (dx || dy) { const m = Math.hypot(dx, dy); a.x += dx / m * sp * dt; a.y += dy / m * sp * dt; this.moving = true; }
      else if (input.lastDevice === 'pointer') {
        const d = Math.hypot(input.mx - a.x, input.my - a.y);
        if (d > 4) { const s = Math.min(d, sp * dt); a.x += (input.mx - a.x) / d * s; a.y += (input.my - a.y) / d * s; this.moving = true; }
      }
      a.x = clamp(a.x, 160, 800); a.y = clamp(a.y, 100, 470);
      // roll the ball
      const f = Math.max(0, 1 - 0.45 * dt);
      b.vx *= f; b.vy *= f; b.x += b.vx * dt; b.y += b.vy * dt;
      b.h = Math.abs(Math.sin(this.clock * 9)) * 10 * Math.min(1, Math.hypot(b.vx, b.vy) / 400);
      if (dist(a, b) < 26) { this.state = 'holding'; this.needleT = rand(0, 3); sfx.pop(); say('Scooped!', a.x, a.y - 80, '#fff', 22); }
      else if (b.y < 95 || b.x < 150 || b.x > 810) this.result('Through for a hit!', false, '#ff6b5a');
      else if (this.runner.p >= 1 && Math.hypot(b.vx, b.vy) < 25) this.result('Too slow — infield single', false, '#ff6b5a');
    } else if (this.state === 'holding') {
      this.needleT += dt;
      this.needle = Math.sin(this.needleT * 4.2);
      b.x = a.x + 10; b.y = a.y - 40; b.h = 0;
      if (action()) {
        const n = Math.abs(this.needle);
        const zone = n < 0.28 ? 'green' : n < 0.62 ? 'yellow' : 'red';
        const target = zone === 'red' ? { x: FIRST.x + 70, y: FIRST.y + (this.needle > 0 ? 90 : -90) } : { x: FIRST.x, y: FIRST.y - 30 };
        this.throw = { from: { x: b.x, y: b.y }, to: target, t: 0, dur: dist(b, target) / 760, extra: zone === 'yellow' ? 0.3 : 0, zone };
        this.state = 'throw'; sfx.whoosh();
      }
    } else if (this.state === 'throw') {
      const th = this.throw;
      th.t += dt;
      const u = clamp(th.t / th.dur, 0, 1);
      b.x = lerp(th.from.x, th.to.x, u); b.y = lerp(th.from.y, th.to.y, u); b.h = Math.sin(Math.PI * u) * 30;
      if (th.t >= th.dur + th.extra) {
        if (th.zone === 'red') this.result('Wild throw! E6', false, '#ff6b5a');
        else if (this.runner.p < 1) { sfx.pop(); this.result(th.zone === 'yellow' ? 'Great scoop — OUT!' : 'OUT! 6-3', true, GOLD); }
        else this.result('Safe! Just beat it', false, '#ff6b5a');
      }
    }
  },
  draw() {
    // top-down diamond at Auburn Park
    ctx.fillStyle = '#4c9f4e'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.03)'; ctx.fillRect(i * 80, 0, 80, H); }
    ctx.fillStyle = '#1f5a36'; ctx.fillRect(0, 0, W, 80); ctx.fillStyle = GOLD; ctx.fillRect(0, 78, W, 5);
    // infield dirt
    ctx.beginPath(); ctx.moveTo(HOME.x, HOME.y + 30);
    ctx.lineTo(FIRST.x + 50, FIRST.y); ctx.quadraticCurveTo(HOME.x, 40, THIRD.x - 50, THIRD.y); ctx.closePath();
    ctx.fillStyle = '#c8905a'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(HOME.x, HOME.y - 40); ctx.lineTo(FIRST.x - 45, FIRST.y); ctx.lineTo(SECOND.x, SECOND.y + 45); ctx.lineTo(THIRD.x + 45, THIRD.y); ctx.closePath();
    ctx.fillStyle = '#58b35a'; ctx.fill();
    circle(480, 335, 26, '#c8905a');
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(HOME.x, HOME.y); ctx.lineTo(FIRST.x + 200, FIRST.y - 190); ctx.moveTo(HOME.x, HOME.y); ctx.lineTo(THIRD.x - 200, THIRD.y - 190); ctx.stroke();
    for (const bs of [FIRST, SECOND, THIRD]) { ctx.fillStyle = '#fff'; ctx.save(); ctx.translate(bs.x, bs.y); ctx.rotate(Math.PI / 4); ctx.fillRect(-8, -8, 16, 16); ctx.restore(); }
    ctx.beginPath(); ctx.moveTo(HOME.x - 10, HOME.y); ctx.lineTo(HOME.x + 10, HOME.y); ctx.lineTo(HOME.x + 10, HOME.y + 8); ctx.lineTo(HOME.x, HOME.y + 14); ctx.lineTo(HOME.x - 10, HOME.y + 8); ctx.fill();
    text('AUBURN PARK  ·  WATERLOO TIGERS vs GUELPH ROYALS', W / 2, 63, { size: 16, color: GOLD });
    // teammates + runner (the Guelph Royals are in town)
    drawKid(FIRST.x + 12, FIRST.y + 8, 0.55, { h1: { x: -34, y: -70 } });
    drawKid(HOME.x + 40, HOME.y + 22, 0.5, { back: true, number: '7', name: 'COACH', jersey: '#555', trim: '#fff', h1: { x: -18, y: -60 } });
    if (this.runner) {
      const r = this.runner, rx = lerp(HOME.x + 14, FIRST.x - 8, r.p), ry = lerp(HOME.y + 10, FIRST.y + 16, r.p);
      drawKid(rx, ry, 0.55, { jersey: '#1d4fa3', trim: '#fff', capLetter: 'G', script: 'Royals', running: r.p > 0 && r.p < 1, glove: false });
    }
    // Auden
    const holding = this.state === 'holding' || (this.state === 'throw' && this.throw.t < 0.15);
    drawKid(this.aud.x, this.aud.y, 0.62, { running: this.moving, h2: holding ? { x: 18, y: -110 } : undefined, ball: holding });
    text('#22', this.aud.x, this.aud.y + 16, { size: 12, color: GOLD, stroke: INK, lw: 3 });
    // ball
    if (this.ball && this.state !== 'holding') {
      ellipse(this.ball.x, this.ball.y + 2, 6, 3, 'rgba(0,0,0,.3)');
      drawBaseball(this.ball.x, this.ball.y - this.ball.h, 6);
    }
    // throw meter
    if (this.state === 'holding') {
      const cx = this.aud.x, cy = this.aud.y - 110;
      rrect(cx - 80, cy - 14, 160, 28, 14); ctx.fillStyle = INK; ctx.fill();
      ctx.fillStyle = '#e74c3c'; ctx.fillRect(cx - 72, cy - 7, 144, 14);
      ctx.fillStyle = '#f1c40f'; ctx.fillRect(cx - 72 * 0.62, cy - 7, 144 * 0.62, 14);
      ctx.fillStyle = '#2ecc71'; ctx.fillRect(cx - 72 * 0.28, cy - 7, 144 * 0.28, 14);
      const nx = cx + this.needle * 72;
      seg(nx, cy - 14, nx, cy + 14, 4, '#fff');
      text('THROW!', cx, cy - 28, { size: 16, color: GOLD, stroke: INK, lw: 4 });
    }
    hud('GROUNDER GAUNTLET', `Grounder ${Math.min(this.n, this.REPS)}/${this.REPS}`, `${this.outs} outs`);
    if (this.ready) drawReadyCard(drill('fielding'));
  },
};

// ---- Seeds: Sunflower Showdown (in the dugout)
const FLAVOURS = ['Original', 'Dill Pickle', 'BBQ', 'Ranch', 'Salt & Vinegar', 'Sweet & Salty', 'Jalapeño'];
const Seeds = {
  SPITS: 5, GROUND: 450, MOUTH: { x: 146, y: 324 }, PPM: 74, G: 900,
  enter() {
    Object.assign(this, { ready: true, n: 0, bestDist: 0, marks: [], state: 'aim', t: 0 });
    this.newSpit();
  },
  newSpit() {
    this.n++;
    this.state = 'aim'; this.t = rand(0, 2);
    this.wind = Math.round(rand(-3, 3) * 10) / 10; // m/s, + = helping
    this.flavour = FLAVOURS[Math.floor(Math.random() * FLAVOURS.length)];
    this.seed = null; this.angle = 0; this.power = 0; this.spitT = 0;
  },
  update(dt) {
    if (readyGate(this)) return;
    this.t += dt;
    if (this.state === 'aim') {
      this.angle = 35 + 30 * Math.sin(this.t * 2.4);
      if (action()) { this.state = 'power'; this.t = 0; sfx.tick(); }
    } else if (this.state === 'power') {
      const ph = (this.t * 1.5) % 2; this.power = ph < 1 ? ph : 2 - ph;
      if (action()) {
        const v = 250 + this.power * 430, a = this.angle * Math.PI / 180;
        this.seed = { x: this.MOUTH.x, y: this.MOUTH.y, vx: Math.cos(a) * v, vy: -Math.sin(a) * v, r: 0 };
        this.state = 'flight'; this.spitT = 0; sfx.ptoo();
      }
    } else if (this.state === 'flight') {
      const s = this.seed;
      this.spitT += dt;
      s.vx += this.wind * 18 * dt; s.vy += this.G * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += dt * 18;
      const wall = W - 24;
      if (s.x >= wall) { s.x = wall; s.vx = 0; }
      if (s.y >= this.GROUND - 3) {
        s.y = this.GROUND - 3;
        const d = Math.max(0, (s.x - this.MOUTH.x) / this.PPM);
        this.marks.push(s.x);
        let msg = `${d.toFixed(2)} m`, color = '#fff';
        if (d > this.bestDist) { this.bestDist = d; if (this.n > 1) { msg += ' — new best!'; color = GOLD; } }
        if (s.x >= wall) { msg = 'Off the wall! ' + msg; burst(s.x, s.y); sfx.great(); }
        else if (d < 1.5) { msg = 'Dribbled down the chin!'; sfx.bad(); }
        else if (d >= 7.5) { msg = 'SUPER SPIT! ' + msg; burst(s.x, s.y - 20); sfx.great(); }
        else sfx.good();
        say(msg, clamp(s.x, 180, W - 180), 250, color, 28);
        this.state = 'landed'; this.t = 0;
      }
    } else if (this.state === 'landed' && this.t > 1.5) {
      if (this.n >= this.SPITS) return finish('seeds', Math.round(this.bestDist * 100) / 100, `Best of ${this.SPITS} spits`);
      this.newSpit();
    }
  },
  draw() {
    // dugout: block wall, bench, bat rack, dirt floor
    ctx.fillStyle = '#7b7f85'; ctx.fillRect(0, 0, W, this.GROUND);
    ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 2;
    for (let y = 60, r = 0; y < this.GROUND; y += 34, r++) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      for (let x = (r % 2) * 40; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 34); ctx.stroke(); }
    }
    ctx.fillStyle = INK; ctx.fillRect(0, 0, W, 60); ctx.fillStyle = GOLD; ctx.fillRect(0, 56, W, 6);
    drawLogo(560, 160, 120);
    text('TIGERS DUGOUT', 560, 250, { size: 26, color: GOLD, stroke: INK, lw: 6 });
    // bat rack
    for (let i = 0; i < 6; i++) seg(780 + i * 22, 110, 780 + i * 22, 250, 7, i % 2 ? '#c98d45' : '#555');
    ctx.fillStyle = '#5a3d1e'; ctx.fillRect(765, 240, 140, 14);
    // bench
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(200, 370, 520, 14); ctx.fillRect(220, 384, 10, 66); ctx.fillRect(690, 384, 10, 66);
    // water jug + seed bag on bench
    rrect(620, 318, 50, 52, 8); ctx.fillStyle = '#e67e22'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(620, 330, 50, 8);
    rrect(250, 332, 44, 38, 6); ctx.fillStyle = '#2f7d32'; ctx.fill();
    text('🌻', 272, 350, { size: 20, font: 'serif' });
    // floor + metre markers
    ctx.fillStyle = '#b98b5a'; ctx.fillRect(0, this.GROUND, W, H - this.GROUND);
    for (let m = 1; m <= 10; m++) {
      const x = this.MOUTH.x + m * this.PPM; if (x > W - 10) break;
      seg(x, this.GROUND, x, this.GROUND + 16, 2, '#fff');
      text(`${m}m`, x, this.GROUND + 32, { size: 14, color: '#fff', font: BODY, weight: 900 });
    }
    if (this.bestDist > 0) {
      const bx = this.MOUTH.x + this.bestDist * this.PPM;
      seg(bx, this.GROUND - 40, bx, this.GROUND, 3, INK);
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(bx, this.GROUND - 40); ctx.lineTo(bx + 30, this.GROUND - 32); ctx.lineTo(bx, this.GROUND - 24); ctx.fill();
      text('BEST', bx + 12, this.GROUND - 32, { size: 8, color: INK });
    }
    for (const x of this.marks) this.drawSeed(x, this.GROUND - 3, 0.3);
    // Auden
    const spitting = this.state === 'flight' && this.spitT < 0.25;
    const loading = this.state === 'aim' || this.state === 'power';
    drawKid(this.MOUTH.x - 20, this.GROUND, 1.3, { mouth: spitting ? 'o' : loading ? 'puff' : null, stance: 4, h1: { x: -18, y: -52 } });
    // aim + power
    if (this.state === 'aim' || this.state === 'power') {
      const a = this.angle * Math.PI / 180, L = 90;
      ctx.setLineDash([6, 6]);
      seg(this.MOUTH.x, this.MOUTH.y, this.MOUTH.x + Math.cos(a) * L, this.MOUTH.y - Math.sin(a) * L, 3, this.state === 'aim' ? '#fff' : GOLD);
      ctx.setLineDash([]);
      text(`${Math.round(this.angle)}°`, this.MOUTH.x + Math.cos(a) * (L + 22), this.MOUTH.y - Math.sin(a) * (L + 22), { size: 14, color: '#fff', stroke: INK, lw: 3 });
    }
    if (this.state === 'power') {
      rrect(30, 150, 30, 200, 8); ctx.fillStyle = INK; ctx.fill();
      const g = ctx.createLinearGradient(0, 345, 0, 155); g.addColorStop(0, '#2ecc71'); g.addColorStop(0.7, '#f1c40f'); g.addColorStop(1, '#e74c3c');
      ctx.fillStyle = g; ctx.fillRect(35, 345 - 190 * this.power, 20, 190 * this.power);
      text('POWER', 45, 136, { size: 12, color: '#fff', stroke: INK, lw: 3 });
    }
    if (this.seed) this.drawSeed(this.seed.x, this.seed.y, this.seed.r);
    // wind flag
    const wx = 900, wy = 285;
    seg(wx, wy, wx, wy + 60, 3, '#ccc');
    const flap = Math.sin(T * 8) * 3, len = 12 + Math.abs(this.wind) * 10, dir = this.wind >= 0 ? 1 : -1;
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + dir * len, wy + 8 + flap); ctx.lineTo(wx, wy + 18); ctx.fill();
    text(`Wind ${this.wind >= 0 ? '→' : '←'} ${Math.abs(this.wind * 3.6).toFixed(0)} km/h`, wx - 20, wy + 78, { size: 14, color: '#fff', stroke: INK, lw: 4, align: 'right' });
    text(`Bag: ${this.flavour}`, 272, 310, { size: 14, font: BODY, weight: 900, color: '#fff', stroke: INK, lw: 4 });
    hud('SUNFLOWER SHOWDOWN', `Spit ${this.n}/${this.SPITS}`, `Best ${this.bestDist.toFixed(2)} m`);
    if (!this.ready && (this.state === 'aim' || this.state === 'power')) {
      text(this.state === 'aim' ? 'Tap to lock the ANGLE' : 'Tap to lock the POWER', W / 2, 90, { size: 20, color: GOLD, stroke: INK, lw: 6 });
    }
    if (this.ready) drawReadyCard(drill('seeds'));
  },
  drawSeed(x, y, r) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(r);
    ellipse(0, 0, 7, 3.5, '#222');
    seg(-5, -1, 5, -1, 1, '#eee'); seg(-5, 1.5, 5, 1.5, 1, '#eee');
    ctx.restore();
  },
};

// ---- Results
const Results = {
  enter(id, score, detail) {
    this.d = drill(id); this.score = score; this.detail = detail; this.t = 0;
    this.prev = best[id];
    this.isBest = score > best[id];
    if (this.isBest) { best[id] = score; saveBest(); }
    this.n = starsFor(this.d, score);
    this.shown = 0;
  },
  update(dt) {
    this.t += dt;
    const want = Math.min(this.n, Math.floor((this.t - 0.4) / 0.35) + 1);
    if (this.t > 0.4 && want > this.shown) { this.shown = want; sfx.good(); if (this.shown === 3) burst(W / 2, 250); }
    if (this.t < 0.5) return;
    if (input.pressed.has(' ') || input.pressed.has('Enter') || input.pressed.has('r')) go(SCENES[this.d.id]);
  },
  draw() {
    drawSky(200); drawTrees(200); drawFence(220, false); drawGrass(220, H);
    rrect(220, 70, 520, 400, 22); ctx.fillStyle = CREAM; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
    rrect(220, 70, 520, 64, [22, 22, 0, 0]); ctx.fillStyle = INK; ctx.fill();
    text(`${this.d.icon} ${this.d.name}`, W / 2, 103, { size: 26, color: GOLD });
    text(fmt(this.d, this.score), W / 2, 190, { size: 56, color: INK });
    text(this.detail, W / 2, 240, { size: 18, font: BODY, weight: 800, color: '#555' });
    stars(W / 2, 290, this.shown, 46);
    const line = this.isBest ? (this.prev ? `New personal best! (was ${fmt(this.d, this.prev)})` : 'First one in the books!') : `Personal best: ${fmt(this.d, best[this.d.id])}`;
    text(line, W / 2, 342, { size: 18, font: BODY, weight: 900, color: this.isBest ? '#8a6400' : '#555' });
    if (this.t > 0.5) {
      if (button('Again', 290, 380, 180, 54, true)) { go(SCENES[this.d.id]); return; }
      if (button('Practice Card', 490, 380, 180, 54, false)) { go(Menu); return; }
    }
  },
};

const SCENES = { catching: Catching, batting: Batting, fielding: Fielding, seeds: Seeds };

// ---------------------------------------------------------------- main loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
  if (input.pressed.has('m')) muted = !muted;
  if (input.pressed.has('Escape') && scene !== Title) go(Menu);
  scene.update(dt);
  updateFx(dt);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  scene.draw();
  drawFx();
  if (muted) text('🔇', W - 20, H - 20, { size: 18, font: 'serif' });
  input.pressed.clear(); input.clicked = false;
  requestAnimationFrame(frame);
}

const fontsReady = document.fonts
  ? Promise.race([
      Promise.all(['24px Bungee', '24px Nunito', '900 24px Nunito', '24px Pacifico'].map(f => document.fonts.load(f))),
      new Promise(r => setTimeout(r, 2000)),
    ]).catch(() => {})
  : Promise.resolve();
fontsReady.then(() => { go(Title); requestAnimationFrame(t => { last = t; frame(t); }); });
