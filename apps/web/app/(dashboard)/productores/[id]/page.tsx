'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Cookies from 'js-cookie';
import { apiFetch } from '../../../../lib/api';
import { ESTADOS_VENEZUELA, MUNICIPIOS_POR_ESTADO, EstadoVenezuela } from '../../../../lib/venezuela-geo';

// Leaflet necesita `window` — se carga solo en cliente.
const DibujarLote = dynamic(() => import('../../../../components/map/DibujarLote'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const ETIQUETA_CATEGORIA: Record<string, string> = {
  SEMILLA: 'Semilla',
  FERTILIZANTE: 'Fertilizante',
  AGROQUIMICO: 'Agroquímico',
  MECANIZACION: 'Mecanización',
  OTRO: 'Otro',
};

export default function ProductorDetallePage() {
  const params = useParams();
  const productorId = params.id as string;

  const [productor, setProductor] = useState<any | null>(null);
  const [desempeno, setDesempeno] = useState<any | null>(null);
  const [cuenta, setCuenta] = useState<any | null>(null);
  const [loteAbierto, setLoteAbierto] = useState<string | null>(null);
  const [mostrarNuevaFinca, setMostrarNuevaFinca] = useState(false);
  const [fincaParaLote, setFincaParaLote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function recargar() {
    apiFetch(`/productores/${productorId}`).then(setProductor).catch((e) => setError(e.message));
    apiFetch(`/productores/${productorId}/desempeno-lotes`).then(setDesempeno).catch(() => {});
    apiFetch(`/cuentas/productores/${productorId}`).then(setCuenta).catch(() => {});
  }

  useEffect(() => { recargar(); }, [productorId]);

  if (error) return <p className="text-sm text-cad-danger">{error}</p>;
  if (!productor) return <p className="text-sm text-cad-apagado">Cargando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-cad-navy mb-1">{productor.nombre}</h1>
      <p className="text-sm text-cad-apagado mb-6">
        {productor.cedulaRif ?? 'Sin cédula/RIF'} · {productor.municipio ? `${productor.municipio}, ${productor.estado}` : (productor.estado ?? 'Sin zona')}
      </p>

      {mostrarNuevaFinca && (
        <NuevaFincaModal productorId={productorId} onClose={() => setMostrarNuevaFinca(false)}
          onCreado={() => { setMostrarNuevaFinca(false); recargar(); }} />
      )}

      {fincaParaLote && (
        <AgregarLoteModal fincaId={fincaParaLote} onClose={() => setFincaParaLote(null)}
          onCreado={() => { setFincaParaLote(null); recargar(); }} />
      )}

      {cuenta && (
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Stat label="Total cargado" valor={`$${cuenta.totalCargos.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />
          <Stat label="Total abonado" valor={`$${cuenta.totalAbonos.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />
          <Stat
            label="Saldo"
            valor={`$${Math.abs(cuenta.saldoFinal).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            nota={cuenta.saldoFinal > 0 ? 'Debe a CAD' : cuenta.saldoFinal < 0 ? 'CAD le debe' : 'Saldado'}
            destacado={cuenta.saldoFinal !== 0}
          />
        </div>
      )}

      <p className="font-semibold text-cad-navy mb-3">
        Fincas
        <button onClick={() => setMostrarNuevaFinca(true)} className="ml-3 text-xs text-cad-naranja hover:underline font-normal">
          + Nueva finca
        </button>
      </p>
      <div className="grid md:grid-cols-3 gap-3 mb-8">
        {productor.fincas.map((f: any) => (
          <div key={f.id} className="bg-white border border-cad-linea rounded-xl p-4">
            <p className="font-medium text-sm">{f.nombre}</p>
            {(f.municipio || f.estado) && (
              <p className="text-xs text-cad-apagado">{f.municipio ? `${f.municipio}, ${f.estado}` : f.estado}</p>
            )}
            <p className="text-xs text-cad-apagado mt-1">{f.lotes.length} parcela(s) cargada(s)</p>
            <button onClick={() => setFincaParaLote(f.id)} className="text-xs text-cad-naranja hover:underline mt-2">
              + Agregar lote
            </button>
          </div>
        ))}
        {productor.fincas.length === 0 && (
          <p className="text-sm text-cad-apagado col-span-3">Sin fincas registradas.</p>
        )}
      </div>

      <p className="font-semibold text-cad-navy mb-3">
        Desempeño por lote {desempeno && <span className="text-cad-apagado font-normal text-sm">— ordenado de mejor a peor rendimiento</span>}
      </p>

      <div className="space-y-3">
        {desempeno?.ranking.map((l: any, idx: number) => (
          <div key={l.loteSiembraId} className="bg-white border border-cad-linea rounded-xl overflow-hidden">
            <button
              onClick={() => setLoteAbierto(loteAbierto === l.loteSiembraId ? null : l.loteSiembraId)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-cad-superficie transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-cad-superficie text-xs flex items-center justify-center font-medium text-cad-apagado">
                  {idx + 1}
                </span>
                <div>
                  <p className="font-medium text-sm">{l.parcela} <span className="text-cad-apagado font-normal">· {l.ciclo}</span></p>
                  <p className="text-xs text-cad-apagado">{l.cultivo} · {l.areaSembradaHa.toFixed(2)} ha</p>
                </div>
              </div>
              <div className="text-right">
                {l.rendimientoRealQqHa != null ? (
                  <p className="font-semibold text-cad-verde">{l.rendimientoRealQqHa.toFixed(1)} qq/ha</p>
                ) : l.rendimientoProyectadoQqHa != null ? (
                  <p className="font-semibold text-cad-ambar">{l.rendimientoProyectadoQqHa.toFixed(1)} qq/ha (proy.)</p>
                ) : (
                  <p className="text-xs text-cad-apagado">sin dato</p>
                )}
                {l.costoInsumosHa != null && <p className="text-xs text-cad-apagado">${l.costoInsumosHa.toFixed(0)}/ha en insumos</p>}
              </div>
            </button>

            {loteAbierto === l.loteSiembraId && (
              <div className="border-t border-cad-linea p-4 bg-cad-superficie">
                <p className="text-xs font-medium text-cad-apagado uppercase mb-2">Insumos usados en este ciclo</p>
                {l.insumosUsados.length === 0 ? (
                  <p className="text-xs text-cad-apagado">Sin paquete tecnológico registrado.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="text-left text-cad-apagado">
                      <tr><th className="pb-1">Insumo</th><th className="pb-1">Categoría</th><th className="pb-1">Cantidad</th><th className="pb-1">Costo</th></tr>
                    </thead>
                    <tbody>
                      {l.insumosUsados.map((i: any, ix: number) => (
                        <tr key={ix} className="border-t border-cad-linea/60">
                          <td className="py-1">{i.nombreInsumo}</td>
                          <td className="py-1">{ETIQUETA_CATEGORIA[i.categoria] ?? i.categoria}</td>
                          <td className="py-1">{i.cantidad} {i.unidad}</td>
                          <td className="py-1">${(i.cantidad * i.costoUnitario).toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {desempeno && desempeno.ranking.length === 0 && (
        <p className="text-sm text-cad-apagado">Este productor todavía no tiene lotes de siembra registrados.</p>
      )}
    </div>
  );
}

function AgregarLoteModal({ fincaId, onClose, onCreado }: { fincaId: string; onClose: () => void; onCreado: () => void }) {
  const [modo, setModo] = useState<'kml' | 'dibujo'>('kml');
  const [nombreLote, setNombreLote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function importarKml(file: File) {
    setError(null);
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
      onCreado();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function guardarDibujo(puntos: [number, number][], areaHa: number) {
    if (!nombreLote) {
      setError('Ponle un nombre al lote antes de guardarlo.');
      return;
    }
    setError(null);
    setCargando(true);
    try {
      // Backend espera [lng, lat] (orden GeoJSON); el mapa entrega [lat, lng].
      const coordenadas = puntos.map(([lat, lng]) => [lng, lat]);
      await apiFetch(`/parcelas/manual/${fincaId}`, {
        method: 'POST',
        body: JSON.stringify({ nombreLote, coordenadas }),
      });
      onCreado();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-cad-navy/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-cad-navy">Agregar lote</p>
          <button onClick={onClose} className="text-cad-apagado hover:text-cad-tinta text-xl leading-none">×</button>
        </div>

        <div className="flex gap-2 mb-4 border-b border-cad-linea">
          <button onClick={() => setModo('kml')}
            className={`text-sm px-3 py-2 border-b-2 -mb-px ${modo === 'kml' ? 'border-cad-naranja text-cad-navy font-medium' : 'border-transparent text-cad-apagado'}`}>
            Importar KML/KMZ de SIMA
          </button>
          <button onClick={() => setModo('dibujo')}
            className={`text-sm px-3 py-2 border-b-2 -mb-px ${modo === 'dibujo' ? 'border-cad-naranja text-cad-navy font-medium' : 'border-transparent text-cad-apagado'}`}>
            Dibujar en el mapa
          </button>
        </div>

        {modo === 'kml' ? (
          <div>
            <p className="text-xs text-cad-apagado mb-3">
              El sistema calcula el área exacta del polígono importado — no hace falta digitarla.
            </p>
            <label className={`inline-block bg-cad-naranja text-white text-sm font-medium rounded px-4 py-2 transition ${
              cargando ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:brightness-95'
            }`}>
              {cargando ? 'Importando...' : 'Elegir archivo .kml/.kmz'}
              <input type="file" accept=".kml,.kmz" disabled={cargando} className="hidden"
                onChange={(e) => e.target.files?.[0] && importarKml(e.target.files[0])} />
            </label>
          </div>
        ) : (
          <div>
            <div className="mb-3">
              <label className="block text-xs text-cad-apagado mb-1">Nombre del lote</label>
              <input value={nombreLote} onChange={(e) => setNombreLote(e.target.value)}
                placeholder="Lote 1"
                className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
            </div>
            <DibujarLote onCompletar={guardarDibujo} />
          </div>
        )}

        {error && <p className="text-sm text-cad-danger mt-3">{error}</p>}
      </div>
    </div>
  );
}

function Stat({ label, valor, nota, destacado }: { label: string; valor: string; nota?: string; destacado?: boolean }) {
  return (
    <div className={`border border-cad-linea rounded-xl p-4 ${destacado ? 'bg-cad-navy text-white' : 'bg-white'}`}>
      <p className={`text-xs ${destacado ? 'text-white/60' : 'text-cad-apagado'}`}>{label}</p>
      <p className="text-xl font-semibold mt-1">{valor}</p>
      {nota && <p className={`text-xs mt-1 ${destacado ? 'text-white/60' : 'text-cad-apagado'}`}>{nota}</p>}
    </div>
  );
}

function NuevaFincaModal({ productorId, onClose, onCreado }: any) {
  const [nombre, setNombre] = useState('');
  const [estado, setEstado] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const municipiosDisponibles = estado ? MUNICIPIOS_POR_ESTADO[estado as EstadoVenezuela] : [];

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await apiFetch(`/productores/${productorId}/fincas`, {
        method: 'POST',
        body: JSON.stringify({ nombre, estado: estado || undefined, municipio: municipio || undefined }),
      });
      onCreado();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-cad-navy/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-cad-navy">Nueva finca</p>
          <button onClick={onClose} className="text-cad-apagado hover:text-cad-tinta text-xl leading-none">×</button>
        </div>
        <form onSubmit={crear} className="space-y-4">
          <div>
            <label className="block text-xs text-cad-apagado mb-1">Nombre de la finca</label>
            <input required value={nombre} onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-cad-apagado mb-1">Estado</label>
              <select value={estado} onChange={(e) => { setEstado(e.target.value); setMunicipio(''); }}
                className="w-full border border-cad-linea rounded px-3 py-2 text-sm">
                <option value="">Selecciona...</option>
                {ESTADOS_VENEZUELA.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-cad-apagado mb-1">Municipio</label>
              <select value={municipio} onChange={(e) => setMunicipio(e.target.value)} disabled={!estado}
                className="w-full border border-cad-linea rounded px-3 py-2 text-sm disabled:bg-cad-superficie disabled:text-cad-apagado">
                <option value="">{estado ? 'Selecciona...' : 'Elige un estado primero'}</option>
                {municipiosDisponibles.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-cad-danger">{error}</p>}
          <button type="submit" disabled={cargando}
            className="w-full bg-cad-naranja text-white font-medium rounded py-2 text-sm hover:brightness-95 transition disabled:opacity-50">
            {cargando ? 'Creando...' : 'Crear finca'}
          </button>
        </form>
      </div>
    </div>
  );
}
