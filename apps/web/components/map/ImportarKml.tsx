'use client';

import { useState } from 'react';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

// Nota: este componente asume que ya existe una finca seleccionada (fincaId).
// En una siguiente iteración se agrega un selector de finca antes de importar.
export default function ImportarKml({ fincaId }: { fincaId?: string }) {
  const [cargando, setCargando] = useState(false);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !fincaId) {
      alert('Selecciona primero la finca destino (pendiente selector — ver ROADMAP).');
      return;
    }
    setCargando(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = Cookies.get('agrisim_token');
      const res = await fetch(`${API_URL}/parcelas/importar-kml/${fincaId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Error al importar el archivo.');
      const data = await res.json();
      alert(`${data.totalImportado} lote(s) importado(s) correctamente.`);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <label className="bg-cad-naranja text-white text-sm font-medium rounded px-4 py-2 cursor-pointer hover:brightness-95 transition">
      {cargando ? 'Importando...' : 'Importar KML/KMZ de SIMA'}
      <input type="file" accept=".kml,.kmz" onChange={onFileChange} className="hidden" />
    </label>
  );
}
