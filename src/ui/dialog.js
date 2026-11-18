// One accessible sheet behaviour for every overlay in the app.
//
// A sheet that only looks like a dialog is a trap for keyboard and screen-reader users:
// focus stays on the page behind it, Escape does nothing, and Tab walks into content the
// child cannot see. This helper gives every sheet the same contract:
//   role=dialog, aria-modal=true, focus moved inside, Tab wrapped, Escape closes,
//   backdrop click closes (when allowed), and focus returned to the control that opened it.
// Nested sheets are supported: only the topmost one answers Escape and Tab.
const stack = [];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(dialog) {
  return [...dialog.querySelectorAll(FOCUSABLE)].filter(el => !el.hidden && !el.closest('[hidden]'));
}

export function trapFocus(dialog, opts = {}) {
  const { onClose = () => {}, initial = null, backdrop = true } = opts;
  if (!dialog.getAttribute('role')) dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');
  const opener = document.activeElement;
  const entry = { dialog, onClose };
  stack.push(entry);

  const onKey = e => {
    if (stack[stack.length - 1] !== entry) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab') return;
    const list = focusables(dialog);
    if (!list.length) { e.preventDefault(); dialog.focus(); return; }
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const onClick = e => { if (backdrop && e.target === dialog) onClose(); };

  dialog.addEventListener('keydown', onKey);
  if (backdrop) dialog.addEventListener('click', onClick);
  const target = initial || focusables(dialog)[0] || dialog;
  try { target.focus({ preventScroll: true }); } catch { /* old browser */ }

  let released = false;
  return function release({ returnFocus = true } = {}) {
    if (released) return;
    released = true;
    dialog.removeEventListener('keydown', onKey);
    dialog.removeEventListener('click', onClick);
    const i = stack.indexOf(entry);
    if (i >= 0) stack.splice(i, 1);
    if (returnFocus && opener && opener.isConnected && typeof opener.focus === 'function') {
      try { opener.focus({ preventScroll: true }); } catch { /* ignore */ }
    }
  };
}

// The sheet element itself: a full-screen scrim with one card inside.
export function sheet(children, cls = '') {
  const el = document.createElement('div');
  el.className = 'sheet' + (cls ? ' ' + cls : '');
  const card = document.createElement('section');
  card.className = 'card sheet-body';
  for (const c of [].concat(children)) if (c != null) card.append(c);
  el.append(card);
  return el;
}
