import MenuLateral from "@/components/menuLateral";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Financas Pessoais",
  description: "Aplicacao de financas pessoais.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <MenuLateral />
        {children}
      </body>
    </html>
  );
}
