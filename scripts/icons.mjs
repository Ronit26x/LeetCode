// Generates the PWA and favicon PNGs from the Recur mark. Run: pnpm icons
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { oklchToHex } from "./oklch.mjs";

const accent = oklchToHex(0.52, 0.16, 262);
const paper = oklchToHex(0.985, 0.003, 90);
const dim = oklchToHex(0.255, 0.009, 65);
const dark = oklchToHex(0.14, 0.005, 260);
console.log({ accent, paper, dim, dark });

function tile(size, { maskable = false, bg = accent, fg = "#ffffff" } = {}) {
  const radius = maskable ? 0 : Math.round(size * 0.22);
  // Ring geometry in a 24-unit box, scaled. Maskable keeps everything inside the inner 80%.
  const scale = maskable ? 0.8 : 1;
  const r = 8 * scale;
  const sw = 2.6 * scale;
  const circ = 2 * Math.PI * r;
  const dash = circ * (5 / 6);
  const gap = circ - dash;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
  <rect width="24" height="24" rx="${(radius / size) * 24}" fill="${bg}"/>
  <circle cx="12" cy="12" r="${r}" fill="none" stroke="${fg}" stroke-width="${sw}" stroke-linecap="round"
    stroke-dasharray="${dash.toFixed(3)} ${gap.toFixed(3)}" transform="rotate(-60 12 12)"/>
</svg>`;
}

async function png(svg, size, out) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log("wrote", out);
}

await mkdir("public/icons", { recursive: true });
await png(tile(512), 512, "public/icons/icon-512.png");
await png(tile(512), 192, "public/icons/icon-192.png");
await png(tile(512, { maskable: true }), 512, "public/icons/maskable-512.png");
await png(tile(512), 180, "src/app/apple-icon.png");
await png(tile(512), 64, "src/app/icon.png");
await writeFile("public/icons/icon.svg", tile(512));
