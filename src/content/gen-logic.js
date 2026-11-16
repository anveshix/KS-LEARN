// Reasoning (l.*) and coding / computational thinking (c.*). All generated;
// program answers come from actually running the program, not from a key.
import { S, L, num, text, mcq, nmcq, traps } from './kit.js';

const NEXT = L('Find the next number', 'अगली संख्या ज्ञात कीजिए');
const series = (seq, ans, why, o) => num(L(`${NEXT.en}: ${seq.join(', ')}, ?`, `${NEXT.hi}: ${seq.join(', ')}, ?`), ans, why, o);
const DAYS = [['Monday', 'सोमवार'], ['Tuesday', 'मंगलवार'], ['Wednesday', 'बुधवार'], ['Thursday', 'गुरुवार'], ['Friday', 'शुक्रवार'], ['Saturday', 'शनिवार'], ['Sunday', 'रविवार']];
const DIRS = [['North', 'उत्तर'], ['East', 'पूर्व'], ['South', 'दक्षिण'], ['West', 'पश्चिम']];
const dirL = i => L(DIRS[i][0], DIRS[i][1]);
const WORDS = ['CAT', 'DOG', 'SUN', 'PEN', 'BOOK', 'FISH', 'LAMP', 'KING', 'BIRD', 'MILK', 'HAND', 'GOLD'];
const shift = (w, k) => w.split('').map(c => String.fromCharCode(c.charCodeAt(0) + k)).join('');

export const LOGIC = [
  S('l.series_add', 4, L('Number series: adding and subtracting', 'संख्या श्रेणी: जोड़ और घटाव'), [],
    L('Find the difference between neighbours. If it stays the same, use it to get the next number.', 'पास-पास की संख्याओं का अंतर निकालिए। अंतर समान हो तो उसी से अगली संख्या निकालिए।'),
    r => { const d = r.int(2, 12), up = r.bool(0.7), a = up ? r.int(1, 30) : r.int(70, 120), s = [0, 1, 2, 3].map(i => a + (up ? i : -i) * d), ans = a + (up ? 4 : -4) * d;
      return series(s, ans, L(`Each number ${up ? 'increases' : 'decreases'} by ${d}.`, `हर संख्या ${d} से ${up ? 'बढ़ती' : 'घटती'} है।`)); }),
  S('l.series_mul', 5, L('Number series: multiplying', 'संख्या श्रेणी: गुणा'), ['l.series_add'],
    L('If the differences keep growing, check whether each number is the previous one times a fixed number.', 'यदि अंतर बढ़ते जाएँ, तो जाँचिए कि हर संख्या पिछली संख्या का कोई निश्चित गुना तो नहीं।'),
    r => { const k = r.int(2, 4), a = r.int(1, 6), s = [0, 1, 2, 3].map(i => a * k ** i);
      return series(s, a * k ** 4, L(`Each number is the previous number multiplied by ${k}.`, `हर संख्या पिछली संख्या का ${k} गुना है।`)); }),
  S('l.series_mix', 6, L('Number series: squares and growing gaps', 'संख्या श्रेणी: वर्ग और बढ़ते अंतर'), ['l.series_mul'],
    L('Write the differences underneath the series. The differences often make a simple pattern themselves.', 'श्रेणी के नीचे अंतर लिखिए। अक्सर अंतर स्वयं एक सरल पैटर्न बनाते हैं।'),
    r => {
      const t = r.int(1, 3);
      if (t === 1) { const a = r.int(1, 6), s = [0, 1, 2, 3].map(i => (a + i) ** 2); return series(s, (a + 4) ** 2, L(`These are the squares of ${a}, ${a + 1}, ${a + 2}, ${a + 3}; the next is the square of ${a + 4}.`, `ये ${a}, ${a + 1}, ${a + 2}, ${a + 3} के वर्ग हैं; अगली संख्या ${a + 4} का वर्ग है।`)); }
      if (t === 2) { const a = r.int(1, 20), g = r.int(1, 4), s = [a]; for (let i = 0; i < 4; i++) s.push(s[i] + g + i); const nx = s[4] + g + 4;
        return series(s, nx, L(`The gaps are ${g}, ${g + 1}, ${g + 2}, ${g + 3}; the next gap is ${g + 4}.`, `अंतर ${g}, ${g + 1}, ${g + 2}, ${g + 3} हैं; अगला अंतर ${g + 4} है।`)); }
      const a = r.int(1, 5), b = r.int(a + 1, 9), s = [a, b]; for (let i = 2; i < 5; i++) s.push(s[i - 1] + s[i - 2]);
      return series(s, s[4] + s[3], L(`Each number is the sum of the two numbers before it: ${s[3]} + ${s[4]} = ${s[3] + s[4]}.`, `हर संख्या अपने से पहले की दो संख्याओं का योग है: ${s[3]} + ${s[4]} = ${s[3] + s[4]}।`));
    }),
  S('l.odd', 4, L('Odd one out', 'बेमेल संख्या'), [],
    L('Find the rule that three of the numbers follow. The one that breaks the rule is the odd one out.', 'वह नियम खोजिए जिसे तीन संख्याएँ मानती हैं। जो नियम तोड़े, वही बेमेल है।'),
    r => {
      const t = r.int(1, 3), P = L('Which number does not belong with the others?', 'कौन-सी संख्या बाकी से अलग है?');
      const ok = n => n % 11 !== 0 && n % 5 !== 0 && Math.sqrt(n) % 1 !== 0;
      let good, bad, why;
      if (t === 1) { const ev = r.bool(), pool = []; for (let n = 12; n < 99; n++) if (ok(n)) pool.push(n);
        good = r.sample(pool.filter(n => (n % 2 === 0) === ev), 3); bad = r.pick(pool.filter(n => (n % 2 === 0) !== ev));
        why = ev ? L(`${bad} is odd; the others are even.`, `${bad} विषम है; बाकी सम हैं।`) : L(`${bad} is even; the others are odd.`, `${bad} सम है; बाकी विषम हैं।`); }
      else if (t === 2) { good = r.sample([15, 20, 30, 35, 40, 45, 50, 55, 60, 65, 70, 85, 90, 95], 3); bad = r.pick([12, 18, 22, 28, 32, 42, 48, 52, 58, 62, 72, 78]);
        why = L(`${bad} is not a multiple of 5; the others are.`, `${bad}, 5 का गुणज नहीं है; बाकी हैं।`); }
      else { good = r.sample([16, 25, 36, 49, 64, 81, 100, 121, 144], 3); bad = r.pick([20, 30, 40, 50, 60, 70, 90, 110, 130]);
        why = L(`${bad} is not a perfect square; the others are.`, `${bad} पूर्ण वर्ग नहीं है; बाकी हैं।`); }
      return mcq(r, P, String(bad), good.map(String), why);
    }),
  S('l.machine', 5, L('Number machines: find the rule', 'संख्या-मशीन: नियम खोजिए'), ['l.series_add'],
    L('Test one rule on every pair. A rule is right only if it works for all of them.', 'एक नियम को हर जोड़े पर परखिए। नियम तभी सही है जब वह सभी पर लागू हो।'),
    r => {
      const t = r.int(1, 4), k = r.int(2, 9), c = r.int(1, 9);
      const f = t === 1 ? x => x * k : t === 2 ? x => x + k + 10 : t === 3 ? x => x * k + c : x => x * x;
      const rule = t === 1 ? L(`multiply by ${k}`, `${k} से गुणा`) : t === 2 ? L(`add ${k + 10}`, `${k + 10} जोड़ना`) : t === 3 ? L(`multiply by ${k}, then add ${c}`, `${k} से गुणा, फिर ${c} जोड़ना`) : L('multiply the number by itself', 'संख्या को स्वयं से गुणा');
      const [a, b, d, x] = r.sample([2, 3, 4, 5, 6, 7, 8, 9], 4);
      return num(L(`A number machine changes ${a} into ${f(a)}, ${b} into ${f(b)} and ${d} into ${f(d)}. What does it change ${x} into?`, `एक संख्या-मशीन ${a} को ${f(a)} में, ${b} को ${f(b)} में और ${d} को ${f(d)} में बदलती है। वह ${x} को किसमें बदलेगी?`), f(x),
        L(`The rule is: ${rule.en}. So ${x} becomes ${f(x)}.`, `नियम है: ${rule.hi}। अतः ${x}, ${f(x)} बन जाएगा।`));
    }),
  S('l.code', 5, L('Letter codes', 'अक्षर कूट'), [],
    L('Compare each letter with its code letter and count the steps in the alphabet.', 'हर अक्षर की तुलना उसके कूट अक्षर से कीजिए और वर्णमाला में कदम गिनिए।'),
    r => { const k = r.int(1, 3), [a, b] = r.sample(WORDS, 2);
      return text(L(`In a code, ${a} is written as ${shift(a, k)}. How is ${b} written in the same code?`, `एक कूट भाषा में ${a} को ${shift(a, k)} लिखा जाता है। उसी कूट में ${b} कैसे लिखा जाएगा?`), shift(b, k),
        L(`Each letter moves ${k} step(s) forward in the alphabet, so ${b} becomes ${shift(b, k)}.`, `हर अक्षर वर्णमाला में ${k} स्थान आगे बढ़ता है, इसलिए ${b} का कूट ${shift(b, k)} है।`), { caps: true }); }),
  S('l.dir', 5, L('Directions', 'दिशा ज्ञान'), [],
    L('Draw it. A right turn goes clockwise: North, East, South, West.', 'चित्र बनाइए। दाएँ मुड़ना घड़ी की दिशा में होता है: उत्तर, पूर्व, दक्षिण, पश्चिम।'),
    r => {
      if (r.bool()) { let d = r.int(0, 3); const s = d, n = r.int(2, 4), turns = Array.from({ length: n }, () => r.bool()); turns.forEach(t => { d = (d + (t ? 1 : 3)) % 4; });
        if (d === s) { turns.push(true); d = (d + 1) % 4; }
        return mcq(r, L(`Ravi faces ${DIRS[s][0]}. He turns ${turns.map(t => (t ? 'right' : 'left')).join(', then ')}. Which direction does he face now?`, `रवि ${DIRS[s][1]} की ओर मुँह करके खड़ा है। वह ${turns.map(t => (t ? 'दाएँ' : 'बाएँ')).join(', फिर ')} मुड़ता है। अब उसका मुँह किस दिशा में है?`),
          dirL(d), [0, 1, 2, 3].filter(i => i !== d).map(dirL), L(`Follow the turns one by one from ${DIRS[s][0]}: he ends facing ${DIRS[d][0]}.`, `${DIRS[s][1]} से एक-एक मोड़ का पालन कीजिए: अंत में उसका मुँह ${DIRS[d][1]} की ओर है।`), { fixed: DIRS.map(x => x[0]) }); }
      const a = r.int(3, 12), b = r.int(3, 15);
      return num(L(`Ravi walks ${a} m North, then ${b} m East, then ${a} m South. How far is he from where he started (in m)?`, `रवि ${a} मीटर उत्तर, फिर ${b} मीटर पूर्व, फिर ${a} मीटर दक्षिण चलता है। वह आरंभ बिंदु से कितने मीटर दूर है?`), b,
        L(`${a} m North and ${a} m South cancel each other. Only the ${b} m East remains.`, `${a} मीटर उत्तर और ${a} मीटर दक्षिण एक-दूसरे को काट देते हैं। केवल ${b} मीटर पूर्व बचता है।`));
    }),
  S('l.days', 5, L('Days of the week', 'सप्ताह के दिन'), [],
    L('The days repeat every 7 days, so only the remainder after dividing by 7 matters.', 'दिन हर 7 दिन बाद दोहराते हैं, इसलिए 7 से भाग देने पर बचा शेषफल ही काम का है।'),
    r => { const s = r.int(0, 6), n = r.int(8, 60), e = (s + n) % 7, w = r.shuffle([0, 1, 2, 3, 4, 5, 6].filter(i => i !== e)).slice(0, 3);
      return mcq(r, L(`If today is ${DAYS[s][0]}, what day will it be after ${n} days?`, `यदि आज ${DAYS[s][1]} है, तो ${n} दिन बाद कौन-सा दिन होगा?`), L(DAYS[e][0], DAYS[e][1]), w.map(i => L(DAYS[i][0], DAYS[i][1])),
        L(`${n} ÷ 7 leaves remainder ${n % 7}. Count ${n % 7} day(s) on from ${DAYS[s][0]}: ${DAYS[e][0]}.`, `${n} ÷ 7 करने पर शेषफल ${n % 7} बचता है। ${DAYS[s][1]} से ${n % 7} दिन आगे गिनिए: ${DAYS[e][1]}।`)); }),
  S('l.shapes', 6, L('Shape equations', 'आकृति समीकरण'), ['l.machine'],
    L('Start with the line that has only one kind of shape, then use that value in the other line.', 'उस पंक्ति से शुरू कीजिए जिसमें एक ही तरह की आकृति है, फिर वह मान दूसरी पंक्ति में रखिए।'),
    r => { const a = r.int(2, 12), b = r.int(1, 12);
      return num(L(`▲ + ▲ = ${2 * a} and ▲ + ● = ${a + b}. What is ●?`, `▲ + ▲ = ${2 * a} और ▲ + ● = ${a + b}। ● का मान क्या है?`), b,
        L(`▲ = ${2 * a} ÷ 2 = ${a}. Then ● = ${a + b} − ${a} = ${b}.`, `▲ = ${2 * a} ÷ 2 = ${a}। फिर ● = ${a + b} − ${a} = ${b}।`)); }),
];

// ---- coding ---------------------------------------------------------------
const DX = [0, 1, 0, -1], DY = [1, 0, -1, 0];
function runRobot(x, y, d, prog, mirror) {
  for (const [op, n] of prog) {
    if (op === 'F') { x += DX[d] * n; y += DY[d] * n; }
    else d = (d + ((op === 'R') !== !!mirror ? 1 : 3)) % 4;
    if (x < 1 || x > 5 || y < 1 || y > 5) return null;
  }
  return { x, y, d };
}
const progText = prog => prog.map(([op, n]) => (op === 'F' ? `forward ${n}` : op === 'R' ? 'turn right' : 'turn left')).join('\n');
const cell = p => `(${p.x}, ${p.y})`;
function robotQ(r, loop) {
  for (let tries = 0; tries < 200; tries++) {
    const x = r.int(1, 5), y = r.int(1, 5), d = r.int(0, 3);
    let prog, code, bodyLen = 0;
    if (loop) { const k = r.int(2, 3), body = [['F', r.int(1, 2)], [r.bool() ? 'R' : 'L', 0], ['F', 1]].slice(0, r.int(2, 3));
      bodyLen = body.length; prog = Array.from({ length: k }, () => body).flat(); code = `repeat ${k} times:\n` + progText(body).split('\n').map(s => '    ' + s).join('\n'); }
    else { prog = [['F', r.int(1, 3)], [r.bool() ? 'R' : 'L', 0], ['F', r.int(1, 3)]]; if (r.bool()) prog.push([r.bool() ? 'R' : 'L', 0], ['F', r.int(1, 2)]); code = progText(prog); }
    const end = runRobot(x, y, d, prog), mir = runRobot(x, y, d, prog, true);
    if (!end || (end.x === x && end.y === y)) continue;
    const wrongs = [];
    if (mir && cell(mir) !== cell(end)) wrongs.push({ t: cell(mir), m: 'turn_lr' });
    if (loop) { const once = runRobot(x, y, d, prog.slice(0, bodyLen)); if (once) wrongs.push({ t: cell(once), m: 'loop_once' }); }
    for (const [ddx, ddy] of r.shuffle([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]])) { const p = { x: end.x + ddx, y: end.y + ddy }; if (p.x >= 1 && p.x <= 5 && p.y >= 1 && p.y <= 5) wrongs.push({ t: cell(p) }); }
    wrongs.push({ t: cell({ x, y }) });
    return mcq(r, L(`The robot starts at ${cell({ x, y })} facing ${DIRS[d][0]} and runs this program. Squares are written as (column, row). Where does it stop?`,
      `रोबोट ${cell({ x, y })} से ${DIRS[d][1]} की ओर मुँह करके शुरू करता है और यह प्रोग्राम चलाता है। खाने (स्तंभ, पंक्ति) के रूप में लिखे हैं। वह कहाँ रुकेगा?`),
      cell(end), wrongs, L(`Trace one command at a time. The robot stops at ${cell(end)} facing ${DIRS[end.d][0]}.`, `एक-एक आदेश का पालन कीजिए। रोबोट ${cell(end)} पर ${DIRS[end.d][1]} की ओर मुँह करके रुकता है।`),
      { code, grid: { x, y, d } });
  }
  throw new Error('robot generator failed');
}
const PRINTS = L('What does this program print?', 'यह प्रोग्राम क्या प्रिंट करेगा?');

export const CODE = [
  S('c.seq', 4, L('Sequences: trace the robot', 'क्रम: रोबोट का पीछा'), [],
    L('A program runs one command at a time, from top to bottom. Turns are from the robot\'s own point of view.', 'प्रोग्राम एक-एक आदेश ऊपर से नीचे चलाता है। मोड़ रोबोट की अपनी नज़र से होते हैं।'), r => robotQ(r, false)),
  S('c.loop_robot', 5, L('Loops: repeat with the robot', 'लूप: रोबोट के साथ दोहराव'), ['c.seq'],
    L('"repeat 3 times" runs the indented commands three times, in order, before moving on.', '"repeat 3 times" अंदर खिसके हुए आदेशों को क्रम से तीन बार चलाता है।'), r => robotQ(r, true)),
  S('c.vars', 5, L('Variables', 'चर (variables)'), [],
    L('A variable is a named box holding one value. A new assignment replaces the old value.', 'चर एक नाम वाला डिब्बा है जिसमें एक मान रहता है। नया मान रखने पर पुराना हट जाता है।'),
    r => {
      let a = r.int(2, 9), b = r.int(2, 9); const a0 = a, b0 = b, lines = [`a = ${a}`, `b = ${b}`]; let oa = a, ob = b;
      for (const op of r.sample(['a = a + b', 'b = a - b', 'a = a * 2', 'b = b + 3', 'b = a + b', 'a = a + 1'], 3)) {
        lines.push(op);
        if (op === 'a = a + b') { a = a + b; oa = a0 + b0; } else if (op === 'b = a - b') { b = a - b; ob = a0 - b0; } else if (op === 'a = a * 2') { a *= 2; oa = a0 * 2; }
        else if (op === 'b = b + 3') { b += 3; ob = b0 + 3; } else if (op === 'b = a + b') { b = a + b; ob = a0 + b0; } else { a += 1; oa = a0 + 1; }
      }
      const pa = r.bool(), ans = pa ? a : b, old = pa ? oa : ob; lines.push(`print(${pa ? 'a' : 'b'})`);
      return num(PRINTS, ans, L(`Run it line by line, always using the newest values. At the end a = ${a} and b = ${b}.`, `इसे पंक्ति-दर-पंक्ति चलाइए और हमेशा सबसे नए मान लीजिए। अंत में a = ${a} और b = ${b}।`), { code: lines.join('\n'), traps: traps(old !== ans && { v: old, m: 'old_value' }) });
    }),
  S('c.loop', 6, L('Loops that change a value', 'मान बदलने वाले लूप'), ['c.vars'],
    L('Keep a small table: one row for each round of the loop.', 'एक छोटी तालिका बनाइए: लूप के हर चक्कर के लिए एक पंक्ति।'),
    r => { const x = r.int(1, 6), n = r.int(3, 5), k = r.int(2, 5), mul = r.bool(0.3); let v = x; for (let i = 0; i < n; i++) v = mul ? v * 2 : v + k;
      return num(PRINTS, v, L(`The loop runs ${n} times. x goes from ${x} to ${v}.`, `लूप ${n} बार चलता है। x, ${x} से ${v} हो जाता है।`),
        { code: `x = ${x}\nrepeat ${n} times:\n    x = x ${mul ? '* 2' : `+ ${k}`}\nprint(x)`, traps: traps({ v: mul ? x * 2 : x + k, m: 'loop_once' }) }); }),
  S('c.cond', 6, L('Conditions: if and else', 'शर्तें: if और else'), ['c.vars'],
    L('The computer checks the condition. If it is true it runs the "if" part, otherwise the "else" part. Never both.', 'कंप्यूटर शर्त जाँचता है। सही हो तो "if" वाला भाग, नहीं तो "else" वाला भाग चलता है। दोनों कभी नहीं।'),
    r => { const x = r.int(3, 30), t = r.int(5, 25), a = r.int(2, 9), b = r.int(2, 9), yes = x > t, ans = yes ? x - a : x + b;
      return num(PRINTS, ans, L(`${x} > ${t} is ${yes ? 'true, so the "if" part runs' : 'false, so the "else" part runs'}: x becomes ${ans}.`, `${x} > ${t} ${yes ? 'सही है, इसलिए "if" वाला भाग चलता है' : 'गलत है, इसलिए "else" वाला भाग चलता है'}: x का मान ${ans} हो जाता है।`),
        { code: `x = ${x}\nif x > ${t}:\n    x = x - ${a}\nelse:\n    x = x + ${b}\nprint(x)`, traps: traps({ v: yes ? x + b : x - a, m: 'wrong_branch' }) }); }),
  S('c.bin', 7, L('Binary numbers', 'द्विआधारी संख्याएँ'), [],
    L('Computers count with only 0 and 1. From the right, binary places are worth 1, 2, 4, 8, 16.', 'कंप्यूटर केवल 0 और 1 से गिनते हैं। दाईं ओर से द्विआधारी स्थानों का मान 1, 2, 4, 8, 16 होता है।'),
    r => { const n = r.int(5, 31), bin = n.toString(2), parts = bin.split('').map((c, i) => (c === '1' ? 2 ** (bin.length - 1 - i) : 0)).filter(Boolean).join(' + ');
      return r.bool() ? num(L(`Write the binary number ${bin} as a decimal number.`, `द्विआधारी संख्या ${bin} को दशमलव संख्या में लिखिए।`), n, L(`${bin} = ${parts} = ${n}.`, `${bin} = ${parts} = ${n}।`), { traps: traps({ v: bin.split('1').length - 1, m: 'bin_place' }) })
        : num(L(`Write the decimal number ${n} in binary.`, `दशमलव संख्या ${n} को द्विआधारी में लिखिए।`), Number(bin), L(`${n} = ${parts}, which is ${bin} in binary.`, `${n} = ${parts}, जो द्विआधारी में ${bin} है।`)); }),
  S('c.loop_cond', 7, L('Loops with conditions', 'शर्त वाले लूप'), ['c.loop', 'c.cond'],
    L('For each number, first decide whether the condition is true. Only then change the total.', 'हर संख्या के लिए पहले तय कीजिए कि शर्त सही है या नहीं। तभी total बदलिए।'),
    r => { const n = r.int(5, 10), k = r.pick([2, 3]), even = r.bool(), test = k === 3 ? 'n is a multiple of 3' : even ? 'n is even' : 'n is odd';
      const hit = []; for (let i = 1; i <= n; i++) if (k === 3 ? i % 3 === 0 : (i % 2 === 0) === even) hit.push(i); const s = hit.reduce((a, b) => a + b, 0);
      return num(PRINTS, s, L(`Only ${hit.join(', ')} pass the test. Their sum is ${s}.`, `केवल ${hit.join(', ')} शर्त पूरी करते हैं। उनका योग ${s} है।`),
        { code: `total = 0\nfor each number n from 1 to ${n}:\n    if ${test}:\n        total = total + n\nprint(total)`, traps: traps({ v: n * (n + 1) / 2, m: 'wrong_branch' }) }); }),
];
