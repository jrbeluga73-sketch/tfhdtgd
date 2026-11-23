// Harrow Brook sound pass, step 1: dry-runs the film's simulation (nothing drawn) and logs every gunshot, tank gun,
// explosion, artillery shell and footstep, with the film camera and nearby soldiers per frame, as JSON lines.
// usage: node events.js ev6.jsonl --fps 6   (and ev24.jsonl --fps 24 for the natively rendered ranges)
const { chromium } = require('../render/node_modules/playwright-core'); const path = require('path'); const fs = require('fs');
const A = process.argv.slice(2), out = A[0], opt = k => { const i = A.indexOf('--' + k); return i > 0 ? A[i + 1] : null; };
const FPS = +(opt('fps') || 6), LEN = +(opt('len') || 600), DIR = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/local/lib/ms-playwright/chromium-1208/chrome-linux64/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', ...(process.env.JS_FLAGS ? [`--js-flags=${process.env.JS_FLAGS}`] : [])] });
  const p = await b.newPage({ viewport: { width: 640, height: 268 } });
  await p.addInitScript({ path: path.join(DIR, 'render/vclock.js') });
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.goto(`file://${DIR}/steelfront.html?nointro&gfx=low`);
  for (let i = 0; i < 600; i++) { await p.evaluate(() => __vt.advance(33)); if (await p.evaluate(() => window.steelFront && steelFront.boot && steelFront.boot.ready)) break; }
  await p.evaluate(() => { steelFront.profile.sbMap = 'brook'; steelFront.diag.scene('sandbox', 'medium'); SB.edit = false; });
  for (let i = 0; i < 10; i++) await p.evaluate(() => __vt.advance(33));
  await p.addScriptTag({ path: process.env.FILM_DIRECTOR || path.join(DIR, 'director.js') }); // FILM_DIRECTOR: the director an older cut was rendered with, so its sounds sit around that camera
  console.log(await p.evaluate(fps => { SB.edit = false; FILM.fps = fps; FILM.setup(); return `${MAPD.key} ${state}`; }, FPS));
  await p.evaluate(() => {
    window.__render = render; render = () => {};
  });
  await p.addScriptTag({ path: path.join(DIR, 'sound/hooks.js') });
  const N = Math.round(LEN * FPS), o = fs.createWriteStream(out), t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const t = i / FPS;
    const d = await p.evaluate(([dt, t]) => { FILM.t = t; const n0 = now; __vt.advance(dt); return __probe(t, false) + '\u0001' + n0; }, [1000 / FPS, t]);
    const [j, n0] = d.split('\u0001'); o.write(j.replace(/^\{/, `{"n0":${n0},`) + '\n');
    if (i % (FPS * 30) === 0) console.log(`t=${t} ${((Date.now() - t0) / (i + 1)).toFixed(0)} ms/frame`);
  }
  o.end(); await b.close(); console.log('done', (Date.now() - t0) / 1000);
})();
