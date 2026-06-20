import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "rgb(var(--b50) / <alpha-value>)",
          100: "rgb(var(--b100) / <alpha-value>)",
          200: "rgb(var(--b200) / <alpha-value>)",
          300: "rgb(var(--b300) / <alpha-value>)",
          400: "rgb(var(--b400) / <alpha-value>)",
          500: "rgb(var(--b500) / <alpha-value>)",
          600: "rgb(var(--b600) / <alpha-value>)",
          700: "rgb(var(--b700) / <alpha-value>)",
          800: "rgb(var(--b800) / <alpha-value>)",
          900: "rgb(var(--b900) / <alpha-value>)",
        },
        // New accent: deep saffron — used for highlights, callouts, headlines
        saffron: {
          50:  "#FBF1DE",
          100: "#F6E2BB",
          200: "#EFCB85",
          300: "#E5AE51",
          400: "#D9942C",
          500: "#B8772F",
          600: "#94601E",
          700: "#704818",
          800: "#4E3211",
          900: "#2E1E0A",
        },
        // Charcoal "ink" for headings — much richer than brand-900
        ink: {
          DEFAULT: "#2D2A26",
          soft: "#3F3A33",
          mute: "#6E665C",
        },
        // Warmer ivory for alternating section backgrounds
        ivory: "#F4E9D6",
        cream: "#FBF4EC",
        muted: "#8A6F5E",
      },
      fontFamily: {
        sans: ["var(--font-mulish)", "Mulish", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Fraunces", "Lora", "Georgia", "ui-serif", "serif"],
        serif: ["var(--font-fraunces)", "Fraunces", "Lora", "Georgia", "ui-serif", "serif"],
        lora: ["var(--font-lora)", "Lora", "Georgia", "ui-serif", "serif"],
      },
      backgroundImage: {
        // Subtle paper grain — overlay on sections that need texture
        "paper-grain":
          "radial-gradient(circle at 20% 30%, rgba(180,87,28,.04) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(45,42,38,.03) 0, transparent 40%)",
      },
    }
  },
  plugins: []
};
export default config;
