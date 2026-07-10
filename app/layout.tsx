import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "@/lib/user-context";

export const metadata: Metadata = {
  title: "Daintymindz Academy",
  description: "A structured learning platform for researchers, engineers, and data practitioners.",
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: "Daintymindz Academy",
    description: "A structured learning platform for researchers, engineers, and data practitioners.",
    url: "https://academy.daintymindz.com",
    siteName: "Daintymindz Academy",
    type: "website",
    images: [{ url: "https://academy.daintymindz.com/og.png", width: 1200, height: 630, alt: "Daintymindz Academy" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Daintymindz Academy",
    description: "A structured learning platform for researchers, engineers, and data practitioners.",
    images: ["https://academy.daintymindz.com/og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body><UserProvider>{children}</UserProvider></body>
    </html>
  );
}