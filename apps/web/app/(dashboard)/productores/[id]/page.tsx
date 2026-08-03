'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Cookies from 'js-cookie';
import { apiFetch } from '../../../../lib/api';
import { ESTADOS_VENEZUELA, MUNICIPIOS_POR_ESTADO, EstadoVenezuela } from '../../../../lib/venezuela-geo';
import MiniPoligono from '../../../../components/map/MiniPoligono';

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
  const router = useRouter();
  const productorId = params.id as string;

  const [productor, setProductor] = useState<any | null>(null);
  const [desempeno, setDesempeno] = useState<any | null>(null);
  const [cuenta, setCuenta] = useState<any | null>(null);
  const [loteAbierto, setLoteAbierto] = useState<string | null>(null);
  const [mostrarNuevaFinca, setMostrarNuevaFinca] = useState(false);
  const [mostrarEditar, setMostrarEditar] = useState(false);
  const [fincaParaLote, setFincaParaLote] = useState<string | null>(null);
  const [loteParaEditar, setLoteParaEditar] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  function recargar() {
    apiFetch(`/productores/${productorId}`).then(setProductor).catch((e) => setError(e.message));
    apiFetch(`/productores/${productorId}/desempeno-lotes`).then(setDesempeno).catch(() => {});
    apiFetch(`/cuentas/productores/${productorId}`).then(setCuenta).catch(() => {});
  }

  async function borrarLote(parcelaId: string, nombreLote: string) {
    if (!confirm(`¿Borrar el lote "${nombreLote}"? Esta acción no se puede deshacer.`)) return;
    try {
      await apiFetch(`/parcelas/${parcelaId}`, { method: 'DELETE' });
      recargar();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function borrarProductor() {
    if (!confirm(`¿Borrar a "${productor.nombre}" del registro maestro? Esta acción no se puede deshacer.`)) return;
    try {
      await apiFetch(`/productores/${productorId}`, { method: 'DELETE' });
      router.push('/productores');
    } catch (e: any) {
      alert(e.message);
    }
  }

  useEffect(() => { recargar(); }, [productorId]);

  if (error) return <p className="text-sm text-cad-danger">{error}</p>;
  if (!productor) return <p className="text-sm text-cad-apagado">Cargando...</p>;

  const todosLosLotes = productor.fincas.flatMap((f: any) =>
    f.lotes.map((l: any) => ({ ...l, fincaNombre: f.nombre })),
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-cad-navy">{productor.nombre}</h1>
        <div className="flex gap-3">
          <button onClick={() => setMostrarEditar(true)} className="text-xs text-cad-naranja hover:underline">
            Editar
          </button>
          <button onClick={borrarProductor} className="text-xs text-cad-danger hover:underline">
            Borrar productor
          </button>
        </div>
      </div>
      <p className="text-sm text-cad-apagado mb-6">
        {productor.cedulaRif ?? 'Sin cédula/RIF'} · {productor.municipio ? `${productor.municipio}, ${productor.estado}` : (productor.estado ?? 'Sin zona')}
      </p>

      {mostrarEditar && (
        <EditarProductorModal
          productor={productor}
          onClose={() => setMostrarEditar(false)}
          onGuardado={() => { setMostrarEditar(false); recargar(); }}
        />
      )}

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

      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-cad-navy">Fincas</p>
        <button onClick={() => setMostrarNuevaFinca(true)} className="text-xs text-cad-naranja hover:underline font-medium">
          + Nueva finca
        </button>
      </div>
      <div className="grid md:grid-cols-3 gap-3 mb-8">
        {productor.fincas.map((f: any) => (
          <div key={f.id} className="bg-white border border-cad-linea rounded-xl p-4">
            <p className="font-medium text-sm">{f.nombre}</p>
            {(f.municipio || f.estado) && (
              <p className="text-xs text-cad-apagado">{f.municipio ? `${f.municipio}, ${f.estado}` : f.estado}</p>
            )}
            <p className="text-xs text-cad-apagado mt-1">{f.lotes.length} lote{f.lotes.length !== 1 ? 's' : ''} cargado{f.lotes.length !== 1 ? 's' : ''}</p>
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
        Lotes <span className="text-cad-apagado font-normal text-sm">— polígono, área y desempeño de cada uno</span>
      </p>

      <div className="grid md:grid-cols-2 gap-3">
        {todosLosLotes.map((l: any) => {
          const desempenoLote = desempeno?.ranking.find((d: any) => d.parcelaId === l.id) ?? null;
          const abierto = loteAbierto === l.id;

          return (
            <div key={l.id} className="bg-white border border-cad-linea rounded-xl overflow-hidden">
              <div className="p-4 flex gap-3">
                <MiniPoligono geoJson={l.geoJson} tamano={64} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{l.nombreLote}</p>
                      <p className="text-xs text-cad-apagado truncate">{l.fincaNombre} · {Number(l.areaCalculadaHa).toFixed(2)} ha</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <button
                        onClick={() => setLoteParaEditar(l)}
                        className="text-xs text-cad-naranja hover:underline"
                      >
                        Editar polígono
                      </button>
                      <button
                        onClick={() => borrarLote(l.id, l.nombreLote)}
                        className="text-xs text-cad-danger hover:underline"
                      >
                        Borrar
                      </button>
                    </div>
                  </div>

                  {desempenoLote ? (
                    <button
                      onClick={() => setLoteAbierto(abierto ? null : l.id)}
                      className="w-full text-left mt-2 pt-2 border-t border-cad-linea"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-cad-apagado">{desempenoLote.cultivo} · {desempenoLote.ciclo}</p>
                        {desempenoLote.rendimientoRealQqHa != null ? (
                          <p className="text-sm font-semibold text-cad-verde">{desempenoLote.rendimientoRealQqHa.toFixed(1)} qq/ha</p>
                        ) : desempenoLote.rendimientoProyectadoQqHa != null ? (
                          <p className="text-sm font-semibold text-cad-ambar">{desempenoLote.rendimientoProyectadoQqHa.toFixed(1)} qq/ha (proy.)</p>
                        ) : (
                          <p className="text-xs text-cad-apagado">sin dato aún</p>
                        )}
                      </div>
                    </button>
                  ) : (
                    <p className="text-xs text-cad-apagado mt-2 pt-2 border-t border-cad-linea">Sin siembra registrada todavía</p>
                  )}
                </div>
              </div>

              {abierto && desempenoLote && (
                <div className="border-t border-cad-linea p-4 bg-cad-superficie">
                  <p className="text-xs font-medium text-cad-apagado uppercase mb-2">Insumos usados en este ciclo</p>
                  {desempenoLote.insumosUsados.length === 0 ? (
                    <p className="text-xs text-cad-apagado">Sin paquete tecnológico registrado.</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="text-left text-cad-apagado">
                        <tr><th className="pb-1">Insumo</th><th className="pb-1">Categoría</th><th className="pb-1">Cantidad</th><th className="pb-1">Costo</th></tr>
                      </thead>
                      <tbody>
                        {desempenoLote.insumosUsados.map((i: any, ix: number) => (
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
          );
        })}
      </div>

      {todosLosLotes.length === 0 && (
        <p className="text-sm text-cad-apagado">Este productor todavía no tiene lotes cargados.</p>
      )}

      {loteParaEditar && (
        <EditarPoligonoModal
          lote={loteParaEditar}
          onClose={() => setLoteParaEditar(null)}
          onGuardado={() => { setLoteParaEditar(null); recargar(); }}
        />
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

function EditarPoligonoModal({ lote, onClose, onGuardado }: { lote: any; onClose: () => void; onGuardado: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // El GeoJSON guarda [lng, lat]; DibujarLote trabaja en [lat, lng] (como Leaflet).
  const poligonoInicial: [number, number][] | undefined = (() => {
    const anillo = lote.geoJson?.type === 'Polygon' ? lote.geoJson.coordinates[0] : null;
    if (!anillo) return undefined;
    return anillo.map(([lng, lat]: [number, number]) => [lat, lng]);
  })();

  async function guardar(puntos: [number, number][]) {
    setError(null);
    setCargando(true);
    try {
      const coordenadas = puntos.map(([lat, lng]) => [lng, lat]);
      await apiFetch(`/parcelas/${lote.id}`, { method: 'PATCH', body: JSON.stringify({ coordenadas }) });
      onGuardado();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-cad-navy/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-cad-navy">Corregir polígono</p>
            <p className="text-xs text-cad-apagado">{lote.nombreLote}</p>
          </div>
          <button onClick={onClose} className="text-cad-apagado hover:text-cad-tinta text-xl leading-none">×</button>
        </div>

        <DibujarLote poligonoInicial={poligonoInicial} onCompletar={guardar} />

        {cargando && <p className="text-xs text-cad-apagado mt-2">Guardando...</p>}
        {error && <p className="text-sm text-cad-danger mt-2">{error}</p>}
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

function EditarProductorModal({ productor, onClose, onGuardado }: { productor: any; onClose: () => void; onGuardado: () => void }) {
  const [form, setForm] = useState({
    nombre: productor.nombre ?? '',
    telefono: productor.telefono ?? '',
    estado: productor.estado ?? '',
    municipio: productor.municipio ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const municipiosDisponibles = form.estado ? MUNICIPIOS_POR_ESTADO[form.estado as EstadoVenezuela] : [];

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await apiFetch(`/productores/${productor.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nombre: form.nombre,
          telefono: form.telefono || undefined,
          estado: form.estado || undefined,
          municipio: form.municipio || undefined,
        }),
      });
      onGuardado();
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
          <p className="font-semibold text-cad-navy">Editar productor</p>
          <button onClick={onClose} className="text-cad-apagado hover:text-cad-tinta text-xl leading-none">×</button>
        </div>
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="block text-xs text-cad-apagado mb-1">Nombre completo</label>
            <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-cad-apagado mb-1">Teléfono</label>
            <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="w-full border border-cad-linea rounded px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-cad-apagado mb-1">Estado</label>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value, municipio: '' })}
                className="w-full border border-cad-linea rounded px-3 py-2 text-sm">
                <option value="">Selecciona...</option>
                {ESTADOS_VENEZUELA.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-cad-apagado mb-1">Municipio</label>
              <select value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })}
                disabled={!form.estado}
                className="w-full border border-cad-linea rounded px-3 py-2 text-sm disabled:bg-cad-superficie disabled:text-cad-apagado">
                <option value="">{form.estado ? 'Selecciona...' : 'Elige un estado primero'}</option>
                {municipiosDisponibles.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-cad-danger">{error}</p>}
          <button type="submit" disabled={cargando}
            className="w-full bg-cad-naranja text-white font-medium rounded py-2 text-sm hover:brightness-95 transition disabled:opacity-50">
            {cargando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
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
