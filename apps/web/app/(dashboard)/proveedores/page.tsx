'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [proveedorAbierto, setProveedorAbierto] = useState<any | null>(null);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function recargar() {
    apiFetch('/proveedores').then(setProveedores).catch((e) => setError(e.message));
  }

  useEffect(recargar, []);

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-cad-navy">Proveedores</h1>
        <button onClick={() => setMostrarNuevo(true)} className="bg-cad-naranja text-white text-sm font-medium rounded px-4 py-2 hover:brightness-95 transition">
          + Nuevo proveedor
        </button>
      </div>
      <p className="text-sm text-cad-apagado mb-6">
        Ficha de cada proveedor con el que CAD compra insumos — se usa al armar una orden de compra.
      </p>

      {error && <p className="text-sm text-cad-danger mb-4">{error}</p>}

      {mostrarNuevo && (
        <FormularioProveedorModal
          titulo="Nuevo proveedor"
          onClose={() => setMostrarNuevo(false)}
          onGuardado={() => { setMostrarNuevo(false); recargar(); }}
        />
      )}
      {proveedorAbierto && (
        <DetalleProveedorModal
          proveedorId={proveedorAbierto.id}
          onClose={() => setProveedorAbierto(null)}
          onCambio={recargar}
        />
      )}

      <div className="bg-white border border-cad-linea rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cad-superficie text-left text-cad-apagado">
            <tr>
              <th className="p-3 font-medium">Nombre</th>
              <th className="p-3 font-medium">RIF</th>
              <th className="p-3 font-medium">Teléfono</th>
              <th className="p-3 font-medium">Contacto</th>
            </tr>
          </thead>
          <tbody>
            {proveedores.map((p: any) => (
              <tr
                key={p.id}
                onClick={() => setProveedorAbierto(p)}
                className="border-t border-cad-linea cursor-pointer hover:bg-cad-superficie/60"
              >
                <td className="p-3 font-medium">{p.nombre}</td>
                <td className="p-3 text-cad-apagado">{p.rif ?? '—'}</td>
                <td className="p-3 text-cad-apagado">{p.telefono ?? '—'}</td>
                <td className="p-3 text-cad-apagado">{p.contacto ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {proveedores.length === 0 && !error && (
          <p className="p-4 text-sm text-cad-apagado">Sin proveedores registrados todavía — crea el primero.</p>
        )}
      </div>
    </div>
  );
}

function CamposProveedor({ valores, onCambio }: { valores: any; onCambio: (campo: string, valor: string) => void }) {
  return (
    <>
      <div>
        <label className="block text-xs text-cad-apagado mb-1">Nombre</label>
        <input required value={valores.nombre} onChange={(e) => onCambio('nombre', e.target.value)}
          placeholder="Ej. Agroinsumos del Llano C.A."
          className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-cad-apagado mb-1">RIF (opcional)</label>
          <input value={valores.rif} onChange={(e) => onCambio('rif', e.target.value)} placeholder="J-12345678-9"
            className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-cad-apagado mb-1">Teléfono (opcional)</label>
          <input value={valores.telefono} onChange={(e) => onCambio('telefono', e.target.value)}
            className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-cad-apagado mb-1">Contacto (opcional)</label>
        <input value={valores.contacto} onChange={(e) => onCambio('contacto', e.target.value)}
          placeholder="Nombre de la persona de contacto"
          className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-cad-apagado mb-1">Notas (opcional)</label>
        <textarea value={valores.notas} onChange={(e) => onCambio('notas', e.target.value)} rows={2}
          className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
      </div>
    </>
  );
}

function FormularioProveedorModal({ titulo, inicial, onClose, onGuardado }: {
  titulo: string;
  inicial?: any;
  onClose: () => void;
  onGuardado: (proveedor: any) => void;
}) {
  const [valores, setValores] = useState({
    nombre: inicial?.nombre ?? '',
    rif: inicial?.rif ?? '',
    telefono: inicial?.telefono ?? '',
    contacto: inicial?.contacto ?? '',
    notas: inicial?.notas ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const proveedor = inicial
        ? await apiFetch(`/proveedores/${inicial.id}`, { method: 'PATCH', body: JSON.stringify(valores) })
        : await apiFetch('/proveedores', { method: 'POST', body: JSON.stringify(valores) });
      onGuardado(proveedor);
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
          <p className="font-semibold text-cad-navy">{titulo}</p>
          <button onClick={onClose} className="text-cad-apagado hover:text-cad-tinta text-xl leading-none">×</button>
        </div>
        <form onSubmit={guardar} className="space-y-4">
          <CamposProveedor valores={valores} onCambio={(campo, valor) => setValores((p) => ({ ...p, [campo]: valor }))} />
          {error && <p className="text-sm text-cad-danger">{error}</p>}
          <button type="submit" disabled={cargando} className="w-full bg-cad-naranja text-white font-medium rounded py-2 text-sm hover:brightness-95 disabled:opacity-50">
            {cargando ? 'Guardando...' : inicial ? 'Guardar cambios' : 'Crear proveedor'}
          </button>
        </form>
      </div>
    </div>
  );
}

function DetalleProveedorModal({ proveedorId, onClose, onCambio }: { proveedorId: string; onClose: () => void; onCambio: () => void }) {
  const [proveedor, setProveedor] = useState<any | null>(null);
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function recargar() {
    apiFetch(`/proveedores/${proveedorId}`).then(setProveedor).catch((e) => setError(e.message));
  }

  useEffect(recargar, [proveedorId]);

  if (!proveedor) return null;

  async function borrar() {
    if (!confirm(`¿Borrar el proveedor "${proveedor.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await apiFetch(`/proveedores/${proveedorId}`, { method: 'DELETE' });
      onCambio();
      onClose();
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (editando) {
    return (
      <FormularioProveedorModal
        titulo="Editar proveedor"
        inicial={proveedor}
        onClose={() => setEditando(false)}
        onGuardado={() => { setEditando(false); recargar(); onCambio(); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-cad-navy/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl my-8">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-cad-navy">{proveedor.nombre}</p>
          <button onClick={onClose} className="text-cad-apagado hover:text-cad-tinta text-xl leading-none">×</button>
        </div>
        {error && <p className="text-xs text-cad-danger mb-2">{error}</p>}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-cad-apagado">
            {proveedor.rif ?? 'Sin RIF'} · {proveedor.telefono ?? 'Sin teléfono'} · {proveedor.contacto ?? 'Sin contacto'}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setEditando(true)} className="text-xs text-cad-naranja hover:underline">Editar</button>
            <button onClick={borrar} className="text-xs text-cad-danger hover:underline">Borrar</button>
          </div>
        </div>
        {proveedor.notas && <p className="text-sm text-cad-apagado mb-4 italic">"{proveedor.notas}"</p>}

        <p className="text-xs font-medium text-cad-apagado uppercase mb-2">Órdenes de compra</p>
        <div className="space-y-2">
          {proveedor.ordenesCompra.map((orden: any) => (
            <div key={orden.id} className="bg-cad-superficie rounded-lg p-2.5 text-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium">{orden.numero}</p>
                <p className="text-sm font-semibold text-cad-navy">${Number(orden.subtotal).toFixed(2)}</p>
              </div>
              <p className="text-xs text-cad-apagado">
                {new Date(orden.fecha).toLocaleDateString('es-VE')} · {orden.lineas.map((l: any) => `${Number(l.cantidad)} ${l.insumo.unidad} de ${l.insumo.nombre}`).join(', ')}
              </p>
            </div>
          ))}
          {proveedor.ordenesCompra.length === 0 && (
            <p className="text-sm text-cad-apagado">Sin órdenes de compra registradas todavía.</p>
          )}
        </div>
      </div>
    </div>
  );
}
