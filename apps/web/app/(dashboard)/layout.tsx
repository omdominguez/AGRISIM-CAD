import TopBar from '../../components/layout/TopBar';
import TickerClimaNoticias from '../../components/dashboard/TickerClimaNoticias';

// NOTA: este layout asume que la validación de sesión (redirigir a /login si
// no hay token válido) se implementa vía middleware.ts en la raíz de apps/web
// (Next.js Middleware), leyendo la cookie agrisim_token. Se deja como
// siguiente paso de implementación (ver docs/ROADMAP.md, Fase 1).
//
// La navegación ya no es un menú lateral fijo — es una barra superior
// delgada (TopBar) con un botón para volver a /inicio, el "launcher" con la
// cuadrícula de módulos, al estilo de la pantalla de apps de Odoo.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <TickerClimaNoticias />
      <main className="flex-1 p-8 bg-cad-superficie">{children}</main>
    </div>
  );
}
