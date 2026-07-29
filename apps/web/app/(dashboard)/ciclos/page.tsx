'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../lib/api';

const ETIQUETA_TIPO: Record<string, string> = {
  NORTE_VERANO: 'Norte-Verano',
  INVIERNO: 'Invierno',
};

const COLOR_ESTADO: Record<string, string> = {
  PLANIFICACION: 'bg-cad-ambar/20 text-cad-ambar',
  EN_CURSO: 'bg-cad-verde/15 text-cad-verde',
  COSECHA: 'bg-cad-info/10 text-cad-info',
  CERRADO: 'bg-cad-superficie text-cad-apagado',
};

export default function CiclosPage() {
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    apiFetch('/ciclos')
      .then(setCiclos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-cad-navy mb-1">Ciclos</h1>
      <p className="text-sm text-cad-apagado mb-6">
        Cada ciclo agrupa a los productores financiados de una campaña, con sus lotes y seguimiento.
      </p>

      {error && <p className="text-sm text-cad-danger mb-4">{error}</p>}
      {cargando && <p className="text-sm text-cad-apagado">Cargando...</p>}

      {!cargando && ciclos.length === 0 && !error && (
        <div className="bg-white border border-cad-linea rounded-xl p-6 text-sm text-cad-apagado">
          No hay ciclos registrados. Se crean con <code>POST /api/ciclos</code> — el formulario
          en interfaz es el siguiente paso del desarrollo.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {ciclos.map((c) => (
          <Link
            key={c.id}
            href={`/ciclos/${c.id}`}
            className="bg-white border border-cad-linea rounded-xl p-5 hover:border-cad-naranja transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-cad-navy">{c.nombre}</p>
                <p className="text-xs text-cad-apagado mt-0.5">
                  {ETIQUETA_TIPO[c.tipo] ?? c.tipo} · {c.cultivo}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs shrink-0 ${COLOR_ESTADO[c.estado] ?? ''}`}>
                {c.estado}
              </span>
            </div>
            <div className="flex gap-6 text-sm mt-4">
              <div>
                <p className="text-xs text-cad-apagado">Productores</p>
                <p className="font-medium">
                  {c._count?.participaciones ?? 0}
                  <span className="text-cad-apagado font-normal"> / {c.metaProductores}</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-cad-apagado">Meta hectáreas</p>
                <p className="font-medium">{Number(c.metaHectareas).toLocaleString('es-VE')} ha</p>
              </div>
              <div>
                <p className="text-xs text-cad-apagado">Inicio</p>
                <p className="font-medium">{new Date(c.fechaInicio).toLocaleDateString('es-VE')}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
