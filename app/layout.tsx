import type { Metadata } from "next";
import { Geist, Geist_Mono, Roboto, Raleway, Merriweather } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Jakala Open",
  description: "Site para proponer y votar charlas para el Open de Jakala",
  openGraph: {
    title: "Jakala Open",
    description: "Site para proponer y votar charlas para el Open de Jakala",
    images: [
      {
        url: "/OpenBiko2.jpg",
        width: 1200,
        height: 630,
        alt: "Jakala Open",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Jakala Open",
    description: "Site para proponer y votar charlas para el Open de Jakala",
    images: ["/OpenBiko2.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${roboto.variable} ${raleway.variable} ${merriweather.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
