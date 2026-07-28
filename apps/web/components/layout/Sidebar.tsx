'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { obtenerUsuario, cerrarSesion, RolUsuario } from '../../lib/auth';

interface ItemNav {
  href: string;
  label: string;
  rolesPermitidos?: RolUsuario[]; // si es undefined, visible para todos los roles autenticados
}

const NAV: ItemNav[] = [
  { href: '/solicitudes', label: 'Solicitudes de Financiamiento' },
  { href: '/simulador', label: 'Calculadora Rápida' },
  { href: '/ciclos', label: 'Ciclos de Siembra' },
  { href: '/productores', label: 'Productores' },
  { href: '/mapa', label: 'Mapa de Parcelas' },
  { href: '/noticias', label: 'Clima y Noticias' },
  { href: '/admin/usuarios', label: 'Usuarios y Roles', rolesPermitidos: ['MASTER_ADMIN'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const usuario = obtenerUsuario();

  const itemsVisibles = NAV.filter(
    (item) => !item.rolesPermitidos || item.rolesPermitidos.includes(usuario?.rol as RolUsuario),
  );

  function handleLogout() {
    cerrarSesion();
    router.push('/login');
  }

  return (
    <aside className="w-64 shrink-0 bg-cad-navy text-white min-h-screen flex flex-col">
      <div className="p-5 border-b border-white/10">
        <p className="font-bold tracking-tight">
          CA<span className="text-cad-verde-claro">D</span>
          <span className="text-cad-naranja">.</span> AgriSim
        </p>
        {usuario && (
          <p className="text-xs text-white/60 mt-1">
            {usuario.nombre} · {ROL_LABEL[usuario.rol]}
          </p>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {itemsVisibles.map((item) => {
          const activo = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded text-sm transition-colors ${
                activo
                  ? 'bg-cad-naranja text-white font-medium'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button onClick={handleLogout} className="m-3 text-sm text-white/50 hover:text-white text-left px-3 py-2">
        Cerrar sesión
      </button>
    </aside>
  );
}

const ROL_LABEL: Record<RolUsuario, string> = {
  MASTER_ADMIN: 'Administrador Master',
  GERENTE: 'Gerente de Departamento',
  TECNICO_CAMPO: 'Técnico de Campo',
  JUNTA_DIRECTIVA: 'Junta Directiva (solo lectura)',
};
