'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { apiFetch } from '../../lib/api';

interface Parcela {
  id: string;
  nombreLote: string;
  cultivo?: string;
  areaHectareas?: number;
  geoJson: any;
  centroideLat?: number;
  centroideLng?: number;
  finca: { nombre: string; productor: { nombre: string } };
}

// Centro por defecto: región de los llanos venezolanos (Barinas/Portuguesa).
// Ajustar según la zona real de operación de CAD.
const CENTRO_DEFECTO: [number, number] = [8.62, -70.2];

export default function MapaParcelas() {
  const [parcelas, setParcelas] = useState<Parcela[]>([]);

  useEffect(() => {
    apiFetch('/parcelas')
      .then(setParcelas)
      .catch((err) => console.error('Error cargando parcelas:', err));
  }, []);

  return (
    <MapContainer center={CENTRO_DEFECTO} zoom={9} style={{ height: '600px', width: '100%' }} className="rounded-xl border">
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {parcelas.map((p) => (
        <GeoJSON key={p.id} data={p.geoJson}>
          <Popup>
            <strong>{p.nombreLote}</strong>
            <br />
            {p.finca?.productor?.nombre} — {p.finca?.nombre}
            <br />
            {p.cultivo} · {p.areaHectareas} ha
          </Popup>
        </GeoJSON>
      ))}
    </MapContainer>
  );
}
