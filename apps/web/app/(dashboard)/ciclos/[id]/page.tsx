'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../../lib/api';

export default function CicloDetallePage() {
  const params = useParams();
  const cicloId = params.id as string;

  const [resumen, setResumen] = useState<any | null>(null);
  const [fito, setFito] = useState<any | null>(null);
  const [efectivo, setEfectivo] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`/ciclos/${cicloId}/resumen`).then(setResumen).catch((e) => setError(e.message));
    apiFetch(`/campo/ciclos/${cicloId}/fitosanitario`).then(setFito).catch(() => {});
    apiFetch(`/cuentas/ciclos/${cicloId}/proyeccion-efectivo`).then(setEfectivo).catch(() => {});
  }, [cicloId]);

  if (error) return <p className="text-sm text-cad-danger">{error}</p>;
  if (!resumen) return <p className="text-sm text-cad-apagado">Cargando...</p>;

  const { ciclo, metas, real, avance, financiero } = resumen;

  return (
    <div>
      <h1 className="text-2xl font-bold text-cad-navy mb-1">{ciclo.nombre}</h1>
      <p className="text-sm text-cad-apagado mb-6">
        {ciclo.cultivo} · inicio {new Date(ciclo.fechaInicio).toLocaleDateString('es-VE')} · {ciclo.estado}
      </p>

      {/* Avance de la campaña */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Barra
          titulo="Productores inscritos"
          actual={real.productoresInscritos}
          meta={metas.productores}
          pct={avance.productoresPct}
          unidad=""
        />
        <Barra
          titulo="Hectáreas sembradas (según KML)"
          actual={real.hectareasSembradas}
          meta={metas.hectareas}
          pct={avance.hectareasPct}
          unidad=" ha"
        />
      </div>

      {/* Cifras clave */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Stat label="Ha comprometidas" valor={`${real.hectareasComprometidas.toFixed(1)} ha`} />
        <Stat label="Ha efectivas en pie" valor={`${real.hectareasEfectivas.toFixed(1)} ha`} />
        <Stat label="Financiado" valor={`$${financiero.financiadoTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />
        <Stat
          label="Desembolsado"
          valor={`$${financiero.desembolsadoTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          nota={`Pendiente: $${financiero.pendientePorDesembolsar.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
        />
      </div>

      {/* Efectivo necesario para la cosecha */}
      {efectivo && (
        <div className="bg-cad-navy text-white rounded-xl p-6 mb-8">
          <p className="text-xs uppercase text-white/60">Efectivo necesario para pagar productores en cosecha</p>
          <p className="text-3xl font-bold mt-1">
            ${efectivo.efectivoNecesarioParaPagos.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-white/60 mt-2">
            Proyección a ${efectivo.precioQqUtilizado}/qq sobre {efectivo.produccionTotalProyectadaQq.toFixed(0)} qq estimados.
            {efectivo.participacionesSinProyeccion > 0 && (
              <span className="text-cad-ambar">
                {' '}⚠ {efectivo.participacionesSinProyeccion} productor(es) sin visita de proyección — la cifra está subestimada.
              </span>
            )}
          </p>
        </div>
      )}

      {/* Panel fitosanitario */}
      {fito && fito.totalIncidencias > 0 && (
        <div className="bg-white border border-cad-linea rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-cad-navy">Situación fitosanitaria</p>
            {fito.criticas > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-cad-danger/10 text-cad-danger text-xs">
                {fito.criticas} crítica(s)
              </span>
            )}
          </div>
          <div className="space-y-2">
            {fito.detalle.slice(0, 5).map((i: any) => (
              <div key={i.id} className="flex items-center justify-between text-sm border-b border-cad-linea pb-2 last:border-0">
                <div>
                  <span className="font-medium">{i.nombreComun}</span>
                  <span className="text-cad-apagado"> · {i.productor}{i.lote ? ` · ${i.lote}` : ''}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  i.severidad >= 4 ? 'bg-cad-danger/10 text-cad-danger' : 'bg-cad-ambar/20 text-cad-ambar'
                }`}>
                  Severidad {i.severidad}/5
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detalle por productor */}
      <p className="font-semibold text-cad-navy mb-3">Productores del ciclo</p>
      <div className="bg-white border border-cad-linea rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cad-superficie text-left text-cad-apagado">
            <tr>
              <th className="p-3 font-medium">Productor</th>
              <th className="p-3 font-medium">Lotes</th>
              <th className="p-3 font-medium">Ha sembradas</th>
              <th className="p-3 font-medium">Ha efectivas</th>
              <th className="p-3 font-medium">Desembolsado</th>
              <th className="p-3 font-medium">Proyección</th>
            </tr>
          </thead>
          <tbody>
            {resumen.detalleProductores.map((p: any) => (
              <tr key={p.cicloProductorId} className="border-t border-cad-linea">
                <td className="p-3">{p.productor}</td>
                <td className="p-3">{p.cantidadLotes}</td>
                <td className="p-3">{p.haSembradas.toFixed(2)}</td>
                <td className={`p-3 ${p.haEfectivas < p.haSembradas ? 'text-cad-danger' : ''}`}>
                  {p.haEfectivas.toFixed(2)}
                </td>
                <td className="p-3">${p.desembolsado.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                <td className="p-3">
                  {p.rendimientoProyectadoQqHa != null
                    ? `${p.produccionProyectadaQq.toFixed(0)} qq`
                    : <span className="text-cad-ambar text-xs">sin visita</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {resumen.detalleProductores.length === 0 && (
          <p className="p-4 text-sm text-cad-apagado">Aún no hay productores inscritos en este ciclo.</p>
        )}
      </div>
    </div>
  );
}

function Barra({ titulo, actual, meta, pct, unidad }: any) {
  const porcentaje = Math.min((pct ?? 0) * 100, 100);
  return (
    <div className="bg-white border border-cad-linea rounded-xl p-5">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-cad-apagado">{titulo}</span>
        <span className="font-medium">
          {typeof actual === 'number' ? actual.toFixed(unidad ? 1 : 0) : actual}{unidad} / {meta}{unidad}
        </span>
      </div>
      <div className="h-2 bg-cad-superficie rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-cad-verde" style={{ width: `${porcentaje}%` }} />
      </div>
      <p className="text-xs text-cad-apagado mt-1">{porcentaje.toFixed(0)}% de la meta</p>
    </div>
  );
}

function Stat({ label, valor, nota }: { label: string; valor: string; nota?: string }) {
  return (
    <div className="bg-white border border-cad-linea rounded-xl p-4">
      <p className="text-xs text-cad-apagado">{label}</p>
      <p className="text-xl font-semibold mt-1 text-cad-navy">{valor}</p>
      {nota && <p className="text-xs text-cad-apagado mt-1">{nota}</p>}
    </div>
  );
}
