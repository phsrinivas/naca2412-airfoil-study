'use strict';

// Results from the paper's FoilSim testing. Edit these if the numbers change.

const CAMBERS = [0, 2, 5, 9];
const THICKS = [8, 12, 16, 20];
// Round 1: L/D at 0° AoA, 135 mph, sea level. Rows = camber, columns = thickness.
const R1 = { 0: [0, 0, 0, 0], 2: [14.46, 12.06, 8.85, 7.62], 5: [13.02, 12.70, 10.79, 9.72], 9: [7.86, 7.95, 7.95, 7.58] };
const CAMBER_COLORS = { 0: 'var(--s1)', 2: 'var(--s2)', 5: 'var(--s3)', 9: 'var(--s4)' };
const THICK_COLORS = { 8: 'var(--s1)', 12: 'var(--s2)', 16: 'var(--s3)', 20: 'var(--s4)' };

const FOILS = [
  { id: '2412', name: 'NACA 2412', note: 'baseline', c: 2, t: 12, r1: 12.06, rank: 4, color: 'var(--s1)' },
  { id: '2408', name: 'NACA 2408', c: 2, t: 8, r1: 14.46, rank: 1, color: 'var(--s2)' },
  { id: '5408', name: 'NACA 5408', c: 5, t: 8, r1: 13.02, rank: 2, color: 'var(--s3)' },
  { id: '5412', name: 'NACA 5412', c: 5, t: 12, r1: 12.70, rank: 3, color: 'var(--s4)' },
];
const CONDS = [
  { id: 'climb', label: 'Climb', detail: '85 mph · sea level · 10°' },
  { id: 'cruise', label: 'Cruise', detail: '138 mph · 5,000 ft · 3°' },
  { id: 'approach', label: 'Approach', detail: '70 mph · sea level · 8°' },
];
const R2 = {
  climb: { 2412: 6.46, 2408: 6.21, 5408: 5.25, 5412: 5.36 },
  cruise: { 2412: 11.32, 2408: 11.85, 5408: 9.05, 5412: 9.05 },
  approach: { 2412: 7.44, 2408: 7.20, 5408: 5.88, 5412: 6.01 },
};
const CLIMB_FORCES = { 2412: [2415, 374], 2408: [2359, 380], 5408: [2896, 552], 5412: [2945, 549] };

const REFS = [
  'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/wright-brothers-aircraft/',
  'https://epicflightacademy.com/types-of-aircraft/',
  'https://eaglepubs.erau.edu/introductiontoaerospaceflightvehicles/chapter/aircraft-classifications-aviation-regulations/',
  'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/airplane-parts-function/',
  'https://cessna.txtav.com/en/piston/cessna-skyhawk',
  'https://m-selig.ae.illinois.edu/ads/aircraft.html',
  'https://www.jetphotos.com/photo/6817606',
  'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/four-forces-on-an-airplane/',
  'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/lift-to-drag-ratio/',
  'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-coefficient/',
  'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/lift-to-drag-l-d-ratio/',
  'https://www.naa.edu/airfoil-design/',
  'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/what-is-lift/',
  'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/what-is-drag/',
  'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/lift-coefficient/',
  'http://airfoiltools.com/airfoil/details?airfoil=naca2412-il',
  'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/wing-geometry/',
  'http://airfoiltools.com/airfoil/naca4digit',
  'https://www.airbus.com/en/newsroom/press-releases/2013-10-airbus-launches-sharklet-retrofit-for-in-service-a320-family',
  'https://en.wikipedia.org/wiki/Airbus_A320_family',
  'https://arxiv.org/pdf/2304.14889',
  'https://m-selig.ae.illinois.edu/uiuc_lsat/Low-Speed-Airfoil-Data-V1.pdf',
  'https://www.researchgate.net/publication/369203181_Aerodynamics_of_Airfoils_and_Wings_including_Case_Studies',
  'https://ntrs.nasa.gov/api/citations/20160006027/downloads/20160006027.pdf',
  'https://www.sciencedirect.com/science/article/pii/S1270963826015063',
  'https://ijpte.com/index.php/ijpte/article/view/66/34',
  'https://scienpg.com/scs/index.php/engineering/article/view/scse.2025.3.104/Pdf',
  'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/foilsimstudent/',
];
