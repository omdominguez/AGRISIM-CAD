import './globals.css';

export const metadata = {
  title: 'AgriSim CAD',
  description: 'Simulación de financiamiento agrícola y gestión de campo — CAD',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
