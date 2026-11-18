// Four moral-dilemma story paths for class 4–5. Each is a small graph: a situation, two
// levels of choice, and endings that show a consequence without calling the child bad.
// Choices are never graded and never stored; only "finished" and "reflected" are counted.
import { L } from '../core/i18n.js';

export const STORIES = [
  {
    id: 'story.purse', icon: '🪙', grade: 4, strand: 's',
    title: L('The purse at the bus stop', 'बस स्टॉप पर पड़ा बटुआ'),
    blurb: L('You find a purse with ₹500 and a hospital bus pass. Nobody is watching.', 'तुम्हें ₹500 और अस्पताल के बस पास वाला बटुआ मिलता है। कोई नहीं देख रहा।'),
    place: L('A dusty bus stop, after school', 'स्कूल के बाद की धूल भरी बस रुकने की जगह'),
    start: 'start',
    nodes: {
      start: {
        text: L('You are walking home. Near the bus stand lies a small purse. Inside are ₹500 and a bus pass with the photo of a didi who works at the hospital.',
          'तुम घर लौट रहे हो। बस स्टॉप के पास एक छोटा बटुआ पड़ा है। उसमें ₹500 और अस्पताल में काम करने वाली दीदी की फ़ोटो वाला बस पास है।'),
        choices: [
          { label: L('Pick it up and give it to the bus conductor.', 'उसे उठाकर बस कंडक्टर को दो।'), next: 'conductor' },
          { label: L('Take it home and ask Amma what to do.', 'घर ले जाकर अम्मा से पूछो कि क्या करें।'), next: 'amma' },
          { label: L('Keep it. You could buy the stickers you wanted.', 'रख लो। जो स्टिकर चाहिए थे, वे खरीद सकते हो।'), next: 'kept' },
        ],
      },
      conductor: {
        text: L('The conductor recognises the photo. Ten minutes later the didi comes running back, out of breath. Her month\'s bus money is in that purse.',
          'कंडक्टर फ़ोटो पहचान लेता है। दस मिनट बाद वह दीदी साँस फूलती हुई दौड़ती आती है। उस बटुए में उसके महीने के बस के पैसे हैं।'),
        choices: [
          { label: L('Hand it over, and do not wait to be thanked.', 'उसे दे दो, और धन्यवाद की प्रतीक्षा मत करो।'), next: 'returned' },
          { label: L('Ask her for ₹50 as a reward.', 'उससे इनाम में ₹50 माँगो।'), next: 'reward' },
        ],
      },
      amma: {
        text: L('Amma listens carefully. “It is not ours,” she says. “But it is yours to return.”',
          'अम्मा ध्यान से सुनती हैं। “यह हमारा नहीं है,” वे कहती हैं। “पर लौटाना तुम्हारा काम है।”'),
        choices: [
          { label: L('Walk back to the stop with Amma.', 'अम्मा के साथ स्टॉप तक वापस चलो।'), next: 'conductor' },
          { label: L('Leave it in the cupboard. Someone will ask.', 'उसे अलमारी में रख दो। कोई पूछेगा तो दे देंगे।'), next: 'cupboard' },
        ],
      },
      kept: {
        text: L('You buy the stickers. At home the purse sits in your bag. You keep thinking about the photo on the pass — a didi with a tired smile.',
          'तुम स्टिकर खरीद लेते हो। घर पर बटुआ तुम्हारे बस्ते में रहता है। पास की फ़ोटो याद आती रहती है — थकी मुस्कान वाली दीदी।'),
        choices: [
          { label: L('Tell Amma, and go back to the stop together.', 'अम्मा को बताओ, और साथ में स्टॉप लौटो।'), next: 'conductor' },
          { label: L('Hide the purse under the bed.', 'बटुआ बिस्तर के नीचे छिपा दो।'), next: 'hidden' },
        ],
      },
      returned: {
        end: true,
        text: L('The didi holds your hand for a second. “I would have missed my duty,” she says. The conductor gives you a nod. Nothing is bought, and nothing is missing.',
          'दीदी एक पल के लिए तुम्हारा हाथ थामती हैं। “मेरी ड्यूटी छूट जाती,” वे कहती हैं। कंडक्टर सिर हिलाता है। कुछ खरीदा नहीं गया, और कुछ खोया भी नहीं।'),
        lesson: L('Honesty is not a transaction. Returning something is not doing a favour to its owner; it is keeping your own hands clean.',
          'ईमानदारी सौदा नहीं है। चीज़ लौटाना उसके मालिक पर एहसान नहीं, अपने हाथ साफ़ रखना है।'),
        reflection: {
          q: L('What would you do if nobody had seen you at all?', 'अगर तुम्हें किसी ने देखा ही न होता तो क्या करते?'),
          options: [
            L('Return it anyway — being unseen does not change what is right.', 'फिर भी लौटाता — न दिखने से सही-गलत नहीं बदलता।'),
            L('I would have to think harder. That is honest too.', 'मुझे और सोचना पड़ता। यह भी ईमानदारी है।'),
            L('I am not sure yet.', 'मुझे अभी पता नहीं।'),
          ],
        },
      },
      reward: {
        end: true,
        text: L('She gives you ₹50. Her hands shake a little as she counts it. You have the money, and a strange empty feeling.',
          'वे तुम्हें ₹50 देती हैं। गिनते समय उनके हाथ थोड़े काँपते हैं। पैसे तुम्हारे पास हैं, और एक अजीब खालीपन भी।'),
        lesson: L('Helping is not a bargain. Even a small reward asked at the wrong moment can turn a kindness into a trade.',
          'मदद सौदा नहीं है। गलत समय पर माँगा छोटा इनाम भी दया को लेन-देन बना देता है।'),
        reflection: {
          q: L('When help is needed, what does the other person need most from you?', 'जब किसी को मदद चाहिए, तब उसे तुमसे सबसे ज़्यादा क्या चाहिए?'),
          options: [
            L('To be helped, not charged.', 'मदद, इनाम नहीं।'),
            L('To be asked what they need.', 'यह पूछा जाए कि उन्हें क्या चाहिए।'),
            L('A little of both is fine.', 'थोड़ा दोनों ठीक है।'),
          ],
        },
      },
      cupboard: {
        end: true,
        text: L('The purse waits in the cupboard. Every time the door opens, you look away. The ₹500 is still there, but it no longer feels like money.',
          'बटुआ अलमारी में प्रतीक्षा करता है। जब भी दरवाज़ा खुलता है, तुम नज़र चुरा लेते हो। ₹500 वहीं हैं, पर अब पैसे जैसे नहीं लगते।'),
        lesson: L('A thing kept is not a thing owned. The worry takes more room than the money.',
          'रखी हुई चीज़ अपनी नहीं होती। चिंता पैसों से ज़्यादा जगह ले लेती है।'),
        reflection: {
          q: L('What makes a secret heavy?', 'किसी रहस्य को भारी क्या बनाता है?'),
          options: [
            L('Knowing it could be fixed and not fixing it.', 'यह जानना कि इसे ठीक किया जा सकता है और न करना।'),
            L('Being afraid of what someone will say.', 'किसी की बात का डर।'),
            L('Both, together.', 'दोनों, साथ में।'),
          ],
        },
      },
      hidden: {
        end: true,
        text: L('A week later Amma finds the purse while cleaning. She does not shout. She asks one question: “Was it heavy to carry?” You cannot answer.',
          'एक हफ़्ते बाद सफ़ाई करते हुए अम्मा को बटुआ मिलता है। वे चिल्लाती नहीं। एक सवाल पूछती हैं: “उठाने में भारी था?” तुम उत्तर नहीं दे पाते।'),
        lesson: L('Hiding a mistake does not remove it. The first honest sentence is the hardest, and the one that helps most.',
          'गलती छिपाने से वह जाती नहीं। पहला सच्चा वाक्य सबसे कठिन होता है, और सबसे ज़्यादा मदद करता है।'),
        reflection: {
          q: L('What is the first true sentence you could say?', 'पहला सच्चा वाक्य क्या हो सकता है?'),
          options: [
            L('“I found it and I did not return it.”', '“मुझे मिला था और मैंने लौटाया नहीं।”'),
            L('“I was scared to tell you.”', '“मुझे बताने का डर था।”'),
            L('“Can we return it now?”', '“क्या हम अब लौटा सकते हैं?”'),
          ],
        },
      },
    },
  },
  {
    id: 'story.paratha', icon: '🥞', grade: 4, strand: 'h',
    title: L('Half a paratha', 'आधा पराठा'),
    blurb: L('A new girl sits alone with no tiffin. You have two parathas and a growling stomach.', 'एक नई लड़की अकेली बैठी है, उसके पास टिफ़िन नहीं। तुम्हारे पास दो पराठे हैं और पेट में भूख।'),
    place: L('The lunch break, under the neem tree', 'नीम के पेड़ के नीचे लंच ब्रेक'),
    start: 'start',
    nodes: {
      start: {
        text: L('A new girl, Meera, sits alone. Her tiffin box is at home. You have two aloo parathas wrapped in paper.',
          'नई लड़की मीरा अकेली बैठी है। उसका टिफ़िन घर रह गया। तुम्हारे पास कागज़ में लिपटे दो आलू पराठे हैं।'),
        choices: [
          { label: L('Give her one paratha.', 'उसे एक पराठा दो।'), next: 'share' },
          { label: L('Eat both and look the other way.', 'दोनों खाओ और दूसरी ओर देखो।'), next: 'eat' },
          { label: L('Ask two friends to share their tiffin too.', 'दो दोस्तों से भी टिफ़िन बाँटने को कहो।'), next: 'ask' },
        ],
      },
      share: {
        text: L('Meera says, “No, no, I am not hungry.” Her eyes say something else. Your paratha is warm in your hand.',
          'मीरा कहती है, “नहीं, नहीं, मुझे भूख नहीं।” उसकी आँखें कुछ और कहती हैं। तुम्हारा पराठा हाथ में गरम है।'),
        choices: [
          { label: L('Leave half on her lid and start eating yours.', 'उसके ढक्कन पर आधा रख दो और अपना खाने लगो।'), next: 'warm' },
          { label: L('Take it back. She said no.', 'वापस ले लो। उसने मना किया।'), next: 'awkward' },
        ],
      },
      eat: {
        text: L('You finish both. Meera drinks water from the tap and looks at the ground. Your stomach is full; the break feels long.',
          'तुम दोनों खत्म कर लेते हो। मीरा नल से पानी पीती है और ज़मीन देखती है। पेट भर गया; ब्रेक लंबा लगता है।'),
        choices: [
          { label: L('Offer your water bottle and sit with her.', 'अपनी पानी की बोतल दो और उसके पास बैठो।'), next: 'small' },
          { label: L('Pretend not to notice.', 'अनदेखा कर दो।'), next: 'regret' },
        ],
      },
      ask: {
        text: L('Two friends bring their tiffins. Now there are four things for five people — and everyone is waiting to see what you do.',
          'दो दोस्त अपने टिफ़िन ले आते हैं। अब पाँच लोगों के लिए चार चीज़ें हैं — और सब देख रहे हैं कि तुम क्या करते हो।'),
        choices: [
          { label: L('Split everything into five equal parts.', 'सब कुछ पाँच बराबर हिस्सों में बाँटो।'), next: 'feast' },
          { label: L('Give your whole share to Meera.', 'अपना पूरा हिस्सा मीरा को दे दो।'), next: 'generous' },
        ],
      },
      warm: {
        end: true,
        text: L('Meera eats slowly, then smiles for the first time that day. In the afternoon she lends you her sketch pen. Nobody made a speech.',
          'मीरा धीरे-धीरे खाती है, फिर उस दिन पहली बार मुस्कुराती है। दोपहर में वह तुम्हें अपना स्केच पेन देती है। किसी ने भाषण नहीं दिया।'),
        lesson: L('Sharing works best when it leaves the other person their dignity. “Leave it and start eating” asks for nothing in return.',
          'बाँटना तब सबसे अच्छा होता है जब दूसरे की इज़्ज़त बनी रहे। “रखकर खाने लगो” में कुछ वापस नहीं माँगा जाता।'),
        reflection: {
          q: L('How can you share without making someone feel small?', 'किसी को छोटा महसूस कराए बिना कैसे बाँटें?'),
          options: [
            L('Give quietly, and do not watch them eat.', 'चुपचाप दो, और उन्हें खाते मत देखो।'),
            L('Share your own, not someone else\'s.', 'अपना बाँटो, किसी और का नहीं।'),
            L('Ask first, and accept a no.', 'पहले पूछो, और ना स्वीकारो।'),
          ],
        },
      },
      awkward: {
        end: true,
        text: L('You put the paratha back. Meera says nothing. Later you hear her tell the teacher she forgot her tiffin. The words “she said no” stay with you.',
          'तुम पराठा वापस रख लेते हो। मीरा कुछ नहीं कहती। बाद में सुनते हो कि उसने शिक्षिका से कहा कि टिफ़िन भूल गई थी। “उसने मना किया” शब्द तुम्हारे साथ रहते हैं।'),
        lesson: L('“No” is sometimes politeness, not truth. Kindness listens to the whole person, not only the words.',
          '“ना” कभी-कभी शिष्टाचार होता है, सच नहीं। दया पूरे इंसान को सुनती है, केवल शब्दों को नहीं।'),
        reflection: {
          q: L('When is a “no” worth gently checking?', 'कब “ना” को प्यार से जाँचना चाहिए?'),
          options: [
            L('When you can offer without pressure.', 'जब बिना दबाव के दे सको।'),
            L('When the person seems to need it.', 'जब व्यक्ति को ज़रूरत लगे।'),
            L('It is hard to know. Asking kindly helps.', 'पता लगाना कठिन है। प्यार से पूछना मदद करता है।'),
          ],
        },
      },
      small: {
        end: true,
        text: L('Meera drinks the water. You sit together without talking. It is not a feast, but the break is no longer lonely.',
          'मीरा पानी पीती है। तुम बिना बोले साथ बैठते हो। यह दावत नहीं है, पर ब्रेक अब अकेला नहीं है।'),
        lesson: L('A small repair still counts. You cannot undo the empty tiffin, but you can stop someone from sitting alone.',
          'छोटी भरपाई भी गिनती है। खाली टिफ़िन वापस नहीं आता, पर किसी को अकेला बैठने से रोका जा सकता है।'),
        reflection: {
          q: L('What can you offer when you have already eaten?', 'जब तुम खा चुके हो, तब क्या दे सकते हो?'),
          options: [
            L('Company.', 'साथ।'),
            L('Water, or a place to sit.', 'पानी, या बैठने की जगह।'),
            L('A promise to bring extra tomorrow.', 'कल ज़्यादा लाने का वादा।'),
          ],
        },
      },
      regret: {
        end: true,
        text: L('The bell rings. Meera puts her empty tiffin box back in her bag. You had two parathas and a choice, and the choice is still sitting there.',
          'घंटी बजती है। मीरा अपना खाली टिफ़िन बस्ते में रखती है। तुम्हारे पास दो पराठे और एक चुनाव था, और चुनाव वहीं पड़ा है।'),
        lesson: L('Noticing comes before kindness. The uncomfortable feeling is useful — it shows you what you want to do next time.',
          'देखना दया से पहले आता है। असहज भावना काम की है — वह बताती है कि अगली बार क्या करना है।'),
        reflection: {
          q: L('What will you do at the next lunch break?', 'अगले लंच ब्रेक में क्या करोगे?'),
          options: [
            L('Bring an extra paratha without being asked.', 'बिना कहे एक अतिरिक्त पराठा लाओ।'),
            L('Sit with the person who is alone.', 'अकेले बैठे व्यक्ति के पास बैठो।'),
            L('Ask a friend to share the job.', 'किसी दोस्त से मदद माँगो।'),
          ],
        },
      },
      feast: {
        end: true,
        text: L('Four tiffins become five plates. Some get a little less, but everyone eats. Meera laughs at a joke for the first time.',
          'चार टिफ़िन पाँच थालियाँ बन जाते हैं। किसी को थोड़ा कम मिलता है, पर सब खाते हैं। मीरा पहली बार किसी मज़ाक पर हँसती है।'),
        lesson: L('Fair sharing is not always equal sharing. It is everyone getting enough, and enough people helping.',
          'निष्पक्ष बाँटना हमेशा बराबर बाँटना नहीं है। वह है सबको पर्याप्त मिलना, और पर्याप्त लोगों का मदद करना।'),
        reflection: {
          q: L('What makes a share fair?', 'बाँटना निष्पक्ष कब होता है?'),
          options: [
            L('Everyone gets some.', 'सबको कुछ मिले।'),
            L('The person who needs more gets more.', 'जिसे ज़्यादा चाहिए उसे ज़्यादा मिले।'),
            L('Everyone helps make it happen.', 'सब मिलकर बाँटें।'),
          ],
        },
      },
      generous: {
        end: true,
        text: L('You give your whole share away. By evening you are very hungry. Meera notices and saves you half a roti from her own bag.',
          'तुम अपना पूरा हिस्सा दे देते हो। शाम तक बहुत भूख लगती है। मीरा देखती है और अपने बस्ते से आधी रोटी तुम्हारे लिए बचा लेती है।'),
        lesson: L('Giving everything is generous, but a kindness that leaves you empty cannot last. Sharing usually means half, not all.',
          'सब कुछ देना उदार है, पर खुद को खाली कर देने वाली दया टिकती नहीं। बाँटने का अर्थ आमतौर पर आधा होता है, सब नहीं।'),
        reflection: {
          q: L('How much is enough to give?', 'कितना देना पर्याप्त है?'),
          options: [
            L('Half, so both of you can keep going.', 'आधा, ताकि दोनों चल सकें।'),
            L('As much as the other person truly needs.', 'जितना दूसरे को सचमुच चाहिए।'),
            L('It depends on the day.', 'दिन पर निर्भर है।'),
          ],
        },
      },
    },
  },
  {
    id: 'story.cricket', icon: '🏏', grade: 5, strand: 's',
    title: L('The second-chance bat', 'दूसरा मौका'),
    blurb: L('You are given out. Your friend says the umpire is wrong and asks you to bat again.', 'तुम्हें आउट दिया जाता है। तुम्हारा दोस्त कहता है अंपायर गलत है और दोबारा बल्लेबाज़ी को कहता है।'),
    place: L('The gully match, last over', 'गली का मैच, आख़िरी ओवर'),
    start: 'start',
    nodes: {
      start: {
        text: L('The ball hits your pad. The umpire raises a finger: out LBW. Your team needs 12 runs. Your friend pulls your arm. “That was not out. Bat again.”',
          'गेंद तुम्हारे पैड पर लगती है। अंपायर उँगली उठाता है: LBW आउट। तुम्हारी टीम को 12 रन चाहिए। दोस्त तुम्हारा हाथ खींचता है। “वह आउट नहीं था। दोबारा बल्लेबाज़ी करो।”'),
        choices: [
          { label: L('Walk off. The umpire\'s decision stands.', 'चले जाओ। अंपायर का फ़ैसला मान्य है।'), next: 'walk' },
          { label: L('Bat again. Your team needs you.', 'दोबारा बल्लेबाज़ी करो। टीम को तुम्हारी ज़रूरत है।'), next: 'bat' },
          { label: L('Ask the umpire to decide again, calmly.', 'अंपायर से शांति से दोबारा फ़ैसला पूछो।'), next: 'ask' },
        ],
      },
      walk: {
        text: L('Your team loses by four runs. On the way home the umpire walks beside you and says quietly, “You were out. I am glad you walked.”',
          'तुम्हारी टीम चार रन से हार जाती है। घर लौटते समय अंपायर तुम्हारे पास चलता है और धीरे कहता है, “तुम आउट थे। अच्छा किया जो चले गए।”'),
        choices: [
          { label: L('Thank him for saying it.', 'यह कहने के लिए उसे धन्यवाद दो।'), next: 'respect' },
          { label: L('Say nothing, but keep walking with him.', 'कुछ मत कहो, पर साथ चलते रहो।'), next: 'quiet' },
        ],
      },
      bat: {
        text: L('You bat again and hit 20 runs. Your team wins. The other team says nothing, but their faces are tight. The win feels loud and hollow at the same time.',
          'तुम दोबारा बल्लेबाज़ी करते हो और 20 रन बनाते हो। टीम जीत जाती है। दूसरी टीम कुछ नहीं कहती, पर उनके चेहरे तने हैं। जीत ज़ोरदार और खोखली, दोनों लगती है।'),
        choices: [
          { label: L('Tell the truth after the match.', 'मैच के बाद सच बताओ।'), next: 'repair' },
          { label: L('Celebrate. A win is a win.', 'जश्न मनाओ। जीत जीत है।'), next: 'hollow' },
        ],
      },
      ask: {
        text: L('You lower your bat and ask the umpire, “Sir, could you check again? I want to accept whatever you decide.” The gully goes quiet.',
          'तुम बल्ला नीचे करके अंपायर से पूछते हो, “सर, ज़रा दोबारा देखेंगे? जो फ़ैसला करें, मैं मानूँगा।” गली शांत हो जाती है।'),
        choices: [
          { label: L('Accept the replay decision, whatever it is.', 'दोबारा फ़ैसले को मानो, जो भी हो।'), next: 'fair' },
          { label: L('Argue that it was clearly not out.', 'बहस करो कि यह साफ़ आउट नहीं था।'), next: 'noisy' },
        ],
      },
      respect: {
        end: true,
        text: L('The umpire smiles. The next week he asks you to umpire the younger kids\' match. You raise your finger once, and you sleep well.',
          'अंपायर मुस्कुराता है। अगले हफ़्ते वह तुम्हें छोटे बच्चों के मैच में अंपायर बनने को कहता है। एक बार उँगली उठाते हो, और चैन से सोते हो।'),
        lesson: L('Respect for the game is shown when the decision goes against you. That is when it is worth something.',
          'खेल का सम्मान तब दिखता है जब फ़ैसला तुम्हारे ख़िलाफ़ जाए। तभी उसकी कीमत होती है।'),
        reflection: {
          q: L('What makes a game worth playing?', 'खेल खेलने लायक क्या बनाता है?'),
          options: [
            L('Rules that apply to everyone, including me.', 'नियम सब पर लागू हों, मुझ पर भी।'),
            L('Playing with people I like.', 'अपने पसंद के लोगों के साथ खेलना।'),
            L('A chance to be fair, even when I lose.', 'हारने पर भी निष्पक्ष रहने का मौका।'),
          ],
        },
      },
      quiet: {
        end: true,
        text: L('You walk in silence. At the corner he says, “Next time you can umpire.” You nod. The loss is still a loss, but something else is steady.',
          'तुम चुपचाप चलते हो। मोड़ पर वह कहता है, “अगली बार तुम अंपायर बन सकते हो।” तुम सिर हिलाते हो। हार हार है, पर कुछ और स्थिर है।'),
        lesson: L('Integrity does not always need a speech. Sometimes it is just the quiet walk home after losing fairly.',
          'ईमानदारी को हमेशा भाषण नहीं चाहिए। कभी-कभी वह निष्पक्ष हार के बाद चुपचाप घर लौटना है।'),
        reflection: {
          q: L('What can you keep when you lose?', 'हारने पर क्या बचा रह सकता है?'),
          options: [
            L('My honesty.', 'मेरी ईमानदारी।'),
            L('My team\'s respect.', 'टीम का सम्मान।'),
            L('A lesson for next time.', 'अगली बार के लिए सबक।'),
          ],
        },
      },
      repair: {
        end: true,
        text: L('You tell the other team the truth. They are angry, then quiet. The match is replayed next Sunday, and this time you lose by two runs — and shake hands.',
          'तुम दूसरी टीम को सच बताते हो। वे पहले नाराज़ होते हैं, फिर शांत। अगले रविवार मैच दोबारा होता है, और इस बार तुम दो रन से हारते हो — और हाथ मिलाते हो।'),
        lesson: L('A win you cannot defend to yourself is not a win. Repairing is harder than celebrating, and worth more.',
          'जो जीत खुद को नहीं बता सको, वह जीत नहीं। सुधार करना जश्न से कठिन है, और उससे ज़्यादा कीमती।'),
        reflection: {
          q: L('How do you repair a win that felt wrong?', 'गलत लगी जीत को कैसे सुधारें?'),
          options: [
            L('Say the truth, even if it costs the trophy.', 'सच कहो, चाहे ट्रॉफ़ी चली जाए।'),
            L('Ask the other team what would make it fair.', 'दूसरी टीम से पूछो कि क्या निष्पक्ष होगा।'),
            L('Change the rule so it cannot happen again.', 'नियम बदलो ताकि ऐसा फिर न हो।'),
          ],
        },
      },
      hollow: {
        end: true,
        text: L('You celebrate. Someone from the other team says, “Ask him how many bats he got.” The joke follows you to the next match.',
          'तुम जश्न मनाते हो। दूसरी टीम से कोई कहता है, “पूछो इसे, कितनी बार बल्ला मिला।” वह मज़ाक अगले मैच तक साथ चलता है।'),
        lesson: L('A win that needs a lie to stand up will keep needing one. The scoreboard forgets; the players do not.',
          'जो जीत झूठ के सहारे खड़ी हो, उसे बार-बार झूठ चाहिए। स्कोरबोर्ड भूल जाता है; खिलाड़ी नहीं।'),
        reflection: {
          q: L('What would make the next win feel clean?', 'अगली जीत को साफ़ क्या बनाएगा?'),
          options: [
            L('Playing by the same rules as everyone.', 'सबके जैसे नियमों से खेलना।'),
            L('Admitting this one was not fair.', 'मानना कि यह जीत निष्पक्ष नहीं थी।'),
            L('Asking my team what they think.', 'अपनी टीम से पूछना कि वे क्या सोचते हैं।'),
          ],
        },
      },
      fair: {
        end: true,
        text: L('The umpire thinks for a long moment. “Not out,” he says at last. You bat, and you are bowled for 3. Nobody can say the match was not fair.',
          'अंपायर देर तक सोचता है। “आउट नहीं,” वह आख़िर में कहता है। तुम बल्लेबाज़ी करते हो और 3 रन पर बोल्ड हो जाते हो। कोई नहीं कह सकता कि मैच निष्पक्ष नहीं था।'),
        lesson: L('Asking for a fair look is not the same as demanding a favour. Accepting the answer is the part that makes it fair.',
          'निष्पक्ष जाँच माँगना एहसान माँगना नहीं है। उत्तर मान लेना ही उसे निष्पक्ष बनाता है।'),
        reflection: {
          q: L('What makes a second look fair?', 'दोबारा देखना निष्पक्ष कब होता है?'),
          options: [
            L('Both teams can ask for it.', 'दोनों टीमें माँग सकें।'),
            L('The decision is accepted afterwards.', 'फ़ैसला बाद में माना जाए।'),
            L('The person asking is not the only one who benefits.', 'माँगने वाले को ही फ़ायदा न हो।'),
          ],
        },
      },
      noisy: {
        end: true,
        text: L('The argument grows. The umpire walks away. The match is abandoned, and the next one has no umpire at all. Everyone loses something.',
          'बहस बढ़ जाती है। अंपायर चला जाता है। मैच छूट जाता है, और अगले मैच में कोई अंपायर ही नहीं। सब कुछ कुछ खो देते हैं।'),
        lesson: L('Being right loudly can still break the game. A question opens a door; an argument closes the field.',
          'ज़ोर से सही होना भी खेल तोड़ सकता है। सवाल दरवाज़ा खोलता है; बहस मैदान बंद कर देती है।'),
        reflection: {
          q: L('How do you disagree without breaking the game?', 'खेल तोड़े बिना असहमति कैसे जताएँ?'),
          options: [
            L('Ask once, calmly, and accept the answer.', 'एक बार शांति से पूछो, और उत्तर मानो।'),
            L('Talk after the match, not during it.', 'मैच के बाद बात करो, बीच में नहीं।'),
            L('Let a neutral person decide.', 'किसी निष्पक्ष व्यक्ति से फ़ैसला कराओ।'),
          ],
        },
      },
    },
  },
  {
    id: 'story.message', icon: '📱', grade: 5, strand: 'c',
    title: L('The message that travelled', 'जो संदेश चल पड़ा'),
    blurb: L('A mean photo of a classmate is in the group chat. Your friend asks you to forward it.', 'क्लासमेट की एक बुरी फ़ोटो ग्रुप चैट में है। दोस्त तुमसे उसे आगे भेजने को कहता है।'),
    place: L('After school, on a borrowed phone', 'स्कूल के बाद, उधार के फ़ोन पर'),
    start: 'start',
    nodes: {
      start: {
        text: L('The group chat has a photo of Riya from your class, with a caption that makes people laugh at her. Your friend Kabir forwards it to you: “Send it to the other group too.”',
          'ग्रुप चैट में तुम्हारी क्लास की रिया की फ़ोटो है, और ऐसा कैप्शन जिस पर लोग उसका मज़ाक उड़ाते हैं। दोस्त कबीर उसे तुम्हें भेजता है: “दूसरे ग्रुप में भी भेज दो।”'),
        choices: [
          { label: L('Delete it and tell Kabir to stop.', 'उसे डिलीट करो और कबीर से रुकने को कहो।'), next: 'delete' },
          { label: L('Forward it to one more friend. Just one.', 'एक और दोस्त को भेज दो। बस एक को।'), next: 'forward' },
          { label: L('Ask Riya how she feels about it.', 'रिया से पूछो कि उसे कैसा लग रहा है।'), next: 'ask' },
        ],
      },
      delete: {
        text: L('Kabir laughs. “It is just a joke. Everyone is sending it.” Your thumb hovers over the delete button.',
          'कबीर हँसता है। “मज़ाक है। सब भेज रहे हैं।” तुम्हारा अंगूठा डिलीट बटन पर रुकता है।'),
        choices: [
          { label: L('Say, “Not everyone. Not me.” and delete it.', 'कहो, “सब नहीं। मैं नहीं।” और डिलीट कर दो।'), next: 'firm' },
          { label: L('Leave the group quietly.', 'चुपचाप ग्रुप छोड़ दो।'), next: 'leave' },
        ],
      },
      forward: {
        text: L('You send it on. By evening it has reached Riya. She messages you one word: “Why?”',
          'तुम उसे आगे भेज देते हो। शाम तक वह रिया तक पहुँच जाती है। वह तुम्हें एक शब्द लिखती है: “क्यों?”'),
        choices: [
          { label: L('Apologise, and ask what she wants you to do.', 'माफ़ी माँगो, और पूछो वह क्या चाहती है।'), next: 'repair' },
          { label: L('Say it was not you — Kabir sent it first.', 'कहो कि मैंने नहीं भेजा — पहले कबीर ने भेजा था।'), next: 'blame' },
        ],
      },
      ask: {
        text: L('Riya is quiet for a while. “It feels like everyone is looking at me,” she says. “I did not say yes to that photo.”',
          'रिया थोड़ी देर चुप रहती है। “लगता है सब मुझे देख रहे हैं,” वह कहती है। “मैंने उस फ़ोटो के लिए हाँ नहीं कहा था।”'),
        choices: [
          { label: L('Help her ask a teacher to get it removed.', 'उसकी मदद करो कि शिक्षक से इसे हटवाए।'), next: 'courage' },
          { label: L('Tell her to ignore it. It will blow over.', 'कहो कि अनदेखा करे। मामला शांत हो जाएगा।'), next: 'quiet' },
        ],
      },
      firm: {
        end: true,
        text: L('Kabir is annoyed, then shrugs. Two other friends also delete it. The photo stops spreading at your class. Riya never learns how close it came.',
          'कबीर नाराज़ होता है, फिर कंधे उचकाता है। दो और दोस्त भी उसे डिलीट कर देते हैं। फ़ोटो तुम्हारी क्लास पर रुक जाती है। रिया को कभी पता नहीं चलता कि कितना करीब आई थी।'),
        lesson: L('Stopping a message is quiet work. You do not need to be seen being kind for it to count.',
          'संदेश रोकना चुपचाप काम है। दया के लिए देखा जाना ज़रूरी नहीं।'),
        reflection: {
          q: L('What can one person do in a group chat?', 'ग्रुप चैट में एक व्यक्ति क्या कर सकता है?'),
          options: [
            L('Refuse to forward, and say why.', 'आगे भेजने से मना करो, और कारण बताओ।'),
            L('Ask others to stop too.', 'दूसरों से भी रुकने को कहो।'),
            L('Support the person in private.', 'व्यक्ति को अलग से सहारा दो।'),
          ],
        },
      },
      leave: {
        end: true,
        text: L('You leave the group. The photo keeps travelling without you. Riya sees it two days later. Silence kept your hands clean, but not hers.',
          'तुम ग्रुप छोड़ देते हो। फ़ोटो तुम्हारे बिना भी चलती रहती है। रिया उसे दो दिन बाद देखती है। चुप्पी ने तुम्हारे हाथ साफ़ रखे, उसके नहीं।'),
        lesson: L('Walking away protects you, not the person being hurt. Sometimes staying and saying one sentence is braver.',
          'दूर चले जाना तुम्हें बचाता है, जिसे चोट पहुँच रही है उसे नहीं। कभी-कभी रुककर एक वाक्य कहना ज़्यादा बहादुरी है।'),
        reflection: {
          q: L('When is leaving the right choice, and when is it escape?', 'कब छोड़ना सही है, और कब भागना?'),
          options: [
            L('Leave if staying would make it worse.', 'अगर रुकने से बात बिगड़े तो छोड़ो।'),
            L('Stay long enough to say “not me”.', 'इतना रुको कि “मैं नहीं” कह सको।'),
            L('Leave, then check on the person privately.', 'छोड़ो, फिर अलग से व्यक्ति का हाल पूछो।'),
          ],
        },
      },
      repair: {
        end: true,
        text: L('Riya thinks. “Tell the group it was wrong. And do not send anything about me again.” You do. It is uncomfortable, and it helps.',
          'रिया सोचती है। “ग्रुप को बताओ कि यह गलत था। और मेरे बारे में कुछ मत भेजना।” तुम बताते हो। असहज लगता है, और मदद करता है।'),
        lesson: L('An apology is not a feeling; it is an action. Asking the person what they need turns regret into repair.',
          'माफ़ी भावना नहीं, काम है। व्यक्ति से पूछना कि उसे क्या चाहिए, पछतावे को सुधार में बदलता है।'),
        reflection: {
          q: L('What makes an apology real?', 'माफ़ी असली कब होती है?'),
          options: [
            L('Naming what I did.', 'मैंने क्या किया, यह बताना।'),
            L('Asking what would help now.', 'पूछना कि अब क्या मदद करेगा।'),
            L('Not doing it again.', 'दोबारा न करना।'),
          ],
        },
      },
      blame: {
        end: true,
        text: L('Kabir gets blamed. He stops talking to you. Riya sees the photo is still spreading. “It does not matter who started it,” she says. “You sent it to me.”',
          'कबीर पर इल्ज़ाम आता है। वह तुमसे बात करना बंद कर देता है। रिया देखती है कि फ़ोटो अब भी फैल रही है। “शुरू किसने किया, मायने नहीं रखता,” वह कहती है। “तुमने मुझे भेजा।”'),
        lesson: L('“Someone else started it” does not make your part smaller. Taking your share is the only way to change it.',
          '“किसी और ने शुरू किया” से तुम्हारा हिस्सा छोटा नहीं होता। अपना हिस्सा मानना ही बदलाव का रास्ता है।'),
        reflection: {
          q: L('How do I own my part without blaming someone else?', 'दूसरों को दोष दिए बिना अपना हिस्सा कैसे मानूँ?'),
          options: [
            L('Say what I did, without “but”.', '“लेकिन” के बिना बताओ कि मैंने क्या किया।'),
            L('Ask what I can do now.', 'पूछो कि अब मैं क्या कर सकता हूँ।'),
            L('Change what I send next time.', 'अगली बार क्या भेजूँगा, यह बदलो।'),
          ],
        },
      },
      courage: {
        end: true,
        text: L('Together you tell the teacher. The photo is deleted from the class group. Riya says, “Thank you for not making me do it alone.”',
          'साथ में तुम शिक्षक को बताते हो। क्लास ग्रुप से फ़ोटो हट जाती है। रिया कहती है, “धन्यवाद कि मुझे अकेले नहीं करना पड़ा।”'),
        lesson: L('Courage is often companionship. Helping someone speak is as important as speaking for them.',
          'बहादुरी अक्सर साथ देना है। किसी को बोलने में मदद करना, उसकी जगह बोलने जितना ज़रूरी है।'),
        reflection: {
          q: L('How can I support someone without taking over?', 'किसी को उसका काम छीने बिना सहारा कैसे दूँ?'),
          options: [
            L('Ask what they want me to do.', 'पूछो कि वे क्या चाहते हैं।'),
            L('Stand beside them while they speak.', 'जब वे बोलें, पास खड़े रहो।'),
            L('Follow their lead, not mine.', 'उनकी राह चलो, अपनी नहीं।'),
          ],
        },
      },
      quiet: {
        end: true,
        text: L('Riya nods and says nothing more. The photo is still in three phones. “It will blow over” becomes a sentence you wish you had not said.',
          'रिया सिर हिलाती है और कुछ नहीं कहती। फ़ोटो अब भी तीन फ़ोन में है। “शांत हो जाएगा” ऐसा वाक्य बन जाता है जो तुम न कहना चाहते।'),
        lesson: L('“Ignore it” puts the work on the person who is hurt. A better sentence starts with “What would help?”',
          '“अनदेखा करो” का बोझ चोट खाए व्यक्ति पर डालता है। बेहतर वाक्य “क्या मदद करेगा?” से शुरू होता है।'),
        reflection: {
          q: L('What would I want someone to say to me?', 'मैं चाहता कि कोई मुझसे क्या कहे?'),
          options: [
            L('“This is not your fault.”', '“यह तुम्हारी गलती नहीं।”'),
            L('“What do you want to do about it?”', '“तुम इस बारे में क्या करना चाहती हो?”'),
            L('“I am here. You are not alone.”', '“मैं हूँ। तुम अकेली नहीं।”'),
          ],
        },
      },
    },
  },
];
