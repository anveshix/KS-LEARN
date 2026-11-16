// English (e.*) and Hindi (h.*) skills, generated from curated word lists.
// English questions stay in English and Hindi questions in Hindi; only the
// instruction and the explanation are bilingual.
import { S, L, text, mcq, keyed, others } from './kit.js';

const en = s => L(s, s);   // English-only content (the language being learned)
const hi = s => L(s, s);   // Hindi-only content

// word | definition | Hindi meaning | group (near-synonyms never appear as distractors for each other)
const VOCAB = `ancient|very old|प्राचीन|
brave|not afraid of danger|बहादुर|
curious|eager to know or learn something|जिज्ञासु|e
enormous|very big|विशाल|
fragile|easily broken|नाज़ुक|
generous|happy to give and share|उदार|
honest|always telling the truth|ईमानदार|
journey|a long trip from one place to another|यात्रा|
narrow|not wide|संकरा|
obey|to do what you are told|आज्ञा मानना|
polite|having good manners|विनम्र|p
protect|to keep someone or something safe|रक्षा करना|s
rare|not often seen or found|दुर्लभ|r
shelter|a place that gives protection from weather or danger|आश्रय|s
timid|easily frightened|डरपोक|t
victory|success in a contest or battle|विजय|
weary|very tired|थका हुआ|
harvest|the gathering of ripe crops|फसल की कटाई|
discover|to find something for the first time|खोजना|i
habit|something you do regularly|आदत|
imitate|to copy how someone acts or speaks|नकल करना|
lonely|sad because of being alone|अकेला|
migrate|to move from one region to another with the seasons|प्रवास करना|
observe|to watch carefully|ध्यान से देखना|
patient|able to wait calmly|धैर्यवान|
quarrel|an angry argument|झगड़ा|
reward|something given for good work|पुरस्कार|
scarce|not enough; hard to get|अपर्याप्त|r
transparent|able to be seen through|पारदर्शी|
vanish|to disappear suddenly|गायब होना|
wisdom|good sense and judgement|बुद्धिमानी|
drought|a long time without rain|सूखा|
eager|wanting very much to do something|उत्सुक|e
famous|known by many people|प्रसिद्ध|
glance|a quick look|झलक|
humble|not proud|विनीत|p
invent|to make something new for the first time|आविष्कार करना|i
meadow|a field of grass|घास का मैदान|
nervous|worried and a little afraid|घबराया हुआ|t
ordinary|normal; not special|साधारण|
predict|to say what will happen in the future|भविष्यवाणी करना|
sturdy|strong and solid|मज़बूत|
tremble|to shake from fear or cold|काँपना|t`.split('\n').map(l => { const [w, def, h, g] = l.split('|'); return { w, def, h, g }; });

const pairs = s => s.split(',').map(x => x.trim().split('-'));
const SYN = pairs('big-large, happy-glad, small-tiny, begin-start, end-finish, quick-fast, clever-smart, silent-quiet, angry-furious, rich-wealthy, shut-close, speak-talk, gift-present, correct-right, difficult-hard, sick-ill, sad-unhappy, buy-purchase, help-assist, choose-select, afraid-scared, beautiful-pretty, strong-powerful, error-mistake, reply-answer, cry-weep');
const ANT = pairs('hot-cold, early-late, empty-full, strong-weak, accept-refuse, arrive-depart, ancient-modern, brave-cowardly, cheap-expensive, deep-shallow, increase-decrease, remember-forget, victory-defeat, wide-narrow, borrow-lend, create-destroy, entrance-exit, friend-enemy, generous-selfish, polite-rude, rough-smooth, sharp-blunt, success-failure, visible-invisible, wet-dry, always-never, inside-outside, heavy-light, true-false, open-shut');
const PLURAL = pairs('box-boxes, bus-buses, baby-babies, city-cities, leaf-leaves, knife-knives, wolf-wolves, child-children, man-men, woman-women, tooth-teeth, foot-feet, mouse-mice, goose-geese, sheep-sheep, deer-deer, potato-potatoes, tomato-tomatoes, hero-heroes, key-keys, boy-boys, toy-toys, monkey-monkeys, story-stories, lady-ladies, brush-brushes, watch-watches, glass-glasses, fox-foxes, wife-wives, life-lives, shelf-shelves, ox-oxen, photo-photos, piano-pianos, roof-roofs, thief-thieves, country-countries');
const PAST = pairs('go-went, come-came, eat-ate, drink-drank, see-saw, take-took, give-gave, write-wrote, run-ran, sing-sang, swim-swam, begin-began, bring-brought, buy-bought, catch-caught, teach-taught, think-thought, fly-flew, grow-grew, know-knew, throw-threw, break-broke, speak-spoke, choose-chose, forget-forgot, sleep-slept, keep-kept, feel-felt, leave-left, tell-told, sell-sold, find-found, make-made, sit-sat, stand-stood, win-won, play-played, carry-carried, stop-stopped, try-tried, cut-cut, put-put, hurt-hurt');
const COMP = 'tall-taller-tallest, big-bigger-biggest, happy-happier-happiest, good-better-best, bad-worse-worst, little-less-least, many-more-most, beautiful-more beautiful-most beautiful, hot-hotter-hottest, easy-easier-easiest, thin-thinner-thinnest, large-larger-largest, heavy-heavier-heaviest, careful-more careful-most careful, useful-more useful-most useful, brave-braver-bravest, busy-busier-busiest, sad-sadder-saddest, important-more important-most important'.split(', ').map(x => x.split('-'));
// phrase | article | why
const ARTICLE = `apple|an|vowel sound
banana|a|consonant sound
hour|an|the h is silent, so it starts with a vowel sound
university|a|it starts with a "yoo" sound, which is a consonant sound
umbrella|an|vowel sound
one-rupee coin|a|"one" starts with a "w" sound
honest man|an|the h is silent
elephant|an|vowel sound
horse|a|the h is sounded
owl|an|vowel sound
uniform|a|it starts with a "yoo" sound
ice cream|an|vowel sound
year|a|consonant sound
egg|an|vowel sound
useful tool|a|"useful" starts with a "yoo" sound
orange|an|vowel sound
house|a|the h is sounded
island|an|vowel sound
engineer|an|vowel sound
book|a|consonant sound
idea|an|vowel sound
old man|an|vowel sound
young girl|a|consonant sound
teacher|a|consonant sound`.split('\n').map(l => l.split('|'));
const SUBJ = [['I', 'am', 'was', 'have'], ['He', 'is', 'was', 'has'], ['She', 'is', 'was', 'has'], ['It', 'is', 'was', 'has'], ['The boy', 'is', 'was', 'has'], ['My mother', 'is', 'was', 'has'],
  ['We', 'are', 'were', 'have'], ['You', 'are', 'were', 'have'], ['They', 'are', 'were', 'have'], ['The children', 'are', 'were', 'have'], ['My friends', 'are', 'were', 'have']];
const PRED = ['at home', 'very happy', 'in the garden', 'ready', 'late for school', 'tired'];
const HAS = ['a new bag', 'two brothers', 'a red bicycle', 'many books', 'a small garden', 'a pet dog'];
// sentence | answer | three wrong choices
const PREP = `The book is ___ the table.|on|at, into, between
She was born ___ 2015.|in|on, at, by
School starts ___ 8 o'clock.|at|in, on, of
We have a holiday ___ Sunday.|on|in, at, to
The cat jumped ___ the wall.|over|among, between, during
He is hiding ___ the door.|behind|among, during, since
The river flows ___ the bridge.|under|during, among, since
She sat ___ her two friends.|between|during, since, into
I have lived here ___ 2020.|since|for, during, at
He waited ___ two hours.|for|since, from, at
The train goes ___ Ranchi to Delhi.|from|since, of, at
She is afraid ___ dogs.|of|from, with, by
He is good ___ mathematics.|at|on, of, to
The bird flew ___ the room through the window.|into|on, at, among
Please listen ___ me.|to|at, on, with
We go to school ___ bus.|by|with, at, of
The gift is ___ you.|for|at, of, since
He walked ___ the road carefully.|across|among, since, during
The shop stays closed ___ the night.|during|among, between, into
Divide the cake ___ four equal parts.|into|at, on, by`.split('\n').map(l => { const [s, a, w] = l.split('|'); return { s, a, w: w.split(', ') }; });
// sentence with the target word in CAPITALS | part of speech
const POS = `The DOG barked loudly.|noun
The dog BARKED loudly.|verb
The dog barked LOUDLY.|adverb
She wore a RED dress.|adjective
Birds FLY in the sky.|verb
He runs QUICKLY.|adverb
The TALL boy won the race.|adjective
HONESTY is the best policy.|noun
They PLAYED cricket.|verb
The soup is HOT.|adjective
She sings SWEETLY.|adverb
My TEACHER is kind.|noun
My teacher is KIND.|adjective
We WRITE with pens.|verb
The river is DEEP.|adjective
He spoke POLITELY.|adverb
DELHI is a big city.|noun
The baby SLEPT peacefully.|verb
The baby slept PEACEFULLY.|adverb
I saw a BEAUTIFUL bird.|adjective`.split('\n').map(l => l.split('|'));
const POS_HI = { noun: 'संज्ञा', verb: 'क्रिया', adjective: 'विशेषण', adverb: 'क्रियाविशेषण' };
const SPELL4 = 'because beautiful different favourite friend people school answer enough minute picture question surprise through thought together tomorrow weather Wednesday February vegetable village written believe breakfast calendar careful caught country decide early eight heard island knowledge library neighbour special'.split(' ');
const SPELL6 = 'necessary separate government environment definitely immediately occasion temperature restaurant rhythm science receive achieve beginning business character committee experience foreign language opposite particular sentence strength'.split(' ');
const ALLSPELL = new Set([...SPELL4, ...SPELL6].map(w => w.toLowerCase()));
function misspell(r, w) {
  const out = new Set(), tryAdd = x => { if (x !== w && !ALLSPELL.has(x.toLowerCase()) && x.length > 2) out.add(x); };
  tryAdd(w.replace('ie', 'ei')); tryAdd(w.replace('ei', 'ie')); tryAdd(w.replace(/([a-z])\1/, '$1')); tryAdd(w.replace('ou', 'o')); tryAdd(w.replace('ea', 'ee'));
  for (let k = 0; k < 30 && out.size < 5; k++) {
    const i = r.int(1, w.length - 2), t = r.int(1, 3);
    if (t === 1) tryAdd(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2));
    else if (t === 2) tryAdd(w.slice(0, i) + w.slice(i + 1));
    else tryAdd(w.slice(0, i) + w[i] + w.slice(i));
  }
  return r.shuffle([...out]).slice(0, 3);
}
const spellGen = list => r => {
  const w = r.pick(list);
  return keyed({ ...mcq(r, L('Listen, or look carefully. Which spelling is correct?', 'सुनिए या ध्यान से देखिए। कौन-सी वर्तनी सही है?'), en(w), misspell(r, w).map(en),
    L(`The correct spelling is "${w}". Say it slowly and write it once from memory.`, `सही वर्तनी "${w}" है। इसे धीरे-धीरे बोलिए और एक बार बिना देखे लिखिए।`)), say: w, dictation: w }, w);
};
// Reading passages: original texts written for this app.
const READ = [
  { t: 'The Banyan Tree', p: 'An old banyan tree stood at the edge of the village. Its branches spread so wide that fifty people could sit in its shade. Every summer afternoon, children played under it while their grandparents told stories. Birds built nests in its branches, and squirrels ran up and down its trunk. When the village wanted to build a new road, the engineer changed the plan so that the tree would not be cut. "A road can bend," he said, "but a tree like this takes a hundred years to grow."',
    q: [['Where did the banyan tree stand?', 'At the edge of the village', ['In the middle of a city', 'Beside a river', 'On top of a hill']],
      ['Why did children come to the tree on summer afternoons?', 'To play in its shade', ['To pick its fruit', 'To cut its branches', 'To build a road']],
      ['What did the engineer do?', 'He changed the road plan to save the tree', ['He cut the tree down', 'He planted fifty new trees', 'He stopped the road from being built']],
      ['What does "A road can bend" tell us about the engineer?', 'He thought the tree was more valuable than a straight road', ['He did not know how to build roads', 'He disliked the villagers', 'He wanted to leave the village']]] },
  { t: 'The Water Clock', p: 'Long before watches were invented, people needed ways to measure time. One clever idea was the water clock. A bowl with a tiny hole was placed in a larger pot of water. Water slowly entered the bowl through the hole, and when the bowl was full, it sank. The time it took to sink was always the same. A person sat nearby and struck a gong each time the bowl sank. In this way a whole town could know how much of the day had passed, even when clouds hid the sun.',
    q: [['What was the water clock used for?', 'Measuring time', ['Storing drinking water', 'Cooking food', 'Watering plants']],
      ['What happened when the bowl became full?', 'It sank', ['It broke', 'It floated higher', 'It turned over']],
      ['Why was a gong struck?', 'To tell the town that a fixed amount of time had passed', ['To call people for dinner', 'To frighten birds away', 'To ask for more water']],
      ['Why was the water clock useful on cloudy days?', 'It did not depend on the sun', ['It collected rainwater', 'It worked only in the rain', 'It made the clouds go away']]] },
  { t: 'Meera and the Library', p: 'Meera loved reading, but her village had no library. One day she placed ten of her own books on a wooden bench outside her house and hung a sign: "Take a book. Bring it back. Add one if you can." At first only two children came. A month later the bench held more than sixty books, because neighbours had started adding their own. An old shopkeeper gave a cupboard to keep the books dry during the rains. Meera had not spent a single rupee, yet her village now had a library.',
    q: [['What problem did Meera notice?', 'Her village had no library', ['She had too many books', 'Her bench was broken', 'Children did not like reading']],
      ['How many books did Meera begin with?', 'Ten', ['Two', 'Sixty', 'One hundred']],
      ['Why did the number of books grow?', 'Neighbours added their own books', ['Meera bought new books every week', 'The school sent books', 'A shop sold books cheaply']],
      ['What is the main idea of the passage?', 'A small step by one person can grow with the help of others', ['Books are very expensive', 'Villages do not need libraries', 'Shopkeepers are always generous']]] },
  { t: 'Why Leaves Change', p: 'Leaves are green because they contain a substance called chlorophyll, which helps the plant make food from sunlight. In some places, autumn brings shorter days and cooler nights. With less sunlight, the tree stops making chlorophyll, and the green colour slowly fades. Yellow and orange colours, which were hidden in the leaf all along, can now be seen. Finally the leaf dries and falls. This is not a waste: the fallen leaves rot and return useful minerals to the soil, ready for the tree to use again in spring.',
    q: [['What makes leaves green?', 'Chlorophyll', ['Minerals', 'Water', 'Cool nights']],
      ['What happens to chlorophyll in autumn?', 'The tree stops making it', ['The tree makes more of it', 'It turns into water', 'It moves to the roots']],
      ['Where do the yellow and orange colours come from?', 'They were already in the leaf, hidden by the green', ['They come from the soil in autumn', 'They are painted by the rain', 'They come from sunlight in winter']],
      ['Why are fallen leaves "not a waste"?', 'They rot and return minerals to the soil', ['They can be sold', 'They keep birds warm', 'They make the tree taller at once']]] },
];
const READ_ITEMS = READ.flatMap((ps, i) => ps.q.map((q, j) => ({ ps, q, key: `${i}.${j}` })));

export const ENGLISH = [
  S('e.spell4', 4, L('Spelling: everyday words', 'वर्तनी: रोज़मर्रा के शब्द'), [], L('Break a long word into small parts and spell one part at a time.', 'लंबे शब्द को छोटे भागों में तोड़िए और एक-एक भाग की वर्तनी बोलिए।'), spellGen(SPELL4), { size: SPELL4.length }),
  S('e.plural', 4, L('Plural nouns', 'बहुवचन संज्ञाएँ'), [], L('Most nouns add -s. Words ending in s, x, ch, sh add -es; a consonant + y changes to -ies. Some plurals are irregular.', 'अधिकांश संज्ञाओं में -s लगता है। s, x, ch, sh पर समाप्त शब्दों में -es; व्यंजन + y, -ies में बदलता है। कुछ बहुवचन अनियमित होते हैं।'),
    r => { const [s, p] = r.pick(PLURAL); return keyed(text(L(`Write the plural of "${s}".`, `"${s}" का बहुवचन (plural) लिखिए।`), p, L(`One ${s}, two ${p}.`, `एक ${s}, दो ${p}।`)), s); }, { size: PLURAL.length }),
  S('e.be', 4, L('is, am, are, was, were', 'is, am, are, was, were का प्रयोग'), [], L('Use am with I; is with one person or thing; are with many. For the past use was (one) and were (many, and you).', 'I के साथ am; एक व्यक्ति या वस्तु के साथ is; अनेक के साथ are। भूतकाल में एक के लिए was और अनेक तथा you के लिए were।'),
    r => { const s = r.pick(SUBJ), past = r.bool(), ans = past ? s[2] : s[1], time = past ? r.pick(['yesterday', 'last night']) : r.pick(['now', 'today']);
      return mcq(r, en(`${s[0]} ___ ${r.pick(PRED)} ${time}.`), en(ans), ['is', 'am', 'are', 'was', 'were'].map(en),
        L(`"${time}" shows ${past ? 'the past' : 'the present'}, and with "${s[0]}" we use "${ans}".`, `"${time}" ${past ? 'भूतकाल' : 'वर्तमान काल'} बताता है, और "${s[0]}" के साथ "${ans}" आता है।`), { n: 5, fixed: ['is', 'am', 'are', 'was', 'were'], lead: L('Choose the correct word.', 'सही शब्द चुनिए।') }); }),
  S('e.has', 4, L('has and have', 'has और have का प्रयोग'), [], L('Use has with he, she, it or one person. Use have with I, you, we, they or many.', 'he, she, it या एक व्यक्ति के साथ has; I, you, we, they या अनेक के साथ have।'),
    r => { const s = r.pick(SUBJ); return mcq(r, en(`${s[0]} ___ ${r.pick(HAS)}.`), en(s[3]), [en(s[3] === 'has' ? 'have' : 'has')], L(`With "${s[0]}" we use "${s[3]}".`, `"${s[0]}" के साथ "${s[3]}" आता है।`), { n: 2, fixed: ['has', 'have'], lead: L('Choose the correct word.', 'सही शब्द चुनिए।') }); }),
  S('e.article', 4, L('a and an', 'a और an का प्रयोग'), [], L('Use an before a vowel sound and a before a consonant sound. Listen to the sound, not the letter.', 'स्वर ध्वनि से पहले an और व्यंजन ध्वनि से पहले a। अक्षर नहीं, ध्वनि पर ध्यान दीजिए।'),
    r => { const [p, a, why] = r.pick(ARTICLE); return keyed(mcq(r, en(`This is ___ ${p}.`), en(a), [en(a === 'a' ? 'an' : 'a')], L(`"${a} ${p}": ${why}.`, `"${a} ${p}" सही है। ध्वनि पर ध्यान दीजिए: ${why}।`), { n: 2, fixed: ['a', 'an'], lead: L('Choose the correct article.', 'सही आर्टिकल चुनिए।') }), p); }, { size: ARTICLE.length }),
  S('e.vocab', 5, L('Word meanings', 'शब्दों के अर्थ'), [], L('Read the word in a sentence and guess its meaning before you look at the choices.', 'शब्द को वाक्य में पढ़िए और विकल्प देखने से पहले उसका अर्थ सोचिए।'),
    r => { const v = r.pick(VOCAB); return keyed(mcq(r, L(`What does "${v.w}" mean?`, `"${v.w}" का अर्थ क्या है?`), en(v.def), others(r, VOCAB, v, 3, (a, b) => a.g && a.g === b.g).map(x => en(x.def)),
      L(`"${v.w}" means ${v.def}.`, `"${v.w}" का अर्थ है: ${v.h}।`)), v.w); }, { size: VOCAB.length }),
  S('e.past', 5, L('Past tense of verbs', 'क्रियाओं का भूतकाल'), ['e.be'], L('Regular verbs add -ed. Irregular verbs change their form and must be learned: go, went.', 'नियमित क्रियाओं में -ed लगता है। अनियमित क्रियाओं का रूप बदल जाता है और उन्हें याद करना होता है: go, went।'),
    r => { const [v, p] = r.pick(PAST); return keyed(text(L(`Write the past tense of "${v}".`, `"${v}" का भूतकाल (past tense) रूप लिखिए।`), p, L(`Today I ${v}. Yesterday I ${p}.`, `आज: ${v}। बीता हुआ कल: ${p}।`)), v); }, { size: PAST.length }),
  S('e.syn', 5, L('Synonyms', 'पर्यायवाची (synonyms)'), ['e.vocab'], L('Synonyms are words with nearly the same meaning.', 'पर्यायवाची वे शब्द हैं जिनका अर्थ लगभग समान होता है।'),
    r => { const p = r.pick(SYN); return keyed(mcq(r, L(`Which word means nearly the same as "${p[0]}"?`, `"${p[0]}" का लगभग समान अर्थ वाला शब्द कौन-सा है?`), en(p[1]), others(r, SYN, p, 3).map(x => en(x[1])), L(`"${p[0]}" and "${p[1]}" have nearly the same meaning.`, `"${p[0]}" और "${p[1]}" का अर्थ लगभग समान है।`)), p[0]); }, { size: SYN.length }),
  S('e.ant', 5, L('Antonyms', 'विलोम (antonyms)'), ['e.vocab'], L('Antonyms are words with opposite meanings.', 'विलोम वे शब्द हैं जिनके अर्थ एक-दूसरे के उलटे होते हैं।'),
    r => { const p = r.pick(ANT); return keyed(mcq(r, L(`Which word is the opposite of "${p[0]}"?`, `"${p[0]}" का उलटा अर्थ वाला शब्द कौन-सा है?`), en(p[1]), others(r, ANT, p, 3).map(x => en(x[1])), L(`The opposite of "${p[0]}" is "${p[1]}".`, `"${p[0]}" का विलोम "${p[1]}" है।`)), p[0]); }, { size: ANT.length }),
  S('e.prep', 5, L('Prepositions', 'संबंधबोधक (prepositions)'), [], L('A preposition shows place, time or direction: on the table, at 8 o\'clock, into the room.', 'Preposition स्थान, समय या दिशा बताता है: on the table, at 8 o\'clock, into the room।'),
    r => { const p = r.pick(PREP); return keyed(mcq(r, en(p.s), en(p.a), p.w.map(en), L(`The correct sentence is: ${p.s.replace('___', p.a)}`, `सही वाक्य है: ${p.s.replace('___', p.a)}`), { lead: L('Choose the correct word.', 'सही शब्द चुनिए।') }), p.s); }, { size: PREP.length }),
  S('e.pos', 5, L('Parts of speech', 'शब्द-भेद (parts of speech)'), [], L('A noun names, a verb shows action, an adjective describes a noun, an adverb describes a verb.', 'Noun नाम बताता है, verb कार्य बताती है, adjective संज्ञा की विशेषता और adverb क्रिया की विशेषता बताता है।'),
    r => { const [s, a] = r.pick(POS), w = s.match(/[A-Z]{2,}/)[0]; return keyed(mcq(r, en(s), L(a, `${a} (${POS_HI[a]})`), Object.keys(POS_HI).filter(k => k !== a).map(k => L(k, `${k} (${POS_HI[k]})`)),
      L(`Here "${w.toLowerCase()}" is ${a === 'adjective' || a === 'adverb' ? 'an' : 'a'} ${a}.`, `यहाँ "${w.toLowerCase()}" ${POS_HI[a]} (${a}) है।`), { fixed: Object.keys(POS_HI), lead: L('What part of speech is the word in CAPITALS?', 'बड़े अक्षरों में लिखा शब्द कौन-सा शब्द-भेद है?') }), s); }, { size: POS.length }),
  S('e.read', 5, L('Reading comprehension', 'पठन बोध (reading)'), [], L('Read the whole passage once. Then read the question and find the sentence that answers it.', 'पहले पूरा गद्यांश एक बार पढ़िए। फिर प्रश्न पढ़कर वह वाक्य खोजिए जिसमें उत्तर है।'),
    r => { const it = r.pick(READ_ITEMS), [q, a, w] = it.q; return keyed(mcq(r, en(q), en(a), w.map(en), L(`Answer: ${a}. Find the sentence in the passage that shows this.`, `उत्तर: ${a}। गद्यांश में वह वाक्य खोजिए जो यह बताता है।`), { passage: { title: it.ps.t, text: it.ps.p } }), it.key); }, { size: READ_ITEMS.length }),
  S('e.compare', 6, L('Comparative and superlative', 'तुलनात्मक और उत्तमावस्था रूप'), ['e.pos'], L('Short adjectives take -er and -est. Long ones use more and most. A few are irregular: good, better, best.', 'छोटे विशेषणों में -er और -est लगते हैं। लंबे विशेषणों के साथ more और most। कुछ अनियमित हैं: good, better, best।'),
    r => { const c = r.pick(COMP), sup = r.bool(); return keyed(text(L(`Write the ${sup ? 'superlative' : 'comparative'} form of "${c[0]}".`, `"${c[0]}" का ${sup ? 'superlative (उत्तमावस्था)' : 'comparative (तुलनात्मक)'} रूप लिखिए।`), c[sup ? 2 : 1], L(`${c[0]}, ${c[1]}, ${c[2]}.`, `${c[0]}, ${c[1]}, ${c[2]}।`)), c[0] + sup); }, { size: COMP.length * 2 }),
  S('e.spell6', 6, L('Spelling: harder words', 'वर्तनी: कठिन शब्द'), ['e.spell4'], L('Notice the tricky part of each word (a double letter, a silent letter) and learn that part.', 'हर शब्द का कठिन भाग (दोहरा अक्षर, मूक अक्षर) पहचानिए और उसी को याद कीजिए।'), spellGen(SPELL6), { size: SPELL6.length }),
];

// ---- Hindi ----------------------------------------------------------------
const hp = s => s.split(', ').map(x => x.split('–'));
const VILOM = hp('दिन–रात, सुख–दुख, आना–जाना, ऊपर–नीचे, अंदर–बाहर, अमीर–गरीब, आदि–अंत, आशा–निराशा, गर्म–ठंडा, जीत–हार, जन्म–मृत्यु, सच–झूठ, मित्र–शत्रु, लाभ–हानि, प्रकाश–अंधकार, नया–पुराना, बड़ा–छोटा, आगे–पीछे, पास–दूर, हँसना–रोना, खरीदना–बेचना, सस्ता–महँगा, साफ़–गंदा, सुबह–शाम, स्वर्ग–नरक, उदय–अस्त, आय–व्यय, उन्नति–अवनति, आदर–अनादर, ज्ञान–अज्ञान, पाप–पुण्य, प्रश्न–उत्तर, सरल–कठिन, स्वतंत्र–परतंत्र');
const PARYAY = hp('जल–पानी, सूर्य–रवि, चंद्रमा–चाँद, पृथ्वी–धरती, आकाश–गगन, वायु–पवन, अग्नि–आग, फूल–पुष्प, पेड़–वृक्ष, घर–गृह, माता–जननी, पिता–जनक, राजा–नरेश, मित्र–सखा, नदी–सरिता, पर्वत–पहाड़, समुद्र–सागर, आँख–नेत्र, रात–निशा, बादल–मेघ, हाथी–गज, पक्षी–खग, कमल–पंकज, वन–जंगल');
const LING = { 'पुल्लिंग': 'लड़का घोड़ा पहाड़ सूरज पानी दूध घर पेड़ फूल कमरा दरवाज़ा बादल शहर देश कपड़ा'.split(' '), 'स्त्रीलिंग': 'लड़की नदी किताब कुर्सी मेज़ खिड़की रोटी चाय हवा रात बात सड़क भाषा पुस्तक दीवार'.split(' ') };
const LING_ALL = Object.entries(LING).flatMap(([g, ws]) => ws.map(w => [w, g]));
const VACHAN = hp('लड़का–लड़के, लड़की–लड़कियाँ, किताब–किताबें, कमरा–कमरे, नदी–नदियाँ, माला–मालाएँ, रात–रातें, कपड़ा–कपड़े, बच्चा–बच्चे, चिड़िया–चिड़ियाँ, गुड़िया–गुड़ियाँ, आँख–आँखें, बहन–बहनें, कुर्सी–कुर्सियाँ, तितली–तितलियाँ, पुस्तक–पुस्तकें, घोड़ा–घोड़े, कहानी–कहानियाँ, सड़क–सड़कें, लता–लताएँ, मिठाई–मिठाइयाँ, दवा–दवाएँ, बात–बातें, खिड़की–खिड़कियाँ');
function wrongPlurals(w, right) {
  const forms = [w + 'ें', w + 'एँ', w + 'याँ', w + 'ियाँ', w.replace(/ी$/, 'ियाँ'), w.replace(/ा$/, 'े'), w.replace(/ा$/, 'ाएँ'), w.replace(/ी$/, 'ीयाँ')];
  return [...new Set(forms)].filter(f => f !== right && f !== w);
}
// idiom | meaning | group
const MUHAVARE = `आँखों का तारा|बहुत प्यारा|
नौ दो ग्यारह होना|भाग जाना|
दाँत खट्टे करना|बुरी तरह हराना|
अंगूठा दिखाना|साफ़ मना कर देना|
आसमान सिर पर उठाना|बहुत शोर मचाना|
कान भरना|चुगली करना|
घी के दीये जलाना|खुशियाँ मनाना|k
नाक में दम करना|बहुत परेशान करना|
पेट में चूहे दौड़ना|बहुत भूख लगना|
हाथ मलना|पछताना|
ईद का चाँद होना|बहुत दिनों बाद दिखाई देना|
लोहे के चने चबाना|बहुत कठिन काम करना|m
आग बबूला होना|बहुत क्रोधित होना|
फूला न समाना|बहुत प्रसन्न होना|k
टाँग अड़ाना|बाधा डालना|
दाल न गलना|काम न बनना|
खून पसीना एक करना|कड़ी मेहनत करना|m
मुँह में पानी आना|खाने का मन ललचाना|`.split('\n').map(l => { const [i, m, g] = l.split('|'); return { i, m, g }; });
const SHUDDH = hp('आशीर्वाद–आर्शीवाद, कवयित्री–कवियत्री, उज्ज्वल–उज्जवल, परीक्षा–परिक्षा, बीमार–बिमार, दवाइयाँ–दवाईयाँ, श्रीमती–श्रीमति, अतिथि–अतिथी, कृपया–कृप्या, पूज्य–पुज्य, चिह्न–चिन्ह, स्वास्थ्य–स्वास्थ, प्रदर्शनी–प्रर्दशनी, ईर्ष्या–ईर्षा, विद्यालय–विध्यालय, आवश्यकता–अवश्यकता, दृष्टि–द्रष्टि, ऋषि–रिषि, मिठाई–मीठाई, नीति–निति, रात्रि–रात्री, शक्ति–शक्ती, क्योंकि–क्योंकी, इसलिए–इसलीए');
const BHED = `सीता गाना गाती है।|सीता|संज्ञा
वह स्कूल जाता है।|वह|सर्वनाम
यह फूल सुंदर है।|सुंदर|विशेषण
बच्चे मैदान में खेलते हैं।|खेलते हैं|क्रिया
हिमालय बहुत ऊँचा है।|हिमालय|संज्ञा
हिमालय बहुत ऊँचा है।|ऊँचा|विशेषण
मैं रोज़ दूध पीता हूँ।|मैं|सर्वनाम
मैं रोज़ दूध पीता हूँ।|पीता हूँ|क्रिया
गंगा पवित्र नदी है।|पवित्र|विशेषण
तुम कहाँ रहते हो?|तुम|सर्वनाम
चिड़िया आकाश में उड़ती है।|उड़ती है|क्रिया
मोहन ने मीठा आम खाया।|मीठा|विशेषण
मोहन ने मीठा आम खाया।|आम|संज्ञा
हम कल दिल्ली जाएँगे।|हम|सर्वनाम
हम कल दिल्ली जाएँगे।|दिल्ली|संज्ञा
माँ खाना बनाती है।|बनाती है|क्रिया
ईमानदारी अच्छी आदत है।|ईमानदारी|संज्ञा
उसने नई किताब खरीदी।|नई|विशेषण`.split('\n').map(l => l.split('|'));
const BHED_ALL = ['संज्ञा', 'सर्वनाम', 'विशेषण', 'क्रिया'];
const HREAD = [
  { t: 'चींटी की सीख', p: 'एक छोटी चींटी अपने से कई गुना बड़ा दाना लेकर दीवार पर चढ़ रही थी। दाना भारी था, इसलिए वह बार-बार फिसलकर नीचे गिर जाती थी। पास बैठा एक बालक उसे देख रहा था। उसने गिना कि चींटी सात बार गिरी, पर हर बार फिर चढ़ने लगी। आठवीं बार वह दाने को लेकर ऊपर पहुँच गई। बालक अपनी परीक्षा में एक बार असफल होकर उदास बैठा था। चींटी को देखकर वह उठा और फिर से पढ़ने बैठ गया।',
    q: [['चींटी बार-बार क्यों गिर रही थी?', 'क्योंकि दाना भारी था', ['क्योंकि दीवार गीली थी', 'क्योंकि बालक उसे गिरा रहा था', 'क्योंकि वह थक गई थी']],
      ['चींटी कितनी बार गिरी?', 'सात बार', ['आठ बार', 'तीन बार', 'एक बार']],
      ['बालक उदास क्यों था?', 'वह परीक्षा में असफल हो गया था', ['उसका दाना खो गया था', 'उसे चींटी ने काट लिया था', 'उसे खेलने नहीं दिया गया था']],
      ['इस गद्यांश से क्या सीख मिलती है?', 'असफल होने पर भी प्रयास नहीं छोड़ना चाहिए', ['चींटियों से दूर रहना चाहिए', 'भारी चीज़ें नहीं उठानी चाहिए', 'परीक्षा नहीं देनी चाहिए']]] },
  { t: 'कुएँ का पानी', p: 'गर्मी के दिनों में गाँव का कुआँ लगभग सूख गया। लोग दूर नदी से पानी लाने लगे। तब गाँव की शिक्षिका ने बच्चों के साथ मिलकर एक योजना बनाई। बरसात से पहले उन्होंने हर घर की छत से आने वाले पानी के लिए नालियाँ बनाईं और उसे कुएँ के पास बने गड्ढे में पहुँचाया। गड्ढे से पानी धीरे-धीरे ज़मीन में रिसता रहा। अगली गर्मी में कुएँ में पानी बना रहा। गाँव वालों ने समझा कि वर्षा का पानी बचाना ही पानी की कमी का सबसे सरल उपाय है।',
    q: [['गर्मी में गाँव वालों को क्या परेशानी हुई?', 'कुआँ लगभग सूख गया', ['नदी में बाढ़ आ गई', 'घरों की छतें टूट गईं', 'बरसात बहुत अधिक हुई']],
      ['योजना किसने बनाई?', 'शिक्षिका ने बच्चों के साथ मिलकर', ['गाँव के मुखिया ने अकेले', 'शहर से आए अधिकारी ने', 'नदी के पास रहने वालों ने']],
      ['छतों का पानी कहाँ पहुँचाया गया?', 'कुएँ के पास बने गड्ढे में', ['सीधे नदी में', 'खेतों में', 'घरों की टंकियों में']],
      ['अगली गर्मी में कुएँ में पानी क्यों बना रहा?', 'क्योंकि वर्षा का पानी ज़मीन में रिसकर जमा हुआ था', ['क्योंकि लोग कम पानी पीने लगे थे', 'क्योंकि नया कुआँ खोदा गया था', 'क्योंकि नदी पास आ गई थी']]] },
];
const HREAD_ITEMS = HREAD.flatMap((ps, i) => ps.q.map((q, j) => ({ ps, q, key: `${i}.${j}` })));

export const HINDI = [
  S('h.ling', 4, hi('लिंग'), [], L('Gender in Hindi shows in the verb and adjective: लड़का जाता है, लड़की जाती है. Make a small sentence to test the word.', 'हिंदी में लिंग का पता क्रिया और विशेषण से चलता है: लड़का जाता है, लड़की जाती है। शब्द को परखने के लिए छोटा वाक्य बनाइए।'),
    r => { const [w, g] = r.pick(LING_ALL); return keyed(mcq(r, hi(`'${w}' शब्द का लिंग क्या है?`), hi(g), [hi(g === 'पुल्लिंग' ? 'स्त्रीलिंग' : 'पुल्लिंग')], L(`'${w}' is ${g === 'पुल्लिंग' ? 'masculine' : 'feminine'} (${g}).`, `'${w}' ${g} शब्द है।`), { n: 2, fixed: ['पुल्लिंग', 'स्त्रीलिंग'] }), w); }, { size: LING_ALL.length }),
  S('h.vachan', 4, hi('वचन'), [], L('Singular means one, plural means many: लड़का, लड़के; लड़की, लड़कियाँ; किताब, किताबें.', 'एकवचन यानी एक, बहुवचन यानी अनेक: लड़का, लड़के; लड़की, लड़कियाँ; किताब, किताबें।'),
    r => { const [s, p] = r.pick(VACHAN); return keyed(mcq(r, hi(`'${s}' का बहुवचन रूप कौन-सा है?`), hi(p), r.shuffle(wrongPlurals(s, p)).map(hi), L(`One: ${s}. Many: ${p}.`, `एकवचन: ${s}। बहुवचन: ${p}।`)), s); }, { size: VACHAN.length }),
  S('h.vilom', 4, hi('विलोम शब्द'), [], L('Opposites (विलोम) are words with opposite meanings: दिन and रात.', 'विलोम वे शब्द हैं जिनके अर्थ एक-दूसरे के उलटे होते हैं: दिन और रात।'),
    r => { const p = r.pick(VILOM); return keyed(mcq(r, hi(`'${p[0]}' का विलोम शब्द कौन-सा है?`), hi(p[1]), others(r, VILOM, p, 3).map(x => hi(x[1])), L(`The opposite of ${p[0]} is ${p[1]}.`, `'${p[0]}' का विलोम '${p[1]}' है।`)), p[0]); }, { size: VILOM.length }),
  S('h.shuddh', 5, hi('शुद्ध वर्तनी'), [], L('Say the word slowly and listen for short and long vowel signs (ि and ी, ु and ू).', 'शब्द को धीरे-धीरे बोलिए और छोटी-बड़ी मात्राओं (ि और ी, ु और ू) पर ध्यान दीजिए।'),
    r => { const p = r.pick(SHUDDH); return keyed(mcq(r, hi('शुद्ध वर्तनी वाला शब्द चुनिए।'), hi(p[0]), [hi(p[1])], L(`The correct spelling is ${p[0]}.`, `शुद्ध वर्तनी '${p[0]}' है।`), { n: 2 }), p[0]); }, { size: SHUDDH.length }),
  S('h.paryay', 5, hi('पर्यायवाची शब्द'), ['h.vilom'], L('Synonyms (पर्यायवाची) are words with the same meaning: जल and पानी.', 'पर्यायवाची वे शब्द हैं जिनका अर्थ समान होता है: जल और पानी।'),
    r => { const p = r.pick(PARYAY); return keyed(mcq(r, hi(`'${p[0]}' का पर्यायवाची शब्द कौन-सा है?`), hi(p[1]), others(r, PARYAY, p, 3).map(x => hi(x[1])), L(`${p[0]} and ${p[1]} mean the same.`, `'${p[0]}' और '${p[1]}' का अर्थ समान है।`)), p[0]); }, { size: PARYAY.length }),
  S('h.bhed', 5, hi('शब्द-भेद: संज्ञा, सर्वनाम, विशेषण, क्रिया'), [], L('संज्ञा names, सर्वनाम stands in place of a name, विशेषण describes, क्रिया shows the action.', 'संज्ञा नाम बताती है, सर्वनाम नाम के स्थान पर आता है, विशेषण विशेषता बताता है और क्रिया कार्य बताती है।'),
    r => { const [s, w, a] = r.pick(BHED); return keyed(mcq(r, hi(`वाक्य: "${s}"\nइस वाक्य में '${w}' क्या है?`), hi(a), BHED_ALL.filter(x => x !== a).map(hi), L(`In this sentence '${w}' is a ${a}.`, `इस वाक्य में '${w}' ${a} है।`), { fixed: BHED_ALL }), s + w); }, { size: BHED.length }),
  S('h.read', 5, hi('अपठित गद्यांश'), [], L('Read the whole passage once, then find the sentence that answers the question.', 'पहले पूरा गद्यांश एक बार पढ़िए, फिर वह वाक्य खोजिए जिसमें प्रश्न का उत्तर है।'),
    r => { const it = r.pick(HREAD_ITEMS), [q, a, w] = it.q; return keyed(mcq(r, hi(q), hi(a), w.map(hi), L(`Answer: ${a}`, `उत्तर: ${a}। गद्यांश में वह वाक्य खोजिए जो यह बताता है।`), { passage: { title: it.ps.t, text: it.ps.p } }), it.key); }, { size: HREAD_ITEMS.length }),
  S('h.muhavare', 6, hi('मुहावरे'), ['h.paryay'], L('An idiom (मुहावरा) means something different from its plain words. Learn it with a sentence.', 'मुहावरे का अर्थ उसके शब्दों के सीधे अर्थ से अलग होता है। इसे वाक्य के साथ याद कीजिए।'),
    r => { const m = r.pick(MUHAVARE); return keyed(mcq(r, hi(`'${m.i}' मुहावरे का अर्थ क्या है?`), hi(m.m), others(r, MUHAVARE, m, 3, (a, b) => a.g && a.g === b.g).map(x => hi(x.m)), L(`'${m.i}' means: ${m.m}`, `'${m.i}' का अर्थ है: ${m.m}।`)), m.i); }, { size: MUHAVARE.length }),
];
