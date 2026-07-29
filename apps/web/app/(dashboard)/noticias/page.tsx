'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

interface Noticia {
  id: string;
  tipo: string;
  titulo: string;
  resumen: string;
  fuente: string;
  url: string | null;
  region: string | null;
  rubro: string | null;
  fechaPublicacion: string;
}

export default function NoticiasPage() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [rubros, setRubros] = useState<string[]>([]);
  const [rubroFiltro, setRubroFiltro] = useState('');
  const [regionFiltro, setRegionFiltro] = useState('');
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cargar() {
    setCargando(true);
    const params = new URLSearchParams();
    if (rubroFiltro) params.set('rubro', rubroFiltro);
    if (regionFiltro) params.set('region', regionFiltro);
    apiFetch(`/noticias?${params.toString()}`)
      .then(setNoticias)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }

  useEffect(() => { apiFetch('/noticias/rubros').then(setRubros).catch(() => {}); }, []);
  useEffect(cargar, [rubroFiltro, regionFiltro]);

  async function actualizarAhora() {
    setActualizando(true);
    try {
      await apiFetch('/noticias/actualizar', { method: 'POST' });
      cargar();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActualizando(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-cad-navy">Clima y Noticias</h1>
        <button
          onClick={actualizarAhora}
          disabled={actualizando}
          className="bg-cad-naranja text-white text-sm font-medium rounded px-4 py-2 hover:brightness-95 transition disabled:opacity-50"
        >
          {actualizando ? 'Buscando...' : '↻ Actualizar noticias'}
        </button>
      </div>
      <p className="text-sm text-cad-apagado mb-6">
        Mercado internacional de leguminosas y agricultura en Venezuela. Se actualiza sola cada 6 horas,
        o puedes forzarlo con el botón.
      </p>

      <div className="flex gap-3 mb-6">
        <select
          value={rubroFiltro}
          onChange={(e) => setRubroFiltro(e.target.value)}
          className="border border-cad-linea rounded px-3 py-2 text-sm"
        >
          <option value="">Todos los rubros</option>
          {rubros.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <select
          value={regionFiltro}
          onChange={(e) => setRegionFiltro(e.target.value)}
          className="border border-cad-linea rounded px-3 py-2 text-sm"
        >
          <option value="">Venezuela e internacional</option>
          <option value="Venezuela">Solo Venezuela</option>
          <option value="Internacional">Solo internacional</option>
        </select>
      </div>

      {error && <p className="text-sm text-cad-danger mb-4">{error}</p>}
      {cargando && <p className="text-sm text-cad-apagado">Cargando...</p>}

      {!cargando && noticias.length === 0 && !error && (
        <div className="bg-white border border-cad-linea rounded-xl p-6 text-sm text-cad-apagado">
          No hay noticias cargadas todavía para este filtro. Presiona <strong>"Actualizar noticias"</strong> arriba
          para traer las más recientes de Google News (mercado internacional de leguminosas + agricultura en Venezuela).
        </div>
      )}

      <div className="grid gap-3">
        {noticias.map((n) => (
          <a
            key={n.id}
            href={n.url ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-cad-linea rounded-xl p-4 hover:border-cad-naranja transition-colors block"
          >
            <div className="flex items-center gap-2 mb-1">
              {n.rubro && (
                <span className="px-2 py-0.5 rounded-full bg-cad-verde/15 text-cad-verde text-xs font-medium">{n.rubro}</span>
              )}
              {n.region && (
                <span className="px-2 py-0.5 rounded-full bg-cad-info/10 text-cad-info text-xs">{n.region}</span>
              )}
              <span className="text-xs text-cad-apagado ml-auto">
                {new Date(n.fechaPublicacion).toLocaleDateString('es-VE')}
              </span>
            </div>
            <p className="font-medium text-cad-navy">{n.titulo}</p>
            <p className="text-xs text-cad-apagado mt-1">{n.fuente}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
