import type { Metadata } from "next";
import { Geist, Geist_Mono, Abril_Fatface } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import NetworkStatusBanner from "@/components/NetworkStatusBanner";

export const metadata: Metadata = {
  title: "Welcome to Celestia Hotel HRIS",
  description: "Human Resource Information System for Celestia Hotel",
  icons: {
    icon: "/logo/celestia_tab_icon.ico"
  },
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
        <NetworkStatusBanner />
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              borderRadius: '8px',
              fontSize: '14px',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
          gutter={8}
          containerStyle={{
            top: 20,
            left: 20,
            bottom: 20,
            right: 20,
          }}
          reverseOrder={false}
        />
      </body>
    </html>
  );
}