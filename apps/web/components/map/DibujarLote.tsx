'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';
import 'leaflet-draw'; // efecto secundario: agrega L.Control.Draw al objeto L

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

// Centro por defecto — región llanera.
const CENTRO_DEFECTO: [number, number] = [8.62, -70.2];

/**
 * Agrega la barra de herramientas de Leaflet.Draw al mapa: dibujar polígono,
 * editar vértices arrastrándolos, y borrar. Reemplaza el click-por-click
 * manual de antes — es la misma interacción que usan Google My Maps o SIMA.
 * Solo se permite UN polígono a la vez (un lote): al dibujar uno nuevo, se
 * borra el anterior automáticamente.
 */
function HerramientasDibujo({
  featureGroupRef,
  onCambio,
  poligonoInicial,
}: {
  featureGroupRef: React.RefObject<L.FeatureGroup>;
  onCambio: () => void;
  poligonoInicial?: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    const grupo = featureGroupRef.current;
    if (!grupo) return;

    // Modo edición: si viene un polígono existente, se precarga ya
    // editable (arrastrable) en vez de arrancar el mapa en blanco.
    if (poligonoInicial && poligonoInicial.length >= 3 && grupo.getLayers().length === 0) {
      const capaExistente = L.polygon(poligonoInicial, { color: '#F77B1C', weight: 3, fillOpacity: 0.2 });
      grupo.addLayer(capaExistente);
      map.fitBounds(capaExistente.getBounds(), { padding: [30, 30] });
    }

    const controlDibujo = new (L as any).Control.Draw({
      position: 'topleft',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          drawError: { color: '#B23A3A', message: '⚠ Las líneas del lote no pueden cruzarse entre sí.' },
          shapeOptions: { color: '#F77B1C', weight: 3, fillOpacity: 0.2 },
        },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: {
        featureGroup: grupo,
        remove: true,
      },
    });

    map.addControl(controlDibujo);

    function alCrear(e: any) {
      // Un solo lote a la vez: el polígono nuevo reemplaza al anterior.
      grupo?.clearLayers();
      grupo?.addLayer(e.layer);
      onCambio();
    }

    map.on((L as any).Draw.Event.CREATED, alCrear);
    map.on((L as any).Draw.Event.EDITED, onCambio);
    map.on((L as any).Draw.Event.DELETED, onCambio);

    return () => {
      map.off((L as any).Draw.Event.CREATED, alCrear);
      map.off((L as any).Draw.Event.EDITED, onCambio);
      map.off((L as any).Draw.Event.DELETED, onCambio);
      map.removeControl(controlDibujo);
    };
  }, [map, featureGroupRef, onCambio, poligonoInicial]);

  return null;
}

export default function DibujarLote({
  onCompletar,
  centro = CENTRO_DEFECTO,
  poligonoInicial,
}: {
  onCompletar: (puntos: [number, number][], areaHa: number) => void;
  centro?: [number, number];
  /** Si se pasa, el mapa arranca con este polígono ya trazado y editable —
   *  modo "corregir lote existente" en vez de "dibujar uno nuevo". */
  poligonoInicial?: [number, number][];
}) {
  const [capa, setCapa] = useState<'satelite' | 'mapa'>('satelite');
  const [areaHa, setAreaHa] = useState(poligonoInicial ? calcularAreaHectareas(poligonoInicial) : 0);
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  const centroInicial = poligonoInicial?.[0] ?? centro;

  function obtenerPuntosActuales(): [number, number][] | null {
    const grupo = featureGroupRef.current;
    if (!grupo) return null;
    const capas = grupo.getLayers();
    if (capas.length === 0) return null;
    const poligono = capas[0] as L.Polygon;
    const anillo = poligono.getLatLngs()[0] as L.LatLng[];
    return anillo.map((p) => [p.lat, p.lng]);
  }

  function recalcularArea() {
    const puntos = obtenerPuntosActuales();
    setAreaHa(puntos ? calcularAreaHectareas(puntos) : 0);
  }

  function finalizar() {
    const puntos = obtenerPuntosActuales();
    if (!puntos || puntos.length < 3) {
      alert('Dibuja el lote primero — usa el ícono de polígono a la izquierda del mapa.');
      return;
    }
    onCompletar(puntos, calcularAreaHectareas(puntos));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-cad-apagado">
          {poligonoInicial
            ? 'Arrastra los vértices para corregir el polígono, o usa la papelera y trázalo de nuevo con el ícono de polígono.'
            : 'Usa el ícono de polígono (izquierda del mapa) para trazar el lote. Después puedes arrastrar cada punto para ajustarlo, o usar la papelera para borrar y empezar de nuevo.'}
        </p>
        <p className="text-sm font-medium text-cad-navy shrink-0 ml-3">
          {areaHa > 0 ? `${areaHa.toFixed(2)} ha` : '—'}
        </p>
      </div>

      <div className="flex gap-2 mb-2">
        <button type="button" onClick={() => setCapa('satelite')}
          className={`text-xs font-medium rounded px-3 py-1.5 transition ${
            capa === 'satelite' ? 'bg-cad-navy text-white' : 'border border-cad-linea text-cad-tinta hover:bg-cad-superficie'
          }`}>
          Satélite
        </button>
        <button type="button" onClick={() => setCapa('mapa')}
          className={`text-xs font-medium rounded px-3 py-1.5 transition ${
            capa === 'mapa' ? 'bg-cad-navy text-white' : 'border border-cad-linea text-cad-tinta hover:bg-cad-superficie'
          }`}>
          Mapa
        </button>
      </div>

      <MapContainer center={centroInicial} zoom={15} style={{ height: '420px', width: '100%' }} className="rounded-lg border border-cad-linea">
        {capa === 'satelite' ? (
          <TileLayer
            attribution='Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        ) : (
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        <FeatureGroup ref={featureGroupRef}>
          <HerramientasDibujo featureGroupRef={featureGroupRef} onCambio={recalcularArea} poligonoInicial={poligonoInicial} />
        </FeatureGroup>
      </MapContainer>

      <div className="flex justify-end mt-3">
        <button type="button" onClick={finalizar} disabled={areaHa <= 0}
          className="text-xs bg-cad-naranja text-white font-medium rounded px-3 py-1.5 hover:brightness-95 disabled:opacity-40">
          {poligonoInicial ? 'Guardar corrección' : 'Usar este lote'} ({areaHa > 0 ? `${areaHa.toFixed(2)} ha` : 'sin trazar'})
        </button>
      </div>
    </div>
  );
}
