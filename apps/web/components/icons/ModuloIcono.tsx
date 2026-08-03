// Íconos propios, dibujados a mano en SVG — se evita sumar una librería
// nueva (lucide, heroicons, etc.) solo para una docena de pictogramas.
// Todos comparten el mismo lenguaje visual: trazo 1.8, esquinas redondeadas.

export type NombreIcono =
  | 'grid'
  | 'dashboard'
  | 'ciclos'
  | 'financiamientos'
  | 'compras'
  | 'ventas'
  | 'cartera'
  | 'calculadora'
  | 'mapa'
  | 'noticias'
  | 'ajustes'
  | 'productores';

export default function ModuloIcono({ nombre, className }: { nombre: NombreIcono; className?: string }) {
  const comun = { viewBox: '0 0 24 24', className, xmlns: 'http://www.w3.org/2000/svg' } as const;
  const trazo = { stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

  switch (nombre) {
    case 'grid':
      return (
        <svg {...comun} fill="currentColor">
          <rect x="3" y="3" width="7.5" height="7.5" rx="1.8" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8" />
        </svg>
      );
    case 'dashboard':
      return (
        <svg {...comun}>
          <g {...trazo}>
            <rect x="4" y="10" width="4" height="10" rx="1" />
            <rect x="10" y="4" width="4" height="16" rx="1" />
            <rect x="16" y="13" width="4" height="7" rx="1" />
          </g>
        </svg>
      );
    case 'ciclos':
      return (
        <svg {...comun}>
          <g {...trazo}>
            <path d="M4 12a8 8 0 0 1 14-5.3M20 4v4h-4" />
            <path d="M20 12a8 8 0 0 1-14 5.3M4 20v-4h4" />
          </g>
        </svg>
      );
    case 'financiamientos':
      return (
        <svg {...comun}>
          <g {...trazo}>
            <rect x="2.5" y="6" width="19" height="12" rx="2" />
            <circle cx="12" cy="12" r="2.6" />
            <path d="M6 9h.01M18 15h.01" />
          </g>
        </svg>
      );
    case 'compras':
      return (
        <svg {...comun}>
          <g {...trazo}>
            <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
            <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
            <path d="M2.5 4h2.2l2.4 12.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21.5 8H6" />
          </g>
        </svg>
      );
    case 'ventas':
      return (
        <svg {...comun}>
          <g {...trazo}>
            <path d="M3 3h8l10 10-8 8L3 11V3Z" />
            <circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
          </g>
        </svg>
      );
    case 'cartera':
      return (
        <svg {...comun}>
          <g {...trazo}>
            <rect x="2.5" y="6" width="19" height="13" rx="2" />
            <path d="M2.5 10h19" />
            <circle cx="16.5" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
          </g>
        </svg>
      );
    case 'calculadora':
      return (
        <svg {...comun}>
          <g {...trazo} strokeWidth={1.6}>
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <rect x="7.5" y="4.5" width="9" height="4" rx="1" />
            <circle cx="8.6" cy="12.6" r=".9" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12.6" r=".9" fill="currentColor" stroke="none" />
            <circle cx="15.4" cy="12.6" r=".9" fill="currentColor" stroke="none" />
            <circle cx="8.6" cy="16.6" r=".9" fill="currentColor" stroke="none" />
            <circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none" />
            <circle cx="15.4" cy="16.6" r=".9" fill="currentColor" stroke="none" />
          </g>
        </svg>
      );
    case 'mapa':
      return (
        <svg {...comun}>
          <g {...trazo}>
            <path d="M12 22s7-7.4 7-12.5A7 7 0 0 0 5 9.5C5 14.6 12 22 12 22Z" />
            <circle cx="12" cy="9.5" r="2.4" />
          </g>
        </svg>
      );
    case 'noticias':
      return (
        <svg {...comun}>
          <g {...trazo}>
            <rect x="3" y="5" width="14" height="14" rx="1" />
            <path d="M17 8h3.5v8.5A2.5 2.5 0 0 1 18 19H6.5" />
            <path d="M6 9h8M6 12h9M6 15h6" />
          </g>
        </svg>
      );
    case 'productores':
      return (
        <svg {...comun}>
          <g {...trazo}>
            <circle cx="12" cy="8" r="3.4" />
            <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
          </g>
        </svg>
      );
    case 'ajustes':
      return (
        <svg {...comun}>
          <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth={1.8} fill="none" />
          <g fill="currentColor">
            <rect x="11" y="1.3" width="2" height="3.2" rx=".6" />
            <rect x="11" y="19.5" width="2" height="3.2" rx=".6" />
            <rect x="1.3" y="11" width="3.2" height="2" rx=".6" />
            <rect x="19.5" y="11" width="3.2" height="2" rx=".6" />
            <rect x="4.3" y="3.6" width="2" height="3.2" rx=".6" transform="rotate(45 5.3 5.2)" />
            <rect x="17.7" y="3.6" width="2" height="3.2" rx=".6" transform="rotate(-45 18.7 5.2)" />
            <rect x="4.3" y="17.2" width="2" height="3.2" rx=".6" transform="rotate(-45 5.3 18.8)" />
            <rect x="17.7" y="17.2" width="2" height="3.2" rx=".6" transform="rotate(45 18.7 18.8)" />
          </g>
        </svg>
      );
    default:
      return null;
  }
}
