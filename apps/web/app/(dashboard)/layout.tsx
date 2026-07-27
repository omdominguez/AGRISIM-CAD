import Sidebar from '../../components/layout/Sidebar';

// NOTA: este layout asume que la validación de sesión (redirigir a /login si
// no hay token válido) se implementa vía middleware.ts en la raíz de apps/web
// (Next.js Middleware), leyendo la cookie agrisim_token. Se deja como
// siguiente paso de implementación (ver docs/ROADMAP.md, Fase 1).
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-neutral-50 min-h-screen">{children}</main>
    </div>
  );
}
