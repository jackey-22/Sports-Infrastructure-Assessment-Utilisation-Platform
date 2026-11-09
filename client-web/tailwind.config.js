/** @type {import('tailwindcss').Config} */
const withMT = require("@material-tailwind/react/utils/withMT");
const colors = require("tailwindcss/colors");

// withMT replaces Tailwind's default palette with Material colours, which
// have no slate, emerald, sky, violet or rose. Those utilities were silent
// no-ops, so dark screens painted white text on the light page background.
module.exports = withMT({
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "path-to-your-node_modules/@material-tailwind/react/components/**/*.{js,ts,jsx,tsx}",
    "path-to-your-node_modules/@material-tailwind/react/theme/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        slate: colors.slate,
        emerald: colors.emerald,
        sky: colors.sky,
        violet: colors.violet,
        rose: colors.rose,
        indigo: { 950: colors.indigo[950] },
        blue: { 950: colors.blue[950] },
        gov: {
          dark: "#0b1222",
          navy: "#0f172a",
          card: "#1e293b",
          primary: "#007D40",
          accent: "#f59e0b",
          success: "#10b981"
        },
        brand: {
          primary: "#007D40",
          soft: "#E8F5EE",
          mint: "#F3FAF6",
          dark: "#0B3D2E",
          mid: "#059669",
          light: "#D1FAE5"
        }
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        "fade-up-delay": "fade-up 0.6s ease-out 0.12s both",
        "fade-up-delay-2": "fade-up 0.6s ease-out 0.24s both",
        "fade-in": "fade-in 0.5s ease-out both"
      }
    },
  },
  plugins: [],
});
