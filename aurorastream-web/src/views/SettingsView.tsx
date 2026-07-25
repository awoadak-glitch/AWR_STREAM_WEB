import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";

export default function SettingsView() {
  const { settings, updateGithubToken } = useAppStore();
  const [tokenInput, setTokenInput] = useState(settings.githubToken);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateGithubToken(tokenInput);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-5">
      <div>
        <h2 className="mb-2 text-lg font-bold text-white">توكن الطلبات (اختياري)</h2>
        <p className="mb-3 text-[12.5px] leading-6 text-white/55">
          يُستخدم فقط لميزة "طلب إضافة عمل / إصلاح / تقسيم مواسم" — يُخزَّن بمتصفحك أنت فقط
          ولا يُرسَل أو يُخزَّن بأي مكان ثاني. استخدم توكن محدود الصلاحية (Fine-grained) بصلاحية
          "Actions: Read and write" على هذا المستودع فقط.
        </p>

        <div className="flex flex-col gap-1.5">
          <input
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            type="password"
            dir="ltr"
            className="rounded-xl bg-surfaceDark px-3.5 py-3 text-left text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brandRed/50"
          />
        </div>

        <button
          onClick={handleSave}
          className="mt-3 w-full rounded-2xl bg-brandRed py-3.5 font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
        >
          {saved ? "تم الحفظ ✓" : "حفظ"}
        </button>
      </div>

      <div className="h-px w-full bg-white/10" />

      <div>
        <h2 className="mb-2 text-lg font-bold text-white">عن التطبيق</h2>
        <p className="text-[13px] leading-6 text-white/60">
          AuroraStream لـ الويب — نسخة كاملة بلغة React/TypeScript، مصدر البيانات مضبوط تلقائياً
          ولا يحتاج أي إعداد إضافي منك. كل البيانات تُقرأ مباشرة من raw.githubusercontent.com بدون
          أي سيرفر خلفي — هذا الموقع نفسه ملفات ثابتة بالكامل تُستضاف على GitHub Pages.
        </p>
      </div>

      <div className="h-px w-full bg-white/10" />

      <div>
        <h2 className="mb-2 text-lg font-bold text-white">ملاحظة عن التنزيل</h2>
        <p className="text-[13px] leading-6 text-white/60">
          متصفحات الويب تمنع أي صفحة من قراءة حركة شبكة إطار (iframe) لموقع خارجي — قيد أمني أساسي
          بكل المتصفحات. لذلك ميزة تنزيل الفيديو المدمج بنسخة أندرويد غير متاحة هنا؛ البديل هو زر
          "افتح المصدر بتبويب جديد" داخل المشغّل.
        </p>
      </div>
    </div>
  );
}
