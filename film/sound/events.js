// Harrow Brook sound pass, step 1: dry-runs the film's simulation (nothing drawn) and logs every gunshot, tank gun,
// explosion, artillery shell and footstep, with the film camera and nearby soldiers per frame, as JSON lines.
// usage: node events.js ev6.jsonl --fps 6   (and ev24.jsonl --fps 24 for the natively rendered ranges)
const { chromium } = require('../render/node_modules/playwright-core'); const path = require('path'); const fs = require('fs');
const A = process.argv.slice(2), out = A[0], opt = k => { const i = A.indexOf('--' + k); return i > 0 ? A[i + 1] : null; };
const FPS = +(opt('fps') || 6), LEN = +(opt('len') || 600), DIR = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/local/lib/ms-playwright/chromium-1208/chrome-linux64/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 640, height: 268 } });
  await p.addInitScript({ path: path.join(DIR, 'render/vclock.js') });
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.goto(`file://${DIR}/steelfront.html?nointro&gfx=low`);
  for (let i = 0; i < 600; i++) { await p.evaluate(() => __vt.advance(33)); if (await p.evaluate(() => window.steelFront && steelFront.boot && steelFront.boot.ready)) break; }
  await p.evaluate(() => { steelFront.profile.sbMap = 'brook'; steelFront.diag.scene('sandbox', 'medium'); SB.edit = false; });
  for (let i = 0; i < 10; i++) await p.evaluate(() => __vt.advance(33));
  await p.addScriptTag({ path: path.join(DIR, 'director.js') });
  console.log(await p.evaluate(fps => { SB.edit = false; FILM.fps = fps; FILM.setup(); return `${MAPD.key} ${state}`; }, FPS));
  await p.evaluate(() => {
    window.__render = render; render = () => {};
    const E = window.__E = []; let ids = new WeakMap(), nid = 0; const id = o => { if (!ids.has(o)) ids.set(o, ++nid); return ids.get(o); };
    const r2 = v => v && [+v[0].toFixed(1), +v[1].toFixed(1), +v[2].toFixed(1)];
    const log = (k, q, x = {}) => E.push({ k, n: now, p: r2(q), ...x });
    const wrap = (name, f) => { const o = window[name]; window[name] = function (...a) { try { f(...a); } catch (e) {} return o.apply(this, a); }; };
    wrap('infShoot', (s, tq, hit, mg) => log(mg ? 'mg' : 'rifle', infMuzzle(s), { team: s.team, id: id(s) }));
    wrap('footFire', pl => log('pshot', pl.pos, { w: pl.type.Wp && (pl.type.Wp.name || pl.type.R.wpn) }));
    wrap('sfxCannon', t => log('cannon', t.pos, { team: t.team, ty: t.type && t.type.key }));
    wrap('sfxGun', t => { if (now - (t.__g || -9) >= 0.07) { t.__g = now; log('tmg', t.pos, { team: t.team, id: id(t) }); } });
    wrap('sfxBoom', (q, k = 1) => log('boom', q.pos || q, { kk: +k.toFixed(2) }));
    wrap('sfxThud', q => log('thud', q));
    wrap('sfxWhiz', q => log('whiz', q));
    wrap('infRocket', (s, t) => log('rocket', infMuzzle(s), { team: s.team }));
    wrap('footThrow', pl => log('throw', pl.pos));
    wrap('footStep', () => {});
    const fs0 = window.footStep; window.footStep = function (pl, dt) { const f = pl.F, a = f && f.stepAcc; const r = fs0.apply(this, arguments);
      if (f && f.stepAcc < a) log('pstep', pl.pos, { run: +(f.runS || 0).toFixed(2), wet: wet(pl.pos[0], pl.pos[2]) ? 1 : 0, cr: +(f.crouchS || 0).toFixed(2) }); return r; };
    let sk = 0;
    window.__probe = (t, dt0) => { // per frame: camera, player, nearby soldiers, strikes in flight
      const c = FILM.camAt(), pl = player, near = [];
      for (const s of INF) if (!s.dead && s.st !== 'gone' && !s.pl && c && Math.hypot(s.p[0] - c.pos[0], s.p[2] - c.pos[2]) < 35) near.push([id(s), +s.p[0].toFixed(2), +s.p[1].toFixed(2), +s.p[2].toFixed(2), s.team]);
      const k = strikes.reduce((a, s) => a + s.k, 0); const fired = Math.max(0, k - sk); sk = k;
      const ev = E.splice(0);
      return JSON.stringify({ t, now, cam: c && { p: r2(c.pos), a: r2(c.at) }, pl: r2(pl.pos), alive: pl.alive, near, fired, ev, strikes: strikes.map(s => r2(s.p)) });
    };
  });
  const N = Math.round(LEN * FPS), o = fs.createWriteStream(out), t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const t = i / FPS;
    const d = await p.evaluate(([dt, t]) => { FILM.t = t; const n0 = now; __vt.advance(dt); return __probe(t) + '\u0001' + n0; }, [1000 / FPS, t]);
    const [j, n0] = d.split('\u0001'); o.write(j.replace(/^\{/, `{"n0":${n0},`) + '\n');
    if (i % (FPS * 30) === 0) console.log(`t=${t} ${((Date.now() - t0) / (i + 1)).toFixed(0)} ms/frame`);
  }
  o.end(); await b.close(); console.log('done', (Date.now() - t0) / 1000);
})();
