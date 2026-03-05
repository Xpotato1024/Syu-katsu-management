/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Zen Kaku Gothic New", "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Meiryo", "sans-serif"]
      }
    }
  },
  plugins: []
}

