/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brandRed: "#FF2D78",
        brandRedLight: "#FF5C97",
        brandRedDeep: "#9A1150",
        deepBlack: "#09090C",
        surfaceDark: "#14141B",
        surfaceElevated: "#1E1E26",
        cardDark: "#16161C",
        textSecondary: "#B3B3BC",
        textMuted: "#7A7A85",
        goldStar: "#FFC93C",
        imdbGold: "#F5C518",
        rankGold: "#F5A623",
        rankGreen: "#2ECC71",
        rankCrimson: "#E8305A",
      },
      fontFamily: {
        sans: ["Tajawal", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        scaleIn: { from: { opacity: "0", transform: "scale(0.96)" }, to: { opacity: "1", transform: "scale(1)" } },
      },
    },
  },
  plugins: [],
};
