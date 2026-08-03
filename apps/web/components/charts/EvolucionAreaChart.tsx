'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';

/**
 * Muestra cómo evoluciona el área efectiva (lo que el técnico reporta en
 * cada visita) contra el área mapeada al sembrar — la línea de referencia
 * horizontal es "lo sembrado" (fijo), la línea que se mueve es "lo que
 * realmente sigue en pie" según cada visita. La distancia entre ambas ES
 * la desviación / pérdida acumulada.
 */
export default function EvolucionAreaChart({
  inspecciones,
  areaSembradaHa,
}: {
  inspecciones: any[];
  areaSembradaHa: number;
}) {
  // Solo las visitas que trajeron un dato de área efectiva, en orden cronológico.
  const puntos = [...inspecciones]
    .filter((i) => i.areaEfectivaHa != null)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .map((i) => ({
      fecha: new Date(i.fecha).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }),
      areaEfectivaHa: Number(i.areaEfectivaHa),
      tipoVisita: i.tipoVisita,
    }));

  if (puntos.length === 0) {
    return (
      <p className="text-sm text-cad-apagado">
        Todavía no hay suficientes visitas con área efectiva registrada para mostrar la tendencia.
      </p>
    );
  }

  const ultimaArea = puntos[puntos.length - 1].areaEfectivaHa;
  const desviacionPct = areaSembradaHa > 0 ? ((ultimaArea - areaSembradaHa) / areaSembradaHa) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-cad-apagado">Área efectiva reportada en cada visita, vs. lo sembrado según el mapa (línea punteada)</p>
        {desviacionPct < -1 && (
          <p className="text-xs font-medium text-cad-danger">{desviacionPct.toFixed(0)}% respecto a lo sembrado</p>
        )}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={puntos} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7E8" />
          <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#666666' }} />
          <YAxis tick={{ fontSize: 11, fill: '#666666' }} width={40} />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(2)} ha`, 'Área efectiva']}
            contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#E5E7E8' }}
          />
          <ReferenceLine
            y={areaSembradaHa}
            stroke="#012D37"
            strokeDasharray="4 4"
            label={{ value: `Sembrado: ${areaSembradaHa.toFixed(1)} ha`, position: 'insideTopRight', fontSize: 11, fill: '#012D37' }}
          />
          <Line
            type="monotone"
            dataKey="areaEfectivaHa"
            stroke="#F77B1C"
            strokeWidth={2}
            dot={{ r: 4, fill: '#F77B1C' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
