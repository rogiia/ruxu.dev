// One-off script: renders the default 1200x630 social card (og:image / twitter:image).
// Usage: node config/generate-social-card.js
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const output = path.join(__dirname, "..", "assets", "images", "social", "default.png");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2a2ad0"/>
      <stop offset="1" stop-color="#4b4be8"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="80" y="272" width="120" height="8" rx="4" fill="#ceceff"/>
  <text x="80" y="230" font-family="Helvetica, Arial, sans-serif" font-size="104" font-weight="700" fill="#ffffff">Roger Oriol</text>
  <text x="80" y="340" font-family="Helvetica, Arial, sans-serif" font-size="44" fill="#ffffff">Software Architect</text>
  <text x="80" y="410" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#ceceff">Web development, data architecture</text>
  <text x="80" y="460" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#ceceff">and software architecture</text>
  <text x="80" y="570" font-family="Helvetica, Arial, sans-serif" font-size="32" fill="#ffffff">ruxu.dev</text>
</svg>`;

fs.mkdirSync(path.dirname(output), { recursive: true });
sharp(Buffer.from(svg)).png().toFile(output).then(() => console.log("Wrote " + output));
