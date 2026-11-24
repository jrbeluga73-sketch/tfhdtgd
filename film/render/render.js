// Renders the Harrow Brook film from steelfront.html + director.js into an MP4.
// usage: node render.js out.mp4 [--dry (simulate and log only) --diag d.jsonl (with --dry: where he sits on screen, per frame; --foes: and every live enemy near him, see FILM.foesDbg)
//   --sub K (draw K frames per simulated frame: the game runs its 6 fps frame unchanged and a frame is drawn after each of
//   its steps (at most 50 ms), so at --fps 6, K=4 gives 24 drawn frames a second of exactly the 6 fps battle, spaced
//   50/50/50/17 ms of battle time; a frame slowed by a kill or hit has fewer steps and its last drawing is held) --interp (motion-interpolate to out-fps instead of repeating frames) --w 640 --h 268 --fps 6 --gfx low --len 600 --from 0 --out-w 1280 --out-fps 24]
const { chromium } = require('playwright-core'); const { spawn } = require('child_process'); const path = require('path');
const A = process.argv.slice(2), out = A[0] || 'harrow-brook.mp4', opt = k => { const i = A.indexOf('--' + k); return i > 0 ? A[i + 1] : null; };
const W = +(opt('w') || 640), H = +(opt('h') || 268), FPS = +(opt('fps') || 6), GFX = opt('gfx') || 'low', LEN = +(opt('len') || 600), FROM = +(opt('from') || 0);
const SUB = +(opt('sub') || 1), DIAG = opt('diag');
if (SUB > 1 && SUB !== Math.ceil(1000 / FPS / 50)) throw new Error(`--sub must be ${Math.ceil(1000 / FPS / 50)} at ${FPS} fps`);
const DRY = A.includes('--dry'), INTERP = A.includes('--interp'), OW = +(opt('out-w') || 1280), OFPS = +(opt('out-fps') || 24), OH = Math.round(OW * 9 / 16 / 2) * 2, IH = Math.round(OW * H / W / 2) * 2;
const CHROME = process.env.CHROME || '/usr/local/lib/ms-playwright/chromium-1208/chrome-linux64/chrome', DIR = path.resolve(__dirname, '..');
(async () => {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-c:v', 'mjpeg', '-i', '-',
    '-vf', `${INTERP ? `minterpolate=fps=${OFPS}:mi_mode=mci:mc_mode=obmc:me=epzs:scd=fdiff,` : ''}scale=${OW}:${IH}:flags=lanczos,pad=${OW}:${OH}:0:(oh-ih)/2:black,fps=${OFPS}`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
    '-movflags', '+frag_keyframe+empty_moov+default_base_moof', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const b = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', ...(process.env.JS_FLAGS ? [`--js-flags=${process.env.JS_FLAGS}`] : [])] });
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
  if (SUB > 1) await p.evaluate(K => { const st = step, r0 = render; window.__subOn = false; // --sub: draw after each step; the frame's own drawing is skipped
    step = function (h) { const n0 = now; st(h); if (!__subOn) return; FILM.tc = FILM.t + __subF.length / (FILM.fps * K); r0();
      __subF.push([FILM.frame(), __probe(FILM.tc, true).replace(/^\{/, `{"n0":${n0},`)]); };
    render = function () { if (!__subOn) r0(); }; }, SUB);
  // OUT.skip.jsonl: the same log for the frames simulated without drawing before --from, so the battle this run lived
  // through can be compared with the segment rendered before it (continuity at the join)
  const skOut = DRY || !FROM ? null : require('fs').createWriteStream(out.replace(/\.mp4$/, '') + '.skip.jsonl');
  const evOut = DRY ? null : require('fs').createWriteStream(out.replace(/\.mp4$/, '') + '.events.jsonl');
  if (DRY || FROM > 0) await p.evaluate(() => { window.__render = render; render = () => {}; }); // --from: simulate up to the start without drawing
  const N = Math.round(LEN * FPS), t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const t = i / FPS, skip = t < FROM;
    if (!DRY && FROM > 0 && Math.abs(t - FROM) < 1e-6) await p.evaluate(() => { render = window.__render; });
    if (SUB > 1 && !skip && !DRY) { // --sub: one 6 fps frame of the game, drawn after each of its steps
      const F = await p.evaluate(([dt, t]) => { FILM.t = t; __subF = []; __subOn = true; try { __vt.advance(dt); } finally { __subOn = false; } return __subF; }, [1000 / FPS, t]);
      if (F.length > SUB) throw new Error(`t=${t}: ${F.length} steps in one frame`);
      for (let j = 0; j < SUB; j++) { const [d, ev] = F[Math.min(j, F.length - 1)], tc = t + j / (FPS * SUB);
        evOut.write((j < F.length ? ev : ev.replace(/"fired":\d+,"ev":\[.*?\],"strikes"/, '"fired":0,"ev":[],"strikes"')).replace(/"t":[^,]*,/, `"t":${tc},`) + '\n');
        if (!ff.stdin.write(Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'))) await new Promise(r => ff.stdin.once('drain', r)); }
      if (i % 60 === 0) console.log(`frame ${i}/${N} t=${t.toFixed(1)}s ${((Date.now() - t0) / (i + 1)).toFixed(0)} ms/frame steps ${F.length}`);
      continue;
    }
    {
    const dt = 1000 / FPS, tc = t;
    const [d, ev, dg] = await p.evaluate(([dt, t, tc, dry, skipLog, diag]) => { FILM.t = t; FILM.tc = tc; const n0 = now; __vt.advance(dt); if (dry) { const q = __probe(t, false); let g = null;
        if (diag) { const c = FILM.camAt(); if (c) { const f = vnorm(vsub(c.at, c.pos)), r = vnorm([f[2], 0, -f[0]]), u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]], k = 1 / Math.tan(c.fov / 2), asp = innerWidth / innerHeight;
          const pr = q => { const d = vsub(q, c.pos), z = d[0] * f[0] + d[1] * f[1] + d[2] * f[2]; return z <= 0.05 ? [9, 9] : [+((d[0] * r[0] + d[1] * r[1] + d[2] * r[2]) / z * k / asp).toFixed(3), +((d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) / z * k).toFixed(3)]; };
          const s = FILM.shotDbg(), pp = player.pos; g = JSON.stringify({ t, i: s.i, j: s.j, head: pr([pp[0], pp[1] + 1.7, pp[2]]), feet: pr(pp), ...(diag === 2 ? { foes: FILM.foesDbg() } : {}) }); } }
        return [FILM.probe(), skipLog ? q : null, g]; }
      const f = FILM.frame(); return [f, __probe(tc, true).replace(/^\{/, `{"n0":${n0},`)]; }, [dt, t, tc, DRY || skip, !!skOut, DIAG ? (A.includes('--foes') ? 2 : 1) : 0]);
    if (dg) (globalThis.__dg ||= require('fs').createWriteStream(DIAG)).write(dg + '\n');
    if (ev && skip && skOut) skOut.write(ev + '\n'); else if (ev && evOut) evOut.write(ev + '\n');
    if (DRY && d && d !== globalThis.__lastC) console.log(`t=${t.toFixed(2)} ${d}`); globalThis.__lastC = d;
    if (!skip && !DRY && !ff.stdin.write(Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    }
    if (i % (DRY ? FPS * 5 : 60) === 0) console.log(`frame ${i}/${N} t=${t.toFixed(1)}s ${((Date.now() - t0) / (i + 1)).toFixed(0)} ms/frame`, await p.evaluate(() => `pos ${player.pos.map(Math.round)} wp ${JSON.stringify(FILM.dbg())} foes ${INF.filter(s => s.team === 1 && !s.dead).length} friends ${INF.filter(s => s.team === 0 && !s.dead).length}`));
  }
  if (opt('eval')) console.log('EVAL', await p.evaluate(opt('eval')));
  if (globalThis.__dg) globalThis.__dg.end(); if (evOut) evOut.end(); if (skOut) skOut.end(); ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('done', out, (Date.now() - t0) / 1000, 's');
})();
