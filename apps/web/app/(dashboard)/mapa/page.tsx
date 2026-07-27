'use client';

import dynamic from 'next/dynamic';
import ImportarKml from '../../../components/map/ImportarKml';

// Leaflet requiere `window`, por lo que el mapa se carga solo en cliente.
const MapaParcelas = dynamic(() => import('../../../components/map/MapaParcelas'), { ssr: false });

export default function MapaPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Mapa de Parcelas</h1>
          <p className="text-sm text-neutral-500">Fincas y lotes importados desde SIMA (formato KML/KMZ).</p>
        </div>
        <ImportarKml />
      </div>
      <MapaParcelas />
    </div>
  );
}
