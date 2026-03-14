// TODO: Replace with GDELT API polling (15min intervals)
// TODO: Replace with WAM/GulfNews RSS feed parsing

export const intelEvents = [
  {
    id: 1,
    type: 'conflict',
    severity: 'critical',
    source: 'NCEMA',
    sourceColor: '#ff3344',
    location: 'Dubai, UAE',
    timestamp: '03:12',
    headline: 'NCEMA confirms ballistic missile interception over Dubai airspace. Debris reported near JLT cluster. All residents advised to shelter in place.',
  },
  {
    id: 2,
    type: 'conflict',
    severity: 'critical',
    source: 'WAM',
    sourceColor: '#ff3344',
    location: 'Abu Dhabi, UAE',
    timestamp: '03:08',
    headline: 'Second intercept confirmed over Abu Dhabi. THAAD and Patriot systems engaged. Debris field near Saadiyat Island being secured by civil defense.',
  },
  {
    id: 3,
    type: 'warning',
    severity: 'high',
    source: 'GCAA',
    sourceColor: '#ff6644',
    location: 'UAE Airspace',
    timestamp: '03:05',
    headline: 'NOTAM issued: UAE FIR closed to all civilian traffic effective immediately. Emirates, Etihad, flydubai ops suspended. Divert to Muscat/Doha.',
  },
  {
    id: 4,
    type: 'conflict',
    severity: 'critical',
    source: 'IRGC',
    sourceColor: '#ff3344',
    location: 'Tehran, Iran',
    timestamp: '02:58',
    headline: 'IRGC claims "Operation True Promise III" underway. State media reports launch of Fattah-2 hypersonic missiles toward UAE military targets.',
  },
  {
    id: 5,
    type: 'maritime',
    severity: 'elevated',
    source: 'UKMTO',
    sourceColor: '#00ddcc',
    location: 'Strait of Hormuz',
    timestamp: '02:52',
    headline: 'Three commercial vessels diverted from Hormuz transit. IRGC naval assets observed at increased readiness. Coalition warships repositioning.',
  },
  {
    id: 6,
    type: 'warning',
    severity: 'high',
    source: 'SCA',
    sourceColor: '#ffaa00',
    location: 'Sharjah, UAE',
    timestamp: '02:45',
    headline: 'Sharjah Civil Defense activates all public shelters. Sirens sounding across emirate. Residents directed to underground facilities.',
  },
  {
    id: 7,
    type: 'cooperation',
    severity: 'moderate',
    source: 'GCC',
    sourceColor: '#00ff88',
    location: 'Riyadh, KSA',
    timestamp: '02:38',
    headline: 'GCC emergency summit convened via secure link. Saudi Arabia, Kuwait, Bahrain pledge mutual defense support. Joint statement expected.',
  },
  {
    id: 8,
    type: 'conflict',
    severity: 'critical',
    source: 'CENTCOM',
    sourceColor: '#ff3344',
    location: 'Al Dhafra AFB',
    timestamp: '02:30',
    headline: 'USAF assets at Al Dhafra AFB at DEFCON 2. F-35 and F-22 sorties observed. AWACS maintaining continuous CAP over Gulf.',
  },
  {
    id: 9,
    type: 'maritime',
    severity: 'elevated',
    source: 'AIS',
    sourceColor: '#00ddcc',
    location: 'Fujairah, UAE',
    timestamp: '02:22',
    headline: 'Port of Fujairah suspends all tanker loading operations. 14 VLCCs at anchor redirected to open sea holding patterns east of UAE territorial waters.',
  },
  {
    id: 10,
    type: 'warning',
    severity: 'moderate',
    source: 'GDELT',
    sourceColor: '#ffaa00',
    location: 'Dubai, UAE',
    timestamp: '02:15',
    headline: 'Social media surge detected: 340% increase in UAE-related conflict posts. Sentiment analysis shows extreme negative shift. Misinformation vectors active.',
  },
];

export const mapMarkers = [
  { id: 'dubai-intercept', lat: 25.197, lng: 55.274, type: 'conflict', label: 'Dubai Intercept', color: '#ff3344' },
  { id: 'abudhabi-debris', lat: 24.453, lng: 54.377, type: 'conflict', label: 'Abu Dhabi Debris', color: '#ff3344' },
  { id: 'sharjah-alert', lat: 25.337, lng: 55.412, type: 'warning', label: 'Sharjah Alert', color: '#ffaa00' },
  { id: 'fujairah-divert', lat: 25.128, lng: 56.346, type: 'maritime', label: 'Fujairah Divert', color: '#00bbff' },
  { id: 'dhafra-afb', lat: 24.248, lng: 54.548, type: 'conflict', label: 'Al Dhafra AFB', color: '#ff3344' },
];

export const shelterMarkers = [
  { id: 's1', lat: 25.197, lng: 55.274, label: 'Burj Khalifa Metro Station' },
  { id: 's2', lat: 25.198, lng: 55.279, label: 'Dubai Mall Lower Ground' },
  { id: 's3', lat: 25.213, lng: 55.283, label: 'DIFC Gate Building B2' },
  { id: 's4', lat: 24.496, lng: 54.383, label: 'Abu Dhabi Mall Underground' },
];

export const shipMarkers = [
  { id: 'ship1', lat: 26.15, lng: 56.20, type: 'tanker', label: 'VLCC DAWN VOYAGER' },
  { id: 'ship2', lat: 26.30, lng: 56.45, type: 'tanker', label: 'VLCC GULF SPIRIT' },
  { id: 'ship3', lat: 26.05, lng: 56.60, type: 'military', label: 'USS EISENHOWER' },
  { id: 'ship4', lat: 26.40, lng: 56.30, type: 'cargo', label: 'MV TRADE WINDS' },
  { id: 'ship5', lat: 26.25, lng: 56.70, type: 'military', label: 'IRIN ALVAND' },
  { id: 'ship6', lat: 26.10, lng: 56.50, type: 'tanker', label: 'MT HORMUZ STAR' },
  { id: 'ship7', lat: 26.45, lng: 56.15, type: 'cargo', label: 'MV ARABIAN SEA' },
];

// TODO: Replace with OpenSky Network API for live flights
export const flightPaths = [
  { id: 'f1', from: [52.0, 27.5], to: [55.364, 25.253], label: 'EK412' },
  { id: 'f2', from: [58.0, 23.5], to: [55.364, 25.253], label: 'EY301' },
  { id: 'f3', from: [50.0, 29.0], to: [55.364, 25.253], label: 'FZ215' },
];

// TODO: Replace with real market data API
export const marketData = {
  indices: [
    { name: 'ADX General', value: '9,480.14', change: -1.61, sparkline: [9620,9600,9580,9550,9530,9510,9500,9490,9485,9480] },
    { name: 'DFM General', value: '5,426.28', change: -1.66, sparkline: [5520,5510,5490,5480,5460,5450,5440,5435,5430,5426] },
    { name: 'Tadawul (TASI)', value: '10,893.27', change: -0.45, sparkline: [10940,10935,10925,10920,10910,10905,10900,10898,10895,10893] },
  ],
  commodities: [
    { name: 'Brent Crude', value: '$89.42', change: 4.2 },
    { name: 'Gold', value: '$3,148.60', change: 1.8 },
    { name: 'AED/USD', value: '3.6725', change: 0.00 },
  ],
  movers: [
    { name: 'Emaar', value: '11.20', change: -3.03 },
    { name: 'Emirates NBD', value: '31.35', change: -5.00 },
    { name: 'FAB', value: '18.64', change: -5.00 },
    { name: 'Air Arabia', value: '5.14', change: -5.00 },
    { name: 'DEWA', value: '2.66', change: -2.56 },
    { name: 'ADNOC Dist.', value: '3.42', change: -4.47 },
  ],
};

export const hormuzStats = [
  { label: 'Transits today', value: '38', color: '#ffaa00', sub: 'vs 49 avg' },
  { label: 'VLCC tankers', value: '12', color: '#ff6644', sub: '-22% vs 30d' },
  { label: 'Military vessels', value: '7', color: '#ff3344', sub: '+3 vs avg' },
  { label: 'Incidents 24h', value: '2', color: '#ff3344', sub: 'divert + warning' },
];

export const communityReports = [
  { id: 1, text: 'Heard loud boom near JLT — confirmed interception sound', location: 'JLT', time: '03:08', votes: 47 },
  { id: 2, text: 'All quiet in Marina — no alerts on phone yet', location: 'Dubai Marina', time: '03:05', votes: 23 },
  { id: 3, text: 'Sirens active near Al Maryah Island area', location: 'Abu Dhabi', time: '03:01', votes: 31 },
  { id: 4, text: 'Traffic normal on SZR — no diversions seen', location: 'SZR', time: '02:55', votes: 12 },
];

export const ncemaAlerts = [
  { date: 'Feb 28', duration: 36, type: 'missile' },
  { date: 'Mar 1', duration: 45, type: 'missile' },
  { date: 'Mar 1', duration: 35, type: 'drone' },
  { date: 'Mar 3', duration: 40, type: 'missile' },
  { date: 'Mar 8', duration: 37, type: 'drone' },
  { date: 'Mar 12', duration: 28, type: 'missile' },
  { date: 'Mar 12', duration: 25, type: 'missile' },
  { date: 'Mar 15', duration: null, type: 'missile', active: true },
];

export const trendData = {
  instability: { label: 'Instability', data: [32,35,41,38,55,72,68,75,82,78,85,91,88,94,89], color: '#ff3344', current: '94' },
  events: { label: 'Events/d', data: [12,15,18,14,22,31,28,35,42,38,45,52,48,55,51], color: '#ffaa00', current: '51' },
  sentiment: { label: 'Sentiment', data: [-1.2,-1.5,-2.1,-1.8,-3.2,-4.5,-4.1,-4.8,-5.2,-4.9,-5.5,-6.1,-5.8,-6.4,-6.0], color: '#ff6644', current: '-6.0' },
  flights: { label: 'Flights', data: [850,820,790,810,620,410,380,350,320,340,280,250,270,240,260], color: '#00bbff', current: '260' },
};

export const safetyMockResult = {
  score: 38,
  subtitle: '32 pts below 30-day average',
  riskFactors: [
    'Active missile threat — NCEMA shelter-in-place order',
    'UAE airspace closed — NOTAM in effect',
    'Debris field reported in urban areas',
    'Emergency services at max capacity',
  ],
  recommendations: [
    'Remain indoors in reinforced structure',
    'Stay below ground floor if possible',
    'Monitor NCEMA official channels only',
    'Avoid windows and exterior walls',
  ],
};

export const debrisZones = [
  { lat: 24.453, lng: 54.377, label: 'Abu Dhabi Debris Zone' },
  { lat: 25.197, lng: 55.274, label: 'Dubai Debris Zone' },
];

export const mapLayers = [
  { id: 'incidents', label: 'GDELT Incidents', color: '#ff3344', visible: true },
  { id: 'debris', label: 'Debris Zones', color: '#ffaa00', visible: true },
  { id: 'shelters', label: 'Shelter Points', color: '#00ff88', visible: true },
  { id: 'flights', label: 'Flight Paths', color: '#00bbff', visible: true },
  { id: 'maritime', label: 'Maritime AIS', color: '#00ddcc', visible: true },
];
