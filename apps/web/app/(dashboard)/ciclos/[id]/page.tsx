'use client';

import { useEffect, useState, Fragment } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '../../../../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const ETIQUETA_ESTADO_CULTIVO: Record<string, string> = {
  PREPARACION_TIERRA: 'Prep. de tierra',
  SIEMBRA: 'Sembrado',
  EMERGENCIA: 'Emergencia',
  V1: 'V1', V2: 'V2', V3: 'V3', V4: 'V4', V5: 'V5', V6_O_MAS: 'V6+',
  FLORACION: 'Floración',
  LLENADO_GRANO: 'Llenado de grano',
  MADURACION: 'Maduración',
  COSECHA: 'Cosecha',
};

const ETIQUETA_TIPO_VISITA: Record<string, string> = {
  PREPARACION_TIERRA: 'Prep. de tierra',
  SIEMBRA: 'Siembra',
  SEGUIMIENTO: 'Seguimiento',
  COSECHA: 'Cosecha',
};

const COLOR_SEMAFORO: Record<string, string> = {
  VERDE: '#008747',
  AMBAR: '#F8B345',
  ROJO: '#B23A3A',
  SIN_VISITA: '#999999',
};

export default function CicloDetallePage() {
  const params = useParams();
  const cicloId = params.id as string;

  const [resumen, setResumen] = useState<any | null>(null);
  const [fito, setFito] = useState<any | null>(null);
  const [efectivo, setEfectivo] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mostrarInscripcion, setMostrarInscripcion] = useState(false);
  const [participacionParaLote, setParticipacionParaLote] = useState<string | null>(null);
  const [filaAbierta, setFilaAbierta] = useState<string | null>(null);

  function recargar() {
    apiFetch(`/ciclos/${cicloId}/resumen`).then(setResumen).catch((e) => setError(e.message));
    apiFetch(`/campo/ciclos/${cicloId}/fitosanitario`).then(setFito).catch(() => {});
    apiFetch(`/cuentas/ciclos/${cicloId}/proyeccion-efectivo`).then(setEfectivo).catch(() => {});
  }

  useEffect(() => { recargar(); }, [cicloId]);

  if (error) return <p className="text-sm text-cad-danger">{error}</p>;
  if (!resumen) return <p className="text-sm text-cad-apagado">Cargando...</p>;

  const { ciclo, metas, real, avance, financiero } = resumen;

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-cad-navy">{ciclo.nombre}</h1>
        <button
          onClick={() => setMostrarInscripcion(true)}
          className="bg-cad-naranja text-white text-sm font-medium rounded px-4 py-2 hover:brightness-95 transition"
        >
          + Inscribir productor
        </button>
      </div>
      <p className="text-sm text-cad-apagado mb-6">
        {ciclo.cultivo} · inicio {new Date(ciclo.fechaInicio).toLocaleDateString('es-VE')} · {ciclo.estado}
      </p>

      {mostrarInscripcion && (
        <InscripcionModal
          cicloId={cicloId}
          onClose={() => setMostrarInscripcion(false)}
          onCreado={() => { setMostrarInscripcion(false); recargar(); }}
        />
      )}

      {participacionParaLote && (
        <LoteModal
          cicloProductorId={participacionParaLote}
          productorId={resumen.detalleProductores.find((p: any) => p.cicloProductorId === participacionParaLote)?.productorId}
          onClose={() => setParticipacionParaLote(null)}
          onCreado={() => { setParticipacionParaLote(null); recargar(); }}
        />
      )}

      {/* Avance de la campaña */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Barra titulo="Productores inscritos" actual={real.productoresInscritos} meta={metas.productores} pct={avance.productoresPct} unidad="" />
        <Barra titulo="Hectáreas sembradas (según KML)" actual={real.hectareasSembradas} meta={metas.hectareas} pct={avance.hectareasPct} unidad=" ha" />
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Stat label="Ha comprometidas" valor={`${real.hectareasComprometidas.toFixed(1)} ha`} />
        <Stat label="Ha efectivas en pie" valor={`${real.hectareasEfectivas.toFixed(1)} ha`} />
        <Stat label="Financiado" valor={`$${financiero.financiadoTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />
        <Stat label="Desembolsado" valor={`$${financiero.desembolsadoTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          nota={`Pendiente: $${financiero.pendientePorDesembolsar.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />
      </div>

      {efectivo && (
        <div className="bg-cad-navy text-white rounded-xl p-6 mb-8">
          <p className="text-xs uppercase text-white/60">Efectivo necesario para pagar productores en cosecha</p>
          <p className="text-3xl font-bold mt-1">
            ${efectivo.efectivoNecesarioParaPagos.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-white/60 mt-2">
            Proyección a ${efectivo.precioQqUtilizado}/qq sobre {efectivo.produccionTotalProyectadaQq.toFixed(0)} qq estimados.
            {efectivo.participacionesSinProyeccion > 0 && (
              <span className="text-cad-ambar"> ⚠ {efectivo.participacionesSinProyeccion} productor(es) sin visita de proyección.</span>
            )}
          </p>
        </div>
      )}

      {fito && fito.totalIncidencias > 0 && (
        <div className="bg-white border border-cad-linea rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-cad-navy">Situación fitosanitaria</p>
            {fito.criticas > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-cad-danger/10 text-cad-danger text-xs">{fito.criticas} crítica(s)</span>
            )}
          </div>
          <div className="space-y-2">
            {fito.detalle.slice(0, 5).map((i: any) => (
              <div key={i.id} className="flex items-center justify-between text-sm border-b border-cad-linea pb-2 last:border-0">
                <div>
                  <span className="font-medium">{i.nombreComun}</span>
                  <span className="text-cad-apagado"> · {i.productor}{i.lote ? ` · ${i.lote}` : ''}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${i.severidad >= 4 ? 'bg-cad-danger/10 text-cad-danger' : 'bg-cad-ambar/20 text-cad-ambar'}`}>
                  Severidad {i.severidad}/5
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="font-semibold text-cad-navy mb-3">Desviación: planeado vs. real</p>
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-cad-linea rounded-xl p-4">
          <p className="text-xs text-cad-apagado mb-2">Hectáreas — comprometidas → sembradas → efectivas en pie</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={[
                { etapa: 'Comprometidas', ha: real.hectareasComprometidas },
                { etapa: 'Sembradas', ha: real.hectareasSembradas },
                { etapa: 'Efectivas', ha: real.hectareasEfectivas },
              ]}
              margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7E8" />
              <XAxis dataKey="etapa" tick={{ fontSize: 11, fill: '#666666' }} />
              <YAxis tick={{ fontSize: 11, fill: '#666666' }} width={40} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)} ha`, '']} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#E5E7E8' }} />
              <Bar dataKey="ha" radius={[4, 4, 0, 0]}>
                <Cell fill="#012D37" />
                <Cell fill="#2E6B8C" />
                <Cell fill={real.hectareasEfectivas < real.hectareasSembradas ? '#B23A3A' : '#008747'} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-cad-linea rounded-xl p-4">
          <p className="text-xs text-cad-apagado mb-2">Producción — proyectada vs. real (qq)</p>
          {resumen.produccionRealQq != null ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={[
                  { etapa: 'Proyectada', qq: resumen.produccionProyectadaQq },
                  { etapa: 'Real (liquidada)', qq: resumen.produccionRealQq },
                ]}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7E8" />
                <XAxis dataKey="etapa" tick={{ fontSize: 11, fill: '#666666' }} />
                <YAxis tick={{ fontSize: 11, fill: '#666666' }} width={40} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(0)} qq`, '']} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#E5E7E8' }} />
                <Bar dataKey="qq" radius={[4, 4, 0, 0]}>
                  <Cell fill="#F8B345" />
                  <Cell fill={resumen.produccionRealQq < resumen.produccionProyectadaQq ? '#B23A3A' : '#008747'} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center">
              <p className="text-sm text-cad-apagado text-center">
                Sin cosechas liquidadas todavía.<br />
                <span className="text-xs">Se compara aquí en cuanto se liquide la primera solicitud de este ciclo.</span>
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="font-semibold text-cad-navy mb-3">Productores del ciclo</p>
      <div className="bg-white border border-cad-linea rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cad-superficie text-left text-cad-apagado">
            <tr>
              <th className="p-3"></th>
              <th className="p-3 font-medium">Productor</th>
              <th className="p-3 font-medium">Estado</th>
              <th className="p-3 font-medium">Lotes</th>
              <th className="p-3 font-medium">Ha sembradas</th>
              <th className="p-3 font-medium">Ha efectivas</th>
              <th className="p-3 font-medium">Desembolsado</th>
              <th className="p-3 font-medium">Proyección</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {resumen.detalleProductores.map((p: any) => (
              <Fragment key={p.cicloProductorId}>
                <tr className="border-t border-cad-linea">
                  <td className="p-3 pl-4">
                    {p.cantidadLotes > 0 && (
                      <button
                        onClick={() => setFilaAbierta(filaAbierta === p.cicloProductorId ? null : p.cicloProductorId)}
                        className="text-cad-apagado hover:text-cad-navy w-5 h-5 flex items-center justify-center"
                        title="Ver lotes"
                      >
                        {filaAbierta === p.cicloProductorId ? '▾' : '▸'}
                      </button>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLOR_SEMAFORO[p.semaforo] }} title={p.semaforo} />
                      <Link href={`/ciclos/participaciones/${p.cicloProductorId}`} className="font-medium text-cad-navy hover:text-cad-naranja hover:underline">
                        {p.productor}
                      </Link>
                    </div>
                  </td>
                <td className="p-3">
                  {p.estadoFenologico ? (
                    <span className="px-2 py-0.5 rounded-full bg-cad-verde/15 text-cad-verde text-xs">
                      {ETIQUETA_ESTADO_CULTIVO[p.estadoFenologico] ?? p.estadoFenologico}
                    </span>
                  ) : p.tipoUltimaVisita ? (
                    <span className="px-2 py-0.5 rounded-full bg-cad-info/10 text-cad-info text-xs">
                      {ETIQUETA_TIPO_VISITA[p.tipoUltimaVisita] ?? p.tipoUltimaVisita}
                    </span>
                  ) : (
                    <span className="text-xs text-cad-apagado">sin visita</span>
                  )}
                </td>
                <td className="p-3">{p.cantidadLotes}</td>
                <td className="p-3">{p.haSembradas.toFixed(2)}</td>
                <td className={`p-3 ${p.haEfectivas < p.haSembradas ? 'text-cad-danger' : ''}`}>{p.haEfectivas.toFixed(2)}</td>
                <td className="p-3">${p.desembolsado.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                <td className="p-3">
                  {p.rendimientoProyectadoQqHa != null ? `${p.produccionProyectadaQq.toFixed(0)} qq` : <span className="text-cad-ambar text-xs">sin visita</span>}
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => setParticipacionParaLote(p.cicloProductorId)} className="text-xs text-cad-naranja hover:underline">
                    + Agregar lote
                  </button>
                </td>
              </tr>
              {filaAbierta === p.cicloProductorId && p.lotesDetalle.length > 0 && (
                <tr className="bg-cad-superficie/60">
                  <td></td>
                  <td colSpan={8} className="px-3 pb-3">
                    <div className="grid sm:grid-cols-3 gap-2 pt-1">
                      {p.lotesDetalle.map((l: any) => (
                        <Link
                          key={l.loteSiembraId}
                          href={`/ciclos/participaciones/${p.cicloProductorId}?lote=${l.loteSiembraId}`}
                          className="bg-white border border-cad-linea rounded-lg p-2.5 text-xs hover:border-cad-naranja transition-colors"
                        >
                          <p className="font-medium text-cad-navy">{l.nombreLote}</p>
                          <p className="text-cad-apagado">{l.areaSembradaHa.toFixed(2)} ha · ver avance →</p>
                        </Link>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
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

function InscripcionModal({ cicloId, onClose, onCreado }: any) {
  const [productores, setProductores] = useState<any[]>([]);
  const [productorId, setProductorId] = useState('');
  const [hectareas, setHectareas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => { apiFetch('/productores').then(setProductores).catch(() => {}); }, []);

  async function inscribir(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await apiFetch(`/ciclos/${cicloId}/productores`, {
        method: 'POST',
        body: JSON.stringify({ productorId, hectareasComprometidas: Number(hectareas) }),
      });
      onCreado();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <Modal onClose={onClose} titulo="Inscribir productor">
      <form onSubmit={inscribir} className="space-y-4">
        <div>
          <label className="block text-xs text-cad-apagado mb-1">Productor</label>
          <select required value={productorId} onChange={(e) => setProductorId(e.target.value)}
            className="w-full border border-cad-linea rounded px-3 py-2 text-sm">
            <option value="">Selecciona...</option>
            {productores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          {productores.length === 0 && (
            <p className="text-xs text-cad-apagado mt-1">
              No hay productores registrados. Créalos primero en la sección Productores.
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs text-cad-apagado mb-1">Hectáreas comprometidas</label>
          <input required type="number" step="any" value={hectareas} onChange={(e) => setHectareas(e.target.value)}
            className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
        </div>
        {error && <p className="text-sm text-cad-danger">{error}</p>}
        <button type="submit" disabled={cargando}
          className="w-full bg-cad-naranja text-white font-medium rounded py-2 text-sm hover:brightness-95 transition disabled:opacity-50">
          {cargando ? 'Inscribiendo...' : 'Inscribir'}
        </button>
      </form>
    </Modal>
  );
}

function LoteModal({ cicloProductorId, productorId, onClose, onCreado }: any) {
  const [fincas, setFincas] = useState<any[]>([]);
  const [parcelaId, setParcelaId] = useState('');
  const [distancia, setDistancia] = useState('0.45');
  const [densidad, setDensidad] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (productorId) apiFetch(`/productores/${productorId}/fincas`).then(setFincas).catch(() => {});
  }, [productorId]);

  const parcelas = fincas.flatMap((f) => f.lotes.map((l: any) => ({ ...l, finca: f.nombre })));

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await apiFetch(`/ciclos/participaciones/${cicloProductorId}/lotes`, {
        method: 'POST',
        body: JSON.stringify({
          parcelaId,
          distanciaSurcosM: distancia ? Number(distancia) : undefined,
          densidadObjetivoPlantasPorM: densidad ? Number(densidad) : undefined,
        }),
      });
      onCreado();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <Modal onClose={onClose} titulo="Agregar lote de siembra">
      <form onSubmit={agregar} className="space-y-4">
        <div>
          <label className="block text-xs text-cad-apagado mb-1">Parcela (importada del KML de SIMA)</label>
          <select required value={parcelaId} onChange={(e) => setParcelaId(e.target.value)}
            className="w-full border border-cad-linea rounded px-3 py-2 text-sm">
            <option value="">Selecciona...</option>
            {parcelas.map((p) => (
              <option key={p.id} value={p.id}>{p.finca} · {p.nombreLote} ({Number(p.areaCalculadaHa).toFixed(2)} ha)</option>
            ))}
          </select>
          {fincas.length === 0 && (
            <p className="text-xs text-cad-apagado mt-1">
              Este productor no tiene parcelas importadas. Impórtalas primero en Mapa de Parcelas.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-cad-apagado mb-1">Distancia entre surcos (m)</label>
            <input type="number" step="any" value={distancia} onChange={(e) => setDistancia(e.target.value)}
              className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-cad-apagado mb-1">Densidad objetivo (plantas/m)</label>
            <input type="number" step="any" value={densidad} onChange={(e) => setDensidad(e.target.value)}
              className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
          </div>
        </div>
        {error && <p className="text-sm text-cad-danger">{error}</p>}
        <button type="submit" disabled={cargando}
          className="w-full bg-cad-naranja text-white font-medium rounded py-2 text-sm hover:brightness-95 transition disabled:opacity-50">
          {cargando ? 'Agregando...' : 'Agregar lote'}
        </button>
      </form>
    </Modal>
  );
}

function Modal({ titulo, children, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-cad-navy/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-cad-navy">{titulo}</p>
          <button onClick={onClose} className="text-cad-apagado hover:text-cad-tinta text-xl leading-none">×</button>
        </div>
        {children}
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
        <span className="font-medium">{typeof actual === 'number' ? actual.toFixed(unidad ? 1 : 0) : actual}{unidad} / {meta}{unidad}</span>
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
