import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf6f0",
          100: "#fbe7d4",
          200: "#f5c9a0",
          300: "#eea76b",
          400: "#e58943",
          500: "#d96f24",
          600: "#bb541a",
          700: "#943f18",
          800: "#6f311a",
          900: "#4a2415"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Playfair Display", "ui-serif", "serif"]
      }
    }
  },
  plugins: []
};
export default config;
