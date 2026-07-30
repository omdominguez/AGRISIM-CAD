'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../lib/api';
import { obtenerUsuario } from '../../../lib/auth';
import AlertasLluvia from '../../../components/map/AlertasLluvia';

const COLOR_ESTADO_CICLO: Record<string, string> = {
  PLANIFICACION: 'bg-cad-ambar/20 text-cad-ambar',
  EN_CURSO: 'bg-cad-verde/15 text-cad-verde',
  COSECHA: 'bg-cad-info/10 text-cad-info',
  CERRADO: 'bg-cad-superficie text-cad-apagado',
};

export default function DashboardPage() {
  const [cartera, setCartera] = useState<any | null>(null);
  const [portafolio, setPortafolio] = useState<any | null>(null);
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [noticias, setNoticias] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);
  const [nombreUsuario, setNombreUsuario] = useState('');

  useEffect(() => {
    setNombreUsuario(obtenerUsuario()?.nombre ?? '');
    apiFetch('/cuentas/cartera').then(setCartera).catch(() => {});
    apiFetch('/solicitudes/portafolio/resumen').then(setPortafolio).catch(() => {});
    apiFetch('/ciclos').then(setCiclos).catch(() => {});
    apiFetch('/noticias').then((n) => setNoticias(n.slice(0, 4))).catch(() => {});
    apiFetch('/noticias/commodities').then(setCommodities).catch(() => {});
  }, []);

  const ciclosEnCurso = ciclos.filter((c) => c.estado === 'EN_CURSO' || c.estado === 'PLANIFICACION');

  return (
    <div>
      <h1 className="text-2xl font-bold text-cad-navy mb-1">
        {nombreUsuario ? `Hola, ${nombreUsuario.split(' ')[0]}` : 'Dashboard'}
      </h1>
      <p className="text-sm text-cad-apagado mb-6">Resumen general de la operación.</p>

      {/* KPIs principales */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Stat
          label="Expuesto actualmente"
          valor={portafolio ? `$${portafolio.expuestoTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
        />
        <Stat
          label="Ganancia esperada"
          valor={portafolio ? `$${portafolio.gananciaEsperadaTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
        />
        <Stat
          label="Por cobrar a productores"
          valor={cartera ? `$${cartera.porCobrar.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
        />
        <Stat
          label="Por pagar a productores"
          valor={cartera ? `$${cartera.porPagar.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
          destacado
        />
      </div>

      {/* Alertas de lluvia */}
      <div className="mb-6">
        <AlertasLluvia compacto />
      </div>

      {/* Precios de commodities agrícolas */}
      <div className="mb-8">
        <p className="font-semibold text-cad-navy mb-3">Commodities — referencia internacional</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {commodities.length === 0 && (
            <p className="col-span-5 text-sm text-cad-apagado bg-white border border-cad-linea rounded-xl p-4">
              Cargando precios...
            </p>
          )}
          {commodities.map((c: any) => (
            <div key={c.nombre} className="bg-white border border-cad-linea rounded-xl p-4">
              <p className="text-xs text-cad-apagado">{c.nombre}</p>
              {c.precioPorKgUsd != null ? (
                <>
                  <p className="text-lg font-semibold text-cad-navy mt-0.5">${c.precioPorKgUsd.toFixed(3)}<span className="text-xs font-normal text-cad-apagado">/kg</span></p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-cad-apagado">ref: {c.unidadOriginal}</p>
                    {c.variacionPct != null && (
                      <p className={`text-xs font-medium ${c.variacionPct >= 0 ? 'text-cad-verde' : 'text-cad-danger'}`}>
                        {c.variacionPct >= 0 ? '▲' : '▼'} {Math.abs(c.variacionPct * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-cad-apagado mt-1">Sin dato</p>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-cad-apagado mt-2">
          Referencia de futuros CME/CBOT (Yahoo Finance) — precio internacional, no es el precio local de compra a productores.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Ciclos activos */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-cad-navy">Ciclos activos</p>
            <Link href="/ciclos" className="text-xs text-cad-naranja hover:underline">Ver todos →</Link>
          </div>
          <div className="bg-white border border-cad-linea rounded-xl overflow-hidden">
            {ciclosEnCurso.length === 0 ? (
              <p className="p-4 text-sm text-cad-apagado">No hay ciclos en planificación o en curso ahora mismo.</p>
            ) : (
              ciclosEnCurso.map((c) => (
                <Link
                  key={c.id}
                  href={`/ciclos/${c.id}`}
                  className="flex items-center justify-between p-4 border-b border-cad-linea last:border-0 hover:bg-cad-superficie transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{c.nombre}</p>
                    <p className="text-xs text-cad-apagado">{c.cultivo} · {c._count?.participaciones ?? 0} productores</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${COLOR_ESTADO_CICLO[c.estado] ?? ''}`}>{c.estado}</span>
                </Link>
              ))
            )}
          </div>

          {/* Accesos rápidos */}
          <p className="font-semibold text-cad-navy mt-6 mb-3">Accesos rápidos</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <AccesoRapido href="/productores" label="Productores" />
            <AccesoRapido href="/solicitudes" label="Financiamientos" />
            <AccesoRapido href="/mapa" label="Mapa de Parcelas" />
            <AccesoRapido href="/simulador" label="Calculadora" />
          </div>
        </div>

        {/* Últimas noticias */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-cad-navy">Últimas noticias</p>
            <Link href="/noticias" className="text-xs text-cad-naranja hover:underline">Ver todas →</Link>
          </div>
          <div className="space-y-2">
            {noticias.length === 0 && (
              <p className="text-sm text-cad-apagado bg-white border border-cad-linea rounded-xl p-4">
                Sin noticias cargadas todavía.
              </p>
            )}
            {noticias.map((n: any) => (
              <a
                key={n.id}
                href={n.url ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white border border-cad-linea rounded-xl p-3 hover:border-cad-naranja transition-colors"
              >
                {n.rubro && <span className="text-xs text-cad-verde font-medium">{n.rubro}</span>}
                <p className="text-sm font-medium mt-0.5">{n.titulo}</p>
                <p className="text-xs text-cad-apagado mt-0.5">{n.fuente}</p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, valor, destacado }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <div className={`border border-cad-linea rounded-xl p-4 ${destacado ? 'bg-cad-navy text-white' : 'bg-white'}`}>
      <p className={`text-xs ${destacado ? 'text-white/60' : 'text-cad-apagado'}`}>{label}</p>
      <p className="text-xl font-semibold mt-1">{valor}</p>
    </div>
  );
}

function AccesoRapido({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="bg-white border border-cad-linea rounded-xl p-4 text-center text-sm font-medium hover:border-cad-naranja hover:text-cad-naranja transition-colors">
      {label}
    </Link>
  );
}
