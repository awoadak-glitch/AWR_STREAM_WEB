import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";

export default function SettingsView() {
  const { settings, updateRepo, updateBranch, loadInitial } = useAppStore();
  const [repoInput, setRepoInput] = useState(settings.repo);
  const [branchInput, setBranchInput] = useState(settings.branch);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateRepo(repoInput);
    updateBranch(branchInput);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    void loadInitial();
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-5">
      <div>
        <h2 className="mb-4 text-lg font-bold text-white">مصدر البيانات</h2>

        <Field label="owner/repo" value={repoInput} onChange={setRepoInput} placeholder="مثال: username/my-anime-data" />
        <Field label="الفرع (branch)" value={branchInput} onChange={setBranchInput} placeholder="main" />

        <button
          onClick={handleSave}
          className="mt-2 w-full rounded-2xl bg-brandRed py-3.5 font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
        >
          {saved ? "تم الحفظ ✓" : "حفظ وتحديث"}
        </button>
      </div>

      <div className="h-px w-full bg-white/10" />

      <div>
        <h2 className="mb-2 text-lg font-bold text-white">عن التطبيق</h2>
        <p className="text-[13px] leading-6 text-white/60">
          AuroraStream لـ الويب — نسخة كاملة بلغة React/TypeScript، تقرأ نفس بيانات مستودع GitHub اللي
          تستخدمها إصدارات أندرويد وiOS. كل البيانات تُقرأ مباشرة من raw.githubusercontent.com بدون
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

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-1.5">
      <label className="text-[12px] text-white/50">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir="ltr"
        className="rounded-xl bg-surfaceDark px-3.5 py-3 text-left text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brandRed/50"
      />
    </div>
  );
}
