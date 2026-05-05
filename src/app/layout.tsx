import type { Metadata } from "next";

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
        {children}
      </body>
    </html>
  );
}
