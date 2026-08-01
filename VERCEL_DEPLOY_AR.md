# نشر المشروع على Vercel

يمكن نشر هذا الريبو بطريقتين:

## الطريقة 1: النشر مباشرة من جذر الريبو

اترك Root Directory فارغًا. ملف `vercel.json` الموجود في الجذر سيقوم تلقائيًا بـ:

- تثبيت الحزم داخل `aurorastream-web`
- تشغيل `npm run build`
- نشر `aurorastream-web/dist`
- إعادة توجيه مسارات تطبيق SPA إلى `index.html`

بعد رفع التعديلات إلى GitHub، اختر Redeploy في Vercel.

## الطريقة 2: تحديد مجلد التطبيق في إعدادات Vercel

من Project Settings ثم Build and Deployment اجعل:

- Root Directory: `aurorastream-web`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

ثم نفّذ Redeploy بدون استخدام الكاش إن استمرت صفحة 404 القديمة.
