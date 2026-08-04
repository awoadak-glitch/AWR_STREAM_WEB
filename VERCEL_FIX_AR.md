# إصلاح HTTP 500 في طلبات الإضافة

تم تعديل النسخة بحيث:

1. أصبح ملف `api/dispatch-library.js` ملف Vercel Function كاملًا بدل إعادة تصدير ملف من مجلد فرعي.
2. أضيف `package.json` في جذر المشروع مع `"type": "module"` لمنع مشاكل ESM في دالة الجذر.
3. أضيف التقاط شامل للأخطاء حتى تعيد الدالة JSON واضحًا بدل صفحة HTTP 500 غير قابلة للقراءة.
4. أضيف فحص GET على:

   `/api/dispatch-library`

   ويجب أن يعيد JSON يحتوي `ok: true` و `tokenConfigured`.
5. أصبحت الواجهة تعرض Vercel Request ID عندما تكون الاستجابة غير صالحة.

## بعد رفع النسخة

- في Vercel افتح Settings -> Environment Variables.
- أضف `GITHUB_ACTIONS_TOKEN` للتطبيقات Production وPreview.
- يجب أن يصل التوكن إلى المستودع `awoadak-glitch/AWR_STREAM_WEB` ويملك `Actions: Read and write`.
- نفّذ Redeploy جديدًا؛ إضافة المتغير وحدها لا تغيّر Deployment قديمًا.
- افتح `/api/dispatch-library` مباشرة. إذا ظهر `tokenConfigured: false` فالمتغير غير مطبق على الـ Deployment.
- إذا ظهر خطأ، افتح Vercel -> Logs/Observability -> Runtime Logs وابحث عن `dispatch-library`.
