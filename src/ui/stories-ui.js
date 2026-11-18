// Moral-dilemma stories: a shelf, then a walk through one graph of choices. The story
// never says a choice was wrong. It shows what followed, offers one reflection question,
// and lets the child walk the path again differently. Only "finished" is saved.
import { L } from '../core/i18n.js';
import {
  STORIES, STORY_STARS, storyById, newRun, nodeOf, choose,
  markStorySeen, markStoryDone, noteReflection, storyProgress, storySummary,
} from '../core/stories.js';

const S = {
  title: L('Story paths', 'कहानी के रास्ते'),
  intro: L('These are small stories where somebody has to choose. Nothing is scored. You can walk a story again and choose differently, and the story will not judge either path.', 'ये छोटी कहानियाँ हैं जहाँ किसी को चुनना होता है। कोई अंक नहीं। तुम कहानी दोबारा चलाकर कुछ और चुन सकते हो, और कहानी किसी भी रास्ते को गलत नहीं कहती।'),
  read: L('Walk this story', 'यह कहानी चलो'),
  again: L('Walk it again', 'फिर चलो'),
  done: L('Ending found', 'अंत मिला'),
  newOne: L('New', 'नई'),
  ending: L('An ending', 'एक अंत'),
  endingNote: L('There are other endings. They are not better or worse — they are what followed from a different choice.', 'और भी अंत हैं। वे बेहतर या बुरे नहीं — वे किसी और चुनाव का परिणाम हैं।'),
  lesson: L('What the story leaves you with', 'कहानी क्या छोड़ती है'),
  reflect: L('One question to sit with', 'सोचने के लिए एक प्रश्न'),
  reflectNote: L('There is no wrong answer. Nobody is marking this, and your answer is not saved.', 'कोई उत्तर गलत नहीं। कोई अंक नहीं दे रहा, और तुम्हारा उत्तर सहेजा नहीं जाता।'),
  quiet: L('I will think about it quietly', 'मैं मन में सोच लूँगा'),
  thanks: L('Thank you for thinking about it.', 'सोचने के लिए धन्यवाद।'),
  thanksBody: L('Two people can choose differently here and both be kind. What matters is that you noticed the choice.', 'यहाँ दो लोग अलग चुनाव कर सकते हैं और दोनों दयालु हो सकते हैं। महत्वपूर्ण यह है कि तुमने चुनाव देखा।'),
  another: L('Another story', 'दूसरी कहानी'),
  home: L('Back to home', 'मुख्य पृष्ठ'),
  steps: L('choices walked', 'चुने रास्ते'),
  back: L('All stories', 'सभी कहानियाँ'),
  choose: L('What do you do?', 'तुम क्या करोगे?'),
  place: L('Where', 'कहाँ'),
  finishedOf: L('stories finished', 'कहानियाँ पूरी'),
  growCard: L('Story paths', 'कहानी के रास्ते'),
  growLine: L('Walk a choice, see what follows, sit with one question.', 'एक चुनाव चलो, देखो आगे क्या होता है, एक प्रश्न पर रुको।'),
  open: L('Open the stories', 'कहानियाँ खोलो'),
  reflections: L('reflections', 'चिंतन'),
  newLabel: L('Not read yet', 'अभी नहीं पढ़ी'),
  readAgain: L('Read again', 'फिर पढ़ो'),
  firstStars: L('First time: +2 stars', 'पहली बार: +2 सितारे'),
  calmNote: L('Take your time. There is no timer here.', 'आराम से। यहाँ कोई समय नहीं।'),
};

export function createStoriesUI(ctx) {
  const { getState, h, mount, go, header, nav, persist, today, u, t, settleNow, celebrate } = ctx;

  function shelfCard(story) {
    const pr = storyProgress(getState(), story.id);
    return h('section', { class: 'card story-card' + (pr.done ? ' done' : '') },
      h('div', { class: 'story-card-top' },
        h('span', { class: 'story-ico', 'aria-hidden': 'true' }, story.icon),
        h('span', { class: 'chip' + (pr.done ? ' chip-ok' : '') }, u(pr.done ? S.done : S.newLabel))),
      h('h2', {}, t(story.title)),
      h('p', { class: 'muted small' }, t(story.blurb)),
      h('div', { class: 'story-meta' },
        h('span', {}, `${u(L('Class', 'कक्षा'))} ${story.grade}`),
        pr.reflections ? h('span', {}, `${pr.reflections} ${u(S.reflections)}`) : null),
      h('button', { class: 'btn', onclick: () => go('stories/' + story.id) }, u(pr.done ? S.readAgain : S.read)));
  }

  function viewStories() {
    const sum = storySummary(getState());
    const head = h('section', { class: 'card' },
      h('button', { class: 'btn ghost small', onclick: () => go('grow') }, `← ${u(S.growCard)}`),
      h('h1', {}, `📖 ${u(S.title)}`),
      h('p', {}, u(S.intro)),
      h('p', { class: 'muted small' }, `${sum.done}/${sum.total} ${u(S.finishedOf)} · ${u(S.calmNote)}`));
    mount(header(), h('main', { class: 'wrap' }, head, h('div', { class: 'stories-grid' }, STORIES.map(shelfCard))), nav('grow'));
  }

  function viewStory(id) {
    const story = storyById(id);
    if (!story) { go('stories'); return; }
    const st = getState(), day = today();
    markStorySeen(st, id, day); persist();
    let run = newRun(story);
    let finished = false, pendingReward = null;

    const trail = h('div', { class: 'story-trail', 'aria-hidden': 'true' });
    const scene = h('section', { class: 'story-scene' });
    const head = h('section', { class: 'card story-head' },
      h('button', { class: 'btn ghost small', onclick: () => go('stories') }, `← ${u(S.back)}`),
      h('div', { class: 'story-title-row' },
        h('span', { class: 'story-head-ico', 'aria-hidden': 'true' }, story.icon),
        h('div', {}, h('h1', {}, t(story.title)), h('p', { class: 'muted small' }, `${u(S.place)}: ${t(story.place)}`))),
      trail);

    mount(header(), h('main', { class: 'wrap narrow' }, head, scene, h('p', { class: 'muted small story-quiet' }, u(S.calmNote))), nav('grow'));

    function paintTrail() {
      trail.replaceChildren(...Array.from({ length: Math.max(2, run.path.length + (run.done ? 0 : 1)) }, (_, i) =>
        h('i', { class: i < run.path.length ? 'on' : i === run.path.length ? 'now' : '' })));
    }

    function finishOnce() {
      if (finished) return;
      finished = true;
      const first = markStoryDone(getState(), id, day);
      if (first) {
        const st2 = getState();
        st2.stars = (st2.stars || 0) + STORY_STARS;
        persist();
      }
      pendingReward = settleNow();
      if (first) pendingReward.storyStars = STORY_STARS;
    }

    function closeCard(after) {
      const card = h('div', { class: 'story-close' },
        h('div', { class: 'story-close-ico', 'aria-hidden': 'true' }, '🪔'),
        h('h2', {}, u(S.thanks)),
        h('p', {}, u(S.thanksBody)),
        pendingReward && pendingReward.storyStars ? h('p', { class: 'story-stars' }, `⭐ ${u(S.firstStars)}`) : null,
        h('div', { class: 'actions wrap-row' },
          h('button', { class: 'btn', onclick: () => { run = newRun(story); paint(); } }, `↺ ${u(S.again)}`),
          h('button', { class: 'btn ghost', onclick: () => go('stories') }, u(S.another)),
          h('button', { class: 'btn ghost', onclick: () => go('home') }, u(S.home))));
      after.replaceChildren(card);
      if (pendingReward && (pendingReward.badges.length || pendingReward.levelUp)) celebrate(pendingReward);
      pendingReward = null;
    }

    function paintEnding(node, container) {
      finishOnce();
      const reflectionBox = h('div', { class: 'story-reflect' });
      const end = h('div', { class: 'story-end' },
        h('div', { class: 'eyebrow' }, `🏁 ${u(S.ending)}`),
        h('p', { class: 'story-text' }, t(node.text)),
        h('section', { class: 'story-lesson' },
          h('div', { class: 'eyebrow' }, `🪔 ${u(S.lesson)}`),
          h('p', {}, t(node.lesson))),
        h('section', { class: 'story-reflect-box' },
          h('div', { class: 'eyebrow' }, `💭 ${u(S.reflect)}`),
          h('p', { class: 'story-q' }, t(node.reflection.q)),
          h('p', { class: 'muted small' }, u(S.reflectNote))),
        reflectionBox);
      const actions = h('div', { class: 'story-reflect-actions' });
      const options = h('div', { class: 'story-options' }, node.reflection.options.map(o => h('button', {
        class: 'story-option', type: 'button', onclick: () => {
          noteReflection(getState(), id, day); persist();
          actions.replaceChildren(h('p', { class: 'story-thanks', role: 'status' }, u(S.thanks)));
          const next = h('div', { class: 'story-close-slot' });
          actions.append(next);
          closeCard(next);
        },
      }, t(o))));
      const quiet = h('button', { class: 'btn ghost small', onclick: () => {
        actions.replaceChildren();
        const next = h('div', { class: 'story-close-slot' });
        actions.append(next);
        closeCard(next);
      } }, u(S.quiet));
      actions.append(options, quiet);
      reflectionBox.append(actions);
      end.append(h('p', { class: 'muted small' }, u(S.endingNote)));
      container.replaceChildren(end);
      const endBox = container.querySelector('.story-end');
      if (endBox) endBox.classList.add('in');
    }

    function paint() {
      paintTrail();
      const node = story.nodes[run.node];
      if (!node) { go('stories'); return; }
      if (node.end) { paintEnding(node, scene); return; }
      const box = h('div', { class: 'story-node in' },
        h('div', { class: 'eyebrow' }, `📍 ${t(story.place)}`),
        h('p', { class: 'story-text' }, t(node.text)),
        h('h2', { class: 'story-ask' }, u(S.choose)),
        h('div', { class: 'story-choices' }, node.choices.map((c, i) => h('button', {
          class: 'story-choice', type: 'button', 'data-i': String(i),
          onclick: () => {
            const r = choose(story, run, i);
            if (!r.valid) return;
            run = r.run;
            paint();
          },
        }, h('span', { class: 'story-choice-n' }, 'ABCDE'[i]), h('span', {}, t(c.label))))));
      scene.replaceChildren(box);
    }

    paint();
  }

  function homeTile() {
    const sum = storySummary(getState());
    return h('section', { class: 'card tile b-half story-tile' },
      h('div', { class: 'eyebrow' }, `📖 ${u(S.growCard)}`),
      h('span', { class: 'big-ico', 'aria-hidden': 'true' }, '🪔'),
      h('div', { class: 'big-n' }, `${sum.done}/${sum.total}`),
      h('small', { class: 'muted' }, u(S.finishedOf)),
      h('button', { class: 'btn small', onclick: () => go('stories') }, u(S.open)));
  }

  function growCard() {
    const sum = storySummary(getState());
    return h('section', { class: 'card grow-card story-grow' },
      h('div', { class: 'grow-ico', 'aria-hidden': 'true' }, '📖'),
      h('div', { class: 'grow-body' },
        h('div', { class: 'eyebrow' }, u(S.growCard)),
        h('h2', {}, u(S.title)),
        h('p', { class: 'muted small' }, u(S.growLine)),
        h('small', { class: 'muted' }, `${sum.done}/${sum.total} ${u(S.finishedOf)}`)),
      h('button', { class: 'btn', onclick: () => go('stories') }, u(S.open)));
  }

  return { viewStories, viewStory, homeTile, growCard, STORIES };
}
