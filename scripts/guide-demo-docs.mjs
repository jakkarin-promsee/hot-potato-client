// guide-demo-docs.mjs — the TipTap documents behind the guide demo lessons.
// Shared by seed-guide-demo.mjs (creates the lessons) and capture-guide.mjs
// (resets the scratch/blank lessons to these baselines before editing scenes,
// so every capture run starts from the same state). Attrs mirror the *Node.ts
// definitions exactly (see client/src/components/editor/extensions/).

const uuid = () => crypto.randomUUID();

export const p = (text) => ({
  type: "paragraph",
  content: text ? [{ type: "text", text }] : undefined,
});
export const h = (level, text) => ({
  type: "heading",
  attrs: { level, textAlign: null },
  content: [{ type: "text", text }],
});
export const q = (type, attrs) => ({
  type,
  attrs: { id: uuid(), feedbackMode: "quick_check", ...attrs },
});

/** What a brand-new lesson looks like (the empty-doc AI CTA renders on this). */
export const emptyDoc = { type: "doc", content: [{ type: "paragraph" }] };

/**
 * The teacher scratch lesson — a small, realistic draft the creating-showcase
 * screenshots edit (insert formula/question blocks, run AI tools). Kept short
 * so inserted blocks land inside the 800px-tall capture viewport.
 */
export const scratchTitle = "แรงและการเคลื่อนที่ (ฉบับร่างเดโม)";
export const buildScratchDoc = () => ({
  type: "doc",
  content: [
    h(1, "แรงและการเคลื่อนที่"),
    p("บทเรียนนี้ชวนมาดูว่า “แรง” ทำให้สิ่งของรอบตัวเราขยับ หยุด หรือเปลี่ยนทิศได้ยังไง ลองนึกถึงตอนถีบจักรยาน ตอนเข็นรถเข็น หรือตอนรถเบรกกะทันหันไปพร้อมกันเลย"),
    h(2, "แรงคืออะไร"),
    p("แรงคือการผลักหรือดึงที่กระทำต่อวัตถุ เมื่อมีแรงมากระทำ วัตถุอาจเริ่มเคลื่อนที่ เคลื่อนที่เร็วขึ้น ช้าลง หรือเปลี่ยนทิศทางได้"),
    h(2, "แรงเสียดทานรอบตัวเรา"),
    p("แรงเสียดทานเกิดขึ้นเมื่อผิวของวัตถุสองชิ้นเสียดสีกัน มันคือเหตุผลที่รองเท้ายึดพื้นได้ และเหตุผลที่ลูกบอลกลิ้งแล้วค่อยๆ หยุดเอง"),
  ],
});

/** The link-only demo lesson used by the learning-showcase screenshots. */
export const demoLessonTitle = "ทำไมท้องฟ้าเป็นสีฟ้า? (บทเรียนเดโม)";
export const buildDemoDoc = () => ({
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
});
