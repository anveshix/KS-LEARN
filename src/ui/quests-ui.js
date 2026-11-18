// Daily quests: three offers, one choice, a visible goal and a claim. The child chooses
// before starting, so no progress is ever taken away; nothing is ranked and nothing expires
// in a punishing way — unfinished quests simply become tomorrow's fresh set.
import { L } from '../core/i18n.js';
import { offerFor, questProgress, pickQuest, claimQuest } from '../core/quests.js';

const Q = {
  title: L('Today\'s quest', 'आज का लक्ष्य'),
  intro: L('Three offers, and you pick one. Choosing it yourself is the point: a goal you did not choose is just homework.', 'तीन प्रस्ताव, और तुम एक चुनो। खुद चुनना ही मुख्य बात है: जो लक्ष्य तुमने नहीं चुना, वह बस गृहकार्य है।'),
  offers: L('Your three offers', 'तुम्हारे तीन प्रस्ताव'),
  choose: L('Choose this one', 'यही चुनो'),
  chosen: L('Your quest', 'तुम्हारा लक्ष्य'),
  change: L('You can still change your mind', 'तुम अब भी बदल सकते हो'),
  changeNote: L('Once you start making progress, the choice stays — so nothing you have done is wasted.', 'जैसे ही प्रगति शुरू होती है, चुनाव वही रहता है — ताकि तुम्हारा किया कुछ बेकार न हो।'),
  claim: L('Claim my stars', 'मेरे तारे लो'),
  claimed: L('Stars claimed!', 'तारे मिल गए!'),
  done: L('Quest complete for today', 'आज का लक्ष्य पूरा'),
  doneNote: L('That is enough. Come back tomorrow for three new offers; there is nothing to keep alive and nothing to lose.', 'इतना काफ़ी है। कल तीन नए प्रस्ताव आएँगे; कोई सिलसिला बनाए रखना नहीं, कोई नुकसान नहीं।'),
  newTomorrow: L('New offers arrive tomorrow.', 'नए प्रस्ताव कल आएँगे।'),
  progress: L('Progress today', 'आज की प्रगति'),
  starsLabel: L('stars', 'तारे'),
  how: L('How this fills up', 'यह कैसे भरता है'),
  howQuestions: L('Every question you answer today counts, including retries and hints.', 'आज का हर उत्तर गिना जाता है, दोबारा कोशिशें और संकेत भी।'),
  howMaster: L('A skill counts when you answer it cold, without help.', 'कौशल तब गिना जाता है जब तुम बिना मदद उत्तर दो।'),
  howLab: L('A finished Curiosity Lab counts, with all three questions.', 'तीनों प्रश्नों के साथ पूरी की गई जिज्ञासा लैब गिनी जाती है।'),
  howStory: L('A story counts when you reach an ending and its reflection.', 'कहानी तब गिनी जाती है जब तुम अंत और उसका चिंतन तक पहुँचो।'),
  howCalm: L('One pause with the breath counts. The calm screen has the timer.', 'साँस के साथ एक विराम गिना जाता है। समय शांति स्क्रीन पर है।'),
  openCalm: L('Open the calm screen', 'शांति स्क्रीन खोलो'),
  growCard: L('Daily quest', 'दैनिक लक्ष्य'),
  growLine: L('Pick one of three goals. Autonomy, not a streak.', 'तीन में से एक लक्ष्य चुनो। अपनी मर्ज़ी, कोई सिलसिला नहीं।'),
  open: L('Choose today\'s quest', 'आज का लक्ष्य चुनो'),
  openDone: L('See today\'s quest', 'आज का लक्ष्य देखो'),
  pickFirst: L('Pick a quest first, then the ring starts filling.', 'पहले लक्ष्य चुनो, फिर घेरा भरना शुरू होगा।'),
  total: L('quests finished over time', 'अब तक पूरे किए लक्ष्य'),
  none: L('No quest picked yet today.', 'आज अभी कोई लक्ष्य नहीं चुना।'),
  progressOf: L('of', 'में से'),
  complete: L('Goal reached — claim it!', 'लक्ष्य पूरा — तारे लो!'),
  notYet: L('Not finished yet. It stays open until the day ends; nothing is taken away.', 'अभी पूरा नहीं। दिन खत्म होने तक खुला है; कुछ छीना नहीं जाता।'),
  valueLine: L('A quest is a direction, not a test.', 'लक्ष्य एक दिशा है, परीक्षा नहीं।'),
};

export function createQuestsUI(ctx) {
  const { getState, h, mount, go, header, nav, persist, toast, today, u, t, settleNow, celebrate } = ctx;

  function ring(prog, size = 'lg') {
    const pct = Math.round((prog.pct || 0) * 100);
    return h('div', { class: `quest-ring ${size}${prog.complete ? ' full' : ''}`, style: `--p:${pct}`, role: 'img', 'aria-label': `${pct}%` },
      h('div', { class: 'quest-ring-in' },
        h('b', {}, prog.picked ? `${prog.current}/${prog.goal}` : '–'),
        h('small', {}, prog.picked ? u(Q.starsLabel) : u(Q.title))));
  }

  function offerCard(def, onPick, compact = false) {
    return h('section', { class: 'card quest-offer' + (compact ? ' compact' : '') },
      h('div', { class: 'quest-offer-top' },
        h('span', { class: 'quest-ico', 'aria-hidden': 'true' }, def.icon),
        h('span', { class: 'quest-stars' }, `⭐ ${def.stars}`)),
      h('h3', {}, t(def.title)),
      h('p', { class: 'muted small' }, t(def.desc)),
      h('button', { class: 'btn' + (compact ? ' small' : ' primary'), onclick: onPick }, u(Q.choose)));
  }

  function chosenCard(prog) {
    const action = prog.done
      ? h('p', { class: 'quest-done-line' }, `✅ ${u(Q.done)}`)
      : prog.complete
        ? h('button', { class: 'btn primary big', onclick: claim }, `⭐ ${u(Q.claim)}`)
        : h('p', { class: 'muted small' }, u(Q.notYet));
    const how = {
      questions: Q.howQuestions, mastered: Q.howMaster, labs: Q.howLab, stories: Q.howStory, calm: Q.howCalm,
    }[prog.def.metric];
    return h('section', { class: 'card quest-chosen' + (prog.done ? ' done' : '') + (prog.complete ? ' full' : '') },
      h('div', { class: 'quest-chosen-grid' },
        ring(prog),
        h('div', { class: 'quest-chosen-body' },
          h('div', { class: 'eyebrow' }, `🧭 ${u(Q.chosen)}`),
          h('h2', {}, `${prog.def.icon} ${t(prog.def.title)}`),
          h('p', {}, t(prog.def.desc)),
          h('div', { class: 'quest-prog-line' }, h('span', {}, `${prog.current} ${u(Q.progressOf)} ${prog.goal}`), h('b', {}, `⭐ ${prog.def.stars}`)),
          action)),
      prog.done ? h('p', { class: 'muted small' }, u(Q.doneNote)) : h('p', { class: 'muted small' }, `${u(Q.how)} ${u(how)}`));
  }

  function claim() {
    const st = getState(), day = today();
    const r = claimQuest(st, day);
    if (!r.ok) { toast(u(Q.notYet)); return; }
    persist();
    toast(`${u(Q.claimed)} +${r.stars} ⭐`);
    const reward = settleNow();
    if (reward.badges.length || reward.levelUp) celebrate(reward);
    viewQuests();
  }

  function pick(id) {
    const st = getState(), day = today();
    const r = pickQuest(st, day, id);
    if (!r.ok) { toast(r.reason === 'started' ? u(Q.changeNote) : u(Q.pickFirst)); return; }
    persist(); viewQuests();
  }

  function viewQuests() {
    const st = getState(), day = today();
    const prog = questProgress(st, day);
    const offers = offerFor(day);
    const head = h('section', { class: 'card' },
      h('button', { class: 'btn ghost small', onclick: () => go('grow') }, `← ${u(Q.growCard)}`),
      h('h1', {}, `🧭 ${u(Q.title)}`),
      h('p', {}, u(Q.intro)),
      h('p', { class: 'muted small' }, `${u(Q.total)}: ${(st.quests && st.quests.total) || 0} · ${u(Q.valueLine)}`));
    const body = [];
    if (!prog.picked) {
      body.push(h('section', { class: 'card' }, h('div', { class: 'eyebrow' }, `🎁 ${u(Q.offers)}`),
        h('div', { class: 'quest-offers' }, offers.map(def => offerCard(def, () => pick(def.id))))));
    } else {
      body.push(chosenCard(prog));
      if (prog.canSwitch && !prog.done) {
        body.push(h('section', { class: 'card' }, h('div', { class: 'eyebrow' }, u(Q.change)),
          h('p', { class: 'muted small' }, u(Q.changeNote)),
          h('div', { class: 'quest-offers compact' }, offers.filter(def => def.id !== prog.def.id).map(def => offerCard(def, () => pick(def.id), true)))));
      }
      if (prog.def.metric === 'calm' && !prog.done) {
        body.push(h('section', { class: 'card quest-nudge' },
          h('p', {}, u(Q.howCalm)),
          h('button', { class: 'btn primary', onclick: () => go('wellbeing') }, `🌬️ ${u(Q.openCalm)}`)));
      }
    }
    mount(header(), h('main', { class: 'wrap narrow' }, head, body), nav('grow'));
  }

  function homeTile() {
    const st = getState(), day = today();
    const prog = questProgress(st, day);
    const label = prog.done ? u(Q.done) : prog.picked ? `${prog.current}/${prog.goal}` : '3';
    return h('section', { class: 'card tile b-half quest-tile' },
      h('div', { class: 'eyebrow' }, `🧭 ${u(Q.growCard)}`),
      h('span', { class: 'big-ico', 'aria-hidden': 'true' }, prog.picked ? prog.def.icon : '🎁'),
      h('div', { class: 'big-n' }, label),
      h('small', { class: 'muted' }, prog.picked ? t(prog.def.title) : u(Q.offers)),
      h('button', { class: 'btn small', onclick: () => go('quests') }, u(prog.picked ? Q.openDone : Q.open)));
  }

  function growCard() {
    const st = getState(), day = today();
    const prog = questProgress(st, day);
    return h('section', { class: 'card grow-card quest-grow' },
      h('div', { class: 'grow-ico', 'aria-hidden': 'true' }, '🧭'),
      h('div', { class: 'grow-body' },
        h('div', { class: 'eyebrow' }, u(Q.growCard)),
        h('h2', {}, prog.picked ? t(prog.def.title) : u(Q.offers)),
        h('p', { class: 'muted small' }, prog.picked ? `${prog.current} ${u(Q.progressOf)} ${prog.goal} · ⭐ ${prog.def.stars}` : u(Q.growLine))),
      h('button', { class: 'btn', onclick: () => go('quests') }, u(prog.picked ? Q.openDone : Q.open)));
  }

  return { viewQuests, homeTile, growCard };
}
