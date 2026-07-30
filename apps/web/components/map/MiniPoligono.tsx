/**
 * Dibuja una miniatura del polígono de un lote — sin cargar un mapa
 * completo, solo la forma. Normaliza las coordenadas del GeoJSON a un
 * cuadro fijo, así que sirve como vista rápida en una tarjeta.
 */
export default function MiniPoligono({
  geoJson,
  color = '#F77B1C',
  tamano = 64,
}: {
  geoJson: any;
  color?: string;
  tamano?: number;
}) {
  const anillo: [number, number][] =
    geoJson?.type === 'Polygon' ? geoJson.coordinates[0]
    : geoJson?.type === 'MultiPolygon' ? geoJson.coordinates[0][0]
    : [];

  if (anillo.length < 3) {
    return (
      <div
        style={{ width: tamano, height: tamano }}
        className="bg-cad-superficie rounded-lg flex items-center justify-center text-cad-apagado text-[10px] shrink-0"
      >
        sin forma
      </div>
    );
  }

  const lngs = anillo.map((p) => p[0]);
  const lats = anillo.map((p) => p[1]);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const rangoLng = maxLng - minLng || 1;
  const rangoLat = maxLat - minLat || 1;

  const padding = 6;
  const puntos = anillo
    .map(([lng, lat]) => {
      const x = padding + ((lng - minLng) / rangoLng) * (tamano - padding * 2);
      // Y invertido: en pantalla "arriba" es menor Y, pero en geografía mayor latitud es "arriba".
      const y = padding + (1 - (lat - minLat) / rangoLat) * (tamano - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`} className="bg-cad-superficie rounded-lg shrink-0">
      <polygon points={puntos} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={1.5} />
    </svg>
  );
}
