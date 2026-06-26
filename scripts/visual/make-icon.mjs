import { chromium } from "playwright";

// Render the Nabd heart logo (white, on the accent rounded square) to a 1024 PNG,
// matching the in-app brand mark. Then `tauri icon` derives the full icon set.
const ACCENT = "#d6775a"; // warm orange accent
const heart = `
  <path d="M17.5 33.8 C12.8 33.2 5.3 28 4 20.6 C3.3 16.8 4.6 12.6 8.6 12.2 C12.4 11.8 16.4 12 20.2 12.1 C24 12.2 26.8 14.6 26.7 18.4 C26.6 23.2 22.8 28.4 19 31.6 C18.4 32.2 17.9 33 17.5 33.8 Z" fill="#fff"></path>
  <path d="M10.8 12 C10.2 9.2 10.1 7.4 10.4 5.8" stroke="#fff" stroke-width="4" stroke-linecap="round"></path>
  <path d="M15 12.3 C14.8 9.4 15 7.4 15.6 5.9" stroke="#fff" stroke-width="4" stroke-linecap="round"></path>
  <path d="M18.9 12.1 C19.4 8.7 21 6 24 5.4" stroke="#fff" stroke-width="4.4" stroke-linecap="round"></path>
  <path d="M15.6 14.6 C15 19 14.9 25 16.2 31" stroke="${ACCENT}" stroke-width="1.5" stroke-linecap="round"></path>
  <path d="M15.3 22.6 C13.7 24.6 12.7 27 12.3 29.4" stroke="${ACCENT}" stroke-width="1.3" stroke-linecap="round"></path>
  <path d="M19.4 14.8 C20.6 18 20.8 22 19.7 26" stroke="${ACCENT}" stroke-width="1.3" stroke-linecap="round"></path>
  <circle cx="10.4" cy="5.6" r="1.35" fill="${ACCENT}"></circle>
  <circle cx="24.2" cy="5.3" r="1.45" fill="${ACCENT}"></circle>`;
// 1024 canvas: accent rounded square (220 radius), heart (viewBox 32x36) centered ~58%.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect x="0" y="0" width="1024" height="1024" rx="220" ry="220" fill="${ACCENT}"/>
  <g transform="translate(512,512) scale(19) translate(-16,-19)">${heart}</g>
</svg>`;

const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
await p.setContent(
  `<body style="margin:0">${svg}</body>`,
  { waitUntil: "networkidle" },
);
await p.locator("svg").screenshot({ path: "src-tauri/icons/source.png", omitBackground: true });
await b.close();
console.log("icon source.png written");
