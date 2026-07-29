'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

export default function ProductoresPage() {
  const [productores, setProductores] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    apiFetch('/productores')
      .then(setProductores)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-cad-navy mb-1">Productores</h1>
      <p className="text-sm text-cad-apagado mb-6">
        Registro maestro. Se crean una vez y luego se seleccionan al inscribirlos en un ciclo.
      </p>

      {error && <p className="text-sm text-cad-danger mb-4">{error}</p>}
      {cargando && <p className="text-sm text-cad-apagado">Cargando...</p>}

      <div className="bg-white border border-cad-linea rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cad-superficie text-left text-cad-apagado">
            <tr>
              <th className="p-3 font-medium">Nombre</th>
              <th className="p-3 font-medium">Cédula / RIF</th>
              <th className="p-3 font-medium">Zona</th>
              <th className="p-3 font-medium">Fincas</th>
              <th className="p-3 font-medium">Ciclos</th>
            </tr>
          </thead>
          <tbody>
            {productores.map((p) => (
              <tr key={p.id} className="border-t border-cad-linea">
                <td className="p-3 font-medium">{p.nombre}</td>
                <td className="p-3 text-cad-apagado">{p.cedulaRif ?? '—'}</td>
                <td className="p-3 text-cad-apagado">{p.ubicacionZona ?? '—'}</td>
                <td className="p-3">{p.fincas?.length ?? 0}</td>
                <td className="p-3">{p._count?.participaciones ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!cargando && productores.length === 0 && (
          <p className="p-4 text-sm text-cad-apagado">
            No hay productores registrados. Se crean con <code>POST /api/productores</code>.
          </p>
        )}
      </div>
    </div>
  );
}
