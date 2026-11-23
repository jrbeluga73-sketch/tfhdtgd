// Harrow Brook sound pass: hooks into the game that log every sound event (shots, guns, explosions, footsteps) with its
// game time and position, plus a per-frame probe. Loaded by sound/events.js (dry runs) and render/render.js (captured
// during the very render that makes the footage, so the soundtrack follows that footage exactly).
(() => {
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
  window.__probe = (t, drawn) => { // per frame: camera (the one drawn with, when rendering), player, nearby soldiers, strikes in flight
    const c = drawn ? FILM.lastCam : FILM.camAt(), pl = player, near = [];
    for (const s of INF) if (!s.dead && s.st !== 'gone' && !s.pl && c && Math.hypot(s.p[0] - c.pos[0], s.p[2] - c.pos[2]) < 35) near.push([id(s), +s.p[0].toFixed(2), +s.p[1].toFixed(2), +s.p[2].toFixed(2), s.team]);
    const k = strikes.reduce((a, s) => a + s.k, 0); const fired = Math.max(0, k - sk); sk = k;
    const ev = E.splice(0);
    return JSON.stringify({ t, now, cam: c && { p: r2(c.pos), a: r2(c.at) }, pl: r2(pl.pos), alive: pl.alive, near, fired, ev, strikes: strikes.map(s => r2(s.p)) });
  };
})();
