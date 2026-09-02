import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Subtek - Validación de Hipótesis",
  description: "Plataforma Lean para gestión de proyectos Subtek",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen font-sans">{children}</body>
    </html>
  );
}
