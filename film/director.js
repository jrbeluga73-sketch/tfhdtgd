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
    // the game's sound code draws from the battle's random stream (noiseHit), and its voice cap counts sounds the audio
    // thread releases in real time (onended), so under load a dropped sound shifted every later random draw and the battle
    // branched (first at the 4:03 barrage). The film has its own soundtrack: never drop a game sound, so the draws are
    // the same in every run.
    voice = () => true;
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
  // he only engages an enemy he can see: the nearest one within range with a clear line from his eyes to it
  const near = (q, r) => { let b = null, bd = r; for (const s of enemies()) { const d = Math.hypot(s.p[0] - q[0], s.p[2] - q[2]); if (d < bd && infLos(q, s.p)) { bd = d; b = s; } } return b; };
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
    [170, "aerial", { c: [-200, -210], r: 160, h: 70, w: 0.05 }], [186, "follow", { tight: [186.5, 193.5] }], [202, "low", {}], [216, "side", {}], [226, "vista", {}],
    [238, "aerial", { c: [HB.B[0], HB.B[1]], r: 230, h: 95, w: 0.03 }], [252, "close", {}], [262, "follow", {}], [278, "side", {}], [292, "follow", {}],
    [304, "low", {}], [316, "ots", {}], [332, "side", {}], [344.5, "follow", {}], [362, "low", {}], [374, "ots", {}], [390, "close", {}], [400, "side", {}],
    [410, "rev", { seq: [[0, [221, 404.9], 1, 0.045]] }], [424, "aerial", { c: [HB.B[0], HB.B[1]], r: 150, h: 60, w: -0.04 }], [436, "follow", {}], [450, "low", {}], [458, "rev", { seq: [[0, [284.5, 390], 1], [8, [225.5, 419.9], -1]] }],
    [474, "side", {}], [486, "follow", {}], [496, "rev", { seq: [[0, [289, 405], 1], [3, [284.4, 420], 1, 0.03]] }], [512, "close", {}], [520, "follow", {}], [530, "ots", {}], [544, "side", {}],
    [554, "follow", {}], [564, "low", {}], [574, "aerial", { c: [HB.C[0], HB.C[1]], r: 110, h: 45, w: 0.04 }], [588, "aerial", { c: [HB.C[0], HB.C[1]], r: 300, h: 140, w: -0.02 }],
  ];
  const TITLES = [[3, 12, "HARROW BROOK", "Autumn, 1944 · first light"], [24, 33, "Private Tom Ashby", "Radio operator, 2nd Platoon"], [126, 133, "The orchard hamlet", ""],
    [228, 236, "Observation Hill", "Call the guns on the church village"], [306, 313, "The ford", ""], [378, 385, "The church village", ""],
    [478, 486, "The north ridge", "The enemy's guns"], [578, 586, "The gun farm", "Taken by 2nd Platoon"], [592, 600, "HARROW BROOK", "Rendered in the Steel Front engine"]];
  // a framing is blocked by a building, wall, standing tree or bush (each as a box) between it and his eyes, or around the camera
  const nearXZ = (a, x, z, L) => Math.abs(x - a[0]) < L + 12 && Math.abs(z - a[2]) < L + 12;
  const blocked = (a, b) => { const d = vsub(b, a), L = Math.hypot(...d), b1 = L > 1.2 ? vadd(a, d.map(v => v * (L - 1) / L)) : b;
    return buildings.some(bd => segAABB(a, b, bd.mn, bd.mx)) ||
      trees.some(tr => !tr.fall && !tr.falling && nearXZ(a, tr.x, tr.z, L) && segAABB(a, b1, [tr.x - 2.4 * tr.s, tr.y, tr.z - 2.4 * tr.s], [tr.x + 2.4 * tr.s, tr.y + 9 * tr.s, tr.z + 2.4 * tr.s])) ||
      (typeof BUSHES !== "undefined" && BUSHES.some(([x, z, sc]) => nearXZ(a, x, z, L) && segAABB(a, b1, [x - 1.4 * sc, heightAt(x, z) - 0.2, z - 1.4 * sc], [x + 1.4 * sc, heightAt(x, z) + 1.9 * sc, z + 1.4 * sc]))); };
  let sm = null, foeT = null;
  // the lens must see him: no wall, tree, bush or tank (a wreck included) between his shoulder and the enemy
  const clearTo = (e, q) => !blocked(e, q) && !tanks.some(t => !t.type.air && segSphere(e, q, center(t), 3.2));
  const foeInView = (e, fx, fz) => { if (foeT && !foeT.dead && foeT.st !== "gone" && infLos(foeT.p, P().pos) && clearTo(e, [foeT.p[0], foeT.p[1] + 1.1, foeT.p[2]]) && sm && sm.i === foeShot) return foeT;
    let b = null, bd = 220; for (const s of enemies()) { const dx = s.p[0] - e[0], dz = s.p[2] - e[2], d = Math.hypot(dx, dz);
      if (d < bd && (dx * fx + dz * fz) / d > 0.3 && infLos(s.p, P().pos) && clearTo(e, [s.p[0], s.p[1] + 1.1, s.p[2]])) { bd = d; b = s; } }
    foeT = b; return b; };
  let foeShot = -1;
  // a closer follow from the open side, for a stretch where he walks in a wall's shadow (o.tight: [from, to]); once a wall
  // hides him (he rounds a corner) the shot hands back to the normal follow framing for good
  const tightCam = (e, fx, fz) => { const sd = buildings.some(bd => segAABB(e, vadd(e, [fz * 2.4, 0, -fx * 2.4]), bd.mn, bd.mx)) ? -1 : 1;
    return { pos: vadd(e, [-fx * 3.2 + fz * sd * 1.5, 0.5, -fz * 3.2 - fx * sd * 1.5]), at: vadd(e, [fx * 6, -0.2, fz * 6]), fov: 0.72 }; };
  // the reverse angle: behind a dug-in enemy's shoulder at his post, looking down his line of fire towards the hero. A post
  // faces south, so from the hero's side the sandbags hide all but his helmet; from behind he reads whole, kneeling and firing.
  // k: 0 low behind his shoulder; 1 the same, raised over a fence or rail in the way. dr: a slow arc round him (rad/s, with a
  // gentle push-in) so a long shot of a man who is only watching still moves
  const revCam = (s, e, side = 1, k = 0, u = 0, dr = 0) => { const q = vadd(s.p, [0, 1.0, 0]), d = vsub(e, q), z = Math.hypot(d[0], d[2]), a = side * dr * u,
      ca = Math.cos(a), sa = Math.sin(a), ux = (d[0] * ca - d[2] * sa) / z, uz = (d[0] * sa + d[2] * ca) / z, b = 3.8 - Math.min(0.6, dr * 1.2 * u), h = k ? 2.1 : 0.5;
    return { pos: vadd(q, [-ux * b + uz * side * 1.8, h, -uz * b - ux * side * 1.8]), at: vadd(q, [d[0] / z * 14, k ? -1.0 : -0.3, d[2] / z * 14]), fov: 0.62, q }; }; // he sits a third in from the side, helmet to knees in frame
  // a fence span (rails to 1.2 m) crossing the line a -> b
  const fenced = (a, b) => FENCES.some(([x0, y0, z0, x1, y1, z1]) => { if (Math.min(a[0], b[0]) > Math.max(x0, x1) + 1 || Math.max(a[0], b[0]) < Math.min(x0, x1) - 1 || Math.min(a[2], b[2]) > Math.max(z0, z1) + 1 || Math.max(a[2], b[2]) < Math.min(z0, z1) - 1) return false;
    for (let i = 1; i < 40; i++) { const p = vlerp(a, b, i / 40), ex = x1 - x0, ez = z1 - z0, w = clamp(((p[0] - x0) * ex + (p[2] - z0) * ez) / (ex * ex + ez * ez || 1), 0, 1);
      if (Math.hypot(p[0] - x0 - ex * w, p[2] - z0 - ez * w) < 0.15 && p[1] < lerp(y0, y1, w) + 1.25) return true; } return false; });
  const ground = (a, b) => { for (let i = 1; i < 8; i++) { const q = vlerp(a, b, i / 8); if (q[1] < heightAt(q[0], q[2]) + 0.1) return false; } return true; }; // no rise of ground between
  const atPost = q => enemies().find(s => s.post && Math.hypot(s.post[0] - q[0], s.post[1] - q[1]) < 0.2);
  const revOk = (s, e, side, k = 0, u = 0, dr = 0) => { if (!s || s.dead || s.st === "gone") return false; const c = revCam(s, e, side, k, u, dr), kn = vadd(s.p, [0, 0.4, 0]);
    return !blocked(c.pos, c.q) && ground(c.pos, c.q) && !fenced(c.pos, c.q) && !fenced(c.pos, kn) && typeof FENCES !== "undefined" &&
      !buildings.some(bd => c.pos[0] > bd.mn[0] - 0.5 && c.pos[0] < bd.mx[0] + 0.5 && c.pos[2] > bd.mn[2] - 0.5 && c.pos[2] < bd.mx[2] + 0.5); };
  // the framing a reverse angle takes: its own side, the other side, then raised (each side); it only moves on along this list
  const REVK = [[1, 0], [-1, 0], [1, 1], [-1, 1]], revK = {};
  const revPick = (key, s, e, side, u, dr) => { for (let j = revK[key] || 0; j < REVK.length; j++) if (revOk(s, e, side * REVK[j][0], REVK[j][1], u, dr)) return revK[key] = j; return revK[key] = 9; };
  function shotCam() {
    const t = FILM.tc ?? FILM.t; let i = 0; while (i + 1 < SHOTS.length && SHOTS[i + 1][0] <= t) i++;
    foeShot = i; const [t0, kind, o] = SHOTS[i], u = t - t0, p = P(), e = vadd(p.pos, [0, 1.3, 0]), yaw = p.F ? p.F.bodyYaw : cam.yaw, fx = Math.sin(yaw), fz = Math.cos(yaw);
    let pos, at, fov = 0.75;
    // close shots try their framing, then fall back (mirrored side, then higher and wider) when a wall, tree or bush is in the way;
    // a shot never steps back to an earlier framing, so it cuts at most twice
    // hug: a follow framing also fails when a wall runs within 2.5 m beside the camera (it fills half the frame)
    const hug = q => buildings.some(bd => segAABB(vadd(q, [-fz * 2.5, 0, fx * 2.5]), vadd(q, [fz * 2.5, 0, -fx * 2.5]), bd.mn, bd.mx));
    const bad = c => blocked(c.pos, e) || (c.hug && hug(c.pos));
    const framing = (...c) => { const k = c.length, j0 = sm && sm.i === i && sm.j - jOff < k ? Math.max(0, sm.j - jOff) : 0; let j = j0; if (bad(c[j])) { j = j0 + 1; while (j < k - 1 && bad(c[j])) j++; } pick = Math.min(j, k - 1); return c[pick]; };
    let pick = 0, foe = null, rv, rk, tc, jOff = 0;
    if (kind === "aerial") { const a = u * o.w + i; pos = [o.c[0] + Math.sin(a) * o.r, heightAt(o.c[0], o.c[1]) + o.h, o.c[1] + Math.cos(a) * o.r]; at = [o.c[0], heightAt(o.c[0], o.c[1]), o.c[1]]; fov = 0.9; }
    else if (kind === "crane") { pos = [o.c[0] + o.r, heightAt(o.c[0], o.c[1]) + o.h - u * 1.1, o.c[1] - o.r * 0.6]; at = e; fov = 0.7; }
    else if (kind === "follow" && o.tight && t >= o.tight[0] && t < o.tight[1] && !o.tightOff && (tc = tightCam(e, fx, fz)) && !(o.tightOff = blocked(tc.pos, e))) ({ pos, at, fov } = tc, pick = 50);
    else if (kind === "follow") ({ pos, at, fov } = framing({ pos: vadd(e, [-fx * 5.5, 1.4, -fz * 5.5]), at: vadd(e, [fx * 8, 0, fz * 8]), fov: 0.85, hug: true }, // a wall beside him: step out to the open side
      { pos: vadd(e, [-fx * 5 + fz * 3.5, 1.4, -fz * 5 - fx * 3.5]), at: vadd(e, [fx * 8, 0, fz * 8]), fov: 0.85, hug: true },
      { pos: vadd(e, [-fx * 5 - fz * 3.5, 1.4, -fz * 5 + fx * 3.5]), at: vadd(e, [fx * 8, 0, fz * 8]), fov: 0.85, hug: true }, { pos: vadd(e, [-fx * 6.5, 6, -fz * 6.5]), at: vadd(e, [fx * 4, -0.5, fz * 4]), fov: 0.85 })); // high: aimed just ahead of him, so he stays in the lower third
    else if (kind === "side") ({ pos, at, fov } = framing({ pos: vadd(e, [fz * 6.5, 0.3, -fx * 6.5]), at: vadd(e, [fx * 2, 0, fz * 2]), fov: 0.7 },
      { pos: vadd(e, [-fz * 6.5, 0.3, fx * 6.5]), at: vadd(e, [fx * 2, 0, fz * 2]), fov: 0.7 }, { pos: vadd(e, [-fx * 7, 3.5, -fz * 7]), at: vadd(e, [fx * 6, 0, fz * 6]), fov: 0.85 }));
    else if (kind === "low") ({ pos, at, fov } = framing({ pos: vadd(p.pos, [fx * 7 + fz * 1.5, 0.45, fz * 7 - fx * 1.5]), at: e, fov: 0.8 },
      { pos: vadd(p.pos, [fx * 7 - fz * 1.5, 0.45, fz * 7 + fx * 1.5]), at: e, fov: 0.8 }, { pos: vadd(e, [-fx * 7, 3.5, -fz * 7]), at: vadd(e, [fx * 6, 0, fz * 6]), fov: 0.85 }));
    else if (kind === "close") ({ pos, at, fov } = framing({ pos: vadd(e, [fx * 2.2 + fz * 1.2, 0.15, fz * 2.2 - fx * 1.2]), at: vadd(e, [0, 0.2, 0]), fov: 0.6 },
      { pos: vadd(e, [fx * 2.2 - fz * 1.2, 0.15, fz * 2.2 + fx * 1.2]), at: vadd(e, [0, 0.2, 0]), fov: 0.6 }, { pos: vadd(e, [fx * 3 + fz * 2, 1.6, fz * 3 - fx * 2]), at: e, fov: 0.65 }));
    else if (kind === "ots") ({ pos, at, fov } = framing({ pos: vadd(e, [-fx * 4.4 + fz * 1.5, 0.6, -fz * 4.4 - fx * 1.5]), at: vadd(e, [fx * 30, 0, fz * 30]), fov: 0.8 }, // he sits in the right third
      { pos: vadd(e, [-fx * 4.4 - fz * 1.5, 0.6, -fz * 4.4 + fx * 1.5]), at: vadd(e, [fx * 30, 0, fz * 30]), fov: 0.8 }, { pos: vadd(e, [-fx * 6, 3, -fz * 6]), at: vadd(e, [fx * 10, 0, fz * 10]), fov: 0.85 }));
    else if (kind === "foe" && (foe = foeInView(e, fx, fz))) { // a long lens past his shoulder on the enemy he is fighting, so the enemy reads on screen
      const q = [foe.p[0], foe.p[1] + 1.1, foe.p[2]], d = vsub(q, e), z = Math.hypot(d[0], d[2]), sx = d[2] / z, sz = -d[0] / z;
      pos = vadd(e, [-d[0] / z * 3.2 + sx * 1.1, 0.5, -d[2] / z * 3.2 + sz * 1.1]); at = q; fov = clamp(2 * Math.atan(1.7 / (z * 0.3)), 0.05, 0.5); pick = 1 + INF.indexOf(foe); } // a new enemy is a clean cut
    else if (kind === "rev" && (rv = o.seq.filter(r => r[0] <= u).pop()) && (rk = revPick(i + ":" + o.seq.indexOf(rv), atPost(rv[1]), e, rv[2], u - rv[0], rv[3] || 0)) < 9) // reverse angles on chosen enemies (o.seq: [from s into the shot, his post, side, arc rad/s], picked from the fixed battle's --diag --foes log); each is a clean cut
      ({ pos, at, fov } = revCam(atPost(rv[1]), e, rv[2] * REVK[rk][0], REVK[rk][1], u - rv[0], rv[3] || 0), pick = 1 + o.seq.indexOf(rv) * 4 + rk);
    else if (kind === "rev" && (jOff = 90)) ({ pos, at, fov } = framing({ pos: vadd(e, [-fx * 5.5, 1.4, -fz * 5.5]), at: vadd(e, [fx * 8, 0, fz * 8]), fov: 0.85, hug: true }, { pos: vadd(e, [-fx * 6.5, 6, -fz * 6.5]), at: vadd(e, [fx * 4, -0.5, fz * 4]), fov: 0.85 }), pick += 90); // the enemy is gone: back on the hero
    else if (kind === "foe") ({ pos, at, fov } = { pos: vadd(e, [-fx * 4.4 + fz * 1.5, 0.6, -fz * 4.4 - fx * 1.5]), at: vadd(e, [fx * 30, 0, fz * 30]), fov: 0.8 });
    else if (kind === "wide") { const A = o.at; pos = [A[0], heightAt(A[0], A[1]) + 6, A[1]]; at = e; fov = 0.45; }
    else if (kind === "vista") { pos = vadd(e, [-fx * 3 - fz * 1.6, 0.9, -fz * 3 + fx * 1.6]); at = [HB.B[0], heightAt(HB.B[0], HB.B[1]) + 6, HB.B[1]]; fov = 0.55; }
    pos[1] = Math.max(pos[1], heightAt(pos[0], pos[2]) + 0.35);
    // smoothing is in seconds, not frames, and shots that ride with him smooth their offset from him, so a sprinting
    // soldier never outruns a close camera (at 6 fps a per-frame lag left it metres behind, inside or behind his back)
    const rel = kind !== "aerial" && kind !== "wide" && !(kind === "rev" && pick < 90), o0 = rel ? e : [0, 0, 0], dt = sm ? Math.max(0, t - sm.t) : 0;
    const op = vsub(pos, o0), oa = vsub(at, o0);
    if (!sm || sm.i !== i || sm.j !== pick) sm = { i, j: pick, op, oa }; // new shot or a fallback: a clean cut, never a swoop through a wall
    else { const kp = kind === "aerial" ? 1 : 1 - Math.exp(-dt * 4), ka = kind === "wide" ? 1 - Math.exp(-dt * 3) : 1 - Math.exp(-dt * 6);
      sm.op = vlerp(sm.op, op, kp); sm.oa = vlerp(sm.oa, oa, ka); }
    sm.t = t; sm.pos = vadd(o0, sm.op); sm.at = vadd(o0, sm.oa); sm.pos[1] = Math.max(sm.pos[1], heightAt(sm.pos[0], sm.pos[2]) + 0.35);
    return { pos: sm.pos, at: sm.at, fov };
  }
  // fill light [from, to, strength] (film time, ramped over 1 s at each end): 3:06.5-3:13.5 he walks in the shed's shadow
  const FILL = [[186.5, 193.5, 1.5]]; let fillNow = 0;
  // the game sets its light (LIGHT) from the map in applyAtmo, inside each drawing; the fill is laid over it there: more
  // ambient light, which lifts the shade far more than the sunlit side
  const atmo0 = applyAtmo; applyAtmo = function (D) { atmo0(D); if (fillNow > 0) LIGHT = { ...LIGHT, amb: LIGHT.amb - fillNow }; };
  // ---- hooks into the game loop
  const step0 = step, render0 = render;
  step = function (h) { if (state === "playing") { drive(h); squad(); } step0(h); };
  render = function () {
    const c = state === "playing" ? shotCam() : null; FILM.lastCam = c; // the sound pass places sounds around the camera actually drawn
    if (!c) return render0();
    const save = [cam.pos, cam.dir, cam.fov]; cam.pos = c.pos.slice(); cam.dir = vnorm(vsub(c.at, c.pos)); cam.fov = c.fov;
    const t = FILM.tc ?? FILM.t; fillNow = FILL.reduce((m, [a, b, k]) => Math.max(m, k * clamp(Math.min(t - a, b - t), 0, 1)), 0);
    try { render0(); } finally { [cam.pos, cam.dir, cam.fov] = save; fillNow = 0; }
  };
  // compose one frame: the 3D view, titles and fades (no game HUD)
  const comp = document.createElement("canvas"), cx = comp.getContext("2d");
  FILM.frame = (q = 0.88) => {
    const g = document.getElementById("game"); comp.width = g.width; comp.height = g.height; const Wd = comp.width, Hd = comp.height;
    cx.drawImage(g, 0, 0);
    const t = FILM.tc ?? FILM.t, fade = Math.max(smoothstep(4, 0, t), smoothstep(FILM.len - 6, FILM.len, t));
    for (const [a, b, h1, h2] of TITLES) if (t >= a && t < b) { const al = Math.min(smoothstep(a, a + 1.5, t), smoothstep(b, b - 1.5, t));
      cx.save(); cx.globalAlpha = al; cx.textAlign = "center"; cx.fillStyle = "#f3ead8"; cx.shadowColor = "rgba(0,0,0,.7)"; cx.shadowBlur = Hd * 0.02;
      cx.font = `600 ${Math.round(Hd * 0.075)}px Georgia, serif`; cx.fillText(h1, Wd / 2, Hd * 0.78);
      cx.font = `${Math.round(Hd * 0.04)}px Georgia, serif`; cx.fillText(h2, Wd / 2, Hd * 0.86); cx.restore(); }
    if (fade > 0) { cx.fillStyle = `rgba(0,0,0,${fade})`; cx.fillRect(0, 0, Wd, Hd); }
    return comp.toDataURL("image/jpeg", q);
  };
  // FILM.camAt: the film camera, for the sound pass (sound/events.js)
  FILM.probe = () => ""; FILM.setup = setup; FILM.camAt = () => state === "playing" ? shotCam() : null; FILM.shotDbg = () => sm && { i: sm.i, j: sm.j, pos: sm.pos.map(Math.round), at: sm.at.map(Math.round) }; FILM.foesDbg = () => { const e = vadd(P().pos, [0, 1.3, 0]); // --diag: every live enemy within 300 m: [his post (x, z: how a shot names him; INF indices shift as the dead are removed), x, z, distance, he sees the hero, reverse angle clear (side 1, side -1), fired in the last 2 s]
    return enemies().map(s => [s.post ? s.post.map(v => +v.toFixed(1)).join(",") : "-", Math.round(s.p[0]), Math.round(s.p[2]), Math.round(Math.hypot(s.p[0] - e[0], s.p[2] - e[2])), +infLos(s.p, P().pos), +revOk(s, e, 1), +revOk(s, e, -1), +revOk(s, e, 1, 1), +revOk(s, e, -1, 1), +(now - (s.shotT ?? -9) < 2), s.st]).filter(r => r[3] < 300); };
  FILM.dbg = () => ({ wi, waitT: +waitT.toFixed(1), n: ROUTE.length });
})();
