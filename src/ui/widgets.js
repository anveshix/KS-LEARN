// Interactive answer widgets for the "order" and "match" question kinds (tap-only, keyboard accessible).
// text(v): renders a bilingual value in the learner's language. raw() is null until the answer is complete.
import { h } from './dom.js';

export function orderWidget(q, text) {
  const chosen = []; let locked = false;
  const line = h('ol', { class: 'ord-line', 'aria-label': 'Your order' }), bank = h('div', { class: 'ord-bank' });
  const draw = () => {
    line.replaceChildren(...chosen.map((i, k) => h('li', {}, h('button', { type: 'button', class: 'tile-btn picked', disabled: locked, 'aria-label': `${k + 1}. ${text(q.items[i])}`, onclick: () => { chosen.splice(k, 1); draw(); } }, text(q.items[i])))));
    bank.replaceChildren(...q.items.map((it, i) => h('button', { type: 'button', class: 'tile-btn', disabled: locked || chosen.includes(i), onclick: () => { chosen.push(i); draw(); } }, text(it))));
  };
  draw();
  return { el: h('div', { class: 'w-order' }, line, bank), raw: () => (chosen.length === q.items.length ? chosen.slice() : null), lock: () => { locked = true; draw(); } };
}

export function matchWidget(q, text) {
  const n = q.left.length, pairs = Array(n).fill(-1); let sel = -1, locked = false;
  const lcol = h('div', { class: 'm-col' }), rcol = h('div', { class: 'm-col' });
  const draw = () => {
    lcol.replaceChildren(...q.left.map((it, i) => h('button', { type: 'button', class: `tile-btn${pairs[i] >= 0 ? ` paired p${i}` : ''}${sel === i ? ' sel' : ''}`, disabled: locked,
      onclick: () => { if (pairs[i] >= 0) { pairs[i] = -1; sel = -1; } else sel = sel === i ? -1 : i; draw(); } }, text(it))));
    rcol.replaceChildren(...q.right.map((it, j) => { const owner = pairs.indexOf(j);
      return h('button', { type: 'button', class: `tile-btn${owner >= 0 ? ` paired p${owner}` : ''}`, disabled: locked,
        onclick: () => { if (owner >= 0) pairs[owner] = -1; else if (sel >= 0) { pairs[sel] = j; sel = -1; } draw(); } }, text(it)); }));
  };
  draw();
  return { el: h('div', { class: 'w-match' }, lcol, rcol), raw: () => (pairs.every(v => v >= 0) ? pairs.slice() : null), lock: () => { locked = true; sel = -1; draw(); } };
}
