import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/providers/Web3Provider";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "SealPay — USDC payments on Arc",
  description:
    "Create payment requests and settle USDC payments on Arc Testnet with predictable fees and fast finality.",
};

const themeScript = `
try {
  const storedTheme = localStorage.getItem("seal-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldUseDark = storedTheme ? storedTheme === "dark" : prefersDark;
  document.documentElement.classList.toggle("dark", shouldUseDark);
} catch (_) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${kanit.variable} antialiased`}>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
