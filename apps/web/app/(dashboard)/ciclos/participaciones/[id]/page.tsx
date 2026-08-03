'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '../../../../../lib/api';
import EvolucionAreaChart from '../../../../../components/charts/EvolucionAreaChart';

const ETIQUETA_TIPO_VISITA: Record<string, string> = {
  PREPARACION_TIERRA: 'Preparación de tierra',
  SIEMBRA: 'Siembra',
  SEGUIMIENTO: 'Seguimiento del cultivo',
  COSECHA: 'Cosecha',
};

const ETIQUETA_FENOLOGICO: Record<string, string> = {
  PREPARACION_TIERRA: 'Preparación de tierra',
  SIEMBRA: 'Siembra',
  EMERGENCIA: 'Emergencia',
  V1: 'V1',
  V2: 'V2',
  V3: 'V3',
  V4: 'V4',
  V5: 'V5',
  V6_O_MAS: 'V6 o más',
  FLORACION: 'Floración',
  LLENADO_GRANO: 'Llenado de grano',
  MADURACION: 'Maduración',
  COSECHA: 'Cosecha',
};

const ETIQUETA_INCIDENCIA: Record<string, string> = {
  PLAGA: 'Plaga',
  ENFERMEDAD: 'Enfermedad',
  MALEZA: 'Maleza',
  DEFICIENCIA_NUTRICIONAL: 'Deficiencia nutricional',
  DANO_CLIMATICO: 'Daño climático',
};

const ETIQUETA_ESTADO_SOLICITUD: Record<string, string> = {
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

export default function ParticipacionPage() {
  return (
    <Suspense fallback={<p className="text-sm text-cad-apagado">Cargando...</p>}>
      <ParticipacionContenido />
    </Suspense>
  );
}

function ParticipacionContenido() {
  const params = useParams();
  const searchParams = useSearchParams();
  const participacionId = params.id as string;
  const loteFiltro = searchParams.get('lote');

  const [participacion, setParticipacion] = useState<any | null>(null);
  const [inspecciones, setInspecciones] = useState<any[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function recargar() {
    apiFetch(`/ciclos/participaciones/${participacionId}`).then(setParticipacion).catch((e) => setError(e.message));
    apiFetch(`/campo/participaciones/${participacionId}/inspecciones`).then(setInspecciones).catch(() => {});
  }

  useEffect(() => { recargar(); }, [participacionId]);

  if (error) return <p className="text-sm text-cad-danger">{error}</p>;
  if (!participacion) return <p className="text-sm text-cad-apagado">Cargando...</p>;

  const haSembradas = participacion.lotes.reduce((acc: number, l: any) => acc + Number(l.areaSembradaHa), 0);

  const loteActivo = loteFiltro ? participacion.lotes.find((l: any) => l.id === loteFiltro) : null;
  const inspeccionesFiltradas = loteFiltro
    ? inspecciones.filter((i: any) => i.loteId === loteFiltro)
    : inspecciones;
  const areaReferencia = loteActivo ? Number(loteActivo.areaSembradaHa) : haSembradas;

  const ultimaInspeccion = inspeccionesFiltradas[0] ?? null;

  return (
    <div>
      <Link href={`/ciclos/${participacion.ciclo.id}`} className="text-xs text-cad-naranja hover:underline">
        ← {participacion.ciclo.nombre}
      </Link>
      <div className="flex items-start justify-between mt-1 mb-1">
        <h1 className="text-2xl font-bold text-cad-navy">{participacion.productor.nombre}</h1>
        <button
          onClick={() => setMostrarModal(true)}
          className="bg-cad-naranja text-white text-sm font-medium rounded px-4 py-2 hover:brightness-95 transition"
        >
          + Registrar visita
        </button>
      </div>
      <p className="text-sm text-cad-apagado mb-4">
        {participacion.ciclo.cultivo} · {haSembradas.toFixed(2)} ha sembradas
        {participacion.solicitud && (
          <> · Financiamiento: <span className="font-medium">{ETIQUETA_ESTADO_SOLICITUD[participacion.solicitud.estado] ?? participacion.solicitud.estado}</span></>
        )}
      </p>

      {ultimaInspeccion && (
        <div className="inline-flex items-center gap-2 bg-white border border-cad-linea rounded-full px-4 py-2 mb-6">
          <span className="w-2 h-2 rounded-full bg-cad-verde" />
          <span className="text-sm">
            Estado actual: <span className="font-semibold text-cad-navy">
              {ultimaInspeccion.estadoFenologico
                ? ETIQUETA_FENOLOGICO[ultimaInspeccion.estadoFenologico]
                : ETIQUETA_TIPO_VISITA[ultimaInspeccion.tipoVisita]}
            </span>
          </span>
          <span className="text-xs text-cad-apagado">
            · desde la visita del {new Date(ultimaInspeccion.fecha).toLocaleDateString('es-VE')}
          </span>
        </div>
      )}

      {mostrarModal && (
        <NuevaInspeccionModal
          participacionId={participacionId}
          lotes={participacion.lotes}
          onClose={() => setMostrarModal(false)}
          onGuardado={() => { setMostrarModal(false); recargar(); }}
        />
      )}

      <p className="font-semibold text-cad-navy mb-3">Lotes</p>
      <div className="grid md:grid-cols-3 gap-3 mb-8">
        {participacion.lotes.map((l: any) => (
          <div key={l.id} className="bg-white border border-cad-linea rounded-xl p-4">
            <p className="font-medium text-sm">{l.parcela.nombreLote}</p>
            <p className="text-xs text-cad-apagado">{Number(l.areaSembradaHa).toFixed(2)} ha</p>
            {l.distanciaSurcosM && (
              <p className="text-xs text-cad-apagado mt-1">
                Surcos a {Number(l.distanciaSurcosM)} m · objetivo {l.densidadObjetivoPlantasPorM ? Number(l.densidadObjetivoPlantasPorM) : '—'} plantas/m
              </p>
            )}
          </div>
        ))}
        {participacion.lotes.length === 0 && (
          <p className="text-sm text-cad-apagado col-span-3">Sin lotes agregados a esta participación todavía.</p>
        )}
      </div>

      {participacion.lotes.length === 0 && inspecciones.length > 0 && (
        <div className="bg-cad-ambar/10 border border-cad-ambar/30 rounded-xl p-4 mb-8">
          <p className="text-sm text-cad-tinta">
            ⚠ Ya hay visitas registradas para este productor, pero <strong>no tiene ningún lote agregado</strong>.
            Por eso "ha sembradas" muestra 0 — ese número sale de los lotes, no de las visitas. Vuelve a
            {' '}<Link href={`/ciclos/${participacion.ciclo.id}`} className="underline font-medium">la página del ciclo</Link>{' '}
            y usa "+ Agregar lote" para vincular la parcela correspondiente.
          </p>
        </div>
      )}

      {inspeccionesFiltradas.length > 0 && (
        <div className="bg-white border border-cad-linea rounded-xl p-4 mb-8">
          <p className="font-semibold text-cad-navy mb-3">Evolución del área sembrada</p>
          <EvolucionAreaChart inspecciones={inspeccionesFiltradas} areaSembradaHa={areaReferencia} />
        </div>
      )}

      <p className="font-semibold text-cad-navy mb-3">
        Historial de visitas <span className="text-cad-apagado font-normal text-sm">— {inspeccionesFiltradas.length} registrada{inspeccionesFiltradas.length !== 1 ? 's' : ''}</span>
      </p>

      {loteActivo && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <span className="text-cad-apagado">Viendo solo:</span>
          <span className="font-medium text-cad-navy">{loteActivo.parcela.nombreLote}</span>
          <Link href={`/ciclos/participaciones/${participacionId}`} className="text-cad-naranja hover:underline text-xs">
            ver todos los lotes →
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {inspeccionesFiltradas.map((i: any) => (
          <div key={i.id} className="bg-white border border-cad-linea rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cad-info/10 text-cad-info font-medium">
                    {ETIQUETA_TIPO_VISITA[i.tipoVisita] ?? i.tipoVisita}
                  </span>
                  <p className="text-sm font-medium">
                    {new Date(i.fecha).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {i.lote && <span className="text-cad-apagado font-normal"> · {i.lote.parcela.nombreLote}</span>}
                  </p>
                </div>
                <p className="text-xs text-cad-apagado mt-0.5">{i.tecnico.nombre}{i.estadoFenologico ? ` · ${ETIQUETA_FENOLOGICO[i.estadoFenologico]}` : ''}</p>
              </div>
              <div className="text-right shrink-0">
                {i.porcentajeLogroPoblacion != null && (
                  <p className={`text-sm font-semibold ${Number(i.porcentajeLogroPoblacion) < 0.85 ? 'text-cad-danger' : 'text-cad-verde'}`}>
                    {(Number(i.porcentajeLogroPoblacion) * 100).toFixed(0)}% población
                  </p>
                )}
                {i.rendimientoProyectadoQqHa != null && (
                  <p className="text-xs text-cad-apagado">{Number(i.rendimientoProyectadoQqHa).toFixed(1)} qq/ha proy.</p>
                )}
              </div>
            </div>

            {i.tipoVisita === 'PREPARACION_TIERRA' && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  ['Arado', i.prepArado],
                  ['Rastra', i.prepRastra],
                  ['Nivelación', i.prepNivelacion],
                  ['Humedad adecuada', i.prepHumedadAdecuada],
                ].map(([label, val]: any) => val != null && (
                  <span key={label} className={`text-xs px-2 py-0.5 rounded-full ${val ? 'bg-cad-verde/15 text-cad-verde' : 'bg-cad-danger/10 text-cad-danger'}`}>
                    {val ? '✓' : '✗'} {label}
                  </span>
                ))}
              </div>
            )}

            {i.tipoVisita === 'SIEMBRA' && (i.metodoSiembra || i.profundidadSiembraCm) && (
              <p className="text-xs text-cad-apagado mt-2">
                {i.metodoSiembra && `Método: ${i.metodoSiembra}`}
                {i.metodoSiembra && i.profundidadSiembraCm && ' · '}
                {i.profundidadSiembraCm && `Profundidad: ${Number(i.profundidadSiembraCm)} cm`}
              </p>
            )}

            {i.observaciones && <p className="text-sm text-cad-tinta mt-2">{i.observaciones}</p>}

            {i.incidencias?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {i.incidencias.map((inc: any) => (
                  <span
                    key={inc.id}
                    className={`text-xs px-2 py-0.5 rounded-full ${inc.severidad >= 4 ? 'bg-cad-danger/10 text-cad-danger' : 'bg-cad-ambar/20 text-cad-ambar'}`}
                  >
                    {ETIQUETA_INCIDENCIA[inc.tipo]}: {inc.nombreComun} (sev. {inc.severidad}/5)
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {inspeccionesFiltradas.length === 0 && (
          <p className="text-sm text-cad-apagado">Sin visitas registradas todavía.</p>
        )}
      </div>
    </div>
  );
}

const TIPOS_VISITA = [
  { valor: 'PREPARACION_TIERRA', label: 'Preparación de tierra', icono: '🚜' },
  { valor: 'SIEMBRA', label: 'Siembra', icono: '🌱' },
  { valor: 'SEGUIMIENTO', label: 'Seguimiento del cultivo', icono: '🔍' },
  { valor: 'COSECHA', label: 'Cosecha', icono: '🌾' },
];

function NuevaInspeccionModal({
  participacionId, lotes, onClose, onGuardado,
}: { participacionId: string; lotes: any[]; onClose: () => void; onGuardado: () => void }) {
  const [tipoVisita, setTipoVisita] = useState('SEGUIMIENTO');
  const [form, setForm] = useState<any>({
    fecha: new Date().toISOString().slice(0, 10),
    loteId: lotes[0]?.id ?? '',
    prepArado: false,
    prepRastra: false,
    prepNivelacion: false,
    prepHumedadAdecuada: false,
    metodoSiembra: '',
    profundidadSiembraCm: '',
    areaEfectivaHa: '',
    plantasPorMetroLineal: '',
    estadoFenologico: '',
    usoAdecuadoInsumos: true,
    rendimientoProyectadoQqHa: '',
    observaciones: '',
  });
  const [incidencias, setIncidencias] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  function campo(nombre: string, valor: any) {
    setForm((f: any) => ({ ...f, [nombre]: valor }));
  }

  function agregarIncidencia() {
    setIncidencias((prev) => [...prev, {
      tipo: 'PLAGA', nombreComun: '', severidad: 2, porcentajeAfectado: '', accionRecomendada: '',
    }]);
  }

  function actualizarIncidencia(idx: number, campoNombre: string, valor: any) {
    setIncidencias((prev) => prev.map((inc, i) => (i === idx ? { ...inc, [campoNombre]: valor } : inc)));
  }

  function quitarIncidencia(idx: number) {
    setIncidencias((prev) => prev.filter((_, i) => i !== idx));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const body: any = {
        fecha: form.fecha,
        loteId: form.loteId || undefined,
        tipoVisita,
        observaciones: form.observaciones || undefined,
      };

      if (tipoVisita === 'PREPARACION_TIERRA') {
        body.prepArado = form.prepArado;
        body.prepRastra = form.prepRastra;
        body.prepNivelacion = form.prepNivelacion;
        body.prepHumedadAdecuada = form.prepHumedadAdecuada;
        body.estadoFenologico = 'PREPARACION_TIERRA';
      }

      if (tipoVisita === 'SIEMBRA') {
        body.metodoSiembra = form.metodoSiembra || undefined;
        body.profundidadSiembraCm = form.profundidadSiembraCm ? Number(form.profundidadSiembraCm) : undefined;
        body.estadoFenologico = 'SIEMBRA';
      }

      if (tipoVisita === 'SEGUIMIENTO' || tipoVisita === 'COSECHA') {
        body.areaEfectivaHa = form.areaEfectivaHa ? Number(form.areaEfectivaHa) : undefined;
        body.plantasPorMetroLineal = form.plantasPorMetroLineal ? Number(form.plantasPorMetroLineal) : undefined;
        body.estadoFenologico = tipoVisita === 'COSECHA' ? 'COSECHA' : (form.estadoFenologico || undefined);
        body.usoAdecuadoInsumos = form.usoAdecuadoInsumos;
        body.rendimientoProyectadoQqHa = form.rendimientoProyectadoQqHa ? Number(form.rendimientoProyectadoQqHa) : undefined;
        body.incidencias = incidencias.length > 0 ? incidencias.map((inc) => ({
          tipo: inc.tipo,
          nombreComun: inc.nombreComun,
          severidad: Number(inc.severidad),
          porcentajeAfectado: inc.porcentajeAfectado ? Number(inc.porcentajeAfectado) : undefined,
          accionRecomendada: inc.accionRecomendada || undefined,
        })) : undefined;
      }

      await apiFetch(`/campo/participaciones/${participacionId}/inspecciones`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      onGuardado();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-cad-navy/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl p-6 w-full max-w-xl my-8">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-cad-navy">Registrar visita de campo</p>
          <button onClick={onClose} className="text-cad-apagado hover:text-cad-tinta text-xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-5">
          {TIPOS_VISITA.map((t) => (
            <button
              key={t.valor}
              type="button"
              onClick={() => setTipoVisita(t.valor)}
              className={`text-center rounded-lg border p-2.5 transition ${
                tipoVisita === t.valor
                  ? 'border-cad-naranja bg-cad-naranja/10 text-cad-navy font-medium'
                  : 'border-cad-linea text-cad-apagado hover:bg-cad-superficie'
              }`}
            >
              <div className="text-xl mb-1">{t.icono}</div>
              <div className="text-[11px] leading-tight">{t.label}</div>
            </button>
          ))}
        </div>

        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-cad-apagado mb-1">Fecha</label>
              <input type="date" required value={form.fecha} onChange={(e) => campo('fecha', e.target.value)}
                className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-cad-apagado mb-1">Lote (opcional)</label>
              <select value={form.loteId} onChange={(e) => campo('loteId', e.target.value)}
                className="w-full border border-cad-linea rounded px-3 py-2 text-sm">
                <option value="">Toda la participación</option>
                {lotes.map((l) => <option key={l.id} value={l.id}>{l.parcela.nombreLote}</option>)}
              </select>
            </div>
          </div>

          {tipoVisita === 'PREPARACION_TIERRA' && (
            <div className="grid grid-cols-2 gap-2">
              {[
                ['prepArado', 'Arado realizado'],
                ['prepRastra', 'Rastra realizada'],
                ['prepNivelacion', 'Nivelación realizada'],
                ['prepHumedadAdecuada', 'Humedad del suelo adecuada'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm border border-cad-linea rounded-lg px-3 py-2">
                  <input type="checkbox" checked={form[key]} onChange={(e) => campo(key, e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          )}

          {tipoVisita === 'SIEMBRA' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-cad-apagado mb-1">Método de siembra</label>
                <select value={form.metodoSiembra} onChange={(e) => campo('metodoSiembra', e.target.value)}
                  className="w-full border border-cad-linea rounded px-3 py-2 text-sm">
                  <option value="">Sin especificar</option>
                  <option value="Mecanizada">Mecanizada</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-cad-apagado mb-1">Profundidad (cm)</label>
                <input type="number" step="any" value={form.profundidadSiembraCm} onChange={(e) => campo('profundidadSiembraCm', e.target.value)}
                  className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
              </div>
            </div>
          )}

          {(tipoVisita === 'SEGUIMIENTO' || tipoVisita === 'COSECHA') && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-cad-apagado mb-1">Área efectiva (ha)</label>
                  <input type="number" step="any" value={form.areaEfectivaHa} onChange={(e) => campo('areaEfectivaHa', e.target.value)}
                    placeholder="ha realmente en pie"
                    className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-cad-apagado mb-1">Plantas por metro lineal</label>
                  <input type="number" step="any" value={form.plantasPorMetroLineal} onChange={(e) => campo('plantasPorMetroLineal', e.target.value)}
                    placeholder="conteo real en campo"
                    className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {tipoVisita === 'SEGUIMIENTO' && (
                  <div>
                    <label className="block text-xs text-cad-apagado mb-1">Estado del cultivo</label>
                    <select value={form.estadoFenologico} onChange={(e) => campo('estadoFenologico', e.target.value)}
                      className="w-full border border-cad-linea rounded px-3 py-2 text-sm">
                      <option value="">Sin especificar</option>
                      {['EMERGENCIA', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6_O_MAS', 'FLORACION', 'LLENADO_GRANO', 'MADURACION'].map((v) => (
                        <option key={v} value={v}>{ETIQUETA_FENOLOGICO[v]}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className={tipoVisita === 'COSECHA' ? 'col-span-2' : ''}>
                  <label className="block text-xs text-cad-apagado mb-1">Rendimiento proyectado (qq/ha)</label>
                  <input type="number" step="any" value={form.rendimientoProyectadoQqHa} onChange={(e) => campo('rendimientoProyectadoQqHa', e.target.value)}
                    className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.usoAdecuadoInsumos} onChange={(e) => campo('usoAdecuadoInsumos', e.target.checked)} />
                El productor está usando los insumos adecuadamente
              </label>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-cad-apagado uppercase">Incidencias (plagas, enfermedades...)</p>
                  <button type="button" onClick={agregarIncidencia} className="text-xs text-cad-naranja hover:underline">+ Agregar</button>
                </div>
                {incidencias.map((inc, idx) => (
                  <div key={idx} className="border border-cad-linea rounded-lg p-3 mb-2">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <select value={inc.tipo} onChange={(e) => actualizarIncidencia(idx, 'tipo', e.target.value)}
                        className="border border-cad-linea rounded px-2 py-1.5 text-xs">
                        {Object.entries(ETIQUETA_INCIDENCIA).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <input placeholder="Nombre (ej. Mosca blanca)" value={inc.nombreComun}
                        onChange={(e) => actualizarIncidencia(idx, 'nombreComun', e.target.value)}
                        className="border border-cad-linea rounded px-2 py-1.5 text-xs" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-cad-apagado">Severidad (1-5)</label>
                        <input type="number" min={1} max={5} value={inc.severidad}
                          onChange={(e) => actualizarIncidencia(idx, 'severidad', e.target.value)}
                          className="w-full border border-cad-linea rounded px-2 py-1 text-xs" />
                      </div>
                      <div className="col-span-2 flex items-end gap-2">
                        <input placeholder="% afectado (opcional)" type="number" value={inc.porcentajeAfectado}
                          onChange={(e) => actualizarIncidencia(idx, 'porcentajeAfectado', e.target.value)}
                          className="flex-1 border border-cad-linea rounded px-2 py-1 text-xs" />
                        <button type="button" onClick={() => quitarIncidencia(idx)} className="text-xs text-cad-danger">Quitar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div>
            <label className="block text-xs text-cad-apagado mb-1">Observaciones</label>
            <textarea value={form.observaciones} onChange={(e) => campo('observaciones', e.target.value)}
              rows={2} className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
          </div>

          {error && <p className="text-sm text-cad-danger">{error}</p>}

          <button type="submit" disabled={cargando}
            className="w-full bg-cad-naranja text-white font-medium rounded py-2.5 text-sm hover:brightness-95 transition disabled:opacity-50">
            {cargando ? 'Guardando...' : 'Registrar visita'}
          </button>
        </form>
      </div>
    </div>
  );
}
