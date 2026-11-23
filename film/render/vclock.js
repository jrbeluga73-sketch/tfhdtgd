// injected before the page: virtual clock, manual rAF, virtual timers, seeded Math.random
(() => {
  let vt = 0, seq = 0; const raf = [], timers = new Map();
  const T0 = 1795400000000; // fixed wall clock
  let s = 0x9e3779b9 >>> 0;
  Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  performance.now = () => vt;
  Date.now = () => T0 + vt;
  window.requestAnimationFrame = cb => { raf.push(cb); return ++seq; };
  window.cancelAnimationFrame = () => {};
  window.setTimeout = (fn, ms = 0, ...a) => { const id = ++seq; timers.set(id, { at: vt + Math.max(0, +ms || 0), fn, a }); return id; };
  window.clearTimeout = id => { timers.delete(id); };
  window.setInterval = (fn, ms = 0, ...a) => { const id = ++seq; const tick = () => { if (!timers.has(id)) return; fn(...a); timers.set(id, { at: vt + Math.max(16, ms), fn: tick, a: [] }); }; timers.set(id, { at: vt + Math.max(16, ms), fn: tick, a: [] }); return id; };
  window.clearInterval = id => { timers.delete(id); };
  const runTimers = () => { for (let guard = 0; guard < 1000; guard++) { let best = null; for (const [id, t] of timers) if (t.at <= vt && (!best || t.at < best[1].at)) best = [id, t]; if (!best) return; timers.delete(best[0]); try { typeof best[1].fn === "function" ? best[1].fn(...best[1].a) : eval(best[1].fn); } catch (e) { console.error("timer", e && e.message); } } };
  window.__vt = {
    advance(ms) { vt += ms; runTimers(); const q = raf.splice(0); for (const cb of q) { try { cb(vt); } catch (e) { console.error("raf", e && e.message); } } runTimers(); },
    get t() { return vt; }, get pending() { return raf.length; },
  };
  try { Object.defineProperty(document, "hidden", { get: () => false }); Object.defineProperty(document, "visibilityState", { get: () => "visible" }); } catch (e) {}
})();
