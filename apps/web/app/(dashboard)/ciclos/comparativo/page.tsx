'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api';

interface FilaComparativa {
  cicloId: string;
  nombre: string;
  cultivo: string;
  fechaInicio: string;
  estado: string;
  productoresInscritos: number;
  haSembradas: number;
  haEfectivas: number;
  montoFinanciado: number;
  montoFinanciadoPorHa: number | null;
  gananciaRealizada: number;
  rendimientoRealQqHa: number | null;
  rendimientoProyectadoQqHa: number | null;
  variacion?: {
    haSembradasPct: number | null;
    montoFinanciadoPorHaPct: number | null;
    rendimientoRealQqHaPct: number | null;
    gananciaRealizadaPct: number | null;
    cicloAnteriorNombre: string;
  } | null;
}

export default function ComparativoCiclosPage() {
  const [filas, setFilas] = useState<FilaComparativa[]>([]);
  const [cultivo, setCultivo] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = cultivo ? `?cultivo=${encodeURIComponent(cultivo)}` : '';
    apiFetch(`/ciclos/comparativo${query}`).then(setFilas).catch((e) => setError(e.message));
  }, [cultivo]);

  const cultivosDisponibles = Array.from(new Set(filas.map((f) => f.cultivo)));

  return (
    <div>
      <h1 className="text-2xl font-bold text-cad-navy mb-1">Comparativo entre Ciclos</h1>
      <p className="text-sm text-cad-apagado mb-6">
        KPIs por ciclo, con la variación % contra el ciclo anterior del mismo cultivo.
      </p>

      {cultivosDisponibles.length > 1 && (
        <div className="mb-4">
          <select
            value={cultivo}
            onChange={(e) => setCultivo(e.target.value)}
            className="border border-cad-linea rounded px-3 py-2 text-sm"
          >
            <option value="">Todos los cultivos</option>
            {cultivosDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {error && <p className="text-sm text-cad-danger mb-4">{error}</p>}

      <div className="bg-white border border-cad-linea rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-cad-superficie text-left text-cad-apagado">
            <tr>
              <th className="p-3 font-medium">Ciclo</th>
              <th className="p-3 font-medium">Ha sembradas</th>
              <th className="p-3 font-medium">Financiado / ha</th>
              <th className="p-3 font-medium">Rendimiento real</th>
              <th className="p-3 font-medium">Ganancia realizada</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.cicloId} className="border-t border-cad-linea">
                <td className="p-3">
                  <p className="font-medium">{f.nombre}</p>
                  <p className="text-xs text-cad-apagado">{f.cultivo} · {f.productoresInscritos} productores</p>
                </td>
                <td className="p-3">
                  {f.haSembradas.toFixed(1)} ha
                  <Variacion valor={f.variacion?.haSembradasPct} />
                </td>
                <td className="p-3">
                  {f.montoFinanciadoPorHa != null ? `$${f.montoFinanciadoPorHa.toFixed(0)}/ha` : '—'}
                  <Variacion valor={f.variacion?.montoFinanciadoPorHaPct} invertido />
                </td>
                <td className="p-3">
                  {f.rendimientoRealQqHa != null
                    ? `${f.rendimientoRealQqHa.toFixed(1)} qq/ha`
                    : f.rendimientoProyectadoQqHa != null
                      ? <span className="text-cad-ambar">{f.rendimientoProyectadoQqHa.toFixed(1)} qq/ha (proy.)</span>
                      : <span className="text-cad-apagado text-xs">sin dato</span>}
                  <Variacion valor={f.variacion?.rendimientoRealQqHaPct} />
                </td>
                <td className="p-3">
                  ${f.gananciaRealizada.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  <Variacion valor={f.variacion?.gananciaRealizadaPct} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filas.length === 0 && !error && (
          <p className="p-4 text-sm text-cad-apagado">No hay ciclos registrados todavía.</p>
        )}
      </div>
    </div>
  );
}

// Positivo = verde por defecto; para costos, "positivo" (subir) es malo, así que
// se invierte el color con la prop `invertido`.
function Variacion({ valor, invertido = false }: { valor?: number | null; invertido?: boolean }) {
  if (valor == null) return null;
  const esBueno = invertido ? valor < 0 : valor > 0;
  return (
    <span className={`block text-xs mt-0.5 ${esBueno ? 'text-cad-verde' : 'text-cad-danger'}`}>
      {valor > 0 ? '▲' : '▼'} {Math.abs(valor * 100).toFixed(0)}% vs. ciclo anterior
    </span>
  );
}
