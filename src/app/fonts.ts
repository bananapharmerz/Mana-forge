import { Cormorant_Garamond } from "next/font/google";

// Display serif for the cinematic sections (homepage hero, product showcase).
export const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});
