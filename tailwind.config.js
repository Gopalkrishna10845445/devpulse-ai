/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#131315",
        "surface-glass": "rgba(255, 255, 255, 0.02)",
        "surface-dim": "#131315",
        "surface-container-lowest": "#0e0e10",
        "surface-container-low": "#1c1b1d",
        "surface-container": "#201f22",
        "surface-container-high": "#2a2a2c",
        "surface-container-highest": "#353437",
        "on-surface": "#e5e1e4",
        "on-surface-variant": "#c4c7c8",
        "border-subtle": "rgba(255, 255, 255, 0.08)",
        "semantic-emerald": "#10B981",
        "semantic-amber": "#F59E0B",
        "semantic-red": "#EF4444",
        background: "#000000",
        primary: "#ffffff",
        "on-primary": "#2f3131",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        headline: ["Geist", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
