import type { Metadata } from "next";
import "./globals.css";

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
      </head>
      <body>{children}</body>
    </html>
  );
}