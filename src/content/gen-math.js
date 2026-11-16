// Maths skills, class 3 to class 8. Every question is generated, so practice
// never runs out and every answer is computed, not typed in by hand.
import { S, L, num, frac, mcq, nmcq, traps, fmt, gcd, lcm, neg, sgn } from './kit.js';

const PLACE = [['ones', 'इकाई'], ['tens', 'दहाई'], ['hundreds', 'सैकड़े'], ['thousands', 'हज़ार'], ['ten thousands', 'दस हज़ार'], ['lakhs', 'लाख']];
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = n => String(n).split('').map(d => SUP[d]).join('');
const digitsOf = n => String(n).split('').map(Number);
const dec = (x, p = 2) => (x / 10 ** p).toFixed(p).replace(/\.?0+$/, '');
const fr = (n, d) => `${n}/${d}`;

function distinct(r, len) {
  const pool = r.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  return Number(pool.slice(0, len).join(''));
}
function placeValue(r, len) {
  const n = distinct(r, len), ds = digitsOf(n), i = r.int(0, len - 1), d = ds[i], pos = len - 1 - i, ans = d * 10 ** pos;
  return num(
    L(`What is the place value of the digit ${d} in ${fmt(n)}?`, `${fmt(n)} में अंक ${d} का स्थानीय मान क्या है?`), ans,
    L(`${d} is in the ${PLACE[pos][0]} place, so its place value is ${fmt(ans)}.`, `${d} ${PLACE[pos][1]} के स्थान पर है, इसलिए इसका स्थानीय मान ${fmt(ans)} है।`),
    { traps: traps(pos > 0 && { v: d, m: 'face_value' }) });
}
function addQ(r, lo, hi) {
  let a, b;
  do { a = r.int(lo, hi); b = r.int(lo, hi); } while ((a % 10) + (b % 10) < 10);
  const A = digitsOf(a).reverse(), Bd = digitsOf(b).reverse();
  const noCarry = Number(A.map((x, i) => (x + (Bd[i] || 0)) % 10).reverse().join(''));
  return num(L(`Add: ${fmt(a)} + ${fmt(b)}`, `जोड़िए: ${fmt(a)} + ${fmt(b)}`), a + b,
    L(`${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}. Add column by column from the right and carry when a column passes 9.`,
      `${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}। दाईं ओर से स्तंभ-दर-स्तंभ जोड़िए और योग 9 से अधिक होने पर हासिल आगे ले जाइए।`),
    { traps: traps({ v: noCarry, m: 'carry' }) });
}
function subQ(r, lo, hi) {
  let a, b;
  do { a = r.int(lo, hi); b = r.int(lo, a - 1); } while ((a % 10) >= (b % 10) || a - b < 10);
  const A = digitsOf(a).reverse(), Bd = digitsOf(b).reverse();
  const flip = Number(A.map((x, i) => Math.abs(x - (Bd[i] || 0))).reverse().join(''));
  return num(L(`Subtract: ${fmt(a)} − ${fmt(b)}`, `घटाइए: ${fmt(a)} − ${fmt(b)}`), a - b,
    L(`${fmt(a)} − ${fmt(b)} = ${fmt(a - b)}. Check: ${fmt(a - b)} + ${fmt(b)} = ${fmt(a)}.`, `${fmt(a)} − ${fmt(b)} = ${fmt(a - b)}। जाँच: ${fmt(a - b)} + ${fmt(b)} = ${fmt(a)}।`),
    { traps: traps({ v: flip, m: 'borrow' }) });
}
function mulQ(r, a, b) {
  const t = [];
  if (b >= 10) t.push({ v: a * (b % 10) + a * Math.floor(b / 10), m: 'mul_place' });
  return num(L(`Multiply: ${fmt(a)} × ${b}`, `गुणा कीजिए: ${fmt(a)} × ${b}`), a * b,
    b >= 10 ? L(`${fmt(a)} × ${b % 10} = ${fmt(a * (b % 10))} and ${fmt(a)} × ${b - b % 10} = ${fmt(a * (b - b % 10))}. Together: ${fmt(a * b)}.`,
                `${fmt(a)} × ${b % 10} = ${fmt(a * (b % 10))} और ${fmt(a)} × ${b - b % 10} = ${fmt(a * (b - b % 10))}। कुल: ${fmt(a * b)}।`)
            : L(`${fmt(a)} × ${b} = ${fmt(a * b)}.`, `${fmt(a)} × ${b} = ${fmt(a * b)}।`),
    { traps: traps(...t) });
}
function divQ(r, d, q, rem) {
  const a = d * q + rem, askRem = rem > 0 && r.bool(0.4);
  const ex = L(`${fmt(a)} = ${d} × ${q} + ${rem}, so the quotient is ${q} and the remainder is ${rem}.`, `${fmt(a)} = ${d} × ${q} + ${rem}, इसलिए भागफल ${q} और शेषफल ${rem} है।`);
  return askRem
    ? num(L(`Divide ${fmt(a)} by ${d}. What is the remainder?`, `${fmt(a)} को ${d} से भाग दीजिए। शेषफल क्या है?`), rem, ex)
    : num(L(`Divide ${fmt(a)} by ${d}. What is the quotient?`, `${fmt(a)} को ${d} से भाग दीजिए। भागफल क्या है?`), q, ex);
}
const NOUNS = [['pens', 'पेन'], ['notebooks', 'कॉपियों'], ['pencils', 'पेंसिलों'], ['balls', 'गेंदों'], ['erasers', 'रबड़ों']];
const NAMES = [['Riya', 'रिया'], ['Aman', 'अमन'], ['Meena', 'मीना'], ['Kabir', 'कबीर']];

export const MATH = [
  S('m.add3', 3, L('Add 3-digit numbers', '3 अंकों की संख्याएँ जोड़ना'), [],
    L('Add ones, then tens, then hundreds. Carry when a column passes 9.', 'पहले इकाई, फिर दहाई, फिर सैकड़े जोड़िए। योग 9 से अधिक हो तो हासिल लीजिए।'), r => addQ(r, 120, 780)),
  S('m.sub3', 3, L('Subtract 3-digit numbers', '3 अंकों की संख्याएँ घटाना'), [],
    L('Start from the ones. If the top digit is smaller, borrow from the next column.', 'इकाई से शुरू कीजिए। ऊपर का अंक छोटा हो तो अगले स्तंभ से उधार लीजिए।'), r => subQ(r, 200, 990)),
  S('m.tables', 3, L('Multiplication tables 2 to 10', 'पहाड़े 2 से 10'), [],
    L('Tables are the foundation of all later maths. Aim to answer each in under 5 seconds.', 'पहाड़े आगे के पूरे गणित की नींव हैं। हर उत्तर 5 सेकंड से कम में देने का लक्ष्य रखिए।'),
    r => { const a = r.int(2, 10), b = r.int(2, 10); return num(`${a} × ${b} = ?`, a * b, L(`${a} × ${b} = ${a * b}.`, `${a} × ${b} = ${a * b}।`)); }),
  S('m.pv4', 3, L('Place value to thousands', 'हज़ार तक स्थानीय मान'), [],
    L('Each place is worth 10 times the place to its right: ones, tens, hundreds, thousands.', 'हर स्थान अपने दाईं ओर के स्थान से 10 गुना होता है: इकाई, दहाई, सैकड़ा, हज़ार।'), r => placeValue(r, 4)),
  S('m.mul1', 4, L('Multiply by a 1-digit number', '1 अंक की संख्या से गुणा'), ['m.tables'],
    L('Multiply each digit from the right and carry the tens.', 'दाईं ओर से हर अंक को गुणा कीजिए और दहाई हासिल लीजिए।'), r => mulQ(r, r.int(23, 489), r.int(3, 9))),
  S('m.div1', 4, L('Divide by a 1-digit number', '1 अंक की संख्या से भाग'), ['m.tables'],
    L('Dividend = divisor × quotient + remainder. The remainder is always smaller than the divisor.', 'भाज्य = भाजक × भागफल + शेषफल। शेषफल हमेशा भाजक से छोटा होता है।'),
    r => { const d = r.int(3, 9); return divQ(r, d, r.int(12, 98), r.int(0, d - 1)); }),
  S('m.round', 4, L('Rounding numbers', 'संख्याओं का निकटन'), ['m.pv4'],
    L('Look at the digit to the right of the rounding place: 5 or more goes up.', 'जिस स्थान तक निकटन करना है, उसके दाईं ओर का अंक देखिए: 5 या अधिक हो तो ऊपर।'),
    r => {
      const k = r.pick([[10, 'ten', 'दहाई'], [100, 'hundred', 'सैकड़े'], [1000, 'thousand', 'हज़ार']]);
      let n; do { n = r.int(1100, 9890); } while (n % k[0] === 0);
      const ans = Math.round(n / k[0]) * k[0], down = Math.floor(n / k[0]) * k[0];
      return num(L(`Round ${fmt(n)} to the nearest ${k[1]}.`, `${fmt(n)} को निकटतम ${k[2]} तक पूर्णांकित कीजिए।`), ans,
        L(`${fmt(n)} lies between ${fmt(down)} and ${fmt(down + k[0])} and is nearer to ${fmt(ans)}.`, `${fmt(n)}, ${fmt(down)} और ${fmt(down + k[0])} के बीच है और ${fmt(ans)} के अधिक निकट है।`),
        { traps: traps(ans !== down && { v: down, m: 'round_half' }) });
    }),
  S('m.perim', 4, L('Perimeter of rectangles and squares', 'आयत और वर्ग का परिमाप'), ['m.add3'],
    L('Perimeter is the distance around a shape: add all the sides.', 'परिमाप किसी आकृति के चारों ओर की दूरी है: सभी भुजाएँ जोड़िए।'),
    r => {
      if (r.bool(0.3)) { const s = r.int(4, 25); return num(L(`The side of a square is ${s} cm. Find its perimeter (in cm).`, `एक वर्ग की भुजा ${s} सेमी है। उसका परिमाप (सेमी में) ज्ञात कीजिए।`), 4 * s, L(`Perimeter = 4 × side = 4 × ${s} = ${4 * s} cm.`, `परिमाप = 4 × भुजा = 4 × ${s} = ${4 * s} सेमी।`), { traps: traps(s !== 4 && { v: s * s, m: 'area_perim' }) }); }
      const w = r.int(3, 14), l = w + r.int(2, 12);
      return num(L(`A rectangle is ${l} cm long and ${w} cm wide. Find its perimeter (in cm).`, `एक आयत की लंबाई ${l} सेमी और चौड़ाई ${w} सेमी है। उसका परिमाप (सेमी में) ज्ञात कीजिए।`), 2 * (l + w),
        L(`Perimeter = 2 × (${l} + ${w}) = ${2 * (l + w)} cm.`, `परिमाप = 2 × (${l} + ${w}) = ${2 * (l + w)} सेमी।`),
        { traps: traps(l * w !== 2 * (l + w) && { v: l * w, m: 'area_perim' }, { v: l + w, m: 'perim_half' }) });
    }),
  S('m.frac_like', 4, L('Add and subtract like fractions', 'समान हर वाली भिन्नों का जोड़-घटाव'), [],
    L('When denominators are the same, add or subtract only the numerators.', 'जब हर समान हों, तो केवल अंशों को जोड़िए या घटाइए।'),
    r => {
      const d = r.int(5, 12), add = r.bool();
      const a = add ? r.int(1, d - 2) : r.int(2, d - 1), b = add ? r.int(1, d - 1 - a) : r.int(1, a - 1), n = add ? a + b : a - b;
      return frac(L(`${add ? 'Add' : 'Subtract'}: ${fr(a, d)} ${add ? '+' : '−'} ${fr(b, d)}`, `${add ? 'जोड़िए' : 'घटाइए'}: ${fr(a, d)} ${add ? '+' : '−'} ${fr(b, d)}`), n, d,
        L(`The denominators are the same, so ${a} ${add ? '+' : '−'} ${b} = ${n} and the answer is ${fr(n, d)}.`, `हर समान हैं, इसलिए ${a} ${add ? '+' : '−'} ${b} = ${n} और उत्तर ${fr(n, d)} है।`),
        { traps: add ? [{ n, d: 2 * d, m: 'frac_add_den' }] : [] });
    }),
  S('m.time', 4, L('Time between two clock times', 'दो समयों के बीच की अवधि'), ['m.sub3'],
    L('Count up to the next full hour, then the hours, then the remaining minutes. 1 hour = 60 minutes.', 'पहले अगले पूरे घंटे तक गिनिए, फिर घंटे, फिर बचे मिनट। 1 घंटा = 60 मिनट।'),
    r => {
      let s, dur; do { s = r.int(6, 9) * 60 + r.int(1, 11) * 5; dur = r.int(7, 34) * 5; } while (dur % 60 === 0 || Math.floor(s / 60) === Math.floor((s + dur) / 60));
      const e = s + dur, t = x => `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`;
      const fake = (Math.floor(e / 60) * 100 + e % 60) - (Math.floor(s / 60) * 100 + s % 60);
      return num(L(`A class starts at ${t(s)} and ends at ${t(e)}. How many minutes long is it?`, `एक कक्षा ${t(s)} पर शुरू होकर ${t(e)} पर समाप्त होती है। वह कितने मिनट की है?`), dur,
        L(`From ${t(s)} to ${t(e)} is ${Math.floor(dur / 60)} hour(s) and ${dur % 60} minutes = ${dur} minutes.`, `${t(s)} से ${t(e)} तक ${Math.floor(dur / 60)} घंटे और ${dur % 60} मिनट = ${dur} मिनट।`),
        { traps: traps(fake !== dur && { v: fake, m: 'time_base60' }) });
    }),
  S('m.pv6', 5, L('Place value to lakhs', 'लाख तक स्थानीय मान'), ['m.pv4'],
    L('The Indian system groups digits as ones, thousands, lakhs: 3,47,215 is 3 lakh 47 thousand 215.', 'भारतीय पद्धति में अंक इकाई, हज़ार, लाख के समूह में होते हैं: 3,47,215 = 3 लाख 47 हज़ार 215।'), r => placeValue(r, 6)),
  S('m.addsub5', 5, L('Add and subtract large numbers', 'बड़ी संख्याओं का जोड़-घटाव'), ['m.add3', 'm.sub3'],
    L('The method is the same as for small numbers: keep the columns lined up.', 'विधि छोटी संख्याओं जैसी ही है: स्तंभों को सीध में रखिए।'), r => (r.bool() ? addQ(r, 12000, 480000) : subQ(r, 30000, 900000))),
  S('m.mul2', 5, L('Multiply by a 2-digit number', '2 अंकों की संख्या से गुणा'), ['m.mul1'],
    L('Multiply by the ones, then by the tens (one place to the left), then add.', 'पहले इकाई से, फिर दहाई से (एक स्थान बाईं ओर) गुणा कीजिए, फिर जोड़िए।'), r => mulQ(r, r.int(24, 320), r.int(12, 68))),
  S('m.div2', 5, L('Divide by a 2-digit number', '2 अंकों की संख्या से भाग'), ['m.div1'],
    L('Estimate each digit of the quotient, multiply, subtract and bring down the next digit.', 'भागफल के हर अंक का अनुमान लगाइए, गुणा कीजिए, घटाइए और अगला अंक नीचे उतारिए।'),
    r => { const d = r.int(11, 25); return divQ(r, d, r.int(12, 64), r.bool(0.5) ? 0 : r.int(1, d - 1)); }),
  S('m.factors', 5, L('Factors and multiples', 'गुणनखंड और गुणज'), ['m.tables'],
    L('A factor divides a number exactly. A multiple is the number times 1, 2, 3 and so on.', 'गुणनखंड संख्या को पूरा-पूरा विभाजित करता है। गुणज = संख्या × 1, 2, 3 इत्यादि।'),
    r => {
      if (r.bool()) {
        const n = r.pick([12, 18, 20, 24, 28, 30, 36, 40, 42, 45, 48, 56, 60, 72]);
        const fs = []; for (let i = 2; i < n; i++) if (n % i === 0) fs.push(i);
        const c = r.pick(fs), non = r.shuffle(Array.from({ length: n - 4 }, (_, i) => i + 3).filter(x => n % x !== 0)).slice(0, 2);
        return mcq(r, L(`Which of these is a factor of ${n}?`, `इनमें से कौन ${n} का गुणनखंड है?`), String(c), [{ t: String(2 * n), m: 'factor_multiple' }, ...non.map(String), String(n + 1)],
          L(`${n} ÷ ${c} = ${n / c} with no remainder, so ${c} is a factor of ${n}.`, `${n} ÷ ${c} = ${n / c}, कोई शेषफल नहीं, इसलिए ${c}, ${n} का गुणनखंड है।`));
      }
      const k = r.int(3, 9), c = k * r.int(4, 12), w = []; for (const d of r.shuffle([1, -1, 2, -2, 3])) if ((c + d) % k !== 0) w.push(String(c + d));
      return mcq(r, L(`Which of these is a multiple of ${k}?`, `इनमें से कौन ${k} का गुणज है?`), String(c), w,
        L(`${k} × ${c / k} = ${c}, so ${c} is a multiple of ${k}.`, `${k} × ${c / k} = ${c}, इसलिए ${c}, ${k} का गुणज है।`));
    }),
  S('m.prime', 5, L('Prime numbers', 'अभाज्य संख्याएँ'), ['m.factors'],
    L('A prime number has exactly two factors: 1 and itself. 1 is not prime, and 2 is the only even prime.', 'अभाज्य संख्या के ठीक दो गुणनखंड होते हैं: 1 और वह स्वयं। 1 अभाज्य नहीं है और 2 एकमात्र सम अभाज्य संख्या है।'),
    r => {
      const p = r.pick([11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97]);
      const odd = r.sample([21, 27, 33, 39, 49, 51, 57, 63, 69, 77, 81, 87, 91, 93], 2), ev = r.pick([22, 34, 46, 58, 62, 74, 86]);
      const f = n => [3, 5, 7, 11].find(d => n % d === 0);
      return mcq(r, L('Which of these is a prime number?', 'इनमें से कौन अभाज्य संख्या है?'), String(p), [...odd.map(x => ({ t: String(x), m: 'odd_prime' })), String(ev)],
        L(`${p} has no factors other than 1 and ${p}. But ${odd[0]} = ${f(odd[0])} × ${odd[0] / f(odd[0])} and ${odd[1]} = ${f(odd[1])} × ${odd[1] / f(odd[1])}.`,
          `${p} के 1 और ${p} के अलावा कोई गुणनखंड नहीं है। पर ${odd[0]} = ${f(odd[0])} × ${odd[0] / f(odd[0])} और ${odd[1]} = ${f(odd[1])} × ${odd[1] / f(odd[1])}।`));
    }),
  S('m.hcf', 5, L('Highest common factor (HCF)', 'महत्तम समापवर्तक (HCF)'), ['m.factors'],
    L('List the factors of both numbers. The biggest one they share is the HCF.', 'दोनों संख्याओं के गुणनखंड लिखिए। जो सबसे बड़ा उभयनिष्ठ हो, वही HCF है।'),
    r => {
      const g = r.int(2, 12); let m, n; do { m = r.int(2, 7); n = r.int(2, 7); } while (m === n || gcd(m, n) !== 1);
      const a = g * m, b = g * n, sp = [2, 3, 5, 7, 11].find(p => g % p === 0);
      return num(L(`Find the HCF of ${a} and ${b}.`, `${a} और ${b} का महत्तम समापवर्तक (HCF) ज्ञात कीजिए।`), g,
        L(`${a} = ${g} × ${m} and ${b} = ${g} × ${n}. ${m} and ${n} share no factor, so the HCF is ${g}.`, `${a} = ${g} × ${m} और ${b} = ${g} × ${n}। ${m} और ${n} का कोई उभयनिष्ठ गुणनखंड नहीं है, इसलिए HCF ${g} है।`),
        { traps: traps({ v: lcm(a, b), m: 'hcf_lcm' }, sp !== g && { v: sp, m: 'hcf_not_highest' }) });
    }),
  S('m.lcm', 5, L('Lowest common multiple (LCM)', 'लघुत्तम समापवर्त्य (LCM)'), ['m.factors'],
    L('List multiples of both numbers. The first one they share is the LCM.', 'दोनों संख्याओं के गुणज लिखिए। जो पहला उभयनिष्ठ हो, वही LCM है।'),
    r => {
      let a, b; do { a = r.int(3, 15); b = r.int(3, 15); } while (a === b || a % b === 0 || b % a === 0);
      const l = lcm(a, b);
      return num(L(`Find the LCM of ${a} and ${b}.`, `${a} और ${b} का लघुत्तम समापवर्त्य (LCM) ज्ञात कीजिए।`), l,
        L(`${l} = ${a} × ${l / a} = ${b} × ${l / b}, and no smaller number is a multiple of both.`, `${l} = ${a} × ${l / a} = ${b} × ${l / b}, और इससे छोटी कोई संख्या दोनों का गुणज नहीं है।`),
        { traps: traps(a * b !== l && { v: a * b, m: 'lcm_product' }, { v: gcd(a, b), m: 'hcf_lcm' }) });
    }),
  S('m.frac_eq', 5, L('Equivalent fractions', 'समतुल्य भिन्न'), ['m.frac_like'],
    L('Multiply or divide the numerator and denominator by the same number.', 'अंश और हर को एक ही संख्या से गुणा या भाग कीजिए।'),
    r => {
      let a, b; do { b = r.int(2, 9); a = r.int(1, b - 1); } while (gcd(a, b) !== 1);
      const k = r.int(2, 6), top = r.bool();
      return num(L(`Fill in the missing number: ${fr(a, b)} = ${top ? '?' : a * k}/${top ? b * k : '?'}`, `रिक्त संख्या भरिए: ${fr(a, b)} = ${top ? '?' : a * k}/${top ? b * k : '?'}`), top ? a * k : b * k,
        L(`Multiply top and bottom by ${k}: ${fr(a, b)} = ${fr(a * k, b * k)}.`, `अंश और हर को ${k} से गुणा कीजिए: ${fr(a, b)} = ${fr(a * k, b * k)}।`),
        { traps: traps({ v: top ? a + (b * k - b) : b + (a * k - a), m: 'frac_eq_add' }) });
    }),
  S('m.frac_cmp', 5, L('Compare fractions', 'भिन्नों की तुलना'), ['m.frac_eq'],
    L('Give both fractions the same denominator, or cross-multiply, then compare.', 'दोनों भिन्नों का हर समान कीजिए या तिर्यक गुणा कीजिए, फिर तुलना कीजिए।'),
    r => {
      let a, b, c, d; const eq = r.bool(0.15);
      do { b = r.int(2, 10); a = r.int(1, b - 1); if (eq) { const k = r.int(2, 3); c = a * k; d = b * k; } else { d = r.int(2, 12); c = r.int(1, d - 1); } } while (b === d || (!eq && a * d === c * b));
      const f1 = fr(a, b), f2 = fr(c, d), same = L('They are equal', 'दोनों बराबर हैं');
      const right = a * d === c * b ? same : a * d > c * b ? f1 : f2;
      return mcq(r, L(`Which is greater: ${f1} or ${f2}?`, `कौन बड़ा है: ${f1} या ${f2}?`), right, [f1, f2, same].filter(x => x !== right).map(t => ({ t, m: 'frac_cmp' })),
        L(`Cross-multiply: ${a} × ${d} = ${a * d} and ${c} × ${b} = ${c * b}. ${a * d === c * b ? 'They are equal.' : `${right} is greater.`}`,
          `तिर्यक गुणा: ${a} × ${d} = ${a * d} और ${c} × ${b} = ${c * b}। ${a * d === c * b ? 'दोनों बराबर हैं।' : `${right} बड़ा है।`}`), { n: 3, fixed: [f1, f2, same.en] });
    }),
  S('m.frac_unlike', 5, L('Add and subtract unlike fractions', 'असमान हर वाली भिन्नों का जोड़-घटाव'), ['m.frac_eq', 'm.lcm'],
    L('Change both fractions to the LCM of the denominators, then add or subtract the numerators.', 'दोनों भिन्नों को हरों के LCM वाले हर में बदलिए, फिर अंशों को जोड़िए या घटाइए।'),
    r => {
      const [d1, d2] = r.pick([[2, 3], [2, 5], [3, 4], [4, 6], [3, 6], [2, 4], [4, 5], [6, 8], [3, 5], [5, 10], [4, 8], [6, 9]]);
      const add = r.bool(0.6); let a, c;
      do { a = r.int(1, d1 - 1); c = r.int(1, d2 - 1); } while (!add && a * d2 <= c * d1);
      const l = lcm(d1, d2), x = a * l / d1, y = c * l / d2, n = add ? x + y : x - y, g = gcd(n, l), op = add ? '+' : '−';
      return frac(L(`${add ? 'Add' : 'Subtract'}: ${fr(a, d1)} ${op} ${fr(c, d2)}`, `${add ? 'जोड़िए' : 'घटाइए'}: ${fr(a, d1)} ${op} ${fr(c, d2)}`), n, l,
        L(`Use denominator ${l}: ${fr(x, l)} ${op} ${fr(y, l)} = ${fr(n, l)}${g > 1 ? ` = ${fr(n / g, l / g)}` : ''}.`, `हर ${l} लीजिए: ${fr(x, l)} ${op} ${fr(y, l)} = ${fr(n, l)}${g > 1 ? ` = ${fr(n / g, l / g)}` : ''}।`),
        { traps: add ? [{ n: a + c, d: d1 + d2, m: 'frac_add_den' }] : [] });
    }),
  S('m.frac_of', 5, L('Fraction of a number', 'किसी संख्या का भिन्न भाग'), ['m.frac_like', 'm.div1'],
    L('Divide by the denominator, then multiply by the numerator.', 'हर से भाग दीजिए, फिर अंश से गुणा कीजिए।'),
    r => { const d = r.int(2, 10), n = r.int(1, d - 1), k = r.int(2, 12); return num(L(`Find ${fr(n, d)} of ${d * k}.`, `${d * k} का ${fr(n, d)} ज्ञात कीजिए।`), n * k, L(`${d * k} ÷ ${d} = ${k}, and ${k} × ${n} = ${n * k}.`, `${d * k} ÷ ${d} = ${k}, और ${k} × ${n} = ${n * k}।`)); }),
  S('m.dec_pv', 5, L('Decimal place value', 'दशमलव का स्थानीय मान'), ['m.pv4'],
    L('After the decimal point come tenths (0.1) and hundredths (0.01).', 'दशमलव बिंदु के बाद दशांश (0.1) और शतांश (0.01) आते हैं।'),
    r => {
      const [u, t, h] = r.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 3), i = r.int(0, 2), d = [u, t, h][i], n = `${u}.${t}${h}`;
      const vals = [String(d), dec(d, 1), dec(d, 2)], name = [['ones', 'इकाई'], ['tenths', 'दशांश'], ['hundredths', 'शतांश']][i];
      return mcq(r, L(`What is the place value of the digit ${d} in ${n}?`, `${n} में अंक ${d} का स्थानीय मान क्या है?`), vals[i], [...vals.filter((_, j) => j !== i).map(t => ({ t, m: 'dec_pv' })), String(d * 10)],
        L(`${d} is in the ${name[0]} place, so its value is ${vals[i]}.`, `${d} ${name[1]} के स्थान पर है, इसलिए इसका मान ${vals[i]} है।`));
    }),
  S('m.dec_cmp', 5, L('Compare decimals', 'दशमलव की तुलना'), ['m.dec_pv'],
    L('Compare the whole part, then tenths, then hundredths. 0.5 is the same as 0.50.', 'पहले पूर्ण भाग, फिर दशांश, फिर शतांश की तुलना कीजिए। 0.5 और 0.50 बराबर हैं।'),
    r => {
      const w = r.int(0, 9); let a, b; do { a = r.int(1, 9) * 10; b = r.int(11, 99); } while (a === b || b % 10 === 0);
      const A = `${w}.${a / 10}`, Bs = `${w}.${b}`, right = a > b ? A : Bs, same = L('They are equal', 'दोनों बराबर हैं');
      return mcq(r, L(`Which is greater: ${A} or ${Bs}?`, `कौन बड़ा है: ${A} या ${Bs}?`), right, [{ t: a > b ? Bs : A, m: 'dec_longer' }, same],
        L(`${A} = ${w}.${a} and ${Bs} = ${w}.${b}. Since ${Math.max(a, b)} hundredths is more than ${Math.min(a, b)} hundredths, ${right} is greater.`, `${A} = ${w}.${a} और ${Bs} = ${w}.${b}। ${Math.max(a, b)} शतांश, ${Math.min(a, b)} शतांश से अधिक है, इसलिए ${right} बड़ा है।`), { n: 3, fixed: [A, Bs, same.en] });
    }),
  S('m.dec_add', 5, L('Add and subtract decimals', 'दशमलव का जोड़-घटाव'), ['m.dec_pv'],
    L('Write the numbers with the decimal points in one line, then add or subtract as usual.', 'संख्याओं को इस तरह लिखिए कि दशमलव बिंदु एक सीध में हों, फिर सामान्य तरह से जोड़िए या घटाइए।'),
    r => {
      let a, b; do { a = r.int(101, 899); b = r.int(11, 89) * 10; } while (a % 10 === 0);
      if (r.bool(0.6)) return num(L(`Add: ${dec(a)} + ${dec(b)}`, `जोड़िए: ${dec(a)} + ${dec(b)}`), (a + b) / 100,
        L(`Line up the points: ${dec(a)} + ${(b / 100).toFixed(2)} = ${dec(a + b)}.`, `बिंदु सीध में रखिए: ${dec(a)} + ${(b / 100).toFixed(2)} = ${dec(a + b)}।`), { tol: 1e-6, traps: traps({ v: (a + b / 10) / 100, m: 'dec_align' }) });
      const hi = Math.max(a, b), lo = Math.min(a, b);
      return num(L(`Subtract: ${dec(hi)} − ${dec(lo)}`, `घटाइए: ${dec(hi)} − ${dec(lo)}`), (hi - lo) / 100,
        L(`Line up the points: ${(hi / 100).toFixed(2)} − ${(lo / 100).toFixed(2)} = ${dec(hi - lo)}.`, `बिंदु सीध में रखिए: ${(hi / 100).toFixed(2)} − ${(lo / 100).toFixed(2)} = ${dec(hi - lo)}।`), { tol: 1e-6 });
    }),
  S('m.area', 5, L('Area of rectangles and squares', 'आयत और वर्ग का क्षेत्रफल'), ['m.perim', 'm.mul1'],
    L('Area is the space inside: length × breadth, measured in square units.', 'क्षेत्रफल अंदर की जगह है: लंबाई × चौड़ाई, जिसे वर्ग इकाइयों में मापते हैं।'),
    r => {
      if (r.bool(0.3)) { const s = r.int(5, 20); return num(L(`The side of a square is ${s} cm. Find its area (in sq cm).`, `एक वर्ग की भुजा ${s} सेमी है। उसका क्षेत्रफल (वर्ग सेमी में) ज्ञात कीजिए।`), s * s, L(`Area = side × side = ${s} × ${s} = ${s * s} sq cm.`, `क्षेत्रफल = भुजा × भुजा = ${s} × ${s} = ${s * s} वर्ग सेमी।`), { traps: traps(4 * s !== s * s && { v: 4 * s, m: 'area_perim' }) }); }
      const w = r.int(3, 12), l = w + r.int(2, 12);
      return num(L(`A rectangle is ${l} cm long and ${w} cm wide. Find its area (in sq cm).`, `एक आयत की लंबाई ${l} सेमी और चौड़ाई ${w} सेमी है। उसका क्षेत्रफल (वर्ग सेमी में) ज्ञात कीजिए।`), l * w,
        L(`Area = ${l} × ${w} = ${l * w} sq cm.`, `क्षेत्रफल = ${l} × ${w} = ${l * w} वर्ग सेमी।`), { traps: traps(2 * (l + w) !== l * w && { v: 2 * (l + w), m: 'area_perim' }) });
    }),
  S('m.unitary', 5, L('Unitary method', 'ऐकिक विधि'), ['m.mul1', 'm.div1'],
    L('First find the value of one, then multiply to get the value of many.', 'पहले एक का मान निकालिए, फिर गुणा करके अनेक का मान निकालिए।'),
    r => {
      const [en, hi] = r.pick(NOUNS), n1 = r.int(2, 9), p = r.int(4, 25); let n2; do { n2 = r.int(2, 12); } while (n2 === n1);
      return num(L(`${n1} ${en} cost ₹${n1 * p}. What is the cost of ${n2} ${en} (in ₹)?`, `${n1} ${hi} का मूल्य ₹${n1 * p} है। ${n2} ${hi} का मूल्य (₹ में) क्या होगा?`), n2 * p,
        L(`One costs ₹${n1 * p} ÷ ${n1} = ₹${p}. So ${n2} cost ${n2} × ₹${p} = ₹${n2 * p}.`, `एक का मूल्य ₹${n1 * p} ÷ ${n1} = ₹${p}। अतः ${n2} का मूल्य ${n2} × ₹${p} = ₹${n2 * p}।`));
    }),
  S('m.avg', 5, L('Average', 'औसत'), ['m.div1', 'm.add3'],
    L('Average = sum of the values ÷ number of values.', 'औसत = मानों का योग ÷ मानों की संख्या।'),
    r => {
      const v = [r.int(10, 60), r.int(10, 60), r.int(10, 60)]; let d = r.int(10, 60); while ((v[0] + v[1] + v[2] + d) % 4) d++;
      v.push(d); const s = v.reduce((a, b) => a + b, 0);
      return num(L(`Find the average of ${v[0]}, ${v[1]}, ${v[2]} and ${v[3]}.`, `${v[0]}, ${v[1]}, ${v[2]} और ${v[3]} का औसत ज्ञात कीजिए।`), s / 4,
        L(`Sum = ${s}. Average = ${s} ÷ 4 = ${s / 4}.`, `योग = ${s}। औसत = ${s} ÷ 4 = ${s / 4}।`), { traps: traps({ v: s, m: 'avg_sum' }) });
    }),
  S('m.bodmas', 5, L('Order of operations', 'संक्रियाओं का क्रम'), ['m.mul1', 'm.div1'],
    L('Brackets first, then division and multiplication, then addition and subtraction.', 'पहले कोष्ठक, फिर भाग और गुणा, फिर जोड़ और घटाव।'),
    r => {
      const a = r.int(4, 20), b = r.int(2, 9), c = r.int(2, 9), t = r.int(1, 4);
      let e, ans, trap, why;
      if (t === 1) { e = `${a} + ${b} × ${c}`; ans = a + b * c; trap = { v: (a + b) * c, m: 'bodmas_ltr' }; why = [`${b} × ${c} = ${b * c}`, `${a} + ${b * c} = ${ans}`]; }
      else if (t === 2) { const A = a + 20; e = `${A} − ${b * c} ÷ ${c}`; ans = A - b; trap = { v: (A - b * c) / c, m: 'bodmas_ltr' }; why = [`${b * c} ÷ ${c} = ${b}`, `${A} − ${b} = ${ans}`]; }
      else if (t === 3) { e = `(${a} + ${b}) × ${c}`; ans = (a + b) * c; trap = { v: a + b * c, m: 'bodmas_brackets' }; why = [`${a} + ${b} = ${a + b}`, `${a + b} × ${c} = ${ans}`]; }
      else { const d = r.int(2, 5), x = r.int(6, 12); e = `${x} × ${b} − ${c} × ${d}`; ans = x * b - c * d; trap = { v: (x * b - c) * d, m: 'bodmas_ltr' }; why = [`${x} × ${b} = ${x * b} and ${c} × ${d} = ${c * d}`, `${x * b} − ${c * d} = ${ans}`]; }
      return num(L(`Calculate: ${e}`, `हल कीजिए: ${e}`), ans, L(`First ${why[0]}. Then ${why[1]}.`, `पहले ${why[0].replace(' and ', ' और ')}। फिर ${why[1]}।`), { traps: traps(Number.isInteger(trap.v) && trap.v !== ans && trap) });
    }),
  S('m.word', 5, L('Two-step word problems', 'दो चरणों वाले इबारती प्रश्न'), ['m.mul1', 'm.div1'],
    L('Read twice. Write what is given and what is asked, then decide the two steps.', 'दो बार पढ़िए। लिखिए कि क्या दिया है और क्या पूछा है, फिर दोनों चरण तय कीजिए।'),
    r => {
      const t = r.int(1, 3);
      if (t === 1) { const [en, hi] = r.pick(NAMES), k = r.int(2, 6), p = r.int(4, 15) * 10, have = k * p + r.int(2, 30) * 10;
        return num(L(`${en} had ₹${have}. ${en} bought ${k} books at ₹${p} each. How much money is left (in ₹)?`, `${hi} के पास ₹${have} थे। ${hi} ने ₹${p} प्रति पुस्तक की दर से ${k} पुस्तकें खरीदीं। कितने रुपये बचे?`), have - k * p,
          L(`Cost = ${k} × ₹${p} = ₹${k * p}. Left = ₹${have} − ₹${k * p} = ₹${have - k * p}.`, `मूल्य = ${k} × ₹${p} = ₹${k * p}। शेष = ₹${have} − ₹${k * p} = ₹${have - k * p}।`)); }
      if (t === 2) { const c = r.int(4, 9), s = r.int(25, 45), ab = r.int(6, 24);
        return num(L(`A school has ${c} classes with ${s} students in each. Today ${ab} students are absent. How many are present?`, `एक विद्यालय में ${c} कक्षाएँ हैं और प्रत्येक में ${s} विद्यार्थी हैं। आज ${ab} विद्यार्थी अनुपस्थित हैं। कितने विद्यार्थी उपस्थित हैं?`), c * s - ab,
          L(`Total = ${c} × ${s} = ${c * s}. Present = ${c * s} − ${ab} = ${c * s - ab}.`, `कुल = ${c} × ${s} = ${c * s}। उपस्थित = ${c * s} − ${ab} = ${c * s - ab}।`)); }
      const box = r.int(6, 24); let n; do { n = r.int(60, 400); } while (n % box === 0);
      return num(L(`One box holds ${box} mangoes. How many boxes are needed to pack ${n} mangoes?`, `एक पेटी में ${box} आम आते हैं। ${n} आमों को रखने के लिए कितनी पेटियाँ चाहिए?`), Math.ceil(n / box),
        L(`${n} ÷ ${box} = ${Math.floor(n / box)} remainder ${n % box}. The leftover ${n % box} mangoes need one more box: ${Math.ceil(n / box)}.`, `${n} ÷ ${box} = ${Math.floor(n / box)}, शेषफल ${n % box}। बचे ${n % box} आमों के लिए एक और पेटी चाहिए: ${Math.ceil(n / box)}।`),
        { traps: traps({ v: Math.floor(n / box), m: 'word_remainder' }) });
    }),
  S('m.percent', 6, L('Percentage of a quantity', 'किसी राशि का प्रतिशत'), ['m.frac_of'],
    L('Percent means out of 100. p% of a number = number × p ÷ 100.', 'प्रतिशत का अर्थ है 100 में से। किसी संख्या का p% = संख्या × p ÷ 100।'),
    r => { const p = r.pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 75]), b = 20 * r.int(1, 25), a = p * b / 100;
      return num(L(`Find ${p}% of ${b}.`, `${b} का ${p}% ज्ञात कीजिए।`), a, L(`${b} × ${p} ÷ 100 = ${a}.`, `${b} × ${p} ÷ 100 = ${a}।`), { traps: traps({ v: p * b / 10, m: 'pct_100' }) }); }),
  S('m.pct_conv', 6, L('Fractions and decimals as percentages', 'भिन्न और दशमलव को प्रतिशत में बदलना'), ['m.frac_eq', 'm.dec_pv'],
    L('To change to a percentage, multiply by 100.', 'प्रतिशत में बदलने के लिए 100 से गुणा कीजिए।'),
    r => {
      if (r.bool()) { const d = r.pick([2, 4, 5, 10, 20, 25, 50]); let n; do { n = r.int(1, d - 1); } while (gcd(n, d) !== 1);
        return num(L(`Write ${fr(n, d)} as a percentage.`, `${fr(n, d)} को प्रतिशत में लिखिए।`), n * 100 / d, L(`${fr(n, d)} × 100 = ${n * 100 / d}%.`, `${fr(n, d)} × 100 = ${n * 100 / d}%।`)); }
      const h = r.int(3, 97); return num(L(`Write ${dec(h)} as a percentage.`, `${dec(h)} को प्रतिशत में लिखिए।`), h, L(`${dec(h)} × 100 = ${h}%.`, `${dec(h)} × 100 = ${h}%।`), { traps: traps(h % 10 === 0 && { v: h / 10, m: 'pct_100' }) });
    }),
  S('m.frac_mul', 6, L('Multiply fractions', 'भिन्नों का गुणा'), ['m.frac_eq'],
    L('Multiply the numerators together and the denominators together, then simplify.', 'अंशों को आपस में और हरों को आपस में गुणा कीजिए, फिर सरल कीजिए।'),
    r => { const b = r.int(2, 7), a = r.int(1, b - 1), d = r.int(2, 7), c = r.int(1, d - 1), g = gcd(a * c, b * d);
      return frac(L(`Multiply: ${fr(a, b)} × ${fr(c, d)}`, `गुणा कीजिए: ${fr(a, b)} × ${fr(c, d)}`), a * c, b * d,
        L(`${a} × ${c} = ${a * c} and ${b} × ${d} = ${b * d}, so the answer is ${fr(a * c, b * d)}${g > 1 ? ` = ${fr(a * c / g, b * d / g)}` : ''}.`, `${a} × ${c} = ${a * c} और ${b} × ${d} = ${b * d}, इसलिए उत्तर ${fr(a * c, b * d)}${g > 1 ? ` = ${fr(a * c / g, b * d / g)}` : ''} है।`)); }),
  S('m.dec_mul', 6, L('Multiply and divide decimals by 10 and 100', 'दशमलव को 10 और 100 से गुणा-भाग'), ['m.dec_pv'],
    L('× 10 moves every digit one place to the left; ÷ 10 moves every digit one place to the right.', '× 10 करने पर हर अंक एक स्थान बाईं ओर, और ÷ 10 करने पर एक स्थान दाईं ओर खिसकता है।'),
    r => {
      let a; do { a = r.int(105, 989); } while (a % 10 === 0);
      const t = r.int(1, 3);
      if (t === 1) return num(L(`Multiply: ${dec(a)} × 10`, `गुणा कीजिए: ${dec(a)} × 10`), a / 10, L(`Each digit moves one place left: ${dec(a)} × 10 = ${dec(a, 1)}.`, `हर अंक एक स्थान बाईं ओर खिसकता है: ${dec(a)} × 10 = ${dec(a, 1)}।`), { tol: 1e-6, traps: traps({ v: a / 1000, m: 'dec_shift' }) });
      if (t === 2) return num(L(`Multiply: ${dec(a)} × 100`, `गुणा कीजिए: ${dec(a)} × 100`), a, L(`Each digit moves two places left: ${dec(a)} × 100 = ${a}.`, `हर अंक दो स्थान बाईं ओर खिसकता है: ${dec(a)} × 100 = ${a}।`), { traps: traps({ v: a / 10, m: 'dec_shift' }) });
      return num(L(`Divide: ${dec(a, 1)} ÷ 10`, `भाग दीजिए: ${dec(a, 1)} ÷ 10`), a / 100, L(`Each digit moves one place right: ${dec(a, 1)} ÷ 10 = ${dec(a)}.`, `हर अंक एक स्थान दाईं ओर खिसकता है: ${dec(a, 1)} ÷ 10 = ${dec(a)}।`), { tol: 1e-6, traps: traps({ v: a, m: 'dec_shift' }) });
    }),
  S('m.int_add', 6, L('Add and subtract integers', 'पूर्णांकों का जोड़-घटाव'), ['m.sub3'],
    L('Use a number line: adding moves right, subtracting moves left. Subtracting a negative means adding.', 'संख्या रेखा का प्रयोग कीजिए: जोड़ने पर दाईं ओर, घटाने पर बाईं ओर। ऋणात्मक घटाना यानी जोड़ना।'),
    r => {
      let a, b; do { a = r.int(-15, 15); b = r.int(-15, 15); } while (!a || !b || (a > 0 && b > 0) || a === b || a === -b);
      const add = r.bool(), ans = add ? a + b : a - b, e = `${neg(a)} ${add ? '+' : '−'} ${neg(b)}`;
      return num(L(`Calculate: ${e}`, `हल कीजिए: ${e}`), ans,
        add ? L(`Start at ${a} and move ${Math.abs(b)} step(s) to the ${b > 0 ? 'right' : 'left'}: ${ans}.`, `${a} से शुरू करके ${Math.abs(b)} कदम ${b > 0 ? 'दाईं' : 'बाईं'} ओर चलिए: ${ans}।`)
            : L(`Subtracting ${neg(b)} is the same as adding ${neg(-b)}: ${neg(a)} + ${neg(-b)} = ${ans}.`, `${neg(b)} घटाना, ${neg(-b)} जोड़ने के बराबर है: ${neg(a)} + ${neg(-b)} = ${ans}।`),
        { traps: traps({ v: -ans, m: 'int_sign' }, { v: add ? a - b : a + b, m: add ? 'int_sign' : 'int_sub_neg' }) });
    }),
  S('m.ratio_s', 6, L('Simplify ratios', 'अनुपात को सरल करना'), ['m.hcf'],
    L('Divide both terms by their HCF. Keep the order of the terms.', 'दोनों पदों को उनके HCF से भाग दीजिए। पदों का क्रम वही रखिए।'),
    r => {
      const g = r.int(2, 9); let m, n; do { m = r.int(1, 9); n = r.int(1, 9); } while (m === n || gcd(m, n) !== 1);
      const sp = [2, 3, 5, 7].find(p => g % p === 0), w = [{ t: `${n} : ${m}`, m: 'ratio_order' }];
      if (sp !== g) w.push({ t: `${g * m / sp} : ${g * n / sp}`, m: 'ratio_partial' });
      w.push(`${m + 1} : ${n}`, `${m} : ${n + 1}`, `${m + 1} : ${n + 1}`);
      return mcq(r, L(`Write the ratio ${g * m} : ${g * n} in its simplest form.`, `अनुपात ${g * m} : ${g * n} को सरलतम रूप में लिखिए।`), `${m} : ${n}`, w,
        L(`Divide both terms by ${g}: ${g * m} ÷ ${g} = ${m} and ${g * n} ÷ ${g} = ${n}.`, `दोनों पदों को ${g} से भाग दीजिए: ${g * m} ÷ ${g} = ${m} और ${g * n} ÷ ${g} = ${n}।`));
    }),
  S('m.ratio_div', 6, L('Divide a quantity in a ratio', 'किसी राशि को अनुपात में बाँटना'), ['m.ratio_s'],
    L('Add the parts of the ratio, find the value of one part, then multiply.', 'अनुपात के भागों को जोड़िए, एक भाग का मान निकालिए, फिर गुणा कीजिए।'),
    r => { let m, n; do { m = r.int(1, 7); n = r.int(1, 7); } while (m === n); const u = r.int(5, 30), T = (m + n) * u;
      return num(L(`Divide ₹${T} between A and B in the ratio ${m} : ${n}. How much does A get (in ₹)?`, `₹${T} को A और B में ${m} : ${n} के अनुपात में बाँटिए। A को कितने रुपये मिलेंगे?`), m * u,
        L(`Total parts = ${m} + ${n} = ${m + n}. One part = ₹${T} ÷ ${m + n} = ₹${u}. A gets ${m} × ₹${u} = ₹${m * u}.`, `कुल भाग = ${m} + ${n} = ${m + n}। एक भाग = ₹${T} ÷ ${m + n} = ₹${u}। A को ${m} × ₹${u} = ₹${m * u} मिलेंगे।`),
        { traps: traps(m > 1 && T % m === 0 && T / m !== m * u && { v: T / m, m: 'ratio_parts' }) }); }),
  S('m.alg_eval', 6, L('Value of an expression', 'व्यंजक का मान'), ['m.bodmas'],
    L('Replace the letter with its number. 3x means 3 × x.', 'अक्षर के स्थान पर उसकी संख्या रखिए। 3x का अर्थ है 3 × x।'),
    r => { const x = r.int(2, 9), a = r.int(2, 9), b = r.int(1, 12), plus = r.bool() || a * x <= b, ans = plus ? a * x + b : a * x - b, c = Number(`${a}${x}`);
      return num(L(`If x = ${x}, find the value of ${a}x ${plus ? '+' : '−'} ${b}.`, `यदि x = ${x} हो, तो ${a}x ${plus ? '+' : '−'} ${b} का मान ज्ञात कीजिए।`), ans,
        L(`${a} × ${x} = ${a * x}, and ${a * x} ${plus ? '+' : '−'} ${b} = ${ans}.`, `${a} × ${x} = ${a * x}, और ${a * x} ${plus ? '+' : '−'} ${b} = ${ans}।`), { traps: traps({ v: plus ? c + b : c - b, m: 'alg_concat' }) }); }),
  S('m.eq1', 6, L('One-step equations', 'एक चरण वाले समीकरण'), ['m.alg_eval'],
    L('Do the opposite operation on both sides to leave x alone.', 'x को अकेला करने के लिए दोनों पक्षों में उलटी संक्रिया कीजिए।'),
    r => {
      const x = r.int(2, 15), a = r.int(2, 12), t = r.int(1, 4);
      const [e, wrong, how] = t === 1 ? [`x + ${a} = ${x + a}`, x + 2 * a, `${x + a} − ${a}`] : t === 2 ? [`x − ${a} = ${x}`, x - a, `${x} + ${a}`] : t === 3 ? [`${a}x = ${a * x}`, a * a * x, `${a * x} ÷ ${a}`] : [`x ÷ ${a} = ${x}`, x / a, `${x} × ${a}`];
      const ans = t === 2 || t === 4 ? (t === 2 ? x + a : x * a) : x;
      return num(L(`Solve: ${e}`, `हल कीजिए: ${e}`), ans, L(`x = ${how} = ${ans}.`, `x = ${how} = ${ans}।`), { traps: traps(Number.isInteger(wrong) && wrong !== ans && { v: wrong, m: 'eq_inverse' }) });
    }),
  S('m.angles', 6, L('Angles: triangle sum, complement, supplement', 'कोण: त्रिभुज का योग, पूरक, संपूरक'), ['m.sub3'],
    L('Angles of a triangle add to 180°. Complementary angles add to 90°, supplementary to 180°.', 'त्रिभुज के कोणों का योग 180° होता है। पूरक कोणों का योग 90° और संपूरक कोणों का योग 180° होता है।'),
    r => {
      const t = r.int(1, 3);
      if (t === 1) { const a = r.int(30, 85), b = r.int(30, 170 - a - 10);
        return num(L(`Two angles of a triangle are ${a}° and ${b}°. Find the third angle (in degrees).`, `त्रिभुज के दो कोण ${a}° और ${b}° हैं। तीसरा कोण (अंश में) ज्ञात कीजिए।`), 180 - a - b, L(`180° − ${a}° − ${b}° = ${180 - a - b}°.`, `180° − ${a}° − ${b}° = ${180 - a - b}°।`), { traps: traps({ v: 360 - a - b, m: 'tri_sum' }) }); }
      const x = r.int(12, 78);
      return t === 2
        ? num(L(`Find the complement of ${x}° (in degrees).`, `${x}° का पूरक कोण (अंश में) ज्ञात कीजिए।`), 90 - x, L(`90° − ${x}° = ${90 - x}°.`, `90° − ${x}° = ${90 - x}°।`), { traps: traps({ v: 180 - x, m: 'comp_supp' }) })
        : num(L(`Find the supplement of ${x}° (in degrees).`, `${x}° का संपूरक कोण (अंश में) ज्ञात कीजिए।`), 180 - x, L(`180° − ${x}° = ${180 - x}°.`, `180° − ${x}° = ${180 - x}°।`), { traps: traps({ v: 90 - x, m: 'comp_supp' }) });
    }),
  S('m.speed', 6, L('Speed, distance and time', 'चाल, दूरी और समय'), ['m.unitary'],
    L('Speed = distance ÷ time. Distance = speed × time. Time = distance ÷ speed.', 'चाल = दूरी ÷ समय। दूरी = चाल × समय। समय = दूरी ÷ चाल।'),
    r => { const v = r.int(4, 18) * 5, t = r.int(2, 6), d = v * t, k = r.int(1, 3);
      return k === 1 ? num(L(`A bus travels ${d} km in ${t} hours. What is its speed (in km/h)?`, `एक बस ${t} घंटे में ${d} किमी चलती है। उसकी चाल (किमी/घंटा में) क्या है?`), v, L(`Speed = ${d} ÷ ${t} = ${v} km/h.`, `चाल = ${d} ÷ ${t} = ${v} किमी/घंटा।`))
        : k === 2 ? num(L(`A bus moves at ${v} km/h for ${t} hours. How far does it go (in km)?`, `एक बस ${v} किमी/घंटा की चाल से ${t} घंटे चलती है। वह कितनी दूर (किमी में) जाती है?`), d, L(`Distance = ${v} × ${t} = ${d} km.`, `दूरी = ${v} × ${t} = ${d} किमी।`))
        : num(L(`A bus moves at ${v} km/h. How many hours does it take to cover ${d} km?`, `एक बस ${v} किमी/घंटा की चाल से चलती है। ${d} किमी तय करने में उसे कितने घंटे लगेंगे?`), t, L(`Time = ${d} ÷ ${v} = ${t} hours.`, `समय = ${d} ÷ ${v} = ${t} घंटे।`)); }),
  S('m.int_mul', 7, L('Multiply and divide integers', 'पूर्णांकों का गुणा-भाग'), ['m.int_add'],
    L('Same signs give a positive answer; different signs give a negative answer.', 'समान चिह्न हों तो उत्तर धनात्मक, अलग चिह्न हों तो ऋणात्मक।'),
    r => { let a, b; do { a = r.int(-9, 9); b = r.int(-9, 9); } while (!a || !b || (a > 0 && b > 0) || Math.abs(a) === 1 || Math.abs(b) === 1);
      const mul = r.bool(), ans = mul ? a * b : a, e = mul ? `${neg(a)} × ${neg(b)}` : `${neg(a * b)} ÷ ${neg(b)}`;
      const same = mul ? (a < 0) === (b < 0) : (a * b < 0) === (b < 0);
      return num(L(`Calculate: ${e}`, `हल कीजिए: ${e}`), ans, L(`The signs are ${same ? 'the same, so the answer is positive' : 'different, so the answer is negative'}: ${ans}.`, `चिह्न ${same ? 'समान हैं, इसलिए उत्तर धनात्मक है' : 'अलग हैं, इसलिए उत्तर ऋणात्मक है'}: ${ans}।`), { traps: traps({ v: -ans, m: 'int_sign_mul' }) }); }),
  S('m.eq2', 7, L('Two-step equations', 'दो चरणों वाले समीकरण'), ['m.eq1'],
    L('First undo the addition or subtraction, then undo the multiplication.', 'पहले जोड़ या घटाव हटाइए, फिर गुणा हटाइए।'),
    r => { const a = r.int(2, 9), x = r.int(1, 12), b = r.int(1, 20), plus = r.bool(), c = plus ? a * x + b : a * x - b, w = plus ? (c + b) / a : (c - b) / a;
      return num(L(`Solve: ${a}x ${plus ? '+' : '−'} ${b} = ${c}`, `हल कीजिए: ${a}x ${plus ? '+' : '−'} ${b} = ${c}`), x,
        L(`${a}x = ${c} ${plus ? '−' : '+'} ${b} = ${a * x}, so x = ${a * x} ÷ ${a} = ${x}.`, `${a}x = ${c} ${plus ? '−' : '+'} ${b} = ${a * x}, इसलिए x = ${a * x} ÷ ${a} = ${x}।`), { traps: traps(Number.isInteger(w) && w !== x && { v: w, m: 'eq_inverse' }) }); }),
  S('m.exp', 7, L('Powers and exponents', 'घात और घातांक'), ['m.mul2'],
    L('The exponent tells how many times the base is multiplied by itself.', 'घातांक बताता है कि आधार को स्वयं से कितनी बार गुणा करना है।'),
    r => { const b = r.int(2, 10), e = r.int(2, b === 2 ? 10 : b === 3 ? 5 : b <= 5 ? 4 : 3), v = b ** e;
      return num(L(`Find the value of ${b}${sup(e)}.`, `${b}${sup(e)} का मान ज्ञात कीजिए।`), v, L(`${Array(e).fill(b).join(' × ')} = ${fmt(v)}.`, `${Array(e).fill(b).join(' × ')} = ${fmt(v)}।`), { traps: traps(b * e !== v && { v: b * e, m: 'exp_mul' }) }); }),
  S('m.area_tri', 7, L('Area of a triangle', 'त्रिभुज का क्षेत्रफल'), ['m.area'],
    L('Area of a triangle = ½ × base × height.', 'त्रिभुज का क्षेत्रफल = ½ × आधार × ऊँचाई।'),
    r => { const b = r.int(3, 12) * 2, h = r.int(3, 15);
      return num(L(`A triangle has base ${b} cm and height ${h} cm. Find its area (in sq cm).`, `एक त्रिभुज का आधार ${b} सेमी और ऊँचाई ${h} सेमी है। उसका क्षेत्रफल (वर्ग सेमी में) ज्ञात कीजिए।`), b * h / 2, L(`½ × ${b} × ${h} = ${b * h / 2} sq cm.`, `½ × ${b} × ${h} = ${b * h / 2} वर्ग सेमी।`), { traps: traps({ v: b * h, m: 'tri_half' }) }); }),
  S('m.si', 7, L('Simple interest', 'साधारण ब्याज'), ['m.percent'],
    L('Simple interest = principal × rate × time ÷ 100.', 'साधारण ब्याज = मूलधन × दर × समय ÷ 100।'),
    r => { const p = r.int(2, 20) * 500, rt = r.pick([2, 4, 5, 6, 8, 10]), t = r.int(1, 5), si = p * rt * t / 100;
      return num(L(`Find the simple interest on ₹${fmt(p)} at ${rt}% per year for ${t} year(s) (in ₹).`, `₹${fmt(p)} पर ${rt}% वार्षिक दर से ${t} वर्ष का साधारण ब्याज (₹ में) ज्ञात कीजिए।`), si,
        L(`${fmt(p)} × ${rt} × ${t} ÷ 100 = ₹${fmt(si)}.`, `${fmt(p)} × ${rt} × ${t} ÷ 100 = ₹${fmt(si)}।`), { traps: traps({ v: p + si, m: 'si_amount' }) }); }),
  S('m.profit', 7, L('Profit and loss percent', 'लाभ और हानि प्रतिशत'), ['m.percent'],
    L('Profit % = profit ÷ cost price × 100. Loss % = loss ÷ cost price × 100.', 'लाभ % = लाभ ÷ क्रय मूल्य × 100। हानि % = हानि ÷ क्रय मूल्य × 100।'),
    r => { const cp = r.int(1, 10) * 100, p = r.pick([5, 10, 20, 25, 40, 50]), gain = r.bool(0.6), d = cp * p / 100, sp = gain ? cp + d : cp - d;
      return num(L(`A toy bought for ₹${cp} is sold for ₹${sp}. Find the ${gain ? 'profit' : 'loss'} percent.`, `₹${cp} में खरीदा गया खिलौना ₹${sp} में बेचा गया। ${gain ? 'लाभ' : 'हानि'} प्रतिशत ज्ञात कीजिए।`), p,
        L(`${gain ? 'Profit' : 'Loss'} = ₹${d}. Percent = ${d} ÷ ${cp} × 100 = ${p}%.`, `${gain ? 'लाभ' : 'हानि'} = ₹${d}। प्रतिशत = ${d} ÷ ${cp} × 100 = ${p}%।`), { traps: traps(d !== p && { v: d, m: 'pl_amount' }) }); }),
  S('m.sqrt', 8, L('Squares and square roots', 'वर्ग और वर्गमूल'), ['m.exp'],
    L('The square of n is n × n. The square root undoes the square.', 'n का वर्ग n × n होता है। वर्गमूल, वर्ग का उलटा है।'),
    r => { const n = r.int(4, 25);
      return r.bool() ? num(L(`Find the square of ${n}.`, `${n} का वर्ग ज्ञात कीजिए।`), n * n, L(`${n} × ${n} = ${n * n}.`, `${n} × ${n} = ${n * n}।`), { traps: traps({ v: 2 * n, m: 'sq_double' }) })
        : num(L(`Find the square root of ${n * n}.`, `${n * n} का वर्गमूल ज्ञात कीजिए।`), n, L(`${n} × ${n} = ${n * n}, so the square root is ${n}.`, `${n} × ${n} = ${n * n}, इसलिए वर्गमूल ${n} है।`), { traps: traps(n * n % 2 === 0 && { v: n * n / 2, m: 'sqrt_half' }) }); }),
  S('m.eq_both', 8, L('Equations with x on both sides', 'दोनों पक्षों में x वाले समीकरण'), ['m.eq2', 'm.int_add'],
    L('Collect the x terms on one side and the numbers on the other, then divide.', 'x वाले पद एक ओर और संख्याएँ दूसरी ओर इकट्ठा कीजिए, फिर भाग दीजिए।'),
    r => { const x = r.int(1, 10), a = r.int(3, 9), c = r.int(1, a - 1); let b; do { b = r.int(-10, 10); } while (!b || (a - c) * x + b === 0); const d = (a - c) * x + b;
      return num(L(`Solve: ${a}x ${sgn(b)} = ${c === 1 ? '' : c}x ${sgn(d)}`, `हल कीजिए: ${a}x ${sgn(b)} = ${c === 1 ? '' : c}x ${sgn(d)}`), x,
        L(`${a}x − ${c === 1 ? '' : c}x = ${d} − ${neg(b)}, so ${a - c}x = ${d - b} and x = ${x}.`, `${a}x − ${c === 1 ? '' : c}x = ${d} − ${neg(b)}, इसलिए ${a - c}x = ${d - b} और x = ${x}।`)); }),
];
