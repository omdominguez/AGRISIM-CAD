'use client';

import { useEffect, useState, Fragment } from 'react';
import { apiFetch } from '../../../lib/api';

export default function ComprasPage() {
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [ordenAbierta, setOrdenAbierta] = useState<string | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function recargar() {
    apiFetch('/ordenes-compra').then(setOrdenes).catch((e) => setError(e.message));
    apiFetch('/proveedores').then(setProveedores).catch(() => {});
    apiFetch('/insumos').then(setInsumos).catch(() => {});
  }

  useEffect(recargar, []);

  const totalInvertido = ordenes.reduce((acc, o) => acc + Number(o.subtotal), 0);

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-cad-navy">Compras</h1>
        <button onClick={() => setMostrarModal(true)} className="bg-cad-naranja text-white text-sm font-medium rounded px-4 py-2 hover:brightness-95 transition">
          + Nueva orden de compra
        </button>
      </div>
      <p className="text-sm text-cad-apagado mb-6">
        Una orden de compra por proveedor, con todas las líneas de insumos que le compraste en esa entrega —
        cada línea sube el stock del insumo y actualiza su costo promedio ponderado.
      </p>

      <div className="bg-white border border-cad-linea rounded-xl p-4 mb-6 inline-block">
        <p className="text-xs text-cad-apagado">Total invertido en compras</p>
        <p className="text-xl font-semibold text-cad-navy">${totalInvertido.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
      </div>

      {error && <p className="text-sm text-cad-danger mb-4">{error}</p>}

      {mostrarModal && (
        <NuevaOrdenCompraModal
          proveedores={proveedores}
          insumos={insumos}
          onClose={() => setMostrarModal(false)}
          onGuardado={() => { setMostrarModal(false); recargar(); }}
        />
      )}

      <div className="bg-white border border-cad-linea rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cad-superficie text-left text-cad-apagado">
            <tr>
              <th className="p-3"></th>
              <th className="p-3 font-medium">Orden</th>
              <th className="p-3 font-medium">Fecha</th>
              <th className="p-3 font-medium">Proveedor</th>
              <th className="p-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {ordenes.map((o: any) => (
              <Fragment key={o.id}>
                <tr className="border-t border-cad-linea">
                  <td className="p-3 pl-4">
                    <button onClick={() => setOrdenAbierta(ordenAbierta === o.id ? null : o.id)} className="text-cad-apagado hover:text-cad-navy">
                      {ordenAbierta === o.id ? '▾' : '▸'}
                    </button>
                  </td>
                  <td className="p-3 font-medium">{o.numero}</td>
                  <td className="p-3">{new Date(o.fecha).toLocaleDateString('es-VE')}</td>
                  <td className="p-3">{o.proveedor.nombre}</td>
                  <td className="p-3 font-semibold">${Number(o.subtotal).toLocaleString('en-US')}</td>
                </tr>
                {ordenAbierta === o.id && (
                  <tr className="bg-cad-superficie/60">
                    <td></td>
                    <td colSpan={4} className="px-3 pb-3">
                      <table className="w-full text-xs">
                        <thead className="text-left text-cad-apagado"><tr><th className="py-1">Insumo</th><th>Cantidad</th><th>Costo unit.</th><th>Subtotal</th></tr></thead>
                        <tbody>
                          {o.lineas.map((l: any) => (
                            <tr key={l.id} className="border-t border-cad-linea/60">
                              <td className="py-1">{l.insumo.nombre}</td>
                              <td className="py-1">{Number(l.cantidad).toFixed(1)} {l.insumo.unidad}</td>
                              <td className="py-1">${Number(l.costoUnitario).toFixed(2)}</td>
                              <td className="py-1">${(Number(l.cantidad) * Number(l.costoUnitario)).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {ordenes.length === 0 && !error && (
          <p className="p-4 text-sm text-cad-apagado">Sin órdenes de compra registradas todavía.</p>
        )}
      </div>
    </div>
  );
}

const PROVEEDOR_NUEVO = '__nuevo__';

function NuevaOrdenCompraModal({ proveedores, insumos, onClose, onGuardado }: {
  proveedores: any[];
  insumos: any[];
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [proveedorId, setProveedorId] = useState('');
  const [nuevoProveedor, setNuevoProveedor] = useState({ nombre: '', rif: '', telefono: '' });
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [lineas, setLineas] = useState<any[]>([{ insumoId: '', cantidad: '', costoUnitario: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  function agregarLinea() {
    setLineas((p) => [...p, { insumoId: '', cantidad: '', costoUnitario: '' }]);
  }
  function actualizarLinea(idx: number, campo: string, valor: string) {
    setLineas((p) => p.map((l, i) => (i === idx ? { ...l, [campo]: valor } : l)));
  }
  function quitarLinea(idx: number) {
    setLineas((p) => p.filter((_, i) => i !== idx));
  }

  const subtotal = lineas.reduce((acc, l) => {
    if (!l.cantidad || !l.costoUnitario) return acc;
    return acc + Number(l.cantidad) * Number(l.costoUnitario);
  }, 0);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      let proveedorIdFinal = proveedorId;
      if (proveedorId === PROVEEDOR_NUEVO) {
        if (!nuevoProveedor.nombre.trim()) {
          setError('El nuevo proveedor necesita al menos un nombre.');
          setCargando(false);
          return;
        }
        const creado = await apiFetch('/proveedores', {
          method: 'POST',
          body: JSON.stringify({
            nombre: nuevoProveedor.nombre,
            rif: nuevoProveedor.rif || undefined,
            telefono: nuevoProveedor.telefono || undefined,
          }),
        });
        proveedorIdFinal = creado.id;
      }

      const items = lineas
        .filter((l) => l.insumoId && l.cantidad && l.costoUnitario)
        .map((l) => ({ insumoId: l.insumoId, cantidad: Number(l.cantidad), costoUnitario: Number(l.costoUnitario) }));
      if (items.length === 0) {
        setError('Agrega al menos una línea con insumo, cantidad y costo.');
        setCargando(false);
        return;
      }

      await apiFetch('/ordenes-compra', {
        method: 'POST',
        body: JSON.stringify({ proveedorId: proveedorIdFinal, fecha, items }),
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
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl my-8">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-cad-navy">Nueva orden de compra</p>
          <button onClick={onClose} className="text-cad-apagado hover:text-cad-tinta text-xl leading-none">×</button>
        </div>
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-cad-apagado mb-1">Proveedor</label>
              <select required value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}
                className="w-full border border-cad-linea rounded px-3 py-2 text-sm">
                <option value="">Selecciona...</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}{p.rif ? ` (${p.rif})` : ''}</option>
                ))}
                <option value={PROVEEDOR_NUEVO}>+ Nuevo proveedor...</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-cad-apagado mb-1">Fecha</label>
              <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)}
                className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
            </div>
          </div>

          {proveedorId === PROVEEDOR_NUEVO && (
            <div className="grid grid-cols-3 gap-2 bg-cad-superficie rounded-lg p-3">
              <input required placeholder="Nombre del proveedor" value={nuevoProveedor.nombre}
                onChange={(e) => setNuevoProveedor((p) => ({ ...p, nombre: e.target.value }))}
                className="col-span-3 border border-cad-linea rounded px-2 py-1.5 text-sm" />
              <input placeholder="RIF (opcional)" value={nuevoProveedor.rif}
                onChange={(e) => setNuevoProveedor((p) => ({ ...p, rif: e.target.value }))}
                className="border border-cad-linea rounded px-2 py-1.5 text-sm" />
              <input placeholder="Teléfono (opcional)" value={nuevoProveedor.telefono}
                onChange={(e) => setNuevoProveedor((p) => ({ ...p, telefono: e.target.value }))}
                className="col-span-2 border border-cad-linea rounded px-2 py-1.5 text-sm" />
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs text-cad-apagado">Insumos comprados</label>
            {lineas.map((linea, idx) => {
              const insumoSeleccionado = insumos.find((i) => i.id === linea.insumoId);
              // Un mismo insumo no puede aparecer en dos líneas de la misma
              // orden — se oculta de las demás líneas en vez de dejar que
              // el usuario lo repita con dos costos distintos por error.
              const idsUsadosEnOtrasLineas = new Set(
                lineas.filter((_, i) => i !== idx).map((l) => l.insumoId).filter(Boolean),
              );
              const opcionesDisponibles = insumos.filter(
                (i) => i.id === linea.insumoId || !idsUsadosEnOtrasLineas.has(i.id),
              );
              return (
                <div key={idx} className="flex gap-2">
                  <select value={linea.insumoId} onChange={(e) => actualizarLinea(idx, 'insumoId', e.target.value)}
                    className="flex-1 border border-cad-linea rounded px-3 py-2 text-sm">
                    <option value="">Selecciona un insumo...</option>
                    {opcionesDisponibles.map((i) => (
                      <option key={i.id} value={i.id}>{i.nombre}</option>
                    ))}
                  </select>
                  <input type="number" step="any" placeholder={insumoSeleccionado ? `cant. (${insumoSeleccionado.unidad})` : 'cantidad'}
                    value={linea.cantidad} onChange={(e) => actualizarLinea(idx, 'cantidad', e.target.value)}
                    className="w-28 border border-cad-linea rounded px-3 py-2 text-sm" />
                  <input type="number" step="any" placeholder="costo unit. ($)"
                    value={linea.costoUnitario} onChange={(e) => actualizarLinea(idx, 'costoUnitario', e.target.value)}
                    className="w-32 border border-cad-linea rounded px-3 py-2 text-sm" />
                  {lineas.length > 1 && (
                    <button type="button" onClick={() => quitarLinea(idx)} className="text-xs text-cad-danger px-1">Quitar</button>
                  )}
                </div>
              );
            })}
            <button type="button" onClick={agregarLinea} className="text-xs text-cad-naranja hover:underline">+ Agregar línea</button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-cad-linea">
            <p className="text-xs text-cad-apagado">Total de la orden</p>
            <p className="text-sm font-semibold text-cad-navy">${subtotal.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
          </div>

          {error && <p className="text-sm text-cad-danger">{error}</p>}
          <button type="submit" disabled={cargando} className="w-full bg-cad-naranja text-white font-medium rounded py-2 text-sm hover:brightness-95 disabled:opacity-50">
            {cargando ? 'Registrando...' : 'Registrar orden de compra'}
          </button>
        </form>
      </div>
    </div>
  );
}
