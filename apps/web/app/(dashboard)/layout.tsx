import Sidebar from '../../components/layout/Sidebar';
import TickerClimaNoticias from '../../components/dashboard/TickerClimaNoticias';

// NOTA: este layout asume que la validación de sesión (redirigir a /login si
// no hay token válido) se implementa vía middleware.ts en la raíz de apps/web
// (Next.js Middleware), leyendo la cookie agrisim_token. Se deja como
// siguiente paso de implementación (ver docs/ROADMAP.md, Fase 1).
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <TickerClimaNoticias />
        <main className="flex-1 p-8 bg-cad-superficie">{children}</main>
      </div>
    </div>
  );
}
