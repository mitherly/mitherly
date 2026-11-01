// Recolors 3d-contrib SVGs from the default green palette to the sky-blue theme.
// Hue-shifts any green-ish rgb() color (hue 80-170) to sky hue 199. Grays untouched.
// Usage: node scripts/recolor-3d.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'profile-3d-contrib');

function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) return [l, l, l];
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, (h / 360 + 1 / 3)), hue2rgb(p, q, h / 360), hue2rgb(p, q, (h / 360 - 1 / 3))];
}

for (const f of readdirSync(dir).filter((x) => x.endsWith('.svg'))) {
  const p = join(dir, f);
  let svg = readFileSync(p, 'utf8');
  svg = svg.replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g, (m, r, g, b) => {
    const [h, s, l] = rgbToHsl(r / 255, g / 255, b / 255);
    if (h >= 80 && h <= 170 && s > 0.12) {
      const [nr, ng, nb] = hslToRgb(199, Math.min(0.95, s * 1.4 + 0.1), l);
      return `rgb(${Math.round(nr * 255)}, ${Math.round(ng * 255)}, ${Math.round(nb * 255)})`;
    }
    return m;
  });
  writeFileSync(p, svg);
  console.log('recolor:', f);
}
