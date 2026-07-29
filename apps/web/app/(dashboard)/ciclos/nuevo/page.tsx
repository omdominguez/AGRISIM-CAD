'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../../lib/api';

export default function NuevoCicloPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: '',
    tipo: 'NORTE_VERANO',
    cultivo: 'Frijol Pico Negro',
    fechaInicio: '',
    metaProductores: '',
    metaHectareas: '',
    precioReferenciaQq: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  function onChange(campo: string, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const ciclo = await apiFetch('/ciclos', {
        method: 'POST',
        body: JSON.stringify({
          nombre: form.nombre,
          tipo: form.tipo,
          cultivo: form.cultivo,
          fechaInicio: form.fechaInicio,
          metaProductores: Number(form.metaProductores),
          metaHectareas: Number(form.metaHectareas),
          precioReferenciaQq: form.precioReferenciaQq ? Number(form.precioReferenciaQq) : undefined,
        }),
      });
      router.push(`/ciclos/${ciclo.id}`);
    } catch (err: any) {
      setError(err.message ?? 'No se pudo crear el ciclo.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-cad-navy mb-1">Nuevo Ciclo</h1>
      <p className="text-sm text-cad-apagado mb-6">
        Abre la campaña. Después se inscriben los productores y sus lotes.
      </p>

      <form onSubmit={crear} className="bg-white border border-cad-linea rounded-xl p-6 space-y-4">
        <Campo label="Nombre del ciclo" placeholder="Norte Verano 2026-2027" value={form.nombre}
          onChange={(v) => onChange('nombre', v)} />

        <div>
          <label className="block text-xs text-cad-apagado mb-1">Tipo</label>
          <select
            value={form.tipo}
            onChange={(e) => onChange('tipo', e.target.value)}
            className="w-full border border-cad-linea rounded px-3 py-2 text-sm"
          >
            <option value="NORTE_VERANO">Norte-Verano</option>
            <option value="INVIERNO">Invierno</option>
          </select>
        </div>

        <Campo label="Cultivo" value={form.cultivo} onChange={(v) => onChange('cultivo', v)} />
        <Campo label="Fecha de inicio" tipo="date" value={form.fechaInicio} onChange={(v) => onChange('fechaInicio', v)} />

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Meta de productores" tipo="number" value={form.metaProductores}
            onChange={(v) => onChange('metaProductores', v)} />
          <Campo label="Meta de hectáreas" tipo="number" value={form.metaHectareas}
            onChange={(v) => onChange('metaHectareas', v)} />
        </div>

        <Campo label="Precio de referencia (US$/qq) — opcional" tipo="number"
          value={form.precioReferenciaQq} onChange={(v) => onChange('precioReferenciaQq', v)} />

        {error && <p className="text-sm text-cad-danger">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-cad-naranja text-white font-medium rounded py-2.5 hover:brightness-95 transition disabled:opacity-50"
        >
          {cargando ? 'Creando...' : 'Crear ciclo'}
        </button>
      </form>
    </div>
  );
}

function Campo({ label, value, onChange, tipo = 'text', placeholder }: any) {
  return (
    <div>
      <label className="block text-xs text-cad-apagado mb-1">{label}</label>
      <input
        type={tipo}
        required
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-cad-linea rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cad-naranja/40 focus:border-cad-naranja"
      />
    </div>
  );
}
