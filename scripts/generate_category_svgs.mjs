import fs from 'fs';
import path from 'path';

const categories = [
  {
    id: 'politics',
    name: 'POLITICS & GOVERNANCE',
    icon: '🏛️',
    subtitle: 'Singha Durbar • Federal Affairs • Civic Policy',
    gradient: ['#0f172a', '#1e293b', '#DC143C'],
    accent: '#DC143C'
  },
  {
    id: 'technology',
    name: 'TECHNOLOGY & INNOVATION',
    icon: '💻',
    subtitle: 'Nepal IT Ecosystem • Digital Governance • AI & Cyber',
    gradient: ['#0a0f1d', '#1e1b4b', '#4f46e5'],
    accent: '#6366f1'
  },
  {
    id: 'economy',
    name: 'ECONOMY & COMMERCE',
    icon: '📈',
    subtitle: 'Nepal Rastra Bank • Stock Market • Trade & Revenue',
    gradient: ['#062419', '#064e3b', '#059669'],
    accent: '#10b981'
  },
  {
    id: 'disaster',
    name: 'DISASTER & EMERGENCY',
    icon: '🚨',
    subtitle: 'NDRRMA Alerts • Monsoon Watch • Seismic Response',
    gradient: ['#2a0808', '#7f1d1d', '#b91c1c'],
    accent: '#ef4444'
  },
  {
    id: 'infrastructure',
    name: 'INFRASTRUCTURE & DEVELOPMENT',
    icon: '🏗️',
    subtitle: 'Roads & Highways • Hydropower • Urban Planning',
    gradient: ['#1c1917', '#44403c', '#d97706'],
    accent: '#f59e0b'
  },
  {
    id: 'health',
    name: 'PUBLIC HEALTH',
    icon: '🏥',
    subtitle: 'Medical Services • Epidemiology • Health Policy',
    gradient: ['#0f172a', '#115e59', '#0d9488'],
    accent: '#14b8a6'
  },
  {
    id: 'sports',
    name: 'SPORTS & ATHLETICS',
    icon: '🏏',
    subtitle: 'National Cricket • Football • Youth Athletics',
    gradient: ['#0f172a', '#1e3a8a', '#2563eb'],
    accent: '#3b82f6'
  },
  {
    id: 'tourism',
    name: 'TOURISM & HERITAGE',
    icon: '🏔️',
    subtitle: 'Himalayan Expeditions • Cultural Sites • Eco-Travel',
    gradient: ['#0c1a2e', '#1e293b', '#0284c7'],
    accent: '#38bdf8'
  },
  {
    id: 'environment',
    name: 'CLIMATE & ENVIRONMENT',
    icon: '🌿',
    subtitle: 'Conservation • Forest Resources • Climate Resilience',
    gradient: ['#052e16', '#14532d', '#16a34a'],
    accent: '#22c55e'
  },
  {
    id: 'law',
    name: 'LAW & CONSTITUTION',
    icon: '⚖️',
    subtitle: 'Supreme Court • Judicial Precedents • Legal Reform',
    gradient: ['#18181b', '#312e81', '#7c3aed'],
    accent: '#8b5cf6'
  },
  {
    id: 'education',
    name: 'EDUCATION & ACADEMIA',
    icon: '🎓',
    subtitle: 'Higher Education • Curriculum • Research & Innovation',
    gradient: ['#1e1b4b', '#3730a3', '#4338ca'],
    accent: '#818cf8'
  },
  {
    id: 'international',
    name: 'GLOBAL & DIPLOMACY',
    icon: '🌐',
    subtitle: 'Bilateral Relations • Regional Treaties • Foreign Affairs',
    gradient: ['#022c22', '#134e4a', '#0891b2'],
    accent: '#06b6d4'
  }
];

function generateSVG(cat) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${cat.gradient[0]}" />
      <stop offset="50%" stop-color="${cat.gradient[1]}" />
      <stop offset="100%" stop-color="${cat.gradient[2]}" />
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${cat.accent}" stop-opacity="0.35" />
      <stop offset="100%" stop-color="${cat.accent}" stop-opacity="0" />
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1" />
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="800" height="450" fill="url(#bgGrad)" />
  <rect width="800" height="450" fill="url(#grid)" />
  <circle cx="700" cy="80" r="280" fill="url(#glowGrad)" filter="blur(40px)" />
  <circle cx="100" cy="400" r="200" fill="url(#glowGrad)" filter="blur(50px)" />

  <!-- Diagonal Geometric Accent Lines -->
  <line x1="-50" y1="450" x2="450" y2="-50" stroke="${cat.accent}" stroke-opacity="0.12" stroke-width="2" />
  <line x1="50" y1="500" x2="550" y2="0" stroke="${cat.accent}" stroke-opacity="0.08" stroke-width="1.5" />

  <!-- Centered Emblem & Details (Optimized for both 16:9 Widescreen AND Square Thumbnails!) -->
  <g transform="translate(400, 225)" text-anchor="middle">
    <!-- Center Glow Circle -->
    <circle cx="0" cy="-25" r="110" fill="${cat.accent}" fill-opacity="0.22" filter="blur(20px)" />
    <circle cx="0" cy="-25" r="70" fill="${cat.gradient[1]}" stroke="${cat.accent}" stroke-width="2.5" stroke-opacity="0.8" />

    <!-- Big Center Icon -->
    <text x="0" y="2" font-size="66" text-anchor="middle">${cat.icon}</text>

    <!-- Category Label -->
    <text x="0" y="80" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="900" fill="#ffffff" letter-spacing="1.5" text-anchor="middle">${cat.name}</text>

    <!-- Subtitle -->
    <text x="0" y="108" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#cbd5e1" letter-spacing="0.5" text-anchor="middle">${cat.subtitle}</text>
  </g>
</svg>`;
}

const outDir = path.resolve('frontend/public/images');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

categories.forEach(cat => {
  const filePath = path.join(outDir, `${cat.id}-fallback.svg`);
  const pngFilePath = path.join(outDir, `${cat.id}-fallback.png`); // In case png is referenced
  const svg = generateSVG(cat);
  fs.writeFileSync(filePath, svg, 'utf-8');
  fs.writeFileSync(pngFilePath, svg, 'utf-8'); // SVGs can serve both extensions cleanly
  console.log(`Generated: ${cat.id}-fallback.svg`);
});

// Also create default generic fallback
const generic = generateSVG({
  id: 'default',
  name: 'NEPAL CIVIC INTELLIGENCE',
  icon: '🇳🇵',
  subtitle: 'National Civic Intelligence Graph • Live Coverage',
  gradient: ['#0b132b', '#1c2541', '#3a506b'],
  accent: '#DC143C'
});
fs.writeFileSync(path.join(outDir, 'default-fallback.svg'), generic, 'utf-8');
fs.writeFileSync(path.join(outDir, 'default-fallback.png'), generic, 'utf-8');
console.log('✅ All Nepal editorial category banners generated successfully in frontend/public/images/');
