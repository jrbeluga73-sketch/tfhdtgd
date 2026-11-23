// Renders the Harrow Brook film from steelfront.html + director.js into an MP4.
// usage: node render.js out.mp4 [--w 640 --h 268 --fps 6 --gfx low --len 600 --from 0 --out-w 1280 --out-fps 24]
const { chromium } = require('playwright-core'); const { spawn } = require('child_process'); const path = require('path');
const A = process.argv.slice(2), out = A[0] || 'harrow-brook.mp4', opt = k => { const i = A.indexOf('--' + k); return i > 0 ? A[i + 1] : null; };
const W = +(opt('w') || 640), H = +(opt('h') || 268), FPS = +(opt('fps') || 6), GFX = opt('gfx') || 'low', LEN = +(opt('len') || 600), FROM = +(opt('from') || 0);
const OW = +(opt('out-w') || 1280), OFPS = +(opt('out-fps') || 24), OH = Math.round(OW * 9 / 16 / 2) * 2, IH = Math.round(OW * H / W / 2) * 2;
const CHROME = process.env.CHROME || '/usr/local/lib/ms-playwright/chromium-1208/chrome-linux64/chrome', DIR = path.resolve(__dirname, '..');
(async () => {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-vf', `scale=${OW}:${IH}:flags=lanczos,pad=${OW}:${OH}:0:(oh-ih)/2:black,fps=${OFPS}`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
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
  console.log(await p.evaluate(() => { SB.edit = false; FILM.setup(); return `${MAPD.key} ${state} inf ${INF.length} tanks ${tanks.length}`; }));
  const N = Math.round(LEN * FPS), t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const t = i / FPS, skip = t < FROM;
    const d = await p.evaluate(([dt, t]) => { FILM.t = t; __vt.advance(dt); return FILM.frame(); }, [1000 / FPS, t]);
    if (!skip && !ff.stdin.write(Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`frame ${i}/${N} t=${t.toFixed(1)}s ${((Date.now() - t0) / (i + 1)).toFixed(0)} ms/frame`, await p.evaluate(() => `pos ${player.pos.map(Math.round)} wp inf ${INF.filter(s => !s.dead).length}`));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('done', out, (Date.now() - t0) / 1000, 's');
})();
