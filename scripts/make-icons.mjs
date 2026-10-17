// Membuat ikon PWA dari SVG. Jalankan: node scripts/make-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const svg = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0f766e"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 512})">
    <circle cx="256" cy="256" r="170" fill="#fbbf24"/>
    <circle cx="256" cy="256" r="140" fill="none" stroke="#b45309" stroke-width="10"/>
    <text x="256" y="292" font-family="Arial, Helvetica, sans-serif" font-size="110" font-weight="700"
          text-anchor="middle" fill="#78350f">Rp</text>
  </g>
</svg>`;

mkdirSync("public/icons", { recursive: true });
const out = [
  ["icon-192.png", 192, 0],
  ["icon-512.png", 512, 0],
  ["maskable-512.png", 512, 60], // area aman untuk ikon maskable
  ["apple-touch-icon.png", 180, 0],
];
for (const [name, size, pad] of out) {
  await sharp(Buffer.from(svg(pad))).resize(size, size).png().toFile(`public/icons/${name}`);
}
