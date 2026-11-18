// Panchakosha wellbeing: the five layers, a gentle 20-minute screen-time rhythm, and the
// breathing break. Everything is local and counted in seconds of *active* use — never
// wall-clock surveillance, never a log of what the child did.
//
// The five koshas are used as five kinds of pause, not as a score:
//   annamaya  body      — move and drink water
//   pranamaya breath    — the 4-2-6 breath
//   manomaya  mind      — name a feeling
//   vijnanamaya wisdom  — think about a choice
//   anandamaya joy      — notice something good
import { L } from './i18n.js';

export const PANCHAKOSHA = [
  {
    id: 'anna', icon: '🌿', color: 'var(--s)',
    sanskrit: L('Annamaya kosha', 'अन्नमय कोश'),
    name: L('The body', 'शरीर'),
    line: L('The layer made of food and water. It asks to move, stretch and drink.', 'भोजन और पानी से बनी परत। यह हिलने, खिंचने और पानी पीने को कहती है।'),
    prompt: L('Stand up. Reach for the sky, touch your toes, roll your shoulders. Then drink some water.', 'खड़े होओ। आसमान की ओर हाथ बढ़ाओ, पैरों को छुओ, कंधे घुमाओ। फिर पानी पियो।'),
    practice: 'move',
    steps: [
      L('Reach up tall, like a plant in the rain.', 'पौधे की तरह ऊपर तक पहुँचो, जैसे बारिश में।'),
      L('Bend slowly and touch your toes — or your knees.', 'धीरे झुको और पैरों को छुओ — या घुटनों को।'),
      L('Roll your shoulders back five times, then drink water.', 'कंधों को पीछे पाँच बार घुमाओ, फिर पानी पियो।'),
    ],
  },
  {
    id: 'prana', icon: '🌬️', color: 'var(--l)',
    sanskrit: L('Pranamaya kosha', 'प्राणमय कोश'),
    name: L('The breath', 'साँस'),
    line: L('The layer of breath and energy. Slow breathing tells the body it is safe.', 'साँस और ऊर्जा की परत। धीमी साँस शरीर को बताती है कि सब ठीक है।'),
    prompt: L('Breathe in for 4, hold for 2, breathe out for 6. Three rounds, with the circle.', '4 तक साँस लो, 2 रोको, 6 तक छोड़ो। गोले के साथ तीन चक्कर।'),
    practice: 'breathe',
  },
  {
    id: 'mano', icon: '💭', color: 'var(--e)',
    sanskrit: L('Manomaya kosha', 'मनोमय कोश'),
    name: L('The mind', 'मन'),
    line: L('The layer of thoughts and feelings. Naming a feeling makes it smaller.', 'विचारों और भावनाओं की परत। भावना का नाम लेने से वह छोटी हो जाती है।'),
    prompt: L('What is here right now? There is no wrong answer.', 'अभी क्या महसूस हो रहा है? कोई उत्तर गलत नहीं है।'),
    practice: 'feel',
    feelings: [
      { id: 'happy', icon: '😊', label: L('Happy', 'खुश'), reply: L('Lovely. Where do you feel it in your body?', 'बहुत अच्छा। यह शरीर में कहाँ महसूस होता है?') },
      { id: 'calm', icon: '😌', label: L('Calm', 'शांत'), reply: L('Good. Let your shoulders drop and stay here a moment.', 'अच्छा। कंधे ढीले छोड़ो और थोड़ी देर यहीं रुको।') },
      { id: 'tired', icon: '😴', label: L('Tired', 'थका हुआ'), reply: L('That is a real signal. Rest is part of learning.', 'यह सच्चा संकेत है। आराम भी सीखने का हिस्सा है।') },
      { id: 'worried', icon: '😟', label: L('Worried', 'चिंतित'), reply: L('Thank you for saying it. One slow breath. You do not have to fix it all now.', 'कहने के लिए धन्यवाद। एक धीमी साँस। सब कुछ अभी ठीक करना ज़रूरी नहीं।') },
      { id: 'angry', icon: '😤', label: L('Angry', 'गुस्सा'), reply: L('Anger shows something matters. Let the breath out longer than the breath in.', 'गुस्सा बताता है कि कुछ मायने रखता है। साँस छोड़ना लंबा करो।') },
    ],
  },
  {
    id: 'vijnana', icon: '🪔', color: 'var(--g)',
    sanskrit: L('Vijnanamaya kosha', 'विज्ञानमय कोश'),
    name: L('Wisdom', 'समझ'),
    line: L('The layer that asks why. It grows when we look at a choice from outside.', 'जो “क्यों” पूछती है। जब हम चुनाव को बाहर से देखते हैं, यह बढ़ती है।'),
    prompt: L('Think of one choice you made today. What did it show you about what you value?', 'आज के एक चुनाव के बारे में सोचो। उससे पता चला कि तुम्हें क्या महत्वपूर्ण है?'),
    practice: 'think',
    options: [
      L('I wanted to be fair.', 'मैं निष्पक्ष रहना चाहता/चाहती था।'),
      L('I wanted to be kind.', 'मैं दयालु रहना चाहता/चाहती था।'),
      L('I wanted to be brave.', 'मैं बहादुर रहना चाहता/चाहती था।'),
      L('I was tired, and I noticed that.', 'मैं थका हुआ था, और मैंने यह देखा।'),
    ],
  },
  {
    id: 'ananda', icon: '✨', color: 'var(--h)',
    sanskrit: L('Anandamaya kosha', 'आनंदमय कोश'),
    name: L('Joy', 'आनंद'),
    line: L('The layer underneath all the others. Joy is easier to find when we stop and look.', 'सबके नीचे की परत। रुककर देखने पर आनंद मिलना आसान होता है।'),
    prompt: L('Find one small good thing from today. Say it out loud, or hold it in your mind.', 'आज की एक छोटी अच्छी बात ढूँढो। ज़ोर से कहो, या मन में रखो।'),
    practice: 'joy',
    sparks: [
      L('Someone smiled at me.', 'किसी ने मुझे देखकर मुस्कुराया।'),
      L('I understood something new.', 'मैंने कुछ नया समझा।'),
      L('I helped someone.', 'मैंने किसी की मदद की।'),
      L('I ate something I like.', 'मैंने अपनी पसंद की चीज़ खाई।'),
      L('I played outside.', 'मैं बाहर खेला।'),
      L('I finished something hard.', 'मैंने कोई कठिन काम पूरा किया।'),
    ],
  },
];
export const KOSHA_IDS = PANCHAKOSHA.map(k => k.id);
export const koshaById = id => PANCHAKOSHA.find(k => k.id === id) || null;

// 4 in, 2 hold, 6 out. Three rounds is enough to change the breath, and short enough to
// actually be done in the middle of a lesson.
export const BREATH_PHASES = [
  { id: 'in', seconds: 4 },
  { id: 'hold', seconds: 2 },
  { id: 'out', seconds: 6 },
];
export const BREATH_CYCLES = 3;
export const BREATH_TOTAL_MS = BREATH_PHASES.reduce((a, p) => a + p.seconds, 0) * BREATH_CYCLES * 1000;

export const LIMIT_CHOICES = [15, 20, 30];
export const DEFAULT_LIMIT_MIN = 20;
export const GAP_CREDIT_MS = 60000;     // a gap longer than this is rest, not screen time
export const TICK_CREDIT_CAP_MS = 30000;
export const MAX_ACTIVE_MS = 6 * 60 * 60 * 1000;

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export function freshWellbeing(day = dayKey()) {
  return {
    day, activeMs: 0, limitMin: DEFAULT_LIMIT_MIN, breaks: 0, breaksToday: 0,
    lastBreak: null, lastTick: 0, layers: Object.fromEntries(KOSHA_IDS.map(id => [id, 0])),
  };
}

// Creates or rolls the day. Totals and chosen limit survive; today's clock and count reset.
export function ensureWellbeing(state, day = dayKey()) {
  if (!state.wellbeing || typeof state.wellbeing !== 'object') state.wellbeing = freshWellbeing(day);
  const w = state.wellbeing;
  if (w.day !== day) { w.day = day; w.activeMs = 0; w.breaksToday = 0; w.lastTick = 0; }
  return w;
}

export function limitMs(w) {
  const min = LIMIT_CHOICES.includes(w && w.limitMin) ? w.limitMin : DEFAULT_LIMIT_MIN;
  return min * 60000;
}

export function summary(state) {
  const w = state.wellbeing || freshWellbeing();
  const ms = limitMs(w);
  return {
    activeMs: Math.max(0, w.activeMs || 0), limitMs: ms, limitMin: ms / 60000,
    remainingMs: Math.max(0, ms - (w.activeMs || 0)),
    due: (w.activeMs || 0) >= ms, breaks: w.breaks || 0, breaksToday: w.breaksToday || 0,
    layers: { ...(w.layers || {}) },
  };
}

// Called by a visible heartbeat while a lesson, lab or story is open.
// A long gap (tab in the background, phone in a pocket) is not credited: rest is rest.
export function tick(state, { day = dayKey(), now = Date.now(), active = true } = {}) {
  const w = ensureWellbeing(state, day);
  if (!active) { w.lastTick = now; return summary(state); }
  const gap = w.lastTick ? now - w.lastTick : 0;
  if (gap > 0 && gap <= GAP_CREDIT_MS) {
    w.activeMs = clamp((w.activeMs || 0) + Math.min(gap, TICK_CREDIT_CAP_MS), 0, MAX_ACTIVE_MS);
  }
  w.lastTick = now;
  return summary(state);
}

export function setLimit(state, minutes) {
  const w = ensureWellbeing(state);
  if (!LIMIT_CHOICES.includes(minutes)) return false;
  w.limitMin = minutes;
  return true;
}

export function noteBreak(state, { day = dayKey(), layer = 'prana' } = {}) {
  const w = ensureWellbeing(state, day);
  w.breaks = Math.min(1e6, (w.breaks || 0) + 1);
  w.breaksToday = Math.min(1e4, (w.breaksToday || 0) + 1);
  w.activeMs = 0;
  w.lastTick = 0;
  w.lastBreak = day;
  const id = koshaById(layer) ? layer : 'prana';
  w.layers[id] = Math.min(1e6, (w.layers[id] || 0) + 1);
  return summary(state);
}

export function noteLayer(state, layer, { day = dayKey(), count = 1 } = {}) {
  const w = ensureWellbeing(state, day);
  if (!koshaById(layer)) return false;
  w.layers[layer] = Math.min(1e6, (w.layers[layer] || 0) + Math.max(0, Math.round(count)));
  return true;
}

export const clock = ms => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
