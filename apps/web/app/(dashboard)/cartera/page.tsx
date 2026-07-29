'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

export default function CarteraPage() {
  const [cartera, setCartera] = useState<any | null>(null);
  const [detalleProductor, setDetalleProductor] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/cuentas/cartera').then(setCartera).catch((e) => setError(e.message));
  }, []);

  function abrirEstadoDeCuenta(productorId: string) {
    setDetalleProductor(null);
    apiFetch(`/cuentas/productores/${productorId}`).then(setDetalleProductor).catch((e) => setError(e.message));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-cad-navy mb-1">Cartera y Cuentas</h1>
      <p className="text-sm text-cad-apagado mb-6">
        Saldo por productor. Positivo: el productor debe a CAD. Negativo: CAD le debe al productor.
      </p>

      {error && <p className="text-sm text-cad-danger mb-4">{error}</p>}

      {cartera && (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white border border-cad-linea rounded-xl p-5">
            <p className="text-xs uppercase text-cad-apagado">Por cobrar a productores</p>
            <p className="text-2xl font-bold text-cad-navy mt-1">
              ${cartera.porCobrar.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-white border border-cad-linea rounded-xl p-5">
            <p className="text-xs uppercase text-cad-apagado">Por pagar a productores</p>
            <p className="text-2xl font-bold text-cad-naranja mt-1">
              ${cartera.porPagar.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-cad-linea rounded-xl overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-cad-superficie text-left text-cad-apagado">
            <tr>
              <th className="p-3 font-medium">Productor</th>
              <th className="p-3 font-medium">Saldo</th>
              <th className="p-3 font-medium">Situación</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {cartera?.detalle.map((d: any) => (
              <tr key={d.productorId} className="border-t border-cad-linea">
                <td className="p-3">{d.nombre}</td>
                <td className={`p-3 font-medium ${d.saldo > 0 ? 'text-cad-navy' : d.saldo < 0 ? 'text-cad-naranja' : ''}`}>
                  ${Math.abs(d.saldo).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </td>
                <td className="p-3 text-xs text-cad-apagado">
                  {d.saldo > 0 ? 'Debe a CAD' : d.saldo < 0 ? 'CAD le debe' : 'Saldado'}
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => abrirEstadoDeCuenta(d.productorId)}
                    className="text-xs text-cad-naranja hover:underline"
                  >
                    Ver estado de cuenta
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cartera?.detalle.length === 0 && (
          <p className="p-4 text-sm text-cad-apagado">
            Sin movimientos registrados todavía. Los cargos se generan automáticamente al despachar insumos o girar anticipos.
          </p>
        )}
      </div>

      {detalleProductor && (
        <div className="bg-white border border-cad-linea rounded-xl p-5">
          <p className="font-semibold text-cad-navy mb-1">{detalleProductor.productor.nombre}</p>
          <p className="text-xs text-cad-apagado mb-4">
            Cargos ${detalleProductor.totalCargos.toLocaleString('en-US', { maximumFractionDigits: 0 })} ·
            Abonos ${detalleProductor.totalAbonos.toLocaleString('en-US', { maximumFractionDigits: 0 })} ·
            Saldo ${detalleProductor.saldoFinal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
          <table className="w-full text-sm">
            <thead className="bg-cad-superficie text-left text-cad-apagado">
              <tr>
                <th className="p-2 font-medium">Fecha</th>
                <th className="p-2 font-medium">Concepto</th>
                <th className="p-2 font-medium text-right">Cargo</th>
                <th className="p-2 font-medium text-right">Abono</th>
                <th className="p-2 font-medium text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {detalleProductor.movimientos.map((m: any) => (
                <tr key={m.id} className="border-t border-cad-linea">
                  <td className="p-2">{new Date(m.fecha).toLocaleDateString('es-VE')}</td>
                  <td className="p-2">{m.concepto}</td>
                  <td className="p-2 text-right">{m.cargo ? `$${m.cargo.toFixed(0)}` : ''}</td>
                  <td className="p-2 text-right">{m.abono ? `$${m.abono.toFixed(0)}` : ''}</td>
                  <td className="p-2 text-right font-medium">${m.saldoCorrido.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
