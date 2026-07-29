import { Poppins, Bebas_Neue } from 'next/font/google';
import './globals.css';

// Familia operativa — todo el sistema (Manual de Marca §09)
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

// Tipografía de impacto — solo titulares de gran escala (Manual de Marca §10)
const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bebas',
  display: 'swap',
});

export const metadata = {
  title: 'CAD Agrícola',
  description: 'Financiamiento a campo — Comercializadora Agrícola Domínguez',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${poppins.variable} ${bebasNeue.variable}`}>
      <body className="font-sans bg-cad-superficie text-cad-tinta">{children}</body>
    </html>
  );
}
