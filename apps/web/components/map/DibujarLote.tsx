'use client';

import { useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Radio medio terrestre (m) — misma fórmula geodésica que usa el backend
// (exceso esférico), para que el área que se ve mientras se dibuja
// coincida con la que va a quedar guardada.
const RADIO_TIERRA_M = 6378137;

function calcularAreaHectareas(puntos: [number, number][]): number {
  if (puntos.length < 3) return 0;
  const rad = (g: number) => (g * Math.PI) / 180;
  let total = 0;
  for (let i = 0; i < puntos.length; i++) {
    const [latA, lngA] = puntos[i];
    const [latB, lngB] = puntos[(i + 1) % puntos.length];
    total += rad(lngB - lngA) * (2 + Math.sin(rad(latA)) + Math.sin(rad(latB)));
  }
  return Math.abs((total * RADIO_TIERRA_M * RADIO_TIERRA_M) / 2) / 10000;
}

const iconoPunto = L.divIcon({
  className: '',
  html: '<div style="width:10px;height:10px;border-radius:50%;background:#F77B1C;border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,0.5);"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

// Centro por defecto — región llanera. Ajustable si el usuario ya tiene
// otras parcelas cargadas más cerca (se puede pasar `centro` como prop).
const CENTRO_DEFECTO: [number, number] = [8.62, -70.2];

function CapturaClicks({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function DibujarLote({
  onCompletar,
  centro = CENTRO_DEFECTO,
}: {
  onCompletar: (puntos: [number, number][], areaHa: number) => void;
  centro?: [number, number];
}) {
  const [puntos, setPuntos] = useState<[number, number][]>([]);

  const areaHa = calcularAreaHectareas(puntos);

  function agregarPunto(lat: number, lng: number) {
    setPuntos((p) => [...p, [lat, lng]]);
  }

  function deshacer() {
    setPuntos((p) => p.slice(0, -1));
  }

  function limpiar() {
    setPuntos([]);
  }

  function finalizar() {
    if (puntos.length < 3) {
      alert('Marca al menos 3 puntos para formar el lote.');
      return;
    }
    onCompletar(puntos, areaHa);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-cad-apagado">
          Haz click en el mapa para marcar cada esquina del lote, en orden alrededor del perímetro.
        </p>
        <p className="text-sm font-medium text-cad-navy shrink-0 ml-3">
          {areaHa > 0 ? `${areaHa.toFixed(2)} ha` : '—'}
        </p>
      </div>

      <MapContainer center={centro} zoom={15} style={{ height: '360px', width: '100%' }} className="rounded-lg border border-cad-linea">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CapturaClicks onClick={agregarPunto} />
        {puntos.map((p, i) => <Marker key={i} position={p} icon={iconoPunto} />)}
        {puntos.length >= 3 && <Polygon positions={puntos} pathOptions={{ color: '#F77B1C', fillOpacity: 0.15 }} />}
      </MapContainer>

      <div className="flex gap-2 mt-3">
        <button type="button" onClick={deshacer} disabled={puntos.length === 0}
          className="text-xs border border-cad-linea rounded px-3 py-1.5 hover:bg-cad-superficie disabled:opacity-40">
          Deshacer último punto
        </button>
        <button type="button" onClick={limpiar} disabled={puntos.length === 0}
          className="text-xs border border-cad-linea rounded px-3 py-1.5 hover:bg-cad-superficie disabled:opacity-40">
          Limpiar
        </button>
        <button type="button" onClick={finalizar} disabled={puntos.length < 3}
          className="text-xs bg-cad-naranja text-white font-medium rounded px-3 py-1.5 hover:brightness-95 disabled:opacity-40 ml-auto">
          Usar este lote ({puntos.length} puntos)
        </button>
      </div>
    </div>
  );
}
