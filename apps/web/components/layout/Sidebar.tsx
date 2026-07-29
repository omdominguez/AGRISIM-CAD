'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { obtenerUsuario, cerrarSesion, RolUsuario } from '../../lib/auth';
import Logo from '../brand/Logo';

interface ItemNav {
  href: string;
  label: string;
  rolesPermitidos?: RolUsuario[]; // undefined = visible para todos los autenticados
}

const NAV: ItemNav[] = [
  { href: '/ciclos', label: 'Ciclos' },
  { href: '/productores', label: 'Productores' },
  { href: '/solicitudes', label: 'Financiamientos' },
  { href: '/cartera', label: 'Cartera y Cuentas' },
  { href: '/simulador', label: 'Calculadora' },
  { href: '/mapa', label: 'Mapa de Parcelas' },
  { href: '/noticias', label: 'Clima y Noticias' },
  { href: '/admin/usuarios', label: 'Usuarios y Roles', rolesPermitidos: ['MASTER_ADMIN'] },
];

const ROL_LABEL: Record<RolUsuario, string> = {
  MASTER_ADMIN: 'Administrador',
  GERENTE: 'Gerencia',
  TECNICO_CAMPO: 'Técnico de Campo',
  JUNTA_DIRECTIVA: 'Junta Directiva',
};

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
    <aside className="w-60 shrink-0 bg-cad-navy text-white min-h-screen flex flex-col">
      <div className="p-5 border-b border-white/10">
        <Logo variante="isotipo" alto={32} />
        <p className="font-semibold text-sm mt-3">CAD Agrícola</p>
        {usuario && (
          <p className="text-xs text-white/50 mt-0.5">
            {usuario.nombre} · {ROL_LABEL[usuario.rol]}
          </p>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {itemsVisibles.map((item) => {
          const activo = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded text-sm transition-colors ${
                activo
                  ? 'bg-cad-naranja text-white font-medium'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="m-3 text-sm text-white/50 hover:text-white text-left px-3 py-2"
      >
        Cerrar sesión
      </button>
    </aside>
  );
}
