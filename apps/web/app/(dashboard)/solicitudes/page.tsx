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

// Color por estado: en curso = ámbar, liquidado = verde (ganancia realizada), rechazado/cancelado = danger.
const COLOR_ESTADO: Record<string, string> = {
  SOLICITUD_RECIBIDA: 'bg-cad-ambar/20 text-cad-ambar',
  PAQUETE_DEFINIDO: 'bg-cad-ambar/20 text-cad-ambar',
  APROBADA: 'bg-cad-info/10 text-cad-info',
  CONTRATO_FIRMADO: 'bg-cad-info/10 text-cad-info',
  DESPACHADA: 'bg-cad-info/10 text-cad-info',
  EN_SEGUIMIENTO: 'bg-cad-verde-claro/20 text-cad-verde',
  COSECHADA: 'bg-cad-verde-claro/20 text-cad-verde',
  LIQUIDADA: 'bg-cad-verde/15 text-cad-verde font-medium',
  RECHAZADA: 'bg-cad-danger/10 text-cad-danger',
  CANCELADA: 'bg-cad-danger/10 text-cad-danger',
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
      <h1 className="text-2xl font-bold text-cad-navy mb-1">Solicitudes de Financiamiento</h1>
      <p className="text-sm text-cad-apagado mb-6">
        Expediente completo del flujo: evaluación → paquete → aprobación → contrato → despacho → seguimiento → liquidación.
      </p>

      {resumen && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Stat label="Expuesto actualmente" valor={`$${resumen.expuestoTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />
          <Stat label="Ganancia esperada (en curso)" valor={`$${resumen.gananciaEsperadaTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />
          <Stat label="Ganancia realizada (liquidados)" valor={`$${resumen.gananciaRealizada.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} destacado />
        </div>
      )}

      {error && <p className="text-sm text-cad-danger mb-4">{error}</p>}

      <table className="w-full text-sm bg-white border border-cad-linea rounded-xl overflow-hidden">
        <thead className="bg-cad-superficie text-left">
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
                <span className={`px-2 py-0.5 rounded-full text-xs ${COLOR_ESTADO[s.estado] ?? 'bg-cad-superficie text-cad-apagado'}`}>
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
        <p className="text-sm text-cad-apagado mt-4">
          Aún no hay expedientes abiertos. Se crean desde un Ciclo existente (endpoint POST /solicitudes) —
          falta el formulario en UI, ver README → Roadmap Fase 1.
        </p>
      )}
    </div>
  );
}

function Stat({ label, valor, destacado = false }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <div className={`border border-cad-linea rounded-xl p-5 ${destacado ? 'bg-cad-navy text-white' : 'bg-white'}`}>
      <p className={`text-xs uppercase ${destacado ? 'text-white/70' : 'text-cad-apagado'}`}>{label}</p>
      <p className="text-2xl font-semibold mt-1">{valor}</p>
    </div>
  );
}
