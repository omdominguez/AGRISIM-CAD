'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { obtenerUsuario, cerrarSesion, RolUsuario, UsuarioSesion } from '../../lib/auth';
import { MODULOS } from '../../lib/modulos';
import ModuloIcono from '../../components/icons/ModuloIcono';
import Logo from '../../components/brand/Logo';
import FondoCampoTecnologia from '../../components/landing/FondoCampoTecnologia';

const ROL_LABEL: Record<RolUsuario, string> = {
  MASTER_ADMIN: 'Administrador',
  GERENTE: 'Gerencia',
  TECNICO_CAMPO: 'Técnico de Campo',
  JUNTA_DIRECTIVA: 'Junta Directiva',
};

export default function InicioPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const sesion = obtenerUsuario();
    if (!sesion) {
      router.replace('/login');
      return;
    }
    setUsuario(sesion);
    setListo(true);
  }, [router]);

  function handleLogout() {
    cerrarSesion();
    router.push('/login');
  }

  const apps = MODULOS.filter(
    (m) => m.enGrid && (!m.rolesPermitidos || (usuario && m.rolesPermitidos.includes(usuario.rol))),
  );

  // Evita un parpadeo de la cuadrícula completa antes de saber si hay sesión.
  if (!listo) return <div className="min-h-screen bg-cad-navy" />;

  return (
    <main className="relative min-h-screen bg-cad-navy overflow-hidden">
      <FondoCampoTecnologia />

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="flex items-center justify-between px-6 sm:px-10 py-6">
          <div className="flex items-center gap-3">
            <Logo variante="isotipo" alto={34} />
            <div>
              <p className="text-white font-semibold text-sm leading-tight">CAD Agrícola</p>
              <p className="text-white/50 text-xs leading-tight">
                {usuario ? `${usuario.nombre} · ${ROL_LABEL[usuario.rol]}` : '\u00A0'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-white/60 hover:text-white border border-white/15 hover:border-white/30 rounded-full px-4 py-2 backdrop-blur-md bg-white/5 transition-colors"
          >
            Cerrar sesión
          </button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
          <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-2">Tus aplicaciones</p>
          <h1 className="font-display text-white text-4xl sm:text-5xl tracking-wide mb-10 text-center">
            ¿Qué vamos a hacer hoy?
          </h1>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5 max-w-5xl w-full">
            {apps.map((app) => (
              <Link
                key={app.href}
                href={app.href}
                className="group relative rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl p-5 flex flex-col items-center text-center gap-3 overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1.5 hover:bg-white/[0.16] hover:border-white/30 hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.55)]"
              >
                {/* Brillo especular — el "liquid glass" real está en esta capa translúcida superior */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/25 via-white/0 to-transparent opacity-70"
                />
                <div
                  className={`relative w-12 h-12 rounded-2xl ${app.color} flex items-center justify-center shadow-lg shadow-black/25 transition-transform duration-300 group-hover:scale-110`}
                >
                  <ModuloIcono nombre={app.icono} className="w-6 h-6 text-white" />
                </div>
                <p className="relative text-white text-sm font-medium leading-tight">{app.label}</p>
                {app.descripcion && (
                  <p className="relative text-white/50 text-xs leading-snug line-clamp-2">{app.descripcion}</p>
                )}
              </Link>
            ))}
          </div>
        </div>

        <p className="text-center text-white/30 text-xs pb-6">
          Comercializadora Agrícola Domínguez, C.A. · Uso interno
        </p>
      </div>
    </main>
  );
}
