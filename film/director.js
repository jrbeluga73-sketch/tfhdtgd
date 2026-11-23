// Harrow Brook: the film director. Injected into steelfront.html (sandbox on the "brook" map) by render/render.js.
// It runs the game's own simulation: one allied radio operator (the player soldier, driven by scripted input) leads a
// squad from the southern woods through the orchard hamlet, up Observation Hill to call a barrage on the church
// village, then across the ford into the village. The film camera is laid over the game camera only while drawing,
// so the soldier's aim and bullets still come from his own gameplay camera.
(() => {
  const FILM = window.FILM = { t: 0, len: 600, shot: null, cut: true, title: null, fade: 0 };
  const W = (x, z) => [x, z];
  // the mission route: [x, z, pause seconds at the point, what he does there]
  const ROUTE = [
    [-120, -440, 0], [-150, -380, 0], [-185, -310, 14, "fight"], [-200, -255, 0], [-210, -215, 20, "fight"], [-195, -170, 10, "fight"],
    [-175, -120, 0], [-160, -80, 0], [-150, -58, 34, "radio"], [-95, -40, 0], [-20, -20, 0], [HB.ford - 10, bkZ(HB.ford) - 24, 8, "fight"],
    [HB.ford, bkZ(HB.ford) + 4, 0], [HB.ford + 10, bkZ(HB.ford) + 40, 14, "fight"], [90, 120, 12, "fight"], [HB.B[0], HB.B[1], 999, "end"],
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
    for (const dx of [-30, 0, 30]) post(HB.ford + dx, bkZ(HB.ford) + 55, { mg: dx === 0 });
    for (const [dx, dz] of [[-28, 10], [26, 4], [0, -22]]) addCover({ x: HB.A[0] + dx, z: HB.A[1] + 40 + dz, hx: 4, hz: 0.7, kind: "sandbag", tag: "sb" });
    for (const dx of [-20, 20]) addCover({ x: HB.ford + dx, z: bkZ(HB.ford) + 52, hx: 4.5, hz: 0.7, kind: "sandbag", tag: "sb" });
    // armour: two allied tanks waiting at the wood edge, enemy tanks in the village
    FILM.ally = [steelFront.veh.spawn("medium", -60, -455, 0, -0.3), steelFront.veh.spawn("medium", -20, -470, 0, -0.3)].filter(Boolean);
    FILM.foe = [steelFront.veh.spawn("heavy", HB.B[0] + 30, HB.B[1] + 30, 1, Math.PI), steelFront.veh.spawn("medium", HB.B[0] - 40, HB.B[1] + 20, 1, Math.PI)].filter(Boolean);
    for (const t of FILM.foe) if (t.sb) t.sb.ord = "hold";
    for (const t of FILM.ally) if (t.sb) t.sb.ord = "hold";
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
    if (waitT <= 0 && wi < ROUTE.length - 1) { wi++; waitT = 0; cam.sniper = false; }
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
  const SHOTS = [
    [0, "aerial", { c: [-60, -150], r: 520, h: 210, w: 0.012 }], [22, "crane", { c: [-130, -440], h: 28, r: 60 }], [40, "close", {}], [52, "side", {}],
    [72, "follow", {}], [95, "low", {}], [118, "side", {}], [138, "wide", { at: [-260, -330] }], [160, "follow", {}], [185, "ots", {}], [210, "close", {}],
    [228, "aerial", { c: [-200, -210], r: 160, h: 70, w: 0.05 }], [248, "follow", {}], [270, "low", {}], [290, "wide", { at: [-60, -160] }], [308, "ots", {}],
    [328, "close", {}], [345, "vista", {}], [372, "ots", {}], [388, "vista", {}], [405, "follow", {}], [430, "side", {}], [452, "low", {}], [470, "ots", {}],
    [492, "follow", {}], [515, "side", {}], [535, "aerial", { c: [HB.B[0], HB.B[1]], r: 220, h: 90, w: 0.03 }], [555, "follow", {}], [572, "close", {}], [586, "aerial", { c: [HB.B[0], HB.B[1]], r: 300, h: 140, w: -0.02 }],
  ];
  const TITLES = [[3, 12, "HARROW BROOK", "Autumn, 1944 · first light"], [24, 33, "Private Tom Ashby", "Radio operator, 2nd Platoon"], [74, 81, "The orchard hamlet", "0.4 km"],
    [330, 338, "Observation Hill", "Call the guns on the church village"], [430, 437, "The ford", ""], [592, 600, "HARROW BROOK", "Rendered in the Steel Front engine"]];
  let sm = null;
  function shotCam() {
    const t = FILM.t; let i = 0; while (i + 1 < SHOTS.length && SHOTS[i + 1][0] <= t) i++;
    const [t0, kind, o] = SHOTS[i], u = t - t0, p = P(), e = vadd(p.pos, [0, 1.3, 0]), yaw = p.F ? p.F.bodyYaw : cam.yaw, fx = Math.sin(yaw), fz = Math.cos(yaw);
    if (kind === "ots") return null; // the game's own over-the-shoulder camera
    let pos, at, fov = 0.75;
    if (kind === "aerial") { const a = u * o.w + i; pos = [o.c[0] + Math.sin(a) * o.r, heightAt(o.c[0], o.c[1]) + o.h, o.c[1] + Math.cos(a) * o.r]; at = [o.c[0], heightAt(o.c[0], o.c[1]), o.c[1]]; fov = 0.9; }
    else if (kind === "crane") { pos = [o.c[0] + o.r, heightAt(o.c[0], o.c[1]) + o.h - u * 1.1, o.c[1] - o.r * 0.6]; at = e; fov = 0.7; }
    else if (kind === "follow") { pos = vadd(e, [-fx * 5.5, 1.4, -fz * 5.5]); at = vadd(e, [fx * 8, 0, fz * 8]); fov = 0.85; }
    else if (kind === "side") { pos = vadd(e, [fz * 6.5, 0.3, -fx * 6.5]); at = vadd(e, [fx * 2, 0, fz * 2]); fov = 0.7; }
    else if (kind === "low") { pos = vadd(p.pos, [fx * 7 + fz * 1.5, 0.45, fz * 7 - fx * 1.5]); at = e; fov = 0.8; }
    else if (kind === "close") { pos = vadd(e, [fx * 2.2 + fz * 1.2, 0.15, fz * 2.2 - fx * 1.2]); at = vadd(e, [0, 0.2, 0]); fov = 0.6; }
    else if (kind === "wide") { const A = o.at; pos = [A[0], heightAt(A[0], A[1]) + 6, A[1]]; at = e; fov = 0.45; }
    else if (kind === "vista") { pos = vadd(e, [-fx * 3 - fz * 1.6, 0.9, -fz * 3 + fx * 1.6]); at = [HB.B[0], heightAt(HB.B[0], HB.B[1]) + 6, HB.B[1]]; fov = 0.55; }
    pos[1] = Math.max(pos[1], heightAt(pos[0], pos[2]) + 0.35);
    if (!sm || sm.i !== i) sm = { i, pos, at };
    else { const k = kind === "aerial" || kind === "wide" ? 1 : 0.12; sm.pos = vlerp(sm.pos, pos, k); sm.at = vlerp(sm.at, at, kind === "wide" ? 0.15 : 0.2); }
    return { pos: sm.pos, at: sm.at, fov };
  }
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
  FILM.setup = setup;
})();
