'use client';

import { useState } from 'react';
import { apiFetch } from '../../../lib/api';

// Calculadora rápida — misma fórmula real del flujo de financiamiento de CAD:
//   Cobro = (Costo Insumos x (1 + margen)) + (Anticipo x (1 + recargo))
// Sirve para estimar ANTES de abrir un expediente formal (ver /ciclos -> Solicitudes).

interface FormState {
  nombre: string;
  cultivo: string;
  costoTotalInsumos: string;
  margenInsumosPct: string;
  solicitaAnticipo: boolean;
  montoAnticipo: string;
  recargoAnticipoPct: string;
  areaHectareas: string;
  rendimientoEsperadoQqHa: string;
  precioVentaQq: string;
}

const INICIAL: FormState = {
  nombre: '',
  cultivo: 'Frijol Pico Negro',
  costoTotalInsumos: '',
  margenInsumosPct: '0.30',
  solicitaAnticipo: false,
  montoAnticipo: '',
  recargoAnticipoPct: '0.05',
  areaHectareas: '',
  rendimientoEsperadoQqHa: '',
  precioVentaQq: '',
};

interface Resultados {
  montoInsumosConMargen: number;
  gananciaInsumos: number;
  montoAnticipoConRecargo: number;
  gananciaAnticipo: number;
  montoTotalADesembolsar: number;
  totalACobrarEnLiquidacion: number;
  gananciaEsperadaCAD: number;
  margenSobreDesembolsoPct: number;
  produccionEsperadaQq: number | null;
  ingresoBrutoEsperado: number | null;
  coberturaCosechaPct: number | null;
}

export default function SimuladorPage() {
  const [form, setForm] = useState<FormState>(INICIAL);
  const [resultados, setResultados] = useState<Resultados | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onChange<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function calcular() {
    setError(null);
    setCargando(true);
    try {
      const payload = {
        nombre: form.nombre || 'Simulación sin nombre',
        cultivo: form.cultivo,
        costoTotalInsumos: Number(form.costoTotalInsumos),
        margenInsumosPct: Number(form.margenInsumosPct),
        solicitaAnticipo: form.solicitaAnticipo,
        montoAnticipo: form.solicitaAnticipo ? Number(form.montoAnticipo) : 0,
        recargoAnticipoPct: Number(form.recargoAnticipoPct),
        areaHectareas: form.areaHectareas ? Number(form.areaHectareas) : undefined,
        rendimientoEsperadoQqHa: form.rendimientoEsperadoQqHa ? Number(form.rendimientoEsperadoQqHa) : undefined,
        precioVentaQq: form.precioVentaQq ? Number(form.precioVentaQq) : undefined,
      };
      const data = await apiFetch('/simulaciones/calcular', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setResultados(data);
    } catch (err: any) {
      setError(err.message ?? 'Error al calcular la simulación.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold mb-1">Calculadora de Financiamiento</h1>
      <p className="text-neutral-500 mb-6 text-sm">
        Estimación rápida con la fórmula real: Cobro = (Insumos × 1+margen) + (Anticipo × 1+recargo).
        Para abrir el expediente formal (paso a paso), ve a <span className="font-medium">Ciclos → Nueva Solicitud</span>.
      </p>

      <div className="grid grid-cols-2 gap-8">
        {/* --- FORMULARIO --- */}
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <Campo label="Nombre de la simulación" value={form.nombre} onChange={(v) => onChange('nombre', v)} tipo="text" />
          <Campo label="Cultivo" value={form.cultivo} onChange={(v) => onChange('cultivo', v)} tipo="text" />

          <hr />
          <p className="text-xs font-medium text-neutral-500 uppercase">Paquete tecnológico (insumos)</p>
          <Campo label="Costo total de insumos (semilla, fert., agroquímicos, US$)" value={form.costoTotalInsumos} onChange={(v) => onChange('costoTotalInsumos', v)} />
          <Campo label="Margen sobre insumos (ej. 0.30 = 30%)" value={form.margenInsumosPct} onChange={(v) => onChange('margenInsumosPct', v)} />

          <hr />
          <p className="text-xs font-medium text-neutral-500 uppercase">Anticipo en efectivo (opcional)</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.solicitaAnticipo}
              onChange={(e) => onChange('solicitaAnticipo', e.target.checked)}
            />
            El productor solicita anticipo en dinero
          </label>
          {form.solicitaAnticipo && (
            <>
              <Campo label="Monto del anticipo (US$)" value={form.montoAnticipo} onChange={(v) => onChange('montoAnticipo', v)} />
              <Campo label="Recargo administrativo sobre anticipo (ej. 0.05 = 5%)" value={form.recargoAnticipoPct} onChange={(v) => onChange('recargoAnticipoPct', v)} />
            </>
          )}

          <hr />
          <p className="text-xs font-medium text-neutral-500 uppercase">
            Referencia de cosecha (opcional — para ver si la cosecha cubre el cobro)
          </p>
          <Campo label="Área (ha)" value={form.areaHectareas} onChange={(v) => onChange('areaHectareas', v)} />
          <Campo label="Rendimiento esperado (qq/ha)" value={form.rendimientoEsperadoQqHa} onChange={(v) => onChange('rendimientoEsperadoQqHa', v)} />
          <Campo label="Precio de venta esperado ($/qq)" value={form.precioVentaQq} onChange={(v) => onChange('precioVentaQq', v)} />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button onClick={calcular} disabled={cargando} className="bg-neutral-900 text-white rounded px-4 py-2 text-sm disabled:opacity-50">
            {cargando ? 'Calculando...' : 'Calcular'}
          </button>
        </div>

        {/* --- RESULTADOS --- */}
        <div className="space-y-4">
          {!resultados && (
            <div className="bg-white border rounded-xl p-6 text-sm text-neutral-400">
              Completa el formulario y presiona "Calcular" para ver la estimación.
            </div>
          )}
          {resultados && (
            <>
              <ResultadoCard
                titulo="Monto total a desembolsar"
                valor={resultados.montoTotalADesembolsar}
                nota="Insumos + anticipo — lo que CAD entrega/gira en este ciclo."
              />
              <ResultadoCard
                titulo="Total a cobrar en liquidación"
                valor={resultados.totalACobrarEnLiquidacion}
                nota="Insumos con margen + anticipo con recargo."
              />
              <ResultadoCard
                titulo="Ganancia esperada de CAD"
                valor={resultados.gananciaEsperadaCAD}
                nota={`Margen sobre lo desembolsado: ${(resultados.margenSobreDesembolsoPct * 100).toFixed(1)}%`}
                destacado
              />
              <div className="grid grid-cols-2 gap-4">
                <MiniStat label="Ganancia por margen insumos" valor={`$${resultados.gananciaInsumos.toFixed(0)}`} />
                <MiniStat label="Ganancia por recargo anticipo" valor={`$${resultados.gananciaAnticipo.toFixed(0)}`} />
              </div>
              {resultados.coberturaCosechaPct != null && (
                <div className="bg-white border rounded-xl p-4">
                  <p className="text-xs text-neutral-500">Cobertura de la cosecha esperada sobre el cobro</p>
                  <p className="text-lg font-medium mt-1">
                    {(resultados.coberturaCosechaPct * 100).toFixed(0)}%
                    {resultados.coberturaCosechaPct < 1 && (
                      <span className="text-red-600 text-sm ml-2">⚠ la cosecha esperada no cubre el total a cobrar</span>
                    )}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Campo({
  label, value, onChange, tipo = 'number',
}: { label: string; value: string; onChange: (v: string) => void; tipo?: string }) {
  return (
    <div>
      <label className="block text-xs text-neutral-600 mb-1">{label}</label>
      <input
        type={tipo}
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded px-3 py-1.5 text-sm"
      />
    </div>
  );
}

function ResultadoCard({
  titulo, valor, nota, destacado = false,
}: { titulo: string; valor: number; nota: string; destacado?: boolean }) {
  return (
    <div className={`border rounded-xl p-5 ${destacado ? 'bg-neutral-900 text-white' : 'bg-white'}`}>
      <p className={`text-xs uppercase ${destacado ? 'text-neutral-300' : 'text-neutral-500'}`}>{titulo}</p>
      <p className="text-2xl font-semibold mt-1">${valor.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
      <p className="text-xs mt-1 text-neutral-400">{nota}</p>
    </div>
  );
}

function MiniStat({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-lg font-medium mt-1">{valor}</p>
    </div>
  );
}
