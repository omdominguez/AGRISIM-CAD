import Image from 'next/image';

/**
 * Logo institucional de CAD.
 * - `variante="completo"`: wordmark CAD + hoja + "VENEZUELA" (fondo claro)
 * - `variante="isotipo"`: solo la hoja dentro de la A (para espacios reducidos)
 *
 * El manual de marca prohíbe deformar, rotar o recolorear el logo, así que
 * este componente solo expone alto/ancho proporcionales — no permite estirarlo.
 */
export default function Logo({
  variante = 'completo',
  alto = 40,
  className = '',
}: {
  variante?: 'completo' | 'isotipo';
  alto?: number;
  className?: string;
}) {
  const config = {
    completo: { src: '/brand/cad-logo-completo.png', ratio: 2.55, alt: 'CAD Venezuela' },
    isotipo:  { src: '/brand/cad-isotipo.png',       ratio: 2.35, alt: 'CAD' },
  }[variante];

  return (
    <Image
      src={config.src}
      alt={config.alt}
      width={Math.round(alto * config.ratio)}
      height={alto}
      className={className}
      priority
    />
  );
}
