import type { Metadata } from "next";
import { Geist, Geist_Mono, Abril_Fatface } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Welcome to Celestia Hotel HRIS",
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
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
      </head>
      <body className={` ${abrilFatface.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
