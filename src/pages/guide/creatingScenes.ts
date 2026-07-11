import type { GuideScene } from "./scenes";

// creating-showcase — the teacher walkthrough (plan/guide.md §5, 10 scenes).
// The spine follows the editor's own AI-hub numbering (start → write → questions
// → publish) so the guide teaches the same mental model as the sidebar. Button
// names are quoted verbatim from the UI. Screenshots are desktop (the editor is
// desktop-only), captured by scripts/capture-guide.mjs — every scene is `wide`.

export const CREATING_SCENES: GuideScene[] = [
  {
    id: "scene-1",
    wide: true,
    title: { th: "เตรียมตัวก่อนสร้าง", en: "Before you start" },
    steps: [
      {
        th: "สมัคร/เข้าสู่ระบบก่อน (ฟรี ทุกบัญชีสร้างบทเรียนได้ ไม่ต้องขอสิทธิ์พิเศษ)",
        en: "Sign up or log in first (free — every account can create lessons).",
      },
      {
        th: "⚠️ หน้าสร้างบทเรียนใช้บน “คอมพิวเตอร์” เท่านั้น — มือถือเปิดอ่านบทเรียนได้ แต่แก้ไขไม่ได้",
        en: "⚠️ The editor is desktop-only — phones can read lessons but not edit them.",
      },
      {
        th: "กดเมนู “สร้าง” บนแถบด้านบน จะเข้าหน้ารวมบทเรียนของเรา (“เนื้อหาของคุณ”)",
        en: "Tap “Create” in the top bar to reach your lessons list (“Your Content”).",
      },
    ],
    images: [
      {
        file: "creating-01-create-page.webp",
        alt: { th: "หน้ารวมบทเรียนของครู", en: "The teacher's lessons list" },
      },
    ],
  },
  {
    id: "scene-2",
    wide: true,
    title: { th: "สร้างบทเรียนแรก", en: "Create your first lesson" },
    steps: [
      {
        th: "กดปุ่ม “สร้างบทเรียนใหม่” — ได้บทเรียนว่างทันที ไม่ต้องกรอกชื่อหรือคำอธิบายก่อน",
        en: "Hit “New Lesson” — you get a blank lesson instantly, no upfront form.",
      },
      {
        th: "ระบบพาเข้าหน้า editor อัตโนมัติ (ชื่อเรื่อง คำอธิบาย ปก ค่อยใส่ตอนเผยแพร่)",
        en: "It opens the editor for you (title, description, cover come later at publish).",
      },
      {
        th: "หน้าว่างมีการ์ด “ให้ AI ช่วยเริ่ม” ถ้ายังไม่รู้จะเริ่มยังไง กดได้เลย",
        en: "A blank page shows a “Let AI help” card — tap it if you're not sure where to start.",
      },
    ],
    tip: {
      th: "งานไม่หาย — ระบบบันทึกให้อัตโนมัติทุก 30 วินาที และมีปุ่มย้อนกลับ/ทำซ้ำเสมอ",
      en: "Nothing gets lost — it autosaves every 30 seconds and Undo/Redo is always there.",
    },
    images: [
      {
        file: "creating-02-blank-editor.webp",
        alt: { th: "บทเรียนว่างพร้อมการ์ดให้ AI ช่วยเริ่ม", en: "A blank lesson with the AI start card" },
      },
    ],
  },
  {
    id: "scene-3",
    wide: true,
    title: { th: "รู้จักหน้าจอ 4 ส่วน", en: "The 4 regions of the editor" },
    steps: [
      {
        th: "บนสุด: ชื่อเรื่อง · สถานะบันทึก · ย้อนกลับ/ทำซ้ำ · ซูม · ตรวจบทเรียน · ปุ่ม “เผยแพร่”",
        en: "Top: title · save status · undo/redo · zoom · review · the “Publish” button.",
      },
      {
        th: "ซ้าย: 5 หมวดเครื่องมือ (AI นำหน้าเสมอ) — AI · ข้อความ · สื่อ · สูตร · คำถาม",
        en: "Left: 5 tool categories (AI leads) — AI · Text · Media · Formula · Question.",
      },
      {
        th: "กลาง: “กระดาษ” ของเรา — พิมพ์บทเรียนตรงนี้ · ขวา: คุณสมบัติของสิ่งที่เลือกอยู่",
        en: "Center: your page — type the lesson here · Right: properties of whatever you selected.",
      },
      {
        th: "ระบบบันทึกให้เองทุก 30 วิ (กด Ctrl+S ได้ถ้าใจร้อน)",
        en: "It autosaves every 30 s (press Ctrl+S if you're impatient).",
      },
    ],
    images: [
      {
        file: "creating-03-editor-overview.webp",
        alt: { th: "ภาพรวมหน้า editor ทั้ง 4 ส่วน", en: "The whole editor: its 4 regions" },
      },
    ],
  },
  {
    id: "scene-4",
    wide: true,
    title: { th: "เขียนเนื้อหา", en: "Write the content" },
    steps: [
      {
        th: "บรรทัดแรกคือ “ชื่อเรื่อง” (H1) · หัวข้อใหญ่ใช้ “หัวข้อ 2” แล้วเลข 1. 2. 3. จะมาเอง",
        en: "The first line is the Title (H1) · use Heading 2 for sections — 1. 2. 3. numbering is automatic.",
      },
      {
        th: "แผง “ข้อความ” ด้านซ้าย: โครงสร้าง · จัดวาง · สี · ไฮไลต์ · ลิสต์ · ตาราง · เช็กลิสต์",
        en: "The Text panel on the left: structure · alignment · color · highlight · lists · tables · checklists.",
      },
      {
        th: "เลือกคลุมข้อความ แล้วแผงขวาจะมี ตัวหนา/เอียง/ขีดเส้นใต้/ลิงก์ + “ค้นหาและแทนที่”",
        en: "Select text and the right panel offers bold/italic/underline/link + Search & Replace.",
      },
    ],
    images: [
      {
        file: "creating-04-writing.webp",
        alt: { th: "เลือกข้อความแล้วแผงจัดรูปแบบทางขวาโผล่ขึ้นมา", en: "Selecting text reveals the format panel on the right" },
      },
    ],
  },
  {
    id: "scene-5",
    wide: true,
    title: { th: "แทรกรูป ตาราง และกระดานวาด", en: "Insert images, tables, and a draw board" },
    steps: [
      {
        th: "แผง “สื่อ”: อัปโหลดจากเครื่อง/URL หรือคลิกรูปจากคลังภาพ (ลากรูปมาวางในเอกสารก็ได้)",
        en: "The Media panel: upload from device/URL, or click an image from your vault (drag-drop works too).",
      },
      {
        th: "คลิกรูปแล้วครอป/ย่อขยาย/จัดวางได้จากแผงขวา · คลังภาพเต็มๆ อยู่ที่หน้า “จัดการคลังภาพ”",
        en: "Click an image to crop/resize/align from the right panel · the full vault lives under “Manage gallery”.",
      },
      {
        th: "“เพิ่มกระดานแคนวาส” = พื้นที่วาดรูปในตัว มีเทมเพลต รูปทรง เส้นเชื่อม และปากกา",
        en: "“Add canvas board” = a built-in drawing area with templates, shapes, connectors, and a pen.",
      },
    ],
    images: [
      {
        file: "creating-05a-media.webp",
        alt: { th: "แผงสื่อและคลังภาพ", en: "The Media panel and image vault" },
      },
      {
        file: "creating-05b-canvas.webp",
        alt: { th: "กระดานแคนวาสพร้อมเครื่องมือวาด", en: "The canvas board with drawing tools" },
      },
    ],
  },
  {
    id: "scene-6",
    wide: true,
    title: { th: "สูตรคณิต — ไม่ต้องรู้ LaTeX", en: "Math formulas — no LaTeX needed" },
    steps: [
      {
        th: "แผง “สูตร” → “เพิ่มบล็อกสูตร” · กดปุ่มสัญลักษณ์ประกอบเอง หรือให้ AI ช่วยก็ได้",
        en: "The Formula panel → “Add Formula Block” · build it from symbol buttons, or let AI help.",
      },
      {
        th: "กด “ให้ AI เขียนสูตร (ไม่ต้องรู้ LaTeX)” แล้วพิมพ์แบบคน เช่น s = ut + 1/2at^2 + บอกว่าคือสูตรอะไร",
        en: "Tap “Let AI write the LaTeX”, type it the human way (s = ut + 1/2at^2) + say what it is.",
      },
      {
        th: "ได้สูตรสวยๆ ทันที และแก้ LaTeX ต่อเองได้เสมอถ้าอยากปรับ",
        en: "You get a clean rendered formula instantly — and can still hand-edit the LaTeX any time.",
      },
    ],
    images: [
      {
        file: "creating-06-formula.webp",
        alt: { th: "AI เขียนสูตรจากข้อความที่ครูพิมพ์", en: "AI writes the formula from what the teacher typed" },
      },
    ],
  },
  {
    id: "scene-7",
    wide: true,
    title: { th: "สร้างคำถามชวนคิด (หัวใจของเว็บนี้)", en: "Create think-questions (the heart of this site)" },
    steps: [
      {
        th: "แผง “คำถาม”: 5 แบบ — เลือกตอบ · เขียนตอบ · เติมคำ(ลาก) · เติมคำ(พิมพ์) · กล่องถาม AI",
        en: "The Question panel: 5 types — choice · written · drag-blank · type-blank · Ask-AI block.",
      },
      {
        th: "“แนวเฉลย” สำคัญมาก — AI ติวเตอร์ใช้มันสอนนักเรียน (ให้ AI ร่างแนวเฉลยให้ได้ · ตัวลวงก็ให้ AI เสนอได้)",
        en: "The guide answer matters — the tutor teaches from it (AI can draft it · AI can suggest distractors).",
      },
      {
        th: "โหมดคำแนะนำ: “เข้าใจแบบย่อ” ⇄ “สะท้อนความคิดแบบละเอียด” · ปุ่มรูปตา = ดูตัวอย่างแบบนักเรียน",
        en: "Feedback mode: “quick understanding” ⇄ “deep reflection” · the eye icon = preview as a student.",
      },
    ],
    images: [
      {
        file: "creating-07a-question-panel.webp",
        alt: { th: "แผงคำถามพร้อม 5 ประเภทบล็อก", en: "The Question panel with 5 block types" },
      },
      {
        file: "creating-07b-question-creator.webp",
        alt: { th: "AI ร่างแนวเฉลยให้ตรวจก่อนใช้", en: "AI drafts a guide answer for you to review" },
      },
    ],
  },
  {
    id: "scene-8",
    wide: true,
    title: { th: "ให้ AI ช่วยทั้งเส้นทาง", en: "Let AI help the whole way" },
    steps: [
      {
        th: "หมวด AI (ไอคอน ✨ บนสุด) เรียงตามขั้นตอน: 1 เริ่ม → 2 เขียนและเกลา → 3 คำถาม → 4 ก่อนเผยแพร่",
        en: "The AI category (✨ at the top) runs by step: 1 start → 2 write & polish → 3 questions → 4 before publish.",
      },
      {
        th: "“วางเนื้อหาเดิม” คือทางลัด — วางชีทเก่า ไฟล์ Word หรือแชต GPT แล้ว AI จัดให้เป็นบทเรียนพร้อมคำถาม",
        en: "“Import existing material” is the shortcut — paste old sheets, Word, or GPT chats → a structured lesson.",
      },
      {
        th: "กติกาเดียวที่ต้องรู้: AI เสนอ เราเลือก — ไม่มีอะไรลงเอกสารจนกว่าครูจะกดรับ",
        en: "The one rule: AI proposes, you accept — nothing lands in the doc until you say so.",
      },
    ],
    images: [
      {
        file: "creating-08a-ai-hub.webp",
        alt: { th: "ศูนย์รวมเครื่องมือ AI 4 กลุ่ม", en: "The AI hub with its 4 workflow groups" },
      },
      {
        file: "creating-08b-draft-preview.webp",
        alt: { th: "AI ร่างโครงบทเรียนให้ดูก่อนแทรก", en: "AI drafts a lesson outline to preview before inserting" },
      },
    ],
  },
  {
    id: "scene-9",
    wide: true,
    title: { th: "ตรวจ แล้วเผยแพร่", en: "Review, then publish" },
    steps: [
      {
        th: "“ตรวจบทเรียน” = AI อ่านทั้งบทแล้วบอกจุดที่ปรับได้ (แค่คำแนะนำ ไม่บังคับ ไม่บล็อกการเผยแพร่)",
        en: "“Review the lesson” = AI reads it all and flags what to improve (advice only — never blocks publishing).",
      },
      {
        th: "กด “เผยแพร่” → ตั้งชื่อ + รูปปก + หัวข้อ + คำอธิบาย (มีปุ่ม “ให้ AI ช่วยกรอก”)",
        en: "Hit “Publish” → set title + cover + topics + description (an “AI autofill” button is there).",
      },
      {
        th: "การมองเห็น 3 แบบ: สาธารณะ (ขึ้นหน้าสำรวจ) · เฉพาะลิงก์ (เห็นเฉพาะคนมีลิงก์) · ส่วนตัว · ตั้งนิสัย AI ติวเตอร์ประจำบทเรียนได้ด้วย",
        en: "3 visibility levels: Public (listed on Explore) · Link-only · Private · you can also set this lesson's AI-tutor style.",
      },
    ],
    images: [
      {
        file: "creating-09a-critic.webp",
        alt: { th: "AI ตรวจบทเรียนพร้อมเช็กลิสต์และจุดที่ปรับได้", en: "The AI lesson review with a checklist and suggestions" },
      },
      {
        file: "creating-09b-publish-modal.webp",
        alt: { th: "หน้าต่างตั้งค่าการเผยแพร่", en: "The publish settings modal" },
      },
    ],
  },
  {
    id: "scene-10",
    wide: true,
    title: { th: "แชร์ให้นักเรียน แล้วดูผ่านตาเขา", en: "Share it, then see it as a student" },
    steps: [
      {
        th: "ในส่วน “การแชร์”: ให้ QR code นักเรียนสแกน (แตะเพื่อขยายเต็มจอ ฉายขึ้นโปรเจกเตอร์ได้) หรือคัดลอกลิงก์ไปวางใน LINE/Facebook",
        en: "Under “Sharing”: a QR code for students to scan (tap to enlarge for a projector) or copy the link into LINE/Facebook.",
      },
      {
        th: "นักเรียนเปิดได้เลย “ไม่ต้องมีบัญชี” · กด “เผยแพร่ตอนนี้” ระบบพาไปหน้าที่นักเรียนเห็นจริง",
        en: "Students open it with no account needed · “Publish now” takes you to exactly what students see.",
      },
      {
        th: "เจอจุดต้องแก้? กดปุ่มดินสอ (มุมขวาล่าง) กลับมาแก้ได้ · ลบบทเรียนได้จากปุ่มลบในหน้าต่างเผยแพร่",
        en: "Spot a fix? Tap the pencil (bottom-right) to edit again · delete a lesson from the Delete button in the publish modal.",
      },
    ],
    tip: {
      th: "ตอนนี้ลิงก์ที่แชร์จะขึ้น preview เป็นการ์ดกลางของเว็บ (การ์ดรายบทเรียนกำลังจะตามมา)",
      en: "For now a shared link previews as a generic site card (per-lesson cards are on the way).",
    },
    images: [
      {
        file: "creating-10-share.webp",
        alt: { th: "QR code และลิงก์สำหรับแชร์ให้นักเรียน", en: "The QR code and link for sharing with students" },
      },
    ],
  },
];
