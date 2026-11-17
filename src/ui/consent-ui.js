// Parental consent screens: notice, guardian details, purpose-by-purpose choice,
// the one-time verification ceremony, and the receipt. One step per screen, so the
// cognitive load stays low and the guardian can read before agreeing.
//
// This module only builds views. The rules live in core/consent.js; storage and routing
// are injected by app.js so this file stays testable and free of side effects.
import { h } from './dom.js';
import { L, ui, tx } from '../core/i18n.js';
import { verifyPin, recordAttempt, lockedFor, needsUpgrade, makePin } from '../core/pin.js';
import {
  POLICY, RELATIONS, ESSENTIAL_PURPOSES, PURPOSE_IDS,
  makeGuardianToken, grantConsent, renewRecord, setPurposes, withdrawConsent,
  verifyConsent, verificationCode, receiptText, dateOnly,
} from '../core/consent.js';

const C = {
  kicker: L('Parent or guardian', 'माता-पिता या अभिभावक'),
  onbTitle: L('A grown-up sets this up', 'यह सेटिंग कोई बड़ा करे'),
  onbLead: L('KS-LEARN is for one child, on this device. Before any learning starts, the parent or guardian reads the notice and gives consent.', 'केएस-लर्न एक बच्चे के लिए, इसी डिवाइस पर है। सीखना शुरू होने से पहले माता-पिता या अभिभावक सूचना पढ़कर सहमति देते हैं।'),
  noticeTitle: L('What happens to your child’s data', 'बच्चे के डेटा का क्या होता है'),
  keeps: L('Kept on this device only', 'केवल इसी डिवाइस पर रखा जाता है'),
  keepsBody: L('Nickname, class, subject choices, answers, mastery scores and the daily streak sit in this browser’s storage. A guardian account with a passphrase lives here too, so only you can change privacy settings or erase data. There is no email, no phone number and no cloud.', 'उपनाम, कक्षा, विषय, उत्तर, महारत के अंक और लगातार दिन इसी ब्राउज़र के स्टोरेज में रहते हैं। गोपनीयता सेटिंग बदलने या डेटा मिटाने के लिए इसी डिवाइस पर अभिभावक खाता और पासफ़्रेज़ रहता है। कोई ईमेल, फ़ोन नंबर या क्लाउड नहीं।'),
  never: L('Never collected', 'कभी नहीं लिया जाता'),
  neverBody: L('No email, phone number or password is ever sent or stored on a server. No voice or audio recordings. No camera, location, contacts or advertising ID. No behavioural or third-party tracking, and no analytics requests: the app works with the network switched off.', 'कोई ईमेल, फ़ोन नंबर या पासवर्ड कभी भेजा या सर्वर पर सहेजा नहीं जाता। आवाज़ या ऑडियो रिकॉर्डिंग नहीं। कैमरा, लोकेशन, संपर्क या विज्ञापन आईडी नहीं। व्यवहार या तीसरे पक्ष की ट्रैकिंग नहीं, कोई एनालिटिक्स नहीं: ऐप बिना इंटरनेट भी चलता है।'),
  choices: L('Each purpose is a separate choice', 'हर उद्देश्य के लिए अलग चुनाव'),
  essential: L('Needed to teach', 'पढ़ाने के लिए ज़रूरी'),
  optional: L('Your choice', 'आपकी इच्छा'),
  rights: L('Your rights', 'आपके अधिकार'),
  rightsBody: L('From the Parent area you can see the record, correct details, export everything, or erase it. Consent can be narrowed or withdrawn at any time; the learning screens stop until it is given again. Consent is checked again after 12 months.', 'अभिभावक भाग से आप रिकॉर्ड देख सकते हैं, जानकारी सुधार सकते हैं, सब कुछ निर्यात या मिटा सकते हैं। सहमति कभी भी घटाई या वापस ली जा सकती है; दोबारा देने तक सीखने की स्क्रीन रुकी रहती हैं। 12 महीने बाद सहमति फिर जाँची जाती है।'),
  seePolicy: L('Read the full notice, retention and grievance route', 'पूरी सूचना, अवधि और शिकायत का तरीका पढ़िए'),
  understand: L('I have read this notice', 'मैंने यह सूचना पढ़ ली'),
  whoTitle: L('Who is agreeing, and for whom', 'कौन सहमति दे रहा है, और किसके लिए'),
  name: L('Parent or guardian’s name', 'माता-पिता या अभिभावक का नाम'),
  namePh: L('For example: Asha Devi', 'जैसे: आशा देवी'),
  relation: L('Relation to the child', 'बच्चे से संबंध'),
  mother: L('Mother', 'माता'), father: L('Father', 'पिता'), guardian: L('Guardian', 'अभिभावक'),
  age: L('Child’s age (years)', 'बच्चे की उम्र (वर्ष)'),
  ageNote: L('Age decides the age band on the consent record. The app is made for ages 6 to 17.', 'उम्र से सहमति रिकॉर्ड पर आयु-वर्ग तय होता है। ऐप 6 से 17 वर्ष के लिए है।'),
  attest: L('I am 18 or older and I am this child’s parent or legal guardian. The choices above are mine.', 'मैं 18 वर्ष या अधिक हूँ और इस बच्चे का माता-पिता या कानूनी अभिभावक हूँ। ऊपर के चुनाव मेरे हैं।'),
  attestNeed: L('Please tick the guardian declaration to continue.', 'आगे बढ़ने के लिए अभिभावक घोषणा पर टिक कीजिए।'),
  nameNeed: L('Please write the guardian’s name.', 'कृपया अभिभावक का नाम लिखिए।'),
  ageNeed: L('Please enter an age between 6 and 17.', 'कृपया 6 से 17 वर्ष के बीच उम्र लिखिए।'),
  verifyTitle: L('Prove a grown-up is here', 'साबित कीजिए कि कोई बड़ा यहाँ है'),
  verifyLead: L('A one-time token is shown once. Write it on paper, then type it below. A child cannot finish this step from memory alone.', 'एक बार के लिए टोकन दिखेगा। इसे कागज़ पर लिखिए, फिर नीचे टाइप कीजिए। केवल याद से बच्चा यह चरण पूरा नहीं कर सकता।'),
  tokenLabel: L('One-time token', 'एक बार का टोकन'),
  tokenWrite: L('This is shown only once. Write it down now.', 'यह केवल एक बार दिखता है। अभी लिख लीजिए।'),
  tokenInput: L('Type the token exactly', 'टोकन ठीक वैसा ही टाइप कीजिए'),
  tokenWrong: L('That does not match. Check the spelling and try again.', 'यह मेल नहीं खाता। वर्तनी देखकर फिर कोशिश कीजिए।'),
  tokenNew: L('Three tries used. A fresh token is shown; write this one down.', 'तीन कोशिशें पूरी। नया टोकन दिख रहा है; इसे लिख लीजिए।'),
  school: L('I have a token from the school', 'मेरे पास स्कूल का टोकन है'),
  schoolNote: L('A school that sets up the device can hand over a signed token and a passcode in person. The passcode never leaves this screen.', 'डिवाइस सेट करने वाला स्कूल हस्ताक्षरित टोकन और पासकोड हाथों-हाथ दे सकता है। पासकोड इस स्क्रीन से बाहर नहीं जाता।'),
  schoolToken: L('School token (starts with KST1.)', 'स्कूल टोकन (KST1. से शुरू)'),
  passcode: L('School passcode', 'स्कूल पासकोड'),
  useToken: L('Use the one-time token instead', 'इसके बजाय एक बार का टोकन लीजिए'),
  schoolBad: L('This token could not be checked. Ask the school for a fresh token and the matching passcode.', 'यह टोकन जाँचा नहीं जा सका। स्कूल से नया टोकन और उसका पासकोड लीजिए।'),
  receiptTitle: L('Consent recorded', 'सहमति दर्ज हो गई'),
  receiptLead: L('The record is stored on this device with the learning data. Keep a copy for your records.', 'रिकॉर्ड सीखने के डेटा के साथ इसी डिवाइस पर है। अपने रिकॉर्ड के लिए एक प्रति रखिए।'),
  code: L('Verification code', 'सत्यापन कोड'),
  recordId: L('Record', 'रिकॉर्ड'),
  granted: L('Given on', 'दी गई'),
  renewBy: L('Checked again by', 'दोबारा जाँच तक'),
  method: L('Verification', 'सत्यापन'),
  methodToken: L('One-time token, typed by the guardian', 'एक बार का टोकन, अभिभावक द्वारा टाइप'),
  methodSchool: L('Signed by the issuing school', 'जारी करने वाले स्कूल द्वारा हस्ताक्षरित'),
  download: L('Save the consent receipt', 'सहमति रसीद सहेजें'),
  downloaded: L('Receipt saved.', 'रसीद सहेज ली गई।'),
  continue: L('Continue', 'आगे बढ़ें'),
  back: L('Back', 'पीछे'),
  renewTitle: L('Consent needs your attention', 'सहमति पर ध्यान देना ज़रूरी है'),
  whyExpired: L('The 12-month consent check is due. Please read the notice again and confirm.', '12 महीने की सहमति जाँच का समय आ गया है। कृपया सूचना फिर पढ़कर पुष्टि कीजिए।'),
  whyPolicy: L('The privacy notice changed. Consent must be given again for the new notice.', 'गोपनीयता सूचना बदली है। नई सूचना के लिए सहमति फिर देनी होगी।'),
  whyWithdrawn: L('Consent was withdrawn. Learning stays paused until a guardian gives consent again.', 'सहमति वापस ले ली गई थी। अभिभावक के दोबारा सहमति देने तक सीखना रुका रहेगा।'),
  whyMissing: L('This device has learning progress but no consent record. A guardian must record consent before learning continues.', 'इस डिवाइस पर प्रगति है लेकिन सहमति रिकॉर्ड नहीं। सीखना जारी रखने से पहले अभिभावक को सहमति दर्ज करनी होगी।'),
  whyInvalid: L('The consent record on this device does not match its own verification code, so it cannot be trusted. Please record consent again.', 'इस डिवाइस का सहमति रिकॉर्ड अपने सत्यापन कोड से मेल नहीं खाता, इसलिए उस पर भरोसा नहीं किया जा सकता। कृपया सहमति फिर दर्ज कीजिए।'),
  parentPin: L('Parent PIN, to unlock this step', 'यह चरण खोलने के लिए अभिभावक पिन'),
  unlock: L('Unlock', 'खोलें'),
  wrongPin: L('That PIN is not right.', 'पिन सही नहीं है।'),
  locked: L('Too many tries. Wait', 'बहुत कोशिशें। रुकिए'),
  seconds: L('seconds', 'सेकंड'),
  eraseTitle: L('Or erase everything', 'या सब कुछ मिटा दीजिए'),
  eraseNote: L('Withdrawing consent stops the app. Erasing removes progress, consent and settings from this device. A backup file you saved earlier is not affected.', 'सहमति वापस लेने से ऐप रुक जाता है। मिटाने से प्रगति, सहमति और सेटिंग इस डिवाइस से हट जाती हैं। पहले सहेजी बैकअप फ़ाइल पर असर नहीं होता।'),
  withdraw: L('Withdraw consent', 'सहमति वापस लें'),
  withdrawConfirm: L('Tap again to withdraw consent. Learning will pause immediately.', 'सहमति वापस लेने के लिए फिर दबाएँ। सीखना तुरंत रुक जाएगा।'),
  erased: L('Everything on this device has been erased.', 'इस डिवाइस पर सब कुछ मिटा दिया गया।'),
  saved: L('Consent updated.', 'सहमति बदल गई।'),
  save: L('Save choices', 'चुनाव सहेजें'),
  required: L('Required', 'आवश्यक'),
  purposesTitle: L('What you agree to', 'आप किन बातों पर सहमत हैं'),
  essentialNote: L('Choosing questions and remembering progress are essential, so they stay on while consent is given.', 'प्रश्न चुनना और प्रगति याद रखना आवश्यक है, इसलिए सहमति के दौरान ये चालू रहते हैं।'),
  stepNotice: L('Notice', 'सूचना'), stepGuardian: L('Guardian', 'अभिभावक'),
  stepVerify: L('Verify', 'सत्यापन'), stepReceipt: L('Receipt', 'रसीद'),
  stepOf: L('Step', 'चरण'),
  of: L('of', 'में से'),
  privacy: L('Privacy and consent', 'गोपनीयता और सहमति'),
  statusValid: L('Consent on record', 'सहमति दर्ज है'),
  statusExpired: L('Renewal due', 'नवीनीकरण बाकी'),
  statusWithdrawn: L('Withdrawn', 'वापस ली गई'),
  statusInvalid: L('Record damaged', 'रिकॉर्ड खराब'),
  statusMissing: L('Not recorded', 'दर्ज नहीं'),
  purposesSaved: L('Purpose choices saved.', 'उद्देश्य के चुनाव सहेजे गए।'),
  cannotWiden: L('A withdrawn record cannot be widened. Give consent again from the screen above.', 'वापस लिया गया रिकॉर्ड बढ़ाया नहीं जा सकता। ऊपर की स्क्रीन से सहमति फिर दीजिए।'),
  viewReceipt: L('Download the consent receipt', 'सहमति रसीद डाउनलोड कीजिए'),
  renewVerify: L('Verify the guardian again', 'अभिभावक का फिर सत्यापन कीजिए'),
  grievance: L('Grievance', 'शिकायत'),
  retention: L('Retention', 'अवधि'),
  policyVersion: L('Notice version', 'सूचना संस्करण'),
  ageBand: L('Age band', 'आयु-वर्ग'),
  childClass: L('Class', 'कक्षा'),
  schoolName: L('Issuing school', 'जारी करने वाला स्कूल'),
  done: L('Consent is complete. The learning screens are open.', 'सहमति पूरी। सीखने की स्क्रीन खुल गईं।'),
};

const REL_LABEL = { mother: C.mother, father: C.father, guardian: C.guardian };
const s = v => ui(v, 'bi');
const p = v => tx(v, 'bi');

// One stepper, used by both the first-run flow and a renewal.
function stepper(index, labels) {
  return h('ol', { class: 'stepper', 'aria-label': `${ui(C.stepOf, 'bi')} ${index + 1} ${ui(C.of, 'bi')} ${labels.length}` },
    labels.map((label, i) => h('li', {
      class: i === index ? 'on' : i < index ? 'done' : '',
      'aria-current': i === index ? 'step' : false,
    }, h('span', { class: 'st-n' }, String(i + 1)), h('span', { class: 'st-l' }, s(label)))));
}

function brandBar(env) {
  return h('header', { class: 'onb-brand' }, env.brand ? env.brand() : h('span', { class: 'wordmark' }, 'KS', h('i', {}, '-'), 'LEARN'));
}

function purposeRows(draft, onChange) {
  return h('div', { class: 'purposes', role: 'group', 'aria-label': s(C.choices) },
    POLICY.purposes.map(pur => {
      const essential = ESSENTIAL_PURPOSES.includes(pur.id);
      const input = h('input', {
        type: 'checkbox', id: `cp-${pur.id}`, checked: essential || !!draft.purposes[pur.id],
        disabled: essential, 'aria-describedby': `cpd-${pur.id}`,
        onchange: e => { draft.purposes[pur.id] = e.currentTarget.checked; onChange && onChange(); },
      });
      return h('div', { class: 'purpose' + (essential ? ' essential' : '') },
        h('label', { class: 'purpose-head', for: `cp-${pur.id}` }, input,
          h('span', { class: 'purpose-title' }, p(pur.title)),
          h('span', { class: 'chip ' + (essential ? 'chip-req' : 'chip-opt') }, s(essential ? C.essential : C.optional))),
        h('p', { class: 'purpose-what', id: `cpd-${pur.id}` }, p(pur.what)));
    }));
}

function noticeBody() {
  const info = (title, body) => h('section', { class: 'notice-block' }, h('h3', {}, s(title)), h('p', {}, s(body)));
  return [
    info(C.keeps, C.keepsBody),
    info(C.never, C.neverBody),
    info(C.rights, C.rightsBody),
    h('details', { class: 'policy-details' }, h('summary', {}, s(C.seePolicy)),
      h('p', {}, h('b', {}, `${s(C.retention)}: `), POLICY.retention),
      h('p', {}, h('b', {}, `${s(C.grievance)}: `), POLICY.grievance),
      h('p', { class: 'small muted' }, `${POLICY.id} · ${s(C.policyVersion)} ${POLICY.version} · ${POLICY.effective}`)),
  ];
}

export function createConsentFlow(env) {
  let mode = 'onboarding';   // 'onboarding' | 'renew'
  let step = 0;
  let draft = null;
  let attempts = 0;
  let lastStatus = null;

  const old = () => env.getState().consent || null;
  const defaultDraft = () => {
    const prev = old();
    const age = prev && prev.child ? prev.child.age : 9;
    const purposes = {};
    for (const id of PURPOSE_IDS) purposes[id] = prev ? !!prev.purposes[id] : ESSENTIAL_PURPOSES.includes(id);
    return {
      guardianName: prev && prev.guardian ? prev.guardian.name : '',
      relation: prev && prev.guardian ? prev.guardian.relation : 'mother',
      age, purposes, method: 'guardian-token',
      token: null, typed: '', schoolToken: '', passcode: '', attest: false,
    };
  };
  const steps = () => (mode === 'onboarding'
    ? [C.stepNotice, C.stepGuardian, C.stepVerify, C.stepReceipt]
    : [C.stepGuardian, C.stepVerify, C.stepReceipt]);
  const indexOf = name => {
    const order = mode === 'onboarding' ? ['notice', 'guardian', 'verify', 'receipt'] : ['guardian', 'verify', 'receipt'];
    return order.indexOf(name);
  };

  function show(view) {
    env.mount(h('main', { class: 'wrap narrow onboarding', id: 'onb' },
      brandBar(env), h('div', { class: 'onb-stage' }, view)));
    window.scrollTo(0, 0);
  }

  function errorNode(id = 'cg-err') {
    return h('p', { class: 'notice-line', id, role: 'alert', hidden: true });
  }
  const fail = (node, message) => { node.textContent = message; node.hidden = false; node.scrollIntoView({ block: 'nearest' }); };

  // ---------- step 0: notice ----------
  function viewNotice() {
    const ack = h('input', { type: 'checkbox', id: 'cg-ack' });
    const err = errorNode();
    const next = h('button', { class: 'btn primary big', id: 'onb-next', onclick: () => {
      if (!ack.checked) return fail(err, s(C.understand));
      draft.attestNotice = true; step = indexOf('guardian'); viewGuardian();
    } }, s(C.continue));
    const view = h('section', { class: 'card onb-card' },
      stepper(indexOf('notice'), steps()),
      h('p', { class: 'eyebrow' }, s(C.kicker)),
      h('h1', {}, s(C.onbTitle)),
      h('p', { class: 'lead' }, s(C.onbLead)),
      h('h2', {}, s(C.noticeTitle)),
      ...noticeBody(),
      h('label', { class: 'check-row', for: 'cg-ack' }, ack, h('span', {}, s(C.understand))),
      err, next);
    show(view);
    next.focus();
  }

  // ---------- step 1: guardian + purposes ----------
  function viewGuardian() {
    if (mode === 'onboarding' && !draft.attestNotice) { step = indexOf('notice'); return viewNotice(); }
    const name = h('input', { id: 'cg-name', value: draft.guardianName, maxlength: '60', autocomplete: 'name', required: true, placeholder: s(C.namePh) });
    const rel = h('select', { id: 'cg-rel' }, RELATIONS.map(r => h('option', { value: r, selected: draft.relation === r }, s(REL_LABEL[r]))));
    const age = h('input', { id: 'cg-age', type: 'number', inputmode: 'numeric', min: '6', max: '17', step: '1', value: String(draft.age), required: true });
    const attest = h('input', { type: 'checkbox', id: 'cg-attest', checked: !!draft.attest });
    const err = errorNode();
    const next = h('button', { class: 'btn primary big', id: 'onb-next', onclick: () => {
      const n = name.value.trim().replace(/\s+/g, ' '), a = Math.round(+age.value);
      // Read the boxes at the moment of the decision, not only on change events.
      for (const id of PURPOSE_IDS) { const el = document.getElementById(`cp-${id}`); if (el) draft.purposes[id] = el.checked || ESSENTIAL_PURPOSES.includes(id); }
      if (n.length < 2) return fail(err, s(C.nameNeed));
      if (!(a >= 6 && a <= 17)) return fail(err, s(C.ageNeed));
      if (!attest.checked) return fail(err, s(C.attestNeed));
      draft.guardianName = n; draft.relation = rel.value; draft.age = a; draft.attest = true;
      step = indexOf('verify'); viewVerify();
    } }, s(C.continue));
    const back = h('button', { class: 'btn ghost', onclick: () => {
      if (mode === 'onboarding') { step = indexOf('notice'); viewNotice(); } else env.go('parent');
    } }, s(C.back));
    const view = h('section', { class: 'card onb-card' },
      stepper(indexOf('guardian'), steps()),
      h('h1', {}, s(C.whoTitle)),
      mode === 'renew' && h('p', { class: 'notice-line' }, s(whyText(lastStatus))),
      h('label', { for: 'cg-name' }, s(C.name)), name,
      h('label', { for: 'cg-rel' }, s(C.relation)), rel,
      h('label', { for: 'cg-age' }, s(C.age)), age, h('p', { class: 'muted small' }, s(C.ageNote)),
      h('h2', {}, s(C.purposesTitle)), purposeRows(draft), err,
      h('label', { class: 'check-row', for: 'cg-attest' }, attest, h('span', {}, s(C.attest))),
      h('div', { class: 'actions split' }, back, next));
    show(view);
    name.focus();
  }

  const whyText = status => {
    switch (status && status.state) {
      case 'reconsent': return status.issues.includes('policy') ? C.whyPolicy : C.whyExpired;
      case 'withdrawn': return C.whyWithdrawn;
      case 'invalid': return C.whyInvalid;
      default: return C.whyMissing;
    }
  };

  // ---------- step 2: verification ----------
  function newToken() { draft.token = makeGuardianToken(); attempts = 0; }
  function viewVerify() {
    const tokenView = () => {
      if (!draft.token) newToken();
      return h('div', { class: 'token-box' },
        h('div', { class: 'eyebrow' }, s(C.tokenLabel)),
        h('output', { class: 'token', id: 'ct-token', 'aria-live': 'polite' }, draft.token.text),
        h('p', { class: 'muted small' }, s(C.tokenWrite)));
    };
    const tokenInput = h('input', { id: 'ct-in', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', 'aria-label': s(C.tokenInput), placeholder: s(C.tokenInput) });
    const schoolToken = h('textarea', { id: 'ct-school', rows: '3', spellcheck: 'false', 'aria-label': s(C.schoolToken) });
    const passcode = h('input', { id: 'ct-pass', type: 'password', autocomplete: 'off', maxlength: '64', 'aria-label': s(C.passcode) });
    const err = errorNode('ct-err');
    const tokenPane = h('div', { class: 'verify-pane' }, tokenView(), h('label', { for: 'ct-in' }, s(C.tokenInput)), tokenInput);
    const schoolPane = h('div', { class: 'verify-pane', hidden: true },
      h('p', { class: 'muted small' }, s(C.schoolNote)),
      h('label', { for: 'ct-school' }, s(C.schoolToken)), schoolToken,
      h('label', { for: 'ct-pass' }, s(C.passcode)), passcode);
    const switchBtn = h('button', { class: 'btn ghost small', type: 'button', onclick: () => {
      draft.method = draft.method === 'guardian-token' ? 'school-token' : 'guardian-token';
      const school = draft.method === 'school-token';
      tokenPane.hidden = school; schoolPane.hidden = !school;
      switchBtn.textContent = s(school ? C.useToken : C.school);
      err.hidden = true;
      (school ? schoolToken : tokenInput).focus();
    } }, s(C.school));
    const submit = () => {
      err.hidden = true;
      const result = grantConsent({
        guardianName: draft.guardianName, relation: draft.relation, age: draft.age,
        cls: env.getState().profile ? env.getState().profile.cls : 4,
        purposes: draft.purposes, method: draft.method,
        token: draft.token, typedToken: tokenInput.value,
        passcode: passcode.value, schoolToken: schoolToken.value,
      });
      if (result.ok) {
        // A renewal keeps the original record id and audit trail instead of starting a new one.
        const previous = old();
        const record = mode === 'renew' && previous ? renewRecord(previous, result.record) : result.record;
        // Write the record before showing the receipt: if the tab closes now, consent still stands.
        draft.record = record; env.setConsent(record);
        step = indexOf('receipt'); viewReceipt(); return;
      }
      if (result.issues.includes('token')) {
        attempts++;
        if (attempts >= 3) { newToken(); tokenPane.replaceChild(tokenView(), tokenPane.firstChild); tokenInput.value = ''; fail(err, s(C.tokenNew)); }
        else fail(err, s(C.tokenWrong));
        tokenInput.focus(); return;
      }
      if (result.issues.some(i => i.startsWith('school.'))) return fail(err, s(C.schoolBad));
      fail(err, s(C.nameNeed));
    };
    const verifyBtn = h('button', { class: 'btn primary big', id: 'ct-verify', onclick: submit }, s(C.continue));
    tokenInput.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    passcode.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    const back = h('button', { class: 'btn ghost', onclick: () => { step = indexOf('guardian'); viewGuardian(); } }, s(C.back));
    show(h('section', { class: 'card onb-card' },
      stepper(indexOf('verify'), steps()),
      h('h1', {}, s(C.verifyTitle)), h('p', { class: 'lead' }, s(C.verifyLead)),
      tokenPane, schoolPane, switchBtn, err,
      h('div', { class: 'actions split' }, back, verifyBtn)));
    tokenInput.focus();
  }

  // ---------- step 3: receipt ----------
  function viewReceipt() {
    const r = draft.record;
    const row = (label, value) => h('div', { class: 'kv' }, h('span', {}, s(label)), h('b', {}, value));
    const methods = r.verification.method === 'school-token' ? C.methodSchool : C.methodToken;
    const pick = PURPOSE_IDS.filter(id => r.purposes[id]).map(id => p(POLICY.purposes.find(x => x.id === id).title));
    const download = h('button', { class: 'btn', id: 'onb-receipt', onclick: () => {
      env.offerFile(`ks-learn-consent-${dateOnly(env.now ? env.now() : new Date())}.json`, receiptText(r));
      env.toast(s(C.downloaded));
    } }, s(C.download));
    const next = h('button', { class: 'btn primary big', id: 'onb-done', onclick: () => env.onComplete(r) },
      s(mode === 'onboarding' ? C.continue : C.done));
    show(h('section', { class: 'card onb-card receipt' }, stepper(indexOf('receipt'), steps()),
      h('h1', {}, s(C.receiptTitle)), h('p', { class: 'lead' }, s(C.receiptLead)),
      h('div', { class: 'receipt-code' }, h('span', {}, s(C.code)), h('output', {}, verificationCode(r))),
      h('div', { class: 'kv-list' },
        row(C.recordId, r.id), row(C.granted, r.grantedAt.slice(0, 10)), row(C.renewBy, r.reconsentBy),
        row(C.method, s(methods)), row(C.ageBand, `${r.child.ageBand} · ${s(C.childClass)} ${r.child.class}`)),
      h('div', { class: 'receipt-purposes' }, h('div', { class: 'eyebrow' }, s(C.purposesTitle)),
        h('ul', {}, pick.map(x => h('li', {}, x)))),
      h('div', { class: 'actions split' }, download, next)));
    next.focus();
  }

  // ---------- renewal needs the parent PIN first ----------
  function viewPin() {
    const input = h('input', { id: 'rc-pin', type: 'password', inputmode: 'numeric', maxlength: '4', autocomplete: 'off', 'aria-label': s(C.parentPin) });
    const err = errorNode('rc-err');
    const form = h('form', { class: 'card onb-card', id: 'rc-form' },
      stepper(0, steps()), h('p', { class: 'eyebrow' }, s(C.kicker)),
      h('h1', {}, s(C.renewTitle)), h('p', { class: 'notice-line' }, s(whyText(lastStatus))),
      h('label', { for: 'rc-pin' }, s(C.parentPin)), input, err,
      h('button', { class: 'btn primary big', type: 'submit' }, s(C.unlock)));
    form.addEventListener('submit', e => {
      e.preventDefault();
      const profile = env.getState().profile;
      const wait = lockedFor(env.getState().lock, Date.now());
      if (wait > 0) return fail(err, `${s(C.locked)} ${wait} ${s(C.seconds)}`);
      const ok = verifyPin(input.value, profile.pin);
      env.setLock(recordAttempt(env.getState().lock, ok, Date.now()));
      if (!ok) { input.value = ''; return fail(err, s(C.wrongPin)); }
      if (needsUpgrade(profile.pin)) { profile.pin = makePin(input.value); env.persist(); }
      step = 0; viewGuardian();
    });
    show(form);
    input.focus();
  }

  function withdrawBox() {
    const note = h('p', { class: 'notice-line', role: 'alert', hidden: true }, s(C.withdrawConfirm));
    let armed = false;
    const btn = h('button', { class: 'btn danger', onclick: () => {
      if (!armed) { armed = true; note.hidden = false; btn.textContent = s(C.withdrawConfirm); return; }
      const rec = old();
      // Withdrawal is a privacy action: it needs the guardian account passphrase, not just the
      // child lock. When the app is already blocked, the PIN recovery path is used instead.
      const run = () => {
        if (rec) env.setConsent(withdrawConsent(rec, new Date(), 'guardian withdrew in parent area'));
        env.go('home');
      };
      if (env.guardianAction) env.guardianAction(run); else run();
    } }, s(C.withdraw));
    return h('details', { class: 'danger-zone' }, h('summary', {}, s(C.eraseTitle)),
      h('p', { class: 'muted small' }, s(C.eraseNote)), note, btn);
  }

  // ---------- public API ----------
  return {
    start() {
      mode = 'onboarding'; step = 0; attempts = 0; draft = defaultDraft(); viewNotice();
    },
    renew(status) {
      mode = 'renew'; step = 0; attempts = 0; lastStatus = status; draft = defaultDraft(); viewPin();
    },
    // Parent area card: live status, optional purposes, receipt, renewal and withdrawal.
    card() {
      const rec = old();
      const status = verifyConsent(rec, new Date());
      const st = status.state;
      const label = { valid: C.statusValid, reconsent: C.statusExpired, withdrawn: C.statusWithdrawn, invalid: C.statusInvalid, missing: C.statusMissing }[st];
      const rows = rec ? [
        ['Record', rec.id], [C.granted, rec.grantedAt.slice(0, 10)], [C.renewBy, rec.reconsentBy],
        [C.method, rec.verification.method === 'school-token' ? C.methodSchool : C.methodToken],
        [C.ageBand, `${rec.child.ageBand} · ${C.childClass} ${rec.child.class}`],
        [C.policyVersion, rec.policy],
      ] : [];
      const draftP = rec ? { ...rec.purposes } : {};
      const boxes = PURPOSE_IDS.filter(id => !ESSENTIAL_PURPOSES.includes(id)).map(id => {
        const pur = POLICY.purposes.find(x => x.id === id);
        return h('label', { class: 'check-row', for: `pp-${id}` },
          h('input', { type: 'checkbox', id: `pp-${id}`, checked: !!draftP[id], disabled: !rec || rec.status !== 'granted' }),
          h('span', {}, h('b', {}, p(pur.title)), h('small', { class: 'muted block' }, p(pur.what))));
      });
      const saveBtn = h('button', { class: 'btn small', disabled: !rec || rec.status !== 'granted', onclick: () => {
        const want = {};
        for (const id of PURPOSE_IDS) want[id] = ESSENTIAL_PURPOSES.includes(id) || !!(rec && rec.purposes[id]);
        for (const id of ['readaloud', 'voice']) { const el = document.getElementById(`pp-${id}`); if (el) want[id] = el.checked; }
        const res = setPurposes(old(), want, new Date());
        if (!res.ok) { env.toast(s(C.cannotWiden)); return; }
        env.setConsent(res.record); env.toast(s(C.purposesSaved)); env.render();
      } }, s(C.save));
      return h('section', { class: 'card consent-card' },
        h('div', { class: 'row' }, h('div', {}, h('div', { class: 'eyebrow' }, s(C.kicker)),
          h('h2', {}, s(C.privacy))), h('span', { class: `chip ${st === 'valid' ? 'chip-ok' : 'chip-warn'}` }, s(label))),
        rec ? h('div', { class: 'kv-list' }, rows.map(([k, v]) => h('div', { class: 'kv' }, h('span', {}, s(k)), h('b', {}, v)))) : null,
        rec && rec.status === 'granted' ? h('div', { class: 'receipt-purposes' }, h('div', { class: 'eyebrow' }, s(C.choices)),
          h('p', { class: 'muted small' }, s(C.essentialNote)), boxes, saveBtn) : null,
        h('div', { class: 'actions wrap-row' },
          rec && h('button', { class: 'btn small', onclick: () => {
            env.offerFile(`ks-learn-consent-${dateOnly(new Date())}.json`, receiptText(rec));
            env.toast(s(C.downloaded));
          } }, s(C.viewReceipt)),
          h('button', { class: 'btn small', onclick: () => env.go('consent') }, s(C.renewVerify))),
        h('details', { class: 'policy-details' }, h('summary', {}, s(C.seePolicy)),
          h('p', {}, h('b', {}, `${s(C.retention)}: `), POLICY.retention),
          h('p', {}, h('b', {}, `${s(C.grievance)}: `), POLICY.grievance),
          ...noticeBody().slice(0, 3)),
        rec ? withdrawBox() : null);
    },
  };
}
