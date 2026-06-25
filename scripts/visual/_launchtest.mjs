import { chromium } from "playwright";
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 900, height: 600 } });
await p.setContent("<body style='background:#222;color:#fff'><h1>ok</h1></body>");
await p.screenshot({ path: "/tmp/pwtest.png" });
await b.close();
console.log("LAUNCH OK");
