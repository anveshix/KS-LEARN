// Bilingual text. Modes: "bi" = English with the Hindi term in brackets beside it,
// "hi" = Hindi, "en" = English. Every learner-facing text carries both languages.
export const L = (en, hi) => ({ en, hi: hi === undefined ? en : hi });
// A term pair: in "bi" mode it renders as `heart (हृदय)`.
export const B = (en, hi) => ({ en, hi, g: 1 });

// Glossary: English term -> Hindi term, glossed on first use in "bi" mode.
export const GLOSS = {
  'place value': 'स्थानीय मान', 'sum': 'योग', 'difference': 'अंतर', 'product': 'गुणनफल', 'quotient': 'भागफल',
  'remainder': 'शेषफल', 'fraction': 'भिन्न', 'numerator': 'अंश', 'denominator': 'हर', 'decimal': 'दशमलव',
  'percent': 'प्रतिशत', 'percentage': 'प्रतिशत', 'factor': 'गुणनखंड', 'multiple': 'गुणज', 'LCM': 'लघुत्तम समापवर्त्य',
  'HCF': 'महत्तम समापवर्तक', 'prime number': 'अभाज्य संख्या', 'perimeter': 'परिमाप', 'area': 'क्षेत्रफल',
  'angle': 'कोण', 'ratio': 'अनुपात', 'average': 'औसत', 'integer': 'पूर्णांक', 'equation': 'समीकरण',
  'profit': 'लाभ', 'loss': 'हानि', 'simple interest': 'साधारण ब्याज', 'speed': 'चाल', 'rectangle': 'आयत',
  'triangle': 'त्रिभुज', 'square root': 'वर्गमूल', 'binary': 'द्विआधारी', 'complement': 'पूरक कोण',
  'supplement': 'संपूरक कोण', 'synonym': 'पर्यायवाची', 'antonym': 'विलोम', 'plural': 'बहुवचन',
  'past tense': 'भूतकाल', 'noun': 'संज्ञा', 'verb': 'क्रिया', 'adjective': 'विशेषण', 'adverb': 'क्रियाविशेषण',
  'preposition': 'संबंधबोधक', 'article': 'आर्टिकल', 'comparative': 'तुलनात्मक रूप', 'superlative': 'उत्तमावस्था रूप',
};
const KEYS = Object.keys(GLOSS).sort((a, b) => b.length - a.length);
const RX = new RegExp('(?<![\\w])(' + KEYS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?:es|s)?(?![\\w])', 'gi');
const LOWER = Object.fromEntries(KEYS.map(k => [k.toLowerCase(), GLOSS[k]]));

export function annotate(text, seen = new Set()) {
  return text.replace(RX, (m, term, off) => {
    const k = term.toLowerCase();
    if (seen.has(k) || /^ \([ऀ-ॿ]/.test(text.slice(off + m.length))) { seen.add(k); return m; }
    seen.add(k);
    return `${m} (${LOWER[k]})`;
  });
}

// Render any text value in a mode. Strings pass through (numbers, code, names).
export function tx(v, mode = 'bi', seen) {
  if (v == null) return '';
  if (typeof v !== 'object') return String(v);
  if (mode === 'en') return v.en;
  if (mode === 'hi') return v.hi || v.en;
  if (v.g) return v.en === v.hi ? v.en : `${v.en} (${v.hi})`;
  return annotate(v.en, seen);
}
// Interface labels: both languages in "bi" mode.
export function ui(v, mode = 'bi') {
  if (mode !== 'bi' || !v.hi || v.hi === v.en) return tx(v, mode === 'bi' ? 'en' : mode);
  return v.en.length <= 28 ? `${v.en} (${v.hi})` : `${v.en}\n${v.hi}`;
}
const DEV = '०१२३४५६७८९';
export const asciiDigits = s => String(s).replace(/[०-९]/g, d => DEV.indexOf(d));
export const numbersIn = s => (asciiDigits(s).replace(/(\d),(?=\d)/g, '$1').match(/\d+(?:\.\d+)?/g) || []).sort().join(' ');
