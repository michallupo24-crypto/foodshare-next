import type { Metadata } from "next";
import { Amatic_SC, Assistant, Karantina } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { AuthProvider } from "@/lib/AuthContext";
import Nav from "@/components/Nav";
import HiddenMonogram from "@/components/HiddenMonogram";

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["hebrew", "latin"],
});

const karantina = Karantina({
  variable: "--font-karantina",
  subsets: ["hebrew", "latin"],
  weight: ["400", "700"],
});

const amatic = Amatic_SC({
  variable: "--font-amatic",
  subsets: ["hebrew", "latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "FoodShare - שיתוף מזון",
  description: "פלטפורמה קהילתית לשיתוף מזון",
  authors: [{ name: "MRL" }],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${assistant.variable} ${karantina.variable} ${amatic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-sand text-ink">
        <HiddenMonogram />
        <AuthProvider>
          <Nav />
          <main className="flex-1 w-full">{children}</main>
          <footer className="text-center text-xs text-ink/50 py-4">
            <Link href="/terms" className="underline text-ink/50">תנאי שימוש</Link>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
