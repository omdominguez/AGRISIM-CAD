'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { obtenerUsuario, cerrarSesion, RolUsuario, UsuarioSesion } from '../../lib/auth';
import { obtenerModuloDeRuta } from '../../lib/modulos';
import ModuloIcono from '../icons/ModuloIcono';
import Logo from '../brand/Logo';

const ROL_LABEL: Record<RolUsuario, string> = {
  MASTER_ADMIN: 'Administrador',
  GERENTE: 'Gerencia',
  TECNICO_CAMPO: 'Técnico de Campo',
  JUNTA_DIRECTIVA: 'Junta Directiva',
};

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();

  // Misma razón que antes en el Sidebar: la cookie de sesión solo existe en
  // el navegador, así que se lee después de montar para que el primer
  // render en cliente coincida con el del servidor (evita hydration
  // mismatch) y el nombre/rol aparezca un instante después, sin error.
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  useEffect(() => { setUsuario(obtenerUsuario()); }, []);

  const modulo = obtenerModuloDeRuta(pathname);

  function handleLogout() {
    cerrarSesion();
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-40 bg-cad-navy/95 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/inicio"
            aria-label="Volver al inicio"
            title="Volver al inicio"
            className="shrink-0 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition-colors"
          >
            <ModuloIcono nombre="grid" className="w-4 h-4" />
          </Link>

          <Link href="/inicio" className="shrink-0 hidden sm:block">
            <Logo variante="isotipo" alto={22} />
          </Link>

          {modulo && (
            <div className="flex items-center gap-2 min-w-0 pl-1 sm:pl-2 sm:border-l sm:border-white/15">
              <div className={`shrink-0 w-6 h-6 rounded-md ${modulo.color} flex items-center justify-center`}>
                <ModuloIcono nombre={modulo.icono} className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-medium text-white truncate">{modulo.label}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <span className="text-xs text-white/60 hidden md:inline">
            {usuario ? `${usuario.nombre} · ${ROL_LABEL[usuario.rol]}` : '\u00A0'}
          </span>
          <button onClick={handleLogout} className="text-xs text-white/70 hover:text-white transition-colors">
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
