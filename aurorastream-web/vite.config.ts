import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// عند البناء لـ GitHub Pages (مشروع، مو مستخدم/منظمة)، الموقع يُنشر تحت
// https://username.github.io/repo-name/ — لازم base يطابق اسم المستودع بالضبط.
// نمرره عبر متغير بيئة VITE_BASE_PATH من workflow البناء، بدل ما نثبته يدوياً هنا.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "/",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
}));
