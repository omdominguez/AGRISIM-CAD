'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { apiFetch } from '../../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

interface FincaOpcion { id: string; nombre: string; productorNombre: string }

export default function ImportarKml() {
  const [fincas, setFincas] = useState<FincaOpcion[]>([]);
  const [fincaId, setFincaId] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    apiFetch('/productores').then((productores: any[]) => {
      const todas: FincaOpcion[] = productores.flatMap((p) =>
        (p.fincas ?? []).map((f: any) => ({ id: f.id, nombre: f.nombre, productorNombre: p.nombre })),
      );
      setFincas(todas);
    }).catch(() => {});
  }, []);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!fincaId) {
      alert('Selecciona primero la finca destino.');
      e.target.value = '';
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
      if (!res.ok) throw new Error((await res.json()).message ?? 'Error al importar el archivo.');
      const data = await res.json();
      alert(
        `${data.totalImportado} lote(s) importado(s), ${data.areaTotalHa.toFixed(2)} ha en total.` +
        (data.lotesOmitidosPorAreaCero.length
          ? `\n${data.lotesOmitidosPorAreaCero.length} polígono(s) omitido(s) por área inválida.`
          : ''),
      );
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={fincaId}
        onChange={(e) => setFincaId(e.target.value)}
        className="border border-cad-linea rounded px-3 py-2 text-sm"
      >
        <option value="">Selecciona finca destino...</option>
        {fincas.map((f) => (
          <option key={f.id} value={f.id}>{f.productorNombre} · {f.nombre}</option>
        ))}
      </select>
      <label className={`bg-cad-naranja text-white text-sm font-medium rounded px-4 py-2 transition ${
        fincaId ? 'cursor-pointer hover:brightness-95' : 'opacity-50 cursor-not-allowed'
      }`}>
        {cargando ? 'Importando...' : 'Importar KML/KMZ'}
        <input type="file" accept=".kml,.kmz" onChange={onFileChange} disabled={!fincaId} className="hidden" />
      </label>
    </div>
  );
}
