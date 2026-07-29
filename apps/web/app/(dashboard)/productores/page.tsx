'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../lib/api';
import { ESTADOS_VENEZUELA, MUNICIPIOS_POR_ESTADO, EstadoVenezuela } from '../../../lib/venezuela-geo';

export default function ProductoresPage() {
  const [productores, setProductores] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

  // Filtro: solo se muestran los estados/municipios que YA tienen
  // productores cargados — no la lista completa de Venezuela.
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroMunicipio, setFiltroMunicipio] = useState('');

  function recargar() {
    apiFetch('/productores')
      .then(setProductores)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }

  useEffect(recargar, []);

  const estadosConDatos = useMemo(
    () => [...new Set(productores.map((p) => p.estado).filter(Boolean))].sort(),
    [productores],
  );

  const municipiosConDatos = useMemo(
    () => [...new Set(
      productores
        .filter((p) => !filtroEstado || p.estado === filtroEstado)
        .map((p) => p.municipio)
        .filter(Boolean),
    )].sort(),
    [productores, filtroEstado],
  );

  const productoresFiltrados = productores.filter((p) => {
    if (filtroEstado && p.estado !== filtroEstado) return false;
    if (filtroMunicipio && p.municipio !== filtroMunicipio) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-cad-navy">Productores</h1>
        <button
          onClick={() => setMostrarForm(true)}
          className="bg-cad-naranja text-white text-sm font-medium rounded px-4 py-2 hover:brightness-95 transition"
        >
          + Nuevo productor
        </button>
      </div>
      <p className="text-sm text-cad-apagado mb-6">
        Registro maestro. Se crean una vez y luego se seleccionan al inscribirlos en un ciclo.
      </p>

      {mostrarForm && (
        <NuevoProductorModal onClose={() => setMostrarForm(false)} onCreado={() => { setMostrarForm(false); recargar(); }} />
      )}

      {error && <p className="text-sm text-cad-danger mb-4">{error}</p>}
      {cargando && <p className="text-sm text-cad-apagado">Cargando...</p>}

      {!cargando && estadosConDatos.length > 0 && (
        <div className="flex gap-3 mb-4">
          <select
            value={filtroEstado}
            onChange={(e) => { setFiltroEstado(e.target.value); setFiltroMunicipio(''); }}
            className="border border-cad-linea rounded px-3 py-2 text-sm"
          >
            <option value="">Todos los estados</option>
            {estadosConDatos.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>

          {municipiosConDatos.length > 0 && (
            <select
              value={filtroMunicipio}
              onChange={(e) => setFiltroMunicipio(e.target.value)}
              className="border border-cad-linea rounded px-3 py-2 text-sm"
            >
              <option value="">Todos los municipios</option>
              {municipiosConDatos.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>
      )}

      <div className="bg-white border border-cad-linea rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cad-superficie text-left text-cad-apagado">
            <tr>
              <th className="p-3 font-medium">Nombre</th>
              <th className="p-3 font-medium">Cédula / RIF</th>
              <th className="p-3 font-medium">Zona</th>
              <th className="p-3 font-medium">Fincas</th>
              <th className="p-3 font-medium">Ciclos</th>
            </tr>
          </thead>
          <tbody>
            {productoresFiltrados.map((p) => (
              <tr key={p.id} className="border-t border-cad-linea hover:bg-cad-superficie">
                <td className="p-3 font-medium">
                  <Link href={`/productores/${p.id}`} className="hover:text-cad-naranja hover:underline">
                    {p.nombre}
                  </Link>
                </td>
                <td className="p-3 text-cad-apagado">{p.cedulaRif ?? '—'}</td>
                <td className="p-3 text-cad-apagado">
                  {p.municipio ? `${p.municipio}, ${p.estado}` : (p.estado ?? '—')}
                </td>
                <td className="p-3">{p.fincas?.length ?? 0}</td>
                <td className="p-3">{p._count?.participaciones ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!cargando && productoresFiltrados.length === 0 && (
          <p className="p-4 text-sm text-cad-apagado">
            {productores.length === 0 ? 'No hay productores registrados todavía.' : 'Ningún productor coincide con el filtro.'}
          </p>
        )}
      </div>
    </div>
  );
}

function NuevoProductorModal({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }) {
  const [form, setForm] = useState({ nombre: '', cedulaRif: '', telefono: '', estado: '', municipio: '' });
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const municipiosDisponibles = form.estado ? MUNICIPIOS_POR_ESTADO[form.estado as EstadoVenezuela] : [];

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await apiFetch('/productores', {
        method: 'POST',
        body: JSON.stringify({
          nombre: form.nombre,
          cedulaRif: form.cedulaRif || undefined,
          telefono: form.telefono || undefined,
          estado: form.estado || undefined,
          municipio: form.municipio || undefined,
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
    <div className="fixed inset-0 bg-cad-navy/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-cad-navy">Nuevo productor</p>
          <button onClick={onClose} className="text-cad-apagado hover:text-cad-tinta text-xl leading-none">×</button>
        </div>
        <form onSubmit={crear} className="space-y-4">
          <div>
            <label className="block text-xs text-cad-apagado mb-1">Nombre completo</label>
            <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-cad-apagado mb-1">Cédula / RIF</label>
            <input value={form.cedulaRif} onChange={(e) => setForm({ ...form, cedulaRif: e.target.value })}
              className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-cad-apagado mb-1">Teléfono</label>
            <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-cad-apagado mb-1">Estado</label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value, municipio: '' })}
                className="w-full border border-cad-linea rounded px-3 py-2 text-sm"
              >
                <option value="">Selecciona...</option>
                {ESTADOS_VENEZUELA.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-cad-apagado mb-1">Municipio</label>
              <select
                value={form.municipio}
                onChange={(e) => setForm({ ...form, municipio: e.target.value })}
                disabled={!form.estado}
                className="w-full border border-cad-linea rounded px-3 py-2 text-sm disabled:bg-cad-superficie disabled:text-cad-apagado"
              >
                <option value="">{form.estado ? 'Selecciona...' : 'Elige un estado primero'}</option>
                {municipiosDisponibles.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-cad-danger">{error}</p>}
          <button type="submit" disabled={cargando}
            className="w-full bg-cad-naranja text-white font-medium rounded py-2 text-sm hover:brightness-95 transition disabled:opacity-50">
            {cargando ? 'Creando...' : 'Crear productor'}
          </button>
        </form>
      </div>
    </div>
  );
}
