'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '../../../../lib/api';

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

const ETIQUETA_CATEGORIA: Record<string, string> = {
  SEMILLA: 'Semilla', FERTILIZANTE: 'Fertilizante', AGROQUIMICO: 'Agroquímico', MECANIZACION: 'Mecanización', OTRO: 'Otro',
};

export default function SolicitudDetallePage() {
  const params = useParams();
  const solicitudId = params.id as string;

  const [solicitud, setSolicitud] = useState<any | null>(null);
  const [ventas, setVentas] = useState<any[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  function recargar() {
    apiFetch(`/solicitudes/${solicitudId}`).then(setSolicitud).catch((e) => setError(e.message));
    apiFetch(`/insumos/ventas/solicitud/${solicitudId}`).then(setVentas).catch(() => {});
    apiFetch('/insumos').then(setInsumos).catch(() => {});
  }

  useEffect(() => { recargar(); }, [solicitudId]);

  if (error) return <p className="text-sm text-cad-danger">{error}</p>;
  if (!solicitud) return <p className="text-sm text-cad-apagado">Cargando...</p>;

  const totalRetirado = ventas.reduce((acc, v) => acc + Number(v.totalConMargen), 0);
  const totalCostoBase = ventas.reduce((acc, v) => acc + Number(v.subtotalCosto), 0);

  return (
    <div>
      <Link href="/solicitudes" className="text-xs text-cad-naranja hover:underline">← Financiamientos</Link>
      <div className="flex items-start justify-between mt-1 mb-1">
        <h1 className="text-2xl font-bold text-cad-navy">{solicitud.cicloProductor.productor.nombre}</h1>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-cad-info/10 text-cad-info">
          {ETIQUETA_ESTADO[solicitud.estado]}
        </span>
      </div>
      <p className="text-sm text-cad-apagado mb-6">
        {solicitud.cicloProductor.ciclo.nombre} · {solicitud.cicloProductor.ciclo.cultivo}
      </p>

      {/* Resumen de cuenta */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Stat label="Facturado (costo base)" valor={`$${totalCostoBase.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />
        <Stat label="Cuenta por cobrar (con margen)" valor={`$${totalRetirado.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} destacado />
        <Stat label="Margen de este expediente" valor={`${(Number(solicitud.margenInsumosPct) * 100).toFixed(0)}%`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Columna izquierda: flujo del expediente */}
        <div className="space-y-6">
          <PaqueteSeccion solicitud={solicitud} onCambio={recargar} />
          <AprobacionSeccion solicitud={solicitud} onCambio={recargar} />
          <ContratoSeccion solicitud={solicitud} onCambio={recargar} />
          {solicitud.solicitaAnticipo && <AnticipoSeccion solicitud={solicitud} onCambio={recargar} />}
          <LiquidacionSeccion solicitud={solicitud} onCambio={recargar} />
        </div>

        {/* Columna derecha: facturas de venta contra inventario */}
        <div>
          <VentasSeccion solicitud={solicitud} insumos={insumos} ventas={ventas} onCambio={recargar} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, valor, destacado }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <div className={`border border-cad-linea rounded-xl p-4 ${destacado ? 'bg-cad-navy text-white' : 'bg-white'}`}>
      <p className={`text-xs ${destacado ? 'text-white/60' : 'text-cad-apagado'}`}>{label}</p>
      <p className="text-xl font-semibold mt-1">{valor}</p>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-cad-linea rounded-xl p-4">
      <p className="font-semibold text-cad-navy mb-3">{titulo}</p>
      {children}
    </div>
  );
}

// ============================================================
// PASO 2 — Paquete tecnológico (el plan/presupuesto aprobado)
// ============================================================
function PaqueteSeccion({ solicitud, onCambio }: { solicitud: any; onCambio: () => void }) {
  const editable = ['SOLICITUD_RECIBIDA', 'PAQUETE_DEFINIDO'].includes(solicitud.estado);
  const [items, setItems] = useState<any[]>(
    solicitud.itemsPaquete.length > 0
      ? solicitud.itemsPaquete.map((i: any) => ({ ...i, cantidad: Number(i.cantidad), costoUnitario: Number(i.costoUnitario) }))
      : [],
  );
  const [margenPct, setMargenPct] = useState(String(Number(solicitud.margenInsumosPct) * 100));
  const [solicitaAnticipo, setSolicitaAnticipo] = useState(solicitud.solicitaAnticipo);
  const [montoAnticipo, setMontoAnticipo] = useState(solicitud.montoAnticipoSolicitado ? String(Number(solicitud.montoAnticipoSolicitado)) : '');
  const [recargoPct, setRecargoPct] = useState(String(Number(solicitud.recargoAnticipoPct) * 100));
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  function agregarItem() {
    setItems((p) => [...p, { categoria: 'SEMILLA', nombreInsumo: '', unidad: '', cantidad: 0, costoUnitario: 0, etapaAplicacion: '' }]);
  }
  function actualizarItem(idx: number, campo: string, valor: any) {
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  }
  function quitarItem(idx: number) {
    setItems((p) => p.filter((_, i) => i !== idx));
  }

  const totalPresupuesto = items.reduce((acc, i) => acc + Number(i.cantidad) * Number(i.costoUnitario), 0);

  async function guardar() {
    setError(null);
    setCargando(true);
    try {
      await apiFetch(`/solicitudes/${solicitud.id}/paquete`, {
        method: 'POST',
        body: JSON.stringify({
          items: items.map((i) => ({
            categoria: i.categoria, nombreInsumo: i.nombreInsumo, unidad: i.unidad,
            cantidad: Number(i.cantidad), costoUnitario: Number(i.costoUnitario),
            etapaAplicacion: i.etapaAplicacion || undefined,
          })),
          margenInsumosPct: Number(margenPct) / 100,
          solicitaAnticipo,
          montoAnticipoSolicitado: solicitaAnticipo ? Number(montoAnticipo) : undefined,
          recargoAnticipoPct: Number(recargoPct) / 100,
        }),
      });
      onCambio();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <Seccion titulo="Paso 2 — Paquete tecnológico (presupuesto)">
      {editable ? (
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="border border-cad-linea rounded-lg p-3">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <select value={it.categoria} onChange={(e) => actualizarItem(idx, 'categoria', e.target.value)} className="border border-cad-linea rounded px-2 py-1.5 text-xs">
                  {Object.entries(ETIQUETA_CATEGORIA).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <input placeholder="Insumo (ej. Urea 46%)" value={it.nombreInsumo} onChange={(e) => actualizarItem(idx, 'nombreInsumo', e.target.value)} className="border border-cad-linea rounded px-2 py-1.5 text-xs" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <input placeholder="Unidad" value={it.unidad} onChange={(e) => actualizarItem(idx, 'unidad', e.target.value)} className="border border-cad-linea rounded px-2 py-1 text-xs" />
                <input type="number" placeholder="Cantidad" value={it.cantidad} onChange={(e) => actualizarItem(idx, 'cantidad', e.target.value)} className="border border-cad-linea rounded px-2 py-1 text-xs" />
                <input type="number" placeholder="Costo unit." value={it.costoUnitario} onChange={(e) => actualizarItem(idx, 'costoUnitario', e.target.value)} className="border border-cad-linea rounded px-2 py-1 text-xs" />
                <button onClick={() => quitarItem(idx)} className="text-xs text-cad-danger">Quitar</button>
              </div>
            </div>
          ))}
          <button onClick={agregarItem} className="text-xs text-cad-naranja hover:underline">+ Agregar insumo</button>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-cad-linea">
            <div>
              <label className="block text-xs text-cad-apagado mb-1">Margen sobre insumos (%)</label>
              <input type="number" value={margenPct} onChange={(e) => setMargenPct(e.target.value)} className="w-full border border-cad-linea rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <p className="text-xs text-cad-apagado mb-1">Total presupuestado</p>
              <p className="text-sm font-semibold pt-1.5">${totalPresupuesto.toLocaleString('en-US')}</p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={solicitaAnticipo} onChange={(e) => setSolicitaAnticipo(e.target.checked)} />
            El productor también solicita anticipo en efectivo
          </label>
          {solicitaAnticipo && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-cad-apagado mb-1">Monto anticipo solicitado ($)</label>
                <input type="number" value={montoAnticipo} onChange={(e) => setMontoAnticipo(e.target.value)} className="w-full border border-cad-linea rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-cad-apagado mb-1">Recargo sobre anticipo (%)</label>
                <input type="number" value={recargoPct} onChange={(e) => setRecargoPct(e.target.value)} className="w-full border border-cad-linea rounded px-2 py-1.5 text-sm" />
              </div>
            </div>
          )}

          {error && <p className="text-xs text-cad-danger">{error}</p>}
          <button onClick={guardar} disabled={cargando || items.length === 0}
            className="w-full bg-cad-naranja text-white font-medium rounded py-2 text-sm hover:brightness-95 disabled:opacity-50">
            {cargando ? 'Guardando...' : 'Guardar paquete y avanzar'}
          </button>
        </div>
      ) : (
        <div>
          <table className="w-full text-xs mb-2">
            <thead className="text-left text-cad-apagado"><tr><th>Insumo</th><th>Cant.</th><th>Costo unit.</th><th>Etapa</th></tr></thead>
            <tbody>
              {solicitud.itemsPaquete.map((i: any) => (
                <tr key={i.id} className="border-t border-cad-linea">
                  <td className="py-1">{i.nombreInsumo}</td>
                  <td className="py-1">{Number(i.cantidad)} {i.unidad}</td>
                  <td className="py-1">${Number(i.costoUnitario).toFixed(2)}</td>
                  <td className="py-1">{i.etapaAplicacion ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-cad-apagado">Margen: {(Number(solicitud.margenInsumosPct) * 100).toFixed(0)}% · Ya aprobado, no editable.</p>
        </div>
      )}
    </Seccion>
  );
}

// ============================================================
// PASO 3 — Aprobación / rechazo
// ============================================================
function AprobacionSeccion({ solicitud, onCambio }: { solicitud: any; onCambio: () => void }) {
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [mostrarRechazo, setMostrarRechazo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  if (solicitud.estado !== 'PAQUETE_DEFINIDO') {
    if (['APROBADA', 'CONTRATO_FIRMADO', 'DESPACHADA', 'EN_SEGUIMIENTO', 'COSECHADA', 'LIQUIDADA'].includes(solicitud.estado)) {
      return <Seccion titulo="Paso 3 — Aprobación"><p className="text-sm text-cad-verde">✓ Aprobada{solicitud.fechaAprobacion ? ` el ${new Date(solicitud.fechaAprobacion).toLocaleDateString('es-VE')}` : ''}.</p></Seccion>;
    }
    if (solicitud.estado === 'RECHAZADA') {
      return <Seccion titulo="Paso 3 — Aprobación"><p className="text-sm text-cad-danger">Rechazada: {solicitud.motivoRechazo}</p></Seccion>;
    }
    return null;
  }

  async function aprobar() {
    setError(null); setCargando(true);
    try {
      await apiFetch(`/solicitudes/${solicitud.id}/aprobar`, { method: 'POST', body: JSON.stringify({}) });
      onCambio();
    } catch (e: any) { setError(e.message); } finally { setCargando(false); }
  }

  async function rechazar() {
    setError(null); setCargando(true);
    try {
      await apiFetch(`/solicitudes/${solicitud.id}/rechazar`, { method: 'POST', body: JSON.stringify({ motivoRechazo }) });
      onCambio();
    } catch (e: any) { setError(e.message); } finally { setCargando(false); }
  }

  return (
    <Seccion titulo="Paso 3 — Aprobación">
      {mostrarRechazo ? (
        <div className="space-y-2">
          <textarea placeholder="Motivo del rechazo" value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} rows={2} className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button onClick={rechazar} disabled={cargando || !motivoRechazo} className="text-xs bg-cad-danger text-white rounded px-3 py-1.5 disabled:opacity-50">Confirmar rechazo</button>
            <button onClick={() => setMostrarRechazo(false)} className="text-xs text-cad-apagado">Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={aprobar} disabled={cargando} className="text-sm bg-cad-naranja text-white font-medium rounded px-4 py-2 hover:brightness-95 disabled:opacity-50">
            {cargando ? 'Procesando...' : 'Aprobar expediente'}
          </button>
          <button onClick={() => setMostrarRechazo(true)} className="text-sm text-cad-danger px-4 py-2">Rechazar</button>
        </div>
      )}
      {error && <p className="text-xs text-cad-danger mt-2">{error}</p>}
    </Seccion>
  );
}

// ============================================================
// PASO 3b — Contrato
// ============================================================
function ContratoSeccion({ solicitud, onCambio }: { solicitud: any; onCambio: () => void }) {
  const [numeroContrato, setNumeroContrato] = useState('');
  const [fechaFirma, setFechaFirma] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  if (solicitud.contrato) {
    return (
      <Seccion titulo="Contrato">
        <p className="text-sm">✓ Contrato <strong>{solicitud.contrato.numeroContrato}</strong> firmado el {new Date(solicitud.contrato.fechaFirma).toLocaleDateString('es-VE')}.</p>
      </Seccion>
    );
  }
  if (solicitud.estado !== 'APROBADA') return null;

  async function crear() {
    setError(null); setCargando(true);
    try {
      await apiFetch(`/solicitudes/${solicitud.id}/contrato`, {
        method: 'POST',
        body: JSON.stringify({ tipo: 'FINANCIAMIENTO_INSUMOS', numeroContrato, fechaFirma }),
      });
      onCambio();
    } catch (e: any) { setError(e.message); } finally { setCargando(false); }
  }

  return (
    <Seccion titulo="Contrato">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-cad-apagado mb-1">N° de contrato</label>
          <input value={numeroContrato} onChange={(e) => setNumeroContrato(e.target.value)} className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-cad-apagado mb-1">Fecha de firma</label>
          <input type="date" value={fechaFirma} onChange={(e) => setFechaFirma(e.target.value)} className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
        </div>
      </div>
      {error && <p className="text-xs text-cad-danger mb-2">{error}</p>}
      <button onClick={crear} disabled={cargando || !numeroContrato} className="text-sm bg-cad-naranja text-white font-medium rounded px-4 py-2 hover:brightness-95 disabled:opacity-50">
        {cargando ? 'Guardando...' : 'Registrar contrato firmado'}
      </button>
    </Seccion>
  );
}

// ============================================================
// Anticipo en efectivo (despacho tipo ANTICIPO_EFECTIVO)
// ============================================================
function AnticipoSeccion({ solicitud, onCambio }: { solicitud: any; onCambio: () => void }) {
  const [monto, setMonto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const yaGirado = solicitud.despachos.filter((d: any) => d.tipo === 'ANTICIPO_EFECTIVO')
    .reduce((acc: number, d: any) => acc + Number(d.valorDespachado), 0);
  const puedeGirar = ['CONTRATO_FIRMADO', 'DESPACHADA', 'EN_SEGUIMIENTO'].includes(solicitud.estado);

  async function girar(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setCargando(true);
    try {
      await apiFetch(`/solicitudes/${solicitud.id}/despachos`, {
        method: 'POST',
        body: JSON.stringify({ tipo: 'ANTICIPO_EFECTIVO', fecha: new Date().toISOString().slice(0, 10), montoEfectivo: Number(monto) }),
      });
      setMonto('');
      onCambio();
    } catch (e: any) { setError(e.message); } finally { setCargando(false); }
  }

  return (
    <Seccion titulo="Anticipo en efectivo">
      <p className="text-xs text-cad-apagado mb-2">
        Solicitado: ${Number(solicitud.montoAnticipoSolicitado ?? 0).toLocaleString('en-US')} · Girado hasta ahora: ${yaGirado.toLocaleString('en-US')}
      </p>
      {puedeGirar && (
        <form onSubmit={girar} className="flex gap-2">
          <input type="number" placeholder="Monto a girar ($)" value={monto} onChange={(e) => setMonto(e.target.value)} className="flex-1 border border-cad-linea rounded px-3 py-2 text-sm" />
          <button type="submit" disabled={cargando || !monto} className="text-sm bg-cad-naranja text-white font-medium rounded px-4 py-2 hover:brightness-95 disabled:opacity-50">Girar</button>
        </form>
      )}
      {error && <p className="text-xs text-cad-danger mt-2">{error}</p>}
    </Seccion>
  );
}

// ============================================================
// RETIROS DE INSUMOS — contra el inventario real, incremental
// ============================================================
function VentasSeccion({ solicitud, insumos, ventas, onCambio }: { solicitud: any; insumos: any[]; ventas: any[]; onCambio: () => void }) {
  const [lineas, setLineas] = useState<any[]>([{ insumoId: '', cantidad: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const puedeFacturar = ['CONTRATO_FIRMADO', 'DESPACHADA', 'EN_SEGUIMIENTO'].includes(solicitud.estado);

  function agregarLinea() {
    setLineas((p) => [...p, { insumoId: '', cantidad: '' }]);
  }
  function actualizarLinea(idx: number, campo: string, valor: string) {
    setLineas((p) => p.map((l, i) => (i === idx ? { ...l, [campo]: valor } : l)));
  }
  function quitarLinea(idx: number) {
    setLineas((p) => p.filter((_, i) => i !== idx));
  }

  const totalEstimado = lineas.reduce((acc, l) => {
    const insumo = insumos.find((i) => i.id === l.insumoId);
    if (!insumo || !l.cantidad) return acc;
    const costo = Number(l.cantidad) * Number(insumo.costoPromedioPonderado);
    return acc + costo * (1 + Number(solicitud.margenInsumosPct));
  }, 0);

  async function facturar(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setCargando(true);
    try {
      const items = lineas
        .filter((l) => l.insumoId && l.cantidad)
        .map((l) => ({ insumoId: l.insumoId, cantidad: Number(l.cantidad) }));
      if (items.length === 0) {
        setError('Agrega al menos una línea con insumo y cantidad.');
        setCargando(false);
        return;
      }
      await apiFetch('/insumos/ventas', {
        method: 'POST',
        body: JSON.stringify({ solicitudId: solicitud.id, fecha: new Date().toISOString().slice(0, 10), items }),
      });
      setLineas([{ insumoId: '', cantidad: '' }]);
      onCambio();
    } catch (e: any) { setError(e.message); } finally { setCargando(false); }
  }

  return (
    <Seccion titulo="Facturar entrega de insumos (venta contra inventario real)">
      {!puedeFacturar && (
        <p className="text-xs text-cad-apagado mb-3">El contrato debe estar firmado antes de poder facturar insumos.</p>
      )}
      {puedeFacturar && (
        <form onSubmit={facturar} className="space-y-2 mb-4">
          {lineas.map((linea, idx) => {
            const insumoSeleccionado = insumos.find((i) => i.id === linea.insumoId);
            return (
              <div key={idx} className="flex gap-2">
                <select value={linea.insumoId} onChange={(e) => actualizarLinea(idx, 'insumoId', e.target.value)}
                  className="flex-1 border border-cad-linea rounded px-3 py-2 text-sm">
                  <option value="">Selecciona un insumo...</option>
                  {insumos.map((i) => (
                    <option key={i.id} value={i.id}>{i.nombre} — stock: {Number(i.stockActual).toFixed(1)} {i.unidad}</option>
                  ))}
                </select>
                <input type="number" step="any" placeholder={insumoSeleccionado ? insumoSeleccionado.unidad : 'cantidad'}
                  value={linea.cantidad} onChange={(e) => actualizarLinea(idx, 'cantidad', e.target.value)}
                  className="w-28 border border-cad-linea rounded px-3 py-2 text-sm" />
                {lineas.length > 1 && (
                  <button type="button" onClick={() => quitarLinea(idx)} className="text-xs text-cad-danger px-1">Quitar</button>
                )}
              </div>
            );
          })}
          <button type="button" onClick={agregarLinea} className="text-xs text-cad-naranja hover:underline">+ Agregar línea</button>

          <div className="flex items-center justify-between pt-2 border-t border-cad-linea">
            <p className="text-xs text-cad-apagado">Total estimado de la factura (con margen)</p>
            <p className="text-sm font-semibold text-cad-navy">${totalEstimado.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
          </div>

          {error && <p className="text-xs text-cad-danger">{error}</p>}
          <button type="submit" disabled={cargando}
            className="w-full bg-cad-naranja text-white font-medium rounded py-2 text-sm hover:brightness-95 disabled:opacity-50">
            {cargando ? 'Facturando...' : 'Generar factura y descontar inventario'}
          </button>
        </form>
      )}

      <p className="text-xs font-medium text-cad-apagado uppercase mb-2">Facturas emitidas</p>
      <div className="space-y-2">
        {ventas.map((v: any) => (
          <div key={v.id} className="bg-cad-superficie rounded-lg p-2.5 text-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="font-medium">{v.numeroFactura}</p>
              <p className="text-sm font-semibold text-cad-navy">${Number(v.totalConMargen).toFixed(2)}</p>
            </div>
            <p className="text-xs text-cad-apagado">
              {new Date(v.fecha).toLocaleDateString('es-VE')} · {v.items.map((it: any) => `${Number(it.cantidad)} ${it.insumo.unidad} de ${it.insumo.nombre}`).join(', ')}
            </p>
          </div>
        ))}
        {ventas.length === 0 && <p className="text-xs text-cad-apagado">Sin facturas todavía.</p>}
      </div>
    </Seccion>
  );
}

// ============================================================
// PASO 6 — Liquidación
// ============================================================
function LiquidacionSeccion({ solicitud, onCambio }: { solicitud: any; onCambio: () => void }) {
  const [produccionRealQq, setProduccionRealQq] = useState('');
  const [precioLiquidacionQq, setPrecioLiquidacionQq] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  if (solicitud.liquidacion) {
    const l = solicitud.liquidacion;
    return (
      <Seccion titulo="Liquidación">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-cad-apagado">Total a cobrar</p><p className="font-semibold">${Number(l.totalACobrar).toLocaleString('en-US')}</p></div>
          <div><p className="text-xs text-cad-apagado">Valor cosecha recibida</p><p className="font-semibold">${Number(l.valorCosechaRecibida ?? 0).toLocaleString('en-US')}</p></div>
          <div><p className="text-xs text-cad-apagado">Ganancia CAD</p><p className="font-semibold text-cad-verde">${Number(l.gananciaCAD).toLocaleString('en-US')}</p></div>
          <div><p className="text-xs text-cad-apagado">Estado de cobranza</p><p className="font-semibold">{l.estadoCobranza}</p></div>
        </div>
      </Seccion>
    );
  }

  if (!['DESPACHADA', 'EN_SEGUIMIENTO', 'COSECHADA'].includes(solicitud.estado)) return null;

  async function liquidar(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setCargando(true);
    try {
      await apiFetch(`/solicitudes/${solicitud.id}/liquidar`, {
        method: 'POST',
        body: JSON.stringify({
          fecha: new Date().toISOString().slice(0, 10),
          produccionRealQq: produccionRealQq ? Number(produccionRealQq) : undefined,
          precioLiquidacionQq: precioLiquidacionQq ? Number(precioLiquidacionQq) : undefined,
        }),
      });
      onCambio();
    } catch (e: any) { setError(e.message); } finally { setCargando(false); }
  }

  return (
    <Seccion titulo="Paso 6 — Liquidación">
      <form onSubmit={liquidar} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-cad-apagado mb-1">Producción real (qq)</label>
            <input type="number" value={produccionRealQq} onChange={(e) => setProduccionRealQq(e.target.value)} className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-cad-apagado mb-1">Precio de liquidación ($/qq)</label>
            <input type="number" value={precioLiquidacionQq} onChange={(e) => setPrecioLiquidacionQq(e.target.value)} className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
          </div>
        </div>
        {error && <p className="text-xs text-cad-danger">{error}</p>}
        <button type="submit" disabled={cargando} className="w-full bg-cad-navy text-white font-medium rounded py-2 text-sm hover:brightness-95 disabled:opacity-50">
          {cargando ? 'Liquidando...' : 'Liquidar expediente'}
        </button>
      </form>
    </Seccion>
  );
}
