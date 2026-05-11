import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";
import { AuthProvider } from "@/context/AuthContext";
import { LangProvider } from "@/context/LangContext";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DriveEasy — Car Rental & Sales | Buea, Cameroon",
  description:
    "Rent or buy quality vehicles in Buea, Douala and Yaoundé. FCFA pricing, instant booking, Orange Money & MTN MoMo payments.",
  keywords: "car rental cameroon, buy car cameroon, rent car buea, voiture location cameroun",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <LangProvider>
          <AuthProvider>
            <Navbar />
            <main>{children}</main>
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}