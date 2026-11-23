// Harrow Brook: the film director. Injected into steelfront.html (sandbox on the "brook" map) by render/render.js.
// It runs the game's own simulation: one allied radio operator (the player soldier, driven by scripted input) leads a
// squad from the southern woods through the orchard hamlet, up Observation Hill to call a barrage on the church
// village, then across the ford into the village. The film camera is laid over the game camera only while drawing,
// so the soldier's aim and bullets still come from his own gameplay camera.
(() => {
  const FILM = window.FILM = { t: 0, fps: 6, len: 600, shot: null, cut: true, title: null, fade: 0 };
  const W = (x, z) => [x, z];
  // the mission route: [x, z, pause seconds at the point, what he does there]
  const ROUTE = [
    [-120, -440, 0], [-150, -380, 0], [-185, -310, 14, "fight"], [-200, -255, 0], [-210, -215, 20, "fight"], [-195, -170, 10, "fight"],
    [-175, -120, 0], [-160, -80, 0], [-150, -58, 34, "radio"], [-95, -40, 0], [-20, -20, 0], [HB.ford - 10, bkZ(HB.ford) - 24, 8, "fight"],
    [HB.ford, bkZ(HB.ford) + 4, 0], [HB.ford + 10, bkZ(HB.ford) + 40, 14, "fight"], [90, 120, 12, "fight"],
    // act three: through the church village, then up the lane to the enemy's guns on the north ridge
    [HB.B[0] - 14, HB.B[1] - 6, 24, "fight"], [HB.B[0] + 6, HB.B[1] + 18, 28, "fight"], [HB.B[0] + 34, HB.B[1] + 58, 0], [150, 250, 22, "fight"],
    [195, 315, 24, "fight"], [228, 365, 26, "fight"], [HB.C[0], HB.C[1], 999, "end"],
  ];
  let wi = 1, waitT = 0, holdUntil = 72, radioDone = false;
  const P = () => player;
  const enemies = () => INF.filter(s => s.team === 1 && !s.dead && s.st !== "gone");
  function setup() {
    footHurt = () => {}; // the hero is spared; the battle around him is not
    footEnter("radio", true);
    const p = P(); const [x0, z0] = ROUTE[0]; p.pos = [x0, heightAt(x0, z0), z0]; p.inf.p = p.pos.slice(); cam.yaw = p.F.bodyYaw = -0.4; cam.pitch = -0.04;
    // his squad and the platoon on his flanks
    for (let i = 0; i < 14; i++) { const x = x0 - 40 + (i % 7) * 12 + (i > 6 ? 6 : 0), z = z0 - 8 - (i > 6 ? 10 : 0);
      infMake(0, x, z, "run", { mg: i === 3, at: i === 9, sbo: "hold", sbp: [x, z], sbk: 0, film: i }); }
    // the enemy: a screen at the hamlet, the village garrison, MG posts at the ford
    const post = (x, z, o = {}) => infMake(1, x, z, "post", { post: [x, z], sbo: "dig", sbp: [x, z], sbk: 0, ...o });
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28, x = HB.A[0] + Math.sin(a) * 30, z = HB.A[1] + 25 + Math.cos(a) * 18; post(x, z, { mg: i === 2 }); }
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28, x = HB.B[0] + Math.sin(a) * 45, z = HB.B[1] + Math.cos(a) * 40; post(x, z, { mg: i % 5 === 1, at: i % 7 === 3 }); }
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28, x = HB.C[0] + Math.sin(a) * 34, z = HB.C[1] + Math.cos(a) * 30; post(x, z, { mg: i % 4 === 1, at: i === 6 }); } // the gun farm
    for (const [dx, dz] of [[-40, 60], [10, 85], [-10, 120]]) post(HB.C[0] + dx - 60, HB.C[1] + dz - 140, { mg: dz === 85 }); // outposts on the lane
    for (const dx of [-30, 0, 30]) post(HB.ford + dx, bkZ(HB.ford) + 55, { mg: dx === 0 });
    for (const [dx, dz] of [[-28, 10], [26, 4], [0, -22]]) addCover({ x: HB.A[0] + dx, z: HB.A[1] + 40 + dz, hx: 4, hz: 0.7, kind: "sandbag", tag: "sb" });
    for (const dx of [-20, 20]) addCover({ x: HB.ford + dx, z: bkZ(HB.ford) + 52, hx: 4.5, hz: 0.7, kind: "sandbag", tag: "sb" });
    // armour: two allied tanks waiting at the wood edge, enemy tanks in the village
    FILM.ally = [steelFront.veh.spawn("medium", -60, -455, 0, -0.3), steelFront.veh.spawn("medium", -20, -470, 0, -0.3)].filter(Boolean);
    FILM.foe = [steelFront.veh.spawn("heavy", HB.B[0] + 30, HB.B[1] + 30, 1, Math.PI), steelFront.veh.spawn("medium", HB.B[0] - 40, HB.B[1] + 20, 1, Math.PI)].filter(Boolean);
    for (const t of FILM.foe) if (t.sb) t.sb.ord = "hold";
    for (const t of FILM.ally) if (t.sb) t.sb.ord = "hold";
  }
  // the ridge is reinforced as he leaves the village: riflemen dig in at the gun farm and a tank comes up the lane
  function reinforce() {
    for (let i = 0; i < 8; i++) { const x = HB.C[0] - 30 + (i % 4) * 20, z = HB.C[1] - 20 - (i > 3 ? 14 : 0); infMake(1, x, z, "post", { post: [x, z], sbo: "dig", sbp: [x, z], sbk: 0, mg: i === 5 }); }
    const t = steelFront.veh.spawn("medium", HB.C[0] + 20, HB.C[1] + 30, 1, Math.PI * 1.15); if (t && t.sb) t.sb.ord = "hold";
  }
  // ---- the soldier's input: walk the route, stop to fight, call the barrage from the hill
  const near = (q, r) => { let b = null, bd = r; for (const s of enemies()) { const d = Math.hypot(s.p[0] - q[0], s.p[2] - q[2]); if (d < bd) { bd = d; b = s; } } return b; };
  function drive(dt) {
    const p = P(), f = p.F; if (!p.alive || !f) return;
    keys.delete("KeyW"); keys.delete("ShiftLeft"); keys.delete("KeyF"); mouseDown = false; f.crouch = false;
    if (FILM.t < holdUntil) { cam.yaw = approachAngle(cam.yaw, -0.35, dt); f.crouch = FILM.t > 40; return; } // the opening: waiting at the start line
    const w = ROUTE[wi], dx = w[0] - p.pos[0], dz = w[1] - p.pos[2], d = Math.hypot(dx, dz);
    if (d > 2.5 && waitT <= 0) { // on the move
      cam.yaw = approachAngle(cam.yaw, Math.atan2(dx, dz), dt * 2.2); cam.pitch = approach(cam.pitch, -0.04, dt);
      keys.add("KeyW"); if (d > 30 && wi > 1) keys.add("ShiftLeft");
      return;
    }
    if (waitT <= 0) waitT = w[2] || 0.01;
    waitT -= dt;
    if (w[3] === "fight") { const e = near(p.pos, 260); f.crouch = true;
      if (e) { const ex = e.p[0] - p.pos[0], ez = e.p[2] - p.pos[2]; cam.yaw = approachAngle(cam.yaw, Math.atan2(ex, ez), dt * 3); cam.pitch = approach(cam.pitch, Math.atan2(e.p[1] + 0.9 - p.pos[1] - 1.2, Math.hypot(ex, ez)), dt * 2);
        mouseDown = (FILM.t % 1.1) < 0.12 && Math.abs(wrapA(cam.yaw - Math.atan2(ex, ez))) < 0.1; cam.sniper = true; } }
    if (w[3] === "radio") { f.crouch = true; const tg = HB.B; const ex = tg[0] - p.pos[0], ez = tg[1] - p.pos[2]; cam.yaw = approachAngle(cam.yaw, Math.atan2(ex, ez), dt * 1.5);
      cam.pitch = approach(cam.pitch, Math.atan2(heightAt(tg[0], tg[1]) - p.pos[1] - 1.2, Math.hypot(ex, ez)), dt);
      if (!radioDone && waitT < w[2] - 8) { radioDone = true; strikes.push({ p: [tg[0] + 10, 0, tg[1] + 20], t: 4, n: 10, k: 0, owner: footArty(0) }); strikes.push({ p: [tg[0] - 30, 0, tg[1] + 10], t: 9, n: 8, k: 0, owner: footArty(0) }); }
      if (waitT < 6) for (const t of FILM.ally) if (t.sb) t.sb.ord = "hunt"; }
    if (waitT <= 0 && wi < ROUTE.length - 1) { wi++; waitT = 0; cam.sniper = false; if (wi === 18) reinforce(); }
    if (w[3] === "end") { cam.sniper = false; f.crouch = false; }
  }
  // the squad moves up behind him in legs (their sandbox "hold" spot follows the route)
  function squad() {
    const p = P(), k = Math.floor(FILM.t / 6);
    for (const s of INF) if (s.film !== undefined && !s.dead && s.sbk !== k) { const a = (s.film / 14 - 0.5) * 2.4, back = 10 + (s.film % 3) * 6;
      const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
      s.sbp = FILM.t < holdUntil ? s.sbp : [p.pos[0] - fx * back + fz * a * 14, p.pos[2] - fz * back - fx * a * 14]; s.sbk = k; s.stg = -1; }
  }
  // ---- the film camera: a shot list cut on time; every shot is smoothed, each cut starts clean
  // cut against the measured timeline: start line to 1:20, hamlet fights 1:50-2:45, the hill and the barrage 3:42-4:16,
  // the ford 5:00-5:40, the church village 6:15-7:10, the lane and the ridge 7:25-9:15, the gun farm taken at 9:24
  const SHOTS = [
    [0, "aerial", { c: [-60, -150], r: 520, h: 210, w: 0.012 }], [22, "crane", { c: [-130, -440], h: 28, r: 60 }], [40, "close", {}], [52, "side", {}],
    [80, "follow", {}], [98, "low", {}], [108, "side", {}], [120, "wide", { at: [-260, -330] }], [134, "follow", {}], [146, "ots", {}], [160, "close", {}],
    [170, "aerial", { c: [-200, -210], r: 160, h: 70, w: 0.05 }], [186, "follow", {}], [202, "low", {}], [216, "side", {}], [226, "vista", {}],
    [238, "aerial", { c: [HB.B[0], HB.B[1]], r: 230, h: 95, w: 0.03 }], [252, "close", {}], [262, "follow", {}], [278, "side", {}], [292, "follow", {}],
    [304, "low", {}], [316, "ots", {}], [332, "side", {}], [346, "follow", {}], [362, "low", {}], [374, "ots", {}], [390, "close", {}], [400, "side", {}],
    [410, "ots", {}], [424, "aerial", { c: [HB.B[0], HB.B[1]], r: 150, h: 60, w: -0.04 }], [436, "follow", {}], [450, "low", {}], [458, "ots", {}],
    [474, "side", {}], [486, "follow", {}], [496, "ots", {}], [512, "close", {}], [520, "follow", {}], [530, "ots", {}], [544, "side", {}],
    [554, "follow", {}], [564, "low", {}], [574, "aerial", { c: [HB.C[0], HB.C[1]], r: 110, h: 45, w: 0.04 }], [588, "aerial", { c: [HB.C[0], HB.C[1]], r: 300, h: 140, w: -0.02 }],
  ];
  const TITLES = [[3, 12, "HARROW BROOK", "Autumn, 1944 · first light"], [24, 33, "Private Tom Ashby", "Radio operator, 2nd Platoon"], [126, 133, "The orchard hamlet", ""],
    [228, 236, "Observation Hill", "Call the guns on the church village"], [306, 313, "The ford", ""], [378, 385, "The church village", ""],
    [478, 486, "The north ridge", "The enemy's guns"], [578, 586, "The gun farm", "Taken by 2nd Platoon"], [592, 600, "HARROW BROOK", "Rendered in the Steel Front engine"]];
  // the camera tries its framing first, then the mirrored side, then a closer one, and cuts away when a house, a wall
  // or the ground hides the soldier for more than a moment
  const CANDS = [[1, 1], [-1, 1], [1, 0.6], [-1, 0.6]];
  let sm = null;
  const framing = (kind, o, u, i, e, p, fx, fz, sd, k) => {
    let pos, at, fov = 0.75;
    if (kind === "aerial") { const a = u * o.w + i; pos = [o.c[0] + Math.sin(a) * o.r, heightAt(o.c[0], o.c[1]) + o.h, o.c[1] + Math.cos(a) * o.r]; at = [o.c[0], heightAt(o.c[0], o.c[1]), o.c[1]]; fov = 0.9; }
    else if (kind === "crane") { pos = [o.c[0] + o.r, heightAt(o.c[0], o.c[1]) + o.h - u * 1.1, o.c[1] - o.r * 0.6]; at = e; fov = 0.7; }
    else if (kind === "follow") { const l = (1 - sd) * 0.8; pos = vadd(e, [-fx * 5.5 * k + fz * l, 1.4, -fz * 5.5 * k - fx * l]); at = vadd(e, [fx * 8, 0, fz * 8]); fov = 0.85; }
    else if (kind === "side") { pos = vadd(e, [fz * 6.5 * sd * k, 0.3, -fx * 6.5 * sd * k]); at = vadd(e, [fx * 2, 0, fz * 2]); fov = 0.7; }
    else if (kind === "low") { pos = vadd(p.pos, [fx * 7 * k + fz * 1.5 * sd, 0.45, fz * 7 * k - fx * 1.5 * sd]); at = e; fov = 0.8; }
    else if (kind === "close") { pos = vadd(e, [fx * 2.2 * k + fz * 1.2 * sd, 0.15, fz * 2.2 * k - fx * 1.2 * sd]); at = vadd(e, [0, 0.2, 0]); fov = 0.6; }
    else if (kind === "wide") { const A = o.at; pos = [A[0], heightAt(A[0], A[1]) + 6, A[1]]; at = e; fov = 0.45; }
    else if (kind === "vista") { pos = vadd(e, [-fx * 3 * k - fz * 1.6 * sd, 0.9, -fz * 3 * k + fx * 1.6 * sd]); at = [HB.B[0], heightAt(HB.B[0], HB.B[1]) + 6, HB.B[1]]; fov = 0.55; }
    else if (kind === "ots") { // over the shoulder along his aim, pulled back so he holds a third of the frame, not half
      const ax = Math.sin(cam.yaw), az = Math.cos(cam.yaw), b = 3.6 * k;
      pos = vadd(e, [-ax * b + az * 1.1 * sd, 0.45, -az * b - ax * 1.1 * sd]); at = vadd(e, [ax * 30, 30 * Math.tan(clamp(cam.pitch, -0.3, 0.3)) + 0.3, az * 30]); fov = 0.7; }
    pos[1] = Math.max(pos[1], heightAt(pos[0], pos[2]) + 0.35);
    return { pos, at, fov };
  };
  const tracks = k => k !== "aerial" && k !== "wide" && k !== "crane";
  function shotCam() {
    const t = FILM.t; let i = 0; while (i + 1 < SHOTS.length && SHOTS[i + 1][0] <= t) i++;
    const [t0, kind, o] = SHOTS[i], u = t - t0, p = P(), e = vadd(p.pos, [0, 1.3, 0]), yaw = p.F ? p.F.bodyYaw : cam.yaw, fx = Math.sin(yaw), fz = Math.cos(yaw);
    if (!sm || sm.i !== i) sm = { i, c: 0, blockT: 0, pos: null };
    let f = framing(kind, o, u, i, e, p, fx, fz, ...CANDS[sm.c]);
    if (!tracks(kind)) { // fixed and flying cameras: smooth in the world
      if (sm.pos === null) { sm.pos = f.pos; sm.at = f.at; } else { sm.pos = f.pos; sm.at = vlerp(sm.at, f.at, kind === "wide" ? 0.15 : 0.2); }
      FILM.cand = sm.c; return { pos: sm.pos, at: sm.at, fov: f.fov };
    }
    // tracking cameras smooth their offset from him, so a running soldier can't outrun the frame
    const off = vsub(f.pos, e), aoff = vsub(f.at, e);
    if (sm.pos === null) { sm.off = off; sm.aoff = aoff; } else { sm.off = vlerp(sm.off, off, 0.25); sm.aoff = vlerp(sm.aoff, aoff, 0.3); }
    let pos = vadd(e, sm.off); pos[1] = Math.max(pos[1], heightAt(pos[0], pos[2]) + 0.35); sm.pos = pos;
    sm.blockT = los(pos, e) ? 0 : sm.blockT + 1 / FILM.fps;
    if (sm.blockT > 0.4) { // a house, a wall or the ground has hidden him: cut to the first framing that sees him
      for (let j = 1; j <= CANDS.length; j++) { const c = (sm.c + j) % CANDS.length, g = framing(kind, o, u, i, e, p, fx, fz, ...CANDS[c]); if (los(g.pos, e)) { sm.c = c; f = g; break; } }
      sm.off = vsub(f.pos, e); sm.aoff = vsub(f.at, e); pos = f.pos; sm.blockT = 0; FILM.recut = (FILM.recut || 0) + 1;
    }
    sm.at = vadd(e, sm.aoff);
    FILM.cand = sm.c;
    return { pos, at: sm.at, fov: f.fov };
  }
  FILM.probe = () => { shotCam(); return FILM.cand ? `cand ${FILM.cand} recuts ${FILM.recut}` : ''; };
  // ---- hooks into the game loop
  const step0 = step, render0 = render;
  step = function (h) { if (state === "playing") { drive(h); squad(); } step0(h); };
  render = function () {
    const c = state === "playing" ? shotCam() : null;
    if (!c) return render0();
    const save = [cam.pos, cam.dir, cam.fov]; cam.pos = c.pos.slice(); cam.dir = vnorm(vsub(c.at, c.pos)); cam.fov = c.fov;
    try { render0(); } finally { [cam.pos, cam.dir, cam.fov] = save; }
  };
  // compose one frame: the 3D view, titles and fades (no game HUD)
  const comp = document.createElement("canvas"), cx = comp.getContext("2d");
  FILM.frame = (q = 0.88) => {
    const g = document.getElementById("game"); comp.width = g.width; comp.height = g.height; const Wd = comp.width, Hd = comp.height;
    cx.drawImage(g, 0, 0);
    const t = FILM.t, fade = Math.max(smoothstep(4, 0, t), smoothstep(FILM.len - 6, FILM.len, t));
    for (const [a, b, h1, h2] of TITLES) if (t >= a && t < b) { const al = Math.min(smoothstep(a, a + 1.5, t), smoothstep(b, b - 1.5, t));
      cx.save(); cx.globalAlpha = al; cx.textAlign = "center"; cx.fillStyle = "#f3ead8"; cx.shadowColor = "rgba(0,0,0,.7)"; cx.shadowBlur = Hd * 0.02;
      cx.font = `600 ${Math.round(Hd * 0.075)}px Georgia, serif`; cx.fillText(h1, Wd / 2, Hd * 0.78);
      cx.font = `${Math.round(Hd * 0.04)}px Georgia, serif`; cx.fillText(h2, Wd / 2, Hd * 0.86); cx.restore(); }
    if (fade > 0) { cx.fillStyle = `rgba(0,0,0,${fade})`; cx.fillRect(0, 0, Wd, Hd); }
    return comp.toDataURL("image/jpeg", q);
  };
  FILM.setup = setup; FILM.dbg = () => ({ wi, waitT: +waitT.toFixed(1), n: ROUTE.length });
})();
