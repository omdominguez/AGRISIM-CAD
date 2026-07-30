import Link from 'next/link';
import Logo from '../components/brand/Logo';
import FondoCampoTecnologia from '../components/landing/FondoCampoTecnologia';

const MODULOS = [
  {
    titulo: 'Ciclos y Productores',
    descripcion: 'Cada campaña agrupa a los productores financiados, con sus lotes reales medidos por GPS.',
  },
  {
    titulo: 'Financiamiento a Campo',
    descripcion: 'Expediente completo: evaluación, paquete tecnológico, aprobación, contrato, despacho y liquidación.',
  },
  {
    titulo: 'Seguimiento Técnico',
    descripcion: 'Visitas de campo con población de plantas, incidencias fitosanitarias y proyección de cosecha.',
  },
  {
    titulo: 'Mapa de Parcelas',
    descripcion: 'Cada lote con su hectárea exacta y semáforo de estado, con opción de vista satelital.',
  },
  {
    titulo: 'Cartera y Cuentas',
    descripcion: 'Estado de cuenta de cada productor y proyección del efectivo necesario para la cosecha.',
  },
  {
    titulo: 'Clima y Mercado',
    descripcion: 'Clima en vivo de las zonas de siembra, noticias por rubro, y precios internacionales de referencia.',
  },
];

export default function BienvenidaPage() {
  return (
    <main className="min-h-screen bg-cad-navy relative overflow-hidden">
      <FondoCampoTecnologia />

      {/* --- Hero --- */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="animate-logo-entrada mb-8">
          <Logo variante="isotipo" alto={96} />
        </div>

        <h1 className="animate-fade-in-1 font-display text-5xl sm:text-7xl text-white tracking-wide leading-[0.95]">
          CAD <span className="text-cad-naranja">AGRÍCOLA</span>
        </h1>

        <p className="animate-fade-in-2 text-white/70 mt-6 max-w-xl text-sm sm:text-base leading-relaxed">
          El sistema de financiamiento a campo de Comercializadora Agrícola Domínguez.
          Del ciclo de siembra a la liquidación de cosecha, con trazabilidad de cada
          hectárea financiada.
        </p>

        <div className="animate-fade-in-3 mt-10">
          <Link
            href="/login"
            className="inline-block bg-cad-naranja text-white font-medium px-8 py-3 rounded-lg hover:brightness-95 transition"
          >
            Ingresar al sistema
          </Link>
        </div>

        <div className="animate-fade-in-3 absolute bottom-8 text-white/40 text-xs">
          Comercializadora Agrícola Domínguez, C.A. · Uso interno
        </div>
      </section>

      {/* --- Qué hace el sistema --- */}
      <section className="relative z-10 bg-cad-papel px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-medium text-cad-naranja uppercase tracking-wide text-center mb-2">
            Un solo sistema
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-cad-navy text-center mb-12">
            Todo el ciclo de financiamiento, en un solo lugar
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULOS.map((m) => (
              <div key={m.titulo} className="bg-white border border-cad-linea rounded-xl p-5">
                <p className="font-semibold text-cad-navy mb-1.5">{m.titulo}</p>
                <p className="text-sm text-cad-apagado leading-relaxed">{m.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
