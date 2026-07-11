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
import { buildScratchDoc, scratchTitle } from "./guide-demo-docs.mjs";

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

// The teacher-editing scenes mutate the scratch lesson in the browser (insert
// blocks, run AI). The editor autosaves, so reset the doc to its baseline via
// the API before each mutating scene — keeps every capture run deterministic.
let teacherToken = null;
async function resetScratch() {
  if (!teacherToken) return;
  await fetch(`${API}/content/${demo.scratchLessonId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      clientUpdatedAt: "", // force save (skip 409)
      title: scratchTitle,
      access_type: "private",
      tiptap_json: JSON.stringify(buildScratchDoc()),
    }),
  });
}

const CANVAS_SCRATCH = () => `${BASE}/canvas/${demo.scratchLessonId}`;

/** Wait until the desktop editor has painted the scratch lesson's H1. */
async function waitForEditor(page, headingText = "แรงและการเคลื่อนที่") {
  await page.locator(".ProseMirror").first().waitFor({ timeout: 30_000 });
  await page.locator(".ProseMirror").getByText(headingText).first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(500); // let sidebars settle (canvas sync clears at ~10ms)
}

/** Click a left-rail category by its Thai label (AI · ข้อความ · สื่อ · สูตร · คำถาม). */
async function openCategory(page, label) {
  await page.getByTitle(label, { exact: true }).first().click();
  await page.waitForTimeout(400);
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

  // ── creating-showcase (teacher) — desktop 1280, logged in as the demo teacher.
  // The editor is desktop-only; these scenes drive the real editor and reset the
  // scratch lesson between mutations (resetScratch) so runs are deterministic.
  {
    out: "creating-01-create-page.webp",
    viewport: "desktop",
    auth: "teacher",
    run: async (page) => {
      await page.goto(`${BASE}/create`);
      await page.getByText(/เนื้อหาของคุณ|Your Content/).first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(800); // let the lesson grid load
      return null;
    },
  },
  {
    out: "creating-02-blank-editor.webp",
    viewport: "desktop",
    auth: "teacher",
    run: async (page) => {
      await page.goto(`${BASE}/canvas/${demo.blankLessonId}`);
      await page
        .getByText("หน้าว่างอยู่ใช่ไหม ให้ AI ช่วยเริ่มได้นะ ✨")
        .first()
        .waitFor({ timeout: 30_000 });
      await page.waitForTimeout(500);
      return null;
    },
  },
  {
    out: "creating-03-editor-overview.webp",
    viewport: "desktop",
    auth: "teacher",
    run: async (page) => {
      await resetScratch();
      await page.goto(CANVAS_SCRATCH());
      await waitForEditor(page);
      return null; // full editor — the scene labels the 4 regions in copy
    },
  },
  {
    out: "creating-04-writing.webp",
    viewport: "desktop",
    auth: "teacher",
    run: async (page) => {
      await resetScratch();
      await page.goto(CANVAS_SCRATCH());
      await waitForEditor(page);
      await openCategory(page, "ข้อความ");
      // Select a paragraph so the right sidebar flips to its text-format panel.
      await page
        .locator(".ProseMirror p")
        .filter({ hasText: "แรงคือการผลักหรือดึง" })
        .first()
        .click({ clickCount: 3 });
      await page.waitForTimeout(500);
      return null;
    },
  },
  {
    out: "creating-05a-media.webp",
    viewport: "desktop",
    auth: "teacher",
    run: async (page) => {
      await resetScratch();
      await page.goto(CANVAS_SCRATCH());
      await waitForEditor(page);
      await openCategory(page, "สื่อ");
      // Wait for the vault thumbnails to actually decode (they're loading="lazy").
      await page
        .waitForFunction(
          () => {
            const imgs = [...document.querySelectorAll(".editor-sidebar-left img")];
            return imgs.length >= 4 && imgs.slice(0, 4).every((i) => i.naturalWidth > 0);
          },
          { timeout: 15_000 },
        )
        .catch(() => {});
      await page.waitForTimeout(400);
      return null;
    },
  },
  {
    out: "creating-05b-canvas.webp",
    viewport: "desktop",
    auth: "teacher",
    run: async (page) => {
      await resetScratch();
      await page.goto(CANVAS_SCRATCH());
      await waitForEditor(page);
      await openCategory(page, "ข้อความ");
      await page.getByRole("button", { name: /เพิ่มกระดานแคนวาส/ }).click();
      // The fabric canvas takes over both sidebars once its node registers.
      await page.waitForTimeout(1_500);
      return null;
    },
  },
  {
    out: "creating-06-formula.webp",
    viewport: "desktop",
    auth: "teacher",
    ai: true,
    run: async (page) => {
      await resetScratch();
      await page.goto(CANVAS_SCRATCH());
      await waitForEditor(page);
      await openCategory(page, "สูตร");
      // Place the cursor in the doc so the block inserts inside the lesson.
      await page.locator(".ProseMirror p").first().click();
      await page.getByRole("button", { name: /เพิ่มบล็อกสูตร/ }).click();
      await page.waitForTimeout(800);
      const block = page
        .locator("[data-node-view-wrapper]")
        .filter({ hasText: /บล็อกสูตร/ })
        .first();
      await block.waitFor({ timeout: 15_000 });
      await block.scrollIntoViewIfNeeded();
      // Open the "let AI write the LaTeX" panel and generate from a human-typed formula.
      await block.getByText("ให้ AI เขียนสูตร").first().click();
      await block.getByPlaceholder(/s = ut/).fill("s = ut + 1/2at^2");
      await block.getByPlaceholder(/สมการการเคลื่อนที่|equation of motion/).fill("สมการการเคลื่อนที่");
      try {
        await block.getByRole("button", { name: /^สร้างสูตร$|Generate formula/ }).click();
        // Rendered KaTeX appears once the AI returns valid LaTeX.
        await block.locator(".katex").first().waitFor({ timeout: 60_000 });
        await page.waitForTimeout(500);
      } catch {
        /* AI hiccup — the filled panel is still a usable screenshot */
      }
      await block.scrollIntoViewIfNeeded();
      return block;
    },
  },
  {
    out: "creating-07a-question-panel.webp",
    viewport: "desktop",
    auth: "teacher",
    run: async (page) => {
      await resetScratch();
      await page.goto(CANVAS_SCRATCH());
      await waitForEditor(page);
      await openCategory(page, "คำถาม");
      await page.waitForTimeout(500);
      return null;
    },
  },
  {
    out: "creating-07b-question-creator.webp",
    viewport: "desktop",
    auth: "teacher",
    ai: true,
    run: async (page) => {
      await resetScratch();
      await page.goto(CANVAS_SCRATCH());
      await waitForEditor(page);
      await openCategory(page, "คำถาม");
      await page.getByRole("button", { name: /คำตอบเชิงอธิบาย/ }).click();
      await page.waitForTimeout(600);
      const card = page
        .locator("[data-node-view-wrapper]")
        .filter({ hasText: /คำถามแบบเขียน/ })
        .first();
      await card.waitFor({ timeout: 15_000 });
      await card.scrollIntoViewIfNeeded();
      await card
        .getByPlaceholder(/พิมพ์คำถามแบบเขียน/)
        .fill("ทำไมรถที่กำลังวิ่งถึงไม่หยุดทันทีเมื่อเราเลิกเหยียบคันเร่ง?");
      try {
        await card.getByRole("button", { name: /ให้ AI ร่างแนวเฉลย/ }).click();
        await card.getByText(/แนวเฉลยที่ AI ร่าง|AI draft/).first().waitFor({ timeout: 60_000 });
        await page.waitForTimeout(500);
      } catch {
        /* AI hiccup — the creator card with the question is still usable */
      }
      await card.scrollIntoViewIfNeeded();
      return card;
    },
  },
  {
    out: "creating-08a-ai-hub.webp",
    viewport: "desktop",
    auth: "teacher",
    run: async (page) => {
      await resetScratch();
      await page.goto(CANVAS_SCRATCH());
      await waitForEditor(page);
      await openCategory(page, "AI");
      await page.getByText("1 · เริ่มบทเรียน").first().waitFor({ timeout: 15_000 });
      await page.waitForTimeout(400);
      return null;
    },
  },
  {
    out: "creating-08b-draft-preview.webp",
    viewport: "desktop",
    auth: "teacher",
    ai: true,
    run: async (page) => {
      await resetScratch();
      await page.goto(CANVAS_SCRATCH());
      await waitForEditor(page);
      await openCategory(page, "AI");
      await page.getByRole("button", { name: /ร่างโครงบทเรียน/ }).click();
      const dialog = page.locator("[data-editor-modal]").first();
      await dialog.waitFor({ timeout: 15_000 });
      await dialog.getByPlaceholder(/แรงและการเคลื่อนที่|Force and motion/).fill("แรงและการเคลื่อนที่");
      await dialog.locator("select").first().selectOption("ม.1");
      try {
        // "ร่างโครง" names both the tab and the submit button — the submit is last.
        await dialog.getByRole("button", { name: /^ร่างโครง$|^Draft outline$/ }).last().click();
        await dialog
          .getByRole("button", { name: /แทรกลงบทเรียน|Insert into lesson/ })
          .waitFor({ timeout: 90_000 });
        await page.waitForTimeout(600);
      } catch {
        /* AI hiccup — the filled dialog is still a usable screenshot */
      }
      return null; // modal fills the viewport
    },
  },
  {
    out: "creating-09a-critic.webp",
    viewport: "desktop",
    auth: "teacher",
    ai: true,
    run: async (page) => {
      await resetScratch();
      await page.goto(CANVAS_SCRATCH());
      await waitForEditor(page);
      await page.getByRole("button", { name: /ตรวจบทเรียน/ }).click();
      await page.getByText("ผลตรวจบทเรียนจาก AI").first().waitFor({ timeout: 15_000 });
      try {
        // The critic auto-runs on open; wait for the checklist section to render.
        await page.getByText(/เช็กลิสต์บทเรียน|Checklist/).first().waitFor({ timeout: 90_000 });
        await page.waitForTimeout(600);
      } catch {
        /* still shows the loading/summary state */
      }
      return null;
    },
  },
  {
    out: "creating-09b-publish-modal.webp",
    viewport: "desktop",
    auth: "teacher",
    run: async (page) => {
      await resetScratch();
      await page.goto(CANVAS_SCRATCH());
      await waitForEditor(page);
      await page.getByRole("button", { name: /^เผยแพร่$|^Publish$/ }).click();
      await page.getByText(/ตั้งค่าการเผยแพร่|Publish settings/).first().waitFor({ timeout: 15_000 });
      // Show "public" selected so the scene reads as "publishing to Explore".
      await page.getByRole("button", { name: /^สาธารณะ$|^Public$/ }).click();
      await page.waitForTimeout(600);
      return null;
    },
  },
  {
    out: "creating-10-share.webp",
    viewport: "desktop",
    auth: "teacher",
    run: async (page) => {
      await resetScratch();
      await page.goto(CANVAS_SCRATCH());
      await waitForEditor(page);
      await page.getByRole("button", { name: /^เผยแพร่$|^Publish$/ }).click();
      await page.getByText(/ตั้งค่าการเผยแพร่|Publish settings/).first().waitFor({ timeout: 15_000 });
      // Scroll the modal to the sharing section (QR code + copy link).
      await page.getByText(/^การแชร์$|^Sharing$/).first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
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
    teacherToken = sessions.teacher.token; // used by resetScratch()
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
