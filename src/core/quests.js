// Self-Determination Theory, made concrete: one quest a day, chosen by the child from three
// offers. Autonomy is the choice; competence is a visible, reachable goal; relatedness is
// the story and calm options. There is no leaderboard, no loss, no streak penalty.
import { L } from './i18n.js';

export const QUESTS = [
  {
    id: 'q.questions', metric: 'questions', goal: 12, stars: 3, icon: '🎯',
    title: L('Twelve true tries', 'बारह सच्ची कोशिशें'),
    desc: L('Answer twelve questions today. Hints and retries count as tries, not marks.', 'आज बारह प्रश्न हल करो। संकेत और दोबारा कोशिश भी कोशिश हैं, अंक नहीं।'),
  },
  {
    id: 'q.master', metric: 'mastered', goal: 1, stars: 5, icon: '🌟',
    title: L('Make one skill yours', 'एक कौशल अपना बनाओ'),
    desc: L('Master one skill today — a cold answer, not a scaffolded one.', 'आज एक कौशल सीख लो — बिना मदद वाला उत्तर, मदद वाला नहीं।'),
  },
  {
    id: 'q.lab', metric: 'labs', goal: 1, stars: 3, icon: '🧪',
    title: L('Turn a model', 'एक मॉडल घुमाओ'),
    desc: L('Finish one Curiosity Lab today, with all three questions.', 'आज एक जिज्ञासा लैब तीनों प्रश्नों के साथ पूरी करो।'),
  },
  {
    id: 'q.story', metric: 'stories', goal: 1, stars: 3, icon: '📖',
    title: L('Walk through a choice', 'एक चुनाव से गुज़रो'),
    desc: L('Finish one moral story and its reflection.', 'एक नैतिक कहानी और उसका चिंतन पूरा करो।'),
  },
  {
    id: 'q.calm', metric: 'calm', goal: 1, stars: 2, icon: '🌬️',
    title: L('One calm round', 'एक शांत चक्कर'),
    desc: L('Take one breathing break today, before the timer asks.', 'आज समय से पहले एक साँस का विराम लो।'),
  },
];
export const QUEST_IDS = QUESTS.map(q => q.id);
export const questById = id => QUESTS.find(q => q.id === id) || null;

const hash = day => {
  let h = 2166136261;
  for (const ch of String(day)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
// A calendar day is a stable number, so consecutive days always move the window by one.
// (Hashing the text could, by chance, give the same window twice in a row.)
const dayNumber = day => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day));
  if (!m) return hash(day);
  const n = Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5;
  return Number.isFinite(n) ? n : hash(day);
};

// Three offers, rotating with the date, always distinct. Over five days every quest appears.
export function offerFor(day) {
  const n = dayNumber(day);
  const start = ((n % QUESTS.length) + QUESTS.length) % QUESTS.length;
  return [0, 1, 2].map(i => QUESTS[(start + i * 2) % QUESTS.length]);
}

export const freshQuests = day => ({ day, id: null, done: false, total: 0 });

export function ensureQuests(state, day) {
  if (!state.quests || typeof state.quests !== 'object') state.quests = freshQuests(day);
  const q = state.quests;
  if (q.day !== day) { q.day = day; q.id = null; q.done = false; }
  return q;
}

export function metricValue(state, metric, day) {
  if (metric === 'questions') return (state.days && state.days[day] && state.days[day].q) || 0;
  if (metric === 'mastered') return Object.values(state.skills || {}).filter(s => s && s.mst === day).length;
  if (metric === 'labs') return Object.values(state.labs || {}).filter(r => r && r.done === day).length;
  if (metric === 'stories') return Object.values(state.stories || {}).filter(r => r && r.done === day).length;
  if (metric === 'calm') return state.wellbeing && state.wellbeing.day === day ? state.wellbeing.breaksToday || 0 : 0;
  return 0;
}

export function questProgress(state, day) {
  const q = ensureQuests(state, day);
  if (!q.id) return { picked: false, def: null, current: 0, goal: 0, pct: 0, complete: false, done: false, stars: 0, canSwitch: false };
  const def = questById(q.id);
  if (!def) { q.id = null; return questProgress(state, day); }
  const current = Math.min(def.goal, metricValue(state, def.metric, day));
  const complete = current >= def.goal;
  return {
    picked: true, def, current, goal: def.goal, pct: complete ? 1 : current / def.goal,
    complete, done: !!q.done, stars: def.stars, canSwitch: current === 0 && !q.done,
  };
}

export function pickQuest(state, day, id) {
  const q = ensureQuests(state, day);
  if (q.done) return { ok: false, reason: 'done' };
  if (!offerFor(day).some(item => item.id === id)) return { ok: false, reason: 'not-offered' };
  if (q.id && q.id !== id) {
    const current = questProgress(state, day);
    if (!current.canSwitch) return { ok: false, reason: 'started' };
  }
  q.id = id; q.done = false;
  return { ok: true, quest: questById(id) };
}

export function claimQuest(state, day) {
  const q = ensureQuests(state, day);
  const prog = questProgress(state, day);
  if (!prog.picked || !prog.complete || prog.done) return { ok: false, reason: prog.done ? 'done' : 'not-complete' };
  q.done = true;
  q.total = Math.min(1e6, (q.total || 0) + 1);
  state.stars = (state.stars || 0) + prog.def.stars;
  return { ok: true, stars: prog.def.stars, quest: prog.def, total: q.total };
}

export const questTotal = state => (state.quests && state.quests.total) || 0;
