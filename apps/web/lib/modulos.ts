import type { RolUsuario } from './auth';
import type { NombreIcono } from '../components/icons/ModuloIcono';

export interface ModuloApp {
  href: string;
  label: string;
  descripcion?: string;
  icono: NombreIcono;
  color: string; // clase Tailwind del chip de acento, ej. "bg-cad-verde"
  enGrid?: boolean; // false = no aparece en /inicio, solo se usa para identificar la sección en la barra superior
  rolesPermitidos?: RolUsuario[]; // undefined = visible para todos los autenticados
}

export const MODULOS: ModuloApp[] = [
  { href: '/dashboard', label: 'Resumen', descripcion: 'Cartera, ciclos activos y clima de un vistazo.', icono: 'dashboard', color: 'bg-cad-info', enGrid: true },
  { href: '/ciclos', label: 'Ciclos', descripcion: 'Campañas de siembra y sus productores inscritos.', icono: 'ciclos', color: 'bg-cad-verde', enGrid: true },
  { href: '/solicitudes', label: 'Financiamientos', descripcion: 'Evaluación, contrato, despacho y liquidación.', icono: 'financiamientos', color: 'bg-cad-ambar', enGrid: true },
  { href: '/compras', label: 'Compras', descripcion: 'Órdenes de compra a proveedores.', icono: 'compras', color: 'bg-cad-naranja', enGrid: true },
  { href: '/ventas', label: 'Ventas', descripcion: 'Facturación de insumos a productores.', icono: 'ventas', color: 'bg-cad-verde-claro', enGrid: true },
  { href: '/cartera', label: 'Cartera y Cuentas', descripcion: 'Estado de cuenta y proyección de efectivo.', icono: 'cartera', color: 'bg-cad-info', enGrid: true },
  { href: '/simulador', label: 'Calculadora', descripcion: 'Simulador de costos y rentabilidad.', icono: 'calculadora', color: 'bg-cad-amarillo-verde', enGrid: true },
  { href: '/mapa', label: 'Mapa de Parcelas', descripcion: 'Hectáreas medidas por GPS, con semáforo de estado.', icono: 'mapa', color: 'bg-cad-verde', enGrid: true },
  { href: '/noticias', label: 'Clima y Noticias', descripcion: 'Clima en vivo y precios de referencia.', icono: 'noticias', color: 'bg-cad-info', enGrid: true },
  { href: '/ajustes', label: 'Ajustes', descripcion: 'Usuarios, proveedores, insumos y productores.', icono: 'ajustes', color: 'bg-cad-navy', enGrid: true },

  // No aparecen en el launcher — viven dentro de Ajustes, pero se necesitan
  // aquí para que la barra superior sepa qué ícono/nombre mostrar cuando
  // alguien entra al detalle de un productor (/productores/[id]) desde un
  // enlace de Ciclos, no desde el grid.
  { href: '/productores', label: 'Productores', icono: 'productores', color: 'bg-cad-verde', enGrid: false },
];

/** Busca el módulo cuya ruta coincide con el pathname actual (la más específica primero). */
export function obtenerModuloDeRuta(pathname: string): ModuloApp | undefined {
  return MODULOS
    .filter((m) => pathname === m.href || pathname.startsWith(m.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
