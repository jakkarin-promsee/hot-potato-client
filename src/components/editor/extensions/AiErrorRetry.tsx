export const AI_UNAVAILABLE_MESSAGE =
  "ตอนนี้ AI ตอบไม่ได้ ลองกดส่งอีกครั้งนะ 🙏";

interface AiErrorRetryProps {
  onRetry: () => void;
  loading?: boolean;
}

export default function AiErrorRetry({ onRetry, loading }: AiErrorRetryProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <p className="text-sm text-amber-900">{AI_UNAVAILABLE_MESSAGE}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={loading}
        className="mt-2 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ส่งอีกครั้ง
      </button>
    </div>
  );
}
