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
//   + the "link-only" demo lesson (id in scripts/guide-demo.json)

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
const DEMO_LESSON_TITLE = "ทำไมท้องฟ้าเป็นสีฟ้า? (บทเรียนเดโม)";

const uuid = () => crypto.randomUUID();

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
// Demo lesson document — one of EVERY question block type + formula, so the
// learning-showcase screenshots can come from a single lesson. Attrs mirror the
// *Node.ts definitions exactly (see client/src/components/editor/extensions/).
// ---------------------------------------------------------------------------
const p = (text) => ({ type: "paragraph", content: text ? [{ type: "text", text }] : undefined });
const h = (level, text) => ({
  type: "heading",
  attrs: { level, textAlign: null },
  content: [{ type: "text", text }],
});
const q = (type, attrs) => ({ type, attrs: { id: uuid(), feedbackMode: "quick_check", ...attrs } });

const demoDoc = {
  type: "doc",
  content: [
    h(1, "ทำไมท้องฟ้าเป็นสีฟ้า?"),
    p("เคยสงสัยไหมว่าทำไมตอนกลางวันท้องฟ้าถึงเป็นสีฟ้า ทั้งที่แสงอาทิตย์เป็นสีขาว? บทเรียนสั้นๆ นี้จะพาไปหาคำตอบ พร้อมคำถามชวนคิดระหว่างทาง ลองตอบดูได้เลย ตอบผิดไม่มีโดนดุแน่นอน 🥔"),
    h(2, "แสงสีขาวไม่ได้ขาวอย่างที่คิด"),
    p("แสงจากดวงอาทิตย์ดูเป็นสีขาว แต่จริงๆ แล้วมันคือแสงหลายสีผสมกัน — แดง ส้ม เหลือง เขียว ฟ้า คราม ม่วง — แบบเดียวกับสีรุ้งที่เราเห็นหลังฝนตก"),
    q("QuestionChoice", {
      question: "แสงสีขาวจากดวงอาทิตย์จริงๆ แล้วคืออะไร?",
      choices: [
        { text: "แสงสีเดียวล้วนๆ คือสีขาว", correct: false },
        { text: "แสงหลายสีผสมรวมกัน", correct: true },
        { text: "แสงสีฟ้ากับสีเหลืองอย่างละครึ่ง", correct: false },
      ],
      answerType: "single",
    }),
    p(""),
    h(2, "การกระเจิงของแสง"),
    p("เมื่อแสงอาทิตย์วิ่งชนโมเลกุลอากาศ แสงจะถูกสะท้อนกระจายไปทุกทิศทาง เรียกว่า “การกระเจิง” (scattering) — และแสงที่ความยาวคลื่นสั้นอย่างสีฟ้า กระเจิงได้ดีกว่าแสงความยาวคลื่นยาวอย่างสีแดงมาก"),
    {
      type: "formulaBlock",
      attrs: { id: uuid(), latex: "I \\propto \\frac{1}{\\lambda^{4}}" },
    },
    p("ความเข้มของการกระเจิงแปรผกผันกับความยาวคลื่นยกกำลังสี่ — ความยาวคลื่นสั้นลงนิดเดียว กระเจิงแรงขึ้นมหาศาล นี่คือเหตุผลที่ตาเรามองไปทางไหนก็เจอแสงสีฟ้าที่ถูกกระจายเต็มท้องฟ้า"),
    q("QuestionBlankChoice", {
      template: "แสงสี [Q-0] กระเจิงได้ดีกว่าแสงสี [Q-1] เพราะมีความยาวคลื่นสั้นกว่า",
      choices: ["ฟ้า", "แดง", "เขียว"],
      correctByBlank: [0, 1],
    }),
    p(""),
    q("QuestionBlankWrite", {
      template: "ปรากฏการณ์ที่โมเลกุลอากาศกระจายแสงไปทุกทิศทาง เรียกว่า การ[Q-0]ของแสง",
      blankAnswers: ["กระเจิง"],
    }),
    p(""),
    h(2, "แล้วตอนเย็นทำไมฟ้ากลายเป็นสีส้ม?"),
    p("ตอนพระอาทิตย์ใกล้ตกดิน แสงต้องเดินทางผ่านชั้นบรรยากาศหนาขึ้นมาก แสงสีฟ้าถูกกระเจิงหายไประหว่างทางเกือบหมด เหลือแต่สีแดง-ส้มเดินทางมาถึงตาเรา ท้องฟ้ายามเย็นเลยกลายเป็นสีส้มทอง"),
    q("QuestionWrite", {
      question: "ถ้าเราไปยืนบนดวงจันทร์ซึ่งไม่มีชั้นบรรยากาศ ตอนกลางวันท้องฟ้าจะเป็นสีอะไร? เพราะอะไร?",
      answer: "ท้องฟ้าจะมืด/ดำ แม้เป็นตอนกลางวัน เพราะไม่มีโมเลกุลอากาศให้กระเจิงแสง แสงอาทิตย์จึงเดินทางเป็นเส้นตรงไม่ถูกกระจายไปทั่วท้องฟ้าแบบบนโลก",
    }),
    p(""),
    {
      type: "QuestionAgent",
      attrs: { id: uuid(), title: "สงสัยอะไรเกี่ยวกับแสง ถามได้เลย", chatHistory: [], collapsed: true },
    },
    p("จบบทเรียนแล้ว 🎉 ลองกดปุ่ม Ask AI มุมขวาล่าง ถามอะไรก็ได้เกี่ยวกับบทเรียนนี้ดูสิ"),
  ],
};

async function upsertDemoLesson(teacherToken) {
  const mine = await api("/content/search?mine=true", { token: teacherToken });
  const list = Array.isArray(mine.json) ? mine.json : (mine.json.contents ?? []);
  const existing = list.find((c) => c.title === DEMO_LESSON_TITLE);
  let id = existing?._id ?? existing?.content_id;
  if (!id) {
    const created = await api("/content/create", { method: "POST", token: teacherToken, body: {} });
    id = created.json.content_id ?? created.json._id ?? created.json.id;
    if (!id) throw new Error(`content/create gave no id: ${JSON.stringify(created.json)}`);
    console.log(`✓ created demo lesson ${id}`);
  } else {
    console.log(`✓ reusing demo lesson ${id}`);
  }
  const put = await api(`/content/${id}`, {
    method: "PUT",
    token: teacherToken,
    body: {
      clientUpdatedAt: "", // force save (skip 409 version check)
      title: DEMO_LESSON_TITLE,
      description: "บทเรียนเดโมสำหรับคู่มือการใช้งาน — มีคำถามครบทุกแบบ",
      topics: ["วิทยาศาสตร์", "แสง"],
      access_type: "link-only", // reachable by URL, never listed on Explore
      tiptap_json: JSON.stringify(demoDoc),
    },
  });
  if (put.status !== 200) throw new Error(`PUT content ${put.status}: ${JSON.stringify(put.json)}`);
  console.log("✓ demo lesson content written (link-only)");
  return id;
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
await buildStudentFootprint(student.token, demoLessonId);

const { writeFileSync } = await import("node:fs");
const out = {
  api: API,
  demoLessonId,
  publicTestLessonId: PUBLIC_TEST_LESSON,
  teacherEmail: TEACHER.email,
  studentEmail: STUDENT.email,
  note: "Passwords are NOT stored here — pass --password / GUIDE_DEMO_PASSWORD (default in seed script header).",
};
writeFileSync(new URL("./guide-demo.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log("\n✓ wrote scripts/guide-demo.json");
console.log(`  demo lesson:  /view/${demoLessonId}`);
