// capture-guide.mjs — regenerate every guide screenshot from a scene manifest.
// See ROADMAP-guide.md Tier G1 + plan/guide.md §6 (workspace root).
//
// Prereqs: both halves running locally (server :5000 with a real GEMINI_API_KEY
// for the scenes marked ai:true, client :5173), and scripts/guide-demo.json
// written by `node scripts/seed-guide-demo.mjs`.
//
// Usage:
//   node scripts/capture-guide.mjs                  # capture everything
//   node scripts/capture-guide.mjs --scene learning-05-feedback
//   node scripts/capture-guide.mjs --base http://localhost:5173
//   node scripts/capture-guide.mjs --password <demo account pw>
//
// Output: client/public/guide/*.webp + regenerated src/pages/guide/guideImages.ts

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};

const BASE = getArg("base", process.env.GUIDE_BASE ?? "http://localhost:5173");
const PASSWORD = getArg("password", process.env.GUIDE_DEMO_PASSWORD ?? "HotPotato-guide-2026");
const ONLY = getArg("scene", null);

const demo = JSON.parse(readFileSync(new URL("./guide-demo.json", import.meta.url), "utf8"));
const API = demo.api;
const VIEW = `/view/${demo.demoLessonId}`;

const OUT_DIR = new URL("../public/guide/", import.meta.url);
const IMAGES_TS = new URL("../src/pages/guide/guideImages.ts", import.meta.url);
mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = {
  phone: { width: 390, height: 844, maxOut: 800 },
  desktop: { width: 1280, height: 800, maxOut: 1280 },
};

async function login(email) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`login ${email} failed: ${res.status}`);
  return res.json(); // { user, token }
}

/** Wait until no "AI กำลังพิมพ์ / Waking the AI" indicator remains on the page. */
async function waitForAiIdle(page, timeout = 120_000) {
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return !text.includes("AI กำลังพิมพ์") && !text.includes("ปลุก AI แป๊บนึงนะ");
    },
    { timeout },
  );
}

const questionCard = (page, text) =>
  page.locator("[data-node-view-wrapper]").filter({ hasText: text }).first();

// ---------------------------------------------------------------------------
// The scene manifest. `run` drives the page into the right state and returns
// a locator for an element screenshot, or null for a viewport screenshot.
// ---------------------------------------------------------------------------
const SCENES = [
  {
    out: "learning-01-landing.webp",
    viewport: "phone",
    auth: "anon",
    run: async (page) => {
      await page.goto(`${BASE}/`);
      await page.getByText("Learn through").first().waitFor();
      return null;
    },
  },
  {
    out: "learning-02-explore.webp",
    viewport: "phone",
    auth: "anon",
    seedStorage: {
      // Pre-bookmark the public smoke-test lesson so the bookmark icon shows filled.
      "bookmark-storage": { state: { ids: [demo.publicTestLessonId] }, version: 0 },
    },
    run: async (page) => {
      await page.goto(`${BASE}/explore`);
      await page.getByText("การเคลื่อนที่เเละเเรง").first().waitFor({ timeout: 30_000 });
      // Demo the search box too — and it filters junk "Untitled" lessons out of frame.
      // (NB: the lesson title spells "เเรง" with two เ characters, so search a safe substring.)
      await page.getByPlaceholder(/ค้นหาบทเรียนสาธารณะ|Search public lessons/).fill("การเคลื่อนที่");
      await page.waitForTimeout(1_200); // 400 ms debounce + fetch
      await page.getByText("การเคลื่อนที่เเละเเรง").first().waitFor({ timeout: 30_000 });
      await page.mouse.wheel(0, 260); // frame search + tabs + the first result card
      await page.waitForTimeout(400);
      return null;
    },
  },
  {
    out: "learning-03-viewer.webp",
    viewport: "phone",
    auth: "anon",
    run: async (page) => {
      await page.goto(`${BASE}${VIEW}`);
      await page.getByText("ทำไมท้องฟ้าเป็นสีฟ้า?").first().waitFor({ timeout: 30_000 });
      await page.getByText("แสงสีขาวไม่ได้ขาวอย่างที่คิด").first().scrollIntoViewIfNeeded();
      await page.mouse.wheel(0, -120); // keep the section heading + some prose in frame
      await page.waitForTimeout(600);
      return null;
    },
  },
  {
    out: "learning-04a-choice.webp",
    viewport: "phone",
    auth: "anon",
    run: async (page) => {
      await page.goto(`${BASE}${VIEW}`);
      const card = questionCard(page, "แสงสีขาวจากดวงอาทิตย์จริงๆ แล้วคืออะไร?");
      await card.waitFor({ timeout: 30_000 });
      await card.scrollIntoViewIfNeeded();
      await card.getByText("แสงหลายสีผสมรวมกัน").click();
      return card;
    },
  },
  {
    out: "learning-04b-write.webp",
    viewport: "phone",
    auth: "anon",
    run: async (page) => {
      await page.goto(`${BASE}${VIEW}`);
      const card = questionCard(page, "ดวงจันทร์ซึ่งไม่มีชั้นบรรยากาศ");
      await card.waitFor({ timeout: 30_000 });
      await card.scrollIntoViewIfNeeded();
      await card
        .locator("textarea")
        .first()
        .fill("น่าจะมืดเหมือนกลางคืน เพราะไม่มีอากาศช่วยกระจายแสงให้ทั่วฟ้า");
      return card;
    },
  },
  {
    out: "learning-04c-blankdrag.webp",
    viewport: "phone",
    auth: "anon",
    run: async (page) => {
      await page.goto(`${BASE}${VIEW}`);
      const card = questionCard(page, "เพราะมีความยาวคลื่นสั้นกว่า");
      await card.waitFor({ timeout: 30_000 });
      await card.scrollIntoViewIfNeeded();
      try {
        // Best effort: place the first chip into the first blank so the shot
        // shows the mechanic. HTML5 DnD can be flaky headless — shot works either way.
        const chip = card.getByText("ฟ้า", { exact: true }).first();
        const blank = card.locator("[data-blank-index], [class*='blank']").first();
        await chip.dragTo(blank, { timeout: 5_000 });
        await page.waitForTimeout(400);
      } catch {
        /* pre-drag state is still a usable screenshot */
      }
      return card;
    },
  },
  {
    out: "learning-05-feedback.webp",
    viewport: "phone",
    auth: "anon",
    ai: true,
    run: async (page) => {
      await page.goto(`${BASE}${VIEW}`);
      const card = questionCard(page, "แสงสีขาวจากดวงอาทิตย์จริงๆ แล้วคืออะไร?");
      await card.waitFor({ timeout: 30_000 });
      await card.scrollIntoViewIfNeeded();
      await card.getByText("แสงหลายสีผสมรวมกัน").click();
      await card.getByRole("button", { name: /^(ส่ง|Submit)$/ }).click();
      // Streamed feedback is done when the follow-up affordance appears.
      await card
        .getByText(/ส่งคำตอบเพิ่มเติม|Submit another answer/)
        .first()
        .waitFor({ timeout: 120_000 });
      await waitForAiIdle(page);
      await card.getByText(/ส่งคำตอบเพิ่มเติม|Submit another answer/).first().click();
      await page.waitForTimeout(500);
      await card.scrollIntoViewIfNeeded();
      return card;
    },
  },
  {
    out: "learning-06-askai.webp",
    viewport: "phone",
    auth: "anon",
    ai: true,
    run: async (page) => {
      await page.goto(`${BASE}${VIEW}`);
      await page.getByText("ทำไมท้องฟ้าเป็นสีฟ้า?").first().waitFor({ timeout: 30_000 });
      await page.getByRole("button", { name: /Ask AI/i }).click();
      const input = page.locator("textarea").last();
      await input.fill("ตอนเช้ากับตอนเที่ยง สีของท้องฟ้าต่างกันไหม?");
      await input.press("Enter");
      await page.waitForTimeout(2_000);
      await waitForAiIdle(page);
      await page.waitForTimeout(500);
      return null; // the modal fills the phone viewport
    },
  },
  {
    out: "learning-07-personality.webp",
    viewport: "phone",
    auth: "anon",
    run: async (page) => {
      await page.goto(`${BASE}/settings`);
      const section = page.getByText("AI ติวเตอร์").first();
      await section.waitFor({ timeout: 30_000 });
      await section.scrollIntoViewIfNeeded();
      await page.mouse.wheel(0, -80);
      await page.waitForTimeout(400);
      return null;
    },
  },
  {
    out: "learning-08a-history.webp",
    viewport: "phone",
    auth: "student",
    run: async (page) => {
      await page.goto(`${BASE}/history`);
      await page.getByText(/วันนี้|Today/).first().waitFor({ timeout: 30_000 });
      return null;
    },
  },
  {
    out: "learning-08b-memory.webp",
    viewport: "phone",
    auth: "student",
    run: async (page) => {
      await page.goto(`${BASE}/profile`);
      const card = page.getByText(/ความจำของติวเตอร์|What your tutor remembers/).first();
      await card.waitFor({ timeout: 30_000 });
      await page.waitForTimeout(1_000); // let the memory chips finish loading
      // The memory card sits at the very bottom of Profile — pin the view there.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      return null;
    },
  },
  {
    out: "learning-09-settings.webp",
    viewport: "phone",
    auth: "anon",
    run: async (page) => {
      await page.goto(`${BASE}/settings`);
      await page.getByText(/ขนาดตัวอักษร|Font size/).first().waitFor({ timeout: 30_000 });
      return null;
    },
  },
];

// ---------------------------------------------------------------------------

async function main() {
  const scenes = ONLY ? SCENES.filter((s) => s.out.startsWith(ONLY)) : SCENES;
  if (scenes.length === 0) {
    console.error(`No scene matches "${ONLY}". Known: ${SCENES.map((s) => s.out).join(", ")}`);
    process.exit(1);
  }

  const sessions = { anon: null };
  if (scenes.some((s) => s.auth === "student")) {
    sessions.student = await login(demo.studentEmail);
  }
  if (scenes.some((s) => s.auth === "teacher")) {
    sessions.teacher = await login(demo.teacherEmail);
  }

  const browser = await chromium.launch();
  let failed = 0;

  for (const scene of scenes) {
    const vp = VIEWPORTS[scene.viewport];
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      locale: "th-TH",
    });
    const session = sessions[scene.auth];
    await context.addInitScript(
      ({ storage }) => {
        for (const [key, value] of Object.entries(storage)) {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      },
      {
        storage: {
          "app-language": "th",
          ...(session
            ? { "auth-storage": { state: { user: session.user, token: session.token }, version: 0 } }
            : {}),
          ...(scene.seedStorage ?? {}),
        },
      },
    );

    const page = await context.newPage();
    try {
      process.stdout.write(`▸ ${scene.out}${scene.ai ? " (AI)" : ""} … `);
      const target = await scene.run(page);
      const png = await (target ?? page).screenshot({ type: "png" });
      const image = sharp(png).resize({ width: vp.maxOut * 2, withoutEnlargement: true });
      await image.webp({ quality: 82 }).toFile(fileURLToPath(new URL(scene.out, OUT_DIR)));
      console.log("ok");
    } catch (err) {
      failed++;
      console.log(`FAILED — ${err.message?.split("\n")[0]}`);
    } finally {
      await context.close();
    }
  }

  await browser.close();

  // Regenerate the dimensions manifest from everything currently on disk, so
  // partial --scene runs keep earlier entries.
  const entries = {};
  for (const file of readdirSync(OUT_DIR).filter((f) => f.endsWith(".webp")).sort()) {
    const meta = await sharp(fileURLToPath(new URL(file, OUT_DIR))).metadata();
    entries[file] = { width: meta.width, height: meta.height };
  }
  const ts = [
    "// AUTO-GENERATED by scripts/capture-guide.mjs — do not edit by hand.",
    "// Maps guide image filenames to intrinsic dimensions so <img> tags reserve",
    "// space (no layout shift) without hand-typing sizes.",
    "export const GUIDE_IMAGES: Record<string, { width: number; height: number }> = {",
    ...Object.entries(entries).map(
      ([file, d]) => `  "${file}": { width: ${d.width}, height: ${d.height} },`,
    ),
    "};",
    "",
  ].join("\n");
  writeFileSync(IMAGES_TS, ts);
  console.log(`\n${Object.keys(entries).length} images in public/guide/ · guideImages.ts regenerated`);
  if (failed > 0) {
    console.error(`${failed} scene(s) failed`);
    process.exit(1);
  }
}

await main();
