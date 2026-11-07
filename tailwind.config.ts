import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#14243A",
          dark: "#0F1A2A",
          blue: "#2563EB",
          lightBlue: "#3B82F6",
          accent: "#1D4ED8",
          bg: "#F5F7FA",
          card: "#FFFFFF",
          border: "#E2E8F0",
          muted: "#64748B",
        },
        success: {
          DEFAULT: "#10B981",
          light: "#D1FAE5",
          dark: "#065F46",
        },
        warning: {
          DEFAULT: "#F59E0B",
          light: "#FEF3C7",
          dark: "#92400E",
        },
        danger: {
          DEFAULT: "#EF4444",
          light: "#FEE2E2",
          dark: "#991B1B",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
