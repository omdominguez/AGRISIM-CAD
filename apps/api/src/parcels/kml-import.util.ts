import * as AdmZip from 'adm-zip';
import { DOMParser } from '@xmldom/xmldom';
// @ts-ignore — @tmcw/togeojson no trae tipos completos para xmldom
import { kml } from '@tmcw/togeojson';

/**
 * Convierte un archivo .kml o .kmz (exportado desde SIMA / Google Earth)
 * en un arreglo de features GeoJSON listas para guardar en Parcela.geoJson
 * y renderizar directo en el mapa (Leaflet) del frontend.
 */
export function parseKmlOrKmz(buffer: Buffer, filename: string) {
  let kmlText: string;

  if (filename.toLowerCase().endsWith('.kmz')) {
    const zip = new AdmZip(buffer);
    const kmlEntry = zip.getEntries().find((e) => e.entryName.toLowerCase().endsWith('.kml'));
    if (!kmlEntry) {
      throw new Error('El archivo .kmz no contiene ningún .kml en su interior.');
    }
    kmlText = kmlEntry.getData().toString('utf-8');
  } else {
    kmlText = buffer.toString('utf-8');
  }

  const dom = new DOMParser().parseFromString(kmlText, 'text/xml');
  const geoJson = kml(dom as any);

  // geoJson es un FeatureCollection. Cada Feature típicamente corresponde
  // a un lote/parcela (polígono) con su nombre y, si SIMA lo exporta,
  // su código en properties.name o properties.description.
  return geoJson as {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      properties: Record<string, any>;
      geometry: { type: string; coordinates: any };
    }>;
  };
}

/** Calcula el centroide simple (promedio de vértices) de un polígono GeoJSON. */
export function calcularCentroide(geometry: { type: string; coordinates: any }) {
  let coords: [number, number][] = [];

  if (geometry.type === 'Polygon') {
    coords = geometry.coordinates[0];
  } else if (geometry.type === 'MultiPolygon') {
    coords = geometry.coordinates[0][0];
  } else {
    return null;
  }

  const [sumLng, sumLat] = coords.reduce(
    ([lng, lat]: number[], [pLng, pLat]: number[]) => [lng + pLng, lat + pLat],
    [0, 0],
  );

  return {
    lat: sumLat / coords.length,
    lng: sumLng / coords.length,
  };
}
