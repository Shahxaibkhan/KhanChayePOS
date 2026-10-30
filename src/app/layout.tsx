import type { Metadata } from "next";
import { Poppins, Anton } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Khan Chaye POS",
  description: "Internal point-of-sale for Khan Chaye — orders & expenses.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${anton.variable} h-full`}>
      <body className="h-full flex flex-col font-sans antialiased bg-kc-black text-kc-cream">
        {children}
      </body>
    </html>
  );
}
