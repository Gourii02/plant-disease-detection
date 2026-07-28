/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // PlantGuard AI Design System — Stitch
        primary: "#4edea3",
        "primary-dim": "#4edea3",
        "primary-fixed": "#6ffbbe",
        "primary-container": "#10b981",
        "on-primary": "#003824",
        "on-primary-container": "#00422b",
        secondary: "#45dfa4",
        "secondary-container": "#00bd85",
        "on-secondary": "#003825",
        tertiary: "#68dba9",
        "tertiary-container": "#3eb686",
        surface: "#0b1326",
        "surface-dim": "#0b1326",
        "surface-bright": "#31394d",
        "surface-container": "#171f33",
        "surface-container-low": "#131b2e",
        "surface-container-high": "#222a3d",
        "surface-container-highest": "#2d3449",
        "surface-container-lowest": "#060e20",
        "surface-variant": "#2d3449",
        "on-surface": "#dae2fd",
        "on-surface-variant": "#bbcabf",
        background: "#0b1326",
        "on-background": "#dae2fd",
        outline: "#86948a",
        "outline-variant": "#3c4a42",
        error: "#ffb4ab",
        "error-container": "#93000a",
        "on-error": "#690005",
        "inverse-surface": "#dae2fd",
        "inverse-on-surface": "#283044",
        "inverse-primary": "#006c49",
        "surface-tint": "#4edea3",
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "monospace"],
      },
      fontSize: {
        "mono-data": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "headline-md": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "label-caps": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "600" }],
        "body-base": ["16px", { lineHeight: "24px", letterSpacing: "0em", fontWeight: "400" }],
      },
      keyframes: {
        "scan-line": {
          "0%, 100%": { top: "5%" },
          "50%": { top: "95%" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 15px rgba(78,222,163,0.2)" },
          "50%": { boxShadow: "0 0 35px rgba(78,222,163,0.5)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        spin: {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "scan-line": "scan-line 2s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
        "slide-up": "slide-up 0.4s ease forwards",
        "fade-in": "fade-in 0.3s ease forwards",
        spin: "spin 1s linear infinite",
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        "emerald-sm": "0 0 15px rgba(78,222,163,0.15)",
        "emerald-md": "0 0 25px rgba(78,222,163,0.3)",
        "emerald-lg": "0 0 40px rgba(78,222,163,0.45)",
      },
    },
  },
  plugins: [],
};
