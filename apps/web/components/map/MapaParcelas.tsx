'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { apiFetch } from '../../lib/api';

interface ParcelaMapa {
  id: string;
  nombreLote: string;
  geoJson: any;
  areaCalculadaHa: number;
  centroideLat: number | null;
  centroideLng: number | null;
  finca: string;
  productor: string;
  cicloActivo: { nombre: string; cultivo: string; fechaSiembra: string | null; diasDesdeSiembra: number | null } | null;
  ultimaVisita: { fecha: string; estadoFenologico: string | null } | null;
  semaforo: 'VERDE' | 'AMARILLO' | 'ROJO' | 'SIN_CICLO';
  motivoSemaforo: string;
}

const COLOR_SEMAFORO: Record<string, string> = {
  VERDE: '#008747',
  AMARILLO: '#F8B345',
  ROJO: '#B23A3A',
  SIN_CICLO: '#999999',
};

const ETIQUETA_SEMAFORO: Record<string, string> = {
  VERDE: 'En pie, sin novedad',
  AMARILLO: 'Requiere atención',
  ROJO: 'Crítico',
  SIN_CICLO: 'Sin ciclo activo',
};

const CENTRO_DEFECTO: [number, number] = [8.62, -70.2];

// Ajusta la vista del mapa a los límites reales de los lotes cargados —
// así un lote recién creado siempre queda visible, sin depender de un
// centro/zoom fijo que podría no coincidir con dónde está.
function AutoEncuadre({ parcelas }: { parcelas: ParcelaMapa[] }) {
  const map = useMap();

  useEffect(() => {
    if (parcelas.length === 0) return;
    const puntos: [number, number][] = parcelas
      .filter((p) => p.centroideLat != null && p.centroideLng != null)
      .map((p) => [p.centroideLat as number, p.centroideLng as number]);

    if (puntos.length > 0) {
      map.fitBounds(L.latLngBounds(puntos), { padding: [40, 40], maxZoom: 15 });
    }
  }, [parcelas, map]);

  return null;
}

export default function MapaParcelas() {
  const [parcelas, setParcelas] = useState<ParcelaMapa[]>([]);
  const [capa, setCapa] = useState<'mapa' | 'satelite'>('mapa');
  const [filtros, setFiltros] = useState<Record<string, boolean>>({
    VERDE: true, AMARILLO: true, ROJO: true, SIN_CICLO: true,
  });

  useEffect(() => {
    apiFetch('/parcelas/mapa')
      .then(setParcelas)
      .catch((err) => console.error('Error cargando parcelas:', err));
  }, []);

  const visibles = parcelas.filter((p) => filtros[p.semaforo]);

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-white border border-cad-linea rounded-xl p-4 h-fit">
        <p className="text-xs font-medium text-cad-apagado uppercase mb-3">Filtros</p>
        {(['VERDE', 'AMARILLO', 'ROJO', 'SIN_CICLO'] as const).map((clave) => (
          <label key={clave} className="flex items-center gap-2 text-sm mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filtros[clave]}
              onChange={(e) => setFiltros((f) => ({ ...f, [clave]: e.target.checked }))}
            />
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLOR_SEMAFORO[clave] }} />
            {ETIQUETA_SEMAFORO[clave]}
            <span className="text-cad-apagado ml-auto">{parcelas.filter((p) => p.semaforo === clave).length}</span>
          </label>
        ))}
      </div>

      <div className="col-span-3">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setCapa('mapa')}
            className={`text-sm font-medium rounded px-4 py-2 transition ${
              capa === 'mapa' ? 'bg-cad-navy text-white' : 'bg-white border border-cad-linea text-cad-tinta hover:bg-cad-superficie'
            }`}
          >
            Mapa
          </button>
          <button
            onClick={() => setCapa('satelite')}
            className={`text-sm font-medium rounded px-4 py-2 transition ${
              capa === 'satelite' ? 'bg-cad-navy text-white' : 'bg-white border border-cad-linea text-cad-tinta hover:bg-cad-superficie'
            }`}
          >
            Satélite
          </button>
        </div>

        <MapContainer center={CENTRO_DEFECTO} zoom={9} style={{ height: '600px', width: '100%' }} className="rounded-xl border border-cad-linea">
          {capa === 'mapa' ? (
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          ) : (
            <TileLayer
              attribution='Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          )}
          <AutoEncuadre parcelas={visibles} />
          {visibles.map((p) => (
            <GeoJSON
              key={p.id}
              data={p.geoJson}
              style={{ color: COLOR_SEMAFORO[p.semaforo], weight: 3, fillOpacity: capa === 'satelite' ? 0.25 : 0.35 }}
            >
              <Popup>
                <div className="text-sm min-w-[200px]">
                  <p className="font-semibold text-cad-navy mb-1">{p.nombreLote}</p>
                  <table className="text-xs w-full">
                    <tbody>
                      <tr><td className="text-cad-apagado pr-2 py-0.5">Productor</td><td className="font-medium">{p.productor}</td></tr>
                      <tr><td className="text-cad-apagado pr-2 py-0.5">Predio</td><td>{p.finca}</td></tr>
                      <tr><td className="text-cad-apagado pr-2 py-0.5">Área</td><td>{p.areaCalculadaHa.toFixed(2)} ha</td></tr>
                      {p.cicloActivo && (
                        <>
                          <tr><td className="text-cad-apagado pr-2 py-0.5">Cultivo</td><td>{p.cicloActivo.cultivo}</td></tr>
                          <tr><td className="text-cad-apagado pr-2 py-0.5">Ciclo</td><td>{p.cicloActivo.nombre}</td></tr>
                          {p.cicloActivo.diasDesdeSiembra != null && (
                            <tr><td className="text-cad-apagado pr-2 py-0.5">Días de siembra</td><td>{p.cicloActivo.diasDesdeSiembra}</td></tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                  <div className="mt-2 pt-2 border-t border-cad-linea flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLOR_SEMAFORO[p.semaforo] }} />
                    <span className="text-xs">{p.motivoSemaforo}</span>
                  </div>
                </div>
              </Popup>
            </GeoJSON>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
