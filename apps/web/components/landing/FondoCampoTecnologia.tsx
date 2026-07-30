/**
 * Fondo decorativo del hero: surcos de siembra (líneas curvas, evocan campo
 * arado) combinados con una retícula tipo circuito (evoca tecnología).
 * Todo generado con SVG propio, en la paleta oficial de CAD — sin depender
 * de fotos de stock externas (evita problemas de licencias y de que un link
 * roto deje el sitio con un hueco).
 */
export default function FondoCampoTecnologia() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="fondoNavy" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#012D37" />
          <stop offset="100%" stopColor="#01191F" />
        </linearGradient>
        <pattern id="reticulaTech" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#F77B1C" strokeOpacity="0.06" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width="1440" height="900" fill="url(#fondoNavy)" />
      <rect width="1440" height="900" fill="url(#reticulaTech)" />

      {/* Surcos de siembra — líneas curvas suaves, evocan filas aradas vistas desde el aire */}
      <g stroke="#008747" strokeOpacity="0.18" strokeWidth="3" fill="none">
        <path d="M -100 700 Q 400 600 900 720 T 1600 680" />
        <path d="M -100 750 Q 400 650 900 770 T 1600 730" />
        <path d="M -100 800 Q 400 700 900 820 T 1600 780" />
        <path d="M -100 850 Q 400 750 900 870 T 1600 830" />
      </g>

      {/* Puntos de "nodo tecnológico" sobre los surcos — sensores/IoT, sutil */}
      <g fill="#F77B1C" fillOpacity="0.35">
        <circle cx="320" cy="640" r="3" />
        <circle cx="760" cy="700" r="3" />
        <circle cx="1120" cy="660" r="3" />
        <circle cx="200" cy="150" r="2" />
        <circle cx="1300" cy="220" r="2" />
      </g>
    </svg>
  );
}
