'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

interface ResumenCiclo {
  solicitudId: string;
  estado: string;
  productor: string;
  finca: string | null;
  cultivo: string;
  areaSembradaHa: number;
  areaEfectivaHa: number;
  porcentajeAreaEnPie: number | null;
  montoTotalAFinanciar: number;
  gastadoAFecha: number;
  porcentajeDesembolsado: number | null;
  rendimientoProyectadoQqHa: number | null;
  proyeccionCosechaQq: number | null;
  ultimaVisita: { fecha: string; tecnico: string; estadoCultivo: string | null } | null;
}

const ETIQUETA_ESTADO: Record<string, string> = {
  APROBADA: 'Aprobada',
  CONTRATO_FIRMADO: 'Contrato firmado',
  DESPACHADA: 'Despachada',
  EN_SEGUIMIENTO: 'En seguimiento',
  COSECHADA: 'Cosechada',
};

export default function ResumenPage() {
  const [ciclos, setCiclos] = useState<ResumenCiclo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    apiFetch('/solicitudes/resumen/ciclos')
      .then(setCiclos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-cad-navy mb-1">Resumen de Ciclo</h1>
      <p className="text-sm text-cad-apagado mb-6">
        Ciclos en curso — área sembrada vs. efectiva, gasto a la fecha y proyección de cosecha,
        actualizados con cada visita de campo del técnico.
      </p>

      {error && <p className="text-sm text-cad-danger mb-4">{error}</p>}
      {cargando && <p className="text-sm text-cad-apagado">Cargando...</p>}

      {!cargando && ciclos.length === 0 && !error && (
        <div className="bg-white border border-cad-linea rounded-xl p-6 text-sm text-cad-apagado">
          No hay ciclos en curso todavía (con expediente aprobado en adelante). Esta vista se llena
          automáticamente a medida que se aprueban expedientes y los técnicos registran visitas de seguimiento.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {ciclos.map((c) => (
          <CicloCard key={c.solicitudId} ciclo={c} />
        ))}
      </div>
    </div>
  );
}

function CicloCard({ ciclo }: { ciclo: ResumenCiclo }) {
  const avanceArea = ciclo.porcentajeAreaEnPie ?? 1;
  const avanceDesembolso = ciclo.porcentajeDesembolsado ?? 0;

  return (
    <div className="bg-white border border-cad-linea rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-semibold text-cad-navy">{ciclo.productor}</p>
          <p className="text-xs text-cad-apagado">
            {ciclo.finca ? `${ciclo.finca} · ` : ''}{ciclo.cultivo}
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-cad-info/10 text-cad-info text-xs shrink-0">
          {ETIQUETA_ESTADO[ciclo.estado] ?? ciclo.estado}
        </span>
      </div>

      {/* Área sembrada vs. efectiva */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-cad-apagado mb-1">
          <span>Área en pie</span>
          <span>{ciclo.areaEfectivaHa.toFixed(1)} / {ciclo.areaSembradaHa.toFixed(1)} ha</span>
        </div>
        <div className="h-2 bg-cad-superficie rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${avanceArea < 0.85 ? 'bg-cad-danger' : 'bg-cad-verde'}`}
            style={{ width: `${Math.min(avanceArea * 100, 100)}%` }}
          />
        </div>
        {avanceArea < 1 && (
          <p className="text-xs text-cad-danger mt-1">
            {((1 - avanceArea) * 100).toFixed(0)}% del área sembrada se perdió o no está en pie
          </p>
        )}
      </div>

      {/* Gasto acumulado */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-cad-apagado mb-1">
          <span>Desembolsado a la fecha</span>
          <span>
            ${ciclo.gastadoAFecha.toLocaleString('en-US', { maximumFractionDigits: 0 })} / $
            {ciclo.montoTotalAFinanciar.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="h-2 bg-cad-superficie rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-cad-naranja" style={{ width: `${Math.min(avanceDesembolso * 100, 100)}%` }} />
        </div>
      </div>

      {/* Proyección de cosecha */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-cad-superficie rounded-lg p-3">
          <p className="text-xs text-cad-apagado">Rendimiento proyectado</p>
          <p className="text-sm font-medium mt-0.5">
            {ciclo.rendimientoProyectadoQqHa != null ? `${ciclo.rendimientoProyectadoQqHa.toFixed(1)} qq/ha` : '— sin dato aún'}
          </p>
        </div>
        <div className="bg-cad-superficie rounded-lg p-3">
          <p className="text-xs text-cad-apagado">Cosecha proyectada total</p>
          <p className="text-sm font-medium mt-0.5">
            {ciclo.proyeccionCosechaQq != null ? `${ciclo.proyeccionCosechaQq.toFixed(0)} qq` : '— sin dato aún'}
          </p>
        </div>
      </div>

      {/* Última visita */}
      <div className="border-t border-cad-linea pt-3">
        {ciclo.ultimaVisita ? (
          <p className="text-xs text-cad-apagado">
            Última visita: {new Date(ciclo.ultimaVisita.fecha).toLocaleDateString('es-VE')} · {ciclo.ultimaVisita.tecnico}
            {ciclo.ultimaVisita.estadoCultivo ? ` · ${ciclo.ultimaVisita.estadoCultivo}` : ''}
          </p>
        ) : (
          <p className="text-xs text-cad-ambar">Sin visitas de seguimiento registradas todavía</p>
        )}
      </div>
    </div>
  );
}
