// Curiosity Labs: four small 3D worlds, each with three questions that make the child look
// again rather than guess. Text is bilingual; every scene is generated in code, so there are
// no image assets to download and nothing leaves the device.
import { L } from '../core/i18n.js';

export const LAB_SCENES = ['shapes', 'water', 'earth', 'plant'];

export const LABS = [
  {
    id: 'labs.shapes', strand: 'm', grade: 4, scene: 'shapes', skill: null, icon: '🧊',
    title: L('Shapes you can turn', 'घुमाकर देखो आकार'),
    blurb: L('Turn a cube, a cuboid, a cylinder, a cone and a sphere. Count the faces, edges and corners.',
      'घन, घनाभ, बेलन, शंकु और गोला घुमाओ। फलक, किनारे और कोने गिनो।'),
    notice: L('Drag to turn the shape. Look at the top, the side and the base before you answer.',
      'आकार घुमाने के लिए खींचो। उत्तर देने से पहले ऊपर, किनारे और तल को देखो।'),
    alt: L('A large blue solid shape resting on a pale green ground, slowly turning.',
      'हल्की हरी ज़मीन पर रखा एक बड़ा नीला ठोस आकार, धीरे-धीरे घूमता हुआ।'),
    control: L('Choose a shape', 'आकार चुनो'),
    steps: [
      {
        q: L('How many flat faces does a cube have?', 'घन के कितने सपाट फलक होते हैं?'),
        options: [L('4', '4'), L('6', '6'), L('8', '8')], answer: 1,
        hint: L('Count the top, the bottom and the four sides.', 'ऊपर, नीचे और चारों किनारों को गिनो।'),
        why: L('A cube has 6 square faces, 12 edges and 8 corners. A dice is a cube.',
          'घन के 6 वर्गाकार फलक, 12 किनारे और 8 कोने होते हैं। लूडो का पासा घन है।'),
      },
      {
        q: L('Which shape has two flat circular faces and one curved surface?',
          'किस आकार के दो सपाट वृत्ताकार फलक और एक घुमावदार सतह होती है?'),
        options: [L('Cone', 'शंकु'), L('Sphere', 'गोला'), L('Cylinder', 'बेलन')], answer: 2,
        hint: L('A tin of sweets and a water pipe have this shape.', 'मिठाई का डिब्बा और पानी का पाइप इसी आकार के होते हैं।'),
        why: L('A cylinder has a circle at each end and a curved surface between them — like a tin or a pipe.',
          'बेलन के दोनों सिरों पर वृत्त और बीच में घुमावदार सतह होती है — जैसे डिब्बा या पाइप।'),
      },
      {
        q: L('How many corners (vertices) does a cone have?', 'शंकु के कितने कोने होते हैं?'),
        options: [L('0', '0'), L('1', '1'), L('2', '2')], answer: 1,
        hint: L('See the pointed top, and the round base that has no corner.', 'नुकीला ऊपर देखो, और गोल तल जिसका कोई कोना नहीं।'),
        why: L('A cone has one vertex at its tip. Its base is a circle, so it adds no corners.',
          'शंकु का एक कोना उसकी नोक पर होता है। आधार वृत्त है, इसलिए वहाँ कोई कोना नहीं।'),
      },
    ],
  },
  {
    id: 'labs.water', strand: 's', grade: 4, scene: 'water', skill: 's.water_air', icon: '💧',
    title: L('Water goes round', 'पानी का चक्कर'),
    blurb: L('Warm the pond, watch the water rise, gather as clouds and return as rain.',
      'तालाब को गरम करो, पानी को ऊपर उठते, बादल बनते और बारिश बनकर लौटते देखो।'),
    notice: L('Move the warmth slider slowly. Watch the pond, the sky and the rain together.',
      'गर्मी का स्लाइडर धीरे-धीरे चलाओ। तालाब, आसमान और बारिश को साथ-साथ देखो।'),
    alt: L('A small landscape with a pond, two hills, a bright Sun and clouds. Rain falls when the warmth is raised.',
      'एक छोटा दृश्य: तालाब, दो पहाड़ियाँ, चमकता सूरज और बादल। गर्मी बढ़ाने पर बारिश होती है।'),
    control: L('Warmth from the Sun', 'सूरज की गर्मी'),
    steps: [
      {
        q: L('What makes water rise from the pond into the air?', 'तालाब से पानी हवा में ऊपर क्यों उठता है?'),
        options: [L('The Sun\'s heat', 'सूरज की गर्मी'), L('The Moon\'s light', 'चाँद की रोशनी'), L('The wind alone', 'केवल हवा')], answer: 0,
        hint: L('Raise the warmth slider and watch the pale droplets rise.', 'गर्मी बढ़ाओ और हल्की बूँदों को ऊपर जाते देखो।'),
        why: L('Heat from the Sun turns water into vapour. This is evaporation, and the vapour is invisible.',
          'सूरज की गर्मी पानी को वाष्प में बदलती है। इसे वाष्पीकरण कहते हैं; वाष्प दिखती नहीं।'),
      },
      {
        q: L('What are clouds made of?', 'बादल किससे बने होते हैं?'),
        options: [L('Tiny water droplets and ice', 'छोटी-छोटी पानी की बूँदें और बर्फ'), L('Cotton', 'रुई'), L('Smoke', 'धुआँ')], answer: 0,
        hint: L('When vapour cools high up, it turns back into tiny droplets.', 'ऊपर ठंडा होकर वाष्प फिर छोटी बूँदों में बदल जाती है।'),
        why: L('Cooled vapour condenses into tiny droplets or ice crystals. Millions together look white — a cloud.',
          'ठंडी वाष्प छोटी बूँदों या बर्फ के कणों में बदल जाती है। लाखों मिलकर सफ़ेद बादल बनाते हैं।'),
      },
      {
        q: L('Rain, river, sea, clouds, rain again. What is this going round called?',
          'बारिश, नदी, समुद्र, बादल, फिर बारिश। इस चक्कर को क्या कहते हैं?'),
        options: [L('The water cycle', 'जल चक्र'), L('The food chain', 'खाद्य शृंखला'), L('Day and night', 'दिन और रात')], answer: 0,
        hint: L('The same water keeps moving between land, air and sea.', 'वही पानी ज़मीन, हवा और समुद्र के बीच घूमता रहता है।'),
        why: L('This endless movement is the water cycle. The water on Earth today is the same water the rivers have always carried.',
          'यह अंतहीन चक्कर जल चक्र है। आज का पानी वही है जो नदियाँ सदा से बहाती आई हैं।'),
      },
    ],
  },
  {
    id: 'labs.earth', strand: 's', grade: 5, scene: 'earth', skill: 's.space', icon: '🌍',
    title: L('Day and night', 'दिन और रात'),
    blurb: L('Turn the Earth beside the Sun. See why one side is lit while the other is dark.',
      'सूरज के पास पृथ्वी घुमाओ। देखो कि एक तरफ़ उजाला और दूसरी तरफ़ अंधेरा क्यों है।'),
    notice: L('Move the time slider through 24 hours. Find India, then find the dark side.',
      'समय स्लाइडर को 24 घंटे तक चलाओ। भारत को ढूँढो, फिर अंधेरी तरफ़ देखो।'),
    alt: L('A blue Earth with green land turning beside a bright Sun. The side facing away from the Sun is dark.',
      'चमकते सूरज के पास घूमती नीली पृथ्वी, जिस पर हरी ज़मीन है। सूरज से दूर वाला भाग अंधेरा रहता है।'),
    control: L('Time of day', 'दिन का समय'),
    steps: [
      {
        q: L('Why do we have day and night?', 'दिन और रात क्यों होते हैं?'),
        options: [L('The Earth spins on its axis', 'पृथ्वी अपनी धुरी पर घूमती है'), L('The Sun goes round the Earth', 'सूरज पृथ्वी के चारों ओर घूमता है'), L('Clouds cover the Sun', 'बादल सूरज को ढक लेते हैं')], answer: 0,
        hint: L('Watch the Earth turn: the lit half changes, and so does the dark half.',
          'पृथ्वी को घूमते देखो: उजली आधी और अंधेरी आधी बदलती रहती है।'),
        why: L('The Earth spins once about every 24 hours. The half facing the Sun has day; the other half has night.',
          'पृथ्वी लगभग हर 24 घंटे में एक बार घूमती है। सूरज की ओर वाला आधा भाग दिन, दूसरा आधा रात।'),
      },
      {
        q: L('About how long does one spin of the Earth take?', 'पृथ्वी का एक चक्कर लगभग कितने समय में पूरा होता है?'),
        options: [L('12 hours', '12 घंटे'), L('24 hours', '24 घंटे'), L('One month', 'एक महीना')], answer: 1,
        hint: L('From one sunrise to the next is one day.', 'एक सूर्योदय से दूसरे सूर्योदय तक एक दिन होता है।'),
        why: L('One spin takes about 24 hours — one day. The Earth also goes round the Sun, but that takes a year.',
          'एक चक्कर में लगभग 24 घंटे — एक दिन लगता है। पृथ्वी सूरज का चक्कर भी लगाती है, पर उसमें एक वर्ष लगता है।'),
      },
      {
        q: L('When it is noon in India, what is the side of the Earth facing away from the Sun doing?',
          'जब भारत में दोपहर है, तब सूरज से दूर वाला पृथ्वी का भाग क्या कर रहा होता है?'),
        options: [L('Having night', 'रात का समय'), L('Having noon too', 'वहाँ भी दोपहर'), L('Standing still', 'स्थिर खड़ा')], answer: 0,
        hint: L('Only one half can face the Sun at a time.', 'एक समय में केवल एक आधा भाग सूरज की ओर हो सकता है।'),
        why: L('At any moment half the Earth is lit and half is dark. India\'s noon is midnight on the opposite side.',
          'किसी भी समय पृथ्वी का आधा भाग उजला और आधा अंधेरा रहता है। भारत में दोपहर तो विपरीत दिशा में आधी रात है।'),
      },
    ],
  },
  {
    id: 'labs.plant', strand: 's', grade: 4, scene: 'plant', skill: 's.plants', icon: '🌱',
    title: L('Inside a plant', 'पौधे के भीतर'),
    blurb: L('Turn a potted plant and find the parts that make food, carry water and hold it up.',
      'गमले का पौधा घुमाओ और वे भाग ढूँढो जो भोजन बनाते हैं, पानी पहुँचाते हैं और पौधे को सँभालते हैं।'),
    notice: L('Use the part buttons to light up a leaf, the stem, the flower or the roots.',
      'भाग के बटन से पत्ती, तना, फूल या जड़ को चमकाओ।'),
    alt: L('A potted plant with a green stem, three leaves, a pink flower and brown roots inside the pot.',
      'गमले में लगा पौधा: हरा तना, तीन पत्तियाँ, गुलाबी फूल और गमले के भीतर भूरी जड़ें।'),
    control: L('Light up a part', 'किसी भाग को चमकाओ'),
    steps: [
      {
        q: L('Which part makes food using sunlight?', 'कौन-सा भाग धूप से भोजन बनाता है?'),
        options: [L('Root', 'जड़'), L('Leaf', 'पत्ती'), L('Flower', 'फूल')], answer: 1,
        hint: L('It is flat and green, and it faces the Sun.', 'यह चपटा और हरा होता है, और सूरज की ओर रहता है।'),
        why: L('Leaves make food from sunlight, water and air. This is photosynthesis, and it needs the green pigment chlorophyll.',
          'पत्तियाँ धूप, पानी और हवा से भोजन बनाती हैं। इसे प्रकाश संश्लेषण कहते हैं; इसके लिए हरा क्लोरोफ़िल चाहिए।'),
      },
      {
        q: L('Which part takes in water and minerals from the soil?', 'कौन-सा भाग मिट्टी से पानी और खनिज लेता है?'),
        options: [L('Root', 'जड़'), L('Stem', 'तना'), L('Leaf', 'पत्ती')], answer: 0,
        hint: L('It grows down into the soil, away from the light.', 'यह मिट्टी में नीचे की ओर बढ़ता है, रोशनी से दूर।'),
        why: L('Roots hold the plant in the soil and absorb water and minerals through tiny root hairs.',
          'जड़ें पौधे को मिट्टी में थामे रखती हैं और छोटे-छोटे रोमों से पानी व खनिज सोखती हैं।'),
      },
      {
        q: L('Which part carries water from the roots up to the leaves?', 'कौन-सा भाग जड़ों से पानी ऊपर पत्तियों तक पहुँचाता है?'),
        options: [L('Stem', 'तना'), L('Flower', 'फूल'), L('Leaf', 'पत्ती')], answer: 0,
        hint: L('It is the tall pipe between the roots and the leaves.', 'यह जड़ों और पत्तियों के बीच की लंबी नली है।'),
        why: L('The stem carries water and minerals upward and holds the leaves up to the light.',
          'तना पानी और खनिज ऊपर पहुँचाता है और पत्तियों को रोशनी में थामे रखता है।'),
      },
    ],
  },
];
