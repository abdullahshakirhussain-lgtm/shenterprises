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
        cream: "#FBF4EC",
        ink: "#3F2A1D",
        muted: "#8A6F5E",
      },
      fontFamily: {
        sans: ["Mulish", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Lora", "Georgia", "ui-serif", "serif"],
        serif: ["Lora", "Georgia", "ui-serif", "serif"],
      }
    }
  },
  plugins: []
};
export default config;
