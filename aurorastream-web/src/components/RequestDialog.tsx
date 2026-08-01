import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { dispatchLibraryUpdate } from "@/lib/githubActionsService";
import { CloseIcon } from "@/components/Icons";

type Mode = "add" | "repair" | "split";

export default function RequestDialog() {
  const { requestDialogOpen, requestRepairItem, closeRequestDialog } = useAppStore();
  const [mode, setMode] = useState<Mode>(requestRepairItem ? "repair" : "add");

  const [title, setTitle] = useState("");
  const [idValue, setIdValue] = useState("");
  const [idType, setIdType] = useState<"tmdb" | "imdb">("tmdb");
  const [mediaType, setMediaType] = useState<"" | "movie" | "tv">("");
  const [seasonsSplit, setSeasonsSplit] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (!requestDialogOpen) return null;


  const handleSubmit = async () => {
    setSubmitting(true);
    setResult(null);

    const res = await dispatchLibraryUpdate({
      requestTitle: mode === "add" ? title.trim() : undefined,
      requestId: (mode === "add" || mode === "split") && idValue.trim() ? idValue.trim() : undefined,
      requestIdType: idType,
      requestType: mediaType || undefined,
      oldId: mode === "repair" ? String(requestRepairItem?.id ?? "") : undefined,
      seasonsSplit: mode === "split" ? seasonsSplit.trim() : undefined,
    });

    setResult(res);
    setSubmitting(false);
  };

  const reset = () => {
    setTitle("");
    setIdValue("");
    setSeasonsSplit("");
    setResult(null);
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surfaceElevated p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">طلب / إصلاح</h3>
          <button onClick={closeRequestDialog} className="rounded-full p-1.5 hover:bg-white/10">
            <CloseIcon className="h-4 w-4 text-white/70" />
          </button>
        </div>


        {!requestRepairItem && (
          <div className="mb-4 flex gap-2 rounded-xl bg-cardDark p-1">
            <TabButton active={mode === "add"} onClick={() => { setMode("add"); reset(); }}>
              إضافة عمل
            </TabButton>
            <TabButton active={mode === "split"} onClick={() => { setMode("split"); reset(); }}>
              تقسيم مواسم
            </TabButton>
          </div>
        )}

        {mode === "repair" && requestRepairItem && (
          <p className="mb-4 text-[13px] text-white/70">
            بيتم إبلاغ السكربت بحذف وإعادة جلب:{" "}
            <span className="font-bold text-white">
              {requestRepairItem.title ?? requestRepairItem.name}
            </span>
          </p>
        )}

        {mode === "add" && (
          <div className="flex flex-col gap-3">
            <Field label="اسم العمل (أو رقم TMDB مباشرة)" value={title} onChange={setTitle} placeholder="مثال: Attack on Titan" />
            <Field label="معرّف مباشر (اختياري)" value={idValue} onChange={setIdValue} placeholder="TMDB ID أو IMDb ID" />

            <div className="grid grid-cols-2 gap-3">
              <Select label="نوع المعرّف" value={idType} onChange={(v) => setIdType(v as "tmdb" | "imdb")} options={[
                { value: "tmdb", label: "TMDB" },
                { value: "imdb", label: "IMDb" },
              ]} />
              <Select label="النوع" value={mediaType} onChange={(v) => setMediaType(v as typeof mediaType)} options={[
                { value: "", label: "تلقائي" },
                { value: "movie", label: "فيلم" },
                { value: "tv", label: "مسلسل" },
              ]} />
            </div>
          </div>
        )}

        {mode === "split" && (
          <div className="flex flex-col gap-3">
            <Field label="رقم TMDB أو IMDb للمسلسل" value={idValue} onChange={setIdValue} placeholder="مثال: 12345" />
            <Select label="نوع المعرّف" value={idType} onChange={(v) => setIdType(v as "tmdb" | "imdb")} options={[
              { value: "tmdb", label: "TMDB" },
              { value: "imdb", label: "IMDb" },
            ]} />
            <Field
              label="عدد حلقات كل موسم (مفصولة بفواصل)"
              value={seasonsSplit}
              onChange={setSeasonsSplit}
              placeholder="مثال: 12,12,24"
            />
          </div>
        )}

        {result && (
          <p className={`mt-4 text-[13px] ${result.ok ? "text-successGreen" : "text-brandRed"}`}>{result.message}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-5 w-full rounded-xl bg-brandRed py-3 font-bold text-white transition disabled:opacity-40"
        >
          {submitting ? "جاري الإرسال…" : "إرسال الطلب"}
        </button>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition ${
        active ? "bg-brandRed text-white" : "text-white/50"
      }`}
    >
      {children}
    </button>
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
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] text-white/50">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl bg-cardDark px-3.5 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brandRed/50"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] text-white/50">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl bg-cardDark px-3.5 py-2.5 text-[14px] text-white focus:outline-none focus:ring-2 focus:ring-brandRed/50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
