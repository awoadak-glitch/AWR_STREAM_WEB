# إصلاح GitHub Actions مع `type: module`

يحتوي جذر المشروع على `package.json` بقيمة:

```json
{"type":"module"}
```

وهذا مطلوب لدالة Vercel الموجودة في `api/dispatch-library.js`، لكن سكربتات المكتبة تستخدم CommonJS (`require` و`__dirname`).
لذلك تم تشغيلها بامتداد `.cjs`:

- `update_library.cjs`
- `refresh_library.cjs`

وتم تعديل ملفات GitHub Actions لتشغيل الاسمين الجديدين. لا تحذف `type: module` من الجذر، لأنه مطلوب لدالة Vercel الحالية.
