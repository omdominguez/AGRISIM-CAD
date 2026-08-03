import { redirect } from 'next/navigation';

// El listado y alta de productores se movió dentro de Ajustes. El detalle
// de un productor (fincas, parcelas, participaciones) sigue viviendo en
// /productores/[id] — esa ruta NO cambia.
export default function Page() {
  redirect('/ajustes?tab=productores');
}
