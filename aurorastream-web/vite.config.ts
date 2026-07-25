import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path"; // 1. إضافة استيراد مكتبة path

// عند البناء لـ GitHub Pages (مشروع، مو مستخدم/منظمة)، الموقع يُنشر تحت
// https://username.github.io/repo-name/ — لازم base يطابق اسم المستودع بالضبط.
// نمرره عبر متغير بيئة VITE_BASE_PATH من workflow البناء، بدل ما نثبته يدوياً هنا.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "/",
  
  // 2. إضافة إعدادات المسارات (alias) لحل مشكلة الرمز @
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
