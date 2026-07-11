import type { GuideScene } from "./scenes";

// learning-showcase — the student walkthrough (plan/guide.md §4, 9 scenes).
// Framing rule (decision G6): anonymous-first — scenes 1–7 never require an
// account; scene 8 presents login as a bonus. Button names are quoted verbatim
// from the UI. Images are captured by scripts/capture-guide.mjs.

export const LEARNING_SCENES: GuideScene[] = [
  {
    id: "scene-1",
    title: {
      th: "เริ่มได้เลย ไม่ต้องสมัคร",
      en: "Start right away — no sign-up",
    },
    steps: [
      {
        th: "เว็บนี้คือที่อ่านบทเรียน ตอบคำถามชวนคิด และถาม AI ติวเตอร์ได้ฟรี",
        en: "This site is where you read lessons, answer think-questions, and chat with a free AI tutor.",
      },
      {
        th: "เข้ามาแล้วกดปุ่ม “Start exploring” ได้ทันที",
        en: "Land on the home page and tap “Start exploring”.",
      },
      {
        th: "ไม่ต้องมีบัญชีก็ใช้ได้ครบทุกอย่าง — อ่านได้ ตอบได้ ถาม AI ได้",
        en: "No account needed for any of it — read, answer, and ask the AI freely.",
      },
    ],
    images: [
      {
        file: "learning-01-landing.webp",
        alt: { th: "หน้าแรกของเว็บ", en: "The landing page" },
      },
    ],
  },
  {
    id: "scene-2",
    title: {
      th: "หาบทเรียนที่อยากอ่าน",
      en: "Find a lesson you like",
    },
    steps: [
      {
        th: "หน้า “สำรวจ” รวมบทเรียนสาธารณะทั้งหมด — พิมพ์ค้นหาจากชื่อได้เลย",
        en: "The Explore page lists every public lesson — search by title right away.",
      },
      {
        th: "แท็บ ทั้งหมด / บุ๊กมาร์ก / ล่าสุด ช่วยกรองให้เร็วขึ้น",
        en: "The All / Bookmarked / Recent tabs filter the grid.",
      },
      {
        th: "กดรูปที่คั่นหนังสือมุมการ์ดเพื่อเก็บบทเรียนไว้ดูทีหลัง (จำไว้ในเครื่องเรา ไม่ต้อง login)",
        en: "Tap the bookmark icon on a card to save it for later (stored on your device — no login).",
      },
      {
        th: "แตะการ์ดเพื่อเปิดบทเรียน",
        en: "Tap a card to open the lesson.",
      },
    ],
    images: [
      {
        file: "learning-02-explore.webp",
        alt: { th: "หน้าสำรวจบทเรียน", en: "The Explore page" },
      },
    ],
    cta: { to: "/explore", label: { th: "ไปหน้าสำรวจ", en: "Open Explore" } },
  },
  {
    id: "scene-3",
    title: {
      th: "เปิดบทเรียนแล้วอ่านสบายๆ",
      en: "Read comfortably",
    },
    steps: [
      {
        th: "เลื่อนอ่านได้เลย — แถบเมนูบนจะหลบให้เองตอนเลื่อนลง แล้วโผล่กลับมาตอนเลื่อนขึ้น",
        en: "Just scroll — the top bar hides itself as you read down and returns when you scroll up.",
      },
      {
        th: "หัวข้อใหญ่มีเลข 1. 2. 3. ให้อัตโนมัติ ไล่อ่านตามลำดับได้ง่าย",
        en: "Big sections are auto-numbered 1. 2. 3. so it's easy to follow along.",
      },
      {
        th: "บนคอมพิวเตอร์: กด Ctrl ค้างแล้วหมุนลูกกลิ้งเมาส์เพื่อซูม, Ctrl+0 กลับมาพอดีจอ",
        en: "On a computer: hold Ctrl and scroll to zoom, Ctrl+0 to fit the screen again.",
      },
    ],
    images: [
      {
        file: "learning-03-viewer.webp",
        alt: { th: "หน้าอ่านบทเรียน", en: "The lesson viewer" },
      },
    ],
  },
  {
    id: "scene-4",
    title: {
      th: "เจอคำถามในบทเรียน — ลองตอบเลย",
      en: "Meet the questions — try answering",
    },
    steps: [
      {
        th: "คำถามฝังอยู่ในบทเรียน มี 4 แบบ: เลือกตอบ · เขียนตอบ · ลากคำเติมช่องว่าง · พิมพ์เติมช่องว่าง",
        en: "Questions live inside the lesson, in 4 styles: multiple choice, written answer, drag-into-blank, and type-into-blank.",
      },
      {
        th: "ตอบเสร็จแล้วกดปุ่ม “ส่ง”",
        en: "Answer, then hit “ส่ง” (Submit).",
      },
      {
        th: "ตอบผิดไม่มีโดนดุ — AI จะชมวิธีคิดของเราก่อน แล้วค่อยชวนคิดต่อ",
        en: "Wrong answers never get you scolded — the AI admires your thinking first, then nudges you deeper.",
      },
    ],
    tip: {
      th: "ข้อเขียนตอบไม่มีถูก/ผิดตายตัว — AI ดูวิธีคิดของเรา ไม่ใช่จับผิดคำตอบ",
      en: "Written questions have no hard right/wrong — the AI reads your reasoning, it doesn't nitpick.",
    },
    images: [
      {
        file: "learning-04a-choice.webp",
        alt: { th: "คำถามแบบเลือกตอบ", en: "A multiple-choice question" },
      },
      {
        file: "learning-04b-write.webp",
        alt: { th: "คำถามแบบเขียนตอบ", en: "A written-answer question" },
      },
      {
        file: "learning-04c-blankdrag.webp",
        alt: { th: "คำถามแบบลากคำเติมช่องว่าง", en: "A drag-into-blank question" },
      },
    ],
  },
  {
    id: "scene-5",
    title: {
      th: "อ่านคำแนะนำจาก AI แล้วคุยต่อได้",
      en: "Read the AI feedback — and keep talking",
    },
    steps: [
      {
        th: "หลังกดส่ง AI จะค่อยๆ พิมพ์คำแนะนำออกมาสดๆ (ครั้งแรกอาจช้านิดนึง เซิร์ฟเวอร์เพิ่งตื่น 😴)",
        en: "After you submit, the AI types its feedback live (the first reply can be slow — the server just woke up 😴).",
      },
      {
        th: "ชิปม่วงๆ ใต้คำตอบคือคำถามชวนคิดต่อ — แตะแล้วส่งได้ทันที",
        en: "The purple chips under the reply are follow-up questions — tap one to send it instantly.",
      },
      {
        th: "ปุ่ม “ส่งคำตอบเพิ่มเติม?” เปิดห้องคุยต่อในข้อนั้น — ถามอะไรก็ได้ ไม่ถูกตรวจซ้ำ",
        en: "“ส่งคำตอบเพิ่มเติม?” opens a follow-up thread on that question — chat freely, it won't re-grade you.",
      },
      {
        th: "อยากเริ่มข้อนั้นใหม่หมด กด “ลองใหม่”",
        en: "Want a clean retry? Hit “ลองใหม่” (Try again).",
      },
    ],
    tip: {
      th: "AI ตอบช้าช่วงแรกเป็นเรื่องปกติ ไม่ใช่เว็บพัง — รอแป๊บเดียวเดี๋ยวมา",
      en: "A slow first AI reply is normal, not a crash — give it a moment.",
    },
    images: [
      {
        file: "learning-05-feedback.webp",
        alt: { th: "คำแนะนำจาก AI พร้อมชิปคำถามต่อยอด", en: "AI feedback with suggestion chips" },
      },
    ],
  },
  {
    id: "scene-6",
    title: {
      th: "สงสัยอะไร ถาม AI ได้ตลอดเวลา",
      en: "Ask the AI anything, anytime",
    },
    steps: [
      {
        th: "ปุ่ม “Ask AI” ลอยอยู่มุมขวาล่างของทุกบทเรียน — กดแล้วพิมพ์ถามได้เลย",
        en: "The “Ask AI” button floats at the bottom-right of every lesson — tap and ask away.",
      },
      {
        th: "AI รู้ว่าเรากำลังอ่านอยู่ตรงส่วนไหนของบทเรียน คำตอบเลยตรงจุด",
        en: "The AI knows which part of the lesson you're reading, so answers stay on point.",
      },
      {
        th: "บางบทเรียนครูฝังกล่อง “ถาม AI” ไว้ในเนื้อหาให้ถามตรงนั้นได้เลย",
        en: "Some lessons embed an “Ask AI” box right inside the content.",
      },
      {
        th: "ปุ่ม Clear chat ล้างบทสนทนาเริ่มใหม่ได้ตลอด",
        en: "Clear chat wipes the conversation whenever you want a fresh start.",
      },
    ],
    images: [
      {
        file: "learning-06-askai.webp",
        alt: { th: "กล่องถาม AI พร้อมคำตอบ", en: "The Ask-AI chat with a reply" },
      },
    ],
  },
  {
    id: "scene-7",
    title: {
      th: "เลือกนิสัยติวเตอร์ให้ถูกจริต",
      en: "Pick your tutor's personality",
    },
    steps: [
      {
        th: "ติวเตอร์มี 6 บุคลิก: 🥔 คลาสสิก · 🌷 อ่อนโยน · 😏 ขี้แซว · 🔍 ละเอียด · ⚡ กระชับ · 🎯 จริงจัง",
        en: "The tutor has 6 personalities: 🥔 Classic · 🌷 Gentle · 😏 Sassy · 🔍 Detailed · ⚡ Concise · 🎯 Serious.",
      },
      {
        th: "เปลี่ยนได้ที่หน้า “ตั้งค่า” หรือบนหัวกล่อง Ask AI",
        en: "Switch it on the Settings page or right at the top of the Ask-AI chat.",
      },
      {
        th: "มีผลกับ AI ทุกจุดในบทเรียน และระบบจำตัวเลือกไว้ให้อัตโนมัติ",
        en: "It applies to every AI chat and is remembered automatically.",
      },
    ],
    images: [
      {
        file: "learning-07-personality.webp",
        alt: { th: "ตัวเลือกบุคลิกติวเตอร์ 6 แบบ", en: "The 6 tutor personality options" },
      },
    ],
    cta: { to: "/settings", label: { th: "ไปหน้าตั้งค่า", en: "Open Settings" } },
  },
  {
    id: "scene-8",
    title: {
      th: "login แล้วได้อะไรเพิ่ม (ไม่บังคับนะ)",
      en: "What logging in adds (totally optional)",
    },
    steps: [
      {
        th: "ย้ำอีกที: ทุกอย่างข้างบนใช้ได้โดยไม่ต้องมีบัญชี",
        en: "One more time: everything above works without an account.",
      },
      {
        th: "สมัครแล้วได้เพิ่ม — หน้า “ประวัติ” เก็บบทเรียนที่เคยเปิด เรียงตามวัน กลับมาเรียนต่อได้",
        en: "Sign in and you gain a History page — every lesson you've opened, grouped by day.",
      },
      {
        th: "คำตอบของเราถูกบันทึกไว้ เปิดเครื่องไหนก็เจอ",
        en: "Your answers get saved and follow you across devices.",
      },
      {
        th: "ติวเตอร์เริ่มจำเราได้ข้ามบทเรียน — ดูหรือลบ “ความจำของติวเตอร์” ได้เองที่หน้าโปรไฟล์",
        en: "The tutor starts remembering you across lessons — view or wipe its memory on your Profile.",
      },
    ],
    tip: {
      th: "บุ๊กมาร์กกับบุคลิกติวเตอร์อยู่ในเครื่องเราอยู่แล้ว ไม่ต้อง login ก็ไม่หาย",
      en: "Bookmarks and your tutor personality already live on your device — no login needed to keep them.",
    },
    images: [
      {
        file: "learning-08a-history.webp",
        alt: { th: "หน้าประวัติการเรียน", en: "The learning History page" },
      },
      {
        file: "learning-08b-memory.webp",
        alt: { th: "การ์ดความจำของติวเตอร์ในหน้าโปรไฟล์", en: "The tutor-memory card on Profile" },
      },
    ],
    cta: { to: "/login", label: { th: "สมัคร / เข้าสู่ระบบ", en: "Sign up / Log in" } },
  },
  {
    id: "scene-9",
    title: {
      th: "ปรับแอปให้เป็นของเรา",
      en: "Make the app yours",
    },
    steps: [
      {
        th: "หน้า “ตั้งค่า” เปลี่ยนธีมมืด/สว่าง และภาษาไทย/อังกฤษได้",
        en: "Settings lets you switch dark/light theme and Thai/English.",
      },
      {
        th: "ตัวหนังสือเล็กไป? ขนาดตัวอักษรมี 4 ระดับ มีผลทั้งแอป",
        en: "Text too small? Font size has 4 levels and applies app-wide.",
      },
      {
        th: "สงสัยว่าเว็บล่มไหม เช็กได้ที่หน้า “สถานะระบบ” — หรือกด “ช่วยเหลือ” ทักหาคนทำเว็บได้เลย",
        en: "Think the site is down? Check the Status page — or hit Help & Support to message the maker directly.",
      },
    ],
    images: [
      {
        file: "learning-09-settings.webp",
        alt: { th: "หน้าตั้งค่า", en: "The Settings page" },
      },
    ],
    cta: { to: "/settings", label: { th: "ไปหน้าตั้งค่า", en: "Open Settings" } },
  },
];
