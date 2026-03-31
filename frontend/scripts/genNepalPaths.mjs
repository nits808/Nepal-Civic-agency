import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gjPath = path.join(__dirname, '..', 'public', 'nepal-provinces-simplified.geojson');
const gj = JSON.parse(fs.readFileSync(gjPath, 'utf8'));

function dataBounds(featureCollection) {
  let minLon = 180;
  let maxLon = -180;
  let minLat = 90;
  let maxLat = -90;
  for (const f of featureCollection.features) {
    const g = f.geometry;
    const multi = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (const poly of multi) {
      for (const ring of poly) {
        for (const pt of ring) {
          const lon = pt[0];
          const lat = pt[1];
          if (Number.isFinite(lon) && Number.isFinite(lat)) {
            minLon = Math.min(minLon, lon);
            maxLon = Math.max(maxLon, lon);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
          }
        }
      }
    }
  }
  const padLon = (maxLon - minLon) * 0.04 || 0.15;
  const padLat = (maxLat - minLat) * 0.06 || 0.15;
  return {
    minLon: minLon - padLon,
    maxLon: maxLon + padLon,
    minLat: minLat - padLat,
    maxLat: maxLat + padLat,
  };
}

/** Plate carrée–style map: linear lon/lat → SVG (reliable vs. d3 Mercator + messy polygons). */
function makeProjector(bounds, svg) {
  const dLon = bounds.maxLon - bounds.minLon;
  const dLat = bounds.maxLat - bounds.minLat;
  const w = svg.x1 - svg.x0;
  const h = svg.y1 - svg.y0;
  return ([lon, lat]) => {
    const x = svg.x0 + ((lon - bounds.minLon) / dLon) * w;
    const y = svg.y0 + ((bounds.maxLat - lat) / dLat) * h;
    return [x, y];
  };
}

function ringToPath(ring, toXY) {
  if (!ring.length) return '';
  let d = '';
  ring.forEach((pt, i) => {
    const [x, y] = toXY(pt);
    const xi = Math.round(x * 100) / 100;
    const yi = Math.round(y * 100) / 100;
    d += `${i === 0 ? 'M' : 'L'}${xi},${yi}`;
  });
  return `${d}Z`;
}

function polygonFeatureToPath(feature, toXY) {
  const coords = feature.geometry.coordinates;
  return coords.map((ring) => ringToPath(ring, toXY)).join('');
}

function planarCentroid(feature, toXY) {
  const ring = feature.geometry.coordinates[0];
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const pt of ring) {
    const p = toXY(pt);
    sx += p[0];
    sy += p[1];
    n++;
  }
  if (!n) return [410, 160];
  return [sx / n, sy / n];
}

const bounds = dataBounds(gj);
const svg = { x0: 8, y0: 8, x1: 812, y1: 312 };
const toXY = makeProjector(bounds, svg);

const PCODE_TO_APP = {
  NP01: 'Province No. 1',
  NP02: 'Madhesh',
  NP03: 'Bagmati',
  NP04: 'Gandaki',
  NP05: 'Lumbini',
  NP06: 'Karnali',
  NP07: 'Sudurpashchim',
};

const paths = {};
const centroids = {};
for (const f of gj.features) {
  const name = PCODE_TO_APP[f.properties.ADM1_PCODE];
  if (!name) throw new Error(`Unknown pcode ${f.properties.ADM1_PCODE}`);
  paths[name] = polygonFeatureToPath(f, toXY);
  const c = planarCentroid(f, toXY);
  centroids[name] = { x: Math.round(c[0] * 10) / 10, y: Math.round(c[1] * 10) / 10 };
}

const out = `// Auto-generated from public/nepal-provinces-simplified.geojson — run: node scripts/genNepalPaths.mjs
export const NEPAL_MAP_VIEWBOX = '0 0 820 320';
export const NEPAL_PROVINCE_PATHS = ${JSON.stringify(paths)};
export const NEPAL_PROVINCE_CENTROIDS = ${JSON.stringify(centroids)};
`;

const dest = path.join(__dirname, '..', 'src', 'nepalMapPaths.js');
fs.writeFileSync(dest, out);
console.log('Wrote', dest, 'bytes', out.length);
