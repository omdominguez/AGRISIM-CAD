'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

const ETIQUETA_CATEGORIA: Record<string, string> = {
  SEMILLA: 'Semilla', FERTILIZANTE: 'Fertilizante', AGROQUIMICO: 'Agroquímico', MECANIZACION: 'Mecanización', OTRO: 'Otro',
};

export default function ComprasPage() {
  const [compras, setCompras] = useState<any[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function recargar() {
    apiFetch('/insumos/compras/todas').then(setCompras).catch((e) => setError(e.message));
    apiFetch('/insumos').then(setInsumos).catch(() => {});
  }

  useEffect(recargar, []);

  const totalInvertido = compras.reduce((acc, c) => acc + Number(c.cantidad) * Number(c.costoUnitario), 0);

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-cad-navy">Compras</h1>
        <button onClick={() => setMostrarModal(true)} className="bg-cad-naranja text-white text-sm font-medium rounded px-4 py-2 hover:brightness-95 transition">
          + Nueva compra
        </button>
      </div>
      <p className="text-sm text-cad-apagado mb-6">
        Todo lo que ha entrado al almacén — cada compra sube el stock del insumo y actualiza su costo promedio ponderado.
      </p>

      <div className="bg-white border border-cad-linea rounded-xl p-4 mb-6 inline-block">
        <p className="text-xs text-cad-apagado">Total invertido en compras</p>
        <p className="text-xl font-semibold text-cad-navy">${totalInvertido.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
      </div>

      {error && <p className="text-sm text-cad-danger mb-4">{error}</p>}

      {mostrarModal && (
        <NuevaCompraModal insumos={insumos} onClose={() => setMostrarModal(false)} onGuardado={() => { setMostrarModal(false); recargar(); }} />
      )}

      <div className="bg-white border border-cad-linea rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cad-superficie text-left text-cad-apagado">
            <tr>
              <th className="p-3 font-medium">Fecha</th>
              <th className="p-3 font-medium">Insumo</th>
              <th className="p-3 font-medium">Cantidad</th>
              <th className="p-3 font-medium">Costo unitario</th>
              <th className="p-3 font-medium">Total</th>
              <th className="p-3 font-medium">Proveedor</th>
            </tr>
          </thead>
          <tbody>
            {compras.map((c: any) => (
              <tr key={c.id} className="border-t border-cad-linea">
                <td className="p-3">{new Date(c.fecha).toLocaleDateString('es-VE')}</td>
                <td className="p-3 font-medium">{c.insumo.nombre}</td>
                <td className="p-3">{Number(c.cantidad).toFixed(1)} {c.insumo.unidad}</td>
                <td className="p-3">${Number(c.costoUnitario).toFixed(2)}</td>
                <td className="p-3">${(Number(c.cantidad) * Number(c.costoUnitario)).toFixed(2)}</td>
                <td className="p-3 text-cad-apagado">{c.proveedor ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {compras.length === 0 && !error && (
          <p className="p-4 text-sm text-cad-apagado">Sin compras registradas todavía.</p>
        )}
      </div>
    </div>
  );
}

function NuevaCompraModal({ insumos, onClose, onGuardado }: { insumos: any[]; onClose: () => void; onGuardado: () => void }) {
  const [insumoId, setInsumoId] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [cantidad, setCantidad] = useState('');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const insumoSeleccionado = insumos.find((i) => i.id === insumoId);

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
    <div className="fixed inset-0 bg-cad-navy/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-cad-navy">Nueva compra</p>
          <button onClick={onClose} className="text-cad-apagado hover:text-cad-tinta text-xl leading-none">×</button>
        </div>
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="block text-xs text-cad-apagado mb-1">Insumo</label>
            <select required value={insumoId} onChange={(e) => setInsumoId(e.target.value)} className="w-full border border-cad-linea rounded px-3 py-2 text-sm">
              <option value="">Selecciona...</option>
              {insumos.map((i) => (
                <option key={i.id} value={i.id}>{i.nombre} ({ETIQUETA_CATEGORIA[i.categoria]})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-cad-apagado mb-1">Fecha</label>
              <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-cad-apagado mb-1">Cantidad{insumoSeleccionado ? ` (${insumoSeleccionado.unidad})` : ''}</label>
              <input type="number" step="any" required value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-cad-apagado mb-1">Costo unitario ($)</label>
            <input type="number" step="any" required value={costoUnitario} onChange={(e) => setCostoUnitario(e.target.value)} className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-cad-apagado mb-1">Proveedor (opcional)</label>
            <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
          </div>
          {error && <p className="text-sm text-cad-danger">{error}</p>}
          <button type="submit" disabled={cargando} className="w-full bg-cad-naranja text-white font-medium rounded py-2 text-sm hover:brightness-95 disabled:opacity-50">
            {cargando ? 'Guardando...' : 'Registrar compra'}
          </button>
        </form>
      </div>
    </div>
  );
}
