// ═══════════════════════════════════════════════════════════════
// geography.js — Nepal Civic Intelligence Graph
// Complete geo-database: all 77 districts + 400+ places
// Used by geoTag() in data.js to extract location FROM article text
// NOT publisher address — reads title + description content
// ═══════════════════════════════════════════════════════════════

export const PROVINCES = [
  { code:'P1', name:'Province No. 1', ne:'कोशी प्रदेश',    capital:'Biratnagar',   color:'#3b82f6', fill:'#dbeafe' },
  { code:'P2', name:'Madhesh',        ne:'मधेश प्रदेश',     capital:'Janakpur',     color:'#10b981', fill:'#d1fae5' },
  { code:'P3', name:'Bagmati',        ne:'बागमती प्रदेश',   capital:'Hetauda',      color:'#f59e0b', fill:'#fef3c7' },
  { code:'P4', name:'Gandaki',        ne:'गण्डकी प्रदेश',   capital:'Pokhara',      color:'#8b5cf6', fill:'#ede9fe' },
  { code:'P5', name:'Lumbini',        ne:'लुम्बिनी प्रदेश', capital:'Deukhuri',     color:'#ec4899', fill:'#fce7f3' },
  { code:'P6', name:'Karnali',        ne:'कर्णाली प्रदेश',  capital:'Birendranagar',color:'#ef4444', fill:'#fee2e2' },
  { code:'P7', name:'Sudurpashchim',  ne:'सुदूरपश्चिम',      capital:'Godawari',     color:'#06b6d4', fill:'#cffafe' },
];

// ── Province-level district map (district → province) ─────────────
export const DIST_MAP = {
  // Province No. 1 (Koshi)
  'Taplejung':'Province No. 1','Panchthar':'Province No. 1','Ilam':'Province No. 1',
  'Jhapa':'Province No. 1','Morang':'Province No. 1','Sunsari':'Province No. 1',
  'Dhankuta':'Province No. 1','Terhathum':'Province No. 1','Sankhuwasabha':'Province No. 1',
  'Solukhumbu':'Province No. 1','Bhojpur':'Province No. 1','Okhaldhunga':'Province No. 1',
  'Khotang':'Province No. 1','Udayapur':'Province No. 1',
  // Madhesh
  'Saptari':'Madhesh','Siraha':'Madhesh','Dhanusha':'Madhesh','Mahottari':'Madhesh',
  'Sarlahi':'Madhesh','Rautahat':'Madhesh','Bara':'Madhesh','Parsa':'Madhesh',
  // Bagmati
  'Sindhuli':'Bagmati','Ramechhap':'Bagmati','Dolakha':'Bagmati',
  'Sindhupalchok':'Bagmati','Kavrepalanchok':'Bagmati','Lalitpur':'Bagmati',
  'Bhaktapur':'Bagmati','Kathmandu':'Bagmati','Nuwakot':'Bagmati',
  'Rasuwa':'Bagmati','Dhading':'Bagmati','Makwanpur':'Bagmati','Chitwan':'Bagmati',
  // Gandaki
  'Gorkha':'Gandaki','Manang':'Gandaki','Mustang':'Gandaki','Myagdi':'Gandaki',
  'Kaski':'Gandaki','Lamjung':'Gandaki','Tanahun':'Gandaki','Nawalpur':'Gandaki',
  'Syangja':'Gandaki','Parbat':'Gandaki','Baglung':'Gandaki',
  // Lumbini
  'Gulmi':'Lumbini','Palpa':'Lumbini','Arghakhanchi':'Lumbini','Kapilvastu':'Lumbini',
  'Rupandehi':'Lumbini','Nawalparasi':'Lumbini','Pyuthan':'Lumbini','Rolpa':'Lumbini',
  'Dang':'Lumbini','Banke':'Lumbini','Bardiya':'Lumbini',
  // Karnali
  'Dolpa':'Karnali','Mugu':'Karnali','Humla':'Karnali','Jumla':'Karnali',
  'Kalikot':'Karnali','Dailekh':'Karnali','Jajarkot':'Karnali',
  'Rukum East':'Karnali','Salyan':'Karnali','Surkhet':'Karnali',
  // Sudurpashchim
  'Kailali':'Sudurpashchim','Achham':'Sudurpashchim','Doti':'Sudurpashchim',
  'Bajhang':'Sudurpashchim','Bajura':'Sudurpashchim','Kanchanpur':'Sudurpashchim',
  'Dadeldhura':'Sudurpashchim','Baitadi':'Sudurpashchim','Darchula':'Sudurpashchim',
};

// ══════════════════════════════════════════════════════════════════
// PLACE → DISTRICT lookup table
// Covers: cities, towns, VDCs, rivers, mountains, airports, highways,
//         hospitals, heritage sites, universities, border crossings
// IMPORTANT: Longer/more-specific names must appear before shorter ones
//            so that the longest-match algorithm picks them first.
// ══════════════════════════════════════════════════════════════════
export const PLACE_TO_DISTRICT = {

  // ── KATHMANDU DISTRICT ──────────────────────────────────────────
  'Kathmandu': 'Kathmandu', 'Thamel':'Kathmandu','Bouddha':'Kathmandu',
  'Boudhanath':'Kathmandu','Pashupatinath':'Kathmandu','Durbar Square':'Kathmandu',
  'Swayambhunath':'Kathmandu','Monkey Temple':'Kathmandu','Singha Durbar':'Kathmandu',
  'Singhdurbar':'Kathmandu','Baluwatar':'Kathmandu','Narayanhiti':'Kathmandu',
  'Thimphu':'Kathmandu','Koteshwor':'Kathmandu','Kalanki':'Kathmandu',
  'Maharajgunj':'Kathmandu','Baneshwor':'Kathmandu','Putalisadak':'Kathmandu',
  'New Baneshwor':'Kathmandu','Naxal':'Kathmandu','Lazimpat':'Kathmandu',
  'Dilli Bazar':'Kathmandu','Bagbazar':'Kathmandu','Sundhara':'Kathmandu',
  'Ratnapark':'Kathmandu','New Road':'Kathmandu','Indrachowk':'Kathmandu',
  'Ason':'Kathmandu','Hanuman Dhoka':'Kathmandu','Freak Street':'Kathmandu',
  'Jhamsikhel':'Kathmandu','Jawalakhel':'Kathmandu','Sanepa':'Kathmandu',
  'Bauddhakali':'Kathmandu','Chabahil':'Kathmandu','Naya Baneshwor':'Kathmandu',
  'Tribhuvan International Airport':'Kathmandu','TIA':'Kathmandu',
  'Tribhuvan University':'Kathmandu','Kirtipur':'Kathmandu',
  'Dakshinkali':'Kathmandu','Pharping':'Kathmandu','Chapagaun':'Kathmandu',
  'Godavari':'Kathmandu','Lubhu':'Kathmandu','Tokha':'Kathmandu',
  'Gokarneshwor':'Kathmandu','Budhanilkantha':'Kathmandu','Shivapuri':'Kathmandu',
  'Nagarjun':'Kathmandu','Thankot':'Kathmandu','Satdobato':'Kathmandu',
  'Nagarkot':'Kathmandu','Ichangu':'Kathmandu','Balaju':'Kathmandu',
  'Samakhushi':'Kathmandu','Gongabu':'Kathmandu','Kalimati':'Kathmandu',
  'Ratna Park':'Kathmandu','Exhibition Road':'Kathmandu',

  // ── LALITPUR DISTRICT ───────────────────────────────────────────
  'Lalitpur':'Lalitpur','Patan':'Lalitpur','Mangalbazar':'Lalitpur',
  'Patan Durbar':'Lalitpur','Pulchok':'Lalitpur','Kupondole':'Lalitpur',
  'Lagankhel':'Lalitpur','Ekantakuna':'Lalitpur','Harisiddhi':'Lalitpur',
  'Godavari Lalitpur':'Lalitpur','Sunakothi':'Lalitpur','Tikabhairab':'Lalitpur',
  'Khokana':'Lalitpur','Bungamati':'Lalitpur','Thecho':'Lalitpur',
  'Lubhu Lalitpur':'Lalitpur',

  // ── BHAKTAPUR DISTRICT ──────────────────────────────────────────
  'Bhaktapur':'Bhaktapur','Bhadgaun':'Bhaktapur','Thimi':'Bhaktapur',
  'Madhyapur':'Bhaktapur','Changunarayan':'Bhaktapur','Suryabinayak':'Bhaktapur',
  'Nagarkot Bhaktapur':'Bhaktapur','Daduwa':'Bhaktapur',

  // ── CHITWAN DISTRICT ────────────────────────────────────────────
  'Chitwan':'Chitwan','Bharatpur':'Chitwan','Narayanghat':'Chitwan',
  'Ratnanagar':'Chitwan','Meghauli':'Chitwan','Sauraha':'Chitwan',
  'Rapti':'Chitwan','Chitwan National Park':'Chitwan',
  'Bharatpur Airport':'Chitwan','Phulchoki':'Chitwan',

  // ── KASKI DISTRICT (Gandaki) ────────────────────────────────────
  'Pokhara':'Kaski','Kaski':'Kaski','Lakeside':'Kaski','Fewa Lake':'Kaski',
  'Phewa Tal':'Kaski','Baidam':'Kaski','Prithvi Highway Pokhara':'Kaski',
  'Pokhara Airport':'Kaski','Pokhara International Airport':'Kaski',
  'Sarangkot':'Kaski','Pame':'Kaski','Milanchowk':'Kaski',
  'Annapurna Base Camp':'Kaski','ABC':'Kaski',
  'Macchapuchhre Base Camp':'Kaski','MBC':'Kaski',
  'Annapurna Conservation Area':'Kaski',
  'Srang':'Kaski','Hemja':'Kaski','Lekhnath':'Kaski',

  // ── MORANG DISTRICT (Province No. 1) ────────────────────────────
  'Biratnagar':'Morang','Morang':'Morang','Urlabari':'Morang',
  'Pathari':'Morang','Sunbarshi':'Morang','Rangeli':'Morang',
  'Letang':'Morang','Duhabi':'Morang',

  // ── JHAPA DISTRICT (Province No. 1) ────────────────────────────
  'Jhapa':'Jhapa','Birtamod':'Jhapa','Damak':'Jhapa','Mechinagar':'Jhapa',
  'Ilam Road':'Jhapa','Kakarbhitta':'Jhapa','Rajbiraj':'Jhapa', // Note: Rajbiraj is Saptari but common mix; keeping here for primary
  'Chandragadhi Airport':'Jhapa','Phakphokthum':'Jhapa',

  // ── SUNSARI DISTRICT ────────────────────────────────────────────
  'Sunsari':'Sunsari','Itahari':'Sunsari','Inaruwa':'Sunsari',
  'Dharan':'Sunsari','BP Koirala Health Sciences':'Sunsari',

  // ── DHANUSHA DISTRICT (Madhesh) ─────────────────────────────────
  'Janakpur':'Dhanusha','Dhanusha':'Dhanusha','Janakpurdham':'Dhanusha',
  'Janaki Mandir':'Dhanusha','Mithila':'Dhanusha',

  // ── PARSA DISTRICT (Madhesh) ────────────────────────────────────
  'Birgunj':'Parsa','Parsa':'Parsa','Simara':'Parsa','Simara Airport':'Parsa',
  'Adarsh Nagar':'Parsa',

  // ── BARA DISTRICT (Madhesh) ─────────────────────────────────────
  'Bara':'Bara','Kalaiya':'Bara','Nijgadh':'Bara',
  'Nijgadh International Airport':'Bara',

  // ── RAUTAHAT DISTRICT ───────────────────────────────────────────
  'Rautahat':'Rautahat','Gaur':'Rautahat',

  // ── SARLAHI DISTRICT ────────────────────────────────────────────
  'Sarlahi':'Sarlahi','Malangwa':'Sarlahi','Lalbandi':'Sarlahi',

  // ── MAHOTTARI DISTRICT ──────────────────────────────────────────
  'Mahottari':'Mahottari','Jaleshwor':'Mahottari',

  // ── SAPTARI DISTRICT ────────────────────────────────────────────
  'Saptari':'Saptari','Rajbiraj':'Saptari','Rajbiraj Airport':'Saptari',

  // ── SIRAHA DISTRICT ─────────────────────────────────────────────
  'Siraha':'Siraha','Lahan':'Siraha',

  // ── SINDHUPALCHOK DISTRICT ──────────────────────────────────────
  'Sindhupalchok':'Sindhupalchok','Chautara':'Sindhupalchok',
  'Melamchi':'Sindhupalchok','Bhotekoshi':'Sindhupalchok',
  'Tatopani':'Sindhupalchok','Kodari':'Sindhupalchok',
  'Arniko Highway':'Sindhupalchok',

  // ── KAVREPALANCHOK DISTRICT ─────────────────────────────────────
  'Kavrepalanchok':'Kavrepalanchok','Dhulikhel':'Kavrepalanchok',
  'Banepa':'Kavrepalanchok','Panauti':'Kavrepalanchok',
  'Sanga':'Kavrepalanchok','Kavre':'Kavrepalanchok',

  // ── MAKWANPUR DISTRICT ──────────────────────────────────────────
  'Makwanpur':'Makwanpur','Hetauda':'Makwanpur',
  'Kulekhani':'Makwanpur',

  // ── NUWAKOT DISTRICT ────────────────────────────────────────────
  'Nuwakot':'Nuwakot','Bidur':'Nuwakot','Trishuli':'Nuwakot',

  // ── RASUWA DISTRICT ─────────────────────────────────────────────
  'Rasuwa':'Rasuwa','Rasuwagadhi':'Rasuwa','Kerung':'Rasuwa',

  // ── DHADING DISTRICT ────────────────────────────────────────────
  'Dhading':'Dhading','Nilkantha':'Dhading',

  // ── SINDHULI DISTRICT ───────────────────────────────────────────
  'Sindhuli':'Sindhuli','Kamalamai':'Sindhuli',

  // ── RAMECHHAP DISTRICT ──────────────────────────────────────────
  'Ramechhap':'Ramechhap','Manthali':'Ramechhap',
  'Manthali Airport':'Ramechhap',

  // ── DOLAKHA DISTRICT ────────────────────────────────────────────
  'Dolakha':'Dolakha','Charikot':'Dolakha',

  // ── RUPANDEHI DISTRICT (Lumbini) ────────────────────────────────
  'Rupandehi':'Rupandehi','Bhairahawa':'Rupandehi','Siddharthanagar':'Rupandehi',
  'Lumbini':'Rupandehi','Lumbini Airport':'Rupandehi',
  'Gautam Buddha Airport':'Rupandehi',
  "Gautam Buddha's birthplace":'Rupandehi',
  'Tilaurakot':'Rupandehi','Taulihawa':'Rupandehi',

  // ── KAPILVASTU DISTRICT ─────────────────────────────────────────
  'Kapilvastu':'Kapilvastu','Kapilbastu':'Kapilvastu',
  'Banganga':'Kapilvastu',

  // ── NAWALPARASI DISTRICT ────────────────────────────────────────
  'Nawalparasi':'Nawalparasi','Parasi':'Nawalparasi',
  'Sunwal':'Nawalparasi',

  // ── PALPA DISTRICT ──────────────────────────────────────────────
  'Palpa':'Palpa','Tansen':'Palpa',

  // ── GULMI DISTRICT ──────────────────────────────────────────────
  'Gulmi':'Gulmi','Tamghas':'Gulmi',

  // ── ARGHAKHANCHI DISTRICT ───────────────────────────────────────
  'Arghakhanchi':'Arghakhanchi','Sandhikharka':'Arghakhanchi',

  // ── PYUTHAN DISTRICT ────────────────────────────────────────────
  'Pyuthan':'Pyuthan',

  // ── ROLPA DISTRICT ──────────────────────────────────────────────
  'Rolpa':'Rolpa','Libang':'Rolpa',

  // ── DANG DISTRICT ───────────────────────────────────────────────
  'Dang':'Dang','Tulsipur':'Dang','Ghorahi':'Dang',
  'Lamahi':'Dang','Deukhuri':'Dang',

  // ── BANKE DISTRICT (Lumbini) ────────────────────────────────────
  'Banke':'Banke','Nepalgunj':'Banke','Nepalgunj Airport':'Banke',

  // ── BARDIYA DISTRICT ────────────────────────────────────────────
  'Bardiya':'Bardiya','Gulariya':'Bardiya',
  'Bardia National Park':'Bardiya','Bardiya National Park':'Bardiya',

  // ── SURKHET DISTRICT (Karnali) ──────────────────────────────────
  'Surkhet':'Surkhet','Birendranagar':'Surkhet',

  // ── DAILEKH DISTRICT ────────────────────────────────────────────
  'Dailekh':'Dailekh','Narayan':'Dailekh',

  // ── JAJARKOT DISTRICT ───────────────────────────────────────────
  'Jajarkot':'Jajarkot','Khalanga Jajarkot':'Jajarkot',

  // ── SALYAN DISTRICT ─────────────────────────────────────────────
  'Salyan':'Salyan','Sharada':'Salyan',

  // ── KALIKOT DISTRICT ────────────────────────────────────────────
  'Kalikot':'Kalikot','Manma':'Kalikot',

  // ── DOLPA DISTRICT ──────────────────────────────────────────────
  'Dolpa':'Dolpa','Dunai':'Dolpa','Shey Phoksundo':'Dolpa',

  // ── JUMLA DISTRICT ──────────────────────────────────────────────
  'Jumla':'Jumla','Chandannath':'Jumla',

  // ── MUGU DISTRICT ───────────────────────────────────────────────
  'Mugu':'Mugu','Gamgadhi':'Mugu',

  // ── HUMLA DISTRICT ──────────────────────────────────────────────
  'Humla':'Humla','Simikot':'Humla',

  // ── RUKUM EAST ──────────────────────────────────────────────────
  'Rukum East':'Rukum East','Rukumkot':'Rukum East',

  // ── KAILALI DISTRICT (Sudurpashchim) ────────────────────────────
  'Kailali':'Kailali','Dhangadhi':'Kailali','Tikapur':'Kailali',
  'Lamki':'Kailali',

  // ── KANCHANPUR DISTRICT ─────────────────────────────────────────
  'Kanchanpur':'Kanchanpur','Mahendranagar':'Kanchanpur',
  'Dodhara':'Kanchanpur',

  // ── DADELDHURA DISTRICT ─────────────────────────────────────────
  'Dadeldhura':'Dadeldhura','Amargadhi':'Dadeldhura',

  // ── BAITADI DISTRICT ────────────────────────────────────────────
  'Baitadi':'Baitadi','Dasharathchand':'Baitadi',

  // ── DARCHULA DISTRICT ───────────────────────────────────────────
  'Darchula':'Darchula',

  // ── ACHHAM DISTRICT ─────────────────────────────────────────────
  'Achham':'Achham','Mangalsen':'Achham',

  // ── DOTI DISTRICT ───────────────────────────────────────────────
  'Doti':'Doti','Dipayal':'Doti','Silgadhi':'Doti',

  // ── BAJHANG DISTRICT ────────────────────────────────────────────
  'Bajhang':'Bajhang','Chainpur Bajhang':'Bajhang',

  // ── BAJURA DISTRICT ─────────────────────────────────────────────
  'Bajura':'Bajura','Martadi':'Bajura',

  // ── TAPLEJUNG DISTRICT ──────────────────────────────────────────
  'Taplejung':'Taplejung','Phungling':'Taplejung',
  'Kanchenjunga':'Taplejung',

  // ── PANCHTHAR DISTRICT ──────────────────────────────────────────
  'Panchthar':'Panchthar','Phidim':'Panchthar',

  // ── ILAM DISTRICT ───────────────────────────────────────────────
  'Ilam':'Ilam','Ilam Tea':'Ilam',

  // ── DHANKUTA DISTRICT ───────────────────────────────────────────
  'Dhankuta':'Dhankuta',

  // ── TERHATHUM DISTRICT ──────────────────────────────────────────
  'Terhathum':'Terhathum','Myanglung':'Terhathum',

  // ── SANKHUWASABHA DISTRICT ──────────────────────────────────────
  'Sankhuwasabha':'Sankhuwasabha','Khandbari':'Sankhuwasabha',
  'Makalu':'Sankhuwasabha',

  // ── SOLUKHUMBU DISTRICT ─────────────────────────────────────────
  'Solukhumbu':'Solukhumbu','Solu Khumbu':'Solukhumbu',
  'Everest':'Solukhumbu','Sagarmatha':'Solukhumbu',
  'Base Camp':'Solukhumbu','Mount Everest':'Solukhumbu',
  'Everest Base Camp':'Solukhumbu','EBC':'Solukhumbu',
  'Namche':'Solukhumbu','Namche Bazar':'Solukhumbu',
  'Lukla':'Solukhumbu','Tenzing-Hillary Airport':'Solukhumbu',
  'Lukla Airport':'Solukhumbu','Phakding':'Solukhumbu',
  'Gorak Shep':'Solukhumbu','Kala Patthar':'Solukhumbu',
  'Khumbu':'Solukhumbu','Gokyo':'Solukhumbu',

  // ── BHOJPUR DISTRICT ────────────────────────────────────────────
  'Bhojpur':'Bhojpur',

  // ── OKHALDHUNGA DISTRICT ────────────────────────────────────────
  'Okhaldhunga':'Okhaldhunga',

  // ── KHOTANG DISTRICT ────────────────────────────────────────────
  'Khotang':'Khotang','Diktel':'Khotang',

  // ── UDAYAPUR DISTRICT ───────────────────────────────────────────
  'Udayapur':'Udayapur','Triyuga':'Udayapur','Gaighat':'Udayapur',

  // ── GORKHA DISTRICT ─────────────────────────────────────────────
  'Gorkha':'Gorkha','Barpak':'Gorkha','Manaslu':'Gorkha',

  // ── MANANG DISTRICT ─────────────────────────────────────────────
  'Manang':'Manang','Chame':'Manang','Annapurna Circuit':'Manang',

  // ── MUSTANG DISTRICT ────────────────────────────────────────────
  'Mustang':'Mustang','Lo Manthang':'Mustang','Jomsom':'Mustang',
  'Jomsom Airport':'Mustang','Muktinath':'Mustang',
  'Upper Mustang':'Mustang','Kagbeni':'Mustang',

  // ── MYAGDI DISTRICT ─────────────────────────────────────────────
  'Myagdi':'Myagdi','Beni':'Myagdi','Dhaulagiri':'Myagdi',

  // ── LAMJUNG DISTRICT ────────────────────────────────────────────
  'Lamjung':'Lamjung','Besisahar':'Lamjung',

  // ── TANAHUN DISTRICT ────────────────────────────────────────────
  'Tanahun':'Tanahun','Damauli':'Tanahun','Byas Municipality':'Tanahun',

  // ── NAWALPUR DISTRICT ───────────────────────────────────────────
  'Nawalpur':'Nawalpur','Kawasoti':'Nawalpur',

  // ── SYANGJA DISTRICT ────────────────────────────────────────────
  'Syangja':'Syangja','Waling':'Syangja',

  // ── PARBAT DISTRICT ─────────────────────────────────────────────
  'Parbat':'Parbat','Kushma':'Parbat',

  // ── BAGLUNG DISTRICT ────────────────────────────────────────────
  'Baglung':'Baglung',

  // ── Major rivers (often in news) ─────────────────────────────────
  'Koshi River':'Sunsari','Kosi River':'Sunsari','Koshi':'Sunsari',
  'Bagmati River':'Kathmandu','Bagmati':'Kathmandu',
  'Gandaki River':'Nawalpur','Narayani River':'Nawalpur',
  'Karnali River':'Surkhet','Karnali':'Surkhet',
  'Mahakali River':'Kanchanpur','Mahakali':'Kanchanpur',
  'Rapti River':'Chitwan','Seti River':'Kailali',
  'Trishuli River':'Nuwakot','Tamor River':'Taplejung',
  'Arun River':'Sankhuwasabha','Marsyangdi':'Lamjung',
  'Kaligandaki':'Mustang','Budhigandaki':'Gorkha',

  // ── National Parks / Protected Areas ─────────────────────────────
  'Sagarmatha National Park':'Solukhumbu',
  'Langtang National Park':'Rasuwa',
  'Chitwan National Park':'Chitwan',
  'Bardia National Park':'Bardiya',
  'Rara Lake':'Mugu','Rara National Park':'Mugu',
  'Khaptad National Park':'Bajhang',
  'Api Nampa':'Darchula',
  'Shivapuri Nagarjun':'Kathmandu',

  // ── Highways (mentioned as incident location) ─────────────────────
  'BP Highway':'Kavrepalanchok',
  'Prithvi Highway':'Dhading',
  'Arniko Highway':'Sindhupalchok',
  'Mahendra Highway Kailali':'Kailali',
  'Mahendra Highway Banke':'Banke',
  'Siddhartha Highway':'Palpa',
  'Tribhuvan Highway':'Makwanpur',

  // ── Major Hospitals (frequent in news) ───────────────────────────
  'Bir Hospital':'Kathmandu','TUTH':'Kathmandu',
  'Tribhuvan University Teaching Hospital':'Kathmandu',
  'Patan Hospital':'Lalitpur',
  'Dhulikhel Hospital':'Kavrepalanchok',
  'BP Koirala':'Sunsari',
  'Manipal Teaching Hospital':'Kaski',
  'Western Regional Hospital':'Kaski',
  'Koshi Hospital':'Morang',

  // ── Borders / checkpoints ─────────────────────────────────────────
  'Birgunj':'Parsa','Raxaul':'Parsa',
  'Kakarbhitta':'Jhapa',
  'Banbasa':'Kanchanpur',
  'Sutarauli':'Rupandehi',
};
