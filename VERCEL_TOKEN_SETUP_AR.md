# تفعيل الطلبات بدون إدخال توكن في الموقع

هذه النسخة لا تضع توكن GitHub داخل كود المتصفح. التوكن يبقى داخل Vercel Environment Variables،
والواجهة تستدعي Vercel Function في `/api/dispatch-library`.

## الإعداد في Vercel

1. افتح المشروع في Vercel.
2. ادخل إلى: Settings -> Environment Variables.
3. أضف متغيراً بالاسم:

   GITHUB_ACTIONS_TOKEN

4. ضع قيمة Fine-grained GitHub token مخصصاً فقط للمستودع:

   awoadak-glitch/AWR_STREAM_WEB

5. أعطه الصلاحية:

   Actions: Read and write

6. فعّل المتغير لبيئات Production وPreview، ثم احفظه.
7. نفّذ Redeploy للمشروع.

المتغيرات الاختيارية موجودة في `aurorastream-web/.env.example`، لكن الإعدادات الافتراضية
مضبوطة بالفعل على المستودع والفرع وملف workflow الحالي.

## مهم

- لا تسمِّ المتغير `VITE_GITHUB_ACTIONS_TOKEN`؛ أي متغير يبدأ بـ VITE_ قد يدخل في ملفات الواجهة.
- لا تضع التوكن داخل GitHub أو داخل أي ملف JavaScript/TypeScript منشور.
- الطلبات أصبحت متاحة لزوار الموقع، لذلك توجد عملية تحقق ومدخلات محدودة ومعدل طلبات أساسي.
