// Capture the public landing page for the README and student guide.
// Run while `npm run dev -- --host 127.0.0.1` is serving the client.
import { chromium } from "playwright";
import sharp from "sharp";

const base = process.env.README_BASE ?? "http://127.0.0.1:5173";
const browser = await chromium.launch({ headless: true });

try {
  for (const shot of [
    { width: 390, height: 844, path: "public/guide/learning-01-landing.webp" },
    { width: 1440, height: 900, path: "docs/readme-landing.webp" },
  ]) {
    const page = await browser.newPage({
      viewport: { width: shot.width, height: shot.height },
      deviceScaleFactor: 2,
    });
    await page.goto(base, { waitUntil: "networkidle" });
    await page.locator("main").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    const png = await page.screenshot();
    await sharp(png).webp({ quality: 88 }).toFile(shot.path);
    await page.close();
    console.log(`Captured ${shot.path} at ${shot.width * 2}×${shot.height * 2}`);
  }
} finally {
  await browser.close();
}
