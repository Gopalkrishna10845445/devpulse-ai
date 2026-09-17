/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#FAF9F7",
        surface: "#FFFFFF",
        "surface-alt": "#F5F4F2",
        "text-primary": "#1A1A1A",
        "text-secondary": "#4A4A4A",
        "text-muted": "#8A8A8A",
        border: "#E8E6E3",
        "border-strong": "#D1CFCC",
        accent: "#1A1A1A",
        "semantic-green": "#16A34A",
        "semantic-amber": "#D97706",
        "semantic-red": "#DC2626",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Cascadia Code", "monospace"],
      },
      fontSize: {
        "heading-xl": ["24px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "600" }],
        "heading-lg": ["20px", { lineHeight: "1.3", letterSpacing: "-0.02em", fontWeight: "600" }],
        "heading-md": ["16px", { lineHeight: "1.4", letterSpacing: "-0.01em", fontWeight: "600" }],
        "heading-sm": ["14px", { lineHeight: "1.4", letterSpacing: "-0.01em", fontWeight: "600" }],
        "body-md": ["14px", { lineHeight: "1.6", letterSpacing: "0em", fontWeight: "400" }],
        "body-sm": ["13px", { lineHeight: "1.5", letterSpacing: "0em", fontWeight: "400" }],
        "caption": ["12px", { lineHeight: "1.4", letterSpacing: "0em", fontWeight: "400" }],
        "label": ["11px", { lineHeight: "1", letterSpacing: "0.04em", fontWeight: "500" }],
        "mono-sm": ["12px", { lineHeight: "1.5", letterSpacing: "0.02em", fontWeight: "400" }],
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "6px",
        lg: "8px",
      },
      spacing: {
        "sidebar-w": "240px",
        "topbar-h": "48px",
      },
      boxShadow: {
        "card": "0 1px 2px rgba(0, 0, 0, 0.04)",
        "modal": "0 8px 30px rgba(0, 0, 0, 0.12)",
      },
    },
  },
  plugins: [],
};
