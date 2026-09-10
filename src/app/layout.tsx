import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/providers/Web3Provider";

// Two families, and the mono is not decoration: every address, hash, amount and
// chain id in this app is scanned character by character, which a proportional
// face makes harder than it needs to be.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChaosPay — USDC settlement terminal on Arc",
  description:
    "Create payment requests and settle USDC payments on Arc Testnet with predictable fees and fast finality.",
};

const themeScript = `
// Dark is this interface's default rather than the OS preference: the terminal
// look is the designed one, and light is the deliberate opt-out.
try {
  const storedTheme = localStorage.getItem("chaospay-theme");
  document.documentElement.classList.toggle("dark", storedTheme !== "light");
} catch (_) {
  document.documentElement.classList.add("dark");
}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="app-document" lang="en" suppressHydrationWarning>
      <head className="app-head">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`app-body ${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
