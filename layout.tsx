import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif" });
const sans = Manrope({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Business OS | KNL.LIMA",
  description: "Captação, qualificação por IA, vendas autônomas e entrega automática em um só sistema.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${serif.variable} ${sans.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

/* ---------------------------------------------------------------
INSTALAÇÃO
  npx create-next-app@latest business-os --ts --tailwind --app
  cd business-os
  npm i framer-motion three @react-three/fiber @react-three/drei
  npm i -D @types/three

tailwind.config.ts  → dentro de theme.extend:
  fontFamily: {
    serif: ["var(--font-serif)", "Georgia", "serif"],
    sans:  ["var(--font-sans)", "system-ui", "sans-serif"],
  }

Copie: app/page.tsx, app/layout.tsx, components/NucleoCerebro.tsx
Deploy: Vercel (importar o repositório).
--------------------------------------------------------------- */
