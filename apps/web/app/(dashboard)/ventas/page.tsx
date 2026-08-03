'use client';

import { useEffect, useState, Fragment } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../lib/api';

export default function VentasPage() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [ventaAbierta, setVentaAbierta] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/insumos/ventas/todas').then(setVentas).catch((e) => setError(e.message));
  }, []);

  const totalFacturado = ventas.reduce((acc, v) => acc + Number(v.totalConMargen), 0);
  const gananciaTotal = ventas.reduce((acc, v) => acc + (Number(v.totalConMargen) - Number(v.subtotalCosto)), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-cad-navy mb-1">Ventas</h1>
      <p className="text-sm text-cad-apagado mb-6">
        Cada entrega de insumos a un productor, como factura — genera automáticamente su cuenta por cobrar.
        Para registrar una nueva, entra al expediente del productor en Financiamientos.
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-cad-linea rounded-xl p-4">
          <p className="text-xs text-cad-apagado">Total facturado a productores</p>
          <p className="text-xl font-semibold text-cad-navy">${totalFacturado.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-cad-navy text-white border border-cad-linea rounded-xl p-4">
          <p className="text-xs text-white/60">Ganancia por margen (todas las facturas)</p>
          <p className="text-xl font-semibold">${gananciaTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      {error && <p className="text-sm text-cad-danger mb-4">{error}</p>}

      <div className="bg-white border border-cad-linea rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cad-superficie text-left text-cad-apagado">
            <tr>
              <th className="p-3"></th>
              <th className="p-3 font-medium">Factura</th>
              <th className="p-3 font-medium">Fecha</th>
              <th className="p-3 font-medium">Productor</th>
              <th className="p-3 font-medium">Ciclo</th>
              <th className="p-3 font-medium">Total cobrado</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {ventas.map((v: any) => (
              <Fragment key={v.id}>
                <tr className="border-t border-cad-linea">
                  <td className="p-3 pl-4">
                    <button onClick={() => setVentaAbierta(ventaAbierta === v.id ? null : v.id)} className="text-cad-apagado hover:text-cad-navy">
                      {ventaAbierta === v.id ? '▾' : '▸'}
                    </button>
                  </td>
                  <td className="p-3 font-medium">{v.numeroFactura}</td>
                  <td className="p-3">{new Date(v.fecha).toLocaleDateString('es-VE')}</td>
                  <td className="p-3">{v.solicitud.cicloProductor.productor.nombre}</td>
                  <td className="p-3 text-cad-apagado">{v.solicitud.cicloProductor.ciclo.nombre}</td>
                  <td className="p-3 font-semibold">${Number(v.totalConMargen).toLocaleString('en-US')}</td>
                  <td className="p-3 text-right">
                    <Link href={`/solicitudes/${v.solicitudId}`} className="text-xs text-cad-naranja hover:underline">Ver expediente</Link>
                  </td>
                </tr>
                {ventaAbierta === v.id && (
                  <tr className="bg-cad-superficie/60">
                    <td></td>
                    <td colSpan={6} className="px-3 pb-3">
                      <table className="w-full text-xs">
                        <thead className="text-left text-cad-apagado"><tr><th className="py-1">Insumo</th><th>Cantidad</th><th>Costo unit.</th><th>Cobrado</th></tr></thead>
                        <tbody>
                          {v.items.map((it: any) => (
                            <tr key={it.id} className="border-t border-cad-linea/60">
                              <td className="py-1">{it.insumo.nombre}</td>
                              <td className="py-1">{Number(it.cantidad).toFixed(1)} {it.insumo.unidad}</td>
                              <td className="py-1">${Number(it.costoUnitarioAlMomento).toFixed(2)}</td>
                              <td className="py-1">${Number(it.montoCobradoConMargen).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {ventas.length === 0 && !error && (
          <p className="p-4 text-sm text-cad-apagado">Sin facturas registradas todavía.</p>
        )}
      </div>
    </div>
  );
}
