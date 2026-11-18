// Single-writer lease between tabs of the same device.
//
// The state document is one JSON blob and every save replaces it wholesale, so two tabs
// that both believe they are the writer silently destroy each other's answers. This module
// elects one writer: the tab holding an unexpired lease. Everyone else is a reader and may
// explicitly take over, which is the only way a running session can be interrupted.
//
// Properties that matter here:
// - no server, no clock sync: a monotonic-ish Date.now() with a short TTL is enough;
// - a crashed or closed tab blocks the others for at most LEASE_MS (20 s);
// - taking over is a deliberate act, never a side effect of a storage event.
export const LEASE_MS = 20000;

const nowFn = opts => (opts.now ? opts.now() : Date.now());

export function createLease(storage, opts = {}) {
  const key = opts.key || 'kslearn.writer';
  const id = opts.id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const ttl = opts.ttl || LEASE_MS;

  function read() {
    try {
      const raw = storage.getItem(key);
      if (!raw) return null;
      const v = JSON.parse(raw);
      if (!v || typeof v.id !== 'string' || !Number.isFinite(v.at)) return null;
      return v;
    } catch { return null; }
  }
  function write() {
    try { storage.setItem(key, JSON.stringify({ id, at: nowFn(opts) })); return true; } catch { return false; }
  }
  function peer() {
    const cur = read();
    return cur && cur.id !== id && cur.at + ttl > nowFn(opts) ? cur : null;
  }
  function holds() {
    const cur = read();
    return !!(cur && cur.id === id && cur.at + ttl > nowFn(opts));
  }
  // Acquire only if nobody else holds a live lease. Returns false when another tab is active.
  function acquire() {
    const other = peer();
    if (other) return false;
    return write();
  }
  // Deliberate takeover: used only when the learner asks to work in this tab.
  function take() { return write(); }
  function renew() { return holds() && write(); }
  function release() {
    const cur = read();
    if (cur && cur.id === id) { try { storage.removeItem(key); } catch { /* ignore */ } }
  }
  return { key, id, ttl, read, peer, holds, acquire, take, renew, release };
}
