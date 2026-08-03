'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

const ETIQUETA_CATEGORIA: Record<string, string> = {
  SEMILLA: 'Semilla',
  FERTILIZANTE: 'Fertilizante',
  AGROQUIMICO: 'Agroquímico',
  MECANIZACION: 'Mecanización',
  OTRO: 'Otro',
};

export default function InsumosPage() {
  const [insumos, setInsumos] = useState<any[]>([]);
  const [insumoAbierto, setInsumoAbierto] = useState<any | null>(null);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function recargar() {
    apiFetch('/insumos').then(setInsumos).catch((e) => setError(e.message));
  }

  useEffect(recargar, []);

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-cad-navy">Inventario de Insumos</h1>
        <button onClick={() => setMostrarNuevo(true)} className="bg-cad-naranja text-white text-sm font-medium rounded px-4 py-2 hover:brightness-95 transition">
          + Nuevo insumo
        </button>
      </div>
      <p className="text-sm text-cad-apagado mb-6">
        Stock y costo promedio ponderado. Las compras suben el stock y el histórico de precio; los productores
        retiran de a poco contra su expediente aprobado — no se entrega el paquete completo de una vez.
      </p>

      {error && <p className="text-sm text-cad-danger mb-4">{error}</p>}

      {mostrarNuevo && (
        <NuevoInsumoModal onClose={() => setMostrarNuevo(false)} onCreado={() => { setMostrarNuevo(false); recargar(); }} />
      )}
      {insumoAbierto && (
        <DetalleInsumoModal insumoId={insumoAbierto.id} onClose={() => setInsumoAbierto(null)} onCambio={recargar} />
      )}

      <div className="grid md:grid-cols-3 gap-3">
        {insumos.map((i: any) => (
          <button
            key={i.id}
            onClick={() => setInsumoAbierto(i)}
            className="text-left bg-white border border-cad-linea rounded-xl p-4 hover:border-cad-naranja transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="font-medium text-sm">{i.nombre}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cad-superficie text-cad-apagado">{ETIQUETA_CATEGORIA[i.categoria]}</span>
            </div>
            <p className="text-xl font-semibold text-cad-navy">{Number(i.stockActual).toFixed(1)} <span className="text-sm font-normal text-cad-apagado">{i.unidad}</span></p>
            <p className="text-xs text-cad-apagado mt-1">
              Costo promedio: ${Number(i.costoPromedioPonderado).toFixed(2)}/{i.unidad}
            </p>
          </button>
        ))}
        {insumos.length === 0 && !error && (
          <p className="text-sm text-cad-apagado col-span-3">Sin insumos en el catálogo todavía — crea el primero.</p>
        )}
      </div>
    </div>
  );
}

function NuevoInsumoModal({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }) {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('SEMILLA');
  const [unidad, setUnidad] = useState('kg');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await apiFetch('/insumos', { method: 'POST', body: JSON.stringify({ nombre, categoria, unidad }) });
      onCreado();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-cad-navy/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-cad-navy">Nuevo insumo</p>
          <button onClick={onClose} className="text-cad-apagado hover:text-cad-tinta text-xl leading-none">×</button>
        </div>
        <form onSubmit={crear} className="space-y-4">
          <div>
            <label className="block text-xs text-cad-apagado mb-1">Nombre</label>
            <input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Urea 46%"
              className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-cad-apagado mb-1">Categoría</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full border border-cad-linea rounded px-3 py-2 text-sm">
                {Object.entries(ETIQUETA_CATEGORIA).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-cad-apagado mb-1">Unidad</label>
              <input value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="kg, l, saco..."
                className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
            </div>
          </div>
          {error && <p className="text-sm text-cad-danger">{error}</p>}
          <button type="submit" disabled={cargando} className="w-full bg-cad-naranja text-white font-medium rounded py-2 text-sm hover:brightness-95 disabled:opacity-50">
            {cargando ? 'Creando...' : 'Crear insumo'}
          </button>
        </form>
      </div>
    </div>
  );
}

function DetalleInsumoModal({ insumoId, onClose, onCambio }: { insumoId: string; onClose: () => void; onCambio: () => void }) {
  const [insumo, setInsumo] = useState<any | null>(null);
  const [mostrarCompra, setMostrarCompra] = useState(false);

  function recargar() {
    apiFetch(`/insumos/${insumoId}`).then(setInsumo).catch(() => {});
  }

  useEffect(recargar, [insumoId]);

  if (!insumo) return null;

  return (
    <div className="fixed inset-0 bg-cad-navy/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl my-8">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-cad-navy">{insumo.nombre}</p>
          <button onClick={onClose} className="text-cad-apagado hover:text-cad-tinta text-xl leading-none">×</button>
        </div>
        <p className="text-sm text-cad-apagado mb-4">
          Stock: {Number(insumo.stockActual).toFixed(1)} {insumo.unidad} · Costo promedio: ${Number(insumo.costoPromedioPonderado).toFixed(2)}/{insumo.unidad}
        </p>

        {mostrarCompra ? (
          <RegistrarCompraForm
            insumoId={insumoId}
            unidad={insumo.unidad}
            onCancelar={() => setMostrarCompra(false)}
            onGuardado={() => { setMostrarCompra(false); recargar(); onCambio(); }}
          />
        ) : (
          <button onClick={() => setMostrarCompra(true)} className="text-sm bg-cad-naranja text-white font-medium rounded px-4 py-2 hover:brightness-95 mb-4">
            + Registrar compra
          </button>
        )}

        <p className="text-xs font-medium text-cad-apagado uppercase mb-2 mt-2">Histórico de compras</p>
        <div className="border border-cad-linea rounded-lg overflow-hidden mb-4">
          <table className="w-full text-xs">
            <thead className="bg-cad-superficie text-left text-cad-apagado">
              <tr><th className="p-2">Fecha</th><th className="p-2">Cantidad</th><th className="p-2">Costo unit.</th><th className="p-2">Proveedor</th></tr>
            </thead>
            <tbody>
              {insumo.compras.map((c: any) => (
                <tr key={c.id} className="border-t border-cad-linea">
                  <td className="p-2">{new Date(c.fecha).toLocaleDateString('es-VE')}</td>
                  <td className="p-2">{Number(c.cantidad).toFixed(1)} {insumo.unidad}</td>
                  <td className="p-2">${Number(c.costoUnitario).toFixed(2)}</td>
                  <td className="p-2">{c.proveedor ?? '—'}</td>
                </tr>
              ))}
              {insumo.compras.length === 0 && (
                <tr><td colSpan={4} className="p-2 text-cad-apagado">Sin compras registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs font-medium text-cad-apagado uppercase mb-2">Retiros de productores</p>
        <div className="border border-cad-linea rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-cad-superficie text-left text-cad-apagado">
              <tr><th className="p-2">Fecha</th><th className="p-2">Productor</th><th className="p-2">Cantidad</th><th className="p-2">Cobrado</th></tr>
            </thead>
            <tbody>
              {insumo.retiros.map((r: any) => (
                <tr key={r.id} className="border-t border-cad-linea">
                  <td className="p-2">{new Date(r.fecha).toLocaleDateString('es-VE')}</td>
                  <td className="p-2">{r.solicitud?.cicloProductor?.productor?.nombre ?? '—'}</td>
                  <td className="p-2">{Number(r.cantidad).toFixed(1)} {insumo.unidad}</td>
                  <td className="p-2">${Number(r.montoCobradoConMargen).toFixed(2)}</td>
                </tr>
              ))}
              {insumo.retiros.length === 0 && (
                <tr><td colSpan={4} className="p-2 text-cad-apagado">Sin retiros registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RegistrarCompraForm({ insumoId, unidad, onCancelar, onGuardado }: { insumoId: string; unidad: string; onCancelar: () => void; onGuardado: () => void }) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [cantidad, setCantidad] = useState('');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await apiFetch(`/insumos/${insumoId}/compras`, {
        method: 'POST',
        body: JSON.stringify({ fecha, cantidad: Number(cantidad), costoUnitario: Number(costoUnitario), proveedor: proveedor || undefined }),
      });
      onGuardado();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="border border-cad-linea rounded-lg p-4 mb-4 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-cad-apagado mb-1">Fecha</label>
          <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full border border-cad-linea rounded px-2 py-1.5 text-xs" />
        </div>
        <div>
          <label className="block text-xs text-cad-apagado mb-1">Cantidad ({unidad})</label>
          <input type="number" step="any" required value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="w-full border border-cad-linea rounded px-2 py-1.5 text-xs" />
        </div>
        <div>
          <label className="block text-xs text-cad-apagado mb-1">Costo unitario ($)</label>
          <input type="number" step="any" required value={costoUnitario} onChange={(e) => setCostoUnitario(e.target.value)} className="w-full border border-cad-linea rounded px-2 py-1.5 text-xs" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-cad-apagado mb-1">Proveedor (opcional)</label>
        <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} className="w-full border border-cad-linea rounded px-2 py-1.5 text-xs" />
      </div>
      {error && <p className="text-xs text-cad-danger">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={cargando} className="text-xs bg-cad-naranja text-white font-medium rounded px-3 py-1.5 hover:brightness-95 disabled:opacity-50">
          {cargando ? 'Guardando...' : 'Guardar compra'}
        </button>
        <button type="button" onClick={onCancelar} className="text-xs text-cad-apagado hover:text-cad-tinta">Cancelar</button>
      </div>
    </form>
  );
}
