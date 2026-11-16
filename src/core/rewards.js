// Reward engine (no DOM): stars -> levels, golden stars, daily-streak bonuses, badges.
// All state lives in state.rw; settle() is idempotent, so it is safe to call after every session and on Home.
import { L } from './i18n.js';

export const LEVELS = [
  { min: 0, icon: '🧭', name: L('Novice Explorer', 'नौसिखिया खोजी') },
  { min: 50, icon: '🔭', name: L('Curious Cadet', 'जिज्ञासु कैडेट') },
  { min: 150, icon: '🎒', name: L('Smart Scout', 'होशियार स्काउट') },
  { min: 300, icon: '🧩', name: L('Logic Ranger', 'तर्क रेंजर') },
  { min: 550, icon: '🛡️', name: L('Knowledge Knight', 'ज्ञान योद्धा') },
  { min: 900, icon: '🧪', name: L('Science Wizard', 'विज्ञान जादूगर') },
  { min: 1400, icon: '🥷', name: L('Code Ninja', 'कोड निंजा') },
  { min: 2100, icon: '🎓', name: L('Grand Scholar', 'महा विद्वान') },
  { min: 3000, icon: '👑', name: L('Master Coder', 'मास्टर कोडर') },
];

export const REWARD = { comeback: 2, start: 1, gold: 5, mission: 10, streakCap: 7, goldMinAsked: 3, perfectMin: 8 };

// ctx: { stars, streak, mastered, missions, sessions, perfect }
export const BADGES = [
  { id: 'first', icon: '🚀', name: L('First Steps', 'पहला कदम'), desc: L('Finish your first session', 'पहला सत्र पूरा करो'), ok: c => c.sessions >= 1 },
  { id: 'mission1', icon: '🎯', name: L('Mission Done', 'मिशन पूरा'), desc: L('Complete a daily mission', 'एक दैनिक मिशन पूरा करो'), ok: c => c.missions >= 1 },
  { id: 'streak3', icon: '🔥', name: L('On Fire', 'जोश में'), desc: L('3-day streak', '3 दिन लगातार'), ok: c => c.streak >= 3 },
  { id: 'streak7', icon: '⚡', name: L('Weekly Warrior', 'साप्ताहिक योद्धा'), desc: L('7-day streak', '7 दिन लगातार'), ok: c => c.streak >= 7 },
  { id: 'streak30', icon: '🏆', name: L('Unstoppable', 'अजेय'), desc: L('30-day streak', '30 दिन लगातार'), ok: c => c.streak >= 30 },
  { id: 'master1', icon: '🌟', name: L('Skill Unlocked', 'कौशल सीखा'), desc: L('Master your first skill', 'पहला कौशल सीख लो'), ok: c => c.mastered >= 1 },
  { id: 'master10', icon: '💎', name: L('Skill Collector', 'कौशल संग्रहकर्ता'), desc: L('Master 10 skills', '10 कौशल सीख लो'), ok: c => c.mastered >= 10 },
  { id: 'master25', icon: '🧠', name: L('Big Brain', 'तेज़ दिमाग़'), desc: L('Master 25 skills', '25 कौशल सीख लो'), ok: c => c.mastered >= 25 },
  { id: 'perfect', icon: '💯', name: L('Perfect Run', 'शानदार दौर'), desc: L('Get every answer right in a session of 8+', '8+ प्रश्नों में सब सही'), ok: c => c.perfect },
  { id: 'comeback', icon: '💪', name: L('Comeback Kid', 'हार नहीं मानी'), desc: L('Fix 5 mistakes with a hint', 'संकेत से 5 गलतियाँ सुधारो'), ok: c => c.recovered >= 5 },
  { id: 'stars100', icon: '⭐', name: L('100 Stars', '100 तारे'), desc: L('Collect 100 stars', '100 तारे जमा करो'), ok: c => c.stars >= 100 },
  { id: 'stars500', icon: '🌠', name: L('500 Stars', '500 तारे'), desc: L('Collect 500 stars', '500 तारे जमा करो'), ok: c => c.stars >= 500 },
];
export const BADGE_IDS = BADGES.map(b => b.id);

export const levelIndex = stars => { let i = 0; for (let k = 0; k < LEVELS.length; k++) if (stars >= LEVELS[k].min) i = k; return i; };
export function levelInfo(stars) {
  const s = Math.max(0, stars | 0), i = levelIndex(s), cur = LEVELS[i], nxt = LEVELS[i + 1] || null;
  return { index: i, level: cur, next: nxt, toNext: nxt ? nxt.min - s : 0, frac: nxt ? (s - cur.min) / (nxt.min - cur.min) : 1 };
}
export const freshRw = stars => ({ badges: {}, lvl: levelIndex(stars || 0), bonusDay: null, startDay: null, gold: 0, rec: 0 });
const rwOf = state => (state.rw || (state.rw = freshRw(state.stars)));

// The Retry step of the guidance loop was answered correctly: a comeback star bonus.
export function comebackReward(state) {
  const rw = rwOf(state);
  rw.rec++; state.stars = (state.stars || 0) + REWARD.comeback;
  return REWARD.comeback;
}

// First session of the day earns a small "you showed up" star. Once per day, so start/quit cannot farm stars.
export function startReward(state, day) {
  const rw = rwOf(state);
  if (rw.startDay === day) return 0;
  rw.startDay = day; state.stars = (state.stars || 0) + REWARD.start;
  return REWARD.start;
}

// Call when a session ends (completed=true only when every planned step was answered) and on Home.
// -> summary of what was newly earned; everything is empty when nothing is new.
export function settle(state, { stats = null, completed = false, day, streakNow, mission = false }) {
  const rw = rwOf(state), out = { gold: 0, bonus: 0, badges: [], levelUp: null };
  if (stats && completed && stats.asked >= REWARD.goldMinAsked) { out.gold = REWARD.gold; rw.gold++; state.stars += REWARD.gold; }
  const td = state.days[day];
  if (td && td.done && rw.bonusDay !== day) {
    rw.bonusDay = day;
    out.bonus = REWARD.mission + Math.min(REWARD.streakCap, Math.max(0, streakNow)) * 2;
    state.stars += out.bonus;
  }
  const ctx = {
    stars: state.stars, streak: streakNow, sessions: state.log.length > 0 ? 1 : 0, perfect: !!(stats && stats.asked >= REWARD.perfectMin && stats.correct === stats.asked),
    recovered: rw.rec, mastered: Object.values(state.skills).filter(s => s.m).length, missions: Object.values(state.days).filter(d => d.done).length,
  };
  for (const b of BADGES) if (!rw.badges[b.id] && b.ok(ctx)) { rw.badges[b.id] = day; out.badges.push(b.id); }
  const li = levelIndex(state.stars);
  if (li > rw.lvl) { out.levelUp = { from: rw.lvl, to: li }; }
  rw.lvl = Math.max(rw.lvl, li);
  return out;
}
export const isEmpty = r => !r.gold && !r.bonus && !r.badges.length && !r.levelUp;
