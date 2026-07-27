'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

// Página stub — estructura base lista para conectar al endpoint real.
// Sigue el mismo patrón que /simulador y /mapa: fetch al API, render de tabla/lista.
export default function Pagina() {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/productores')
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4 capitalize">productores</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <pre className="text-xs bg-white border rounded-xl p-4 overflow-auto max-h-[70vh]">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
