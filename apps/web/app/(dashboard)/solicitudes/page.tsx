'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

const ETIQUETA_ESTADO: Record<string, string> = {
  SOLICITUD_RECIBIDA: 'Evaluación',
  PAQUETE_DEFINIDO: 'Paquete definido',
  APROBADA: 'Aprobada',
  CONTRATO_FIRMADO: 'Contrato firmado',
  DESPACHADA: 'Despachada',
  EN_SEGUIMIENTO: 'En seguimiento',
  COSECHADA: 'Cosechada',
  LIQUIDADA: 'Liquidada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
};

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/solicitudes').then(setSolicitudes).catch((e) => setError(e.message));
    apiFetch('/solicitudes/portafolio/resumen').then(setResumen).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Solicitudes de Financiamiento</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Expediente completo del flujo: evaluación → paquete → aprobación → contrato → despacho → seguimiento → liquidación.
      </p>

      {resumen && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Stat label="Expuesto actualmente" valor={`$${resumen.expuestoTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />
          <Stat label="Ganancia esperada (en curso)" valor={`$${resumen.gananciaEsperadaTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />
          <Stat label="Ganancia realizada (liquidados)" valor={`$${resumen.gananciaRealizada.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} destacado />
        </div>
      )}

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <table className="w-full text-sm bg-white border rounded-xl overflow-hidden">
        <thead className="bg-neutral-100 text-left">
          <tr>
            <th className="p-3">Productor</th>
            <th className="p-3">Cultivo</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Anticipo solicitado</th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="p-3">{s.ciclo?.productor?.nombre}</td>
              <td className="p-3">{s.ciclo?.cultivo}</td>
              <td className="p-3">
                <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-xs">
                  {ETIQUETA_ESTADO[s.estado] ?? s.estado}
                </span>
              </td>
              <td className="p-3">
                {s.montoAnticipoSolicitado ? `$${Number(s.montoAnticipoSolicitado).toLocaleString('en-US')}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {solicitudes.length === 0 && !error && (
        <p className="text-sm text-neutral-400 mt-4">
          Aún no hay expedientes abiertos. Se crean desde un Ciclo existente (endpoint POST /solicitudes) —
          falta el formulario en UI, ver README → Roadmap Fase 1.
        </p>
      )}
    </div>
  );
}

function Stat({ label, valor, destacado = false }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <div className={`border rounded-xl p-5 ${destacado ? 'bg-neutral-900 text-white' : 'bg-white'}`}>
      <p className={`text-xs uppercase ${destacado ? 'text-neutral-300' : 'text-neutral-500'}`}>{label}</p>
      <p className="text-2xl font-semibold mt-1">{valor}</p>
    </div>
  );
}
