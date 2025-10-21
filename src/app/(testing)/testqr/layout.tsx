import type { Metadata } from "next";
import { Abril_Fatface } from "next/font/google";

export const metadata: Metadata = {
  title: "Welcome to Celestia Hotel HRIS",
  description: "Human Resource Information System for Celestia Hotel",
};

const abrilFatface = Abril_Fatface({
  variable: "--font-abril",
  weight: "400",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* ✅ Material Icons CDN */}
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${abrilFatface.variable} antialiased bg-[#fdf3e2] text-[#3b2b1c]`}
      >
        {children}
      </body>
    </html>
  );
}
