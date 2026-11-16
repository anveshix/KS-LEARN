// Session engine (no DOM): teach -> question -> feedback/remediation -> next.
import { rng } from './rng.js';
import { check } from './check.js';
import { update, guessRate } from './mastery.js';
import { frontier, classNow } from './planner.js';

export function makeQuestion(sk, st, seed) {
  const s = st[sk.id];
  const recent = s.recent || (s.recent = []);
  let q;
  for (let i = 0; i < 12; i++) {
    q = sk.gen(rng(seed + i * 7919));
    if (!q.key || !recent.includes(q.key)) break;
  }
  if (q.key) { recent.push(q.key); if (recent.length > Math.min(8, (sk.size || 9) - 1)) recent.shift(); }
  q.skill = sk.id;
  return q;
}

// app: { skills, byId, state:{profile, skills, log, days, stars, asks}, now():Date, day():string, misc }
export function createSession(app, plan, opts = {}) {
  const st = app.state.skills;
  let i = 0, cur = null, t0 = 0, firstTry = true;
  const stats = { asked: 0, correct: 0, mastered: [], stuck: [], stars: 0 };
  let seed = (opts.seed || (Date.now() & 0x7fffffff)) >>> 0;
  const skip = new Set(); // skills the learner got stuck on in this session: move on, a parent is flagged
  const goal = opts.mission ? (opts.goal || app.state.profile.dailyQ || plan.length) : 0;

  function pickSkill(step) {
    if (step.kind === 'review' || step.kind === 'skill') return app.byId[step.skill];
    const f = frontier(app.skills, st, step.strand, classNow(app.state.profile, app.now()));
    return f.find(sk => !skip.has(sk.id)) || f[0] || null;
  }
  function next() {
    while (i < plan.length) {
      const step = plan[i];
      const sk = pickSkill(step);
      const s = sk && st[sk.id];
      if (!s) { i++; continue; }
      if (!s.seen && step.kind === 'learn' && !opts.test) {
        s.seen = true;
        const ex = sk.gen(rng(seed += 101));
        return (cur = { type: 'lesson', skill: sk, example: ex, index: i, total: plan.length });
      }
      const q = makeQuestion(sk, st, (seed += 104729));
      t0 = app.now().getTime(); firstTry = true;
      return (cur = { type: 'q', skill: sk, q, review: step.kind === 'review', index: i, total: plan.length });
    }
    return (cur = { type: 'done', stats });
  }
  function answer(raw) {
    if (!cur || cur.type !== 'q') return { valid: false };
    const { q, skill: sk } = cur;
    const res = check(q, raw);
    if (!res.valid) return res;
    const ms = Math.min(180000, app.now().getTime() - t0);
    const day = app.day();
    const ev = update(st[sk.id], res.ok, guessRate(q), day, res.trap, ms);
    stats.asked++; if (res.ok) { stats.correct++; stats.stars++; app.state.stars = (app.state.stars || 0) + 1; }
    if (ev.includes('mastered')) { stats.mastered.push(sk.id); stats.stars += 5; app.state.stars += 5; }
    if (ev.includes('stuck')) {
      stats.stuck.push(sk.id); skip.add(sk.id);
      for (const p of sk.pre) if (st[p] && st[p].m) st[p].due = day; // revisit what this skill is built on
    }
    const d = app.state.days[day] || (app.state.days[day] = { q: 0, c: 0, ms: 0, mq: 0, done: false });
    d.q++; d.c += res.ok ? 1 : 0; d.ms += ms;
    // Mission progress is counted per answer, so closing the app after the last question still counts.
    if (opts.mission) { d.mq = (d.mq || 0) + 1; if (d.mq >= goal) d.done = true; }
    app.state.log.push({ d: day, s: sk.id, ok: res.ok ? 1 : 0, ms, m: res.trap || undefined });
    if (app.state.log.length > 6000) app.state.log.splice(0, app.state.log.length - 6000);
    i++;
    return { ...res, events: ev, q, skill: sk, remedy: res.trap ? app.misc[res.trap] : null };
  }
  // "I did not understand": flag this question for the parent. Not graded.
  function askParent() {
    if (!cur || cur.type !== 'q') return false;
    const pr = cur.q.prompt;
    app.state.asks.push({ d: app.day(), s: cur.skill.id, q: String(typeof pr === 'string' ? pr : pr.en).slice(0, 400), done: false });
    if (app.state.asks.length > 60) app.state.asks.shift();
    return true;
  }
  const finish = () => { if (opts.mission && stats.asked > 0 && i >= plan.length) (app.state.days[app.day()] ||= { q: 0, c: 0, ms: 0, mq: 0 }).done = true; return stats; };
  return { next, answer, askParent, finish, get current() { return cur; }, stats };
}

export function streak(days, today, addDaysFn) {
  // Consecutive days with a finished mission; one missed day does not break it.
  let n = 0, miss = 0, d = today;
  if (!(days[d] && days[d].done)) d = addDaysFn(d, -1);
  for (let k = 0; k < 400; k++) {
    if (days[d] && days[d].done) { n++; miss = 0; } else if (++miss > 1) break;
    d = addDaysFn(d, -1);
  }
  return n;
}
