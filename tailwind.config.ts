import type { Config } from "tailwindcss";

/**
 * Tailwind CSS v4 Configuration for MajuMail
 * 
 * NOTE: In Tailwind v4, most configuration is done through CSS.
 * This file is optional but can be used for additional customization.
 * 
 * The dark mode is configured in globals.css using:
 * @variant dark (&:where(.dark, .dark *));
 * 
 * If you prefer to configure dark mode here instead, use:
 * darkMode: "selector"
 */

const config: Config = {
  // In Tailwind v4, use "selector" for class-based dark mode
  // This works with the .dark class on <html>
  darkMode: "selector",
  
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  
  theme: {
    extend: {
      // Add any custom theme extensions here
      colors: {
        // You can add custom colors if needed
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  
  plugins: [],
};

export default config;