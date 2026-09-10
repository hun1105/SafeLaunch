import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SafeLaunch // Audit Terminal",
  description: "Autonomous compliance audit and risk mitigation for AI founders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-[#fafaf9] text-[#0c0a09]">
        {children}
      </body>
    </html>
  );
}
