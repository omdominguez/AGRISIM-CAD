'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

interface AlertaParcela {
  parcelaId: string;
  nombreLote: string;
  finca: string;
  productor: string;
  mmUltimaHora: number;
  mmAcumuladoHoy: number;
  lloviendoAhora: boolean;
}

/**
 * Alertas de lluvia en vivo (mm reales, vía Open-Meteo — no la imagen del
 * radar). Se usa tanto en el Dashboard como en Mapa de Parcelas.
 * `compacto` recorta la lista a 3 para el Dashboard; en el mapa se ve completa.
 */
export default function AlertasLluvia({ compacto = false }: { compacto?: boolean }) {
  const [alertas, setAlertas] = useState<AlertaParcela[] | null>(null);
  const [registrando, setRegistrando] = useState<string | null>(null);

  function cargar() {
    apiFetch('/parcelas/alertas-lluvia').then((r) => setAlertas(r.parcelas)).catch(() => setAlertas([]));
  }

  useEffect(() => { cargar(); }, []);

  async function registrarMedicion(parcelaId: string, mm: string) {
    if (!mm) return;
    setRegistrando(parcelaId);
    try {
      await apiFetch(`/parcelas/${parcelaId}/lluvia`, {
        method: 'POST',
        body: JSON.stringify({ fecha: new Date().toISOString(), mmMedido: Number(mm) }),
      });
      alert('Medición registrada.');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRegistrando(null);
    }
  }

  if (alertas === null) return null;
  if (alertas.length === 0) return null; // sin lluvia hoy — no mostrar una caja vacía

  const lista = compacto ? alertas.slice(0, 3) : alertas;

  return (
    <div className="bg-cad-info/10 border border-cad-info/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span>🌧️</span>
        <p className="font-semibold text-cad-navy text-sm">
          {alertas.length} parcela{alertas.length !== 1 ? 's' : ''} con lluvia registrada hoy
        </p>
      </div>

      <div className="space-y-2">
        {lista.map((a) => (
          <div key={a.parcelaId} className="flex items-center justify-between bg-white rounded-lg p-3 text-sm">
            <div>
              <p className="font-medium">{a.nombreLote} <span className="text-cad-apagado font-normal">· {a.productor}</span></p>
              <p className="text-xs text-cad-apagado">{a.finca}</p>
            </div>
            <div className="text-right shrink-0 ml-3">
              <p className={`font-semibold ${a.lloviendoAhora ? 'text-cad-info' : 'text-cad-apagado'}`}>
                {a.mmAcumuladoHoy.toFixed(1)} mm hoy
              </p>
              {a.lloviendoAhora && <p className="text-xs text-cad-info">lloviendo ahora</p>}
            </div>
            {!compacto && (
              <div className="ml-3 shrink-0">
                <input
                  type="number"
                  step="0.1"
                  placeholder="mm medidos"
                  disabled={registrando === a.parcelaId}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') registrarMedicion(a.parcelaId, (e.target as HTMLInputElement).value);
                  }}
                  className="w-24 border border-cad-linea rounded px-2 py-1 text-xs"
                  title="Presiona Enter para registrar la medición real del pluviómetro"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {compacto && alertas.length > 3 && (
        <p className="text-xs text-cad-apagado mt-2">y {alertas.length - 3} más — ver en Mapa de Parcelas.</p>
      )}
    </div>
  );
}
