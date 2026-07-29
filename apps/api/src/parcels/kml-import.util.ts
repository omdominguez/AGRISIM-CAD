import * as AdmZip from 'adm-zip';
import { DOMParser } from '@xmldom/xmldom';
// @ts-ignore — @tmcw/togeojson no trae tipos completos para xmldom
import { kml } from '@tmcw/togeojson';

/**
 * Convierte un .kml o .kmz (exportado desde SIMA / Google Earth) en features
 * GeoJSON listas para guardar en Parcela.geoJson y renderizar en Leaflet.
 */
export function parseKmlOrKmz(buffer: Buffer, filename: string) {
  let kmlText: string;

  if (filename.toLowerCase().endsWith('.kmz')) {
    const zip = new AdmZip(buffer);
    const kmlEntry = zip.getEntries().find((e) => e.entryName.toLowerCase().endsWith('.kml'));
    if (!kmlEntry) throw new Error('El archivo .kmz no contiene ningún .kml en su interior.');
    kmlText = kmlEntry.getData().toString('utf-8');
  } else {
    kmlText = buffer.toString('utf-8');
  }

  const dom = new DOMParser().parseFromString(kmlText, 'text/xml');
  const geoJson = kml(dom as any);

  return geoJson as {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      properties: Record<string, any>;
      geometry: { type: string; coordinates: any };
    }>;
  };
}

// Radio medio terrestre (m), esfera de referencia WGS84.
const RADIO_TIERRA_M = 6378137;

/**
 * Área geodésica de un anillo de coordenadas [lng, lat], en m².
 * Usa la fórmula de exceso esférico (misma que emplea Google Earth Engine
 * y turf.js). Es exacta para los tamaños de lote que maneja CAD —
 * el error frente a una proyección plana local es despreciable (<0.1%).
 */
function areaAnilloM2(anillo: [number, number][]): number {
  if (anillo.length < 3) return 0;

  const rad = (grados: number) => (grados * Math.PI) / 180;
  let total = 0;

  for (let i = 0; i < anillo.length; i++) {
    const [lngA, latA] = anillo[i];
    const [lngB, latB] = anillo[(i + 1) % anillo.length];
    total += rad(lngB - lngA) * (2 + Math.sin(rad(latA)) + Math.sin(rad(latB)));
  }

  return Math.abs((total * RADIO_TIERRA_M * RADIO_TIERRA_M) / 2);
}

/**
 * Área de una geometría GeoJSON en HECTÁREAS.
 * Descuenta los anillos interiores (huecos) del polígono, si los hay —
 * relevante cuando un lote tiene una zona excluida (laguna, casa, etc.).
 */
export function calcularAreaHectareas(geometry: { type: string; coordinates: any }): number {
  let m2 = 0;

  if (geometry.type === 'Polygon') {
    const [exterior, ...huecos] = geometry.coordinates as [number, number][][];
    m2 = areaAnilloM2(exterior) - huecos.reduce((acc, h) => acc + areaAnilloM2(h), 0);
  } else if (geometry.type === 'MultiPolygon') {
    for (const poligono of geometry.coordinates as [number, number][][][]) {
      const [exterior, ...huecos] = poligono;
      m2 += areaAnilloM2(exterior) - huecos.reduce((acc, h) => acc + areaAnilloM2(h), 0);
    }
  } else {
    return 0;
  }

  return m2 / 10000; // m² → ha
}

/** Centroide simple (promedio de vértices) de una geometría GeoJSON. */
export function calcularCentroide(geometry: { type: string; coordinates: any }) {
  let coords: [number, number][] = [];

  if (geometry.type === 'Polygon') coords = geometry.coordinates[0];
  else if (geometry.type === 'MultiPolygon') coords = geometry.coordinates[0][0];
  else return null;

  const [sumLng, sumLat] = coords.reduce(
    ([lng, lat]: number[], [pLng, pLat]: number[]) => [lng + pLng, lat + pLat],
    [0, 0],
  );

  return { lat: sumLat / coords.length, lng: sumLng / coords.length };
}
