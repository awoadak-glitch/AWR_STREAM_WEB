import { useEffect, useState } from "react";
import { CloseIcon, SkipNextIcon, ExternalLinkIcon } from "@/components/Icons";

interface Props {
  url: string;
  episodeLabel?: string | null;
  hasNextEpisode: boolean;
  onNextEpisode: () => void;
  onClose: () => void;
}

/**
 * يعرض صفحة الـ embed الرسمية للمصدر مباشرة داخل iframe — بنفس فلسفة تطبيقي أندرويد/iOS
 * (WebView/WKWebView يعرض الصفحة كما هي بواجهتها وتحكماتها الأصلية).
 *
 * فرق مهم وصادق عن نسخة أندرويد: متصفحات الويب تمنع أي صفحة من قراءة حركة شبكة iframe
 * لموقع خارجي (Same-Origin Policy) — هذا قيد أمني أساسي بكل المتصفحات، مو نقص بالتطبيق.
 * يعني ميزة "اصطياد رابط m3u8 للتنزيل" اللي بنسخة أندرويد مستحيلة تقنياً هنا. البديل
 * المتاح: زر "افتح المصدر بتبويب جديد" يفتح نفس الرابط مباشرة، والمستخدم يقدر يحمّله
 * بنفسه من هناك لو المتصفح/الموقع يدعم ذلك.
 */
export default function PlayerView({ url, episodeLabel, hasNextEpisode, onNextEpisode, onClose }: Props) {
  const [showNextHint, setShowNextHint] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const enterFullscreen = () => {
    const el = document.getElementById("aurora-player-frame-wrap");
    if (el && el.requestFullscreen) void el.requestFullscreen().catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-20 bg-black" id="aurora-player-frame-wrap">
      <iframe
        src={url}
        title="AuroraStream Player"
        className="h-full w-full border-0"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
      />

      {/* شريط علوي: إغلاق + اسم الحلقة + فول سكرين + فتح بتبويب جديد */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3.5">
        <div className="pointer-events-auto flex items-center gap-2.5">
          <button onClick={onClose} className="rounded-full bg-black/55 p-2.5 transition hover:bg-black/75">
            <CloseIcon className="h-4 w-4 text-white" />
          </button>
          {episodeLabel && (
            <span className="rounded-full bg-black/45 px-3 py-1.5 text-[13px] font-medium text-white/90">
              {episodeLabel}
            </span>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-2 text-[12px] text-white transition hover:bg-black/75"
          >
            <ExternalLinkIcon className="h-3.5 w-3.5" />
            فتح بتبويب جديد
          </a>
          <button onClick={enterFullscreen} className="rounded-full bg-black/55 px-3 py-2 text-[12px] text-white transition hover:bg-black/75">
            فول سكرين
          </button>
        </div>
      </div>

      {/* زر الحلقة التالية */}
      {hasNextEpisode && (
        <div
          className="absolute bottom-6 left-6"
          onMouseEnter={() => setShowNextHint(true)}
          onMouseLeave={() => setShowNextHint(false)}
        >
          <button
            onClick={onNextEpisode}
            className={`flex items-center gap-2 rounded-full bg-black/75 px-4 py-3 font-bold text-white transition hover:bg-black/90 ${
              showNextHint ? "pl-5" : ""
            }`}
          >
            الحلقة التالية
            <SkipNextIcon className="h-4 w-4 text-brandRed" />
          </button>
        </div>
      )}
    </div>
  );
}
