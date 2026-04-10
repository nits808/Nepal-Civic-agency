export const EXPLORER_CASES = [
  {
    id: 'c1',
    title: '100 KG Gold Smuggling Case',
    summary: 'A major investigation involving the Tribhuvan International Airport customs where approximately 100 kg of gold was smuggled hidden in motorcycle brake shoes. Exposing transnational smuggling syndicates and alleged political complicity.',
    keywords: ['gold smuggling', '100 kg', 'sun kanda', 'brake shoe', 'airport customs', 'gold scam'],
    timeline: [
      { date: '2023-07-18', text: 'DRI seizes roughly 100 kg of gold outside TIA customs hidden inside brake shoes.' },
      { date: '2023-08-06', text: 'Central Investigation Bureau (CIB) takes over the investigation from DRI.' },
      { date: '2023-09-17', text: 'Government forms a high-level probe commission to investigate the smuggling rings.' },
      { date: '2024-03-14', text: 'Probe commission submits its report recommending action against several individuals, including high-profile leaders.' }
    ]
  },
  {
    id: 'c2',
    title: 'Fake Bhutanese Refugee Scam',
    summary: 'A massive racket involving high-profile political figures and bureaucrats who extorted millions from Nepali citizens by promising to send them to the US by falsifying their identities as Bhutanese refugees.',
    keywords: ['bhutanese refugee', 'refugee scam', 'bal krishna khand', 'top bahadur', 'fake refugee'],
    timeline: [
      { date: '2023-03-26', text: 'Arrest of key middlemen initiates the exposure of the scam.' },
      { date: '2023-05-10', text: 'Former Home Minister Bal Krishna Khand arrested.' },
      { date: '2023-05-14', text: 'Top UML leader and former Deputy PM Top Bahadur Rayamajhi arrested.' },
      { date: '2023-12-01', text: 'Patan High Court passes an order regarding the bail and detention of the accused.' }
    ]
  },
  {
    id: 'c3',
    title: 'Cooperative Funds Embezzlement Crisis',
    summary: 'Multiple savings and credit cooperatives across the country faced severe liquidity crises due to the embezzlement of depositors funds by operators, triggering massive public outcry.',
    keywords: ['cooperative', 'sahakari', 'embezzlement', 'lamichhane', 'gb rai', 'depositors'],
    timeline: [
      { date: '2023-10-15', text: 'Protests by cooperative victims intensify across Kathmandu demanding return of savings.' },
      { date: '2024-03-01', text: 'Police issue interpol notices for absconding cooperative directors.' },
      { date: '2024-05-28', text: 'Parliamentary Probe Committee officially formed to investigate the crisis following opposition demands.' },
      { date: '2024-09-00', text: 'Parliamentary Committee submits final report recommending prosecution of implicated officials.' }
    ]
  }
];

export const EXPLORER_POLICIES = {
  domestic: [
    { title: 'Digital Nepal Framework 2026-2030', ministry: 'MoICT', status: 'implementing', progress: 35, desc: 'Digital transformation across 8 domains targeting e-governance and digital literacy.' },
    { title: 'National Health Insurance Expansion', ministry: 'MoHP', status: 'approved', progress: 60, desc: 'Expanding health coverage to marginalized communities across all 77 districts with digitized claim settlements.' },
    { title: 'Clean Energy Act 2026', ministry: 'MoEWRI', status: 'in committee', progress: 20, desc: 'Transitioning to EV subsidies, enforcing net-zero timelines, and pushing 100% renewable grid policies.' },
    { title: 'Agricultural Modernization Plan', ministry: 'MoALD', status: 'implementing', progress: 45, desc: 'Subsidizing hybrid seeds, mechanized farming equipment, and modern fertilizers to boost local yield.' },
    { title: 'Federal Civil Service Act', ministry: 'MoFAGA', status: 'in committee', progress: 15, desc: 'Defining the jurisdiction, deployment, and integration of civil servants across three tiers of government.' }
  ],
  foreign: [
    { title: 'Nepal-India Energy Trade Pact', ministry: 'MoFA / MoEWRI', status: 'implementing', progress: 80, desc: 'Bilateral agreement to export 10,000 MW of electricity to India over 10 years, unlocking hydro potential.' },
    { title: 'Belt and Road Initiative (BRI) Agreements', ministry: 'MoFA', status: 'ongoing', progress: 30, desc: 'Negotiations regarding project funding modalities (grants vs soft loans) for core infrastructure projects.' },
    { title: 'Millennium Challenge Corporation (MCC)', ministry: 'MoF', status: 'implementing', progress: 40, desc: 'Executing the cross-border transmission line and road upgrade projects post parliamentary ratification.' },
    { title: 'BIMSTEC Trade Corridors', ministry: 'MoFA', status: 'planning', progress: 15, desc: 'Enhancing regional connectivity, grid sharing, and removing non-tariff barriers among member nations.' }
  ]
};

export const EXPLORER_HISTORY = [
  {
    agency: 'Nepal Army',
    color: '#166534',
    events: [
      { year: '1958', title: 'First Peacekeeping Mission', text: 'Nepal Army deployed under UNOGIL in Lebanon. Today, Nepal is one of the largest troop contributors to the UN.' },
      { year: '2001', title: 'Counter-Insurgency Deployment', text: 'Army mobilized for internal security during the deepest period of the Maoist insurgency.' },
      { year: '2015', title: 'Operation Sankat Mochan', text: 'Massive disaster rescue operation post-Gorkha Earthquake, extracting over 10,000 casualties and opening transit routes.' },
      { year: '2017', title: 'Kathmandu-Terai Expressway', text: 'Army handed responsibility to construct the strategic fast-track highway linking the capital to the plains.' }
    ]
  },
  {
    agency: 'Nepal Police',
    color: '#1e3a8a',
    events: [
      { year: '1955', title: 'Police Act Established', text: 'Formal establishment of the modern Nepal Police under the Police Act 2012 BS.' },
      { year: '2008', title: 'Central Investigation Bureau', text: 'CIB formed to handle specialized, complex, and transnational criminal investigations.' },
      { year: '2016', title: 'Cyber Bureau Establishment', text: 'Dedicated cyber bureau created to tackle rapidly rising digital and financial cyber crimes.' },
      { year: '2023', title: 'Operation Gold Bust', text: 'Executed coordinated raids breaking down massive transnational gold and human smuggling rings.' }
    ]
  },
  {
    agency: 'Armed Police Force (APF)',
    color: '#b91c1c',
    events: [
      { year: '2001', title: 'Establishment of APF', text: 'Formed as a paramilitary force to tackle armed insurrection, border security, and protect vital installations.' },
      { year: '2015', title: 'Earthquake Rescue & Relief', text: 'Deployed extensively during the 2015 earthquake for crowd management, VIP security, and heavy rescue operations.' },
      { year: '2020', title: 'Border Outpost Expansion', text: 'Significantly scaled up Border Outposts (BOPs) along the southern and northern borders for territorial defense.' }
    ]
  },
  {
    agency: 'Government of Nepal',
    color: '#8b5cf6',
    events: [
      { year: '2006', title: 'Comprehensive Peace Accord', text: 'Ending the 10-year armed conflict and beginning the peace process.' },
      { year: '2008', title: 'Republic Proclaimed', text: 'First sitting of the Constituent Assembly officially abolishes the monarchy, declaring Nepal a federal democratic republic.' },
      { year: '2015', title: 'New Constitution Promulgated', text: 'Modern constitution drafted by elected representatives adopted, institutionalizing federalism.' },
      { year: '2020', title: 'New Political Map Published', text: 'Official map incorporating Limpiyadhura, Lipulekh, and Kalapani unanimously passed by the parliament.' }
    ]
  }
];
