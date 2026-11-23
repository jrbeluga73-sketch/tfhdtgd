// Renders the Harrow Brook film from steelfront.html + director.js into an MP4.
// usage: node render.js out.mp4 [--dry (simulate and log only) --interp (motion-interpolate to out-fps instead of repeating frames) --w 640 --h 268 --fps 6 --gfx low --len 600 --from 0 --out-w 1280 --out-fps 24]
const { chromium } = require('playwright-core'); const { spawn } = require('child_process'); const path = require('path');
const A = process.argv.slice(2), out = A[0] || 'harrow-brook.mp4', opt = k => { const i = A.indexOf('--' + k); return i > 0 ? A[i + 1] : null; };
const W = +(opt('w') || 640), H = +(opt('h') || 268), FPS = +(opt('fps') || 6), GFX = opt('gfx') || 'low', LEN = +(opt('len') || 600), FROM = +(opt('from') || 0);
const DRY = A.includes('--dry'), INTERP = A.includes('--interp'), OW = +(opt('out-w') || 1280), OFPS = +(opt('out-fps') || 24), OH = Math.round(OW * 9 / 16 / 2) * 2, IH = Math.round(OW * H / W / 2) * 2;
const CHROME = process.env.CHROME || '/usr/local/lib/ms-playwright/chromium-1208/chrome-linux64/chrome', DIR = path.resolve(__dirname, '..');
(async () => {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-vf', `${INTERP ? `minterpolate=fps=${OFPS}:mi_mode=mci:mc_mode=obmc:me=epzs:scd=fdiff,` : ''}scale=${OW}:${IH}:flags=lanczos,pad=${OW}:${OH}:0:(oh-ih)/2:black,fps=${OFPS}`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
    '-movflags', '+frag_keyframe+empty_moov+default_base_moof', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const b = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: H } });
  await p.addInitScript({ path: path.join(__dirname, 'vclock.js') });
  p.on('pageerror', e => console.log('PAGEERR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('ERR', m.text().slice(0, 300)); });
  await p.goto(`file://${DIR}/steelfront.html?nointro&gfx=${GFX}`);
  for (let i = 0; i < 600; i++) { await p.evaluate(() => __vt.advance(33)); if (await p.evaluate(() => window.steelFront && steelFront.boot && steelFront.boot.ready)) break; }
  await p.evaluate(() => { steelFront.profile.sbMap = 'brook'; steelFront.diag.scene('sandbox', 'medium'); SB.edit = false; });
  for (let i = 0; i < 10; i++) await p.evaluate(() => __vt.advance(33));
  await p.addScriptTag({ path: path.join(DIR, 'director.js') });
  console.log(await p.evaluate(fps => { SB.edit = false; FILM.fps = fps; FILM.setup(); return `${MAPD.key} ${state} inf ${INF.length} tanks ${tanks.length}`; }, FPS));
  await p.addScriptTag({ path: path.join(DIR, 'sound/hooks.js') }); // sound events, captured during this render
  const evOut = DRY ? null : require('fs').createWriteStream(out.replace(/\.mp4$/, '') + '.events.jsonl');
  if (DRY || FROM > 0) await p.evaluate(() => { window.__render = render; render = () => {}; }); // --from: simulate up to the start without drawing
  const N = Math.round(LEN * FPS), t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const t = i / FPS, skip = t < FROM;
    if (!DRY && FROM > 0 && Math.abs(t - FROM) < 1e-6) await p.evaluate(() => { render = window.__render; });
    const [d, ev] = await p.evaluate(([dt, t, dry]) => { FILM.t = t; const n0 = now; __vt.advance(dt); if (dry) { __probe(t, false); return [FILM.probe(), null]; }
      const f = FILM.frame(); return [f, __probe(t, true).replace(/^\{/, `{"n0":${n0},`)]; }, [1000 / FPS, t, DRY || skip]);
    if (ev && evOut) evOut.write(ev + '\n');
    if (DRY && d && d !== globalThis.__lastC) console.log(`t=${t.toFixed(2)} ${d}`); globalThis.__lastC = d;
    if (!skip && !DRY && !ff.stdin.write(Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (i % (DRY ? FPS * 5 : 60) === 0) console.log(`frame ${i}/${N} t=${t.toFixed(1)}s ${((Date.now() - t0) / (i + 1)).toFixed(0)} ms/frame`, await p.evaluate(() => `pos ${player.pos.map(Math.round)} wp ${JSON.stringify(FILM.dbg())} foes ${INF.filter(s => s.team === 1 && !s.dead).length} friends ${INF.filter(s => s.team === 0 && !s.dead).length}`));
  }
  if (opt('eval')) console.log('EVAL', await p.evaluate(opt('eval')));
  if (evOut) evOut.end(); ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('done', out, (Date.now() - t0) / 1000, 's');
})();
