'use client';

import dynamic from 'next/dynamic';
import ImportarKml from '../../../components/map/ImportarKml';
import AlertasLluvia from '../../../components/map/AlertasLluvia';

// Leaflet requiere `window`, por lo que el mapa se carga solo en cliente.
const MapaParcelas = dynamic(() => import('../../../components/map/MapaParcelas'), { ssr: false });

export default function MapaPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-cad-navy">Mapa de Parcelas</h1>
          <p className="text-sm text-cad-apagado">
            Todos los lotes cargados, coloreados por semáforo propio (área en pie, incidencias y frecuencia de visitas).
          </p>
        </div>
        <ImportarKml />
      </div>

      <div className="mb-4">
        <AlertasLluvia />
      </div>

      <MapaParcelas />
    </div>
  );
}
