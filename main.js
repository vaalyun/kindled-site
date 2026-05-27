// ── Star field ────────────────────────────────────────────────────────────────

const canvas = document.getElementById('stars');
const ctx    = canvas.getContext('2d');

// Custom cursor lives on its own top-layer canvas (z-index above all content) so it stays visible
// over opaque UI like the Activity dropdown, instead of being hidden behind it.
const cursorCanvas = document.getElementById('cursor');
const cctx         = cursorCanvas ? cursorCanvas.getContext('2d') : null;

const STAR_COUNT = 200;
let stars = [];
let W = 0, H = 0;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
  if (cursorCanvas) { cursorCanvas.width = window.innerWidth; cursorCanvas.height = window.innerHeight; }
  buildMoonCanvas();
}

function initStars() {
  stars = Array.from({ length: STAR_COUNT }, () => ({
    x:     Math.random() * W,
    y:     Math.random() * H,
    r:     Math.random() * 1.1 + 0.15,
    base:  Math.random() * 0.55 + 0.08,
    amp:   Math.random() * 0.18 + 0.04,
    freq:  Math.random() * 0.0004 + 0.0001,
    phase: Math.random() * Math.PI * 2,
  }));
}

function drawStars(t) {
  const driftX = (t * 0.008) % W;
  const driftY = (t * 0.002) % H;
  for (const s of stars) {
    const o  = s.base + Math.sin(t * s.freq * 1000 + s.phase) * s.amp;
    const sx = (s.x + driftX + W) % W;
    const sy = (s.y + driftY + H) % H;
    ctx.beginPath();
    ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(190, 215, 255, ${Math.min(1, Math.max(0, o))})`;
    ctx.fill();
  }
}


// ── Milky Way ─────────────────────────────────────────────────────────────────

const MW_ANGLE  = -Math.PI / 5.5; // diagonal tilt
const MW_COUNT  = 320;
let mwStars     = [];

function initMilkyWay() {
  mwStars = [];
  const cos = Math.cos(MW_ANGLE);
  const sin = Math.sin(MW_ANGLE);
  const len = Math.sqrt(W * W + H * H);

  for (let i = 0; i < MW_COUNT; i++) {
    const along  = (Math.random() - 0.5) * len * 1.1;
    // Gaussian-ish concentration — more stars near center of band
    const spread = H * 0.18;
    const across = (Math.random() + Math.random() - 1) * spread;

    mwStars.push({
      x:     W / 2 + along * cos - across * sin,
      y:     H / 2 + along * sin + across * cos,
      r:     Math.random() * 0.7 + 0.1,
      base:  Math.random() * 0.28 + 0.04,
      amp:   Math.random() * 0.08 + 0.01,
      freq:  Math.random() * 0.0004 + 0.0001,
      phase: Math.random() * Math.PI * 2,
    });
  }
}

function drawMilkyWay(t) {
  // Diffuse haze
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(MW_ANGLE);
  const bw   = Math.sqrt(W * W + H * H) * 1.1;
  const bh   = H * 0.38;
  const grad = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2);
  grad.addColorStop(0,   'rgba(140, 170, 255, 0)');
  grad.addColorStop(0.3, 'rgba(140, 170, 255, 0.022)');
  grad.addColorStop(0.5, 'rgba(155, 185, 255, 0.038)');
  grad.addColorStop(0.7, 'rgba(140, 170, 255, 0.022)');
  grad.addColorStop(1,   'rgba(140, 170, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
  ctx.restore();

  // Dense dim stars along the band
  for (const s of mwStars) {
    if (s.x < 0 || s.x > W || s.y < 0 || s.y > H) continue;
    const o = s.base + Math.sin(t * s.freq * 1000 + s.phase) * s.amp;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(210, 225, 255, ${Math.min(1, Math.max(0, o))})`;
    ctx.fill();
  }
}


// ── Crescent moon ─────────────────────────────────────────────────────────────

const moonOff    = document.createElement('canvas');
const moonCtx    = moonOff.getContext('2d');
let moonOpacity  = 0;
let moonRevealing = false;
const MOON_MAX   = 0.13; // subtle — feels like real moonlight

function buildMoonCanvas() {
  moonOff.width  = W;
  moonOff.height = H;
  moonCtx.clearRect(0, 0, W, H);

  const cx = W * 0.78;
  const cy = H * 0.28;
  const r  = Math.min(W * 0.10, H * 0.20, 130);

  // Full moon circle
  moonCtx.beginPath();
  moonCtx.arc(cx, cy, r, 0, Math.PI * 2);
  moonCtx.fillStyle = 'rgba(220, 238, 255, 1)';
  moonCtx.fill();

  // Cut the shadow side — crescent opens to the right
  moonCtx.globalCompositeOperation = 'destination-out';
  moonCtx.beginPath();
  moonCtx.arc(cx - r * 0.30, cy, r * 0.88, 0, Math.PI * 2);
  moonCtx.fillStyle = 'rgba(0,0,0,1)';
  moonCtx.fill();
  moonCtx.globalCompositeOperation = 'source-over';
}

function drawMoon() {
  if (!moonRevealing && moonOpacity <= 0) return;
  if (moonRevealing && moonOpacity < MOON_MAX) {
    moonOpacity = Math.min(MOON_MAX, moonOpacity + 0.00025);
  }
  if (moonOpacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = moonOpacity;
  ctx.drawImage(moonOff, 0, 0);
  ctx.restore();
}


// ── Starfall ──────────────────────────────────────────────────────────────────

let shooters = [];

function spawnShooter() {
  const speed = Math.random() * 3.5 + 3;
  const angle = (Math.PI / 180) * (20 + Math.random() * 20);
  shooters.push({
    x:    Math.random() * W * 0.8,
    y:    Math.random() * H * 0.45,
    vx:   Math.cos(angle) * speed,
    vy:   Math.sin(angle) * speed,
    len:  Math.random() * 130 + 70,
    life: 0,
    rate: Math.random() * 0.006 + 0.005,
  });
  setTimeout(spawnShooter, 3500 + Math.random() * 5000);
}

setTimeout(spawnShooter, 6000 + Math.random() * 2000);

// One big shooting star — triggered once when Junis is fully revealed
function triggerStarfall() {
  const angle = (Math.PI / 180) * (18 + Math.random() * 12);
  shooters.push({
    x:    W * 0.08,
    y:    H * 0.08,
    vx:   Math.cos(angle) * 9,
    vy:   Math.sin(angle) * 9,
    len:  380,
    life: 0,
    rate: 0.004,
  });
}

function drawShooters() {
  for (let i = shooters.length - 1; i >= 0; i--) {
    const s = shooters[i];
    s.x += s.vx; s.y += s.vy; s.life += s.rate;

    let o = s.life < 0.15 ? s.life / 0.15
          : s.life > 0.75 ? (1 - s.life) / 0.25
          : 1;
    o = Math.max(0, Math.min(1, o));

    const a  = Math.atan2(s.vy, s.vx);
    const tx = s.x - Math.cos(a) * s.len;
    const ty = s.y - Math.sin(a) * s.len;
    const g  = ctx.createLinearGradient(tx, ty, s.x, s.y);
    g.addColorStop(0, `rgba(160,200,255,0)`);
    g.addColorStop(1, `rgba(230,240,255,${o * 0.9})`);

    const isHero = s.len > 300;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y);
    ctx.strokeStyle = g; ctx.lineWidth = isHero ? 2.2 : 1.3; ctx.stroke();

    ctx.beginPath(); ctx.arc(s.x, s.y, isHero ? 2.8 : 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(245,250,255,${o})`; ctx.fill();

    if (s.life >= 1 || s.x > W + 200 || s.y > H + 200) shooters.splice(i, 1);
  }
}


// ── Tagline star drift ────────────────────────────────────────────────────────

let driftStars = [];

function emitTaglineDrift(r) {
  driftStars.push({
    x: r.left - 20,
    y: r.top + r.height * 0.5 + (Math.random() - 0.5) * 6,
    vx: (r.width + 40) / 140,
    vy: (Math.random() - 0.5) * 0.15,
    r:  1.2, o: 0, maxO: 0.7, phase: 'in',
    delay: 0, born: performance.now(),
  });

  for (let i = 0; i < 5; i++) {
    driftStars.push({
      x: r.left + Math.random() * r.width,
      y: r.top  + r.height * 0.5 + (Math.random() - 0.5) * 14,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -(Math.random() * 0.3 + 0.1),
      r:  Math.random() * 0.8 + 0.3,
      o:  0, maxO: Math.random() * 0.35 + 0.1,
      phase: 'in', delay: Math.random() * 400, born: performance.now(),
    });
  }
}

function drawDriftStars() {
  const now = performance.now();
  for (let i = driftStars.length - 1; i >= 0; i--) {
    const s = driftStars[i];
    if (s.delay && now - s.born < s.delay) continue;
    s.x += s.vx; s.y += s.vy;
    if (s.phase === 'in') {
      s.o = Math.min(s.maxO, s.o + 0.015);
      if (s.o >= s.maxO) s.phase = 'out';
    } else {
      s.o -= 0.008;
    }
    if (s.o <= 0) { driftStars.splice(i, 1); continue; }
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(210,235,255,${s.o})`;
    ctx.fill();
  }
}


// ── Intro sequence ────────────────────────────────────────────────────────────

function runIntro() {
  const letters    = document.querySelectorAll('.name .letter');
  if (!letters.length) return;
  const tagline    = document.querySelector('.tagline');
  const hint       = document.querySelector('.scroll-hint');
  const bloom      = document.querySelector('.jun-bloom');
  const silhouette = document.querySelector('.jun-silhouette');

  const stagger = 220;
  const startAt = 500;

  letters.forEach((el, i) => {
    setTimeout(() => el.classList.add('appearing'), startAt + i * stagger);
  });

  const lastLetterStart = startAt + (letters.length - 1) * stagger;

  // Bloom fires just as the last letter flares
  setTimeout(() => bloom.classList.add('blooming'), lastLetterStart + 200);

  // Silhouette materialises during the bloom's peak
  setTimeout(() => silhouette.classList.add('visible'), lastLetterStart + 850);

  setTimeout(() => {
    triggerStarfall();
    moonRevealing = true;
    tagline.classList.remove('pre-hidden');
    setTimeout(() => tagline.classList.add('revealed'), 60);
    setTimeout(() => emitTaglineDrift(tagline.getBoundingClientRect()), 120);
  }, lastLetterStart + 900);

  if (hint) setTimeout(() => hint.classList.remove('pre-hidden'), lastLetterStart + 1600);

  const langToggle = document.getElementById('lang-toggle');
  if (langToggle) setTimeout(() => langToggle.classList.remove('pre-hidden'), lastLetterStart + 1200);

  const loreWrap = document.getElementById('lore-wrap');
  if (loreWrap) setTimeout(() => loreWrap.classList.remove('pre-hidden'), lastLetterStart + 1600);
}

window.addEventListener('load', () => setTimeout(runIntro, 400));


// ── Custom cursor ─────────────────────────────────────────────────────────────

const mouse = { x: -200, y: -200 };
let cursorTrail = [];

document.addEventListener('mousemove', e => {
  mouse.x = e.clientX; mouse.y = e.clientY;
  if (Math.random() < 0.4) {
    cursorTrail.push({
      x: mouse.x + (Math.random() - 0.5) * 6,
      y: mouse.y + (Math.random() - 0.5) * 6,
      r: Math.random() * 1.3 + 0.2,
      o: Math.random() * 0.5 + 0.3,
      d: Math.random() * 0.025 + 0.015,
    });
  }
});

document.addEventListener('click', () => {
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * 18 + 4;
    cursorTrail.push({
      x: mouse.x + Math.cos(a) * d, y: mouse.y + Math.sin(a) * d,
      r: Math.random() * 1.5 + 0.4,
      o: Math.random() * 0.7 + 0.3,
      d: Math.random() * 0.02 + 0.01,
    });
  }
});

function drawCursor() {
  if (!cctx) return;
  cctx.clearRect(0, 0, W, H);
  for (let i = cursorTrail.length - 1; i >= 0; i--) {
    const p = cursorTrail[i];
    p.o -= p.d;
    if (p.o <= 0) { cursorTrail.splice(i, 1); continue; }
    cctx.beginPath(); cctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    cctx.fillStyle = `rgba(190,220,255,${p.o})`; cctx.fill();
  }

  const glow = cctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 14);
  glow.addColorStop(0, 'rgba(140,190,255,0.22)');
  glow.addColorStop(1, 'rgba(140,190,255,0)');
  cctx.beginPath(); cctx.arc(mouse.x, mouse.y, 14, 0, Math.PI * 2);
  cctx.fillStyle = glow; cctx.fill();

  cctx.beginPath(); cctx.arc(mouse.x, mouse.y, 2.2, 0, Math.PI * 2);
  cctx.fillStyle = 'rgba(230,245,255,0.95)'; cctx.fill();
}


// ── Jun body star field ───────────────────────────────────────────────────────

const junCanvas = document.getElementById('jun-body');
const junCtx    = junCanvas ? junCanvas.getContext('2d') : null;
let junStars    = [];

function initJunStars() {
  const w = junCanvas.offsetWidth  || 600;
  const h = junCanvas.offsetHeight || 325;
  junCanvas.width  = w;
  junCanvas.height = h;
  junStars = Array.from({ length: 120 }, () => ({
    x:     Math.random() * w,
    y:     Math.random() * h,
    r:     Math.random() * 1.5 + 0.2,
    base:  Math.random() * 0.65 + 0.2,
    amp:   Math.random() * 0.22 + 0.06,
    freq:  Math.random() * 0.0008 + 0.0002,
    phase: Math.random() * Math.PI * 2,
  }));
}

function animateJun(t) {
  if (!junCtx) return;
  const w = junCanvas.width;
  const h = junCanvas.height;
  junCtx.clearRect(0, 0, w, h);

  // Night sky fill inside her body
  junCtx.fillStyle = '#03080f';
  junCtx.fillRect(0, 0, w, h);

  // Soft deep blue nebula glow at center
  const glow = junCtx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, w * 0.4);
  glow.addColorStop(0, 'rgba(30, 55, 120, 0.45)');
  glow.addColorStop(1, 'rgba(3, 8, 20, 0)');
  junCtx.fillStyle = glow;
  junCtx.fillRect(0, 0, w, h);

  // Stars
  for (const s of junStars) {
    const o = s.base + Math.sin(t * s.freq * 1000 + s.phase) * s.amp;
    junCtx.beginPath();
    junCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    junCtx.fillStyle = `rgba(200, 225, 255, ${Math.min(1, Math.max(0, o))})`;
    junCtx.fill();
  }

  requestAnimationFrame(animateJun);
}

window.addEventListener('load', () => {
  setTimeout(() => {
    if (junCanvas) {
      initJunStars();
      requestAnimationFrame(animateJun);
    }
  }, 100);
});


// ── Jun support silhouette ────────────────────────────────────────────────────

const junSupCanvas = document.getElementById('jun-body-support');
const junSupCtx    = junSupCanvas ? junSupCanvas.getContext('2d') : null;
let junSupStars    = [];
let junSupRevealed = false;

function initJunSupStars() {
  if (!junSupCanvas) return;
  const w = junSupCanvas.offsetWidth  || 230;
  const h = junSupCanvas.offsetHeight || 130;
  junSupCanvas.width  = w;
  junSupCanvas.height = h;
  junSupStars = Array.from({ length: 55 }, () => ({
    x:     Math.random() * w,
    y:     Math.random() * h,
    r:     Math.random() * 1.4 + 0.2,
    base:  Math.random() * 0.65 + 0.2,
    amp:   Math.random() * 0.22 + 0.06,
    freq:  Math.random() * 0.0008 + 0.0002,
    phase: Math.random() * Math.PI * 2,
  }));
}

function animateJunSup(t) {
  if (!junSupCtx) return;
  const w = junSupCanvas.width, h = junSupCanvas.height;
  junSupCtx.clearRect(0, 0, w, h);

  if (!junSupRevealed) {
    // Hidden — match the box border/text color
    junSupCtx.fillStyle = '#060f1e';
    junSupCtx.fillRect(0, 0, w, h);
    const boxTint = junSupCtx.createRadialGradient(w*0.5, h*0.5, 0, w*0.5, h*0.5, w*0.6);
    boxTint.addColorStop(0, 'rgba(79,143,212,0.35)');
    boxTint.addColorStop(1, 'rgba(79,143,212,0.15)');
    junSupCtx.fillStyle = boxTint;
    junSupCtx.fillRect(0, 0, w, h);
  } else {
    // Revealed — starry night fill
    junSupCtx.fillStyle = '#03080f';
    junSupCtx.fillRect(0, 0, w, h);
    const glow = junSupCtx.createRadialGradient(w*0.5, h*0.45, 0, w*0.5, h*0.45, w*0.4);
    glow.addColorStop(0, 'rgba(30,55,120,0.45)');
    glow.addColorStop(1, 'rgba(3,8,20,0)');
    junSupCtx.fillStyle = glow;
    junSupCtx.fillRect(0, 0, w, h);
    for (const s of junSupStars) {
      const o = s.base + Math.sin(t * s.freq * 1000 + s.phase) * s.amp;
      junSupCtx.beginPath();
      junSupCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      junSupCtx.fillStyle = `rgba(200,225,255,${Math.min(1, Math.max(0, o))})`;
      junSupCtx.fill();
    }
  }
  requestAnimationFrame(animateJunSup);
}

window.addEventListener('load', () => {
  setTimeout(() => {
    initJunSupStars();
    if (junSupCanvas) requestAnimationFrame(animateJunSup);

    const supportSection = document.querySelector('.support');
    const junSupSil      = document.querySelector('.jun-support-silhouette');
    if (!supportSection || !junSupSil) return;

    const supObserver = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && !junSupRevealed) {
          setTimeout(() => {
            junSupRevealed = true;
            junSupSil.classList.add('flash');
          }, 350);
        }
      });
    }, { threshold: 0.35 });

    supObserver.observe(supportSection);
  }, 150);
});


// ── Render loop ───────────────────────────────────────────────────────────────

resize();
initStars();
initMilkyWay();
window.addEventListener('resize', () => { resize(); initStars(); initMilkyWay(); });

// One big shooting star on each page load.
let bigShooter = null;
function launchBigShooter() {
  const fromLeft = Math.random() < 0.5;
  bigShooter = {
    x: fromLeft ? -W * 0.1 : W * 1.1,
    y: H * (0.08 + Math.random() * 0.18),
    vx: (fromLeft ? 1 : -1) * (7 + Math.random() * 2.5),
    vy: 2.6 + Math.random() * 1.3,
    tail: 300, life: 1.0,
  };
}
function drawBigShooter() {
  if (!bigShooter) return;
  const s = bigShooter;
  s.x += s.vx; s.y += s.vy; s.life -= 0.011;
  if (s.life <= 0 || s.x < -W * 0.25 || s.x > W * 1.25) { bigShooter = null; return; }
  const ang = Math.atan2(s.vy, s.vx);
  const tx = s.x - Math.cos(ang) * s.tail, ty = s.y - Math.sin(ang) * s.tail;
  const o = Math.min(1, s.life * 1.4);
  const grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
  grad.addColorStop(0, `rgba(215,235,255,${0.95 * o})`);
  grad.addColorStop(0.4, `rgba(150,190,255,${0.35 * o})`);
  grad.addColorStop(1, 'rgba(150,190,255,0)');
  ctx.strokeStyle = grad; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty); ctx.stroke();
  const hg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 11);
  hg.addColorStop(0, `rgba(240,248,255,${0.95 * o})`); hg.addColorStop(1, 'rgba(240,248,255,0)');
  ctx.beginPath(); ctx.arc(s.x, s.y, 11, 0, Math.PI * 2); ctx.fillStyle = hg; ctx.fill();
  ctx.beginPath(); ctx.arc(s.x, s.y, 2.4, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${o})`; ctx.fill();
}
setTimeout(launchBigShooter, 650);

function animate(t) {
  ctx.clearRect(0, 0, W, H);
  drawMilkyWay(t);
  drawMoon();
  drawStars(t);
  drawShooters();
  drawDriftStars();
  drawBigShooter();
  drawCursor();
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// Strip the leaving class if the browser restores this page from bfcache (back button).
window.addEventListener('pageshow', e => {
  if (e.persisted) {
    document.body.classList.remove('leaving');
    document.body.style.opacity = '0';
    document.body.style.transition = 'none';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
      });
    });
  }
});

// Page-transition fade: fade the page out before navigating to another internal page.
document.addEventListener('click', e => {
  const a = e.target.closest('a');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href || a.target === '_blank' || href.startsWith('#') || /^(https?:|mailto:)/.test(href)) return;
  // Skip transition when navigating to a different section of the same page
  try {
    const dest = new URL(href, window.location.href);
    if (dest.pathname === window.location.pathname) return;
  } catch (_) {}
  e.preventDefault();
  document.body.classList.add('leaving');
  setTimeout(() => { window.location.href = href; }, 420);
});


// ── Scroll reveal ──────────────────────────────────────────────────────────────

const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ── Ambient sound (site-wide) ──────────────────────────────────────────────────
(function () {
  // Inject button
  const btn = document.createElement('button');
  btn.id = 'ambient-btn';
  btn.innerHTML = '<svg width="14" height="8" viewBox="0 0 14 8" fill="none"><path d="M1 4 C2.5 1,4 1,5.5 4 C7 7,8.5 7,10 4 C11 2,12 2,13 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg> ambient';
  btn.style.cssText = 'position:fixed;bottom:1.2rem;left:1.2rem;background:rgba(5,12,28,0.75);border:1px solid rgba(100,160,255,0.18);color:rgba(160,185,230,0.55);font-family:inherit;font-size:0.68rem;letter-spacing:0.12em;padding:0.32rem 0.7rem;border-radius:999px;cursor:pointer;display:flex;align-items:center;gap:0.4rem;z-index:999;transition:color .2s,border-color .2s;white-space:nowrap;';
  btn.addEventListener('mouseenter', () => { btn.style.color = 'rgba(220,235,255,0.9)'; btn.style.borderColor = 'rgba(100,160,255,0.5)'; });
  btn.addEventListener('mouseleave', () => {
    btn.style.color = ambientOn ? 'rgba(220,235,255,0.9)' : 'rgba(160,185,230,0.55)';
    btn.style.borderColor = ambientOn ? 'rgba(100,160,255,0.45)' : 'rgba(100,160,255,0.18)';
  });
  document.body.appendChild(btn);

  let ambientOn     = false;
  let ambientCtx    = null;
  let ambientGain   = null;
  let ambientSource = null;
  let ambientBuffer = null;
  let ambientLoopStart = 0;
  let ambientLoopEnd   = 0;

  function detectLoopPoints(buffer, threshold = 0.001) {
    const data = buffer.getChannelData(0);
    let start = 0, end = data.length - 1;
    for (let i = 0; i < data.length; i++)       { if (Math.abs(data[i]) > threshold) { start = i; break; } }
    for (let i = data.length - 1; i >= 0; i--)  { if (Math.abs(data[i]) > threshold) { end = i;   break; } }
    return { start: start / buffer.sampleRate, end: end / buffer.sampleRate };
  }

  async function initAmbient() {
    ambientCtx  = new (window.AudioContext || window.webkitAudioContext)();
    ambientGain = ambientCtx.createGain();
    ambientGain.gain.value = 0;
    ambientGain.connect(ambientCtx.destination);
    const res = await fetch('ambient.mp3');
    const raw = await res.arrayBuffer();
    ambientBuffer = await ambientCtx.decodeAudioData(raw);
    const pts = detectLoopPoints(ambientBuffer);
    ambientLoopStart = pts.start;
    ambientLoopEnd   = pts.end;
  }

  function startSource() {
    ambientSource = ambientCtx.createBufferSource();
    ambientSource.buffer    = ambientBuffer;
    ambientSource.loop      = true;
    ambientSource.loopStart = ambientLoopStart;
    ambientSource.loopEnd   = ambientLoopEnd;
    ambientSource.connect(ambientGain);
    ambientSource.start(0, ambientLoopStart);
  }

  function ramp(from, to, ms, onDone) {
    const steps = 40, dt = ms / steps, delta = (to - from) / steps;
    let step = 0;
    const iv = setInterval(() => {
      step++;
      ambientGain.gain.value = Math.min(1, Math.max(0, from + delta * step));
      if (step >= steps) { clearInterval(iv); if (onDone) onDone(); }
    }, dt);
  }

  function setActive(on) {
    btn.style.color = on ? 'rgba(220,235,255,0.9)' : 'rgba(160,185,230,0.55)';
    btn.style.borderColor = on ? 'rgba(100,160,255,0.45)' : 'rgba(100,160,255,0.18)';
  }

  async function toggle() {
    if (!ambientCtx || !ambientBuffer) await initAmbient();
    if (ambientCtx.state === 'suspended') await ambientCtx.resume();
    ambientOn = !ambientOn;
    localStorage.setItem('junAmbient', ambientOn ? '1' : '0');
    if (ambientOn) {
      startSource();
      ramp(0, 0.08, 2500);
    } else {
      ramp(ambientGain.gain.value, 0, 2500, () => { ambientSource.stop(); ambientSource = null; });
    }
    setActive(ambientOn);
  }

  btn.addEventListener('click', toggle);

  // On by default — only off if user explicitly toggled it off
  async function autoStart() {
    if (localStorage.getItem('junAmbient') === '0') return;
    try {
      await initAmbient();
      if (ambientCtx.state === 'suspended') await ambientCtx.resume();
      ambientOn = true;
      startSource();
      ambientGain.gain.value = 0.08; // no fade-in — feels continuous across pages
      setActive(true);
    } catch (_) {}
  }

  window.addEventListener('load', () => {
    autoStart().catch(() => {
      // Autoplay blocked — start on first interaction instead
      const onInteract = () => {
        autoStart();
        window.removeEventListener('click', onInteract);
        window.removeEventListener('keydown', onInteract);
      };
      window.addEventListener('click', onInteract);
      window.addEventListener('keydown', onInteract);
    });
  });
})();
// ───────────────────────────────────────────────────────────────────────────────

// ── Click sound ────────────────────────────────────────────────────────────────
(function () {
  let clickCtx    = null;
  let clickBuffer = null;

  async function loadClick() {
    clickCtx = new (window.AudioContext || window.webkitAudioContext)();
    const res = await fetch('click.wav');
    const raw = await res.arrayBuffer();
    clickBuffer = await clickCtx.decodeAudioData(raw);
  }

  function playClick() {
    if (!clickCtx || !clickBuffer) return;
    if (clickCtx.state === 'suspended') clickCtx.resume();
    const src  = clickCtx.createBufferSource();
    const gain = clickCtx.createGain();
    gain.gain.value = 0.45;
    src.buffer = clickBuffer;
    src.connect(gain);
    gain.connect(clickCtx.destination);
    src.start();
  }

  document.addEventListener('click', e => {
    const target = e.target.closest('button, a, [role="menuitem"], [role="button"]');
    if (!target) return;
    if (!clickCtx) {
      loadClick().then(playClick).catch(() => {});
    } else {
      playClick();
    }
  }, { passive: true });
})();
// ───────────────────────────────────────────────────────────────────────────────
