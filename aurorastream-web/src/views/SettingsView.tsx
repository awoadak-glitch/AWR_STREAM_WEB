export default function SettingsView() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-5">
      <div>
        <h2 className="mb-2 text-lg font-bold text-white">ميزة الطلبات</h2>
        <p className="text-[13px] leading-6 text-white/60">
          ميزة إضافة عمل أو إصلاحه أو تقسيم مواسمه تعمل الآن عن طريق خادم Vercel الآمن.
          لا يحتاج الزائر إلى إدخال توكن GitHub، ولا يتم إرسال التوكن إلى المتصفح أو تخزينه فيه.
        </p>
      </div>

      <div className="h-px w-full bg-white/10" />

      <div>
        <h2 className="mb-2 text-lg font-bold text-white">عن التطبيق</h2>
        <p className="text-[13px] leading-6 text-white/60">
          AuroraStream للويب — نسخة React/TypeScript. بيانات المكتبة تُقرأ مباشرة من
          raw.githubusercontent.com، بينما طلبات التحديث تمر عبر Vercel Function محفوظ فيها
          توكن GitHub كمتغير بيئة سري.
        </p>
      </div>

      <div className="h-px w-full bg-white/10" />

      <div>
        <h2 className="mb-2 text-lg font-bold text-white">ملاحظة عن التنزيل</h2>
        <p className="text-[13px] leading-6 text-white/60">
          متصفحات الويب تمنع أي صفحة من قراءة حركة شبكة إطار لموقع خارجي. لذلك ميزة تنزيل الفيديو
          المدمج بنسخة أندرويد غير متاحة هنا؛ البديل هو زر فتح المصدر في تبويب جديد داخل المشغّل.
        </p>
      </div>
    </div>
  );
}
