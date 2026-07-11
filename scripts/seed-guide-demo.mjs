// seed-guide-demo.mjs — create/refresh the demo accounts + demo lesson used by
// the guide screenshot pipeline (scripts/capture-guide.mjs). Rerunnable: reuses
// existing accounts/lesson when found. See plan/guide.md §6 (workspace root).
//
// Usage:
//   node scripts/capture-guide.mjs            <- capture (reads guide-demo.json)
//   node scripts/seed-guide-demo.mjs          <- this script (writes guide-demo.json)
//     --api http://localhost:5000/api         (default)
//     --password <pw>                         (default: HotPotato-guide-2026)
//     --skip-ai                               (skip the tutor chats that build the
//                                              student's memory — no Gemini cost)
//
// Accounts land in whatever DB the local server points at. Cleanup candidates:
//   guide.teacher@hotpotato.local / guide.student@hotpotato.local
//   + the "link-only" demo lesson, the private scratch/blank lessons, and the
//     teacher's 4 vault images (ids in scripts/guide-demo.json)

import {
  buildDemoDoc,
  buildScratchDoc,
  demoLessonTitle,
  emptyDoc,
  scratchTitle,
} from "./guide-demo-docs.mjs";

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};

const API = getArg("api", process.env.GUIDE_API ?? "http://localhost:5000/api");
const PASSWORD = getArg("password", process.env.GUIDE_DEMO_PASSWORD ?? "HotPotato-guide-2026");
const SKIP_AI = args.includes("--skip-ai");

const TEACHER = { name: "ครูเดโม", email: "guide.teacher@hotpotato.local" };
const STUDENT = { name: "น้องเดโม", email: "guide.student@hotpotato.local" };
// The real public smoke-test lesson (AGENT.md §8) — visited to fill the student's history.
const PUBLIC_TEST_LESSON = "69e39d0b60d467bd515a4945";
const DEMO_LESSON_TITLE = demoLessonTitle;

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function loginOrRegister({ name, email }) {
  const login = await api("/auth/login", { method: "POST", body: { email, password: PASSWORD } });
  if (login.status === 200 && login.json.token) {
    console.log(`✓ login ${email}`);
    return login.json;
  }
  const reg = await api("/auth/register", {
    method: "POST",
    body: { name, email, password: PASSWORD },
  });
  if (reg.status !== 200 && reg.status !== 201) {
    throw new Error(`register ${email} failed (${reg.status}): ${JSON.stringify(reg.json)}`);
  }
  console.log(`✓ registered ${email}`);
  return reg.json;
}

// ---------------------------------------------------------------------------
// Demo lessons — documents live in guide-demo-docs.mjs (shared with the
// capture script, which resets the scratch/blank lessons between scenes).
// ---------------------------------------------------------------------------
async function fetchMine(teacherToken) {
  const mine = await api("/content/search?mine=true", { token: teacherToken });
  return Array.isArray(mine.json) ? mine.json : (mine.json.contents ?? []);
}

async function upsertLesson(teacherToken, existingId, { label, ...body }) {
  let id = existingId;
  if (!id) {
    const created = await api("/content/create", { method: "POST", token: teacherToken, body: {} });
    id = created.json.content_id ?? created.json._id ?? created.json.id;
    if (!id) throw new Error(`content/create gave no id: ${JSON.stringify(created.json)}`);
    console.log(`✓ created ${label} ${id}`);
  } else {
    console.log(`✓ reusing ${label} ${id}`);
  }
  const put = await api(`/content/${id}`, {
    method: "PUT",
    token: teacherToken,
    body: { clientUpdatedAt: "", ...body }, // clientUpdatedAt "" = force save (skip 409)
  });
  if (put.status !== 200) throw new Error(`PUT ${label} ${put.status}: ${JSON.stringify(put.json)}`);
  console.log(`✓ ${label} content written`);
  return id;
}

async function upsertDemoLesson(teacherToken) {
  const list = await fetchMine(teacherToken);
  const existing = list.find((c) => c.title === DEMO_LESSON_TITLE);
  return upsertLesson(teacherToken, existing?._id ?? existing?.content_id, {
    label: "demo lesson",
    title: DEMO_LESSON_TITLE,
    description: "บทเรียนเดโมสำหรับคู่มือการใช้งาน — มีคำถามครบทุกแบบ",
    topics: ["วิทยาศาสตร์", "แสง"],
    access_type: "link-only", // reachable by URL, never listed on Explore
    tiptap_json: JSON.stringify(buildDemoDoc()),
  });
}

/** Teacher scratch lesson — the creating-showcase screenshots edit this one. */
async function upsertScratchLesson(teacherToken) {
  const list = await fetchMine(teacherToken);
  const existing = list.find((c) => c.title === scratchTitle);
  return upsertLesson(teacherToken, existing?._id ?? existing?.content_id, {
    label: "scratch lesson",
    title: scratchTitle,
    access_type: "private",
    tiptap_json: JSON.stringify(buildScratchDoc()),
  });
}

/** Untitled blank lesson — the "fresh new lesson" screenshot (empty-doc AI CTA). */
async function upsertBlankLesson(teacherToken) {
  const list = await fetchMine(teacherToken);
  const existing = list.find((c) => !c.title || !c.title.trim());
  return upsertLesson(teacherToken, existing?._id ?? existing?.content_id, {
    label: "blank lesson",
    title: "",
    access_type: "private",
    tiptap_json: JSON.stringify(emptyDoc),
  });
}

// Fill the teacher's image vault (Media panel screenshot needs a real grid).
// placehold.co because the server validates the URL with a HEAD request and
// most photo hosts (picsum, wikimedia) reject HEAD. Non-fatal: the capture
// still works with an emptier vault.
const VAULT_SEED_URLS = [
  "https://placehold.co/640x420/8b5cf6/ffffff/jpeg?text=Force",
  "https://placehold.co/640x420/0ea5e9/ffffff/jpeg?text=Motion",
  "https://placehold.co/640x420/f59e0b/ffffff/jpeg?text=Friction",
  "https://placehold.co/640x420/10b981/ffffff/jpeg?text=Lab",
];
async function seedVaultImages(teacherToken) {
  try {
    const current = await api("/images", { token: teacherToken });
    const count = Array.isArray(current.json) ? current.json.length : 0;
    if (count >= 4) {
      console.log(`✓ vault already has ${count} images`);
      return;
    }
    for (const url of VAULT_SEED_URLS.slice(0, 4 - count)) {
      const r = await api("/images/url", { method: "POST", token: teacherToken, body: { url } });
      console.log(`  vault upload -> ${r.status}`);
    }
  } catch (err) {
    console.log(`⚠ vault seeding skipped: ${err.message}`);
  }
}

async function buildStudentFootprint(studentToken, demoLessonId) {
  for (const contentId of [PUBLIC_TEST_LESSON, demoLessonId]) {
    const r = await api(`/history/visit/${contentId}`, { method: "POST", token: studentToken });
    console.log(`  history visit ${contentId} -> ${r.status}`);
  }
  if (SKIP_AI) {
    console.log("… --skip-ai: skipping tutor chats (StudentMemory will stay empty)");
    return;
  }
  // 4 free-chat turns → crosses the AI_MEMORY_EVERY_N_TURNS=3 threshold so the
  // async memory update runs and the Profile memory card has something to show.
  const messages = [
    "สวัสดีครับ ผมชื่อน้องเดโม ชอบเรื่องอวกาศกับดาราศาสตร์มากๆ เลย",
    "ทำไมท้องฟ้าตอนเย็นถึงเป็นสีส้มครับ?",
    "ผมว่าฟิสิกส์สนุกดี แต่ยังงงเรื่องความยาวคลื่นอยู่นิดหน่อย ช่วยอธิบายง่ายๆ ได้ไหม",
    "ขอบคุณครับ ชอบคำอธิบายสั้นๆ แบบนี้แหละ เข้าใจง่ายดี",
  ];
  for (const message of messages) {
    const r = await api("/chat/tutor", {
      method: "POST",
      token: studentToken,
      body: {
        contentId: demoLessonId,
        blockId: "__lesson_ai_assistant__",
        mode: "free_chat",
        message,
      },
    });
    console.log(`  tutor turn -> ${r.status}${r.status !== 200 ? ` ${JSON.stringify(r.json).slice(0, 120)}` : ""}`);
  }
  // Memory update is fire-and-forget on the server; give it a moment, then check.
  await new Promise((r) => setTimeout(r, 8000));
  const mem = await api("/chat/memory", { token: studentToken });
  const filled = Object.values(mem.json ?? {}).some((v) => Array.isArray(v) && v.length > 0);
  console.log(filled ? "✓ StudentMemory populated" : "⚠ StudentMemory still empty — rerun later or chat once more");
}

const teacher = await loginOrRegister(TEACHER);
const student = await loginOrRegister(STUDENT);
const demoLessonId = await upsertDemoLesson(teacher.token);
const scratchLessonId = await upsertScratchLesson(teacher.token);
const blankLessonId = await upsertBlankLesson(teacher.token);
await seedVaultImages(teacher.token);
await buildStudentFootprint(student.token, demoLessonId);

const { writeFileSync } = await import("node:fs");
const out = {
  api: API,
  demoLessonId,
  scratchLessonId,
  blankLessonId,
  publicTestLessonId: PUBLIC_TEST_LESSON,
  teacherEmail: TEACHER.email,
  studentEmail: STUDENT.email,
  note: "Passwords are NOT stored here — pass --password / GUIDE_DEMO_PASSWORD (default in seed script header).",
};
writeFileSync(new URL("./guide-demo.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log("\n✓ wrote scripts/guide-demo.json");
console.log(`  demo lesson:    /view/${demoLessonId}`);
console.log(`  scratch lesson: /canvas/${scratchLessonId}`);
console.log(`  blank lesson:   /canvas/${blankLessonId}`);
