'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { obtenerUsuario, RolUsuario, UsuarioSesion } from '../../../lib/auth';
import UsuariosPanel from '../../../components/ajustes/UsuariosPanel';
import ProveedoresPanel from '../../../components/ajustes/ProveedoresPanel';
import InsumosPanel from '../../../components/ajustes/InsumosPanel';
import ProductoresPanel from '../../../components/ajustes/ProductoresPanel';

type Tab = 'usuarios' | 'proveedores' | 'insumos' | 'productores';

const TABS: { id: Tab; label: string; rolesPermitidos?: RolUsuario[] }[] = [
  { id: 'usuarios', label: 'Usuarios y Roles', rolesPermitidos: ['MASTER_ADMIN'] },
  { id: 'proveedores', label: 'Proveedores' },
  { id: 'insumos', label: 'Insumos' },
  { id: 'productores', label: 'Productores' },
];

function AjustesContenido() {
  const searchParams = useSearchParams();

  // Misma razón que en TopBar/Sidebar: la cookie de sesión solo existe en
  // el navegador, se lee después de montar para no romper la hidratación.
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  useEffect(() => { setUsuario(obtenerUsuario()); }, []);

  const tabsVisibles = TABS.filter((t) => !t.rolesPermitidos || (usuario && t.rolesPermitidos.includes(usuario.rol)));

  const tabDeUrl = searchParams.get('tab') as Tab | null;
  const [tab, setTab] = useState<Tab | null>(null);

  // Se resuelve la pestaña activa una vez que ya sabemos qué rol tiene el
  // usuario (para no seleccionar "usuarios" si no la va a poder ver).
  useEffect(() => {
    if (!usuario) return;
    const solicitada = tabDeUrl && tabsVisibles.some((t) => t.id === tabDeUrl) ? tabDeUrl : tabsVisibles[0]?.id;
    setTab(solicitada ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-cad-navy mb-1">Ajustes</h1>
      <p className="text-sm text-cad-apagado mb-6">
        Catálogos maestros: quién usa el sistema y con quién/qué se trabaja.
      </p>

      <div className="flex gap-1 mb-6 bg-white border border-cad-linea rounded-xl p-1 w-fit flex-wrap">
        {tabsVisibles.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-cad-naranja text-white' : 'text-cad-apagado hover:text-cad-navy'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'usuarios' && tabsVisibles.some((t) => t.id === 'usuarios') && <UsuariosPanel />}
      {tab === 'proveedores' && <ProveedoresPanel />}
      {tab === 'insumos' && <InsumosPanel />}
      {tab === 'productores' && <ProductoresPanel />}
    </div>
  );
}

export default function AjustesPage() {
  return (
    <Suspense fallback={null}>
      <AjustesContenido />
    </Suspense>
  );
}
