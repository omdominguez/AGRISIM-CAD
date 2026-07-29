'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api';

interface ClimaZona {
  zona: string;
  estado: string;
  temperaturaC: number | null;
  condicion: string;
}

interface Noticia {
  id: string;
  tipo: string;
  titulo: string;
  resumen: string;
}

const ICONO_CONDICION: Record<string, string> = {
  'Despejado': '☀️', 'Mayormente despejado': '🌤️', 'Parcialmente nublado': '⛅', 'Nublado': '☁️',
  'Neblina': '🌫️', 'Neblina con escarcha': '🌫️',
  'Llovizna leve': '🌦️', 'Llovizna moderada': '🌦️', 'Llovizna densa': '🌧️',
  'Lluvia leve': '🌧️', 'Lluvia moderada': '🌧️', 'Lluvia fuerte': '🌧️',
  'Chubascos leves': '🌦️', 'Chubascos moderados': '🌧️', 'Chubascos fuertes': '⛈️',
  'Tormenta eléctrica': '⛈️', 'Tormenta con granizo leve': '⛈️', 'Tormenta con granizo fuerte': '⛈️',
};

export default function TickerClimaNoticias() {
  const [clima, setClima] = useState<ClimaZona[]>([]);
  const [noticias, setNoticias] = useState<Noticia[]>([]);

  useEffect(() => {
    apiFetch('/noticias/clima').then(setClima).catch(() => {});
    apiFetch('/noticias').then((data) => setNoticias(data.filter((n: any) => n.tipo !== 'CLIMA'))).catch(() => {});
  }, []);

  const itemsClima = clima.map((c) => (
    <span key={`clima-${c.zona}`} className="inline-flex items-center gap-1.5 mx-6 whitespace-nowrap">
      <span>{ICONO_CONDICION[c.condicion] ?? '🌡️'}</span>
      <span className="font-medium">{c.zona}</span>
      <span className="text-white/70">
        {c.temperaturaC != null ? `${Math.round(c.temperaturaC)}°C · ${c.condicion}` : 'sin dato'}
      </span>
    </span>
  ));

  const itemsNoticias = noticias.map((n) => (
    <span key={`noticia-${n.id}`} className="inline-flex items-center gap-1.5 mx-6 whitespace-nowrap">
      <span>📰</span>
      <span className="font-medium">{n.titulo}</span>
      <span className="text-white/70">— {n.resumen}</span>
    </span>
  ));

  const items = [...itemsClima, ...itemsNoticias];
  // Velocidad de lectura: ni tan rápido que no dé tiempo de leer, ni tan
  // lento que se sienta pegado. Ajustable acá si hace falta afinar más.
  const duracionSegundos = Math.min(Math.max(items.length * 3, 18), 55);

  if (items.length === 0) {
    return null; // sin datos todavía (ej. Open-Meteo no respondió) — no mostrar una barra vacía
  }

  return (
    <div className="bg-cad-navy text-white text-sm py-2 border-b border-white/10 flex items-center min-w-0">
      <div className="flex-1 overflow-hidden min-w-0">
        <div className="flex animate-ticker" style={{ '--ticker-duracion': `${duracionSegundos}s` } as React.CSSProperties}>
          {/* El contenido se duplica una vez para que el loop de la animación sea perfecto (sin salto visible). */}
          <div className="flex shrink-0">{items}</div>
          <div className="flex shrink-0" aria-hidden="true">{items}</div>
        </div>
      </div>
      <Link
        href="/noticias"
        className="shrink-0 bg-cad-naranja text-white text-xs font-medium px-3 py-1 rounded ml-3 mr-4 hover:brightness-95 transition"
      >
        Ver todas →
      </Link>
    </div>
  );
}
