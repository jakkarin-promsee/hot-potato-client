import { useEffect, useState } from "react";
import { useEditorI18n } from "../editor.i18n";

/**
 * Playful "AI is thinking" loader (2026-07-12). Replaces the static
 * "AI กำลังพิมพ์..." spinner text at every student-facing AI wait. The server +
 * Gemini are on free tiers and can be slow, so instead of a spinning icon we
 * rotate through a big pool of goofy น้องมันฝรั่ง (potato) one-liners — the wait
 * becomes part of the fun. One is picked at random on mount, then a fresh
 * (non-repeating) one every ROTATE_MS. Language follows the app toggle via
 * `t(en, th)`; Thai is the funny one, English is a friendly fallback.
 */

const ROTATE_MS = 2500;

export const AI_THINKING_MESSAGES: { en: string; th: string }[] = [
  { en: "Frying up some crispy thoughts 🥔", th: "น้องมันฝรั่งกำลังทอดความคิดให้กรอบ 🥔" },
  { en: "Peeling a fresh idea for you...", th: "รอแป๊บ กำลังปอกไอเดียอยู่..." },
  { en: "Free server sprinting as fast as it can 🏃💨", th: "เซิร์ฟเวอร์ฟรีกำลังวิ่งสุดชีวิต 🏃💨" },
  { en: "Simmering some knowledge... 🍲", th: "กำลังต้มความรู้ให้สุก... 🍲" },
  { en: "Give me one instant-noodle minute 🍜", th: "ขอเวลาคิดเท่ามาม่าสุกนะ 🍜" },
  { en: "Slow because I care, not because I'm broken 💚", th: "ช้าเพราะรักนะ ไม่ใช่เพราะพัง 💚" },
  { en: "Meditating on the answer 🧘", th: "AI กำลังนั่งสมาธิหาคำตอบ 🧘" },
  { en: "Thinking so hard I might turn into fries 🍟", th: "คิดหนักจนหัวจะเป็นเฟรนช์ฟรายส์ 🍟" },
  { en: "Free internet — everybody stay chill 😌", th: "เน็ตฟรี ใจเย็น ๆ นะทุกคน 😌" },
  { en: "Blending the perfect answer...", th: "กำลังปั่นคำตอบให้กลมกล่อม..." },
  { en: "Server just woke up, one coffee please ☕", th: "เซิร์ฟเวอร์เพิ่งตื่น ขอกาแฟแก้วนึงก่อน ☕" },
  { en: "Digging through the old textbooks 📚", th: "กำลังงัดตำราเก่ามาเปิด 📚" },
  { en: "Almost there, just a pinch more... 🤏", th: "อีกนิดเดียว ใกล้ได้แล้ว... 🤏" },
  { en: "Thinking hard — don't leave me yet 🥺", th: "กำลังคิด อย่าเพิ่งกดหนีน้า 🥺" },
  { en: "Potato brain loading... 🥔💭", th: "สมองมันฝรั่งกำลังโหลด... 🥔💭" },
  { en: "Searching the whole potato sack 🥔", th: "กำลังหาคำตอบในกระสอบมันฝรั่ง 🥔" },
  { en: "Calling all ideas to the meeting 💡", th: "กำลังเรียกไอเดียมาเข้าประชุม 💡" },
  { en: "Brewing your answer... nice and strong ☕", th: "ชงคำตอบอยู่... เข้มข้นกำลังดี ☕" },
  { en: "Thinking... no peeking at the answer 👀", th: "คิดอยู่ ๆ ห้ามแอบดูเฉลยนะ 👀" },
  { en: "Putting the puzzle together 🧩", th: "กำลังต่อจิ๊กซอว์ในหัว 🧩" },
  { en: "Good things take time, like a baked potato 🥔🔥", th: "รอแบบมันฝรั่งอบ ใช้เวลาแต่คุ้ม 🥔🔥" },
  { en: "Brain's overheating, cooling down 🌬️", th: "สมองกำลังร้อน เป่าให้แป๊บ 🌬️" },
  { en: "Arranging the words nicely ✨", th: "กำลังเรียบเรียงคำให้เพราะ ✨" },
  { en: "Loading... grab a snack meanwhile 🍪", th: "โหลดอยู่... ไปหยิบขนมรอได้เลย 🍪" },
  { en: "Computing at full potato power 🥔⚡", th: "กำลังคำนวณด้วยพลังมันฝรั่งเต็มแม็กซ์ 🥔⚡" },
  { en: "Hold on, finding the best answer for you 🌟", th: "เดี๋ยวนะ กำลังหาคำตอบที่ดีที่สุดให้ 🌟" },
  { en: "Flipping to the last page 📖", th: "กำลังพลิกตำราหน้าสุดท้าย 📖" },
  { en: "Squeezing my brain for you 🧠💦", th: "AI กำลังรีดสมองอยู่ 🧠💦" },
  { en: "Cranking my brain — don't doze off 😴", th: "ปั่นสมองอยู่ อย่าเพิ่งง่วงนะ 😴" },
  { en: "Thinking of something not boring 😆", th: "กำลังคิดคำที่ไม่ทำให้เธอเบื่อ 😆" },
  { en: "Deep breath, thinking it through 🌬️", th: "หายใจเข้าลึก ๆ กำลังคิดให้ดี ๆ 🌬️" },
  { en: "Connecting my brain to the stars ✨🛰️", th: "กำลังเชื่อมสมองกับดวงดาว ✨🛰️" },
  { en: "One sec, potato's taking notes ✏️", th: "รอแป๊บ มันฝรั่งกำลังจดโน้ต ✏️" },
  { en: "Slow but trying my best 💪", th: "กำลังคิด... ช้าหน่อยแต่ตั้งใจนะ 💪" },
  { en: "Loading wisdom... 42% 🧠", th: "โหลดความฉลาด... 42% 🧠" },
  { en: "Nearly done, hang in there 🙏", th: "ใกล้เสร็จแล้ว อดใจอีกนิด 🙏" },
];

/** On a real cold start we open with an honest "waking up" line before the fun. */
const COLD_START_MESSAGE = {
  en: "Waking the AI up, one sec… (free server, be nice 😴)",
  th: "ปลุก AI แป๊บนึงนะ เซิร์ฟเวอร์ฟรีเพิ่งตื่น 😴",
};

/** Random index in [0, len) that isn't `exclude`. */
function nextIndex(exclude: number, len: number): number {
  if (len <= 1) return 0;
  const roll = Math.floor(Math.random() * (len - 1));
  return roll >= exclude ? roll + 1 : roll;
}

interface AiThinkingMessageProps {
  /** Show an honest "server waking up" line first, then rotate into the fun. */
  coldStart?: boolean;
  className?: string;
}

export default function AiThinkingMessage({
  coldStart = false,
  className = "text-sm text-gray-400",
}: AiThinkingMessageProps) {
  const { t } = useEditorI18n();
  // -1 = the cold-start line (only used as the very first frame when waking).
  const [idx, setIdx] = useState<number>(() =>
    coldStart ? -1 : Math.floor(Math.random() * AI_THINKING_MESSAGES.length),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((prev) => nextIndex(prev, AI_THINKING_MESSAGES.length));
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const msg =
    idx < 0
      ? COLD_START_MESSAGE
      : AI_THINKING_MESSAGES[idx] ?? COLD_START_MESSAGE;

  return (
    <p className={className} data-testid="ai-thinking" aria-live="polite">
      {t(msg.en, msg.th)}
      <span className="animate-pulse" aria-hidden="true">
        {" …"}
      </span>
    </p>
  );
}
